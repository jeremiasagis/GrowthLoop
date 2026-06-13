"use client";

/* Ritual de cierre universal de Aprendizaje: una palabra por miembro,
   reveal simultáneo como nube. Presentacional — la sala maneja el estado. */

import { useState } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui";
import { WordCloud } from "@/components/WordCloud";

export function OneWordClosing({
  question = "¿Con una sola palabra, cómo cerrás este ciclo?",
  mine,
  onSubmit,
  revealed,
  words = [],
  count = 0,
  total = 0,
  isFacil = false,
}: {
  question?: string;
  mine?: string;
  onSubmit?: (word: string) => void;
  revealed?: boolean;
  words?: string[];
  count?: number;
  total?: number;
  isFacil?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const submitted = !!mine;
  const send = () => {
    const w = draft.trim().split(/\s+/)[0]; // una sola palabra
    if (!w || !onSubmit) return;
    onSubmit(w);
  };

  return (
    <div style={{ background: "color-mix(in srgb, var(--st-learn, var(--violet)) 8%, var(--card-2))", border: "1px solid color-mix(in srgb, var(--st-learn, var(--violet)) 30%, var(--line))", borderRadius: "var(--r-md)", padding: 18 }}>
      <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, color: "var(--st-learn, var(--violet))" }}>
        <Icon name="Sparkles" size={13} /> Cierre del ciclo
      </div>
      <p style={{ fontSize: "var(--t-md)", fontWeight: 700, lineHeight: 1.4, marginBottom: 14 }}>{question}</p>

      {revealed ? (
        <WordCloud words={words} />
      ) : isFacil ? (
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div className="num" style={{ fontSize: "var(--t-2xl)", fontWeight: 800, color: "var(--st-learn, var(--violet))" }}>{count}/{total}</div>
          <div className="muted" style={{ fontSize: "var(--t-sm)" }}>eligieron su palabra · se revelan todas juntas</div>
        </div>
      ) : submitted ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--green)", fontSize: "var(--t-sm)", fontWeight: 600, justifyContent: "center" }}>
          <Icon name="Check" size={16} /> Tu palabra: <b style={{ color: "var(--ink-0)" }}>{mine}</b>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Una palabra…" maxLength={24} style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "10px 12px", fontSize: "var(--t-sm)", outline: "none" }} />
          <Button size="md" icon="Send" onClick={send} disabled={!draft.trim()}>Enviar</Button>
        </div>
      )}
      {!revealed && <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 12, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}><Icon name="Lock" size={11} /> Anónimo · {count} de {total} eligieron</p>}
    </div>
  );
}
