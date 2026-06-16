-- ===========================================================
-- МИГРАЦИЯ v15: жалобы, восстановление доступа, push-подписки
-- Повторозапускаемая. Вставьте целиком в SQL Editor → Run.
-- ===========================================================

-- === Жалобы на сообщения и пользователей ===
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid references public.profiles(id) on delete cascade,
  reporter_login text,
  target_msg uuid,
  target_user uuid references public.profiles(id) on delete set null,
  chat_id uuid,
  text_snapshot text,
  reason text,
  status text not null default 'open',  -- open | done
  created_at timestamptz default now()
);
alter table public.reports enable row level security;

drop policy if exists "reports: создаёт любой" on public.reports;
create policy "reports: создаёт любой" on public.reports
  for insert to authenticated with check (reporter = auth.uid());

drop policy if exists "reports: читает админ" on public.reports;
create policy "reports: читает админ" on public.reports
  for select to authenticated using (public.is_app_admin(auth.uid()));

drop policy if exists "reports: меняет админ" on public.reports;
create policy "reports: меняет админ" on public.reports
  for update to authenticated using (public.is_app_admin(auth.uid()));

-- === Восстановление доступа: резервный код ===
-- Храним только хэш кода, не сам код
alter table public.profiles add column if not exists recovery_hash text;

-- Сброс пароля по резервному коду (без входа в аккаунт)
create or replace function public.reset_by_code(p_tag text, p_code text, p_new_pass text)
returns text language plpgsql security definer set search_path = public, extensions, auth as $$
declare uid uuid; h text;
begin
  select id, recovery_hash into uid, h from profiles where lower(tag) = lower(p_tag);
  if uid is null then return 'no_user'; end if;
  if h is null then return 'no_code'; end if;
  if h <> encode(digest(p_code, 'sha256'), 'hex') then return 'bad_code'; end if;
  if length(p_new_pass) < 6 then return 'weak'; end if;
  update auth.users set encrypted_password = crypt(p_new_pass, gen_salt('bf')) where id = uid;
  update profiles set recovery_hash = null where id = uid;  -- код одноразовый
  return 'ok';
end $$;
grant execute on function public.reset_by_code(text, text, text) to anon, authenticated;

-- Сохранение хэша резервного кода (только для себя)
create or replace function public.set_recovery(p_code text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  update profiles set recovery_hash = encode(digest(p_code, 'sha256'), 'hex') where id = auth.uid();
end $$;
grant execute on function public.set_recovery(text) to authenticated;

-- === Push-подписки (для внешнего сервиса) ===
alter table public.profiles add column if not exists push_id text;
revoke update on table public.profiles from authenticated;
grant update (login, tag, avatar, bio, banner, frame, banner_color, banner_img,
  status_emoji, profile_bg, name_color, hide_online, hide_read, auto_reply, push_id, last_seen)
  on public.profiles to authenticated;

-- pgcrypto для digest/crypt
create extension if not exists pgcrypto;

notify pgrst, 'reload schema';

select 'таблица reports' as проверка, exists(select 1 from information_schema.tables
  where table_name='reports') as ok
union all
select 'recovery_hash', exists(select 1 from information_schema.columns
  where table_name='profiles' and column_name='recovery_hash')
union all
select 'функция reset_by_code', exists(select 1 from pg_proc where proname='reset_by_code');
