-- FOB Systems :: per-member revocation for progress share links.
--
-- Share links are stateless signed tokens, so there is nothing to delete when
-- Jah wants one to stop working. This column is the cut-off: a token is only
-- honoured when it was issued at or after progress_share_from. Setting it to
-- now() kills every link already handed out for that member, without touching
-- the member record in any other way.
--
-- Additive only. Nullable, no default, no backfill, no data rewritten. Existing
-- members keep every balance, day count, name and rate exactly as they are.

alter table public.payment_vip_members
  add column if not exists progress_share_from timestamptz;

comment on column public.payment_vip_members.progress_share_from is
  'Progress share links issued before this moment are rejected. Null means no links have been revoked.';
