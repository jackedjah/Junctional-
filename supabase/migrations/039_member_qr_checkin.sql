-- MAHFITT member QR check-in
-- Run once after 036_member_session_access.sql. The service-role-only Netlify
-- function calls the RPC; member browsers can only read their own status
-- through the already signed member function.

create extension if not exists pgcrypto;

alter table public.payment_vip_members
  add column if not exists checkin_token uuid;

update public.payment_vip_members
set checkin_token = gen_random_uuid()
where checkin_token is null;

alter table public.payment_vip_members
  alter column checkin_token set default gen_random_uuid(),
  alter column checkin_token set not null;

create unique index if not exists payment_vip_members_checkin_token_uq
  on public.payment_vip_members(checkin_token);

create table if not exists public.member_checkins (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  token uuid not null,
  remaining_after integer not null check (remaining_after >= 0),
  checked_in_at timestamptz not null default now(),
  source text not null default 'coach_qr' check (source in ('coach_qr'))
);

create index if not exists member_checkins_member_time_idx
  on public.member_checkins(member_id, checked_in_at desc);

alter table public.member_checkins enable row level security;

create or replace function public.coach_check_in_member(p_token uuid)
returns table (
  member_id uuid,
  member_name text,
  remaining integer,
  checkin_id uuid,
  checked_in_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.payment_vip_members%rowtype;
  v_checkin public.member_checkins%rowtype;
begin
  select * into v_member
  from public.payment_vip_members
  where checkin_token = p_token
  for update;

  if not found or coalesce(v_member.active, false) is not true then
    raise exception 'That member check-in code is not active.';
  end if;

  if coalesce(v_member.sesh_left, 0) <= 0 then
    raise exception 'This member has no sessions left.';
  end if;

  update public.payment_vip_members
  set sesh_left = greatest(0, coalesce(sesh_left, 0) - 1),
      updated_at = now()
  where id = v_member.id
  returning * into v_member;

  insert into public.member_checkins(member_id, token, remaining_after)
  values(v_member.id, p_token, v_member.sesh_left)
  returning * into v_checkin;

  return query select
    v_member.id,
    trim(coalesce(v_member.first_name, '') || ' ' || coalesce(v_member.last_name, '')),
    v_member.sesh_left,
    v_checkin.id,
    v_checkin.checked_in_at;
end;
$$;

revoke all on function public.coach_check_in_member(uuid) from public;
revoke all on function public.coach_check_in_member(uuid) from anon;
revoke all on function public.coach_check_in_member(uuid) from authenticated;
grant execute on function public.coach_check_in_member(uuid) to service_role;

comment on column public.payment_vip_members.checkin_token is
  'Opaque member QR credential. It is accepted only by the coach-authenticated server route.';
comment on table public.member_checkins is
  'Immutable audit trail for coach QR scans and the resulting session balance.';
