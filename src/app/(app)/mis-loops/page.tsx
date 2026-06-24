"use client";

/* ============================================================
   Mis loops (PLAN-PRODUCTO · Pilar 1 / WS9) — el centro de la app
   para el facilitador: todos los loops de todos sus equipos en un
   lugar. Arriba, la MÉTRICA NORTE del producto (WS10): loops
   cerrados con señal movida.
   ============================================================ */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Card, EmptyState, Pill, StageBadge } from "@/components/ui";
import { getInitiatives, getTeams } from "@/lib/repository";
import { loopIsClosed, loopSignalMoved, loopThread } from "@/lib/loop";
import { normalizeStage, type Initiative, type Team } from "@/lib/data";

type Row = { i: Initiative; team: Team };

export default function MisLoopsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<"active" | "closed" | "all">("active");

  const teams = getTeams();
  const loops: Row[] = teams.flatMap((t) => getInitiatives(t.id).map((i) => ({ i, team: t })));
  const active = loops.filter((x) => x.i.status === "active");
  const closed = loops.filter((x) => loopIsClosed(x.i));
  const moved = closed.filter((x) => loopSignalMoved(x.i));
  const movedRate = closed.length ? Math.round((moved.length / closed.length) * 100) : 0;

  const shown = filter === "active" ? active : filter === "closed" ? closed : loops;
  const FILTERS: { key: typeof filter; label: string; n: number }[] = [
    { key: "active", label: "En curso", n: active.length },
    { key: "closed", label: "Cerrados", n: closed.length },
    { key: "all", label: "Todos", n: loops.length },
  ];

  return (
    <div className="screen-pad" style={{ maxWidth: 920 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Mis loops</h1>
        <p className="muted" style={{ marginTop: 4 }}>Todas las mejoras en curso de tus equipos, en un solo lugar.</p>
      </div>

      {/* Métrica norte del producto (WS10) */}
      <Card pad={20} style={{ marginBottom: 18, border: "1px solid color-mix(in srgb, var(--green) 28%, var(--line))", background: "color-mix(in srgb, var(--green) 5%, var(--card))" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <div style={{ width: 52, height: 52, borderRadius: "var(--r-lg)", background: "color-mix(in srgb, var(--green) 14%, transparent)", color: "var(--green)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="TrendingUp" size={26} /></div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: "var(--t-md)", fontWeight: 700 }}>Mejora que se nota</div>
            <p className="muted" style={{ fontSize: "var(--t-sm)" }}>Loops cerrados que movieron su señal — la prueba de que el equipo mejora de verdad.</p>
          </div>
          <div style={{ textAlign: "center", flex: "none" }}>
            <div className="num" style={{ fontSize: 38, fontWeight: 800, color: "var(--green)" }}>{moved.length}</div>
            <div className="muted" style={{ fontSize: "var(--t-xs)" }}>de {closed.length} cerrados · {movedRate}%</div>
          </div>
        </div>
      </Card>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {FILTERS.map((f) => {
          const on = filter === f.key;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: "var(--r-full)", fontSize: "var(--t-sm)", fontWeight: 600, background: on ? "var(--green-soft)" : "var(--card)", color: on ? "var(--green)" : "var(--ink-2)", border: `1px solid ${on ? "var(--green)" : "var(--line-2)"}` }}>
              {f.label}
              <span className="num" style={{ background: on ? "var(--green)" : "var(--card-2)", color: on ? "#06140d" : "var(--ink-2)", borderRadius: 99, padding: "1px 7px", fontSize: "var(--t-xs)", fontWeight: 700 }}>{f.n}</span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <Card pad={0}><EmptyState icon="RefreshCw" title="No hay loops acá">Creá un loop desde un equipo para empezar a mejorar de forma medible.</EmptyState></Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 12 }}>
          {shown.map(({ i, team }) => {
            const th = loopThread(i);
            const sig = th.signal;
            const closedFlag = loopIsClosed(i);
            return (
              <button key={i.id} onClick={() => router.push(`/equipos/${team.id}/iniciativa/${i.id}`)}
                style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 8, padding: "14px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between" }}>
                  <span className="muted" style={{ fontSize: "var(--t-xs)", fontWeight: 600 }}><Icon name="Users" size={11} /> {team.name}</span>
                  <StageBadge stage={normalizeStage(i.stage)} size="sm" />
                </div>
                <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{i.title}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: "auto" }}>
                  {sig?.now ? (
                    <span className="num" style={{ fontSize: "var(--t-xs)", fontWeight: 700, color: sig.delta != null && sig.delta > 0 ? "var(--success)" : sig.delta != null && sig.delta < 0 ? "var(--risk)" : "var(--ink-2)" }}>
                      <Icon name="Activity" size={11} /> {sig.now}{sig.delta != null && sig.delta !== 0 ? ` ${sig.delta > 0 ? "▲+" : "▼"}${sig.delta}` : ""}
                    </span>
                  ) : <span className="muted" style={{ fontSize: "var(--t-xs)" }}>sin señal aún</span>}
                  {closedFlag
                    ? <Pill color="var(--ink-2)" bg="var(--card-2)" icon="Check">cerrado</Pill>
                    : i.status === "paused" ? <Pill color="var(--warning)" bg="var(--warning-bg)" icon="Pause">pausado</Pill> : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
