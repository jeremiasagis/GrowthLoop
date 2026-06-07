-- ============================================================
-- 0007 · teams.data (jsonb) — estado a nivel equipo
-- ------------------------------------------------------------
-- Guarda el contrato de la Sesión Fundacional (y futuro estado
-- de equipo) sin tablas nuevas. Las policies RLS de teams ya
-- cubren esta columna (acceso por fila).
-- ============================================================
alter table public.teams
  add column if not exists data jsonb not null default '{}'::jsonb;
