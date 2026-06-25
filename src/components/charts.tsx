"use client";

/* ============================================================
   Primitivas de dashboard (estilo BI, tema propio).
   - KpiCard: número grande + flecha ▲/▼ con el Δ (los callouts).
   - Donut:   distribución (la torta) con leyenda.
   - MiniBars: barras por categoría (el "por equipo / precinct").
   Todo SVG/CSS propio, sin dependencia de charting.
   ============================================================ */

import type { ReactNode } from "react";
import { Bar, Card, Sparkline, Trend } from "@/components/ui";

export function KpiCard({
  title, sub, value, delta, deltaSuffix = "%", spark, sparkColor, accent = "var(--green)", onClick,
}: {
  title: string; sub?: string; value: ReactNode; delta?: number; deltaSuffix?: string;
  spark?: number[]; sparkColor?: string; accent?: string; onClick?: () => void;
}) {
  return (
    <Card pad={16} hover={!!onClick} onClick={onClick} style={{ display: "flex", flexDirection: "column", gap: 10, cursor: onClick ? "pointer" : "default" }}>
      <div style={{ minWidth: 0 }}>
        <div className="eyebrow" style={{ color: "var(--ink-2)" }}>{title}</div>
        {sub && <div className="muted" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
          <span className="num" style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, color: accent }}>{value}</span>
          {delta != null && <Trend dir={delta > 0 ? "up" : delta < 0 ? "down" : "flat"} value={`${delta > 0 ? "+" : ""}${delta}${deltaSuffix}`} />}
        </div>
        {spark && spark.length > 1 && <Sparkline data={spark} color={sparkColor ?? accent} w={84} h={26} />}
      </div>
    </Card>
  );
}

export function Donut({
  segments, size = 150, thickness = 22, children,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number; thickness?: number; children?: ReactNode;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
      <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--card-2)" strokeWidth={thickness} />
          {segments.map((s, i) => {
            const dash = (s.value / total) * c;
            const el = (
              <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
                strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-acc} strokeLinecap="butt" />
            );
            acc += dash;
            return el;
          })}
        </svg>
        {children && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>{children}</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 0, flex: 1 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--t-sm)" }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flex: "none" }} />
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
            <span className="num muted" style={{ fontWeight: 700 }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MiniBars({
  items, max, valueFmt, labelWidth = 116,
}: {
  items: { label: string; value: number; color?: string }[];
  max?: number; valueFmt?: (v: number) => string; labelWidth?: number;
}) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--t-sm)" }}>
          <span style={{ width: labelWidth, flex: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }} title={it.label}>{it.label}</span>
          <div style={{ flex: 1, minWidth: 0 }}><Bar value={(it.value / top) * 100} color={it.color ?? "var(--green)"} height={10} /></div>
          <span className="num muted" style={{ width: 44, textAlign: "right", fontWeight: 700 }}>{valueFmt ? valueFmt(it.value) : it.value}</span>
        </div>
      ))}
    </div>
  );
}
