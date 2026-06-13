-- ════════════════════════════════════════════════════════════
-- 0019 · Unirse a la sala por código (estilo Kahoot)
-- El código de la sala suma a quien lo usa como integrante del equipo
-- de esa sesión y devuelve el id de la sesión para entrar. Bypassa RLS
-- (security definer): por eso alguien que aún no es del equipo puede
-- entrar con el código. No toca su equipo principal (profiles.team_id).
-- ════════════════════════════════════════════════════════════

create or replace function public.join_session_by_code(p_code text)
returns text language plpgsql security definer set search_path = public as $$
declare s record; uid uuid := auth.uid(); pname text; pemail text;
begin
  if uid is null then raise exception 'Necesitás iniciar sesión'; end if;
  select id, team_id into s from public.sessions
    where join_code = upper(trim(p_code)) and status = 'live'
    order by created_at desc limit 1;
  if not found then return null; end if;

  select email into pemail from auth.users where id = uid;
  select name into pname from public.profiles where id = uid;
  pname := coalesce(nullif(pname, ''), split_part(coalesce(pemail, ''), '@', 1), 'Invitado');

  -- vincular la ficha de integrante (por user; o una vieja por email/nombre sin user)
  update public.team_members set user_id = uid, email = coalesce(email, lower(pemail))
    where team_id = s.team_id and (user_id = uid or lower(coalesce(email, '')) = lower(coalesce(pemail, '')));
  if not found then
    insert into public.team_members (team_id, user_id, email, name, initials)
      values (s.team_id, uid, lower(pemail), pname, upper(left(pname, 2)));
  end if;

  return s.id;
end; $$;
grant execute on function public.join_session_by_code(text) to authenticated;
