-- ============================================================
-- Endurecimiento de seguridad (Tanda 1)
--
-- A) `invitations` tenía RLS deshabilitada a propósito (link público):
--    con el anon key cualquiera podía listar TODOS los emails/tokens.
--    Ahora: RLS para staff + el invitado accede SOLO por RPC con su token
--    exacto. Se agrega vencimiento (14 días) y aceptación por RPC
--    (que además activa la ficha de facilitador/admin, antes bloqueada
--    por RLS al aceptar).
--
-- B) Anonimato real: votos, inputs (ICE, impacto/esfuerzo, etapa crítica)
--    y respuestas de pulso viajaban con user_id legible para cualquiera
--    (devtools). Ahora la base solo deja leer las filas PROPIAS y la
--    lectura compartida pasa por vistas enmascaradas:
--      · user_id visible solo en tus filas (o en la firma del contrato,
--        que es pública por diseño)
--      · voter_key = hash estable por sesión, para contar votantes
--        distintos sin identificar a nadie.
--    El poll de la sala cubre la sincronización aunque Realtime filtre
--    eventos ajenos por la RLS endurecida.
-- ============================================================

-- ── A) INVITATIONS ──────────────────────────────────────────

alter table public.invitations
  add column if not exists expires_at timestamptz not null default (now() + interval '14 days');

alter table public.invitations enable row level security;
drop policy if exists inv_read   on public.invitations;
drop policy if exists inv_insert on public.invitations;
drop policy if exists inv_update on public.invitations;
drop policy if exists inv_delete on public.invitations;

-- Staff: superadmin todo; admin/facilitador solo lo de sus organizaciones
-- (org_id null = invitaciones de admins, solo superadmin).
create policy inv_read on public.invitations for select using (
  public.my_role() = 'superadmin'
  or (public.my_role() in ('admin','facilitator') and org_id in (select public.visible_org_ids()))
);
create policy inv_insert on public.invitations for insert with check (
  public.my_role() = 'superadmin'
  or (public.my_role() in ('admin','facilitator') and org_id in (select public.visible_org_ids()))
);
create policy inv_update on public.invitations for update using (
  public.my_role() = 'superadmin'
  or (public.my_role() in ('admin','facilitator') and org_id in (select public.visible_org_ids()))
);
create policy inv_delete on public.invitations for delete using (
  public.my_role() = 'superadmin'
  or (public.my_role() in ('admin','facilitator') and org_id in (select public.visible_org_ids()))
);

-- El invitado lee SU invitación por token exacto (única puerta pública).
create or replace function public.get_invitation_by_token(p_token text)
returns table (token text, email text, name text, role text, org_id text, org_name text, team_id text, status text)
language sql stable security definer set search_path = public as $$
  select token, email, name, role, org_id, org_name, team_id, status
  from public.invitations
  where token = p_token and status = 'pending' and expires_at > now()
  limit 1;
$$;
grant execute on function public.get_invitation_by_token(text) to anon, authenticated;

-- Aceptar: valida token vigente, marca aceptada y activa la ficha del directorio.
create or replace function public.accept_invitation(p_token text)
returns void language plpgsql security definer set search_path = public as $$
declare inv record;
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
  end if;
end; $$;
grant execute on function public.accept_invitation(text) to anon, authenticated;

-- ── B) ANONIMATO REAL EN SESIONES ───────────────────────────

-- Base: cada uno solo lee SUS filas. La lectura compartida va por vistas.
drop policy if exists svotes_read on public.session_votes;
create policy svotes_read on public.session_votes for select using (user_id = auth.uid());

drop policy if exists sinputs_read on public.session_inputs;
create policy sinputs_read on public.session_inputs for select using (user_id = auth.uid());

drop policy if exists spulse_read on public.session_pulse_responses;
create policy spulse_read on public.session_pulse_responses for select using (user_id = auth.uid());

-- Vistas enmascaradas (owner bypassa RLS; el filtro de visibilidad va adentro).
create or replace view public.session_votes_view as
select
  id, session_id, cluster_id, created_at,
  case when user_id = auth.uid() then user_id else null end as user_id,
  md5(user_id::text || session_id::text) as voter_key
from public.session_votes
where session_id in (select public.visible_session_ids());

create or replace view public.session_inputs_view as
select
  session_id, key, value, private, created_at,
  case when user_id = auth.uid() or key = 'sign' then user_id else null end as user_id,
  md5(user_id::text || session_id::text) as voter_key
from public.session_inputs
where session_id in (select public.visible_session_ids())
  and (private = false or user_id = auth.uid());

create or replace view public.session_pulse_view as
select session_id, confianza, comunic, claridad, foco, seguridad
from public.session_pulse_responses
where session_id in (select public.visible_session_ids());

grant select on public.session_votes_view, public.session_inputs_view, public.session_pulse_view to authenticated;

-- ── C) EL FACILITADOR GESTIONA LAS TARJETAS ─────────────────
-- La policy original solo permitía tocar las tarjetas PROPIAS (author_id):
-- el facilitador no podía agrupar/borrar tarjetas ajenas. Ahora puede
-- (mover de cluster, borrar duplicadas/typos) dentro de sus sesiones.
drop policy if exists scards_facil_upd on public.session_cards;
create policy scards_facil_upd on public.session_cards for update
  using (session_id in (select public.visible_session_ids()) and public.my_role() in ('facilitator','admin','superadmin'))
  with check (session_id in (select public.visible_session_ids()));
drop policy if exists scards_facil_del on public.session_cards;
create policy scards_facil_del on public.session_cards for delete
  using (session_id in (select public.visible_session_ids()) and public.my_role() in ('facilitator','admin','superadmin'));
