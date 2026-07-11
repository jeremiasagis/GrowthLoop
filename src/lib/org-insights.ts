/* ============================================================
   Insights de organización (solo admin) — cruces transversales
   sobre los equipos de la org: clima por dimensión × equipo,
   madurez comparada, ranking de riesgo y roll-up de focos de
   desarrollo. Todo cliente-side sobre el alcance que la RLS ya
   le da al admin (los equipos de sus organizaciones).
   ============================================================ */

import { overallOf, dimVal, teamPulseDims, to5, type PulseDim, type Team } from "@/lib/data";
import { ciMaturity } from "@/lib/maturity";
import { getChallenges, type Challenge } from "@/lib/challenges";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const climaColor = (v: number) => (v >= 70 ? "var(--success)" : v >= 50 ? "var(--warning)" : "var(--risk)");

/* ── Heatmap: clima por dimensión × equipo ── */
export interface HeatCell { value: number | null; color: string }
export interface HeatRow { team: string; teamId: string; overall: number | null; cells: HeatCell[] }
export interface ClimaHeatmap { dims: PulseDim[]; rows: HeatRow[]; colAvg: (number | null)[] }

export function climaHeatmap(teams: Team[]): ClimaHeatmap {
  // Columnas = unión de dimensiones presentes en los equipos (o las de fábrica).
  const dimMap = new Map<string, PulseDim>();
  for (const t of teams) for (const d of teamPulseDims(t)) if (!dimMap.has(d.key)) dimMap.set(d.key, d);
  const dims = [...dimMap.values()];

  const rows: HeatRow[] = teams.map((t) => {
    const p = t.pulse ?? [];
    const last = p.length ? p[p.length - 1] : null;
    const cells: HeatCell[] = dims.map((d) => {
      const v = last ? dimVal(last, d.key) : undefined;
      return v == null ? { value: null, color: "var(--card-2)" } : { value: v, color: climaColor(v) };
    });
    return { team: t.name, teamId: t.id, overall: last ? overallOf(last) : null, cells };
  });

  const colAvg = dims.map((_, ci) => {
    const vals = rows.map((r) => r.cells[ci].value).filter((v): v is number => v != null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  });

  return { dims, rows, colAvg };
}

/* ── Madurez comparada ── */
export interface MaturityRow { team: string; teamId: string; overall: number; label: string }
export function maturityRanking(teams: Team[]): MaturityRow[] {
  return teams
    .map((t) => { const m = ciMaturity(t); return { team: t.name, teamId: t.id, overall: m.overall, label: m.overallLabel }; })
    .sort((a, b) => b.overall - a.overall);
}

/* ── Ranking de riesgo / atención ── */
export interface RiskRow { team: string; teamId: string; score: number; flags: string[] }
const DAY = 86400000;

export function riskRanking(teams: Team[], now = Date.now()): RiskRow[] {
  const rows: RiskRow[] = teams.map((t) => {
    const flags: string[] = [];
    let score = 0;
    const p = t.pulse ?? [];
    const last = p.length ? p[p.length - 1] : null;

    // Clima general bajo o cayendo.
    if (last) {
      const clima = overallOf(last);
      if (clima < 50) { score += 30; flags.push("Clima crítico"); }
      else if (clima < 60) { score += 15; flags.push("Clima flojo"); }
      if (p.length >= 2) { const d = clima - overallOf(p[p.length - 2]); if (d <= -6) { score += 15; flags.push("Clima cayendo"); } }
      // Dimensiones sensibles.
      const conf = dimVal(last, "confianza"); if (conf != null && conf < 55) { score += 15; flags.push("Confianza baja"); }
      const carga = dimVal(last, "carga"); if (carga != null && carga < 45) { score += 12; flags.push("Sobrecarga"); }
      const rec = dimVal(last, "reconocimiento"); if (rec != null && rec < 45) { score += 8; flags.push("Poco reconocimiento"); }
    } else {
      score += 10; flags.push("Sin clima medido");
    }

    // Inactividad.
    const lastSession = t.data?.lastSessionAt ?? (t.sessions ?? []).map((s) => s.createdAt).filter(Boolean).sort().pop();
    const daysIdle = lastSession ? Math.floor((now - new Date(lastSession).getTime()) / DAY) : null;
    if (daysIdle == null) { score += 12; flags.push("Nunca activó el loop"); }
    else if (daysIdle > 45) { score += 20; flags.push(`Inactivo ${daysIdle}d`); }
    else if (daysIdle > 21) { score += 10; flags.push(`Sin sesiones ${daysIdle}d`); }

    // Compromisos vencidos.
    let overdue = 0;
    for (const i of (t.initiatives ?? []).filter((x) => x.status === "active")) {
      for (const a of i.data?.follow?.actionStatus ?? []) {
        if (a.due && a.status !== "done" && new Date(a.due).getTime() < now) overdue++;
      }
    }
    if (overdue > 0) { score += Math.min(20, overdue * 5); flags.push(`${overdue} compromiso${overdue > 1 ? "s" : ""} vencido${overdue > 1 ? "s" : ""}`); }

    return { team: t.name, teamId: t.id, score: Math.min(100, score), flags };
  });
  return rows.sort((a, b) => b.score - a.score);
}

/* ── Roll-up de focos de desarrollo (async) ── */
export interface FocusRollup {
  totalIndividual: number;
  done: number;
  doing: number;
  open: number;
  byDomain: { key: string; count: number }[];
  selfProposed: number;
}

export async function focusRollup(teams: Team[]): Promise<FocusRollup> {
  const all = (await Promise.all(teams.map((t) => getChallenges(t.id)))).flat();
  const indiv = all.filter((c: Challenge) => c.scope === "individual" && c.status !== "archived");
  const byDomain = new Map<string, number>();
  let done = 0, doing = 0, open = 0, self = 0;
  for (const c of indiv) {
    if (c.status === "done") done++; else if (c.status === "doing") doing++; else open++;
    if (c.source === "self") self++;
    const k = c.domain ?? "otro";
    byDomain.set(k, (byDomain.get(k) ?? 0) + 1);
  }
  return {
    totalIndividual: indiv.length, done, doing, open, selfProposed: self,
    byDomain: [...byDomain.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count),
  };
}

export const climaCellColor = climaColor;
export const toFive = to5;

/* ── 360 agregado por organización (vía RPC con anonimato) ── */
export interface OrgCompetency { key: string; label: string; peer: number | null; self: number | null; nPeer: number; nSubjects: number }

export async function getOrgCompetencyAggregate(): Promise<OrgCompetency[]> {
  const sb = getSupabaseBrowserClient();
  const { data, error } = await sb.rpc("get_org_competency_aggregate");
  if (error || !data) return [];
  return (data as OrgCompetency[]).filter((c) => c.nPeer > 0 || c.self != null);
}

/* ── Contexto para la IA (texto agregado y anónimo) ── */
export function orgInsightContext(teams: Team[], rollup?: FocusRollup | null): string {
  const L: string[] = [];
  L.push(`Organización con ${teams.length} equipos.`);

  const heat = climaHeatmap(teams);
  L.push(`\nClima por dimensión (promedio org, 0-100):`);
  heat.dims.forEach((d, i) => { const v = heat.colAvg[i]; if (v != null) L.push(`- ${d.label}: ${v}`); });

  L.push(`\nClima general por equipo (0-100):`);
  for (const r of heat.rows) {
    const lows = r.cells.map((c, i) => ({ label: heat.dims[i].label, v: c.value })).filter((x) => x.v != null && x.v < 55);
    L.push(`- ${r.team}: ${r.overall ?? "s/d"}${lows.length ? ` · flojo en ${lows.map((x) => `${x.label} (${x.v})`).join(", ")}` : ""}`);
  }

  L.push(`\nMadurez de mejora continua por equipo:`);
  for (const m of maturityRanking(teams)) L.push(`- ${m.team}: ${m.label}`);

  const risk = riskRanking(teams).filter((r) => r.score >= 25);
  if (risk.length) {
    L.push(`\nEquipos con señales de atención (riesgo 0-100):`);
    for (const r of risk) L.push(`- ${r.team} (riesgo ${r.score}): ${r.flags.join(", ")}`);
  } else {
    L.push(`\nNingún equipo en zona de riesgo alto.`);
  }

  if (rollup && rollup.totalIndividual > 0) {
    L.push(`\nDesarrollo individual: ${rollup.totalIndividual} focos activos (${rollup.done} logrados, ${rollup.doing} en progreso, ${rollup.selfProposed} propuestos por la propia gente).`);
    if (rollup.byDomain.length) L.push(`Focos por área: ${rollup.byDomain.map((d) => `${d.key} (${d.count})`).join(", ")}.`);
  }
  return L.join("\n");
}
