"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { AvatarStack, Button, Card, CopyLink, EmptyState, Pill, Sparkline, StageBadge } from "@/components/ui";
import {
  assignFacilitatorToOrg, assignOrgAdmin, createOrg, deleteOrg, getAdmins, getCoordinatorsForOrg, getFacilitators,
  getOrgs, getTeams, inviteCoordinator, removeFacilitatorFromOrg, revokeInvitation, setOrgPlan, updateOrg,
} from "@/lib/repository";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/components/Toast";
import { overallOf, PLANS, planLimits, planOf, teamLiveStage, to5, type Facilitator, type Org, type PlanKey, type Team } from "@/lib/data";

/** Badge + (opcional) selector de plan de una cuenta. */
function PlanControl({ org, editable, onChanged }: { org: Org; editable?: boolean; onChanged?: () => void }) {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const plan = planOf(org.plan);
  const meta = PLANS[plan];
  if (!editable) return <Pill color={meta.color} bg={`color-mix(in srgb, ${meta.color} 16%, transparent)`} icon="CreditCard">{meta.label}</Pill>;
  const change = async (p: PlanKey) => {
    if (p === plan || busy) return;
    setBusy(true);
    const res = await setOrgPlan(org.id, p);
    setBusy(false);
    if (res.error) { show(res.error, "TriangleAlert"); return; }
    show(`Plan: ${PLANS[p].label}`, "Check"); onChanged?.();
  };
  return (
    <select value={plan} disabled={busy} onChange={(e) => change(e.target.value as PlanKey)}
      style={{ background: `color-mix(in srgb, ${meta.color} 12%, var(--card))`, border: `1px solid ${meta.color}`, color: meta.color, borderRadius: "var(--r-full)", padding: "3px 10px", fontSize: "var(--t-xs)", fontWeight: 700, outline: "none", cursor: "pointer" }}>
      {(Object.keys(PLANS) as PlanKey[]).map((k) => <option key={k} value={k} style={{ background: "var(--card)", color: "var(--ink-0)" }}>{PLANS[k].label}</option>)}
    </select>
  );
}

/* ── Tarjeta rica de equipo (vista del facilitador) ───────── */
function TeamRichCard({ team, onOpen }: { team: Team; onOpen: () => void }) {
  const lowSafety = team.psychSafety > 0 && team.psychSafety < 70;
  const isNew = team.sessions.length === 0 && team.pulse.length === 0;
  const pulseSeries = team.pulse.map(overallOf);
  const activeInits = (team.initiatives ?? []).filter((i) => i.status === "active");
  const focusInit = activeInits[0];
  return (
    <Card pad={18} hover style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <button onClick={onOpen} style={{ textAlign: "left", minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "var(--t-md)", letterSpacing: "-0.01em" }}>{team.name}</div>
          <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 2 }}>{team.area || "—"}</div>
        </button>
        <StageBadge stage={teamLiveStage(team) ?? "queue"} size="sm" />
      </div>

      {/* iniciativa activa */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--card-2)", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>
        <span style={{ color: focusInit ? "var(--st-proof)" : "var(--ink-3)", display: "inline-flex" }}><Icon name="Target" size={16} /></span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="muted" style={{ fontSize: "var(--t-xs)" }}>Iniciativa activa</div>
          <div style={{ fontSize: "var(--t-sm)", fontWeight: 600, color: focusInit ? "var(--ink-0)" : "var(--ink-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {focusInit?.title || "Sin iniciativas todavía"}
          </div>
        </div>
        {activeInits.length > 0 && (
          <div style={{ textAlign: "right", flex: "none" }}>
            <div className="num" style={{ fontSize: "var(--t-md)", fontWeight: 700, color: "var(--ink-0)" }}>{activeInits.length}</div>
            <div className="muted" style={{ fontSize: 10 }}>en curso</div>
          </div>
        )}
      </div>

      {/* métricas */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div>
            <div className="muted" style={{ fontSize: 10, marginBottom: 2 }}>Confianza</div>
            <span className="num" style={{ fontWeight: 700, fontSize: "var(--t-base)", color: team.psychSafety === 0 ? "var(--ink-3)" : lowSafety ? "var(--warning)" : "var(--success)" }}>
              {team.psychSafety === 0 ? "—" : `${to5(team.psychSafety).toFixed(1)}/5`}
            </span>
          </div>
          <div style={{ width: 1, height: 30, background: "var(--line)" }} />
          <div>
            <div className="muted" style={{ fontSize: 10, marginBottom: 2 }}>Sesiones</div>
            <span className="num" style={{ fontWeight: 700, fontSize: "var(--t-base)" }}>{team.sessions.length}</span>
          </div>
          {pulseSeries.length > 0 && (
            <>
              <div style={{ width: 1, height: 30, background: "var(--line)" }} />
              <div>
                <div className="muted" style={{ fontSize: 10, marginBottom: 4 }}>Pulso</div>
                <Sparkline data={pulseSeries} color={lowSafety ? "var(--warning)" : "var(--green)"} w={64} h={20} />
              </div>
            </>
          )}
        </div>
        {team.members.length > 0
          ? <AvatarStack people={team.members} max={4} size={28} />
          : <span className="muted" style={{ fontSize: "var(--t-xs)" }}>Sin integrantes</span>}
      </div>

      {isNew && (
        <div style={{ fontSize: "var(--t-xs)", color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="Sparkles" size={13} /> Equipo nuevo · arrancá creando su primera iniciativa
        </div>
      )}

      {/* acciones */}
      <div style={{ display: "flex", gap: 8, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
        <Button size="sm" variant="secondary" icon="LayoutDashboard" full onClick={onOpen}>Ver equipo</Button>
      </div>
    </Card>
  );
}

function OrgModal({ onClose, onSubmit, editing }: { onClose: () => void; onSubmit: (input: { name: string; sector: string; contract: string; status: "Activo" | "Piloto" }) => Promise<{ error?: string }>; editing?: Org }) {
  const [name, setName] = useState(editing?.name ?? "");
  const [sector, setSector] = useState(editing?.sector === "Sin definir" ? "" : editing?.sector ?? "");
  const [contract, setContract] = useState(editing?.contract ?? "6 meses");
  const [status, setStatus] = useState<"Activo" | "Piloto">(editing?.status ?? "Activo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = name.trim().length > 1;
  const field: React.CSSProperties = { width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none" };

  const create = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const res = await onSubmit({ name, sector, contract, status });
    setBusy(false);
    if (res.error) setError(res.error);
    else onClose();
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(7,11,22,0.7)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(460px,100%)", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", padding: 26, animation: "pop-in .25s var(--spring)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: "var(--r-md)", background: "var(--violet-soft)", color: "var(--violet)", display: "grid", placeItems: "center" }}><Icon name="Building2" size={20} /></div>
          <h3 style={{ fontSize: "var(--t-lg)", fontWeight: 700 }}>{editing ? "Editar organización" : "Nueva organización"}</h3>
        </div>
        <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 18 }}>{editing ? "Actualizá los datos de la organización." : "Cargá un cliente nuevo. Después podés asignarle facilitadores y equipos."}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Nombre</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Banco Andino" style={field} onKeyDown={(e) => e.key === "Enter" && create()} />
          </div>
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Sector</label>
            <input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Servicios financieros" style={field} />
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ flex: 1 }}>
              <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Contrato</label>
              <select value={contract} onChange={(e) => setContract(e.target.value)} style={field}>
                {["3 meses", "4 meses", "6 meses", "12 meses"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Estado</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as "Activo" | "Piloto")} style={field}>
                <option value="Activo">Activo</option>
                <option value="Piloto">Piloto</option>
              </select>
            </div>
          </div>
        </div>
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ff8b8b", fontSize: "var(--t-sm)", fontWeight: 600, marginTop: 14 }}>
            <Icon name="TriangleAlert" size={16} /> {error}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button icon="Check" disabled={!valid || busy} onClick={create}>{busy ? "Guardando…" : editing ? "Guardar cambios" : "Crear organización"}</Button>
        </div>
      </div>
    </div>
  );
}

/* ── Panel "Ver" de la organización (solo lectura) + coordinadores ── */
function OrgViewModal({ org, orgs, teams, facilitators, onClose, onOpenTeam, onChanged }: {
  org: Org; orgs: Org[]; teams: Team[]; facilitators: Facilitator[]; onClose: () => void; onOpenTeam: (id: string) => void; onChanged: () => void;
}) {
  const { show } = useToast();
  const { user } = useAuth();
  const isSuper = user?.role === "superadmin";
  const [coords, setCoords] = useState<{ token: string; email: string; name?: string; status: string }[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [assignId, setAssignId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const orgsOf = (f: Facilitator) => f.orgIds ?? (f.orgId ? [f.orgId] : []);
  const ots = teams.filter((t) => t.orgId === org.id);
  const ofacs = facilitators.filter((f) => orgsOf(f).includes(org.id));
  const assignable = facilitators.filter((f) => !orgsOf(f).includes(org.id));
  const orgNamesOf = (f: Facilitator) => orgsOf(f).map((id) => orgs.find((o) => o.id === id)?.name).filter(Boolean).join(", ");

  const [removingId, setRemovingId] = useState<string | null>(null);

  const assign = async () => {
    if (!assignId) return;
    setAssigning(true);
    const res = await assignFacilitatorToOrg(assignId, org.id);
    setAssigning(false);
    if (res.error) { show(res.error, "TriangleAlert"); return; }
    const f = facilitators.find((x) => x.id === assignId);
    setAssignId("");
    onChanged();
    show(`${f?.name ?? "Facilitador"} sumado a ${org.name}.`);
  };

  const removeFac = async (f: Facilitator) => {
    setRemovingId(f.id);
    const res = await removeFacilitatorFromOrg(f.id, org.id);
    setRemovingId(null);
    if (res.error) { show(res.error, "TriangleAlert"); return; }
    onChanged();
    show(`${f.name} quitado de ${org.name}.`);
  };

  useEffect(() => { getCoordinatorsForOrg(org.id).then(setCoords); }, [org.id]);

  const invite = async () => {
    if (!/\S+@\S+\.\S+/.test(email)) { setErr("Ingresá un email válido."); return; }
    setBusy(true);
    const res = await inviteCoordinator({ email, orgId: org.id, orgName: org.name });
    setBusy(false);
    if (res.error) { setErr(res.error); return; }
    setEmail("");
    setCoords(await getCoordinatorsForOrg(org.id));
    show("Invitación de coordinador creada.");
  };

  const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div><div className="muted" style={{ fontSize: "var(--t-xs)" }}>{label}</div><div className="num" style={{ fontWeight: 700, fontSize: "var(--t-md)" }}>{value}</div></div>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(7,11,22,0.7)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(560px,100%)", maxHeight: "88vh", overflowY: "auto", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", padding: 26, animation: "pop-in .25s var(--spring)" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div style={{ width: 44, height: 44, borderRadius: "var(--r-md)", background: "var(--violet-soft)", color: "var(--violet)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="Building2" size={22} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h3 style={{ fontSize: "var(--t-lg)", fontWeight: 800 }}>{org.name}</h3>
              <Pill color={org.status === "Activo" ? "var(--success)" : "var(--warning)"} bg={org.status === "Activo" ? "var(--success-bg)" : "var(--warning-bg)"}>{org.status}</Pill>
              <PlanControl org={org} editable={isSuper} onChanged={onChanged} />
            </div>
            <div className="muted" style={{ fontSize: "var(--t-sm)" }}>{org.sector}</div>
          </div>
          <button onClick={onClose} style={{ color: "var(--ink-2)" }}><Icon name="X" size={22} /></button>
        </div>

        {/* stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, padding: "14px 16px", background: "var(--card-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", marginBottom: 18 }}>
          <Stat label="Equipos" value={ots.length} />
          <Stat label="Facilitadores" value={ofacs.length} />
          <Stat label="Contrato" value={org.contract} />
          <Stat label="Desde" value={org.since} />
        </div>

        {/* equipos */}
        <div className="eyebrow" style={{ marginBottom: 8 }}>Equipos</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
          {ots.length === 0 && <div className="muted" style={{ fontSize: "var(--t-sm)" }}>Sin equipos todavía.</div>}
          {ots.map((t) => (
            <button key={t.id} onClick={() => onOpenTeam(t.id)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 10px", borderRadius: "var(--r-sm)", textAlign: "left", background: "var(--card)", border: "1px solid var(--line)" }}>
              <span style={{ fontSize: "var(--t-sm)", fontWeight: 600 }}>{t.name}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}><StageBadge stage={teamLiveStage(t) ?? "queue"} size="sm" /><span className="faint"><Icon name="ChevronRight" size={14} /></span></span>
            </button>
          ))}
        </div>

        {/* facilitadores */}
        <div className="eyebrow" style={{ marginBottom: 8 }}>Facilitadores</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {ofacs.length === 0 && <div className="muted" style={{ fontSize: "var(--t-sm)" }}>Sin facilitadores todavía.</div>}
          {ofacs.map((f) => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: "var(--r-sm)", background: "var(--card)", border: "1px solid var(--line)", fontSize: "var(--t-sm)" }}>
              <Icon name="UserCog" size={14} className="" style={{ color: "var(--info)" }} />
              <span style={{ fontWeight: 600 }}>{f.name}</span>
              <span className="muted" style={{ marginLeft: "auto", fontSize: "var(--t-xs)" }}>{f.email}</span>
              <button onClick={() => removeFac(f)} disabled={removingId === f.id} title={`Quitar de ${org.name}`}
                style={{ color: "var(--ink-3)", display: "inline-flex", flex: "none", marginLeft: 2 }}>
                <Icon name={removingId === f.id ? "Loader" : "X"} size={15} />
              </button>
            </div>
          ))}
        </div>

        {/* límite de facilitadores del plan */}
        {ofacs.length >= planLimits(org.plan).facilitators && (
          <div style={{ marginBottom: 18, padding: "11px 13px", borderRadius: "var(--r-md)", border: "1px solid color-mix(in srgb, var(--violet) 35%, var(--line))", background: "color-mix(in srgb, var(--violet) 7%, var(--card))", display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="Lock" size={16} style={{ color: "var(--violet)", flexShrink: 0 }} />
            <div style={{ fontSize: "var(--t-xs)", lineHeight: 1.45 }}>
              <b>El plan {PLANS[planOf(org.plan)].label} permite {planLimits(org.plan).facilitators === Infinity ? "facilitadores ilimitados" : `${planLimits(org.plan).facilitators} facilitador${planLimits(org.plan).facilitators === 1 ? "" : "es"}`}.</b> {isSuper ? "Pasá la cuenta a Business para sumar más." : "Pedile al admin que actualice el plan."}
            </div>
          </div>
        )}

        {/* asignar facilitador existente */}
        {assignable.length > 0 && ofacs.length < planLimits(org.plan).facilitators && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <select value={assignId} onChange={(e) => setAssignId(e.target.value)}
                style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: assignId ? "var(--ink-0)" : "var(--ink-3)", padding: "10px 12px", fontSize: "var(--t-sm)", outline: "none" }}>
                <option value="">Sumar un facilitador ya creado…</option>
                {assignable.map((f) => {
                  const cur = orgNamesOf(f);
                  return <option key={f.id} value={f.id}>{f.name}{cur ? ` — ya en ${cur}` : " — sin organización"}</option>;
                })}
              </select>
              <Button size="md" icon="UserPlus" variant="secondary" disabled={!assignId || assigning} onClick={assign}>{assigning ? "…" : "Sumar"}</Button>
            </div>
            <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
              <Icon name="Info" size={12} /> Se suma a {org.name} sin dejar sus otras organizaciones (un facilitador puede estar en varias).
            </div>
          </div>
        )}

        {/* coordinadores */}
        <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <Icon name="Telescope" size={13} style={{ color: "#06B6D4" }} /> Coordinadores (observadores)
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
          {coords.length === 0 && <div className="muted" style={{ fontSize: "var(--t-sm)" }}>Sin coordinadores. Invitá uno para que observe esta organización en vivo.</div>}
          {coords.map((c) => (
            <div key={c.token} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: "var(--t-sm)", fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.email}</span>
                {c.status === "accepted"
                  ? <Pill color="var(--success)" bg="var(--success-bg)" icon="Check">Activo</Pill>
                  : <Pill color="var(--warning)" bg="var(--warning-bg)" icon="Clock">Pendiente</Pill>}
                {c.status !== "accepted" && (
                  <button title="Revocar invitación" onClick={async () => { if (!window.confirm(`¿Revocar la invitación de ${c.email}?`)) return; const r = await revokeInvitation(c.token); if (r.error) { show(r.error, "TriangleAlert"); return; } setCoords(await getCoordinatorsForOrg(org.id)); show("Invitación revocada."); }}
                    style={{ color: "var(--ink-3)", display: "inline-flex", padding: 4 }}><Icon name="Trash2" size={14} /></button>
                )}
              </div>
              {c.status !== "accepted" && <CopyLink path={`/invite/${c.token}`} />}
            </div>
          ))}
        </div>

        {/* invitar coordinador */}
        <div style={{ display: "flex", gap: 8 }}>
          <input value={email} onChange={(e) => { setEmail(e.target.value); setErr(null); }} placeholder="coordinador@empresa.com"
            onKeyDown={(e) => e.key === "Enter" && invite()}
            style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid " + (err ? "rgba(239,68,68,0.5)" : "var(--line-2)"), borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "10px 12px", fontSize: "var(--t-sm)", outline: "none" }} />
          <Button size="md" icon="Telescope" variant="secondary" disabled={busy} onClick={invite}>{busy ? "…" : "Invitar coordinador"}</Button>
        </div>
        {err && <div style={{ color: "#ff8b8b", fontSize: "var(--t-xs)", fontWeight: 600, marginTop: 8 }}>{err}</div>}
      </div>
    </div>
  );
}

export default function OrganizacionesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { show } = useToast();
  const isFacil = user?.role === "facilitator";
  const isSuper = user?.role === "superadmin";
  const [orgs, setOrgs] = useState<Org[]>(() => getOrgs());
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Org | null>(null);
  const [viewing, setViewing] = useState<Org | null>(null);
  const teams = getTeams();
  const facilitators = getFacilitators();
  const admins = getAdmins().filter((a) => a.status === "active");
  // Equipos que facilita el usuario actual (para "Mis equipos" multi-org: no mostrar los de otros facilitadores de la misma org).
  const myFacIds = new Set(facilitators.filter((f) => (f.email ?? "").toLowerCase() === (user?.email ?? "").toLowerCase()).map((f) => f.id));
  const myTeams = isFacil ? teams.filter((t) => t.facilitatorId && myFacIds.has(t.facilitatorId)) : teams;

  const handleCreate = async (input: { name: string; sector: string; contract: string; status: "Activo" | "Piloto" }) => {
    const res = await createOrg(input);
    if (!res.error) {
      setOrgs(getOrgs());
      show(`Organización "${input.name.trim()}" creada.`);
    }
    return res;
  };

  const handleUpdate = async (id: string, input: { name: string; sector: string; contract: string; status: "Activo" | "Piloto" }) => {
    const res = await updateOrg(id, input);
    if (!res.error) {
      setOrgs(getOrgs());
      show("Organización actualizada.");
    }
    return res;
  };

  const handleDelete = async (o: Org) => {
    if (!window.confirm(`¿Eliminar la organización "${o.name}"? Esta acción es irreversible.`)) return;
    const res = await deleteOrg(o.id);
    if (res.error) { show(res.error, "TriangleAlert"); return; }
    setOrgs(getOrgs());
    show(`Organización "${o.name}" eliminada.`, "Trash2");
  };

  const handleAssign = async (orgId: string, adminEmail: string) => {
    const res = await assignOrgAdmin(orgId, adminEmail || null);
    if (!res.error) {
      setOrgs(getOrgs());
      show(adminEmail ? "Admin asignado a la organización." : "Organización sin admin asignado.");
    } else {
      show(res.error, "TriangleAlert");
    }
  };

  return (
    <div className="screen-pad">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>
            {isFacil ? "Mis equipos" : "Organizaciones"}
          </h1>
          <p className="muted" style={{ marginTop: 4 }}>
            {isFacil
              ? `${myTeams.length} ${myTeams.length === 1 ? "equipo" : "equipos"} · ${orgs.length} ${orgs.length === 1 ? "organización" : "organizaciones"}`
              : `${orgs.length} clientes · ${teams.length} equipos en acompañamiento`}
          </p>
        </div>
        {isFacil ? (
          <Button icon="Plus" onClick={() => router.push("/equipos/nuevo")}>Nuevo equipo</Button>
        ) : (
          <Button icon="Plus" onClick={() => setModal(true)}>Nueva organización</Button>
        )}
      </div>

      {/* ── Vista del FACILITADOR: agrupada por organización, tarjetas ricas ── */}
      {isFacil && (
        orgs.length === 0 ? (
          <Card pad={0}>
            <EmptyState icon="Building2" title="Todavía no tenés una organización"
              action={<Button icon="Plus" onClick={() => router.push("/equipos/nuevo")}>Nuevo equipo</Button>}>
              Pedile a tu admin que te asigne a una organización, o creá tu primer equipo.
            </EmptyState>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {orgs.map((o) => {
              const ots = myTeams.filter((t) => t.orgId === o.id);
              return (
                <section key={o.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "var(--r-md)", background: "var(--violet-soft)", color: "var(--violet)", display: "grid", placeItems: "center", flex: "none" }}>
                      <Icon name="Building2" size={20} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, letterSpacing: "-0.02em" }}>{o.name}</h2>
                        <Pill color={o.status === "Activo" ? "var(--success)" : "var(--warning)"} bg={o.status === "Activo" ? "var(--success-bg)" : "var(--warning-bg)"}>{o.status}</Pill>
                      </div>
                      <div className="muted" style={{ fontSize: "var(--t-sm)" }}>{o.sector} · {ots.length} {ots.length === 1 ? "equipo" : "equipos"}</div>
                    </div>
                  </div>
                  {ots.length === 0 ? (
                    <Card pad={0}>
                      <EmptyState icon="Users" title="Sin equipos en esta organización"
                        action={<Button icon="Plus" onClick={() => router.push("/equipos/nuevo")}>Crear equipo</Button>}>
                        Creá el primer equipo de {o.name} e invitá a sus integrantes.
                      </EmptyState>
                    </Card>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
                      {ots.map((t) => (
                        <TeamRichCard key={t.id} team={t}
                          onOpen={() => router.push(`/equipos/${t.id}`)} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )
      )}

      {/* ── Vista ADMIN / SUPERADMIN: tarjetas de organización ── */}
      {!isFacil && orgs.length === 0 && (
        <Card pad={0}>
          <EmptyState icon="Building2" title="Todavía no hay organizaciones"
            action={<Button icon="Plus" onClick={() => setModal(true)}>Nueva organización</Button>}>
            Cargá tu primera organización (cliente) para empezar.
          </EmptyState>
        </Card>
      )}

      {!isFacil && (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {orgs.map((o) => {
          const ots = teams.filter((t) => t.orgId === o.id);
          return (
            <Card key={o.id} pad={20} hover style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "var(--r-md)", background: "var(--violet-soft)", color: "var(--violet)", display: "grid", placeItems: "center", flex: "none" }}>
                    <Icon name="Building2" size={22} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "var(--t-md)", overflowWrap: "anywhere" }}>{o.name}</div>
                    <div className="muted" style={{ fontSize: "var(--t-sm)" }}>{o.sector}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 2, flex: "none" }}>
                    <button onClick={() => setViewing(o)} title="Ver organización"
                      style={{ color: "var(--ink-2)", padding: 6, borderRadius: "var(--r-sm)", display: "inline-flex" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--card-2)"; e.currentTarget.style.color = "var(--ink-0)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ink-2)"; }}>
                      <Icon name="Eye" size={15} />
                    </button>
                    <button onClick={() => setEditing(o)} title="Editar organización"
                      style={{ color: "var(--ink-2)", padding: 6, borderRadius: "var(--r-sm)", display: "inline-flex" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--card-2)"; e.currentTarget.style.color = "var(--ink-0)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ink-2)"; }}>
                      <Icon name="Pencil" size={15} />
                    </button>
                    <button onClick={() => handleDelete(o)} title="Eliminar organización"
                      style={{ color: "var(--ink-3)", padding: 6, borderRadius: "var(--r-sm)", display: "inline-flex" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--risk-bg)"; e.currentTarget.style.color = "var(--risk)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ink-3)"; }}>
                      <Icon name="Trash2" size={15} />
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <PlanControl org={o} />
                  <Pill color={o.status === "Activo" ? "var(--success)" : "var(--warning)"} bg={o.status === "Activo" ? "var(--success-bg)" : "var(--warning-bg)"}>{o.status}</Pill>
                </div>
              </div>

              <div style={{ display: "flex", gap: 18, fontSize: "var(--t-sm)", flexWrap: "wrap" }}>
                <div><span className="muted">Equipos</span> <span className="num" style={{ fontWeight: 700 }}>{o.teams}</span></div>
                <div><span className="muted">Facilitadores</span> <span className="num" style={{ fontWeight: 700 }}>{facilitators.filter((f) => (f.orgIds ?? (f.orgId ? [f.orgId] : [])).includes(o.id)).length}</span></div>
                <div><span className="muted">Contrato</span> <span style={{ fontWeight: 600 }}>{o.contract}</span></div>
                <div><span className="muted">Desde</span> <span style={{ fontWeight: 600 }}>{o.since}</span></div>
              </div>

              {ots.length > 0 && (
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  {ots.map((t) => (
                    <button
                      key={t.id} onClick={() => router.push(`/equipos/${t.id}`)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 10px", borderRadius: "var(--r-sm)", textAlign: "left", transition: "background .15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--card-2)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{ fontSize: "var(--t-sm)", fontWeight: 600 }}>{t.name}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <StageBadge stage={teamLiveStage(t) ?? "queue"} size="sm" />
                        <span className="faint"><Icon name="ChevronRight" size={15} /></span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {isSuper && (
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  <label className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                    <Icon name="ShieldCheck" size={13} /> Admin a cargo
                  </label>
                  <select
                    value={o.ownerEmail ?? ""}
                    onChange={(e) => handleAssign(o.id, e.target.value)}
                    style={{ width: "100%", background: "var(--card-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: o.ownerEmail ? "var(--ink-0)" : "var(--ink-2)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" }}
                  >
                    <option value="">— sin asignar —</option>
                    {admins.map((a) => <option key={a.id} value={a.email}>{a.name} ({a.email})</option>)}
                    {o.ownerEmail && !admins.some((a) => a.email === o.ownerEmail) && (
                      <option value={o.ownerEmail}>{o.ownerEmail}</option>
                    )}
                  </select>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      )}

      {(modal || editing) && (
        <OrgModal
          onClose={() => { setModal(false); setEditing(null); }}
          editing={editing ?? undefined}
          onSubmit={editing ? (input) => handleUpdate(editing.id, input) : handleCreate}
        />
      )}

      {viewing && (
        <OrgViewModal
          org={viewing} orgs={orgs} teams={teams} facilitators={facilitators}
          onClose={() => setViewing(null)}
          onOpenTeam={(id) => router.push(`/equipos/${id}`)}
          onChanged={() => setOrgs(getOrgs())}
        />
      )}
    </div>
  );
}
