-- FOB Systems v355 :: expanded member calendar event palette
-- Existing v352/v354 installs need this once so the UI/API colors are accepted
-- by the database constraint and the coach calendar RPC.

alter table public.member_calendar_events
  drop constraint if exists member_calendar_events_color_check;
alter table public.member_calendar_events
  add constraint member_calendar_events_color_check
  check (color in ('gold','blue','green','white','orange','purple','yellow','beige'));

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
