"use client";

/* ============================================================
   Loop circular vivo: las 5 etapas del ciclo dispuestas en un
   anillo que se cierra (Apuntar → Entender → Apostar → Probar →
   Aprender → y vuelve). Muestra dónde está el equipo, lo
   completado y el progreso. El loop como bucle, no como barra.
   ============================================================ */

import { CYCLE_STAGES, STAGES, normalizeStage, type StageKey } from "@/lib/data";

export function LoopRing({ stage, done = false, size = 230, onStageClick }: {
  stage: StageKey; done?: boolean; size?: number; onStageClick?: (st: StageKey) => void;
}) {
  const stages = CYCLE_STAGES;
  const n = stages.length;
  const curIdx = Math.max(0, stages.indexOf(normalizeStage(stage)));
  const cx = size / 2, cy = size / 2;
  const R = size / 2 - 26;
  const nodeR = 17;
  const frac = done ? 1 : curIdx / n;
  const pct = Math.round(frac * 100);

  const rad = (i: number) => ((-90 + (i / n) * 360) * Math.PI) / 180;
  const pos = (i: number) => ({ x: cx + R * Math.cos(rad(i)), y: cy + R * Math.sin(rad(i)) });

  const arcPath = (f: number) => {
    if (f <= 0) return "";
    const a0 = rad(0), a1 = ((-90 + f * 360) * Math.PI) / 180;
    const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
    return `M ${x0} ${y0} A ${R} ${R} 0 ${f > 0.5 ? 1 : 0} 1 ${x1} ${y1}`;
  };

  const curMeta = STAGES[stages[curIdx]];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flex: "none" }}>
      {/* track (el loop completo) */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--line)" strokeWidth={6} />
      {/* progreso */}
      {frac > 0 && <path d={arcPath(Math.min(frac, 0.999))} fill="none" stroke="var(--green)" strokeWidth={6} strokeLinecap="round" />}
      {/* nodos */}
      {stages.map((st, i) => {
        const p = pos(i);
        const completed = done || i < curIdx;
        const isCur = !done && i === curIdx;
        const meta = STAGES[st];
        return (
          <g key={st} onClick={onStageClick ? () => onStageClick(st) : undefined} style={{ cursor: onStageClick ? "pointer" : "default" }}>
            <circle cx={p.x} cy={p.y} r={nodeR} fill={completed ? "var(--green)" : "var(--bg-2)"} stroke={completed || isCur ? meta.color : "var(--line-2)"} strokeWidth={isCur ? 2.5 : 1.5} />
            <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={12} fontWeight={800} fill={completed ? "#08120c" : isCur ? meta.color : "var(--ink-3)"}>{completed ? "✓" : meta.n}</text>
          </g>
        );
      })}
      {/* centro */}
      <text x={cx} y={cy - 3} textAnchor="middle" fontSize={28} fontWeight={800} fill="var(--ink-0)">{pct}%</text>
      <text x={cx} y={cy + 17} textAnchor="middle" fontSize={11} fontWeight={600} fill={done ? "var(--green)" : "var(--ink-2)"}>{done ? "completado" : curMeta.label}</text>
    </svg>
  );
}
