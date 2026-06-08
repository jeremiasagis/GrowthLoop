"use client";

import { Icon } from "@/components/icon";
import { Avatar, Bar, Card, Pill, StageBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { getFacilitators, getTeam } from "@/lib/repository";
import { PULSE_DIMS } from "@/lib/data";

export default function MemberEquipo() {
  const { user } = useAuth();
  const team = getTeam(user?.teamId ?? "");
  if (!team) return <div className="screen-pad"><Card pad={24}><p className="muted">No estás asignado a un equipo todavía.</p></Card></div>;

  const lead = team.facilitatorId ? getFacilitators().find((f) => f.id === team.facilitatorId) : undefined;
  const lastPulse = team.pulse[team.pulse.length - 1];
  const first = team.pulse[0];
  const lowSafety = team.psychSafety > 0 && team.psychSafety < 70;

  return (
    <div className="screen-pad" style={{ maxWidth: 900 }}>
      <div className="muted" style={{ fontSize: "var(--t-xs)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{team.org}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
        <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>{team.name}</h1>
        <StageBadge stage={team.stage} />
      </div>
      {team.purpose && <p className="muted" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}><Icon name="Quote" size={15} /> {team.purpose}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 12, marginBottom: 22 }}>
        <Card pad={14}><div className="num" style={{ fontSize: "var(--t-xl)", fontWeight: 800 }}>{team.members.length}</div><div className="muted" style={{ fontSize: "var(--t-xs)" }}>Integrantes</div></Card>
        <Card pad={14}><div className="num" style={{ fontSize: "var(--t-xl)", fontWeight: 800 }}>{team.sessions.length}</div><div className="muted" style={{ fontSize: "var(--t-xs)" }}>Sesiones</div></Card>
        <Card pad={14}><div className="num" style={{ fontSize: "var(--t-xl)", fontWeight: 800, color: team.psychSafety === 0 ? "var(--ink-3)" : lowSafety ? "var(--warning)" : "var(--success)" }}>{team.psychSafety === 0 ? "—" : `${team.psychSafety}%`}</div><div className="muted" style={{ fontSize: "var(--t-xs)" }}>Seguridad ψ</div></Card>
      </div>

      <div className="team-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
          <Card pad={20}>
            <div style={{ fontWeight: 800, fontSize: "var(--t-md)", marginBottom: 14 }}>Pulso del equipo</div>
            {lastPulse ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {PULSE_DIMS.map((d) => { const delta = first ? lastPulse[d.key] - first[d.key] : 0; return (
                  <div key={d.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: "var(--t-sm)", fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: d.color }} />{d.label}</span>
                      <span className="num" style={{ fontWeight: 700, color: d.color }}>{lastPulse[d.key]}{delta !== 0 && <span style={{ color: delta > 0 ? "var(--success)" : "var(--risk)", marginLeft: 6, fontSize: "var(--t-xs)" }}>{delta > 0 ? "+" : ""}{delta}</span>}</span>
                    </div>
                    <Bar value={lastPulse[d.key]} color={d.color} />
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
