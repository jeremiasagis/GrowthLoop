"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card } from "@/components/ui";
import { SessionTimer } from "@/components/session/Timer";
import { AnonCard, CardBoard, CardComposer, type BoardCard } from "@/components/session/Cards";
import {
  BetTemplate, CausesTree, DotVote, Filters3, IceForm, IceRanking, Matrix2x2, PulseForm, PulseResult, VoteTally,
  type CauseNode, type Ice, type Pulse, type VoteItem,
} from "@/components/session/blocks";

function Sub({ children }: { children: React.ReactNode }) {
  return <div className="eyebrow" style={{ marginBottom: 10 }}>{children}</div>;
}

export default function LabPage() {
  // ── Timer demo ──
  const TOTAL = 90;
  const [secs, setSecs] = useState(45);
  const [running, setRunning] = useState(true);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setSecs((s) => { if (s <= 1) { if (ref.current) clearInterval(ref.current); setRunning(false); return 0; } return s - 1; }), 1000);
      return () => { if (ref.current) clearInterval(ref.current); };
    }
  }, [running]);

  // ── Tarjeta anónima demo ──
  const [draft, setDraft] = useState("");
  const [mine, setMine] = useState<string[]>([]);
  const others = ["Esto lo escribió otra persona", "Una tarjeta ajena más"];
  const [revealed, setRevealed] = useState(false);
  const addMine = () => { const t = draft.trim(); if (!t) return; setMine((m) => [...m, t]); setDraft(""); };

  // ── Tablero demo ──
  const BOARD_COLS = [
    { key: "works", label: "Funciona", color: "var(--success)", icon: "ThumbsUp" },
    { key: "blocks", label: "Nos traba", color: "var(--warning)", icon: "Construction" },
    { key: "unsaid", label: "Nadie dice", color: "var(--violet)", icon: "EyeOff" },
  ];
  const [bCards, setBCards] = useState<BoardCard[]>([
    { id: "o1", columnKey: "works", text: "Nos cubrimos en los picos" },
    { id: "o2", columnKey: "blocks", text: "Las reuniones no cierran en decisiones" },
    { id: "o3", columnKey: "unsaid", text: "Hay temas que evitamos" },
  ]);
  const [bDrafts, setBDrafts] = useState<Record<string, string>>({ works: "", blocks: "", unsaid: "" });
  const [bReveal, setBReveal] = useState(false);
  const bId = useRef(0);
  const addB = (key: string) => { const t = (bDrafts[key] ?? "").trim(); if (!t) return; setBCards((c) => [...c, { id: `me${++bId.current}`, columnKey: key, text: t, mine: true }]); setBDrafts((d) => ({ ...d, [key]: "" })); };

  // ── Votación ──
  const [vItems, setVItems] = useState<VoteItem[]>([{ id: "a", label: "Reuniones sin decisiones", votes: 2, mine: 1 }, { id: "b", label: "Traspaso entre turnos", votes: 1, mine: 0 }, { id: "c", label: "Retrabajo en reportes", votes: 0, mine: 0 }]);
  const vRemaining = 3 - vItems.reduce((s, i) => s + (i.mine ?? 0), 0);
  const vAdd = (id: string) => { if (vRemaining <= 0) return; setVItems((x) => x.map((i) => i.id === id ? { ...i, mine: (i.mine ?? 0) + 1, votes: i.votes + 1 } : i)); };
  const vRemove = (id: string) => setVItems((x) => x.map((i) => i.id === id && (i.mine ?? 0) > 0 ? { ...i, mine: (i.mine ?? 0) - 1, votes: i.votes - 1 } : i));
  // ── ICE ──
  const iceItems = [{ id: "i1", label: "Acta de 3 líneas al cerrar" }, { id: "i2", label: "Un dueño por decisión" }, { id: "i3", label: "Timebox de 10' por tema" }];
  const [iceD, setIceD] = useState<Record<string, Ice>>({});
  const iceRank = iceItems.map((it) => { const d = iceD[it.id] ?? { i: 5, c: 5, e: 5 }; return { id: it.id, label: it.label, score: Math.round((d.i + d.c + d.e) / 3 * 10) / 10 }; });
  // ── Árbol ──
  const [nodes, setNodes] = useState<CauseNode[]>([{ id: "n1", parentId: null, text: "La agenda no se prepara con tiempo", level: 0 }]);
  const addNode = (parentId: string | null, text: string) => setNodes((n) => { const parent = n.find((x) => x.id === parentId); return [...n, { id: `n${n.length + 1}`, parentId, text, level: parent ? parent.level + 1 : 0 }]; });
  // ── Apuesta / filtros / pulso ──
  const [bet, setBet] = useState({ betIf: "", betThen: "", signal: "", deadline: "" });
  const [filters, setFilters] = useState<{ observable?: boolean; medible?: boolean; equipo?: boolean }>({});
  const [pulseD, setPulseD] = useState<Pulse>({ confianza: 60, comunic: 60, claridad: 60, foco: 60, seguridad: 60 });

  return (
    <div className="screen-pad" style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Laboratorio de componentes</h1>
      <p className="muted" style={{ marginTop: 4, marginBottom: 24 }}>Vista previa de los bloques reutilizables de sesión. Los apruebo uno por uno antes de construir las sesiones.</p>

      <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, marginBottom: 14 }}>1 · Timer</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Card pad={20}>
          <Sub>Vista facilitador (controla)</Sub>
          <SessionTimer secs={secs} total={TOTAL} running={running} control onToggle={() => setRunning((r) => !r)} onReset={() => { setSecs(TOTAL); setRunning(false); }} onAdd={() => setSecs((s) => s + 60)} />
        </Card>
        <Card pad={20}>
          <Sub>Vista miembro (solo ve)</Sub>
          <SessionTimer secs={secs} total={TOTAL} running={running} />
        </Card>
        <Card pad={20}>
          <Sub>Compacto (para la barra superior)</Sub>
          <SessionTimer secs={secs} total={TOTAL} running={running} control compact onToggle={() => setRunning((r) => !r)} onAdd={() => setSecs((s) => s + 60)} />
        </Card>
        <Card pad={20}>
          <Sub>Últimos 30s (alerta)</Sub>
          <SessionTimer secs={Math.min(secs, 18)} total={TOTAL} running={running} />
        </Card>
      </div>

      <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, margin: "30px 0 14px" }}>2 · Tarjeta anónima</h2>
      <Card pad={20} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <Sub>{revealed ? "Reveladas (todas iguales)" : "Escribiendo (tuyas en verde, ajenas ocultas)"}</Sub>
          <Button size="sm" variant={revealed ? "secondary" : "primary"} icon={revealed ? "EyeOff" : "Eye"} onClick={() => setRevealed((r) => !r)}>{revealed ? "Ocultar" : "Revelar"}</Button>
        </div>
        <CardComposer value={draft} onChange={setDraft} onAdd={addMine} placeholder="Escribí una tarjeta…" disabled={revealed} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {mine.map((t, i) => <AnonCard key={`m${i}`} text={t} mine revealed={revealed} color="var(--violet)" />)}
          {others.map((t, i) => <AnonCard key={`o${i}`} text={t} revealed={revealed} color="var(--violet)" />)}
          {!mine.length && <p className="muted" style={{ fontSize: "var(--t-xs)" }}>Escribí una arriba para ver tu tarjeta en verde.</p>}
        </div>
      </Card>

      <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, margin: "30px 0 14px" }}>3 · Tablero de tarjetas</h2>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Button size="sm" variant={bReveal ? "secondary" : "primary"} icon={bReveal ? "EyeOff" : "Eye"} onClick={() => setBReveal((r) => !r)}>{bReveal ? "Ocultar" : "Revelar tablero"}</Button>
      </div>
      <CardBoard columns={BOARD_COLS} cards={bCards} revealed={bReveal} drafts={bReveal ? undefined : bDrafts} onDraft={(k, v) => setBDrafts((d) => ({ ...d, [k]: v }))} onAdd={bReveal ? undefined : addB} />

      <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, margin: "30px 0 14px" }}>4 · Votación de puntos</h2>
      <div className="team-grid">
        <Card pad={20}><Sub>Miembro · te quedan {vRemaining} puntos</Sub><DotVote items={vItems} remaining={vRemaining} onAdd={vAdd} onRemove={vRemove} /></Card>
        <Card pad={20}><Sub>Facilitador · ranking en vivo</Sub><VoteTally items={vItems} /></Card>
      </div>

      <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, margin: "30px 0 14px" }}>5 · ICE Score</h2>
      <div className="team-grid">
        <Card pad={20}><Sub>Miembro · puntúa cada idea</Sub><IceForm items={iceItems} drafts={iceD} onChange={(id, ice) => setIceD((d) => ({ ...d, [id]: ice }))} /></Card>
        <Card pad={20}><Sub>Ranking ICE</Sub><IceRanking items={iceRank} /></Card>
      </div>

      <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, margin: "30px 0 14px" }}>6 · Matriz 2×2</h2>
      <Card pad={20}><Matrix2x2 axisX="Frecuencia" axisY="Gravedad" items={[{ id: "1", label: "Reuniones", x: 0.8, y: 0.7, rank: 0 }, { id: "2", label: "Reportes", x: 0.4, y: 0.8 }, { id: "3", label: "Onboarding", x: 0.2, y: 0.3 }]} /></Card>

      <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, margin: "30px 0 14px" }}>7 · Árbol de causas</h2>
      <Card pad={20}><CausesTree root="Las reuniones no terminan en decisiones" nodes={nodes} onAddChild={addNode} editable /></Card>

      <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, margin: "30px 0 14px" }}>8 · Template de apuesta</h2>
      <Card pad={20}><BetTemplate {...bet} editable onChange={(f, v) => setBet((b) => ({ ...b, [f]: v }))} /></Card>

      <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, margin: "30px 0 14px" }}>9 · 3 filtros de validación</h2>
      <Card pad={20}><Filters3 filters={filters} editable onToggle={(k) => setFilters((f) => ({ ...f, [k]: !f[k] }))} /></Card>

      <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, margin: "30px 0 14px" }}>10 · Pulso del equipo</h2>
      <div className="team-grid">
        <Card pad={20}><Sub>Miembro · responde (anónimo)</Sub><PulseForm draft={pulseD} onChange={setPulseD} /></Card>
        <Card pad={20}><Sub>Resultado (promedio)</Sub><PulseResult avg={pulseD} /></Card>
      </div>
    </div>
  );
}
