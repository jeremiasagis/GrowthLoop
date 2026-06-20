"use client";

/* ============================================================
   Panel de madurez de mejora continua: 6 capacidades con barras
   segmentadas (nivel 0-4), un nivel general y la próxima práctica
   a desarrollar. Es el "no puntos vacíos": muestra capacidad real,
   no XP.
   ============================================================ */

import { Icon } from "@/components/icon";
import { Card, SectionTitle } from "@/components/ui";
import { ciMaturity } from "@/lib/maturity";
import type { Team } from "@/lib/data";

const LV = ["—", "Incipiente", "En formación", "En práctica", "Consolidada"]; // por dimensión (0-4)

export function MaturityPanel({ team }: { team: Team }) {
  const m = ciMaturity(team);
  return (
    <Card pad={20}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SectionTitle icon="Gauge" sub="En qué prácticas de mejora continua el equipo es maduro">Madurez de mejora continua</SectionTitle>
        </div>
        <div style={{ textAlign: "right", flex: "none" }}>
          <div style={{ fontSize: "var(--t-md)", fontWeight: 800, color: "var(--green)" }}>{m.overallLabel}</div>
          <div className="num muted" style={{ fontSize: "var(--t-xs)" }}>{m.overall.toFixed(1)}/4</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
        {m.dims.map((d) => {
          const weak = d.key === m.weakest.key;
          return (
            <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 22, flex: "none", color: weak ? "var(--warning)" : "var(--ink-3)" }}><Icon name={d.icon} size={16} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, justifyContent: "space-between" }}>
                  <span style={{ fontSize: "var(--t-sm)", fontWeight: 700 }}>{d.label}</span>
                  <span className="muted" style={{ fontSize: "var(--t-xs)", flex: "none" }}>{LV[d.level]}</span>
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
                  {[1, 2, 3, 4].map((seg) => (
                    <span key={seg} style={{ flex: 1, height: 7, borderRadius: 99, background: seg <= d.level ? (weak ? "var(--warning)" : "var(--green)") : "var(--line)" }} />
                  ))}
                </div>
                <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 4 }}>{d.why}</div>
              </div>
            </div>
          );
        })}
      </div>

      {m.weakest.next && (
        <div style={{ marginTop: 16, padding: "11px 13px", background: "color-mix(in srgb, var(--warning) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--warning) 30%, transparent)", borderRadius: "var(--r-md)", display: "flex", gap: 9, alignItems: "flex-start" }}>
          <Icon name="ArrowUpRight" size={16} style={{ color: "var(--warning)", flexShrink: 0, marginTop: 1 }} />
          <div>
            <div className="eyebrow" style={{ color: "var(--warning)", marginBottom: 2 }}>Próxima práctica · {m.weakest.label}</div>
            <div style={{ fontSize: "var(--t-sm)", lineHeight: 1.45 }}>{m.weakest.next}</div>
          </div>
        </div>
      )}
    </Card>
  );
}
