-- ===========================================================
-- МИГРАЦИЯ v18: роль модератора и расширенная модерация
-- Повторозапускаемая. Вставьте целиком в SQL Editor → Run.
-- ===========================================================

-- Роль модератора (как админ, но не может назначать других модераторов)
alter table public.profiles add column if not exists is_moderator boolean not null default false;

-- Действия модерации: предупреждения, заметки, история
alter table public.profiles add column if not exists warnings int not null default 0;
alter table public.profiles add column if not exists mod_note text;

-- Проверка "это админ или модератор"
create or replace function public.is_staff(u uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select is_app_admin or is_moderator from profiles where id = u), false);
$$;

-- Лог действий модерации
create table if not exists public.mod_log (
  id uuid primary key default gen_random_uuid(),
  actor uuid references public.profiles(id),
  actor_login text,
  action text,
  target_user uuid,
  target_login text,
  details text,
  created_at timestamptz default now()
);
alter table public.mod_log enable row level security;
drop policy if exists "modlog: персонал читает" on public.mod_log;
create policy "modlog: персонал читает" on public.mod_log
  for select to authenticated using (public.is_staff(auth.uid()));
drop policy if exists "modlog: персонал пишет" on public.mod_log;
create policy "modlog: персонал пишет" on public.mod_log
  for insert to authenticated with check (public.is_staff(auth.uid()) and actor = auth.uid());

-- Ограничения теперь может ставить и модератор (через функцию)
create or replace function public.staff_set_restrictions(uid uuid, r jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff(auth.uid()) then raise exception 'Только для персонала'; end if;
  -- модератор не может трогать админов и других модераторов
  if not public.is_app_admin(auth.uid()) and exists(select 1 from profiles where id = uid and (is_app_admin or is_moderator)) then
    raise exception 'Модератор не может ограничивать персонал';
  end if;
  update profiles set restrictions = coalesce(r, '{}'::jsonb) where id = uid;
end $$;
grant execute on function public.staff_set_restrictions(uuid, jsonb) to authenticated;

-- Назначение/снятие модератора — ТОЛЬКО админ
create or replace function public.admin_set_moderator(uid uuid, val boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_app_admin(auth.uid()) then raise exception 'Только администратор назначает модераторов'; end if;
  update profiles set is_moderator = val where id = uid;
end $$;
grant execute on function public.admin_set_moderator(uuid, boolean) to authenticated;

-- Предупреждение пользователю
create or replace function public.staff_warn(uid uuid, msg text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff(auth.uid()) then raise exception 'Только для персонала'; end if;
  update profiles set warnings = warnings + 1 where id = uid;
  insert into mod_log (actor, actor_login, action, target_user, target_login, details)
  select auth.uid(), (select login from profiles where id = auth.uid()), 'warn', uid,
    (select login from profiles where id = uid), msg;
end $$;
grant execute on function public.staff_warn(uuid, text) to authenticated;

-- Удаление любого сообщения персоналом
drop policy if exists "messages: персонал удаляет" on public.messages;
create policy "messages: персонал удаляет" on public.messages
  for delete to authenticated using (public.is_staff(auth.uid()));

-- Персонал может удалять любые группы и каналы
drop policy if exists "chats: персонал удаляет" on public.chats;
create policy "chats: персонал удаляет" on public.chats
  for delete to authenticated using (public.is_staff(auth.uid()) or owner = auth.uid()
    or (is_group = false and (u1 = auth.uid() or u2 = auth.uid())));

-- Персонал читает все жалобы (расширяем с админа на персонал)
drop policy if exists "reports: читает админ" on public.reports;
create policy "reports: читает персонал" on public.reports
  for select to authenticated using (public.is_staff(auth.uid()));
drop policy if exists "reports: меняет админ" on public.reports;
create policy "reports: меняет персонал" on public.reports
  for update to authenticated using (public.is_staff(auth.uid()));

-- Персонал видит список чатов и статистику (обновляем admin_list_chats → staff)
create or replace function public.admin_list_chats()
returns json language sql security definer stable set search_path = public as $$
  select case when not public.is_staff(auth.uid()) then null else
    (select coalesce(json_agg(t), '[]') from (
      select c.id, c.title, c.is_channel, p.login as owner_login,
        (select count(*) from chat_members m where m.chat_id = c.id)::int as members
      from chats c left join profiles p on p.id = c.owner
      where c.is_group order by c.title) t)
  end;
$$;


create or replace function public.is_moderator_only(u uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select is_moderator and not is_app_admin from profiles where id = u), false);
$$;

-- Модератор НЕ может удалять группы/каналы, созданные администратором
drop policy if exists "chats: персонал удаляет" on public.chats;
create policy "chats: персонал удаляет" on public.chats
  for delete to authenticated using (
    owner = auth.uid()
    or (is_group = false and (u1 = auth.uid() or u2 = auth.uid()))
    or public.is_app_admin(auth.uid())
    or (public.is_moderator_only(auth.uid())
        and not exists(select 1 from profiles p where p.id = chats.owner and p.is_app_admin))
  );


-- Перепривязать чат обратной связи на текущего админа (WhySoSad)
update public.chats
  set u1 = (select id from profiles where is_app_admin order by created_at limit 1)
  where is_feedback;

notify pgrst, 'reload schema';

select 'is_moderator' as проверка, exists(select 1 from information_schema.columns
  where table_name='profiles' and column_name='is_moderator') as ok
union all
select 'функция is_staff', exists(select 1 from pg_proc where proname='is_staff')
union all
select 'таблица mod_log', exists(select 1 from information_schema.tables where table_name='mod_log');
