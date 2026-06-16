-- ===========================================================
-- МИГРАЦИЯ v16: редактирование сообщений, пересылка, мультизакреп
-- Повторозапускаемая. Вставьте целиком в SQL Editor → Run.
-- ===========================================================

-- Метка изменения и данные пересылки
alter table public.messages add column if not exists edited_at timestamptz;
alter table public.messages add column if not exists forwarded jsonb;  -- { name, from_chat }

-- Несколько закреплённых сообщений: массив id вместо одного
alter table public.chats add column if not exists pinned_msgs uuid[] default '{}';

-- Автор может редактировать свой текст (политика обновления уже разрешает участникам;
-- добавим явную проверку, что редактируется своё текстовое сообщение — на стороне клиента,
-- политика update на messages уже существует от реакций)

notify pgrst, 'reload schema';

select 'edited_at' as проверка, exists(select 1 from information_schema.columns
  where table_name='messages' and column_name='edited_at') as ok
union all
select 'forwarded', exists(select 1 from information_schema.columns
  where table_name='messages' and column_name='forwarded')
union all
select 'pinned_msgs', exists(select 1 from information_schema.columns
  where table_name='chats' and column_name='pinned_msgs');
