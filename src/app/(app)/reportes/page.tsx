"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, EmptyState, StageBadge } from "@/components/ui";
import { getTeams } from "@/lib/repository";
import { teamLiveStage } from "@/lib/data";

export default function ReportesPage() {
  const router = useRouter();
  const teams = getTeams();

  return (
    <div className="screen-pad">
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Reportes</h1>
        <p className="muted" style={{ marginTop: 4, maxWidth: 600 }}>Generá el reporte de avance de un equipo: pulso, iniciativas y sesiones. Listo para exportar a PDF y compartir con el sponsor.</p>
      </div>

      {teams.length === 0 ? (
        <Card pad={0}><EmptyState icon="FileBarChart" title="Todavía no hay equipos">Cuando tengas equipos con actividad, vas a poder generar sus reportes acá.</EmptyState></Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {teams.map((t) => (
            <Card key={t.id} pad={18} hover style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "var(--t-md)" }}>{t.name}</div>
                  <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 2 }}>{t.org} · {t.area || "—"}</div>
                </div>
                <StageBadge stage={teamLiveStage(t) ?? "queue"} size="sm" />
              </div>
              <div style={{ display: "flex", gap: 14, fontSize: "var(--t-xs)" }} className="muted">
                <span>{(t.initiatives ?? []).length} iniciativas</span>
                <span>{t.sessions.length} sesiones</span>
              </div>
              <Button variant="secondary" icon="FileDown" full style={{ marginTop: "auto" }} onClick={() => router.push(`/reporte/${t.id}`)}>Ver reporte</Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
