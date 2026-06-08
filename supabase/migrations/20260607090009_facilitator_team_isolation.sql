-- ============================================================
-- Aislamiento estricto de equipos por facilitador.
--
-- Antes: un facilitador veía TODOS los equipos de sus organizaciones
-- (rama facilitador/coordinator compartida en visible_team_ids).
-- Con multi-org, eso permitía que un facilitador agregado a una org
-- leyera por API los equipos de OTROS facilitadores de esa org.
--
-- Ahora el facilitador solo ve los equipos que él facilita
-- (teams.facilitator_id = su fila en facilitators, por email).
-- El coordinador (observador) sigue viendo todos los equipos de su org.
-- Todo el resto del RLS (initiatives, sessions, etc.) hereda esto porque
-- pasa por visible_team_ids.
--
-- Nota: la ESCRITURA/creación de equipos usa visible_org_ids (no _team_ids),
-- así que el facilitador sigue pudiendo crear equipos en cualquiera de sus orgs.
-- ============================================================

create or replace function public.visible_team_ids() returns setof text
  language plpgsql stable security definer set search_path = public as $$
begin
  if public.my_role() = 'superadmin' then
    return query select id from public.teams;
  elsif public.my_role() = 'admin' then
    return query select id from public.teams where org_id in (select public.visible_org_ids());
  elsif public.my_role() = 'member' then
    return query select public.my_team() where public.my_team() is not null;
  elsif public.my_role() = 'facilitator' then
    return query select id from public.teams
      where facilitator_id in (
        select id from public.facilitators where lower(email) = lower(public.my_email())
      );
  else  -- coordinator (observador): ve todos los equipos de su organización
    return query select id from public.teams where org_id in (select public.my_orgs());
  end if;
end; $$;
