-- ===========================================================
-- МИГРАЦИЯ v13: расширение маркета тем (платформа, теги, описание, медиа)
-- Повторозапускаемая. Вставьте целиком в SQL Editor → Run.
-- ===========================================================

alter table public.themes add column if not exists platform text not null default 'both'; -- 'pc' | 'mobile' | 'both'
alter table public.themes add column if not exists description text default '';
alter table public.themes add column if not exists tags text[] default '{}';
alter table public.themes add column if not exists media jsonb not null default '[]'::jsonb; -- [{type:'image'|'video', url}]

notify pgrst, 'reload schema';

select 'platform' as проверка, exists(select 1 from information_schema.columns
  where table_name='themes' and column_name='platform') as ok
union all
select 'media', exists(select 1 from information_schema.columns
  where table_name='themes' and column_name='media');
