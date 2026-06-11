"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/icon";

/** Suspenso anónimo: burbujas que "respiran" mientras el equipo escribe, con un contador vivo.
 *  Lo ven todos; nadie ve el contenido hasta que el facilitador revela. */
export function HiddenDots({ n, label, color = "var(--green)" }: { n: number; label: string; color?: string }) {
  const dots = Math.min(n, 30);
  return (
    <div style={{ textAlign: "center", marginBottom: 18 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center", minHeight: 12, marginBottom: 12 }}>
        {Array.from({ length: dots }).map((_, i) => (
          <span key={i} style={{ width: 11, height: 11, borderRadius: 99, background: color, animation: `gl-breathe 1.7s ${(i * 0.07).toFixed(2)}s infinite ease-in-out` }} />
        ))}
        {n === 0 && <span className="muted" style={{ fontSize: "var(--t-xs)" }}>esperando…</span>}
      </div>
      <div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color, lineHeight: 1 }}>{n}</div>
      <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 4, display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="Lock" size={12} /> {label}</div>
    </div>
  );
}

/** Cascada al revelar: cada ítem entra escalonado (efecto "aparecen todas juntas"). */
export function Cascade({ children, gap = 8 }: { children: ReactNode; gap?: number }) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {items.map((c, i) => (
        <div key={i} style={{ animation: `gl-reveal .5s var(--spring) ${Math.min(i * 0.05, 0.7).toFixed(2)}s both` }}>{c}</div>
      ))}
    </div>
  );
}

/** Encabezado del revelado: un golpe de "✨ Revelado · N". */
export function RevealHeader({ n, label, color = "var(--green)" }: { n: number; label: string; color?: string }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 14, animation: "pop-in .4s var(--spring)" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: "var(--r-full)", background: `color-mix(in srgb, ${color} 14%, transparent)`, color, fontWeight: 800, fontSize: "var(--t-sm)" }}>
        <Icon name="Sparkles" size={15} /> {n} {label}
      </span>
    </div>
  );
}

/** Envuelve cualquier bloque revelado con un "pop" de entrada. */
export function RevealPop({ children }: { children: ReactNode }) {
  return <div style={{ animation: "gl-reveal .5s var(--spring) both" }}>{children}</div>;
}
