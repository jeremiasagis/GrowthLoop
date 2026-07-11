/* eslint-disable @typescript-eslint/no-explicit-any */
/* ============================================================
   Growthloop — Store de datos (zustand)
   ------------------------------------------------------------
   Carga los datos desde Supabase y los deja en memoria con la
   misma forma que los tipos de `data.ts`. Las pantallas leen
   síncrono vía `repository.ts`. Tras una escritura se llama a
   `reloadData()` para refrescar.
   ============================================================ */

import { create } from "zustand";
import { getSupabaseBrowserClient } from "./supabase/client";
import {
  FACILITATOR, normalizeStage,
  type Admin, type Facilitator, type Initiative, type Org,
  type PulsePoint, type SessionLog, type StageKey, type Team,
} from "./data";

interface GLState {
  orgs: Org[];
  teams: Team[];
  facilitators: Facilitator[];
  admins: Admin[];
  loaded: boolean;
  source: "supabase" | "mock";
  setData: (d: { orgs: Org[]; teams: Team[]; facilitators: Facilitator[]; admins: Admin[]; source: "supabase" | "mock" }) => void;
}

export const useGLStore = create<GLState>((set) => ({
  orgs: [],
  teams: [],
  facilitators: [],
  admins: [],
  loaded: false,
  source: "mock",
  setData: (d) => set({ ...d, loaded: true }),
}));

const numId = (id: string) => parseInt(String(id).replace(/\D/g, ""), 10) || 0;
const byNumId = (a: { id: string }, b: { id: string }) => numId(a.id) - numId(b.id);

function mapFac(f: any): Facilitator {
  return {
    id: f.id, name: f.name, email: f.email, initials: f.initials,
    teams: f.teams, sessionsMonth: f.sessions_month, health: f.health,
    status: f.status, you: f.is_you || undefined, orgId: f.org_id ?? undefined,
  };
}

function mapAdmin(a: any): Admin {
  return {
    id: a.id, name: a.name, email: a.email, initials: a.initials,
    orgName: a.org_name, orgs: a.orgs, facilitators: a.facilitators,
    status: a.status, you: a.is_you || undefined, orgId: a.org_id ?? undefined,
  };
}

function mapOrg(o: any, teams: Team[]): Org {
  return {
    id: o.id, name: o.name, sector: o.sector,
    teams: teams.filter((t) => t.orgId === o.id).length,
    leader: o.leader, leaderRole: o.leader_role,
    contract: o.contract, since: o.since, status: o.status,
    ownerId: o.owner_id ?? undefined, ownerEmail: o.owner_email ?? undefined,
    plan: (o.plan ?? "starter") as Org["plan"], kind: (o.kind ?? "company") as Org["kind"],
  };
}

function mapInitiative(i: any, sessionCount: number): Initiative {
  return {
    id: i.id, teamId: i.team_id, title: i.title, description: i.description ?? undefined,
    stage: normalizeStage(i.stage), status: (i.status ?? "active") as Initiative["status"],
    objectiveId: i.objective_id ?? undefined,
    createdAt: i.created_at ?? undefined, sessionsCount: sessionCount,
    data: i.data ?? undefined,
  };
}

function mapTeam(t: any, initiatives: Initiative[] = []): Team {
  const members = (t.team_members ?? []).map((m: any) => ({ id: m.id, userId: m.user_id ?? undefined, name: m.name, initials: m.initials }));
  // Orden cronológico REAL por created_at (ISO ordena lexicográfico = cronológico);
  // el label "10 jul" ordenaba mal entre meses. pulse[0] = más viejo, [last] = más nuevo.
  const pulse: PulsePoint[] = [...(t.pulse_points ?? [])]
    .sort((a: any, b: any) => String(a.created_at ?? a.date ?? "").localeCompare(String(b.created_at ?? b.date ?? "")))
    .map((p: any): PulsePoint => ({
      label: p.label, date: p.date, confianza: p.confianza, comunic: p.comunic,
      claridad: p.claridad, foco: p.foco, seguridad: p.seguridad,
      dims: (p.dims as Record<string, number>) ?? undefined,
    }));
  // Historial de sesiones: más nueva primero, por created_at (el id base36 no es ordenable).
  const sessions: SessionLog[] = (t.session_logs ?? [])
    .map((s: any): SessionLog => ({
      id: s.id, date: s.date, createdAt: s.created_at ?? undefined, stage: s.stage as StageKey, retro: s.retro,
      pulse: s.pulse, delta: s.delta, out: s.out_text, initiativeId: s.initiative_id ?? undefined,
    }))
    .sort((a: SessionLog, b: SessionLog) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));

  return {
    id: t.id, org: t.organizations?.name ?? "", orgId: t.org_id, name: t.name,
    area: t.area, purpose: t.purpose, clientType: t.client_type,
    facilitator: { ...FACILITATOR }, members,
    psychSafety: t.psych_safety, stage: t.stage as StageKey,
    pulse, sessions, initiatives,
    blocked: t.blocked || undefined, facilitatorId: t.facilitator_id ?? undefined,
    data: (t.data as Team["data"]) ?? undefined,
  };
}

async function fetchAll() {
  const supabase = getSupabaseBrowserClient();
  const [orgsRes, facRes, teamsRes] = await Promise.all([
    supabase.from("organizations").select("*"),
    supabase.from("facilitators").select("*"),
    supabase
      .from("teams")
      .select("*, organizations(name), team_members(*), pulse_points(*), session_logs(*)"),
  ]);
  const err = orgsRes.error || facRes.error || teamsRes.error;
  if (err) throw err;

  // admins es una tabla opcional (puede no existir todavía) → si falla, va vacío.
  let admins: Admin[] = [];
  const adminsRes = await supabase.from("admins").select("*");
  if (!adminsRes.error) admins = (adminsRes.data ?? []).map(mapAdmin).sort(byNumId);

  // initiatives también es opcional (puede no existir todavía) → si falla, sin iniciativas.
  const initsByTeam = new Map<string, Initiative[]>();
  const initRes = await supabase.from("initiatives").select("*").order("created_at", { ascending: true });
  if (!initRes.error) {
    for (const row of (initRes.data ?? []) as any[]) {
      // contamos las sesiones atadas a esta iniciativa dentro de su equipo
      const teamRow = (teamsRes.data ?? []).find((t: any) => t.id === row.team_id);
      const count = (teamRow?.session_logs ?? []).filter((s: any) => s.initiative_id === row.id).length;
      const list = initsByTeam.get(row.team_id) ?? [];
      list.push(mapInitiative(row, count));
      initsByTeam.set(row.team_id, list);
    }
  }

  const teams = (teamsRes.data ?? []).map((t: any) => mapTeam(t, initsByTeam.get(t.id) ?? [])).sort(byNumId);
  const orgs = (orgsRes.data ?? []).map((o: any) => mapOrg(o, teams)).sort(byNumId);
  const facilitators = (facRes.data ?? []).map(mapFac).sort(byNumId);

  // Multi-org: membresías extra de facilitadores (tabla opcional facilitator_orgs).
  const membByEmail = new Map<string, Set<string>>();
  const fo = await supabase.from("facilitator_orgs").select("email, org_id");
  if (!fo.error) {
    for (const row of (fo.data ?? []) as any[]) {
      const e = (row.email ?? "").toLowerCase();
      if (!e) continue;
      const s = membByEmail.get(e) ?? new Set<string>();
      s.add(row.org_id);
      membByEmail.set(e, s);
    }
  }
  // orgIds por facilitador = home ∪ membresías ∪ orgs de equipos que facilita.
  for (const f of facilitators) {
    const set = new Set<string>();
    if (f.orgId) set.add(f.orgId);
    for (const o of membByEmail.get((f.email ?? "").toLowerCase()) ?? []) set.add(o);
    for (const t of teams) if (t.facilitatorId && t.facilitatorId === f.id) set.add(t.orgId);
    f.orgIds = [...set];
  }
  // Objetivos por equipo (tabla opcional: si falta la migración, sigue sin objetivos).
  const objRes = await supabase.from("objectives").select("*").order("created_at", { ascending: true });
  if (!objRes.error) {
    const byTeam = new Map<string, any[]>();
    for (const o of (objRes.data ?? []) as any[]) {
      const list = byTeam.get(o.team_id) ?? []; list.push(o); byTeam.set(o.team_id, list);
    }
    for (const t of teams) {
      t.objectives = (byTeam.get(t.id) ?? []).map((o: any) => ({
        id: o.id, teamId: o.team_id, text: o.text, metric: o.metric ?? undefined,
        target: o.target ?? undefined, horizon: o.horizon ?? undefined, status: o.status ?? "active",
      }));
    }
  }
  // Facilitador real por equipo (mapTeam dejó un placeholder; lo resolvemos con el directorio ya cargado).
  const facById = new Map(facilitators.map((f) => [f.id, f]));
  for (const t of teams) {
    const f = t.facilitatorId ? facById.get(t.facilitatorId) : undefined;
    t.facilitator = f
      ? { name: f.name, initials: f.initials, role: "Facilitador" }
      : { name: "Sin facilitador", initials: "—", role: "Facilitador" };
  }
  return { orgs, teams, facilitators, admins, source: "supabase" as const };
}

let loadingPromise: Promise<void> | null = null;

/** Carga los datos una sola vez (idempotente). */
export function loadData(): Promise<void> {
  if (useGLStore.getState().loaded) return Promise.resolve();
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    try {
      useGLStore.getState().setData(await fetchAll());
    } catch (e) {
      console.warn("[Growthloop] Supabase no disponible:", e);
      useGLStore.getState().setData({ orgs: [], teams: [], facilitators: [], admins: [], source: "mock" });
    }
  })();
  return loadingPromise;
}

/** Re-lee los datos desde Supabase (tras una escritura). */
export async function reloadData(): Promise<void> {
  try {
    useGLStore.getState().setData(await fetchAll());
  } catch (e) {
    console.warn("[Growthloop] No se pudo recargar:", e);
  }
}
