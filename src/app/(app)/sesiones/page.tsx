"use client";

/* ============================================================
   Sesiones — hub de actividad (no referencia). Muestra qué está
   pasando ahora (sesiones en vivo/async abiertas en mis equipos) y
   el historial de lo que hicimos. El catálogo de retros vive en
   Herramientas; el trabajo de mejora, en Mis loops.
   ============================================================ */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, EmptyState, Pill, StageBadge } from "@/components/ui";
import { getTeams } from "@/lib/repository";
import { getOpenSessionForTeam, type LiveSession } from "@/lib/session";
import { retroById } from "@/lib/retros/registry";
import { normalizeStage, type SessionLog, type Team } from "@/lib/data";

type OpenRow = { s: LiveSession; team: Team };

export default function SesionesPage() {
  const router = useRouter();
  const teams = getTeams();
  const teamIds = teams.map((t) => t.id).join(",");
  const [openRows, setOpenRows] = useState<OpenRow[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await Promise.all(teams.map(async (t) => {
        const s = await getOpenSessionForTeam(t.id);
        return s ? { s, team: t } : null;
      }));
      if (active) setOpenRows(res.filter(Boolean) as OpenRow[]);
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamIds]);

  const history: { s: SessionLog; team: Team }[] = teams
    .flatMap((t) => (t.sessions ?? []).map((s) => ({ s, team: t })))
    .sort((a, b) => (b.s.createdAt ?? b.s.date ?? "").localeCompare(a.s.createdAt ?? a.s.date ?? ""));

  return (
    <div className="screen-pad" style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Sesiones</h1>
        <p className="muted" style={{ marginTop: 4 }}>Qué está pasando ahora en tus equipos y el historial de lo que hicieron.</p>
      </div>

      {/* Ahora */}
      <div style={{ marginBottom: 24 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Ahora</div>
        {openRows.length === 0 ? (
          <Card pad={18} style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <span style={{ color: "var(--ink-3)" }}><Icon name="Moon" size={20} /></span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>No hay sesiones abiertas</div>
              <div className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 2 }}>Abrí una desde un loop: <b style={{ color: "var(--ink-1)" }}>Mis loops</b> → un loop → la retro de la etapa.</div>
            </div>
            <Button variant="secondary" icon="RefreshCw" onClick={() => router.push("/mis-loops")}>Ir a Mis loops</Button>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {openRows.map(({ s, team }) => {
              const isAsync = (s.result as { async?: boolean } | undefined)?.async;
              const name = retroById(s.retro)?.name ?? s.type;
              return (
                <Card key={s.id} pad={16} style={{ border: `1px solid color-mix(in srgb, ${isAsync ? "var(--info)" : "var(--green)"} 40%, var(--line))`, background: `color-mix(in srgb, ${isAsync ? "var(--info)" : "var(--green)"} 6%, var(--card))` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ width: 32, height: 32, borderRadius: "var(--r-md)", background: `color-mix(in srgb, ${isAsync ? "var(--info)" : "var(--green)"} 16%, transparent)`, color: isAsync ? "var(--info)" : "var(--green)", display: "grid", placeItems: "center", flex: "none" }}><Icon name={isAsync ? "Clock" : "Radio"} size={16} /></span>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{name} {isAsync ? <Pill color="var(--info)" bg="color-mix(in srgb, var(--info) 14%, transparent)">async</Pill> : <Pill color="var(--green)" bg="var(--success-bg)">en vivo</Pill>}</div>
                      <div className="muted" style={{ fontSize: "var(--t-xs)" }}><Icon name="Users" size={11} /> {team.name}</div>
                    </div>
                    <Button size="sm" iconRight="ArrowRight" onClick={() => router.push(`/sala/${s.id}`)}>Ir a la sala</Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial */}
      <div style={{ marginBottom: 20 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Historial</div>
        {history.length === 0 ? (
          <Card pad={0}><EmptyState icon="History" title="Todavía no hay sesiones cerradas">Cuando cierren su primera retro va a aparecer acá.</EmptyState></Card>
        ) : (
          <Card pad={8}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {history.slice(0, 50).map(({ s, team }, i) => {
                const name = retroById(s.retro)?.name ?? s.retro ?? "Sesión";
                return (
                  <button key={s.id ?? i} onClick={() => router.push(`/equipos/${team.id}`)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderBottom: i < Math.min(history.length, 50) - 1 ? "1px solid var(--line)" : "none", textAlign: "left" }}>
                    <StageBadge stage={normalizeStage(s.stage)} size="sm" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "var(--t-sm)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                      <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{team.name}</div>
                    </div>
                    {typeof s.delta === "number" && s.delta !== 0 && (
                      <span className="num" style={{ fontSize: "var(--t-xs)", fontWeight: 700, color: s.delta > 0 ? "var(--success)" : "var(--risk)" }}>{s.delta > 0 ? "▲+" : "▼"}{s.delta}</span>
                    )}
                    <span className="num muted" style={{ fontSize: "var(--t-xs)", flex: "none" }}>{s.date}</span>
                  </button>
                );
              })}
            </div>
            {history.length > 50 && <p className="muted" style={{ fontSize: "var(--t-xs)", padding: "8px 12px" }}>Mostrando las últimas 50 de {history.length}.</p>}
          </Card>
        )}
      </div>

      {/* 1 a 1 — teaser discreto */}
      <p className="faint" style={{ fontSize: "var(--t-xs)", display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name="MessagesSquare" size={13} /> Próximamente: reuniones 1 a 1 con cada integrante (feedback, qué lo frena, crecimiento), conectadas a las señales del equipo.
      </p>
    </div>
  );
}
