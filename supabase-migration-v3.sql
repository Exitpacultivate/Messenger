-- ===========================================================
-- МИГРАЦИЯ v3: профиль группы, админы и права, свой цвет баннера
-- Запускать можно многократно. Вставьте целиком в SQL Editor → Run.
-- ===========================================================

-- Профиль группы
alter table public.chats add column if not exists avatar text;
alter table public.chats add column if not exists banner int default 7;
alter table public.chats add column if not exists description text default '';

-- Свой цвет баннера у пользователей
alter table public.profiles add column if not exists banner_color text;

-- Роли и права участников
alter table public.chat_members add column if not exists role text not null default 'member';
alter table public.chat_members add column if not exists rights jsonb not null default '{}'::jsonb;

-- Проверка права: владелец группы или админ с конкретным правом
create or replace function public.has_group_right(c uuid, u uuid, r text)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists(select 1 from chats ch where ch.id = c and ch.owner = u)
      or exists(select 1 from chat_members m where m.chat_id = c and m.user_id = u
                and m.role = 'admin' and coalesce(m.rights->>r, 'false') = 'true');
$$;

-- Исключать может сам участник (выход), владелец или админ с правом kick
drop policy if exists "members: выйти самому или удаляет владелец" on public.chat_members;
create policy "members: выйти самому или удаляет владелец" on public.chat_members
  for delete to authenticated using (
    user_id = auth.uid() or public.has_group_right(chat_id, auth.uid(), 'kick')
  );

-- Менять роли может владелец или админ с правом admins
drop policy if exists "members: роли меняет владелец или админ" on public.chat_members;
create policy "members: роли меняет владелец или админ" on public.chat_members
  for update to authenticated using (public.has_group_right(chat_id, auth.uid(), 'admins'));

notify pgrst, 'reload schema';

-- Диагностика
select 'role у chat_members' as проверка, exists(select 1 from information_schema.columns
  where table_schema='public' and table_name='chat_members' and column_name='role') as ok
union all
select 'avatar у chats', exists(select 1 from information_schema.columns
  where table_schema='public' and table_name='chats' and column_name='avatar');
