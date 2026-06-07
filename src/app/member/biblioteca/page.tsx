"use client";

import { Icon } from "@/components/icon";
import { Card } from "@/components/ui";
import { BibliotecaContent } from "@/components/Biblioteca";
import { useAuth } from "@/lib/auth/AuthContext";
import { getTeam } from "@/lib/repository";

export default function MemberBiblioteca() {
  const { user } = useAuth();
  const team = getTeam(user?.teamId ?? "");

  if (!team) return <div className="screen-pad"><Card pad={24}><p className="muted">No estás asignado a un equipo.</p></Card></div>;

  return (
    <div className="screen-pad" style={{ maxWidth: 800 }}>
      <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 10 }}><Icon name="Library" size={24} style={{ color: "var(--green)" }} /> Biblioteca del equipo</h1>
      <p className="muted" style={{ marginTop: 4, marginBottom: 20 }}>Lo que {team.name} fue aprendiendo ciclo a ciclo: aprendizajes, apuestas y causas raíz.</p>
      <BibliotecaContent team={team} />
    </div>
  );
}
