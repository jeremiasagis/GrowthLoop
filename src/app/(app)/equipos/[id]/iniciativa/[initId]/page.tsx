"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import {
  AvatarStack, Bar, Button, Card, EmptyState, Pill, ProgressRing,
  PulseRadar, SectionTitle, StageBadge, Stat,
} from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/components/Toast";
import {
  deleteInitiative, getFacilitators, getInitiatives, getOrg, getTeam, patchInitiativeData, setInitiativeStage, setInitiativeStatus,
} from "@/lib/repository";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createLiveSession, discardSession, getInitiativeSessions, loadSessionMemories, type SessionCard, type SessionCluster, type SessionVote, type SessionMemory } from "@/lib/session";
import { SessionLauncher } from "@/components/SessionLauncher";
import { MemoryCard } from "@/components/RetroResult";
import { SignalProgressChart } from "@/components/SignalProgressChart";
import { CycleTimeline } from "@/components/CycleTimeline";
import { WordCloud } from "@/components/WordCloud";
import { retrosForStage, stageOfSessionType, CANONICAL_RETRO, type RetroDefinition } from "@/lib/retros/registry";
import { CYCLE_STAGES, PULSE_DIMS, STAGES, nextCycleStage, normalizeStage, planLimits, overallOf, type Initiative, type StageKey, type Team } from "@/lib/data";

type StageContent = { cards: SessionCard[]; clusters: SessionCluster[]; votes: SessionVote[]; result?: Record<string, unknown> };

/** Red de seguridad: si el resumen guardado de una etapa falta, lo derivamos
 *  de las sesiones reales (tarjetas, clusters, votos y el result vivo). */
function withDerived(init: Initiative, sc: Record<string, StageContent>): Initiative {
  const d = { ...(init.data ?? {}) } as NonNullable<Initiative["data"]>;
  const ex = sc["objectives"];
  if (ex) {
    const vb: Record<string, number> = {}; ex.votes.forEach((v) => { vb[v.clusterId] = (vb[v.clusterId] ?? 0) + 1; });
    const ranked = [...ex.clusters].sort((a, b) => (vb[b.id] ?? 0) - (vb[a.id] ?? 0));
    const e = { ...(d.explore ?? {}) };
    if (!e.tensions?.length && ranked.length) e.tensions = ranked.map((c) => ({ name: c.name, signals: ex.cards.filter((x) => x.clusterId === c.id).length, dots: vb[c.id] ?? 0 }));
    if (!e.priority && ranked[0]) e.priority = ranked[0].name;
    if (!e.purpose && ex.result?.purpose) e.purpose = String(ex.result.purpose);
    if (!e.causes?.length) { const cz = ex.cards.filter((c) => c.columnKey === "cause").map((c) => c.text); if (cz.length) e.causes = cz; }
    d.explore = e;
  }
  const fo = sc["focus"];
  if (fo?.result && !d.focus?.cause) {
    const idx = fo.result.causeIdx as number | undefined;
    const causes = d.explore?.causes ?? [];
    const cause = idx != null ? causes[idx] : undefined;
    if (cause) d.focus = { ...(d.focus ?? {}), cause, rootCause: cause, causes };
  }
  const pr = sc["ideation"];
  if (pr?.result && !(d.proof?.bets?.length || d.proof?.betThen)) {
    const bets = pr.result.bets as NonNullable<NonNullable<Initiative["data"]>["proof"]>["bets"];
    if (bets?.length) d.proof = { ...(d.proof ?? {}), bets, betIf: bets[0]?.betIf, betThen: bets[0]?.betThen, signalMetric: bets[0]?.signalMetric, signalTarget: bets[0]?.signalTarget, signalHow: bets[0]?.signalHow, deadline: bets[0]?.deadline, actions: bets[0]?.actions };
  }
  const le = sc["learn"];
  if (le?.result && !(d.learn?.decision || d.learn?.learnings?.length)) {
    const r = le.result;
    const results = r.results as string[] | undefined;
    const decisions = r.decisions as string[] | undefined;
    const learnings = le.cards.filter((c) => c.columnKey === "learning").map((c) => c.text);
    if (results?.length || decisions?.length || learnings.length) {
      d.learn = { ...(d.learn ?? {}), results, decisions, achieved: r.achieved as string[] | undefined, result: (r.result as string) ?? results?.[0], decision: (r.decision as string) ?? decisions?.[0], learnings };
    }
  }
  return { ...init, data: d };
}

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" });
}

const OUTCOME: Record<string, string> = {
  objectives: "Variable elegida y tensiones detectadas",
  focus: "Causa elegida (impacto/esfuerzo)",
  ideation: "Apuesta diseñada y en marcha",
  follow: "¿Cómo viene la acción definida?",
  learn: "Aprendizajes y decisión de cierre",
};
// Etapa del ciclo → tipo de sesión (retro) que hoy la trabaja en la sala.
const STAGE_TO_TYPE: Record<string, string> = { objectives: "explore", ideation: "proof" };

/* ── cuerpo de cada etapa ─────────────────────────────────── */
function StageBody({ st, init, hasSession }: { st: StageKey; init: Initiative; hasSession?: boolean }) {
  const data = init.data ?? {};
  const empty = (text: string) => hasSession ? null : <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>{text}</p>;

  if (st === "objectives") {
    const d = data.explore;
    if (!d?.tensions?.length && !d?.priority) return empty("Todavía no se trabajó esta etapa.");
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {d?.priority && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--success-bg)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
            <Icon name="Star" size={16} style={{ color: "var(--green)" }} />
            <span className="muted" style={{ fontSize: "var(--t-xs)" }}>Tensión priorizada:</span>
            <b style={{ fontSize: "var(--t-sm)" }}>{d.priority}</b>
          </div>
        )}
        {!!d?.tensions?.length && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {d.tensions.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "var(--card-2)", borderRadius: "var(--r-sm)", border: "1px solid var(--line)" }}>
                <span className="num" style={{ color: i === 0 ? "var(--green)" : "var(--ink-3)", fontWeight: 700, width: 18 }}>{i + 1}</span>
                <span style={{ fontSize: "var(--t-sm)", fontWeight: 600, flex: 1, minWidth: 0 }}>{t.name}</span>
                <span className="muted" style={{ fontSize: "var(--t-xs)" }}>{t.signals} señales</span>
                <Pill color="var(--green)" bg="var(--success-bg)" icon="Vote">{t.dots}</Pill>
              </div>
            ))}
          </div>
        )}
        {!!d?.pausedCount && <p className="muted" style={{ fontSize: "var(--t-xs)" }}>{d.pausedCount} {d.pausedCount === 1 ? "tensión guardada" : "tensiones guardadas"} como iniciativas pausadas del equipo.</p>}
        {d?.purpose && (
          <div style={{ padding: "10px 12px", background: "color-mix(in srgb, var(--st-explore) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--st-explore) 26%, transparent)", borderRadius: "var(--r-md)" }}>
            <div className="eyebrow" style={{ color: "var(--st-explore)", marginBottom: 4 }}>Propósito del equipo</div>
            <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.5 }}>{d.purpose}</p>
          </div>
        )}
        {d?.criticalStage && <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--t-sm)" }}><Icon name="Cog" size={14} style={{ color: "var(--st-explore)" }} /><span className="muted">Etapa más crítica del flujo:</span> <b>{d.criticalStage}</b></div>}
        {!!d?.causes?.length && (
          <div>
            <div className="eyebrow" style={{ marginBottom: 8, color: "var(--st-focus)" }}>Causas posibles ({d.causes.length}) · pasan a Foco</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {d.causes.map((c, i) => <span key={i} style={{ fontSize: "var(--t-xs)", padding: "5px 10px", borderRadius: "var(--r-full)", background: "var(--card-2)", border: "1px solid var(--line)" }}>{c}</span>)}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (st === "focus") {
    const d = data.focus;
    if (!d?.rootCause && !d?.causes?.length && !d?.blockFormulation && !d?.priorityProblems?.length && !d?.tensionHypothesis && !d?.journeyFinding && !d?.perfectionScore && !d?.staceyZone) return empty("Todavía no se hizo la sesión de foco.");
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {d?.blockFormulation && (
          <div style={{ padding: "12px 14px", background: "color-mix(in srgb, var(--st-focus) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--st-focus) 28%, transparent)", borderRadius: "var(--r-md)" }}>
            <div className="eyebrow" style={{ color: "var(--st-focus)", marginBottom: 4 }}>La traba identificada{d.blockStage ? ` · en ${d.blockStage}${d.blockPct ? ` (${d.blockPct}%)` : ""}` : ""}</div>
            <div style={{ fontSize: "var(--t-sm)", fontWeight: 600, lineHeight: 1.5 }}>{d.blockFormulation}</div>
          </div>
        )}
        {(d?.roots?.length || d?.rootCause) && (
          <div style={{ padding: "12px 14px", background: "color-mix(in srgb, var(--st-focus) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--st-focus) 35%, transparent)", borderRadius: "var(--r-md)" }}>
            <div className="eyebrow" style={{ color: "var(--st-focus)", marginBottom: 4 }}>{(d.roots?.length ?? 0) > 1 ? "Causas raíz" : "Causa raíz"}</div>
            {(d.roots?.length ? d.roots : [d.rootCause!]).map((r, i) => <div key={i} style={{ fontSize: "var(--t-md)", fontWeight: 700 }}>{r}</div>)}
          </div>
        )}
        {(d?.priorityProblems?.length || d?.perfectionScore || d?.tensionHypothesis || d?.journeyFinding || d?.clientGap || d?.staceyZone || d?.candidateFactors?.length || d?.clientFbTask) && (
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Contexto adicional de la etapa</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "var(--t-sm)" }}>
              {!!d?.priorityProblems?.length && <p>🎯 <b>Priorizado (impacto×frecuencia):</b> {d.priorityProblems.join(" · ")}</p>}
              {d?.perfectionScore != null && <p>🔟 <b>Perfection Game:</b> el equipo está en <b className="num">{d.perfectionScore}/10</b></p>}
              {!!d?.candidateFactors?.length && <p>🌱 <b>Causas candidatas:</b> {d.candidateFactors.join(" · ")}</p>}
              {d?.tensionHypothesis && <p>⚖️ <b>Tensión{d.tensionPair ? ` (${d.tensionPair})` : ""}:</b> {d.tensionHypothesis}</p>}
              {d?.journeyFinding && <p>🧭 <b>Journey{d.journeyCritical ? ` · fricción en “${d.journeyCritical}”` : ""}:</b> {d.journeyFinding}</p>}
              {d?.clientGap && <p>🗣️ <b>Voz del cliente{d.clientName ? ` (${d.clientName})` : ""}:</b> {d.clientGap}</p>}
              {d?.clientFbTask && <p>📋 <b>Pendiente:</b> conseguir feedback real — {d.clientFbTask.how}{d.clientFbTask.who ? ` · ${d.clientFbTask.who}` : ""}{d.clientFbTask.due ? ` · antes del ${d.clientFbTask.due}` : ""}</p>}
              {d?.staceyZone && <p>🧩 <b>Complejidad (Stacey):</b> {d.staceyZone}{d.staceyAdvice ? ` — ${d.staceyAdvice}` : ""}</p>}
            </div>
          </div>
        )}
        {!!d?.causes?.length && (
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Causas exploradas</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {d.causes.map((c, i) => <span key={i} style={{ fontSize: "var(--t-xs)", padding: "5px 10px", borderRadius: "var(--r-full)", background: "var(--card-2)", border: "1px solid var(--line)" }}>{c}</span>)}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (st === "follow") {
    const d = data.follow;
    const log = d?.signalLog ?? [];
    if (!d?.betCheckins?.length && !d?.signalNow && !d?.decision && !log.length && !d?.blockers?.length && !d?.newActions?.length && !d?.honesty) return empty("Todavía no se hizo seguimiento de la acción.");
    const dec = d?.decision;
    const decMeta = dec === "stop" ? { t: "Detener", c: "var(--risk)" } : dec === "adjust" ? { t: "Ajustar", c: "var(--warning)" } : dec === "continue" ? { t: "Continuar", c: "var(--green)" } : null;
    const hon = d?.honesty;
    const honTotal = hon ? hon.green + hon.yellow + hon.red : 0;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {log.length > 0 && (
          <div style={{ padding: "14px 16px", background: "color-mix(in srgb, var(--st-follow) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--st-follow) 28%, transparent)", borderRadius: "var(--r-md)" }}>
            <SignalProgressChart log={log} metric={data.proof?.signalMetric} target={data.proof?.signalTarget} />
          </div>
        )}
        {d?.signalNow && !log.length && <p style={{ fontSize: "var(--t-sm)" }}><b>Señal hoy:</b> {d.signalNow}</p>}
        {(d?.betCheckins ?? []).map((c, i) => (
          <p key={i} style={{ fontSize: "var(--t-sm)" }}><b>{c.name || "Apuesta"}:</b> {c.signal} · {c.value} ({c.pct}%)</p>
        ))}
        {!!d?.blockers?.length && (
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Obstáculos detectados</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {d.blockers.map((b, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--t-sm)" }}><Icon name="TriangleAlert" size={14} style={{ color: "var(--warning)" }} /><span>{b}</span></div>)}
            </div>
          </div>
        )}
        {!!d?.newActions?.length && (
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Acciones de destrabe</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {d.newActions.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 11px", background: "var(--card-2)", border: "1px solid var(--line)", borderRadius: "var(--r-sm)", fontSize: "var(--t-sm)" }}>
                  <Icon name="Wrench" size={14} style={{ color: "var(--st-follow)" }} /><span style={{ flex: 1 }}>{a.text}</span>{a.who && <span className="muted num" style={{ fontSize: "var(--t-xs)" }}>{a.who}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {decMeta && <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--t-sm)", padding: "5px 12px", borderRadius: "var(--r-full)", background: `color-mix(in srgb, ${decMeta.c} 12%, transparent)`, border: `1px solid ${decMeta.c}`, color: decMeta.c, fontWeight: 700 }}>Decisión: {decMeta.t}</span>}
          {hon && honTotal > 0 && (
            <span className="num muted" style={{ fontSize: "var(--t-xs)", display: "inline-flex", gap: 8 }}>
              <span style={{ color: "var(--green)" }}>🟢 {hon.green}</span><span style={{ color: "var(--warning)" }}>🟡 {hon.yellow}</span><span style={{ color: "var(--risk)" }}>🔴 {hon.red}</span>
            </span>
          )}
        </div>
      </div>
    );
  }

  if (st === "ideation") {
    const d = data.proof;
    if (!d?.betIf && !d?.betThen && !d?.bets?.length && !d?.finalists?.length && !d?.chosenIdea && !d?.risks?.length) return empty("Todavía no se diseñó la apuesta.");
    const betsList = (d?.bets?.length ? d.bets : [{ name: "", betIf: d?.betIf, betThen: d?.betThen, signalMetric: d?.signalMetric, signalTarget: d?.signalTarget, signalHow: d?.signalHow, deadline: d?.deadline, actions: d?.actions, mitigations: d?.mitigations }]);
    const hasBet = !!(d?.betIf || d?.betThen || d?.bets?.length);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {(d?.finalists?.length || d?.chosenIdea) && (
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Ideas{d?.chosenIdea ? " · elegida ✓" : ""}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {d?.chosenIdea && <span style={{ fontSize: "var(--t-xs)", padding: "5px 10px", borderRadius: "var(--r-full)", background: "var(--success-bg)", border: "1px solid color-mix(in srgb, var(--green) 40%, transparent)", color: "var(--green)", fontWeight: 600 }}>🎯 {d.chosenIdea}</span>}
              {(d?.finalists ?? []).filter((f) => f !== d?.chosenIdea).map((f, i) => <span key={i} style={{ fontSize: "var(--t-xs)", padding: "5px 10px", borderRadius: "var(--r-full)", background: "var(--card-2)", border: "1px solid var(--line)" }}>{f}</span>)}
            </div>
          </div>
        )}
        {!hasBet && <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>Falta diseñar la prueba (la apuesta).</p>}
        {hasBet && betsList.map((b, bi) => (
          <div key={bi} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ padding: "14px 16px", background: "color-mix(in srgb, var(--st-proof) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--st-proof) 30%, transparent)", borderRadius: "var(--r-md)" }}>
              <div className="eyebrow" style={{ color: "var(--st-proof)", marginBottom: 6 }}>{betsList.length > 1 ? `Apuesta ${bi + 1}` : "La apuesta"}{b.name ? ` · ${b.name}` : ""}</div>
              <p style={{ fontSize: "var(--t-md)", lineHeight: 1.55 }}>Creemos que si <b style={{ color: "var(--green)" }}>{b.betIf || "…"}</b>, lograremos que <b style={{ color: "var(--st-proof)" }}>{b.betThen || "…"}</b>.</p>
            </div>
            {!!b.actions?.length && (
              <div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Acciones · responsables</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {b.actions.map((a, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 11px", background: "var(--card-2)", border: "1px solid var(--line)", borderRadius: "var(--r-sm)", fontSize: "var(--t-sm)" }}>
                      <Icon name="CheckSquare" size={14} style={{ color: "var(--st-proof)" }} /><span style={{ flex: 1 }}>{a.text}</span>{a.who && <span className="muted num" style={{ fontSize: "var(--t-xs)" }}>{a.who}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 12 }}>
              <Field label="Señal medible" value={b.signalMetric ? `${b.signalMetric}${b.signalTarget ? ` → ${b.signalTarget}` : ""}` : (d?.signal || "—")} icon="Activity" />
              <Field label="Cómo se mide" value={b.signalHow || "—"} icon="Ruler" />
              <Field label="Plazo" value={b.deadline || "—"} icon="CalendarClock" />
            </div>
            {!!b.mitigations?.length && (
              <div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Mitigaciones</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {b.mitigations.map((m, i) => <div key={i} style={{ fontSize: "var(--t-xs)", color: "var(--ink-2)" }}><span style={{ color: "var(--risk)" }}>{m.risk}</span> → <b style={{ color: "var(--ink-0)" }}>{m.plan}</b></div>)}
                </div>
              </div>
            )}
          </div>
        ))}
        {!!d?.committed && <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--t-sm)" }}><Icon name="Handshake" size={14} style={{ color: "var(--st-proof)" }} /><span className="muted">Compromiso:</span> <b>{d.committed} {d.committed === 1 ? "integrante se comprometió" : "integrantes se comprometieron"}</b></div>}
        {!!d?.secondaryIdeas?.length && (
          <div>
            <div className="eyebrow" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Icon name="Archive" size={13} /> Ideas para probar después</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {d.secondaryIdeas.map((s, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 11px", background: "var(--card-2)", border: "1px solid var(--line)", borderRadius: "var(--r-sm)", fontSize: "var(--t-sm)" }}><span>{s.name}</span><span className="muted num" style={{ fontSize: "var(--t-xs)" }}>ICE {s.ice}</span></div>)}
            </div>
          </div>
        )}
      </div>
    );
  }

  // learn
  const d = data.learn;
  if (!d?.decision && !d?.learnings?.length && !d?.narrative && !d?.closeWords?.length) return empty("Todavía no se cerró el ciclo.");
  const resultMap: Record<string, { label: string; color: string }> = {
    yes: { label: "Funcionó", color: "var(--success)" }, partial: { label: "A medias", color: "var(--warning)" }, no: { label: "No funcionó", color: "var(--risk)" },
  };
  const decisionMap: Record<string, { label: string; color: string }> = {
    consolidate: { label: "Implementada", color: "var(--success)" }, iterate: { label: "Iterar", color: "var(--st-proof)" }, drop: { label: "Soltada", color: "var(--ink-2)" },
  };
  const resArr = d?.results?.length ? d.results : (d?.result ? [d.result] : []);
  const decArr = d?.decisions?.length ? d.decisions : (d?.decision ? [d.decision] : []);
  const proofBets = data.proof?.bets ?? [];
  const rows = Math.max(resArr.length, decArr.length, 1);
  const multi = rows > 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Array.from({ length: rows }).map((_, i) => { const r = resArr[i] ? resultMap[resArr[i]] : undefined; const dec = decArr[i] ? decisionMap[decArr[i]] : undefined; const meta = proofBets[i]?.signalTarget; const got = d?.achieved?.[i]; return (
          <div key={i} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {multi && <span style={{ fontSize: "var(--t-xs)", fontWeight: 700, color: "var(--ink-2)", minWidth: 64 }}>Apuesta {i + 1}</span>}
            {r && <Pill color={r.color} bg={`color-mix(in srgb, ${r.color} 14%, transparent)`} icon="Flag">{r.label}</Pill>}
            {dec && <Pill color={dec.color} bg={`color-mix(in srgb, ${dec.color} 14%, transparent)`} icon="GitFork">{dec.label}</Pill>}
            {(meta || got) && <span className="muted num" style={{ fontSize: "var(--t-xs)" }}>meta <b style={{ color: "var(--ink-1)" }}>{meta || "—"}</b> → logrado <b style={{ color: got ? "var(--st-learn)" : "var(--ink-3)" }}>{got || "—"}</b></span>}
          </div>
        ); })}
      </div>
      {!!d?.highlights?.length && (
        <div>
          <div className="eyebrow" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Icon name="Star" size={13} style={{ color: "var(--st-learn)" }} /> Aprendizajes destacados</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {d.highlights.map((h, i) => <span key={i} style={{ fontSize: "var(--t-xs)", padding: "5px 10px", borderRadius: "var(--r-full)", background: "color-mix(in srgb, var(--st-learn) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--st-learn) 35%, transparent)", fontWeight: 600 }}>{h.name} · {h.votes}</span>)}
          </div>
        </div>
      )}
      {!!d?.learnings?.length && (
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Aprendizajes</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {d.learnings.map((l, i) => (
              <div key={i} style={{ display: "flex", gap: 8, fontSize: "var(--t-sm)", padding: "7px 10px", background: "var(--card-2)", borderRadius: "var(--r-sm)", borderLeft: "2px solid var(--st-learn)" }}><Icon name="Lightbulb" size={14} style={{ color: "var(--st-learn)" }} />{l}</div>
            ))}
          </div>
        </div>
      )}
      {!!d?.closeWords?.length && (
        <div>
          <div className="eyebrow" style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}><Icon name="Sparkles" size={13} style={{ color: "var(--st-learn)" }} /> Cómo cerró el equipo</div>
          <WordCloud words={d.closeWords} />
        </div>
      )}
    </div>
  );
}


function Field({ label, value, icon }: { label: string; value: ReactNode; icon: string }) {
  return (
    <div style={{ padding: "10px 12px", background: "var(--card-2)", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>
      <div className="muted" style={{ fontSize: "var(--t-xs)", display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><Icon name={icon} size={12} />{label}</div>
      <div style={{ fontSize: "var(--t-sm)", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

export default function InitiativeDetailPage() {
  const params = useParams<{ id: string; initId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { show } = useToast();
  const [, setNonce] = useState(0);
  const refresh = () => setNonce((n) => n + 1);
  const [stageContent, setStageContent] = useState<Record<string, StageContent>>({});
  // Memoria viva: TODAS las sesiones cerradas, agrupadas por etapa.
  const [stageMemories, setStageMemories] = useState<Record<string, SessionMemory[]>>({});

  useEffect(() => {
    const id = params.initId;
    if (!id) return;
    let active = true;
    (async () => {
      const ss = (await getInitiativeSessions(id)).filter((s) => s.status === "closed");
      const mems = await loadSessionMemories(ss);
      const byStage: Record<string, SessionMemory[]> = {};
      const out: Record<string, StageContent> = {};
      for (const m of mems) {
        const stKey = stageOfSessionType(m.type);
        (byStage[stKey] ??= []).push(m);
        // última de cada etapa para el resumen derivado (StageBody)
        out[stKey] = { cards: m.cards, clusters: m.clusters, votes: m.votes, result: m.result };
      }
      if (active) { setStageContent(out); setStageMemories(byStage); }
    })();
    return () => { active = false; };
  }, [params.initId]);

  const teamId = params.id || "";
  const team = getTeam(teamId);
  const init = getInitiatives(teamId).find((i) => i.id === params.initId);
  const isFacil = user?.role === "facilitator";

  if (!team || !init) {
    return (
      <div className="screen-pad">
        <Card pad={0}><EmptyState icon="SearchX" title="Iniciativa no encontrada">No pudimos encontrar esta iniciativa. Puede que haya sido eliminada.</EmptyState></Card>
      </div>
    );
  }

  const done = init.status === "done";
  const paused = init.status === "paused";
  const curIdx = Math.max(0, CYCLE_STAGES.indexOf(init.stage));
  const sessions = team.sessions.filter((s) => s.initiativeId === init.id);
  const lead = team.facilitatorId ? getFacilitators().find((f) => f.id === team.facilitatorId) : undefined;
  const responsible = init.data?.proof?.responsible;
  const nextStage = CYCLE_STAGES[curIdx + 1];
  const statusMeta = done
    ? { label: "Cerrada", color: "var(--success)", bg: "var(--success-bg)", icon: "CircleCheck" }
    : paused
      ? { label: "Pausada", color: "var(--warning)", bg: "var(--warning-bg)", icon: "Pause" }
      : { label: "En curso", color: "var(--green)", bg: "var(--success-bg)", icon: "Activity" };

  // Modo libre: el botón abre el selector (etapa → retro → modo).
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [selRetro, setSelRetro] = useState<RetroDefinition | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);
  const startLive = () => { setSelRetro(null); setLauncherOpen(true); };
  const openRetro = (r: RetroDefinition) => { setSelRetro(r); setLauncherOpen(true); };
  const changeStage = async (s: StageKey) => {
    const res = await setInitiativeStage(init.id, s);
    if (res.error) show(res.error, "TriangleAlert"); else { show(`Etapa: ${STAGES[s].label}`, "Check"); refresh(); }
  };
  const changeStatus = async (st: Initiative["status"]) => {
    const res = await setInitiativeStatus(init.id, st);
    if (res.error) show(res.error, "TriangleAlert"); else { show("Actualizada", "Check"); refresh(); }
  };
  const scrollTo = (st: StageKey) => document.getElementById(`stage-${st}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  // Cierre explícito de etapa (modo libre): resumen + confirmación.
  const [closeStageOpen, setCloseStageOpen] = useState(false);
  const [closeBusy, setCloseBusy] = useState(false);
  const [finalHonesty, setFinalHonesty] = useState<"green" | "yellow" | "red" | null>(null);
  const nextSt = nextCycleStage(init.stage);
  const stageSessions = sessions.filter((s) => stageOfSessionType(s.stage) === init.stage);
  // Bloqueos obligatorios del ciclo:
  //  · Ideación no cierra sin "Diseño de la prueba" completo (apuesta + señal).
  //  · Seguimiento no cierra sin al menos un check-in de "¿Cómo venimos?".
  const pf = init.data?.proof;
  const fl = init.data?.follow;
  const betReady = !!((pf?.betThen && pf?.signalMetric) || (pf?.bets?.length && pf.bets[0]?.betThen && pf.bets[0]?.signalMetric));
  const followCheckinDone = !!(fl?.startedAt || fl?.signalLog?.length || fl?.betCheckins?.length || fl?.decision || fl?.honesty);
  const stageNorm = normalizeStage(init.stage);
  // Aprendizaje: 3 bloqueos — resultado (A/E o combinada), aprendizaje (B/E o combinada) y decisión (C o combinada).
  const ld = init.data?.learn;
  const hasResultRetro = sessions.some((s) => ["lwhappened", "fourls", "learn"].includes(s.stage));
  const hasLearningRetro = sessions.some((s) => ["lwlearned", "fourls", "learn"].includes(s.stage));
  const hasDecision = !!ld?.decision;
  const learnMissing = stageNorm === "learn" ? [
    !hasResultRetro && { label: "Una retro de resultado (¿Qué pasó? o 4 L's)", types: "lwhappened" },
    !hasLearningRetro && { label: "Una retro de aprendizaje (¿Qué aprendimos? o 4 L's)", types: "lwlearned" },
    !hasDecision && { label: "La retro ¿Qué sigue? con la decisión registrada", types: "lwnext" },
  ].filter(Boolean) as { label: string; types: string }[] : [];
  const closeBlocked = (stageNorm === "ideation" && !betReady) || (stageNorm === "follow" && !followCheckinDone) || (stageNorm === "learn" && learnMissing.length > 0);
  const needsFinalHonesty = stageNorm === "follow" && followCheckinDone && !finalHonesty;
  const DEC_NEXT: Record<string, { label: string; detail: string }> = {
    implement: { label: "Implementar", detail: "La variable entra en Consolidación. Te avisamos en 30 días (in-app) para verificar." },
    iterate: { label: "Iterar", detail: "La variable vuelve a Ideación con el contexto precargado." },
    pivot: { label: "Pivotar", detail: "La variable vuelve a Foco con los aprendizajes como contexto." },
    pause: { label: "Pausar", detail: "La variable queda pausada en el mapa." },
  };
  const HON_OPTS = [
    { k: "green" as const, emoji: "🟢", label: "La prueba funcionó", color: "var(--success)" },
    { k: "yellow" as const, emoji: "🟡", label: "Resultados mixtos", color: "var(--warning)" },
    { k: "red" as const, emoji: "🔴", label: "No funcionó como esperábamos", color: "var(--risk)" },
  ];
  const doCloseStage = async () => {
    if (closeBlocked || needsFinalHonesty) return;
    setCloseBusy(true);
    if (stageNorm === "follow" && finalHonesty) await patchInitiativeData(init.id, "follow", { finalHonesty });
    // Cierre de Aprendizaje: el movimiento de la variable depende de la decisión de ¿Qué sigue?
    if (stageNorm === "learn") {
      const dec = ld?.decision;
      let res: { error?: string } = {};
      if (dec === "iterate") { res = await setInitiativeStage(init.id, "ideation"); await setInitiativeStatus(init.id, "active"); }
      else if (dec === "pivot") { res = await setInitiativeStage(init.id, "focus"); await setInitiativeStatus(init.id, "active"); }
      else if (dec === "pause") { res = await setInitiativeStatus(init.id, "paused"); }
      else if (dec === "implement") {
        const due = new Date(); due.setDate(due.getDate() + 30);
        await patchInitiativeData(init.id, "consolidate", { startedAt: new Date().toISOString(), due: due.toISOString(), pending: true });
        res = await setInitiativeStatus(init.id, "active");
      } else { res = await setInitiativeStatus(init.id, "done"); }
      setCloseBusy(false);
      if (res.error) { show(res.error, "TriangleAlert"); return; }
      setCloseStageOpen(false); setFinalHonesty(null);
      show(dec === "iterate" ? "Iterar · vuelve a Ideación" : dec === "pivot" ? "Pivotar · vuelve a Foco" : dec === "pause" ? "Variable pausada" : dec === "implement" ? "Implementar · en Consolidación 30 días" : "Ciclo cerrado 🎉", "Check");
      refresh();
      return;
    }
    const res = nextSt ? await setInitiativeStage(init.id, nextSt) : await setInitiativeStatus(init.id, "done");
    setCloseBusy(false);
    if (res.error) { show(res.error, "TriangleAlert"); return; }
    setCloseStageOpen(false); setFinalHonesty(null);
    show(nextSt ? `Etapa cerrada · ahora en ${STAGES[nextSt].label}` : "Ciclo cerrado 🎉", "Check");
    refresh();
  };
  const doDelete = async () => { setDelBusy(true); const res = await deleteInitiative(init.id); setDelBusy(false); if (res.error) { show(res.error, "TriangleAlert"); return; } show("Iniciativa eliminada", "Trash2"); router.push(`/equipos/${team.id}`); };

  const discard = async (sessionId: string) => {
    if (!window.confirm("¿Descartar esta sesión? Se borra junto con sus aportes. (Solo aplica a sesiones de prueba o sin resultados.)")) return;
    const res = await discardSession(sessionId);
    if (res.error) { show(res.error, "TriangleAlert"); return; }
    setStageMemories((prev) => {
      const next: Record<string, SessionMemory[]> = {};
      for (const k of Object.keys(prev)) next[k] = prev[k].filter((m) => m.id !== sessionId);
      return next;
    });
    show("Sesión descartada", "Trash2");
  };
  // IA · Reporte ejecutivo del ciclo (Pro+).
  const aiEnabled = planLimits(team.orgId ? getOrg(team.orgId)?.plan : undefined).ai;
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [aiReportBusy, setAiReportBusy] = useState(false);
  const buildReportCtx = (): string => {
    const d = init.data ?? {};
    const RES: Record<string, string> = { yes: "alcanzó el umbral", partial: "alcanzó parcialmente", no: "no alcanzó el umbral" };
    const L: string[] = [];
    L.push(`Equipo: ${team.name}.`);
    if (team.data?.objective?.text) L.push(`Objetivo del equipo: ${team.data.objective.text}.`);
    L.push(`Iniciativa: ${init.title}.${init.description ? " " + init.description : ""}`);
    const pf = d.proof;
    if (pf?.betIf || pf?.betThen) L.push(`Apuesta: si ${pf?.betIf || "—"}, lograríamos ${pf?.betThen || "—"}. Señal: ${pf?.signalMetric || "—"}${pf?.signalTarget ? ` (meta ${pf.signalTarget})` : ""}.`);
    if (pf?.chosenIdea) L.push(`Acción probada: ${pf.chosenIdea}.`);
    if (d.focus?.rootCause) L.push(`Causa raíz: ${d.focus.rootCause}.`);
    const fl = d.follow;
    if (fl?.signalLog?.length) L.push(`Evolución de la señal: ${fl.signalLog.map((s) => `${s.date}: ${s.value}`).join(" → ")}.`);
    if (fl?.blockers?.length) L.push(`Obstáculos: ${fl.blockers.join("; ")}.`);
    const lr = d.learn;
    if (lr?.result) L.push(`Resultado: ${RES[lr.result] ?? lr.result}.`);
    if (lr?.narrative) L.push(`Narrativa del equipo: ${lr.narrative}`);
    if (lr?.learnings?.length) L.push(`Aprendizajes:\n${lr.learnings.map((x) => `- ${x}`).join("\n")}`);
    if (lr?.highlightedLearning) L.push(`Aprendizaje destacado: ${lr.highlightedLearning}.`);
    if (lr?.decision) L.push(`Decisión: ${lr.decision}${lr.decisionReason ? ` — ${lr.decisionReason}` : ""}.`);
    if (team.pulse?.length) L.push(`Clima del equipo (pulso 0-100): de ${overallOf(team.pulse[0])} a ${overallOf(team.pulse[team.pulse.length - 1])}.`);
    return L.join("\n");
  };
  const requestReport = async (): Promise<string | null> => {
    if (aiReportBusy) return null;
    setAiReportBusy(true);
    try {
      const { data: s } = await getSupabaseBrowserClient().auth.getSession();
      const res = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${s.session?.access_token ?? ""}` },
        body: JSON.stringify({ context: buildReportCtx() }),
      });
      const json = await res.json();
      if (!res.ok || json.error) { show(json.error ?? "No se pudo generar el informe.", "TriangleAlert"); return null; }
      setAiReport(json.text ?? "");
      return json.text ?? "";
    } catch { show("No se pudo generar el informe.", "TriangleAlert"); return null; }
    finally { setAiReportBusy(false); }
  };
  const genReport = () => { requestReport(); };
  // Export: abre una ventana imprimible (el navegador permite "Guardar como PDF").
  const printReport = (text: string) => {
    const w = window.open("", "_blank", "width=820,height=900");
    if (!w) { show("Permití las ventanas emergentes para exportar.", "TriangleAlert"); return; }
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] ?? c));
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe · ${esc(init.title)}</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:720px;margin:48px auto;padding:0 28px;color:#0f172a;line-height:1.65}h1{font-size:24px;margin:0 0 4px}.meta{color:#64748b;font-size:13px;margin-bottom:28px}pre{white-space:pre-wrap;font-family:inherit;font-size:15px;margin:0}</style></head><body><h1>${esc(init.title)}</h1><div class="meta">${esc(team.name)} · ${new Date().toLocaleDateString("es", { day: "2-digit", month: "long", year: "numeric" })}</div><pre>${esc(text)}</pre></body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 350);
  };
  const exportReport = async () => { const t = aiReport ?? await requestReport(); if (t) printReport(t); };
  const shareReport = async () => { const t = aiReport ?? await requestReport(); if (t) { try { await navigator.clipboard.writeText(t); show("Informe copiado · pegáselo al líder", "Check"); } catch { show("No se pudo copiar.", "TriangleAlert"); } } };
  // Consolidación: estado post-Implementar (30 días). Indicador in-app + disparo manual del check.
  const con = init.data?.consolidate;
  const conPending = !!con?.pending;
  const conDue = con?.due;
  const conLeft = conDue ? Math.round((new Date(conDue).getTime() - Date.now()) / 86400000) : null;
  const conReady = conLeft != null && conLeft <= 0;
  const [conBusy, setConBusy] = useState(false);
  const startConsolidation = async () => {
    if (conBusy) return;
    setConBusy(true);
    const res = await createLiveSession({ teamId: team.id, initiativeId: init.id, type: "consolidation", firstStep: "concheck" });
    setConBusy(false);
    if (res.error || !res.session) { show(res.error ?? "No se pudo abrir la sesión", "TriangleAlert"); return; }
    router.push(`/sala/${res.session.id}`);
  };

  return (
    <div className="screen-pad">
      {/* breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "var(--t-sm)", marginBottom: 14, flexWrap: "wrap" }}>
        <button onClick={() => router.push("/organizaciones")} className="muted">Equipos</button>
        <span className="faint"><Icon name="ChevronRight" size={13} /></span>
        <button onClick={() => router.push(`/equipos/${team.id}`)} className="muted">{team.name}</button>
        <span className="faint"><Icon name="ChevronRight" size={13} /></span>
        <span style={{ fontWeight: 600 }}>{init.title}</span>
      </div>

      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 18 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>{init.title}</h1>
            <StageBadge stage={init.stage} />
            <Pill color={statusMeta.color} bg={statusMeta.bg} icon={statusMeta.icon}>{statusMeta.label}</Pill>
          </div>
          {init.description && <p className="muted" style={{ marginTop: 8, maxWidth: 620, lineHeight: 1.5 }}>{init.description}</p>}
        </div>
        {isFacil && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {!done && nextStage && <Button variant="secondary" icon="ChevronsRight" onClick={() => changeStage(nextStage)}>Avanzar a {STAGES[nextStage].label}</Button>}
            {done
              ? <Button variant="secondary" icon="RotateCcw" onClick={() => changeStatus("active")}>Reabrir</Button>
              : <Button icon="Users" onClick={startLive}>Abrir sesión en vivo</Button>}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))", gap: 14, marginBottom: 24 }}>
        <Card pad={16}><Stat label="Etapa actual" value={STAGES[init.stage].label} icon="Flag" color={STAGES[init.stage].color} /></Card>
        <Card pad={16}><Stat label="Sesiones" value={sessions.length} icon="History" color="var(--green)" /></Card>
        <Card pad={16}><Stat label="Responsable" value={responsible || "—"} icon="User" color="var(--info)" /></Card>
        <Card pad={16}><Stat label="Creada" value={fmtDate(init.createdAt)} icon="Calendar" color="var(--ink-2)" /></Card>
      </div>

      {/* riel del ciclo */}
      <Card pad={16} style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto" }}>
          {/* Módulo de diagnóstico: fuera del ciclo (estilo punteado) */}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flex: "none", padding: "6px 12px", borderRadius: "var(--r-md)", border: "1.5px dashed var(--st-explore)", color: "var(--st-explore)" }} title="Módulo de diagnóstico (opcional, fuera del ciclo)">
            <Icon name="Compass" size={15} />
            <span className="hide-sm" style={{ fontSize: "var(--t-sm)", fontWeight: 600 }}>Exploración</span>
          </span>
          <div style={{ width: 26, height: 0, borderTop: "2px dashed var(--line-2)", margin: "0 10px", flex: "none" }} />
          {CYCLE_STAGES.map((st, i) => {
            const meta = STAGES[st];
            const completed = done || i < curIdx;
            const current = !done && i === curIdx;
            return (
              <span key={st} style={{ display: "inline-flex", alignItems: "center" }}>
                <button onClick={() => scrollTo(st)} style={{ display: "flex", alignItems: "center", gap: 8, flex: "none", cursor: "pointer" }}>
                  <span style={{ width: 32, height: 32, borderRadius: 99, display: "grid", placeItems: "center", flex: "none", background: completed ? meta.color : current ? `color-mix(in srgb, ${meta.color} 18%, var(--card))` : "var(--card-2)", border: `1px solid ${completed || current ? meta.color : "var(--line-2)"}`, color: completed ? "#08120c" : current ? meta.color : "var(--ink-3)", fontWeight: 800, fontSize: "var(--t-sm)" }}>
                    {completed ? <Icon name="Check" size={15} /> : meta.n}
                  </span>
                  <span className="hide-sm" style={{ fontSize: "var(--t-sm)", fontWeight: current ? 700 : 500, color: current ? "var(--ink-0)" : completed ? "var(--ink-1)" : "var(--ink-3)" }}>{meta.label}</span>
                </button>
                {i < CYCLE_STAGES.length - 1 && <div style={{ width: 30, height: 2, background: completed ? meta.color : "var(--line)", margin: "0 10px", flex: "none" }} />}
              </span>
            );
          })}
        </div>
      </Card>

      {conPending && (
        <Card pad={18} style={{ marginBottom: 22, border: `1px solid color-mix(in srgb, ${conReady ? "var(--warning)" : "var(--success)"} 45%, var(--line))`, background: `color-mix(in srgb, ${conReady ? "var(--warning)" : "var(--success)"} 7%, var(--card))` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 22 }}>🔄</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: "var(--t-md)" }}>Consolidación{conLeft != null && !conReady ? ` · ${conLeft} días restantes` : ""}</div>
              <div className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 2 }}>{conReady ? "Es momento de verificar si el cambio se sostuvo sin monitoreo." : "El cambio está en período de consolidación. Verificamos a los 30 días."}</div>
            </div>
            {isFacil && conReady && <Button icon="ClipboardCheck" disabled={conBusy} onClick={startConsolidation}>Hacer el check</Button>}
          </div>
        </Card>
      )}

      <div className="team-grid">
        {/* columna principal: etapas + timeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
          {CYCLE_STAGES.map((st, i) => {
            const meta = STAGES[st];
            const completed = done || i < curIdx;
            const current = !done && i === curIdx;
            return (
              <Card key={st} pad={20} id={`stage-${st}`} glow={current} style={{ opacity: completed || current ? 1 : 0.72 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                  <span style={{ width: 34, height: 34, borderRadius: 99, display: "grid", placeItems: "center", flex: "none", background: completed ? meta.color : current ? `color-mix(in srgb, ${meta.color} 18%, var(--card))` : "var(--card-2)", border: `1px solid ${completed || current ? meta.color : "var(--line-2)"}`, color: completed ? "#08120c" : current ? meta.color : "var(--ink-3)", fontWeight: 800 }}>
                    {completed ? <Icon name="Check" size={16} /> : meta.n}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "var(--t-md)", fontWeight: 800 }}>{meta.label}</div>
                    <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{OUTCOME[st]}</div>
                  </div>
                  <span style={{ marginLeft: "auto" }}>
                    {completed ? <Pill color="var(--success)" bg="var(--success-bg)" icon="Check">completada</Pill>
                      : current ? <Pill color={meta.color} bg={`color-mix(in srgb, ${meta.color} 16%, transparent)`} icon="Dot">en curso</Pill>
                        : <Pill icon="Clock">pendiente</Pill>}
                  </span>
                </div>
                {(() => { const sc = stageContent[st]; const mems = stageMemories[st] ?? []; const hasS = !!(sc && (sc.cards.length || sc.result)) || mems.length > 0; return (
                  <>
                    <StageBody st={st} init={withDerived(init, stageContent)} hasSession={hasS} />
                    {mems.length > 0 && (
                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--line)", display: "flex", flexDirection: "column", gap: 10 }}>
                        <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon name="History" size={13} /> Lo que produjo el equipo · {mems.length} {mems.length === 1 ? "sesión" : "sesiones"}</div>
                        {mems.map((m) => <MemoryCard key={m.id} mem={m}
                          onDiscard={isFacil && !(m.result as { finalized?: boolean } | undefined)?.finalized ? () => discard(m.id) : undefined} />)}
                      </div>
                    )}
                  </>
                ); })()}
                {current && (() => {
                  const retros = retrosForStage(st).filter((r) => r.implemented);
                  if (!retros.length) return null;
                  const canon = retros.find((r) => r.id === CANONICAL_RETRO[st]) ?? retros[0];
                  const others = retros.filter((r) => r.id !== canon.id);
                  const canEdit = isFacil && !done;
                  const retroBtn = (r: RetroDefinition, primary = false) => (
                    <button key={r.id} disabled={!canEdit} onClick={() => { if (canEdit) openRetro(r); }}
                      style={{ textAlign: "left", width: primary ? "100%" : undefined, background: "var(--card-2)", border: `1px solid ${primary ? "var(--green)" : "var(--line)"}`, borderLeft: `3px solid ${r.category === "growthloop" ? "var(--green)" : "var(--ink-3)"}`, borderRadius: "var(--r-md)", padding: primary ? "12px 14px" : "10px 12px", cursor: canEdit ? "pointer" : "default" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                        <Icon name={r.category === "growthloop" ? "Sparkles" : "BookOpen"} size={13} style={{ color: r.category === "growthloop" ? "var(--green)" : "var(--ink-3)", flexShrink: 0 }} />
                        <span style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{r.name}</span>
                        {primary && <Pill color="var(--green)" bg="var(--success-bg)" icon="ThumbsUp">recomendada</Pill>}
                        <span className="num muted" style={{ marginLeft: "auto", fontSize: "var(--t-xs)" }}>{r.duration}′</span>
                      </div>
                      <div className="muted" style={{ fontSize: "var(--t-xs)", lineHeight: 1.4 }}>{r.description}</div>
                    </button>
                  );
                  return (
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--line)" }}>
                      <div className="eyebrow" style={{ marginBottom: 8 }}>Retro de esta etapa</div>
                      {retroBtn(canon, true)}
                      {others.length > 0 && canEdit && (
                        <div style={{ marginTop: 8 }}>
                          <button onClick={() => setSwapOpen((o) => !o)} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "var(--t-xs)", fontWeight: 700, color: "var(--ink-2)" }}>
                            <Icon name={swapOpen ? "ChevronUp" : "RefreshCw"} size={13} /> {swapOpen ? "Ocultar" : `Cambiar retro · ${others.length} más`}
                          </button>
                          {swapOpen && (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 10, marginTop: 8 }}>
                              {others.map((r) => retroBtn(r))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
                {current && isFacil && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <Button size="sm" icon="Users" onClick={startLive}>Abrir sesión en vivo</Button>
                    <Button size="sm" variant="secondary" icon={nextSt ? "ArrowRight" : "CircleCheck"} onClick={() => setCloseStageOpen(true)}>
                      {nextSt ? `Cerrar etapa y avanzar` : "Cerrar ciclo"}
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}

          {/* línea de tiempo de sesiones */}
          <Card pad={20}>
            <SectionTitle icon="History">Línea de tiempo de sesiones</SectionTitle>
            {sessions.length === 0 ? (
              <p className="muted" style={{ fontSize: "var(--t-sm)" }}>Todavía no se registraron sesiones para esta iniciativa.</p>
            ) : (
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 6, top: 8, bottom: 8, width: 2, background: "var(--line)" }} />
                {sessions.map((s, i) => {
                  const meta = STAGES[s.stage] ?? { color: "var(--ink-3)" };
                  return (
                    <div key={s.id} style={{ display: "flex", gap: 14, paddingBottom: i < sessions.length - 1 ? 16 : 0, position: "relative" }}>
                      <span style={{ width: 14, height: 14, borderRadius: 99, background: "var(--bg-1)", border: "2px solid " + meta.color, marginTop: 2, flex: "none", zIndex: 1 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 600, fontSize: "var(--t-sm)" }}>{s.retro}</span>
                          <StageBadge stage={s.stage} size="sm" />
                          <span className="muted num" style={{ fontSize: "var(--t-xs)", marginLeft: "auto" }}>{s.date}</span>
                        </div>
                        <div className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}><Icon name="CornerDownRight" size={13} /> {s.out}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* columna lateral */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {isFacil && (
            <Card pad={20} glow style={{ border: "1px solid color-mix(in srgb, var(--violet) 35%, var(--line))", background: "linear-gradient(180deg, color-mix(in srgb, var(--violet) 9%, transparent), var(--card))" }}>
              <SectionTitle icon="Sparkles" sub="Convertí el ciclo en un informe ejecutivo listo para compartir">Asistente IA{!aiEnabled && <Pill color="var(--violet)" bg="color-mix(in srgb, var(--violet) 16%, transparent)" icon="Lock">Pro</Pill>}</SectionTitle>
              <Button icon={aiReportBusy ? "Loader" : aiEnabled ? "Sparkles" : "Lock"} variant="violet" full disabled={aiReportBusy} style={{ marginTop: 8 }}
                onClick={aiEnabled ? genReport : () => show("✨ El resumen con IA está en el plan Pro.", "Lock")}>
                {aiReportBusy ? "Generando…" : aiEnabled ? "Generar resumen del ciclo" : "Resumen con IA · Pro"}
              </Button>
            </Card>
          )}
          <Card pad={20}>
            <SectionTitle icon="Radar" sub="El radar de la última medición (1-5)">Pulso del equipo</SectionTitle>
            <PulseRadar values={team.pulse.length ? (team.pulse[team.pulse.length - 1].dims ?? {}) : {}} size={300} />
          </Card>

          <Card pad={20}>
            <SectionTitle icon="Users">Equipo y responsables</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span className="muted" style={{ fontSize: "var(--t-sm)" }}>Integrantes</span>
                {team.members.length > 0 ? <AvatarStack people={team.members} max={6} size={28} /> : <span className="muted" style={{ fontSize: "var(--t-xs)" }}>Sin integrantes</span>}
              </div>
              <Field label="Responsable de la prueba" value={responsible || "Sin asignar"} icon="UserCheck" />
              <Field label="Facilitador" value={lead?.name || "Sin asignar"} icon="UserCog" />
            </div>
          </Card>

          <Card pad={20}>
            <SectionTitle icon="HeartPulse">Estado</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "center", padding: "6px 0 12px" }}>
                <ProgressRing value={(curIdx + (done ? 1 : 0)) / CYCLE_STAGES.length} size={104} stroke={9} color={STAGES[init.stage].color}>
                  <span className="num" style={{ fontSize: "var(--t-lg)", fontWeight: 800, lineHeight: 1 }}>{Math.round(((curIdx + (done ? 1 : 0)) / CYCLE_STAGES.length) * 100)}%</span>
                  <span className="muted" style={{ fontSize: 10 }}>del ciclo</span>
                </ProgressRing>
              </div>
              {isFacil && !done && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {paused
                    ? <Button size="sm" variant="secondary" icon="Play" onClick={() => changeStatus("active")} full>Reactivar</Button>
                    : <Button size="sm" variant="ghost" icon="Pause" onClick={() => changeStatus("paused")}>Pausar</Button>}
                  <Button size="sm" variant="ghost" icon="CircleCheck" onClick={() => changeStatus("done")}>Cerrar</Button>
                </div>
              )}
              {isFacil && (
                <button onClick={() => setDelOpen(true)} style={{ marginTop: 4, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--risk)", fontSize: "var(--t-sm)", fontWeight: 600 }}><Icon name="Trash2" size={14} /> Eliminar iniciativa</button>
              )}
            </div>
          </Card>

          <Card pad={20}>
            <SectionTitle icon="Route" sub="Las etapas que recorrió esta variable">Recorrido del ciclo</SectionTitle>
            <CycleTimeline sessions={sessions.map((s) => ({ stage: s.stage, date: s.date }))} currentStage={init.stage} done={done} />
          </Card>

          <Card pad={20}>
            <SectionTitle icon="Share2">Informe</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Button variant="secondary" icon="FileDown" full disabled={aiReportBusy} onClick={exportReport}>Exportar PDF</Button>
              <Button variant="secondary" icon="Share2" full disabled={aiReportBusy} onClick={shareReport}>Compartir con líder</Button>
            </div>
          </Card>
        </div>
      </div>

      {launcherOpen && <SessionLauncher team={team} initiative={init} initialRetro={selRetro ?? undefined} onClose={() => setLauncherOpen(false)} />}

      {closeStageOpen && (
        <div onClick={() => setCloseStageOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(7,11,22,0.7)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(620px,100%)", maxHeight: "86vh", overflowY: "auto", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", padding: 26, animation: "pop-in .25s var(--spring)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <span style={{ width: 44, height: 44, borderRadius: "var(--r-lg)", background: `color-mix(in srgb, ${STAGES[init.stage].color} 18%, transparent)`, color: STAGES[init.stage].color, display: "grid", placeItems: "center", flex: "none" }}><Icon name={nextSt ? "ArrowRight" : "CircleCheck"} size={22} /></span>
              <div>
                <div style={{ fontWeight: 800, fontSize: "var(--t-lg)" }}>{nextSt ? `Cerrar ${STAGES[init.stage].label} y avanzar a ${STAGES[nextSt].label}` : `Cerrar ${STAGES[init.stage].label} y terminar el ciclo`}</div>
                <div className="muted" style={{ fontSize: "var(--t-sm)" }}>{stageSessions.length} {stageSessions.length === 1 ? "sesión registrada" : "sesiones registradas"} en esta etapa</div>
              </div>
            </div>
            <div style={{ margin: "16px 0", padding: 16, background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>Resumen de lo acumulado</div>
              <StageBody st={init.stage} init={withDerived(init, stageContent)} hasSession={!!stageContent[init.stage]} />
              {stageSessions.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 6 }}>
                  {stageSessions.map((s) => (
                    <div key={s.id} className="muted" style={{ fontSize: "var(--t-xs)", display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon name="History" size={12} /> {s.date} · {s.retro} — {s.out}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 12 }}>
              {nextSt
                ? <>La iniciativa pasa a <b style={{ color: STAGES[nextSt].color }}>{STAGES[nextSt].label}</b>. Lo acumulado queda guardado y siempre se puede volver atrás cambiando la etapa.</>
                : <>El ciclo se cierra y la iniciativa queda marcada como terminada.</>}
            </p>
            {nextSt && (() => {
              const rec = retrosForStage(nextSt).find((r) => r.recommended && r.implemented) ?? retrosForStage(nextSt).find((r) => r.implemented);
              return rec ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 16, background: `color-mix(in srgb, ${STAGES[nextSt].color} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${STAGES[nextSt].color} 32%, transparent)`, borderRadius: "var(--r-md)" }}>
                  <Icon name="Sparkles" size={16} style={{ color: STAGES[nextSt].color, flexShrink: 0 }} />
                  <div style={{ fontSize: "var(--t-xs)", lineHeight: 1.45 }}>
                    <b>Retro sugerida para {STAGES[nextSt].label}:</b> {rec.name} <span className="muted">· {rec.description} ({rec.duration}′)</span>
                  </div>
                </div>
              ) : null;
            })()}
            {closeBlocked && stageNorm === "ideation" && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", marginBottom: 14, background: "var(--warning-bg)", border: "1px solid color-mix(in srgb, var(--warning) 45%, transparent)", borderRadius: "var(--r-md)" }}>
                <Icon name="TriangleAlert" size={18} style={{ color: "var(--warning)", flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1, fontSize: "var(--t-sm)", lineHeight: 1.5 }}>
                  <b>No definiste la prueba todavía.</b> Sin una prueba concreta no hay nada que seguir en la próxima etapa. Hacé la retro <b>Diseño de la prueba</b> antes de cerrar Ideación.
                  {isFacil && <div style={{ marginTop: 10 }}><Button size="sm" icon="FlaskConical" onClick={() => { setCloseStageOpen(false); setLauncherOpen(true); }}>Hacer Diseño de la prueba</Button></div>}
                </div>
              </div>
            )}
            {closeBlocked && stageNorm === "follow" && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", marginBottom: 14, background: "var(--warning-bg)", border: "1px solid color-mix(in srgb, var(--warning) 45%, transparent)", borderRadius: "var(--r-md)" }}>
                <Icon name="TriangleAlert" size={18} style={{ color: "var(--warning)", flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1, fontSize: "var(--t-sm)", lineHeight: 1.5 }}>
                  <b>Todavía no hiciste ningún check-in.</b> No se puede cerrar Seguimiento sin haber mirado la prueba al menos una vez. Hacé la retro <b>¿Cómo venimos?</b> antes de avanzar a Aprendizaje.
                  {isFacil && <div style={{ marginTop: 10 }}><Button size="sm" icon="Activity" onClick={() => { setCloseStageOpen(false); setLauncherOpen(true); }}>Hacer un check-in</Button></div>}
                </div>
              </div>
            )}
            {closeBlocked && stageNorm === "learn" && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", marginBottom: 14, background: "var(--warning-bg)", border: "1px solid color-mix(in srgb, var(--warning) 45%, transparent)", borderRadius: "var(--r-md)" }}>
                <Icon name="TriangleAlert" size={18} style={{ color: "var(--warning)", flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1, fontSize: "var(--t-sm)", lineHeight: 1.5 }}>
                  <b>Para cerrar Aprendizaje necesitás:</b>
                  <ul style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>{learnMissing.map((m, i) => <li key={i}>{m.label}</li>)}</ul>
                  {isFacil && <div style={{ marginTop: 10 }}><Button size="sm" icon="Users" onClick={() => { setCloseStageOpen(false); setLauncherOpen(true); }}>Abrir una sesión de Aprendizaje</Button></div>}
                </div>
              </div>
            )}
            {stageNorm === "learn" && !closeBlocked && (
              <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>El ciclo completo</div>
                  <CycleTimeline sessions={sessions.map((s) => ({ stage: s.stage, date: s.date }))} currentStage={init.stage} done={done} />
                </div>
                {ld?.narrative && (
                  <div style={{ padding: "12px 14px", background: "color-mix(in srgb, var(--st-learn) 8%, transparent)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
                    <div className="eyebrow" style={{ marginBottom: 5 }}>El resultado</div>
                    <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{ld.narrative}</p>
                  </div>
                )}
                {(fl?.signalLog?.length ?? 0) > 1 && (
                  <div style={{ padding: "12px 14px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
                    <div className="eyebrow" style={{ marginBottom: 8 }}>Evolución de la señal</div>
                    <SignalProgressChart log={fl!.signalLog!} target={pf?.signalTarget} height={70} />
                  </div>
                )}
                {ld?.highlightedLearning && (
                  <div style={{ fontSize: "var(--t-sm)", display: "flex", gap: 8, alignItems: "center" }}><Icon name="Star" size={15} style={{ color: "var(--st-learn)" }} /><span><b>Aprendizaje del ciclo:</b> {ld.highlightedLearning}</span></div>
                )}
                {ld?.decision && DEC_NEXT[ld.decision] && (
                  <div style={{ padding: "12px 14px", borderRadius: "var(--r-md)", background: "var(--card)", border: "1px solid var(--line)" }}>
                    <div className="eyebrow" style={{ marginBottom: 5 }}>La decisión</div>
                    <div style={{ fontSize: "var(--t-sm)", fontWeight: 700, marginBottom: 4 }}>{DEC_NEXT[ld.decision].label}{ld.decisionReason ? <span style={{ fontWeight: 400 }}> — {ld.decisionReason}</span> : ""}</div>
                    <div className="muted" style={{ fontSize: "var(--t-xs)", display: "flex", alignItems: "center", gap: 6 }}><Icon name="ArrowRight" size={12} style={{ color: "var(--st-learn)" }} /> {DEC_NEXT[ld.decision].detail}</div>
                  </div>
                )}
              </div>
            )}
            {stageNorm === "follow" && followCheckinDone && (
              <div style={{ marginBottom: 16 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Honestidad final · ¿cómo cerramos la prueba?</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {HON_OPTS.map((o) => { const on = finalHonesty === o.k; return (
                    <button key={o.k} onClick={() => setFinalHonesty(o.k)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: "var(--r-md)", textAlign: "left", border: `1.5px solid ${on ? o.color : "var(--line-2)"}`, background: on ? `color-mix(in srgb, ${o.color} 13%, var(--card))` : "var(--card)", cursor: "pointer" }}>
                      <span style={{ fontSize: 20 }}>{o.emoji}</span>
                      <span style={{ flex: 1, fontSize: "var(--t-sm)", fontWeight: 600 }}>{o.label}</span>
                      {on && <Icon name="CheckCircle2" size={16} style={{ color: o.color }} />}
                    </button>
                  ); })}
                </div>
                <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 8 }}>Queda guardado y abre la conversación de Aprendizaje.</p>
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <Button variant="secondary" full onClick={() => setCloseStageOpen(false)}>Cancelar</Button>
              <Button full icon={nextSt ? "ArrowRight" : "CircleCheck"} disabled={closeBusy || closeBlocked || needsFinalHonesty} onClick={doCloseStage}>{closeBusy ? "Guardando…" : closeBlocked ? (stageNorm === "follow" ? "Falta un check-in" : stageNorm === "learn" ? "Faltan retros" : "Falta la prueba") : needsFinalHonesty ? "Elegí cómo cerramos" : stageNorm === "learn" && ld?.decision && DEC_NEXT[ld.decision] ? DEC_NEXT[ld.decision].label : "Confirmar"}</Button>
            </div>
          </div>
        </div>
      )}

      {aiReport !== null && (
        <div onClick={() => setAiReport(null)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(7,11,22,0.7)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(680px,100%)", maxHeight: "86vh", overflowY: "auto", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", padding: 26, animation: "pop-in .25s var(--spring)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ width: 40, height: 40, borderRadius: "var(--r-md)", background: "color-mix(in srgb, var(--violet) 16%, transparent)", color: "var(--violet)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="Sparkles" size={20} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: "var(--t-lg)" }}>Informe del ciclo</div>
                <div className="muted" style={{ fontSize: "var(--t-xs)" }}>Generado con IA · revisalo antes de compartir</div>
              </div>
              <button onClick={() => setAiReport(null)} style={{ color: "var(--ink-2)" }}><Icon name="X" size={22} /></button>
            </div>
            <div style={{ padding: "16px 18px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", fontSize: "var(--t-sm)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{aiReport}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <Button variant="secondary" icon="Copy" onClick={() => { navigator.clipboard?.writeText(aiReport); show("Informe copiado", "Check"); }}>Copiar</Button>
              <Button variant="secondary" icon="Printer" onClick={() => printReport(aiReport)}>Imprimir / PDF</Button>
              <Button icon="RefreshCw" variant="ghost" disabled={aiReportBusy} onClick={genReport}>Regenerar</Button>
              <Button icon="Check" onClick={() => setAiReport(null)}>Listo</Button>
            </div>
          </div>
        </div>
      )}

      {delOpen && (
        <div onClick={() => setDelOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(7,11,22,0.7)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(440px,100%)", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", padding: 26, textAlign: "center", animation: "pop-in .25s var(--spring)" }}>
            <div style={{ width: 52, height: 52, borderRadius: "var(--r-lg)", background: "var(--risk-bg)", color: "var(--risk)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}><Icon name="Trash2" size={26} /></div>
            <h3 style={{ fontSize: "var(--t-lg)", fontWeight: 800 }}>Eliminar “{init.title}”</h3>
            <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 8, lineHeight: 1.55 }}>Se borran también sus <b style={{ color: "var(--ink-0)" }}>sesiones y resultados</b>. Esta acción no se puede deshacer.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
              <Button full size="lg" icon="Trash2" disabled={delBusy} onClick={doDelete} style={{ background: "var(--risk)", color: "#fff" }}>{delBusy ? "Eliminando…" : "Sí, eliminar"}</Button>
              <Button full variant="ghost" onClick={() => setDelOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
