"use client";

/* ============================================================
   Preguntale a tus datos — panel de IA en la vista de organización.
   Lee los agregados anónimos de la org y devuelve una lectura con
   recomendaciones, o responde una pregunta puntual del líder/RRHH.
   ============================================================ */

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/icon";
import { Button, Card } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/* Mini-markdown: encabezados (##/###), viñetas (-) y negritas (**). */
function bold(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <b key={i} style={{ color: "var(--ink-0)" }}>{part.slice(2, -2)}</b>
      : <span key={i}>{part}</span>);
}
function MiniMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let bullets: ReactNode[] = [];
  const flush = () => { if (bullets.length) { out.push(<ul key={`u${out.length}`} style={{ margin: "4px 0 10px", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>{bullets}</ul>); bullets = []; } };
  lines.forEach((raw, i) => {
    const l = raw.trim();
    if (!l) { flush(); return; }
    if (l.startsWith("### ")) { flush(); out.push(<div key={i} className="eyebrow" style={{ marginTop: 10, marginBottom: 4, color: "var(--ink-2)" }}>{l.slice(4)}</div>); }
    else if (l.startsWith("## ")) { flush(); out.push(<div key={i} style={{ fontWeight: 800, fontSize: "var(--t-sm)", marginTop: 12, marginBottom: 5, color: "var(--green)" }}>{l.slice(3)}</div>); }
    else if (l.startsWith("# ")) { flush(); out.push(<div key={i} style={{ fontWeight: 800, fontSize: "var(--t-md)", marginBottom: 6 }}>{l.slice(2)}</div>); }
    else if (/^[-*•]\s/.test(l)) { bullets.push(<li key={i} style={{ fontSize: "var(--t-sm)", lineHeight: 1.5 }}>{bold(l.replace(/^[-*•]\s/, ""))}</li>); }
    else { flush(); out.push(<p key={i} style={{ fontSize: "var(--t-sm)", lineHeight: 1.6, marginBottom: 8 }}>{bold(l)}</p>); }
  });
  flush();
  return <>{out}</>;
}

const SUGGESTED = [
  "¿Qué dimensión de clima está peor en toda la org?",
  "¿Qué equipos necesitan atención urgente y por qué?",
  "¿En qué se está desarrollando la gente?",
];

export function OrgInsightPanel({ buildContext }: { buildContext: () => string }) {
  const { show } = useToast();
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const ask = async (question?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const { data: s } = await getSupabaseBrowserClient().auth.getSession();
      const res = await fetch("/api/ai/org-insight", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${s.session?.access_token ?? ""}` },
        body: JSON.stringify({ context: buildContext(), question }),
      });
      const json = await res.json();
      if (!res.ok || json.error) { show(json.error ?? "No se pudo generar la lectura.", "TriangleAlert"); return; }
      setText(json.text ?? "");
    } catch { show("No se pudo generar la lectura.", "TriangleAlert"); }
    finally { setBusy(false); }
  };

  return (
    <Card pad={18} style={{ background: "linear-gradient(180deg, color-mix(in srgb, var(--violet) 7%, var(--card)), var(--card))", borderColor: "color-mix(in srgb, var(--violet) 28%, var(--line))" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: "var(--r-md)", background: "color-mix(in srgb, var(--violet) 16%, transparent)", color: "var(--violet)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="Sparkles" size={18} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: "var(--t-md)" }}>Preguntale a tus datos</div>
          <div className="muted" style={{ fontSize: "var(--t-xs)" }}>La IA lee los agregados de tu organización (anónimos) y te da una lectura.</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && q.trim() && ask(q.trim())} disabled={busy}
          placeholder="Preguntá algo sobre tus equipos…"
          style={{ flex: 1, minWidth: 0, background: "var(--card-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" }} />
        <Button icon={busy ? "Loader" : "Send"} disabled={busy || !q.trim()} onClick={() => ask(q.trim())}>Preguntar</Button>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: text ? 14 : 0 }}>
        <Button size="sm" variant="secondary" icon={busy ? "Loader" : "FileText"} disabled={busy} onClick={() => ask()}>Lectura general</Button>
        {SUGGESTED.map((s) => (
          <button key={s} onClick={() => { setQ(s); ask(s); }} disabled={busy}
            style={{ fontSize: "var(--t-xs)", fontWeight: 600, padding: "6px 10px", borderRadius: "var(--r-full)", border: "1px solid var(--line-2)", background: "var(--card)", color: "var(--ink-2)" }}>{s}</button>
        ))}
      </div>

      {busy && !text && <div className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}><Icon name="Loader" size={14} /> Leyendo tus datos…</div>}
      {text && (
        <div style={{ marginTop: 14, padding: "14px 16px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
          <MiniMarkdown text={text} />
          <div style={{ display: "flex", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
            <Button size="sm" variant="ghost" icon="RefreshCw" disabled={busy} onClick={() => ask(q.trim() || undefined)}>Regenerar</Button>
            <span className="faint" style={{ fontSize: "var(--t-xs)", alignSelf: "center" }}>Generado por IA · verificá antes de decidir</span>
          </div>
        </div>
      )}
    </Card>
  );
}
