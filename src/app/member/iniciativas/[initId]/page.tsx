"use client";

/* ============================================================
   Detalle del loop para el miembro (read-only + su parte).
   Reutiliza el expediente/hilo (LoopExpediente) y el gráfico de
   señal que ve el facilitador, en modo lectura, y le muestra al
   miembro SU compromiso dentro de este loop (que sí puede marcar).
   ============================================================ */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, Pill, StageBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/components/Toast";
import { useMemberTeam } from "@/lib/member/team";
import { getMemberTeam, setMyCommitmentStatus } from "@/lib/repository";
import { getMyOpenSession, subscribeTeamSessions, type LiveSession } from "@/lib/session";
import { LoopExpediente } from "@/components/LoopExpediente";
import { SignalProgressChart } from "@/components/SignalProgressChart";
import { loopThread } from "@/lib/loop";
import { CYCLE_STAGES } from "@/lib/data";

const STATUS_PILL: Record<string, { l: string; c: string }> = {
  active: { l: "En curso", c: "var(--green)" },
  paused: { l: "Pausada", c: "var(--warning)" },
  done: { l: "Cerrada", c: "var(--ink-2)" },
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es", { day: "2-digit", month: "short" });
}

export default function MemberLoopDetail() {
  const router = useRouter();
  const { show } = useToast();
  const { user } = useAuth();
  const params = useParams<{ initId: string }>();
  const { teamId } = useMemberTeam();
  const team = getMemberTeam(teamId);
  const [live, setLive] = useState<LiveSession | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!team?.id) return; const tid = team.id;
    let active = true;
    const load = async () => { const s = await getMyOpenSession(); if (active) setLive(s); };
    load();
    const unsub = subscribeTeamSessions(tid, load);
    const poll = setInterval(load, 3000);
    return () => { active = false; unsub(); clearInterval(poll); };
  }, [team?.id]);

  if (!team) return <div className="screen-pad"><Card pad={24}><p className="muted">No estás asignado a un equipo.</p></Card></div>;
  const init = (team.initiatives ?? []).find((i) => i.id === params.initId);
  if (!init) return <div className="screen-pad"><Card pad={24}><p className="muted">No encontramos esta iniciativa.</p></Card></div>;

  const thread = loopThread(init);
  const isLiveHere = !!live && live.initiativeId === init.id;
  const curIdx = Math.max(0, CYCLE_STAGES.indexOf(init.stage));
  const st = STATUS_PILL[init.status];

  // Mis compromisos en ESTE loop (match por nombre, igual que el home).
  const firstLower = (user?.name ?? "").split(" ")[0].toLowerCase();
  const myName = (user?.name ?? "").toLowerCase().trim();
  const d = init.data ?? {};
  const statusBy = new Map((d.follow?.actionStatus ?? []).map((a) => [a.text, a.status]));
  const seen = new Set<string>();
  const myCommits: { text: string; status: string }[] = [];
  for (const a of [...(d.proof?.actions ?? []), ...(d.follow?.newActions ?? [])]) {
    const text = (a.text ?? "").trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    const who = (a.who ?? "").toLowerCase();
    if (who && (who.includes(firstLower) || (myName && who.includes(myName)))) myCommits.push({ text, status: statusBy.get(text) ?? "pending" });
  }
  const mark = async (text: string, status: string) => {
    setBusy(text);
    const { error } = await setMyCommitmentStatus(init.id, text, status);
    setBusy(null);
    if (error) { show("No se pudo guardar.", "TriangleAlert"); return; }
    setTick((t) => t + 1);
  };

  const log = d.follow?.signalLog ?? [];

  return (
    <div className="screen-pad" style={{ maxWidth: 820 }}>
      <button onClick={() => router.push("/member/iniciativas")} className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--t-xs)", fontWeight: 600, marginBottom: 10 }}><Icon name="ChevronLeft" size={13} /> Iniciativas</button>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
        <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em", minWidth: 0 }}>{init.title}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {st && <Pill color={st.c}>{st.l}</Pill>}
          <StageBadge stage={init.stage} />
        </div>
      </div>
      {init.description && <p className="muted" style={{ lineHeight: 1.5, marginBottom: 12 }}>{init.description}</p>}

      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        <span className="muted" style={{ fontSize: "var(--t-xs)", display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="Milestone" size={13} /> Etapa {curIdx + 1} de {CYCLE_STAGES.length}</span>
        <span className="muted" style={{ fontSize: "var(--t-xs)", display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="History" size={13} /> {init.sessionsCount ?? 0} sesiones</span>
        <span className="muted" style={{ fontSize: "var(--t-xs)", display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="Calendar" size={13} /> Creada {fmtDate(init.createdAt)}</span>
        {isLiveHere && <span style={{ marginLeft: "auto" }}><Button size="sm" icon="Radio" onClick={() => router.push(`/sala/${live!.id}`)}>Entrar a la sesión</Button></span>}
      </div>

      {/* El hilo del loop (read-only) */}
      <LoopExpediente init={init} />

      {/* Evolución de la señal */}
      {log.length > 0 && (
        <Card pad={18} style={{ marginBottom: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Cómo viene la señal</div>
          <SignalProgressChart log={log} metric={thread.signal?.metric} target={thread.signal?.target} />
        </Card>
      )}

      {/* Tu parte en este loop */}
      <Card pad={18}>
        <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: myCommits.length ? 12 : 0 }}><Icon name="ListChecks" size={13} /> Tu parte en este loop</div>
        {myCommits.length === 0 ? (
          <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>No tenés compromisos asignados en este loop.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {myCommits.map((c, i) => {
              const done = c.status === "done";
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", background: "var(--card-2)", border: "1px solid var(--line)", borderLeft: `3px solid ${done ? "var(--success)" : "var(--st-follow)"}`, borderRadius: "var(--r-md)" }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: "var(--t-sm)", textDecoration: done ? "line-through" : "none", opacity: done ? 0.7 : 1 }}>{c.text}</span>
                  {done
                    ? <button disabled={busy === c.text} onClick={() => mark(c.text, "pending")} className="muted" style={{ fontSize: "var(--t-xs)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Check" size={13} style={{ color: "var(--success)" }} /> hecho · deshacer</button>
                    : <Button size="sm" variant="secondary" icon={busy === c.text ? "Loader" : "Check"} disabled={busy === c.text} onClick={() => mark(c.text, "done")}>Marcar hecho</Button>}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
