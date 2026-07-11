"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, SectionTitle, Sparkline, StageBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { getMemberTeam, setMyCommitmentStatus } from "@/lib/repository";
import { useMemberTeam } from "@/lib/member/team";
import { useToast } from "@/components/Toast";
import { getMyOpenSession, subscribeTeamSessions, type LiveSession } from "@/lib/session";
import { teamLiveStage, overallOf } from "@/lib/data";
import { loopThread } from "@/lib/loop";
import { ciMaturity } from "@/lib/maturity";
import { getReviewsForTeam, type TalentReview } from "@/lib/talent";
import { MemberVoice } from "@/components/member/MemberVoice";
import { IdeaBoard } from "@/components/member/IdeaBoard";
import { KudosWall } from "@/components/member/KudosWall";
import { StreakGrid } from "@/components/StreakGrid";
import { AuroraBackground } from "@/components/AuroraBackground";
import { myCommitments } from "@/lib/member/commitments";
import { teamProgress } from "@/lib/gamification";

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
  const [ideaKey, setIdeaKey] = useState(0);

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

  // Mis compromisos: las acciones de los loops activos asignadas a mí.
  const myCommits = myCommitments(activeInits, user?.name);
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
  const prog = teamProgress(team);
  const climaSeries = team.pulse.map(overallOf);
  const climaNow = climaSeries.length ? climaSeries[climaSeries.length - 1] : null;
  const climaUp = climaSeries.length >= 2 ? climaNow! - climaSeries[climaSeries.length - 2] : 0;

  const asyncOpen = live && (live.result as { async?: boolean } | undefined)?.async;
  const asyncUntil = asyncOpen ? (live!.result as { asyncUntil?: string }).asyncUntil : undefined;
  const asyncDays = asyncUntil ? Math.max(0, Math.ceil((new Date(asyncUntil).getTime() - Date.now()) / 86400000)) : null;

  return (
    <div className="screen-pad" style={{ position: "relative" }}>
      <AuroraBackground intensity={0.6} />
      <div style={{ position: "relative", zIndex: 1 }}>
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
            <Card glow pad={16} className="gl-live-border" style={{ background: "linear-gradient(180deg, rgba(0,232,122,0.12), var(--card))", borderColor: "color-mix(in srgb, var(--green) 45%, transparent)" }}>
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
          <Card pad={16} style={{ background: "linear-gradient(180deg, rgba(0,232,122,0.08), var(--card))", borderColor: "color-mix(in srgb, var(--green) 30%, var(--line))" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ width: 40, height: 40, borderRadius: "var(--r-md)", background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="Trophy" size={20} /></div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontWeight: 800, fontSize: "var(--t-sm)" }}>{prog.level.name}</div>
                <div className="muted" style={{ fontSize: "var(--t-xs)" }}>Nivel del equipo · <b className="num" style={{ color: "var(--ink-1)" }}>{prog.xp}</b> XP{prog.cycles > 0 ? ` · ${prog.cycles} ${prog.cycles === 1 ? "ciclo cerrado" : "ciclos cerrados"}` : ""}</div>
              </div>
              {prog.streak > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--t-xs)", fontWeight: 800, color: "var(--warning)", padding: "4px 9px", borderRadius: "var(--r-full)", background: "var(--warning-bg)" }}><Icon name="Flame" size={13} /> Racha {prog.streak}</span>}
            </div>
            {prog.level.next != null && (
              <div style={{ marginTop: 12 }}>
                <div style={{ height: 7, borderRadius: 99, background: "var(--card-2)", overflow: "hidden" }}><div style={{ width: `${prog.pct}%`, height: "100%", background: "var(--green)", borderRadius: 99 }} /></div>
                <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 5 }}>Faltan <b className="num" style={{ color: "var(--ink-1)" }}>{prog.toNext}</b> XP para <b style={{ color: "var(--ink-1)" }}>subir de nivel</b></div>
              </div>
            )}
            {prog.mission && <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)", fontSize: "var(--t-sm)" }}><Icon name="Target" size={14} style={{ color: "var(--green)", flexShrink: 0 }} /><span className="muted">Próximo paso del equipo:</span> <b>{prog.mission.label}</b></div>}
            {prog.unlocked.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                {prog.unlocked.slice(0, 6).map((a) => (
                  <span key={a.key} title={a.desc} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "var(--t-xs)", fontWeight: 700, padding: "4px 9px", borderRadius: "var(--r-full)", background: "var(--card-2)", border: "1px solid var(--line)" }}><Icon name={a.icon} size={12} style={{ color: "var(--green)" }} /> {a.label}</span>
                ))}
              </div>
            )}
          </Card>
          <Card pad={16}>
            <StreakGrid dates={[...team.sessions.map((s) => s.createdAt), ...team.pulse.map((p) => p.date)]} />
          </Card>
          <Card pad={16}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", justifyContent: "space-between" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><StageBadge stage={teamLiveStage(team) ?? "queue"} size="sm" /></span>
              <span style={{ fontSize: "var(--t-sm)" }}><Icon name="Gauge" size={14} style={{ color: "var(--green)" }} /> Madurez: <b style={{ color: "var(--green)" }}>{maturity.overallLabel}</b></span>
              <span className="muted" style={{ fontSize: "var(--t-sm)" }}><b className="num" style={{ color: "var(--ink-0)" }}>{team.sessions.length}</b> sesiones</span>
            </div>
            {climaNow != null && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="eyebrow" style={{ marginBottom: 2 }}>Cómo venimos · clima</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span className="num" style={{ fontSize: "var(--t-xl)", fontWeight: 800 }}>{climaNow}</span>
                    {climaUp !== 0 && <span style={{ fontSize: "var(--t-xs)", fontWeight: 700, color: climaUp > 0 ? "var(--success)" : "var(--risk)" }}>{climaUp > 0 ? "▲ +" : "▼ "}{climaUp}</span>}
                  </div>
                </div>
                <Sparkline data={climaSeries.length > 1 ? climaSeries : [...climaSeries, ...climaSeries]} color="var(--green)" w={120} h={34} />
              </div>
            )}
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

      {/* ── RECONOCIMIENTO ── */}
      <div style={{ marginTop: 22 }}>
        <SectionTitle icon="Award" sub="Lo que el equipo valora de cada uno">Reconocimiento</SectionTitle>
        <div style={{ marginTop: 10 }}>
          <KudosWall teamId={team.id} members={team.members} facilitator={team.facilitator} currentUserId={user?.id} />
        </div>
      </div>

      {/* ── MI VOZ + BANCO DE IDEAS ── */}
      <div style={{ marginTop: 22 }}>
        <SectionTitle icon="Megaphone" sub="Lo que ves desde tu lugar alimenta la mejora">Mi voz y las ideas del equipo</SectionTitle>
        <div style={{ marginTop: 10 }}>
          <MemberVoice teamId={team.id} onSubmitted={(k) => { if (k === "idea") setIdeaKey((n) => n + 1); }} />
        </div>
        <div style={{ marginTop: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Icon name="Lightbulb" size={13} style={{ color: "var(--st-proof)" }} /> Banco de ideas del equipo</div>
          <IdeaBoard teamId={team.id} refreshKey={ideaKey} />
        </div>
      </div>
      </div>
    </div>
  );
}
