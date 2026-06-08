-- ============================================================
-- Presencia de participantes en la sesión (heartbeat).
-- Antes "X de N en la sala" contaba fantasmas: quien entraba y se iba
-- quedaba para siempre (joinSession solo hacía upsert, sin "leave").
-- Ahora cada cliente actualiza last_seen cada pocos segundos y el front
-- cuenta solo a los activos (vistos hace < ~25s).
-- ============================================================

alter table public.session_participants
  add column if not exists last_seen timestamptz not null default now();
