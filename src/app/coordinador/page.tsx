"use client";

import { Icon } from "@/components/icon";
import { AvatarStack, Card, EmptyState, Pill, Sparkline, StageBadge, Stat } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { getFacilitators, getOrg, getTeams } from "@/lib/repository";
import type { Team } from "@/lib/data";

function avgPulse(t: Team): number | null {
  if (!t.pulse.length) return null;
  const p = t.pulse[t.pulse.length - 1];
  return Math.round((p.confianza + p.comunic + p.claridad + p.foco + p.seguridad) / 5);
}

function ReadTeamCard({ team }: { team: Team }) {
  const lowSafety = team.psychSafety > 0 && team.psychSafety < 70;
  const series = team.pulse.map((p) => Math.round((p.confianza + p.comunic + p.claridad + p.foco + p.seguridad) / 5));
  const focusInit = (team.initiatives ?? []).find((i) => i.status === "active");
  return (
    <Card pad={18} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "var(--t-md)" }}>{team.name}</div>
          <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 2 }}>{team.area || "—"}</div>
        </div>
        <StageBadge stage={team.stage} size="sm" />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--card-2)", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>
        <span style={{ color: focusInit ? "var(--st-proof)" : "var(--ink-3)", display: "inline-flex" }}><Icon name="Target" size={16} /></span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="muted" style={{ fontSize: "var(--t-xs)" }}>Iniciativa activa</div>
          <div style={{ fontSize: "var(--t-sm)", fontWeight: 600, color: focusInit ? "var(--ink-0)" : "var(--ink-3)" }}>{focusInit?.title || "Sin iniciativas todavía"}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div>
            <div className="muted" style={{ fontSize: 10, marginBottom: 2 }}>Seguridad ψ</div>
            <span className="num" style={{ fontWeight: 700, fontSize: "var(--t-base)", color: team.psychSafety === 0 ? "var(--ink-3)" : lowSafety ? "var(--warning)" : "var(--success)" }}>
              {team.psychSafety === 0 ? "—" : `${team.psychSafety}%`}
            </span>
          </div>
          {series.length > 0 && (
            <>
              <div style={{ width: 1, height: 30, background: "var(--line)" }} />
              <div>
                <div className="muted" style={{ fontSize: 10, marginBottom: 4 }}>Pulso</div>
                <Sparkline data={series} color={lowSafety ? "var(--warning)" : "var(--green)"} w={64} h={20} />
              </div>
            </>
          )}
        </div>
        {team.members.length > 0
          ? <AvatarStack people={team.members} max={4} size={28} />
          : <span className="muted" style={{ fontSize: "var(--t-xs)" }}>Sin integrantes</span>}
      </div>
    </Card>
  );
}

export default function CoordinadorPage() {
  const { user } = useAuth();
  const org = user?.orgId ? getOrg(user.orgId) : undefined;
  const teams = getTeams();
  const facilitators = getFacilitators().filter((f) => f.status === "active");
  const pulses = teams.map(avgPulse).filter((n): n is number => n != null);
  const orgPulse = pulses.length ? Math.round(pulses.reduce((a, b) => a + b, 0) / pulses.length) : null;
  const activeTeams = teams.filter((t) => t.stage !== "queue").length;

  if (!org) {
    return (
      <div className="screen-pad">
        <Card pad={0}>
          <EmptyState icon="Telescope" title="Sin organización asignada">
            Todavía no estás asignado a una organización. Pedile al admin que te invite como coordinador.
          </EmptyState>
        </Card>
      </div>
    );
  }

  return (
    <div className="screen-pad">
      <div className="eyebrow" style={{ marginBottom: 6, color: "#06B6D4" }}>Panel de coordinación · solo lectura</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
        <h1 style={{ fontSize: "var(--t-3xl)", fontWeight: 800, letterSpacing: "-0.03em" }}>{org.name}</h1>
        <Pill color={org.status === "Activo" ? "var(--success)" : "var(--warning)"} bg={org.status === "Activo" ? "var(--success-bg)" : "var(--warning-bg)"}>{org.status}</Pill>
        <span className="muted" style={{ fontSize: "var(--t-sm)" }}>{org.sector} · contrato {org.contract}</span>
      </div>

      {/* stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
        <Card pad={18}><Stat label="Equipos" value={teams.length} icon="Users" color="var(--green)" /></Card>
        <Card pad={18}><Stat label="Equipos en marcha" value={activeTeams} icon="Radio" color="var(--st-proof)" /></Card>
        <Card pad={18}><Stat label="Facilitadores" value={facilitators.length} icon="UserCog" color="var(--info)" /></Card>
        <Card pad={18}><Stat label="Pulso promedio" value={orgPulse != null ? orgPulse : "—"} unit={orgPulse != null ? "/100" : undefined} icon="Activity" color="#06B6D4" /></Card>
      </div>

      {/* equipos */}
      <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 14 }}>Equipos</h2>
      {teams.length === 0 ? (
        <Card pad={0}><EmptyState icon="Users" title="Sin equipos todavía">Cuando los facilitadores creen equipos en esta organización, los vas a ver acá.</EmptyState></Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14, marginBottom: 28 }}>
          {teams.map((t) => <ReadTeamCard key={t.id} team={t} />)}
        </div>
      )}

      {/* facilitadores */}
      <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, letterSpacing: "-0.02em", margin: "8px 0 14px" }}>Facilitadores</h2>
      {facilitators.length === 0 ? (
        <Card pad={0}><EmptyState icon="UserCog" title="Sin facilitadores todavía">El admin todavía no asignó facilitadores a esta organización.</EmptyState></Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {facilitators.map((f) => {
            const ft = teams.filter((t) => t.facilitatorId === f.id).length;
            return (
              <Card key={f.id} pad={16} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 99, background: "color-mix(in srgb, var(--info) 18%, var(--card))", border: "1px solid color-mix(in srgb, var(--info) 35%, transparent)", display: "grid", placeItems: "center", color: "var(--info)", fontWeight: 700, fontSize: "var(--t-sm)", flex: "none" }}>{f.initials}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: "var(--t-sm)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
                  <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{ft} {ft === 1 ? "equipo" : "equipos"}</div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
