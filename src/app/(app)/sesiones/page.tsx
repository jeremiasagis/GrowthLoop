"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, Pill, StageBadge } from "@/components/ui";
import { RETROS } from "@/lib/retros";
import { CYCLE_STAGES, STAGES } from "@/lib/data";

export default function SesionesPage() {
  const router = useRouter();

  return (
    <div className="screen-pad" style={{ maxWidth: 1000 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Sesiones</h1>
        <p className="muted" style={{ marginTop: 4, maxWidth: 640 }}>
          Las sesiones son los encuentros <b style={{ color: "var(--ink-1)" }}>en vivo y facilitados</b> del ciclo de mejora. Cada etapa tiene varias retrospectivas para elegir.
        </p>
      </div>

      <Card pad={18} style={{ marginBottom: 26, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", borderLeft: "3px solid var(--green)" }}>
        <span style={{ color: "var(--green)", display: "inline-flex" }}><Icon name="Info" size={20} /></span>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>¿Cómo se abre una sesión?</div>
          <div className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 2 }}>
            Desde una <b style={{ color: "var(--ink-1)" }}>iniciativa</b>. Entrá a <b style={{ color: "var(--ink-1)" }}>Mis equipos</b> → un equipo → una iniciativa → <b style={{ color: "var(--ink-1)" }}>Abrir sesión en vivo</b>, elegís la retro y los participantes entran con el link o desde su panel.
          </div>
        </div>
        <Button icon="Building2" onClick={() => router.push("/organizaciones")}>Ir a Mis equipos</Button>
      </Card>

      <h2 style={{ fontSize: "var(--t-md)", fontWeight: 700, marginBottom: 4 }}>Retros por etapa</h2>
      <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 16 }}>El facilitador elige cuál usar según el momento del equipo. Todas son en vivo.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {CYCLE_STAGES.map((st) => {
          const meta = STAGES[st];
          const retros = RETROS.filter((r) => r.stage === st);
          return (
            <div key={st}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <StageBadge stage={st} />
                <span className="muted" style={{ fontSize: "var(--t-xs)" }}>{retros.length} {retros.length === 1 ? "retro" : "retros"}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                {retros.map((r) => (
                  <Card key={r.key} pad={16} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{r.name}</span>
                      {r.recommended && <Pill color="var(--green)" bg="var(--success-bg)" icon="Sparkles">Sugerida</Pill>}
                      {r.sensitive && <Pill color="var(--warning)" bg="var(--warning-bg)" icon="ShieldAlert">Sensible</Pill>}
                      {r.optional && <Pill icon="CircleDashed">Opcional</Pill>}
                    </div>
                    <p className="muted" style={{ fontSize: "var(--t-xs)", lineHeight: 1.45, flex: 1 }}>{r.purpose}</p>
                    <div style={{ display: "flex", gap: 12, fontSize: "var(--t-xs)" }} className="muted">
                      <span><Icon name="Clock" size={11} /> {r.durationMin} min</span>
                      <span>Anonimato: {r.anonymity}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
