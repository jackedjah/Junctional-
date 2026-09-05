-- FOB Systems :: GYM TRACKER
-- Additive only. Nothing existing is altered, dropped or backfilled.
--
-- WHY TWO PLACES HOLD SET DATA
--   gym_sessions.body   the exact session as performed, stored whole. This is
--                       the fidelity record: it reconstructs the screen even if
--                       the template, the library or the prescription later
--                       change.
--   gym_sets            a flat, indexed row per performed set. This is the
--                       query record: "last four sessions of bench press for
--                       this client" has to be fast, and digging that out of
--                       jsonb across hundreds of sessions is not.
--   The overlap is deliberate and is the only duplication in the model.

create table if not exists gym_exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  region text,
  muscles text[] default '{}',
  equipment text,
  unilateral boolean default false,
  compound boolean default false,
  vars text[] default '{weight,reps}',
  instructions text,
  media_url text,
  is_custom boolean default false,
  archived boolean default false,
  created_at timestamptz default now()
);
create index if not exists gym_ex_name_idx on gym_exercises (lower(name));
create index if not exists gym_ex_filter_idx on gym_exercises (category, region, equipment);

create table if not exists gym_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  notes text,
  body jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists gym_sessions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references payment_vip_members(id) on delete cascade,
  template_id uuid references gym_templates(id) on delete set null,
  name text,
  session_date date not null default current_date,
  started_at timestamptz,
  ended_at timestamptz,
  duration_s int default 0,
  notes text,
  status text not null default 'open',
  body jsonb not null default '[]'::jsonb,
  client_rev int default 0,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);
create index if not exists gym_sess_member_idx on gym_sessions (member_id, session_date desc);
-- one open session per client, mirroring the fob_active_sessions precedent
create unique index if not exists gym_sess_one_open
  on gym_sessions (member_id) where status = 'open';

create table if not exists gym_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references gym_sessions(id) on delete cascade,
  member_id uuid not null,
  exercise_id uuid,
  exercise_name text not null,
  session_date date not null,
  set_no int not null,
  weight numeric, reps int, time_s int, distance numeric,
  resistance text, rpe numeric, rir numeric,
  fm_distance numeric, fm_time_s int,
  created_at timestamptz default now()
);
create index if not exists gym_sets_hist_idx
  on gym_sets (member_id, exercise_id, session_date desc, set_no);

-- Same posture as payment_vip_members and the fob_* tables: RLS on with zero
-- policies, so the anon key can read nothing. Every query goes through a
-- Netlify function using the service role behind the admin session.
alter table gym_exercises enable row level security;
alter table gym_templates enable row level security;
alter table gym_sessions  enable row level security;
alter table gym_sets      enable row level security;

insert into gym_exercises (name,category,region,muscles,equipment,unilateral,compound,vars) values
('Barbell Bench Press','push','upper','{"chest","triceps","front delts"}','barbell',false,true,'{weight,reps}'),
('Incline Barbell Bench Press','push','upper','{"upper chest","triceps","front delts"}','barbell',false,true,'{weight,reps}'),
('Dumbbell Bench Press','push','upper','{"chest","triceps"}','dumbbell',false,true,'{weight,reps}'),
('Incline Dumbbell Press','push','upper','{"upper chest","front delts"}','dumbbell',false,true,'{weight,reps}'),
('Decline Barbell Press','push','upper','{"lower chest","triceps"}','barbell',false,true,'{weight,reps}'),
('Close Grip Bench Press','push','upper','{"triceps","chest"}','barbell',false,true,'{weight,reps}'),
('Machine Chest Press','push','upper','{"chest","triceps"}','machine',false,true,'{weight,reps}'),
('Cable Fly','push','upper','{"chest"}','cable',false,false,'{weight,reps}'),
('Low to High Cable Fly','push','upper','{"upper chest"}','cable',false,false,'{weight,reps}'),
('Dumbbell Fly','push','upper','{"chest"}','dumbbell',false,false,'{weight,reps}'),
('Pec Deck','push','upper','{"chest"}','machine',false,false,'{weight,reps}'),
('Push-Up','push','upper','{"chest","triceps","core"}','bodyweight',false,true,'{weight,reps}'),
('Deficit Push-Up','push','upper','{"chest","triceps"}','bodyweight',false,true,'{weight,reps}'),
('Dip','push','upper','{"chest","triceps"}','bodyweight',false,true,'{weight,reps}'),
('Overhead Press','push','upper','{"delts","triceps"}','barbell',false,true,'{weight,reps}'),
('Seated Dumbbell Shoulder Press','push','upper','{"delts","triceps"}','dumbbell',false,true,'{weight,reps}'),
('Arnold Press','push','upper','{"delts"}','dumbbell',false,true,'{weight,reps}'),
('Single Arm Landmine Press','push','upper','{"delts","upper chest"}','landmine',true,true,'{weight,reps}'),
('Machine Shoulder Press','push','upper','{"delts"}','machine',false,true,'{weight,reps}'),
('Lateral Raise','push','upper','{"side delts"}','dumbbell',false,false,'{weight,reps}'),
('Cable Lateral Raise','push','upper','{"side delts"}','cable',true,false,'{weight,reps}'),
('Y-Raise','push','upper','{"lower traps","rear delts"}','dumbbell',false,false,'{weight,reps}'),
('Front Raise','push','upper','{"front delts"}','dumbbell',false,false,'{weight,reps}'),
('Reverse Fly','pull','upper','{"rear delts","upper back"}','dumbbell',false,false,'{weight,reps}'),
('Cable Rear Delt Fly','pull','upper','{"rear delts"}','cable',false,false,'{weight,reps}'),
('Face Pull','pull','upper','{"rear delts","upper back"}','cable',false,false,'{weight,reps}'),
('Upright Row','pull','upper','{"traps","side delts"}','barbell',false,true,'{weight,reps}'),
('Barbell Row','pull','upper','{"lats","mid back"}','barbell',false,true,'{weight,reps}'),
('Pendlay Row','pull','upper','{"lats","mid back"}','barbell',false,true,'{weight,reps}'),
('Single Arm Dumbbell Row','pull','upper','{"lats","mid back"}','dumbbell',true,true,'{weight,reps}'),
('Chest Supported Row','pull','upper','{"mid back","lats"}','dumbbell',false,true,'{weight,reps}'),
('Seated Cable Row','pull','upper','{"mid back","lats"}','cable',false,true,'{weight,reps}'),
('Single Arm Cable Row','pull','upper','{"lats","mid back"}','cable',true,true,'{weight,reps}'),
('Landmine Row','pull','upper','{"lats","mid back"}','landmine',true,true,'{weight,reps}'),
('T-Bar Row','pull','upper','{"mid back","lats"}','machine',false,true,'{weight,reps}'),
('Inverted Row','pull','upper','{"mid back","lats"}','bodyweight',false,true,'{weight,reps}'),
('Lat Pulldown','pull','upper','{"lats"}','cable',false,true,'{weight,reps}'),
('Neutral Grip Pulldown','pull','upper','{"lats"}','cable',false,true,'{weight,reps}'),
('Wide Grip Pulldown','pull','upper','{"lats"}','cable',false,true,'{weight,reps}'),
('Single Arm Pulldown','pull','upper','{"lats"}','cable',true,true,'{weight,reps}'),
('Straight Arm Pulldown','pull','upper','{"lats"}','cable',false,false,'{weight,reps}'),
('Pull-Up','pull','upper','{"lats","biceps"}','bodyweight',false,true,'{weight,reps}'),
('Chin-Up','pull','upper','{"lats","biceps"}','bodyweight',false,true,'{weight,reps}'),
('Assisted Pull-Up','pull','upper','{"lats","biceps"}','machine',false,true,'{weight,reps}'),
('Shrug','pull','upper','{"traps"}','barbell',false,false,'{weight,reps}'),
('Dumbbell Shrug','pull','upper','{"traps"}','dumbbell',false,false,'{weight,reps}'),
('Back Squat','squat','lower','{"quads","glutes"}','barbell',false,true,'{weight,reps}'),
('Front Squat','squat','lower','{"quads","glutes"}','barbell',false,true,'{weight,reps}'),
('Goblet Squat','squat','lower','{"quads","glutes"}','dumbbell',false,true,'{weight,reps}'),
('Hack Squat','squat','lower','{"quads"}','machine',false,true,'{weight,reps}'),
('Leg Press','squat','lower','{"quads","glutes"}','machine',false,true,'{weight,reps}'),
('Bulgarian Split Squat','squat','lower','{"quads","glutes"}','dumbbell',true,true,'{weight,reps}'),
('Split Squat','squat','lower','{"quads","glutes"}','dumbbell',true,true,'{weight,reps}'),
('Reverse Lunge','squat','lower','{"quads","glutes"}','dumbbell',true,true,'{weight,reps}'),
('Walking Lunge','squat','lower','{"quads","glutes"}','dumbbell',true,true,'{weight,reps}'),
('Step-Up','squat','lower','{"quads","glutes"}','dumbbell',true,true,'{weight,reps}'),
('Sissy Squat','squat','lower','{"quads"}','bodyweight',false,false,'{weight,reps}'),
('Leg Extension','squat','lower','{"quads"}','machine',false,false,'{weight,reps}'),
('Romanian Deadlift','hinge','lower','{"hamstrings","glutes"}','barbell',false,true,'{weight,reps}'),
('Dumbbell Romanian Deadlift','hinge','lower','{"hamstrings","glutes"}','dumbbell',false,true,'{weight,reps}'),
('Single Leg Romanian Deadlift','hinge','lower','{"hamstrings","glutes"}','dumbbell',true,true,'{weight,reps}'),
('Conventional Deadlift','hinge','lower','{"hamstrings","glutes","back"}','barbell',false,true,'{weight,reps}'),
('Sumo Deadlift','hinge','lower','{"glutes","quads","back"}','barbell',false,true,'{weight,reps}'),
('Trap Bar Deadlift','hinge','lower','{"glutes","quads","back"}','barbell',false,true,'{weight,reps}'),
('Good Morning','hinge','lower','{"hamstrings","glutes"}','barbell',false,true,'{weight,reps}'),
('Back Extension','hinge','lower','{"hamstrings","glutes","spinal erectors"}','bodyweight',false,false,'{weight,reps}'),
('Hip Thrust','hinge','lower','{"glutes"}','barbell',false,true,'{weight,reps}'),
('Single Leg Hip Thrust','hinge','lower','{"glutes"}','bodyweight',true,true,'{weight,reps}'),
('Glute Bridge','hinge','lower','{"glutes"}','bodyweight',false,false,'{weight,reps}'),
('Cable Pull Through','hinge','lower','{"glutes","hamstrings"}','cable',false,true,'{weight,reps}'),
('Kettlebell Swing','hinge','lower','{"glutes","hamstrings"}','kettlebell',false,true,'{weight,reps}'),
('Lying Leg Curl','hinge','lower','{"hamstrings"}','machine',false,false,'{weight,reps}'),
('Seated Leg Curl','hinge','lower','{"hamstrings"}','machine',false,false,'{weight,reps}'),
('Nordic Curl','hinge','lower','{"hamstrings"}','bodyweight',false,false,'{weight,reps}'),
('Standing Calf Raise','isolation','lower','{"calves"}','machine',false,false,'{weight,reps}'),
('Seated Calf Raise','isolation','lower','{"calves"}','machine',false,false,'{weight,reps}'),
('Single Leg Calf Raise','isolation','lower','{"calves"}','bodyweight',true,false,'{weight,reps}'),
('Barbell Biceps Curl','isolation','upper','{"biceps"}','barbell',false,false,'{weight,reps}'),
('Dumbbell Biceps Curl','isolation','upper','{"biceps"}','dumbbell',false,false,'{weight,reps}'),
('Hammer Curl','isolation','upper','{"biceps","brachialis"}','dumbbell',false,false,'{weight,reps}'),
('Incline Dumbbell Curl','isolation','upper','{"biceps"}','dumbbell',false,false,'{weight,reps}'),
('Preacher Curl','isolation','upper','{"biceps"}','machine',false,false,'{weight,reps}'),
('Cable Curl','isolation','upper','{"biceps"}','cable',false,false,'{weight,reps}'),
('Concentration Curl','isolation','upper','{"biceps"}','dumbbell',true,false,'{weight,reps}'),
('Cable Triceps Pressdown','isolation','upper','{"triceps"}','cable',false,false,'{weight,reps}'),
('Rope Triceps Pressdown','isolation','upper','{"triceps"}','cable',false,false,'{weight,reps}'),
('Overhead Cable Triceps Extension','isolation','upper','{"triceps"}','cable',false,false,'{weight,reps}'),
('Skull Crusher','isolation','upper','{"triceps"}','barbell',false,false,'{weight,reps}'),
('Dumbbell Overhead Extension','isolation','upper','{"triceps"}','dumbbell',false,false,'{weight,reps}'),
('Single Arm Cable Kickback','isolation','upper','{"triceps"}','cable',true,false,'{weight,reps}'),
('Wrist Curl','isolation','upper','{"forearms"}','dumbbell',false,false,'{weight,reps}'),
('Farmer Carry','carry','full','{"grip","core","traps"}','dumbbell',false,true,'{weight,time}'),
('Suitcase Carry','carry','full','{"core","grip"}','dumbbell',true,true,'{weight,time}'),
('Front Rack Carry','carry','full','{"core","shoulders"}','kettlebell',false,true,'{weight,time}'),
('Overhead Carry','carry','full','{"shoulders","core"}','kettlebell',false,true,'{weight,time}'),
('Sled Push','carry','lower','{"quads","glutes"}','sled',false,true,'{weight,time}'),
('Sled Drag','carry','lower','{"quads","hamstrings"}','sled',false,true,'{weight,time}'),
('Plank','core','core','{"core"}','bodyweight',false,false,'{time}'),
('Side Plank','core','core','{"obliques"}','bodyweight',true,false,'{time}'),
('Dead Bug','core','core','{"core"}','bodyweight',false,false,'{time}'),
('Hanging Leg Raise','core','core','{"core","hip flexors"}','bodyweight',false,false,'{weight,reps}'),
('Cable Crunch','core','core','{"core"}','cable',false,false,'{weight,reps}'),
('Ab Wheel Rollout','core','core','{"core"}','other',false,false,'{weight,reps}'),
('Pallof Press','core','core','{"obliques","core"}','cable',false,false,'{weight,reps}'),
('Cable Woodchop','core','core','{"obliques","core"}','cable',true,false,'{weight,reps}'),
('Landmine Rotation','core','core','{"obliques","core"}','landmine',false,true,'{weight,reps}'),
('Russian Twist','core','core','{"obliques"}','bodyweight',false,false,'{weight,reps}'),
('Bird Dog','core','core','{"core","glutes"}','bodyweight',true,false,'{time}'),
('Copenhagen Plank','core','core','{"adductors","core"}','bodyweight',true,false,'{time}'),
('Reactive Core','fob','core','{"core","obliques"}','fob',false,true,'{fm,time}'),
('Reactive Isometric','fob','core','{"core"}','fob',false,true,'{fm,time}'),
('Reactive Push / Pull','fob','upper','{"chest","back","core"}','fob',false,true,'{fm,time}'),
('Reactive Curl / Extension','fob','upper','{"biceps","triceps"}','fob',true,false,'{fm,time}'),
('Reactive Lateral Raise','fob','upper','{"side delts"}','fob',true,false,'{fm,time}'),
('Reactive Upright Row / Pressdown','fob','upper','{"traps","triceps"}','fob',true,false,'{fm,time}'),
('Treadmill Run','conditioning','full','{"cardio"}','machine',false,true,'{time,distance}'),
('Assault Bike','conditioning','full','{"cardio"}','machine',false,true,'{time,distance}'),
('Rower','conditioning','full','{"cardio","back"}','machine',false,true,'{time,distance}'),
('Ski Erg','conditioning','full','{"cardio","lats"}','machine',false,true,'{time,distance}'),
('Jump Rope','conditioning','full','{"calves","cardio"}','other',false,true,'{time,distance}'),
('Box Jump','conditioning','lower','{"quads","glutes"}','other',false,true,'{time,distance}')
on conflict do nothing;
