-- MAHFITT v411 — member-level master Volume preference.
-- This is intentionally NOT stored on a Theme or individual track: switching
-- Themes/songs must never silently change the member's loudness preference.
-- Existing RLS on member_music_state remains unchanged; the private My Gym
-- server endpoint continues to own reads/writes through service_role.

alter table public.member_music_state
  add column if not exists master_volume numeric(4,3) not null default 1.000;

update public.member_music_state
set master_volume = least(1.000, greatest(0.000, coalesce(master_volume, 1.000)))
where master_volume is null
   or master_volume < 0.000
   or master_volume > 1.000;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'member_music_state_master_volume_range'
      and conrelid = 'public.member_music_state'::regclass
  ) then
    alter table public.member_music_state
      add constraint member_music_state_master_volume_range
      check (master_volume >= 0.000 and master_volume <= 1.000);
  end if;
end $$;
