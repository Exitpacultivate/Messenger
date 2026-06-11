-- ===========================================================
-- МИГРАЦИЯ v7: эмодзи-статус
-- Запускать можно многократно. Вставьте целиком в SQL Editor → Run.
-- ===========================================================

alter table public.profiles add column if not exists status_emoji text;

revoke update on table public.profiles from authenticated;
grant update (login, tag, avatar, bio, banner, frame, banner_color, banner_img, status_emoji, last_seen)
  on public.profiles to authenticated;

notify pgrst, 'reload schema';

select 'status_emoji у profiles' as проверка, exists(select 1 from information_schema.columns
  where table_schema='public' and table_name='profiles' and column_name='status_emoji') as ok;
