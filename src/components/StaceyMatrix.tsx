"use client";

import { useState } from "react";

/* Matriz de Stacey: acuerdo (Y) × certeza técnica (X), con 4 zonas.
   x,y en 0..1 (0 = bajo, 1 = alto). */

export const STACEY_ZONES = {
  simple: { label: "Simple", color: "var(--green)", desc: "Sabemos qué hacer y cómo. Aplicar mejor práctica." },
  complicated: { label: "Complicado", color: "#3B82F6", desc: "Sabemos cómo pero no qué. Necesita análisis o experto." },
  complex: { label: "Complejo", color: "#F59E0B", desc: "No sabemos bien qué ni cómo. Necesita experimento." },
  chaotic: { label: "Caótico", color: "var(--risk)", desc: "Crisis. Actuar primero para estabilizar." },
} as const;
export type StaceyZone = keyof typeof STACEY_ZONES;

export function zoneOf(x: number, y: number): StaceyZone {
  if (x < 0.25 && y < 0.25) return "chaotic";
  if (x >= 0.5 && y >= 0.5) return "simple";
  if (x >= 0.5 && y < 0.5) return "complicated";
  return "complex";
}

export function StaceyMatrix({ points, my, centroid, editable, onPlace }: {
  points: { x: number; y: number }[];
  my?: { x: number; y: number };
  centroid?: { x: number; y: number };
  editable?: boolean;
  onPlace?: (x: number, y: number) => void;
}) {
  const pos = (x: number, y: number) => ({ left: `${x * 100}%`, top: `${(1 - y) * 100}%` });
  // Posición local mientras se arrastra (no spamea la DB: confirma al soltar).
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const coords = (e: { currentTarget: EventTarget & HTMLElement; clientX: number; clientY: number }) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height)) };
  };
  const shownMy = drag ?? my;
  return (
    <div>
      <div
        onPointerDown={(e) => { if (!editable || !onPlace) return; e.currentTarget.setPointerCapture(e.pointerId); setDrag(coords(e)); }}
        onPointerMove={(e) => { if (!editable || !onPlace || !drag) return; setDrag(coords(e)); }}
        onPointerUp={(e) => { if (!editable || !onPlace || !drag) return; const c = coords(e); onPlace(c.x, c.y); setDrag(null); }}
        style={{ position: "relative", width: "100%", aspectRatio: "4/3", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", overflow: "hidden", cursor: editable ? "grab" : "default", touchAction: editable ? "none" : "auto" }}>
        {/* zonas */}
        <div style={{ position: "absolute", left: "50%", right: 0, top: 0, bottom: "50%", background: "color-mix(in srgb, var(--green) 9%, transparent)" }} />
        <div style={{ position: "absolute", left: "50%", right: 0, top: "50%", bottom: 0, background: "color-mix(in srgb, #3B82F6 8%, transparent)" }} />
        <div style={{ position: "absolute", left: 0, right: "50%", top: 0, bottom: 0, background: "color-mix(in srgb, #F59E0B 7%, transparent)" }} />
        <div style={{ position: "absolute", left: 0, right: "75%", top: "75%", bottom: 0, background: "color-mix(in srgb, #EF4444 14%, transparent)" }} />
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--line-2)" }} />
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "var(--line-2)" }} />
        {/* etiquetas */}
        <span style={{ position: "absolute", top: 6, right: 8, fontSize: 10, fontWeight: 800, color: "var(--green)" }}>SIMPLE</span>
        <span style={{ position: "absolute", bottom: 6, right: 8, fontSize: 10, fontWeight: 800, color: "#3B82F6" }}>COMPLICADO</span>
        <span style={{ position: "absolute", top: 6, left: 8, fontSize: 10, fontWeight: 800, color: "#F59E0B" }}>COMPLEJO</span>
        <span style={{ position: "absolute", bottom: 6, left: 8, fontSize: 10, fontWeight: 800, color: "var(--risk)" }}>CAÓTICO</span>
        <span className="muted" style={{ position: "absolute", bottom: "50%", left: 6, fontSize: 9, transform: "rotate(-90deg)", transformOrigin: "left bottom" }}>ACUERDO →</span>
        <span className="muted" style={{ position: "absolute", bottom: 4, left: "50%", fontSize: 9, transform: "translateX(-50%)" }}>CERTEZA TÉCNICA →</span>
        {/* marcadores */}
        {points.map((p, i) => (
          <span key={i} style={{ position: "absolute", ...pos(p.x, p.y), width: 16, height: 16, borderRadius: 99, background: "color-mix(in srgb, var(--st-focus) 32%, var(--card))", border: "2px solid var(--st-focus)", transform: "translate(-50%,-50%)", animation: `pop-in .35s var(--spring) ${i * 0.05}s both` }} />
        ))}
        {shownMy && <span style={{ position: "absolute", ...pos(shownMy.x, shownMy.y), width: 20, height: 20, borderRadius: 99, background: "var(--green)", border: "2px solid #fff", transform: "translate(-50%,-50%)", boxShadow: "0 0 10px rgba(0,232,122,0.6)", zIndex: 2, transition: drag ? "none" : "left .2s, top .2s" }} title="tu posición" />}
        {centroid && (
          <span style={{ position: "absolute", ...pos(centroid.x, centroid.y), transform: "translate(-50%,-50%)", fontSize: 22, zIndex: 3, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))" }} title="centroide del equipo">⭐</span>
        )}
      </div>
    </div>
  );
}
