-- MAHFITT v392 :: private coach/member Message Center foundation
-- Run once after the existing member/calendar/Meal Grade migrations.
-- Browser clients never talk to these tables directly. All access continues
-- through Netlify functions using the service role, while member identity is
-- derived from the signed My Gym token and coach identity from the admin cookie.

create table if not exists public.member_message_threads (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references public.payment_vip_members(id) on delete cascade,
  status text not null default 'open' check (status in ('open','closed')),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists member_message_threads_updated_idx
  on public.member_message_threads(updated_at desc);
alter table public.member_message_threads enable row level security;
revoke all on public.member_message_threads from anon,authenticated;

create table if not exists public.member_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.member_message_threads(id) on delete cascade,
  member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  sender_role text not null check (sender_role in ('member','coach','system')),
  message_type text not null default 'message' check (message_type in ('message','support_request','system')),
  request_type text check (request_type is null or request_type in ('general_support','theme_curation','reschedule')),
  request_status text check (request_status is null or request_status in ('pending','resolved','declined','cancelled')),
  body text not null check (char_length(body) between 1 and 2000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists member_messages_thread_time_idx
  on public.member_messages(thread_id,created_at,id);
create index if not exists member_messages_member_time_idx
  on public.member_messages(member_id,created_at desc);
create index if not exists member_messages_pending_requests_idx
  on public.member_messages(member_id,created_at desc)
  where message_type='support_request' and request_status='pending';
alter table public.member_messages enable row level security;
revoke all on public.member_messages from anon,authenticated;

create table if not exists public.member_message_notifications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.payment_vip_members(id) on delete cascade,
  message_id uuid references public.member_messages(id) on delete cascade,
  audience text not null check (audience in ('member','coach')),
  kind text not null default 'new_message' check (kind in ('new_message','support_request','request_update')),
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists member_message_notification_message_audience_uq
  on public.member_message_notifications(message_id,audience)
  where message_id is not null;
create index if not exists member_message_notifications_member_idx
  on public.member_message_notifications(member_id,audience,read_at,created_at desc);
alter table public.member_message_notifications enable row level security;
revoke all on public.member_message_notifications from anon,authenticated;

-- Keep the thread summary current even when later request/payment systems add
-- messages through their own server-side actions.
create or replace function public.touch_member_message_thread()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  update public.member_message_threads
     set last_message_at=new.created_at,
         updated_at=now(),
         status='open'
   where id=new.thread_id;
  return new;
end;
$$;

drop trigger if exists member_messages_touch_thread on public.member_messages;
create trigger member_messages_touch_thread
after insert on public.member_messages
for each row execute function public.touch_member_message_thread();
