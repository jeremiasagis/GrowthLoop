"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card } from "@/components/ui";
import { SessionTimer } from "@/components/session/Timer";
import { AnonCard, CardComposer } from "@/components/session/Cards";

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
    </div>
  );
}
