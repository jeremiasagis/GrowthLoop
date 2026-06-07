"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, CopyLink, Pill, SectionTitle } from "@/components/ui";
import { createTeam, getOrg } from "@/lib/repository";
import { useAuth } from "@/lib/auth/AuthContext";

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", background: "var(--card-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none" }} />
    </div>
  );
}

export default function NuevoEquipoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const myOrg = user?.orgId ? getOrg(user.orgId) : undefined;
  const orgId = user?.orgId ?? "";
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [purpose, setPurpose] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [emailErr, setEmailErr] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invites, setInvites] = useState<{ email: string; token: string }[] | null>(null);

  const valid = /\S+@\S+\.\S+/.test(emailDraft);
  const addEmail = () => {
    if (!valid) { setEmailErr(true); return; }
    const e = emailDraft.trim().toLowerCase();
    if (!emails.includes(e)) setEmails((l) => [...l, e]);
    setEmailDraft(""); setEmailErr(false);
  };
  const removeEmail = (e: string) => setEmails((l) => l.filter((x) => x !== e));

  const create = async () => {
    if (busy) return;
    setBusy(true);
    const res = await createTeam({ name, orgId, area, purpose, memberEmails: emails, facilitatorEmail: user?.email });
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    if (res.memberInvites && res.memberInvites.length) {
      setInvites(res.memberInvites);
    } else {
      setToast("Equipo creado.");
      setTimeout(() => router.push("/organizaciones"), 1200);
    }
  };

  const canCreate = name.trim().length > 1 && !!orgId && !busy;

  if (invites) {
    return (
      <div className="screen-pad" style={{ maxWidth: 620 }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ width: 60, height: 60, borderRadius: "var(--r-lg)", background: "var(--success-bg)", color: "var(--green)", display: "grid", placeItems: "center", margin: "0 auto 14px", animation: "pop-in .35s var(--spring)" }}>
            <Icon name="CircleCheck" size={30} />
          </div>
          <h1 style={{ fontSize: "var(--t-xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>¡Equipo creado!</h1>
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 6 }}>
            Compartile a cada integrante su link para que cree su cuenta y se una.
          </p>
        </div>
        <Card pad={18} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {invites.map((iv) => (
            <div key={iv.token}>
              <div style={{ fontSize: "var(--t-sm)", fontWeight: 600, marginBottom: 6 }}>{iv.email}</div>
              <CopyLink path={`/invite/${iv.token}`} />
            </div>
          ))}
        </Card>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <Button icon="ArrowRight" onClick={() => router.push("/organizaciones")}>Ir a Organizaciones</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-pad" style={{ maxWidth: 760 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "var(--t-sm)", marginBottom: 14 }}>
        <button onClick={() => router.push("/organizaciones")} className="muted">Organizaciones</button>
        <span className="faint"><Icon name="ChevronRight" size={13} /></span>
        <span style={{ fontWeight: 600 }}>Nuevo equipo</span>
      </div>

      <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Crear equipo</h1>
      <p className="muted" style={{ marginBottom: 22 }}>Cargá los datos básicos e invitá a los integrantes.</p>

      {/* datos básicos */}
      <Card pad={22} style={{ marginBottom: 18 }}>
        <SectionTitle icon="Users">Datos del equipo</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="modesel-grid">
            <Field label="Nombre del equipo" value={name} onChange={setName} placeholder="Operaciones Centro" />
            <div>
              <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Organización</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--card-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", padding: "11px 13px" }}>
                <Icon name="Building2" size={16} className="" style={{ color: "var(--violet)" }} />
                <span style={{ fontSize: "var(--t-base)", fontWeight: 600 }}>{myOrg?.name ?? "—"}</span>
              </div>
              {!orgId && (
                <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 6 }}>
                  No tenés una organización asignada. Pedile a tu admin que te invite.
                </div>
              )}
            </div>
          </div>
          <Field label="Área" value={area} onChange={setArea} placeholder="Operaciones" />
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Propósito del equipo</label>
            <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Para qué existe este equipo, en una frase…"
              style={{ width: "100%", minHeight: 64, background: "var(--card-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-sm)", resize: "vertical", outline: "none" }} />
          </div>
        </div>
      </Card>

      {/* invitar miembros */}
      <Card pad={22} style={{ marginBottom: 18 }}>
        <SectionTitle icon="UserPlus" sub="Les llega un acceso por invitación (no se registran solos)">Invitar miembros</SectionTitle>
        <div style={{ display: "flex", gap: 8, marginBottom: emails.length ? 16 : 0 }}>
          <input value={emailDraft} onChange={(e) => { setEmailDraft(e.target.value); setEmailErr(false); }}
            onKeyDown={(e) => e.key === "Enter" && addEmail()} placeholder="nombre@empresa.com"
            style={{ flex: 1, minWidth: 0, background: "var(--card-2)", border: "1px solid " + (emailErr ? "rgba(239,68,68,0.5)" : "var(--line-2)"), borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none" }} />
          <Button icon="Plus" variant="secondary" onClick={addEmail}>Agregar</Button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {emails.map((e) => (
            <div key={e} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "var(--card-2)", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>
              <span style={{ color: "var(--ink-2)", display: "inline-flex" }}><Icon name="Mail" size={15} /></span>
              <span style={{ flex: 1, minWidth: 0, fontSize: "var(--t-sm)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e}</span>
              <Pill color="var(--warning)" bg="var(--warning-bg)" icon="Clock">Invitación pendiente</Pill>
              <button onClick={() => removeEmail(e)} title="Quitar" style={{ color: "var(--ink-3)", display: "inline-flex", flex: "none" }}><Icon name="X" size={16} /></button>
            </div>
          ))}
        </div>
      </Card>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ff8b8b", fontSize: "var(--t-sm)", fontWeight: 600, marginBottom: 12, justifyContent: "flex-end" }}>
          <Icon name="TriangleAlert" size={16} /> {error}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button variant="ghost" onClick={() => router.push("/organizaciones")}>Cancelar</Button>
        <Button icon="Send" disabled={!canCreate} onClick={create}>{busy ? "Creando…" : "Crear equipo y enviar invitaciones"}</Button>
      </div>

      {/* toast */}
      {toast && (
        <div style={{ position: "fixed", left: "50%", bottom: 28, transform: "translateX(-50%)", zIndex: 100, display: "flex", alignItems: "center", gap: 10, padding: "13px 18px", background: "var(--elevated)", border: "1px solid color-mix(in srgb, var(--green) 40%, transparent)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-lg)", animation: "fade-up .25s var(--ease)" }}>
          <span style={{ color: "var(--green)", display: "inline-flex" }}><Icon name="CircleCheck" size={20} /></span>
          <span style={{ fontSize: "var(--t-sm)", fontWeight: 600 }}>{toast}</span>
        </div>
      )}
    </div>
  );
}
