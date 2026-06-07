-- ============================================================
-- Growthloop — Baseline schema (reconstruido desde el código)
-- ------------------------------------------------------------
-- Captura el schema actual TAL COMO LO ESPERA EL CÓDIGO
-- (store.ts / repository.ts). Es idempotente: en tu proyecto
-- existente, los `create table if not exists` son no-op para
-- las tablas que ya tenés (no corrige drift, pero no rompe nada).
-- Su valor: reproducibilidad (entornos nuevos) + documentación.
-- ⚠️ Verificá `profiles` contra el que ya tengas (auth).
-- RLS se activa en una migración aparte (0003).
-- ============================================================

create extension if not exists pgcrypto;

-- ── Organizaciones ──
create table if not exists public.organizations (
  id           text primary key,
  name         text not null,
  sector       text,
  leader       text,
  leader_role  text,
  contract     text,
  since        text,
  status       text default 'Activo',
  owner_id     text,
  owner_email  text,
  created_at   timestamptz not null default now()
);

-- ── Admins (gestionados por el superadmin) ──
create table if not exists public.admins (
  id           text primary key,
  name         text,
  email        text,
  initials     text,
  org_name     text,
  org_id       text,
  orgs         int default 0,
  facilitators int default 0,
  status       text default 'invited',
  is_you       boolean default false,
  created_at   timestamptz not null default now()
);

-- ── Facilitadores ──
create table if not exists public.facilitators (
  id             text primary key,
  name           text,
  email          text,
  initials       text,
  teams          int default 0,
  sessions_month int default 0,
  health         int,
  status         text default 'invited',
  is_you         boolean default false,
  org_id         text,
  created_at     timestamptz not null default now()
);

-- ── Equipos ──
create table if not exists public.teams (
  id             text primary key,
  org_id         text references public.organizations(id) on delete cascade,
  name           text not null,
  area           text,
  purpose        text,
  client_type    text default 'Interno',
  facilitator_id text,
  psych_safety   int default 0,
  stage          text default 'queue',
  active_var     text,
  days_left      int default 0,
  blocked        boolean default false,
  created_at     timestamptz not null default now()
);

-- ── Integrantes del equipo ──
create table if not exists public.team_members (
  id         uuid primary key default gen_random_uuid(),
  team_id    text references public.teams(id) on delete cascade,
  user_id    uuid,            -- se vincula al loguearse el miembro
  name       text,
  initials   text,
  created_at timestamptz not null default now()
);

-- ── Pulso (5 dimensiones, por punto en el tiempo) ──
create table if not exists public.pulse_points (
  id         uuid primary key default gen_random_uuid(),
  team_id    text references public.teams(id) on delete cascade,
  label      text,
  date       text,
  confianza  int,
  comunic    int,
  claridad   int,
  foco       int,
  seguridad  int,
  created_at timestamptz not null default now()
);

-- ── Variables (modelo VIEJO — a deprecar en favor de initiatives) ──
create table if not exists public.variables (
  id        text primary key,
  team_id   text references public.teams(id) on delete cascade,
  name      text,
  stage     text,
  sessions  int default 0,
  last_seen text,
  trend     text,
  state     text,
  source    text,
  descr     text,
  has_exp   boolean default false
);

-- ── Experimentos (modelo VIEJO — a deprecar) ──
create table if not exists public.experiments (
  id            uuid primary key default gen_random_uuid(),
  team_id       text references public.teams(id) on delete cascade,
  variable_id   text,
  apuesta_if    text,
  apuesta_then  text,
  signal_name   text,
  due_date      text,
  baseline      numeric,
  current_value numeric,
  target        numeric,
  unit          text,
  day_of        int,
  day_total     int,
  status        text
);

-- ── Iniciativas (líneas de trabajo — modelo NUEVO) ──
create table if not exists public.initiatives (
  id          text primary key,
  team_id     text references public.teams(id) on delete cascade,
  title       text not null,
  description text,
  stage       text not null default 'explore',
  status      text not null default 'active',  -- active | paused | done
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ── Log de sesiones realizadas (resumen) ──
create table if not exists public.session_logs (
  id            text primary key,
  team_id       text references public.teams(id) on delete cascade,
  initiative_id text references public.initiatives(id) on delete cascade,
  date          text,
  stage         text,
  retro         text,
  out_text      text,
  pulse         int default 0,
  delta         int default 0,
  created_at    timestamptz not null default now()
);

-- ── Invitaciones (copy-link) ──
create table if not exists public.invitations (
  token      text primary key,
  email      text,
  name       text,
  role       text,
  org_id     text,
  org_name   text,
  team_id    text,
  status     text default 'pending',
  created_at timestamptz not null default now()
);

-- ── Perfiles (auth → rol/alcance). ⚠️ Verificá contra el tuyo. ──
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  name       text,
  role       text default 'member',  -- superadmin|admin|facilitator|coordinator|member
  org_id     text,
  team_id    text,
  created_at timestamptz not null default now()
);

-- Trigger que crea el profile al registrarse un usuario (si no lo tenés ya).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Índices útiles ──
create index if not exists idx_teams_org           on public.teams(org_id);
create index if not exists idx_facilitators_org    on public.facilitators(org_id);
create index if not exists idx_team_members_team   on public.team_members(team_id);
create index if not exists idx_pulse_points_team   on public.pulse_points(team_id);
create index if not exists idx_variables_team      on public.variables(team_id);
create index if not exists idx_experiments_team    on public.experiments(team_id);
create index if not exists idx_initiatives_team    on public.initiatives(team_id);
create index if not exists idx_session_logs_team   on public.session_logs(team_id);
create index if not exists idx_session_logs_init   on public.session_logs(initiative_id);
create index if not exists idx_invitations_role_org on public.invitations(role, org_id);
