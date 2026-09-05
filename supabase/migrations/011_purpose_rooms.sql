-- 011 :: three rooms the community's purpose implied but did not have
--
-- Applied 2026-07-27. Reviewed all 60 existing rooms first: training,
-- movement, sports, recovery, progress, questions and off topic were
-- already covered, so nothing was duplicated. Only the genuine gaps
-- were added, and one existing room was renamed because it already
-- served a purpose its name did not advertise.

insert into public.categories (slug, name, description, grouping, sort_order) values
('founder-updates','Founder Updates','What Jah is building and testing right now.','fob',7),
('beta-testing','Beta Testing','Try unreleased FOB gear and report back.','fob',8),
('training-partners','Training Partners','Find people to train with near you.','social',10)
on conflict (slug) do nothing;

-- "join classes" is a core purpose; this room already served it.
update public.categories set name = 'Classes & Coaching'
where slug = 'coaching-and-sessions';
