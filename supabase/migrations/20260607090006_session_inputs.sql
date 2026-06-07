-- ============================================================
-- Growthloop — Aportes de miembros en la sesión (genérico)
-- ------------------------------------------------------------
-- Tabla member-writable para inputs ricos por miembro: confirmaciones,
-- ICE scores, evaluación impacto/frecuencia, semáforo de honestidad,
-- reflexiones privadas, etc. Una fila por (sesión, miembro, key).
-- `private` = solo lo ve su autor (reflexiones privadas).
-- ============================================================
create extension if not exists pgcrypto;

create table if not exists public.session_inputs (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  key        text not null,
  value      jsonb not null default '{}'::jsonb,
  private    boolean not null default false,
  created_at timestamptz not null default now(),
  unique (session_id, user_id, key)
);

alter table public.session_inputs enable row level security;
drop policy if exists sinputs_read on public.session_inputs;
drop policy if exists sinputs_write on public.session_inputs;
create policy sinputs_read on public.session_inputs for select
  using (session_id in (select public.visible_session_ids()) and (private = false or user_id = auth.uid()));
create policy sinputs_write on public.session_inputs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and session_id in (select public.visible_session_ids()));

create index if not exists idx_sinputs_session on public.session_inputs(session_id);

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='session_inputs') then
    execute 'alter publication supabase_realtime add table public.session_inputs';
  end if;
end $$;
