"use client";

/* ============================================================
   Componentes reutilizables — TARJETA ANÓNIMA + COMPOSER
   ------------------------------------------------------------
   - Mientras se escribe (no revelado): el autor ve su tarjeta en
     verde con texto; las ajenas aparecen en gris y ocultas.
   - Al revelar: todas se igualan (mismo color) y muestran el texto.
   ============================================================ */

import { Icon } from "@/components/icon";

export function AnonCard({ text, mine, revealed, color = "var(--green)", author }: { text: string; mine?: boolean; revealed?: boolean; color?: string; author?: string }) {
  // ajena y todavía oculta → tarjeta "trabada"
  if (!revealed && !mine) {
    return (
      <div style={{ background: "linear-gradient(135deg, var(--card), var(--bg-2))", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", padding: "13px", display: "flex", alignItems: "center", gap: 8, animation: "card-in .3s var(--ease)" }}>
        <Icon name="Lock" size={14} style={{ color: "var(--ink-3)" }} />
        <span style={{ flex: 1, height: 5, borderRadius: 99, background: "repeating-linear-gradient(90deg, var(--line-2) 0 14px, transparent 14px 22px)" }} />
      </div>
    );
  }
  const accent = revealed ? color : "var(--green)";
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${accent}`, borderRadius: "var(--r-md)", padding: "11px 13px", fontSize: "var(--t-sm)", lineHeight: 1.45, animation: revealed ? "pop-in .45s var(--spring) both" : "card-in .25s var(--ease)" }}>
      {text}
      <div style={{ marginTop: 5, display: "flex", gap: 6, alignItems: "center" }}>
        {revealed && (author ? <span className="muted" style={{ fontSize: 10 }}>· {author}</span> : <span className="faint" style={{ fontSize: 10, display: "inline-flex", alignItems: "center", gap: 3 }}><Icon name="Lock" size={10} /> anónima</span>)}
        {mine && <span style={{ fontSize: 10, color: "var(--ink-3)" }}>· tuya</span>}
      </div>
    </div>
  );
}

export function CardComposer({ value, onChange, onAdd, placeholder = "Sumar tarjeta…", color = "var(--green)", disabled }: { value: string; onChange: (v: string) => void; onAdd: () => void; placeholder?: string; color?: string; disabled?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <input
        value={value} disabled={disabled}
        onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onAdd()}
        placeholder={placeholder}
        style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none", opacity: disabled ? 0.5 : 1 }}
      />
      <button onClick={onAdd} disabled={disabled} style={{ background: color, color: "#08120c", borderRadius: "var(--r-sm)", padding: "0 12px", display: "grid", placeItems: "center", opacity: disabled ? 0.5 : 1 }}><Icon name="Plus" size={16} /></button>
    </div>
  );
}
