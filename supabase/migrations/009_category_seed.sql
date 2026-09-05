-- ============================================================
-- FOB COMMUNITY :: 009 CATEGORY SEED
-- Official categories only. No fabricated discussions, members,
-- reply counts or activity.
-- ============================================================

insert into public.categories (slug, name, description, grouping, sort_order) values
  -- FOB Systems
  ('start-here','Start Here','New to FOB? Begin with the basics and ask anything.','fob',10),
  ('fob-research','FOB Research','Open questions, field tests, and what the evidence does and does not show.','fob',20),
  ('adaptive-strength','Adaptive Strength','Managing force when the demand keeps changing.','fob',30),
  ('reactive-endurance','Reactive Endurance','Holding timing, posture and breathing under repeated effort.','fob',40),
  ('framework-questions','Framework Questions','Questions about the FOB Framework and how it is taught.','fob',50),
  ('fob-training-experiences','FOB Training Experiences','Sessions, progress and what it actually felt like.','fob',60),
  ('prototype-feedback','Prototype and Product Feedback','Equipment notes, wear, failures and suggestions.','fob',70),
  ('coaching-and-sessions','Coaching and Sessions','Working with a coach, and coaching others.','fob',80),

  -- General
  ('general-fitness','General Fitness','Training talk that does not fit anywhere else.','general',110),
  ('strength-and-muscle','Strength and Muscle','Getting stronger and building muscle.','general',120),
  ('conditioning','Conditioning and Endurance','Work capacity, engine, and staying in it longer.','general',130),
  ('mobility-recovery','Mobility and Recovery','Moving well, staying healthy, and recovering properly.','general',140),
  ('nutrition','Nutrition','Eating to support how you train.','general',150),
  ('training-questions','Training Questions','Stuck on something? Ask here.','general',160),
  ('field-notes','Progress and Field Notes','What you tried, what happened, what you would change.','general',170),
  ('off-topic','Off Topic','Everything else.','general',180),

  -- Sports
  ('tennis','Tennis','Court, technique, conditioning and competition.','sports',210),
  ('handball','Handball','Court handball and the training around it.','sports',220),
  ('basketball','Basketball','Hoops, athleticism and in-season work.','sports',230),
  ('running','Running','Road, track and trail.','sports',240),
  ('combat-sports','Combat Sports','Striking, grappling and fight preparation.','sports',250),
  ('field-court-sports','Field and Court Sports','Football, soccer, baseball and the rest.','sports',260),
  ('other-sports','Other Sports','Anything not listed above.','sports',270),

  -- Science
  ('biomechanics','Biomechanics','Forces, levers, and how the body organizes movement.','science',310),
  ('exercise-science','Exercise Science','Physiology, adaptation and the research behind it.','science',320),
  ('training-research','Training Research','Studies, reviews, and reading them critically.','science',330),
  ('movement-analysis','Movement Analysis','Watching movement and understanding what you see.','science',340)
on conflict (slug) do nothing;

-- ------------------------------------------------------------
-- CURRENT RESEARCH QUESTION
-- Deliberately NOT seeded as a discussion row.
--
-- A seeded post needs an author, and the only honest author is
-- the founder account, which does not exist until Jah registers.
-- Inventing one would put a fabricated member in the database,
-- which the brief explicitly rules out.
--
-- After registering and granting yourself the founder role,
-- create the post through the UI in FOB Research, then run:
--
--   select public.set_current_research('<discussion-uuid>');
--
-- Suggested opening question:
--   "How does oscillatory resistance change the way fatigue,
--    stability, and coordination interact during repeated
--    movement?"
--
-- Structure it in four parts so the labels stay meaningful:
--   what existing evidence shows, the current FOB hypothesis,
--   community observations so far, and the open questions.
-- ------------------------------------------------------------
