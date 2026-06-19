"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, StageBadge } from "@/components/ui";
import { type StageKey } from "@/lib/data";

const RETROS: { stage: StageKey; name: string; sub: string; phases: string[] }[] = [
  { stage: "exploration", name: "Exploración", sub: "Módulo de diagnóstico (fuera del ciclo): la foto honesta del equipo para descubrir qué mejorar.", phases: ["¿Dónde estamos?", "Cómo fluye el trabajo", "FODA / Radar del equipo", "Causas posibles", "Cierre → mapa de mejoras"] },
  { stage: "objectives", name: "Apuntar", sub: "Detectar las tensiones y elegir la variable que el equipo va a trabajar.", phases: ["Tensiones anónimas", "Agrupación", "Votación", "Variable elegida"] },
  { stage: "focus", name: "Entender", sub: "Priorizar por impacto y esfuerzo y llegar a la causa raíz.", phases: ["Impacto / esfuerzo (matriz 2×2)", "¿Dónde se traba?", "¿Por qué está pasando? (árbol de causas)", "Causa raíz"] },
  { stage: "ideation", name: "Apostar", sub: "Convertir la causa en una apuesta concreta y medible.", phases: ["¿Cómo podríamos?", "¿Cuál elegimos? (ICE)", "¿Qué podría fallar? (pre-mortem)", "Diseño de la prueba (si / entonces + señal)"] },
  { stage: "follow", name: "Probar", sub: "Mirar cómo viene la prueba: medir la señal, destrabar obstáculos y ajustar.", phases: ["¿Cómo venimos? (check-in)", "¿Qué nos está frenando?", "ROTI / Perfection Game", "Radar del equipo / Starfish"] },
  { stage: "learn", name: "Aprender", sub: "Cerrar el ciclo: qué pasó, qué aprendimos y qué sigue con la variable.", phases: ["¿Qué pasó? + narrativa", "¿Qué aprendimos? → Biblioteca", "¿Qué sigue? (implementar / iterar / pivotar / pausar)", "¿Cómo estamos como equipo?"] },
];

export default function SesionesPage() {
  const router = useRouter();

  return (
    <div className="screen-pad" style={{ maxWidth: 1000 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Sesiones</h1>
        <p className="muted" style={{ marginTop: 4, maxWidth: 640 }}>
          Cada etapa del ciclo tiene su retrospectiva <b style={{ color: "var(--ink-1)" }}>en vivo y facilitada</b>, que va pasando por varias fases (pregunta, anónimo, revelación, votación…).
        </p>
      </div>

      <Card pad={18} style={{ marginBottom: 26, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", borderLeft: "3px solid var(--green)" }}>
        <span style={{ color: "var(--green)", display: "inline-flex" }}><Icon name="Info" size={20} /></span>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>¿Cómo se abre una sesión?</div>
          <div className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 2 }}>
            Desde una <b style={{ color: "var(--ink-1)" }}>iniciativa</b>: Mis equipos → un equipo → una iniciativa → <b style={{ color: "var(--ink-1)" }}>Abrir sesión en vivo</b>. Los participantes entran con el link o desde su panel.
          </div>
        </div>
        <Button icon="Building2" onClick={() => router.push("/organizaciones")}>Ir a Mis equipos</Button>
      </Card>

      {/* Próximamente: 1 a 1 ─ banner de roadmap */}
      <Card pad={20} style={{ marginBottom: 26, border: "1px solid color-mix(in srgb, var(--violet) 32%, var(--line))", background: "linear-gradient(180deg, color-mix(in srgb, var(--violet) 9%, var(--card)), var(--card))" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
          <div style={{ width: 44, height: 44, borderRadius: "var(--r-md)", background: "color-mix(in srgb, var(--violet) 18%, transparent)", color: "var(--violet)", display: "grid", placeItems: "center", flex: "none" }}>
            <Icon name="MessagesSquare" size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 800, fontSize: "var(--t-md)" }}>Reuniones 1 a 1</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--violet)", background: "color-mix(in srgb, var(--violet) 16%, transparent)", padding: "3px 8px", borderRadius: 99 }}>Próximamente</span>
            </div>
            <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.55, marginTop: 6, maxWidth: 720 }}>
              Además de las retros del equipo, vas a poder tener <b style={{ color: "var(--ink-1)" }}>charlas individuales</b> con cada integrante: cómo viene, feedback en ambas direcciones, qué lo está frenando y su crecimiento. Con <b style={{ color: "var(--ink-1)" }}>agenda compartida</b>, plantillas guiadas, compromisos que se arrastran y <b style={{ color: "var(--ink-1)" }}>conectadas a las señales del equipo</b> para saber de qué hablar.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
              {["Cómo venís", "Feedback", "Qué te frena", "Crecimiento", "Prep de la retro"].map((c) => (
                <span key={c} style={{ fontSize: "var(--t-xs)", fontWeight: 600, color: "var(--ink-2)", background: "var(--card-2)", border: "1px solid var(--line)", padding: "4px 10px", borderRadius: 99 }}>{c}</span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {RETROS.map((r) => (
          <Card key={r.stage} pad={20} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <StageBadge stage={r.stage} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "var(--t-md)" }}>{r.name}</div>
              <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.5, marginTop: 3 }}>{r.sub}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: "auto" }}>
              {r.phases.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: "var(--t-sm)" }}>
                  <span style={{ width: 20, height: 20, borderRadius: 99, background: "var(--card-2)", color: "var(--ink-2)", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800, flex: "none" }}>{i + 1}</span>
                  {p}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
