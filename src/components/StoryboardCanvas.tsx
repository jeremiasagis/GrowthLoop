"use client";

/* Storyboard de 6 cuadros: la situación de hoy, 4 pasos y el resultado.
   Versión usable: cada cuadro es texto (se pueden poner emojis). */

export const SB_LABELS = ["1 · Hoy (el problema)", "2 · Paso", "3 · Paso", "4 · Paso", "5 · Paso", "6 · Resultado"];

export function StoryboardCanvas({ frames, editable, onChange, size = "md" }: {
  frames: string[];
  editable?: boolean;
  onChange?: (i: number, v: string) => void;
  size?: "sm" | "md";
}) {
  const cell = size === "sm" ? 96 : 130;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }} className="cards-cols">
      {SB_LABELS.map((label, i) => {
        const first = i === 0, last = i === 5;
        const color = first ? "var(--risk)" : last ? "var(--green)" : "var(--st-proof)";
        return (
          <div key={i} style={{ background: "var(--bg-2)", border: `1px solid var(--line)`, borderTop: `3px solid ${color}`, borderRadius: "var(--r-md)", padding: 8, display: "flex", flexDirection: "column", minHeight: cell }}>
            <div style={{ fontSize: 10, fontWeight: 800, color, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
            {editable
              ? <textarea value={frames[i] ?? ""} onChange={(e) => onChange?.(i, e.target.value)} placeholder={first ? "¿Cómo es hoy?" : last ? "¿Cómo queda?" : "¿Qué pasa acá?"} style={{ flex: 1, width: "100%", background: "var(--card)", border: "none", color: "var(--ink-0)", fontSize: "var(--t-xs)", outline: "none", resize: "none", lineHeight: 1.4 }} />
              : <div style={{ flex: 1, fontSize: "var(--t-xs)", lineHeight: 1.4, color: frames[i] ? "var(--ink-0)" : "var(--ink-3)", whiteSpace: "pre-wrap" }}>{frames[i] || "—"}</div>}
          </div>
        );
      })}
    </div>
  );
}
