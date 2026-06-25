"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, SectionTitle, StageBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { getMemberTeam, setMyCommitmentStatus } from "@/lib/repository";
import { useMemberTeam } from "@/lib/member/team";
import { useToast } from "@/components/Toast";
import { getMyOpenSession, subscribeTeamSessions, type LiveSession } from "@/lib/session";
import { teamLiveStage } from "@/lib/data";
import { loopThread } from "@/lib/loop";
import { ciMaturity } from "@/lib/maturity";
import { getReviewsForTeam, type TalentReview } from "@/lib/talent";

export default function MemberHome() {
  const router = useRouter();
  const { show } = useToast();
  const { user } = useAuth();
  const { teamId } = useMemberTeam();
  const team = getMemberTeam(teamId);
  const firstName = (user?.name ?? "").split(" ")[0] || "miembro";
  const [live, setLive] = useState<LiveSession | null>(null);
  const [openReviews, setOpenReviews] = useState<TalentReview[]>([]);
  const [, setTick] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!team?.id) return; const tid = team.id;
    let active = true;
    const load = async () => { const s = await getMyOpenSession(); if (active) setLive(s); };
    load();
    (async () => { const rs = (await getReviewsForTeam(tid)).filter((r) => r.status === "open"); if (active) setOpenReviews(rs); })();
    const unsub = subscribeTeamSessions(tid, load);
    const poll = setInterval(load, 3000);
    return () => { active = false; unsub(); clearInterval(poll); };
  }, [team?.id]);

  if (!team) {
    return <div className="screen-pad"><Card pad={24}><p className="muted">Todavía no estás asignado a un equipo. Pedile a tu facilitador que te invite.</p></Card></div>;
  }

  const inits = team.initiatives ?? [];
  const activeInits = inits.filter((i) => i.status === "active");

  // Mis compromisos: las acciones de los loops activos asignadas a mí (por nombre).
  const myName = (user?.name ?? "").toLowerCase().trim();
  const firstLower = firstName.toLowerCase();
  const myCommits: { initId: string; text: string; status: string }[] = [];
  for (const i of activeInits) {
    const d = i.data ?? {};
    const statusBy = new Map((d.follow?.actionStatus ?? []).map((a) => [a.text, a.status]));
    const seen = new Set<string>();
    for (const a of [...(d.proof?.actions ?? []), ...(d.follow?.newActions ?? [])]) {
      const text = (a.text ?? "").trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      const who = (a.who ?? "").toLowerCase();
      if (who && (who.includes(firstLower) || (myName && who.includes(myName)))) {
        myCommits.push({ initId: i.id, text, status: statusBy.get(text) ?? "pending" });
      }
    }
  }
  const mark = async (initId: string, text: string, status: string) => {
    const key = `${initId}:${text}`;
    setBusy(key);
    const { error } = await setMyCommitmentStatus(initId, text, status);
    setBusy(null);
    if (error) { show("No se pudo guardar (¿falta la RPC en la base?).", "TriangleAlert"); return; }
    setTick((t) => t + 1);
  };

  // Nuestro progreso: loops activos con su hilo (señal).
  const progress = activeInits.map((i) => ({ init: i, thread: loopThread(i) }));
  const maturity = ciMaturity(team);

  const asyncOpen = live && (live.result as { async?: boolean } | undefined)?.async;
  const asyncUntil = asyncOpen ? (live!.result as { asyncUntil?: string }).asyncUntil : undefined;
  const asyncDays = asyncUntil ? Math.max(0, Math.ceil((new Date(asyncUntil).getTime() - Date.now()) / 86400000)) : null;

  return (
    <div className="screen-pad">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Hola, {firstName} 👋</h1>
          <p className="muted" style={{ marginTop: 4 }}>{team.org} · {team.name}</p>
        </div>
        <button onClick={() => router.push("/join")} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 13px", borderRadius: "var(--r-md)", border: "1px solid var(--line-2)", background: "var(--card)", color: "var(--ink-1)", fontSize: "var(--t-sm)", fontWeight: 600 }}>
          <Icon name="QrCode" size={15} /> Unirse con un código
        </button>
      </div>

      {/* ── TU PARTE ── */}
      <div style={{ marginBottom: 22 }}>
        <SectionTitle icon="CircleUserRound" sub="Lo que está sobre vos">Tu parte</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
          {asyncOpen ? (
            <Card pad={16} style={{ background: "color-mix(in srgb, var(--info) 7%, var(--card))", borderColor: "color-mix(in srgb, var(--info) 40%, transparent)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ width: 34, height: 34, borderRadius: "var(--r-md)", background: "color-mix(in srgb, var(--info) 16%, transparent)", color: "var(--info)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="Clock" size={17} /></span>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 800, fontSize: "var(--t-sm)" }}>Hay un aporte pendiente</div>
                  <div className="muted" style={{ fontSize: "var(--t-xs)" }}>Sumá tu mirada cuando puedas{asyncDays != null ? `, cierra en ${asyncDays} ${asyncDays === 1 ? "día" : "días"}` : ""}.</div>
                </div>
                <Button variant="secondary" iconRight="ArrowRight" onClick={() => router.push(`/sala/${live!.id}`)}>Sumar</Button>
              </div>
            </Card>
          ) : live ? (
            <Card glow pad={16} style={{ background: "linear-gradient(180deg, rgba(0,232,122,0.12), var(--card))", borderColor: "color-mix(in srgb, var(--green) 45%, transparent)", animation: "glow-pulse 2s infinite" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ width: 10, height: 10, borderRadius: 99, background: "var(--green)", boxShadow: "0 0 8px var(--green)", animation: "glow-pulse 1.2s infinite" }} />
                <div style={{ flex: 1, minWidth: 160 }}><span style={{ fontWeight: 800, fontSize: "var(--t-sm)" }}>Sesión en vivo ahora</span></div>
                <Button iconRight="ArrowRight" onClick={() => router.push(`/sala/${live.id}`)}>Unirse</Button>
              </div>
            </Card>
          ) : null}

          {openReviews.map((r) => (
            <Card key={r.id} pad={16} style={{ background: "color-mix(in srgb, var(--violet) 6%, var(--card))", borderColor: "color-mix(in srgb, var(--violet) 35%, transparent)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ width: 32, height: 32, borderRadius: "var(--r-md)", background: "color-mix(in srgb, var(--violet) 16%, transparent)", color: "var(--violet)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="Radar" size={16} /></span>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>Hay una evaluación 360 abierta</div>
                  <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{r.subjectUserId === user?.id ? "Tu autoevaluación" : "Evaluá a tu compañero/a (anónimo)"}.</div>
                </div>
                <Button variant="secondary" iconRight="ArrowRight" onClick={() => router.push(`/360/${r.id}`)}>Evaluar</Button>
              </div>
            </Card>
          ))}

          <Card pad={16}>
            <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: myCommits.length ? 10 : 0 }}><Icon name="ListChecks" size={13} /> Mis compromisos</div>
            {myCommits.length === 0
              ? <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>No tenés compromisos asignados ahora mismo.</p>
              : <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {myCommits.map((c, i) => {
                    const done = c.status === "done";
                    const key = `${c.initId}:${c.text}`;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", background: "var(--card-2)", border: "1px solid var(--line)", borderLeft: `3px solid ${done ? "var(--success)" : "var(--st-follow)"}`, borderRadius: "var(--r-md)" }}>
                        <span style={{ flex: 1, minWidth: 0, fontSize: "var(--t-sm)", textDecoration: done ? "line-through" : "none", opacity: done ? 0.7 : 1 }}>{c.text}</span>
                        {done
                          ? <button disabled={busy === key} onClick={() => mark(c.initId, c.text, "pending")} className="muted" style={{ fontSize: "var(--t-xs)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Check" size={13} style={{ color: "var(--success)" }} /> hecho · deshacer</button>
                          : <Button size="sm" variant="secondary" icon={busy === key ? "Loader" : "Check"} disabled={busy === key} onClick={() => mark(c.initId, c.text, "done")}>Marcar hecho</Button>}
                      </div>
                    );
                  })}
                </div>}
          </Card>
        </div>
      </div>

      {/* ── NUESTRO PROGRESO ── */}
      <div style={{ marginBottom: 22 }}>
        <SectionTitle icon="TrendingUp" sub="Lo que estamos logrando como equipo">Nuestro progreso</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
          <Card pad={16}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", justifyContent: "space-between" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><StageBadge stage={teamLiveStage(team) ?? "queue"} size="sm" /></span>
              <span style={{ fontSize: "var(--t-sm)" }}><Icon name="Gauge" size={14} style={{ color: "var(--green)" }} /> Madurez: <b style={{ color: "var(--green)" }}>{maturity.overallLabel}</b></span>
              <span className="muted" style={{ fontSize: "var(--t-sm)" }}><b className="num" style={{ color: "var(--ink-0)" }}>{team.sessions.length}</b> sesiones</span>
            </div>
          </Card>
          {progress.length > 0 && (
            <Card pad={16}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>Loops en curso</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {progress.map(({ init, thread }) => {
                  const sig = thread.signal;
                  return (
                    <div key={init.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--t-sm)" }}>
                      <Icon name="RefreshCw" size={14} style={{ color: "var(--green)", flexShrink: 0 }} />
                      <span style={{ flex: 1, minWidth: 0, fontWeight: 600 }}>{init.title}</span>
                      {sig?.now && (
                        <span className="num" style={{ fontSize: "var(--t-xs)", fontWeight: 700, color: sig.delta != null && sig.delta > 0 ? "var(--success)" : sig.delta != null && sig.delta < 0 ? "var(--risk)" : "var(--ink-2)" }}>
                          {sig.now}{sig.delta != null && sig.delta !== 0 ? ` ${sig.delta > 0 ? "▲" : "▼"}${sig.delta > 0 ? "+" : ""}${sig.delta}` : ""}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
          <button onClick={() => router.push("/member/biblioteca")} style={{ textAlign: "left" }}>
            <Card pad={16} hover style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <div style={{ width: 38, height: 38, borderRadius: "var(--r-md)", background: "var(--card-2)", color: "var(--green)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="BookOpen" size={19} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>El relato del equipo</div>
                <div className="muted" style={{ fontSize: "var(--t-xs)" }}>La historia de lo que vienen mejorando</div>
              </div>
              <Icon name="ChevronRight" size={16} style={{ color: "var(--ink-3)" }} />
            </Card>
          </button>
        </div>
      </div>

      {/* ── MI CRECIMIENTO ── */}
      <div>
        <SectionTitle icon="Sprout" sub="Tu desarrollo dentro del equipo">Mi crecimiento</SectionTitle>
        <button onClick={() => router.push("/member/desarrollo")} style={{ textAlign: "left", width: "100%", marginTop: 10 }}>
          <Card pad={18} hover style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer", background: "linear-gradient(180deg, color-mix(in srgb, var(--violet) 7%, var(--card)), var(--card))", borderColor: "color-mix(in srgb, var(--violet) 28%, var(--line))" }}>
            <div style={{ width: 42, height: 42, borderRadius: "var(--r-md)", background: "color-mix(in srgb, var(--violet) 16%, transparent)", color: "var(--violet)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="Radar" size={21} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>Mi desarrollo</div>
              <div className="muted" style={{ fontSize: "var(--t-xs)" }}>Tu 360 (cómo te ve el equipo) y tus 1-a-1</div>
            </div>
            <Icon name="ChevronRight" size={16} style={{ color: "var(--ink-3)" }} />
          </Card>
        </button>
      </div>
    </div>
  );
}
