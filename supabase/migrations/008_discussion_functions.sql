-- ============================================================
-- FOB COMMUNITY :: 008 DISCUSSION FUNCTIONS AND TRIGGERS
-- Run after 006, before 007 (the policies reference can_post_in).
-- ============================================================

-- ------------------------------------------------------------
-- SLUGS
-- ------------------------------------------------------------
create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(lower(coalesce(input,'')), '[^a-z0-9]+', '-', 'g'),
      '-{2,}', '-', 'g'
    )
  );
$$;

create or replace function public.set_discussion_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidate citext;
  n integer := 0;
begin
  if new.slug is not null and new.slug <> '' then return new; end if;

  base := left(nullif(public.slugify(new.title), ''), 60);
  if base is null then base := 'discussion'; end if;

  -- Short id suffix keeps slugs unique without a lookup loop in
  -- the common case, and stays readable.
  candidate := base || '-' || substr(replace(new.id::text,'-',''), 1, 6);

  while exists (select 1 from public.discussions d where d.slug = candidate) loop
    n := n + 1;
    candidate := base || '-' || substr(replace(new.id::text,'-',''), 1, 6) || '-' || n;
  end loop;

  new.slug := candidate;
  return new;
end;
$$;

drop trigger if exists discussions_slug on public.discussions;
create trigger discussions_slug before insert on public.discussions
  for each row execute function public.set_discussion_slug();

-- ------------------------------------------------------------
-- SEARCH VECTOR
-- Title weighted above body.
-- ------------------------------------------------------------
create or replace function public.set_discussion_search()
returns trigger
language plpgsql
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.body,'')),  'B');
  return new;
end;
$$;

drop trigger if exists discussions_search on public.discussions;
create trigger discussions_search
  before insert or update of title, body on public.discussions
  for each row execute function public.set_discussion_search();

-- ------------------------------------------------------------
-- updated_at
-- ------------------------------------------------------------
drop trigger if exists discussions_touch on public.discussions;
create trigger discussions_touch before update on public.discussions
  for each row execute function public.touch_updated_at();

drop trigger if exists replies_touch on public.replies;
create trigger replies_touch before update on public.replies
  for each row execute function public.touch_updated_at();

drop trigger if exists categories_touch on public.categories;
create trigger categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- REPLY DEPTH
-- Two levels only. A reply to a nested reply is re-parented to
-- the top-level ancestor rather than rejected, so the member's
-- text is never lost to a validation error.
-- ------------------------------------------------------------
create or replace function public.enforce_reply_depth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_depth smallint;
  parent_root  uuid;
  parent_disc  uuid;
begin
  if new.parent_reply_id is null then
    new.depth := 0;
    return new;
  end if;

  select depth, parent_reply_id, discussion_id
    into parent_depth, parent_root, parent_disc
    from public.replies where id = new.parent_reply_id;

  if parent_depth is null then
    raise exception 'Parent reply does not exist' using errcode = '23503';
  end if;

  if parent_disc <> new.discussion_id then
    raise exception 'Reply and parent belong to different discussions' using errcode = '23514';
  end if;

  if parent_depth = 0 then
    new.depth := 1;
  else
    -- Flatten: attach to the top-level ancestor.
    new.parent_reply_id := parent_root;
    new.depth := 1;
  end if;

  return new;
end;
$$;

drop trigger if exists replies_depth on public.replies;
create trigger replies_depth before insert on public.replies
  for each row execute function public.enforce_reply_depth();

-- ------------------------------------------------------------
-- COUNTERS
-- Denormalised so the feed never runs a count() per row.
-- ------------------------------------------------------------
create or replace function public.sync_reply_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.discussion_id, old.discussion_id);
begin
  update public.discussions d
     set reply_count = (
           select count(*) from public.replies r
            where r.discussion_id = target and r.deleted_at is null
         ),
         last_activity_at = greatest(d.last_activity_at, coalesce(new.created_at, now()))
   where d.id = target;
  return coalesce(new, old);
end;
$$;

drop trigger if exists replies_count on public.replies;
create trigger replies_count
  after insert or update of deleted_at or delete on public.replies
  for each row execute function public.sync_reply_count();

create or replace function public.sync_discussion_reaction_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.discussion_id, old.discussion_id);
begin
  update public.discussions
     set reaction_count = (
       select count(*) from public.discussion_reactions where discussion_id = target
     )
   where id = target;
  return coalesce(new, old);
end;
$$;

drop trigger if exists discussion_reactions_count on public.discussion_reactions;
create trigger discussion_reactions_count
  after insert or delete on public.discussion_reactions
  for each row execute function public.sync_discussion_reaction_count();

create or replace function public.sync_reply_reaction_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.reply_id, old.reply_id);
begin
  update public.replies
     set reaction_count = (
       select count(*) from public.reply_reactions where reply_id = target
     )
   where id = target;
  return coalesce(new, old);
end;
$$;

drop trigger if exists reply_reactions_count on public.reply_reactions;
create trigger reply_reactions_count
  after insert or delete on public.reply_reactions
  for each row execute function public.sync_reply_reaction_count();

-- ------------------------------------------------------------
-- EDIT STAMP
-- Set edited_at only when the body actually changed, so a
-- moderator pinning a post does not mark it "Edited".
-- ------------------------------------------------------------
create or replace function public.stamp_edit()
returns trigger
language plpgsql
as $$
begin
  if new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists discussions_edit_stamp on public.discussions;
create trigger discussions_edit_stamp before update on public.discussions
  for each row execute function public.stamp_edit();

drop trigger if exists replies_edit_stamp on public.replies;
create trigger replies_edit_stamp before update on public.replies
  for each row execute function public.stamp_edit();

-- ------------------------------------------------------------
-- POSTING PERMISSION
-- ------------------------------------------------------------
create or replace function public.can_post_in(target_category uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  needed community_role;
  archived boolean;
begin
  select min_role_to_post, is_archived into needed, archived
    from public.categories where id = target_category;

  if needed is null or archived then return false; end if;

  if needed = 'member' then
    return auth.uid() is not null;
  end if;

  return exists (
    select 1 from public.user_roles
     where user_id = auth.uid()
       and role >= needed        -- enum ordering: member < coach < moderator < admin < founder
  );
end;
$$;

-- ------------------------------------------------------------
-- CURRENT RESEARCH QUESTION
-- Admin only. Clears the previous one in the same transaction so
-- the partial unique index is never violated.
-- ------------------------------------------------------------
create or replace function public.set_current_research(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins may set the Current Research Question'
      using errcode = '42501';
  end if;

  update public.discussions
     set is_current_research = false
   where is_current_research;

  update public.discussions
     set is_current_research = true,
         is_research = true,
         is_pinned = true
   where id = target;

  insert into public.audit_logs (actor_id, action, target_type, target_id)
  values (auth.uid(), 'set_current_research', 'discussion', target::text);
end;
$$;

revoke all on function public.set_current_research(uuid) from public;
grant execute on function public.set_current_research(uuid) to authenticated;

-- ------------------------------------------------------------
-- VIEW RECORDING
-- One row per member per discussion, so refreshing does not
-- inflate the count.
-- ------------------------------------------------------------
create or replace function public.record_discussion_view(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return; end if;

  insert into public.discussion_views (discussion_id, user_id)
  values (target, auth.uid())
  on conflict do nothing;

  if found then
    update public.discussions
       set view_count = (
         select count(*) from public.discussion_views where discussion_id = target
       )
     where id = target;
  end if;
end;
$$;

revoke all on function public.record_discussion_view(uuid) from public;
grant execute on function public.record_discussion_view(uuid) to authenticated;

-- ------------------------------------------------------------
-- SEARCH
-- Grouped results are assembled client-side from these two.
-- ------------------------------------------------------------
create or replace function public.search_discussions(q text, max_rows integer default 20)
returns table (
  id uuid, slug citext, title text, snippet text,
  category_name text, category_slug citext,
  author_name text, author_username citext, author_avatar text,
  reply_count integer, last_activity_at timestamptz, rank real
)
language sql
stable
security definer
set search_path = public
as $$
  select d.id, d.slug, d.title,
         left(regexp_replace(d.body, '\s+', ' ', 'g'), 180) as snippet,
         c.name, c.slug,
         p.display_name, p.username, p.avatar_path,
         d.reply_count, d.last_activity_at,
         ts_rank(d.search_vector, websearch_to_tsquery('english', q)) as rank
    from public.discussions d
    join public.categories c on c.id = d.category_id
    join public.profiles p on p.id = d.author_id
   where auth.uid() is not null
     and d.deleted_at is null
     and d.visibility = 'members'
     and not public.is_blocked_with(d.author_id)
     and d.search_vector @@ websearch_to_tsquery('english', q)
   order by rank desc, d.last_activity_at desc
   limit least(coalesce(max_rows,20), 50);
$$;

revoke all on function public.search_discussions(text,integer) from public;
grant execute on function public.search_discussions(text,integer) to authenticated;

create or replace function public.search_members(q text, max_rows integer default 10)
returns table (
  id uuid, username citext, display_name text, avatar_path text, bio text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.display_name, p.avatar_path, left(p.bio, 120)
    from public.profiles p
   where auth.uid() is not null
     and p.deleted_at is null
     and p.onboarding_completed
     and not public.is_blocked_with(p.id)
     and (p.username ILIKE '%' || q || '%' or p.display_name ILIKE '%' || q || '%')
   order by (p.username ILIKE q || '%') desc, p.display_name
   limit least(coalesce(max_rows,10), 25);
$$;

revoke all on function public.search_members(text,integer) from public;
grant execute on function public.search_members(text,integer) to authenticated;
