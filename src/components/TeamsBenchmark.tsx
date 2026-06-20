"use client";

/* ============================================================
   Benchmark intra-organización: compara los equipos de un mismo
   cliente entre sí (clima, etapa, actividad, loops, ciclos
   cerrados y % de compromisos cumplidos). Solo agregados que ya
   tenés; resalta los extremos para ver de un vistazo quién va
   bien y quién necesita atención.
   ============================================================ */

import { Icon } from "@/components/icon";
import { Card, SectionTitle, StageBadge } from "@/components/ui";
import { getInitiatives } from "@/lib/repository";
import { overallOf, teamLiveStage, to5, type Team } from "@/lib/data";

type Metrics = {
  team: Team;
  stage: ReturnType<typeof teamLiveStage>;
  clima: number | null;
  trend: number | null;
  confianza: number | null;
  active: number;
  closed: number;
  commitPct: number | null;
  daysIdle: number | null;
};

function metricsOf(team: Team, nowMs: number): Metrics {
  const inits = getInitiatives(team.id);
  const active = inits.filter((i) => i.status === "active");
  const closed = inits.filter((i) => i.status === "done" || !!i.data?.learn?.decision);
  const pulse = team.pulse ?? [];
  const clima = pulse.length ? overallOf(pulse[pulse.length - 1]) : null;
  const trend = pulse.length >= 2 ? overallOf(pulse[pulse.length - 1]) - overallOf(pulse[0]) : null;
  let cTotal = 0, cDone = 0;
  for (const i of active) {
    const d = i.data ?? {};
    const statusBy = new Map((d.follow?.actionStatus ?? []).map((a) => [a.text, a.status]));
    const seen = new Set<string>();
    for (const a of [...(d.proof?.actions ?? []), ...(d.follow?.newActions ?? [])]) {
      const t = (a.text ?? "").trim();
      if (!t || seen.has(t)) continue;
      seen.add(t); cTotal++;
      if (statusBy.get(t) === "done") cDone++;
    }
  }
  return {
    team, stage: teamLiveStage(team) ?? team.stage,
    clima, trend,
    confianza: team.psychSafety > 0 ? to5(team.psychSafety) : null,
    active: active.length, closed: closed.length,
    commitPct: cTotal ? Math.round((cDone / cTotal) * 100) : null,
    daysIdle: team.data?.lastSessionAt ? Math.floor((nowMs - new Date(team.data.lastSessionAt).getTime()) / 86400000) : null,
  };
}

const climaColor = (v: number | null) => v == null ? "var(--ink-3)" : v >= 70 ? "var(--success)" : v >= 55 ? "var(--info)" : v >= 40 ? "var(--warning)" : "var(--risk)";
const Th = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
  <th style={{ textAlign: right ? "right" : "left", padding: "8px 10px", fontSize: "var(--t-xs)", fontWeight: 700, color: "var(--ink-3)", whiteSpace: "nowrap", position: "sticky", top: 0, background: "var(--bg-2)" }}>{children}</th>
);
const Td = ({ children, right, color }: { children: React.ReactNode; right?: boolean; color?: string }) => (
  <td style={{ textAlign: right ? "right" : "left", padding: "9px 10px", fontSize: "var(--t-sm)", color, whiteSpace: "nowrap" }}>{children}</td>
);

function OrgTable({ orgName, teams, nowMs }: { orgName: string; teams: Team[]; nowMs: number }) {
  const rows = teams.map((t) => metricsOf(t, nowMs));
  // Extremos de clima (para resaltar) entre los que tienen dato.
  const climas = rows.map((r) => r.clima).filter((v): v is number => v != null);
  const best = climas.length ? Math.max(...climas) : null;
  const worst = climas.length ? Math.min(...climas) : null;

  return (
    <Card pad={20}>
      <SectionTitle icon="BarChart3" sub={`${teams.length} equipos · comparados entre sí`}>{orgName}</SectionTitle>
      <div style={{ overflowX: "auto", marginTop: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line-2)" }}>
              <Th>Equipo</Th><Th>Etapa</Th><Th right>Clima</Th><Th right>Tendencia</Th>
              <Th right>Confianza</Th><Th right>Loops activos</Th><Th right>Ciclos cerrados</Th>
              <Th right>Compromisos</Th><Th right>Inactividad</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isBest = r.clima != null && r.clima === best && best !== worst;
              const isWorst = r.clima != null && r.clima === worst && best !== worst;
              return (
                <tr key={r.team.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <Td><span style={{ fontWeight: 700 }}>{r.team.name}</span>{r.team.area && <span className="muted" style={{ fontSize: "var(--t-xs)" }}> · {r.team.area}</span>}</Td>
                  <Td><StageBadge stage={r.stage ?? "queue"} size="sm" /></Td>
                  <Td right>
                    {r.clima == null ? <span className="muted">—</span> : (
                      <span className="num" style={{ fontWeight: 800, color: climaColor(r.clima), display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {isBest && <Icon name="Crown" size={12} style={{ color: "var(--success)" }} />}
                        {isWorst && <Icon name="ArrowDown" size={12} style={{ color: "var(--risk)" }} />}
                        {r.clima}
                      </span>
                    )}
                  </Td>
                  <Td right>
                    {r.trend == null ? <span className="muted">—</span> : (
                      <span className="num" style={{ color: r.trend > 2 ? "var(--success)" : r.trend < -2 ? "var(--risk)" : "var(--ink-2)" }}>
                        {r.trend > 2 ? "▲" : r.trend < -2 ? "▼" : "→"} {r.trend > 0 ? "+" : ""}{r.trend}
                      </span>
                    )}
                  </Td>
                  <Td right color={r.confianza != null && r.confianza < 3 ? "var(--warning)" : undefined}><span className="num">{r.confianza != null ? `${r.confianza.toFixed(1)}/5` : "—"}</span></Td>
                  <Td right><span className="num">{r.active}</span></Td>
                  <Td right><span className="num" style={{ color: r.closed > 0 ? "var(--st-learn)" : "var(--ink-3)" }}>{r.closed}</span></Td>
                  <Td right><span className="num" style={{ color: r.commitPct == null ? "var(--ink-3)" : r.commitPct >= 70 ? "var(--success)" : r.commitPct >= 40 ? "var(--warning)" : "var(--risk)" }}>{r.commitPct != null ? `${r.commitPct}%` : "—"}</span></Td>
                  <Td right color={r.daysIdle != null && r.daysIdle >= 14 ? "var(--warning)" : undefined}><span className="num">{r.daysIdle != null ? `${r.daysIdle}d` : "—"}</span></Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function TeamsBenchmark({ teams }: { teams: Team[] }) {
  const nowMs = Date.now();
  // Agrupar por organización; el benchmark solo tiene sentido con 2+ equipos.
  const byOrg = new Map<string, { name: string; teams: Team[] }>();
  for (const t of teams) {
    const g = byOrg.get(t.orgId) ?? { name: t.org || "Organización", teams: [] };
    g.teams.push(t);
    byOrg.set(t.orgId, g);
  }
  const groups = [...byOrg.values()].filter((g) => g.teams.length >= 2);
  if (!groups.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 22 }}>
      <div>
        <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, letterSpacing: "-0.02em" }}>Benchmark de equipos</h2>
        <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 2 }}>Compará los equipos de una organización entre sí. La corona marca el mejor clima; la flecha roja, el que más necesita atención.</p>
      </div>
      {groups.map((g) => <OrgTable key={g.name} orgName={g.name} teams={g.teams} nowMs={nowMs} />)}
    </div>
  );
}
