-- FOB SYSTEMS :: GYM TRACKER EXERCISE VIDEO STORAGE
-- Public-read reference clips. Upload permission is issued only through a
-- short-lived signed upload URL from the authenticated coach backend.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('gym-exercise-media','gym-exercise-media',true,104857600,
  array['video/mp4','video/quicktime','video/webm','video/x-m4v'])
on conflict (id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists gym_exercise_media_public_read on storage.objects;
create policy gym_exercise_media_public_read on storage.objects
for select using (bucket_id='gym-exercise-media');
