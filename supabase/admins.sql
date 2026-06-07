-- ============================================================
-- Growthloop — Tabla de admins (gestionados por el superadmin)
-- ------------------------------------------------------------
-- Es una tabla de "directorio" de admins (como facilitators).
-- La cuenta real del admin se crea cuando acepta la invitación.
-- Corré esto en el SQL Editor para que "Crear admin" persista.
-- ============================================================

create table if not exists public.admins (
  id           text primary key,
  name         text not null,
  email        text,
  initials     text,
  org_name     text,
  orgs         int default 0,
  facilitators int default 0,
  status       text default 'active',   -- 'active' | 'invited'
  is_you       boolean default false,
  created_at   timestamptz default now()
);
