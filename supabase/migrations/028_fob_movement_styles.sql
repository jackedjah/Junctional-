-- FOB Systems :: seed approved FOB movement styles into Gym Tracker library.
-- Additive + idempotent. These movements intentionally track only
-- FOB Distance (stored in the existing distance field) + Time.

insert into gym_exercises (name, category, region, muscles, equipment, unilateral, compound, vars, instructions, is_custom)
select v.name, 'fob', null, '{}'::text[], 'FOB', false, false, '{distance,time}'::text[], null, false
from (values
  ('Reversal'),
  ('Arm Rock (A.R.)'),
  ('A.R. Reversal'),
  ('Underhand Swing'),
  ('Pullback'),
  ('Bottom Reverse'),
  ('Star Stance'),
  ('Lateral Raises / Lats'),
  ('Upright Row and Press Down'),
  ('Break Stance'),
  ('Overstance'),
  ('Power Reversal'),
  ('Upper Cut'),
  ('High Upright Row'),
  ('High Pullover'),
  ('Forward Slash'),
  ('Back Slash'),
  ('Slash Loop'),
  ('360 Pendulum (Unanchored)'),
  ('Yank Row (Anchored)'),
  ('Yank Tricep Extension (Anchored)'),
  ('Yank Chest Press (Anchored)')
) as v(name)
where not exists (
  select 1 from gym_exercises g where lower(g.name)=lower(v.name) and coalesce(g.archived,false)=false
);
