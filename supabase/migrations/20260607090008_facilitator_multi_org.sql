-- ============================================================
-- Facilitadores multi-organización.
-- Un facilitador puede pertenecer a VARIAS organizaciones y crear
-- equipos en cualquiera de ellas. Antes tenía una sola (profiles.org_id).
--
-- Tabla puente facilitator_orgs(email, org_id) con las membresías extra.
-- La visibilidad RLS del facilitador pasa a usar my_orgs() = unión de:
--   - profiles.org_id (su org "home")
--   - facilitators.org_id (directorio)
--   - facilitator_orgs (membresías explícitas)
--   - org de los equipos que facilita (auto-curativo: nunca pierde acceso
--     a una org donde tiene equipos)
-- Solo cambian las RAMAS de facilitador en visible_org_ids / visible_team_ids;
-- el resto del RLS sigue intacto porque todo pasa por esas dos funciones.
-- ============================================================

-- ── Tabla puente ──
create table if not exists public.facilitator_orgs (
  email   text not null,
  org_id  text not null references public.organizations(id) on delete cascade,
  primary key (email, org_id)
);

alter table public.facilitator_orgs enable row level security;
drop policy if exists fo_read  on public.facilitator_orgs;
drop policy if exists fo_write on public.facilitator_orgs;
create policy fo_read on public.facilitator_orgs for select using (
  public.my_role() = 'superadmin'
  or email = public.my_email()
  or org_id in (select public.visible_org_ids())
);
create policy fo_write on public.facilitator_orgs for all
  using (public.my_role() in ('admin','superadmin')
         and (public.my_role() = 'superadmin' or org_id in (select public.visible_org_ids())))
  with check (public.my_role() in ('admin','superadmin')
         and (public.my_role() = 'superadmin' or org_id in (select public.visible_org_ids())));

-- ── Conjunto de organizaciones del usuario (multi-org) ──
create or replace function public.my_orgs() returns setof text
  language sql stable security definer set search_path = public as $$
  select org_id from public.profiles where id = auth.uid() and org_id is not null
  union
  select f.org_id from public.facilitators f
    where f.org_id is not null and lower(f.email) = lower(public.my_email())
  union
  select fo.org_id from public.facilitator_orgs fo
    where lower(fo.email) = lower(public.my_email())
  union
  select t.org_id from public.teams t
    where t.facilitator_id in (
      select id from public.facilitators where lower(email) = lower(public.my_email())
    );
$$;

grant execute on function public.my_orgs() to anon, authenticated;

-- ── visible_org_ids: la rama "else" (facilitator/coordinator/member) usa my_orgs ──
create or replace function public.visible_org_ids() returns setof text
  language plpgsql stable security definer set search_path = public as $$
begin
  if public.my_role() = 'superadmin' then
    return query select id from public.organizations;
  elsif public.my_role() = 'admin' then
    return query select id from public.organizations where owner_email = public.my_email();
  else
    return query select * from public.my_orgs();
  end if;
end; $$;

-- ── visible_team_ids: la rama facilitator/coordinator usa my_orgs ──
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
    return query select id from public.teams where org_id in (select public.my_orgs());
  end if;
end; $$;
