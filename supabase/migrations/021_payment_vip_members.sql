-- FOB Systems :: private payment VIP list
create table if not exists public.payment_vip_members (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  normalized_first text not null,
  normalized_last text not null,
  sesh integer not null default 0 check (sesh >= 0),
  sesh_left integer not null default 0 check (sesh_left >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(normalized_first, normalized_last)
);

alter table public.payment_vip_members enable row level security;
-- Deliberately no anon/authenticated policies. Browser clients cannot read this list.
-- Netlify Functions use SUPABASE_SERVICE_ROLE_KEY and therefore bypass RLS.

create index if not exists payment_vip_members_name_idx
  on public.payment_vip_members(normalized_first, normalized_last);
