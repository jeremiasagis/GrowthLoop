"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Pill } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { createLiveSession } from "@/lib/session";
import { retrosForStage } from "@/lib/retros";
import { STAGES, type StageKey } from "@/lib/data";

/** Modal para elegir qué retrospectiva de la etapa abrir → crea la sesión y entra a la sala. */
export function RetroPickerModal({ stage, teamId, initiativeId, onClose }: { stage: StageKey; teamId: string; initiativeId?: string; onClose: () => void }) {
  const router = useRouter();
  const { show } = useToast();

  const start = async (retroKey: string) => {
    const res = await createLiveSession({ teamId, initiativeId, type: stage, retro: retroKey });
    if (res.error || !res.session) { show(res.error ?? "No se pudo abrir la sesión", "TriangleAlert"); return; }
    router.push(`/sala/${res.session.id}`);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(7,11,22,0.7)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(620px,100%)", maxHeight: "88vh", overflowY: "auto", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", padding: 24, animation: "pop-in .25s var(--spring)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h3 style={{ fontSize: "var(--t-lg)", fontWeight: 700 }}>Elegí la retro · {STAGES[stage].label}</h3>
          <button onClick={onClose} style={{ color: "var(--ink-2)" }}><Icon name="X" size={22} /></button>
        </div>
        <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 16 }}>Distintas retrospectivas para esta etapa. Elegí la que mejor le sirva al equipo hoy.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {retrosForStage(stage).map((r) => (
            <button key={r.key} onClick={() => start(r.key)}
              style={{ textAlign: "left", padding: 16, borderRadius: "var(--r-md)", background: "var(--card)", border: `1px solid ${r.recommended ? "var(--green)" : "var(--line-2)"}`, transition: "all .15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--green)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = r.recommended ? "var(--green)" : "var(--line-2)")}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: "var(--t-md)" }}>{r.name}</span>
                {r.recommended && <Pill color="var(--green)" bg="var(--success-bg)" icon="Sparkles">Sugerida</Pill>}
                {r.sensitive && <Pill color="var(--warning)" bg="var(--warning-bg)" icon="ShieldAlert">Sensible</Pill>}
                {r.optional && <Pill icon="CircleDashed">Opcional</Pill>}
              </div>
              <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.45, marginBottom: 8 }}>{r.purpose}</p>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: "var(--t-xs)" }} className="muted">
                <span><Icon name="Clock" size={12} /> {r.durationMin} min</span>
                <span>{r.async ? "En vivo o asincrónica" : "Solo en vivo"}</span>
                <span>Anonimato: {r.anonymity}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
