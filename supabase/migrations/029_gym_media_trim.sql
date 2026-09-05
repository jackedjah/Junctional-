-- Trim markers for reference clips. Used only when a browser could not
-- re-encode; the file is stored whole and the player honours the window.
-- Nullable and additive; existing media rows play from the start as before.
alter table gym_exercises add column if not exists media_start numeric;
alter table gym_exercises add column if not exists media_end numeric;
