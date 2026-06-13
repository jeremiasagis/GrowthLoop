"use client";

/* Diana de The Archer: 3 anillos concéntricos.
   Exterior = resultado general · Medio = métricas posibles · Centro = bullseye. */

export function ArcherTarget({ outer, metrics, bull, hit }: { outer?: string; metrics?: string[]; bull?: string; hit?: boolean }) {
  const S = 280, c = S / 2;
  const rings = [
    { r: c - 6, fill: "color-mix(in srgb, var(--st-proof) 8%, transparent)", stroke: "color-mix(in srgb, var(--st-proof) 35%, transparent)" },
    { r: (c - 6) * 0.66, fill: "color-mix(in srgb, var(--st-proof) 14%, transparent)", stroke: "color-mix(in srgb, var(--st-proof) 50%, transparent)" },
    { r: (c - 6) * 0.34, fill: "color-mix(in srgb, var(--green) 24%, transparent)", stroke: "var(--green)" },
  ];
  return (
    <div>
      <svg viewBox={`0 0 ${S} ${S}`} width="100%" style={{ display: "block", maxWidth: 300, margin: "0 auto" }}>
        {rings.map((ring, i) => <circle key={i} cx={c} cy={c} r={ring.r} fill={ring.fill} stroke={ring.stroke} strokeWidth={i === 2 ? 2.5 : 1.5} />)}
        <text x={c} y={18} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--st-proof)">RESULTADO</text>
        <text x={c} y={c - (c - 6) * 0.5} textAnchor="middle" fontSize="10" fontWeight="800" fill="var(--st-proof)">MÉTRICAS</text>
        <text x={c} y={c + 5} textAnchor="middle" fontSize="22" style={{ filter: hit ? "drop-shadow(0 0 8px var(--green))" : "none", transition: "filter .4s" }}>🎯</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
        <div style={{ textAlign: "center" }}><span className="eyebrow" style={{ color: "var(--st-proof)" }}>Resultado</span><div style={{ fontSize: "var(--t-sm)", fontWeight: 600 }}>{outer || "—"}</div></div>
        {!!(metrics?.length) && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>{metrics.filter((m) => m.trim()).map((m, i) => <span key={i} style={{ fontSize: "var(--t-xs)", padding: "3px 9px", borderRadius: "var(--r-full)", background: "var(--card-2)", border: "1px solid var(--line)" }}>{m}</span>)}</div>}
        <div style={{ textAlign: "center", padding: "10px 12px", background: "color-mix(in srgb, var(--green) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 40%, transparent)", borderRadius: "var(--r-md)" }}>
          <span className="eyebrow" style={{ color: "var(--green)" }}>🎯 Bullseye</span>
          <div style={{ fontSize: "var(--t-md)", fontWeight: 800 }}>{bull || "una métrica · un número"}</div>
        </div>
      </div>
    </div>
  );
}
