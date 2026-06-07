"use client";

/* ============================================================
   Componentes reutilizables de sesión (presentacionales).
   La sincronización (Realtime) la cablea cada sesión.
   ============================================================ */

import { Icon } from "@/components/icon";
import { Bar } from "@/components/ui";
import { PULSE_DIMS } from "@/lib/data";

/* ── PULSO ── */
export type Pulse = { confianza: number; comunic: number; claridad: number; foco: number; seguridad: number };
export function PulseForm({ draft, onChange }: { draft: Pulse; onChange: (p: Pulse) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {PULSE_DIMS.map((d) => (
        <div key={d.key}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
            <span style={{ fontSize: "var(--t-sm)", fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: d.color }} />{d.label}</span>
            <span className="num" style={{ fontWeight: 700, color: d.color }}>{draft[d.key]}</span>
          </div>
          <input type="range" min={0} max={100} value={draft[d.key]} onChange={(e) => onChange({ ...draft, [d.key]: Number(e.target.value) })} style={{ width: "100%", accentColor: d.color }} />
        </div>
      ))}
    </div>
  );
}
export function PulseResult({ avg }: { avg: Pulse }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {PULSE_DIMS.map((d) => (
        <div key={d.key}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
            <span style={{ fontSize: "var(--t-sm)", fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: d.color }} />{d.label}</span>
            <span className="num" style={{ fontWeight: 700, color: d.color }}>{avg[d.key]}</span>
          </div>
          <Bar value={avg[d.key]} color={d.color} glow />
        </div>
      ))}
    </div>
  );
}

/* ── VOTACIÓN DE PUNTOS ── */
export interface VoteItem { id: string; label: string; votes: number; mine?: number; sub?: string }
export function DotVote({ items, remaining, onAdd, onRemove, accent = "var(--green)" }: { items: VoteItem[]; remaining: number; onAdd: (id: string) => void; onRemove: (id: string) => void; accent?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((it) => (
        <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: "var(--t-sm)" }}>{it.label}</div>
            {it.sub && <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{it.sub}</div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => onRemove(it.id)} disabled={(it.mine ?? 0) === 0} style={{ ...sq, opacity: (it.mine ?? 0) === 0 ? 0.4 : 1 }}><Icon name="Minus" size={15} /></button>
            <span className="num" style={{ width: 22, textAlign: "center", fontWeight: 700 }}>{it.mine ?? 0}</span>
            <button onClick={() => onAdd(it.id)} disabled={remaining === 0} style={{ ...sq, background: remaining === 0 ? "var(--card-2)" : accent, color: remaining === 0 ? "var(--ink-3)" : "#08120c", borderColor: remaining === 0 ? "var(--line-2)" : accent }}><Icon name="Plus" size={15} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}
export function VoteTally({ items, accent = "var(--green)" }: { items: VoteItem[]; accent?: string }) {
  const ranked = [...items].sort((a, b) => b.votes - a.votes);
  const max = Math.max(1, ...items.map((i) => i.votes));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {ranked.map((it, i) => (
        <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="num" style={{ width: 20, fontWeight: 700, color: i === 0 ? accent : "var(--ink-3)" }}>{i + 1}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: "var(--t-sm)", marginBottom: 5 }}>{it.label}</div>
            <Bar value={(it.votes / max) * 100} color={i === 0 ? accent : "var(--violet)"} height={7} />
          </div>
          <span className="num" style={{ fontWeight: 700, width: 22, textAlign: "right" }}>{it.votes}</span>
        </div>
      ))}
    </div>
  );
}

/* ── ICE ── */
export type Ice = { i: number; c: number; e: number };
export function IceForm({ items, drafts, onChange }: { items: { id: string; label: string }[]; drafts: Record<string, Ice>; onChange: (id: string, ice: Ice) => void }) {
  const DIMS: [keyof Ice, string][] = [["i", "Impacto"], ["c", "Confianza"], ["e", "Facilidad"]];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map((it) => {
        const d = drafts[it.id] ?? { i: 5, c: 5, e: 5 };
        return (
          <div key={it.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 10 }}>{it.label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {DIMS.map(([k, label]) => (
                <div key={k}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--t-xs)", marginBottom: 4 }}><span className="muted">{label}</span><span className="num" style={{ fontWeight: 700 }}>{d[k]}</span></div>
                  <input type="range" min={1} max={10} value={d[k]} onChange={(e) => onChange(it.id, { ...d, [k]: Number(e.target.value) })} style={{ width: "100%", accentColor: "var(--st-proof)" }} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
export function IceRanking({ items, accent = "var(--st-proof)" }: { items: { id: string; label: string; score: number }[]; accent?: string }) {
  const ranked = [...items].sort((a, b) => b.score - a.score);
  const max = Math.max(1, ...items.map((i) => i.score));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {ranked.map((it, i) => (
        <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="num" style={{ width: 20, fontWeight: 700, color: i === 0 ? accent : "var(--ink-3)" }}>{i + 1}</span>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: "var(--t-sm)", marginBottom: 5 }}>{it.label}</div><Bar value={(it.score / max) * 100} color={i === 0 ? accent : "var(--violet)"} height={7} /></div>
          <span className="num" style={{ fontWeight: 700, width: 34, textAlign: "right" }}>{it.score}</span>
        </div>
      ))}
    </div>
  );
}

/* ── MATRIZ 2x2 ── */
export function Matrix2x2({ items, axisX, axisY, accent = "var(--green)" }: { items: { id: string; label: string; x: number; y: number; rank?: number }[]; axisX: string; axisY: string; accent?: string }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center" }}><span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: "var(--t-xs)", color: "var(--ink-3)", fontWeight: 600 }}>{axisY} →</span></div>
        <div style={{ position: "relative", flex: 1, aspectRatio: "1", maxWidth: 300, border: "1px solid var(--line)", borderRadius: "var(--r-md)", background: "var(--card)", margin: "0 auto" }}>
          <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--line)" }} />
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "var(--line)" }} />
          <span style={{ position: "absolute", top: 6, right: 8, fontSize: 10, color: accent, fontWeight: 700 }}>prioridad</span>
          {items.map((it) => (
            <span key={it.id} title={it.label} style={{ position: "absolute", left: `${Math.max(4, Math.min(96, it.x * 100))}%`, bottom: `${Math.max(4, Math.min(96, it.y * 100))}%`, transform: "translate(-50%, 50%)", width: 26, height: 26, borderRadius: 99, background: it.rank === 0 ? accent : "var(--violet)", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800, border: "2px solid var(--bg-1)" }}>{(it.rank ?? 0) + 1}</span>
          ))}
        </div>
      </div>
      <div style={{ textAlign: "center", fontSize: "var(--t-xs)", color: "var(--ink-3)", fontWeight: 600, marginTop: 4 }}>{axisX} →</div>
    </div>
  );
}

/* ── ÁRBOL DE CAUSAS ── */
export interface CauseNode { id: string; parentId: string | null; text: string; level: number }
export function CausesTree({ root, nodes, onAddChild, editable }: { root: string; nodes: CauseNode[]; onAddChild?: (parentId: string | null, text: string) => void; editable?: boolean }) {
  const children = (pid: string | null) => nodes.filter((n) => n.parentId === pid);
  const render = (pid: string | null, depth: number) => children(pid).map((n) => (
    <div key={n.id} style={{ marginLeft: depth * 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "var(--card-2)", borderRadius: "var(--r-sm)", borderLeft: `2px solid color-mix(in srgb, var(--st-focus) ${70 - depth * 15}%, transparent)`, fontSize: "var(--t-sm)", marginBottom: 6 }}>
        {depth > 0 && <Icon name="CornerDownRight" size={13} style={{ color: "var(--ink-3)" }} />}{n.text}
        {editable && n.level < 3 && onAddChild && <button onClick={() => { const t = prompt("¿Y por qué pasa eso?"); if (t) onAddChild(n.id, t.trim()); }} title="Profundizar" style={{ marginLeft: "auto", color: "var(--st-focus)" }}><Icon name="Plus" size={14} /></button>}
      </div>
      {render(n.id, depth + 1)}
    </div>
  ));
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "color-mix(in srgb, var(--st-focus) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--st-focus) 35%, transparent)", borderRadius: "var(--r-md)", fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 10 }}>
        <Icon name="Crosshair" size={15} style={{ color: "var(--st-focus)" }} />{root}
        {editable && onAddChild && <button onClick={() => { const t = prompt("Causa (¿por qué pasa?)"); if (t) onAddChild(null, t.trim()); }} title="Agregar causa" style={{ marginLeft: "auto", color: "var(--st-focus)" }}><Icon name="Plus" size={15} /></button>}
      </div>
      {render(null, 0)}
      {!nodes.length && <p className="muted" style={{ fontSize: "var(--t-sm)" }}>Sin causas todavía.</p>}
    </div>
  );
}

/* ── TEMPLATE DE APUESTA ── */
export function BetTemplate({ betIf, betThen, signal, deadline, onChange, editable }: { betIf: string; betThen: string; signal: string; deadline: string; onChange?: (field: "betIf" | "betThen" | "signal" | "deadline", v: string) => void; editable?: boolean }) {
  const Field = ({ field, value, ph }: { field: "betIf" | "betThen" | "signal" | "deadline"; value: string; ph: string }) =>
    editable ? <input value={value} onChange={(e) => onChange?.(field, e.target.value)} placeholder={ph} style={{ background: value ? "var(--card)" : "color-mix(in srgb, var(--st-proof) 12%, var(--card))", border: `1px solid ${value ? "var(--line-2)" : "var(--st-proof)"}`, borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "4px 9px", fontSize: "var(--t-sm)", outline: "none", fontWeight: 600, minWidth: 120 }} />
      : <b style={{ color: value ? "var(--green)" : "var(--ink-3)" }}>{value || "…"}</b>;
  return (
    <div style={{ padding: "16px 18px", background: "color-mix(in srgb, var(--st-proof) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--st-proof) 30%, transparent)", borderRadius: "var(--r-md)", fontSize: "var(--t-md)", lineHeight: 2 }}>
      Creemos que si <Field field="betIf" value={betIf} ph="acción concreta" />, lograremos que <Field field="betThen" value={betThen} ph="resultado esperado" />. Mediremos el avance con <Field field="signal" value={signal} ph="señal" /> antes del <Field field="deadline" value={deadline} ph="fecha" />.
    </div>
  );
}

/* ── CHECKLIST 3 FILTROS ── */
export function Filters3({ filters, onToggle, editable }: { filters: { observable?: boolean; medible?: boolean; equipo?: boolean }; onToggle?: (k: "observable" | "medible" | "equipo") => void; editable?: boolean }) {
  const ITEMS: { k: "observable" | "medible" | "equipo"; label: string; hint: string }[] = [
    { k: "observable", label: "¿Es observable?", hint: "Se ve sin interpretación subjetiva." },
    { k: "medible", label: "¿Es medible en ~15 días?", hint: "El cambio se ve dentro del plazo." },
    { k: "equipo", label: "¿Depende solo del equipo?", hint: "El resultado está en sus manos." },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {ITEMS.map((it) => {
        const on = !!filters[it.k];
        const inner = (
          <>
            <span style={{ color: on ? "var(--green)" : "var(--ink-3)", flex: "none" }}><Icon name={on ? "CircleCheck" : "Circle"} size={18} /></span>
            <div><div style={{ fontWeight: 600 }}>{it.label}</div><div className="muted" style={{ fontSize: "var(--t-xs)" }}>{it.hint}</div></div>
          </>
        );
        const style: React.CSSProperties = { textAlign: "left", display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", background: on ? "var(--success-bg)" : "var(--card)", border: `1px solid ${on ? "var(--green)" : "var(--line-2)"}`, borderRadius: "var(--r-md)", fontSize: "var(--t-sm)", width: "100%" };
        return editable ? <button key={it.k} onClick={() => onToggle?.(it.k)} style={style}>{inner}</button> : <div key={it.k} style={style}>{inner}</div>;
      })}
    </div>
  );
}

const sq: React.CSSProperties = { width: 32, height: 32, borderRadius: "var(--r-sm)", background: "var(--card-2)", border: "1px solid var(--line-2)", color: "var(--ink-1)", display: "inline-flex", alignItems: "center", justifyContent: "center" };
