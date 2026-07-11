-- ============================================================
-- Agencia del miembro (bloque "miembro copado").
-- 1) Banco de ideas social: las ideas planteadas se comparten con
--    todo el equipo y se pueden votar (+1).
-- 2) Muro de reconocimiento (kudos) persistente entre pares.
-- 3) El miembro propone sus propios focos de desarrollo.
-- ============================================================

-- ── 1) BANCO DE IDEAS SOCIAL ────────────────────────────────
-- Abrir lectura: además del autor y el facilitador, cualquier
-- integrante del equipo ve las IDEAS (no los problemas/preguntas,
-- que siguen siendo privados para cuidar la honestidad).
drop policy if exists team_inputs_read on public.team_inputs;
create policy team_inputs_read on public.team_inputs for select
  using (
    author_user_id = auth.uid()
    or (team_id in (select public.visible_team_ids()) and public.my_role() in ('facilitator','admin','superadmin'))
    or (kind = 'idea' and team_id in (select public.visible_team_ids()))
  );

-- Votos "+1" sobre una idea. team_id embebido para RLS auto-contenida.
create table if not exists public.team_input_votes (
  input_id uuid not null references public.team_inputs(id) on delete cascade,
  team_id text not null references public.teams(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  created_at timestamptz default now(),
  primary key (input_id, user_id)
);
create index if not exists idx_input_votes_input on public.team_input_votes(input_id);

alter table public.team_input_votes enable row level security;
drop policy if exists input_votes_read on public.team_input_votes;
drop policy if exists input_votes_insert on public.team_input_votes;
drop policy if exists input_votes_delete on public.team_input_votes;

create policy input_votes_read on public.team_input_votes for select
  using (team_id in (select public.visible_team_ids()));
create policy input_votes_insert on public.team_input_votes for insert
  with check (user_id = auth.uid() and team_id in (select public.visible_team_ids()));
create policy input_votes_delete on public.team_input_votes for delete
  using (user_id = auth.uid());

-- ── 2) MURO DE KUDOS ────────────────────────────────────────
create table if not exists public.kudos (
  id uuid primary key default gen_random_uuid(),
  team_id text not null references public.teams(id) on delete cascade,
  from_user_id uuid not null default auth.uid(),
  to_user_id uuid not null,
  text text not null,
  emoji text,
  created_at timestamptz default now()
);
create index if not exists idx_kudos_team on public.kudos(team_id, created_at desc);
create index if not exists idx_kudos_to on public.kudos(to_user_id);

alter table public.kudos enable row level security;
drop policy if exists kudos_read on public.kudos;
drop policy if exists kudos_insert on public.kudos;
drop policy if exists kudos_delete on public.kudos;

-- Leer: cualquier integrante del equipo ve el muro de su equipo.
create policy kudos_read on public.kudos for select
  using (team_id in (select public.visible_team_ids()));
-- Dar: uno reconoce en nombre propio, a alguien de su equipo (no a sí mismo).
create policy kudos_insert on public.kudos for insert
  with check (from_user_id = auth.uid() and to_user_id <> auth.uid() and team_id in (select public.visible_team_ids()));
-- Borrar: solo lo propio (retractarse).
create policy kudos_delete on public.kudos for delete
  using (from_user_id = auth.uid());

-- ── 3) EL MIEMBRO PROPONE SUS PROPIOS FOCOS ─────────────────
-- Insert acotado: un integrante crea un foco INDIVIDUAL asignado a
-- sí mismo (agencia sobre su desarrollo). La gestión de todo lo
-- demás sigue siendo del facilitador (policy challenges_write).
drop policy if exists challenges_self_focus on public.team_challenges;
create policy challenges_self_focus on public.team_challenges for insert
  with check (
    team_id in (select public.visible_team_ids())
    and scope = 'individual'
    and assignee_user_id = auth.uid()
    and created_by = auth.uid()
  );

notify pgrst, 'reload schema';
