-- FOB Systems v352 :: private member calendar + schedule-before-payment
-- Run once in Supabase SQL Editor after 036_member_session_access.sql.

create table if not exists public.member_calendar_events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  kind text not null default 'personal' check (kind in ('personal','fob_sesh','lift_sesh')),
  title text not null check (char_length(title) between 1 and 120),
  notes text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  color text not null default 'gold' check (color in ('gold','blue','green','white','orange','purple','yellow','beige')),
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  source text not null default 'personal' check (source in ('personal','purchase','coach')),
  park_name text,
  park_address text,
  meeting_instructions text,
  purchase_id uuid references public.sesh_purchases(id) on delete set null,
  checkout_plan_id uuid,
  created_by text not null default 'member' check (created_by in ('member','coach','system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists member_calendar_events_member_time_idx
  on public.member_calendar_events(member_id,starts_at);
create unique index if not exists member_calendar_live_session_start_uq
  on public.member_calendar_events(starts_at)
  where kind in ('fob_sesh','lift_sesh') and status='scheduled';
-- Range exclusion is the final database barrier against 10:00/10:30-style
-- overlaps. Application checks provide friendly messages; this constraint
-- protects the calendar even if two server requests arrive together.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname='member_calendar_live_session_range_excl'
       and conrelid='public.member_calendar_events'::regclass
  ) then
    alter table public.member_calendar_events
      add constraint member_calendar_live_session_range_excl
      exclude using gist (tstzrange(starts_at,ends_at,'[)') with &&)
      where (kind in ('fob_sesh','lift_sesh') and status='scheduled');
  end if;
end
$$;
alter table public.member_calendar_events enable row level security;
revoke all on public.member_calendar_events from anon,authenticated;

create table if not exists public.calendar_checkout_plans (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  package_quantity integer not null check (package_quantity in (1,4,8,12)),
  session_type text not null check (session_type in ('fob_sesh','lift_sesh')),
  park_name text not null,
  park_address text,
  meeting_instructions text,
  status text not null default 'ready' check (status in ('ready','checkout','paid','cancelled','expired')),
  purchase_id uuid references public.sesh_purchases(id) on delete set null,
  stripe_payment_id text,
  expires_at timestamptz not null default (now()+interval '2 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists calendar_checkout_plans_member_idx
  on public.calendar_checkout_plans(member_id,created_at desc);
alter table public.calendar_checkout_plans enable row level security;
revoke all on public.calendar_checkout_plans from anon,authenticated;

create table if not exists public.calendar_checkout_plan_slots (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.calendar_checkout_plans(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique(plan_id,starts_at)
);
-- Jah can only be in one place at a time. Expired/cancelled plan slots are
-- physically removed by plan creation/cancellation, so this is also the
-- concurrency barrier when two members tap the same opening together.
create unique index if not exists calendar_checkout_slot_start_uq
  on public.calendar_checkout_plan_slots(starts_at);
alter table public.calendar_checkout_plan_slots enable row level security;
revoke all on public.calendar_checkout_plan_slots from anon,authenticated;

create table if not exists public.calendar_change_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.member_calendar_events(id) on delete cascade,
  member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  proposed_starts_at timestamptz not null,
  proposed_ends_at timestamptz not null,
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','declined','withdrawn')),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (proposed_ends_at > proposed_starts_at)
);
create index if not exists calendar_change_requests_member_idx
  on public.calendar_change_requests(member_id,created_at desc);
create unique index if not exists calendar_change_request_pending_uq
  on public.calendar_change_requests(event_id) where status='pending';
alter table public.calendar_change_requests enable row level security;
revoke all on public.calendar_change_requests from anon,authenticated;

create table if not exists public.calendar_notifications (
  id uuid primary key default gen_random_uuid(),
  notification_key text not null unique,
  type text not null check (type in ('schedule_change','purchase_schedule')),
  member_id uuid references public.payment_vip_members(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  attempts integer not null default 0,
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.calendar_notifications enable row level security;
revoke all on public.calendar_notifications from anon,authenticated;

alter table public.sesh_checkout_tickets
  add column if not exists calendar_plan_id uuid references public.calendar_checkout_plans(id) on delete restrict;
create unique index if not exists sesh_checkout_ticket_plan_uq
  on public.sesh_checkout_tickets(calendar_plan_id) where calendar_plan_id is not null;

-- Create a short-lived schedule hold. Identity, current access, package size,
-- preferred park and open times are all checked inside this transaction.
create or replace function public.create_calendar_checkout_plan(
  p_member_id uuid,
  p_package_quantity integer,
  p_session_type text,
  p_slots timestamptz[]
) returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_plan uuid;
  v_slot timestamptz;
  v_minutes integer:=60;
  v_park text;
  v_park_address text;
  v_meeting text;
  v_unique_count integer;
begin
  if p_package_quantity not in (1,4,8,12)
     or p_session_type not in ('fob_sesh','lift_sesh') then
    raise exception 'Invalid calendar plan';
  end if;
  if coalesce(array_length(p_slots,1),0)<>p_package_quantity then
    raise exception 'Choose exactly one time for every session';
  end if;
  select count(distinct x) into v_unique_count from unnest(p_slots) x;
  if v_unique_count<>p_package_quantity then raise exception 'Session times must be unique'; end if;

  select nullif(trim(m.preferred_park),'') into v_park
    from public.payment_vip_members m
   where m.id=p_member_id and m.active=true and m.sesh_left>0 and coalesce(m.gym_only,false)=false
   for update;
  if not found then raise exception 'Member access is locked'; end if;
  if v_park is null then raise exception 'A preferred park must be confirmed with Jah first'; end if;

  select coalesce(s.session_minutes,60) into v_minutes
    from public.booking_settings s limit 1;
  if exists (
    select 1 from unnest(p_slots) a, unnest(p_slots) b
     where a < b and tstzrange(a,a+(v_minutes||' minutes')::interval,'[)')
       && tstzrange(b,b+(v_minutes||' minutes')::interval,'[)')
  ) then raise exception 'Selected session times overlap'; end if;
  select p.address,p.meeting_instructions into v_park_address,v_meeting
    from public.session_parks p
   where p.is_active=true and (lower(p.display_name)=lower(v_park) or lower(p.official_name)=lower(v_park))
   order by (lower(p.display_name)=lower(v_park)) desc limit 1;

  -- Schedule volume is small, so one transaction-wide calendar lock is a
  -- worthwhile trade for airtight overlap checks (10:00 vs 10:30 included).
  perform pg_advisory_xact_lock(hashtext('fob-calendar-checkout-plan'));

  -- Release abandoned holds before checking this request.
  delete from public.calendar_checkout_plan_slots s using public.calendar_checkout_plans p
   where s.plan_id=p.id and p.status in ('cancelled','expired');
  delete from public.calendar_checkout_plan_slots s using public.calendar_checkout_plans p
   where s.plan_id=p.id and p.expires_at<=now() and p.status in ('ready','checkout');
  update public.calendar_checkout_plans set status='expired',updated_at=now()
   where expires_at<=now() and status in ('ready','checkout');
  if exists (
    select 1 from public.calendar_checkout_plans
     where member_id=p_member_id and status='checkout' and expires_at>now()
  ) then raise exception 'A payment checkout is already in progress'; end if;

  foreach v_slot in array p_slots loop
    if v_slot<=now()+interval '2 hours' or v_slot>now()+interval '190 days' then
      raise exception 'That time is outside the scheduling window';
    end if;
    perform pg_advisory_xact_lock(hashtext(v_slot::text));
    if not exists (
      select 1 from public.open_slots(from_ts=>now(),days=>190) o
       where o.slot_start=v_slot
    ) then raise exception 'A selected time is no longer available'; end if;
    if exists (
      select 1 from public.member_calendar_events e
       where e.member_id=p_member_id and e.status='scheduled'
         and tstzrange(e.starts_at,e.ends_at,'[)') && tstzrange(v_slot,v_slot+(v_minutes||' minutes')::interval,'[)')
    ) then raise exception 'A selected time conflicts with your calendar'; end if;
    if exists (
      select 1 from public.member_calendar_events e
       where e.kind in ('fob_sesh','lift_sesh') and e.status='scheduled'
         and tstzrange(e.starts_at,e.ends_at,'[)') && tstzrange(v_slot,v_slot+(v_minutes||' minutes')::interval,'[)')
    ) then raise exception 'A selected time is no longer available'; end if;
    if exists (
      select 1 from public.calendar_checkout_plan_slots s
      join public.calendar_checkout_plans p on p.id=s.plan_id
       where p.status in ('ready','checkout') and p.expires_at>now()
         and not (p.member_id=p_member_id and p.status='ready')
         and tstzrange(s.starts_at,s.ends_at,'[)')
           && tstzrange(v_slot,v_slot+(v_minutes||' minutes')::interval,'[)')
    ) then raise exception 'A selected time is no longer available'; end if;
    if exists (
      select 1 from public.session_bookings b
       where b.status not in ('cancelled','completed')
         and tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(v_slot,v_slot+(v_minutes||' minutes')::interval,'[)')
    ) then raise exception 'A selected time is no longer available'; end if;
  end loop;

  -- Replacing an unpaid draft must not leave the member's old two-hour hold
  -- behind. Checkout plans are deliberately excluded: once Stripe has been
  -- opened, that exact schedule remains immutable until the checkout expires.
  delete from public.calendar_checkout_plan_slots s using public.calendar_checkout_plans p
   where s.plan_id=p.id and p.member_id=p_member_id and p.status='ready';
  update public.calendar_checkout_plans set status='cancelled',updated_at=now()
   where member_id=p_member_id and status='ready';

  insert into public.calendar_checkout_plans(
    member_id,package_quantity,session_type,park_name,park_address,meeting_instructions
  ) values (p_member_id,p_package_quantity,p_session_type,v_park,v_park_address,v_meeting)
  returning id into v_plan;
  foreach v_slot in array p_slots loop
    insert into public.calendar_checkout_plan_slots(plan_id,starts_at,ends_at)
      values(v_plan,v_slot,v_slot+(v_minutes||' minutes')::interval);
  end loop;
  return v_plan;
exception when unique_violation then
  raise exception 'A selected time was just taken. Pick another opening.';
end;
$$;
revoke all on function public.create_calendar_checkout_plan(uuid,integer,text,timestamptz[]) from public,anon,authenticated;
grant execute on function public.create_calendar_checkout_plan(uuid,integer,text,timestamptz[]) to service_role;

-- Calendar Systems writes coach events through one transaction so a manual
-- edit cannot collide with a member's active payment hold.
create or replace function public.save_coach_calendar_event(
  p_event_id uuid,
  p_member_id uuid,
  p_kind text,
  p_title text,
  p_notes text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_all_day boolean,
  p_color text,
  p_park_name text
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v_row public.member_calendar_events%rowtype;
begin
  if p_kind not in ('personal','fob_sesh','lift_sesh')
     or p_color not in ('gold','blue','green','white','orange','purple','yellow','beige')
     or nullif(trim(p_title),'') is null
     or p_ends_at<=p_starts_at then raise exception 'Invalid calendar event'; end if;
  perform 1 from public.payment_vip_members where id=p_member_id;
  if not found then raise exception 'Member was not found'; end if;

  perform pg_advisory_xact_lock(hashtext('fob-calendar-checkout-plan'));
  if p_kind in ('fob_sesh','lift_sesh') and p_starts_at>now() then
    if not exists (
      select 1 from public.open_slots(from_ts=>now(),days=>190) o
       where o.slot_start=p_starts_at
    ) then raise exception 'That time is outside the live availability'; end if;
    if exists (
      select 1 from public.member_calendar_events e
       where e.id is distinct from p_event_id and e.status='scheduled'
         and e.kind in ('fob_sesh','lift_sesh')
         and tstzrange(e.starts_at,e.ends_at,'[)') && tstzrange(p_starts_at,p_ends_at,'[)')
    ) then raise exception 'That time overlaps another scheduled session'; end if;
    if exists (
      select 1 from public.calendar_checkout_plan_slots s
      join public.calendar_checkout_plans p on p.id=s.plan_id
       where p.status in ('ready','checkout') and p.expires_at>now()
         and tstzrange(s.starts_at,s.ends_at,'[)') && tstzrange(p_starts_at,p_ends_at,'[)')
    ) then raise exception 'That time is being held for checkout'; end if;
    if exists (
      select 1 from public.session_bookings b
       where b.status not in ('cancelled','completed')
         and tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(p_starts_at,p_ends_at,'[)')
    ) then raise exception 'That time overlaps another booking'; end if;
  end if;

  if p_event_id is null then
    insert into public.member_calendar_events(
      member_id,kind,title,notes,starts_at,ends_at,all_day,color,status,source,
      park_name,created_by
    ) values (
      p_member_id,p_kind,trim(p_title),nullif(trim(p_notes),''),p_starts_at,p_ends_at,
      coalesce(p_all_day,false),p_color,'scheduled','coach',nullif(trim(p_park_name),''),'coach'
    ) returning * into v_row;
  else
    update public.member_calendar_events set
      kind=p_kind,title=trim(p_title),notes=nullif(trim(p_notes),''),
      starts_at=p_starts_at,ends_at=p_ends_at,all_day=coalesce(p_all_day,false),
      color=p_color,status='scheduled',source='coach',park_name=nullif(trim(p_park_name),''),
      updated_at=now()
     where id=p_event_id and member_id=p_member_id returning * into v_row;
    if not found then raise exception 'Calendar event was not found'; end if;
  end if;
  return to_jsonb(v_row);
end;
$$;
revoke all on function public.save_coach_calendar_event(uuid,uuid,text,text,text,timestamptz,timestamptz,boolean,text,text) from public,anon,authenticated;
grant execute on function public.save_coach_calendar_event(uuid,uuid,text,text,text,timestamptz,timestamptz,boolean,text,text) to service_role;

-- Approve/decline is atomic. The proposed opening is revalidated at the
-- moment of approval, and the event plus request status move together.
create or replace function public.resolve_calendar_change_request(
  p_request_id uuid,
  p_decision text
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_req public.calendar_change_requests%rowtype;
  v_event public.member_calendar_events%rowtype;
begin
  if p_decision not in ('approved','declined') then raise exception 'Invalid decision'; end if;
  perform pg_advisory_xact_lock(hashtext('fob-calendar-checkout-plan'));
  select * into v_req from public.calendar_change_requests
   where id=p_request_id and status='pending' for update;
  if not found then raise exception 'That request is no longer pending'; end if;

  if p_decision='approved' then
    select * into v_event from public.member_calendar_events
     where id=v_req.event_id and member_id=v_req.member_id
       and kind in ('fob_sesh','lift_sesh') and status='scheduled' for update;
    if not found then raise exception 'The scheduled session was not found'; end if;
    if not exists (
      select 1 from public.open_slots(from_ts=>now(),days=>190) o
       where o.slot_start=v_req.proposed_starts_at
    ) then raise exception 'That proposed opening is no longer available'; end if;
    if exists (
      select 1 from public.member_calendar_events e
       where e.id<>v_event.id and e.status='scheduled'
         and (e.kind in ('fob_sesh','lift_sesh') or e.member_id=v_req.member_id)
         and tstzrange(e.starts_at,e.ends_at,'[)')
           && tstzrange(v_req.proposed_starts_at,v_req.proposed_ends_at,'[)')
    ) then raise exception 'That proposed opening now conflicts with a calendar event'; end if;
    if exists (
      select 1 from public.calendar_checkout_plan_slots s
      join public.calendar_checkout_plans p on p.id=s.plan_id
       where p.status in ('ready','checkout') and p.expires_at>now()
         and tstzrange(s.starts_at,s.ends_at,'[)')
           && tstzrange(v_req.proposed_starts_at,v_req.proposed_ends_at,'[)')
    ) then raise exception 'That proposed opening is being held for checkout'; end if;
    if exists (
      select 1 from public.session_bookings b
       where b.status not in ('cancelled','completed')
         and tstzrange(b.starts_at,b.ends_at,'[)')
           && tstzrange(v_req.proposed_starts_at,v_req.proposed_ends_at,'[)')
    ) then raise exception 'That proposed opening overlaps another booking'; end if;
    update public.member_calendar_events set starts_at=v_req.proposed_starts_at,
      ends_at=v_req.proposed_ends_at,updated_at=now() where id=v_event.id;
  end if;
  update public.calendar_change_requests set status=p_decision,resolved_at=now(),updated_at=now()
   where id=v_req.id returning * into v_req;
  return to_jsonb(v_req);
end;
$$;
revoke all on function public.resolve_calendar_change_request(uuid,text) from public,anon,authenticated;
grant execute on function public.resolve_calendar_change_request(uuid,text) to service_role;

-- The schedule plan is required before a private Payment Link can open.
drop function if exists public.create_member_checkout_ticket(uuid,integer,text,integer);
create or replace function public.create_member_checkout_ticket(
  p_member_id uuid,
  p_package_quantity integer,
  p_location_rate text,
  p_expected_price_cents integer,
  p_calendar_plan_id uuid
) returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare v_ticket uuid; v_plan public.calendar_checkout_plans%rowtype;
begin
  if p_package_quantity not in (1,4,8,12)
     or p_location_rate not in ('standard','extended','distance')
     or coalesce(p_expected_price_cents,0)<=0 then raise exception 'Invalid checkout pack'; end if;
  perform 1 from public.payment_vip_members
   where id=p_member_id and active=true and sesh_left>0 and coalesce(gym_only,false)=false for share;
  if not found then raise exception 'Member access is locked'; end if;
  select * into v_plan from public.calendar_checkout_plans
   where id=p_calendar_plan_id and member_id=p_member_id and package_quantity=p_package_quantity
     and status='ready' and expires_at>now() for update;
  if not found then raise exception 'Your calendar schedule is missing or expired'; end if;
  if (select count(*) from public.calendar_checkout_plan_slots where plan_id=v_plan.id)<>p_package_quantity then
    raise exception 'Your calendar schedule is incomplete';
  end if;
  insert into public.sesh_checkout_tickets(
    member_id,package_quantity,location_rate,expected_price_cents,calendar_plan_id,expires_at
  ) values (p_member_id,p_package_quantity,p_location_rate,p_expected_price_cents,p_calendar_plan_id,now()+interval '24 hours')
  returning id into v_ticket;
  update public.calendar_checkout_plans
     set status='checkout',expires_at=now()+interval '24 hours',updated_at=now()
   where id=v_plan.id;
  return v_ticket;
end;
$$;
revoke all on function public.create_member_checkout_ticket(uuid,integer,text,integer,uuid) from public,anon,authenticated;
grant execute on function public.create_member_checkout_ticket(uuid,integer,text,integer,uuid) to service_role;

-- Stripe fulfillment credits the live balance and publishes the preselected
-- schedule in one transaction. A webhook retry returns the committed result.
drop function if exists public.credit_member_session_pack(uuid,text,text);
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
  v_plan public.calendar_checkout_plans%rowtype;
  v_purchase_id uuid;
  v_member_id uuid;
  v_sesh integer;
  v_left integer;
  v_scheduled integer:=0;
begin
  select member_id into v_member_id from public.sesh_purchases
   where stripe_payment_id=p_stripe_payment_id limit 1;
  if found then
    select sesh,sesh_left into v_sesh,v_left from public.payment_vip_members where id=v_member_id;
    return jsonb_build_object('credited',false,'duplicate',true,'member_id',v_member_id,
      'sessions_total',v_sesh,'sessions_left',v_left);
  end if;
  select * into v_ticket from public.sesh_checkout_tickets where id=p_checkout_ticket for update;
  if not found or v_ticket.stripe_payment_id is distinct from p_stripe_payment_id then
    raise exception 'Checkout ticket is not reserved for this payment';
  end if;
  if v_ticket.used_at is not null then raise exception 'Checkout ticket was already used'; end if;
  select * into v_plan from public.calendar_checkout_plans
   where id=v_ticket.calendar_plan_id and member_id=v_ticket.member_id
     and package_quantity=v_ticket.package_quantity and status in ('ready','checkout') for update;
  if not found then raise exception 'Checkout schedule was not found'; end if;
  perform 1 from public.payment_vip_members
   where id=v_ticket.member_id and active=true and coalesce(gym_only,false)=false for update;
  if not found then raise exception 'Accepted member was not found'; end if;
  insert into public.sesh_purchases(
    member_id,package_quantity,sessions_remaining,price_paid_cents,
    location_rate_at_purchase,stripe_price_id,stripe_payment_id
  ) values (
    v_ticket.member_id,v_ticket.package_quantity,0,v_ticket.expected_price_cents,
    v_ticket.location_rate,nullif(p_stripe_price_id,''),p_stripe_payment_id
  ) on conflict(stripe_payment_id) do nothing returning id into v_purchase_id;
  if v_purchase_id is null then
    select sesh,sesh_left into v_sesh,v_left from public.payment_vip_members where id=v_ticket.member_id;
    return jsonb_build_object('credited',false,'duplicate',true,'member_id',v_ticket.member_id,
      'sessions_total',v_sesh,'sessions_left',v_left);
  end if;
  update public.payment_vip_members
     set sesh=coalesce(sesh,0)+v_ticket.package_quantity,
         sesh_left=coalesce(sesh_left,0)+v_ticket.package_quantity,updated_at=now()
   where id=v_ticket.member_id returning sesh,sesh_left into v_sesh,v_left;
  insert into public.member_calendar_events(
    member_id,kind,title,starts_at,ends_at,color,status,source,park_name,park_address,
    meeting_instructions,purchase_id,checkout_plan_id,created_by
  ) select v_ticket.member_id,v_plan.session_type,
      case when v_plan.session_type='lift_sesh' then 'Lift Sesh' else 'FOB SESH' end,
      s.starts_at,s.ends_at,'gold','scheduled','purchase',v_plan.park_name,v_plan.park_address,
      v_plan.meeting_instructions,v_purchase_id,v_plan.id,'system'
    from public.calendar_checkout_plan_slots s where s.plan_id=v_plan.id;
  get diagnostics v_scheduled=row_count;
  if v_scheduled<>v_ticket.package_quantity then raise exception 'Calendar schedule did not publish completely'; end if;
  delete from public.calendar_checkout_plan_slots where plan_id=v_plan.id;
  update public.calendar_checkout_plans set status='paid',purchase_id=v_purchase_id,
    stripe_payment_id=p_stripe_payment_id,updated_at=now() where id=v_plan.id;
  update public.sesh_purchases set sessions_remaining=v_left where id=v_purchase_id;
  update public.sesh_checkout_tickets set used_at=now() where id=v_ticket.id;
  return jsonb_build_object('credited',true,'duplicate',false,'member_id',v_ticket.member_id,
    'sessions_added',v_ticket.package_quantity,'sessions_total',v_sesh,'sessions_left',v_left,
    'calendar_plan_id',v_plan.id,'scheduled_count',v_scheduled,'purchase_id',v_purchase_id);
end;
$$;
revoke all on function public.credit_member_session_pack(uuid,text,text) from public,anon,authenticated;
grant execute on function public.credit_member_session_pack(uuid,text,text) to service_role;
