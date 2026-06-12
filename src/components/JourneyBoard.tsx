"use client";

/* Journey del cliente: columnas por paso, filas por tipo de tarjeta
   (acción / emoción / fricción / fortaleza). El paso crítico se resalta. */

export interface JourneyCol {
  name: string;
  actions: string[];
  frictions: string[];
  strengths: string[];
  emo: { pos: number; neu: number; neg: number };
}

const ROW_META = [
  { key: "actions" as const, label: "Qué hacemos", color: "#3B82F6" },
  { key: "frictions" as const, label: "Fricción 😖", color: "var(--risk)" },
  { key: "strengths" as const, label: "Qué hacemos bien", color: "var(--success)" },
];

export function JourneyBoard({ cols, highlight, current }: { cols: JourneyCol[]; highlight?: number; current?: number }) {
  if (!cols.length) return null;
  return (
    <div style={{ overflowX: "auto", paddingBottom: 6 }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols.length}, minmax(160px, 1fr))`, gap: 10, minWidth: cols.length * 170 }}>
        {cols.map((c, i) => {
          const hot = highlight === i;
          const cur = current === i;
          const totalEmo = c.emo.pos + c.emo.neu + c.emo.neg;
          const mainEmo = totalEmo === 0 ? "" : c.emo.neg >= c.emo.pos && c.emo.neg >= c.emo.neu ? "😔" : c.emo.pos >= c.emo.neu ? "😊" : "😐";
          return (
            <div key={i} style={{ border: `1.5px solid ${hot ? "var(--risk)" : cur ? "var(--st-focus)" : "var(--line)"}`, borderRadius: "var(--r-lg)", background: hot ? "color-mix(in srgb, var(--risk) 5%, var(--bg-2))" : "var(--bg-2)", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ textAlign: "center" }}>
                <span className="num" style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 800 }}>{i + 1}</span>
                <div style={{ fontWeight: 700, fontSize: "var(--t-xs)", lineHeight: 1.25 }}>{c.name}</div>
                {totalEmo > 0 && <div style={{ fontSize: 16, marginTop: 2 }} title={`😊${c.emo.pos} 😐${c.emo.neu} 😔${c.emo.neg}`}>{mainEmo} <span className="num muted" style={{ fontSize: 9 }}>😊{c.emo.pos} 😐{c.emo.neu} 😔{c.emo.neg}</span></div>}
              </div>
              {ROW_META.map((r) => (
                <div key={r.key}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: r.color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{r.label} · {c[r.key].length}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {c[r.key].map((t, k) => <div key={k} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${r.color}`, borderRadius: "var(--r-sm)", padding: "5px 7px", fontSize: 10, lineHeight: 1.35 }}>{t}</div>)}
                    {!c[r.key].length && <span className="faint" style={{ fontSize: 9 }}>—</span>}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
