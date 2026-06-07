"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/icon";
import { Logo } from "@/components/AppShell";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { homeFor } from "@/lib/auth/access";

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next");
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    const user = await login(email, pass);
    setBusy(false);
    if (user) {
      router.replace(next && next.startsWith("/") ? next : homeFor(user.role));
    } else {
      setError(true);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "var(--card-2)", border: "1px solid " + (error ? "rgba(239,68,68,0.5)" : "var(--line-2)"),
    borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "12px 14px", fontSize: "var(--t-base)", outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px", background: "radial-gradient(900px 460px at 50% -120px, rgba(0,232,122,0.10), transparent), var(--bg-1)" }}>
      <div style={{ marginBottom: 26 }}><Logo /></div>

      <div style={{ width: "100%", maxWidth: 420, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-xl)", padding: 30, boxShadow: "var(--sh-lg)" }}>
        <h1 style={{ fontSize: "var(--t-xl)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Ingresá a tu cuenta</h1>
        <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 22 }}>Acompañá la mejora continua de tus equipos.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Email</label>
            <input type="email" value={email} autoFocus
              onChange={(e) => { setEmail(e.target.value); setError(false); }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="vos@empresa.com" style={inputStyle} />
          </div>
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Contraseña</label>
            <div style={{ position: "relative" }}>
              <input type={show ? "text" : "password"} value={pass}
                onChange={(e) => { setPass(e.target.value); setError(false); }}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Tu contraseña" style={{ ...inputStyle, paddingRight: 44 }} />
              <button type="button" onClick={() => setShow((s) => !s)} title={show ? "Ocultar" : "Mostrar"}
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "var(--ink-2)", padding: 6, display: "inline-flex" }}>
                <Icon name={show ? "EyeOff" : "Eye"} size={18} />
              </button>
            </div>
          </div>

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ff8b8b", fontSize: "var(--t-sm)", fontWeight: 600 }}>
              <Icon name="TriangleAlert" size={16} /> Email o contraseña incorrectos
            </div>
          )}

          <Button full size="lg" onClick={submit} disabled={busy} style={{ marginTop: 4 }}>{busy ? "Ingresando…" : "Ingresar"}</Button>

          <button onClick={() => {}} className="muted" style={{ fontSize: "var(--t-sm)", textAlign: "center", marginTop: 2 }}>
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </div>

      <p className="faint" style={{ fontSize: "var(--t-xs)", textAlign: "center", marginTop: 22, maxWidth: 360, lineHeight: 1.6 }}>
        ¿Sos nuevo? Tu acceso llega por invitación.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginInner /></Suspense>;
}
