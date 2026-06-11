"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Avatar, Button, Card, CopyLink, EmptyState, Pill, StageBadge } from "@/components/ui";
import { createInvitation, deleteFacilitator, getFacilitators, getOrg, getOrgs, getTeams, inviteFacilitator } from "@/lib/repository";
import { useToast } from "@/components/Toast";
import { teamLiveStage, type Facilitator } from "@/lib/data";

function MiniStat({ value, label, color, border }: { value: React.ReactNode; label: string; color?: string; border?: boolean }) {
  return (
    <div style={{ textAlign: "center", borderLeft: border ? "1px solid var(--line)" : "none" }}>
      <div className="num" style={{ fontSize: "var(--t-lg)", fontWeight: 700, color: color || "var(--ink-0)" }}>{value}</div>
      <div className="muted" style={{ fontSize: 10 }}>{label}</div>
    </div>
  );
}

function InviteModal({ onClose, onInvite }: { onClose: () => void; onInvite: (email: string, orgId: string) => Promise<{ error?: string; token?: string }> }) {
  const orgs = getOrgs();
  const [email, setEmail] = useState("");
  const [orgId, setOrgId] = useState(orgs[0]?.id ?? "");
  const [sent, setSent] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = /\S+@\S+\.\S+/.test(email) && !!orgId;

  const send = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const res = await onInvite(email, orgId);
    setBusy(false);
    if (res.error) setError(res.error);
    else { setToken(res.token ?? null); setSent(true); }
  };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(7,11,22,0.7)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(460px,100%)", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", padding: 26, animation: "pop-in .25s var(--spring)" }}>
        {!sent ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 6 }}>
              <div style={{ width: 40, height: 40, borderRadius: "var(--r-md)", background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center" }}><Icon name="UserPlus" size={20} /></div>
              <h3 style={{ fontSize: "var(--t-lg)", fontWeight: 700 }}>Invitar facilitador</h3>
            </div>
            <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 18 }}>Generás un link de invitación para que el facilitador cree su cuenta y quede vinculado a tu organización.</p>
            <label className="eyebrow" style={{ display: "block", marginBottom: 8 }}>Correo</label>
            <input
              autoFocus value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} placeholder="nombre@empresa.com"
              onKeyDown={(e) => e.key === "Enter" && send()}
              style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none", marginBottom: 18 }}
            />
            <label className="eyebrow" style={{ display: "block", marginBottom: 8 }}>Organización</label>
            {orgs.length === 0 ? (
              <div className="muted" style={{ fontSize: "var(--t-sm)", padding: "11px 13px", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", marginBottom: 22 }}>
                No tenés organizaciones. Creá una primero en <b style={{ color: "var(--ink-1)" }}>Organizaciones</b>.
              </div>
            ) : (
              <select value={orgId} onChange={(e) => setOrgId(e.target.value)}
                style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none", marginBottom: 22 }}>
                {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            )}
            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ff8b8b", fontSize: "var(--t-sm)", fontWeight: 600, marginBottom: 14 }}>
                <Icon name="TriangleAlert" size={16} /> {error}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button icon="Send" disabled={!valid || busy} onClick={send}>{busy ? "Creando…" : "Crear invitación"}</Button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: "var(--r-lg)", background: "var(--success-bg)", color: "var(--green)", display: "grid", placeItems: "center", margin: "0 auto 14px", animation: "pop-in .3s var(--spring)" }}><Icon name="MailCheck" size={28} /></div>
            <h3 style={{ fontSize: "var(--t-lg)", fontWeight: 700, marginBottom: 6 }}>Invitación creada</h3>
            <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 16 }}>Compartile este link a <b style={{ color: "var(--ink-0)" }}>{email}</b> para que cree su cuenta y se una.</p>
            {token && <div style={{ marginBottom: 18 }}><CopyLink path={`/invite/${token}`} /></div>}
            <Button full icon="Check" onClick={onClose}>Listo</Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FacilitadoresPage() {
  const router = useRouter();
  const { show } = useToast();
  const [list, setList] = useState<Facilitator[]>(() => getFacilitators().map((f) => ({ ...f })));
  const [invite, setInvite] = useState(false);

  const allTeams = getTeams();
  const fTeams = (f: Facilitator) => allTeams.filter((t) => t.facilitatorId === f.id);
  const teamCount = (f: Facilitator) => fTeams(f).length;
  const active = list.filter((f) => f.status === "active");
  const totalTeams = active.reduce((a, f) => a + teamCount(f), 0);
  const withHealth = active.filter((f) => f.health != null);
  const avgHealth = withHealth.length ? Math.round(withHealth.reduce((a, f) => a + (f.health ?? 0), 0) / withHealth.length) : 0;

  const [del, setDel] = useState<Facilitator | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const doDelete = async () => {
    if (!del) return;
    setDelBusy(true);
    const res = await deleteFacilitator(del.id);
    setDelBusy(false);
    if (res.error) { show(res.error, "TriangleAlert"); return; }
    setList(getFacilitators());
    show(`Facilitador eliminado: ${del.name}.`, "Trash2");
    setDel(null);
  };

  const handleInvite = async (email: string, orgId: string) => {
    const res = await inviteFacilitator({ email, orgId, orgName: getOrg(orgId)?.name });
    if (!res.error) {
      setList(getFacilitators());
      show(`Invitación creada para ${email}.`);
    }
    return res;
  };

  const copyLink = async (f: Facilitator) => {
    const inv = await createInvitation({ email: f.email, name: f.name, role: "facilitator", orgId: f.orgId, orgName: f.orgId ? getOrg(f.orgId)?.name : undefined });
    if (inv.error || !inv.token) { show(inv.error ?? "No se pudo generar el link.", "TriangleAlert"); return; }
    try { await navigator.clipboard.writeText(`${window.location.origin}/invite/${inv.token}`); } catch { /* */ }
    show("Link de invitación copiado.");
  };

  return (
    <div className="screen-pad">
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "var(--t-sm)", marginBottom: 14 }}>
        <button onClick={() => router.push("/dashboard")} className="muted">Mi organización</button>
        <span className="faint"><Icon name="ChevronRight" size={13} /></span>
        <span style={{ fontWeight: 600 }}>Facilitadores</span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Facilitadores</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            {active.length} activos · {totalTeams} equipos · salud promedio{" "}
            <b className="num" style={{ color: avgHealth < 70 ? "var(--warning)" : "var(--success)" }}>{avgHealth}%</b>
          </p>
        </div>
        <Button icon="UserPlus" onClick={() => setInvite(true)}>Invitar facilitador</Button>
      </div>

      {list.length === 0 && (
        <Card pad={0}>
          <EmptyState icon="UsersRound" title="Todavía no hay facilitadores"
            action={<Button icon="UserPlus" onClick={() => setInvite(true)}>Invitar facilitador</Button>}>
            Invitá facilitadores para que acompañen a tus equipos. Reciben un link para crear su cuenta.
          </EmptyState>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {list.map((f, i) => {
          const invited = f.status === "invited", inactive = f.status === "inactive";
          return (
            <Card key={f.id} pad={18} style={{ display: "flex", flexDirection: "column", gap: 14, opacity: inactive ? 0.6 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar name={f.name} initials={f.initials} size={42} idx={i} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "var(--t-md)", display: "flex", alignItems: "center", gap: 7 }}>
                    {f.name}{f.you && <Pill color="var(--green)" bg="var(--success-bg)">vos</Pill>}
                  </div>
                  <div className="muted" style={{ fontSize: "var(--t-xs)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.email}</div>
                </div>
                {invited ? <Pill color="var(--warning)" bg="var(--warning-bg)" icon="Clock">Invitación pendiente</Pill> :
                  inactive ? <Pill color="var(--ink-2)" icon="UserMinus">Inactivo</Pill> :
                    <Pill color="var(--success)" bg="var(--success-bg)" icon="Check">Activo</Pill>}
              </div>

              {(() => {
                const fOrgs = f.orgIds?.length ? f.orgIds : (f.orgId ? [f.orgId] : []);
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: "var(--card-2)", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>
                    <span style={{ color: fOrgs.length ? "var(--violet)" : "var(--ink-3)", display: "inline-flex", flex: "none" }}><Icon name="Building2" size={15} /></span>
                    {fOrgs.length === 0 ? (
                      <span style={{ fontSize: "var(--t-sm)", fontWeight: 600, color: "var(--ink-3)" }}>Sin organización</span>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, minWidth: 0 }}>
                        {fOrgs.map((id) => (
                          <span key={id} style={{ fontSize: "var(--t-xs)", fontWeight: 600, padding: "2px 9px", borderRadius: "var(--r-full)", background: "var(--violet-soft)", color: "var(--violet)" }}>
                            {getOrg(id)?.name ?? "Organización"}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {!invited ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, background: "var(--card-2)", borderRadius: "var(--r-md)", padding: "12px 8px", border: "1px solid var(--line)" }}>
                  <MiniStat value={teamCount(f)} label="Equipos" />
                  <MiniStat value={f.sessionsMonth} label="Sesiones/mes" border />
                  <MiniStat value={f.health != null ? f.health + "%" : "—"} label="Salud prom." color={f.health != null && f.health < 70 ? "var(--warning)" : "var(--success)"} border />
                </div>
              ) : (
                <div style={{ fontSize: "var(--t-sm)", color: "var(--ink-2)", background: "var(--warning-bg)", border: "1px solid color-mix(in srgb, var(--warning) 30%, transparent)", borderRadius: "var(--r-md)", padding: "11px 13px", display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="Mail" size={15} style={{ color: "var(--warning)" }} /> Invitación enviada · esperando registro
                </div>
              )}

              {/* Equipos del facilitador (acceso directo) */}
              {!invited && (
                fTeams(f).length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {fTeams(f).map((t) => (
                      <button key={t.id} onClick={() => router.push(`/equipos/${t.id}`)}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 10px", borderRadius: "var(--r-sm)", textAlign: "left", background: "var(--card-2)", border: "1px solid var(--line)", transition: "border-color .15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--line-2)")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line)")}>
                        <span style={{ fontSize: "var(--t-sm)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}><StageBadge stage={teamLiveStage(t) ?? "queue"} size="sm" /><span className="faint"><Icon name="ChevronRight" size={15} /></span></span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="muted" style={{ fontSize: "var(--t-xs)" }}>Sin equipos asignados todavía.</div>
                )
              )}

              <div style={{ display: "flex", gap: 8 }}>
                {invited && <Button size="sm" variant="secondary" icon="Copy" full={f.you} onClick={() => copyLink(f)}>Copiar link de invitación</Button>}
                {!f.you ? (
                  <Button size="sm" variant="ghost" icon="Trash2" full={!invited} onClick={() => setDel(f)} style={{ color: "var(--risk)" }}>Eliminar</Button>
                ) : (
                  <span className="muted" style={{ fontSize: "var(--t-xs)", padding: "4px 0" }}>Esta es tu cuenta</span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {invite && <InviteModal onClose={() => setInvite(false)} onInvite={handleInvite} />}

      {del && (
        <div onClick={() => !delBusy && setDel(null)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(7,11,22,0.7)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(440px,100%)", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", padding: 26, animation: "pop-in .25s var(--spring)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: "var(--r-md)", background: "var(--risk-bg)", color: "var(--risk)", display: "grid", placeItems: "center" }}><Icon name="Trash2" size={20} /></div>
              <h3 style={{ fontSize: "var(--t-lg)", fontWeight: 700 }}>Eliminar facilitador</h3>
            </div>
            <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.55, marginBottom: 20 }}>
              Vas a eliminar a <b style={{ color: "var(--ink-0)" }}>{del.name}</b> y pierde el acceso.
              {teamCount(del) > 0 && <> Sus <b style={{ color: "var(--ink-0)" }}>{teamCount(del)} {teamCount(del) === 1 ? "equipo queda" : "equipos quedan"} sin facilitador</b> (no se borran; podés reasignarlos).</>}
              {" "}Esta acción no se puede deshacer.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button variant="ghost" disabled={delBusy} onClick={() => setDel(null)}>Cancelar</Button>
              <Button icon="Trash2" disabled={delBusy} onClick={doDelete} style={{ background: "var(--risk)", borderColor: "var(--risk)" }}>{delBusy ? "Eliminando…" : "Eliminar facilitador"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
