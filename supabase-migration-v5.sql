-- ===========================================================
-- МИГРАЦИЯ v5: каналы, админ мессенджера, объявления
-- Запускать можно многократно. Вставьте целиком в SQL Editor → Run.
-- ===========================================================

-- Каналы
alter table public.chats add column if not exists is_channel boolean not null default false;

-- Флаг админа мессенджера
alter table public.profiles add column if not exists is_app_admin boolean not null default false;
update public.profiles set is_app_admin = true where lower(login) = 'whysosad';

-- Защита: пользователи не могут выдать флаг себе сами (поле недоступно для изменения через API)
revoke update on table public.profiles from authenticated;
grant update (login, tag, avatar, bio, banner, frame, banner_color, last_seen)
  on public.profiles to authenticated;

create or replace function public.is_app_admin(u uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select is_app_admin from profiles where id = u), false);
$$;

-- Глобальные настройки: главный канал и объявление
create table if not exists public.app_settings (
  id int primary key default 1,
  main_channel uuid references public.chats(id),
  announcement text,
  announcement_at timestamptz
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;
alter table public.app_settings enable row level security;
drop policy if exists "settings: читают все" on public.app_settings;
create policy "settings: читают все" on public.app_settings
  for select to authenticated using (true);
drop policy if exists "settings: меняет админ" on public.app_settings;
create policy "settings: меняет админ" on public.app_settings
  for update to authenticated
  using (public.is_app_admin(auth.uid())) with check (public.is_app_admin(auth.uid()));

-- Каналы видны всем (для поиска и подписки)
drop policy if exists "chats: видят участники" on public.chats;
create policy "chats: видят участники" on public.chats
  for select to authenticated using (
    is_channel = true or u1 = auth.uid() or u2 = auth.uid() or public.is_chat_member(id, auth.uid())
  );

-- На канал можно подписаться самостоятельно
drop policy if exists "members: добавляют участники" on public.chat_members;
create policy "members: добавляют участники" on public.chat_members
  for insert to authenticated with check (
    public.is_chat_member(chat_id, auth.uid())
    or (user_id = auth.uid() and exists(select 1 from public.chats c where c.id = chat_id and c.is_channel))
  );

-- В каналах публикуют только владелец и админы канала
create or replace function public.can_post(c uuid, u uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select case when coalesce((select is_channel from chats where id = c), false)
    then exists(select 1 from chats ch where ch.id = c and ch.owner = u)
      or exists(select 1 from chat_members m where m.chat_id = c and m.user_id = u and m.role = 'admin')
    else true end;
$$;

drop policy if exists "messages: пишет участник от своего имени" on public.messages;
create policy "messages: пишет участник от своего имени" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and public.is_chat_member(chat_id, auth.uid())
    and not public.is_blocked_in_chat(chat_id, auth.uid())
    and public.can_post(chat_id, auth.uid())
  );

-- Живые обновления настроек (объявления приходят мгновенно)
do $$ begin
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'app_settings') then
    alter publication supabase_realtime add table public.app_settings;
  end if;
end $$;

notify pgrst, 'reload schema';

-- Диагностика
select 'админ WhySoSad назначен' as проверка,
  exists(select 1 from public.profiles where lower(login) = 'whysosad' and is_app_admin) as ok
union all
select 'таблица app_settings',
  exists(select 1 from information_schema.tables where table_schema='public' and table_name='app_settings')
union all
select 'колонка is_channel',
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='chats' and column_name='is_channel');
