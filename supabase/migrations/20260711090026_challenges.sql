-- ============================================================
-- Hub de Desafíos (reposición · la espina dorsal).
-- Backlog vivo de desafíos del equipo, individuales y colectivos,
-- alimentado por lo fundacional + señales + alta manual. Los
-- colectivos se convierten en loop; los individuales se asignan a
-- una persona (desarrollo 1-a-1, WS8).
-- ============================================================

create table if not exists public.team_challenges (
  id uuid primary key default gen_random_uuid(),
  team_id text not null references public.teams(id) on delete cascade,
  title text not null,
  detail text,
  scope text not null default 'collective',    -- individual | collective
  domain text,                                  -- comunicacion|cliente|eficiencia|clima|otro
  source text not null default 'manual',        -- fundacional|clima|plantear|360|retro|manual
  source_ref text,
  status text not null default 'open',          -- open | routed | done | archived
  loop_id text references public.initiatives(id) on delete set null,
  assignee_user_id uuid,
  created_at timestamptz default now(),
  created_by uuid
);
create index if not exists idx_challenges_team on public.team_challenges(team_id, status);

alter table public.team_challenges enable row level security;
drop policy if exists challenges_read on public.team_challenges;
drop policy if exists challenges_write on public.team_challenges;

-- Leer: facilitador/admin ve todo; el miembro ve los colectivos y los individuales suyos.
create policy challenges_read on public.team_challenges for select
  using (
    team_id in (select public.visible_team_ids())
    and (
      public.my_role() in ('facilitator','admin','superadmin')
      or scope = 'collective'
      or assignee_user_id = auth.uid()
    )
  );

-- Gestionar: facilitador/admin del equipo.
create policy challenges_write on public.team_challenges for all
  using (team_id in (select public.visible_team_ids()) and public.my_role() in ('facilitator','admin','superadmin'))
  with check (team_id in (select public.visible_team_ids()) and public.my_role() in ('facilitator','admin','superadmin'));
