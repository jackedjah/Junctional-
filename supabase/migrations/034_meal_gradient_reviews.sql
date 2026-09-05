-- ══ MEAL GRADE COACH REVIEWS ════════════════════════════════════════════
-- One coach-authored review may be attached to one existing Meal Grade
-- entry. Reviews are additive and never alter the AI result stored on the
-- parent entry. Access continues through the existing server/service-role
-- architecture; RLS remains enabled with no browser policies.
create table if not exists meal_gradient_reviews (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references meal_gradient_entries(id) on delete cascade,
  member_id uuid not null references payment_vip_members(id) on delete cascade,
  coach_feedback text,
  ai_accuracy_rating text check (ai_accuracy_rating in ('down','neutral','up')),
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists mg_reviews_entry_idx
  on meal_gradient_reviews (entry_id);
create index if not exists mg_reviews_member_time_idx
  on meal_gradient_reviews (member_id, reviewed_at desc);

alter table meal_gradient_reviews enable row level security;
