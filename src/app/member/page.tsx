"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, Pill, StageBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { getActiveSessionForTeam, getReflections, getTeam } from "@/lib/repository";
import { getOpenSessionForTeam, subscribeTeamSessions, type LiveSession } from "@/lib/session";
import { STAGES } from "@/lib/data";

export default function MemberHome() {
  const router = useRouter();
  const { user } = useAuth();
  const team = getTeam(user?.teamId ?? "t1");
  const session = team ? getActiveSessionForTeam(team.id) : undefined;
  const reflections = getReflections().slice(0, 3);

  // Sesión en vivo real del equipo (se actualiza por Realtime).
  const [live, setLive] = useState<LiveSession | null>(null);
  useEffect(() => {
    if (!user?.teamId) return;
    let active = true;
    const load = async () => { const s = await getOpenSessionForTeam(user.teamId!); if (active) setLive(s); };
    load();
    const unsub = subscribeTeamSessions(user.teamId, load);
    return () => { active = false; unsub(); };
  }, [user?.teamId]);

  if (!team) {
    return <Card pad={24}><p className="muted">Todavía no estás asignado a un equipo.</p></Card>;
  }

  const st = STAGES[team.stage];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* sesión en vivo real (Realtime) */}
      {live && (
        <Card glow pad={18} style={{ background: "linear-gradient(180deg, rgba(0,232,122,0.12), var(--card))", borderColor: "color-mix(in srgb, var(--green) 45%, transparent)", animation: "glow-pulse 2s infinite" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 99, background: "var(--green)", boxShadow: "0 0 8px var(--green)", animation: "glow-pulse 1.2s infinite" }} />
            <span style={{ fontWeight: 800, fontSize: "var(--t-md)" }}>Sesión en vivo ahora</span>
          </div>
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 14 }}>Tu facilitador abrió una sesión. Entrá a participar.</p>
          <Button full size="lg" iconRight="ArrowRight" onClick={() => router.push(`/sala/${live.id}`)}>Unirse a la sesión</Button>
        </Card>
      )}

      {/* live session banner (mock, legacy) */}
      {session?.live && (
        <Card glow pad={18} style={{ background: "linear-gradient(180deg, rgba(0,232,122,0.10), var(--card))", borderColor: "color-mix(in srgb, var(--green) 40%, transparent)", animation: "glow-pulse 2s infinite" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 99, background: "var(--green)", boxShadow: "0 0 8px var(--green)", animation: "glow-pulse 1.2s infinite" }} />
            <span style={{ fontWeight: 800, fontSize: "var(--t-md)" }}>Sesión en vivo ahora · {session.retro}</span>
          </div>
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 14 }}>Tu facilitador ya está esperando.</p>
          <Button full size="lg" iconRight="ArrowRight" onClick={() => router.push(`/sessions/${session.id}/member`)}>
            Unirse a la sesión
          </Button>
        </Card>
      )}

      {/* tu equipo */}
      <div>
        <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 12 }}>Tu equipo</h2>
        <Card pad={20} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div className="muted" style={{ fontSize: "var(--t-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{team.org}</div>
              <div style={{ fontWeight: 700, fontSize: "var(--t-lg)" }}>{team.name}</div>
            </div>
            <StageBadge stage={team.stage} size="sm" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--card-2)", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>
            <span style={{ color: st.color, display: "inline-flex" }}><Icon name="Target" size={18} /></span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="muted" style={{ fontSize: "var(--t-xs)" }}>Estamos trabajando en</div>
              <div style={{ fontSize: "var(--t-sm)", fontWeight: 600 }}>{team.activeVar}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--t-sm)" }}>
              <Icon name="Flag" size={15} className="" style={{ color: st.color }} />
              <span className="muted">Etapa actual:</span> <b style={{ color: st.color }}>{st.label}</b>
            </div>
            {session && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--t-sm)", color: "var(--ink-2)" }}>
                <Icon name="CalendarDays" size={15} /> Próx: <b style={{ color: "var(--ink-0)" }}>{session.date} {session.time}</b>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* sesión pendiente */}
      {session && (
        <div>
          <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 12 }}>Sesión pendiente</h2>
          <Card pad={20} style={{ display: "flex", flexDirection: "column", gap: 14, borderLeft: `3px solid ${session.mode === "async" ? "var(--violet)" : "var(--green)"}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 700, fontSize: "var(--t-md)" }}>{session.retro}</div>
              <Pill color={session.mode === "async" ? "var(--violet)" : "var(--green)"} bg={session.mode === "async" ? "var(--violet-soft)" : "var(--success-bg)"} icon={session.mode === "async" ? "CalendarClock" : "Radio"}>
                {session.mode === "async" ? "Asincrónica" : "En vivo"}
              </Pill>
            </div>
            {session.mode === "async" ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--warning)", fontSize: "var(--t-sm)", fontWeight: 600 }}>
                  <Icon name="Clock" size={15} /> {session.dueHours ?? 48} horas para responder
                </div>
                <Button full icon="PenLine" onClick={() => router.push("/member/respond")}>Responder ahora</Button>
              </>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--t-sm)" }}>
                  <Icon name="Clock" size={15} className="" style={{ color: "var(--green)" }} />
                  <span className="num" style={{ fontWeight: 600 }}>{session.date} · {session.time}</span>
                </div>
                <Button full icon="Radio" variant={session.live ? "primary" : "secondary"} onClick={() => router.push(`/sessions/${session.id}/member`)}>
                  {session.live ? "Unirse a la sesión" : "Unirse cuando comience"}
                </Button>
              </>
            )}
          </Card>
        </div>
      )}

      {/* mis reflexiones */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, letterSpacing: "-0.02em" }}>Mis reflexiones</h2>
          <button onClick={() => router.push("/member/reflection")} style={{ color: "var(--green)", fontSize: "var(--t-sm)", fontWeight: 600 }}>Ver todas</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {reflections.map((r) => (
            <Card key={r.id} pad={16}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: "var(--t-xs)", fontWeight: 600, color: "var(--ink-2)" }}>{r.prompt}</span>
                <span className="num faint" style={{ fontSize: "var(--t-xs)" }}>{r.date}</span>
              </div>
              <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.55, color: "var(--ink-1)" }}>{r.text}</p>
            </Card>
          ))}
        </div>
        <p className="faint" style={{ fontSize: "var(--t-xs)", marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="Lock" size={13} /> Solo vos podés ver estas reflexiones.
        </p>
      </div>
    </div>
  );
}
