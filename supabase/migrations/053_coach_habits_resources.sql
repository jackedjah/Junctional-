-- MAHFITT R85 :: friendly coach experience — resources + MAH Habits
-- Browser clients never receive direct table privileges. All access remains
-- through authenticated Netlify functions using the service role.

create table if not exists public.mahfitt_resources (
  id uuid primary key default gen_random_uuid(),
  owner_coach_member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  category text not null default 'GENERAL' check (char_length(category) between 1 and 60),
  resource_type text not null default 'link' check (resource_type in ('link','text')),
  url text,
  body text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (resource_type='link' and url is not null and char_length(url) between 1 and 2000)
    or
    (resource_type='text' and body is not null and char_length(body) between 1 and 12000)
  )
);
create index if not exists mahfitt_resources_owner_idx
  on public.mahfitt_resources(owner_coach_member_id,archived,category,title);
alter table public.mahfitt_resources enable row level security;
revoke all on public.mahfitt_resources from anon,authenticated;

create table if not exists public.mahfitt_resource_assignments (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.mahfitt_resources(id) on delete cascade,
  client_member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  assigned_by_member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique(resource_id,client_member_id)
);
create index if not exists mahfitt_resource_assignments_client_idx
  on public.mahfitt_resource_assignments(client_member_id,assigned_at desc);
alter table public.mahfitt_resource_assignments enable row level security;
revoke all on public.mahfitt_resource_assignments from anon,authenticated;

create table if not exists public.mahfitt_habits (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  created_by_member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  source_type text not null default 'self' check (source_type in ('self','coach','mrmah')),
  title text not null check (char_length(title) between 1 and 120),
  schedule jsonb not null default '{"kind":"daily"}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mahfitt_habits_member_idx
  on public.mahfitt_habits(member_id,active,created_at);
alter table public.mahfitt_habits enable row level security;
revoke all on public.mahfitt_habits from anon,authenticated;

create table if not exists public.mahfitt_habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.mahfitt_habits(id) on delete cascade,
  member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  day date not null,
  completed boolean not null default true,
  updated_by_member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  updated_at timestamptz not null default now(),
  unique(habit_id,day)
);
create index if not exists mahfitt_habit_completions_member_day_idx
  on public.mahfitt_habit_completions(member_id,day,updated_at desc);
alter table public.mahfitt_habit_completions enable row level security;
revoke all on public.mahfitt_habit_completions from anon,authenticated;

-- R85 adds two explicit relationship domains. Existing rows keep any explicit
-- false values and gain true only when the key did not previously exist.
alter table public.mahfitt_coach_relationships
  alter column permissions set default '{"fitness":true,"programs":true,"calendar":true,"logs":true,"progress":true,"media":true,"messages":true,"habits":true,"resources":true}'::jsonb;
update public.mahfitt_coach_relationships
   set permissions = jsonb_set(
       jsonb_set(coalesce(permissions,'{}'::jsonb),'{habits}',coalesce(permissions->'habits','true'::jsonb),true),
       '{resources}',coalesce(permissions->'resources','true'::jsonb),true
     ),
       updated_at = now()
 where not (coalesce(permissions,'{}'::jsonb) ? 'habits')
    or not (coalesce(permissions,'{}'::jsonb) ? 'resources');
