"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Logo } from "@/components/AppShell";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { homeFor } from "@/lib/auth/access";

const field: React.CSSProperties = { width: "100%", background: "var(--card-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none" };

export default function RegistroPage() {
  const router = useRouter();
  const { signupSolo } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const valid = name.trim().length > 1 && /\S+@\S+\.\S+/.test(email) && password.length >= 6;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true); setError(null); setInfo(null);
    const res = await signupSolo({ name, email, password });
    setBusy(false);
    if (res.error) {
      // Si pide confirmar mail, no es un error duro.
      if (res.error.toLowerCase().includes("confirm")) { setInfo(res.error); return; }
      setError(res.error); return;
    }
    router.push(res.user ? homeFor(res.user.role) : "/login");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "radial-gradient(1100px 520px at 50% -160px, rgba(0,232,122,0.12), transparent), var(--bg-1)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 28px" }}>
        <Logo />
        <button onClick={() => router.push("/login")} style={{ color: "var(--ink-2)", fontSize: "var(--t-sm)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
          Iniciar sesión <Icon name="ArrowRight" size={15} />
        </button>
      </header>

      <main style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 20px 80px" }}>
        <Card pad={32} style={{ width: "100%", maxWidth: 460 }}>
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div style={{ width: 56, height: 56, borderRadius: "var(--r-lg)", background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
              <Icon name="Rocket" size={28} />
            </div>
            <h1 style={{ fontSize: "var(--t-xl)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 8 }}>Empezá gratis</h1>
            <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.55 }}>
              Creá tu cuenta de facilitador en el plan <b style={{ color: "var(--ink-1)" }}>Starter</b>: 1 equipo y las retros esenciales de cada etapa. Cuando quieras más, pasás a Pro.
            </p>
          </div>

          {info ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ width: 48, height: 48, borderRadius: "var(--r-lg)", background: "var(--success-bg)", color: "var(--green)", display: "grid", placeItems: "center", margin: "0 auto 12px" }}><Icon name="MailCheck" size={24} /></div>
              <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.55 }}>{info}</p>
              <Button full icon="LogIn" style={{ marginTop: 16 }} onClick={() => router.push("/login")}>Ir a iniciar sesión</Button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Tu nombre</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre y apellido" style={field} />
              </div>
              <div>
                <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="vos@email.com" style={field} />
              </div>
              <div>
                <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Contraseña</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Mínimo 6 caracteres" style={field} />
              </div>
              {error && <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ff8b8b", fontSize: "var(--t-sm)", fontWeight: 600 }}><Icon name="TriangleAlert" size={16} /> {error}</div>}
              <Button full size="lg" icon="Rocket" disabled={!valid || busy} onClick={submit}>{busy ? "Creando tu cuenta…" : "Crear mi cuenta gratis"}</Button>
              <p className="faint" style={{ fontSize: "var(--t-xs)", textAlign: "center" }}>
                ¿Sos una empresa? Escribinos a <b style={{ color: "var(--ink-1)" }}>consultas@growthloop.com</b> para el plan Business.
              </p>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
