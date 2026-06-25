"use client";

/* ============================================================
   Dashboard por rol — el panorama "BI" sobre el alcance del
   usuario (facilitador = sus equipos, admin = su org, superadmin
   = la plataforma). KPIs con Δ + distribución (loops por etapa) +
   barras por equipo (clima). Mismo lenguaje visual para los tres.
   ============================================================ */

import { Card } from "@/components/ui";
import { KpiCard, Donut, MiniBars } from "@/components/charts";
import { dashMetrics } from "@/lib/dashboard";
import type { Team } from "@/lib/data";

export function RoleDashboard({ teams, role, go }: { teams: Team[]; role?: string; go?: (href: string) => void }) {
  if (!teams.length) return null;
  const m = dashMetrics(teams);
  const scope = role === "superadmin" ? "la plataforma" : role === "admin" ? "tu organización" : "tus equipos";

  return (
    <div style={{ marginBottom: 26 }}>
      <div className="eyebrow" style={{ marginBottom: 12 }}>Panorama de {scope}</div>

      {/* KPIs con Δ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(168px,1fr))", gap: 12, marginBottom: 12 }} className="stagger">
        <KpiCard title="Loops activos" sub="en curso" value={m.loopsActive} />
        <KpiCard title="Loops cerrados" sub="con señal movida" value={m.loopsClosedSignal} accent="var(--success)" />
        <KpiCard title="Clima" sub="del equipo (0-100)" value={m.climaNow != null ? m.climaNow : "—"} delta={m.climaDelta ?? undefined} deltaSuffix="" spark={m.climaTrend} accent={m.climaNow != null && m.climaNow < 50 ? "var(--risk)" : m.climaNow != null && m.climaNow < 70 ? "var(--warning)" : "var(--green)"} />
        <KpiCard title="Compromisos" sub="cumplidos" value={m.commitmentsPct != null ? `${m.commitmentsPct}%` : "—"} accent="var(--st-follow)" />
        <KpiCard title="Sesiones" sub="realizadas" value={m.sessions} accent="var(--violet)" />
        <KpiCard title="Vencidos" sub="por atender" value={m.overdue} accent={m.overdue ? "var(--risk)" : "var(--green)"} onClick={role === "facilitator" && go ? () => go("/mis-loops") : undefined} />
      </div>

      {/* Distribución + por equipo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px,1fr))", gap: 12 }}>
        {m.loopsByStage.length > 0 && (
          <Card pad={18}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Loops por etapa</div>
            <Donut segments={m.loopsByStage} size={140}>
              <div>
                <div className="num" style={{ fontSize: "var(--t-xl)", fontWeight: 800, lineHeight: 1 }}>{m.loopsActive}</div>
                <div className="muted" style={{ fontSize: 10 }}>activos</div>
              </div>
            </Donut>
          </Card>
        )}
        {m.byTeamClima.length > 0 && (
          <Card pad={18}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Clima por equipo</div>
            <MiniBars items={m.byTeamClima} max={100} valueFmt={(v) => `${v}`} />
          </Card>
        )}
      </div>
    </div>
  );
}
