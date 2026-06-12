-- ════════════════════════════════════════════════════════════
-- 0017 · Visibilidad del miembro auto-curativa
-- Un miembro ve su equipo si profiles.team_id lo dice O si figura
-- en team_members con su user_id (igual criterio auto-curativo que
-- usamos para facilitadores). Evita "La sesión no existe" cuando
-- profiles.team_id quedó desactualizado o nulo.
-- ════════════════════════════════════════════════════════════

create or replace function public.visible_team_ids() returns setof text
  language plpgsql stable security definer set search_path = public as $$
begin
  if public.my_role() = 'superadmin' then
    return query select id from public.teams;
  elsif public.my_role() = 'admin' then
    return query select id from public.teams where org_id in (select public.visible_org_ids());
  elsif public.my_role() = 'member' then
    return query
      select public.my_team() where public.my_team() is not null
      union
      select tm.team_id from public.team_members tm
        where tm.user_id = auth.uid() and tm.team_id is not null;
  else  -- facilitator, coordinator
    return query select id from public.teams where org_id in (select public.my_orgs());
  end if;
end; $$;
