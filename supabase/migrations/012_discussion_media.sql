-- 012 :: media attached to discussions
--
-- Applied 2026-07-27.
--
-- One row per attachment rather than columns on discussions, so a post
-- can carry several, order is explicit, and a new kind costs nothing.
-- The kind check already lists 'video' and 'document': supporting those
-- later is client work only, with no migration.
--
-- Storage buckets already existed (community-media 15MB for images and
-- GIFs, voice-notes 5MB for audio) and are unchanged. The only storage
-- change is a read policy: the existing policy granted the OWNER full
-- access to their own folder and granted no one else read, so posted
-- media was invisible to every member except the person who posted it.
-- The new policy is deliberately NOT extended to message-media, which
-- is private by nature and must stay owner-only.

create table if not exists public.discussion_media (
  id            uuid primary key default gen_random_uuid(),
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  author_id     uuid not null references public.profiles(id)    on delete cascade,
  kind          text not null check (kind in ('image','gif','audio','video','document')),
  bucket        text,
  storage_path  text,
  external_url  text,
  thumbnail_url text,
  mime_type     text,
  width         integer,
  height        integer,
  duration_ms   integer,
  byte_size     bigint,
  alt_text      text,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  constraint media_has_source
    check (storage_path is not null or external_url is not null)
);

create index if not exists discussion_media_discussion_idx
  on public.discussion_media (discussion_id, position);

alter table public.discussion_media enable row level security;

drop policy if exists media_select on public.discussion_media;
create policy media_select on public.discussion_media
  for select using (
    author_id = auth.uid() or not public.is_blocked_with(author_id)
  );

drop policy if exists media_insert_own on public.discussion_media;
create policy media_insert_own on public.discussion_media
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.discussions d
      where d.id = discussion_id and d.author_id = auth.uid()
    )
  );

drop policy if exists media_delete_own on public.discussion_media;
create policy media_delete_own on public.discussion_media
  for delete using (author_id = auth.uid());

drop policy if exists community_media_member_read on storage.objects;
create policy community_media_member_read on storage.objects
  for select using (
    bucket_id in ('community-media', 'voice-notes')
    and auth.uid() is not null
  );
