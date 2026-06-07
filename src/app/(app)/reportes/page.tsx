"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { Button, Card, EmptyState, Pill, SectionTitle, StageBadge } from "@/components/ui";
import { getTeams } from "@/lib/repository";
import { useToast } from "@/components/Toast";
import type { StageKey } from "@/lib/data";

const REPORT_TYPES = [
  { key: "session", icon: "Radio", color: "var(--green)", title: "Reporte de sesión", desc: "El resultado de una sesión: pulso, tensiones y acuerdos. Ideal para compartir con el equipo." },
  { key: "progress", icon: "TrendingUp", color: "var(--st-proof)", title: "Reporte de avance", desc: "Cómo evolucionó una variable o el pulso a lo largo de varias sesiones." },
  { key: "exec", icon: "Presentation", color: "var(--violet)", title: "Reporte ejecutivo", desc: "Una vista de alto nivel para el sponsor: equipos, mejoras y retorno del acompañamiento." },
];

interface GeneratedReport {
  id: string;
  type: "session" | "progress" | "exec";
  title: string;
  team: string;
  org: string;
  date: string;
  stage?: StageKey;
  pages: number;
}

const RECENT: GeneratedReport[] = [];

const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  session:  { icon: "Radio",       color: "var(--green)",     label: "Sesión" },
  progress: { icon: "TrendingUp",  color: "var(--st-proof)",  label: "Avance" },
  exec:     { icon: "Presentation", color: "var(--violet)",   label: "Ejecutivo" },
};

export default function ReportesPage() {
  const teams = getTeams();
  const { show } = useToast();
  const [team, setTeam] = useState<string>("t1");
  const teamName = teams.find((t) => t.id === team)?.name ?? "";

  return (
    <div className="screen-pad">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Reportes</h1>
          <p className="muted" style={{ marginTop: 4 }}>Generá reportes de sesión, de avance y ejecutivos para el sponsor.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <label className="muted" style={{ fontSize: "var(--t-sm)" }}>Equipo</label>
          <select
            value={team} onChange={(e) => setTeam(e.target.value)}
            style={{ background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "9px 12px", fontSize: "var(--t-sm)", fontWeight: 600, outline: "none" }}
          >
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      {/* generate cards */}
      <SectionTitle icon="FilePlus2" sub="Elegí qué querés generar para el equipo seleccionado">Generar un reporte</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 30 }}>
        {REPORT_TYPES.map((r) => (
          <Card key={r.key} pad={20} hover style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: "var(--r-md)", background: `color-mix(in srgb, ${r.color} 16%, transparent)`, color: r.color, display: "grid", placeItems: "center" }}>
              <Icon name={r.icon} size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "var(--t-md)", marginBottom: 5 }}>{r.title}</div>
              <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.5 }}>{r.desc}</p>
            </div>
            <Button variant="secondary" icon="FileDown" full style={{ marginTop: "auto" }}
              onClick={() => show(`Generando ${r.title.toLowerCase()} de ${teamName}…`, "FileDown")}>Generar</Button>
          </Card>
        ))}
      </div>

      {/* recent reports */}
      <SectionTitle icon="FileClock" right={<Pill icon="Archive">{RECENT.length} generados</Pill>}>Reportes recientes</SectionTitle>
      <Card pad={RECENT.length ? 6 : 0}>
        {RECENT.length === 0 && (
          <EmptyState icon="FileClock" title="Todavía no generaste reportes">
            Generá un reporte de un equipo y va a aparecer acá para descargar.
          </EmptyState>
        )}
        {RECENT.map((rep, i) => {
          const m = TYPE_META[rep.type];
          return (
            <div key={rep.id}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 12px", borderBottom: i < RECENT.length - 1 ? "1px solid var(--line)" : "none" }}>
              <div style={{ width: 40, height: 40, borderRadius: "var(--r-md)", background: `color-mix(in srgb, ${m.color} 14%, transparent)`, color: m.color, display: "grid", placeItems: "center", flex: "none" }}>
                <Icon name={m.icon} size={19} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "var(--t-sm)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{rep.title}</div>
                <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{rep.team} · {rep.org} · {rep.date}</div>
              </div>
              {rep.stage && <span className="hide-sm"><StageBadge stage={rep.stage} size="sm" /></span>}
              <Pill color={m.color}>{m.label}</Pill>
              <span className="muted num hide-sm" style={{ fontSize: "var(--t-xs)", width: 56, textAlign: "right" }}>{rep.pages} pág.</span>
              <Button size="sm" variant="ghost" icon="Download" title="Descargar PDF" onClick={() => show("Descargando PDF…", "Download")} />
            </div>
          );
        })}
      </Card>
    </div>
  );
}
