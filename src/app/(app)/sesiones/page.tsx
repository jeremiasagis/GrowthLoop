"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, StageBadge } from "@/components/ui";
import { type StageKey } from "@/lib/data";

const RETROS: { stage: StageKey; name: string; sub: string; phases: string[] }[] = [
  { stage: "explore", name: "Exploración", sub: "La foto honesta del equipo: tensiones, flujo de trabajo y causas posibles.", phases: ["Pulso anónimo (5 señales)", "3 preguntas en columnas (anónimo)", "Propósito del equipo", "Flujo de trabajo (4 pasos)", "Lluvia de causas posibles"] },
  { stage: "focus", name: "Foco · impacto / esfuerzo", sub: "Priorizar las causas de Exploración y elegir cuál atacar primero.", phases: ["Puntuar cada causa (impacto y esfuerzo)", "Matriz 2×2 revelada", "Elegir la causa a trabajar"] },
  { stage: "proof", name: "Ideación", sub: "Convertir la causa elegida en una apuesta concreta y medible.", phases: ["Lluvia de ideas", "Priorizar con ICE", "Pre-mortem (riesgos)", "Apuesta (si / entonces) + acciones y responsables"] },
  { stage: "learn", name: "Aprendizaje", sub: "Mirar cómo salió lo que se probó y decidir el próximo paso.", phases: ["¿Funcionó? + dato logrado", "Reflexión privada", "Aprendizajes del equipo", "Decisión: implementar / iterar / soltar"] },
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
