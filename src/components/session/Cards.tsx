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

export interface BoardCol { key: string; label: string; color: string; icon: string; sub?: string }
export interface BoardCard { id: string; columnKey: string; text: string; mine?: boolean; author?: string }

/** Tablero de columnas con tarjetas. Si se pasan drafts/onAdd, muestra el composer (modo escritura). */
export function CardBoard({ columns, cards, counts, revealed, drafts, onDraft, onAdd }: {
  columns: BoardCol[]; cards: BoardCard[]; counts?: Record<string, number>; revealed?: boolean;
  drafts?: Record<string, string>; onDraft?: (key: string, v: string) => void; onAdd?: (key: string) => void;
}) {
  return (
    <div className="cards-cols" style={{ display: "grid", gridTemplateColumns: `repeat(${columns.length}, 1fr)`, gap: 14 }}>
      {columns.map((col) => {
        const colCards = cards.filter((c) => c.columnKey === col.key);
        const count = counts?.[col.key] ?? colCards.length;
        return (
          <div key={col.key} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 14, display: "flex", flexDirection: "column", minHeight: 240 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: col.sub ? 4 : 12 }}>
              <span style={{ color: col.color, display: "inline-flex" }}><Icon name={col.icon} size={17} /></span>
              <span style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{col.label}</span>
              <span className="num" style={{ marginLeft: "auto", fontSize: "var(--t-xs)", color: "var(--ink-2)", background: "var(--card)", borderRadius: 99, padding: "2px 8px" }}>{count}</span>
            </div>
            {col.sub && <div className="muted" style={{ fontSize: 10, marginBottom: 12 }}>{col.sub}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
              {colCards.map((c) => <AnonCard key={c.id} text={c.text} mine={c.mine} revealed={revealed} color={col.color} author={c.author} />)}
              {!colCards.length && <div style={{ color: "var(--ink-3)", fontSize: "var(--t-xs)", textAlign: "center", padding: 20 }}>Sin tarjetas aún…</div>}
            </div>
            {onAdd && drafts && (
              <div style={{ marginTop: 12 }}>
                <CardComposer value={drafts[col.key] ?? ""} onChange={(v) => onDraft?.(col.key, v)} onAdd={() => onAdd(col.key)} color={col.color} />
              </div>
            )}
          </div>
        );
      })}
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
