"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Logo } from "@/components/AppShell";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";

function Field({ label, type = "text", value, onChange, placeholder, onEnter }: { label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; onEnter?: () => void }) {
  return (
    <div>
      <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        onKeyDown={(e) => e.key === "Enter" && onEnter && onEnter()}
        style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "12px 14px", fontSize: "var(--t-base)", outline: "none" }} />
    </div>
  );
}

function TypeCard({ icon, title, desc, selected, onClick }: { icon: string; title: string; desc: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ textAlign: "left", padding: 20, borderRadius: "var(--r-lg)", background: selected ? "var(--green-soft)" : "var(--card)", border: "1px solid " + (selected ? "var(--green)" : "var(--line-2)"), boxShadow: selected ? "var(--glow-soft)" : "none", transition: "all .18s var(--ease)", position: "relative", display: "flex", flexDirection: "column", gap: 12 }}>
      {selected && <span style={{ position: "absolute", top: 16, right: 16, color: "var(--green)" }}><Icon name="CheckCircle2" size={22} /></span>}
      <div style={{ width: 48, height: 48, borderRadius: "var(--r-md)", background: selected ? "var(--green)" : "var(--card-2)", color: selected ? "#06121f" : "var(--ink-1)", display: "grid", placeItems: "center", transition: "all .18s" }}>
        <Icon name={icon} size={24} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: "var(--t-md)", marginBottom: 5 }}>{title}</div>
        <div className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.5 }}>{desc}</div>
      </div>
    </button>
  );
}

export default function RegistroPage() {
  const router = useRouter();
  const { acceptInvite } = useAuth();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ name: "", email: "", pass: "", type: "", org: "", invites: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: string) => { setData((d) => ({ ...d, [k]: v })); setError(null); };
  const consultant = data.type === "consultant";

  const finish = async () => {
    setBusy(true);
    const res = await acceptInvite({
      email: data.email, password: data.pass, name: data.name,
      role: "admin", orgName: data.org,
    });
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    router.replace("/dashboard");
  };

  const stepValid = step === 0
    ? !!(data.name && /\S+@\S+\.\S+/.test(data.email) && data.pass.length >= 6)
    : step === 1 ? !!data.type : !!data.org;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "radial-gradient(1100px 520px at 50% -160px, rgba(124,58,237,0.12), transparent), var(--bg-1)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 28px" }}>
        <Logo />
        <button onClick={() => router.push("/dashboard")} style={{ color: "var(--ink-2)", fontSize: "var(--t-sm)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
          Ya tengo cuenta <Icon name="ArrowRight" size={15} />
        </button>
      </header>

      <main style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "24px 20px 80px" }}>
        <div style={{ width: "100%", maxWidth: step === 1 ? 720 : 460 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 26 }}>
            {["Cuenta", "Tipo", "Empezar"].map((l, i) => (
              <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 99, display: "grid", placeItems: "center", fontSize: "var(--t-xs)", fontWeight: 700, background: i < step ? "var(--green-soft)" : i === step ? "var(--green)" : "var(--card)", color: i === step ? "#06121f" : i < step ? "var(--green)" : "var(--ink-3)", border: "1px solid " + (i <= step ? "var(--green)" : "var(--line-2)") }}>
                    {i < step ? <Icon name="Check" size={14} /> : i + 1}
                  </span>
                  <span className="hide-sm" style={{ fontSize: "var(--t-xs)", fontWeight: 600, color: i === step ? "var(--ink-0)" : "var(--ink-3)" }}>{l}</span>
                </span>
                {i < 2 && <span style={{ width: 24, height: 2, background: i < step ? "var(--green)" : "var(--line)" }} />}
              </span>
            ))}
          </div>

          {step === 0 && (
            <Card pad={30} style={{ maxWidth: 460, margin: "0 auto" }}>
              <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>Creá tu cuenta</h1>
              <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 22 }}>Empezá a facilitar la mejora continua de tus equipos.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Field label="Nombre y apellido" value={data.name} onChange={(v) => set("name", v)} placeholder="Daniela Ríos" />
                <Field label="Correo de trabajo" type="email" value={data.email} onChange={(v) => set("email", v)} placeholder="daniela@empresa.com" />
                <Field label="Contraseña" type="password" value={data.pass} onChange={(v) => set("pass", v)} placeholder="Mínimo 6 caracteres" onEnter={() => stepValid && setStep(1)} />
              </div>
              <Button full icon="ArrowRight" disabled={!stepValid} onClick={() => setStep(1)} style={{ marginTop: 22 }}>Continuar</Button>
              <p className="faint" style={{ fontSize: "var(--t-xs)", textAlign: "center", marginTop: 14 }}>Al continuar aceptás los términos y la política de privacidad.</p>
            </Card>
          )}

          {step === 1 && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 22 }}>
                <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>¿Cómo vas a usar Growthloop?</h1>
                <p className="muted" style={{ marginTop: 6, fontSize: "var(--t-sm)" }}>Podés cambiarlo después. Esto solo ajusta tu primer paso.</p>
              </div>
              <div className="modesel-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <TypeCard icon="Briefcase" title="Soy consultor independiente"
                  desc="Gestiono múltiples clientes y facilito sus equipos directamente."
                  selected={data.type === "consultant"} onClick={() => set("type", "consultant")} />
                <TypeCard icon="Building2" title="Soy parte de una organización"
                  desc="Gestiono equipos internos y puedo asignar líderes como facilitadores."
                  selected={data.type === "internal"} onClick={() => set("type", "internal")} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
                <Button variant="ghost" icon="ArrowLeft" onClick={() => setStep(0)}>Atrás</Button>
                <Button iconRight="ArrowRight" disabled={!stepValid} onClick={() => setStep(2)}>Continuar</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <Card pad={30} style={{ maxWidth: 480, margin: "0 auto" }}>
              <div style={{ width: 48, height: 48, borderRadius: "var(--r-md)", background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center", marginBottom: 16 }}>
                <Icon name={consultant ? "Briefcase" : "Building2"} size={24} />
              </div>
              <h1 style={{ fontSize: "var(--t-xl)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>
                {consultant ? "Creá tu primera organización (cliente)" : "Configurá tu organización e invitá a tus líderes"}
              </h1>
              <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 22 }}>
                {consultant ? "Cada cliente es una organización con sus propios equipos y reportes." : "Vas a poder asignar líderes que faciliten sus propios equipos."}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Field label={consultant ? "Nombre del cliente" : "Nombre de tu organización"} value={data.org} onChange={(v) => set("org", v)} placeholder={consultant ? "Banco Andino" : "Mi empresa S.A."} onEnter={() => stepValid && finish()} />
                {!consultant && (
                  <div>
                    <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Invitar líderes <span className="faint" style={{ textTransform: "none", letterSpacing: 0 }}>(opcional)</span></label>
                    <textarea value={data.invites} onChange={(e) => set("invites", e.target.value)} placeholder="lider1@empresa.com, lider2@empresa.com"
                      style={{ width: "100%", minHeight: 70, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-sm)", resize: "vertical", outline: "none" }} />
                    <p className="faint" style={{ fontSize: "var(--t-xs)", marginTop: 6 }}>Les enviamos una invitación para que faciliten sus equipos.</p>
                  </div>
                )}
              </div>
              {error && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ff8b8b", fontSize: "var(--t-sm)", fontWeight: 600, marginTop: 16 }}>
                  <Icon name="TriangleAlert" size={16} /> {error}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
                <Button variant="ghost" icon="ArrowLeft" onClick={() => setStep(1)}>Atrás</Button>
                <Button icon="Sparkles" disabled={!stepValid || busy} onClick={finish}>{busy ? "Creando…" : "Entrar a Growthloop"}</Button>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
