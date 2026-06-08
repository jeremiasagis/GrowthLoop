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
  ACTIVE_SESSIONS, ALERTS, MY_ORG, REFLECTIONS, UPCOMING,
  type ActiveSession, type Admin, type Alert, type Facilitator,
  type Initiative, type Org, type Reflection, type RoleKey, type StageKey,
  type Team, type Upcoming,
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
const monthDayLabel = () => new Date().toLocaleDateString("es", { day: "2-digit", month: "short" });

// ── Organizations (scoped) ──
export function getOrgs(): Org[] {
  const orgs = useGLStore.getState().orgs;
  if (seesAll()) return orgs;
  if (scope!.role === "admin") return orgs.filter((o) => o.ownerEmail === scope!.email);
  return orgs.filter((o) => o.id === scope!.orgId); // facilitator / member
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
export function getTeam(id: string): Team | undefined {
  return getTeams().find((t) => t.id === id);
}
export function getTeamsByOrg(orgId: string): Team[] {
  return getTeams().filter((t) => t.orgId === orgId);
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
  return fac.filter((f) => !!f.orgId && ids.has(f.orgId));
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

/** El superadmin asigna qué admin gestiona una organización. */
export async function assignOrgAdmin(orgId: string, adminEmail: string | null): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("organizations").update({ owner_email: adminEmail }).eq("id", orgId);
  if (error) return { error: error.message };
  await reloadData();
  return {};
}

/** Crea una invitación con token. Devuelve el token (para armar el link). */
export async function createInvitation(p: {
  email: string; name?: string; role: RoleKey; orgId?: string; orgName?: string; teamId?: string;
}): Promise<{ token?: string; error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const token = newToken();
  const { error } = await supabase.from("invitations").insert({
    token, email: p.email.trim(), name: p.name ?? null, role: p.role,
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

/** Reasigna un facilitador YA existente a otra organización (lo mueve). */
export async function assignFacilitatorToOrg(facilitatorId: string, orgId: string, orgName?: string): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  // 1. Tabla facilitators (directorio que se ve en el panel).
  const { data: fac, error } = await supabase
    .from("facilitators").update({ org_id: orgId }).eq("id", facilitatorId).select("email").maybeSingle();
  if (error) return { error: error.message };
  const email = fac?.email as string | undefined;
  if (email) {
    // 2. Profile del facilitador → mueve su acceso/RLS (solo efectivo como superadmin).
    await supabase.from("profiles").update({ org_id: orgId }).eq("email", email).eq("role", "facilitator");
    // 3. Invitación pendiente (si todavía no aceptó) → que al aceptar caiga en la org correcta.
    await supabase.from("invitations").update({ org_id: orgId, org_name: orgName ?? null })
      .eq("email", email).eq("role", "facilitator").eq("status", "pending");
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

/** Crea una iniciativa (línea de trabajo) para un equipo. Arranca en exploración. */
export async function createInitiative(input: { teamId: string; title: string; description?: string; stage?: StageKey; status?: Initiative["status"] }): Promise<{ error?: string; id?: string }> {
  const supabase = getSupabaseBrowserClient();
  const id = newId("i");
  const { error } = await supabase.from("initiatives").insert({
    id, team_id: input.teamId, title: input.title.trim(),
    description: input.description?.trim() || null,
    stage: input.stage ?? "explore", status: input.status ?? "active",
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

/** Registra una sesión realizada: la suma al log del equipo, guarda los
 *  resultados de la etapa en la iniciativa y (si corresponde) avanza etapa/estado. */
export async function recordSession(p: {
  teamId: string; initiativeId?: string; sessionStage: StageKey; retro: string; out: string;
  stageData?: Record<string, unknown>; newStage?: StageKey; status?: Initiative["status"];
}): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const date = monthDayLabel();
  const { error: e1 } = await supabase.from("session_logs").insert({
    id: newId("s"), team_id: p.teamId, date, stage: p.sessionStage,
    retro: p.retro, out_text: p.out, pulse: 0, delta: 0,
    initiative_id: p.initiativeId ?? null,
  });
  if (e1) return { error: e1.message };

  if (p.initiativeId) {
    const { data: row } = await supabase.from("initiatives").select("data").eq("id", p.initiativeId).maybeSingle();
    const merged = { ...((row?.data as Record<string, unknown>) ?? {}), ...(p.stageData ? { [p.sessionStage]: p.stageData } : {}) };
    const patch: Record<string, unknown> = { data: merged };
    if (p.newStage) patch.stage = p.newStage;
    if (p.status) patch.status = p.status;
    const { error: e2 } = await supabase.from("initiatives").update(patch).eq("id", p.initiativeId);
    if (e2) return { error: e2.message };
  }
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
  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error) return { error: error.message };
  await reloadData();
  return {};
}

/** Invita un integrante a un equipo existente (copy-link). */
export async function inviteMember(input: { teamId: string; orgId: string; email: string; name?: string }): Promise<{ token?: string; error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const name = input.name?.trim()
    || input.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const { error } = await supabase.from("team_members").insert({ team_id: input.teamId, name, initials: initialsOf(name) });
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

// ── Member-facing — mock ──
export function getReflections(): Reflection[] {
  return REFLECTIONS;
}
export function getActiveSessionForTeam(teamId: string): ActiveSession | undefined {
  return ACTIVE_SESSIONS.find((s) => s.teamId === teamId);
}
export function getLiveSessionForTeam(teamId: string): ActiveSession | undefined {
  return ACTIVE_SESSIONS.find((s) => s.teamId === teamId && s.live);
}
export function getSessionById(id: string): ActiveSession | undefined {
  return ACTIVE_SESSIONS.find((s) => s.id === id);
}

// ── Invitations (Supabase) ──
export async function getInvitation(token: string): Promise<Invitation | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("invitations").select("*").eq("token", token).single();
  if (error || !data) return null;
  return {
    token: data.token, email: data.email, name: data.name ?? undefined, role: data.role as RoleKey,
    orgId: data.org_id ?? undefined, orgName: data.org_name ?? undefined, teamId: data.team_id ?? undefined,
    status: data.status,
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

export async function markInvitationAccepted(token: string, role: RoleKey, email: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await supabase.from("invitations").update({ status: "accepted" }).eq("token", token);
  // Activamos el registro del directorio (facilitador/admin) si existe.
  if (role === "facilitator") await supabase.from("facilitators").update({ status: "active" }).eq("email", email);
  if (role === "admin") await supabase.from("admins").update({ status: "active" }).eq("email", email);
}

// ── Dashboard widgets — mock ──
export function getAlerts(): Alert[] {
  return ALERTS;
}
export function getUpcoming(): Upcoming[] {
  return UPCOMING;
}
export function getMyOrgSummary() {
  return MY_ORG;
}

// ── Aggregated dashboard metrics ──
export function getDashboardStats() {
  const teams = useGLStore.getState().teams;
  const inits = teams.flatMap((t) => t.initiatives ?? []);
  return {
    teamsActive: teams.length,
    proofsRunning: inits.filter((i) => i.stage === "proof").length,
    sessionsThisWeek: 4,
    variablesImproved: inits.filter((i) => i.status === "done").length,
  };
}
