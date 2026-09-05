-- MAHFITT R49 — guided periodization + live activity + Calendar correlation.
-- Forward-only extension of R48 migration 048. Do not edit or replay 048 to
-- change an already-applied database. Existing rows remain valid.

-- A live Walk / Run / Misc activity may remain open until the member finishes.
alter table public.member_activity_segments
  alter column ended_at drop not null;

alter table public.member_activity_segments
  drop constraint if exists member_activity_time_order;
alter table public.member_activity_segments
  add constraint member_activity_time_order
  check (ended_at is null or ended_at >= started_at);

alter table public.member_activity_segments
  drop constraint if exists member_activity_segments_activity_type_check;
alter table public.member_activity_segments
  add constraint member_activity_segments_activity_type_check
  check (activity_type in ('walk','run','misc','workout','unclassified'));

alter table public.member_activity_segments
  add column if not exists activity_label text,
  add column if not exists target_minutes integer,
  add column if not exists incline_pct numeric(5,2),
  add column if not exists effort_level text,
  add column if not exists paused_at timestamptz,
  add column if not exists paused_ms bigint not null default 0,
  add column if not exists client_key text,
  add column if not exists body_weight_lb numeric(7,2);

alter table public.member_activity_segments
  drop constraint if exists member_activity_target_minutes_check;
alter table public.member_activity_segments
  add constraint member_activity_target_minutes_check
  check (target_minutes is null or target_minutes between 1 and 1440);

alter table public.member_activity_segments
  drop constraint if exists member_activity_incline_pct_check;
alter table public.member_activity_segments
  add constraint member_activity_incline_pct_check
  check (incline_pct is null or incline_pct between 0 and 50);

alter table public.member_activity_segments
  drop constraint if exists member_activity_effort_level_check;
alter table public.member_activity_segments
  add constraint member_activity_effort_level_check
  check (effort_level is null or effort_level in ('easy','moderate','hard','very_hard'));

alter table public.member_activity_segments
  drop constraint if exists member_activity_body_weight_check;
alter table public.member_activity_segments
  add constraint member_activity_body_weight_check
  check (body_weight_lb is null or body_weight_lb between 1 and 1500);

create unique index if not exists member_activity_client_key_uq
  on public.member_activity_segments(member_id, client_key)
  where client_key is not null;

create index if not exists member_activity_live_idx
  on public.member_activity_segments(member_id, state, started_at desc)
  where state in ('active','paused');

comment on column public.member_activity_segments.client_key is
  'Client-generated idempotency key. Retrying a live Activity start must reuse the same canonical row.';
comment on column public.member_activity_segments.paused_ms is
  'Accumulated paused duration. Elapsed active time is derived from timestamps, never an increment-only timer.';
comment on column public.member_activity_segments.body_weight_lb is
  'Canonical body weight snapshot used for estimates. It is copied from member body data, never re-entered as a separate Activity weight.';

-- Completed Activity is represented by the existing canonical Calendar table.
-- Rendering resolves semantic role "activity" to the member Theme Secondary.
alter table public.member_calendar_events
  drop constraint if exists member_calendar_events_kind_check;
alter table public.member_calendar_events
  add constraint member_calendar_events_kind_check
  check (kind in ('personal','fob_sesh','lift_sesh','activity'));

alter table public.member_calendar_events
  drop constraint if exists member_calendar_events_source_check;
alter table public.member_calendar_events
  add constraint member_calendar_events_source_check
  check (source in ('personal','purchase','coach','activity'));

alter table public.member_calendar_events
  add column if not exists activity_segment_id uuid references public.member_activity_segments(id) on delete cascade,
  add column if not exists semantic_role text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.member_calendar_events
  drop constraint if exists member_calendar_semantic_role_check;
alter table public.member_calendar_events
  add constraint member_calendar_semantic_role_check
  check (semantic_role is null or semantic_role in ('activity'));

alter table public.member_calendar_events
  drop constraint if exists member_calendar_metadata_object;
alter table public.member_calendar_events
  add constraint member_calendar_metadata_object
  check (jsonb_typeof(metadata) = 'object');

create unique index if not exists member_calendar_activity_segment_uq
  on public.member_calendar_events(member_id, activity_segment_id)
  where activity_segment_id is not null;

comment on column public.member_calendar_events.semantic_role is
  'Semantic visual role. Activity events resolve to the member Theme Secondary at render time instead of storing a sporty fixed color.';
comment on column public.member_calendar_events.activity_segment_id is
  'Canonical idempotency link to Activity. Retry/correction updates the same Calendar event instead of inserting a duplicate.';
