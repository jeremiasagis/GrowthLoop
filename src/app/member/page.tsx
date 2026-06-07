"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { AvatarStack, Bar, Button, Card, Pill, StageBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { getFacilitators, getInitiatives, getReflections, getTeam } from "@/lib/repository";
import { getOpenSessionForTeam, subscribeTeamSessions, type LiveSession } from "@/lib/session";
import { CYCLE_STAGES, PULSE_DIMS, STAGES, type Initiative } from "@/lib/data";

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es", { day: "2-digit", month: "short" });
}

function MiniCycle({ init }: { init: Initiative }) {
  const done = init.status === "done";
  const curIdx = Math.max(0, CYCLE_STAGES.indexOf(init.stage));
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {CYCLE_STAGES.map((st, idx) => {
        const meta = STAGES[st];
        const current = idx === curIdx && !done;
        const past = idx < curIdx || done;
        return (
          <span key={st} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: "var(--r-full)", fontSize: "var(--t-xs)", fontWeight: 600, whiteSpace: "nowrap", color: current ? "#06140d" : past ? meta.color : "var(--ink-3)", background: current ? meta.color : past ? `color-mix(in srgb, ${meta.color} 16%, transparent)` : "var(--card-2)", border: `1px solid ${current || past ? `color-mix(in srgb, ${meta.color} 45%, transparent)` : "var(--line)"}` }}>
            <span style={{ fontWeight: 800 }}>{meta.n}</span>{meta.label}
          </span>
        );
      })}
    </div>
  );
}

export default function MemberHome() {
  const router = useRouter();
  const { user } = useAuth();
  const team = getTeam(user?.teamId ?? "");
  const reflections = getReflections().slice(0, 3);
  const [live, setLive] = useState<LiveSession | null>(null);
  const [filter, setFilter] = useState<Initiative["status"]>("active");

  useEffect(() => {
    if (!user?.teamId) return;
    let active = true;
    const load = async () => { const s = await getOpenSessionForTeam(user.teamId!); if (active) setLive(s); };
    load();
    const unsub = subscribeTeamSessions(user.teamId, load);
    return () => { active = false; unsub(); };
  }, [user?.teamId]);

  if (!team) {
    return <Card pad={24}><p className="muted">Todavía no estás asignado a un equipo. Pedile a tu facilitador que te invite.</p></Card>;
  }

  const lead = team.facilitatorId ? getFacilitators().find((f) => f.id === team.facilitatorId) : undefined;
  const inits = getInitiatives(team.id);
  const counts = {
    active: inits.filter((i) => i.status === "active").length,
    paused: inits.filter((i) => i.status === "paused").length,
    done: inits.filter((i) => i.status === "done").length,
  };
  const shown = inits.filter((i) => i.status === filter);
  const liveInit = live ? inits.find((i) => i.id === live.initiativeId) : undefined;
  const st = STAGES[team.stage];
  const lastPulse = team.pulse[team.pulse.length - 1];
  const overall = lastPulse ? Math.round((lastPulse.confianza + lastPulse.comunic + lastPulse.claridad + lastPulse.foco + lastPulse.seguridad) / 5) : 0;
  const lowSafety = team.psychSafety > 0 && team.psychSafety < 70;
  const FILTERS: { key: Initiative["status"]; label: string }[] = [
    { key: "active", label: "En curso" }, { key: "paused", label: "Pausadas" }, { key: "done", label: "Cerradas" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* sesión en vivo */}
      {live && (
        <Card glow pad={18} style={{ background: "linear-gradient(180deg, rgba(0,232,122,0.12), var(--card))", borderColor: "color-mix(in srgb, var(--green) 45%, transparent)", animation: "glow-pulse 2s infinite" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 99, background: "var(--green)", boxShadow: "0 0 8px var(--green)", animation: "glow-pulse 1.2s infinite" }} />
            <span style={{ fontWeight: 800, fontSize: "var(--t-md)" }}>Sesión en vivo ahora</span>
          </div>
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 14 }}>{liveInit ? <>Sobre <b style={{ color: "var(--ink-1)" }}>{liveInit.title}</b>. </> : null}Tu facilitador abrió una sesión. Entrá a participar.</p>
          <Button full size="lg" iconRight="ArrowRight" onClick={() => router.push(`/sala/${live.id}`)}>Unirse a la sesión</Button>
        </Card>
      )}

      {/* tu equipo */}
      <Card pad={20} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div className="muted" style={{ fontSize: "var(--t-xs)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{team.org}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: "var(--t-xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>{team.name}</h1>
              <StageBadge stage={team.stage} size="sm" />
            </div>
            {team.purpose && <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}><Icon name="Quote" size={14} /> {team.purpose}</p>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: "var(--t-sm)", padding: "5px 10px", borderRadius: "var(--r-full)", background: "var(--card-2)", border: "1px solid var(--line)" }}>
            <Icon name="UserCog" size={14} style={{ color: "var(--info)" }} /><span className="muted">Facilitador:</span> <b>{lead?.name ?? "Sin asignar"}</b>
          </span>
          {team.members.length > 0
            ? <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><AvatarStack people={team.members} max={6} size={28} /><span className="muted" style={{ fontSize: "var(--t-sm)" }}>{team.members.length} integrantes</span></span>
            : <span className="muted" style={{ fontSize: "var(--t-sm)" }}>Sin otros integrantes</span>}
        </div>
      </Card>

      {/* stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12 }}>
        <Card pad={14}><div className="num" style={{ fontSize: "var(--t-xl)", fontWeight: 800, color: "var(--green)" }}>{counts.active}</div><div className="muted" style={{ fontSize: "var(--t-xs)" }}>Iniciativas en curso</div></Card>
        <Card pad={14}><div className="num" style={{ fontSize: "var(--t-xl)", fontWeight: 800 }}>{team.sessions.length}</div><div className="muted" style={{ fontSize: "var(--t-xs)" }}>Sesiones</div></Card>
        <Card pad={14}><div className="num" style={{ fontSize: "var(--t-xl)", fontWeight: 800, color: lastPulse ? "var(--green)" : "var(--ink-3)" }}>{lastPulse ? overall : "—"}</div><div className="muted" style={{ fontSize: "var(--t-xs)" }}>Pulso</div></Card>
        <Card pad={14}><div className="num" style={{ fontSize: "var(--t-xl)", fontWeight: 800, color: team.psychSafety === 0 ? "var(--ink-3)" : lowSafety ? "var(--warning)" : "var(--success)" }}>{team.psychSafety === 0 ? "—" : `${team.psychSafety}%`}</div><div className="muted" style={{ fontSize: "var(--t-xs)" }}>Seguridad ψ</div></Card>
      </div>

      {/* pulso */}
      {lastPulse && (
        <Card pad={20}>
          <div style={{ fontWeight: 800, fontSize: "var(--t-md)", marginBottom: 14 }}>Pulso del equipo</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {PULSE_DIMS.map((d) => (
              <div key={d.key}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: "var(--t-sm)", fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: d.color }} />{d.label}</span>
                  <span className="num" style={{ fontWeight: 700, color: d.color }}>{lastPulse[d.key]}</span>
                </div>
                <Bar value={lastPulse[d.key]} color={d.color} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* iniciativas */}
      <div>
        <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Iniciativas del equipo</h2>
        <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 12 }}>En lo que el equipo está trabajando para mejorar.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: "var(--r-full)", fontSize: "var(--t-sm)", fontWeight: 600, background: on ? "var(--green-soft)" : "var(--card)", color: on ? "var(--green)" : "var(--ink-2)", border: `1px solid ${on ? "var(--green)" : "var(--line-2)"}` }}>
                {f.label}<span className="num" style={{ background: on ? "var(--green)" : "var(--card-2)", color: on ? "#06140d" : "var(--ink-2)", borderRadius: 99, padding: "1px 7px", fontSize: "var(--t-xs)", fontWeight: 700 }}>{counts[f.key]}</span>
              </button>
            );
          })}
        </div>
        {inits.length === 0 ? (
          <Card pad={20}><p className="muted" style={{ fontSize: "var(--t-sm)", textAlign: "center" }}>Todavía no hay iniciativas. Aparecen cuando el facilitador arranca una.</p></Card>
        ) : shown.length === 0 ? (
          <Card pad={20}><p className="muted" style={{ fontSize: "var(--t-sm)", textAlign: "center" }}>No hay iniciativas en este estado.</p></Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {shown.map((i) => {
              const isLiveHere = live && live.initiativeId === i.id;
              return (
                <Card key={i.id} pad={18} style={{ display: "flex", flexDirection: "column", gap: 12, opacity: i.status === "done" ? 0.72 : 1, borderColor: isLiveHere ? "color-mix(in srgb, var(--green) 45%, transparent)" : undefined }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "var(--t-md)" }}>{i.title}</div>
                      {i.description && <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 3, lineHeight: 1.5 }}>{i.description}</p>}
                    </div>
                    <StageBadge stage={i.stage} />
                  </div>
                  <MiniCycle init={i} />
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", paddingTop: 4, borderTop: "1px solid var(--line)" }}>
                    <span className="muted" style={{ fontSize: "var(--t-xs)", display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="Calendar" size={13} /> Creada {fmtDate(i.createdAt)}</span>
                    <span className="muted" style={{ fontSize: "var(--t-xs)", display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="History" size={13} /> {i.sessionsCount ?? 0} sesiones</span>
                    {isLiveHere && <span style={{ marginLeft: "auto" }}><Button size="sm" icon="Radio" onClick={() => router.push(`/sala/${live!.id}`)}>Entrar a la sesión</Button></span>}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* reflexiones */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, letterSpacing: "-0.02em" }}>Mis reflexiones</h2>
          <button onClick={() => router.push("/member/reflection")} style={{ color: "var(--green)", fontSize: "var(--t-sm)", fontWeight: 600 }}>Ver todas</button>
        </div>
        {reflections.length === 0
          ? <Card pad={18}><p className="muted" style={{ fontSize: "var(--t-sm)" }}>Acá vas a ver tus reflexiones privadas de las sesiones. Solo vos las ves.</p></Card>
          : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{reflections.map((r) => (
              <Card key={r.id} pad={16}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: "var(--t-xs)", fontWeight: 600, color: "var(--ink-2)" }}>{r.prompt}</span><span className="num faint" style={{ fontSize: "var(--t-xs)" }}>{r.date}</span></div><p style={{ fontSize: "var(--t-sm)", lineHeight: 1.55, color: "var(--ink-1)" }}>{r.text}</p></Card>
            ))}</div>}
        <p className="faint" style={{ fontSize: "var(--t-xs)", marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}><Icon name="Lock" size={13} /> Solo vos podés ver estas reflexiones.</p>
      </div>
    </div>
  );
}
