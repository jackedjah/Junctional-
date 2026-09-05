-- Poster frame for an exercise clip, so the card shows the movement rather
-- than a generic play glyph. Grabbed from the video at upload time and stored
-- as a small JPEG in the same bucket. Nullable and additive: an exercise
-- without one falls back to the clip's own first frame, then to the glyph.
alter table gym_exercises add column if not exists media_poster text;
