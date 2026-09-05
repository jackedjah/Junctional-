-- FOB SYSTEMS / MAHFITT v406 — privacy-preserving Apple Health history import.
-- Raw Apple Health export bytes are parsed in the member's browser. Only
-- already-sanitized DAILY summaries reach this service-role-only RPC.

-- Preserve the stronger live Shortcut summary when a historical export overlaps
-- the same day. Export imports may fill missing metrics, but they do not
-- overwrite metrics already supplied by apple_shortcuts. A later Shortcut
-- write remains authoritative and can replace imported values.
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
  if exists (
    select 1 from jsonb_each(p_metrics) as e(key,value)
    where e.key not in (
      'steps','activeEnergyKcal','restingHeartRateBpm','hrvMs',
      'sleepMinutes','bodyWeightLb','vo2Max','walkingRunningDistanceMi'
    ) or jsonb_typeof(e.value) <> 'number'
  ) then
    raise exception 'invalid health metric';
  end if;
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
    time_zone = case
      when existing.source = 'apple_shortcuts' and excluded.source = 'apple_health_export'
        then coalesce(existing.time_zone, excluded.time_zone)
      else coalesce(excluded.time_zone, existing.time_zone)
    end,
    metrics = case
      when existing.source = 'apple_shortcuts' and excluded.source = 'apple_health_export'
        then excluded.metrics || existing.metrics
      else existing.metrics || excluded.metrics
    end,
    source = case
      when existing.source = 'apple_shortcuts' and excluded.source = 'apple_health_export'
        then existing.source
      else excluded.source
    end,
    synced_at = now();
end;
$$;

revoke all on function public.upsert_member_health_daily(uuid,uuid,date,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.upsert_member_health_daily(uuid,uuid,date,text,jsonb,text) to service_role;

comment on function public.upsert_member_health_daily(uuid,uuid,date,text,jsonb,text) is
  'v406 daily health merge with source precedence: live apple_shortcuts values win conflicts over historical apple_health_export values.';

create or replace function public.import_member_health_daily(
  p_member_id uuid,
  p_time_zone text,
  p_days jsonb
)
returns integer
language plpgsql
set search_path = public
as $$
declare
  item jsonb;
  imported integer := 0;
  d date;
  m jsonb;
begin
  if p_member_id is null or p_days is null or jsonb_typeof(p_days) <> 'array' then
    raise exception 'invalid health history import';
  end if;
  if jsonb_array_length(p_days) < 1 or jsonb_array_length(p_days) > 120 then
    raise exception 'health history import batch must contain 1 to 120 days';
  end if;

  for item in select value from jsonb_array_elements(p_days)
  loop
    begin
      d := nullif(item->>'date','')::date;
    exception when others then
      raise exception 'invalid health history date';
    end;
    m := item->'metrics';
    if d is null or d < date '2000-01-01' or d > current_date + 2 or m is null or jsonb_typeof(m) <> 'object' or m = '{}'::jsonb then
      raise exception 'invalid health history day';
    end if;

    perform public.upsert_member_health_daily(
      p_member_id,
      null,
      d,
      nullif(p_time_zone,''),
      m,
      'apple_health_export'
    );
    imported := imported + 1;
  end loop;

  return imported;
end;
$$;

revoke all on function public.import_member_health_daily(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.import_member_health_daily(uuid,text,jsonb) to service_role;

comment on function public.import_member_health_daily(uuid,text,jsonb) is
  'v406 service-role bulk merge for browser-parsed Apple Health history. Raw export files never enter Supabase.';
