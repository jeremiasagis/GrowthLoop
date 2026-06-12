"use client";

/* Circles & Soup: 3 círculos concéntricos (control / influencia / sopa). */

export const CIRCLE_META = {
  control: { label: "Control directo", color: "var(--green)", hint: "Lo cambiamos nosotros, sin pedir permiso" },
  influence: { label: "Influencia", color: "#3B82F6", hint: "Podemos influir aunque no decidamos" },
  soup: { label: "La sopa", color: "#94A3B8", hint: "Fuera de nuestro alcance: se sazona, no se cambia" },
} as const;
export type CircleKey = keyof typeof CIRCLE_META;

export function CirclesDiagram({ counts, size = 280 }: { counts: Record<CircleKey, number>; size?: number }) {
  const cx = size / 2, cy = size / 2;
  const rings: { key: CircleKey; r: number }[] = [
    { key: "soup", r: size / 2 - 6 },
    { key: "influence", r: size / 2 - 6 - size * 0.17 },
    { key: "control", r: size / 2 - 6 - size * 0.34 },
  ];
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ display: "block", maxWidth: size, margin: "0 auto" }}>
      {rings.map((ring) => (
        <circle key={ring.key} cx={cx} cy={cy} r={ring.r}
          fill={`color-mix(in srgb, ${CIRCLE_META[ring.key].color} 8%, transparent)`}
          stroke={CIRCLE_META[ring.key].color} strokeWidth="1.6"
          strokeDasharray={ring.key === "soup" ? "6 5" : undefined} />
      ))}
      {rings.map((ring, i) => (
        <text key={ring.key} x={cx} y={cy - ring.r + (i === 2 ? ring.r - 4 : 16)} textAnchor="middle" fontSize="11" fontWeight={700} fill={CIRCLE_META[ring.key].color}>
          {CIRCLE_META[ring.key].label} · {counts[ring.key] ?? 0}
        </text>
      ))}
    </svg>
  );
}
