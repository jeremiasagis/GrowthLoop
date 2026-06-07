-- ============================================================
-- Growthloop — Retro elegida en la sesión
-- ------------------------------------------------------------
-- Guarda qué retrospectiva del catálogo eligió el facilitador
-- al abrir la sesión (ver src/lib/retros.ts). RLS ya cubre sessions.
-- ============================================================
alter table public.sessions add column if not exists retro text;
