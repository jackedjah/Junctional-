-- ============================================================
-- FOB COMMUNITY :: 007 DISCUSSION RLS
-- Run after 006 and 008.
--
-- Soft delete is the rule for anything a moderator may need to
-- review later. Removed content stays in the table but leaves
-- every member-facing policy.
-- ============================================================

alter table public.categories            enable row level security;
alter table public.category_moderators   enable row level security;
alter table public.tags                  enable row level security;
alter table public.discussions           enable row level security;
alter table public.discussion_tags       enable row level security;
alter table public.replies               enable row level security;
alter table public.discussion_reactions  enable row level security;
alter table public.reply_reactions       enable row level security;
alter table public.saved_discussions     enable row level security;
alter table public.followed_discussions  enable row level security;
alter table public.discussion_views      enable row level security;

alter table public.discussions force row level security;
alter table public.replies     force row level security;

-- ------------------------------------------------------------
-- CATEGORIES  (public reference data for signed-in members)
-- ------------------------------------------------------------
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
for select to authenticated
using (not is_archived or public.is_moderator());

drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories
for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists category_mods_select on public.category_moderators;
create policy category_mods_select on public.category_moderators
for select to authenticated using (true);

drop policy if exists category_mods_admin on public.category_moderators;
create policy category_mods_admin on public.category_moderators
for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- TAGS
-- ------------------------------------------------------------
drop policy if exists tags_select on public.tags;
create policy tags_select on public.tags
for select to authenticated using (true);

drop policy if exists tags_create on public.tags;
create policy tags_create on public.tags
for insert to authenticated
with check (created_by = auth.uid());

drop policy if exists tags_moderate on public.tags;
create policy tags_moderate on public.tags
for update to authenticated
using (public.is_moderator()) with check (public.is_moderator());

-- ------------------------------------------------------------
-- DISCUSSIONS
-- Readable by signed-in members when not deleted, not authored
-- by someone in a block relationship, and visible to them.
-- 'friends' visibility fails closed until Phase C ships the
-- friendship table: only the author sees those posts today.
-- ------------------------------------------------------------
drop policy if exists discussions_select on public.discussions;
create policy discussions_select on public.discussions
for select to authenticated
using (
  author_id = auth.uid()
  or public.is_moderator()
  or (
    deleted_at is null
    and visibility = 'members'
    and not public.is_blocked_with(author_id)
  )
);

drop policy if exists discussions_insert on public.discussions;
create policy discussions_insert on public.discussions
for insert to authenticated
with check (
  author_id = auth.uid()
  and public.can_post_in(category_id)
  -- Members cannot self-promote a post. These are moderator
  -- actions applied after the fact.
  and is_pinned = false
  and is_featured = false
  and is_locked = false
  and is_current_research = false
);

-- Authors may edit their own body and title while the thread is
-- unlocked. The WITH CHECK repeats the moderation flags so an
-- author cannot flip them during an update.
drop policy if exists discussions_update_own on public.discussions;
create policy discussions_update_own on public.discussions
for update to authenticated
using (author_id = auth.uid() and deleted_at is null and not is_locked)
with check (
  author_id = auth.uid()
  and is_pinned = (select d.is_pinned from public.discussions d where d.id = discussions.id)
  and is_featured = (select d.is_featured from public.discussions d where d.id = discussions.id)
  and is_locked = (select d.is_locked from public.discussions d where d.id = discussions.id)
  and is_current_research = (select d.is_current_research from public.discussions d where d.id = discussions.id)
  and category_id = (select d.category_id from public.discussions d where d.id = discussions.id)
);

drop policy if exists discussions_update_moderator on public.discussions;
create policy discussions_update_moderator on public.discussions
for update to authenticated
using (public.is_moderator()) with check (public.is_moderator());

-- No hard delete. Authors soft-delete via the update policy by
-- setting deleted_at; the row stays for moderation review.
drop policy if exists discussions_no_hard_delete on public.discussions;
create policy discussions_no_hard_delete on public.discussions
for delete to authenticated using (false);

drop policy if exists discussion_tags_select on public.discussion_tags;
create policy discussion_tags_select on public.discussion_tags
for select to authenticated using (true);

drop policy if exists discussion_tags_author on public.discussion_tags;
create policy discussion_tags_author on public.discussion_tags
for all to authenticated
using (
  exists (select 1 from public.discussions d
           where d.id = discussion_id and d.author_id = auth.uid())
  or public.is_moderator()
)
with check (
  exists (select 1 from public.discussions d
           where d.id = discussion_id and d.author_id = auth.uid())
  or public.is_moderator()
);

-- ------------------------------------------------------------
-- REPLIES
-- ------------------------------------------------------------
drop policy if exists replies_select on public.replies;
create policy replies_select on public.replies
for select to authenticated
using (
  author_id = auth.uid()
  or public.is_moderator()
  or (
    deleted_at is null
    and not public.is_blocked_with(author_id)
    and exists (
      select 1 from public.discussions d
       where d.id = discussion_id
         and d.deleted_at is null
         and (d.visibility = 'members' or d.author_id = auth.uid())
    )
  )
);

drop policy if exists replies_insert on public.replies;
create policy replies_insert on public.replies
for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.discussions d
     where d.id = discussion_id
       and d.deleted_at is null
       and not d.is_locked
       and not public.is_blocked_with(d.author_id)
  )
);

drop policy if exists replies_update_own on public.replies;
create policy replies_update_own on public.replies
for update to authenticated
using (author_id = auth.uid() and deleted_at is null)
with check (author_id = auth.uid());

drop policy if exists replies_update_moderator on public.replies;
create policy replies_update_moderator on public.replies
for update to authenticated
using (public.is_moderator()) with check (public.is_moderator());

drop policy if exists replies_no_hard_delete on public.replies;
create policy replies_no_hard_delete on public.replies
for delete to authenticated using (false);

-- ------------------------------------------------------------
-- REACTIONS
-- A member may only create and remove their own. The primary key
-- already prevents duplicate reactions of the same kind.
-- ------------------------------------------------------------
drop policy if exists discussion_reactions_select on public.discussion_reactions;
create policy discussion_reactions_select on public.discussion_reactions
for select to authenticated
using (
  exists (select 1 from public.discussions d
           where d.id = discussion_id and d.deleted_at is null)
);

drop policy if exists discussion_reactions_own on public.discussion_reactions;
create policy discussion_reactions_own on public.discussion_reactions
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.discussions d
     where d.id = discussion_id
       and d.deleted_at is null
       and not public.is_blocked_with(d.author_id)
  )
);

drop policy if exists discussion_reactions_delete on public.discussion_reactions;
create policy discussion_reactions_delete on public.discussion_reactions
for delete to authenticated using (user_id = auth.uid());

drop policy if exists reply_reactions_select on public.reply_reactions;
create policy reply_reactions_select on public.reply_reactions
for select to authenticated
using (
  exists (select 1 from public.replies r
           where r.id = reply_id and r.deleted_at is null)
);

drop policy if exists reply_reactions_own on public.reply_reactions;
create policy reply_reactions_own on public.reply_reactions
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.replies r
     where r.id = reply_id
       and r.deleted_at is null
       and not public.is_blocked_with(r.author_id)
  )
);

drop policy if exists reply_reactions_delete on public.reply_reactions;
create policy reply_reactions_delete on public.reply_reactions
for delete to authenticated using (user_id = auth.uid());

-- ------------------------------------------------------------
-- SAVES / FOLLOWS / VIEWS  (strictly personal)
-- ------------------------------------------------------------
drop policy if exists saved_own on public.saved_discussions;
create policy saved_own on public.saved_discussions
for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists followed_own on public.followed_discussions;
create policy followed_own on public.followed_discussions
for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Views are written through record_discussion_view(). No member
-- reads another member's viewing history.
drop policy if exists views_own on public.discussion_views;
create policy views_own on public.discussion_views
for select to authenticated
using (user_id = auth.uid() or public.is_moderator());

drop policy if exists views_insert_own on public.discussion_views;
create policy views_insert_own on public.discussion_views
for insert to authenticated with check (user_id = auth.uid());
