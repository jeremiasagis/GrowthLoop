-- ============================================================
-- Growthloop — RLS (Row Level Security)
-- ------------------------------------------------------------
-- Aísla los datos por organización/equipo según el rol, sin
-- cambiar el comportamiento de la app para cada usuario legítimo.
--
-- NO destruye datos. Reversible: `alter table X disable row level security;`
--
-- `invitations` queda SIN RLS a propósito (el link de invitación se
-- lee sin estar logueado). Se endurece luego con un RPC por token.
--
-- Antes de probar, verificá que tu superadmin tenga el rol bien:
--   select id,email,role from public.profiles where email='jeremiasagis@gmail.com';
--   -- si no dice 'superadmin':  update public.profiles set role='superadmin' where email='jeremiasagis@gmail.com';
-- ============================================================

-- ── Funciones de membresía (SECURITY DEFINER: leen profiles sin recursión) ──
create or replace function public.my_role() returns text
  language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;
create or replace function public.my_email() returns text
  language sql stable security definer set search_path = public as $$
  select auth.jwt() ->> 'email';
$$;
create or replace function public.my_org() returns text
  language sql stable security definer set search_path = public as $$
  select org_id from public.profiles where id = auth.uid();
$$;
create or replace function public.my_team() returns text
  language sql stable security definer set search_path = public as $$
  select team_id from public.profiles where id = auth.uid();
$$;

create or replace function public.visible_org_ids() returns setof text
  language plpgsql stable security definer set search_path = public as $$
begin
  if public.my_role() = 'superadmin' then
    return query select id from public.organizations;
  elsif public.my_role() = 'admin' then
    return query select id from public.organizations where owner_email = public.my_email();
  else
    return query select public.my_org() where public.my_org() is not null;
  end if;
end; $$;

create or replace function public.visible_team_ids() returns setof text
  language plpgsql stable security definer set search_path = public as $$
begin
  if public.my_role() = 'superadmin' then
    return query select id from public.teams;
  elsif public.my_role() = 'admin' then
    return query select id from public.teams where org_id in (select public.visible_org_ids());
  elsif public.my_role() = 'member' then
    return query select public.my_team() where public.my_team() is not null;
  else  -- facilitator, coordinator
    return query select id from public.teams where org_id = public.my_org();
  end if;
end; $$;

create or replace function public.visible_session_ids() returns setof uuid
  language sql stable security definer set search_path = public as $$
  select id from public.sessions where team_id in (select public.visible_team_ids());
$$;

grant execute on function
  public.my_role(), public.my_email(), public.my_org(), public.my_team(),
  public.visible_org_ids(), public.visible_team_ids(), public.visible_session_ids()
  to anon, authenticated;

-- ── PROFILES ──
alter table public.profiles enable row level security;
drop policy if exists profiles_read on public.profiles;
drop policy if exists profiles_write on public.profiles;
create policy profiles_read  on public.profiles for select using (id = auth.uid() or public.my_role() = 'superadmin');
create policy profiles_write on public.profiles for all
  using (id = auth.uid() or public.my_role() = 'superadmin')
  with check (id = auth.uid() or public.my_role() = 'superadmin');

-- ── ORGANIZATIONS ──
alter table public.organizations enable row level security;
drop policy if exists org_read on public.organizations;
drop policy if exists org_write on public.organizations;
create policy org_read  on public.organizations for select using (id in (select public.visible_org_ids()));
create policy org_write on public.organizations for all
  using (public.my_role() in ('admin','superadmin') and (public.my_role() = 'superadmin' or owner_email = public.my_email()))
  with check (public.my_role() in ('admin','superadmin') and (public.my_role() = 'superadmin' or owner_email = public.my_email()));

-- ── ADMINS (solo superadmin; cada admin puede tocar su propia fila) ──
alter table public.admins enable row level security;
drop policy if exists admins_read on public.admins;
drop policy if exists admins_write on public.admins;
create policy admins_read  on public.admins for select using (public.my_role() = 'superadmin' or email = public.my_email());
create policy admins_write on public.admins for all
  using (public.my_role() = 'superadmin' or email = public.my_email())
  with check (public.my_role() = 'superadmin' or email = public.my_email());

-- ── FACILITATORS ──
alter table public.facilitators enable row level security;
drop policy if exists fac_read on public.facilitators;
drop policy if exists fac_write on public.facilitators;
create policy fac_read  on public.facilitators for select using (org_id in (select public.visible_org_ids()));
create policy fac_write on public.facilitators for all
  using (org_id in (select public.visible_org_ids()) and public.my_role() in ('admin','superadmin','facilitator'))
  with check (org_id in (select public.visible_org_ids()) and public.my_role() in ('admin','superadmin','facilitator'));

-- ── TEAMS ──
alter table public.teams enable row level security;
drop policy if exists teams_read on public.teams;
drop policy if exists teams_write on public.teams;
create policy teams_read  on public.teams for select using (id in (select public.visible_team_ids()));
create policy teams_write on public.teams for all
  using (org_id in (select public.visible_org_ids()) and public.my_role() in ('facilitator','admin','superadmin'))
  with check (org_id in (select public.visible_org_ids()) and public.my_role() in ('facilitator','admin','superadmin'));

-- ── Tablas hijas del equipo (lectura por equipo; escritura facilitador/admin/super) ──
do $$
declare tbl text;
begin
  foreach tbl in array array['team_members','pulse_points','variables','experiments','initiatives','session_logs'] loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('drop policy if exists %I_read on public.%I', tbl, tbl);
    execute format('drop policy if exists %I_write on public.%I', tbl, tbl);
    execute format($f$create policy %I_read on public.%I for select using (team_id in (select public.visible_team_ids()))$f$, tbl, tbl);
    execute format($f$create policy %I_write on public.%I for all
      using (team_id in (select public.visible_team_ids()) and public.my_role() in ('facilitator','admin','superadmin'))
      with check (team_id in (select public.visible_team_ids()) and public.my_role() in ('facilitator','admin','superadmin'))$f$, tbl, tbl);
  end loop;
end $$;

-- ── SESSIONS (sesión en vivo) ──
alter table public.sessions enable row level security;
drop policy if exists sessions_read on public.sessions;
drop policy if exists sessions_write on public.sessions;
create policy sessions_read  on public.sessions for select using (team_id in (select public.visible_team_ids()));
create policy sessions_write on public.sessions for all
  using (team_id in (select public.visible_team_ids()) and public.my_role() in ('facilitator','admin','superadmin'))
  with check (team_id in (select public.visible_team_ids()) and public.my_role() in ('facilitator','admin','superadmin'));

-- ── PARTICIPANTES (cada uno gestiona su propia presencia) ──
alter table public.session_participants enable row level security;
drop policy if exists sparts_read on public.session_participants;
drop policy if exists sparts_write on public.session_participants;
create policy sparts_read  on public.session_participants for select using (session_id in (select public.visible_session_ids()));
create policy sparts_write on public.session_participants for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and session_id in (select public.visible_session_ids()));

-- ── RESPUESTAS DE PULSO (cada uno la suya; lectura dentro de la sesión) ──
alter table public.session_pulse_responses enable row level security;
drop policy if exists spulse_read on public.session_pulse_responses;
drop policy if exists spulse_write on public.session_pulse_responses;
create policy spulse_read  on public.session_pulse_responses for select using (session_id in (select public.visible_session_ids()));
create policy spulse_write on public.session_pulse_responses for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and session_id in (select public.visible_session_ids()));

-- ── VOTOS (cada uno los suyos) ──
alter table public.session_votes enable row level security;
drop policy if exists svotes_read on public.session_votes;
drop policy if exists svotes_write on public.session_votes;
create policy svotes_read  on public.session_votes for select using (session_id in (select public.visible_session_ids()));
create policy svotes_write on public.session_votes for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and session_id in (select public.visible_session_ids()));

-- ── TARJETAS (cada uno escribe las suyas; lectura dentro de la sesión) ──
alter table public.session_cards enable row level security;
drop policy if exists scards_read on public.session_cards;
drop policy if exists scards_write on public.session_cards;
create policy scards_read  on public.session_cards for select using (session_id in (select public.visible_session_ids()));
create policy scards_write on public.session_cards for all
  using (author_id = auth.uid())
  with check (author_id = auth.uid() and session_id in (select public.visible_session_ids()));

-- ── CLUSTERS (los maneja el facilitador) ──
alter table public.session_clusters enable row level security;
drop policy if exists sclusters_read on public.session_clusters;
drop policy if exists sclusters_write on public.session_clusters;
create policy sclusters_read  on public.session_clusters for select using (session_id in (select public.visible_session_ids()));
create policy sclusters_write on public.session_clusters for all
  using (session_id in (select public.visible_session_ids()) and public.my_role() in ('facilitator','admin','superadmin'))
  with check (session_id in (select public.visible_session_ids()) and public.my_role() in ('facilitator','admin','superadmin'));

-- NOTA: `invitations` queda intencionalmente SIN RLS (link público por token).
