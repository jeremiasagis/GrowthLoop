"use client";

/* Celebración con confetti: se muestra al subir de nivel o cerrar un ciclo.
   Overlay efímero con un cartel y lluvia de confetti. Se cierra solo. */

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icon";

const COLORS = ["#00E87A", "#3B82F6", "#7C3AED", "#F59E0B", "#EF4444", "#EC4899", "#A3E635"];

export function Celebration({ show, title, subtitle, emoji = "🎉", onDone }: { show: boolean; title: string; subtitle?: string; emoji?: string; onDone?: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => onDone?.(), 3600);
    return () => clearTimeout(t);
  }, [show, onDone]);

  const pieces = useMemo(() => Array.from({ length: 70 }, (_, i) => ({
    id: i, left: Math.random() * 100, delay: Math.random() * 0.7, dur: 2.4 + Math.random() * 1.6,
    color: COLORS[i % COLORS.length], size: 7 + Math.random() * 8, rot: Math.random() * 360,
  })), []);

  if (!mounted || !show) return null;
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 120, pointerEvents: "none", overflow: "hidden" }} aria-hidden>
      {pieces.map((p) => (
        <span key={p.id} style={{ position: "absolute", top: 0, left: `${p.left}%`, width: p.size, height: p.size * 0.6, background: p.color, borderRadius: 2, transform: `rotate(${p.rot}deg)`, animation: `gl-confetti ${p.dur}s linear ${p.delay}s forwards` }} />
      ))}
      <div style={{ position: "absolute", left: "50%", top: "38%", transform: "translate(-50%,-50%)", textAlign: "center", animation: "gl-celebrate .5s var(--spring) both" }}>
        <div style={{ fontSize: 64, marginBottom: 6, filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.3))" }}>{emoji}</div>
        <div style={{ display: "inline-block", background: "var(--bg-2)", border: "1px solid color-mix(in srgb, var(--green) 45%, var(--line))", borderRadius: "var(--r-lg)", padding: "16px 26px", boxShadow: "var(--sh-lg)" }}>
          <div style={{ fontSize: "var(--t-xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>{title}</div>
          {subtitle && <div className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 4 }}>{subtitle}</div>}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Versión inline para el cierre de ciclo dentro de un flujo (sin portal a body). */
export function CelebrationBanner({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "10px 0", animation: "gl-celebrate .5s var(--spring) both" }}>
      <div style={{ fontSize: 44, marginBottom: 6 }}>🎉</div>
      <div style={{ fontSize: "var(--t-lg)", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 8 }}><Icon name="Trophy" size={20} style={{ color: "var(--green)" }} /> {title}</div>
      {subtitle && <div className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 4 }}>{subtitle}</div>}
    </div>
  );
}
