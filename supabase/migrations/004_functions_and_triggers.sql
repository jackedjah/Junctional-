-- ============================================================
-- FOB COMMUNITY :: 004 FUNCTIONS AND TRIGGERS
-- NOTE: run this BEFORE 002 if your tooling validates policy
-- bodies eagerly. The helpers below are referenced by policies.
-- ============================================================

-- ------------------------------------------------------------
-- ROLE HELPERS
-- security definer + fixed search_path so policies can call them
-- without granting members direct read on user_roles.
-- ------------------------------------------------------------
create or replace function public.has_role(check_role community_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = check_role
  );
$$;

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('moderator','admin','founder')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('admin','founder')
  );
$$;

-- ------------------------------------------------------------
-- BLOCK CHECK (either direction)
-- ------------------------------------------------------------
create or replace function public.is_blocked_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = auth.uid() and blocked_id = other)
       or (blocker_id = other and blocked_id = auth.uid())
  );
$$;

-- ------------------------------------------------------------
-- updated_at
-- ------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists profile_private_touch on public.profile_private;
create trigger profile_private_touch before update on public.profile_private
  for each row execute function public.touch_updated_at();

drop trigger if exists privacy_settings_touch on public.privacy_settings;
create trigger privacy_settings_touch before update on public.privacy_settings
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- AGE DERIVATION
-- Writes profiles.age_years from the private DOB. The DOB never
-- leaves profile_private.
-- ------------------------------------------------------------
create or replace function public.sync_age_years()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set age_years = extract(year from age(new.date_of_birth))::int
   where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists profile_private_sync_age on public.profile_private;
create trigger profile_private_sync_age
  after insert or update of date_of_birth on public.profile_private
  for each row execute function public.sync_age_years();

-- ------------------------------------------------------------
-- ROLE IMMUTABILITY GUARD
-- Defence in depth alongside the RLS policies in 002. Even a
-- mistaken future policy cannot let a member grant themselves a
-- privileged role.
-- ------------------------------------------------------------
create or replace function public.guard_role_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role community_role;
begin
  target_role := coalesce(new.role, old.role);

  -- 'member' self-provisioning at signup is fine; nothing else is.
  if target_role <> 'member' and not public.is_admin() then
    raise exception 'Insufficient privilege to modify role %', target_role
      using errcode = '42501';
  end if;

  if tg_op in ('INSERT','UPDATE') and new.user_id = auth.uid()
     and target_role <> 'member' then
    raise exception 'Members cannot grant themselves privileged roles'
      using errcode = '42501';
  end if;

  -- On DELETE, NEW is null. Returning null from a BEFORE trigger
  -- cancels the operation, so a role could never be revoked.
  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists user_roles_guard on public.user_roles;
create trigger user_roles_guard
  before insert or update or delete on public.user_roles
  for each row execute function public.guard_role_changes();

-- ------------------------------------------------------------
-- USERNAME AVAILABILITY
-- Callable by anon so the registration form can check as the user
-- types. Returns only a boolean, never enumerates the user table.
-- ------------------------------------------------------------
create or replace function public.username_available(candidate text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized citext;
begin
  normalized := lower(trim(candidate));

  if normalized !~ '^[a-z0-9._]{3,24}$' then return false; end if;
  if normalized ~ '^[._]' or normalized ~ '[._]$' then return false; end if;
  if exists (select 1 from public.reserved_usernames where username = normalized) then
    return false;
  end if;
  if exists (select 1 from public.profiles where username = normalized) then
    return false;
  end if;

  return true;
end;
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- ------------------------------------------------------------
-- SIGNUP PROVISIONING
-- Fires on auth.users insert. Creates the profile, the default
-- 'member' role, and default privacy settings in one transaction.
-- Metadata comes from the signUp() call's options.data.
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  want_user   citext := lower(trim(coalesce(meta->>'username','')));
  want_name   text   := nullif(trim(coalesce(meta->>'display_name','')), '');
  dob         date;
  final_user  citext;
  suffix      integer := 0;
begin
  -- Fall back to a safe generated handle if metadata is missing or taken.
  if want_user = '' or not public.username_available(want_user::text) then
    final_user := 'fobber' || substr(replace(new.id::text,'-',''), 1, 8);
  else
    final_user := want_user;
  end if;

  while exists (select 1 from public.profiles where username = final_user) loop
    suffix := suffix + 1;
    final_user := left(final_user::text, 20) || suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name)
  values (new.id, final_user, coalesce(want_name, final_user::text));

  insert into public.user_roles (user_id, role) values (new.id, 'member')
    on conflict do nothing;

  insert into public.privacy_settings (user_id) values (new.id)
    on conflict do nothing;

  -- Age gate. Only written when the client supplied a DOB.
  dob := nullif(meta->>'date_of_birth','')::date;
  if dob is not null then
    insert into public.profile_private
      (user_id, date_of_birth, terms_accepted_at, guidelines_accepted_at)
    values (new.id, dob, now(), now())
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- PRIVACY-AWARE PROFILE READ
-- Single source of truth for "what may this viewer see".
-- Hidden fields come back NULL rather than being filtered out,
-- so the client never has to guess.
-- Friend-tier resolution is stubbed to false until the friendship
-- table lands in Phase C; 'friends' therefore behaves as private,
-- which fails closed. See COMMUNITY_SCHEMA.md.
-- ------------------------------------------------------------
create or replace function public.view_profile(target_username text)
returns table (
  id uuid, username citext, display_name text, avatar_path text,
  bio text, pronouns text, hometown text, current_city text,
  age_years integer, experience_level experience_level,
  fob_experience text, training_goals text, website_url text,
  member_since timestamptz, roles community_role[], is_self boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
begin
  return query
  select
    p.id, p.username, p.display_name, p.avatar_path,
    p.bio, p.pronouns,
    case when ps.show_hometown = 'members' or p.id = viewer then p.hometown end,
    case when ps.show_current_city = 'members' or p.id = viewer then p.current_city end,
    case when ps.show_age = 'members' or p.id = viewer then p.age_years end,
    p.experience_level, p.fob_experience,
    case when ps.show_training_goals = 'members' or p.id = viewer then p.training_goals end,
    p.website_url, p.member_since,
    coalesce(array_agg(ur.role) filter (where ur.role is not null), '{}') as roles,
    (p.id = viewer) as is_self
  from public.profiles p
  join public.privacy_settings ps on ps.user_id = p.id
  left join public.user_roles ur on ur.user_id = p.id
  where p.username = lower(trim(target_username))
    and p.deleted_at is null
    and viewer is not null                    -- community is members-only
    and not public.is_blocked_with(p.id)
  group by p.id, ps.show_hometown, ps.show_current_city, ps.show_age, ps.show_training_goals;
end;
$$;

revoke all on function public.view_profile(text) from public;
grant execute on function public.view_profile(text) to authenticated;
