"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Logo, GrowthMark } from "@/components/AppShell";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { homeFor } from "@/lib/auth/access";
import { getInvitation, markInvitationAccepted, type Invitation } from "@/lib/repository";
import { ROLES } from "@/lib/data";

function Field({ label, type = "text", value, onChange, readOnly }: { label: string; type?: string; value: string; onChange?: (v: string) => void; readOnly?: boolean }) {
  return (
    <div>
      <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange?.(e.target.value)} readOnly={readOnly}
        style={{ width: "100%", background: readOnly ? "var(--card-2)" : "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: readOnly ? "var(--ink-2)" : "var(--ink-0)", padding: "12px 14px", fontSize: "var(--t-base)", outline: "none" }} />
    </div>
  );
}

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { acceptInvite, login, user } = useAuth();

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loadingInv, setLoadingInv] = useState(true);
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // "signup": crear cuenta nueva · "login": ya tiene cuenta, entra y se une
  const [mode, setMode] = useState<"signup" | "login">("signup");

  useEffect(() => {
    getInvitation(params.token).then((inv) => {
      setInvitation(inv);
      if (inv?.name) setName(inv.name);
      setLoadingInv(false);
    });
  }, [params.token]);

  if (loadingInv) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg-1)" }}>
        <span style={{ animation: "spin 1.1s linear infinite", display: "inline-flex" }}><GrowthMark size={34} /></span>
      </div>
    );
  }

  if (!invitation || invitation.status === "accepted") {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--bg-1)" }}>
        <Card pad={28} style={{ maxWidth: 420, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "var(--r-lg)", background: "var(--warning-bg)", color: "var(--warning)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}><Icon name="TriangleAlert" size={28} /></div>
          <h1 style={{ fontSize: "var(--t-lg)", fontWeight: 700, marginBottom: 6 }}>
            {invitation?.status === "accepted" ? "Esta invitación ya fue usada" : "Invitación no válida"}
          </h1>
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 18 }}>
            {invitation?.status === "accepted" ? "Ya creaste tu cuenta con este link. Ingresá normalmente." : "Este link no existe o expiró. Pedí que te reenvíen la invitación."}
          </p>
          <Button full icon="LogIn" onClick={() => router.push("/login")}>Ir al login</Button>
        </Card>
      </div>
    );
  }

  const role = ROLES[invitation.role];
  const sameAccount = !!user && user.email.toLowerCase() === invitation.email.toLowerCase();

  // Acepta la invitación con la sesión ya activa: la RPC (security definer)
  // re-vincula perfil + ficha del equipo, y recargamos para reconstruir el rol.
  const acceptWithSession = async () => {
    await markInvitationAccepted(invitation.token);
    window.location.href = homeFor(invitation.role);
  };

  const submit = async () => {
    if (mode === "login") {
      if (pass.length < 6) { setError("Ingresá tu contraseña."); return; }
      setBusy(true);
      const u = await login(invitation.email, pass);
      if (!u) { setBusy(false); setError("Email o contraseña incorrectos."); return; }
      await acceptWithSession();
      return;
    }
    if (name.trim().length < 2) { setError("Ingresá tu nombre completo."); return; }
    if (pass.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
    if (pass !== confirm) { setError("Las contraseñas no coinciden."); return; }

    setBusy(true);
    const res = await acceptInvite({
      email: invitation.email, password: pass, name: name.trim(),
      role: invitation.role, orgId: invitation.orgId, orgName: invitation.orgName, teamId: invitation.teamId,
    });
    if (res.error) {
      setBusy(false);
      if (/already|registered|exists/i.test(res.error)) {
        setMode("login"); setPass(""); setError("Ese correo ya tiene cuenta. Ingresá tu contraseña para unirte.");
      } else setError(res.error);
      return;
    }
    await markInvitationAccepted(invitation.token);
    router.replace(homeFor(invitation.role));
  };

  // Ya logueado con el mismo email: unirse directo, sin formulario.
  if (sameAccount) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--bg-1)" }}>
        <Card pad={28} style={{ maxWidth: 440, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "var(--r-lg)", background: "var(--violet-soft)", color: "var(--violet)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}><Icon name="MailOpen" size={28} /></div>
          <h1 style={{ fontSize: "var(--t-lg)", fontWeight: 800, marginBottom: 6 }}>Te invitaron{invitation.orgName ? ` a ${invitation.orgName}` : ""}</h1>
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 20 }}>Ya estás logueado como <b style={{ color: "var(--ink-0)" }}>{user!.name}</b> ({invitation.email}). Un clic y quedás vinculado.</p>
          <Button full size="lg" icon="UserCheck" disabled={busy} onClick={async () => { setBusy(true); await acceptWithSession(); }}>{busy ? "Vinculando…" : "Unirme con esta cuenta"}</Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px", background: "radial-gradient(900px 460px at 50% -120px, rgba(124,58,237,0.12), transparent), var(--bg-1)" }}>
      <div style={{ marginBottom: 24 }}><Logo /></div>

      <Card pad={30} style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ width: 48, height: 48, borderRadius: "var(--r-md)", background: "var(--violet-soft)", color: "var(--violet)", display: "grid", placeItems: "center", marginBottom: 16 }}>
          <Icon name="MailOpen" size={24} />
        </div>
        <h1 style={{ fontSize: "var(--t-xl)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>
          Te invitaron a unirte{invitation.orgName ? ` a ${invitation.orgName}` : " a Growthloop"}
        </h1>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 22, fontSize: "var(--t-sm)" }}>
          <span className="muted">Como:</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: role.color, fontWeight: 700 }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: role.color }} />{role.label}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Tu correo" value={invitation.email} readOnly />
          {mode === "signup" && <Field label="Nombre completo" value={name} onChange={(v) => { setName(v); setError(null); }} />}
          <Field label="Contraseña" type="password" value={pass} onChange={(v) => { setPass(v); setError(null); }} />
          {mode === "signup" && <Field label="Confirmar contraseña" type="password" value={confirm} onChange={(v) => { setConfirm(v); setError(null); }} />}
        </div>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ff8b8b", fontSize: "var(--t-sm)", fontWeight: 600, marginTop: 14 }}>
            <Icon name="TriangleAlert" size={16} /> {error}
          </div>
        )}

        <Button full size="lg" icon="UserCheck" onClick={submit} disabled={busy} style={{ marginTop: 22 }}>
          {busy ? (mode === "login" ? "Entrando…" : "Creando tu cuenta…") : (mode === "login" ? "Entrar y unirme" : "Crear mi cuenta y unirme")}
        </Button>
        <button onClick={() => { setMode((m) => (m === "signup" ? "login" : "signup")); setError(null); setPass(""); setConfirm(""); }}
          style={{ width: "100%", marginTop: 14, fontSize: "var(--t-sm)", color: "var(--green)", fontWeight: 600 }}>
          {mode === "signup" ? "¿Ya tenés cuenta? Entrá y unite con ella" : "¿No tenés cuenta? Creá una nueva"}
        </button>
      </Card>
    </div>
  );
}
