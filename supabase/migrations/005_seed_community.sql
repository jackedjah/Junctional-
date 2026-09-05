-- ============================================================
-- FOB COMMUNITY :: 005 SEED
-- Official vocabularies and platform settings only.
-- No fabricated members, posts, testimonials or counts.
-- ============================================================

insert into public.sports (slug, name, sort_order) values
  ('tennis','Tennis',10),
  ('handball','Handball',20),
  ('basketball','Basketball',30),
  ('football','Football',40),
  ('soccer','Soccer',50),
  ('baseball','Baseball',60),
  ('track-and-field','Track and Field',70),
  ('running','Running',80),
  ('bodybuilding','Bodybuilding',90),
  ('powerlifting','Powerlifting',100),
  ('olympic-weightlifting','Olympic Weightlifting',110),
  ('combat-sports','Combat Sports',120),
  ('dance','Dance',130),
  ('swimming','Swimming',140),
  ('cycling','Cycling',150),
  ('climbing','Climbing',160),
  ('general-fitness','General Fitness',170)
on conflict (slug) do nothing;

insert into public.interests (slug, name, grouping, sort_order) values
  ('mobility','Mobility','training',10),
  ('rehabilitation','Rehabilitation','training',20),
  ('coaching','Coaching','training',30),
  ('general-fitness','General Fitness','training',40),
  ('adaptive-strength','Adaptive Strength','fob',50),
  ('reactive-endurance','Reactive Endurance','fob',60),
  ('fob-systems','FOB Systems','fob',70),
  ('biomechanics','Biomechanics','science',80),
  ('sports-science','Sports Science','science',90),
  ('movement-analysis','Movement Analysis','science',100),
  ('conditioning','Conditioning','training',110),
  ('strength','Strength and Muscle','training',120),
  ('nutrition','Nutrition','training',130),
  ('recovery','Recovery','training',140)
on conflict (slug) do nothing;

-- Reserved handles: routes, roles, brand terms, impersonation risks.
insert into public.reserved_usernames (username, reason) values
  ('admin','role'), ('administrator','role'), ('moderator','role'), ('mod','role'),
  ('founder','role'), ('staff','role'), ('team','role'), ('support','role'),
  ('help','role'), ('official','role'), ('coach','role'), ('verified','role'),
  ('fob','brand'), ('fobsystems','brand'), ('fob_systems','brand'),
  ('fobsystem','brand'), ('jah','brand'), ('junctionjah','brand'),
  ('junction','brand'), ('jackedfunction','brand'), ('fobber','brand'),
  ('api','route'), ('www','route'), ('community','route'), ('settings','route'),
  ('messages','route'), ('notifications','route'), ('discover','route'),
  ('friends','route'), ('profile','route'), ('login','route'), ('logout','route'),
  ('register','route'), ('signup','route'), ('auth','route'), ('onboarding','route'),
  ('moderation','route'), ('saved','route'), ('search','route'), ('about','route'),
  ('null','reserved'), ('undefined','reserved'), ('anonymous','reserved'),
  ('deleted','reserved'), ('everyone','reserved'), ('here','reserved')
on conflict (username) do nothing;

insert into public.community_settings (key, value, description) values
  ('minimum_age', '18'::jsonb,
   'Minimum age to hold a community account. Changing this requires legal review.'),
  ('registration_open', 'true'::jsonb,
   'Set false to pause new signups without taking the community offline.'),
  ('avatar_max_bytes', '8388608'::jsonb, 'Avatar upload ceiling, mirrored in the bucket config.'),
  ('max_custom_interests_per_user', '3'::jsonb,
   'How many unapproved custom interests one member may propose.'),
  ('community_name', '"FOB Community"'::jsonb, 'Public product name.')
on conflict (key) do nothing;

-- ------------------------------------------------------------
-- FOUNDER ACCOUNT
-- Deliberately NOT seeded. Roles cannot be assigned by SQL that
-- runs before the account exists, and hardcoding an email here
-- would be a credential in version control. After registering,
-- run this once in the Supabase SQL editor:
--
--   insert into public.user_roles (user_id, role)
--   select id, 'founder' from public.profiles where username = 'your-handle';
--
-- Documented in COMMUNITY_SETUP.md step 7.
-- ------------------------------------------------------------
