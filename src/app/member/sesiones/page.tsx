"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, StageBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { getMyTeam } from "@/lib/repository";
import { getMyOpenSession, subscribeTeamSessions, type LiveSession } from "@/lib/session";
import { STAGES } from "@/lib/data";

export default function MemberSesiones() {
  const router = useRouter();
  const { user } = useAuth();
  const team = getMyTeam(user?.teamId);
  const [live, setLive] = useState<LiveSession | null>(null);

  useEffect(() => {
    if (!team?.id) return; const tid = team.id;
    let active = true;
    const load = async () => { const s = await getMyOpenSession(); if (active) setLive(s); };
    load();
    const unsub = subscribeTeamSessions(tid, load);
    const poll = setInterval(load, 3000);
    return () => { active = false; unsub(); clearInterval(poll); };
  }, [team?.id]);

  if (!team) return <div className="screen-pad"><Card pad={24}><p className="muted">No estás asignado a un equipo.</p></Card></div>;
  const sessions = team.sessions;

  return (
    <div className="screen-pad" style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Sesiones</h1>
      <p className="muted" style={{ marginTop: 4, marginBottom: 16 }}>Los encuentros del equipo. Si hay uno en vivo, entrá a participar.</p>

      {live ? (
        <Card glow pad={18} style={{ marginBottom: 18, background: "linear-gradient(180deg, rgba(0,232,122,0.12), var(--card))", borderColor: "color-mix(in srgb, var(--green) 45%, transparent)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}><span style={{ width: 10, height: 10, borderRadius: 99, background: "var(--green)", boxShadow: "0 0 8px var(--green)", animation: "glow-pulse 1.2s infinite" }} /><span style={{ fontWeight: 800, fontSize: "var(--t-md)" }}>Sesión en vivo ahora</span></div>
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 14 }}>Tu facilitador abrió una sesión.</p>
          <Button full size="lg" iconRight="ArrowRight" onClick={() => router.push(`/sala/${live.id}`)}>Unirse a la sesión</Button>
        </Card>
      ) : (
        <Card pad={16} style={{ marginBottom: 18 }}><p className="muted" style={{ fontSize: "var(--t-sm)", display: "flex", alignItems: "center", gap: 8 }}><Icon name="Radio" size={15} /> No hay ninguna sesión en vivo en este momento.</p></Card>
      )}

      <h2 style={{ fontSize: "var(--t-md)", fontWeight: 800, marginBottom: 12 }}>Sesiones realizadas</h2>
      {sessions.length === 0 ? (
        <Card pad={20}><p className="muted" style={{ fontSize: "var(--t-sm)", textAlign: "center" }}>Todavía no se hicieron sesiones. Cuando participen de una, aparecen acá.</p></Card>
      ) : (
        <Card pad={20}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 6, top: 8, bottom: 8, width: 2, background: "var(--line)" }} />
            {sessions.map((s, i) => { const meta = STAGES[s.stage] ?? { color: "var(--ink-3)" }; return (
              <div key={s.id} style={{ display: "flex", gap: 14, paddingBottom: i < sessions.length - 1 ? 16 : 0, position: "relative" }}>
                <span style={{ width: 14, height: 14, borderRadius: 99, background: "var(--bg-1)", border: "2px solid " + meta.color, marginTop: 2, flex: "none", zIndex: 1 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><span style={{ fontWeight: 600, fontSize: "var(--t-sm)" }}>{s.retro}</span><StageBadge stage={s.stage} size="sm" /><span className="muted num" style={{ fontSize: "var(--t-xs)", marginLeft: "auto" }}>{s.date}</span></div>
                  <div className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}><Icon name="CornerDownRight" size={13} /> {s.out}</div>
                </div>
              </div>
            ); })}
          </div>
        </Card>
      )}
    </div>
  );
}
