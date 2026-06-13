"use client";

/* Timeline visual del ciclo completo: Exploración → Foco → Ideación →
   Seguimiento → Aprendizaje, con la fecha de la primera sesión de cada
   etapa y la cantidad de sesiones. Reconstruye el recorrido del equipo. */

import { Icon } from "@/components/icon";
import { CYCLE_STAGES, STAGES, type StageKey } from "@/lib/data";
import { stageOfSessionType } from "@/lib/retros/registry";

export function CycleTimeline({
  sessions, currentStage, done,
}: {
  sessions: { stage: string; date: string }[];
  currentStage: StageKey;
  done?: boolean;
}) {
  const curIdx = Math.max(0, CYCLE_STAGES.indexOf(currentStage));
  const items = CYCLE_STAGES.map((st, i) => {
    const ss = sessions.filter((s) => stageOfSessionType(s.stage) === st);
    return {
      st, meta: STAGES[st], count: ss.length, firstDate: ss[0]?.date,
      completed: done || i < curIdx, current: !done && i === curIdx,
    };
  });

  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 0, overflowX: "auto", padding: "4px 0" }}>
      {items.map((it, i) => (
        <div key={it.st} style={{ display: "flex", alignItems: "center", flex: "none" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 92, textAlign: "center" }}>
            <span style={{
              width: 34, height: 34, borderRadius: 99, display: "grid", placeItems: "center", flex: "none",
              background: it.completed ? it.meta.color : it.current ? `color-mix(in srgb, ${it.meta.color} 18%, var(--card))` : "var(--card-2)",
              border: `1px solid ${it.completed || it.current ? it.meta.color : "var(--line-2)"}`,
              color: it.completed ? "#08120c" : it.current ? it.meta.color : "var(--ink-3)", fontWeight: 800, fontSize: "var(--t-sm)",
            }}>
              {it.completed ? <Icon name="Check" size={15} /> : it.meta.n}
            </span>
            <span style={{ fontSize: "var(--t-xs)", fontWeight: it.current ? 700 : 500, color: it.current ? "var(--ink-0)" : it.completed ? "var(--ink-1)" : "var(--ink-3)" }}>{it.meta.label}</span>
            <span className="num" style={{ fontSize: 10, color: "var(--ink-3)" }}>{it.firstDate ? it.firstDate : "—"}</span>
            {it.count > 0 && <span className="num" style={{ fontSize: 10, color: it.meta.color, fontWeight: 700 }}>{it.count} {it.count === 1 ? "sesión" : "sesiones"}</span>}
          </div>
          {i < items.length - 1 && <div style={{ width: 28, height: 2, background: it.completed ? it.meta.color : "var(--line)", margin: "0 4px", flex: "none", alignSelf: "flex-start", marginTop: 17 }} />}
        </div>
      ))}
    </div>
  );
}
