/* ============================================================
   Desafíos — el backlog vivo del equipo. Lee/escribe Supabase
   directo. Un desafío colectivo se convierte en loop; uno
   individual se asigna a una persona (WS8). Las sugerencias se
   derivan de lo fundacional (FODA) y del clima.
   ============================================================ */

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createInitiative } from "@/lib/repository";
import { to5, dimVal, PULSE_DIMS, type Team } from "@/lib/data";

export type ChallengeScope = "individual" | "collective";

export interface Challenge {
  id: string;
  teamId: string;
  title: string;
  detail?: string;
  scope: ChallengeScope;
  domain?: string;
  source: string;
  sourceRef?: string;
  status: string; // open | routed | done | archived
  loopId?: string;
  assigneeUserId?: string;
  createdAt?: string;
}

export const DOMAINS = ["comunicacion", "cliente", "eficiencia", "clima", "otro"] as const;
export const DOMAIN_META: Record<string, { label: string; icon: string; color: string }> = {
  comunicacion: { label: "Comunicación", icon: "MessagesSquare", color: "var(--info)" },
  cliente: { label: "Cliente", icon: "Handshake", color: "var(--violet)" },
  eficiencia: { label: "Eficiencia", icon: "RefreshCw", color: "var(--st-proof)" },
  clima: { label: "Clima", icon: "Activity", color: "var(--warning)" },
  otro: { label: "Otro", icon: "Circle", color: "var(--ink-2)" },
};
export const domainMeta = (d?: string) => DOMAIN_META[d ?? "otro"] ?? DOMAIN_META.otro;

/* eslint-disable @typescript-eslint/no-explicit-any */
const map = (r: any): Challenge => ({
  id: r.id, teamId: r.team_id, title: r.title, detail: r.detail ?? undefined,
  scope: r.scope, domain: r.domain ?? undefined, source: r.source, sourceRef: r.source_ref ?? undefined,
  status: r.status, loopId: r.loop_id ?? undefined, assigneeUserId: r.assignee_user_id ?? undefined,
  createdAt: r.created_at ?? undefined,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function getChallenges(teamId: string): Promise<Challenge[]> {
  const sb = getSupabaseBrowserClient();
  const { data } = await sb.from("team_challenges").select("*")
    .eq("team_id", teamId).order("created_at", { ascending: false });
  return (data ?? []).map(map);
}

export async function createChallenge(input: {
  teamId: string; title: string; detail?: string; scope?: ChallengeScope;
  domain?: string; source?: string; sourceRef?: string;
}): Promise<{ id?: string; error?: string }> {
  const sb = getSupabaseBrowserClient();
  const { data: auth } = await sb.auth.getUser();
  const { data, error } = await sb.from("team_challenges").insert({
    team_id: input.teamId, title: input.title.trim(), detail: input.detail?.trim() || null,
    scope: input.scope ?? "collective", domain: input.domain ?? null,
    source: input.source ?? "manual", source_ref: input.sourceRef ?? null,
    created_by: auth.user?.id ?? null,
  }).select("id").single();
  return error ? { error: error.message } : { id: data.id };
}

export async function updateChallenge(id: string, patch: Partial<Pick<Challenge, "title" | "detail" | "scope" | "domain" | "status" | "assigneeUserId" | "loopId">>): Promise<{ error?: string }> {
  const sb = getSupabaseBrowserClient();
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.detail !== undefined) row.detail = patch.detail;
  if (patch.scope !== undefined) row.scope = patch.scope;
  if (patch.domain !== undefined) row.domain = patch.domain;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.assigneeUserId !== undefined) row.assignee_user_id = patch.assigneeUserId;
  if (patch.loopId !== undefined) row.loop_id = patch.loopId;
  const { error } = await sb.from("team_challenges").update(row).eq("id", id);
  return { error: error?.message };
}

export async function deleteChallenge(id: string): Promise<{ error?: string }> {
  const sb = getSupabaseBrowserClient();
  const { error } = await sb.from("team_challenges").delete().eq("id", id);
  return { error: error?.message };
}

/** Convierte un desafío colectivo en loop (crea la iniciativa y lo marca ruteado). */
export async function convertChallengeToLoop(ch: Challenge): Promise<{ error?: string; loopId?: string }> {
  const res = await createInitiative({ teamId: ch.teamId, title: ch.title, description: ch.detail });
  if (res.error || !res.id) return { error: res.error ?? "No se pudo crear el loop." };
  const upd = await updateChallenge(ch.id, { status: "routed", loopId: res.id });
  if (upd.error) return { error: upd.error };
  return { loopId: res.id };
}

/* ── Focos de desarrollo (desafíos individuales asignados) ── */
export const FOCUS_STATUS: Record<string, { label: string; color: string; next: string }> = {
  open: { label: "Pendiente", color: "var(--ink-2)", next: "doing" },
  doing: { label: "En progreso", color: "var(--info)", next: "done" },
  done: { label: "Logrado", color: "var(--success)", next: "open" },
};

/** Mis focos de desarrollo (desafíos individuales asignados a mí). */
export async function getMyFocuses(): Promise<Challenge[]> {
  const sb = getSupabaseBrowserClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return [];
  const { data } = await sb.from("team_challenges").select("*")
    .eq("assignee_user_id", auth.user.id).eq("scope", "individual").neq("status", "archived")
    .order("created_at", { ascending: false });
  return (data ?? []).map(map);
}

/** Focos de desarrollo de una persona (para el 1-a-1 del facilitador). */
export async function getMemberFocuses(teamId: string, userId: string): Promise<Challenge[]> {
  const sb = getSupabaseBrowserClient();
  const { data } = await sb.from("team_challenges").select("*")
    .eq("team_id", teamId).eq("assignee_user_id", userId).eq("scope", "individual").neq("status", "archived")
    .order("created_at", { ascending: false });
  return (data ?? []).map(map);
}

/** El asignado marca el avance de su foco (vía RPC security definer). */
export async function setMyFocusStatus(id: string, status: string): Promise<{ error?: string }> {
  const sb = getSupabaseBrowserClient();
  const { error } = await sb.rpc("set_my_focus_status", { p_challenge_id: id, p_status: status });
  return { error: error?.message };
}

/** El miembro propone su propio foco de desarrollo (individual, asignado a sí mismo). */
export async function proposeMyFocus(input: { teamId: string; title: string; detail?: string; domain?: string }): Promise<{ id?: string; error?: string }> {
  const sb = getSupabaseBrowserClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return { error: "Sesión expirada." };
  const { data, error } = await sb.from("team_challenges").insert({
    team_id: input.teamId, title: input.title.trim(), detail: input.detail?.trim() || null,
    scope: "individual", domain: input.domain ?? null, source: "self",
    assignee_user_id: auth.user.id, created_by: auth.user.id,
  }).select("id").single();
  return error ? { error: error.message } : { id: data.id };
}

export interface Suggestion {
  title: string; detail: string; scope: ChallengeScope; domain: string; source: string; sourceRef: string;
}

/** Desafíos candidatos derivados de lo fundacional (FODA) y el clima. */
export function suggestedChallenges(team: Team): Suggestion[] {
  const out: Suggestion[] = [];
  const foda = team.data?.foda;
  for (const d of foda?.d ?? []) out.push({ title: d, detail: "Debilidad detectada en el FODA.", scope: "collective", domain: "eficiencia", source: "fundacional", sourceRef: `foda:d:${d}` });
  for (const a of foda?.a ?? []) out.push({ title: a, detail: "Amenaza detectada en el FODA.", scope: "collective", domain: "cliente", source: "fundacional", sourceRef: `foda:a:${a}` });

  const latest = team.pulse?.[team.pulse.length - 1];
  if (latest) {
    for (const pd of PULSE_DIMS) {
      const v = dimVal(latest, pd.key);
      if (v != null && v < 55) out.push({
        title: `Mejorar ${pd.label.toLowerCase()}`,
        detail: `El clima en "${pd.label}" está en ${to5(v).toFixed(1)}/5.`,
        scope: "collective", domain: "clima", source: "clima", sourceRef: `clima:${pd.key}`,
      });
    }
  }
  return out;
}
