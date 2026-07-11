"use client";

/* ============================================================
   Selector de sesión (modo libre):
   PASO 1 · elegir etapa (con su estado en la iniciativa)
   PASO 2 · elegir retro (cards con duración, badges y "ya realizada")
   PASO 3 · elegir modo (en vivo / asincrónico)
   ============================================================ */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./icon";
import { Button, Pill } from "./ui";
import { useToast } from "./Toast";
import { createLiveSession } from "@/lib/session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { retrosForStage, retroInPlan, canonicalRetro, CANONICAL_RETRO, phaseMode, phaseSplit, type RetroDefinition } from "@/lib/retros/registry";
import { getOrg } from "@/lib/repository";
import { CYCLE_STAGES, STAGES, normalizeStage, planOf, planLimits, type Initiative, type StageKey, type Team } from "@/lib/data";
import { getRetroStatus, isRetroActive } from "@/lib/retro-status";

export function SessionLauncher({ team, initiative, initialStage, initialRetro, onClose }: { team: Team; initiative?: Initiative; initialStage?: StageKey; initialRetro?: RetroDefinition; onClose: () => void }) {
  const router = useRouter();
  const { show } = useToast();
  const plan = planOf(getOrg(team.orgId)?.plan);
  const aiEnabled = planLimits(getOrg(team.orgId)?.plan).ai;
  const [intent, setIntent] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiPicks, setAiPicks] = useState<Record<string, string> | null>(null);
  const curIdx = initiative ? CYCLE_STAGES.indexOf(normalizeStage(initiative.stage)) : -1;
  // El método canónico de la etapa (solo etapas del loop con default explícito),
  // si está disponible (implementado + en el plan).
  const canonicalFor = (st: StageKey | null | undefined): RetroDefinition | undefined => {
    if (!st || !CANONICAL_RETRO[st]) return undefined;
    const r = canonicalRetro(st);
    return r && r.implemented && retroInPlan(r.id, plan) ? r : undefined;
  };
  const initStage: StageKey | null = initialRetro ? (initialRetro.stage as StageKey) : (initialStage ?? (initiative ? normalizeStage(initiative.stage) : null));
  const initCanon = initialRetro ? undefined : canonicalFor(initStage);
  const [stage, setStage] = useState<StageKey | null>(initStage);
  const [retro, setRetro] = useState<RetroDefinition | null>(initialRetro ?? initCanon ?? null);
  const [step, setStep] = useState<1 | 2 | 3>(initialRetro ? 3 : initCanon ? 3 : initialStage ? 2 : 1);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"live" | "async">("live");
  const [asyncDays, setAsyncDays] = useState(7);
  const [created, setCreated] = useState<{ id: string; code: string } | null>(null);
  const [retroStatus, setRetroStatus] = useState<Record<string, boolean>>({});
  useEffect(() => { getRetroStatus().then(setRetroStatus); }, []);

  // Retros ya hechas por el equipo (por nombre en el historial de sesiones).
  const doneByName = new Map<string, string>();
  for (const s of [...team.sessions].reverse()) doneByName.set(s.retro, s.date);

  // IA: sugerir qué retro hacer (Pro+), según estado del equipo + intención del facilitador.
  const teamStateText = () => {
    const L: string[] = [];
    if (team.psychSafety > 0) L.push(`Seguridad psicológica del equipo: ${team.psychSafety}/100.`);
    const done = [...doneByName.keys()];
    if (done.length) L.push(`Retros ya hechas: ${done.slice(0, 12).join(", ")}.`); else L.push("El equipo todavía no hizo retros.");
    const d = initiative?.data;
    if (d?.focus?.rootCause) L.push(`Causa raíz detectada: ${d.focus.rootCause}.`);
    if (d?.proof?.betThen) L.push(`Apuesta en juego: ${d.proof.betThen}.`);
    if (d?.follow?.blockers?.length) L.push(`Obstáculos recientes: ${d.follow.blockers.join("; ")}.`);
    if (d?.learn?.decision) L.push(`Última decisión: ${d.learn.decision}.`);
    return L.join("\n");
  };
  const suggest = async () => {
    if (!stage || aiBusy) return;
    const allowed = retrosForStage(stage).filter((r) => r.implemented && retroInPlan(r.id, plan) && isRetroActive(retroStatus, r.id));
    if (!allowed.length) return;
    setAiBusy(true);
    try {
      const { data: s } = await getSupabaseBrowserClient().auth.getSession();
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${s.session?.access_token ?? ""}` },
        body: JSON.stringify({ stage: STAGES[stage].label, intent, state: teamStateText(), retros: allowed.map((r) => ({ id: r.id, name: r.name, purpose: r.purpose })) }),
      });
      const json = await res.json();
      if (!res.ok || json.error) { show(json.error ?? "No se pudo sugerir.", "TriangleAlert"); setAiBusy(false); return; }
      const picks = (json.picks ?? []) as { id: string; reason: string }[];
      setAiPicks(Object.fromEntries(picks.map((p) => [p.id, p.reason])));
      if (!picks.length) show("La IA no encontró una recomendación clara.", "Info");
    } catch { show("No se pudo sugerir.", "TriangleAlert"); }
    setAiBusy(false);
  };

  const launch = async () => {
    if (!retro || busy) return;
    const isAsync = mode === "async" && retro.asyncAvailable;
    setBusy(true);
    const res = await createLiveSession({
      teamId: team.id,
      // Exploración es módulo del equipo (sin iniciativa); el ciclo va atado a la iniciativa.
      initiativeId: stage === "exploration" ? undefined : initiative?.id,
      type: retro.sessionType, retro: retro.id, firstStep: retro.entryStep,
      async: isAsync, asyncUntil: isAsync ? new Date(Date.now() + asyncDays * 86400000).toISOString() : undefined,
    });
    setBusy(false);
    if (res.error || !res.session) { show(res.error ?? "No se pudo abrir la sesión", "TriangleAlert"); return; }
    // Async: no metemos al facilitador a conducir; le mostramos el código para compartir.
    if (isAsync) { setCreated({ id: res.session.id, code: res.session.joinCode ?? "" }); return; }
    router.push(`/sala/${res.session.id}`);
  };
  const shareLink = created ? `${typeof window !== "undefined" ? window.location.origin : ""}/join?code=${created.code}` : "";

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
                  <button key={st} onClick={() => { setStage(st); setAiPicks(null); const canon = canonicalFor(st); if (canon) { setRetro(canon); setStep(3); } else { setRetro(null); setStep(2); } }}
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
            <div style={{ marginBottom: 16, padding: 14, borderRadius: "var(--r-md)", border: "1px solid color-mix(in srgb, var(--violet) 30%, var(--line))", background: "color-mix(in srgb, var(--violet) 6%, var(--card))" }}>
              <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: "var(--violet)" }}><Icon name="Sparkles" size={13} /> ¿No sabés cuál? Que la IA te recomiende {!aiEnabled && <Pill color="var(--violet)" bg="color-mix(in srgb, var(--violet) 16%, transparent)" icon="Lock">Pro</Pill>}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input value={intent} onChange={(e) => setIntent(e.target.value)} onKeyDown={(e) => e.key === "Enter" && aiEnabled && suggest()} disabled={!aiEnabled} placeholder={aiEnabled ? "¿Qué querés trabajar hoy? (opcional)" : "Recomendación inteligente · plan Pro"} style={{ flex: 1, minWidth: 180, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none", opacity: aiEnabled ? 1 : 0.6 }} />
                <Button icon={aiBusy ? "Loader" : aiEnabled ? "Sparkles" : "Lock"} disabled={aiBusy} onClick={aiEnabled ? suggest : () => show("✨ La recomendación con IA está en el plan Pro.", "Lock")}>{aiBusy ? "Pensando…" : aiEnabled ? "Recomendar" : "Recomendar · Pro"}</Button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(aiPicks ? [...retrosForStage(stage).filter((x) => isRetroActive(retroStatus, x.id))].sort((a, b) => (aiPicks[b.id] ? 1 : 0) - (aiPicks[a.id] ? 1 : 0)) : retrosForStage(stage).filter((x) => isRetroActive(retroStatus, x.id))).map((r) => {
                const doneAt = doneByName.get(r.name);
                const locked = !retroInPlan(r.id, plan);
                const aiReason = aiPicks?.[r.id];
                const disabled = !r.implemented || locked;
                return (
                  <button key={r.id} disabled={disabled} title={locked ? "Disponible en el plan Pro" : undefined} onClick={() => { if (locked) { show("Esta retro está disponible en el plan Pro.", "Lock"); return; } setRetro(r); setStep(3); }}
                    style={{ display: "flex", gap: 12, padding: "14px", borderRadius: "var(--r-md)", textAlign: "left", background: aiReason && !locked ? "color-mix(in srgb, var(--violet) 7%, var(--card))" : "var(--card)", border: `1px solid ${aiReason && !locked ? "var(--violet)" : locked ? "color-mix(in srgb, var(--violet) 30%, var(--line-2))" : "var(--line-2)"}`, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.55 : 1 }}>
                    <span title={r.category === "growthloop" ? "Retro propia de Growthloop" : "Retro clásica"} style={{ width: 34, height: 34, borderRadius: "var(--r-md)", display: "grid", placeItems: "center", flex: "none", background: r.category === "growthloop" ? "var(--green-soft)" : "var(--card-2)", color: r.category === "growthloop" ? "var(--green)" : "var(--ink-2)" }}>
                      <Icon name={locked ? "Lock" : r.category === "growthloop" ? "Sparkles" : "BookOpen"} size={16} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{r.name}</span>
                        {aiReason && !locked && <Pill color="var(--violet)" bg="color-mix(in srgb, var(--violet) 16%, transparent)" icon="Sparkles">IA recomienda</Pill>}
                        {locked && <Pill color="var(--violet)" bg="color-mix(in srgb, var(--violet) 16%, transparent)" icon="Lock">Pro</Pill>}
                        {!locked && !aiReason && r.recommended && <Pill color="var(--green)" bg="var(--success-bg)" icon="ThumbsUp">Recomendada</Pill>}
                        {r.sensitive && <Pill color="var(--warning)" bg="var(--warning-bg)" icon="ShieldAlert">Sensible</Pill>}
                        {doneAt && <Pill icon="History">Ya realizada · {doneAt}</Pill>}
                        {!r.implemented && <Pill icon="Clock">Próximamente</Pill>}
                      </div>
                      <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 3 }}>{r.description}</div>
                      {aiReason && !locked && <div style={{ fontSize: "var(--t-xs)", marginTop: 4, color: "var(--violet)", display: "flex", gap: 5 }}><Icon name="Sparkles" size={12} style={{ flexShrink: 0, marginTop: 1 }} /><span>{aiReason}</span></div>}
                      {r.note && <div style={{ fontSize: "var(--t-xs)", marginTop: 3, color: "var(--ink-2)", fontStyle: "italic" }}>💡 {r.note}</div>}
                    </div>
                    <span className="num muted" style={{ fontSize: "var(--t-xs)", flex: "none", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Timer" size={12} /> {r.duration}′</span>
                  </button>
                );
              })}
              {!retrosForStage(stage).filter((x) => isRetroActive(retroStatus, x.id)).length && <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>Esta etapa no tiene retros activas en el catálogo.</p>}
            </div>
          </>
        )}

        {step === 3 && retro && !created && (
          <>
            <button onClick={() => setStep(2)} className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--t-xs)", fontWeight: 600, marginBottom: 8 }}><Icon name="Shuffle" size={13} /> Cambiar herramienta</button>
            <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, marginBottom: 4 }}>{retro.name}</h2>
            <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 14 }}>{retro.purpose}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {retro.phases.map((p, i) => {
                const m = phaseMode(p);
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: "var(--t-sm)" }}>
                    <span style={{ width: 20, height: 20, borderRadius: 99, background: "var(--card-2)", color: "var(--ink-2)", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800, flex: "none" }}>{i + 1}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>{p.name}</span>
                    <span title={m === "async" ? "Puede hacerse async" : "Conviene en vivo"} style={{ fontSize: 10, fontWeight: 700, color: m === "async" ? "var(--info)" : "var(--ink-3)", display: "inline-flex", alignItems: "center", gap: 3, flex: "none" }}><Icon name={m === "async" ? "Clock" : "Radio"} size={10} /> {m}</span>
                    {p.minutes && <span className="num muted" style={{ fontSize: "var(--t-xs)", width: 26, textAlign: "right", flex: "none" }}>{p.minutes}′</span>}
                  </div>
                );
              })}
            </div>
            {(() => {
              const sp = phaseSplit(retro);
              if (!sp.asyncPhases.length || !retro.asyncAvailable) return null;
              return (
                <div style={{ marginBottom: 14, fontSize: "var(--t-xs)", color: "var(--ink-2)", display: "flex", alignItems: "center", gap: 7, padding: "8px 10px", background: "color-mix(in srgb, var(--info) 7%, var(--card))", border: "1px solid color-mix(in srgb, var(--info) 24%, transparent)", borderRadius: "var(--r-md)" }}>
                  <Icon name="Lightbulb" size={13} style={{ color: "var(--info)", flexShrink: 0 }} />
                  <span><b>{sp.asyncPhases.length}</b> {sp.asyncPhases.length === 1 ? "fase puede" : "fases pueden"} ir async{sp.liveMin > 0 ? <> → la parte en vivo es ~{sp.liveMin}′ en vez de {retro.duration}′</> : null}.</span>
                </div>
              );
            })()}
            {retro.sensitive && (
              <div style={{ padding: "10px 12px", background: "var(--warning-bg)", border: "1px solid color-mix(in srgb, var(--warning) 40%, transparent)", borderRadius: "var(--r-md)", marginBottom: 14, fontSize: "var(--t-sm)", display: "flex", gap: 8 }}>
                <Icon name="ShieldAlert" size={16} style={{ color: "var(--warning)", flexShrink: 0, marginTop: 2 }} />
                <span>Retro sensible: requiere encuadre cuidadoso del facilitador y un equipo con confianza suficiente.</span>
              </div>
            )}
            <div className="eyebrow" style={{ marginBottom: 8 }}>Modo</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <button onClick={() => setMode("live")} style={{ flex: 1, textAlign: "left", padding: "12px 14px", borderRadius: "var(--r-md)", border: `1px solid ${mode === "live" ? "var(--green)" : "var(--line-2)"}`, background: mode === "live" ? "color-mix(in srgb, var(--green) 10%, var(--card))" : "var(--card)", cursor: "pointer" }}>
                <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", display: "flex", alignItems: "center", gap: 6 }}><Icon name="Radio" size={14} style={{ color: "var(--green)" }} /> En vivo</div>
                <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 2 }}>Todos juntos, con QR y pantalla compartida.</div>
              </button>
              <button onClick={() => retro.asyncAvailable && setMode("async")} disabled={!retro.asyncAvailable}
                style={{ flex: 1, textAlign: "left", padding: "12px 14px", borderRadius: "var(--r-md)", border: `1px solid ${mode === "async" && retro.asyncAvailable ? "var(--info)" : "var(--line-2)"}`, background: mode === "async" && retro.asyncAvailable ? "color-mix(in srgb, var(--info) 10%, var(--card))" : "var(--card)", opacity: retro.asyncAvailable ? 1 : 0.55, cursor: retro.asyncAvailable ? "pointer" : "default" }}>
                <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", display: "flex", alignItems: "center", gap: 6 }}><Icon name="Clock" size={14} style={{ color: retro.asyncAvailable ? "var(--info)" : undefined }} /> Asincrónico</div>
                <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 2 }}>{retro.asyncAvailable ? "Cada uno aporta cuando puede; vos cerrás después." : "No disponible para esta retro"}</div>
              </button>
            </div>
            {mode === "async" && retro.asyncAvailable && (
              <div style={{ marginBottom: 16 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Abierto durante</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[3, 7, 14].map((d) => (
                    <button key={d} onClick={() => setAsyncDays(d)} style={{ flex: 1, padding: "8px 10px", borderRadius: "var(--r-md)", fontSize: "var(--t-sm)", fontWeight: 700, border: `1px solid ${asyncDays === d ? "var(--info)" : "var(--line-2)"}`, background: asyncDays === d ? "color-mix(in srgb, var(--info) 12%, var(--card))" : "var(--card)", color: asyncDays === d ? "var(--info)" : "var(--ink-2)", cursor: "pointer" }}>{d} días</button>
                  ))}
                </div>
              </div>
            )}
            {mode === "async" && retro.asyncAvailable
              ? <Button full size="lg" variant="secondary" icon="Send" disabled={busy} onClick={launch}>{busy ? "Abriendo…" : "Abrir aporte asincrónico"}</Button>
              : <Button full size="lg" icon="Users" disabled={busy} onClick={launch}>{busy ? "Abriendo…" : "Abrir sesión en vivo"}</Button>}
          </>
        )}

        {created && (
          <>
            <div style={{ textAlign: "center", padding: "6px 0 14px" }}>
              <span style={{ width: 52, height: 52, borderRadius: "var(--r-lg)", background: "color-mix(in srgb, var(--info) 14%, transparent)", color: "var(--info)", display: "grid", placeItems: "center", margin: "0 auto 12px" }}><Icon name="Clock" size={26} /></span>
              <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800 }}>Aporte asincrónico abierto</h2>
              <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 6, maxWidth: 420, marginInline: "auto", lineHeight: 1.5 }}>
                Compartí el código con el equipo. Cada uno suma su mirada cuando puede, durante {asyncDays} días. Cuando estén las respuestas, abrís la sala y la cerrás para guardar el resultado.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)" }}>
                <span className="muted" style={{ fontSize: "var(--t-xs)", fontWeight: 700 }}>CÓDIGO</span>
                <span className="num" style={{ fontSize: "var(--t-xl)", fontWeight: 800, letterSpacing: "0.12em", flex: 1 }}>{created.code}</span>
                <Button size="sm" variant="secondary" icon="Copy" onClick={() => { navigator.clipboard?.writeText(created.code); show("Código copiado", "Check"); }}>Copiar</Button>
              </div>
              <Button size="sm" variant="secondary" icon="Link" onClick={() => { navigator.clipboard?.writeText(shareLink); show("Link copiado", "Check"); }}>Copiar link de invitación</Button>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Button full variant="secondary" icon="Eye" onClick={() => router.push(`/sala/${created.id}`)}>Ir a la sala</Button>
              <Button full icon="Check" onClick={onClose}>Listo</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
