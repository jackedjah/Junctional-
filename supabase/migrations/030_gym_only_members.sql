-- Gym-only members: trackable in Gym Tracker and able to sign in at /mygym,
-- but their name grants no access to the rest of the site.
--
-- A flag on the existing member table rather than a second table, because Gym
-- Tracker, My Gym and FOB Progress all key on payment_vip_members.id. A
-- parallel roster would fragment identity and break the one-member-one-history
-- rule the whole Gym system rests on.
alter table payment_vip_members
  add column if not exists gym_only boolean not null default false;
create index if not exists pvm_gym_only_idx on payment_vip_members (gym_only, active);
