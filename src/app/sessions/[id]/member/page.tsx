"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, StageBadge } from "@/components/ui";
import { getSessionById } from "@/lib/repository";

const PROMPTS = [
  { key: "works", label: "Lo que funciona", color: "var(--success)", icon: "ThumbsUp" },
  { key: "blocks", label: "Lo que nos traba", color: "var(--warning)", icon: "Construction" },
  { key: "unsaid", label: "Lo que nadie dice", color: "var(--violet)", icon: "EyeOff" },
] as const;

interface MyCard { id: string; col: string; text: string }

export default function MemberSessionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const session = getSessionById(params.id);

  const [drafts, setDrafts] = useState<Record<string, string>>({ works: "", blocks: "", unsaid: "" });
  const [mine, setMine] = useState<MyCard[]>([]);
  const [code, setCode] = useState("");
  const [codeMsg, setCodeMsg] = useState<null | "ok" | "bad">(null);

  if (!session) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--bg-1)" }}>
        <Card pad={24}><p className="muted">No encontramos esta sesión. Pedile el link a tu facilitador.</p></Card>
      </div>
    );
  }

  const add = (col: string) => {
    const text = drafts[col].trim();
    if (!text) return;
    setMine((m) => [...m, { id: "m" + m.length, col, text }]);
    setDrafts((d) => ({ ...d, [col]: "" }));
  };

  const checkCode = () => {
    const ok = code.trim().toUpperCase() === (session.roomCode ?? "").toUpperCase();
    setCodeMsg(ok ? "ok" : "bad");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "radial-gradient(1100px 520px at 50% -160px, rgba(0,232,122,0.08), transparent), var(--bg-1)" }}>
      {/* top bar */}
      <header style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 18px", borderBottom: "1px solid var(--line)", background: "color-mix(in srgb, var(--bg-1) 88%, transparent)", backdropFilter: "blur(12px)" }}>
        <button onClick={() => router.push("/member")} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--ink-2)", fontSize: "var(--t-sm)", fontWeight: 600 }}>
          <Icon name="X" size={18} /> Salir
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--green)", boxShadow: "0 0 8px var(--green)", animation: "glow-pulse 1.3s infinite" }} />
          <span style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>En vivo</span>
          <StageBadge stage={session.stage} size="sm" />
        </div>
        <span style={{ width: 50 }} />
      </header>

      <main style={{ flex: 1, width: "100%", maxWidth: 640, margin: "0 auto", padding: "26px 16px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>{session.retro}</h1>
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="Lock" size={13} /> Tus tarjetas son anónimas
          </p>
        </div>

        {/* current block */}
        <Card pad={20} glow style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14, color: "var(--green)" }}>
            <Icon name="PenLine" size={18} /><span className="eyebrow" style={{ color: "var(--green)" }}>Bloque en vivo · Escribí tus tarjetas</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {PROMPTS.map((p) => {
              const count = mine.filter((m) => m.col === p.key).length;
              return (
                <div key={p.key}>
                  <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "var(--t-sm)", fontWeight: 600, marginBottom: 7 }}>
                    <span style={{ color: p.color, display: "inline-flex" }}><Icon name={p.icon} size={16} /></span>{p.label}
                    {count > 0 && <span className="num" style={{ marginLeft: "auto", fontSize: "var(--t-xs)", color: "var(--ink-2)" }}>{count} enviada{count > 1 ? "s" : ""}</span>}
                  </label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={drafts[p.key]} onChange={(e) => setDrafts((d) => ({ ...d, [p.key]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && add(p.key)} placeholder="Sumar tarjeta…"
                      style={{ flex: 1, minWidth: 0, background: "var(--card-2)", border: "1px solid var(--line-2)", borderLeft: `3px solid ${p.color}`, borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "10px 12px", fontSize: "var(--t-sm)", outline: "none" }} />
                    <button onClick={() => add(p.key)} style={{ background: p.color, color: "#06121f", borderRadius: "var(--r-sm)", padding: "0 12px", display: "grid", placeItems: "center" }}><Icon name="Plus" size={16} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--ink-2)", fontSize: "var(--t-sm)", padding: "8px 0 22px" }}>
          <Icon name="Hourglass" size={15} /> Tu facilitador controla el ritmo. Cuando avance, vas a ver el próximo bloque.
        </div>

        {/* room code fallback */}
        <Card pad={16} style={{ background: "var(--bg-2)" }}>
          <div className="muted" style={{ fontSize: "var(--t-xs)", marginBottom: 8 }}>¿No recibiste el link? Ingresá el código de sala</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={code} onChange={(e) => { setCode(e.target.value); setCodeMsg(null); }} maxLength={7} placeholder="GL-0000"
              onKeyDown={(e) => e.key === "Enter" && checkCode()}
              style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid " + (codeMsg === "bad" ? "rgba(239,68,68,0.5)" : "var(--line-2)"), borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "10px 12px", fontSize: "var(--t-base)", fontFamily: "var(--mono)", letterSpacing: "0.1em", textTransform: "uppercase", outline: "none" }} />
            <Button variant="secondary" onClick={checkCode}>Ingresar</Button>
          </div>
          {codeMsg === "ok" && <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--green)", fontSize: "var(--t-sm)", fontWeight: 600, marginTop: 10 }}><Icon name="Check" size={15} /> Conectado a la sala {session.roomCode}</div>}
          {codeMsg === "bad" && <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#ff8b8b", fontSize: "var(--t-sm)", fontWeight: 600, marginTop: 10 }}><Icon name="TriangleAlert" size={15} /> Código incorrecto</div>}
        </Card>
      </main>
    </div>
  );
}
