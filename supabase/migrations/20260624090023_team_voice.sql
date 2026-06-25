-- ============================================================
-- La voz del miembro (PLAN-DESARROLLO · agencia del miembro).
-- Planteos asincrónicos al equipo (problema | idea | pregunta) que
-- el miembro levanta sin esperar una sesión, y que el facilitador ve
-- y puede convertir en exploración. RLS: el autor ve/borra lo suyo;
-- el facilitador/admin del equipo ve y gestiona todo (status).
-- ============================================================

create table if not exists public.team_inputs (
  id uuid primary key default gen_random_uuid(),
  team_id text not null references public.teams(id) on delete cascade,
  author_user_id uuid not null,
  kind text not null default 'idea',     -- problema | idea | pregunta
  text text not null,
  status text not null default 'new',    -- new | seen | converted | archived
  created_at timestamptz default now()
);
create index if not exists idx_team_inputs_team on public.team_inputs(team_id);
create index if not exists idx_team_inputs_author on public.team_inputs(author_user_id);

alter table public.team_inputs enable row level security;
drop policy if exists team_inputs_read on public.team_inputs;
drop policy if exists team_inputs_insert on public.team_inputs;
drop policy if exists team_inputs_update on public.team_inputs;
drop policy if exists team_inputs_delete on public.team_inputs;

-- Leer: el autor ve lo suyo; el facilitador/admin del equipo ve todo.
create policy team_inputs_read on public.team_inputs for select
  using (
    author_user_id = auth.uid()
    or (team_id in (select public.visible_team_ids()) and public.my_role() in ('facilitator','admin','superadmin'))
  );

-- Crear: un integrante del equipo crea lo suyo.
create policy team_inputs_insert on public.team_inputs for insert
  with check (team_id in (select public.visible_team_ids()) and author_user_id = auth.uid());

-- Gestionar estado: facilitador/admin del equipo.
create policy team_inputs_update on public.team_inputs for update
  using (team_id in (select public.visible_team_ids()) and public.my_role() in ('facilitator','admin','superadmin'))
  with check (team_id in (select public.visible_team_ids()) and public.my_role() in ('facilitator','admin','superadmin'));

-- Borrar: el autor (retractarse) o el facilitador/admin del equipo.
create policy team_inputs_delete on public.team_inputs for delete
  using (
    author_user_id = auth.uid()
    or (team_id in (select public.visible_team_ids()) and public.my_role() in ('facilitator','admin','superadmin'))
  );
