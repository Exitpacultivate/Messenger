-- ===========================================================
-- МИГРАЦИЯ v11: обратная связь, ограничения и личная статистика
-- Запускать можно многократно. Вставьте целиком в SQL Editor → Run.
-- ===========================================================

-- Чат обратной связи (скрытый личный чат с админом)
alter table public.chats add column if not exists is_feedback boolean not null default false;
alter table public.chats drop constraint if exists chats_u1_u2_key;
create unique index if not exists chats_direct_unique on public.chats (u1, u2)
  where is_group = false and is_feedback = false;

-- Ограничения пользователей (меняются только через админ-функцию)
alter table public.profiles add column if not exists restrictions jsonb not null default '{}'::jsonb;

create or replace function public.is_restricted(u uuid, r text)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select (restrictions->>r)::boolean from profiles where id = u), false);
$$;

-- Отправка сообщений с учётом ограничений (бан, запрет сообщений, запрет медиа)
drop policy if exists "messages: пишет участник от своего имени" on public.messages;
create policy "messages: пишет участник от своего имени" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and public.is_chat_member(chat_id, auth.uid())
    and not public.is_blocked_in_chat(chat_id, auth.uid())
    and public.can_post(chat_id, auth.uid())
    and not public.is_restricted(auth.uid(), 'banned')
    and not public.is_restricted(auth.uid(), 'no_messages')
    and (type = 'text' or not public.is_restricted(auth.uid(), 'no_media'))
  );

-- Создание чатов: бан и запрет создания групп/каналов
drop policy if exists "chats: создаёт участник" on public.chats;
create policy "chats: создаёт участник" on public.chats
  for insert to authenticated with check (
    (u1 = auth.uid() or u2 = auth.uid())
    and not public.is_restricted(auth.uid(), 'banned')
    and (is_group = false or not public.is_restricted(auth.uid(), 'no_create'))
  );

-- Админ-функции
create or replace function public.admin_set_restrictions(uid uuid, r jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_app_admin(auth.uid()) then raise exception 'Только для администратора'; end if;
  update profiles set restrictions = coalesce(r, '{}'::jsonb) where id = uid;
end $$;
grant execute on function public.admin_set_restrictions(uuid, jsonb) to authenticated;

create or replace function public.admin_delete_chat(cid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_app_admin(auth.uid()) then raise exception 'Только для администратора'; end if;
  delete from chats where id = cid and is_group;
end $$;
grant execute on function public.admin_delete_chat(uuid) to authenticated;

create or replace function public.admin_list_chats()
returns json language sql security definer stable set search_path = public as $$
  select case when not public.is_app_admin(auth.uid()) then null else
    (select coalesce(json_agg(t), '[]') from (
      select c.id, c.title, c.is_channel, p.login as owner_login,
        (select count(*) from chat_members m where m.chat_id = c.id)::int as members
      from chats c left join profiles p on p.id = c.owner
      where c.is_group order by c.title) t)
  end;
$$;
grant execute on function public.admin_list_chats() to authenticated;

-- Личная статистика для любого пользователя
create or replace function public.my_stats()
returns json language sql security definer stable set search_path = public as $$
  select json_build_object(
    'total', (select count(*) from messages where sender_id = auth.uid()),
    'avg_len', (select coalesce(round(avg(char_length(content)))::int, 0)
      from messages where sender_id = auth.uid() and type = 'text'),
    'groups', (select count(*) from chat_members where user_id = auth.uid()),
    'by_day', (select coalesce(json_agg(t), '[]') from (
      select to_char(date_trunc('day', created_at at time zone 'Europe/Moscow'), 'DD.MM') as d, count(*)::int as c
      from messages where sender_id = auth.uid() and created_at > now() - interval '14 days'
      group by date_trunc('day', created_at at time zone 'Europe/Moscow')
      order by date_trunc('day', created_at at time zone 'Europe/Moscow')) t),
    'by_hour', (select coalesce(json_agg(t), '[]') from (
      select extract(hour from created_at at time zone 'Europe/Moscow')::int as h, count(*)::int as c
      from messages where sender_id = auth.uid() group by 1 order by 1) t),
    'types', (select coalesce(json_agg(t), '[]') from (
      select type, count(*)::int as c from messages where sender_id = auth.uid() group by 1 order by 2 desc) t)
  );
$$;
grant execute on function public.my_stats() to authenticated;

notify pgrst, 'reload schema';

select 'is_feedback' as проверка, exists(select 1 from information_schema.columns
  where table_name='chats' and column_name='is_feedback') as ok
union all
select 'restrictions', exists(select 1 from information_schema.columns
  where table_name='profiles' and column_name='restrictions')
union all
select 'my_stats', exists(select 1 from pg_proc where proname='my_stats');
