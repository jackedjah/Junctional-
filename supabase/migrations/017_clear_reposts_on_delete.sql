-- 017 :: clear reposts when a post is soft deleted
--
-- Applied 2026-07-27.
--
-- Deleting a post you had reposted appeared to fail: the feed filters
-- deleted posts but the repost merge did not, and discussions_select
-- deliberately still shows an author their own deleted posts. So the
-- post came straight back through the repost path and looked undeleted.
-- The client fix is in community-feed.js; this is the server half.
--
-- Soft delete is an UPDATE, so the foreign key cascade never fired and
-- orphaned reposts accumulated. They were still being FETCHED before
-- being filtered, and the repost query takes only the 15 most recent
-- rows, so a run of orphans could push real reposts out of the batch.

create or replace function public.clear_reposts_on_soft_delete()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    delete from public.discussion_reposts where discussion_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_clear_reposts_on_delete on public.discussions;
create trigger trg_clear_reposts_on_delete
  after update of deleted_at on public.discussions
  for each row execute function public.clear_reposts_on_soft_delete();

delete from public.discussion_reposts r
using public.discussions d
where d.id = r.discussion_id and d.deleted_at is not null;
