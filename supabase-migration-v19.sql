-- ===========================================================
-- МИГРАЦИЯ v19: удаление аккаунта, социальный маркет, отложенные сообщения
-- Повторозапускаемая. Вставьте целиком в SQL Editor → Run.
-- ===========================================================

-- === Удаление своего аккаунта ===
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Не авторизован'; end if;
  delete from messages where sender_id = uid;
  delete from chats where (u1 = uid or u2 = uid) and is_group = false;
  delete from chat_members where user_id = uid;
  delete from friends where user_id = uid or friend_id = uid;
  delete from blocks where user_id = uid or blocked_id = uid;
  delete from themes where author = uid;
  delete from profiles where id = uid;
  delete from auth.users where id = uid;
end $$;
grant execute on function public.delete_my_account() to authenticated;

-- === Социальный маркет: лайки, подписки на авторов ===
create table if not exists public.theme_likes (
  theme_id uuid references public.themes(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (theme_id, user_id)
);
alter table public.theme_likes enable row level security;
drop policy if exists "likes: читают все" on public.theme_likes;
create policy "likes: читают все" on public.theme_likes for select to authenticated using (true);
drop policy if exists "likes: свои" on public.theme_likes;
create policy "likes: свои" on public.theme_likes
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.author_subs (
  author uuid references public.profiles(id) on delete cascade,
  follower uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (author, follower)
);
alter table public.author_subs enable row level security;
drop policy if exists "subs: читают все" on public.author_subs;
create policy "subs: читают все" on public.author_subs for select to authenticated using (true);
drop policy if exists "subs: свои" on public.author_subs;
create policy "subs: свои" on public.author_subs
  for all to authenticated using (follower = auth.uid()) with check (follower = auth.uid());

alter table public.themes add column if not exists likes int not null default 0;
alter table public.themes add column if not exists created_week timestamptz;

create or replace function public.toggle_theme_like(tid uuid)
returns int language plpgsql security definer set search_path = public as $$
declare cnt int;
begin
  if exists(select 1 from theme_likes where theme_id = tid and user_id = auth.uid()) then
    delete from theme_likes where theme_id = tid and user_id = auth.uid();
  else
    insert into theme_likes (theme_id, user_id) values (tid, auth.uid());
  end if;
  select count(*) into cnt from theme_likes where theme_id = tid;
  update themes set likes = cnt where id = tid;
  return cnt;
end $$;
grant execute on function public.toggle_theme_like(uuid) to authenticated;

-- === Отложенная отправка ===
alter table public.messages add column if not exists scheduled_at timestamptz;

create or replace function public.release_scheduled()
returns void language sql security definer set search_path = public as $$
  update messages set scheduled_at = null
  where scheduled_at is not null and scheduled_at <= now();
$$;
grant execute on function public.release_scheduled() to authenticated;

-- Завершённый онбординг (чтобы не показывать снова)
alter table public.profiles add column if not exists onboarded boolean not null default false;
revoke update on table public.profiles from authenticated;
grant update (login, tag, avatar, bio, banner, frame, banner_color, banner_img,
  status_emoji, profile_bg, name_color, hide_online, hide_read, auto_reply, push_id, onboarded, last_seen)
  on public.profiles to authenticated;

notify pgrst, 'reload schema';

select 'функция delete_my_account' as проверка, exists(select 1 from pg_proc where proname='delete_my_account') as ok
union all
select 'таблица theme_likes', exists(select 1 from information_schema.tables where table_name='theme_likes')
union all
select 'таблица author_subs', exists(select 1 from information_schema.tables where table_name='author_subs');
