-- ===========================================================
-- МИГРАЦИЯ v6: анимированные баннеры, удаление каналов
-- Запускать можно многократно. Вставьте целиком в SQL Editor → Run.
-- ===========================================================

-- Картинка/GIF как баннер профиля и группы
alter table public.profiles add column if not exists banner_img text;
alter table public.chats add column if not exists banner_img text;

-- Обновляем список разрешённых для изменения полей профиля
revoke update on table public.profiles from authenticated;
grant update (login, tag, avatar, bio, banner, frame, banner_color, banner_img, last_seen)
  on public.profiles to authenticated;

-- Владелец может удалить свою группу или канал (сообщения и участники удалятся каскадом)
drop policy if exists "chats: удаляет владелец" on public.chats;
create policy "chats: удаляет владелец" on public.chats
  for delete to authenticated using (owner = auth.uid());

notify pgrst, 'reload schema';

-- Диагностика
select 'banner_img у profiles' as проверка, exists(select 1 from information_schema.columns
  where table_schema='public' and table_name='profiles' and column_name='banner_img') as ok
union all
select 'banner_img у chats', exists(select 1 from information_schema.columns
  where table_schema='public' and table_name='chats' and column_name='banner_img');
