-- ============================================================
-- Growthloop — Sesiones en vivo (multiplayer)
-- ------------------------------------------------------------
-- El estado de una sesión deja de vivir en el cliente y pasa
-- a la base. Facilitador y miembros leen/escriben acá; Supabase
-- Realtime sincroniza a todos en tiempo real.
--
-- Anonimato (decisión de producto):
--   · Las tarjetas pueden ser ANÓNIMAS o PÚBLICAS (flag por tarjeta).
--   · Anónima  → el autor NUNCA se expone (ni al facilitador).
--   · Pública  → se ve el autor.
--   El enmascarado se hace en la vista `session_cards_view`.
--   El pulso es siempre anónimo (solo se muestran promedios).
-- ============================================================

create extension if not exists pgcrypto;

-- ── Instancia viva de una sesión ──
create table if not exists public.sessions (
  id            uuid primary key default gen_random_uuid(),
  team_id       text not null references public.teams(id) on delete cascade,
  initiative_id text references public.initiatives(id) on delete cascade,
  type          text not null,                 -- explore|focus|proof|follow|learn
  mode          text not null default 'live',  -- live | async
  status        text not null default 'live',  -- live | closed
  step_key      text,                          -- paso actual (lo maneja el facilitador)
  step_index    int  not null default 0,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  closed_at     timestamptz
);

-- ── Presencia / quién está en la sala ──
create table if not exists public.session_participants (
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text,
  initials   text,
  joined_at  timestamptz not null default now(),
  primary key (session_id, user_id)
);

-- ── Respuestas de pulso (siempre anónimas: solo promedios) ──
create table if not exists public.session_pulse_responses (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  confianza  int, comunic int, claridad int, foco int, seguridad int,
  created_at timestamptz not null default now(),
  unique (session_id, user_id)               -- una respuesta por persona
);

-- ── Agrupaciones / tensiones ──
create table if not exists public.session_clusters (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  name       text,
  created_at timestamptz not null default now()
);

-- ── Tarjetas (anónimas o públicas) ──
create table if not exists public.session_cards (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  author_id  uuid references auth.users(id) on delete set null,
  column_key text,                            -- works|blocks|unsaid (según retro)
  text       text not null,
  anonymous  boolean not null default true,
  cluster_id uuid references public.session_clusters(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ── Votos (un punto por fila; cada miembro reparte N puntos) ──
create table if not exists public.session_votes (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  cluster_id uuid not null references public.session_clusters(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ── Vista que enmascara el autor de las tarjetas anónimas ──
-- security_invoker = respeta el RLS del usuario que consulta (PG15+).
create or replace view public.session_cards_view
  with (security_invoker = true) as
select
  id, session_id, column_key, text, anonymous, cluster_id, created_at,
  case when anonymous then null else author_id end as author_id
from public.session_cards;

-- ── Índices ──
create index if not exists idx_sessions_team        on public.sessions(team_id);
create index if not exists idx_sessions_init        on public.sessions(initiative_id);
create index if not exists idx_sessions_status      on public.sessions(team_id, status);
create index if not exists idx_scards_session       on public.session_cards(session_id);
create index if not exists idx_spulse_session       on public.session_pulse_responses(session_id);
create index if not exists idx_sclusters_session    on public.session_clusters(session_id);
create index if not exists idx_svotes_session       on public.session_votes(session_id);
create index if not exists idx_sparticipants_session on public.session_participants(session_id);

-- ── Habilitar Realtime en estas tablas (idempotente) ──
do $$
declare t text;
begin
  foreach t in array array[
    'sessions','session_participants','session_pulse_responses',
    'session_clusters','session_cards','session_votes'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
