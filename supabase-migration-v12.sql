-- ===========================================================
-- МИГРАЦИЯ v12: единый чат обратной связи + торговая площадка тем
-- Повторозапускаемая. Вставьте целиком в SQL Editor → Run.
-- ===========================================================

-- Единый служебный чат обратной связи (одна "комната"), создаётся один раз
insert into public.chats (u1, is_feedback, is_group, title)
select id, true, false, 'Обратная связь'
from public.profiles where is_app_admin
  and not exists (select 1 from public.chats where is_feedback)
limit 1;

-- Видимость сообщений обратной связи: автор видит свои, админ видит все
drop policy if exists "messages: читают участники чата" on public.messages;
create policy "messages: читают участники чата" on public.messages
  for select to authenticated using (
    case when (select is_feedback from chats where id = chat_id)
      then sender_id = auth.uid() or public.is_app_admin(auth.uid())
      else public.is_chat_member(chat_id, auth.uid())
    end
  );

-- Писать в обратную связь может любой авторизованный (не забанен)
drop policy if exists "messages: пишет участник от своего имени" on public.messages;
create policy "messages: пишет участник от своего имени" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and not public.is_restricted(auth.uid(), 'banned')
    and not public.is_restricted(auth.uid(), 'no_messages')
    and (type = 'text' or not public.is_restricted(auth.uid(), 'no_media'))
    and (
      (select is_feedback from chats where id = chat_id) = true
      or (
        public.is_chat_member(chat_id, auth.uid())
        and not public.is_blocked_in_chat(chat_id, auth.uid())
        and public.can_post(chat_id, auth.uid())
      )
    )
  );

-- Чат обратной связи виден всем (чтобы открываться из меню), но не личным членством
drop policy if exists "chats: видят участники" on public.chats;
create policy "chats: видят участники" on public.chats
  for select to authenticated using (
    is_channel = true or is_feedback = true
    or u1 = auth.uid() or u2 = auth.uid() or public.is_chat_member(id, auth.uid())
  );

-- === Торговая площадка тем ===
create table if not exists public.themes (
  id uuid primary key default gen_random_uuid(),
  author uuid references public.profiles(id) on delete cascade,
  author_login text,
  title text not null,
  data jsonb not null,
  downloads int not null default 0,
  created_at timestamptz default now()
);
alter table public.themes enable row level security;
drop policy if exists "themes: читают все" on public.themes;
create policy "themes: читают все" on public.themes for select to authenticated using (true);
drop policy if exists "themes: публикует автор" on public.themes;
create policy "themes: публикует автор" on public.themes
  for insert to authenticated with check (author = auth.uid() and not public.is_restricted(auth.uid(), 'banned'));
drop policy if exists "themes: удаляет автор или админ" on public.themes;
create policy "themes: удаляет автор или админ" on public.themes
  for delete to authenticated using (author = auth.uid() or public.is_app_admin(auth.uid()));

create or replace function public.theme_downloaded(tid uuid)
returns void language sql security definer set search_path = public as $$
  update themes set downloads = downloads + 1 where id = tid;
$$;
grant execute on function public.theme_downloaded(uuid) to authenticated;

notify pgrst, 'reload schema';

select 'чат обратной связи' as проверка,
  exists(select 1 from chats where is_feedback) as ok
union all
select 'таблица themes', exists(select 1 from information_schema.tables
  where table_schema='public' and table_name='themes');
