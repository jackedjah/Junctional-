-- MAHFITT v395 :: paid Theme Curation through Message Center
-- Run after 042_service_payments.sql.
-- The member pays before the request becomes placed. Trusted server price is
-- exactly $0.80 per requested song, 1–20 songs. Fulfillment creates a normal
-- MAH PLAYER playlist from coach-uploaded member-owned tracks.

create table if not exists public.theme_curation_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  song_count integer not null check (song_count between 1 and 20),
  amount_cents integer not null check (amount_cents between 80 and 1600),
  favorite_artists text not null default '',
  favorite_songs text not null default '',
  vibe text not null default '',
  motivation text not null default '',
  status text not null default 'pending_payment' check (status in ('pending_payment','paid','in_progress','delivered','cancelled')),
  service_payment_id uuid unique references public.service_payments(id) on delete set null,
  playlist_id uuid references public.member_music_playlists(id) on delete set null,
  placed_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (amount_cents = song_count * 80)
);
create index if not exists theme_curation_requests_member_idx
  on public.theme_curation_requests(member_id,created_at desc);
create unique index if not exists theme_curation_one_open_member_uq
  on public.theme_curation_requests(member_id)
  where status in ('pending_payment','paid','in_progress');
alter table public.theme_curation_requests enable row level security;
revoke all on public.theme_curation_requests from anon,authenticated;

create table if not exists public.theme_curation_tracks (
  request_id uuid not null references public.theme_curation_requests(id) on delete cascade,
  track_id uuid not null references public.member_music_tracks(id) on delete cascade,
  position integer not null check (position between 0 and 19),
  created_at timestamptz not null default now(),
  primary key(request_id,track_id),
  unique(request_id,position)
);
alter table public.theme_curation_tracks enable row level security;
revoke all on public.theme_curation_tracks from anon,authenticated;

create or replace function public.create_theme_curation_order(
  p_member_id uuid,
  p_song_count integer,
  p_favorite_artists text,
  p_favorite_songs text,
  p_vibe text,
  p_motivation text
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_req public.theme_curation_requests%rowtype;
  v_payment public.service_payments%rowtype;
  v_count integer;
begin
  v_count:=greatest(1,least(20,coalesce(p_song_count,0)));
  if p_song_count is null or p_song_count<>v_count then raise exception 'Choose 1 to 20 songs'; end if;
  if exists(select 1 from public.theme_curation_requests where member_id=p_member_id and status in ('pending_payment','paid','in_progress')) then
    raise exception 'You already have an active Theme Curation request';
  end if;

  insert into public.theme_curation_requests(member_id,song_count,amount_cents,favorite_artists,favorite_songs,vibe,motivation,status)
  values(p_member_id,v_count,v_count*80,left(coalesce(p_favorite_artists,''),1200),left(coalesce(p_favorite_songs,''),1200),left(coalesce(p_vibe,''),800),left(coalesce(p_motivation,''),800),'pending_payment')
  returning * into v_req;

  insert into public.service_payments(member_id,purpose,reference_id,amount_cents,currency,status)
  values(p_member_id,'theme_curation',v_req.id,v_req.amount_cents,'usd','created')
  returning * into v_payment;

  update public.theme_curation_requests set service_payment_id=v_payment.id,updated_at=now() where id=v_req.id returning * into v_req;
  return jsonb_build_object('request',to_jsonb(v_req),'payment',to_jsonb(v_payment));
end;
$$;
revoke all on function public.create_theme_curation_order(uuid,integer,text,text,text,text) from public,anon,authenticated;
grant execute on function public.create_theme_curation_order(uuid,integer,text,text,text,text) to service_role;

create or replace function public.fulfill_theme_curation_payment(
  p_payment_id uuid,
  p_stripe_checkout_session_id text,
  p_stripe_payment_intent_id text,
  p_amount_total integer
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_payment public.service_payments%rowtype;
  v_req public.theme_curation_requests%rowtype;
begin
  select * into v_payment from public.service_payments where id=p_payment_id and purpose='theme_curation' for update;
  if not found then raise exception 'Theme Curation payment not found'; end if;
  if v_payment.status='paid' and v_payment.fulfilled_at is not null then
    select * into v_req from public.theme_curation_requests where id=v_payment.reference_id;
    return jsonb_build_object('paid',true,'placed',true,'already',true,'member_id',v_payment.member_id,'request_id',v_payment.reference_id,'song_count',v_req.song_count,'amount_cents',v_payment.amount_cents,'favorite_artists',v_req.favorite_artists,'favorite_songs',v_req.favorite_songs,'vibe',v_req.vibe,'motivation',v_req.motivation);
  end if;
  if p_amount_total is null or p_amount_total<>v_payment.amount_cents then raise exception 'Theme Curation payment amount mismatch'; end if;
  if v_payment.stripe_checkout_session_id is not null and v_payment.stripe_checkout_session_id<>p_stripe_checkout_session_id then raise exception 'Theme Curation payment session mismatch'; end if;

  select * into v_req from public.theme_curation_requests
   where id=v_payment.reference_id and member_id=v_payment.member_id and status='pending_payment' for update;
  if not found then raise exception 'Theme Curation request is no longer payable'; end if;
  if v_req.amount_cents<>v_req.song_count*80 or v_req.amount_cents<>v_payment.amount_cents then raise exception 'Theme Curation trusted price mismatch'; end if;

  update public.service_payments set status='paid',stripe_checkout_session_id=p_stripe_checkout_session_id,
    stripe_payment_intent_id=nullif(left(coalesce(p_stripe_payment_intent_id,''),255),''),paid_at=coalesce(paid_at,now()),fulfilled_at=now(),updated_at=now()
   where id=v_payment.id;
  update public.theme_curation_requests set status='paid',placed_at=now(),updated_at=now() where id=v_req.id returning * into v_req;

  return jsonb_build_object('paid',true,'placed',true,'member_id',v_req.member_id,'request_id',v_req.id,'song_count',v_req.song_count,'amount_cents',v_req.amount_cents,
    'favorite_artists',v_req.favorite_artists,'favorite_songs',v_req.favorite_songs,'vibe',v_req.vibe,'motivation',v_req.motivation);
end;
$$;
revoke all on function public.fulfill_theme_curation_payment(uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.fulfill_theme_curation_payment(uuid,text,text,integer) to service_role;

create or replace function public.attach_theme_curation_track(
  p_request_id uuid,
  p_track_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_req public.theme_curation_requests%rowtype;
  v_track public.member_music_tracks%rowtype;
  v_pos integer;
begin
  select * into v_req from public.theme_curation_requests where id=p_request_id and status in ('paid','in_progress') for update;
  if not found then raise exception 'Theme Curation request is not ready for fulfillment'; end if;
  select * into v_track from public.member_music_tracks where id=p_track_id and member_id=v_req.member_id and status='ready';
  if not found then raise exception 'That ready track does not belong to this member'; end if;
  if exists(select 1 from public.theme_curation_tracks where request_id=v_req.id and track_id=v_track.id) then
    return jsonb_build_object('attached',true,'already',true,'request_id',v_req.id,'track_id',v_track.id);
  end if;
  select count(*)::int into v_pos from public.theme_curation_tracks where request_id=v_req.id;
  if v_pos>=v_req.song_count then raise exception 'Theme Curation already has all requested songs'; end if;
  insert into public.theme_curation_tracks(request_id,track_id,position) values(v_req.id,v_track.id,v_pos);
  update public.theme_curation_requests set status='in_progress',updated_at=now() where id=v_req.id;
  return jsonb_build_object('attached',true,'request_id',v_req.id,'track_id',v_track.id,'position',v_pos,'remaining',v_req.song_count-v_pos-1);
end;
$$;
revoke all on function public.attach_theme_curation_track(uuid,uuid) from public,anon,authenticated;
grant execute on function public.attach_theme_curation_track(uuid,uuid) to service_role;

create or replace function public.deliver_theme_curation(
  p_request_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_req public.theme_curation_requests%rowtype;
  v_playlist public.member_music_playlists%rowtype;
  v_count integer;
begin
  select * into v_req from public.theme_curation_requests where id=p_request_id and status in ('paid','in_progress') for update;
  if not found then raise exception 'Theme Curation request is not ready for delivery'; end if;
  select count(*)::int into v_count
    from public.theme_curation_tracks ct join public.member_music_tracks t on t.id=ct.track_id
   where ct.request_id=v_req.id and t.member_id=v_req.member_id and t.status='ready';
  if v_count<>v_req.song_count then raise exception 'Upload all paid songs before delivery'; end if;

  insert into public.member_music_playlists(member_id,name,updated_at)
  values(v_req.member_id,'MAHFITT CURATION · '||to_char(now() at time zone 'America/New_York','Mon DD'),now())
  returning * into v_playlist;

  insert into public.member_music_playlist_tracks(playlist_id,track_id,position)
  select v_playlist.id,ct.track_id,ct.position from public.theme_curation_tracks ct
   where ct.request_id=v_req.id order by ct.position;

  update public.theme_curation_requests set status='delivered',playlist_id=v_playlist.id,delivered_at=now(),updated_at=now()
   where id=v_req.id returning * into v_req;
  return jsonb_build_object('delivered',true,'member_id',v_req.member_id,'request_id',v_req.id,'playlist_id',v_playlist.id,'song_count',v_req.song_count);
end;
$$;
revoke all on function public.deliver_theme_curation(uuid) from public,anon,authenticated;
grant execute on function public.deliver_theme_curation(uuid) to service_role;

-- v395 expands expiry cleanup so an abandoned Theme Curation checkout does not
-- leave a permanently open order. A fresh checkout can be started later.
create or replace function public.expire_service_payment(
  p_payment_id uuid,
  p_stripe_checkout_session_id text
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v_payment public.service_payments%rowtype;
begin
  update public.service_payments set status='expired',updated_at=now()
   where id=p_payment_id and status in ('created','checkout')
     and (stripe_checkout_session_id is null or stripe_checkout_session_id=p_stripe_checkout_session_id)
   returning * into v_payment;
  if found and v_payment.purpose='late_reschedule' then
    update public.calendar_change_requests set payment_status='required',payment_reference=null,updated_at=now()
     where id=v_payment.reference_id and status='awaiting_payment';
  elsif found and v_payment.purpose='theme_curation' then
    update public.theme_curation_requests set status='cancelled',updated_at=now()
     where id=v_payment.reference_id and status='pending_payment';
  end if;
  return case when v_payment.id is null then null else to_jsonb(v_payment) end;
end;
$$;
revoke all on function public.expire_service_payment(uuid,text) from public,anon,authenticated;
grant execute on function public.expire_service_payment(uuid,text) to service_role;
