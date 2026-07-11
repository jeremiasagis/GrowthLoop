"use client";

/* Placeholder con shimmer — reemplaza los "Cargando…" para dar
   sensación de velocidad mientras llega la data. Usa la keyframe
   `shimmer` global (respeta prefers-reduced-motion vía el override). */

import type { CSSProperties } from "react";

export function Skeleton({ w = "100%", h = 14, r = 6, style }: { w?: number | string; h?: number | string; r?: number; style?: CSSProperties }) {
  return (
    <div aria-hidden style={{
      width: w, height: h, borderRadius: r,
      background: "linear-gradient(90deg, var(--card-2) 25%, color-mix(in srgb, var(--ink-3) 16%, var(--card-2)) 37%, var(--card-2) 63%)",
      backgroundSize: "200% 100%", animation: "shimmer 1.4s ease infinite",
      ...style,
    }} />
  );
}

/** Varias líneas de texto simuladas (la última más corta). */
export function SkeletonText({ lines = 3, gap = 8 }: { lines?: number; gap?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} h={12} w={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}

/** Fila de card simulada (avatar + dos líneas), para listas. */
export function SkeletonRow() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0" }}>
      <Skeleton w={38} h={38} r={10} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 7 }}>
        <Skeleton h={12} w="45%" />
        <Skeleton h={10} w="70%" />
      </div>
    </div>
  );
}
