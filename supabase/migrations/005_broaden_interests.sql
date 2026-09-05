-- 005 :: broaden the onboarding interest list
--
-- The original 14 interests were entirely training, science and FOB.
-- New members were being asked to describe themselves purely as
-- athletes, which is not who most of them are. This widens the list to
-- 64 and leaves fitness at roughly a fifth of it, interleaved by
-- sort_order rather than clustered, so it reads as one interest among
-- many instead of the only category on offer.
--
-- Applied directly to the FOB Systems project on 2026-07-26; kept here
-- so the schema history stays complete.

insert into public.interests (slug, name, grouping, sort_order) values
('movies','Movies','screen',1),
('marvel','Marvel','heroes',2),
('cheat-days','Cheat Days','food',3),
('dogs','Dogs','animals',4),
('aliens-ufos','Aliens and UFOs','strange',5),
('batman','Batman','heroes',6),
('anime','Anime','screen',7),
('basketball','Basketball','sports',8),
('cooking','Cooking','food',9),
('spider-man','Spider-Man','heroes',10),
('music','Music','music',11),
('true-crime','True Crime','strange',12),
('cats','Cats','animals',13),
('gaming','Gaming','games',14),
('tv-shows','TV Shows','screen',16),
('sneakers','Sneakers','style',17),
('hip-hop','Hip-Hop','music',18),
('space','Space','strange',19),
('horror','Horror','screen',20),
('travel','Travel','life',21),
('dc-comics','DC','heroes',22),
('cars','Cars','life',23),
('coffee','Coffee','food',24),
('conspiracy-theories','Conspiracy Theories','strange',25),
('football','Football','sports',26),
('comedy','Comedy','screen',28),
('wildlife','Wildlife','animals',29),
('memes','Memes','life',30),
('sci-fi','Sci-Fi','screen',31),
('photography','Photography','life',32),
('soccer','Soccer','sports',33),
('street-food','Street Food','food',34),
('books','Books','life',35),
('paranormal','Paranormal','strange',37),
('fashion','Fashion','style',38),
('tech','Tech','life',39),
('combat-sports','Combat Sports','sports',40),
('baking','Baking','food',41),
('documentaries','Documentaries','screen',42),
('plants','Plants','life',43),
('esports','Esports','games',44),
('podcasts','Podcasts','life',46),
('art','Art','life',47),
('nightlife','Nightlife','life',48),
('aquariums','Aquariums','animals',49),
('retro-games','Retro Games','games',50),
('city-living','City Living','life',52),
('live-shows','Live Shows','music',53),
('cryptids','Cryptids','strange',54),
('hot-sauce','Hot Sauce','food',55)
on conflict (slug) do nothing;

update public.interests set sort_order = case slug
  when 'general-fitness'     then 15
  when 'strength-and-muscle' then 27
  when 'nutrition'           then 36
  when 'recovery'            then 45
  when 'conditioning'        then 51
  when 'mobility'            then 56
  when 'coaching'            then 57
  when 'rehabilitation'      then 58
  when 'sports-science'      then 59
  when 'biomechanics'        then 60
  when 'movement-analysis'   then 61
  when 'adaptive-strength'   then 62
  when 'reactive-endurance'  then 63
  when 'fob-systems'         then 64
  else sort_order end
where grouping in ('training','science','fob');
