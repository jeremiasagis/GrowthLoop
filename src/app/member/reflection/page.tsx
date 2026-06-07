"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { Button, Card } from "@/components/ui";
import { getReflections } from "@/lib/repository";
import type { Reflection } from "@/lib/data";

export default function ReflectionsPage() {
  const [list, setList] = useState<Reflection[]>(() => getReflections().map((r) => ({ ...r })));
  const [draft, setDraft] = useState("");

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setList((l) => [{ id: "rf" + l.length, date: "hoy", prompt: "Reflexión libre", text }, ...l]);
    setDraft("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ fontSize: "var(--t-xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Mis reflexiones</h1>
        <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="Lock" size={13} /> Solo vos podés ver estas reflexiones.
        </p>
      </div>

      {/* composer */}
      <Card pad={16}>
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Escribí lo que estás pensando sobre tu equipo o tu trabajo…"
          style={{ width: "100%", minHeight: 84, background: "var(--card-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: 12, fontSize: "var(--t-sm)", resize: "vertical", outline: "none" }} />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <Button icon="Check" disabled={!draft.trim()} onClick={add}>Guardar reflexión</Button>
        </div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map((r) => (
          <Card key={r.id} pad={16}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: "var(--t-xs)", fontWeight: 600, color: "var(--ink-2)" }}>{r.prompt}</span>
              <span className="num faint" style={{ fontSize: "var(--t-xs)" }}>{r.date}</span>
            </div>
            <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.55, color: "var(--ink-1)" }}>{r.text}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
