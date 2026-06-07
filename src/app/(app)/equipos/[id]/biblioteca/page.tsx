"use client";

import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, EmptyState } from "@/components/ui";
import { BibliotecaContent } from "@/components/Biblioteca";
import { getTeam } from "@/lib/repository";

export default function BibliotecaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const teamId = params.id || "";
  const team = getTeam(teamId);

  if (!team) {
    return <div className="screen-pad"><Card pad={0}><EmptyState icon="SearchX" title="Equipo no encontrado">No pudimos encontrar este equipo.</EmptyState></Card></div>;
  }

  return (
    <div className="screen-pad">
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "var(--t-sm)", marginBottom: 14, flexWrap: "wrap" }}>
        <button onClick={() => router.push("/organizaciones")} className="muted">Equipos</button>
        <span className="faint"><Icon name="ChevronRight" size={13} /></span>
        <button onClick={() => router.push(`/equipos/${teamId}`)} className="muted">{team.name}</button>
        <span className="faint"><Icon name="ChevronRight" size={13} /></span>
        <span style={{ fontWeight: 600 }}>Biblioteca</span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 10 }}><Icon name="Library" size={26} style={{ color: "var(--green)" }} /> Biblioteca del equipo</h1>
          <p className="muted" style={{ marginTop: 4 }}>El conocimiento que {team.name} fue acumulando ciclo a ciclo: aprendizajes, apuestas y causas raíz.</p>
        </div>
        <Button variant="secondary" icon="ArrowLeft" onClick={() => router.push(`/equipos/${teamId}`)}>Volver al equipo</Button>
      </div>

      <BibliotecaContent team={team} onOpenInitiative={(init) => router.push(`/equipos/${teamId}/iniciativa/${init.id}`)} />
    </div>
  );
}
