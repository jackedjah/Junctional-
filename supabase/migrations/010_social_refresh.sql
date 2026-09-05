-- ============================================================
-- FOB COMMUNITY :: 010 SOCIAL REFRESH
-- Additive and migration-safe.
-- Slugs are never changed, so every existing post stays attached
-- to its category. Only display names and groupings move.
-- ============================================================

-- ---------- per-member post card colour ----------------------
alter table public.profiles
  add column if not exists card_theme text not null default 'paper';

do $$ begin
  alter table public.profiles add constraint card_theme_allowed
    check (card_theme in ('paper','cream','sand','mist','slate','ink'));
exception when duplicate_object then null; end $$;

comment on column public.profiles.card_theme is
  'Which surface colour this member''s posts render on. Curated list only.';

-- ---------- rename the jargon --------------------------------
update public.categories set name = 'Gym Talk',           grouping = 'fitness', sort_order = 110 where slug = 'general-fitness';
update public.categories set name = 'Strength & Muscle',  grouping = 'fitness', sort_order = 120 where slug = 'strength-and-muscle';
update public.categories set name = 'Cardio & Conditioning', grouping = 'fitness', sort_order = 130 where slug = 'conditioning';
update public.categories set name = 'Recovery & Soreness',grouping = 'fitness', sort_order = 140 where slug = 'mobility-recovery';
update public.categories set name = 'Food & Nutrition',   grouping = 'fitness', sort_order = 150 where slug = 'nutrition';
update public.categories set name = 'Advice Needed',      grouping = 'fitness', sort_order = 160 where slug = 'training-questions';
update public.categories set name = 'Progress Pics',      grouping = 'fitness', sort_order = 170 where slug = 'field-notes';
update public.categories set name = 'Off Topic',          grouping = 'social',  sort_order = 90  where slug = 'off-topic';

update public.categories set name = 'Ask About FOB',      sort_order = 50 where slug = 'framework-questions';
update public.categories set name = 'FOB Progress',       sort_order = 60 where slug = 'fob-training-experiences';
update public.categories set name = 'Gear Feedback',      sort_order = 70 where slug = 'prototype-feedback';
update public.categories set name = 'Coaching',           sort_order = 80 where slug = 'coaching-and-sessions';

update public.categories set name = 'Tennis',        grouping = 'sports' where slug = 'tennis';
update public.categories set name = 'Handball',      grouping = 'sports' where slug = 'handball';
update public.categories set name = 'Basketball',    grouping = 'sports' where slug = 'basketball';
update public.categories set name = 'Running',       grouping = 'sports' where slug = 'running';
update public.categories set name = 'Combat Sports', grouping = 'sports' where slug = 'combat-sports';

-- The technical ones stay available but drop out of the way.
update public.categories set grouping = 'science', sort_order = 900 where slug in
  ('biomechanics','exercise-science','training-research','movement-analysis',
   'adaptive-strength','reactive-endurance');

-- ---------- add the social hubs ------------------------------
insert into public.categories (slug, name, description, grouping, sort_order) values
  ('the-locker-room','The Locker Room','Everyday talk. Anything goes.','social',10),
  ('daily-check-in','Daily Check-In','What are you doing today?','social',20),
  ('introduce-yourself','Introduce Yourself','New here? Say hey.','social',30),
  ('memes','Memes & Brain Rot','Post the funny stuff.','social',40),
  ('watching','What We''re Watching','Shows, movies, fights, whatever.','social',50),
  ('music','Music','What is in your ears right now.','social',60),
  ('gaming','Gaming','Console, PC, mobile, all of it.','social',70),
  ('sports-talk','Sports Talk','Games, takes, arguments.','social',80),

  ('gym-wins','Gym Wins','Something went right. Brag a little.','fitness',10),
  ('gym-fails','Gym Fails','Something went wrong. We have all been there.','fitness',20),
  ('personal-records','Personal Records','New PR? Put it up.','fitness',30),
  ('form-checks','Form Checks','Post a clip, get honest eyes on it.','fitness',40),
  ('gym-crushes','Gym Crushes','Keep it respectful.','fitness',50),
  ('cheat-meals','Cheat Meals','Show the food.','fitness',60),
  ('gym-fits','Gear & Gym Fits','Shoes, fits, equipment.','fitness',70),
  ('motivation','Motivation','Discipline, consistency, showing up.','fitness',80)
on conflict (slug) do nothing;
