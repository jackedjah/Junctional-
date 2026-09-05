-- 007 :: reposts
--
-- RUN THIS IN THE SUPABASE SQL EDITOR BEFORE USING THE REPOST BUTTON.
-- Dashboard > SQL Editor > New query > paste all of this > Run.
-- Until it is run, the Repost button will show an error when tapped;
-- nothing else in the forum is affected.

create table if not exists public.discussion_reposts (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, discussion_id)
);

create index if not exists discussion_reposts_discussion_idx
  on public.discussion_reposts (discussion_id);
create index if not exists discussion_reposts_user_created_idx
  on public.discussion_reposts (user_id, created_at desc);

alter table public.discussions
  add column if not exists repost_count integer not null default 0;

alter table public.discussion_reposts enable row level security;

-- Mirrors the reaction policies: anyone not blocked can see that a
-- repost happened, but you may only create or remove your own.
drop policy if exists reposts_select on public.discussion_reposts;
create policy reposts_select on public.discussion_reposts
  for select using (
    user_id = auth.uid() or not public.is_blocked_with(user_id)
  );

drop policy if exists reposts_insert_own on public.discussion_reposts;
create policy reposts_insert_own on public.discussion_reposts
  for insert with check (user_id = auth.uid());

drop policy if exists reposts_delete_own on public.discussion_reposts;
create policy reposts_delete_own on public.discussion_reposts
  for delete using (user_id = auth.uid());

-- Keeps the count honest without the client ever writing it, so two
-- devices cannot disagree about the total.
create or replace function public.sync_repost_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.discussions
      set repost_count = repost_count + 1
      where id = new.discussion_id;
    return new;
  else
    update public.discussions
      set repost_count = greatest(repost_count - 1, 0)
      where id = old.discussion_id;
    return old;
  end if;
end;
$$;

drop trigger if exists trg_sync_repost_count on public.discussion_reposts;
create trigger trg_sync_repost_count
  after insert or delete on public.discussion_reposts
  for each row execute function public.sync_repost_count();
