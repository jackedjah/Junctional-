-- 006 :: more interests, and grouping put to work
--
-- 005 widened the list. This adds 38 more so the picker covers what
-- people actually talk about, and the client now renders the existing
-- `grouping` column as headings (Screen, Comics and Heroes, Gaming,
-- Music, Sports, Food, Animals, Strange and Unexplained, Style, Life,
-- Training, Training Science, FOB) instead of one flat wall of chips.
-- Applied directly on 2026-07-27; recorded here for history.

insert into public.interests (slug, name, grouping, sort_order) values
('comic-books','Comic Books','heroes',70),('star-wars','Star Wars','heroes',71),
('cartoons','Cartoons','screen',72),('reality-tv','Reality TV','screen',73),
('nintendo','Nintendo','games',74),('playstation','PlayStation','games',75),
('xbox','Xbox','games',76),('mobile-games','Mobile Games','games',77),
('rnb','R and B','music',78),('afrobeats','Afrobeats','music',79),
('making-music','Making Music','music',80),('vinyl','Vinyl','music',81),
('meal-prep','Meal Prep','food',82),('desserts','Desserts','food',83),
('grilling','Grilling','food',84),('birds','Birds','animals',85),
('reptiles','Reptiles','animals',86),('ancient-history','Ancient History','strange',87),
('baseball','Baseball','sports',88),('tennis','Tennis','sports',89),
('formula-1','Formula 1','sports',90),('boxing','Boxing','sports',91),
('tattoos','Tattoos','style',92),('watches','Watches','style',93),
('barbering','Barbering','style',94),('thrifting','Thrifting','style',95),
('money','Money','life',96),('languages','Languages','life',97),
('diy','DIY','life',98),('parenting','Parenting','life',99),
('dating-life','Dating Life','life',100),('writing','Writing','life',101),
('anime-figures','Collecting','life',102),('running','Running','training',103),
('calisthenics','Calisthenics','training',104),('yoga','Yoga','training',105),
('hiking','Hiking','training',106),('swimming','Swimming','training',107)
on conflict (slug) do nothing;
