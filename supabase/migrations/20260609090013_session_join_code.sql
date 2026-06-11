-- ============================================================
-- Código de sala para unirse a la sesión en vivo (QR + código).
-- El facilitador muestra el código/QR en la pantalla compartida;
-- los integrantes (con su cuenta) escanean o tipean y entran.
-- La lectura por código respeta el RLS de sessions (solo equipos visibles).
-- ============================================================

alter table public.sessions
  add column if not exists join_code text;

create index if not exists sessions_join_code_idx on public.sessions (join_code) where join_code is not null;
