-- ===========================================================
-- МИГРАЦИЯ v10: статистика для админа мессенджера
-- Запускать можно многократно. Вставьте целиком в SQL Editor → Run.
-- ===========================================================

create or replace function public.admin_stats()
returns json language sql security definer stable set search_path = public as $$
  select case when not public.is_app_admin(auth.uid()) then null else json_build_object(
    'users', (select count(*) from profiles),
    'messages', (select count(*) from messages),
    'directs', (select count(*) from chats where is_group = false and u1 <> u2),
    'groups', (select count(*) from chats where is_group and not is_channel),
    'channels', (select count(*) from chats where is_channel),
    'new_users', (select coalesce(json_agg(t), '[]') from (
      select to_char(date_trunc('day', created_at at time zone 'Europe/Moscow'), 'DD.MM') as d, count(*)::int as c
      from profiles where created_at > now() - interval '14 days'
      group by date_trunc('day', created_at at time zone 'Europe/Moscow')
      order by date_trunc('day', created_at at time zone 'Europe/Moscow')) t),
    'by_day', (select coalesce(json_agg(t), '[]') from (
      select to_char(date_trunc('day', created_at at time zone 'Europe/Moscow'), 'DD.MM') as d, count(*)::int as c
      from messages where created_at > now() - interval '14 days'
      group by date_trunc('day', created_at at time zone 'Europe/Moscow')
      order by date_trunc('day', created_at at time zone 'Europe/Moscow')) t),
    'by_hour', (select coalesce(json_agg(t), '[]') from (
      select extract(hour from created_at at time zone 'Europe/Moscow')::int as h, count(*)::int as c
      from messages group by 1 order by 1) t),
    'top_users', (select coalesce(json_agg(t), '[]') from (
      select p.id, p.login, p.tag, p.last_seen, count(m.id)::int as c
      from messages m join profiles p on p.id = m.sender_id
      group by p.id, p.login, p.tag, p.last_seen
      order by c desc limit 10) t)
  ) end;
$$;
grant execute on function public.admin_stats() to authenticated;

create or replace function public.admin_user_stats(uid uuid)
returns json language sql security definer stable set search_path = public as $$
  select case when not public.is_app_admin(auth.uid()) then null else json_build_object(
    'total', (select count(*) from messages where sender_id = uid),
    'avg_len', (select coalesce(round(avg(char_length(content)))::int, 0)
      from messages where sender_id = uid and type = 'text'),
    'groups', (select count(*) from chat_members where user_id = uid),
    'by_day', (select coalesce(json_agg(t), '[]') from (
      select to_char(date_trunc('day', created_at at time zone 'Europe/Moscow'), 'DD.MM') as d, count(*)::int as c
      from messages where sender_id = uid and created_at > now() - interval '14 days'
      group by date_trunc('day', created_at at time zone 'Europe/Moscow')
      order by date_trunc('day', created_at at time zone 'Europe/Moscow')) t),
    'by_hour', (select coalesce(json_agg(t), '[]') from (
      select extract(hour from created_at at time zone 'Europe/Moscow')::int as h, count(*)::int as c
      from messages where sender_id = uid group by 1 order by 1) t),
    'types', (select coalesce(json_agg(t), '[]') from (
      select type, count(*)::int as c from messages where sender_id = uid group by 1 order by 2 desc) t)
  ) end;
$$;
grant execute on function public.admin_user_stats(uuid) to authenticated;

notify pgrst, 'reload schema';

select 'функция admin_stats' as проверка,
  exists(select 1 from pg_proc where proname = 'admin_stats') as ok;
