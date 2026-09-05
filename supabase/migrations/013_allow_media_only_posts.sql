-- 013 :: allow media-only posts
--
-- Applied 2026-07-27. body_len required at least one character, which
-- silently rejected every post whose whole point was the attachment.
-- The client had already been relaxed to permit them, so the insert
-- failed with a generic error and told the member nothing.
--
-- Upper bound unchanged; title still required.
alter table public.discussions drop constraint if exists body_len;
alter table public.discussions add constraint body_len
  check (char_length(body) >= 0 and char_length(body) <= 20000);
