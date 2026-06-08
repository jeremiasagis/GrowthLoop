"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Logo } from "@/components/AppShell";
import { Button, Card } from "@/components/ui";

export default function RegistroPage() {
  const router = useRouter();
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "radial-gradient(1100px 520px at 50% -160px, rgba(124,58,237,0.12), transparent), var(--bg-1)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 28px" }}>
        <Logo />
        <button onClick={() => router.push("/login")} style={{ color: "var(--ink-2)", fontSize: "var(--t-sm)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
          Iniciar sesión <Icon name="ArrowRight" size={15} />
        </button>
      </header>

      <main style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "48px 20px 80px" }}>
        <Card pad={32} style={{ width: "100%", maxWidth: 460, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "var(--r-lg)", background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
            <Icon name="MailCheck" size={28} />
          </div>
          <h1 style={{ fontSize: "var(--t-xl)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 8 }}>El acceso es por invitación</h1>
          <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.6, marginBottom: 22 }}>
            Growthloop no tiene alta abierta. Tu administrador o facilitador te envía un link de invitación
            para crear tu cuenta. Si ya lo recibiste, abrilo desde tu correo o mensaje.
          </p>
          <Button full icon="LogIn" onClick={() => router.push("/login")}>Ya tengo cuenta · Iniciar sesión</Button>
          <p className="faint" style={{ fontSize: "var(--t-xs)", marginTop: 16 }}>
            ¿Querés llevar Growthloop a tu organización? Escribinos a <b style={{ color: "var(--ink-1)" }}>consultas@teamcookgame.com</b>.
          </p>
        </Card>
      </main>
    </div>
  );
}
