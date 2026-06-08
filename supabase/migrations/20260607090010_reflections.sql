-- ============================================================
-- Reflexiones privadas del miembro (notas personales).
-- Cada usuario ve y escribe SOLO las suyas (RLS por user_id).
-- ============================================================

create table if not exists public.reflections (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  team_id    text,
  prompt     text not null default 'Reflexión libre',
  text       text not null,
  created_at timestamptz not null default now()
);

create index if not exists reflections_user_idx on public.reflections (user_id, created_at desc);

alter table public.reflections enable row level security;
drop policy if exists reflections_rw on public.reflections;
create policy reflections_rw on public.reflections for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
