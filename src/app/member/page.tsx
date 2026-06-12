"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { AvatarStack, Button, Card, StageBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { getFacilitators, getInitiatives, getTeam } from "@/lib/repository";
import { getOpenSessionForTeam, subscribeTeamSessions, type LiveSession } from "@/lib/session";
import { overallOf, teamLiveStage } from "@/lib/data";

export default function MemberHome() {
  const router = useRouter();
  const { user } = useAuth();
  const team = getTeam(user?.teamId ?? "");
  const firstName = (user?.name ?? "").split(" ")[0] || "miembro";
  const [live, setLive] = useState<LiveSession | null>(null);

  useEffect(() => {
    if (!user?.teamId) return;
    let active = true;
    const load = async () => { const s = await getOpenSessionForTeam(user.teamId!); if (active) setLive(s); };
    load();
    const unsub = subscribeTeamSessions(user.teamId, load);
    const poll = setInterval(load, 3000);
    return () => { active = false; unsub(); clearInterval(poll); };
  }, [user?.teamId]);

  if (!team) {
    return <div className="screen-pad"><Card pad={24}><p className="muted">Todavía no estás asignado a un equipo. Pedile a tu facilitador que te invite.</p></Card></div>;
  }

  const lead = team.facilitatorId ? getFacilitators().find((f) => f.id === team.facilitatorId) : undefined;
  const inits = getInitiatives(team.id);
  const activeInits = inits.filter((i) => i.status === "active").length;
  const lastPulse = team.pulse[team.pulse.length - 1];
  const overall = lastPulse ? overallOf(lastPulse) : 0;
  const links = [
    { href: "/member/equipo", label: "Mi equipo", icon: "Users", desc: "Organización, facilitador e integrantes" },
    { href: "/member/iniciativas", label: "Iniciativas", icon: "Target", desc: "En qué trabaja el equipo" },
    { href: "/member/sesiones", label: "Sesiones", icon: "Radio", desc: "Lo que hicieron juntos" },
    { href: "/member/biblioteca", label: "Biblioteca", icon: "Library", desc: "Aprendizajes y apuestas del equipo" },
    { href: "/member/reflection", label: "Reflexiones", icon: "BookHeart", desc: "Tus notas privadas" },
  ];

  return (
    <div className="screen-pad">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Hola, {firstName} 👋</h1>
          <p className="muted" style={{ marginTop: 4 }}>Tu espacio del equipo: avances, iniciativas y sesiones.</p>
        </div>
        <button onClick={() => router.push("/join")} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 13px", borderRadius: "var(--r-md)", border: "1px solid var(--line-2)", background: "var(--card)", color: "var(--ink-1)", fontSize: "var(--t-sm)", fontWeight: 600 }}>
          <Icon name="QrCode" size={15} /> Unirse con un código
        </button>
      </div>

      {!live && team.sessions.length === 0 && (
        <Card pad={18} style={{ marginBottom: 18, borderColor: "color-mix(in srgb, var(--green) 30%, var(--line))" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "var(--r-md)", background: "var(--success-bg)", color: "var(--green)", display: "grid", placeItems: "center", flexShrink: 0 }}><Icon name="Sparkles" size={20} /></div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>¡Bienvenido/a al equipo {team.name}!</div>
              <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 3, lineHeight: 1.5 }}>Acá vas a participar de las sesiones en vivo cuando tu facilitador las inicie — te van a aparecer en esta pantalla. Mientras, podés mirar tu equipo y las iniciativas.</p>
            </div>
          </div>
        </Card>
      )}

      {live && (
        <Card glow pad={18} style={{ marginBottom: 18, background: "linear-gradient(180deg, rgba(0,232,122,0.12), var(--card))", borderColor: "color-mix(in srgb, var(--green) 45%, transparent)", animation: "glow-pulse 2s infinite" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 99, background: "var(--green)", boxShadow: "0 0 8px var(--green)", animation: "glow-pulse 1.2s infinite" }} />
            <span style={{ fontWeight: 800, fontSize: "var(--t-md)" }}>Sesión en vivo ahora</span>
          </div>
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 14 }}>Tu facilitador abrió una sesión. Entrá a participar.</p>
          <Button full size="lg" iconRight="ArrowRight" onClick={() => router.push(`/sala/${live.id}`)}>Unirse a la sesión</Button>
        </Card>
      )}

      <Card pad={20} style={{ marginBottom: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div className="muted" style={{ fontSize: "var(--t-xs)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{team.org}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: "var(--t-lg)", fontWeight: 800 }}>{team.name}</span>
            <StageBadge stage={teamLiveStage(team) ?? "queue"} size="sm" />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: "var(--t-sm)" }}><Icon name="UserCog" size={15} style={{ color: "var(--info)" }} /><span className="muted">Facilitador:</span> <b>{lead?.name ?? "Sin asignar"}</b></span>
          {team.members.length > 0 && <AvatarStack people={team.members} max={6} size={26} />}
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", paddingTop: 4 }}>
          <span style={{ fontSize: "var(--t-sm)" }} className="muted"><b className="num" style={{ color: "var(--green)" }}>{activeInits}</b> iniciativas en curso</span>
          <span style={{ fontSize: "var(--t-sm)" }} className="muted"><b className="num" style={{ color: "var(--ink-0)" }}>{team.sessions.length}</b> sesiones</span>
          {lastPulse && <span style={{ fontSize: "var(--t-sm)" }} className="muted">pulso <b className="num" style={{ color: "var(--ink-0)" }}>{overall}/100</b></span>}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 12 }}>
        {links.map((l) => (
          <Card key={l.href} pad={18} hover onClick={() => router.push(l.href)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: "var(--r-md)", background: "var(--card-2)", color: "var(--green)", display: "grid", placeItems: "center", flex: "none" }}><Icon name={l.icon} size={20} /></div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{l.label}</div>
              <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{l.desc}</div>
            </div>
            <Icon name="ChevronRight" size={16} style={{ color: "var(--ink-3)", marginLeft: "auto" }} />
          </Card>
        ))}
      </div>
    </div>
  );
}
