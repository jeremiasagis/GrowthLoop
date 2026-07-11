"use client";

/* ============================================================
   Organización — el cruce transversal para el admin / RRHH.
   Reúne los equipos de la organización en una sola vista:
   clima por dimensión × equipo, madurez comparada, ranking de
   atención y desarrollo individual agregado. Solo admin (y super).
   ============================================================ */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Card, EmptyState, SectionTitle, Sparkline } from "@/components/ui";
import { KpiCard } from "@/components/charts";
import { Skeleton } from "@/components/Skeleton";
import { useAuth } from "@/lib/auth/AuthContext";
import { getTeams } from "@/lib/repository";
import { dashMetrics } from "@/lib/dashboard";
import { climaHeatmap, maturityRanking, riskRanking, focusRollup, orgInsightContext, toFive, type FocusRollup } from "@/lib/org-insights";
import { OrgInsightPanel } from "@/components/OrgInsightPanel";
import { DOMAIN_META } from "@/lib/challenges";

const MATURITY_COLORS = ["var(--risk)", "var(--warning)", "var(--st-proof)", "var(--info)", "var(--green)"];

export default function OrganizacionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const teams = getTeams();
  const [rollup, setRollup] = useState<FocusRollup | null>(null);

  useEffect(() => { let on = true; focusRollup(teams).then((r) => { if (on) setRollup(r); }); return () => { on = false; }; /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [teams.length]);

  const m = useMemo(() => dashMetrics(teams), [teams]);
  const heat = useMemo(() => climaHeatmap(teams), [teams]);
  const maturity = useMemo(() => maturityRanking(teams), [teams]);
  const risk = useMemo(() => riskRanking(teams), [teams]);

  if (user && user.role !== "admin" && user.role !== "superadmin") {
    return <div className="screen-pad"><Card pad={0}><EmptyState icon="Lock" title="Solo para administración">Esta vista cruza información de los equipos de la organización y es exclusiva del rol admin.</EmptyState></Card></div>;
  }
  if (!teams.length) {
    return <div className="screen-pad"><Card pad={0}><EmptyState icon="Building2" title="Todavía no hay equipos">Cuando tus facilitadores creen equipos, acá vas a ver el panorama cruzado de toda la organización.</EmptyState></Card></div>;
  }

  const attention = risk.filter((r) => r.score >= 25);

  return (
    <div className="screen-pad">
      <div style={{ marginBottom: 22 }}>
        <div className="eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--violet)", marginBottom: 6 }}><Icon name="Network" size={14} /> Vista de organización · solo admin</div>
        <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Cultura y desarrollo de la organización</h1>
        <p className="muted" style={{ marginTop: 4 }}>El cruce de tus <b style={{ color: "var(--ink-1)" }}>{teams.length}</b> {teams.length === 1 ? "equipo" : "equipos"}: clima, madurez, atención y desarrollo de la gente.</p>
      </div>

      {/* KPIs de la org · bento */}
      {(() => {
        const climaAccent = m.climaNow != null && m.climaNow < 50 ? "var(--risk)" : m.climaNow != null && m.climaNow < 70 ? "var(--warning)" : "var(--green)";
        return (
          <div className="gl-bento" style={{ marginBottom: 26 }}>
            <Card className="gl-bento-hero" pad={20} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", background: `linear-gradient(150deg, color-mix(in srgb, ${climaAccent} 12%, var(--card)), var(--card) 62%)`, borderColor: `color-mix(in srgb, ${climaAccent} 32%, var(--line))` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div className="eyebrow" style={{ color: "var(--ink-2)" }}>Clima de la organización</div>
                {m.climaDelta != null && m.climaDelta !== 0 && <span style={{ fontSize: "var(--t-xs)", fontWeight: 800, color: m.climaDelta > 0 ? "var(--success)" : "var(--risk)" }}>{m.climaDelta > 0 ? "▲ +" : "▼ "}{m.climaDelta}</span>}
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span className="num" style={{ fontSize: "var(--t-4xl)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 0.9, color: climaAccent }}>{m.climaNow ?? "—"}</span>
                  <span className="muted num" style={{ fontSize: "var(--t-md)", fontWeight: 700 }}>/100</span>
                </div>
                {m.climaTrend.length > 1 && <Sparkline data={m.climaTrend} color={climaAccent} w={160} h={44} />}
              </div>
              <div className="muted" style={{ fontSize: "var(--t-xs)" }}>Promedio del último pulso de los {teams.length} {teams.length === 1 ? "equipo" : "equipos"}.</div>
            </Card>
            <KpiCard title="Equipos" sub="en la organización" value={teams.length} accent="var(--violet)" />
            <KpiCard title="Loops activos" sub="en curso" value={m.loopsActive} />
            <KpiCard title="Compromisos" sub="cumplidos" value={m.commitmentsPct != null ? `${m.commitmentsPct}%` : "—"} accent="var(--st-follow)" />
            <KpiCard title="Equipos a atender" sub="riesgo ≥ 25" value={attention.length} accent={attention.length ? "var(--risk)" : "var(--green)"} onClick={attention.length ? () => document.getElementById("org-atencion")?.scrollIntoView({ behavior: "smooth" }) : undefined} />
          </div>
        );
      })()}

      {/* Preguntale a tus datos (IA) */}
      <div style={{ marginBottom: 26 }}>
        <OrgInsightPanel buildContext={() => orgInsightContext(teams, rollup)} />
      </div>

      {/* Heatmap de clima por dimensión × equipo */}
      <div style={{ marginBottom: 26 }}>
        <SectionTitle icon="Grid2x2" sub="Dónde está el rojo cultural, transversal a los equipos">Clima por dimensión × equipo</SectionTitle>
        <Card pad={16} style={{ marginTop: 10, overflowX: "auto" }}>
          <table style={{ borderCollapse: "separate", borderSpacing: 4, width: "100%", minWidth: 520 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", fontSize: "var(--t-xs)", color: "var(--ink-2)", fontWeight: 700, padding: "0 8px 6px", position: "sticky", left: 0, background: "var(--card)" }}>Equipo</th>
                {heat.dims.map((d) => (
                  <th key={d.key} title={d.label} style={{ fontSize: 10, color: "var(--ink-2)", fontWeight: 700, padding: "0 4px 6px", minWidth: 46, verticalAlign: "bottom" }}>
                    <div style={{ maxWidth: 60, margin: "0 auto", lineHeight: 1.1 }}>{d.label.split(" ")[0]}</div>
                  </th>
                ))}
                <th style={{ fontSize: 10, color: "var(--ink-2)", fontWeight: 700, padding: "0 4px 6px" }}>Prom.</th>
              </tr>
            </thead>
            <tbody>
              {heat.rows.map((r) => (
                <tr key={r.teamId}>
                  <td style={{ fontSize: "var(--t-xs)", fontWeight: 600, padding: "0 8px", whiteSpace: "nowrap", position: "sticky", left: 0, background: "var(--card)" }}>
                    <button onClick={() => router.push(`/equipos/${r.teamId}`)} style={{ color: "var(--ink-0)" }}>{r.team}</button>
                  </td>
                  {r.cells.map((c, i) => (
                    <td key={i} style={{ textAlign: "center" }}>
                      <div title={c.value != null ? `${Math.round(toFive(c.value) * 10) / 10}/5` : "sin dato"} style={{ height: 30, borderRadius: "var(--r-sm)", background: c.value != null ? `color-mix(in srgb, ${c.color} 22%, var(--card))` : "var(--card-2)", border: `1px solid ${c.value != null ? `color-mix(in srgb, ${c.color} 45%, transparent)` : "var(--line)"}`, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800, color: c.value != null ? c.color : "var(--ink-3)" }}>
                        {c.value != null ? c.value : "—"}
                      </div>
                    </td>
                  ))}
                  <td style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: r.overall != null ? (r.overall >= 70 ? "var(--success)" : r.overall >= 50 ? "var(--warning)" : "var(--risk)") : "var(--ink-3)" }}>{r.overall ?? "—"}</td>
                </tr>
              ))}
              <tr>
                <td style={{ fontSize: "var(--t-xs)", fontWeight: 700, padding: "6px 8px 0", color: "var(--ink-2)", position: "sticky", left: 0, background: "var(--card)" }}>Promedio org</td>
                {heat.colAvg.map((v, i) => (
                  <td key={i} style={{ textAlign: "center", paddingTop: 6, fontSize: 11, fontWeight: 800, color: v != null ? (v >= 70 ? "var(--success)" : v >= 50 ? "var(--warning)" : "var(--risk)") : "var(--ink-3)" }}>{v ?? "—"}</td>
                ))}
                <td />
              </tr>
            </tbody>
          </table>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px,1fr))", gap: 16, marginBottom: 26 }}>
        {/* Madurez comparada */}
        <div>
          <SectionTitle icon="Gauge" sub="Qué tan instalado está el hábito de mejora">Madurez comparada</SectionTitle>
          <Card pad={16} style={{ marginTop: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {maturity.map((r) => {
                const pct = Math.round((r.overall / 4) * 100);
                const color = MATURITY_COLORS[Math.round(r.overall)] ?? "var(--ink-2)";
                return (
                  <div key={r.teamId}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--t-xs)", marginBottom: 4 }}>
                      <button onClick={() => router.push(`/equipos/${r.teamId}`)} style={{ fontWeight: 600, color: "var(--ink-0)" }}>{r.team}</button>
                      <span style={{ fontWeight: 700, color }}>{r.label}</span>
                    </div>
                    <div style={{ height: 7, borderRadius: 99, background: "var(--card-2)", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99 }} /></div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Desarrollo individual agregado */}
        <div>
          <SectionTitle icon="Sprout" sub="En qué está creciendo la gente de la org">Desarrollo de las personas</SectionTitle>
          <Card pad={16} style={{ marginTop: 10 }}>
            {!rollup ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 10 }}>{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={54} r={8} />)}</div>
                <Skeleton h={10} w="30%" />
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} h={14} />)}
              </div>
            ) : rollup.totalIndividual === 0 ? (
              <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>Todavía no hay focos de desarrollo individuales. Aparecen cuando el facilitador asigna focos en un 1-a-1 o la gente propone los suyos.</p>
            ) : (
              <>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                  <Stat label="Focos activos" value={rollup.totalIndividual} color="var(--violet)" />
                  <Stat label="Logrados" value={rollup.done} color="var(--success)" />
                  <Stat label="En progreso" value={rollup.doing} color="var(--info)" />
                  <Stat label="Propuestos por la gente" value={rollup.selfProposed} color="var(--green)" />
                </div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Por área</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {rollup.byDomain.map((d) => {
                    const dm = DOMAIN_META[d.key] ?? DOMAIN_META.otro;
                    const pct = Math.round((d.count / rollup.totalIndividual) * 100);
                    return (
                      <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Icon name={dm.icon} size={14} style={{ color: dm.color, flexShrink: 0 }} />
                        <span style={{ fontSize: "var(--t-xs)", fontWeight: 600, minWidth: 90 }}>{dm.label}</span>
                        <div style={{ flex: 1, height: 6, borderRadius: 99, background: "var(--card-2)", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: dm.color, borderRadius: 99 }} /></div>
                        <span className="num muted" style={{ fontSize: "var(--t-xs)", width: 22, textAlign: "right" }}>{d.count}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Ranking de atención */}
      <div id="org-atencion">
        <SectionTitle icon="TriangleAlert" sub="Dónde poner el ojo primero — clima, inactividad y compromisos">Equipos que piden atención</SectionTitle>
        <Card pad={16} style={{ marginTop: 10 }}>
          {attention.length === 0 ? (
            <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>Ningún equipo en zona de riesgo ahora mismo. 🎉</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {attention.map((r) => {
                const color = r.score >= 55 ? "var(--risk)" : r.score >= 35 ? "var(--warning)" : "var(--st-proof)";
                return (
                  <button key={r.teamId} onClick={() => router.push(`/equipos/${r.teamId}`)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", background: "var(--card-2)", border: "1px solid var(--line)", borderLeft: `3px solid ${color}`, borderRadius: "var(--r-md)", textAlign: "left" }}>
                    <div style={{ width: 40, textAlign: "center", flex: "none" }}>
                      <div className="num" style={{ fontSize: "var(--t-lg)", fontWeight: 800, color, lineHeight: 1 }}>{r.score}</div>
                      <div className="muted" style={{ fontSize: 9 }}>riesgo</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{r.team}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                        {r.flags.map((f, i) => <span key={i} style={{ fontSize: "var(--t-xs)", fontWeight: 600, padding: "2px 8px", borderRadius: "var(--r-full)", background: "var(--card)", border: "1px solid var(--line)", color: "var(--ink-2)" }}>{f}</span>)}
                      </div>
                    </div>
                    <Icon name="ChevronRight" size={16} style={{ color: "var(--ink-3)", flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ flex: 1, minWidth: 100, padding: "10px 12px", background: "var(--card-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
      <div className="num" style={{ fontSize: "var(--t-xl)", fontWeight: 800, color }}>{value}</div>
      <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 1 }}>{label}</div>
    </div>
  );
}
