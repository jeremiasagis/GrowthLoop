"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, Pill, StageBadge } from "@/components/ui";
import type { StageKey } from "@/lib/data";

const MODES = [
  {
    key: "live", title: "En vivo (sincrónica)", icon: "Radio", color: "var(--green)",
    desc: "Todo el equipo conectado al mismo tiempo. Vos guiás el ritmo, bloque por bloque.",
    bullets: ["Temporizador compartido", "Revelación simultánea de tarjetas", "Votación y decisiones en el momento", "Ideal para presencial o videollamada"],
  },
  {
    key: "async", title: "Asincrónica (por plazo)", icon: "CalendarClock", color: "var(--violet)",
    desc: "Cada quien responde cuando puede, dentro de una fecha límite. Vos cerrás y revisás.",
    bullets: ["Sin agenda compartida", "Respuestas anónimas hasta la fecha", "Ideal para equipos distribuidos", "No sirve para decidir/votar en conjunto"],
  },
];

const TYPES: { stage: StageKey; name: string; desc: string; async: boolean }[] = [
  { stage: "explore", name: "¿Dónde estamos?", desc: "Sacar a la luz las tensiones y variables del equipo. La foto inicial.", async: true },
  { stage: "focus", name: "¿Por qué pasa esto?", desc: "Profundizar en las causas de la variable elegida. Requiere conversación.", async: false },
  { stage: "proof", name: "Diseñar la apuesta", desc: "Elegir una variable y diseñar una prueba concreta. Se decide en conjunto.", async: false },
  { stage: "follow", name: "¿Cómo vamos?", desc: "Check-in del avance de la prueba en curso. Rápido y puntual.", async: true },
  { stage: "learn", name: "Cerrar el ciclo", desc: "Revisar qué aprendimos y qué sigue. Reflexión compartida.", async: false },
];

export default function SesionesPage() {
  const router = useRouter();

  return (
    <div className="screen-pad" style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Sesiones</h1>
        <p className="muted" style={{ marginTop: 4, maxWidth: 640 }}>
          Las sesiones son los encuentros guiados con cada equipo dentro del ciclo de mejora. Acá te explicamos las modalidades y los tipos.
        </p>
      </div>

      {/* cómo se abren */}
      <Card pad={18} style={{ marginBottom: 26, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", borderLeft: "3px solid var(--green)" }}>
        <span style={{ color: "var(--green)", display: "inline-flex" }}><Icon name="Info" size={20} /></span>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>¿Cómo se abre una sesión?</div>
          <div className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 2 }}>
            Siempre desde el equipo. Entrá a <b style={{ color: "var(--ink-1)" }}>Mis equipos</b>, abrí el equipo con el que querés trabajar y tocá <b style={{ color: "var(--ink-1)" }}>“Abrir sesión”</b>.
          </div>
        </div>
        <Button icon="Building2" onClick={() => router.push("/organizaciones")}>Ir a Mis equipos</Button>
      </Card>

      {/* modalidades */}
      <h2 style={{ fontSize: "var(--t-md)", fontWeight: 700, marginBottom: 14 }}>Modalidades</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 30 }}>
        {MODES.map((m) => (
          <Card key={m.key} pad={22} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: "var(--r-lg)", background: `color-mix(in srgb, ${m.color} 16%, transparent)`, color: m.color, display: "grid", placeItems: "center", flex: "none" }}>
                <Icon name={m.icon} size={24} />
              </div>
              <div style={{ fontSize: "var(--t-lg)", fontWeight: 800, letterSpacing: "-0.02em" }}>{m.title}</div>
            </div>
            <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.55 }}>{m.desc}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {m.bullets.map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: "var(--t-sm)" }}>
                  <span style={{ color: m.color, display: "inline-flex", flex: "none" }}><Icon name="Check" size={15} /></span>{b}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* tipos de sesión */}
      <h2 style={{ fontSize: "var(--t-md)", fontWeight: 700, marginBottom: 4 }}>Tipos de sesión (el ciclo)</h2>
      <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 14 }}>
        Cada etapa del ciclo de mejora tiene su sesión. Algunas pueden hacerse asincrónicas; las que necesitan decidir en conjunto, no.
      </p>
      <Card pad={6}>
        {TYPES.map((t, i) => (
          <div key={t.stage} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 12px", borderBottom: i < TYPES.length - 1 ? "1px solid var(--line)" : "none" }}>
            <div style={{ flex: "none" }}><StageBadge stage={t.stage} size="sm" /></div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: "var(--t-sm)" }}>{t.name}</div>
              <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 2 }}>{t.desc}</div>
            </div>
            {t.async ? (
              <Pill color="var(--violet)" bg="var(--violet-soft)" icon="CalendarClock">En vivo o asincrónica</Pill>
            ) : (
              <Pill color="var(--green)" bg="var(--success-bg)" icon="Radio">Solo en vivo</Pill>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}
