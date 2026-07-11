-- ============================================================
-- Fundaciones del equipo (reposición · capa "Fundaciones").
-- Fotos CONGELADAS e históricas de lo estructural del equipo:
-- contrato (Sesión Fundacional), FODA y clima. Cada fila es un
-- snapshot con fecha; hacer un FODA nuevo agrega otra fila y se
-- puede comparar con el anterior. Separado de la biblioteca (que
-- es la memoria de los loops).
-- ============================================================

create table if not exists public.team_foundations (
  id uuid primary key default gen_random_uuid(),
  team_id text not null references public.teams(id) on delete cascade,
  kind text not null,                      -- 'contract' | 'foda' | 'clima'
  title text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  created_by uuid
);
create index if not exists idx_foundations_team on public.team_foundations(team_id, kind, created_at desc);

alter table public.team_foundations enable row level security;
drop policy if exists foundations_read on public.team_foundations;
drop policy if exists foundations_write on public.team_foundations;

-- Leer: cualquiera del equipo (miembro read-only incluido).
create policy foundations_read on public.team_foundations for select
  using (team_id in (select public.visible_team_ids()));

-- Escribir/borrar: facilitador/admin del equipo.
create policy foundations_write on public.team_foundations for all
  using (team_id in (select public.visible_team_ids()) and public.my_role() in ('facilitator','admin','superadmin'))
  with check (team_id in (select public.visible_team_ids()) and public.my_role() in ('facilitator','admin','superadmin'));
