/* ============================================================
   Métricas agregadas para el dashboard por rol. Recibe el alcance
   de equipos del usuario (RLS ya lo filtra: facilitador = sus
   equipos, admin = su org, superadmin = todo) y devuelve los KPIs,
   distribuciones y series que pinta el RoleDashboard.
   ============================================================ */

import type { Team, Org } from "@/lib/data";
import { overallOf, STAGES, CYCLE_STAGES } from "@/lib/data";
import { loopIsClosed, loopSignalMoved } from "@/lib/loop";
import { ciMaturity } from "@/lib/maturity";

export interface DashMetrics {
  teamsCount: number;
  loopsActive: number;
  loopsClosedSignal: number;
  climaNow: number | null;     // 0-100
  climaDelta: number | null;   // puntos vs medición anterior
  commitmentsPct: number | null;
  commitmentsDone: number;
  commitmentsTotal: number;
  sessions: number;
  overdue: number;
  loopsByStage: { label: string; value: number; color: string }[];
  byTeamClima: { label: string; value: number; color: string }[];
  climaTrend: number[];
}

const climaColor = (v: number) => (v >= 70 ? "var(--success)" : v >= 50 ? "var(--warning)" : "var(--risk)");

export function dashMetrics(teams: Team[]): DashMetrics {
  const allInits = teams.flatMap((t) => t.initiatives ?? []);
  const active = allInits.filter((i) => i.status === "active");
  const now = Date.now();

  const loopsActive = active.length;
  const loopsClosedSignal = allInits.filter((i) => loopIsClosed(i) && loopSignalMoved(i)).length;

  // Clima: promedio del último pulso de cada equipo, y delta vs el anterior.
  const latest: number[] = [], prev: number[] = [];
  for (const t of teams) {
    const p = t.pulse ?? [];
    if (p.length) latest.push(overallOf(p[p.length - 1]));
    if (p.length >= 2) prev.push(overallOf(p[p.length - 2]));
  }
  const avg = (a: number[]) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
  const climaNow = avg(latest);
  const climaPrev = avg(prev);
  const climaDelta = climaNow != null && climaPrev != null ? climaNow - climaPrev : null;

  // Compromisos cumplidos (sobre los loops activos).
  let done = 0, total = 0;
  for (const i of active) {
    for (const a of i.data?.follow?.actionStatus ?? []) { total++; if (a.status === "done") done++; }
  }
  const commitmentsPct = total ? Math.round((done / total) * 100) : null;
  const commitmentsDone = done, commitmentsTotal = total;

  const sessions = teams.reduce((a, t) => a + (t.sessions?.length ?? 0), 0);

  // Vencidos: compromisos con fecha pasada sin hacer + consolidaciones vencidas.
  let overdue = 0;
  for (const i of active) {
    for (const a of i.data?.follow?.actionStatus ?? []) {
      if (a.due && a.status !== "done" && new Date(a.due).getTime() < now) overdue++;
    }
    const cons = i.data?.consolidate;
    if (cons?.pending && cons.due && new Date(cons.due).getTime() < now) overdue++;
  }

  // Loops por etapa (activos).
  const byStage = new Map<string, number>();
  for (const i of active) byStage.set(i.stage, (byStage.get(i.stage) ?? 0) + 1);
  const loopsByStage = CYCLE_STAGES
    .filter((s) => byStage.get(s))
    .map((s) => ({ label: STAGES[s]?.label ?? s, value: byStage.get(s)!, color: STAGES[s]?.color ?? "var(--ink-2)" }));

  // Clima por equipo.
  const byTeamClima = teams
    .filter((t) => (t.pulse?.length ?? 0) > 0)
    .map((t) => { const v = overallOf(t.pulse[t.pulse.length - 1]); return { label: t.name, value: v, color: climaColor(v) }; })
    .sort((a, b) => a.value - b.value);

  // Tendencia del clima (promedio por índice de pulso).
  const maxLen = Math.max(0, ...teams.map((t) => t.pulse?.length ?? 0));
  const climaTrend: number[] = [];
  for (let i = 0; i < maxLen; i++) {
    const vals = teams.map((t) => t.pulse?.[i]).filter((p): p is NonNullable<typeof p> => !!p).map((p) => overallOf(p));
    if (vals.length) climaTrend.push(Math.round(vals.reduce((a, b) => a + b, 0) / vals.length));
  }

  return { teamsCount: teams.length, loopsActive, loopsClosedSignal, climaNow, climaDelta, commitmentsPct, commitmentsDone, commitmentsTotal, sessions, overdue, loopsByStage, byTeamClima, climaTrend };
}

/* ── Lente de plataforma (superadmin): agrupado por organización ── */
const MATURITY_LABELS = ["Incipiente", "En formación", "En práctica", "Consolidada", "Referente"];
const MATURITY_COLORS = ["var(--risk)", "var(--warning)", "var(--st-proof)", "var(--info)", "var(--green)"];
const PLAN_META: Record<string, { label: string; color: string }> = {
  starter: { label: "Starter", color: "var(--ink-2)" },
  pro: { label: "Pro", color: "var(--green)" },
  business: { label: "Business", color: "var(--violet)" },
};

export interface PlatformBreakdown {
  orgsCount: number;
  byOrgClima: { label: string; value: number; color: string }[];
  orgsByPlan: { label: string; value: number; color: string }[];
  teamsByMaturity: { label: string; value: number; color: string }[];
}

export function platformBreakdown(teams: Team[], orgs: Org[]): PlatformBreakdown {
  // Clima promedio por organización.
  const byOrg = new Map<string, number[]>();
  for (const t of teams) {
    const p = t.pulse ?? [];
    if (!p.length) continue;
    const k = t.org || "—";
    const arr = byOrg.get(k) ?? [];
    arr.push(overallOf(p[p.length - 1]));
    byOrg.set(k, arr);
  }
  const byOrgClima = [...byOrg.entries()]
    .map(([label, vals]) => { const v = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length); return { label, value: v, color: climaColor(v) }; })
    .sort((a, b) => a.value - b.value);

  // Organizaciones por plan.
  const planCount = new Map<string, number>();
  for (const o of orgs) { const k = (o.plan ?? "starter").toLowerCase().trim(); planCount.set(k, (planCount.get(k) ?? 0) + 1); }
  const orgsByPlan = [...planCount.entries()].map(([k, value]) => ({ label: PLAN_META[k]?.label ?? k, value, color: PLAN_META[k]?.color ?? "var(--ink-2)" }));

  // Equipos por nivel de madurez.
  const matCount = [0, 0, 0, 0, 0];
  for (const t of teams) matCount[Math.round(ciMaturity(t).overall)]++;
  const teamsByMaturity = matCount
    .map((value, i) => ({ label: MATURITY_LABELS[i], value, color: MATURITY_COLORS[i] }))
    .filter((s) => s.value > 0);

  return { orgsCount: orgs.length, byOrgClima, orgsByPlan, teamsByMaturity };
}
