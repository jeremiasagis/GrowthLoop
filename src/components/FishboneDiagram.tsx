"use client";

/* Diagrama Ishikawa: cabeza (el problema), espina dorsal y espinas
   laterales por categoría. La espina votada se resalta. */

export interface FishCat { key: string; label: string; count: number; color: string }

export function FishboneDiagram({ problem, cats, highlight }: { problem: string; cats: FishCat[]; highlight?: string }) {
  const W = 780, H = 330, spineY = H / 2;
  const headW = 170;
  const x0 = 130, x1 = W - headW - 60;
  const top = cats.filter((_, i) => i % 2 === 0);
  const bottom = cats.filter((_, i) => i % 2 === 1);
  const xFor = (j: number, n: number) => (n <= 1 ? x1 : x1 - (j * (x1 - x0)) / (n - 1));
  const Bone = ({ c, j, n, up }: { c: FishCat; j: number; n: number; up: boolean }) => {
    const x = xFor(j, n);
    const yEnd = up ? spineY - 105 : spineY + 105;
    const hot = highlight === c.key;
    const col = hot ? c.color : "var(--line-2)";
    return (
      <g>
        <line x1={x} y1={spineY} x2={x - 70} y2={yEnd} stroke={col} strokeWidth={hot ? 3 : 2} />
        <foreignObject x={x - 165} y={up ? yEnd - 40 : yEnd - 6} width={190} height={48}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: hot ? c.color : "var(--ink-1)", textAlign: "right", lineHeight: 1.2, padding: "4px 8px", borderRadius: 8, background: hot ? `color-mix(in srgb, ${c.color} 14%, var(--card))` : "var(--card)", border: `1px solid ${hot ? c.color : "var(--line)"}` }}>
              {c.label} <span style={{ fontFamily: "var(--mono)", opacity: 0.8 }}>· {c.count}</span>
            </span>
          </div>
        </foreignObject>
      </g>
    );
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}>
      {/* espina dorsal + cola */}
      <line x1={36} y1={spineY} x2={W - headW - 14} y2={spineY} stroke="var(--ink-3)" strokeWidth="3" />
      <path d={`M 14 ${spineY - 16} L 40 ${spineY} L 14 ${spineY + 16} Z`} fill="none" stroke="var(--ink-3)" strokeWidth="2" />
      {top.map((c, j) => <Bone key={c.key} c={c} j={j} n={top.length} up />)}
      {bottom.map((c, j) => <Bone key={c.key} c={c} j={j} n={bottom.length} up={false} />)}
      {/* cabeza del pez: el problema */}
      <foreignObject x={W - headW - 8} y={spineY - 56} width={headW} height={112}>
        <div style={{ height: "100%", display: "flex", alignItems: "center", background: "color-mix(in srgb, var(--st-focus) 12%, var(--card))", border: "1.5px solid var(--st-focus)", borderRadius: 14, padding: "8px 10px" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-0)", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical", overflow: "hidden" }}>🐟 {problem || "El problema"}</span>
        </div>
      </foreignObject>
    </svg>
  );
}
