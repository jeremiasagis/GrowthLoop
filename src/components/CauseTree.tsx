"use client";

/* Árbol de causas: las ramas iniciales son las causas más votadas y el
   facilitador encadena porqués (máx 3 niveles bajo la raíz). */

import { Icon } from "./icon";

export interface CauseNode { id: string; text: string; parent?: string }

export function CauseTree({ nodes, editable, maxDepth = 3, onAdd, onEdit, onDelete }: {
  nodes: CauseNode[];
  editable: boolean;
  maxDepth?: number;
  onAdd: (parentId: string) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}) {
  const childrenOf = (pid?: string) => nodes.filter((n) => (n.parent ?? undefined) === pid);
  const Node = ({ n, depth }: { n: CauseNode; depth: number }) => (
    <div style={{ marginLeft: depth ? 20 : 0, paddingLeft: depth ? 14 : 0, borderLeft: depth ? "2px solid color-mix(in srgb, var(--st-focus) 35%, var(--line))" : "none", marginTop: depth ? 8 : 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: depth ? 8 : 11, height: depth ? 8 : 11, borderRadius: 99, background: depth ? "var(--card-2)" : "var(--st-focus)", border: `2px solid ${depth ? "var(--st-focus)" : "var(--st-focus)"}`, flexShrink: 0 }} />
        {editable
          ? <input defaultValue={n.text} placeholder={depth ? "porque…" : "causa…"} onBlur={(e) => { const v = e.target.value.trim(); if (v !== n.text) onEdit(n.id, v); }}
              style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", borderBottom: "1px dashed color-mix(in srgb, var(--st-focus) 50%, transparent)", color: "var(--ink-0)", fontWeight: depth ? 500 : 700, fontSize: "var(--t-sm)", outline: "none", padding: "3px 2px" }} />
          : <span style={{ flex: 1, fontWeight: depth ? 500 : 700, fontSize: "var(--t-sm)", color: n.text ? "var(--ink-0)" : "var(--ink-3)" }}>{n.text || "…"}</span>}
        {editable && depth < maxDepth && (
          <button onClick={() => onAdd(n.id)} title="¿Y por qué está pasando eso?" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--t-xs)", fontWeight: 700, color: "var(--st-focus)", padding: "3px 8px", borderRadius: "var(--r-full)", border: "1px solid color-mix(in srgb, var(--st-focus) 45%, transparent)", flexShrink: 0 }}>
            <Icon name="CornerDownRight" size={11} /> ¿por qué?
          </button>
        )}
        {editable && <button onClick={() => onDelete(n.id)} title="Quitar (con sus ramas)" style={{ color: "var(--ink-3)", padding: 3, flexShrink: 0 }}><Icon name="X" size={13} /></button>}
      </div>
      {childrenOf(n.id).map((c) => <Node key={c.id} n={c} depth={depth + 1} />)}
    </div>
  );
  const roots = childrenOf(undefined);
  if (!roots.length) return <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic", padding: 12 }}>El árbol arranca con las causas más votadas.</p>;
  return <div>{roots.map((r) => <Node key={r.id} n={r} depth={0} />)}</div>;
}
