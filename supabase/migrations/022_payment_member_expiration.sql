-- FOB Systems :: add editable expiration tracking to private payment member ledger
alter table public.payment_vip_members
  add column if not exists expires_at timestamptz;

-- Existing members receive a 180-day window from the time this migration is run.
update public.payment_vip_members
set expires_at = now() + interval '180 days'
where expires_at is null;

alter table public.payment_vip_members
  alter column expires_at set default (now() + interval '180 days');
