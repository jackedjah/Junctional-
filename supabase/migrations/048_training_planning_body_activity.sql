-- MAHFITT R48 — canonical training planning, body progress, and activity foundation.
-- Service-role APIs remain the only web writers. Member/coach identity is resolved
-- by their existing authenticated server boundaries before any row is touched.

create table if not exists public.member_periodization_plans (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  name text not null,
  goal text,
  start_date date,
  end_date date,
  notes text,
  body jsonb not null default '{}'::jsonb,
  archived boolean not null default false,
  version integer not null default 1 check (version >= 1),
  updated_by text not null default 'member' check (updated_by in ('member','coach')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_periodization_body_object check (jsonb_typeof(body) = 'object')
);
create index if not exists member_periodization_member_idx
  on public.member_periodization_plans(member_id, archived, updated_at desc);
alter table public.member_periodization_plans enable row level security;

create table if not exists public.member_body_profile (
  member_id uuid primary key references public.payment_vip_members(id) on delete cascade,
  age_years integer check (age_years between 1 and 120),
  height_in numeric(6,2) check (height_in > 0 and height_in < 120),
  goal_weight_lb numeric(7,2) check (goal_weight_lb > 0 and goal_weight_lb < 1500),
  body_fat_formula_sex text check (body_fat_formula_sex in ('male','female')),
  use_estimated_body_fat_for_ffmi boolean not null default false,
  goal_body_fat_pct numeric(5,2) check (goal_body_fat_pct > 0 and goal_body_fat_pct < 70),
  goal_ffmi numeric(5,2) check (goal_ffmi >= 10 and goal_ffmi <= 40),
  tdee_formula_sex text check (tdee_formula_sex in ('male','female')),
  activity_factor numeric(5,3) check (activity_factor >= 1 and activity_factor <= 2.6),
  deficit_delta_kcal integer not null default 500 check (deficit_delta_kcal between 0 and 2000),
  surplus_delta_kcal integer not null default 250 check (surplus_delta_kcal between 0 and 2000),
  protein_g_per_lb numeric(4,2) not null default 0.80 check (protein_g_per_lb between 0 and 3),
  fat_g_per_lb numeric(4,2) not null default 0.30 check (fat_g_per_lb between 0 and 2),
  macro_scenario text not null default 'maintenance' check (macro_scenario in ('maintenance','deficit','surplus')),
  updated_at timestamptz not null default now()
);
alter table public.member_body_profile enable row level security;

create table if not exists public.member_body_measurements (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  measured_on date not null,
  weight_lb numeric(7,2) check (weight_lb > 0 and weight_lb < 1500),
  waist_in numeric(6,2) check (waist_in > 0 and waist_in < 120),
  body_fat_pct numeric(5,2) check (body_fat_pct > 0 and body_fat_pct < 70),
  source text not null default 'manual' check (source in ('manual','apple_health','apple_health_export')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_body_measurement_value check (weight_lb is not null or waist_in is not null or body_fat_pct is not null),
  unique(member_id, measured_on, source)
);
create index if not exists member_body_measurements_member_date_idx
  on public.member_body_measurements(member_id, measured_on asc);
alter table public.member_body_measurements enable row level security;

create table if not exists public.member_activity_segments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  activity_type text not null default 'unclassified' check (activity_type in ('walk','run','workout','unclassified')),
  state text not null default 'closed' check (state in ('active','paused','closed')),
  steps integer check (steps >= 0),
  distance_mi numeric(10,4) check (distance_mi >= 0),
  active_energy_kcal numeric(10,2) check (active_energy_kcal >= 0),
  energy_source text check (energy_source in ('healthkit','estimated')),
  source_summary jsonb not null default '{}'::jsonb,
  confidence text not null default 'unknown' check (confidence in ('high','moderate','unknown')),
  user_edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_activity_time_order check (ended_at >= started_at),
  constraint member_activity_source_object check (jsonb_typeof(source_summary) = 'object')
);
create index if not exists member_activity_segments_member_time_idx
  on public.member_activity_segments(member_id, started_at desc);
alter table public.member_activity_segments enable row level security;

comment on table public.member_periodization_plans is
  'Canonical member-owned macrocycle records. Mesocycles, microcycles and linked program ids live in validated body JSON; member and authorized coach edit the same row.';
comment on table public.member_body_measurements is
  'Dated body measurements. Manual and Apple Health sources remain distinguishable and never overwrite workout history.';
comment on table public.member_activity_segments is
  'Source-aware movement episodes prepared for HealthKit/watchOS ingestion. Web UI never claims a Watch connection from this table alone.';
comment on column public.member_activity_segments.source_summary is
  'Native-ingest metadata boundary for HealthKit source/revision/query provenance. A future iOS/watchOS importer should obtain canonical aggregates for stepCount, distanceWalkingRunning and activeEnergyBurned (for example via HealthKit statistics queries) and must not blindly sum mirrored phone + Watch samples.';

comment on column public.member_body_profile.body_fat_formula_sex is
  'Formula selection for the simple RFM-style tape estimate. Height and dated waist are the required measurements; estimates are always labeled.';
comment on column public.member_body_profile.use_estimated_body_fat_for_ffmi is
  'Explicit member/coach choice allowing estimated body-fat values to feed FFMI. Manual body-fat values remain preferred.';
