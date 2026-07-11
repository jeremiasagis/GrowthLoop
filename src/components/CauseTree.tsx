"use client";

/* Árbol de causas ramificado: las causas más votadas arrancan las
   ramas y el equipo encadena porqués — y una causa puede tener MÁS
   DE UNA razón (varias sub-causas por nodo). Dos modos:
   · editable → armar/ramificar el árbol.
   · pickable → votar los nodos que son la causa raíz real. */

import { Icon } from "./icon";

export interface CauseNode { id: string; text: string; parent?: string }

export function CauseTree({
  nodes, editable, maxDepth = 3, onAdd, onEdit, onDelete,
  pickable = false, myPicks, counts, roots, onPick,
}: {
  nodes: CauseNode[];
  editable: boolean;
  maxDepth?: number;
  onAdd?: (parentId: string) => void;
  onEdit?: (id: string, text: string) => void;
  onDelete?: (id: string) => void;
  pickable?: boolean;
  myPicks?: string[];
  counts?: Record<string, number>;
  roots?: string[];
  onPick?: (id: string) => void;
}) {
  const childrenOf = (pid?: string) => nodes.filter((n) => (n.parent ?? undefined) === pid);
  const picked = (id: string) => (myPicks ?? []).includes(id);
  const isRoot = (id: string) => (roots ?? []).includes(id);

  const Node = ({ n, depth }: { n: CauseNode; depth: number }) => {
    const rootHi = isRoot(n.id);
    return (
      <div style={{ marginLeft: depth ? 20 : 0, paddingLeft: depth ? 14 : 0, borderLeft: depth ? "2px solid color-mix(in srgb, var(--st-focus) 35%, var(--line))" : "none", marginTop: depth ? 8 : 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: depth ? 8 : 11, height: depth ? 8 : 11, borderRadius: 99, background: depth ? "var(--card-2)" : "var(--st-focus)", border: "2px solid var(--st-focus)", flexShrink: 0 }} />
          {editable ? (
            <input defaultValue={n.text} placeholder={depth ? "porque…" : "causa…"} onBlur={(e) => { const v = e.target.value.trim(); if (v !== n.text) onEdit?.(n.id, v); }}
              style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", borderBottom: "1px dashed color-mix(in srgb, var(--st-focus) 50%, transparent)", color: "var(--ink-0)", fontWeight: depth ? 500 : 700, fontSize: "var(--t-sm)", outline: "none", padding: "3px 2px" }} />
          ) : pickable ? (
            <button onClick={() => onPick?.(n.id)} disabled={!n.text.trim()}
              style={{ flex: 1, minWidth: 0, textAlign: "left", display: "flex", alignItems: "center", gap: 8, padding: "5px 9px", borderRadius: "var(--r-sm)", border: `1px solid ${picked(n.id) ? "var(--st-focus)" : "var(--line)"}`, background: picked(n.id) ? "color-mix(in srgb, var(--st-focus) 12%, var(--card))" : "var(--card)", cursor: n.text.trim() ? "pointer" : "default" }}>
              <Icon name={picked(n.id) ? "CheckCircle2" : "Circle"} size={14} style={{ color: picked(n.id) ? "var(--st-focus)" : "var(--ink-3)", flexShrink: 0 }} />
              <span style={{ flex: 1, fontWeight: depth ? 500 : 700, fontSize: "var(--t-sm)", color: n.text ? "var(--ink-0)" : "var(--ink-3)" }}>{n.text || "…"}</span>
            </button>
          ) : (
            <span style={{ flex: 1, fontWeight: depth ? 500 : 700, fontSize: "var(--t-sm)", color: n.text ? "var(--ink-0)" : "var(--ink-3)", ...(rootHi ? { padding: "3px 9px", borderRadius: "var(--r-sm)", background: "color-mix(in srgb, var(--st-focus) 14%, transparent)", border: "1px solid color-mix(in srgb, var(--st-focus) 45%, transparent)" } : {}) }}>
              {rootHi && <Icon name="Target" size={12} style={{ color: "var(--st-focus)", marginRight: 5 }} />}{n.text || "…"}
            </span>
          )}
          {counts?.[n.id] != null && counts[n.id] > 0 && (
            <span className="num" style={{ flexShrink: 0, fontSize: "var(--t-xs)", fontWeight: 800, color: "var(--st-focus)", background: "color-mix(in srgb, var(--st-focus) 14%, transparent)", borderRadius: "var(--r-full)", padding: "1px 8px" }}>{counts[n.id]}</span>
          )}
          {editable && depth < maxDepth && (
            <button onClick={() => onAdd?.(n.id)} title="¿Y por qué está pasando eso? (podés sumar varias)" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--t-xs)", fontWeight: 700, color: "var(--st-focus)", padding: "3px 8px", borderRadius: "var(--r-full)", border: "1px solid color-mix(in srgb, var(--st-focus) 45%, transparent)", flexShrink: 0 }}>
              <Icon name="CornerDownRight" size={11} /> ¿por qué?
            </button>
          )}
          {editable && <button onClick={() => onDelete?.(n.id)} title="Quitar (con sus ramas)" style={{ color: "var(--ink-3)", padding: 3, flexShrink: 0 }}><Icon name="X" size={13} /></button>}
        </div>
        {childrenOf(n.id).map((c) => <Node key={c.id} n={c} depth={depth + 1} />)}
      </div>
    );
  };

  const rootsList = childrenOf(undefined);
  if (!rootsList.length) return <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic", padding: 12 }}>El árbol arranca con las causas más votadas.</p>;
  return <div>{rootsList.map((r) => <Node key={r.id} n={r} depth={0} />)}</div>;
}
