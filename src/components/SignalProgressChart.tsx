"use client";

/* Evolución de la señal de la prueba a lo largo de los check-ins de Seguimiento.
   Si los valores son numéricos, dibuja una curva; si no, los muestra como timeline. */

export function SignalProgressChart({
  log,
  metric,
  target,
  height = 120,
}: {
  log: { date: string; value: string }[];
  metric?: string;
  target?: string;
  height?: number;
}) {
  const points = (log ?? []).filter((p) => p && p.value != null && `${p.value}`.trim() !== "");
  if (!points.length) return null;

  const parse = (s: string) => {
    const n = parseFloat(`${s}`.replace(/[^0-9.,-]/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };
  const nums = points.map((p) => parse(p.value));
  const allNumeric = nums.every((n) => n != null) && points.length >= 2;
  const tgt = target != null ? parse(target) : null;

  if (!allNumeric) {
    // Fallback cualitativo: lista cronológica de lecturas.
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {metric && <div className="eyebrow" style={{ marginBottom: 2 }}>{metric}{target ? ` · objetivo ${target}` : ""}</div>}
        {points.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--t-sm)" }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: i === points.length - 1 ? "var(--st-follow)" : "var(--line-2)", flexShrink: 0 }} />
            <span className="num muted" style={{ width: 56, flexShrink: 0 }}>{p.date}</span>
            <span style={{ fontWeight: i === points.length - 1 ? 700 : 500 }}>{p.value}</span>
          </div>
        ))}
      </div>
    );
  }

  const vals = nums as number[];
  const lo = Math.min(...vals, ...(tgt != null ? [tgt] : []));
  const hi = Math.max(...vals, ...(tgt != null ? [tgt] : []));
  const span = hi - lo || 1;
  const W = 100, H = height, padY = 14;
  const x = (i: number) => points.length === 1 ? W / 2 : (i / (points.length - 1)) * W;
  const y = (v: number) => padY + (1 - (v - lo) / span) * (H - padY * 2);
  const path = vals.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(" ");
  const last = vals[vals.length - 1], first = vals[0];
  const trendUp = last >= first;

  return (
    <div>
      {(metric || target) && <div className="eyebrow" style={{ marginBottom: 8 }}>{metric}{target ? ` · objetivo ${target}` : ""}</div>}
      <div style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
          {tgt != null && (
            <line x1={0} x2={W} y1={y(tgt)} y2={y(tgt)} stroke="var(--st-follow)" strokeWidth={0.5} strokeDasharray="2 2" opacity={0.7} />
          )}
          <path d={`${path} L ${W} ${H} L 0 ${H} Z`} fill={trendUp ? "color-mix(in srgb, var(--green) 12%, transparent)" : "color-mix(in srgb, var(--risk) 12%, transparent)"} stroke="none" />
          <path d={path} fill="none" stroke={trendUp ? "var(--green)" : "var(--risk)"} strokeWidth={1} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
          {vals.map((v, i) => (
            <circle key={i} cx={x(i)} cy={y(v)} r={1.6} fill={trendUp ? "var(--green)" : "var(--risk)"} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        {tgt != null && <span className="num" style={{ position: "absolute", right: 2, top: y(tgt) / H * height - 8, fontSize: 10, color: "var(--st-follow)", fontWeight: 700 }}>obj. {target}</span>}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: "var(--t-xs)" }}>
        <span className="num muted">{points[0].date}: {points[0].value}</span>
        <span className="num" style={{ fontWeight: 800, color: trendUp ? "var(--green)" : "var(--risk)" }}>{points[points.length - 1].date}: {points[points.length - 1].value}</span>
      </div>
    </div>
  );
}
