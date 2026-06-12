"use client";

import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { getFacilitators, getTeam } from "@/lib/repository";
import { PULSE_DIMS, STAGES, dimVal, overallOf, to5, type Initiative } from "@/lib/data";

const C = {
  page: "#eef1f5", doc: "#ffffff", ink: "#0f172a", soft: "#475569", faint: "#94a3b8",
  line: "#e2e8f0", green: "#0a8f55", chip: "#f1f5f9",
};
const STATUS: Record<string, { label: string; color: string }> = {
  active: { label: "En curso", color: "#0a8f55" },
  paused: { label: "Pausada", color: "#b45309" },
  done: { label: "Cerrada", color: "#475569" },
};

export default function ReportePage() {
  const params = useParams<{ teamId: string }>();
  const router = useRouter();
  const team = getTeam(params.teamId || "");
  const today = new Date().toLocaleDateString("es", { day: "2-digit", month: "long", year: "numeric" });

  if (!team) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: C.page, color: C.ink }}>Equipo no encontrado.</div>;
  }

  const lead = team.facilitatorId ? getFacilitators().find((f) => f.id === team.facilitatorId) : undefined;
  const inits: Initiative[] = team.initiatives ?? [];
  const activeInits = inits.filter((i) => i.status === "active").length;
  const pulse = team.pulse;
  const last = pulse[pulse.length - 1];
  const first = pulse[0];
  const overall = last ? overallOf(last) : 0;
  const overallFirst = first ? overallOf(first) : null;
  const pulseDelta = last && overallFirst !== null ? to5(overall) - to5(overallFirst) : null;
  const sessions = team.sessions.slice(0, 12);

  const kpis = [
    { label: "Iniciativas en curso", value: activeInits, icon: "Target" },
    { label: "Sesiones realizadas", value: team.sessions.length, icon: "History" },
    { label: "Pulso actual", value: last ? `${to5(overall).toFixed(1)}/5` : "—", icon: "Activity" },
    { label: "Confianza", value: team.psychSafety ? `${to5(team.psychSafety).toFixed(1)}/5` : "—", icon: "HeartPulse" },
  ];

  const box: React.CSSProperties = { border: `1px solid ${C.line}`, borderRadius: 12, padding: 18, background: C.doc };

  return (
    <div style={{ minHeight: "100vh", background: C.page, padding: "28px 16px", color: C.ink, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
      <style>{`@media print { .no-print{display:none!important} body{background:#fff!important} @page{margin:14mm} } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`}</style>

      {/* barra de acciones (no se imprime) */}
      <div className="no-print" style={{ maxWidth: 820, margin: "0 auto 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.push(`/equipos/${team.id}`)} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.soft, fontSize: 14, fontWeight: 600 }}><Icon name="ArrowLeft" size={17} /> Volver</button>
        <button onClick={() => window.print()} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.green, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}><Icon name="FileDown" size={17} /> Exportar / Imprimir PDF</button>
      </div>

      {/* documento */}
      <div style={{ maxWidth: 820, margin: "0 auto", background: C.doc, borderRadius: 16, boxShadow: "0 10px 40px rgba(15,23,42,0.12)", padding: 40 }}>
        {/* encabezado */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, borderBottom: `2px solid ${C.ink}`, paddingBottom: 18, marginBottom: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ width: 22, height: 22, borderRadius: 7, background: C.green, display: "inline-block" }} />
              <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>Growthloop</span>
            </div>
            <div style={{ fontSize: 13, color: C.soft, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Reporte de avance</div>
            <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 4 }}>{team.name}</h1>
            <div style={{ fontSize: 14, color: C.soft, marginTop: 4 }}>{team.org} · {team.area || "—"}</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 13, color: C.soft }}>
            <div>{today}</div>
            {lead && <div style={{ marginTop: 6 }}>Facilitador<br /><b style={{ color: C.ink }}>{lead.name}</b></div>}
            <div style={{ marginTop: 6 }}>{team.members.length} integrantes</div>
          </div>
        </div>

        {/* proposito */}
        {team.purpose && <p style={{ fontSize: 15, lineHeight: 1.6, color: C.soft, marginBottom: 16, fontStyle: "italic" }}>“{team.purpose}”</p>}

        {/* objetivo (el Norte) */}
        {team.data?.objective && (
          <div style={{ border: `1px solid ${C.green}`, borderRadius: 12, padding: 16, marginBottom: 24, background: "rgba(0,170,85,0.06)" }}>
            <div style={{ fontSize: 12, color: C.green, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Objetivo del equipo{team.data.objective.horizon ? ` · ${team.data.objective.horizon}` : ""}</div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{team.data.objective.text}</div>
            {(team.data.objective.metric || team.data.objective.target) && <div style={{ fontSize: 13, color: C.soft, marginTop: 6 }}>Señal: {team.data.objective.metric || "—"}{team.data.objective.target ? ` · meta ${team.data.objective.target}` : ""}</div>}
          </div>
        )}

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ ...box, padding: 14 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.green }}>{k.value}</div>
              <div style={{ fontSize: 12, color: C.soft, marginTop: 2 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* pulso (salud del equipo) */}
        <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>
          Salud del equipo
          {pulseDelta !== null && <span style={{ fontSize: 13, fontWeight: 700, color: pulseDelta >= 0 ? C.green : "#dc2626", marginLeft: 10 }}>{pulseDelta >= 0 ? "+" : ""}{pulseDelta.toFixed(1)} pts desde el inicio</span>}
        </h2>
        <div style={{ ...box, marginBottom: 28 }}>
          {pulse.length > 1 && (() => {
            // Evolución del pulso general a lo largo de las sesiones (print-friendly).
            const ov = pulse.map(overallOf);
            const w = 700, h = 70;
            const pts = ov.map((v, i) => `${((i / (ov.length - 1)) * w).toFixed(1)},${(h - (v / 100) * h).toFixed(1)}`).join(" ");
            return (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.soft, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Evolución · {ov[0]} → {ov[ov.length - 1]}</div>
                <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 70, display: "block" }} aria-hidden>
                  <polyline points={pts} fill="none" stroke={C.green} strokeWidth="2.5" />
                  {ov.map((v, i) => <circle key={i} cx={(i / (ov.length - 1)) * w} cy={h - (v / 100) * h} r="3" fill={C.green} />)}
                </svg>
              </div>
            );
          })()}
          {last ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {PULSE_DIMS.map((d) => {
                const v = dimVal(last, d.key);
                if (v == null) return null;
                const f = first ? dimVal(first, d.key) : undefined;
                const delta = f != null ? to5(v) - to5(f) : 0;
                return (
                  <div key={d.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
                      <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: d.color, display: "inline-block" }} />{d.label}</span>
                      <span style={{ fontWeight: 700 }}>{to5(v).toFixed(1)}{delta !== 0 && <span style={{ color: delta > 0 ? C.green : "#dc2626", fontWeight: 600, marginLeft: 6 }}>{delta > 0 ? "+" : ""}{delta.toFixed(1)}</span>}</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 99, background: C.chip, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${v}%`, background: d.color, borderRadius: 99 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div style={{ color: C.faint, fontSize: 14, textAlign: "center", padding: 12 }}>Todavía sin datos de pulso. Aparecen con la primera sesión.</div>}
        </div>

        {/* iniciativas */}
        <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>Iniciativas ({inits.length})</h2>
        <div style={{ ...box, padding: 0, marginBottom: 28, overflow: "hidden" }}>
          {inits.length === 0 ? <div style={{ color: C.faint, fontSize: 14, textAlign: "center", padding: 18 }}>Sin iniciativas todavía.</div> : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.chip, textAlign: "left", color: C.soft }}>
                  <th style={{ padding: "10px 14px", fontWeight: 700 }}>Objetivo</th>
                  <th style={{ padding: "10px 14px", fontWeight: 700 }}>Etapa</th>
                  <th style={{ padding: "10px 14px", fontWeight: 700 }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {inits.map((i, idx) => {
                  const s = STATUS[i.status] ?? STATUS.active;
                  return (
                    <tr key={i.id} style={{ borderTop: idx ? `1px solid ${C.line}` : "none" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 600 }}>{i.title}</td>
                      <td style={{ padding: "10px 14px", color: C.soft }}>{STAGES[i.stage]?.label ?? i.stage}</td>
                      <td style={{ padding: "10px 14px" }}><span style={{ color: s.color, fontWeight: 700 }}>{s.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* el ciclo: causa → apuesta → resultado → aprendizajes */}
        {(() => {
          const rich = inits.filter((i) => i.data?.focus?.cause || i.data?.proof?.bets?.length || i.data?.proof?.betThen || i.data?.learn?.learnings?.length);
          if (!rich.length) return null;
          const decisionLbl: Record<string, string> = { consolidate: "Implementada", iterate: "En iteración", drop: "Soltada" };
          return (
            <>
              <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>El trabajo de mejora, en detalle</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
                {rich.map((i) => {
                  const d = i.data ?? {};
                  const pbets = d.proof?.bets?.length ? d.proof.bets : (d.proof?.betThen ? [{ betThen: d.proof.betThen, betIf: d.proof?.betIf, signalMetric: d.proof?.signalMetric, signalTarget: d.proof?.signalTarget }] : []);
                  return (
                    <div key={i.id} style={box}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 800, fontSize: 15 }}>{i.title}</span>
                        {d.learn?.decision && <span style={{ fontSize: 12, fontWeight: 700, color: C.green }}>{decisionLbl[d.learn.decision] ?? d.learn.decision}</span>}
                      </div>
                      {d.focus?.cause && <div style={{ fontSize: 13, marginBottom: 8 }}><span style={{ color: C.soft }}>Causa elegida: </span><b>{d.focus.cause}</b></div>}
                      {pbets.map((b, bi) => (
                        <div key={bi} style={{ fontSize: 13, padding: "8px 12px", background: C.chip, borderRadius: 8, marginBottom: 6 }}>
                          {b.betThen && <div>Apuesta: <b>{b.betIf ? `si ${b.betIf} → ` : ""}{b.betThen}</b></div>}
                          {(b.signalTarget || d.learn?.achieved?.[bi]) && (
                            <div style={{ marginTop: 3, color: C.soft }}>
                              Señal: {b.signalMetric || "—"} · meta <b style={{ color: C.ink }}>{b.signalTarget || "—"}</b> → logrado <b style={{ color: C.green }}>{d.learn?.achieved?.[bi] || "—"}</b>
                            </div>
                          )}
                        </div>
                      ))}
                      {!!d.learn?.learnings?.length && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: C.soft, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Aprendizajes</div>
                          {d.learn.learnings.slice(0, 5).map((l, li) => <div key={li} style={{ fontSize: 13, marginBottom: 3 }}>· {l}</div>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}

        {/* sesiones */}
        <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>Sesiones recientes</h2>
        <div style={{ ...box, padding: sessions.length ? 14 : 18 }}>
          {sessions.length === 0 ? <div style={{ color: C.faint, fontSize: 14, textAlign: "center" }}>Sin sesiones registradas.</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sessions.map((s) => (
                <div key={s.id} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                  <span style={{ fontSize: 12, color: C.faint, width: 56, flex: "none" }}>{s.date}</span>
                  <span style={{ fontWeight: 600, fontSize: 13, flex: "none" }}>{s.retro}</span>
                  <span style={{ fontSize: 13, color: C.soft }}>— {s.out}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* pie */}
        <div style={{ marginTop: 28, paddingTop: 16, borderTop: `1px solid ${C.line}`, fontSize: 12, color: C.faint, display: "flex", justifyContent: "space-between" }}>
          <span>Generado por Growthloop · {today}</span>
          <span>{team.org} — {team.name}</span>
        </div>
      </div>
    </div>
  );
}
