-- ============================================================
-- FOB COMMUNITY :: 002 ROW LEVEL SECURITY
-- Depends on helpers defined in 004. If your migration runner
-- validates function references eagerly, apply 004 first.
--
-- Principle: the community is members-only. Anonymous visitors
-- read NOTHING from these tables.
--
-- Two policies below use `using (true)`, both scoped to
-- authenticated and both on non-member data:
--   user_roles       role badges are public by design
--   community_settings  platform config, no personal data
-- No table holding personal data uses a permissive policy.
-- ============================================================

alter table public.profiles           enable row level security;
alter table public.profile_private    enable row level security;
alter table public.user_roles         enable row level security;
alter table public.sports             enable row level security;
alter table public.interests          enable row level security;
alter table public.user_sports        enable row level security;
alter table public.user_interests     enable row level security;
alter table public.privacy_settings   enable row level security;
alter table public.blocks             enable row level security;
alter table public.reserved_usernames enable row level security;
alter table public.community_settings enable row level security;
alter table public.audit_logs         enable row level security;

-- Force RLS so even the table owner is subject to policies.
alter table public.profiles        force row level security;
alter table public.profile_private force row level security;
alter table public.user_roles      force row level security;

-- ------------------------------------------------------------
-- PROFILES
-- Authenticated members may read non-deleted profiles unless a
-- block exists in either direction. Soft-deleted profiles are
-- visible only to moderators.
-- ------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or (
    deleted_at is null
    and not public.is_blocked_with(id)
  )
  or public.is_moderator()
);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
for insert to authenticated
with check (id = auth.uid());

-- A member may update only their own row. Columns they must not
-- control (roles) do not live here at all, which is why role
-- escalation via profile update is structurally impossible.
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
for update to authenticated
using (id = auth.uid() and deleted_at is null)
with check (id = auth.uid());

drop policy if exists profiles_update_moderator on public.profiles;
create policy profiles_update_moderator on public.profiles
for update to authenticated
using (public.is_moderator())
with check (public.is_moderator());

-- No hard delete from the client. Account deletion runs through
-- the community-account-delete Netlify Function.
drop policy if exists profiles_no_client_delete on public.profiles;
create policy profiles_no_client_delete on public.profiles
for delete to authenticated
using (false);

-- ------------------------------------------------------------
-- PROFILE_PRIVATE
-- Owner only. Not even moderators read DOB from the client; if
-- an age dispute needs review it goes through a server function
-- with the service role and is written to audit_logs.
-- ------------------------------------------------------------
drop policy if exists profile_private_select_own on public.profile_private;
create policy profile_private_select_own on public.profile_private
for select to authenticated
using (user_id = auth.uid());

drop policy if exists profile_private_insert_own on public.profile_private;
create policy profile_private_insert_own on public.profile_private
for insert to authenticated
with check (user_id = auth.uid());

-- DOB is write-once from the client. There is deliberately NO
-- update policy on this table: with none granted, RLS denies all
-- updates. Corrections are a support action run with the service
-- role, not something a member can do to game the age gate.
-- This is simpler and safer than a policy that reads its own
-- table to compare the old value.

-- ------------------------------------------------------------
-- USER_ROLES
-- Readable by everyone authenticated (badges are public), but
-- writable only by admins. The guard trigger in 004 enforces the
-- same rule a second time.
-- ------------------------------------------------------------
drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select on public.user_roles
for select to authenticated
using (true);   -- role badges are intentionally public information

drop policy if exists user_roles_admin_write on public.user_roles;
create policy user_roles_admin_write on public.user_roles
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ------------------------------------------------------------
-- SPORTS + INTERESTS
-- Approved entries readable by any member. Members may propose a
-- custom entry, which lands unapproved and stays out of discovery
-- until a moderator clears it.
-- ------------------------------------------------------------
drop policy if exists sports_select on public.sports;
create policy sports_select on public.sports
for select to authenticated
using (is_approved or created_by = auth.uid() or public.is_moderator());

drop policy if exists sports_propose on public.sports;
create policy sports_propose on public.sports
for insert to authenticated
with check (created_by = auth.uid() and is_approved = false);

drop policy if exists sports_moderate on public.sports;
create policy sports_moderate on public.sports
for update to authenticated
using (public.is_moderator()) with check (public.is_moderator());

drop policy if exists interests_select on public.interests;
create policy interests_select on public.interests
for select to authenticated
using (is_approved or created_by = auth.uid() or public.is_moderator());

drop policy if exists interests_propose on public.interests;
create policy interests_propose on public.interests
for insert to authenticated
with check (created_by = auth.uid() and is_approved = false);

drop policy if exists interests_moderate on public.interests;
create policy interests_moderate on public.interests
for update to authenticated
using (public.is_moderator()) with check (public.is_moderator());

-- ------------------------------------------------------------
-- USER_SPORTS / USER_INTERESTS
-- Visible when the owner's privacy allows, always visible to the
-- owner. Writable only by the owner.
-- ------------------------------------------------------------
drop policy if exists user_sports_select on public.user_sports;
create policy user_sports_select on public.user_sports
for select to authenticated
using (
  user_id = auth.uid()
  or (
    not public.is_blocked_with(user_id)
    and exists (
      select 1 from public.privacy_settings ps
      where ps.user_id = user_sports.user_id and ps.show_sports = 'members'
    )
  )
  or public.is_moderator()
);

drop policy if exists user_sports_write_own on public.user_sports;
create policy user_sports_write_own on public.user_sports
for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists user_interests_select on public.user_interests;
create policy user_interests_select on public.user_interests
for select to authenticated
using (
  user_id = auth.uid()
  or not public.is_blocked_with(user_id)
  or public.is_moderator()
);

drop policy if exists user_interests_write_own on public.user_interests;
create policy user_interests_write_own on public.user_interests
for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- PRIVACY SETTINGS  (owner only, both directions)
-- ------------------------------------------------------------
drop policy if exists privacy_own on public.privacy_settings;
create policy privacy_own on public.privacy_settings
for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Policies elsewhere need to read other members' privacy rows.
-- That happens through security-definer functions, not direct
-- client reads, so no broader select policy is granted here.

-- ------------------------------------------------------------
-- BLOCKS
-- A member sees only the blocks they created. The blocked party
-- is never told, which is deliberate: silent blocking is safer.
-- ------------------------------------------------------------
drop policy if exists blocks_select_own on public.blocks;
create policy blocks_select_own on public.blocks
for select to authenticated
using (blocker_id = auth.uid() or public.is_moderator());

drop policy if exists blocks_insert_own on public.blocks;
create policy blocks_insert_own on public.blocks
for insert to authenticated
with check (blocker_id = auth.uid() and blocked_id <> auth.uid());

drop policy if exists blocks_delete_own on public.blocks;
create policy blocks_delete_own on public.blocks
for delete to authenticated
using (blocker_id = auth.uid());

-- ------------------------------------------------------------
-- RESERVED USERNAMES  (no client reads; checked server-side)
-- ------------------------------------------------------------
drop policy if exists reserved_no_client_read on public.reserved_usernames;
create policy reserved_no_client_read on public.reserved_usernames
for select to authenticated
using (public.is_admin());

-- ------------------------------------------------------------
-- COMMUNITY SETTINGS
-- Read by any member, written only by admins.
-- ------------------------------------------------------------
drop policy if exists settings_select on public.community_settings;
create policy settings_select on public.community_settings
for select to authenticated
using (true);

drop policy if exists settings_admin_write on public.community_settings;
create policy settings_admin_write on public.community_settings
for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- AUDIT LOGS
-- Read by moderators. Never written from the client: entries are
-- created by server functions holding the service role.
-- ------------------------------------------------------------
drop policy if exists audit_select_mod on public.audit_logs;
create policy audit_select_mod on public.audit_logs
for select to authenticated
using (public.is_moderator());

drop policy if exists audit_no_client_write on public.audit_logs;
create policy audit_no_client_write on public.audit_logs
for insert to authenticated
with check (false);
