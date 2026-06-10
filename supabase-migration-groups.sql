-- ===========================================================
-- МИГРАЦИЯ: ГРУППОВЫЕ ЧАТЫ
-- Вставьте весь файл в SQL Editor вашего проекта Supabase и нажмите Run.
-- Выполняется поверх старой схемы, данные не трогает.
-- ===========================================================

-- Чат теперь может быть группой
alter table public.chats add column if not exists is_group boolean not null default false;
alter table public.chats add column if not exists title text;
alter table public.chats add column if not exists owner uuid references public.profiles(id);
alter table public.chats alter column u2 drop not null;

-- Участники групп
create table if not exists public.chat_members (
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (chat_id, user_id)
);

-- Единая проверка «я участник чата» (личного или группового)
create or replace function public.is_chat_member(c uuid, u uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists(select 1 from chats ch where ch.id = c and (ch.u1 = u or ch.u2 = u))
      or exists(select 1 from chat_members m where m.chat_id = c and m.user_id = u);
$$;

alter table public.chat_members enable row level security;
create policy "members: видят участники" on public.chat_members
  for select to authenticated using (public.is_chat_member(chat_id, auth.uid()));
create policy "members: добавляют участники" on public.chat_members
  for insert to authenticated with check (public.is_chat_member(chat_id, auth.uid()));
create policy "members: выйти самому или удаляет владелец" on public.chat_members
  for delete to authenticated using (
    user_id = auth.uid()
    or exists(select 1 from public.chats c where c.id = chat_id and c.owner = auth.uid())
  );

-- Обновляем старые политики на групповое членство
drop policy if exists "chats: видят участники" on public.chats;
create policy "chats: видят участники" on public.chats
  for select to authenticated using (public.is_chat_member(id, auth.uid()));
drop policy if exists "chats: меняют участники" on public.chats;
create policy "chats: меняют участники" on public.chats
  for update to authenticated using (public.is_chat_member(id, auth.uid()));

drop policy if exists "messages: читают участники чата" on public.messages;
create policy "messages: читают участники чата" on public.messages
  for select to authenticated using (public.is_chat_member(chat_id, auth.uid()));
drop policy if exists "messages: пишет участник от своего имени" on public.messages;
create policy "messages: пишет участник от своего имени" on public.messages
  for insert to authenticated with check (sender_id = auth.uid() and public.is_chat_member(chat_id, auth.uid()));
drop policy if exists "messages: участники обновляют (реакции)" on public.messages;
create policy "messages: участники обновляют (реакции)" on public.messages
  for update to authenticated using (public.is_chat_member(chat_id, auth.uid()));

drop policy if exists "reads: видят участники" on public.chat_reads;
create policy "reads: видят участники" on public.chat_reads
  for select to authenticated using (public.is_chat_member(chat_id, auth.uid()));

-- Мгновенные обновления состава групп
alter publication supabase_realtime add table public.chat_members;

-- ===========================================================
-- ХРАНИЛИЩЕ МЕДИА (видео, файлы, голосовые, фото)
-- ===========================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 26214400)
on conflict (id) do nothing;

drop policy if exists "media: загрузка для вошедших" on storage.objects;
create policy "media: загрузка для вошедших" on storage.objects
  for insert to authenticated with check (bucket_id = 'media');

drop policy if exists "media: чтение всем" on storage.objects;
create policy "media: чтение всем" on storage.objects
  for select using (bucket_id = 'media');
