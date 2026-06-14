"use client";

/* ============================================================
   Selector de sesión (modo libre):
   PASO 1 · elegir etapa (con su estado en la iniciativa)
   PASO 2 · elegir retro (cards con duración, badges y "ya realizada")
   PASO 3 · elegir modo (en vivo / asincrónico)
   ============================================================ */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./icon";
import { Button, Pill } from "./ui";
import { useToast } from "./Toast";
import { createLiveSession } from "@/lib/session";
import { retrosForStage, retroInPlan, type RetroDefinition } from "@/lib/retros/registry";
import { getOrg } from "@/lib/repository";
import { CYCLE_STAGES, STAGES, normalizeStage, planOf, type Initiative, type StageKey, type Team } from "@/lib/data";

export function SessionLauncher({ team, initiative, initialStage, onClose }: { team: Team; initiative?: Initiative; initialStage?: StageKey; onClose: () => void }) {
  const router = useRouter();
  const { show } = useToast();
  const plan = planOf(getOrg(team.orgId)?.plan);
  const curIdx = initiative ? CYCLE_STAGES.indexOf(normalizeStage(initiative.stage)) : -1;
  const [stage, setStage] = useState<StageKey | null>(initialStage ?? (initiative ? normalizeStage(initiative.stage) : null));
  const [retro, setRetro] = useState<RetroDefinition | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(initialStage ? 2 : 1);
  const [busy, setBusy] = useState(false);

  // Retros ya hechas por el equipo (por nombre en el historial de sesiones).
  const doneByName = new Map<string, string>();
  for (const s of [...team.sessions].reverse()) doneByName.set(s.retro, s.date);

  const launch = async () => {
    if (!retro || busy) return;
    setBusy(true);
    const res = await createLiveSession({
      teamId: team.id,
      // Exploración es módulo del equipo (sin iniciativa); el ciclo va atado a la iniciativa.
      initiativeId: stage === "exploration" ? undefined : initiative?.id,
      type: retro.sessionType, retro: retro.id, firstStep: retro.entryStep,
    });
    setBusy(false);
    if (res.error || !res.session) { show(res.error ?? "No se pudo abrir la sesión", "TriangleAlert"); return; }
    router.push(`/sala/${res.session.id}`);
  };

  const stageState = (st: StageKey): { label: string; color: string } => {
    if (!initiative || st === "exploration") return { label: "disponible", color: "var(--ink-3)" };
    const i = CYCLE_STAGES.indexOf(st);
    if (initiative.status === "done" || i < curIdx) return { label: "completada", color: "var(--success)" };
    if (i === curIdx) return { label: "en curso", color: STAGES[st].color };
    return { label: "no iniciada", color: "var(--ink-3)" };
  };

  const stageList: StageKey[] = ["exploration", ...CYCLE_STAGES];

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(7,11,22,0.7)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(680px,100%)", maxHeight: "88vh", overflowY: "auto", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", padding: 26, animation: "pop-in .25s var(--spring)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span className="eyebrow" style={{ color: "var(--green)" }}>Abrir sesión · paso {step} de 3</span>
          <button onClick={onClose} style={{ marginLeft: "auto", color: "var(--ink-2)" }}><Icon name="X" size={18} /></button>
        </div>

        {step === 1 && (
          <>
            <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, marginBottom: 4 }}>¿En qué etapa trabajan hoy?</h2>
            <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 16 }}>Pueden hacer retros de cualquier etapa, en el orden que el equipo necesite.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stageList.map((st) => {
                const meta = STAGES[st];
                const state = stageState(st);
                const on = stage === st;
                const isModule = st === "exploration";
                return (
                  <button key={st} onClick={() => { setStage(st); setRetro(null); setStep(2); }}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: "var(--r-md)", textAlign: "left", background: on ? `color-mix(in srgb, ${meta.color} 12%, var(--card))` : "var(--card)", border: isModule ? `1.5px dashed ${on ? meta.color : "var(--line-2)"}` : `1px solid ${on ? meta.color : "var(--line-2)"}`, cursor: "pointer" }}>
                    <span style={{ width: 30, height: 30, borderRadius: 99, display: "grid", placeItems: "center", flex: "none", background: `color-mix(in srgb, ${meta.color} 16%, transparent)`, color: meta.color, fontWeight: 800, fontSize: "var(--t-xs)" }}>
                      {isModule ? <Icon name="Compass" size={15} /> : meta.n}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{meta.label}{isModule && <span className="muted" style={{ fontWeight: 500 }}> · módulo de diagnóstico</span>}</div>
                    </div>
                    <span className="num" style={{ fontSize: "var(--t-xs)", fontWeight: 700, color: state.color }}>{state.label}</span>
                    <Icon name="ChevronRight" size={16} style={{ color: "var(--ink-3)" }} />
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 2 && stage && (
          <>
            <button onClick={() => setStep(1)} className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--t-xs)", fontWeight: 600, marginBottom: 8 }}><Icon name="ChevronLeft" size={13} /> Etapas</button>
            <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, marginBottom: 4 }}>¿Qué retro hacen hoy en {STAGES[stage].label}?</h2>
            <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 16 }}>El output de cada retro se acumula en la etapa.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {retrosForStage(stage).map((r) => {
                const doneAt = doneByName.get(r.name);
                const locked = !retroInPlan(r.id, plan);
                const disabled = !r.implemented || locked;
                return (
                  <button key={r.id} disabled={disabled} title={locked ? "Disponible en el plan Pro" : undefined} onClick={() => { if (locked) { show("Esta retro está disponible en el plan Pro.", "Lock"); return; } setRetro(r); setStep(3); }}
                    style={{ display: "flex", gap: 12, padding: "14px", borderRadius: "var(--r-md)", textAlign: "left", background: "var(--card)", border: `1px solid ${locked ? "color-mix(in srgb, var(--violet) 30%, var(--line-2))" : "var(--line-2)"}`, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.55 : 1 }}>
                    <span title={r.category === "growthloop" ? "Retro propia de Growthloop" : "Retro clásica"} style={{ width: 34, height: 34, borderRadius: "var(--r-md)", display: "grid", placeItems: "center", flex: "none", background: r.category === "growthloop" ? "var(--green-soft)" : "var(--card-2)", color: r.category === "growthloop" ? "var(--green)" : "var(--ink-2)" }}>
                      <Icon name={locked ? "Lock" : r.category === "growthloop" ? "Sparkles" : "BookOpen"} size={16} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{r.name}</span>
                        {locked && <Pill color="var(--violet)" bg="color-mix(in srgb, var(--violet) 16%, transparent)" icon="Lock">Pro</Pill>}
                        {!locked && r.recommended && <Pill color="var(--green)" bg="var(--success-bg)" icon="ThumbsUp">Recomendada</Pill>}
                        {r.sensitive && <Pill color="var(--warning)" bg="var(--warning-bg)" icon="ShieldAlert">Sensible</Pill>}
                        {doneAt && <Pill icon="History">Ya realizada · {doneAt}</Pill>}
                        {!r.implemented && <Pill icon="Clock">Próximamente</Pill>}
                      </div>
                      <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 3 }}>{r.description}</div>
                      {r.note && <div style={{ fontSize: "var(--t-xs)", marginTop: 3, color: "var(--ink-2)", fontStyle: "italic" }}>💡 {r.note}</div>}
                    </div>
                    <span className="num muted" style={{ fontSize: "var(--t-xs)", flex: "none", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Timer" size={12} /> {r.duration}′</span>
                  </button>
                );
              })}
              {!retrosForStage(stage).length && <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>Esta etapa todavía no tiene retros en el catálogo.</p>}
            </div>
          </>
        )}

        {step === 3 && retro && (
          <>
            <button onClick={() => setStep(2)} className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--t-xs)", fontWeight: 600, marginBottom: 8 }}><Icon name="ChevronLeft" size={13} /> Retros</button>
            <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, marginBottom: 4 }}>{retro.name}</h2>
            <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 14 }}>{retro.purpose}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              {retro.phases.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: "var(--t-sm)" }}>
                  <span style={{ width: 20, height: 20, borderRadius: 99, background: "var(--card-2)", color: "var(--ink-2)", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800, flex: "none" }}>{i + 1}</span>
                  <span style={{ flex: 1 }}>{p.name}</span>
                  {p.minutes && <span className="num muted" style={{ fontSize: "var(--t-xs)" }}>{p.minutes}′</span>}
                </div>
              ))}
            </div>
            {retro.sensitive && (
              <div style={{ padding: "10px 12px", background: "var(--warning-bg)", border: "1px solid color-mix(in srgb, var(--warning) 40%, transparent)", borderRadius: "var(--r-md)", marginBottom: 14, fontSize: "var(--t-sm)", display: "flex", gap: 8 }}>
                <Icon name="ShieldAlert" size={16} style={{ color: "var(--warning)", flexShrink: 0, marginTop: 2 }} />
                <span>Retro sensible: requiere encuadre cuidadoso del facilitador y un equipo con confianza suficiente.</span>
              </div>
            )}
            <div className="eyebrow" style={{ marginBottom: 8 }}>Modo</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
              <div style={{ flex: 1, padding: "12px 14px", borderRadius: "var(--r-md)", border: "1px solid var(--green)", background: "color-mix(in srgb, var(--green) 10%, var(--card))" }}>
                <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", display: "flex", alignItems: "center", gap: 6 }}><Icon name="Radio" size={14} style={{ color: "var(--green)" }} /> En vivo</div>
                <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 2 }}>Todos juntos, con QR y pantalla compartida.</div>
              </div>
              <div style={{ flex: 1, padding: "12px 14px", borderRadius: "var(--r-md)", border: "1px solid var(--line-2)", background: "var(--card)", opacity: 0.55 }}>
                <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", display: "flex", alignItems: "center", gap: 6 }}><Icon name="Clock" size={14} /> Asincrónico</div>
                <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 2 }}>{retro.asyncAvailable ? "Próximamente" : "No disponible para esta retro"}</div>
              </div>
            </div>
            <Button full size="lg" icon="Users" disabled={busy} onClick={launch}>{busy ? "Abriendo…" : "Abrir sesión en vivo"}</Button>
          </>
        )}
      </div>
    </div>
  );
}
