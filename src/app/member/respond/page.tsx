"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card } from "@/components/ui";
import { PULSE_DIMS } from "@/lib/data";

const PROMPTS = [
  { key: "works", label: "Lo que funciona", color: "var(--success)", icon: "ThumbsUp" },
  { key: "blocks", label: "Lo que nos traba", color: "var(--warning)", icon: "Construction" },
  { key: "unsaid", label: "Lo que nadie dice", color: "var(--violet)", icon: "EyeOff" },
] as const;

export default function MemberRespondPage() {
  const router = useRouter();
  const [pulse, setPulse] = useState<Record<string, number>>(() =>
    Object.fromEntries(PULSE_DIMS.map((d) => [d.key, 60])),
  );
  const [cards, setCards] = useState<Record<string, string>>({ works: "", blocks: "", unsaid: "" });
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div style={{ textAlign: "center", padding: "40px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ width: 64, height: 64, borderRadius: "var(--r-lg)", background: "var(--success-bg)", color: "var(--green)", display: "grid", placeItems: "center", marginBottom: 8, animation: "pop-in .35s var(--spring)" }}>
          <Icon name="Check" size={32} />
        </div>
        <h1 style={{ fontSize: "var(--t-xl)", fontWeight: 800 }}>¡Gracias por responder!</h1>
        <p className="muted" style={{ fontSize: "var(--t-sm)", maxWidth: 340 }}>Tus respuestas son anónimas. Tu facilitador las verá junto con las del resto del equipo cuando cierre la recolección.</p>
        <Button icon="House" onClick={() => router.push("/member")} style={{ marginTop: 12 }}>Volver al inicio</Button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ fontSize: "var(--t-xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>¿Dónde estamos?</h1>
        <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="Lock" size={13} /> Tus respuestas son anónimas.
        </p>
      </div>

      {/* pulso */}
      <Card pad={20}>
        <div style={{ fontWeight: 700, fontSize: "var(--t-md)", marginBottom: 4 }}>Tu pulso del equipo</div>
        <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 16 }}>Movés cada barra según cómo lo sentís hoy.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {PULSE_DIMS.map((d) => (
            <div key={d.key}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                <span style={{ fontSize: "var(--t-sm)", fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: d.color }} />{d.label}
                </span>
                <span className="num" style={{ fontWeight: 700, color: d.color }}>{pulse[d.key]}</span>
              </div>
              <input type="range" min={0} max={100} value={pulse[d.key]} onChange={(e) => setPulse((p) => ({ ...p, [d.key]: Number(e.target.value) }))}
                style={{ width: "100%", accentColor: d.color }} />
            </div>
          ))}
        </div>
      </Card>

      {/* tarjetas */}
      <Card pad={20}>
        <div style={{ fontWeight: 700, fontSize: "var(--t-md)", marginBottom: 4 }}>Tus tarjetas</div>
        <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 16 }}>Una idea por campo. Podés dejar alguno vacío.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {PROMPTS.map((p) => (
            <div key={p.key}>
              <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "var(--t-sm)", fontWeight: 600, marginBottom: 7 }}>
                <span style={{ color: p.color, display: "inline-flex" }}><Icon name={p.icon} size={16} /></span>{p.label}
              </label>
              <textarea value={cards[p.key]} onChange={(e) => setCards((c) => ({ ...c, [p.key]: e.target.value }))} placeholder="Escribí acá…"
                style={{ width: "100%", minHeight: 60, background: "var(--card-2)", border: "1px solid var(--line-2)", borderLeft: `3px solid ${p.color}`, borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "10px 12px", fontSize: "var(--t-sm)", resize: "vertical", outline: "none" }} />
            </div>
          ))}
        </div>
      </Card>

      <Button full size="lg" icon="Send" onClick={() => setSent(true)}>Enviar respuestas</Button>
    </div>
  );
}
