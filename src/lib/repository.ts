/* ============================================================
   Growthloop — Data repository (la costura de datos)
   ------------------------------------------------------------
   Las entidades principales (orgs, teams, facilitators) se leen
   del store (`store.ts`), que las carga desde Supabase una vez.
   El resto (reflexiones, sesiones activas, invitaciones, admins,
   agenda, alertas) sigue en datos de ejemplo por ahora.
   ============================================================ */

import { reloadData, useGLStore } from "./store";
import { getSupabaseBrowserClient } from "./supabase/client";
import {
  type Admin, type Facilitator,
  type Initiative, type Org, type Reflection, type RoleKey, type StageKey,
  type Team, type TeamObjective,
} from "./data";

export interface Invitation {
  token: string;
  email: string;
  name?: string;
  role: RoleKey;
  orgId?: string;
  orgName?: string;
  teamId?: string;
  status?: string;
}

const newToken = () =>
  Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8);

// ── Alcance de datos (lo setea AuthContext según el usuario) ──
//  superadmin → ve todo
//  admin      → ve las organizaciones que gestiona (owner_email = su email)
//  facilitator/member → ve su organización asignada (orgId)
let scope: { role: RoleKey; email?: string; orgId?: string } | null = null;
export function setScope(s: { role: RoleKey; email?: string; orgId?: string } | null) {
  scope = s;
}
const seesAll = () => !scope || scope.role === "superadmin";

/** Ids de las organizaciones visibles para el usuario actual. */
function myOrgIds(): Set<string> {
  return new Set(getOrgs().map((o) => o.id));
}

// Genera un id de texto único para PKs nuevas.
const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
const initialsOf = (name: string) => name.trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const monthLabel = () => new Date().toLocaleDateString("es", { month: "short", year: "numeric" });

// ── Organizations (scoped) ──
export function getOrgs(): Org[] {
  const orgs = useGLStore.getState().orgs;
  if (seesAll()) return orgs;
  if (scope!.role === "admin") return orgs.filter((o) => o.ownerEmail === scope!.email);
  if (scope!.role === "facilitator") {
    // Multi-org: un facilitador puede pertenecer a varias organizaciones.
    const mine = new Set<string>();
    if (scope!.orgId) mine.add(scope!.orgId);
    const email = (scope!.email ?? "").toLowerCase();
    for (const f of useGLStore.getState().facilitators) {
      if ((f.email ?? "").toLowerCase() !== email) continue;
      for (const o of f.orgIds ?? (f.orgId ? [f.orgId] : [])) mine.add(o);
    }
    return orgs.filter((o) => mine.has(o.id));
  }
  return orgs.filter((o) => o.id === scope!.orgId); // member / coordinator
}
export function getOrg(id: string): Org | undefined {
  return useGLStore.getState().orgs.find((o) => o.id === id);
}

// ── Teams (scoped) ──
export function getTeams(): Team[] {
  const teams = useGLStore.getState().teams;
  if (seesAll()) return teams;
  const ids = myOrgIds();
  return teams.filter((t) => ids.has(t.orgId));
}
/** El equipo del miembro logueado: el que dice su perfil, o —auto-curativo—
 *  el único/primer equipo que la RLS le deja ver (un miembro solo ve el suyo). */
export function getMyTeam(teamId?: string): Team | undefined {
  return (teamId ? getTeam(teamId) : undefined) ?? getTeams()[0];
}

/** Todos los equipos del miembro logueado: el store ya viene acotado por RLS a
 *  los equipos donde figura (incluso de organizaciones distintas). Sin filtro de org. */
export function getMemberTeams(): Team[] {
  return useGLStore.getState().teams;
}
/** Resuelve el equipo activo del miembro entre los suyos (store directo, sin filtro de org). */
export function getMemberTeam(teamId?: string): Team | undefined {
  const teams = useGLStore.getState().teams;
  return (teamId ? teams.find((t) => t.id === teamId) : undefined) ?? teams[0];
}

export function getTeam(id: string): Team | undefined {
  return getTeams().find((t) => t.id === id);
}
// ── Iniciativas (líneas de trabajo de un equipo) ──
export function getInitiatives(teamId: string): Initiative[] {
  return getTeam(teamId)?.initiatives ?? [];
}

// ── Facilitators (scoped) ──
export function getFacilitators(): Facilitator[] {
  const fac = useGLStore.getState().facilitators;
  if (seesAll()) return fac;
  const ids = myOrgIds();
  // Multi-org: incluir al facilitador si CUALQUIERA de sus orgs es visible.
  return fac.filter((f) => (f.orgIds ?? (f.orgId ? [f.orgId] : [])).some((o) => ids.has(o)));
}

// ── Admins (superadmin scope) ──
export function getAdmins(): Admin[] {
  return useGLStore.getState().admins;
}

// ════════════════════════════════════════════════════════════
// ESCRITURAS (persisten en Supabase, después recargan el store)
// ════════════════════════════════════════════════════════════

export async function createOrg(input: { name: string; sector?: string; contract?: string; status?: "Activo" | "Piloto" }): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("organizations").insert({
    id: newId("o"), name: input.name.trim(), sector: input.sector?.trim() || "Sin definir",
    leader: "—", leader_role: "—", contract: input.contract || "6 meses",
    since: monthLabel(), status: input.status ?? "Activo",
    owner_email: scope?.email ?? null, // si la crea un admin, queda como su dueño
  });
  if (error) return { error: error.message };
  await reloadData();
  return {};
}

export async function updateOrg(id: string, fields: { name?: string; sector?: string; contract?: string; status?: "Activo" | "Piloto" }): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const patch: Record<string, unknown> = {};
  if (fields.name !== undefined) patch.name = fields.name.trim();
  if (fields.sector !== undefined) patch.sector = fields.sector.trim();
  if (fields.contract !== undefined) patch.contract = fields.contract;
  if (fields.status !== undefined) patch.status = fields.status;
  const { error } = await supabase.from("organizations").update(patch).eq("id", id);
  if (error) return { error: error.message };
  await reloadData();
  return {};
}

/** Elimina una organización. Bloquea si todavía tiene equipos (hay que moverlos o borrarlos antes). Limpia facilitadores asignados, coordinadores e invitaciones. Irreversible. */
export async function deleteOrg(id: string): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const { teams } = useGLStore.getState();
  const orgTeams = teams.filter((t) => t.orgId === id);
  if (orgTeams.length > 0) {
    return { error: `La organización tiene ${orgTeams.length} ${orgTeams.length === 1 ? "equipo" : "equipos"}. Eliminá o mové los equipos antes de borrar la organización.` };
  }
  // Desvincular facilitadores e invitaciones pendientes de esta organización.
  await supabase.from("facilitator_orgs").delete().eq("org_id", id);
  await supabase.from("facilitators").update({ org_id: null }).eq("org_id", id);
  await supabase.from("invitations").delete().eq("org_id", id);
  const { error } = await supabase.from("organizations").delete().eq("id", id);
  if (error) return { error: error.message };
  await reloadData();
  return {};
}

/** Cambia el plan de una cuenta (organización). Solo superadmin/dueño. */
export async function setOrgPlan(id: string, plan: "starter" | "pro" | "business"): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("organizations").update({ plan }).eq("id", id);
  if (error) return { error: error.message };
  await reloadData();
  return {};
}

/** Mergea datos a nivel equipo (teams.data jsonb) sin pisar lo demás. */
async function mergeTeamData(teamId: string, patch: Record<string, unknown>): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const { data: row } = await supabase.from("teams").select("data").eq("id", teamId).maybeSingle();
  const prev = (row?.data as Record<string, unknown>) ?? {};
  const { error } = await supabase.from("teams").update({ data: { ...prev, ...patch } }).eq("id", teamId);
  if (error) return { error: error.message };
  await reloadData();
  return {};
}

// ── Objetivos del equipo (varios; agrupan iniciativas) ──
export async function createObjective(p: { teamId: string; text: string; metric?: string; target?: string; horizon?: string }): Promise<{ error?: string; id?: string }> {
  const supabase = getSupabaseBrowserClient();
  const id = newId("ob");
  const { error } = await supabase.from("objectives").insert({
    id, team_id: p.teamId, text: p.text.trim(), metric: p.metric?.trim() || null,
    target: p.target?.trim() || null, horizon: p.horizon?.trim() || null, status: "active",
  });
  if (error) return { error: error.message };
  await reloadData();
  return { id };
}

export async function setObjectiveStatus(id: string, status: "active" | "achieved" | "archived"): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("objectives").update({ status }).eq("id", id);
  if (error) return { error: error.message };
  await reloadData();
  return {};
}

/** Asocia (o desasocia con null) una iniciativa a un objetivo. */
export async function setInitiativeObjective(initId: string, objectiveId: string | null): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("initiatives").update({ objective_id: objectiveId }).eq("id", initId);
  if (error) return { error: error.message };
  await reloadData();
  return {};
}

/** Define / actualiza el "Norte" (objetivo) del equipo. */
export async function setTeamObjective(teamId: string, objective: TeamObjective | null): Promise<{ error?: string }> {
  return mergeTeamData(teamId, { objective: objective ? { ...objective, setAt: objective.setAt ?? new Date().toISOString() } : null });
}

/** Define el ritmo/cadencia del equipo (cada cuántos días). */
export async function setTeamCadence(teamId: string, everyDays: number): Promise<{ error?: string }> {
  return mergeTeamData(teamId, { cadence: { everyDays } });
}

/** Marca hasta qué nivel/ciclos ya celebramos (para no repetir el confetti). */
export async function markCelebrated(teamId: string, celebrated: { level: number; cycles: number }): Promise<{ error?: string }> {
  return mergeTeamData(teamId, { celebrated });
}

/** El superadmin asigna qué admin gestiona una organización. */
export async function assignOrgAdmin(orgId: string, adminEmail: string | null): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("organizations").update({ owner_email: adminEmail }).eq("id", orgId);
  if (error) return { error: error.message };
  await reloadData();
  return {};
}

/** Crea (o reutiliza) una invitación con token. Devuelve el token (para armar el link). */
export async function createInvitation(p: {
  email: string; name?: string; role: RoleKey; orgId?: string; orgName?: string; teamId?: string;
}): Promise<{ token?: string; error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const email = p.email.trim().toLowerCase();
  // Si ya hay una invitación pendiente vigente para ese email+rol(+org/equipo), reutilizamos
  // el token (y le renovamos el vencimiento) en vez de acumular tokens válidos.
  let q = supabase.from("invitations").select("token")
    .eq("email", email).eq("role", p.role).eq("status", "pending")
    .gt("expires_at", new Date().toISOString());
  q = p.teamId ? q.eq("team_id", p.teamId) : p.orgId ? q.eq("org_id", p.orgId) : q;
  const { data: existing } = await q.limit(1).maybeSingle();
  if (existing?.token) {
    await supabase.from("invitations")
      .update({ expires_at: new Date(Date.now() + 14 * 86400000).toISOString() })
      .eq("token", existing.token);
    return { token: existing.token };
  }
  const token = newToken();
  const { error } = await supabase.from("invitations").insert({
    token, email, name: p.name ?? null, role: p.role,
    org_id: p.orgId ?? null, org_name: p.orgName ?? null, team_id: p.teamId ?? null, status: "pending",
  });
  if (error) return { error: error.message };
  return { token };
}

export async function inviteFacilitator(input: { email: string; name?: string; orgId?: string; orgName?: string }): Promise<{ error?: string; token?: string }> {
  const supabase = getSupabaseBrowserClient();
  const name = input.name?.trim()
    || input.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const { error } = await supabase.from("facilitators").insert({
    id: newId("f"), name, email: input.email.trim(), initials: initialsOf(name),
    teams: 0, sessions_month: 0, health: null, status: "invited", is_you: false,
    org_id: input.orgId ?? null,
  });
  if (error) return { error: error.message };
  const inv = await createInvitation({ email: input.email, name, role: "facilitator", orgId: input.orgId, orgName: input.orgName });
  await reloadData();
  return { token: inv.token };
}

/** Suma un facilitador YA existente a una organización (multi-org, aditivo). */
export async function assignFacilitatorToOrg(facilitatorId: string, orgId: string): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const fac = useGLStore.getState().facilitators.find((f) => f.id === facilitatorId);
  const email = (fac?.email ?? "").toLowerCase();
  if (!email) return { error: "No se encontró el facilitador." };
  // Membresía multi-org en la tabla puente (no pisa su organización principal).
  const { error } = await supabase.from("facilitator_orgs").upsert({ email, org_id: orgId }, { onConflict: "email,org_id" });
  if (error) return { error: error.message };
  // Si todavía no tenía organización "home", esta pasa a serla.
  if (!fac?.orgId) {
    await supabase.from("facilitators").update({ org_id: orgId }).eq("id", facilitatorId);
    await supabase.from("profiles").update({ org_id: orgId }).eq("email", email).eq("role", "facilitator");
  }
  await reloadData();
  return {};
}

/** Quita un facilitador de una organización (multi-org). */
export async function removeFacilitatorFromOrg(facilitatorId: string, orgId: string): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const fac = useGLStore.getState().facilitators.find((f) => f.id === facilitatorId);
  const email = (fac?.email ?? "").toLowerCase();
  if (!email) return { error: "No se encontró el facilitador." };
  // No se puede quitar si tiene equipos en esa org (perdería el vínculo con esos equipos).
  const teams = useGLStore.getState().teams;
  if (teams.some((t) => t.facilitatorId === facilitatorId && t.orgId === orgId)) {
    return { error: "Tiene equipos en esta organización. Reasigná o eliminá esos equipos primero." };
  }
  // Quitar la membresía explícita.
  const { error } = await supabase.from("facilitator_orgs").delete().eq("email", email).eq("org_id", orgId);
  if (error) return { error: error.message };
  // Si esta org era su "home", pasarla a otra de sus orgs (o dejarlo sin org).
  if (fac?.orgId === orgId) {
    const fallback = (fac.orgIds ?? []).find((o) => o !== orgId) ?? null;
    await supabase.from("facilitators").update({ org_id: fallback }).eq("id", facilitatorId);
    await supabase.from("profiles").update({ org_id: fallback }).eq("email", email).eq("role", "facilitator");
  }
  await reloadData();
  return {};
}

export async function createTeam(input: {
  name: string; orgId: string; area?: string; purpose?: string; memberEmails?: string[]; facilitatorEmail?: string;
}): Promise<{ error?: string; teamId?: string; memberInvites?: { email: string; token: string }[] }> {
  const supabase = getSupabaseBrowserClient();
  const teamId = newId("t");
  // Vincular el equipo al facilitador que lo crea (su fila en facilitators).
  let facilitatorId: string | null = null;
  if (input.facilitatorEmail) {
    const { data: fac } = await supabase.from("facilitators").select("id").eq("email", input.facilitatorEmail).maybeSingle();
    facilitatorId = fac?.id ?? null;
  }
  const { error } = await supabase.from("teams").insert({
    id: teamId, org_id: input.orgId, name: input.name.trim(),
    area: input.area?.trim() || "—", purpose: input.purpose?.trim() || "",
    client_type: "Interno", facilitator_id: facilitatorId, psych_safety: 0,
    stage: "queue", active_var: null, days_left: 0, blocked: false,
  });
  if (error) return { error: error.message };

  const emails = (input.memberEmails ?? []).filter(Boolean);
  const memberInvites: { email: string; token: string }[] = [];
  if (emails.length) {
    const rows = emails.map((e) => {
      const name = e.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      return { team_id: teamId, name, initials: initialsOf(name) };
    });
    await supabase.from("team_members").insert(rows);
    for (const e of emails) {
      const inv = await createInvitation({ email: e, role: "member", orgId: input.orgId, teamId });
      if (inv.token) memberInvites.push({ email: e, token: inv.token });
    }
  }
  await reloadData();
  return { teamId, memberInvites };
}

/** Crea una iniciativa (línea de trabajo) para un equipo. Arranca en Objetivos. */
export async function createInitiative(input: { teamId: string; title: string; description?: string; stage?: StageKey; status?: Initiative["status"]; objectiveId?: string | null; data?: Record<string, unknown> }): Promise<{ error?: string; id?: string }> {
  const supabase = getSupabaseBrowserClient();
  const id = newId("i");
  const { error } = await supabase.from("initiatives").insert({
    id, team_id: input.teamId, title: input.title.trim(),
    description: input.description?.trim() || null,
    stage: input.stage ?? "focus", status: input.status ?? "active",
    objective_id: input.objectiveId ?? null,
    ...(input.data ? { data: input.data } : {}),
  });
  if (error) return { error: error.message };
  await reloadData();
  return { id };
}

/** Edita el objetivo / detalle de una iniciativa. */
export async function updateInitiative(id: string, fields: { title?: string; description?: string }): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const patch: Record<string, unknown> = {};
  if (fields.title !== undefined) patch.title = fields.title.trim();
  if (fields.description !== undefined) patch.description = fields.description.trim() || null;
  const { error } = await supabase.from("initiatives").update(patch).eq("id", id);
  if (error) return { error: error.message };
  await reloadData();
  return {};
}

/** Cambia la etapa de una iniciativa (avanzar/retroceder en el ciclo). */
export async function setInitiativeStage(id: string, stage: StageKey): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("initiatives").update({ stage }).eq("id", id);
  if (error) return { error: error.message };
  await reloadData();
  return {};
}

/** Mezcla (shallow) un valor dentro de initiatives.data[dataKey]. */
export async function patchInitiativeData(id: string, dataKey: string, dataValue: Record<string, unknown>): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const { data: row } = await supabase.from("initiatives").select("data").eq("id", id).maybeSingle();
  const prev = (row?.data as Record<string, unknown>) ?? {};
  const prevK = (prev[dataKey] as Record<string, unknown>) ?? {};
  const next = { ...prev, [dataKey]: { ...prevK, ...dataValue } };
  const { error } = await supabase.from("initiatives").update({ data: next }).eq("id", id);
  if (error) return { error: error.message };
  await reloadData();
  return {};
}

/** El miembro marca el estado de UN compromiso suyo (vía RPC security definer).
 *  Los miembros no pueden escribir initiatives directamente; la RPC valida pertenencia. */
export async function setMyCommitmentStatus(initId: string, text: string, status: string): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("set_my_commitment_status", { p_init_id: initId, p_text: text, p_status: status });
  if (error) return { error: error.message };
  await reloadData();
  return {};
}

/** Cambia el estado de una iniciativa (en curso / cerrada / pausada). */
export async function setInitiativeStatus(id: string, status: Initiative["status"]): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("initiatives").update({ status }).eq("id", id);
  if (error) return { error: error.message };
  await reloadData();
  return {};
}

/** Elimina una iniciativa (en cascada sus sesiones y logs). Irreversible. */
export async function deleteInitiative(id: string): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("initiatives").delete().eq("id", id);
  if (error) return { error: error.message };
  await reloadData();
  return {};
}

/** Elimina un equipo (en cascada iniciativas, sesiones, pulso, integrantes…). Irreversible. */
export async function deleteTeam(id: string): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  // No hay FK initiatives→teams con cascade: borramos las iniciativas a mano
  // (sus sesiones sí cascadean por sessions→initiatives) para no dejar huérfanas.
  await supabase.from("initiatives").delete().eq("team_id", id);
  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error) return { error: error.message };
  await reloadData();
  return {};
}

/** Elimina un admin: borra su ficha, desasigna sus organizaciones y le revoca el acceso. Irreversible. */
export async function deleteAdmin(id: string): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const admin = useGLStore.getState().admins.find((a) => a.id === id);
  const email = (admin?.email ?? "").toLowerCase();
  const { error } = await supabase.from("admins").delete().eq("id", id);
  if (error) return { error: error.message };
  if (email) {
    // Desasignar las organizaciones que tenía a cargo, revocarle el rol y sus invitaciones pendientes.
    await supabase.from("organizations").update({ owner_email: null }).eq("owner_email", email);
    await supabase.from("profiles").update({ role: "member" }).eq("email", email).eq("role", "admin");
    await supabase.from("invitations").delete().eq("email", email).eq("status", "pending");
  }
  await reloadData();
  return {};
}

/** Elimina un facilitador: borra su ficha y membresías, desvincula sus equipos y le revoca el acceso. Irreversible. */
export async function deleteFacilitator(id: string): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const fac = useGLStore.getState().facilitators.find((f) => f.id === id);
  const email = (fac?.email ?? "").toLowerCase();
  // Los equipos que facilitaba quedan sin facilitador (no se borran).
  await supabase.from("teams").update({ facilitator_id: null }).eq("facilitator_id", id);
  if (email) await supabase.from("facilitator_orgs").delete().eq("email", email);
  const { error } = await supabase.from("facilitators").delete().eq("id", id);
  if (error) return { error: error.message };
  if (email) {
    await supabase.from("profiles").update({ role: "member" }).eq("email", email).eq("role", "facilitator");
    await supabase.from("invitations").delete().eq("email", email).eq("status", "pending");
  }
  await reloadData();
  return {};
}

/** Quita un integrante del equipo (su ficha; la cuenta de la persona no se toca). */
export async function removeTeamMember(memberId: string): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("team_members").delete().eq("id", memberId);
  if (error) return { error: error.message };
  await reloadData();
  return {};
}

/** Revoca (elimina) una invitación pendiente por token. */
export async function revokeInvitation(token: string): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("invitations").delete().eq("token", token);
  if (error) return { error: error.message };
  return {};
}

/** Invita un integrante a un equipo existente (copy-link). */
export async function inviteMember(input: { teamId: string; orgId: string; email: string; name?: string }): Promise<{ token?: string; error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const name = input.name?.trim()
    || input.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  // La ficha guarda el email para que accept_invitation la vincule al usuario real.
  const email = input.email.trim().toLowerCase();
  const { data: existing } = await supabase.from("team_members").select("id")
    .eq("team_id", input.teamId).eq("email", email).limit(1).maybeSingle();
  const { error } = existing
    ? { error: null } // re-invitación: la ficha ya existe, no duplicar
    : await supabase.from("team_members").insert({ team_id: input.teamId, name, initials: initialsOf(name), email });
  if (error) return { error: error.message };
  const inv = await createInvitation({ email: input.email, name, role: "member", orgId: input.orgId, teamId: input.teamId });
  await reloadData();
  return { token: inv.token, error: inv.error };
}

export async function createAdmin(input: { name: string; email: string }): Promise<{ error?: string; token?: string }> {
  const supabase = getSupabaseBrowserClient();
  // El admin se crea sin org: él mismo crea y gestiona sus organizaciones.
  const { error } = await supabase.from("admins").insert({
    id: newId("ad"), name: input.name.trim(), email: input.email.trim(),
    initials: initialsOf(input.name), org_name: null, org_id: null,
    orgs: 0, facilitators: 0, status: "invited", is_you: false,
  });
  if (error) return { error: error.message };
  const inv = await createInvitation({ email: input.email, name: input.name, role: "admin" });
  await reloadData();
  return { token: inv.token };
}

// ── Reflexiones privadas del miembro (Supabase, RLS por user_id) ──
export async function getMyReflections(): Promise<Reflection[]> {
  const supabase = getSupabaseBrowserClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from("reflections").select("id, prompt, text, created_at")
    .eq("user_id", auth.user.id).order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id, prompt: r.prompt, text: r.text,
    date: new Date(r.created_at as string).toLocaleDateString("es", { day: "2-digit", month: "short" }),
  }));
}

export async function addReflection(text: string, teamId?: string, prompt = "Reflexión libre"): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "No hay sesión." };
  const { error } = await supabase.from("reflections").insert({
    user_id: auth.user.id, team_id: teamId ?? null, prompt, text: text.trim(),
  });
  return { error: error?.message };
}

// ── Invitations (Supabase) ──
export async function getInvitation(token: string): Promise<Invitation | null> {
  const supabase = getSupabaseBrowserClient();
  // RPC por token exacto: la tabla quedó cerrada por RLS (antes cualquiera podía listarla).
  const { data, error } = await supabase.rpc("get_invitation_by_token", { p_token: token });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return null;
  return {
    token: row.token, email: row.email, name: row.name ?? undefined, role: row.role as RoleKey,
    orgId: row.org_id ?? undefined, orgName: row.org_name ?? undefined, teamId: row.team_id ?? undefined,
    status: row.status,
  };
}

/** Invita un coordinador (observador) a una organización. */
export async function inviteCoordinator(p: { email: string; name?: string; orgId: string; orgName?: string }): Promise<{ token?: string; error?: string }> {
  return createInvitation({ email: p.email, name: p.name, role: "coordinator", orgId: p.orgId, orgName: p.orgName });
}

/** Lista los coordinadores (invitaciones) de una organización. */
export async function getCoordinatorsForOrg(orgId: string): Promise<{ token: string; email: string; name?: string; status: string }[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("invitations")
    .select("token,email,name,status")
    .eq("role", "coordinator")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((r) => ({ token: r.token, email: r.email, name: r.name ?? undefined, status: r.status }));
}

export async function markInvitationAccepted(token: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  // RPC security-definer: valida el token vigente, marca aceptada y activa
  // la ficha del directorio (facilitador/admin) — que la RLS bloqueaba al invitado.
  await supabase.rpc("accept_invitation", { p_token: token });
}

