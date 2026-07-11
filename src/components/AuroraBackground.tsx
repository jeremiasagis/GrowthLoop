"use client";

/* ============================================================
   Aurora — fondo mesh animado (blobs verde/violeta/azul que
   derivan lento y difuminado). Da profundidad y ambiente sin
   ruido. Respeta prefers-reduced-motion (override global corta
   la animación y quedan quietos). Puramente decorativo.
   ============================================================ */

import type { CSSProperties } from "react";

export function AuroraBackground({ fixed = false, intensity = 1 }: { fixed?: boolean; intensity?: number }) {
  const wrap: CSSProperties = {
    position: fixed ? "fixed" : "absolute", inset: 0, zIndex: 0,
    overflow: "hidden", pointerEvents: "none",
  };
  const blob = (extra: CSSProperties, o: number): CSSProperties => ({ opacity: o * intensity, ...extra });
  return (
    <div aria-hidden style={wrap}>
      <div className="gl-aurora-blob" style={blob({ top: "-18%", left: "-12%", background: "radial-gradient(circle, var(--green-glow), transparent 62%)", animationName: "gl-aurora1", animationDuration: "20s" }, 0.55)} />
      <div className="gl-aurora-blob" style={blob({ bottom: "-24%", right: "-14%", background: "radial-gradient(circle, var(--violet-soft), transparent 62%)", animationName: "gl-aurora2", animationDuration: "26s" }, 0.7)} />
      <div className="gl-aurora-blob" style={blob({ top: "22%", right: "8%", background: "radial-gradient(circle, rgba(59,130,246,0.20), transparent 62%)", animationName: "gl-aurora3", animationDuration: "23s" }, 0.55)} />
    </div>
  );
}
