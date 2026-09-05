-- ══ MEAL GRADE PHYSIQUE GOAL ═════════════════════════════════════════════
-- Add one member-controlled body-composition context field to the existing
-- Meal Grade settings row. This is additive and does not alter stored grades,
-- photos, workout data, or the existing calorie goal.

alter table meal_gradient_settings
  add column if not exists physique_goal text not null default 'maintain';

update meal_gradient_settings
set physique_goal = 'maintain'
where physique_goal is null
   or physique_goal not in ('gain', 'maintain', 'lose');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'meal_gradient_settings_physique_goal_check'
  ) then
    alter table meal_gradient_settings
      add constraint meal_gradient_settings_physique_goal_check
      check (physique_goal in ('gain', 'maintain', 'lose'));
  end if;
end $$;
