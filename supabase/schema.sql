-- ============================================================
-- Growthloop — Esquema de base de datos (Supabase / PostgreSQL)
-- ------------------------------------------------------------
-- Refleja el modelo de datos de `src/lib/data.ts`. Cuando quieras
-- conectar Supabase, ejecutá este script en el SQL Editor del
-- proyecto y después cargá los datos de ejemplo (o los reales).
-- Las columnas usan los mismos nombres que los tipos de TypeScript
-- para que el mapeo sea directo.
-- ============================================================

-- Organizaciones (clientes)
create table if not exists organizations (
  id           text primary key,
  name         text not null,
  sector       text,
  leader       text,
  leader_role  text,
  contract     text,
  since        text,
  status       text default 'Activo',          -- 'Activo' | 'Piloto'
  created_at   timestamptz default now()
);

-- Facilitadores / líderes
create table if not exists facilitators (
  id             text primary key,
  name           text not null,
  email          text unique not null,
  initials       text,
  teams          int default 0,
  sessions_month int default 0,
  health         int,                            -- null si está invitado
  status         text default 'active',          -- 'active' | 'invited' | 'inactive'
  is_you         boolean default false,
  created_at     timestamptz default now()
);

-- Equipos
create table if not exists teams (
  id             text primary key,
  org_id         text references organizations(id) on delete cascade,
  name           text not null,
  area           text,
  purpose        text,
  client_type    text default 'Interno',
  facilitator_id text references facilitators(id),
  psych_safety   int default 0,
  stage          text default 'queue',
  active_var     text,
  days_left      int default 0,
  blocked        boolean default false,
  created_at     timestamptz default now()
);

-- Integrantes de cada equipo
create table if not exists team_members (
  id       uuid primary key default gen_random_uuid(),
  team_id  text references teams(id) on delete cascade,
  name     text not null,
  initials text
);

-- Variables (las cosas a mejorar) — recorren el ciclo por etapas
create table if not exists variables (
  id        text primary key,
  team_id   text references teams(id) on delete cascade,
  name      text not null,
  stage     text default 'queue',
  sessions  int default 0,
  last_seen text,
  trend     text default 'flat',                 -- 'up' | 'down' | 'flat'
  state     text default 'developing',           -- 'critical' | 'developing' | 'acceptable'
  source    text,
  descr     text,
  has_exp   boolean default false
);

-- Experimentos (la prueba) sobre una variable
create table if not exists experiments (
  id            uuid primary key default gen_random_uuid(),
  team_id       text references teams(id) on delete cascade,
  variable_id   text references variables(id) on delete cascade,
  apuesta_if    text,
  apuesta_then  text,
  signal_name   text,
  baseline      int,
  current_value int,
  target        int,
  unit          text default '%',
  day_of        int default 0,
  day_total     int default 15,
  status        text default 'on-track',
  due_date      text
);

-- Registro del pulso del equipo a lo largo de las sesiones
create table if not exists pulse_points (
  id         uuid primary key default gen_random_uuid(),
  team_id    text references teams(id) on delete cascade,
  label      text,
  date       text,
  confianza  int,
  comunic    int,
  claridad   int,
  foco       int,
  seguridad  int
);

-- Bitácora de sesiones realizadas
create table if not exists session_logs (
  id        text primary key,
  team_id   text references teams(id) on delete cascade,
  date      text,
  stage     text,
  retro     text,
  pulse     int,
  delta     int,
  out_text  text
);

-- ── Índices útiles ──
create index if not exists idx_teams_org      on teams(org_id);
create index if not exists idx_variables_team on variables(team_id);
create index if not exists idx_pulse_team     on pulse_points(team_id);
create index if not exists idx_sessions_team  on session_logs(team_id);

-- ── Notas sobre RLS (Row Level Security) ──
-- Cuando conectes auth real, activá RLS y agregá políticas por
-- organización/facilitador. Ejemplo de arranque:
--   alter table teams enable row level security;
--   create policy "facilitadores ven sus equipos" on teams
--     for select using (facilitator_id = auth.uid()::text);
