"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card } from "@/components/ui";
import { joinSessionByCode } from "@/lib/session";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async (override?: string) => {
    const c = (override ?? code).trim().toUpperCase();
    if (c.length < 4 || busy) return;
    setBusy(true); setError(null);
    const res = await joinSessionByCode(c);
    setBusy(false);
    if (res.error || !res.sessionId) { setError(res.error ?? "No encontramos una sesión activa con ese código. Revisalo con tu facilitador."); return; }
    router.replace(`/sala/${res.sessionId}`);
  };

  // Código por URL (al escanear el QR del facilitador): se une solo.
  const auto = useRef(false);
  useEffect(() => {
    if (auto.current) return;
    const c = new URLSearchParams(window.location.search).get("code");
    if (c && c.trim().length >= 4) { auto.current = true; setCode(c.toUpperCase()); join(c); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="screen-pad" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <Card pad={30} style={{ width: "min(420px,100%)", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "var(--r-lg)", background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
          <Icon name="Radio" size={28} />
        </div>
        <h1 style={{ fontSize: "var(--t-xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Unirse a una sesión</h1>
        <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 6, marginBottom: 20 }}>Tipeá el código que muestra tu facilitador en la pantalla.</p>
        <input
          autoFocus value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
          onKeyDown={(e) => e.key === "Enter" && join()} placeholder="Ej: K7QP9" maxLength={6}
          style={{ width: "100%", textAlign: "center", letterSpacing: "0.3em", fontWeight: 800, fontSize: "var(--t-2xl)", textTransform: "uppercase", background: "var(--card-2)", border: "1px solid " + (error ? "rgba(239,68,68,0.5)" : "var(--line-2)"), borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "14px 16px", outline: "none" }}
          className="num"
        />
        {error && <p style={{ color: "#ff8b8b", fontSize: "var(--t-sm)", fontWeight: 600, marginTop: 12 }}>{error}</p>}
        <Button full size="lg" icon="ArrowRight" disabled={code.trim().length < 4 || busy} onClick={() => join()} style={{ marginTop: 16 }}>{busy ? "Entrando…" : "Entrar a la sesión"}</Button>
        <button onClick={() => router.back()} className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 14, fontWeight: 600 }}>Volver</button>
      </Card>
    </div>
  );
}
