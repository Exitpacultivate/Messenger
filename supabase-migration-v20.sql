-- ===========================================================
-- МИГРАЦИЯ v20: предупреждения с историей и автобаном, медиа в жалобах
-- Повторозапускаемая. Вставьте целиком в SQL Editor → Run.
-- ===========================================================

-- История предупреждений (отдельная таблица — нужны даты для правила "3 за месяц")
create table if not exists public.warnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  actor uuid references public.profiles(id) on delete set null,
  actor_login text,
  text text,
  seen boolean not null default false,
  created_at timestamptz default now()
);
alter table public.warnings enable row level security;

-- Пользователь видит свои предупреждения; персонал — любые
drop policy if exists "warnings: видит свои или персонал" on public.warnings;
create policy "warnings: видит свои или персонал" on public.warnings
  for select to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()));

-- Пользователь может пометить своё предупреждение прочитанным
drop policy if exists "warnings: отмечает прочтение" on public.warnings;
create policy "warnings: отмечает прочтение" on public.warnings
  for update to authenticated using (user_id = auth.uid());

-- Выдача предупреждения: записывает в историю и применяет автобан (3 за 30 дней → бан на месяц)
create or replace function public.staff_warn(uid uuid, msg text)
returns text language plpgsql security definer set search_path = public as $$
declare cnt int; r jsonb;
begin
  if not public.is_staff(auth.uid()) then raise exception 'Только для персонала'; end if;
  if not public.is_app_admin(auth.uid()) and exists(select 1 from profiles where id = uid and (is_app_admin or is_moderator)) then
    raise exception 'Модератор не может предупреждать персонал';
  end if;

  insert into warnings (user_id, actor, actor_login, text)
  select uid, auth.uid(), (select login from profiles where id = auth.uid()), msg;

  update profiles set warnings = warnings + 1 where id = uid;

  insert into mod_log (actor, actor_login, action, target_user, target_login, details)
  select auth.uid(), (select login from profiles where id = auth.uid()), 'warn', uid,
    (select login from profiles where id = uid), msg;

  -- автобан: 3+ предупреждения за последние 30 дней
  select count(*) into cnt from warnings where user_id = uid and created_at > now() - interval '30 days';
  if cnt >= 3 then
    select restrictions into r from profiles where id = uid;
    r := coalesce(r, '{}'::jsonb) || jsonb_build_object('banned', true, 'ban_until', (now() + interval '30 days')::text);
    update profiles set restrictions = r where id = uid;
    insert into mod_log (actor, actor_login, action, target_user, target_login, details)
    select auth.uid(), 'СИСТЕМА', 'autoban', uid, (select login from profiles where id = uid), '3 предупреждения за 30 дней';
    return 'banned';
  end if;
  return 'ok';
end $$;
grant execute on function public.staff_warn(uuid, text) to authenticated;

-- Жалоба сохраняет ссылку на медиа (чтобы персонал мог посмотреть фото/видео)
alter table public.reports add column if not exists media_url text;
alter table public.reports add column if not exists media_type text;

-- Снятие истёкшего бана при входе (вызывается клиентом)
create or replace function public.check_my_ban()
returns boolean language plpgsql security definer set search_path = public as $$
declare r jsonb; until timestamptz;
begin
  select restrictions into r from profiles where id = auth.uid();
  if r ? 'ban_until' then
    until := (r->>'ban_until')::timestamptz;
    if until < now() then
      r := r - 'banned' - 'ban_until';
      update profiles set restrictions = r where id = auth.uid();
      return false; -- бан снят
    end if;
    return true; -- ещё забанен
  end if;
  return coalesce((r->>'banned')::boolean, false);
end $$;
grant execute on function public.check_my_ban() to authenticated;

notify pgrst, 'reload schema';

select 'таблица warnings' as проверка, exists(select 1 from information_schema.tables where table_name='warnings') as ok
union all
select 'media_url у reports', exists(select 1 from information_schema.columns where table_name='reports' and column_name='media_url');
