"use client";

/* ============================================================
   Expediente del loop (PLAN-PRODUCTO · §3·B Nivel 2).
   El "hilo" de una mejora en una sola vista: síntoma → causa →
   apuesta → señal → aprendizaje → decisión. Lee el LoopThread
   normalizado (WS1), así no depende de las claves sueltas de cada
   etapa. Es la cabecera del detalle del loop.
   ============================================================ */

import { Icon } from "@/components/icon";
import { Card } from "@/components/ui";
import { loopThread } from "@/lib/loop";
import type { Initiative } from "@/lib/data";

const DEC: Record<string, { l: string; c: string }> = {
  implement: { l: "Implementar", c: "var(--success)" },
  iterate: { l: "Iterar", c: "var(--st-proof)" },
  pivot: { l: "Pivotar", c: "var(--warning)" },
  pause: { l: "Pausar", c: "var(--ink-2)" },
};
const SUST: Record<string, string> = { sustained: "se sostuvo", partial: "parcial", reverted: "se revirtió" };

export function LoopExpediente({ init }: { init: Initiative }) {
  const t = loopThread(init);

  const rows: { icon: string; label: string; color: string; node: React.ReactNode }[] = [
    { icon: "Crosshair", label: "Síntoma", color: "var(--ink-2)", node: t.symptom ?? null },
    { icon: "GitBranch", label: "Causa", color: "var(--st-focus)", node: t.rootCause ?? null },
    {
      icon: "Lightbulb", label: "Apuesta", color: "var(--st-proof)",
      node: t.bet ? (
        <span>{t.bet.if ? <>si <b>{t.bet.if}</b>, </> : null}{t.bet.then ?? (t.bet.signalMetric ? `medir ${t.bet.signalMetric}` : null)}</span>
      ) : null,
    },
    {
      icon: "Activity", label: "Señal", color: "#F59E0B",
      node: t.signal ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {t.signal.metric && <span className="muted" style={{ fontSize: "var(--t-xs)" }}>{t.signal.metric}:</span>}
          {t.signal.before && <><span className="num muted">{t.signal.before}</span><Icon name="ArrowRight" size={12} style={{ color: "var(--ink-3)" }} /></>}
          <span className="num" style={{ fontWeight: 800, color: t.signal.delta != null && t.signal.delta > 0 ? "var(--success)" : t.signal.delta != null && t.signal.delta < 0 ? "var(--risk)" : "var(--ink-0)" }}>{t.signal.now ?? "—"}</span>
          {t.signal.target && <><span className="muted" style={{ fontSize: "var(--t-xs)" }}>/ meta</span><span className="num" style={{ fontWeight: 700, color: "var(--st-proof)" }}>{t.signal.target}</span></>}
          {t.signal.delta != null && t.signal.delta !== 0 && <span style={{ fontSize: "var(--t-xs)", fontWeight: 800, color: t.signal.delta > 0 ? "var(--success)" : "var(--risk)" }}>{t.signal.delta > 0 ? "▲ +" : "▼ "}{t.signal.delta}</span>}
        </span>
      ) : null,
    },
    { icon: "GraduationCap", label: "Aprendido", color: "var(--st-learn)", node: t.learning ?? null },
    {
      icon: "Flag", label: "Decisión", color: "var(--st-learn)",
      node: t.decision ? <span style={{ fontWeight: 700, color: DEC[t.decision]?.c ?? "var(--ink-0)" }}>{DEC[t.decision]?.l ?? t.decision}{t.sustained && SUST[t.sustained] ? <span style={{ fontWeight: 600, color: "var(--ink-2)" }}> · {SUST[t.sustained]}</span> : null}</span> : null,
    },
  ];

  // No mostramos el expediente si el loop todavía no produjo nada del hilo.
  if (!rows.some((r) => r.node)) return null;

  return (
    <Card pad={18} style={{ marginBottom: 22 }}>
      <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, color: "var(--green)" }}>
        <Icon name="Route" size={13} /> El hilo del loop
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {rows.map((r, i) => {
          const last = i === rows.length - 1;
          const has = !!r.node;
          return (
            <div key={r.label} style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 26, flex: "none" }}>
                <span style={{ width: 26, height: 26, borderRadius: "var(--r-full)", background: has ? `color-mix(in srgb, ${r.color} 16%, var(--card))` : "var(--card-2)", border: `1.5px solid ${has ? r.color : "var(--line-2)"}`, color: has ? r.color : "var(--ink-3)", display: "grid", placeItems: "center", flex: "none" }}><Icon name={r.icon} size={13} /></span>
                {!last && <span style={{ flex: 1, width: 2, background: "var(--line)", marginTop: 2, minHeight: 12 }} />}
              </div>
              <div style={{ paddingBottom: last ? 0 : 14, minWidth: 0, flex: 1 }}>
                <div className="eyebrow" style={{ color: has ? r.color : "var(--ink-3)", marginBottom: 1 }}>{r.label}</div>
                <div style={{ fontSize: "var(--t-sm)", lineHeight: 1.45, color: has ? "var(--ink-0)" : "var(--ink-3)", fontStyle: has ? "normal" : "italic" }}>{has ? r.node : "pendiente"}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
