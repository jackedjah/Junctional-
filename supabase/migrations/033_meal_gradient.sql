-- ══ MEAL GRADIENT ════════════════════════════════════════════════════════
-- Photo-based meal quality and habit tracking. No macros, no calorie
-- estimation. Keyed on payment_vip_members.id, the same identity as programs,
-- sessions and Gym Progress, so a member has one nutrition history wherever it
-- is viewed. RLS on with zero policies, matching every other Gym table.
create table if not exists meal_gradient_entries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references payment_vip_members(id) on delete cascade,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  captured_at timestamptz not null default now(),
  ai_score text check (ai_score in ('green','yellow','red')),
  final_score text check (final_score in ('green','yellow','red')),
  ai_confidence numeric, meal_name text, reason_short text, improvement_short text,
  user_note text, needs_more_evidence boolean default false,
  analysis_json jsonb, analysis_model text, analysis_version text,
  scoring_version text not null default 'MG-1.0',
  submission_id text, created_by text,
  created_at timestamptz default now(), updated_at timestamptz default now());
create unique index if not exists mg_entries_submission_idx
  on meal_gradient_entries (member_id, submission_id) where submission_id is not null;
create index if not exists mg_entries_member_time_idx
  on meal_gradient_entries (member_id, captured_at desc);
create index if not exists mg_entries_member_type_time_idx
  on meal_gradient_entries (member_id, meal_type, captured_at desc);

create table if not exists meal_gradient_photos (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references meal_gradient_entries(id) on delete cascade,
  member_id uuid not null references payment_vip_members(id) on delete cascade,
  storage_path text not null, thumb_path text,
  angle_index int not null default 1 check (angle_index between 1 and 4),
  photo_type text default 'meal' check (photo_type in ('meal','label','ingredients','other')),
  crop_meta jsonb, created_at timestamptz default now());
create index if not exists mg_photos_entry_idx on meal_gradient_photos (entry_id, angle_index);
create index if not exists mg_photos_member_idx on meal_gradient_photos (member_id);

create table if not exists meal_gradient_settings (
  member_id uuid primary key references payment_vip_members(id) on delete cascade,
  daily_calorie_goal int, updated_at timestamptz default now());

alter table meal_gradient_entries  enable row level security;
alter table meal_gradient_photos   enable row level security;
alter table meal_gradient_settings enable row level security;

-- Private bucket. Meal photos are personal and must not be enumerable.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-gradient','meal-gradient', false, 15728640,
  array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=excluded.public,
  file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;
