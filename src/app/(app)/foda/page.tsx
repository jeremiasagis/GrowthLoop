"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, EmptyState, Pill } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/components/Toast";
import { getFacilitators, getTeams } from "@/lib/repository";
import { createLiveSession } from "@/lib/session";
import type { Team } from "@/lib/data";

// Los 4 cuadrantes clásicos, con el mismo orden y tono que la sesión en vivo.
const QUADS = [
  { key: "f", label: "💪 Fortalezas", color: "var(--green)" },
  { key: "o", label: "🌱 Oportunidades", color: "var(--st-explore)" },
  { key: "d", label: "⚠️ Debilidades", color: "var(--warning)" },
  { key: "a", label: "⛈️ Amenazas", color: "var(--danger)" },
] as const;

function FodaGrid({ team }: { team: Team }) {
  const foda = team.data?.foda;
  if (!foda) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
      {QUADS.map((q) => {
        const items = (foda[q.key] ?? []).filter((t) => (t ?? "").trim());
        return (
          <div key={q.key} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderTop: `3px solid ${q.color}`, borderRadius: "var(--r-md)", padding: 12 }}>
            <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 8 }}>{q.label} <span className="num muted" style={{ fontSize: "var(--t-xs)" }}>{items.length}</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {items.map((t, i) => <div key={i} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-sm)", padding: "7px 9px", fontSize: "var(--t-xs)", lineHeight: 1.45 }}>{t}</div>)}
              {!items.length && <span className="muted" style={{ fontSize: "var(--t-xs)" }}>Sin aportes</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function FodaPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { show } = useToast();
  const [launching, setLaunching] = useState<string | null>(null);

  // Solo los equipos que facilita el usuario actual (igual criterio que "Mis equipos").
  const myFacIds = new Set(getFacilitators().filter((f) => (f.email ?? "").toLowerCase() === (user?.email ?? "").toLowerCase()).map((f) => f.id));
  const teams = getTeams().filter((t) => t.facilitatorId && myFacIds.has(t.facilitatorId));

  const start = async (team: Team) => {
    if (launching) return;
    setLaunching(team.id);
    const res = await createLiveSession({ teamId: team.id, type: "foda" });
    setLaunching(null);
    if (res.error || !res.session) { show(res.error ?? "No se pudo abrir la sesión", "TriangleAlert"); return; }
    router.push(`/sala/${res.session.id}`);
  };

  return (
    <div className="screen-pad" style={{ maxWidth: 1000 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>FODA</h1>
        <p className="muted" style={{ marginTop: 4, maxWidth: 640 }}>
          El diagnóstico inicial del equipo: <b style={{ color: "var(--ink-1)" }}>Fortalezas, Oportunidades, Debilidades y Amenazas</b>. Se completa en una sesión en vivo (anónimo hasta revelar) y queda guardado acá.
        </p>
      </div>

      {!teams.length && <EmptyState icon="Grid2x2" title="Sin equipos todavía">Creá un equipo en Mis equipos y después hacé su FODA inicial.</EmptyState>}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {teams.map((team) => {
          const foda = team.data?.foda;
          return (
            <Card key={team.id} pad={20}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: foda ? 14 : 0 }}>
                <span style={{ width: 36, height: 36, borderRadius: "var(--r-md)", background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center" }}><Icon name="Grid2x2" size={18} /></span>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 800 }}>{team.name}</div>
                  {foda?.date && <span className="muted" style={{ fontSize: "var(--t-xs)" }}>Hecho el {foda.date}</span>}
                </div>
                {foda
                  ? <Pill color="var(--green)" bg="var(--success-bg)" icon="Check">FODA hecho</Pill>
                  : <Pill color="var(--warning)" bg="var(--warning-bg)" icon="Clock">pendiente</Pill>}
                <Button size="sm" icon="Users" disabled={launching === team.id} onClick={() => start(team)}>
                  {launching === team.id ? "Abriendo…" : foda ? "Rehacer FODA" : "Hacer FODA en vivo"}
                </Button>
              </div>
              <FodaGrid team={team} />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
