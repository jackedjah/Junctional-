-- FOB Systems v351 :: zero-session lockout and atomic pack credits
-- Run once in Supabase SQL Editor before deploying v351.

create table if not exists public.sesh_checkout_tickets (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  package_quantity integer not null check (package_quantity in (1,4,8,12)),
  location_rate text not null check (location_rate in ('standard','extended','distance')),
  expected_price_cents integer not null check (expected_price_cents > 0),
  expires_at timestamptz not null default (now()+interval '7 days'),
  stripe_payment_id text,
  reserved_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists sesh_checkout_tickets_member_idx
  on public.sesh_checkout_tickets(member_id,created_at desc);
create unique index if not exists sesh_checkout_tickets_stripe_uq
  on public.sesh_checkout_tickets(stripe_payment_id)
  where stripe_payment_id is not null;
alter table public.sesh_checkout_tickets enable row level security;
revoke all on public.sesh_checkout_tickets from anon,authenticated;

create table if not exists public.sesh_purchases (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  package_quantity integer not null check (package_quantity in (1,4,8,12)),
  sessions_remaining integer not null default 0 check (sessions_remaining >= 0),
  price_paid_cents integer,
  location_rate_at_purchase text not null default 'standard',
  stripe_price_id text,
  stripe_payment_id text not null,
  created_at timestamptz not null default now()
);
alter table public.sesh_purchases add column if not exists member_id uuid references public.payment_vip_members(id) on delete cascade;
alter table public.sesh_purchases add column if not exists package_quantity integer;
alter table public.sesh_purchases add column if not exists sessions_remaining integer default 0;
alter table public.sesh_purchases add column if not exists price_paid_cents integer;
alter table public.sesh_purchases add column if not exists location_rate_at_purchase text default 'standard';
alter table public.sesh_purchases add column if not exists stripe_price_id text;
alter table public.sesh_purchases add column if not exists stripe_payment_id text;
alter table public.sesh_purchases add column if not exists created_at timestamptz default now();
create unique index if not exists sesh_purchases_stripe_payment_uq
  on public.sesh_purchases(stripe_payment_id);
create index if not exists sesh_purchases_member_idx
  on public.sesh_purchases(member_id,created_at desc);
alter table public.sesh_purchases enable row level security;
revoke all on public.sesh_purchases from anon,authenticated;

-- Only the server can mint one of these random, single-use references. The
-- positive balance check and ticket insert happen in the same transaction.
create or replace function public.create_member_checkout_ticket(
  p_member_id uuid,
  p_package_quantity integer,
  p_location_rate text,
  p_expected_price_cents integer
) returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare v_ticket uuid;
begin
  if p_package_quantity not in (1,4,8,12)
     or p_location_rate not in ('standard','extended','distance')
     or coalesce(p_expected_price_cents,0)<=0 then
    raise exception 'Invalid checkout pack';
  end if;
  perform 1 from public.payment_vip_members
   where id=p_member_id and active=true and sesh_left>0 and coalesce(gym_only,false)=false
   for share;
  if not found then raise exception 'Member access is locked'; end if;
  insert into public.sesh_checkout_tickets(
    member_id,package_quantity,location_rate,expected_price_cents
  ) values (p_member_id,p_package_quantity,p_location_rate,p_expected_price_cents)
  returning id into v_ticket;
  return v_ticket;
end;
$$;
revoke all on function public.create_member_checkout_ticket(uuid,integer,text,integer) from public,anon,authenticated;
grant execute on function public.create_member_checkout_ticket(uuid,integer,text,integer) to service_role;

-- Bind a one-use ticket to the first Stripe Checkout Session that returns it.
-- This also validates the signed Stripe amount against the pack selected on
-- the server. Re-running for the same Checkout Session is safe.
create or replace function public.reserve_member_checkout_ticket(
  p_ticket_id uuid,
  p_stripe_payment_id text,
  p_amount_total integer
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v_ticket public.sesh_checkout_tickets%rowtype;
begin
  if nullif(trim(p_stripe_payment_id),'') is null then raise exception 'Stripe payment id is required'; end if;
  select * into v_ticket from public.sesh_checkout_tickets where id=p_ticket_id for update;
  if not found then raise exception 'Checkout ticket was not found'; end if;
  if v_ticket.stripe_payment_id is not null and v_ticket.stripe_payment_id<>p_stripe_payment_id then
    raise exception 'Checkout ticket is already reserved';
  end if;
  if v_ticket.stripe_payment_id is null and v_ticket.expires_at<=now() then
    raise exception 'Checkout ticket expired';
  end if;
  if v_ticket.expected_price_cents<>p_amount_total then
    raise exception 'Paid amount does not match checkout ticket';
  end if;
  if v_ticket.stripe_payment_id is null then
    update public.sesh_checkout_tickets
       set stripe_payment_id=p_stripe_payment_id,reserved_at=now()
     where id=p_ticket_id;
  end if;
  return jsonb_build_object('reserved',true,'already_used',v_ticket.used_at is not null);
end;
$$;
revoke all on function public.reserve_member_checkout_ticket(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.reserve_member_checkout_ticket(uuid,text,integer) to service_role;

drop function if exists public.credit_member_session_pack(uuid,integer,integer,text,text,text);
create or replace function public.credit_member_session_pack(
  p_checkout_ticket uuid,
  p_stripe_price_id text,
  p_stripe_payment_id text
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_ticket public.sesh_checkout_tickets%rowtype;
  v_purchase_id uuid;
  v_member_id uuid;
  v_sesh integer;
  v_left integer;
begin
  -- Stripe retries are answered from the already committed purchase before
  -- touching the ticket again.
  select member_id into v_member_id from public.sesh_purchases
   where stripe_payment_id=p_stripe_payment_id limit 1;
  if found then
    select sesh,sesh_left into v_sesh,v_left from public.payment_vip_members where id=v_member_id;
    return jsonb_build_object('credited',false,'duplicate',true,'member_id',v_member_id,
      'sessions_total',v_sesh,'sessions_left',v_left);
  end if;

  select * into v_ticket from public.sesh_checkout_tickets
   where id=p_checkout_ticket for update;
  if not found or v_ticket.stripe_payment_id is distinct from p_stripe_payment_id then
    raise exception 'Checkout ticket is not reserved for this payment';
  end if;
  if v_ticket.used_at is not null then raise exception 'Checkout ticket was already used'; end if;

  -- Serialize every purchase for this accepted member. Two different packs
  -- completing together therefore both add to the newest balance.
  perform 1 from public.payment_vip_members
   where id=v_ticket.member_id and active=true and coalesce(gym_only,false)=false
   for update;
  if not found then raise exception 'Accepted member was not found'; end if;

  insert into public.sesh_purchases(
    member_id,package_quantity,sessions_remaining,price_paid_cents,
    location_rate_at_purchase,stripe_price_id,stripe_payment_id
  ) values (
    v_ticket.member_id,v_ticket.package_quantity,0,v_ticket.expected_price_cents,
    v_ticket.location_rate,nullif(p_stripe_price_id,''),p_stripe_payment_id
  ) on conflict(stripe_payment_id) do nothing
  returning id into v_purchase_id;

  if v_purchase_id is null then
    select sesh,sesh_left into v_sesh,v_left
      from public.payment_vip_members where id=v_ticket.member_id;
    return jsonb_build_object('credited',false,'duplicate',true,'member_id',v_ticket.member_id,
      'sessions_total',v_sesh,'sessions_left',v_left);
  end if;

  update public.payment_vip_members
     set sesh=coalesce(sesh,0)+v_ticket.package_quantity,
         sesh_left=coalesce(sesh_left,0)+v_ticket.package_quantity,
         updated_at=now()
   where id=v_ticket.member_id
   returning sesh,sesh_left into v_sesh,v_left;

  update public.sesh_purchases set sessions_remaining=v_left where id=v_purchase_id;
  update public.sesh_checkout_tickets set used_at=now() where id=v_ticket.id;
  return jsonb_build_object('credited',true,'duplicate',false,'member_id',v_ticket.member_id,
    'sessions_added',v_ticket.package_quantity,'sessions_total',v_sesh,'sessions_left',v_left);
end;
$$;
revoke all on function public.credit_member_session_pack(uuid,text,text) from public,anon,authenticated;
grant execute on function public.credit_member_session_pack(uuid,text,text) to service_role;

-- A linked Forum identity may still hold a short-lived Supabase JWT after
-- the coach sets Sessions Left to zero. Restrictive RLS checks the live
-- ledger, so that old token immediately stops reading or writing member data.
-- Unlinked Forum accounts are unchanged.
create or replace function public.has_active_member_session_access()
returns boolean
language sql
stable
security definer
set search_path=public,auth
as $$
  select case
    when auth.uid() is null then false
    when nullif(u.raw_user_meta_data->>'payment_member_id','') is null then true
    else exists (
      select 1 from public.payment_vip_members m
       where m.id::text=u.raw_user_meta_data->>'payment_member_id'
         and m.active=true and m.sesh_left>0
    )
  end
  from auth.users u where u.id=auth.uid()
$$;
revoke all on function public.has_active_member_session_access() from public;
grant execute on function public.has_active_member_session_access() to authenticated,service_role;

do $$
declare r record;
begin
  for r in
    select c.relname
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relkind='r' and c.relrowsecurity=true
       and c.relname not in ('payment_vip_members','sesh_purchases','sesh_checkout_tickets')
  loop
    execute format('drop policy if exists member_session_access_gate on public.%I',r.relname);
    execute format(
      'create policy member_session_access_gate on public.%I as restrictive for all to authenticated using (public.has_active_member_session_access()) with check (public.has_active_member_session_access())',
      r.relname
    );
  end loop;
end $$;

-- Private uploads use storage.objects RLS rather than a public-schema table.
drop policy if exists member_session_access_storage_gate on storage.objects;
create policy member_session_access_storage_gate on storage.objects
  as restrictive for all to authenticated
  using (public.has_active_member_session_access())
  with check (public.has_active_member_session_access());
