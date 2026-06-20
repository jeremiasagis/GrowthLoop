"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Icon } from "@/components/icon";
import { Button, Card, EmptyState, Pill, SectionTitle } from "@/components/ui";
import { getInitiatives, getOrg } from "@/lib/repository";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { MemoryCard, snapshotHasContent } from "@/components/RetroResult";
import { FodaGrid } from "@/components/FodaGrid";
import { averagePulse, getClosedTeamSessions, loadSessionMemories, type SessionMemory } from "@/lib/session";
import { FOUNDING_QUESTIONS, LEARNING_TYPES, PULSE_DIMS, planLimits, type Initiative, type LearningEntry, type Team } from "@/lib/data";

// Capítulo del relato (lo que devuelve la IA en /api/ai/replay).
type ReplayChapter = { period?: string; title: string; body: string; tone: string };
type Replay = { title: string; intro?: string; chapters: ReplayChapter[] };
const TONE: Record<string, { c: string; i: string }> = {
  inicio:      { c: "var(--ink-2)",     i: "Flag" },
  diagnostico: { c: "var(--st-explore)", i: "Search" },
  apuesta:     { c: "var(--st-proof)",   i: "Lightbulb" },
  logro:       { c: "var(--success)",    i: "Trophy" },
  aprendizaje: { c: "var(--st-learn)",   i: "GraduationCap" },
  desafio:     { c: "var(--warning)",    i: "TriangleAlert" },
};

// Retros/sesiones sueltas cuyo contenido reconstruimos como "memoria viva".
// (Las sesiones de las etapas del loop ya viven como aprendizajes/apuestas/causas;
//  el FODA tiene su propia card, así que no se lista acá.)
const EXPLORE_TYPES = ["explore", "madsadglad", "oneword", "timeline", "balloon", "teamradar", "fwradar", "pulse", "sailboat", "circles", "relationships", "expclose"];

const RESULT_META: Record<string, { l: string; c: string; i: string }> = {
  yes: { l: "Funcionó", c: "var(--success)", i: "CircleCheck" },
  partial: { l: "A medias", c: "var(--warning)", i: "CircleDot" },
  no: { l: "No funcionó", c: "var(--risk)", i: "CircleX" },
};
const DECISION_META: Record<string, { l: string; c: string; i: string }> = {
  consolidate: { l: "Implementada", c: "var(--success)", i: "Anchor" },
  iterate: { l: "Iterada", c: "var(--st-proof)", i: "RefreshCw" },
  drop: { l: "Soltada", c: "var(--ink-2)", i: "Archive" },
};

const PAGE = 12;
/** Lista con "ver más" para no renderizar cientos de items de una. */
function Paged<T>({ items, render }: { items: T[]; render: (it: T, i: number) => ReactNode }) {
  const [n, setN] = useState(PAGE);
  return (
    <>
      {items.slice(0, n).map(render)}
      {items.length > n && (
        <button onClick={() => setN((x) => x + PAGE)} className="muted" style={{ alignSelf: "flex-start", fontSize: "var(--t-xs)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5, marginTop: 2 }}>
          <Icon name="ChevronDown" size={13} /> Ver más ({items.length - n})
        </button>
      )}
    </>
  );
}

/** Contenido reutilizable de la Biblioteca del equipo (facilitador y miembro). */
const typeMeta = (k?: string) => LEARNING_TYPES.find((t) => t.k === k);

export function BibliotecaContent({ team, onOpenInitiative }: { team: Team; onOpenInitiative?: (init: Initiative) => void }) {
  const { show } = useToast();
  const inits = getInitiatives(team.id);
  const [q, setQ] = useState("");
  // Biblioteca estructurada (LearningEntry con metadata). Filtros completos.
  const library = (team.data?.library as LearningEntry[] | undefined) ?? [];
  const [fType, setFType] = useState<string>("");
  const [fFlag, setFFlag] = useState<"" | "transferable" | "urgent">("");
  const [fInit, setFInit] = useState<string>("");
  // Memoria viva: las retros sueltas/de diagnóstico que hizo el equipo, con su contenido reconstruible.
  const [memories, setMemories] = useState<SessionMemory[]>([]);
  useEffect(() => {
    let active = true;
    (async () => {
      const ss = (await getClosedTeamSessions(team.id)).filter((s) => EXPLORE_TYPES.includes(s.type) && s.type !== "expclose");
      const mems = await loadSessionMemories(ss);
      if (active) setMemories(mems.reverse());
    })();
    return () => { active = false; };
  }, [team.id]);
  // IA · Preguntarle a la biblioteca (Pro+).
  const aiEnabled = planLimits(team.orgId ? getOrg(team.orgId)?.plan : undefined).ai;
  const [aiQ, setAiQ] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiIds, setAiIds] = useState<string[]>([]);
  // El relato del equipo (narrativa del viaje, generada por IA).
  const [replay, setReplay] = useState<Replay | null>(null);
  const [replayBusy, setReplayBusy] = useState(false);
  const askLibrary = async () => {
    const question = aiQ.trim();
    if (!question || aiBusy) return;
    setAiBusy(true);
    try {
      const { data: s } = await getSupabaseBrowserClient().auth.getSession();
      const res = await fetch("/api/ai/library", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${s.session?.access_token ?? ""}` },
        body: JSON.stringify({ question, items: library.map((e) => ({ id: e.id, text: e.text, type: e.type })) }),
      });
      const json = await res.json();
      if (!res.ok || json.error) { show(json.error ?? "No se pudo consultar la biblioteca.", "TriangleAlert"); setAiBusy(false); return; }
      setAiAnswer(json.answer ?? ""); setAiIds(json.relevantIds ?? []);
    } catch { show("No se pudo consultar la biblioteca.", "TriangleAlert"); }
    setAiBusy(false);
  };

  const { learnings, bets, rootCauses, highlights } = useMemo(() => {
    const learnings: { text: string; init: Initiative; result?: string; decision?: string }[] = [];
    const bets: { init: Initiative; betThen: string; signal?: string; result?: string }[] = [];
    const rootCauses: { init: Initiative; cause: string }[] = [];
    const highlights: { name: string; votes: number; init: Initiative }[] = [];
    for (const i of inits) {
      const d = i.data ?? {};
      (d.learn?.learnings ?? []).forEach((t) => learnings.push({ text: t, init: i, result: d.learn?.result, decision: d.learn?.decision }));
      (d.learn?.highlights ?? []).forEach((h) => highlights.push({ name: h.name, votes: h.votes, init: i }));
      const pbets = d.proof?.bets?.length ? d.proof.bets : (d.proof?.betThen ? [{ betThen: d.proof.betThen, signalMetric: d.proof?.signalMetric, signalTarget: d.proof?.signalTarget }] : []);
      pbets.forEach((b, bi) => { if (b.betThen) bets.push({ init: i, betThen: b.betThen, signal: b.signalMetric ? `${b.signalMetric}${b.signalTarget ? ` (meta ${b.signalTarget})` : ""}${d.learn?.achieved?.[bi] ? ` → logrado ${d.learn.achieved[bi]}` : ""}` : d.proof?.signal, result: d.learn?.results?.[bi] ?? d.learn?.result }); });
      if (d.focus?.rootCause) rootCauses.push({ init: i, cause: d.focus.rootCause });
    }
    highlights.sort((a, b) => b.votes - a.votes);
    return { learnings, bets, rootCauses, highlights };
  }, [inits]);

  const term = q.trim().toLowerCase();
  const matchL = learnings.filter((l) => !term || l.text.toLowerCase().includes(term) || l.init.title.toLowerCase().includes(term));
  const matchB = bets.filter((b) => !term || b.betThen.toLowerCase().includes(term) || b.init.title.toLowerCase().includes(term));
  const matchC = rootCauses.filter((c) => !term || c.cause.toLowerCase().includes(term) || c.init.title.toLowerCase().includes(term));
  const contract = team.data?.contract;
  const matchLib = library
    .filter((e) => (!term || e.text.toLowerCase().includes(term) || (e.initiativeTitle ?? "").toLowerCase().includes(term))
      && (!fType || e.type === fType)
      && (!fFlag || (fFlag === "transferable" ? e.transferable : e.urgent))
      && (!fInit || e.initiativeId === fInit))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const transferables = library.filter((e) => e.transferable);
  const libInits = [...new Map(library.filter((e) => e.initiativeId).map((e) => [e.initiativeId, e.initiativeTitle ?? e.initiativeId])).entries()];
  const foda = team.data?.foda;
  // Solo las sesiones que produjeron algo reconstruible (descartamos las corridas sin aportes).
  const memContent = memories.filter(snapshotHasContent);
  const empty = !learnings.length && !bets.length && !rootCauses.length && !contract && !library.length && !memContent.length && !foda;
  const matchMem = memContent.filter((m) => !term || (m.retro ?? "").toLowerCase().includes(term));

  // ── El relato del equipo: armamos el "viaje" cronológico para que la IA lo narre. ──
  const hasJourney = inits.length > 0 || memContent.length > 0 || !!foda || !!contract;
  const buildJourneyContext = () => {
    const lines: string[] = [`Equipo: ${team.name}.`];
    if (contract?.date) lines.push(`Sesión fundacional / contrato del equipo: ${contract.date}.`);
    if (foda?.date) lines.push(`Hicieron un FODA el ${foda.date}.`);
    // Clima a lo largo del tiempo (radares de pulso).
    memContent.filter((m) => ["teamradar", "fwradar", "pulse"].includes(m.type) && m.pulses.length).forEach((m) => {
      const avg = (m.result?.trAvg as Record<string, number>) ?? averagePulse(m.pulses);
      const vals = Object.entries(avg);
      if (!vals.length) return;
      const mean = Math.round(vals.reduce((a, [, v]) => a + v, 0) / vals.length);
      const weak = [...vals].sort((a, b) => a[1] - b[1])[0];
      const wlabel = PULSE_DIMS.find((d) => d.key === weak[0])?.label ?? weak[0];
      lines.push(`Radar de clima (${m.date || "s/f"}): promedio ${mean}, lo más flojo fue "${wlabel}" (${Math.round(weak[1])}).`);
    });
    // Diagnósticos sueltos (otras retros de exploración).
    memContent.filter((m) => !["teamradar", "fwradar", "pulse"].includes(m.type)).forEach((m) => {
      const top = m.clusters.slice(0, 3).map((c) => c.name).filter(Boolean);
      lines.push(`Retro "${m.retro ?? m.type}" (${m.date || "s/f"})${top.length ? `: temas principales ${top.join(", ")}` : ` con ${m.cards.length} aportes`}.`);
    });
    // Loops (iniciativas), con su causa, apuesta, resultado y aprendizajes.
    inits.forEach((i) => {
      const d = i.data ?? {};
      const when = i.createdAt ? new Date(i.createdAt).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" }) : "s/f";
      const parts: string[] = [`Loop "${i.title}" (empezó ${when}, etapa actual ${i.stage}, estado ${i.status}).`];
      if (d.focus?.rootCause) parts.push(`Causa raíz: ${d.focus.rootCause}.`);
      const betThen = d.proof?.betThen ?? d.proof?.bets?.[0]?.betThen;
      if (betThen) parts.push(`Apuesta: ${betThen}${d.proof?.signalMetric ? ` (señal: ${d.proof.signalMetric}${d.proof?.signalTarget ? `, meta ${d.proof.signalTarget}` : ""})` : ""}.`);
      if (d.follow?.signalNow) parts.push(`Señal medida: ${d.follow.signalNow}.`);
      if (d.learn?.result) parts.push(`Resultado: ${d.learn.result}.`);
      if (d.learn?.decision) parts.push(`Decisión: ${d.learn.decision}.`);
      (d.learn?.learnings ?? []).slice(0, 3).forEach((l) => parts.push(`Aprendizaje: ${l}.`));
      lines.push(parts.join(" "));
    });
    if (library.length) lines.push(`Registraron ${library.length} aprendizajes en su biblioteca.`);
    return lines.join("\n");
  };
  const generateReplay = async () => {
    if (replayBusy) return;
    setReplayBusy(true);
    try {
      const { data: s } = await getSupabaseBrowserClient().auth.getSession();
      const res = await fetch("/api/ai/replay", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${s.session?.access_token ?? ""}` },
        body: JSON.stringify({ context: buildJourneyContext() }),
      });
      const json = await res.json();
      if (!res.ok || json.error) { show(json.error ?? "No se pudo armar el relato.", "TriangleAlert"); setReplayBusy(false); return; }
      setReplay(json.relato as Replay);
    } catch { show("No se pudo armar el relato.", "TriangleAlert"); }
    setReplayBusy(false);
  };

  const InitLink = ({ init }: { init: Initiative }) => onOpenInitiative
    ? <button onClick={() => onOpenInitiative(init)} className="muted" style={{ fontSize: "var(--t-xs)", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Target" size={12} /> {init.title}</button>
    : <span className="muted" style={{ fontSize: "var(--t-xs)", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Target" size={12} /> {init.title}</span>;

  const LibEntry = (e: LearningEntry, i: number) => { const tm = typeMeta(e.type); return (
    <div key={e.id ?? i} style={{ padding: "12px 14px", background: "var(--card-2)", border: "1px solid var(--line)", borderLeft: `3px solid ${tm?.color ?? "var(--st-learn)"}`, borderRadius: "var(--r-md)" }}>
      <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.5 }}>{e.highlighted && <Icon name="Star" size={13} style={{ color: "var(--st-learn)", marginRight: 4 }} />}{e.text}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 8, flexWrap: "wrap" }}>
        {e.initiativeTitle && (() => { const init = inits.find((x) => x.id === e.initiativeId); return init && onOpenInitiative
          ? <button onClick={() => onOpenInitiative(init)} className="muted" style={{ fontSize: "var(--t-xs)", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Target" size={12} /> {e.initiativeTitle}</button>
          : <span className="muted" style={{ fontSize: "var(--t-xs)", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Target" size={12} /> {e.initiativeTitle}</span>; })()}
        {tm && <span style={{ fontSize: "var(--t-xs)", padding: "2px 8px", borderRadius: "var(--r-full)", background: `color-mix(in srgb, ${tm.color} 14%, transparent)`, color: tm.color, fontWeight: 600 }}>{tm.emoji} {tm.label}</span>}
        {e.transferable && <Pill color="var(--st-proof)" bg="color-mix(in srgb, var(--st-proof) 14%, transparent)" icon="Share2">transferible</Pill>}
        {e.urgent && <Pill color="var(--warning)" bg="var(--warning-bg)" icon="Zap">urgente</Pill>}
        {!!e.resonances && <span className="num muted" style={{ fontSize: "var(--t-xs)" }}>⭐{e.resonances}</span>}
        {e.date && <span className="num muted" style={{ fontSize: "var(--t-xs)", marginLeft: "auto" }}>{new Date(e.date).toLocaleDateString("es", { day: "2-digit", month: "short", year: "2-digit" })}</span>}
      </div>
    </div>
  ); };

  // Caja de IA (siempre visible — para descubrir la feature y como upsell del free).
  const AiAskCard = (
    <Card pad={20} style={{ marginBottom: 22, border: "1px solid color-mix(in srgb, var(--violet) 30%, var(--line))", background: "color-mix(in srgb, var(--violet) 5%, var(--card))" }}>
      <SectionTitle icon="Sparkles" sub="Preguntá en lenguaje natural sobre los aprendizajes del equipo">Preguntale a la biblioteca {!aiEnabled && <Pill color="var(--violet)" bg="color-mix(in srgb, var(--violet) 16%, transparent)" icon="Lock">Pro</Pill>}</SectionTitle>
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <input value={aiQ} onChange={(e) => setAiQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && aiEnabled && askLibrary()} disabled={!aiEnabled || !library.length} placeholder={!aiEnabled ? "Búsqueda semántica con IA · plan Pro" : !library.length ? "Todavía no hay aprendizajes para consultar" : "Ej: ¿qué aprendimos sobre comunicación con clientes?"} style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "10px 12px", fontSize: "var(--t-sm)", outline: "none", opacity: aiEnabled && library.length ? 1 : 0.6 }} />
        <Button icon={aiBusy ? "Loader" : aiEnabled ? "Sparkles" : "Lock"} disabled={aiBusy || (aiEnabled && !library.length)} onClick={aiEnabled ? askLibrary : () => show("✨ La búsqueda con IA está en el plan Pro.", "Lock")}>{aiBusy ? "Buscando…" : aiEnabled ? "Preguntar" : "Preguntar · Pro"}</Button>
      </div>
      {aiAnswer !== null && (
        <div style={{ marginTop: 14 }}>
          <div style={{ padding: "12px 14px", background: "color-mix(in srgb, var(--violet) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--violet) 28%, transparent)", borderRadius: "var(--r-md)", fontSize: "var(--t-sm)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{aiAnswer || "No encontré aprendizajes relacionados."}</div>
          {aiIds.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>{aiIds.map((id) => library.find((e) => e.id === id)).filter(Boolean).map((e, i) => LibEntry(e as LearningEntry, i))}</div>}
          <button onClick={() => { setAiAnswer(null); setAiIds([]); setAiQ(""); }} className="muted" style={{ marginTop: 12, fontSize: "var(--t-xs)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="X" size={13} /> Limpiar</button>
        </div>
      )}
    </Card>
  );

  // El relato del equipo: hero narrativo del viaje de mejora.
  const ReplayCard = (
    <Card pad={20} style={{ marginBottom: 22, border: "1px solid color-mix(in srgb, var(--green) 28%, var(--line))", background: "color-mix(in srgb, var(--green) 5%, var(--card))" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <SectionTitle icon="BookOpen" sub="Norte narra el viaje de mejora del equipo como una historia con capítulos">El relato del equipo {!aiEnabled && <Pill color="var(--violet)" bg="color-mix(in srgb, var(--violet) 16%, transparent)" icon="Lock">Pro</Pill>}</SectionTitle>
        </div>
        <Button icon={replayBusy ? "Loader" : aiEnabled ? "Sparkles" : "Lock"} disabled={replayBusy} onClick={aiEnabled ? generateReplay : () => show("✨ El relato del equipo está en el plan Pro.", "Lock")}>
          {replayBusy ? "Escribiendo…" : replay ? "Reescribir" : aiEnabled ? "Generar relato" : "Generar · Pro"}
        </Button>
      </div>
      {replay && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: "var(--t-lg)", fontWeight: 800, lineHeight: 1.25 }}>{replay.title}</h3>
          {replay.intro && <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.55, marginTop: 6 }}>{replay.intro}</p>}
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 0, position: "relative" }}>
            {replay.chapters.map((ch, i) => {
              const t = TONE[ch.tone] ?? TONE.aprendizaje;
              const last = i === replay.chapters.length - 1;
              return (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 28, flex: "none" }}>
                    <span style={{ width: 28, height: 28, borderRadius: "var(--r-full)", background: `color-mix(in srgb, ${t.c} 16%, var(--card))`, border: `1.5px solid ${t.c}`, color: t.c, display: "grid", placeItems: "center", flex: "none" }}><Icon name={t.i} size={14} /></span>
                    {!last && <span style={{ flex: 1, width: 2, background: "var(--line-2)", marginTop: 2, minHeight: 14 }} />}
                  </div>
                  <div style={{ paddingBottom: last ? 0 : 18, minWidth: 0 }}>
                    {ch.period && <div className="eyebrow num" style={{ color: t.c, marginBottom: 2 }}>{ch.period}</div>}
                    <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{ch.title}</div>
                    <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.55, marginTop: 3 }}>{ch.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {!replay && !replayBusy && (
        <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 10, fontStyle: "italic" }}>
          {hasJourney ? "Generá la historia del recorrido del equipo: diagnósticos, apuestas, lo que funcionó y lo que aprendieron." : "Todavía no hay suficiente recorrido. A medida que el equipo haga retros y loops, vas a poder narrar su viaje."}
        </p>
      )}
    </Card>
  );

  if (empty) {
    return (
      <>
        {hasJourney && ReplayCard}
        <Card pad={0}><EmptyState icon="Library" title="Todavía no hay aprendizajes">A medida que el equipo cierre ciclos de mejora, sus aprendizajes, apuestas y causas raíz se van a ir guardando acá.</EmptyState></Card>
      </>
    );
  }

  return (
    <>
      <div style={{ position: "relative", maxWidth: 420, marginBottom: 22 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)" }}><Icon name="Search" size={16} /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en la biblioteca…" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "10px 12px 10px 36px", fontSize: "var(--t-sm)", outline: "none" }} />
      </div>

      {hasJourney && ReplayCard}
      {AiAskCard}

      {library.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 22, marginBottom: 22 }}>
            <Card pad={20}>
              <SectionTitle icon="GraduationCap" sub={`${library.length} en total`}>Aprendizajes del equipo</SectionTitle>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", margin: "10px 0 4px" }}>
                {[{ k: "", l: "Todos" }, ...LEARNING_TYPES.map((t) => ({ k: t.k, l: `${t.emoji} ${t.label}` }))].map((o) => { const on = fType === o.k; return <button key={o.k || "all"} onClick={() => setFType(o.k)} style={{ padding: "5px 11px", borderRadius: "var(--r-full)", fontSize: "var(--t-xs)", fontWeight: 600, border: `1px solid ${on ? "var(--st-learn)" : "var(--line-2)"}`, background: on ? "color-mix(in srgb, var(--st-learn) 13%, var(--card))" : "var(--card)", color: on ? "var(--st-learn)" : "var(--ink-2)" }}>{o.l}</button>; })}
              </div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
                {[{ k: "", l: "Todos" }, { k: "transferable", l: "Transferibles" }, { k: "urgent", l: "Urgentes" }].map((o) => { const on = fFlag === o.k; return <button key={o.k || "allf"} onClick={() => setFFlag(o.k as typeof fFlag)} style={{ padding: "5px 11px", borderRadius: "var(--r-full)", fontSize: "var(--t-xs)", fontWeight: 600, border: `1px solid ${on ? "var(--ink-1)" : "var(--line-2)"}`, background: on ? "var(--card-2)" : "var(--card)", color: on ? "var(--ink-0)" : "var(--ink-2)" }}>{o.l}</button>; })}
                {libInits.length > 1 && (
                  <select value={fInit} onChange={(e) => setFInit(e.target.value)} style={{ background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-full)", color: "var(--ink-1)", padding: "5px 10px", fontSize: "var(--t-xs)", outline: "none" }}>
                    <option value="">Todas las variables</option>
                    {libInits.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
                  </select>
                )}
              </div>
              {matchLib.length ? <div style={{ display: "flex", flexDirection: "column", gap: 10 }}><Paged items={matchLib} render={LibEntry} /></div> : <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>Sin aprendizajes que coincidan con el filtro.</p>}
            </Card>

            {transferables.length > 0 && (
              <Card pad={20} style={{ border: "1px solid color-mix(in srgb, var(--st-proof) 30%, var(--line))" }}>
                <SectionTitle icon="Share2" sub={`${transferables.length} · aplicables a otras variables`}>Aprendizajes transferibles</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}><Paged items={transferables} render={LibEntry} /></div>
              </Card>
            )}
          </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {contract && (
          <Card pad={20}>
            <SectionTitle icon="Handshake" sub={`Firmado · ${contract.date}`}>Contrato del equipo</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
              {FOUNDING_QUESTIONS.map((qq) => contract.answers?.[qq.key] && (
                <div key={qq.key}>
                  <div className="muted" style={{ fontSize: "var(--t-xs)", fontWeight: 600 }}>{qq.q}</div>
                  <div style={{ fontSize: "var(--t-sm)", lineHeight: 1.45 }}>{contract.answers[qq.key]}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {highlights.length > 0 && (
          <Card pad={20}>
            <SectionTitle icon="Star" sub={`${highlights.length} destacados`}>Aprendizajes destacados</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              <Paged items={highlights.filter((h) => !term || h.name.toLowerCase().includes(term) || h.init.title.toLowerCase().includes(term))} render={(h, i) => (
                <span key={i} style={{ fontSize: "var(--t-sm)", padding: "6px 12px", borderRadius: "var(--r-full)", background: "color-mix(in srgb, var(--st-learn) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--st-learn) 35%, transparent)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="Star" size={12} style={{ color: "var(--st-learn)" }} />{h.name}<span className="muted num" style={{ fontSize: "var(--t-xs)" }}>{h.votes}</span></span>
              )} />
            </div>
          </Card>
        )}

        {!library.length && (
        <Card pad={20}>
          <SectionTitle icon="GraduationCap" sub={`${learnings.length} en total`}>Aprendizajes</SectionTitle>
          {matchL.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
              <Paged items={matchL} render={(l, i) => { const r = l.result ? RESULT_META[l.result] : undefined; const d = l.decision ? DECISION_META[l.decision] : undefined; return (
                <div key={i} style={{ padding: "12px 14px", background: "var(--card-2)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-learn)", borderRadius: "var(--r-md)" }}>
                  <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.5 }}>{l.text}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <InitLink init={l.init} />
                    {r && <Pill color={r.c} bg={`color-mix(in srgb, ${r.c} 14%, transparent)`} icon={r.i}>{r.l}</Pill>}
                    {d && <Pill color={d.c} bg={`color-mix(in srgb, ${d.c} 14%, transparent)`} icon={d.i}>{d.l}</Pill>}
                  </div>
                </div>
              ); }} />
            </div>
          ) : <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 8, fontStyle: "italic" }}>Sin aprendizajes que coincidan.</p>}
        </Card>
        )}

        <Card pad={20}>
          <SectionTitle icon="Lightbulb" sub={`${bets.length} en total`}>Apuestas probadas</SectionTitle>
          {matchB.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
              <Paged items={matchB} render={(b, i) => { const r = b.result ? RESULT_META[b.result] : undefined; return (
                <div key={i} style={{ padding: "12px 14px", background: "var(--card-2)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-proof)", borderRadius: "var(--r-md)" }}>
                  <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.5 }}>{b.betThen}</p>
                  {b.signal && <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 4 }}>Señal: {b.signal}</p>}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <InitLink init={b.init} />
                    {r && <Pill color={r.c} bg={`color-mix(in srgb, ${r.c} 14%, transparent)`} icon={r.i}>{r.l}</Pill>}
                  </div>
                </div>
              ); }} />
            </div>
          ) : <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 8, fontStyle: "italic" }}>Sin apuestas que coincidan.</p>}
        </Card>

        <Card pad={20}>
          <SectionTitle icon="GitBranch" sub={`${rootCauses.length} en total`}>Causas raíz detectadas</SectionTitle>
          {matchC.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
              <Paged items={matchC} render={(c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", background: "var(--card-2)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-focus)", borderRadius: "var(--r-md)" }}>
                  <span style={{ fontSize: "var(--t-sm)", flex: 1, minWidth: 0 }}>{c.cause}</span>
                  <InitLink init={c.init} />
                </div>
              )} />
            </div>
          ) : <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 8, fontStyle: "italic" }}>Sin causas que coincidan.</p>}
        </Card>

        {memContent.length > 0 && (
          <Card pad={20}>
            <SectionTitle icon="History" sub="Radares, pulsos, líneas de tiempo y demás sesiones que hizo el equipo">Retros y sesiones del equipo ({memContent.length})</SectionTitle>
            {matchMem.length
              ? <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}><Paged items={matchMem} render={(m) => <MemoryCard key={m.id} mem={m} defaultOpen={false} />} /></div>
              : <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 8, fontStyle: "italic" }}>Sin retros que coincidan.</p>}
          </Card>
        )}

        {foda && (
          <Card pad={20}>
            <SectionTitle icon="Grid2x2" sub={foda.date ? `Hecho el ${foda.date}` : "El diagnóstico FODA del equipo"}>FODA del equipo</SectionTitle>
            <FodaGrid team={team} />
          </Card>
        )}
      </div>
    </>
  );
}
