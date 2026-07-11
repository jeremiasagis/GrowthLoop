"use client";

/* Fundaciones (miembro, read-only) — las fotos que definen al
   equipo: contrato, FODA y clima, con su historial. */

import { Card } from "@/components/ui";
import { useMemberTeam } from "@/lib/member/team";
import { getMemberTeam } from "@/lib/repository";
import { FoundationsPanel } from "@/components/FoundationsPanel";

export default function MemberFundaciones() {
  const { teamId } = useMemberTeam();
  const team = getMemberTeam(teamId);

  if (!team) return <div className="screen-pad"><Card pad={24}><p className="muted">No estás asignado a un equipo todavía.</p></Card></div>;

  return (
    <div className="screen-pad" style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Fundaciones</h1>
        <p className="muted" style={{ marginTop: 4 }}>Las fotos que definen a tu equipo: contrato, FODA y clima, y cómo fueron cambiando.</p>
      </div>
      <FoundationsPanel team={team} canEdit={false} />
    </div>
  );
}
