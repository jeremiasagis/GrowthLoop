-- ════════════════════════════════════════════════════════════
-- 0018 · Incorporación de miembros robusta
-- Problemas que arregla:
--   1) team_members no guardaba email ni user_id → el miembro nunca
--      quedaba vinculado a su ficha (y la visibilidad auto-curativa
--      de la 0017 no tenía de dónde agarrarse).
--   2) accept_invitation no hacía NADA para rol member: todo el
--      vínculo dependía del upsert client-side en el signup. Ahora la
--      RPC, con el usuario autenticado, deja el perfil apuntando al
--      equipo de la invitación y vincula (o crea) su ficha de
--      integrante. Sirve también para RE-vincular cuentas existentes
--      (re-invitación, cambio de equipo).
-- ════════════════════════════════════════════════════════════

alter table public.team_members add column if not exists email text;

create or replace function public.accept_invitation(p_token text)
returns void language plpgsql security definer set search_path = public as $$
declare inv record; uid uuid := auth.uid(); pname text;
begin
  select * into inv from public.invitations
    where token = p_token and status = 'pending' and expires_at > now();
  if not found then
    raise exception 'Invitación inválida o vencida';
  end if;
  update public.invitations set status = 'accepted' where token = p_token;

  if inv.role = 'facilitator' then
    update public.facilitators set status = 'active' where lower(email) = lower(inv.email);
  elsif inv.role = 'admin' then
    update public.admins set status = 'active' where lower(email) = lower(inv.email);
  elsif inv.role = 'member' and uid is not null then
    -- nombre: el del profile si ya existe; si no, el de la invitación
    select name into pname from public.profiles where id = uid;
    pname := coalesce(nullif(pname, ''), inv.name, split_part(inv.email, '@', 1));

    -- perfil apuntando al org/equipo de la invitación (re-vincula cuentas existentes)
    insert into public.profiles (id, email, name, initials, role, org_id, org_name, team_id)
      values (uid, lower(inv.email), pname, upper(left(pname, 2)), 'member', inv.org_id, inv.org_name, inv.team_id)
      on conflict (id) do update
        set role = 'member', org_id = excluded.org_id, org_name = excluded.org_name, team_id = excluded.team_id;

    -- vincular la ficha de integrante (por user, email o nombre de la invitación)
    update public.team_members set user_id = uid, email = lower(inv.email)
      where team_id = inv.team_id and (
        user_id = uid
        or lower(coalesce(email, '')) = lower(inv.email)
        or (user_id is null and email is null and name = inv.name)
      );
    if not found then
      insert into public.team_members (team_id, user_id, email, name, initials)
        values (inv.team_id, uid, lower(inv.email), pname, upper(left(pname, 2)));
    end if;
  end if;
end; $$;
grant execute on function public.accept_invitation(text) to anon, authenticated;
