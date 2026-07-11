"use client";

/* Fundaciones del equipo (facilitador) — las fotos congeladas que
   definen al equipo: contrato, FODA y clima, con su historial. */

import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Card } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { getTeam } from "@/lib/repository";
import { FoundationsPanel } from "@/components/FoundationsPanel";

export default function EquipoFundaciones() {
  const router = useRouter();
  const { id: teamId } = useParams<{ id: string }>();
  const team = getTeam(teamId);
  const { user } = useAuth();
  const canEdit = user?.role === "facilitator" || user?.role === "admin" || user?.role === "superadmin";

  if (!team) return <div className="screen-pad"><Card pad={24}><p className="muted">Equipo no encontrado.</p></Card></div>;

  return (
    <div className="screen-pad" style={{ maxWidth: 900 }}>
      <button onClick={() => router.push(`/equipos/${team.id}`)} className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--t-xs)", fontWeight: 600, marginBottom: 10 }}><Icon name="ChevronLeft" size={13} /> {team.name}</button>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Fundaciones</h1>
        <p className="muted" style={{ marginTop: 4 }}>Las fotos que definen al equipo: contrato, FODA y clima. Cada una queda congelada e histórica — hacé una nueva cuando quieran y compará con la anterior.</p>
      </div>
      <FoundationsPanel team={team} canEdit={canEdit} />
    </div>
  );
}
