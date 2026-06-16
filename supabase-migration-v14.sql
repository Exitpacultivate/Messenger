-- ===========================================================
-- МИГРАЦИЯ v14: невидимка, скрытое прочтение, автоответчик, исчезающие сообщения
-- Повторозапускаемая. Вставьте целиком в SQL Editor → Run.
-- ===========================================================

-- Настройки приватности и автоответчик
alter table public.profiles add column if not exists hide_online boolean not null default false;
alter table public.profiles add column if not exists hide_read boolean not null default false;
alter table public.profiles add column if not exists auto_reply text;

-- Исчезающие сообщения: срок жизни сообщения (в секундах) и время удаления
alter table public.messages add column if not exists expires_at timestamptz;

-- Разрешаем пользователю менять новые поля профиля
revoke update on table public.profiles from authenticated;
grant update (login, tag, avatar, bio, banner, frame, banner_color, banner_img,
  status_emoji, profile_bg, name_color, hide_online, hide_read, auto_reply, last_seen)
  on public.profiles to authenticated;

-- Функция чистки истёкших сообщений (вызывается клиентом при открытии чата)
create or replace function public.purge_expired()
returns void language sql security definer set search_path = public as $$
  delete from messages where expires_at is not null and expires_at < now();
$$;
grant execute on function public.purge_expired() to authenticated;

notify pgrst, 'reload schema';

select 'hide_online' as проверка, exists(select 1 from information_schema.columns
  where table_name='profiles' and column_name='hide_online') as ok
union all
select 'expires_at', exists(select 1 from information_schema.columns
  where table_name='messages' and column_name='expires_at')
union all
select 'auto_reply', exists(select 1 from information_schema.columns
  where table_name='profiles' and column_name='auto_reply');
