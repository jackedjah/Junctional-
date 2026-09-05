-- FOB Systems :: member performance history + progress tracker
-- Extends the existing payment_vip_members ledger. Nothing existing is altered.
--
-- Two concepts:
--   fob_active_sessions  one live, autosaved FOB Rounds session per member
--   fob_performances     one immutable-ish snapshot per completed session
--
-- Security follows the payment_vip_members precedent exactly: RLS on, no anon
-- or authenticated policies at all. Only Netlify Functions holding
-- SUPABASE_SERVICE_ROLE_KEY can read or write, and those functions are gated
-- behind the existing admin session cookie. A browser client cannot reach this
-- data even with a valid anon key.

create table if not exists public.fob_active_sessions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  client_rev bigint not null default 0,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

-- At most one open session per member. Closed sessions are kept for audit.
create unique index if not exists fob_active_sessions_one_open
  on public.fob_active_sessions(member_id)
  where closed_at is null;

create index if not exists fob_active_sessions_member_idx
  on public.fob_active_sessions(member_id, updated_at desc);

alter table public.fob_active_sessions enable row level security;


create table if not exists public.fob_performances (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.payment_vip_members(id) on delete cascade,

  -- Idempotency key. One completed performance per FOB Rounds session, no
  -- matter how many times FOBreakdown is opened, refreshed or reopened.
  active_session_id uuid not null unique,

  session_date date not null,
  started_at timestamptz,
  completed_at timestamptz not null default now(),

  -- Which rules produced these numbers. Old scores stay interpretable when the
  -- model moves on. Nothing recalculates old rows without an explicit migration.
  scoring_version text not null default 'fob-v1',

  -- ---- score outputs, exactly as FOB Rounds computed them -----------------
  overall_score numeric(5,2) not null,
  points_earned integer not null default 0,
  points_possible integer not null default 0,
  badge_id text not null,
  badge_name text not null,

  core_pct numeric(5,2),
  iso_pct numeric(5,2),
  pp_pct numeric(5,2),
  tech_pct numeric(5,2),

  drops integer not null default 0,
  best_round_pct numeric(5,2),
  round_delta_pct numeric(6,2),

  sets_logged integer not null default 0,
  sets_total integer not null default 40,
  rounds_recorded integer not null default 0,
  rounds_total integer not null default 4,
  bonus_seconds integer not null default 0,

  -- ---- prescription inputs, round 1 baseline ------------------------------
  profile_key text,
  profile_label text,
  block_lb integer,
  band_level text,
  marker_core_in integer,
  marker_pp_in integer,
  dur_core_s integer,
  dur_iso_s integer,
  dur_pp_s integer,
  dur_tech_s integer,

  -- ---- raw material -------------------------------------------------------
  -- Full round state so a historical FOBreakdown can be rebuilt from what was
  -- actually recorded that day, never from the member's newest settings.
  state jsonb not null default '{}'::jsonb,
  round_scores jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists fob_performances_member_idx
  on public.fob_performances(member_id, session_date asc, completed_at asc);

create index if not exists fob_performances_member_score_idx
  on public.fob_performances(member_id, overall_score desc);

alter table public.fob_performances enable row level security;

comment on table public.fob_active_sessions is
  'Live autosaved FOB Rounds state. One open row per member. Service role only.';
comment on table public.fob_performances is
  'Completed FOB SESH snapshots. active_session_id is the idempotency key. Service role only.';
comment on column public.fob_performances.scoring_version is
  'Rules version that produced these numbers. Do not recalculate old rows silently.';
