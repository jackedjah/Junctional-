-- MAHFITT v414 — privacy-first Listening Intelligence.
-- Stores compact aggregates only. There is deliberately no raw play-event
-- table, no per-second timeline, and no browser access to these tables/functions.
-- Time patterns are intentionally coarse: daily totals plus month-wide hour-of-day
-- totals. There is no day+hour correlation table.

create table if not exists public.member_listening_batches (
  member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  batch_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (member_id, batch_id)
);
create index if not exists member_listening_batches_created_idx
  on public.member_listening_batches (member_id, created_at desc);

create table if not exists public.member_listening_monthly (
  member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  month date not null,
  track_key text not null,
  source_type text not null,
  scene text not null default 'mesh',
  theme_key text not null default 'theme:default',
  theme_label text not null default 'MAHFITT Theme',
  workout_context text not null default 'none',
  title text not null default 'MAHFITT Audio',
  artist text not null default '',
  listened_seconds numeric(14,3) not null default 0,
  starts integer not null default 0,
  completions integer not null default 0,
  skips integer not null default 0,
  replays integer not null default 0,
  workout_seconds numeric(14,3) not null default 0,
  reverb_seconds numeric(14,3) not null default 0,
  vhs_seconds numeric(14,3) not null default 0,
  radio_seconds numeric(14,3) not null default 0,
  pitch_seconds numeric(16,3) not null default 0,
  speed_seconds numeric(16,3) not null default 0,
  effect_sample_seconds numeric(14,3) not null default 0,
  last_played_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (member_id, month, track_key, source_type, scene, theme_key, workout_context),
  check (month = date_trunc('month', month)::date),
  check (source_type in ('studio','theme','youtube','tiktok','fob')),
  check (scene in ('mesh','storm','waterfall','mountain','disco','space')),
  check (workout_context in ('none','workout','warmup','strength','core','cooldown')),
  check (listened_seconds >= 0 and workout_seconds >= 0 and reverb_seconds >= 0 and vhs_seconds >= 0 and radio_seconds >= 0 and effect_sample_seconds >= 0),
  check (starts >= 0 and completions >= 0 and skips >= 0 and replays >= 0)
);
create index if not exists member_listening_monthly_member_idx
  on public.member_listening_monthly (member_id, month desc, listened_seconds desc);

-- At most one aggregate row per calendar day. This supports "longest listening
-- day" without retaining the individual tracks/times that made up that day.
create table if not exists public.member_listening_daily (
  member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  day date not null,
  listened_seconds numeric(14,3) not null default 0,
  workout_seconds numeric(14,3) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (member_id, day),
  check (listened_seconds >= 0 and workout_seconds >= 0 and workout_seconds <= listened_seconds)
);
create index if not exists member_listening_daily_member_idx
  on public.member_listening_daily (member_id, day desc);

-- Month-wide hour-of-day totals (0–23). Deliberately NOT keyed by day, so this
-- can answer "your most active listening hour" without creating a timeline.
create table if not exists public.member_listening_monthly_hours (
  member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  month date not null,
  hour_of_day smallint not null,
  listened_seconds numeric(14,3) not null default 0,
  workout_seconds numeric(14,3) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (member_id, month, hour_of_day),
  check (month = date_trunc('month', month)::date),
  check (hour_of_day between 0 and 23),
  check (listened_seconds >= 0 and workout_seconds >= 0 and workout_seconds <= listened_seconds)
);

alter table public.member_listening_batches enable row level security;
alter table public.member_listening_monthly enable row level security;
alter table public.member_listening_daily enable row level security;
alter table public.member_listening_monthly_hours enable row level security;
revoke all privileges on table public.member_listening_batches from anon, authenticated;
revoke all privileges on table public.member_listening_monthly from anon, authenticated;
revoke all privileges on table public.member_listening_daily from anon, authenticated;
revoke all privileges on table public.member_listening_monthly_hours from anon, authenticated;

create or replace function public.merge_member_listening_batch(
  p_member_id uuid,
  p_batch_id uuid,
  p_rows jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed integer := 0;
  v_tracks jsonb := '[]'::jsonb;
  v_days jsonb := '[]'::jsonb;
  v_hours jsonb := '[]'::jsonb;
  v_row jsonb;
  v_month date;
  v_day date;
  v_hour integer;
  v_track text;
  v_source text;
  v_scene text;
  v_theme_key text;
  v_theme_label text;
  v_context text;
  v_title text;
  v_artist text;
  v_listened numeric;
  v_starts integer;
  v_completions integer;
  v_skips integer;
  v_replays integer;
  v_workout numeric;
  v_reverb numeric;
  v_vhs numeric;
  v_radio numeric;
  v_pitch numeric;
  v_speed numeric;
  v_effect numeric;
  v_last timestamptz;
  v_track_rows integer := 0;
  v_day_rows integer := 0;
  v_hour_rows integer := 0;
begin
  if p_member_id is null or p_batch_id is null then
    raise exception 'invalid listening batch';
  end if;

  -- Array input remains accepted for deploy-order compatibility with an early
  -- v414 client; the final client sends {tracks,days,hours}.
  if jsonb_typeof(p_rows) = 'array' then
    v_tracks := p_rows;
  elsif jsonb_typeof(p_rows) = 'object' then
    v_tracks := case when jsonb_typeof(p_rows->'tracks') = 'array' then p_rows->'tracks' else '[]'::jsonb end;
    v_days := case when jsonb_typeof(p_rows->'days') = 'array' then p_rows->'days' else '[]'::jsonb end;
    v_hours := case when jsonb_typeof(p_rows->'hours') = 'array' then p_rows->'hours' else '[]'::jsonb end;
  else
    raise exception 'invalid listening payload';
  end if;

  if jsonb_array_length(v_tracks) > 80
     or jsonb_array_length(v_days) > 40
     or jsonb_array_length(v_hours) > 72
     or (jsonb_array_length(v_tracks) + jsonb_array_length(v_days) + jsonb_array_length(v_hours)) < 1 then
    raise exception 'invalid listening rows';
  end if;

  -- One marker owns all three aggregate writes. A retry with the same batch id
  -- becomes a no-op, so network ambiguity can never double-count a month.
  insert into public.member_listening_batches(member_id,batch_id)
  values (p_member_id,p_batch_id)
  on conflict do nothing;
  get diagnostics v_claimed = row_count;
  if v_claimed = 0 then
    return jsonb_build_object('ok',true,'duplicate',true,'tracks',0,'days',0,'hours',0);
  end if;

  for v_row in select value from jsonb_array_elements(v_tracks)
  loop
    begin
      v_month := to_date((v_row->>'month') || '-01','YYYY-MM-DD');
      v_listened := least(86400,greatest(0,coalesce((v_row->>'listenedSeconds')::numeric,0)));
      v_starts := least(10000,greatest(0,coalesce((v_row->>'starts')::integer,0)));
      v_completions := least(10000,greatest(0,coalesce((v_row->>'completions')::integer,0)));
      v_skips := least(10000,greatest(0,coalesce((v_row->>'skips')::integer,0)));
      v_replays := least(10000,greatest(0,coalesce((v_row->>'replays')::integer,0)));
      v_workout := least(v_listened,greatest(0,coalesce((v_row->>'workoutSeconds')::numeric,0)));
      v_reverb := least(v_listened,greatest(0,coalesce((v_row->>'reverbSeconds')::numeric,0)));
      v_vhs := least(v_listened,greatest(0,coalesce((v_row->>'vhsSeconds')::numeric,0)));
      v_radio := least(v_listened,greatest(0,coalesce((v_row->>'radioSeconds')::numeric,0)));
      v_effect := least(v_listened,greatest(0,coalesce((v_row->>'effectSampleSeconds')::numeric,0)));
      v_pitch := greatest(-1036800,least(1036800,coalesce((v_row->>'pitchSeconds')::numeric,0)));
      v_speed := greatest(0,least(345600,coalesce((v_row->>'speedSeconds')::numeric,0)));
    exception when others then
      raise exception 'invalid listening track row';
    end;
    if v_month < (date_trunc('month',current_date) - interval '3 months')::date
       or v_month > date_trunc('month',current_date)::date then
      raise exception 'listening month out of range';
    end if;

    v_track := lower(left(regexp_replace(coalesce(v_row->>'trackKey',''),'[^a-zA-Z0-9:_-]','','g'),160));
    if length(v_track) < 3 then raise exception 'invalid track key'; end if;
    v_source := lower(coalesce(v_row->>'sourceType',''));
    if v_source not in ('studio','theme','youtube','tiktok','fob') then raise exception 'invalid source'; end if;
    v_scene := lower(coalesce(v_row->>'scene','mesh'));
    if v_scene not in ('mesh','storm','waterfall','mountain','disco','space') then v_scene := 'mesh'; end if;
    v_theme_key := lower(left(regexp_replace(coalesce(v_row->>'themeKey','theme:default'),'[^a-zA-Z0-9:_-]','','g'),120));
    if length(v_theme_key) < 3 then v_theme_key := 'theme:default'; end if;
    v_theme_label := left(regexp_replace(coalesce(v_row->>'themeLabel','MAHFITT Theme'),'[[:cntrl:]]',' ','g'),80);
    v_context := lower(coalesce(v_row->>'workoutContext','none'));
    if v_context not in ('none','workout','warmup','strength','core','cooldown') then v_context := 'workout'; end if;
    v_title := left(regexp_replace(coalesce(v_row->>'title','MAHFITT Audio'),'[[:cntrl:]]',' ','g'),100);
    v_artist := left(regexp_replace(coalesce(v_row->>'artist',''),'[[:cntrl:]]',' ','g'),100);
    begin v_last := (v_row->>'lastPlayedAt')::timestamptz; exception when others then v_last := now(); end;
    if v_last > now() + interval '10 minutes' then v_last := now(); end if;

    insert into public.member_listening_monthly(
      member_id,month,track_key,source_type,scene,theme_key,theme_label,workout_context,title,artist,
      listened_seconds,starts,completions,skips,replays,workout_seconds,reverb_seconds,vhs_seconds,radio_seconds,
      pitch_seconds,speed_seconds,effect_sample_seconds,last_played_at,updated_at
    ) values (
      p_member_id,v_month,v_track,v_source,v_scene,v_theme_key,v_theme_label,v_context,v_title,v_artist,
      v_listened,v_starts,v_completions,v_skips,v_replays,v_workout,v_reverb,v_vhs,v_radio,
      v_pitch,v_speed,v_effect,v_last,now()
    )
    on conflict (member_id,month,track_key,source_type,scene,theme_key,workout_context)
    do update set
      theme_label = excluded.theme_label,
      title = excluded.title,
      artist = excluded.artist,
      listened_seconds = public.member_listening_monthly.listened_seconds + excluded.listened_seconds,
      starts = public.member_listening_monthly.starts + excluded.starts,
      completions = public.member_listening_monthly.completions + excluded.completions,
      skips = public.member_listening_monthly.skips + excluded.skips,
      replays = public.member_listening_monthly.replays + excluded.replays,
      workout_seconds = public.member_listening_monthly.workout_seconds + excluded.workout_seconds,
      reverb_seconds = public.member_listening_monthly.reverb_seconds + excluded.reverb_seconds,
      vhs_seconds = public.member_listening_monthly.vhs_seconds + excluded.vhs_seconds,
      radio_seconds = public.member_listening_monthly.radio_seconds + excluded.radio_seconds,
      pitch_seconds = public.member_listening_monthly.pitch_seconds + excluded.pitch_seconds,
      speed_seconds = public.member_listening_monthly.speed_seconds + excluded.speed_seconds,
      effect_sample_seconds = public.member_listening_monthly.effect_sample_seconds + excluded.effect_sample_seconds,
      last_played_at = greatest(public.member_listening_monthly.last_played_at, excluded.last_played_at),
      updated_at = now();
    v_track_rows := v_track_rows + 1;
  end loop;

  for v_row in select value from jsonb_array_elements(v_days)
  loop
    begin
      v_day := (v_row->>'day')::date;
      v_listened := least(86400,greatest(0,coalesce((v_row->>'listenedSeconds')::numeric,0)));
      v_workout := least(v_listened,greatest(0,coalesce((v_row->>'workoutSeconds')::numeric,0)));
    exception when others then
      raise exception 'invalid listening day row';
    end;
    if v_day < current_date - interval '120 days' or v_day > current_date + interval '1 day' then
      raise exception 'listening day out of range';
    end if;
    insert into public.member_listening_daily(member_id,day,listened_seconds,workout_seconds,updated_at)
    values (p_member_id,v_day,v_listened,v_workout,now())
    on conflict (member_id,day) do update set
      listened_seconds = public.member_listening_daily.listened_seconds + excluded.listened_seconds,
      workout_seconds = public.member_listening_daily.workout_seconds + excluded.workout_seconds,
      updated_at = now();
    v_day_rows := v_day_rows + 1;
  end loop;

  for v_row in select value from jsonb_array_elements(v_hours)
  loop
    begin
      v_month := to_date((v_row->>'month') || '-01','YYYY-MM-DD');
      v_hour := (v_row->>'hour')::integer;
      v_listened := least(200000,greatest(0,coalesce((v_row->>'listenedSeconds')::numeric,0)));
      v_workout := least(v_listened,greatest(0,coalesce((v_row->>'workoutSeconds')::numeric,0)));
    exception when others then
      raise exception 'invalid listening hour row';
    end;
    if v_hour < 0 or v_hour > 23 then raise exception 'invalid listening hour'; end if;
    if v_month < (date_trunc('month',current_date) - interval '3 months')::date
       or v_month > date_trunc('month',current_date)::date then
      raise exception 'listening hour month out of range';
    end if;
    insert into public.member_listening_monthly_hours(member_id,month,hour_of_day,listened_seconds,workout_seconds,updated_at)
    values (p_member_id,v_month,v_hour,v_listened,v_workout,now())
    on conflict (member_id,month,hour_of_day) do update set
      listened_seconds = public.member_listening_monthly_hours.listened_seconds + excluded.listened_seconds,
      workout_seconds = public.member_listening_monthly_hours.workout_seconds + excluded.workout_seconds,
      updated_at = now();
    v_hour_rows := v_hour_rows + 1;
  end loop;

  delete from public.member_listening_batches
   where member_id = p_member_id
     and created_at < now() - interval '120 days';

  return jsonb_build_object('ok',true,'duplicate',false,'tracks',v_track_rows,'days',v_day_rows,'hours',v_hour_rows);
end;
$$;

revoke all on function public.merge_member_listening_batch(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.merge_member_listening_batch(uuid,uuid,jsonb) to service_role;
