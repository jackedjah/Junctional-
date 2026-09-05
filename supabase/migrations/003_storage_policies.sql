-- ============================================================
-- FOB COMMUNITY :: 003 STORAGE
-- Phase A creates all four buckets so paths and policies are
-- settled early, but only `avatars` is wired to the UI today.
-- The other three are locked to their owners until the features
-- that use them ship. Locked-and-unused is the safe default.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',         'avatars',         true,   8388608,  array['image/jpeg','image/png','image/webp']),
  ('community-media', 'community-media', false, 15728640,  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/webm']),
  ('message-media',   'message-media',   false, 15728640,  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/webm']),
  ('voice-notes',     'voice-notes',     false,  5242880,  array['audio/webm','audio/mp4','audio/mpeg','audio/ogg'])
on conflict (id) do update
  set file_size_limit   = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ------------------------------------------------------------
-- AVATARS   path: avatars/{user_id}/{filename}
-- Bucket is public-read because avatars appear beside every post
-- and signing each one would be a per-render round trip. Nothing
-- identifying is in the path beyond the user id, and writes are
-- restricted to the owner's own folder.
-- ------------------------------------------------------------
drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
for select
using (bucket_id = 'avatars');

drop policy if exists avatars_owner_insert on storage.objects;
create policy avatars_owner_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists avatars_owner_update on storage.objects;
create policy avatars_owner_update on storage.objects
for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists avatars_owner_delete on storage.objects;
create policy avatars_owner_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ------------------------------------------------------------
-- COMMUNITY-MEDIA / MESSAGE-MEDIA / VOICE-NOTES
-- Owner-scoped only, pending the discussion and messaging
-- features. Reads are deliberately NOT opened to all members
-- yet: when discussions ship, the select policy must join to the
-- discussion's visibility, and message media must join to
-- conversation membership. Opening them now would be exactly the
-- kind of permissive default that is hard to claw back.
-- ------------------------------------------------------------
drop policy if exists private_media_owner_all on storage.objects;
create policy private_media_owner_all on storage.objects
for all to authenticated
using (
  bucket_id in ('community-media','message-media','voice-notes')
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id in ('community-media','message-media','voice-notes')
  and (storage.foldername(name))[1] = auth.uid()::text
);
