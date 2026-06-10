-- ===========================================================
-- СХЕМА БАЗЫ МЕССЕНДЖЕРА ДЛЯ SUPABASE
-- Вставьте весь этот файл в SQL Editor и нажмите Run.
-- ===========================================================

-- Профили пользователей
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  login text not null,
  tag text not null,
  avatar text,
  bio text default '',
  banner int default 0,
  frame text default 'none',
  last_seen timestamptz default now(),
  created_at timestamptz default now()
);
create unique index profiles_tag_unique on public.profiles (lower(tag));

alter table public.profiles enable row level security;
create policy "profiles: читают все вошедшие" on public.profiles
  for select to authenticated using (true);
create policy "profiles: создаёт владелец" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "profiles: меняет владелец" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- Диалоги (1 на 1)
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  u1 uuid not null references public.profiles(id) on delete cascade,
  u2 uuid not null references public.profiles(id) on delete cascade,
  pinned_msg uuid,
  created_at timestamptz default now(),
  unique (u1, u2)
);
alter table public.chats enable row level security;
create policy "chats: видят участники" on public.chats
  for select to authenticated using (auth.uid() = u1 or auth.uid() = u2);
create policy "chats: создаёт участник" on public.chats
  for insert to authenticated with check (auth.uid() = u1 or auth.uid() = u2);
create policy "chats: меняют участники" on public.chats
  for update to authenticated using (auth.uid() = u1 or auth.uid() = u2);

-- Сообщения
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'text',
  content text not null,
  file_name text,
  file_size bigint,
  duration int,
  waveform jsonb,
  reply_to jsonb,
  reactions jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index messages_chat_idx on public.messages (chat_id, created_at desc);

alter table public.messages enable row level security;
create policy "messages: читают участники чата" on public.messages
  for select to authenticated using (
    exists (select 1 from public.chats c where c.id = chat_id and (c.u1 = auth.uid() or c.u2 = auth.uid()))
  );
create policy "messages: пишет участник от своего имени" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and exists (select 1 from public.chats c where c.id = chat_id and (c.u1 = auth.uid() or c.u2 = auth.uid()))
  );
create policy "messages: участники обновляют (реакции)" on public.messages
  for update to authenticated using (
    exists (select 1 from public.chats c where c.id = chat_id and (c.u1 = auth.uid() or c.u2 = auth.uid()))
  );
create policy "messages: удаляет автор" on public.messages
  for delete to authenticated using (sender_id = auth.uid());

-- Отметки о прочтении
create table public.chat_reads (
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz default now(),
  primary key (chat_id, user_id)
);
alter table public.chat_reads enable row level security;
create policy "reads: видят участники" on public.chat_reads
  for select to authenticated using (
    exists (select 1 from public.chats c where c.id = chat_id and (c.u1 = auth.uid() or c.u2 = auth.uid()))
  );
create policy "reads: создаёт владелец" on public.chat_reads
  for insert to authenticated with check (user_id = auth.uid());
create policy "reads: меняет владелец" on public.chat_reads
  for update to authenticated using (user_id = auth.uid());

-- Мгновенная доставка (realtime)
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.chats;
alter publication supabase_realtime add table public.chat_reads;
