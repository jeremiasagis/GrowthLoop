"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { Avatar, Button, Card, CopyLink, EmptyState, Pill } from "@/components/ui";
import { createAdmin, createInvitation, getAdmins } from "@/lib/repository";
import { useToast } from "@/components/Toast";
import type { Admin } from "@/lib/data";

function MiniStat({ value, label, border }: { value: React.ReactNode; label: string; border?: boolean }) {
  return (
    <div style={{ textAlign: "center", borderLeft: border ? "1px solid var(--line)" : "none" }}>
      <div className="num" style={{ fontSize: "var(--t-lg)", fontWeight: 700 }}>{value}</div>
      <div className="muted" style={{ fontSize: 10 }}>{label}</div>
    </div>
  );
}

function CreateAdminModal({ onClose, onCreate }: { onClose: () => void; onCreate: (v: { name: string; email: string }) => Promise<{ error?: string; token?: string }> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = name.trim().length > 1 && /\S+@\S+\.\S+/.test(email);

  const create = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const res = await onCreate({ name, email });
    setBusy(false);
    if (res.error) setError(res.error);
    else { setToken(res.token ?? null); setSent(true); }
  };

  const field: React.CSSProperties = { width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(7,11,22,0.7)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(480px,100%)", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", padding: 26, animation: "pop-in .25s var(--spring)" }}>
        {!sent ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 6 }}>
              <div style={{ width: 40, height: 40, borderRadius: "var(--r-md)", background: "var(--violet-soft)", color: "var(--violet)", display: "grid", placeItems: "center" }}><Icon name="ShieldPlus" size={20} /></div>
              <h3 style={{ fontSize: "var(--t-lg)", fontWeight: 700 }}>Crear admin</h3>
            </div>
            <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 18 }}>El admin crea y gestiona sus propias organizaciones, sus facilitadores y equipos. Recibe un link para crear su cuenta.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Nombre y apellido</label>
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Roberto Méndez" style={field} />
              </div>
              <div>
                <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Correo</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@empresa.com" style={field} />
              </div>
            </div>
            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ff8b8b", fontSize: "var(--t-sm)", fontWeight: 600, marginTop: 14 }}>
                <Icon name="TriangleAlert" size={16} /> {error}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button icon="Send" variant="violet" disabled={!valid || busy} onClick={create}>{busy ? "Creando…" : "Crear y enviar invitación"}</Button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: "var(--r-lg)", background: "var(--violet-soft)", color: "var(--violet)", display: "grid", placeItems: "center", margin: "0 auto 14px", animation: "pop-in .3s var(--spring)" }}><Icon name="MailCheck" size={28} /></div>
            <h3 style={{ fontSize: "var(--t-lg)", fontWeight: 700, marginBottom: 6 }}>Admin creado</h3>
            <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 16 }}>Compartile este link a <b style={{ color: "var(--ink-0)" }}>{email}</b> para que cree su cuenta. Después podrá crear sus organizaciones y facilitadores.</p>
            {token && <div style={{ marginBottom: 18 }}><CopyLink path={`/invite/${token}`} /></div>}
            <Button full icon="Check" onClick={onClose}>Listo</Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminsPage() {
  const { show } = useToast();
  const [list, setList] = useState<Admin[]>(() => getAdmins());
  const [open, setOpen] = useState(false);
  const active = list.filter((a) => a.status === "active");

  const handleCreate = async (input: { name: string; email: string }) => {
    const res = await createAdmin(input);
    if (!res.error) {
      setList(getAdmins());
      show(`Admin invitado: ${input.email}.`);
    }
    return res;
  };

  const copyLink = async (a: Admin) => {
    const inv = await createInvitation({ email: a.email, name: a.name, role: "admin" });
    if (inv.error || !inv.token) { show(inv.error ?? "No se pudo generar el link.", "TriangleAlert"); return; }
    try { await navigator.clipboard.writeText(`${window.location.origin}/invite/${inv.token}`); } catch { /* */ }
    show("Link de invitación copiado.");
  };

  return (
    <div className="screen-pad">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6, color: "var(--violet)" }}>Plataforma · superadmin</div>
          <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Admins</h1>
          <p className="muted" style={{ marginTop: 4 }}>{active.length} activos · cada admin gestiona su organización, sus facilitadores y equipos.</p>
        </div>
        <Button icon="ShieldPlus" variant="violet" onClick={() => setOpen(true)}>Crear admin</Button>
      </div>

      {list.length === 0 && (
        <Card pad={0}>
          <EmptyState icon="ShieldCheck" title="Todavía no hay admins"
            action={<Button icon="ShieldPlus" variant="violet" onClick={() => setOpen(true)}>Crear admin</Button>}>
            Creá un admin para que gestione una organización con sus facilitadores y equipos.
          </EmptyState>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {list.map((a, i) => {
          const invited = a.status === "invited";
          return (
            <Card key={a.id} pad={18} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar name={a.name} initials={a.initials} size={42} idx={i + 2} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "var(--t-md)" }}>{a.name}</div>
                  <div className="muted" style={{ fontSize: "var(--t-xs)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.email}</div>
                </div>
                {invited
                  ? <Pill color="var(--warning)" bg="var(--warning-bg)" icon="Clock">Invitación pendiente</Pill>
                  : <Pill color="var(--success)" bg="var(--success-bg)" icon="Check">Activo</Pill>}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "var(--card-2)", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>
                <span style={{ color: "var(--violet)", display: "inline-flex" }}><Icon name="Building2" size={16} /></span>
                <span style={{ fontSize: "var(--t-sm)", fontWeight: 600, color: a.orgName ? "var(--ink-0)" : "var(--ink-2)" }}>{a.orgName || "Gestiona sus propias organizaciones"}</span>
              </div>

              {!invited ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, background: "var(--card-2)", borderRadius: "var(--r-md)", padding: "12px 8px", border: "1px solid var(--line)" }}>
                  <MiniStat value={a.orgs} label="Organizaciones" />
                  <MiniStat value={a.facilitators} label="Facilitadores" border />
                </div>
              ) : (
                <div style={{ fontSize: "var(--t-sm)", color: "var(--ink-2)", background: "var(--warning-bg)", border: "1px solid color-mix(in srgb, var(--warning) 30%, transparent)", borderRadius: "var(--r-md)", padding: "11px 13px", display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="Mail" size={15} className="" style={{ color: "var(--warning)" }} /> Esperando que cree su cuenta
                </div>
              )}
              {invited && <Button size="sm" variant="secondary" icon="Copy" full onClick={() => copyLink(a)}>Copiar link de invitación</Button>}
            </Card>
          );
        })}
      </div>

      {open && <CreateAdminModal onClose={() => setOpen(false)} onCreate={handleCreate} />}
    </div>
  );
}
