-- ============================================================
-- FOB COMMUNITY :: 006 DISCUSSIONS (Phase B)
-- Categories, discussions, replies, reactions, saves, follows.
-- Run after 005. Policies land in 007, logic in 008.
-- ============================================================

do $$ begin
  create type research_label as enum (
    'framework_principle','research_question','founder_observation',
    'community_observation','evidence_requested','field_test','unresolved'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type reaction_kind as enum ('like','insightful','strong','helpful','celebrate');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_visibility as enum ('members','friends');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- CATEGORIES
-- ------------------------------------------------------------
create table if not exists public.categories (
  id           uuid primary key default gen_random_uuid(),
  slug         citext not null unique,
  name         text not null,
  description  text,
  grouping     text not null default 'general',   -- general | sports | science | fob
  icon         text,                              -- short glyph or token, not markup
  sort_order   integer not null default 100,
  is_archived  boolean not null default false,
  is_pinned    boolean not null default false,
  min_role_to_post community_role not null default 'member',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint category_slug_format check (slug ~ '^[a-z0-9-]{2,50}$'),
  constraint category_name_len check (char_length(name) between 2 and 60),
  constraint category_desc_len check (description is null or char_length(description) <= 240)
);
create index if not exists categories_order_idx
  on public.categories (grouping, sort_order) where not is_archived;

create table if not exists public.category_moderators (
  category_id uuid not null references public.categories(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (category_id, user_id)
);

-- ------------------------------------------------------------
-- TAGS
-- ------------------------------------------------------------
create table if not exists public.tags (
  id          uuid primary key default gen_random_uuid(),
  slug        citext not null unique,
  name        text not null,
  usage_count integer not null default 0,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint tag_slug_format check (slug ~ '^[a-z0-9-]{2,30}$')
);
create index if not exists tags_usage_idx on public.tags (usage_count desc);

-- ------------------------------------------------------------
-- DISCUSSIONS
-- Body is stored as plain text. The client renders a small
-- allowlisted markdown subset AFTER escaping, so no executable
-- HTML can ever round-trip through the database.
-- ------------------------------------------------------------
create table if not exists public.discussions (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles(id) on delete cascade,
  category_id   uuid not null references public.categories(id) on delete restrict,
  title         text not null,
  slug          citext not null unique,
  body          text not null,
  visibility    post_visibility not null default 'members',

  is_pinned     boolean not null default false,
  is_locked     boolean not null default false,
  is_featured   boolean not null default false,

  -- Research module
  is_research           boolean not null default false,
  is_current_research   boolean not null default false,
  research_label        research_label,

  reply_count   integer not null default 0,
  view_count    integer not null default 0,
  reaction_count integer not null default 0,

  last_activity_at timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  edited_at     timestamptz,
  deleted_at    timestamptz,
  deleted_by    uuid references public.profiles(id) on delete set null,
  delete_reason text,

  search_vector tsvector,

  constraint title_len check (char_length(title) between 4 and 160),
  constraint body_len check (char_length(body) between 1 and 20000),
  constraint delete_reason_len check (delete_reason is null or char_length(delete_reason) <= 300)
);

create index if not exists discussions_feed_idx
  on public.discussions (last_activity_at desc) where deleted_at is null;
create index if not exists discussions_category_idx
  on public.discussions (category_id, last_activity_at desc) where deleted_at is null;
create index if not exists discussions_author_idx
  on public.discussions (author_id, created_at desc) where deleted_at is null;
create index if not exists discussions_search_idx
  on public.discussions using gin (search_vector);
create index if not exists discussions_research_idx
  on public.discussions (created_at desc) where is_research and deleted_at is null;

-- Exactly one Current Research Question may be active at a time.
create unique index if not exists discussions_one_current_research
  on public.discussions ((is_current_research)) where is_current_research;

comment on column public.discussions.body is
  'Plain text. Rendered through an escape-then-markdown pass on the client.';

create table if not exists public.discussion_tags (
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  tag_id        uuid not null references public.tags(id) on delete cascade,
  primary key (discussion_id, tag_id)
);
create index if not exists discussion_tags_tag_idx on public.discussion_tags (tag_id);

-- ------------------------------------------------------------
-- REPLIES
-- Maximum two levels. parent_reply_id may only reference a
-- top-level reply; the trigger in 008 enforces it.
-- ------------------------------------------------------------
create table if not exists public.replies (
  id              uuid primary key default gen_random_uuid(),
  discussion_id   uuid not null references public.discussions(id) on delete cascade,
  author_id       uuid not null references public.profiles(id) on delete cascade,
  parent_reply_id uuid references public.replies(id) on delete cascade,
  body            text not null,
  depth           smallint not null default 0,
  reaction_count  integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  edited_at       timestamptz,
  deleted_at      timestamptz,
  deleted_by      uuid references public.profiles(id) on delete set null,
  constraint reply_body_len check (char_length(body) between 1 and 10000),
  constraint reply_depth_range check (depth in (0,1)),
  constraint reply_not_self_parent check (parent_reply_id is null or parent_reply_id <> id)
);
create index if not exists replies_discussion_idx
  on public.replies (discussion_id, created_at) where deleted_at is null;
create index if not exists replies_parent_idx on public.replies (parent_reply_id);
create index if not exists replies_author_idx
  on public.replies (author_id, created_at desc) where deleted_at is null;

-- ------------------------------------------------------------
-- REACTIONS
-- Separate tables per target rather than a loose target_type /
-- target_id pair, so foreign keys and cascades stay real.
-- ------------------------------------------------------------
create table if not exists public.discussion_reactions (
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  kind          reaction_kind not null,
  created_at    timestamptz not null default now(),
  primary key (discussion_id, user_id, kind)
);
create index if not exists discussion_reactions_user_idx on public.discussion_reactions (user_id);

create table if not exists public.reply_reactions (
  reply_id   uuid not null references public.replies(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       reaction_kind not null,
  created_at timestamptz not null default now(),
  primary key (reply_id, user_id, kind)
);
create index if not exists reply_reactions_user_idx on public.reply_reactions (user_id);

-- ------------------------------------------------------------
-- SAVES / FOLLOWS / VIEWS
-- ------------------------------------------------------------
create table if not exists public.saved_discussions (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, discussion_id)
);

create table if not exists public.followed_discussions (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, discussion_id)
);
create index if not exists followed_discussions_disc_idx
  on public.followed_discussions (discussion_id);

-- One row per viewer per discussion. Counting distinct members
-- rather than page loads makes the number meaningful and makes
-- refresh-spamming pointless.
create table if not exists public.discussion_views (
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  primary key (discussion_id, user_id)
);
