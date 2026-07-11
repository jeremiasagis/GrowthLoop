-- ============================================================
-- Almacén de retros (WS7). Estado global (activa/archivada) de cada
-- retro del catálogo, gestionado por el superadmin. Las retros viven
-- en código (registry.ts) y nunca se pierden; acá solo se marca cuál
-- se ofrece en el producto. Sin fila = activa (default).
-- ============================================================

create table if not exists public.platform_retro_status (
  retro_id text primary key,
  active boolean not null default true,
  updated_at timestamptz default now()
);

alter table public.platform_retro_status enable row level security;
drop policy if exists retro_status_read on public.platform_retro_status;
drop policy if exists retro_status_write on public.platform_retro_status;

-- Leer: cualquier usuario autenticado (el producto filtra por esto).
create policy retro_status_read on public.platform_retro_status for select
  using (auth.uid() is not null);

-- Escribir: solo superadmin.
create policy retro_status_write on public.platform_retro_status for all
  using (public.my_role() = 'superadmin')
  with check (public.my_role() = 'superadmin');
