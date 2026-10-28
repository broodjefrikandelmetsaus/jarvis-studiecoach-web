create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nieuwe studiesessie',
  subject text not null default '',
  mode text not null default 'tutor' check (mode in ('tutor','quiz','cards','exam','summary')),
  material text not null default '',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);
create index if not exists study_sessions_user_last_active_idx
  on public.study_sessions(user_id, last_active_at desc);

create table if not exists public.study_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  kind text not null check (kind in ('quiz','flashcards','practice_exam','summary','highlight')),
  title text not null default '',
  content text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists study_artifacts_user_created_idx
  on public.study_artifacts(user_id, created_at desc);
create index if not exists study_artifacts_session_idx
  on public.study_artifacts(session_id);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  preferred_subjects text[] not null default '{}',
  voice_enabled boolean not null default true,
  theme text not null default 'dark' check (theme in ('dark','light','system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.jarvis_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists study_sessions_touch_updated_at on public.study_sessions;
create trigger study_sessions_touch_updated_at
before update on public.study_sessions
for each row execute function public.jarvis_touch_updated_at();

drop trigger if exists user_preferences_touch_updated_at on public.user_preferences;
create trigger user_preferences_touch_updated_at
before update on public.user_preferences
for each row execute function public.jarvis_touch_updated_at();

alter table public.study_sessions enable row level security;
alter table public.study_artifacts enable row level security;
alter table public.user_preferences enable row level security;

drop policy if exists "Users manage own study sessions" on public.study_sessions;
create policy "Users manage own study sessions" on public.study_sessions
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own study artifacts" on public.study_artifacts;
create policy "Users manage own study artifacts" on public.study_artifacts
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own preferences" on public.user_preferences;
create policy "Users manage own preferences" on public.user_preferences
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.study_sessions to authenticated;
grant select, insert, update, delete on public.study_artifacts to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'study_sessions'
    ) then
      alter publication supabase_realtime add table public.study_sessions;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'study_artifacts'
    ) then
      alter publication supabase_realtime add table public.study_artifacts;
    end if;
  end if;
end $$;
