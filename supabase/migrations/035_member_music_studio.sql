-- ══ FOB MEMBER MUSIC STUDIO ═══════════════════════════════════════════════
-- Private member-owned tracks, playlists and Studio Set settings. The browser
-- never reads these tables or the bucket directly; My Gym authenticates the
-- signed member claim and uses the service role for every operation.

create table if not exists member_music_tracks (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references payment_vip_members(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','ready')),
  storage_path text not null,
  cover_path text,
  title text not null default 'Untitled Track',
  artist text not null default '',
  album text not null default '',
  duration_s numeric not null default 0 check (duration_s >= 0 and duration_s <= 360.5),
  file_size_bytes bigint not null default 0 check (file_size_bytes >= 0 and file_size_bytes <= 26214400),
  cover_size_bytes bigint not null default 0 check (cover_size_bytes >= 0 and cover_size_bytes <= 4194304),
  mime_type text,
  bpm numeric check (bpm is null or (bpm >= 45 and bpm <= 220)),
  beat_offset numeric not null default 0 check (beat_offset >= 0 and beat_offset <= 360),
  audio_viz jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{"playbackRate":1,"reverb":false,"eq":{"low":0,"mid":0,"high":0},"reverse":false,"loopBeats":0,"loopStart":0}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, storage_path)
);
create index if not exists member_music_tracks_member_idx
  on member_music_tracks (member_id, status, created_at desc);

create table if not exists member_music_playlists (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references payment_vip_members(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists member_music_playlists_member_idx
  on member_music_playlists (member_id, updated_at desc);

create table if not exists member_music_playlist_tracks (
  playlist_id uuid not null references member_music_playlists(id) on delete cascade,
  track_id uuid not null references member_music_tracks(id) on delete cascade,
  position int not null default 0 check (position >= 0 and position < 500),
  added_at timestamptz not null default now(),
  primary key (playlist_id, track_id)
);
create index if not exists member_music_playlist_order_idx
  on member_music_playlist_tracks (playlist_id, position, added_at);

create table if not exists member_music_state (
  member_id uuid primary key references payment_vip_members(id) on delete cascade,
  current_track_id uuid references member_music_tracks(id) on delete set null,
  current_playlist_id uuid references member_music_playlists(id) on delete set null,
  shuffle boolean not null default false,
  repeat_mode text not null default 'off' check (repeat_mode in ('off','all','one')),
  updated_at timestamptz not null default now()
);

alter table member_music_tracks          enable row level security;
alter table member_music_playlists       enable row level security;
alter table member_music_playlist_tracks enable row level security;
alter table member_music_state           enable row level security;

-- Private by design. Files are delivered only through short-lived signed URLs
-- minted after My Gym resolves the signed member identity.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-music','member-music', false, 26214400,
  array['audio/mpeg','audio/mp4','audio/aac','audio/wav','audio/x-wav','audio/x-m4a',
        'image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
