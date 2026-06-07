-- ============================================================
-- Growthloop — Resultado vivo de la sesión
-- ------------------------------------------------------------
-- Campo libre para guardar lo que produce cada paso en vivo
-- (causa raíz en Foco, la apuesta en Prueba, etc.), sincronizado
-- por Realtime entre facilitador y miembros. RLS ya cubre `sessions`.
-- ============================================================
alter table public.sessions add column if not exists result jsonb not null default '{}'::jsonb;
