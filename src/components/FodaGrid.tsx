"use client";

/* La matriz FODA guardada del equipo (teams.data.foda), en 2×2. */

import type { Team } from "@/lib/data";

export const FODA_QUADS = [
  { key: "f", label: "💪 Fortalezas", color: "var(--green)" },
  { key: "d", label: "⚠️ Debilidades", color: "var(--warning)" },
  { key: "o", label: "🌱 Oportunidades", color: "#3B82F6" },
  { key: "a", label: "⛈️ Amenazas", color: "var(--risk)" },
] as const;

export function FodaGrid({ team }: { team: Team }) {
  const foda = team.data?.foda;
  if (!foda) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
      {FODA_QUADS.map((q) => {
        const items = (foda[q.key] ?? []).filter((t) => (t ?? "").trim());
        return (
          <div key={q.key} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderTop: `3px solid ${q.color}`, borderRadius: "var(--r-md)", padding: 12 }}>
            <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 8 }}>{q.label} <span className="num muted" style={{ fontSize: "var(--t-xs)" }}>{items.length}</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {items.map((t, i) => <div key={i} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-sm)", padding: "7px 9px", fontSize: "var(--t-xs)", lineHeight: 1.45 }}>{t}</div>)}
              {!items.length && <span className="muted" style={{ fontSize: "var(--t-xs)" }}>Sin aportes</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
