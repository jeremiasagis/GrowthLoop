"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, StageBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { getInitiatives, getMyTeam } from "@/lib/repository";
import { getOpenSessionForTeam, subscribeTeamSessions, type LiveSession } from "@/lib/session";
import { CYCLE_STAGES, STAGES, type Initiative } from "@/lib/data";

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es", { day: "2-digit", month: "short" });
}

function MiniCycle({ init }: { init: Initiative }) {
  const done = init.status === "done";
  const curIdx = Math.max(0, CYCLE_STAGES.indexOf(init.stage));
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {CYCLE_STAGES.map((st, idx) => {
        const meta = STAGES[st];
        const current = idx === curIdx && !done;
        const past = idx < curIdx || done;
        return (
          <span key={st} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: "var(--r-full)", fontSize: "var(--t-xs)", fontWeight: 600, whiteSpace: "nowrap", color: current ? "#06140d" : past ? meta.color : "var(--ink-3)", background: current ? meta.color : past ? `color-mix(in srgb, ${meta.color} 16%, transparent)` : "var(--card-2)", border: `1px solid ${current || past ? `color-mix(in srgb, ${meta.color} 45%, transparent)` : "var(--line)"}` }}>
            <span style={{ fontWeight: 800 }}>{meta.n}</span>{meta.label}
          </span>
        );
      })}
    </div>
  );
}

export default function MemberIniciativas() {
  const router = useRouter();
  const { user } = useAuth();
  const team = getMyTeam(user?.teamId);
  const [filter, setFilter] = useState<Initiative["status"]>("active");
  const [live, setLive] = useState<LiveSession | null>(null);

  useEffect(() => {
    if (!team?.id) return; const tid = team.id;
    let active = true;
    const load = async () => { const s = await getOpenSessionForTeam(tid); if (active) setLive(s); };
    load();
    const unsub = subscribeTeamSessions(tid, load);
    const poll = setInterval(load, 3000);
    return () => { active = false; unsub(); clearInterval(poll); };
  }, [team?.id]);

  if (!team) return <div className="screen-pad"><Card pad={24}><p className="muted">No estás asignado a un equipo.</p></Card></div>;

  const inits = getInitiatives(team.id);
  const counts = { active: inits.filter((i) => i.status === "active").length, paused: inits.filter((i) => i.status === "paused").length, done: inits.filter((i) => i.status === "done").length };
  const shown = inits.filter((i) => i.status === filter);
  const FILTERS: { key: Initiative["status"]; label: string }[] = [{ key: "active", label: "En curso" }, { key: "paused", label: "Pausadas" }, { key: "done", label: "Cerradas" }];

  return (
    <div className="screen-pad" style={{ maxWidth: 800 }}>
      <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Iniciativas</h1>
      <p className="muted" style={{ marginTop: 4, marginBottom: 16 }}>En lo que el equipo está trabajando para mejorar.</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {FILTERS.map((f) => { const on = filter === f.key; return (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: "var(--r-full)", fontSize: "var(--t-sm)", fontWeight: 600, background: on ? "var(--green-soft)" : "var(--card)", color: on ? "var(--green)" : "var(--ink-2)", border: `1px solid ${on ? "var(--green)" : "var(--line-2)"}` }}>
            {f.label}<span className="num" style={{ background: on ? "var(--green)" : "var(--card-2)", color: on ? "#06140d" : "var(--ink-2)", borderRadius: 99, padding: "1px 7px", fontSize: "var(--t-xs)", fontWeight: 700 }}>{counts[f.key]}</span>
          </button>
        ); })}
      </div>

      {inits.length === 0 ? (
        <Card pad={20}><p className="muted" style={{ fontSize: "var(--t-sm)", textAlign: "center" }}>Todavía no hay iniciativas. Aparecen cuando el facilitador arranca una.</p></Card>
      ) : shown.length === 0 ? (
        <Card pad={20}><p className="muted" style={{ fontSize: "var(--t-sm)", textAlign: "center" }}>No hay iniciativas en este estado.</p></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {shown.map((i) => { const isLiveHere = live && live.initiativeId === i.id; return (
            <Card key={i.id} pad={18} style={{ display: "flex", flexDirection: "column", gap: 12, opacity: i.status === "done" ? 0.72 : 1, borderColor: isLiveHere ? "color-mix(in srgb, var(--green) 45%, transparent)" : undefined }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "var(--t-md)" }}>{i.title}</div>
                  {i.description && <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 3, lineHeight: 1.5 }}>{i.description}</p>}
                </div>
                <StageBadge stage={i.stage} />
              </div>
              <MiniCycle init={i} />
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", paddingTop: 4, borderTop: "1px solid var(--line)" }}>
                <span className="muted" style={{ fontSize: "var(--t-xs)", display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="Calendar" size={13} /> Creada {fmtDate(i.createdAt)}</span>
                <span className="muted" style={{ fontSize: "var(--t-xs)", display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="History" size={13} /> {i.sessionsCount ?? 0} sesiones</span>
                {isLiveHere && <span style={{ marginLeft: "auto" }}><Button size="sm" icon="Radio" onClick={() => router.push(`/sala/${live!.id}`)}>Entrar a la sesión</Button></span>}
              </div>
            </Card>
          ); })}
        </div>
      )}
    </div>
  );
}
