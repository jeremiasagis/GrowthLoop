"use client";

import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { Icon } from "./icon";
import { PULSE_DIMS, STAGES, overallOf, to5, type StageKey, type Person, type PulseDim, type PulsePoint } from "@/lib/data";

/* ── Button ───────────────────────────────────────────────── */
type Variant = "primary" | "secondary" | "ghost" | "violet" | "danger" | "dark";
type Size = "sm" | "md" | "lg";

export function Button({
  children, icon, iconRight, variant = "primary", size = "md", full,
  onClick, disabled, style, title,
}: {
  children?: ReactNode; icon?: string; iconRight?: string; variant?: Variant;
  size?: Size; full?: boolean; onClick?: () => void; disabled?: boolean;
  style?: CSSProperties; title?: string;
}) {
  const base: CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    fontWeight: 600, fontFamily: "var(--sans)", borderRadius: "var(--r-md)",
    transition: "all .16s var(--ease)", whiteSpace: "nowrap", width: full ? "100%" : "auto",
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, lineHeight: 1,
  };
  const sizes: Record<Size, CSSProperties> = {
    sm: { padding: "7px 12px", fontSize: "var(--t-sm)" },
    md: { padding: "10px 16px", fontSize: "var(--t-base)" },
    lg: { padding: "13px 22px", fontSize: "var(--t-md)" },
  };
  const variants: Record<Variant, CSSProperties> = {
    primary:   { background: "var(--green)", color: "#062012", boxShadow: "0 4px 14px rgba(0,232,122,0.25)" },
    secondary: { background: "var(--card)", color: "var(--ink-0)", border: "1px solid var(--line-2)" },
    ghost:     { background: "transparent", color: "var(--ink-1)" },
    violet:    { background: "var(--violet)", color: "#fff", boxShadow: "0 4px 14px rgba(124,58,237,0.3)" },
    danger:    { background: "var(--risk-bg)", color: "#ff8b8b", border: "1px solid rgba(239,68,68,0.3)" },
    dark:      { background: "var(--bg-2)", color: "var(--ink-1)", border: "1px solid var(--line)" },
  };
  const iconSize = size === "sm" ? 15 : size === "lg" ? 19 : 17;
  return (
    <button
      title={title} onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      onMouseEnter={(e) => {
        if (disabled) return;
        if (variant === "primary") e.currentTarget.style.background = "#1bf587";
        if (variant === "secondary") e.currentTarget.style.background = "var(--card-hover)";
        if (variant === "ghost") e.currentTarget.style.background = "var(--card-2)";
      }}
      onMouseLeave={(e) => { e.currentTarget.style.background = variants[variant].background as string; }}
    >
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} size={iconSize} />}
    </button>
  );
}

/* ── Card ─────────────────────────────────────────────────── */
export function Card({
  children, style, pad = 20, hover, onClick, glow, className = "", id,
}: {
  children?: ReactNode; style?: CSSProperties; pad?: number; hover?: boolean;
  onClick?: () => void; glow?: boolean; className?: string; id?: string;
}) {
  const [h, setH] = useState(false);
  return (
    <div
      id={id} className={className} onClick={onClick}
      onMouseEnter={() => hover && setH(true)} onMouseLeave={() => setH(false)}
      style={{
        background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)",
        padding: pad, transition: "all .2s var(--ease)", cursor: onClick ? "pointer" : "default",
        boxShadow: glow ? "var(--glow-soft)" : h ? "var(--sh-md)" : "none",
        transform: h ? "translateY(-2px)" : "none",
        borderColor: h ? "var(--line-2)" : "var(--line)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── Stage badge ──────────────────────────────────────────── */
export function StageBadge({ stage, size = "md" }: { stage: StageKey; size?: "sm" | "md" }) {
  const s = STAGES[stage];
  if (!s) return null;
  const pad = size === "sm" ? "3px 8px" : "4px 11px";
  const fs = size === "sm" ? "var(--t-xs)" : "var(--t-sm)";
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: pad,
        borderRadius: "var(--r-full)", fontSize: fs, fontWeight: 600, color: s.color,
        background: `color-mix(in srgb, ${s.color} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${s.color} 30%, transparent)`,
        lineHeight: 1, whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 99, background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
      {s.label}
    </span>
  );
}

/* ── Generic pill ─────────────────────────────────────────── */
export function Pill({
  children, color = "var(--ink-2)", bg, icon, style,
}: { children?: ReactNode; color?: string; bg?: string; icon?: string; style?: CSSProperties }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px",
        borderRadius: "var(--r-full)", fontSize: "var(--t-xs)", fontWeight: 600, color,
        background: bg || "var(--card-2)", border: "1px solid var(--line)", lineHeight: 1.4, ...style,
      }}
    >
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}

/* ── Trend chip ───────────────────────────────────────────── */
export function Trend({ dir, value }: { dir: "up" | "down" | "flat"; value?: string | number }) {
  const map: Record<string, [string, string]> = {
    up: ["TrendingUp", "var(--success)"], down: ["TrendingDown", "var(--risk)"], flat: ["Minus", "var(--ink-2)"],
  };
  const [icon, color] = map[dir] || map.flat;
  return (
    <span className="num" style={{ display: "inline-flex", alignItems: "center", gap: 4, color, fontWeight: 600, fontSize: "var(--t-sm)" }}>
      <Icon name={icon} size={14} />
      {value != null && value}
    </span>
  );
}

/* ── Avatar + stack ───────────────────────────────────────── */
const AV_COLORS = ["#00E87A", "#3B82F6", "#7C3AED", "#06B6D4", "#F59E0B", "#EC4899", "#10B981"];

export function Avatar({ name, initials, size = 30, idx = 0 }: { name?: string; initials?: string; size?: number; idx?: number }) {
  const c = AV_COLORS[idx % AV_COLORS.length];
  return (
    <span
      title={name}
      style={{
        width: size, height: size, borderRadius: 99, flex: "none",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38, fontWeight: 700, color: c,
        background: `color-mix(in srgb, ${c} 18%, var(--card))`,
        border: `1px solid color-mix(in srgb, ${c} 35%, transparent)`,
      }}
    >
      {initials || (name || "?").slice(0, 2)}
    </span>
  );
}

export function AvatarStack({ people, max = 5, size = 30 }: { people: Person[]; max?: number; size?: number }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {shown.map((p, i) => (
        <span key={i} style={{ marginLeft: i ? -8 : 0, outline: "2px solid var(--card)", borderRadius: 99, zIndex: i }}>
          <Avatar name={p.name} initials={p.initials} size={size} idx={i} />
        </span>
      ))}
      {extra > 0 && (
        <span
          style={{
            marginLeft: -8, width: size, height: size, borderRadius: 99, background: "var(--card-2)",
            border: "1px solid var(--line-2)", outline: "2px solid var(--card)", display: "inline-flex",
            alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700, color: "var(--ink-2)",
          }}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

/* ── Section title ────────────────────────────────────────── */
export function SectionTitle({
  icon, children, right, sub,
}: { icon?: string; children?: ReactNode; right?: ReactNode; sub?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {icon && <span style={{ color: "var(--green)", display: "inline-flex" }}><Icon name={icon} size={18} /></span>}
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: "var(--t-md)", fontWeight: 700, letterSpacing: "-0.01em" }}>{children}</h3>
          {sub && <div className="muted" style={{ fontSize: "var(--t-sm)" }}>{sub}</div>}
        </div>
      </div>
      {right}
    </div>
  );
}

/* ── Linear progress bar ──────────────────────────────────── */
export function Bar({
  value, color = "var(--green)", height = 8, track = "var(--card-2)", glow,
}: { value: number; color?: string; height?: number; track?: string; glow?: boolean }) {
  return (
    <div style={{ background: track, borderRadius: 99, height, overflow: "hidden", width: "100%" }}>
      <div
        style={{
          width: Math.max(0, Math.min(100, value)) + "%", height: "100%", background: color,
          borderRadius: 99, transition: "width .8s var(--ease)", boxShadow: glow ? `0 0 10px ${color}` : "none",
        }}
      />
    </div>
  );
}

/* ── Sparkline ────────────────────────────────────────────── */
export function Sparkline({ data, color = "var(--green)", w = 96, h = 30 }: { data: number[]; color?: string; w?: number; h?: number }) {
  const id = useId().replace(/:/g, "");
  if (!data || data.length === 0) return <svg width={w} height={h} style={{ display: "block" }} />;
  const series = data.length === 1 ? [data[0], data[0]] : data;
  const min = Math.min(...series), max = Math.max(...series);
  const span = max - min || 1;
  const pts = series.map((v, i) => [(i / (series.length - 1)) * w, h - 3 - ((v - min) / span) * (h - 6)] as [number, number]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = d + ` L${w} ${h} L0 ${h} Z`;
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.6" fill={color} />
    </svg>
  );
}

/* ── Empty state ──────────────────────────────────────────── */
export function EmptyState({
  icon = "Inbox", title, children, action,
}: { icon?: string; title?: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: 64, height: 64, borderRadius: "var(--r-lg)", background: "var(--card-2)",
          border: "1px dashed var(--line-2)", display: "grid", placeItems: "center", color: "var(--ink-3)", marginBottom: 8,
        }}
      >
        <Icon name={icon} size={28} />
      </div>
      <div style={{ fontWeight: 700, fontSize: "var(--t-md)" }}>{title}</div>
      <div className="muted" style={{ fontSize: "var(--t-sm)", maxWidth: 320 }}>{children}</div>
      {action && <div style={{ marginTop: 10 }}>{action}</div>}
    </div>
  );
}

/* ── Stat ─────────────────────────────────────────────────── */
export function Stat({
  label, value, unit, icon, color = "var(--green)", delta,
}: { label: string; value: ReactNode; unit?: string; icon?: string; color?: string; delta?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--ink-2)", fontSize: "var(--t-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {icon && <span style={{ color }}><Icon name={icon} size={14} /></span>}
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span className="num" style={{ fontSize: "var(--t-2xl)", fontWeight: 700, letterSpacing: "-0.02em" }}>{value}</span>
        {unit && <span className="muted num" style={{ fontSize: "var(--t-base)" }}>{unit}</span>}
        {delta != null && <Trend dir={delta >= 0 ? "up" : "down"} value={(delta >= 0 ? "+" : "") + delta} />}
      </div>
    </div>
  );
}


/* ── Progress ring (days remaining) ───────────────────────── */
export function ProgressRing({
  value, size = 84, stroke = 8, color = "var(--green)", track = "var(--line-2)", children,
}: { value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, value)));
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset .8s var(--ease)", filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}

/* ── Pulse radar (8 dimensiones, escala 1-5) ─────────────────
   values: dimensión → 0-100 interno; se muestra 1-5. */
export function PulseRadar({
  values, dims = PULSE_DIMS, size = 300, showValues = true, compare,
}: { values: Record<string, number>; dims?: PulseDim[]; size?: number; showValues?: boolean; compare?: Record<string, number> }) {
  const n = dims.length;
  const cx = size / 2, cy = size / 2, R = size / 2 - (showValues ? 52 : 16);
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i: number, r: number) => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))] as const;
  const ring = (frac: number) => dims.map((_, i) => pt(i, R * frac).map((v) => v.toFixed(1)).join(",")).join(" ");
  const has = dims.some((d) => values[d.key] != null);
  if (!has) {
    return <div className="muted" style={{ textAlign: "center", padding: "28px 12px", fontSize: "var(--t-sm)" }}>Todavía no hay pulso con las 8 dimensiones. Aparece con la próxima sesión.</div>;
  }
  const shape = dims.map((d, i) => pt(i, R * Math.max(0.04, (values[d.key] ?? 0) / 100)).map((v) => v.toFixed(1)).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ display: "block", overflow: "visible" }}>
      {[0.25, 0.5, 0.75, 1].map((f) => <polygon key={f} points={ring(f)} fill="none" stroke="var(--line)" strokeWidth="1" />)}
      {dims.map((d, i) => { const [x2, y2] = pt(i, R); return <line key={d.key} x1={cx} y1={cy} x2={x2} y2={y2} stroke="var(--line)" strokeWidth="1" />; })}
      {compare && (
        <polygon points={dims.map((d, i) => pt(i, R * Math.max(0.04, (compare[d.key] ?? 0) / 100)).map((v) => v.toFixed(1)).join(",")).join(" ")}
          fill="color-mix(in srgb, var(--violet) 10%, transparent)" stroke="var(--violet)" strokeWidth="1.6" strokeDasharray="5 4" strokeLinejoin="round" />
      )}
      <polygon points={shape} fill="color-mix(in srgb, var(--green) 22%, transparent)" stroke="var(--green)" strokeWidth="2" strokeLinejoin="round" />
      {dims.map((d, i) => {
        const v = values[d.key];
        const [px, py] = pt(i, R * Math.max(0.04, (v ?? 0) / 100));
        const [lx, ly] = pt(i, R + (showValues ? 26 : 10));
        const anchor = Math.abs(Math.cos(angle(i))) < 0.3 ? "middle" : Math.cos(angle(i)) > 0 ? "start" : "end";
        return (
          <g key={d.key}>
            {v != null && <circle cx={px} cy={py} r={3.4} fill="var(--bg-1)" stroke={d.color} strokeWidth="2" />}
            {showValues && (
              <text x={lx} y={ly} textAnchor={anchor} fontSize="10.5" fill="var(--ink-2)" fontWeight="600">
                {d.label.split(" ")[0]}
                <tspan x={lx} dy="12" fontFamily="var(--mono)" fontWeight="800" fill={d.color}>{v != null ? to5(v).toFixed(1) : "—"}</tspan>
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ── Evolución del pulso: una línea con el promedio general (mostrado 1-5) ── */
export function PulseTrend({ data, height = 180 }: { data: PulsePoint[]; height?: number }) {
  const W = 760, padL = 30, padR = 16, padT = 14, padB = 30;
  const H = height;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const n = data.length;
  if (!n) {
    return <div className="muted" style={{ textAlign: "center", padding: "28px 12px", fontSize: "var(--t-sm)" }}>Todavía no hay datos de pulso. Aparecen cuando el equipo hace su primera sesión.</div>;
  }
  const x = (i: number) => padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => padT + innerH - (v / 100) * innerH;
  const pts = data.map((d, i) => [x(i), y(overallOf(d))] as [number, number]);
  const path = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}>
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={padL} x2={W - padR} y1={y(g)} y2={y(g)} stroke="var(--line)" strokeWidth="1" />
          <text x={padL - 8} y={y(g) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)" fontFamily="var(--mono)">{to5(g).toFixed(0)}</text>
        </g>
      ))}
      {data.map((d, i) => <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="var(--ink-2)" fontWeight="600">{d.label}</text>)}
      <path d={path} fill="none" stroke="var(--green)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 4 : 2.8} fill="var(--bg-1)" stroke="var(--green)" strokeWidth="2" />)}
    </svg>
  );
}

/* ── Alert banner ─────────────────────────────────────────── */
export function AlertBanner({
  type = "warning", icon, title, children, action,
}: { type?: "warning" | "risk" | "info" | "success"; icon?: string; title?: string; children?: ReactNode; action?: ReactNode }) {
  const map: Record<string, [string, string]> = {
    warning: ["var(--warning)", "var(--warning-bg)"],
    risk: ["var(--risk)", "var(--risk-bg)"],
    info: ["var(--info)", "var(--info-bg)"],
    success: ["var(--success)", "var(--success-bg)"],
  };
  const [c, bg] = map[type] || map.warning;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 16px", borderRadius: "var(--r-md)", background: bg, border: `1px solid color-mix(in srgb, ${c} 32%, transparent)` }}>
      <span style={{ color: c, display: "inline-flex", flex: "none" }}><Icon name={icon || "AlertTriangle"} size={20} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", color: "var(--ink-0)" }}>{title}</div>}
        <div className="muted" style={{ fontSize: "var(--t-sm)" }}>{children}</div>
      </div>
      {action}
    </div>
  );
}

/* ── Copy link (invitaciones) ─────────────────────────────── */
export function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.origin + path : path;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard no disponible */
    }
  };
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
        readOnly value={url} onFocus={(e) => e.currentTarget.select()}
        style={{ flex: 1, minWidth: 0, background: "var(--card-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-1)", padding: "9px 11px", fontSize: "var(--t-xs)", fontFamily: "var(--mono)", outline: "none" }}
      />
      <Button size="sm" variant={copied ? "primary" : "secondary"} icon={copied ? "Check" : "Copy"} onClick={copy}>
        {copied ? "Copiado" : "Copiar"}
      </Button>
    </div>
  );
}

/* ── Coming soon placeholder ──────────────────────────────── */
