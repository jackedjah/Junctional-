-- FOB Systems :: Gym Tracker v242
-- Multiple persistent programs per existing FOB member.
create table if not exists gym_member_programs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references payment_vip_members(id) on delete cascade,
  name text not null,
  sub text,
  body jsonb not null default '{}'::jsonb,
  archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists gym_member_programs_member_idx
  on gym_member_programs (member_id, updated_at desc);
alter table gym_member_programs enable row level security;
