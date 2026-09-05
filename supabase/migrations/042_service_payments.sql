-- MAHFITT v394 :: generic service-payment primitive + $12 late-reschedule fulfillment
-- Run after 041_member_reschedule_v2.sql.
-- Browser clients never choose trusted prices. Netlify/service-role code creates
-- Stripe Checkout Sessions from these server-owned obligations. A verified
-- Stripe webhook is the only path that marks payment paid and finalizes a
-- fee-required reschedule.

create table if not exists public.service_payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  purpose text not null check (purpose in ('late_reschedule','theme_curation')),
  reference_id uuid not null,
  amount_cents integer not null check (amount_cents between 1 and 100000),
  currency text not null default 'usd' check (currency='usd'),
  status text not null default 'created' check (status in ('created','checkout','paid','expired','failed','refunded')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  checkout_url text,
  checkout_expires_at timestamptz,
  paid_at timestamptz,
  fulfilled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists service_payments_member_idx
  on public.service_payments(member_id,created_at desc);
create unique index if not exists service_payments_open_reference_uq
  on public.service_payments(purpose,reference_id)
  where status in ('created','checkout');
create unique index if not exists service_payments_stripe_session_uq
  on public.service_payments(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
alter table public.service_payments enable row level security;
revoke all on public.service_payments from anon,authenticated;

-- Refund metadata is intentionally first-class. A paid late-reschedule can
-- lose its proposed opening in the short race between coach approval and
-- Stripe completion. In that rare case the member is refunded automatically
-- and the original session remains authoritative.
alter table public.service_payments
  add column if not exists stripe_refund_id text,
  add column if not exists refunded_at timestamptz;

alter table public.calendar_change_requests
  drop constraint if exists calendar_change_requests_payment_status_check;
alter table public.calendar_change_requests
  add constraint calendar_change_requests_payment_status_check
  check (payment_status in ('not_required','required','pending','paid','waived','expired','refunded'));

create or replace function public.create_late_reschedule_payment(
  p_member_id uuid,
  p_request_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_req public.calendar_change_requests%rowtype;
  v_payment public.service_payments%rowtype;
begin
  select * into v_req
    from public.calendar_change_requests
   where id=p_request_id
     and member_id=p_member_id
     and status='awaiting_payment'
     and late_fee_required=true
     and payment_status in ('required','pending')
   for update;

  if not found then
    raise exception 'That reschedule payment is unavailable';
  end if;
  if coalesce(v_req.late_fee_amount_cents,0)<>1200 then
    raise exception 'Unexpected reschedule payment amount';
  end if;

  select * into v_payment
    from public.service_payments
   where purpose='late_reschedule'
     and reference_id=v_req.id
     and status in ('created','checkout')
   order by created_at desc
   limit 1
   for update;

  if not found then
    insert into public.service_payments(member_id,purpose,reference_id,amount_cents,currency,status)
    values (p_member_id,'late_reschedule',v_req.id,1200,'usd','created')
    returning * into v_payment;
  end if;

  update public.calendar_change_requests
     set payment_status='pending',
         payment_reference=v_payment.id::text,
         updated_at=now()
   where id=v_req.id;

  return to_jsonb(v_payment);
end;
$$;
revoke all on function public.create_late_reschedule_payment(uuid,uuid) from public,anon,authenticated;
grant execute on function public.create_late_reschedule_payment(uuid,uuid) to service_role;

create or replace function public.attach_service_payment_checkout(
  p_payment_id uuid,
  p_stripe_checkout_session_id text,
  p_checkout_url text,
  p_expires_at timestamptz,
  p_amount_total integer
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_payment public.service_payments%rowtype;
begin
  select * into v_payment from public.service_payments where id=p_payment_id for update;
  if not found then raise exception 'Service payment not found'; end if;
  if v_payment.status='paid' then return to_jsonb(v_payment); end if;
  if p_amount_total is null or p_amount_total<>v_payment.amount_cents then
    raise exception 'Service payment amount mismatch';
  end if;
  update public.service_payments
     set status='checkout',
         stripe_checkout_session_id=left(p_stripe_checkout_session_id,255),
         checkout_url=left(p_checkout_url,2000),
         checkout_expires_at=p_expires_at,
         updated_at=now()
   where id=v_payment.id
   returning * into v_payment;
  return to_jsonb(v_payment);
end;
$$;
revoke all on function public.attach_service_payment_checkout(uuid,text,text,timestamptz,integer) from public,anon,authenticated;
grant execute on function public.attach_service_payment_checkout(uuid,text,text,timestamptz,integer) to service_role;

create or replace function public.expire_service_payment(
  p_payment_id uuid,
  p_stripe_checkout_session_id text
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v_payment public.service_payments%rowtype;
begin
  update public.service_payments
     set status='expired',updated_at=now()
   where id=p_payment_id
     and status in ('created','checkout')
     and (stripe_checkout_session_id is null or stripe_checkout_session_id=p_stripe_checkout_session_id)
   returning * into v_payment;
  if found and v_payment.purpose='late_reschedule' then
    update public.calendar_change_requests
       set payment_status='required',payment_reference=null,updated_at=now()
     where id=v_payment.reference_id and status='awaiting_payment';
  end if;
  return case when v_payment.id is null then null else to_jsonb(v_payment) end;
end;
$$;
revoke all on function public.expire_service_payment(uuid,text) from public,anon,authenticated;
grant execute on function public.expire_service_payment(uuid,text) to service_role;

create or replace function public.refund_late_reschedule_payment(
  p_payment_id uuid,
  p_stripe_checkout_session_id text,
  p_stripe_payment_intent_id text,
  p_stripe_refund_id text
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_payment public.service_payments%rowtype;
  v_req public.calendar_change_requests%rowtype;
begin
  select * into v_payment
    from public.service_payments
   where id=p_payment_id and purpose='late_reschedule'
   for update;
  if not found then raise exception 'Service payment not found'; end if;
  if v_payment.status='refunded' then
    return jsonb_build_object('refunded',true,'already',true,'member_id',v_payment.member_id,'request_id',v_payment.reference_id,'refund_id',v_payment.stripe_refund_id);
  end if;
  if v_payment.stripe_checkout_session_id is not null and v_payment.stripe_checkout_session_id<>p_stripe_checkout_session_id then
    raise exception 'Service payment session mismatch';
  end if;

  select * into v_req
    from public.calendar_change_requests
   where id=v_payment.reference_id and member_id=v_payment.member_id
   for update;
  if not found then raise exception 'Reschedule request was not found'; end if;

  update public.service_payments
     set status='refunded',
         stripe_checkout_session_id=coalesce(stripe_checkout_session_id,nullif(left(coalesce(p_stripe_checkout_session_id,''),255),'')),
         stripe_payment_intent_id=coalesce(stripe_payment_intent_id,nullif(left(coalesce(p_stripe_payment_intent_id,''),255),'')),
         stripe_refund_id=nullif(left(coalesce(p_stripe_refund_id,''),255),''),
         paid_at=coalesce(paid_at,now()),
         refunded_at=coalesce(refunded_at,now()),
         fulfilled_at=coalesce(fulfilled_at,now()),
         updated_at=now()
   where id=v_payment.id
   returning * into v_payment;

  -- Payment happened but the approved destination became unavailable. The
  -- original event is deliberately untouched; this closes the request only
  -- after Stripe has accepted the refund.
  update public.calendar_change_requests
     set status='declined',payment_status='refunded',payment_reference=v_payment.id::text,
         resolved_at=coalesce(resolved_at,now()),updated_at=now()
   where id=v_req.id and status='awaiting_payment';

  return jsonb_build_object('refunded',true,'member_id',v_payment.member_id,'request_id',v_payment.reference_id,'refund_id',v_payment.stripe_refund_id);
end;
$$;
revoke all on function public.refund_late_reschedule_payment(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.refund_late_reschedule_payment(uuid,text,text,text) to service_role;

create or replace function public.fulfill_late_reschedule_payment(
  p_payment_id uuid,
  p_stripe_checkout_session_id text,
  p_stripe_payment_intent_id text,
  p_amount_total integer
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_payment public.service_payments%rowtype;
  v_req public.calendar_change_requests%rowtype;
  v_event public.member_calendar_events%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext('fob-calendar-checkout-plan'));

  select * into v_payment
    from public.service_payments
   where id=p_payment_id and purpose='late_reschedule'
   for update;
  if not found then raise exception 'Service payment not found'; end if;
  if v_payment.status='paid' and v_payment.fulfilled_at is not null then
    return jsonb_build_object('paid',true,'fulfilled',true,'already',true,'member_id',v_payment.member_id,'request_id',v_payment.reference_id);
  end if;
  if p_amount_total is null or p_amount_total<>v_payment.amount_cents or v_payment.amount_cents<>1200 then
    raise exception 'Service payment amount mismatch';
  end if;
  if v_payment.stripe_checkout_session_id is not null and v_payment.stripe_checkout_session_id<>p_stripe_checkout_session_id then
    raise exception 'Service payment session mismatch';
  end if;

  select * into v_req
    from public.calendar_change_requests
   where id=v_payment.reference_id
     and member_id=v_payment.member_id
     and status='awaiting_payment'
     and late_fee_required=true
     and payment_status in ('required','pending','paid')
   for update;
  if not found then raise exception 'Reschedule request is no longer payable'; end if;

  select * into v_event
    from public.member_calendar_events
   where id=v_req.event_id
     and member_id=v_req.member_id
     and status='scheduled'
     and kind in ('fob_sesh','lift_sesh')
   for update;
  if not found then raise exception 'Original session is no longer available'; end if;
  if v_event.starts_at is distinct from v_req.original_starts_at
     or v_event.ends_at is distinct from v_req.original_ends_at then
    raise exception 'Original session changed before payment finalized';
  end if;

  if not exists (
    select 1 from public.open_slots(from_ts=>now(),days=>190) o
     where o.slot_start=v_req.proposed_starts_at
  ) then raise exception 'Paid reschedule opening is no longer available'; end if;

  if exists (
    select 1 from public.member_calendar_events e
     where e.id<>v_event.id and e.status='scheduled'
       and (e.kind in ('fob_sesh','lift_sesh') or e.member_id=v_req.member_id)
       and tstzrange(e.starts_at,e.ends_at,'[)') && tstzrange(v_req.proposed_starts_at,v_req.proposed_ends_at,'[)')
  ) then raise exception 'Paid reschedule opening conflicts with a calendar event'; end if;

  if exists (
    select 1 from public.calendar_checkout_plan_slots s
    join public.calendar_checkout_plans p on p.id=s.plan_id
    where p.status in ('ready','checkout') and p.expires_at>now()
      and tstzrange(s.starts_at,s.ends_at,'[)') && tstzrange(v_req.proposed_starts_at,v_req.proposed_ends_at,'[)')
  ) then raise exception 'Paid reschedule opening is being held for checkout'; end if;

  if exists (
    select 1 from public.session_bookings b
     where b.status not in ('cancelled','completed')
       and tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(v_req.proposed_starts_at,v_req.proposed_ends_at,'[)')
  ) then raise exception 'Paid reschedule opening overlaps another booking'; end if;

  update public.member_calendar_events
     set starts_at=v_req.proposed_starts_at,
         ends_at=v_req.proposed_ends_at,
         updated_at=now()
   where id=v_event.id;

  update public.calendar_change_requests
     set status='approved',payment_status='paid',payment_reference=v_payment.id::text,
         resolved_at=now(),updated_at=now()
   where id=v_req.id;

  update public.service_payments
     set status='paid',stripe_checkout_session_id=p_stripe_checkout_session_id,
         stripe_payment_intent_id=nullif(left(coalesce(p_stripe_payment_intent_id,''),255),''),
         paid_at=coalesce(paid_at,now()),fulfilled_at=now(),updated_at=now()
   where id=v_payment.id;

  return jsonb_build_object('paid',true,'fulfilled',true,'member_id',v_req.member_id,'request_id',v_req.id,
    'event_id',v_event.id,'proposed_starts_at',v_req.proposed_starts_at);
end;
$$;
revoke all on function public.fulfill_late_reschedule_payment(uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.fulfill_late_reschedule_payment(uuid,text,text,integer) to service_role;
