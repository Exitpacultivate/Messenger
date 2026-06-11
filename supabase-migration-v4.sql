-- ===========================================================
-- МИГРАЦИЯ v4: друзья и блокировки
-- Запускать можно многократно. Вставьте целиком в SQL Editor → Run.
-- ===========================================================

-- Друзья (личный список контактов)
create table if not exists public.friends (
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, friend_id)
);
alter table public.friends enable row level security;
drop policy if exists "friends: свои" on public.friends;
create policy "friends: свои" on public.friends
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Блокировки
create table if not exists public.blocks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, blocked_id)
);
alter table public.blocks enable row level security;
drop policy if exists "blocks: свои" on public.blocks;
create policy "blocks: свои" on public.blocks
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Заблокированный не может писать в личный чат с тем, кто его заблокировал
create or replace function public.is_blocked_in_chat(c uuid, sender uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists(
    select 1 from chats ch
    join blocks b on b.blocked_id = sender
      and b.user_id = case when ch.u1 = sender then ch.u2 else ch.u1 end
    where ch.id = c and ch.is_group = false and ch.u1 <> ch.u2
  );
$$;

drop policy if exists "messages: пишет участник от своего имени" on public.messages;
create policy "messages: пишет участник от своего имени" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and public.is_chat_member(chat_id, auth.uid())
    and not public.is_blocked_in_chat(chat_id, auth.uid())
  );

notify pgrst, 'reload schema';

-- Диагностика: обе строки должны быть ok = true
select 'таблица friends' as проверка, exists(select 1 from information_schema.tables
  where table_schema='public' and table_name='friends') as ok
union all
select 'таблица blocks', exists(select 1 from information_schema.tables
  where table_schema='public' and table_name='blocks');
