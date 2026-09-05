-- MAHFITT v393 :: member reschedule request v2
-- Run after 040_member_message_center.sql.
-- Adds the 16-hour/$12 consent state machine without introducing payment yet.
-- Fee-required coach approvals move to awaiting_payment and DO NOT move the
-- original calendar event. v394 will attach Stripe payment + finalization.

alter table public.calendar_change_requests
  add column if not exists original_starts_at timestamptz,
  add column if not exists original_ends_at timestamptz,
  add column if not exists late_fee_required boolean not null default false,
  add column if not exists late_fee_amount_cents integer not null default 1200,
  add column if not exists late_fee_accepted_at timestamptz,
  add column if not exists payment_status text not null default 'not_required',
  add column if not exists coach_decision_at timestamptz,
  add column if not exists payment_reference text;

update public.calendar_change_requests r
   set original_starts_at=coalesce(r.original_starts_at,e.starts_at),
       original_ends_at=coalesce(r.original_ends_at,e.ends_at)
  from public.member_calendar_events e
 where e.id=r.event_id
   and (r.original_starts_at is null or r.original_ends_at is null);

alter table public.calendar_change_requests
  alter column original_starts_at set not null,
  alter column original_ends_at set not null;

alter table public.calendar_change_requests
  drop constraint if exists calendar_change_requests_status_check;
alter table public.calendar_change_requests
  add constraint calendar_change_requests_status_check
  check (status in ('pending','awaiting_payment','approved','declined','withdrawn'));

alter table public.calendar_change_requests
  drop constraint if exists calendar_change_requests_payment_status_check;
alter table public.calendar_change_requests
  add constraint calendar_change_requests_payment_status_check
  check (payment_status in ('not_required','required','pending','paid','waived','expired'));

alter table public.calendar_change_requests
  drop constraint if exists calendar_change_requests_late_fee_amount_check;
alter table public.calendar_change_requests
  add constraint calendar_change_requests_late_fee_amount_check
  check (late_fee_amount_cents between 0 and 10000);

alter table public.calendar_change_requests
  drop constraint if exists calendar_change_requests_late_fee_consent_check;
alter table public.calendar_change_requests
  add constraint calendar_change_requests_late_fee_consent_check
  check (not late_fee_required or late_fee_accepted_at is not null);

alter table public.calendar_change_requests
  drop constraint if exists calendar_change_requests_awaiting_payment_check;
alter table public.calendar_change_requests
  add constraint calendar_change_requests_awaiting_payment_check
  check (status <> 'awaiting_payment' or (late_fee_required and payment_status in ('required','pending','paid')));

-- One unresolved request per session, including a coach-approved request that
-- is waiting for its late-reschedule payment.
drop index if exists public.calendar_change_request_pending_uq;
create unique index if not exists calendar_change_request_open_uq
  on public.calendar_change_requests(event_id)
  where status in ('pending','awaiting_payment');

-- Message Center already reserves request_type='reschedule'. Expand its state
-- vocabulary so coach approval can visibly enter awaiting-payment.
alter table public.member_messages
  drop constraint if exists member_messages_request_status_check;
alter table public.member_messages
  add constraint member_messages_request_status_check
  check (request_status is null or request_status in (
    'pending','awaiting_payment','approved','resolved','declined','cancelled'
  ));

-- Server-authoritative request creation. The $12 rule is evaluated against
-- BOTH the original session and the proposed session at the moment the request
-- is committed. The browser cannot turn this fee off.
create or replace function public.create_calendar_change_request_v2(
  p_member_id uuid,
  p_event_id uuid,
  p_proposed_starts_at timestamptz,
  p_proposed_ends_at timestamptz,
  p_reason text,
  p_late_fee_accepted boolean default false
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_event public.member_calendar_events%rowtype;
  v_req public.calendar_change_requests%rowtype;
  v_fee boolean;
begin
  if p_proposed_ends_at<=p_proposed_starts_at then raise exception 'Invalid proposed session'; end if;
  if p_proposed_starts_at<=now() then raise exception 'Choose a future session time'; end if;
  perform pg_advisory_xact_lock(hashtext('fob-calendar-checkout-plan'));

  select * into v_event
    from public.member_calendar_events
   where id=p_event_id and member_id=p_member_id
     and kind in ('fob_sesh','lift_sesh') and status='scheduled'
   for update;
  if not found then raise exception 'That scheduled session was not found'; end if;
  if v_event.starts_at<=now() then raise exception 'That session has already started'; end if;

  if exists (
    select 1 from public.calendar_change_requests
     where event_id=v_event.id and status in ('pending','awaiting_payment')
  ) then raise exception 'A reschedule request is already open for this session'; end if;

  v_fee := (v_event.starts_at <= now()+interval '16 hours')
        or (p_proposed_starts_at <= now()+interval '16 hours');
  if v_fee and not coalesce(p_late_fee_accepted,false) then
    raise exception 'LATE_FEE_ACCEPTANCE_REQUIRED';
  end if;

  if not exists (
    select 1 from public.open_slots(from_ts=>now(),days=>190) o
     where o.slot_start=p_proposed_starts_at
  ) then raise exception 'That proposed opening is no longer available'; end if;

  if exists (
    select 1 from public.member_calendar_events e
     where e.id<>v_event.id and e.status='scheduled'
       and (e.kind in ('fob_sesh','lift_sesh') or e.member_id=p_member_id)
       and tstzrange(e.starts_at,e.ends_at,'[)')
         && tstzrange(p_proposed_starts_at,p_proposed_ends_at,'[)')
  ) then raise exception 'That proposed opening conflicts with a calendar event'; end if;

  if exists (
    select 1 from public.calendar_checkout_plan_slots s
    join public.calendar_checkout_plans p on p.id=s.plan_id
     where p.status in ('ready','checkout') and p.expires_at>now()
       and tstzrange(s.starts_at,s.ends_at,'[)')
         && tstzrange(p_proposed_starts_at,p_proposed_ends_at,'[)')
  ) then raise exception 'That proposed opening is being held for checkout'; end if;

  if exists (
    select 1 from public.session_bookings b
     where b.status not in ('cancelled','completed')
       and tstzrange(b.starts_at,b.ends_at,'[)')
         && tstzrange(p_proposed_starts_at,p_proposed_ends_at,'[)')
  ) then raise exception 'That proposed opening overlaps another booking'; end if;

  insert into public.calendar_change_requests(
    event_id,member_id,original_starts_at,original_ends_at,
    proposed_starts_at,proposed_ends_at,reason,status,
    late_fee_required,late_fee_amount_cents,late_fee_accepted_at,payment_status
  ) values (
    v_event.id,p_member_id,v_event.starts_at,v_event.ends_at,
    p_proposed_starts_at,p_proposed_ends_at,nullif(trim(coalesce(p_reason,'')),''),'pending',
    v_fee,1200,case when v_fee then now() else null end,
    case when v_fee then 'required' else 'not_required' end
  ) returning * into v_req;

  return to_jsonb(v_req);
end;
$$;
revoke all on function public.create_calendar_change_request_v2(uuid,uuid,timestamptz,timestamptz,text,boolean) from public,anon,authenticated;
grant execute on function public.create_calendar_change_request_v2(uuid,uuid,timestamptz,timestamptz,text,boolean) to service_role;

-- Coach resolution remains atomic. No-fee approvals move the event immediately.
-- Fee-required approvals only enter awaiting_payment; the original event remains
-- authoritative until v394's webhook-confirmed payment finalizer runs.
create or replace function public.resolve_calendar_change_request_v2(
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

  if p_decision='declined' then
    update public.calendar_change_requests
       set status='declined',resolved_at=now(),coach_decision_at=now(),updated_at=now()
     where id=v_req.id returning * into v_req;
    return to_jsonb(v_req);
  end if;

  select * into v_event from public.member_calendar_events
   where id=v_req.event_id and member_id=v_req.member_id
     and kind in ('fob_sesh','lift_sesh') and status='scheduled' for update;
  if not found then raise exception 'The scheduled session was not found'; end if;

  -- Original-session snapshot protects against silently approving a request
  -- after the coach or another workflow already moved the event.
  if v_event.starts_at is distinct from v_req.original_starts_at
     or v_event.ends_at is distinct from v_req.original_ends_at then
    raise exception 'The original session changed after this request was submitted';
  end if;

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

  if v_req.late_fee_required then
    if v_req.late_fee_accepted_at is null then raise exception 'Late fee consent is missing'; end if;
    update public.calendar_change_requests
       set status='awaiting_payment',payment_status='required',coach_decision_at=now(),updated_at=now()
     where id=v_req.id returning * into v_req;
    return to_jsonb(v_req);
  end if;

  update public.member_calendar_events
     set starts_at=v_req.proposed_starts_at,ends_at=v_req.proposed_ends_at,updated_at=now()
   where id=v_event.id;
  update public.calendar_change_requests
     set status='approved',payment_status='not_required',resolved_at=now(),coach_decision_at=now(),updated_at=now()
   where id=v_req.id returning * into v_req;
  return to_jsonb(v_req);
end;
$$;
revoke all on function public.resolve_calendar_change_request_v2(uuid,text) from public,anon,authenticated;
grant execute on function public.resolve_calendar_change_request_v2(uuid,text) to service_role;

-- Compatibility guard: any older server path or manual tool that still calls
-- the v352 function name is routed through the v393 state machine instead of
-- bypassing late-fee consent/payment gating.
create or replace function public.resolve_calendar_change_request(
  p_request_id uuid,
  p_decision text
) returns jsonb
language sql
security definer
set search_path=public
as $$
  select public.resolve_calendar_change_request_v2(p_request_id,p_decision);
$$;
revoke all on function public.resolve_calendar_change_request(uuid,text) from public,anon,authenticated;
grant execute on function public.resolve_calendar_change_request(uuid,text) to service_role;
