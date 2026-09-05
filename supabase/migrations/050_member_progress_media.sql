-- MAHFITT R67 :: MAH MEDIA BODY-PROGRESS JOURNAL
-- Private member-owned photo/video records. The browser uploads through a
-- short-lived signed URL after /api/mygym resolves the signed member identity;
-- no client receives direct table access or a public object URL.

create table if not exists member_progress_media (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references payment_vip_members(id) on delete cascade,
  kind text not null check (kind in ('photo','video')),
  storage_path text not null,
  captured_on date not null default current_date,
  angle text,
  title text,
  duration_s numeric,
  mime_type text,
  file_size_bytes bigint not null default 0,
  presentation jsonb not null default '{"x":50,"y":50,"zoom":1}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, storage_path),
  constraint member_progress_media_photo_angle check (
    kind <> 'photo' or angle in ('Front','Left Side','Right Side','Back','Diagonal','Professional')
  ),
  constraint member_progress_media_video_title check (
    kind <> 'video' or (title is not null and length(trim(title)) between 1 and 120)
  ),
  constraint member_progress_media_video_duration check (
    kind <> 'video' or (duration_s is not null and duration_s > 0 and duration_s <= 30)
  ),
  constraint member_progress_media_file_size check (
    file_size_bytes >= 0 and file_size_bytes <= 125829120
  ),
  constraint member_progress_media_presentation_object check (jsonb_typeof(presentation) = 'object')
);
create index if not exists member_progress_media_timeline_idx
  on member_progress_media (member_id, captured_on asc, created_at asc);

alter table member_progress_media enable row level security;

-- Same private signed-object architecture as Member Music Studio, but a
-- dedicated bucket keeps body-progress media out of the legacy public
-- exercise-reference bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-progress-media','member-progress-media', false, 125829120,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif',
        'video/mp4','video/quicktime','video/webm','video/x-m4v','video/mpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
