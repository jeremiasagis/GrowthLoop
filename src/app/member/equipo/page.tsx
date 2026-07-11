"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { Avatar, Bar, Card, Pill, PulseRadar, StageBadge } from "@/components/ui";
import { getFacilitators, getMemberTeam } from "@/lib/repository";
import { useMemberTeam } from "@/lib/member/team";
import { useAuth } from "@/lib/auth/AuthContext";
import { getMyFootprint } from "@/lib/session";
import { myCommitments } from "@/lib/member/commitments";
import { PULSE_DIMS, dimVal, teamLiveStage, to5 } from "@/lib/data";

const FOOT_BADGES = [
  { key: "present", label: "Presente", icon: "UserCheck", test: (f: { sessions: number; contributions: number }) => f.sessions >= 1 },
  { key: "committed", label: "Comprometido/a", icon: "CalendarCheck", test: (f: { sessions: number; contributions: number }) => f.sessions >= 5 },
  { key: "voice", label: "Voz activa", icon: "MessageSquare", test: (f: { sessions: number; contributions: number }) => f.contributions >= 10 },
  { key: "generous", label: "Generoso/a", icon: "Sparkles", test: (f: { sessions: number; contributions: number }) => f.contributions >= 25 },
];

export default function MemberEquipo() {
  const { teamId } = useMemberTeam();
  const { user } = useAuth();
  const team = getMemberTeam(teamId);
  const [foot, setFoot] = useState<{ sessions: number; contributions: number } | null>(null);
  useEffect(() => { getMyFootprint().then(setFoot); }, []);
  if (!team) return <div className="screen-pad"><Card pad={24}><p className="muted">No estás asignado a un equipo todavía.</p></Card></div>;

  const myDone = myCommitments(team.initiatives ?? [], user ? { id: user.id, name: user.name } : undefined, team.members).filter((c) => c.status === "done").length;

  const lead = team.facilitatorId ? getFacilitators().find((f) => f.id === team.facilitatorId) : undefined;
  const lastPulse = team.pulse[team.pulse.length - 1];
  const first = team.pulse[0];
  const lowSafety = team.psychSafety > 0 && team.psychSafety < 70;

  return (
    <div className="screen-pad" style={{ maxWidth: 900 }}>
      <div className="muted" style={{ fontSize: "var(--t-xs)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{team.org}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
        <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>{team.name}</h1>
        <StageBadge stage={teamLiveStage(team) ?? "queue"} />
      </div>
      {team.purpose && <p className="muted" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}><Icon name="Quote" size={15} /> {team.purpose}</p>}

      {team.data?.objective && (
        <Card pad={18} style={{ marginBottom: 18, borderColor: "color-mix(in srgb, var(--green) 35%, var(--line))", background: "linear-gradient(180deg, rgba(0,232,122,0.05), var(--card))" }}>
          <div className="eyebrow" style={{ color: "var(--green)", display: "flex", alignItems: "center", gap: 6 }}><Icon name="Compass" size={14} /> Objetivo del equipo{team.data.objective.horizon ? ` · ${team.data.objective.horizon}` : ""}</div>
          <p style={{ fontSize: "var(--t-md)", fontWeight: 700, lineHeight: 1.4, marginTop: 8 }}>{team.data.objective.text}</p>
          {(team.data.objective.metric || team.data.objective.target) && <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 6 }}>Señal: {team.data.objective.metric || "—"}{team.data.objective.target ? ` · meta ${team.data.objective.target}` : ""}</p>}
        </Card>
      )}

      {/* Tu huella en el equipo (personal, sin comparar con nadie) */}
      <Card pad={18} style={{ marginBottom: 18, background: "linear-gradient(180deg, color-mix(in srgb, var(--green) 7%, var(--card)), var(--card))", borderColor: "color-mix(in srgb, var(--green) 28%, var(--line))" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 38, height: 38, borderRadius: 99, background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center", flexShrink: 0 }}><Icon name="Footprints" size={19} /></span>
            <div>
              <div className="eyebrow" style={{ color: "var(--green)" }}>Tu huella</div>
              <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>Tu aporte al equipo</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 22 }}>
            <div><div className="num" style={{ fontSize: "var(--t-xl)", fontWeight: 800 }}>{foot?.sessions ?? "—"}</div><div className="muted" style={{ fontSize: "var(--t-xs)" }}>sesiones</div></div>
            <div><div className="num" style={{ fontSize: "var(--t-xl)", fontWeight: 800 }}>{foot?.contributions ?? "—"}</div><div className="muted" style={{ fontSize: "var(--t-xs)" }}>aportes</div></div>
            <div><div className="num" style={{ fontSize: "var(--t-xl)", fontWeight: 800, color: myDone > 0 ? "var(--green)" : "var(--ink-0)" }}>{myDone}</div><div className="muted" style={{ fontSize: "var(--t-xs)" }}>compromisos cumplidos</div></div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginLeft: "auto" }}>
            {foot && FOOT_BADGES.filter((b) => b.test(foot)).map((b) => (
              <span key={b.key} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 9px", borderRadius: "var(--r-full)", fontSize: "var(--t-xs)", fontWeight: 600, background: "var(--success-bg)", border: "1px solid color-mix(in srgb, var(--green) 40%, transparent)", color: "var(--green)" }}><Icon name={b.icon} size={12} />{b.label}</span>
            ))}
            {foot && !FOOT_BADGES.some((b) => b.test(foot)) && <span className="muted" style={{ fontSize: "var(--t-xs)", fontStyle: "italic" }}>Sumá tu primera sesión para empezar tu huella 🌱</span>}
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 12, marginBottom: 22 }}>
        <Card pad={14}><div className="num" style={{ fontSize: "var(--t-xl)", fontWeight: 800 }}>{team.members.length}</div><div className="muted" style={{ fontSize: "var(--t-xs)" }}>Integrantes</div></Card>
        <Card pad={14}><div className="num" style={{ fontSize: "var(--t-xl)", fontWeight: 800 }}>{team.sessions.length}</div><div className="muted" style={{ fontSize: "var(--t-xs)" }}>Sesiones</div></Card>
        <Card pad={14}><div className="num" style={{ fontSize: "var(--t-xl)", fontWeight: 800, color: team.psychSafety === 0 ? "var(--ink-3)" : lowSafety ? "var(--warning)" : "var(--success)" }}>{team.psychSafety === 0 ? "—" : `${to5(team.psychSafety).toFixed(1)}/5`}</div><div className="muted" style={{ fontSize: "var(--t-xs)" }}>Confianza</div></Card>
      </div>

      <div className="team-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
          <Card pad={20}>
            <div style={{ fontWeight: 800, fontSize: "var(--t-md)", marginBottom: 14 }}>Pulso del equipo</div>
            {lastPulse ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <PulseRadar values={lastPulse.dims ?? {}} size={300} />
                {PULSE_DIMS.map((d) => { const v = dimVal(lastPulse, d.key); if (v == null) return null; const f = first ? dimVal(first, d.key) : undefined; const delta = f != null ? to5(v) - to5(f) : 0; return (
                  <div key={d.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: "var(--t-sm)", fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: d.color }} />{d.label}</span>
                      <span className="num" style={{ fontWeight: 700, color: d.color }}>{to5(v).toFixed(1)}{delta !== 0 && <span style={{ color: delta > 0 ? "var(--success)" : "var(--risk)", marginLeft: 6, fontSize: "var(--t-xs)" }}>{delta > 0 ? "+" : ""}{delta.toFixed(1)}</span>}</span>
                    </div>
                    <Bar value={v} color={d.color} />
                  </div>
                ); })}
              </div>
            ) : <p className="muted" style={{ fontSize: "var(--t-sm)" }}>Todavía sin datos de pulso. Aparecen con la primera sesión del equipo.</p>}
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Card pad={20}>
            <div style={{ fontWeight: 800, fontSize: "var(--t-md)", marginBottom: 12 }}>Facilitador</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar name={lead?.name} initials={lead?.initials} size={38} idx={2} />
              <div><div style={{ fontWeight: 600, fontSize: "var(--t-sm)" }}>{lead?.name ?? "Sin asignar"}</div><div className="muted" style={{ fontSize: "var(--t-xs)" }}>Acompaña al equipo</div></div>
            </div>
          </Card>
          <Card pad={20}>
            <div style={{ fontWeight: 800, fontSize: "var(--t-md)", marginBottom: 12 }}>Integrantes</div>
            {team.members.length === 0 ? <p className="muted" style={{ fontSize: "var(--t-sm)" }}>Sin otros integrantes.</p> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {team.members.map((m, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}><Avatar name={m.name} initials={m.initials} size={30} idx={i} /><span style={{ fontSize: "var(--t-sm)", fontWeight: 600 }}>{m.name}</span></div>)}
              </div>
            )}
          </Card>
          <Card pad={16}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--t-sm)" }}><Icon name="Building2" size={15} style={{ color: "var(--violet)" }} /><span className="muted">Sector:</span> <b>{team.area || "—"}</b></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--t-sm)", marginTop: 8 }}><Pill color="var(--ink-2)">{team.clientType}</Pill></div>
          </Card>
        </div>
      </div>
    </div>
  );
}
