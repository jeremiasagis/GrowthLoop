-- ============================================================
-- Objetivos del equipo (varios por equipo).
-- Equipo → Objetivos → Iniciativas (cada una recorre el ciclo).
-- Las iniciativas pueden quedar "sueltas" (objective_id null) y
-- asociarse después. Estados del objetivo: active | achieved | archived.
-- ============================================================

create table if not exists public.objectives (
  id         text primary key,
  team_id    text not null references public.teams(id) on delete cascade,
  text       text not null,
  metric     text,
  target     text,
  horizon    text,
  status     text not null default 'active',  -- active | achieved | archived
  created_at timestamptz not null default now()
);
create index if not exists idx_objectives_team on public.objectives(team_id);

alter table public.objectives enable row level security;
drop policy if exists obj_read  on public.objectives;
drop policy if exists obj_write on public.objectives;
create policy obj_read on public.objectives for select
  using (team_id in (select public.visible_team_ids()));
create policy obj_write on public.objectives for all
  using (team_id in (select public.visible_team_ids()) and public.my_role() in ('facilitator','admin','superadmin'))
  with check (team_id in (select public.visible_team_ids()) and public.my_role() in ('facilitator','admin','superadmin'));

alter table public.initiatives
  add column if not exists objective_id text references public.objectives(id) on delete set null;
create index if not exists idx_initiatives_objective on public.initiatives(objective_id);
