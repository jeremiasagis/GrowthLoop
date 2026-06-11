"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Logo } from "@/components/AppShell";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { homeFor } from "@/lib/auth/access";

/** El usuario llega acá desde el link del correo de recuperación
 *  (Supabase abre la sesión de recovery automáticamente). */
export default function ResetPage() {
  const router = useRouter();
  const { updatePassword, user } = useAuth();
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (pass.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
    if (pass !== confirm) { setError("Las contraseñas no coinciden."); return; }
    setBusy(true);
    const res = await updatePassword(pass);
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    setDone(true);
    setTimeout(() => router.replace(user ? homeFor(user.role) : "/login"), 1400);
  };

  const field: React.CSSProperties = { width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "12px 14px", fontSize: "var(--t-base)", outline: "none" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px", background: "radial-gradient(900px 460px at 50% -120px, rgba(0,232,122,0.10), transparent), var(--bg-1)" }}>
      <div style={{ marginBottom: 24 }}><Logo /></div>
      <Card pad={28} style={{ width: "min(420px,100%)" }}>
        {done ? (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: "var(--r-lg)", background: "var(--success-bg)", color: "var(--green)", display: "grid", placeItems: "center", margin: "0 auto 12px", animation: "pop-in .3s var(--spring)" }}><Icon name="Check" size={28} /></div>
            <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800 }}>Contraseña actualizada</h2>
            <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 6 }}>Entrando…</p>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: "var(--t-xl)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>Nueva contraseña</h1>
            <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 20 }}>Elegí una contraseña nueva para tu cuenta.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input type="password" autoFocus value={pass} onChange={(e) => { setPass(e.target.value); setError(null); }} placeholder="Nueva contraseña (mín. 6)" style={field} />
              <input type="password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(null); }} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Repetila" style={field} />
            </div>
            {error && <p style={{ color: "#ff8b8b", fontSize: "var(--t-sm)", fontWeight: 600, marginTop: 12 }}>{error}</p>}
            <Button full size="lg" icon="Check" disabled={busy} onClick={submit} style={{ marginTop: 18 }}>{busy ? "Guardando…" : "Guardar contraseña"}</Button>
          </>
        )}
      </Card>
    </div>
  );
}
