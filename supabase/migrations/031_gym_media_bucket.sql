-- The gym-exercise-media bucket was defined in migration 027 but never applied
-- to production, so every exercise video upload failed at storage regardless of
-- what the browser did. Recreated here idempotently.
--
-- 100 MB ceiling and video/quicktime in the mime list, because clips recorded
-- on an iPhone arrive as .mov.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gym-exercise-media','gym-exercise-media', true, 104857600,
  array['video/mp4','video/quicktime','video/webm','video/x-m4v','video/mpeg',
        'video/3gpp','image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
