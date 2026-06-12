-- ===========================================================
-- МИГРАЦИЯ v9 (включает v8 — если v8 не запускали, запускайте только этот файл)
-- Повторозапускаемая. Вставьте целиком в SQL Editor → Run.
-- ===========================================================

-- === из v8: очистка истории и удаление личных чатов ===
drop policy if exists "messages: очистка истории" on public.messages;
create policy "messages: очистка истории" on public.messages
  for delete to authenticated using (
    sender_id = auth.uid()
    or exists(select 1 from public.chats c where c.id = chat_id and c.is_group = false
              and (c.u1 = auth.uid() or c.u2 = auth.uid()))
    or public.has_group_right(chat_id, auth.uid(), 'kick')
  );

drop policy if exists "chats: удаляет владелец" on public.chats;
create policy "chats: удаляет владелец" on public.chats
  for delete to authenticated using (
    owner = auth.uid()
    or (is_group = false and (u1 = auth.uid() or u2 = auth.uid()))
  );

-- === новое v9: пользовательские цвета профиля ===
alter table public.profiles add column if not exists profile_bg text;
alter table public.profiles add column if not exists name_color text;

revoke update on table public.profiles from authenticated;
grant update (login, tag, avatar, bio, banner, frame, banner_color, banner_img,
  status_emoji, profile_bg, name_color, last_seen)
  on public.profiles to authenticated;

notify pgrst, 'reload schema';

-- Диагностика
select 'profile_bg' as проверка, exists(select 1 from information_schema.columns
  where table_schema='public' and table_name='profiles' and column_name='profile_bg') as ok
union all
select 'политика очистки', exists(select 1 from pg_policies
  where tablename='messages' and policyname='messages: очистка истории');
