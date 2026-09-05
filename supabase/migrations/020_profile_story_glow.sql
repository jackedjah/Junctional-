-- 020 :: story glow moves to the profile
--
-- Applied 2026-07-27. Choosing a colour on every story is a chore and
-- makes a person's stories inconsistent to everyone watching, so the
-- colour now belongs to the profile and applies to everything they
-- post. Existing per-story colours were carried across so nobody lost
-- a choice they had already made; stories.glow_color remains as a
-- fallback and is no longer written by the client.
--
-- Validated by CHECK because the value is interpolated into a style
-- attribute.
alter table public.profiles add column if not exists story_glow text;
alter table public.profiles drop constraint if exists profile_story_glow_hex;
alter table public.profiles add constraint profile_story_glow_hex
  check (story_glow is null or story_glow ~ '^#[0-9A-Fa-f]{6}$');
