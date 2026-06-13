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

  // ── Genérico: si hay clusters votados, mostralos; si no, columnas ──
  if (clusters.length) return <ClusterList clusters={clusters} cards={cards} votes={votes} />;
  if (cards.length) return <ColumnGrid cards={cards} />;
  return <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>Sin contenido capturado.</p>;
}

/** Tarjeta expandible de una sesión cerrada: cabecera (retro + fecha) + su visualización. */
export function MemoryCard({ mem, defaultOpen = true }: { mem: SessionMemory; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const name = retroById(mem.retro)?.name ?? mem.retro ?? "Sesión";
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r-lg)", overflow: "hidden", background: "var(--bg-2)" }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", textAlign: "left" }}>
        <Icon name="Sparkles" size={15} style={{ color: "var(--green)", flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: "var(--t-sm)", flex: 1, minWidth: 0 }}>{name}</span>
        {mem.date && <span className="num muted" style={{ fontSize: "var(--t-xs)" }}>{mem.date}</span>}
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={16} style={{ color: "var(--ink-3)" }} />
      </button>
      {open && <div style={{ padding: "4px 14px 16px" }}><RetroResult snap={mem} /></div>}
    </div>
  );
}
