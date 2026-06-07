"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, EmptyState, Pill, StageBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { getActiveSessionForTeam, getTeam } from "@/lib/repository";

export default function MemberPendingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const team = getTeam(user?.teamId ?? "t1");
  const session = team ? getActiveSessionForTeam(team.id) : undefined;

  if (!session) {
    return (
      <Card>
        <EmptyState icon="CalendarCheck" title="No tenés sesiones pendientes">
          Cuando tu facilitador abra una sesión, te va a aparecer acá.
        </EmptyState>
      </Card>
    );
  }

  const async = session.mode === "async";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h1 style={{ fontSize: "var(--t-xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Sesión pendiente</h1>

      <Card pad={22} style={{ display: "flex", flexDirection: "column", gap: 16, borderTop: `3px solid ${async ? "var(--violet)" : "var(--green)"}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <StageBadge stage={session.stage} />
          <Pill color={async ? "var(--violet)" : "var(--green)"} bg={async ? "var(--violet-soft)" : "var(--success-bg)"} icon={async ? "CalendarClock" : "Radio"}>
            {async ? "Asincrónica" : session.live ? "En vivo ahora" : "En vivo"}
          </Pill>
        </div>
        <div>
          <div style={{ fontSize: "var(--t-lg)", fontWeight: 800, letterSpacing: "-0.02em" }}>{session.retro}</div>
          <div className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 4 }}>{team?.name} · {team?.org}</div>
        </div>

        {async ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--warning)", fontSize: "var(--t-sm)", fontWeight: 600 }}>
              <Icon name="Clock" size={16} /> {session.dueHours ?? 48} horas para responder
            </div>
            <Button full size="lg" icon="PenLine" onClick={() => router.push("/member/respond")}>Responder ahora</Button>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--t-sm)" }}>
              <Icon name="Clock" size={16} className="" style={{ color: "var(--green)" }} />
              <span className="num" style={{ fontWeight: 600 }}>{session.date} · {session.time}</span>
            </div>
            <Button full size="lg" iconRight="ArrowRight" onClick={() => router.push(`/sessions/${session.id}/member`)}>
              {session.live ? "Unirse a la sesión" : "Unirse cuando comience"}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
