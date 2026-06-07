"use client";

import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { getFacilitators, getTeam } from "@/lib/repository";
import { PULSE_DIMS, STAGES, type Initiative } from "@/lib/data";

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
  const overall = last ? Math.round((last.confianza + last.comunic + last.claridad + last.foco + last.seguridad) / 5) : 0;
  const sessions = team.sessions.slice(0, 12);

  const kpis = [
    { label: "Iniciativas en curso", value: activeInits, icon: "Target" },
    { label: "Sesiones realizadas", value: team.sessions.length, icon: "History" },
    { label: "Pulso actual", value: last ? `${overall}/100` : "—", icon: "Activity" },
    { label: "Seguridad ψ", value: team.psychSafety ? `${team.psychSafety}%` : "—", icon: "HeartPulse" },
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
        {team.purpose && <p style={{ fontSize: 15, lineHeight: 1.6, color: C.soft, marginBottom: 24, fontStyle: "italic" }}>“{team.purpose}”</p>}

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ ...box, padding: 14 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.green }}>{k.value}</div>
              <div style={{ fontSize: 12, color: C.soft, marginTop: 2 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* pulso */}
        <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>Pulso del equipo</h2>
        <div style={{ ...box, marginBottom: 28 }}>
          {last ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {PULSE_DIMS.map((d) => {
                const v = last[d.key];
                const delta = first ? v - first[d.key] : 0;
                return (
                  <div key={d.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
                      <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: d.color, display: "inline-block" }} />{d.label}</span>
                      <span style={{ fontWeight: 700 }}>{v}{delta !== 0 && <span style={{ color: delta > 0 ? C.green : "#dc2626", fontWeight: 600, marginLeft: 6 }}>{delta > 0 ? "+" : ""}{delta}</span>}</span>
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
