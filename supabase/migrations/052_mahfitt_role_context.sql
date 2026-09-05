-- MAHFITT R90 / unified role-context authorization spine.
-- This does NOT replace FOB admin authentication.  It gives ordinary MAHFITT
-- coach accounts an explicit coach -> client authorization relationship while
-- keeping the client a normal payment_vip_members / MAHFITT member.
create table if not exists public.mahfitt_coach_relationships (
  id uuid primary key default gen_random_uuid(),
  coach_member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  client_member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  status text not null default 'active' check (status in ('active','paused','ended')),
  permissions jsonb not null default '{"fitness":true,"programs":true,"calendar":true,"logs":true,"progress":true,"media":true,"messages":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (coach_member_id <> client_member_id),
  unique (coach_member_id, client_member_id)
);
create index if not exists mahfitt_coach_relationships_coach_active_idx
  on public.mahfitt_coach_relationships (coach_member_id, status, updated_at desc);
create index if not exists mahfitt_coach_relationships_client_active_idx
  on public.mahfitt_coach_relationships (client_member_id, status, updated_at desc);
alter table public.mahfitt_coach_relationships enable row level security;
comment on table public.mahfitt_coach_relationships is
  'Server-authorized MAHFITT coach-to-client fitness context. Personal AI/music/theme ownership is intentionally not delegated by this relation.';
