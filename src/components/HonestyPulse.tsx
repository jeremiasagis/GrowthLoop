"use client";

/* Semáforo de honestidad anónimo: cómo ve cada uno que viene la prueba.
   Vota (si editable) o muestra el agregado revelado. */

export const HONESTY = [
  { k: "green", emoji: "🟢", label: "Va bien", color: "var(--success)" },
  { k: "yellow", emoji: "🟡", label: "Tengo dudas", color: "var(--warning)" },
  { k: "red", emoji: "🔴", label: "No está funcionando", color: "var(--risk)" },
] as const;
export type HonestyKey = "green" | "yellow" | "red";

export function HonestyPulse({ counts, mine, onVote, revealed }: {
  counts: { green: number; yellow: number; red: number };
  mine?: HonestyKey;
  onVote?: (k: HonestyKey) => void;
  revealed?: boolean;
}) {
  const total = counts.green + counts.yellow + counts.red || 1;
  if (revealed) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {HONESTY.map((h) => {
          const v = counts[h.k];
          return (
            <div key={h.k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18, width: 24 }}>{h.emoji}</span>
              <span style={{ flex: 1, fontSize: "var(--t-sm)", fontWeight: 600 }}>{h.label}</span>
              <div style={{ flex: 1, height: 8, borderRadius: 99, background: "var(--card-2)", overflow: "hidden", maxWidth: 160 }}><div style={{ height: "100%", width: `${(v / total) * 100}%`, background: h.color, borderRadius: 99 }} /></div>
              <span className="num" style={{ fontWeight: 800, color: h.color, width: 22, textAlign: "right" }}>{v}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {HONESTY.map((h) => {
        const on = mine === h.k;
        return (
          <button key={h.k} onClick={() => onVote?.(h.k)} disabled={!onVote}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderRadius: "var(--r-md)", textAlign: "left", background: on ? `color-mix(in srgb, ${h.color} 14%, var(--card))` : "var(--card)", border: `1.5px solid ${on ? h.color : "var(--line-2)"}`, cursor: onVote ? "pointer" : "default" }}>
            <span style={{ fontSize: 22 }}>{h.emoji}</span>
            <span style={{ flex: 1, fontSize: "var(--t-sm)", fontWeight: 600 }}>{h.label}</span>
            {on && <span style={{ color: h.color, fontWeight: 700, fontSize: "var(--t-xs)" }}>tu voto</span>}
          </button>
        );
      })}
    </div>
  );
}
