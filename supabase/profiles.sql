-- ============================================================
-- Growthloop — Etapa B: tabla de perfiles + rol por usuario
-- ------------------------------------------------------------
-- Corré esto UNA vez en el SQL Editor. Crea la tabla `profiles`
-- (1:1 con auth.users), las políticas de seguridad, y un trigger
-- que crea el profile automáticamente cuando se registra un
-- usuario, leyendo el rol del metadata del signup.
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  initials text,
  role text not null default 'member',   -- superadmin | admin | facilitator | member
  org_id text,
  org_name text,
  team_id text,
  can_switch_role boolean default false,  -- cuenta de prueba multi-rol
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Cada usuario ve / edita / crea SU propio profile
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Trigger: al registrarse un usuario, crea su profile con el rol del metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, initials, role, org_id, org_name, team_id, can_switch_role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'initials', upper(left(new.email, 2))),
    coalesce(new.raw_user_meta_data->>'role', 'member'),
    new.raw_user_meta_data->>'org_id',
    new.raw_user_meta_data->>'org_name',
    new.raw_user_meta_data->>'team_id',
    coalesce((new.raw_user_meta_data->>'can_switch_role')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
