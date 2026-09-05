-- 014 + 015 :: attachments on replies
--
-- Applied 2026-07-27.
--
-- discussion_media gains a nullable reply_id rather than a second
-- table: the shape is identical, and a parallel table would mean two
-- renderers, two upload paths and two sets of policies to keep in step.
-- discussion_id stays NOT NULL because a reply always belongs to a
-- discussion, so every existing query keeps working and every existing
-- row (reply_id null) still means "belongs to the post".
--
-- reply_body_len is relaxed the same way discussions.body_len was in
-- 013: an attachment-only reply is legitimate now that a reply can
-- carry a clip.

alter table public.discussion_media
  add column if not exists reply_id uuid references public.replies(id) on delete cascade;

create index if not exists discussion_media_reply_idx
  on public.discussion_media (reply_id) where reply_id is not null;

drop policy if exists media_insert_own on public.discussion_media;
create policy media_insert_own on public.discussion_media
  for insert with check (
    author_id = auth.uid()
    and (
      (reply_id is null and exists (
        select 1 from public.discussions d
        where d.id = discussion_id and d.author_id = auth.uid()))
      or
      (reply_id is not null and exists (
        select 1 from public.replies r
        where r.id = reply_id and r.author_id = auth.uid()
          and r.discussion_id = discussion_media.discussion_id))
    )
  );

alter table public.replies drop constraint if exists reply_body_len;
alter table public.replies add constraint reply_body_len
  check (char_length(body) >= 0 and char_length(body) <= 10000);
