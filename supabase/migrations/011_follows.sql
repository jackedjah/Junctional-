-- ============================================================
-- FOB COMMUNITY :: 011 PEOPLE FOLLOWING
-- One-directional follows. Mutual friend requests come later;
-- this is the simpler model and it matches the Following tab.
-- ============================================================

create table if not exists public.user_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint no_self_follow check (follower_id <> followee_id)
);

create index if not exists user_follows_followee_idx on public.user_follows (followee_id);
create index if not exists user_follows_follower_idx on public.user_follows (follower_id, created_at desc);

alter table public.user_follows enable row level security;

-- Follow lists are public social information, but a block hides
-- the relationship in both directions.
drop policy if exists follows_select on public.user_follows;
create policy follows_select on public.user_follows
for select to authenticated
using (
  follower_id = auth.uid()
  or followee_id = auth.uid()
  or (not public.is_blocked_with(follower_id) and not public.is_blocked_with(followee_id))
);

drop policy if exists follows_insert_own on public.user_follows;
create policy follows_insert_own on public.user_follows
for insert to authenticated
with check (
  follower_id = auth.uid()
  and followee_id <> auth.uid()
  and not public.is_blocked_with(followee_id)
);

drop policy if exists follows_delete_own on public.user_follows;
create policy follows_delete_own on public.user_follows
for delete to authenticated
using (follower_id = auth.uid());
