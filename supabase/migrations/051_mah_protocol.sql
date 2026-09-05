-- MAHFITT — MAH PROTOCOL. Forward-only extension of 048/049/050.
-- Do not edit or replay 048, 049 or 050 to change an already-applied database.
--
-- OWNERSHIP DECISION (recorded here so it cannot drift):
--   * The Protocol IS a periodization plan. `member_periodization_plans`
--     remains the single canonical protocol/periodization record; this
--     migration adds NO competing plan table.
--   * `member_calendar_events` remains the single canonical calendar table;
--     Protocol scheduling extends it exactly the way migration 049 extended it
--     for Activity (kind + source + semantic_role + a uniqueness rule), rather
--     than introducing a second calendar.
--   * `member_protocol_preferences` holds ONLY reusable onboarding inputs that
--     no existing table owns. It stores no measurement, no program, no calendar
--     event and no image blob — selected photos are stored as MAH MEDIA ids.

-- ── 1 · Reusable Protocol inputs ─────────────────────────────────────────────
create table if not exists public.member_protocol_preferences (
  member_id uuid primary key references public.payment_vip_members(id) on delete cascade,
  -- Chosen destination. The member picks this; it is never inferred from a photo.
  target_physique_path text,
  primary_goal text,
  secondary_goal text,
  duration_weeks integer,
  -- Availability, training and food inputs. Free-form member text is stored as
  -- data and is never replayed to a model as instructions.
  training_preferences jsonb not null default '{}'::jsonb,
  equipment jsonb not null default '{}'::jsonb,
  availability jsonb not null default '{}'::jsonb,
  activity_preferences jsonb not null default '{}'::jsonb,
  food_preferences jsonb not null default '{}'::jsonb,
  -- Resumable onboarding draft. Autosaved server-side so a network or AI
  -- failure cannot lose what the member already typed.
  onboarding_draft jsonb not null default '{}'::jsonb,
  onboarding_step integer not null default 1,
  -- Optional visual physique review consent + selections. References only.
  visual_consent jsonb not null default '{}'::jsonb,
  visual_media_ids jsonb not null default '[]'::jsonb,
  visual_review jsonb,
  visual_review_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.member_protocol_preferences
  drop constraint if exists member_protocol_path_check;
alter table public.member_protocol_preferences
  add constraint member_protocol_path_check
  check (target_physique_path is null or target_physique_path in
    ('acrobat','brawler','titan','sprinter','ranger','hybrid'));

alter table public.member_protocol_preferences
  drop constraint if exists member_protocol_duration_check;
alter table public.member_protocol_preferences
  add constraint member_protocol_duration_check
  check (duration_weeks is null or duration_weeks between 1 and 104);

alter table public.member_protocol_preferences
  drop constraint if exists member_protocol_step_check;
alter table public.member_protocol_preferences
  add constraint member_protocol_step_check
  check (onboarding_step between 1 and 7);

do $$
declare col text;
begin
  foreach col in array array['training_preferences','equipment','availability',
    'activity_preferences','food_preferences','onboarding_draft','visual_consent']
  loop
    execute format(
      'alter table public.member_protocol_preferences drop constraint if exists member_protocol_%1$s_object', col);
    execute format(
      'alter table public.member_protocol_preferences add constraint member_protocol_%1$s_object check (jsonb_typeof(%1$s) = ''object'')', col);
  end loop;
end $$;

alter table public.member_protocol_preferences
  drop constraint if exists member_protocol_media_array;
alter table public.member_protocol_preferences
  add constraint member_protocol_media_array
  check (jsonb_typeof(visual_media_ids) = 'array');

comment on table public.member_protocol_preferences is
  'MAH PROTOCOL reusable inputs. Deliberately holds no body measurement, program, calendar event or photo blob — those keep their existing canonical owners.';
comment on column public.member_protocol_preferences.target_physique_path is
  'Member-chosen destination path. MAHFITT never infers a body type or identity from an image.';
comment on column public.member_protocol_preferences.visual_media_ids is
  'MAH MEDIA row ids only. Private images are never duplicated into a second bucket.';
comment on column public.member_protocol_preferences.onboarding_draft is
  'Server-side autosaved onboarding draft so an AI or network failure preserves member input.';

-- ── 2 · Protocol correlation on the existing canonical Calendar ──────────────
-- Mirrors the migration 049 Activity pattern: extend the one calendar table,
-- never add a second one.
alter table public.member_calendar_events
  drop constraint if exists member_calendar_events_kind_check;
alter table public.member_calendar_events
  add constraint member_calendar_events_kind_check
  check (kind in ('personal','fob_sesh','lift_sesh','activity','protocol'));

alter table public.member_calendar_events
  drop constraint if exists member_calendar_events_source_check;
alter table public.member_calendar_events
  add constraint member_calendar_events_source_check
  check (source in ('personal','purchase','coach','activity','protocol'));

alter table public.member_calendar_events
  add column if not exists protocol_plan_id uuid
    references public.member_periodization_plans(id) on delete cascade,
  add column if not exists protocol_item_key text;

alter table public.member_calendar_events
  drop constraint if exists member_calendar_semantic_role_check;
alter table public.member_calendar_events
  add constraint member_calendar_semantic_role_check
  check (semantic_role is null or semantic_role in
    ('activity','protocol_workout','protocol_activity','protocol_recovery','protocol_nutrition'));

alter table public.member_calendar_events
  drop constraint if exists member_calendar_protocol_item_key_check;
alter table public.member_calendar_events
  add constraint member_calendar_protocol_item_key_check
  check (protocol_item_key is null or char_length(protocol_item_key) between 1 and 120);

-- A Protocol row must carry both its plan and its stable item key, or neither.
alter table public.member_calendar_events
  drop constraint if exists member_calendar_protocol_pairing;
alter table public.member_calendar_events
  add constraint member_calendar_protocol_pairing
  check ((protocol_plan_id is null) = (protocol_item_key is null));

-- IDEMPOTENCY RULE. Re-confirming the same schedule updates the same rows
-- instead of inserting duplicates.
create unique index if not exists member_calendar_protocol_item_uq
  on public.member_calendar_events(member_id, protocol_plan_id, protocol_item_key)
  where protocol_item_key is not null;

create index if not exists member_calendar_protocol_plan_idx
  on public.member_calendar_events(member_id, protocol_plan_id, starts_at)
  where protocol_plan_id is not null;

comment on column public.member_calendar_events.protocol_plan_id is
  'Canonical link to the member_periodization_plans row that owns this Protocol. No second plan table exists.';
comment on column public.member_calendar_events.protocol_item_key is
  'Stable per-item key. Together with member_id + protocol_plan_id it is the idempotency identity for Protocol scheduling.';

-- Protocol events resolve their colour from the active MAHFITT theme at render
-- time through semantic_role. No theme-specific colour is stored as identity.

-- ── 3 · Privacy boundary for Protocol preferences ────────────────────────────
-- This migration is intentionally still unapplied at the time of this repair,
-- so harden the original table definition before it ever reaches production.
alter table public.member_protocol_preferences enable row level security;
revoke all on table public.member_protocol_preferences from public, anon, authenticated;
grant select, insert, update, delete on table public.member_protocol_preferences to service_role;

-- ── 4 · Atomic Protocol Calendar commit ─────────────────────────────────────
-- One server-only transaction owns final conflict re-check + all writes.
-- The advisory xact lock serializes repeated/concurrent confirmations for the
-- same member/Protocol, while the unique index above preserves stable identity.
create or replace function public.commit_mah_protocol_schedule(
  p_member_id uuid,
  p_plan_id uuid,
  p_items jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item jsonb;
  v_other jsonb;
  v_conflicts jsonb := '[]'::jsonb;
  v_written jsonb := '[]'::jsonb;
  v_row public.member_calendar_events%rowtype;
  v_key text;
  v_start timestamptz;
  v_end timestamptz;
  v_title text;
  v_notes text;
  v_type text;
  v_role text;
  v_day integer;
begin
  if p_member_id is null or p_plan_id is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 then
    return jsonb_build_object('ok',false,'code','BAD_REQUEST','conflicts','[]'::jsonb);
  end if;

  if not exists (
    select 1 from public.member_periodization_plans
    where id=p_plan_id and member_id=p_member_id and archived=false
  ) then
    return jsonb_build_object('ok',false,'code','NOT_FOUND','conflicts','[]'::jsonb);
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_member_id::text || ':' || p_plan_id::text, 0));

  -- Reject malformed or duplicate item identities before any write.
  if exists (
    select 1 from jsonb_array_elements(p_items) x
    where coalesce(length(trim(x->>'key')),0)=0
       or length(x->>'key') > 120
       or nullif(x->>'startsAt','') is null
       or nullif(x->>'endsAt','') is null
       or (x->>'endsAt')::timestamptz <= (x->>'startsAt')::timestamptz
  ) or exists (
    select 1 from (
      select x->>'key' k, count(*) c from jsonb_array_elements(p_items) x group by x->>'key'
    ) d where d.c > 1
  ) then
    return jsonb_build_object('ok',false,'code','BAD_ITEMS','conflicts','[]'::jsonb);
  end if;

  -- Proposal-versus-proposal overlap. Touching endpoints are allowed.
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    for v_other in select value from jsonb_array_elements(p_items)
    loop
      if (v_item->>'key') < (v_other->>'key')
         and (v_item->>'startsAt')::timestamptz < (v_other->>'endsAt')::timestamptz
         and (v_item->>'endsAt')::timestamptz > (v_other->>'startsAt')::timestamptz then
        v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
          'key',v_item->>'key','withKey',v_other->>'key','reason','proposal_overlap'));
      end if;
    end loop;
  end loop;

  -- Re-check the canonical Calendar immediately before writing. Exclude only
  -- the same stable Protocol identity so an identical retry is idempotent.
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    for v_row in
      select e.* from public.member_calendar_events e
      where e.member_id=p_member_id
        and e.status <> 'cancelled'
        and e.ends_at > (v_item->>'startsAt')::timestamptz
        and e.starts_at < (v_item->>'endsAt')::timestamptz
        and not (e.kind='protocol' and e.protocol_plan_id=p_plan_id and e.protocol_item_key=(v_item->>'key'))
      order by e.starts_at
    loop
      v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
        'key',v_item->>'key','eventId',v_row.id,'kind',v_row.kind,'title',v_row.title,
        'startsAt',v_row.starts_at,'endsAt',v_row.ends_at,
        'paidBooking',(v_row.kind in ('fob_sesh','lift_sesh')),'reason','calendar_overlap'));
    end loop;
  end loop;

  if jsonb_array_length(v_conflicts) > 0 then
    return jsonb_build_object('ok',false,'code','PROTOCOL_SCHEDULE_CONFLICT','conflicts',v_conflicts,'items',p_items);
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_key := left(trim(v_item->>'key'),120);
    v_start := (v_item->>'startsAt')::timestamptz;
    v_end := (v_item->>'endsAt')::timestamptz;
    v_title := left(coalesce(nullif(trim(v_item->>'title'),''),'MAH Protocol'),110);
    v_notes := nullif(left(coalesce(v_item->>'notes',''),1200),'');
    v_type := case when v_item->>'itemType' in ('workout','activity','recovery','nutrition') then v_item->>'itemType' else 'workout' end;
    v_role := case v_type when 'activity' then 'protocol_activity' when 'recovery' then 'protocol_recovery' when 'nutrition' then 'protocol_nutrition' else 'protocol_workout' end;
    v_day := case when (v_item->>'programDayIndex') ~ '^-?[0-9]+$' then (v_item->>'programDayIndex')::integer else null end;

    insert into public.member_calendar_events(
      member_id,kind,title,notes,starts_at,ends_at,all_day,color,status,source,created_by,
      protocol_plan_id,protocol_item_key,semantic_role,metadata,updated_at
    ) values (
      p_member_id,'protocol',v_title,v_notes,v_start,v_end,false,'white','scheduled','protocol','member',
      p_plan_id,v_key,v_role,jsonb_build_object('itemType',v_type,'programDayIndex',v_day,'protocolItemKey',v_key),now()
    )
    on conflict (member_id,protocol_plan_id,protocol_item_key) where protocol_item_key is not null
    do update set title=excluded.title,notes=excluded.notes,starts_at=excluded.starts_at,ends_at=excluded.ends_at,
      all_day=false,color='white',status='scheduled',semantic_role=excluded.semantic_role,
      metadata=excluded.metadata,updated_at=now()
    returning * into v_row;

    v_written := v_written || jsonb_build_array(jsonb_build_object(
      'key',v_key,'id',v_row.id,'startsAt',v_row.starts_at,'endsAt',v_row.ends_at,
      'title',v_row.title,'itemType',v_type));
  end loop;

  return jsonb_build_object('ok',true,'planId',p_plan_id,'written',v_written,'conflicts','[]'::jsonb);
end;
$$;

revoke all on function public.commit_mah_protocol_schedule(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.commit_mah_protocol_schedule(uuid,uuid,jsonb) to service_role;
