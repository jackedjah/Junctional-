-- FOB SYSTEMS / MAHFITT v405 — zero-cost Apple Health bridge foundation.
-- Health data remains private to the service-role backend. There are no anon
-- or authenticated client policies on these tables.

create table if not exists public.member_health_sync_tokens (
  member_id uuid primary key references public.payment_vip_members(id) on delete cascade,
  token_id uuid not null unique,
  nonce text not null check (char_length(nonce) between 24 and 128),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  rate_window_at timestamptz,
  rate_count integer not null default 0 check (rate_count >= 0)
);

alter table public.member_health_sync_tokens
  add column if not exists rate_window_at timestamptz;
alter table public.member_health_sync_tokens
  add column if not exists rate_count integer not null default 0;

alter table public.member_health_sync_tokens enable row level security;

comment on table public.member_health_sync_tokens is
  'Opaque Apple Shortcuts sync credential metadata. Usable bearer tokens are derived server-side and never stored in plaintext.';

create table if not exists public.member_health_daily (
  member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  day date not null,
  time_zone text,
  metrics jsonb not null default '{}'::jsonb,
  source text not null default 'apple_shortcuts',
  synced_at timestamptz not null default now(),
  primary key (member_id, day),
  constraint member_health_daily_metrics_object check (jsonb_typeof(metrics) = 'object'),
  constraint member_health_daily_source_check check (source in ('apple_shortcuts','apple_health_export'))
);

alter table public.member_health_daily enable row level security;

create index if not exists member_health_daily_member_day_idx
  on public.member_health_daily(member_id, day desc);

comment on table public.member_health_daily is
  'Member-owned daily health summaries. v405 stores only canonical summary metrics, not raw high-frequency HealthKit samples.';

-- Idempotent credential issuance. If an active credential already exists, a
-- second/rapid request returns that same row rather than rotating the member
-- into a different key. A revoked credential is rotated atomically.
create or replace function public.ensure_member_health_sync_token(
  p_member_id uuid,
  p_token_id uuid,
  p_nonce text
)
returns setof public.member_health_sync_tokens
language plpgsql
set search_path = public
as $$
begin
  if p_member_id is null or p_token_id is null or p_nonce is null or char_length(p_nonce) < 24 then
    raise exception 'invalid health sync token request';
  end if;

  return query
  insert into public.member_health_sync_tokens as existing (
    member_id, token_id, nonce, created_at, last_used_at, revoked_at
  ) values (
    p_member_id, p_token_id, p_nonce, now(), null, null
  )
  on conflict (member_id) do update set
    token_id = case when existing.revoked_at is not null then excluded.token_id else existing.token_id end,
    nonce = case when existing.revoked_at is not null then excluded.nonce else existing.nonce end,
    created_at = case when existing.revoked_at is not null then now() else existing.created_at end,
    last_used_at = case when existing.revoked_at is not null then null else existing.last_used_at end,
    rate_window_at = case when existing.revoked_at is not null then null else existing.rate_window_at end,
    rate_count = case when existing.revoked_at is not null then 0 else existing.rate_count end,
    revoked_at = null
  returning existing.*;
end;
$$;

revoke all on function public.ensure_member_health_sync_token(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.ensure_member_health_sync_token(uuid,uuid,text) to service_role;

-- Durable abuse / accidental-loop guard. This runs inside PostgreSQL so every
-- Netlify instance shares one authoritative request budget. 240 requests per
-- 24-hour window is far above any normal daily Shortcut cadence while
-- preventing a misconfigured automation from writing indefinitely.
create or replace function public.consume_member_health_sync_rate(
  p_token_id uuid
)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  r public.member_health_sync_tokens%rowtype;
begin
  if p_token_id is null then return false; end if;

  select * into r
    from public.member_health_sync_tokens
    where token_id = p_token_id and revoked_at is null
    for update;
  if not found then return false; end if;

  if r.rate_window_at is null or r.rate_window_at <= now() - interval '24 hours' then
    update public.member_health_sync_tokens
      set rate_window_at = now(), rate_count = 1
      where token_id = p_token_id;
    return true;
  end if;

  if coalesce(r.rate_count,0) >= 240 then return false; end if;
  update public.member_health_sync_tokens
    set rate_count = coalesce(rate_count,0) + 1
    where token_id = p_token_id;
  return true;
end;
$$;

revoke all on function public.consume_member_health_sync_rate(uuid) from public,anon,authenticated;
grant execute on function public.consume_member_health_sync_rate(uuid) to service_role;

-- Atomic daily merge. Re-running the same Shortcut or sending overlapping
-- partial summaries updates one member/day row instead of creating duplicates
-- or erasing metrics that were not present in the later request.
drop function if exists public.upsert_member_health_daily(uuid,date,text,jsonb,text);

create or replace function public.upsert_member_health_daily(
  p_member_id uuid,
  p_token_id uuid,
  p_day date,
  p_time_zone text,
  p_metrics jsonb,
  p_source text default 'apple_shortcuts'
)
returns void
language plpgsql
set search_path = public
as $$
begin
  if p_member_id is null or p_day is null or p_metrics is null or jsonb_typeof(p_metrics) <> 'object' then
    raise exception 'invalid health daily payload';
  end if;
  if p_source not in ('apple_shortcuts','apple_health_export') then
    raise exception 'invalid health source';
  end if;
  /* Re-check revocation at the durable write boundary. This closes the tiny
     race where a member revokes after HTTP verification but before the RPC. */
  if p_source = 'apple_shortcuts' and not exists (
    select 1 from public.member_health_sync_tokens
      where member_id = p_member_id and token_id = p_token_id and revoked_at is null
  ) then
    raise exception 'health sync credential revoked';
  end if;

  insert into public.member_health_daily as existing (
    member_id, day, time_zone, metrics, source, synced_at
  ) values (
    p_member_id, p_day, nullif(p_time_zone,''), p_metrics, p_source, now()
  )
  on conflict (member_id, day) do update set
    time_zone = coalesce(excluded.time_zone, existing.time_zone),
    metrics = existing.metrics || excluded.metrics,
    source = excluded.source,
    synced_at = now();
end;
$$;

revoke all on function public.upsert_member_health_daily(uuid,uuid,date,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.upsert_member_health_daily(uuid,uuid,date,text,jsonb,text) to service_role;
