-- FOB SYSTEMS :: THEME FULL EFFECTS AUDIO MIME REPAIR
--
-- Root cause of the 415 invalid_mime_type / InvalidMimeType failure when a
-- member uploaded an ordinary .mp3 into Theme > Full Effects.
--
-- themeAudioUploadTicket signs its upload into the gym-exercise-media bucket
-- (netlify/functions/mygym.js), but that bucket carried no audio type at all,
-- so Storage rejected audio/mpeg at the bucket boundary before the file ever
-- reached the object. The client allowlist, the UI copy ("MP3, M4A, AAC, or
-- WAV") and the server extension check all agreed with each other and
-- disagreed with the bucket.
--
-- The repair is to the storage configuration, not to the MIME type we send:
-- an MP3 is declared as audio/mpeg here exactly as the browser reports it.
--
-- IMPORTANT: this list is the UNION of every type the bucket has ever been
-- granted, because allowed_mime_types is REPLACED wholesale on conflict.
--   027_gym_exercise_media.sql granted 4 video types.
--   031_gym_media_bucket.sql   re-applied the bucket and granted 9: those 4
--                              plus video/mpeg, video/3gpp and the three image
--                              types used for posters.
-- Listing only 027's four would silently revoke the rest and break coach clip
-- and poster uploads. All 9 are carried forward here unchanged.
--
-- The audio variants: x-wav / x-m4a because iOS Files and some Android pickers
-- report those for the same .wav and .m4a files, audio/wave for older pickers,
-- and audio/mp3 because a few older WebKit builds report it instead of
-- audio/mpeg.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gym-exercise-media','gym-exercise-media', true, 104857600,
  array['video/mp4','video/quicktime','video/webm','video/x-m4v','video/mpeg','video/3gpp',
        'image/jpeg','image/png','image/webp',
        'audio/mpeg','audio/mp3','audio/mp4','audio/aac',
        'audio/wav','audio/x-wav','audio/wave','audio/x-m4a'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
