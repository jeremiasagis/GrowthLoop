-- ============================================================
-- Desarrollo individual (WS8). Deja que el ASIGNADO marque el
-- avance de SU foco de desarrollo (un desafío individual) sin
-- darle escritura general sobre team_challenges. Mismo patrón que
-- set_my_commitment_status.
-- ============================================================

create or replace function public.set_my_focus_status(p_challenge_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.team_challenges
    set status = p_status
    where id = p_challenge_id
      and assignee_user_id = auth.uid()
      and scope = 'individual'
      and p_status in ('open','doing','done');
end $$;

grant execute on function public.set_my_focus_status(uuid, text) to authenticated;
