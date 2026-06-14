"use client";

/* ============================================================
   Memoria viva: reconstruye la visualización de una sesión cerrada
   (read-only) a partir de su contenido + result guardado. Se usa en
   el detalle de iniciativa y en el módulo de Exploración para que
   TODO lo que produjo el equipo quede siempre visible.
   ============================================================ */

import { Icon } from "./icon";
import { Pill, PulseRadar } from "./ui";
import { WordCloud } from "./WordCloud";
import { TimelineBoard, TL_EMO, type TlEvent } from "./TimelineBoard";
import { CirclesDiagram, CIRCLE_META, type CircleKey } from "./CirclesDiagram";
import { FishboneDiagram } from "./FishboneDiagram";
import { JourneyBoard, type JourneyCol } from "./JourneyBoard";
import { StaceyMatrix, STACEY_ZONES, zoneOf } from "./StaceyMatrix";
import { OpposingScale } from "./OpposingScales";
import { CauseTree } from "./CauseTree";
import { useState } from "react";
import { retroById } from "@/lib/retros/registry";
import type { SessionCard, SessionCluster, SessionVote, SessionInput, SessionMemory } from "@/lib/session";

export interface SessionSnapshot {
  type: string;
  result: Record<string, unknown>;
  cards: SessionCard[];
  clusters: SessionCluster[];
  votes: SessionVote[];
  inputs: SessionInput[];
}

const CPAL = ["#00E87A", "#3B82F6", "#7C3AED", "#06B6D4", "#F59E0B", "#EF4444", "#EC4899", "#A3E635", "#14B8A6", "#F97316"];

// Etiquetas de columnas conocidas (para los tableros de tarjetas).
const COL_LABELS: Record<string, string> = {
  works: "✅ Funciona", blocks: "🚧 Nos traba", unsaid: "🔇 Nadie dice",
  mad: "😤 Mad", sad: "😔 Sad", glad: "😊 Glad",
  fire: "🔥 Aire caliente", sand: "⚓ Sacos de arena", storm: "⛈️ Tormentas",
  wind: "💨 Viento", anchor: "⚓ Ancla", rocks: "🪨 Rocas", island: "🏝️ Isla",
  f: "💪 Fortalezas", d: "⚠️ Debilidades", o: "🌱 Oportunidades", a: "⛈️ Amenazas",
  cv1: "Qué valora", cv2: "Qué le molesta", cv3: "Qué piensa y no dice",
  rq1: "Qué hace fluir", rq2: "Qué cuesta decir", rq3: "Qué cambiar",
  cause: "Causas posibles", pa: "Para qué existe", pb: "Quién depende", pc: "Cómo mide el cliente",
  fin: "Entrada", fstart: "Arranque", fexec: "Ejecución", fdeliver: "Entrega",
  // Seguimiento
  obs: "🚧 Obstáculos", fps: "Para subir 2 puntos",
  // Aprendizaje
  keep: "⭐ Seguir", more: "➕ Más de", less: "➖ Menos de", start: "🚀 Empezar", stop: "🛑 Dejar",
  lhwork: "✅ Funcionó", lhfail: "⚠️ No funcionó", lhsurp: "💡 Sorprendió",
  lrn: "📚 Aprendizajes",
  ltwork: "✅ Funciona del proceso", ltchg: "🔧 Cambiaríamos", ltneed: "🌱 Necesitamos",
  flliked: "👍 Liked", fllearned: "📚 Learned", fllacked: "😕 Lacked", fllonged: "🌟 Longed for",
};

function Chip({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: "var(--t-xs)", background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-sm)", padding: "4px 8px", lineHeight: 1.35 }}>{children}</span>;
}

/** Lista de clusters ordenados por votos, con sus tarjetas. */
function ClusterList({ clusters, cards, votes, color = "var(--green)" }: { clusters: SessionCluster[]; cards: SessionCard[]; votes: SessionVote[]; color?: string }) {
  const vb: Record<string, number> = {};
  votes.forEach((v) => { vb[v.clusterId] = (vb[v.clusterId] ?? 0) + 1; });
  const ranked = [...clusters].sort((a, b) => (vb[b.id] ?? 0) - (vb[a.id] ?? 0));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {ranked.map((cl, i) => (
        <div key={cl.id} style={{ background: "var(--card-2)", border: `1px solid ${i === 0 ? color : "var(--line)"}`, borderRadius: "var(--r-md)", padding: "9px 11px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: cards.some((c) => c.clusterId === cl.id) ? 7 : 0 }}>
            <span className="num" style={{ color: i === 0 ? color : "var(--ink-3)", fontWeight: 800, fontSize: "var(--t-xs)" }}>{i + 1}</span>
            <b style={{ fontSize: "var(--t-sm)", flex: 1, minWidth: 0 }}>{cl.name}</b>
            {(vb[cl.id] ?? 0) > 0 && <Pill color={color} bg="var(--success-bg)" icon="Vote">{vb[cl.id]}</Pill>}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{cards.filter((c) => c.clusterId === cl.id).map((c) => <Chip key={c.id}>{c.text}</Chip>)}</div>
        </div>
      ))}
    </div>
  );
}

/** Grilla de columnas de tarjetas (tableros sin agrupar). */
function ColumnGrid({ cards, labelFor, color = "var(--st-explore)" }: { cards: SessionCard[]; labelFor?: (k: string) => string; color?: string }) {
  const keys = [...new Set(cards.map((c) => c.columnKey))];
  if (!keys.length) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(150px, 1fr))`, gap: 10 }}>
      {keys.map((k) => (
        <div key={k} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderTop: `3px solid ${color}`, borderRadius: "var(--r-md)", padding: 10 }}>
          <div style={{ fontWeight: 700, fontSize: "var(--t-xs)", marginBottom: 7 }}>{labelFor?.(k) ?? COL_LABELS[k] ?? k} <span className="num muted">{cards.filter((c) => c.columnKey === k).length}</span></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {cards.filter((c) => c.columnKey === k).map((c) => <Chip key={c.id}>{c.text}</Chip>)}
          </div>
        </div>
      ))}
    </div>
  );
}

function Patterns({ items, label = "Patrones" }: { items?: string[]; label?: string }) {
  if (!items?.length) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {items.map((p, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "var(--t-sm)" }}><Icon name="Sparkles" size={13} style={{ color: "var(--green)" }} /><span>{p}</span></div>)}
      </div>
    </div>
  );
}

export function RetroResult({ snap }: { snap: SessionSnapshot }) {
  const { type, result: r, cards, clusters, votes, inputs } = snap;
  const has = (k: string) => cards.some((c) => c.columnKey === k);

  // ── Tipos con visualización propia ──
  if (type === "teamradar") {
    const avg = (r.trAvg as Record<string, number>) ?? {};
    const dims = ((r.trDims as { key: string; label: string }[]) ?? Object.keys(avg).map((key) => ({ key, label: key }))).map((d, i) => ({ ...d, color: CPAL[i % CPAL.length] }));
    return <div style={{ maxWidth: 380, margin: "0 auto" }}><PulseRadar values={avg} dims={dims} size={320} /></div>;
  }
  if (type === "oneword") return <WordCloud words={cards.filter((c) => c.columnKey === "word").map((c) => c.text)} />;
  if (type === "timeline") {
    const ms = (r.tlMilestones as string[]) ?? [];
    const ev: TlEvent[] = cards.filter((c) => c.columnKey.startsWith("ev:")).map((c) => { const [, mi, e] = c.columnKey.split(":"); return { mIdx: Number(mi) || 0, emo: (["pos", "neu", "neg"].includes(e) ? e : "neu") as TlEvent["emo"], text: c.text }; });
    return <><TimelineBoard milestones={ms} events={ev} /><Patterns items={r.tlPatterns as string[]} label="Patrones del período" /></>;
  }
  if (type === "circles") {
    const map = (r.circleMap as Record<string, CircleKey>) ?? {};
    const counts: Record<CircleKey, number> = { control: 0, influence: 0, soup: 0 };
    cards.filter((c) => c.columnKey === "worry").forEach((c) => { const k = map[c.id]; if (k) counts[k] += 1; });
    return (
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16, alignItems: "center" }} className="cards-cols">
        <CirclesDiagram counts={counts} size={220} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(["control", "influence", "soup"] as CircleKey[]).map((k) => (
            <div key={k}><div className="eyebrow" style={{ color: CIRCLE_META[k].color, marginBottom: 4 }}>{CIRCLE_META[k].label} · {counts[k]}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{cards.filter((c) => c.columnKey === "worry" && map[c.id] === k).map((c) => <Chip key={c.id}>{c.text}</Chip>)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (type === "fishbone") {
    const cats = ((r.fbCats as { key: string; label: string; color: string }[]) ?? []);
    const fbCauses = (r.fbCauses as { id: string; text: string; cat: string }[]) ?? [];
    const all = [...fbCauses, ...cards.filter((c) => c.columnKey.startsWith("fb_")).map((c) => ({ id: c.id, text: c.text, cat: c.columnKey }))];
    const diagCats = cats.map((c) => ({ ...c, count: all.filter((x) => x.cat === c.key).length }));
    return (
      <>
        <FishboneDiagram problem={(r.fbProblem as string) ?? ""} cats={diagCats} />
        {r.fbMain ? <div style={{ marginTop: 10, padding: "10px 12px", background: "color-mix(in srgb, var(--st-focus) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--st-focus) 32%, transparent)", borderRadius: "var(--r-md)" }}><div className="eyebrow" style={{ color: "var(--st-focus)", marginBottom: 3 }}>Causa principal</div><b style={{ fontSize: "var(--t-sm)" }}>{r.fbMain as string}</b></div> : null}
      </>
    );
  }
  if (type === "journey") {
    const steps = (r.sdSteps as string[]) ?? [];
    const emoAt = (i: number) => { const xs = inputs.filter((x) => x.key === `sdemo:${i}`).map((x) => (x.value as { e?: string }).e); return { pos: xs.filter((e) => e === "pos").length, neu: xs.filter((e) => e === "neu").length, neg: xs.filter((e) => e === "neg").length }; };
    const cAt = (i: number, t: string) => cards.filter((c) => c.columnKey === `sd:${i}:${t}`).map((c) => c.text);
    const cols: JourneyCol[] = steps.map((name, i) => ({ name, actions: cAt(i, "act"), frictions: cAt(i, "fri"), strengths: cAt(i, "str"), emo: emoAt(i) }));
    return <><JourneyBoard cols={cols} />{r.sdSynth ? <div style={{ marginTop: 10, fontSize: "var(--t-sm)" }}><b>Hallazgo:</b> {r.sdSynth as string}</div> : null}</>;
  }
  if (type === "stacey") {
    const pts = inputs.filter((i) => i.key === "st").map((i) => i.value as { x?: number; y?: number }).filter((p): p is { x: number; y: number } => p.x != null && p.y != null);
    const c = pts.length ? { x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length } : undefined;
    const z = c ? zoneOf(c.x, c.y) : undefined;
    return (
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <StaceyMatrix points={pts} centroid={c} />
        {z && <div style={{ marginTop: 10, textAlign: "center", fontSize: "var(--t-sm)" }}><b style={{ color: STACEY_ZONES[z].color }}>{STACEY_ZONES[z].label}</b> · {STACEY_ZONES[z].desc}</div>}
      </div>
    );
  }
  if (type === "opposites") {
    const pairs = (r.opPairs as { id: string; a: string; b: string }[]) ?? [];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {pairs.map((p) => {
          const xs = inputs.filter((i) => i.key === `op:${p.id}`).map((i) => i.value as { t?: number; i?: number });
          return <OpposingScale key={p.id} a={p.a} b={p.b} today={xs.map((x) => x.t).filter((v): v is number => v != null)} ideal={xs.map((x) => x.i).filter((v): v is number => v != null)} />;
        })}
        {r.opSynth ? <div style={{ fontSize: "var(--t-sm)" }}><b>Tensión:</b> {r.opSynth as string}</div> : null}
      </div>
    );
  }
  if (type === "impactfreq") {
    const probs = (r.ifProbs as { id: string; name: string }[]) ?? [];
    const avgOf = (id: string) => { const xs = inputs.filter((i) => i.key === `if:${id}`).map((i) => i.value as { f?: number; g?: number }); if (!xs.length) return null; return { f: xs.reduce((a, v) => a + (v.f ?? 2), 0) / xs.length, g: xs.reduce((a, v) => a + (v.g ?? 2), 0) / xs.length }; };
    return (
      <div style={{ position: "relative", width: "100%", maxWidth: 420, margin: "0 auto", aspectRatio: "3/2", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--line-2)" }} />
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "var(--line-2)" }} />
        <span className="muted" style={{ position: "absolute", top: 6, left: 8, fontSize: 10 }}>GRAVE ↑</span>
        <span className="muted" style={{ position: "absolute", bottom: 6, right: 8, fontSize: 10 }}>FRECUENTE →</span>
        {probs.map((p, i) => { const a = avgOf(p.id); if (!a) return null; const hi = a.g >= 2 && a.f >= 2; return <span key={p.id} title={p.name} className="num" style={{ position: "absolute", left: `${((a.f - 1) / 2) * 86 + 7}%`, top: `${93 - ((a.g - 1) / 2) * 86}%`, transform: "translate(-50%,-50%)", width: 26, height: 26, borderRadius: 99, display: "grid", placeItems: "center", fontWeight: 800, fontSize: "var(--t-xs)", background: hi ? "color-mix(in srgb, var(--green) 24%, var(--card))" : "var(--card-2)", border: `2px solid ${hi ? "var(--green)" : "var(--line-2)"}`, color: hi ? "var(--green)" : "var(--ink-2)" }}>{i + 1}</span>; })}
      </div>
    );
  }
  if (type === "whyhappening") {
    const tree = (r.whTree as { id: string; text: string; parent?: string }[]) ?? [];
    return (
      <>
        {tree.length ? <CauseTree nodes={tree} editable={false} onAdd={() => {}} onEdit={() => {}} onDelete={() => {}} /> : <ClusterList clusters={clusters} cards={cards} votes={votes} color="var(--st-focus)" />}
        {r.whRoot ? <div style={{ marginTop: 10, padding: "10px 12px", background: "color-mix(in srgb, var(--st-focus) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--st-focus) 32%, transparent)", borderRadius: "var(--r-md)" }}><div className="eyebrow" style={{ color: "var(--st-focus)", marginBottom: 3 }}>Causa raíz</div><b style={{ fontSize: "var(--t-sm)" }}>{r.whRoot as string}</b></div> : null}
      </>
    );
  }
  if (type === "perfection") {
    const score = r.perfectionScore as number | undefined;
    return (
      <>
        {score != null && <div style={{ textAlign: "center", marginBottom: 12 }}><span className="num" style={{ fontSize: 38, fontWeight: 800, color: "var(--st-focus)" }}>{score}</span><span className="muted">/10 del equipo</span></div>}
        {clusters.length ? <ClusterList clusters={clusters} cards={cards} votes={votes} color="var(--st-focus)" /> : <ColumnGrid cards={cards.filter((c) => c.columnKey === "pgf")} labelFor={() => "Para subir 2 puntos"} color="var(--st-focus)" />}
      </>
    );
  }
  if (type === "whereblock") {
    const stages = (r.wbStages as { key: string; label: string }[]) ?? [];
    const labelFor = (k: string) => stages.find((s) => s.key === k)?.label ?? k;
    return (
      <>
        <ColumnGrid cards={cards.filter((c) => c.columnKey.startsWith("wb"))} labelFor={labelFor} color="var(--st-focus)" />
        {r.wbForm ? <div style={{ marginTop: 10, padding: "10px 12px", background: "color-mix(in srgb, var(--st-focus) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--st-focus) 32%, transparent)", borderRadius: "var(--r-md)" }}><div className="eyebrow" style={{ color: "var(--st-focus)", marginBottom: 3 }}>La traba</div><b style={{ fontSize: "var(--t-sm)" }}>{r.wbForm as string}</b></div> : null}
      </>
    );
  }
  if (type === "relationships") {
    return (
      <>
        <WordCloud words={cards.filter((c) => c.columnKey === "relword").map((c) => c.text)} />
        <Patterns items={r.relPatterns as string[]} label="Patrones relacionales" />
      </>
    );
  }
  if (type === "clientvoice") {
    return (
      <>
        <ColumnGrid cards={cards.filter((c) => ["cv1", "cv2", "cv3"].includes(c.columnKey))} color="var(--st-focus)" />
        {r.cvSynth ? <div style={{ marginTop: 10, fontSize: "var(--t-sm)" }}><b>Brecha:</b> {r.cvSynth as string}</div> : null}
      </>
    );
  }

  // ── SEGUIMIENTO ──
  if (type === "follow") {
    const dec = r.fwDecision as string;
    const DEC: Record<string, { l: string; c: string }> = { continue: { l: "Continuar", c: "var(--green)" }, adjust: { l: "Ajustar", c: "var(--warning)" }, stop: { l: "Detener", c: "var(--risk)" } };
    const hv = inputs.filter((i) => i.key === "fwhonest").map((i) => (i.value as { v?: string }).v);
    const hc = { green: hv.filter((v) => v === "green").length, yellow: hv.filter((v) => v === "yellow").length, red: hv.filter((v) => v === "red").length };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "var(--t-sm)" }}>
        {!!r.fwSignalNow && <div><span className="muted">Señal hoy:</span> <b>{r.fwSignalNow as string}</b></div>}
        {!!r.fwBlockers && <div><span className="muted">Obstáculo:</span> {r.fwBlockers as string}</div>}
        {!!r.fwAdjust && <div><span className="muted">Ajuste:</span> {r.fwAdjust as string}</div>}
        {dec && DEC[dec] && <Pill color={DEC[dec].c} bg={`color-mix(in srgb, ${DEC[dec].c} 14%, transparent)`} icon="GitFork">Decisión: {DEC[dec].l}</Pill>}
        {hv.length > 0 && <div className="num muted" style={{ display: "flex", gap: 10 }}><span style={{ color: "var(--success)" }}>🟢 {hc.green}</span><span style={{ color: "var(--warning)" }}>🟡 {hc.yellow}</span><span style={{ color: "var(--risk)" }}>🔴 {hc.red}</span></div>}
      </div>
    );
  }
  if (type === "roti" || type === "fwperfection") {
    const key = type === "roti" ? "rt" : "fp";
    const max = type === "roti" ? 5 : 10;
    const scores = inputs.filter((i) => i.key === key).map((i) => (i.value as { v?: number }).v).filter((v): v is number => typeof v === "number");
    const avgN = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return (
      <div>
        <div style={{ textAlign: "center", marginBottom: 10 }}><span className="num" style={{ fontSize: 34, fontWeight: 800, color: "var(--st-follow)" }}>{avgN.toFixed(1)}</span><span className="muted">/{max} · {scores.length} respuestas</span></div>
        {type === "fwperfection" && has("fps") && <ColumnGrid cards={cards.filter((c) => c.columnKey === "fps")} color="var(--st-follow)" />}
        {!!r.rtNote && <p style={{ fontSize: "var(--t-sm)" }}>{r.rtNote as string}</p>}
      </div>
    );
  }
  if (type === "fwradar") {
    const avg = (r.trAvg as Record<string, number>) ?? {};
    const dims = ((r.trDims as { key: string; label: string }[]) ?? Object.keys(avg).map((key) => ({ key, label: key }))).map((d, i) => ({ ...d, color: CPAL[i % CPAL.length] }));
    return Object.keys(avg).length ? <div style={{ maxWidth: 360, margin: "0 auto" }}><PulseRadar values={avg} dims={dims} size={300} /></div> : <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>Sin datos del radar.</p>;
  }
  if (type === "consolidation") {
    const v = inputs.filter((i) => i.key === "convote").map((i) => (i.value as { v?: string }).v);
    const C: Record<string, { l: string; c: string }> = { sustained: { l: "Se sostuvo", c: "var(--success)" }, partial: { l: "Parcial", c: "var(--warning)" }, reverted: { l: "Se revirtió", c: "var(--risk)" } };
    const out = (r.outcome as string) || [...["sustained", "partial", "reverted"]].sort((a, b) => v.filter((x) => x === b).length - v.filter((x) => x === a).length)[0];
    return <div style={{ textAlign: "center" }}>{C[out] ? <Pill color={C[out].c} bg={`color-mix(in srgb, ${C[out].c} 14%, transparent)`} icon="Anchor">{C[out].l}</Pill> : <span className="muted">Sin resultado.</span>}</div>;
  }

  // ── APRENDIZAJE ──
  const CloseWords = () => { const w = (r.closeWords as string[]) ?? inputs.filter((i) => i.key === "closeword").map((i) => (i.value as { w?: string }).w).filter(Boolean) as string[]; return w.length ? <div style={{ marginTop: 10 }}><div className="eyebrow" style={{ marginBottom: 4 }}>Cómo cerró el equipo</div><WordCloud words={w} /></div> : null; };
  if (type === "lwhappened") {
    return (
      <>
        {!!r.lhNarrative && <div style={{ padding: "10px 12px", marginBottom: 10, background: "color-mix(in srgb, var(--st-learn) 9%, transparent)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", fontSize: "var(--t-sm)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{r.lhNarrative as string}</div>}
        <ColumnGrid cards={cards.filter((c) => ["lhwork", "lhfail", "lhsurp"].includes(c.columnKey))} color="var(--st-learn)" />
        <CloseWords />
      </>
    );
  }
  if (type === "lwnext") {
    const DEC: Record<string, { l: string; c: string }> = { implement: { l: "Implementar", c: "var(--success)" }, iterate: { l: "Iterar", c: "var(--st-proof)" }, pivot: { l: "Pivotar", c: "var(--warning)" }, pause: { l: "Pausar", c: "var(--ink-2)" } };
    const dec = r.lnDecision as string;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {dec && DEC[dec] && <Pill color={DEC[dec].c} bg={`color-mix(in srgb, ${DEC[dec].c} 14%, transparent)`} icon="GitFork">{DEC[dec].l}</Pill>}
        {!!r.lnReason && <p style={{ fontSize: "var(--t-sm)" }}>{r.lnReason as string}</p>}
        <CloseWords />
      </div>
    );
  }
  if (type === "letter") {
    const letters = inputs.filter((i) => i.key === "letter" && ((i.value as { text?: string }).text ?? "").trim()).length;
    const commits = (r.ltCommit as string[])?.filter((c) => c?.trim()) ?? [];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "var(--t-sm)" }}>
        <div className="muted">✉️ {letters} {letters === 1 ? "carta escrita" : "cartas escritas"}{r.ltTargetDate ? ` · para ${new Date(r.ltTargetDate as string).toLocaleDateString("es", { day: "numeric", month: "long" })}` : ""}</div>
        {commits.length > 0 && <div><div className="eyebrow" style={{ marginBottom: 4 }}>Compromisos</div>{commits.map((c, i) => <div key={i} style={{ display: "flex", gap: 6 }}><Icon name="Flag" size={13} style={{ color: "var(--st-learn)" }} />{c}</div>)}</div>}
        <CloseWords />
      </div>
    );
  }
  if (type === "speeddating") {
    const shared = inputs.filter((i) => i.key === "sdshare" && ((i.value as { text?: string }).text ?? "").trim()).length;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "var(--t-sm)" }}>
        <div className="muted"><Icon name="Lock" size={12} /> Las conversaciones de las parejas no se guardan.</div>
        {shared > 0 && <div>{shared} {shared === 1 ? "persona compartió" : "personas compartieron"} algo en el plenario.</div>}
        <CloseWords />
      </div>
    );
  }
  if (type === "kudos") {
    const parse = (s: string) => { try { return JSON.parse(s) as { to?: string; emoji?: string; text?: string }; } catch { return { text: s }; } };
    const ks = cards.filter((c) => c.columnKey === "kudo").map((c) => parse(c.text));
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {ks.map((k, i) => <div key={i} style={{ fontSize: "var(--t-sm)", padding: "7px 10px", background: "var(--card-2)", border: "1px solid var(--line)", borderRadius: "var(--r-sm)" }}>{k.emoji} <b>{k.to}</b>: {k.text}</div>)}
        {!ks.length && <span className="muted" style={{ fontSize: "var(--t-sm)" }}>Sin kudos.</span>}
      </div>
    );
  }
  if (type === "lwlearned" || type === "fourls" || type === "lwteam") {
    return (
      <>
        {clusters.length ? <ClusterList clusters={clusters} cards={cards} votes={votes} color="var(--st-learn)" /> : <ColumnGrid cards={cards} color="var(--st-learn)" />}
        <CloseWords />
      </>
    );
  }

  // ── Genérico: si hay clusters votados, mostralos; si no, columnas ──
  if (clusters.length) return <ClusterList clusters={clusters} cards={cards} votes={votes} />;
  if (cards.length) return <ColumnGrid cards={cards} />;
  if (type === "lwteam") return <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>Reflexiones privadas (no visibles).</p>;
  return <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>Sin contenido capturado.</p>;
}

/** Tarjeta expandible de una sesión cerrada: cabecera (retro + fecha) + su visualización. */
export function MemoryCard({ mem, defaultOpen = true, onDiscard }: { mem: SessionMemory; defaultOpen?: boolean; onDiscard?: () => void }) {
  const [open, setOpen] = useState(defaultOpen);
  const name = retroById(mem.retro)?.name ?? mem.retro ?? "Sesión";
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r-lg)", overflow: "hidden", background: "var(--bg-2)" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <button onClick={() => setOpen((o) => !o)} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", textAlign: "left" }}>
          <Icon name="Sparkles" size={15} style={{ color: "var(--green)", flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: "var(--t-sm)", flex: 1, minWidth: 0 }}>{name}</span>
          {mem.date && <span className="num muted" style={{ fontSize: "var(--t-xs)" }}>{mem.date}</span>}
          <Icon name={open ? "ChevronUp" : "ChevronDown"} size={16} style={{ color: "var(--ink-3)" }} />
        </button>
        {onDiscard && (
          <button onClick={onDiscard} title="Descartar sesión (prueba o sin resultados)"
            style={{ color: "var(--ink-3)", padding: "11px 12px", display: "inline-flex", flexShrink: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--risk)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-3)")}>
            <Icon name="Trash2" size={15} />
          </button>
        )}
      </div>
      {open && <div style={{ padding: "4px 14px 16px" }}><RetroResult snap={mem} /></div>}
    </div>
  );
}
