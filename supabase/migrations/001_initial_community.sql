-- ============================================================
-- FOB COMMUNITY :: 001 INITIAL SCHEMA (Phase A)
-- Scope: accounts, profiles, onboarding, privacy, blocks.
-- Discussions / messaging tables arrive in later migrations.
-- Run order: 001 -> 002 -> 003 -> 004 -> 005
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------
do $$ begin
  create type community_role as enum ('member','coach','moderator','admin','founder');
exception when duplicate_object then null; end $$;

do $$ begin
  -- Field-level audience. 'only_me' is the private floor.
  create type visibility_level as enum ('members','friends','only_me');
exception when duplicate_object then null; end $$;

do $$ begin
  create type experience_level as enum ('beginner','intermediate','advanced','professional');
exception when duplicate_object then null; end $$;

do $$ begin
  create type request_permission as enum ('everyone','friends_of_friends','nobody');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_permission as enum ('friends','friends_and_moderators','moderators_only');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- PROFILES
-- Publicly readable columns only. Anything sensitive lives in
-- profile_private. Roles live in user_roles so a member cannot
-- escalate themselves by updating their own profile row.
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  username         citext not null unique,
  display_name     text   not null,
  avatar_path      text,                       -- storage object path, never a signed URL
  bio              text,
  pronouns         text,
  hometown         text,                       -- text only, never geocoded
  current_city     text,                       -- text only, never geocoded
  age_years        integer,                    -- derived from DOB by trigger, never the DOB itself
  experience_level experience_level,
  fob_experience   text,
  training_goals   text,
  website_url      text,
  profile_visibility visibility_level not null default 'members',
  allow_indexing   boolean not null default false,  -- profiles are noindex until opted in
  onboarding_completed boolean not null default false,
  onboarding_step  smallint not null default 0,
  member_since     timestamptz not null default now(),
  last_active_at   timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,

  constraint username_format check (username ~ '^[a-z0-9._]{3,24}$'),
  constraint username_no_edge_punct check (username !~ '^[._]' and username !~ '[._]$'),
  constraint display_name_len check (char_length(display_name) between 1 and 50),
  constraint bio_len check (bio is null or char_length(bio) <= 500),
  constraint pronouns_len check (pronouns is null or char_length(pronouns) <= 40),
  constraint hometown_len check (hometown is null or char_length(hometown) <= 80),
  constraint current_city_len check (current_city is null or char_length(current_city) <= 80),
  constraint training_goals_len check (training_goals is null or char_length(training_goals) <= 400),
  constraint fob_experience_len check (fob_experience is null or char_length(fob_experience) <= 200),
  constraint age_sane check (age_years is null or (age_years between 18 and 120)),
  constraint website_is_http check (website_url is null or website_url ~* '^https?://[^\s]+$')
);

create index if not exists profiles_username_idx on public.profiles (username);
create index if not exists profiles_active_idx on public.profiles (created_at desc) where deleted_at is null;
create index if not exists profiles_search_idx on public.profiles
  using gin (to_tsvector('english', coalesce(display_name,'') || ' ' || coalesce(username::text,'') || ' ' || coalesce(bio,'')));

comment on column public.profiles.age_years is
  'Derived from profile_private.date_of_birth by trigger. The DOB itself is never exposed.';

-- ------------------------------------------------------------
-- PROFILE_PRIVATE
-- Owner-only. Date of birth is kept out of profiles entirely so
-- that no profile-read policy can ever leak it.
-- ------------------------------------------------------------
create table if not exists public.profile_private (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  date_of_birth      date not null,
  age_confirmed_at   timestamptz not null default now(),
  terms_accepted_at  timestamptz not null,
  guidelines_accepted_at timestamptz not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint dob_is_past check (date_of_birth < current_date),
  constraint dob_min_age check (date_of_birth <= current_date - interval '18 years')
);

comment on table public.profile_private is
  'Owner-read-only. 18+ gate enforced here by check constraint AND by RLS.';

-- ------------------------------------------------------------
-- ROLES
-- Separate table. Nobody can self-assign; see 002 policies.
-- ------------------------------------------------------------
create table if not exists public.user_roles (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       community_role not null default 'member',
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);
create index if not exists user_roles_role_idx on public.user_roles (role);

-- ------------------------------------------------------------
-- SPORTS + INTERESTS (controlled vocabularies)
-- Custom additions are allowed but land unapproved and are not
-- surfaced in discovery until a moderator approves them.
-- ------------------------------------------------------------
create table if not exists public.sports (
  id          uuid primary key default gen_random_uuid(),
  slug        citext not null unique,
  name        text not null,
  sort_order  integer not null default 100,
  is_approved boolean not null default true,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint sport_slug_format check (slug ~ '^[a-z0-9-]{2,40}$'),
  constraint sport_name_len check (char_length(name) between 2 and 60)
);

create table if not exists public.interests (
  id          uuid primary key default gen_random_uuid(),
  slug        citext not null unique,
  name        text not null,
  grouping    text not null default 'general',
  sort_order  integer not null default 100,
  is_approved boolean not null default true,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint interest_slug_format check (slug ~ '^[a-z0-9-]{2,40}$'),
  constraint interest_name_len check (char_length(name) between 2 and 60)
);

create table if not exists public.user_sports (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  sport_id   uuid not null references public.sports(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, sport_id)
);
-- exactly one primary sport per member
create unique index if not exists user_sports_one_primary
  on public.user_sports (user_id) where is_primary;
create index if not exists user_sports_sport_idx on public.user_sports (sport_id);

create table if not exists public.user_interests (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  interest_id uuid not null references public.interests(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, interest_id)
);
create index if not exists user_interests_interest_idx on public.user_interests (interest_id);

-- ------------------------------------------------------------
-- PRIVACY SETTINGS
-- One row per member, created by trigger at signup.
-- ------------------------------------------------------------
create table if not exists public.privacy_settings (
  user_id             uuid primary key references public.profiles(id) on delete cascade,
  show_age            visibility_level not null default 'only_me',
  show_hometown       visibility_level not null default 'only_me',
  show_current_city   visibility_level not null default 'only_me',
  show_friends_list   visibility_level not null default 'members',
  show_activity_status boolean         not null default true,
  show_recent_activity visibility_level not null default 'members',
  show_sports         visibility_level not null default 'members',
  show_training_goals visibility_level not null default 'members',
  who_can_friend_request request_permission not null default 'everyone',
  who_can_message     message_permission not null default 'friends',
  who_can_mention     request_permission not null default 'everyone',
  updated_at          timestamptz not null default now()
);

comment on table public.privacy_settings is
  'Age, hometown and city default to only_me. Members opt in to visibility.';

-- ------------------------------------------------------------
-- BLOCKS
-- Introduced in Phase A because every profile-read policy must
-- already respect it. Blocking later would mean rewriting RLS.
-- ------------------------------------------------------------
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  reason     text,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);
create index if not exists blocks_blocked_idx on public.blocks (blocked_id);

-- ------------------------------------------------------------
-- RESERVED USERNAMES
-- ------------------------------------------------------------
create table if not exists public.reserved_usernames (
  username citext primary key,
  reason   text
);

-- ------------------------------------------------------------
-- COMMUNITY SETTINGS (single-row key/value config)
-- ------------------------------------------------------------
create table if not exists public.community_settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- AUDIT LOG (privileged actions only)
-- ------------------------------------------------------------
create table if not exists public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  target_type text,
  target_id   text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs (action, created_at desc);
