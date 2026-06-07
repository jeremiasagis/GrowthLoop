"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Logo } from "@/components/AppShell";
import { Avatar, Bar, Button, Card, Pill } from "@/components/ui";
import { SessionTimer } from "@/components/session/Timer";
import { useAuth } from "@/lib/auth/AuthContext";
import { getInitiatives, getTeam } from "@/lib/repository";
import { retroByKey } from "@/lib/retros";
import { useToast } from "@/components/Toast";
import { PULSE_DIMS, FOUNDING_QUESTIONS } from "@/lib/data";
import {
  addCard, addVote, assignCardToCluster, averagePulse, closeSession, createCluster, deleteCluster,
  finalizeSession, getCardCounts, getCards, getClusters, getInputs, getMyCards, getParticipants,
  getPulseResponses, getSession, getVotes, hasResponded, joinSession, removeVote,
  renameCluster, setMyInput, setResult, setStep, submitPulse, subscribeSession,
  type LiveSession, type Participant, type PulseResponse, type SessionCard, type SessionCluster, type SessionInput, type SessionVote,
} from "@/lib/session";

const COLS = [
  { key: "works", label: "Lo que funciona", color: "var(--success)", icon: "ThumbsUp" },
  { key: "blocks", label: "Lo que nos traba", color: "var(--warning)", icon: "Construction" },
  { key: "unsaid", label: "Lo que nadie dice", color: "var(--violet)", icon: "EyeOff" },
] as const;
// Exploración rica — fase Propósito (3 preguntas, público) y fase Flujo (embudo de 4 etapas)
const PURPOSE_COLS = [
  { key: "pa", label: "¿Para qué existe el equipo?" },
  { key: "pb", label: "¿Quién depende de nuestro trabajo?" },
  { key: "pc", label: "¿Cómo sabe que hicimos un buen trabajo?" },
];
const FLOW_COLS = [
  { key: "fin", label: "Entrada", icon: "LogIn", color: "var(--st-explore)", sub: "¿Cómo llega el trabajo?" },
  { key: "fstart", label: "Arranque", icon: "Play", color: "var(--success)", sub: "¿Qué hacemos primero?" },
  { key: "fexec", label: "Ejecución", icon: "Cog", color: "var(--warning)", sub: "¿Dónde se traba?" },
  { key: "fdeliver", label: "Entrega", icon: "PackageCheck", color: "var(--violet)", sub: "¿Cómo sabemos que terminó bien?" },
];
const STEPS = ["pulse", "pulse_reveal", "cards", "cards_reveal", "cluster", "vote", "purpose", "purpose_reveal", "purpose_decide", "flow", "flow_reveal", "flow_vote", "close"];
const DOTS_PER = 2;
// Secuencia de pasos por tipo de sesión (para el indicador de progreso y "volver atrás").
const STEP_SEQ: Record<string, string[]> = {
  founding: ["welcome", "contract", "sign", "close"],
  consolidate: ["report", "decide", "close"],
  explore: STEPS,
  focus: ["causes", "causes_reveal", "vote", "deepen", "close"],
  proof: ["ideas", "ideas_reveal", "vote", "premortem", "premortem_reveal", "bet", "commit", "close"],
  follow: ["progress", "blockers", "blockers_reveal", "decide", "close"],
  learn: ["result", "reflect", "learnings", "learnings_reveal", "decision", "close"],
};

function Shell({ onExit, children }: { onExit?: () => void; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "radial-gradient(1100px 520px at 50% -160px, rgba(0,232,122,0.10), transparent), var(--bg-1)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid var(--line)" }}>
        {onExit ? <button onClick={onExit} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--ink-2)", fontSize: "var(--t-sm)", fontWeight: 600 }}><Icon name="X" size={18} /> Salir</button> : <span style={{ width: 60 }} />}
        <Logo />
        <span style={{ width: 60 }} />
      </header>
      <main style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 20px 80px" }}>{children}</main>
    </div>
  );
}

export default function SalaPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { show } = useToast();

  const [session, setSession] = useState<LiveSession | null>(null);
  const [responses, setResponses] = useState<PulseResponse[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [myCards, setMyCards] = useState<SessionCard[]>([]);
  const [allCards, setAllCards] = useState<SessionCard[]>([]);
  const [clusters, setClusters] = useState<SessionCluster[]>([]);
  const [votes, setVotes] = useState<SessionVote[]>([]);
  const [inputs, setInputs] = useState<SessionInput[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState<PulseResponse>({ confianza: 60, comunic: 60, claridad: 60, foco: 60, seguridad: 60 });
  const [cardDraft, setCardDraft] = useState<Record<string, string>>({ works: "", blocks: "", unsaid: "" });
  const [anon, setAnon] = useState(true);
  const [sel, setSel] = useState<string[]>([]);
  const [iceDraft, setIceDraft] = useState<Record<string, { i: number; c: number; e: number }>>({});
  const joinedRef = useRef(false);
  const [now, setNow] = useState(() => Date.now());
  const sessionId = params.sessionId;

  const load = async () => {
    const s = await getSession(sessionId);
    setSession(s);
    if (s) {
      const [r, p, c, cl, v] = await Promise.all([
        getPulseResponses(sessionId), getParticipants(sessionId), getCardCounts(sessionId),
        getClusters(sessionId), getVotes(sessionId),
      ]);
      setResponses(r); setParticipants(p); setCounts(c); setClusters(cl); setVotes(v);
      setInputs(await getInputs(sessionId));
      if (user) { setSubmitted(await hasResponded(sessionId, user.id)); setMyCards(await getMyCards(sessionId, user.id)); }
      const needsAll = ["cards_reveal", "cluster", "vote", "close", "purpose_reveal", "purpose_decide", "flow", "flow_reveal", "flow_vote", "premortem_reveal", "causes_reveal", "ideas_reveal", "blockers_reveal", "learnings_reveal", "ice", "problems_reveal", "rate", "funnel_reveal", "funnel_vote", "risks_reveal", "mitigate", "plan", "process_reveal", "adjust", "answers_reveal", "decide", "perceptions_reveal", "gap", "relations_reveal"].includes(s.stepKey ?? "");
      setAllCards(needsAll ? await getCards(sessionId) : []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const unsub = subscribeSession(sessionId, load);
    // Respaldo: si Realtime no entrega (p.ej. RLS), igual sincronizamos cada ~2.5s.
    const poll = setInterval(load, 2000);
    return () => { unsub(); clearInterval(poll); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (user && !joinedRef.current) { joinedRef.current = true; joinSession(sessionId, user.name, user.initials); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  if (loading) return <Shell><span className="muted">Cargando sesión…</span></Shell>;
  if (!user) return <Shell><Card pad={24}><p className="muted">Iniciá sesión para entrar a la sala.</p></Card></Shell>;
  if (!session) return <Shell onExit={() => router.back()}><Card pad={24}><p className="muted">La sesión no existe.</p></Card></Shell>;

  const team = getTeam(session.teamId);
  const initiative = session.initiativeId ? getInitiatives(session.teamId).find((i) => i.id === session.initiativeId) : undefined;
  const focusPriority = (initiative?.data?.focus as { priority?: string } | undefined)?.priority;
  const subject = focusPriority || (initiative?.data?.explore?.priority as string) || initiative?.title || "la tensión priorizada";
  const isFacil = user.role !== "member";
  const step = session.stepKey ?? "pulse";
  const closed = session.status === "closed";
  const avg = averagePulse(responses);
  const overall = Math.round((avg.confianza + avg.comunic + avg.claridad + avg.foco + avg.seguridad) / 5);
  const totalInRoom = participants.length;
  const totalCards = Object.values(counts).reduce((a, b) => a + b, 0);
  const myIds = new Set(myCards.map((c) => c.id));
  const votesByCluster: Record<string, number> = {};
  votes.forEach((v) => { votesByCluster[v.clusterId] = (votesByCluster[v.clusterId] ?? 0) + 1; });
  const myVoteCount = votes.filter((v) => v.userId === user.id).length;
  const remaining = DOTS_PER - myVoteCount;
  const ranked = [...clusters].sort((a, b) => (votesByCluster[b.id] ?? 0) - (votesByCluster[a.id] ?? 0));
  const cardsOf = (cid: string) => allCards.filter((c) => c.clusterId === cid);
  const loose = allCards.filter((c) => !c.clusterId);
  const colMeta = (key: string) => COLS.find((c) => c.key === key) ?? COLS[0];
  // Exploración — fases Propósito y Flujo
  const purposeText = (session.result.purpose as string) ?? "";
  const flowVotes: Record<string, number> = {};
  inputs.forEach((i) => { if (i.key === "critical") { const s = (i.value as { stage?: string })?.stage; if (s) flowVotes[s] = (flowVotes[s] ?? 0) + 1; } });
  const flowRanked = [...FLOW_COLS].sort((a, b) => (flowVotes[b.key] ?? 0) - (flowVotes[a.key] ?? 0));
  const criticalStage = (session.result.critical as string) || flowRanked[0]?.key;
  const criticalMeta = FLOW_COLS.find((f) => f.key === criticalStage);
  const myCritical = (inputs.find((i) => i.userId === user.id && i.key === "critical")?.value as { stage?: string })?.stage;
  // Si el facilitador sale de una sesión en vivo (sin haberla cerrado), la cerramos:
  // no hay nadie conduciendo, así que deja de estar "iniciada" para los miembros.
  const exit = () => {
    if (isFacil && session.status === "live") { closeSession(sessionId); }
    router.push(isFacil ? `/equipos/${session.teamId}` : "/member");
  };

  if (closed) {
    return (
      <Shell onExit={exit}>
        <Card pad={28} style={{ textAlign: "center", maxWidth: 440 }}>
          <div style={{ width: 56, height: 56, borderRadius: "var(--r-lg)", background: "var(--success-bg)", color: "var(--green)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}><Icon name={user?.role === "member" ? "PartyPopper" : "Check"} size={28} /></div>
          <h2 style={{ fontSize: "var(--t-xl)", fontWeight: 800 }}>{user?.role === "member" ? "¡Gracias por participar!" : "La sesión terminó"}</h2>
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 6, marginBottom: 18 }}>{user?.role === "member" ? "Lo que trabajaron quedó guardado en el equipo. ¡Nos vemos en la próxima sesión! 👋" : "Lo trabajado quedó guardado en el equipo."}</p>
          <Button full icon="ArrowLeft" onClick={exit}>Volver</Button>
        </Card>
      </Shell>
    );
  }

  const retroLabel = retroByKey(session.retro)?.name;
  const copyShare = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* sin portapapeles */ }
  };
  const Header = (sub: string) => (
    <div style={{ textAlign: "center", marginBottom: 24 }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ width: 9, height: 9, borderRadius: 99, background: "var(--green)", boxShadow: "0 0 8px var(--green)", animation: "glow-pulse 1.4s infinite" }} />
        <span className="eyebrow" style={{ color: "var(--green)" }}>{retroLabel ?? "Sesión en vivo"}</span>
      </div>
      <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>{team?.name ?? "Equipo"}</h1>
      <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 4 }}>{sub}</p>
      {isFacil && (
        <button onClick={copyShare} style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: "var(--r-full)", border: `1px solid ${copied ? "var(--green)" : "var(--line-2)"}`, background: copied ? "var(--success-bg)" : "var(--card)", color: copied ? "var(--green)" : "var(--ink-1)", fontSize: "var(--t-sm)", fontWeight: 600 }}>
          <Icon name={copied ? "Check" : "Link"} size={15} /> {copied ? "Link copiado" : "Copiar link para invitar"}
        </button>
      )}
    </div>
  );

  const Averages = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {PULSE_DIMS.map((d) => (
        <div key={d.key}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
            <span style={{ fontSize: "var(--t-sm)", fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: d.color }} />{d.label}</span>
            <span className="num" style={{ fontWeight: 700, color: d.color }}>{avg[d.key]}</span>
          </div>
          <Bar value={avg[d.key]} color={d.color} glow />
        </div>
      ))}
    </div>
  );

  const RevealedCards = (
    <div className="cards-cols" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
      {COLS.map((col) => {
        const cards = allCards.filter((c) => c.columnKey === col.key);
        return (
          <div key={col.key} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ color: col.color }}><Icon name={col.icon} size={16} /></span>
              <span style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{col.label}</span>
              <span className="num" style={{ marginLeft: "auto", fontSize: "var(--t-xs)", color: "var(--ink-2)" }}>{cards.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {cards.map((c, i) => (
                <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${col.color}`, borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)", lineHeight: 1.4, animation: `pop-in .4s var(--spring) ${i * 0.04}s both` }}>
                  {c.text}
                  <div style={{ marginTop: 5, display: "flex", gap: 6, alignItems: "center" }}>
                    {!c.anonymous && c.authorId ? <span className="muted" style={{ fontSize: 10 }}>· {participants.find((p) => p.userId === c.authorId)?.name ?? "miembro"}</span> : <span className="faint" style={{ fontSize: 10, display: "inline-flex", alignItems: "center", gap: 3 }}><Icon name="Lock" size={10} /> anónima</span>}
                    {myIds.has(c.id) && <span style={{ fontSize: 10, color: "var(--ink-3)" }}>· tuya</span>}
                  </div>
                </div>
              ))}
              {!cards.length && <div style={{ color: "var(--ink-3)", fontSize: "var(--t-xs)", textAlign: "center", padding: 16 }}>Sin tarjetas</div>}
            </div>
          </div>
        );
      })}
    </div>
  );

  const ClustersView = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 12 }}>
      {clusters.map((cl) => (
        <Card key={cl.id} pad={14}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ color: "var(--green)" }}><Icon name="Layers" size={16} /></span>
            <span style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{cl.name}</span>
            <span className="num" style={{ marginLeft: "auto", fontSize: "var(--t-xs)", color: "var(--ink-2)" }}>{cardsOf(cl.id).length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {cardsOf(cl.id).map((c) => { const cm = colMeta(c.columnKey); return (
              <div key={c.id} style={{ fontSize: "var(--t-xs)", color: "var(--ink-1)", padding: "6px 8px", background: "var(--card-2)", borderRadius: "var(--r-sm)", borderLeft: `2px solid ${cm.color}` }}>{c.text}</div>
            ); })}
          </div>
        </Card>
      ))}
      {!clusters.length && <p className="muted" style={{ fontSize: "var(--t-sm)" }}>El facilitador está agrupando las tarjetas en tensiones…</p>}
    </div>
  );

  const RankedMap = (
    <Card pad={0} style={{ overflow: "hidden" }}>
      {ranked.map((cl, i) => (
        <div key={cl.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: i < ranked.length - 1 ? "1px solid var(--line)" : "none", background: i === 0 ? "linear-gradient(90deg, var(--green-soft), transparent)" : "transparent" }}>
          <span className="num" style={{ fontSize: "var(--t-lg)", fontWeight: 700, color: i === 0 ? "var(--green)" : "var(--ink-3)" }}>{i + 1}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>{cl.name}</div>
            <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{cardsOf(cl.id).length} señales</div>
          </div>
          <span className="num" style={{ fontWeight: 700, color: i === 0 ? "var(--green)" : "var(--ink-1)" }}>{votesByCluster[cl.id] ?? 0}</span>
          <Icon name="Vote" size={15} style={{ color: "var(--ink-3)" }} />
          {i === 0 && <Pill color="var(--green)" bg="var(--success-bg)">prioridad</Pill>}
        </div>
      ))}
      {!ranked.length && <div style={{ padding: 20, textAlign: "center", color: "var(--ink-3)", fontSize: "var(--t-sm)" }}>Sin tensiones</div>}
    </Card>
  );

  // helpers de escritura/revelado multi-columna (reusados por varias retros)
  const MultiWrite = (cols: { key: string; label: string }[], color: string, editable = true, anonymous = true) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
      {cols.map((col) => {
        const mine = myCards.filter((c) => c.columnKey === col.key);
        const n = counts[col.key] ?? 0;
        const add = async () => { const t = (cardDraft[col.key] ?? "").trim(); if (!t) return; await addCard(sessionId, col.key, t, anonymous); setCardDraft((d) => ({ ...d, [col.key]: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
        return (
          <div key={col.key} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 12, display: "flex", flexDirection: "column", minHeight: 200 }}>
            <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 8 }}>{col.label} <span className="num muted" style={{ fontSize: "var(--t-xs)" }}>{n}</span></div>
            {editable ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>{mine.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${color}`, borderRadius: "var(--r-sm)", padding: "7px 9px", fontSize: "var(--t-xs)" }}>{c.text}</div>)}</div>
                <div style={{ marginTop: 8, display: "flex", gap: 5 }}><input value={cardDraft[col.key] ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, [col.key]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Sumar…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "6px 8px", fontSize: "var(--t-xs)", outline: "none" }} /><button onClick={add} style={{ background: color, color: "#08120c", borderRadius: "var(--r-sm)", padding: "0 9px", display: "grid", placeItems: "center" }}><Icon name="Plus" size={14} /></button></div>
              </>
            ) : (
              <div style={{ flex: 1, display: "grid", placeItems: "center", color: "var(--ink-3)", fontSize: "var(--t-xs)", textAlign: "center", gap: 6, minHeight: 120 }}><Icon name="Lock" size={16} /><span className="num" style={{ fontSize: "var(--t-xl)", fontWeight: 800, color: "var(--ink-1)" }}>{n}</span>{n === 1 ? "respuesta · oculta" : "respuestas · ocultas"}</div>
            )}
          </div>
        );
      })}
    </div>
  );
  const MultiReveal = (cols: { key: string; label: string }[], showAuthor = false) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
      {cols.map((col) => <div key={col.key} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 12 }}><div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 8 }}>{col.label}</div><div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{allCards.filter((c) => c.columnKey === col.key).map((c) => { const author = showAuthor && c.authorId ? participants.find((p) => p.userId === c.authorId)?.name : undefined; return <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-sm)", padding: "7px 9px", fontSize: "var(--t-xs)" }}>{c.text}{author && <span className="faint" style={{ fontSize: 10, marginLeft: 5 }}>· {author}</span>}</div>; })}</div></div>)}
    </div>
  );
  // ── Timer sincronizado por etapa (lo controla el facilitador, todos lo ven) ──
  const rawTimer = session.result.timer as { total?: number; endsAt?: number; remaining?: number; step?: string } | undefined;
  const timer = rawTimer && rawTimer.step === step ? rawTimer : undefined; // solo se ve en la etapa donde se lanzó
  const timerRunning = !!timer?.endsAt;
  const timerSecs = timer ? (timer.endsAt ? Math.max(0, Math.round((timer.endsAt - now) / 1000)) : (timer.remaining ?? 0)) : 0;
  const timerTotal = timer?.total ?? 0;
  const launchTimer = (mins: number) => setResult(sessionId, { timer: { total: mins * 60, endsAt: Date.now() + mins * 60 * 1000, step } });
  const toggleTimer = () => { if (!timer) return; if (timer.endsAt) setResult(sessionId, { timer: { total: timer.total, remaining: timerSecs, step } }); else setResult(sessionId, { timer: { total: timer.total, endsAt: Date.now() + (timer.remaining ?? 0) * 1000, step } }); };
  const addTimerMin = () => { if (!timer) return; if (timer.endsAt) setResult(sessionId, { timer: { total: (timer.total ?? 0) + 60, endsAt: (timer.endsAt ?? Date.now()) + 60000, step } }); else setResult(sessionId, { timer: { total: (timer.total ?? 0) + 60, remaining: (timer.remaining ?? 0) + 60, step } }); };
  const stopTimer = () => setResult(sessionId, { timer: null });
  // ── Progreso + volver atrás ──
  const seq = STEP_SEQ[session.type] ?? STEPS;
  const stepIdx = Math.max(0, seq.indexOf(step));
  const stepTotal = seq.length;
  const goBack = async () => { if (stepIdx <= 0) return; setBusy(true); await setStep(sessionId, seq[stepIdx - 1], stepIdx - 1); setBusy(false); };
  const facBar = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {isFacil && stepIdx > 0 && <button onClick={goBack} disabled={busy} title="Paso anterior" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--ink-2)", fontSize: "var(--t-xs)", fontWeight: 600, padding: "4px 8px", borderRadius: "var(--r-sm)", border: "1px solid var(--line-2)", background: "var(--card)" }}><Icon name="ChevronLeft" size={14} /> Volver</button>}
        <span className="muted num" style={{ fontSize: "var(--t-xs)" }}>Paso {stepIdx + 1} de {stepTotal}</span>
        <div style={{ flex: 1, height: 4, borderRadius: 99, background: "var(--card-2)", overflow: "hidden", minWidth: 60 }}><div style={{ height: "100%", width: `${((stepIdx + 1) / stepTotal) * 100}%`, background: "var(--green)", borderRadius: 99, transition: "width .4s var(--ease)" }} /></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex" }}>{participants.slice(0, 8).map((p, i) => <span key={p.userId} style={{ marginLeft: i ? -8 : 0 }}><Avatar name={p.name} initials={p.initials} size={28} idx={i} /></span>)}</div>
        <span className="muted num" style={{ fontSize: "var(--t-sm)" }}>{totalInRoom} en la sala</span>
        {isFacil && !timer && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span className="muted" style={{ fontSize: "var(--t-xs)", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Timer" size={14} /> Timer:</span>
            {[5, 10, 15, 30].map((m) => <button key={m} onClick={() => launchTimer(m)} style={{ padding: "4px 10px", borderRadius: "var(--r-full)", fontSize: "var(--t-xs)", fontWeight: 700, background: "var(--card)", border: "1px solid var(--line-2)", color: "var(--ink-1)" }}>{m}′</button>)}
          </div>
        )}
      </div>
      {timer && <SessionTimer secs={timerSecs} total={timerTotal} running={timerRunning} control={isFacil} onToggle={toggleTimer} onReset={stopTimer} onAdd={addTimerMin} />}
    </div>
  );

  // ════════ SESIÓN FUNDACIONAL · contrato (pantalla compartida) ════════
  if (session.type === "founding") {
    const answers = (session.result.answers as Record<string, string>) ?? {};
    const signerIds = new Set(inputs.filter((i) => i.key === "sign").map((i) => i.userId));
    const iSigned = signerIds.has(user.id);
    const signerNames = participants.filter((p) => signerIds.has(p.userId)).map((p) => p.name);
    const answeredCount = FOUNDING_QUESTIONS.filter((q) => (answers[q.key] ?? "").trim()).length;
    const taF: React.CSSProperties = { width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "10px 12px", fontSize: "var(--t-sm)", outline: "none", lineHeight: 1.5, resize: "vertical" };
    const fSteps = ["welcome", "contract", "sign", "close"];
    const fNext = async () => { const i = fSteps.indexOf(step); setBusy(true); await setStep(sessionId, fSteps[Math.min(fSteps.length - 1, i + 1)], i + 1); setBusy(false); };
    const fFinish = async () => {
      setBusy(true);
      const contract = { answers, signedBy: [...signerIds], signedNames: signerNames, date: new Date().toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" }) };
      await finalizeSession(session, { summaryText: `Contrato firmado por ${signerIds.size}`, teamData: { contract } });
      setBusy(false); exit();
    };
    const QuestionCards = (editable: boolean) => (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {FOUNDING_QUESTIONS.map((q, i) => (
          <Card key={q.key} pad={16}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span className="num" style={{ fontWeight: 800, color: "var(--st-explore)" }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{q.q}</div>
                <div className="muted" style={{ fontSize: "var(--t-xs)", marginBottom: 8 }}>{q.hint}</div>
                {editable
                  ? <textarea defaultValue={answers[q.key] ?? ""} onBlur={(e) => setResult(sessionId, { answers: { ...answers, [q.key]: e.target.value.trim() } })} rows={2} placeholder="El acuerdo del equipo…" style={taF} />
                  : <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.5, color: answers[q.key] ? "var(--ink-0)" : "var(--ink-3)" }}>{answers[q.key] || "Definiendo en equipo…"}</p>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );

    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (step === "welcome") {
      sub = "Antes de trabajar, acordamos cómo vamos a funcionar como equipo.";
      content = <Card pad={28} style={{ textAlign: "center" }}><div style={{ width: 56, height: 56, borderRadius: "var(--r-lg)", background: "color-mix(in srgb, var(--st-explore) 18%, transparent)", color: "var(--st-explore)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}><Icon name="Handshake" size={28} /></div><h2 style={{ fontSize: "var(--t-xl)", fontWeight: 800 }}>Sesión Fundacional</h2><p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 8 }}>Vamos a construir juntos el contrato del equipo y firmarlo entre todos.</p></Card>;
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Empezar el contrato</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador va a arrancar cuando estén todos.</p>;
    } else if (step === "contract") {
      wide = true;
      sub = isFacil ? "Facilitá la conversación y escribí el acuerdo de cada pregunta." : "El equipo está construyendo el contrato. Lo que se acuerda aparece acá.";
      content = QuestionCards(isFacil);
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || answeredCount === 0} onClick={fNext}>Pasar a la firma ({answeredCount}/{FOUNDING_QUESTIONS.length})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador escribe lo que acuerdan. Fijate que te represente.</p>;
    } else if (step === "sign") {
      wide = true;
      sub = "Leé el contrato del equipo. Si estás de acuerdo, firmalo.";
      content = (
        <>
          {QuestionCards(false)}
          <div style={{ marginTop: 14, padding: "12px 14px", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}><span className="eyebrow">Firmas</span><span className="num" style={{ fontWeight: 800, color: "var(--green)" }}>{signerIds.size}/{totalInRoom}</span></div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{signerNames.map((n) => <Pill key={n} color="var(--green)" bg="var(--success-bg)" icon="PenLine">{n}</Pill>)}{!signerNames.length && <span className="muted" style={{ fontSize: "var(--t-sm)" }}>Esperando firmas…</span>}</div>
          </div>
        </>
      );
      controls = (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {iSigned
            ? <div style={{ textAlign: "center", color: "var(--green)", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Icon name="CircleCheck" size={20} /> Firmaste el contrato</div>
            : <Button full size="lg" icon="PenLine" disabled={busy} onClick={() => setMyInput(sessionId, "sign", { ok: true })}>Firmo este contrato</Button>}
          {isFacil && <Button full size="lg" variant={iSigned ? "primary" : "secondary"} icon="Check" disabled={busy || signerIds.size === 0} onClick={fFinish}>{busy ? "Guardando…" : "Cerrar y guardar el contrato"}</Button>}
          {!isFacil && <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-xs)" }}>El facilitador cierra cuando estén las firmas.</p>}
        </div>
      );
    } else {
      sub = "¡Contrato firmado! Ya pueden arrancar con su primera iniciativa.";
      content = QuestionCards(false);
      controls = isFacil ? <Button full size="lg" icon="ArrowLeft" onClick={exit}>Volver al equipo</Button> : null;
    }

    return (
      <Shell onExit={exit}>
        <div style={{ width: "100%", maxWidth: wide ? 720 : 560 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ CONSOLIDACIÓN · micro-sesión a 30 días ════════
  if (session.type === "consolidate") {
    const R = session.result;
    const outcome = (R.outcome as string) ?? "";
    const cnote = (R.cnote as string) ?? "";
    const bet = initiative?.data?.proof as { betThen?: string } | undefined;
    const change = bet?.betThen || initiative?.title || "el cambio probado";
    const CONS = [{ k: "habit", l: "Se volvió hábito", c: "var(--success)", i: "Anchor", d: "Ya es parte de cómo trabajamos" }, { k: "partial", l: "Parcial", c: "var(--warning)", i: "CircleDot", d: "A veces sí, a veces no" }, { k: "lost", l: "Se perdió", c: "var(--risk)", i: "CircleX", d: "Volvimos a lo de antes" }];
    const ol = CONS.find((x) => x.k === outcome);
    const STUCK = [{ v: 0, l: "No se mantuvo" }, { v: 1, l: "A veces" }, { v: 2, l: "Sí, se mantuvo" }];
    const stuckVals = inputs.filter((i) => i.key === "stuck").map((i) => Number((i.value as { v?: number })?.v ?? 0));
    const stuckCount: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
    stuckVals.forEach((v) => { stuckCount[v] = (stuckCount[v] ?? 0) + 1; });

    const myStuck = (inputs.find((i) => i.userId === user.id && i.key === "stuck")?.value as { v?: number })?.v;
    const maxS = Math.max(1, ...STUCK.map((s) => stuckCount[s.v] ?? 0));
    const fSteps = ["report", "decide", "close"];
    const fNext = async () => { const i = fSteps.indexOf(step); setBusy(true); await setStep(sessionId, fSteps[Math.min(fSteps.length - 1, i + 1)], i + 1); setBusy(false); };
    const fFinish = async () => { setBusy(true); await finalizeSession(session, { summaryText: `Consolidación: ${ol?.l ?? "—"}`, dataKey: "consolidate", dataValue: { outcome, note: cnote, date: new Date().toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" }) }, noAdvance: true, status: "done" }); setBusy(false); exit(); };

    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "";
    if (step === "report") {
      const shown = !!session.result.stuckShown;
      sub = shown ? `Resultado: ¿se mantuvo "${change}"?` : `Pasaron ~30 días. ¿Se mantuvo "${change}"? Respondé. El conteo está oculto hasta que el facilitador lo muestre.`;
      content = (
        <Card pad={20}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {STUCK.map((s) => { const on = myStuck === s.v; return (
              <button key={s.v} onClick={() => { if (!shown) setMyInput(sessionId, "stuck", { v: s.v }); }} disabled={shown} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: "var(--r-md)", background: on ? "color-mix(in srgb, var(--st-learn) 14%, var(--card))" : "var(--card)", border: `1px solid ${on ? "var(--st-learn)" : "var(--line)"}`, textAlign: "left", cursor: shown ? "default" : "pointer" }}>
                <span style={{ color: on ? "var(--st-learn)" : "var(--ink-3)" }}><Icon name={on ? "CircleCheck" : "Circle"} size={17} /></span>
                <span style={{ flex: 1, fontSize: "var(--t-sm)", fontWeight: 600 }}>{s.l}</span>
                {shown && <><div style={{ width: 110 }}><Bar value={((stuckCount[s.v] ?? 0) / maxS) * 100} color="var(--st-learn)" height={7} /></div><span className="num" style={{ fontWeight: 700, width: 18, textAlign: "right" }}>{stuckCount[s.v] ?? 0}</span></>}
              </button>
            ); })}
          </div>
          <div className="muted" style={{ fontSize: "var(--t-sm)", textAlign: "center", marginTop: 12 }}>{!shown && <Icon name="EyeOff" size={13} />} {stuckVals.length} de {totalInRoom} respondieron</div>
        </Card>
      );
      controls = isFacil
        ? (shown ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Definir el resultado</Button> : <Button full size="lg" icon="Eye" disabled={busy} onClick={() => setResult(sessionId, { stuckShown: true })}>Mostrar respuestas ({stuckVals.length}/{totalInRoom})</Button>)
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador muestra el resultado y lo define con el equipo.</p>;
    } else if (step === "decide") {
      sub = "¿El cambio se consolidó? El facilitador lo define con el equipo.";
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 10 }}>
            {CONS.map((o) => { const on = outcome === o.k; const st: React.CSSProperties = { textAlign: "left", padding: 14, borderRadius: "var(--r-lg)", background: on ? `color-mix(in srgb, ${o.c} 14%, var(--card))` : "var(--card)", border: `1px solid ${on ? o.c : "var(--line-2)"}`, opacity: isFacil || on ? 1 : 0.5 }; const inner = (<><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: o.c }}><Icon name={o.i} size={18} /></span><span style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{o.l}</span>{on && <span style={{ marginLeft: "auto", color: o.c }}><Icon name="CheckCircle2" size={16} /></span>}</div><p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 4 }}>{o.d}</p></>); return isFacil ? <button key={o.k} onClick={() => setResult(sessionId, { outcome: o.k })} style={st}>{inner}</button> : <div key={o.k} style={st}>{inner}</div>; })}
          </div>
          {isFacil
            ? <textarea defaultValue={cnote} onBlur={(e) => setResult(sessionId, { cnote: e.target.value.trim() })} rows={3} placeholder="¿Qué ayudó o qué faltó para sostenerlo? Una nota para el equipo." style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-sm)", outline: "none", lineHeight: 1.5, resize: "vertical" }} />
            : cnote ? <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.5, padding: "0 4px" }}>{cnote}</p> : null}
        </div>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Check" disabled={busy || !outcome} onClick={fFinish}>{busy ? "Guardando…" : "Cerrar consolidación"}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador cierra cuando esté definido.</p>;
    } else {
      sub = "Consolidación del equipo.";
      content = <Card pad={24} style={{ textAlign: "center" }}>{ol ? <><Pill color={ol.c} bg={`color-mix(in srgb, ${ol.c} 14%, transparent)`} icon={ol.i}>{ol.l}</Pill>{cnote && <p style={{ fontSize: "var(--t-sm)", marginTop: 12, lineHeight: 1.5 }}>{cnote}</p>}</> : <span className="muted">—</span>}</Card>;
      controls = isFacil ? <Button full size="lg" icon="ArrowLeft" onClick={exit}>Volver</Button> : null;
    }

    return (
      <Shell onExit={exit}>
        <div style={{ width: "100%", maxWidth: 560 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ FOCO (¿Por qué pasa esto?) ════════
  if (session.type === "focus") {
    const causeCards = allCards.filter((c) => c.columnKey === "cause");
    const myCauses = myCards.filter((c) => c.columnKey === "cause");
    const causeCount = counts["cause"] ?? 0;
    const whys = (session.result?.whys as string[]) ?? [];
    const votedCause = (session.result?.cause as string) ?? "";
    const root = [...whys].reverse().find((w) => (w ?? "").trim()) || (session.result?.rootCause as string) || votedCause || "";
    const cvoteCount: Record<string, number> = {};
    inputs.forEach((i) => { if (i.key === "cvote") { const id = (i.value as { id?: string })?.id; if (id) cvoteCount[id] = (cvoteCount[id] ?? 0) + 1; } });
    const topCause = [...causeCards].sort((a, b) => (cvoteCount[b.id] ?? 0) - (cvoteCount[a.id] ?? 0))[0];

    const myVote = (inputs.find((i) => i.userId === user.id && i.key === "cvote")?.value as { id?: string })?.id;
    const cleanWhys = whys.filter((w) => (w ?? "").trim());
    const addCause = async () => { const t = (cardDraft.cause ?? "").trim(); if (!t) return; await addCard(sessionId, "cause", t, true); setCardDraft((d) => ({ ...d, cause: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
    const fSteps = ["causes", "causes_reveal", "vote", "deepen", "close"];
    const fNext = async () => { const i = fSteps.indexOf(step); setBusy(true); await setStep(sessionId, fSteps[Math.min(fSteps.length - 1, i + 1)], i + 1); setBusy(false); };
    const setWhy = (idx: number, val: string) => { const next = [...whys]; next[idx] = val; setResult(sessionId, { whys: next }); };
    const fFinish = async () => {
      setBusy(true);
      await finalizeSession(session, { cardCount: causeCards.length, summaryText: `Causa raíz: ${root || "—"}`, dataKey: "focus", dataValue: { rootCause: root, cause: votedCause, whys: cleanWhys, causes: causeCards.map((c) => c.text) } });
      setBusy(false); exit();
    };

    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "";
    if (step === "causes") {
      sub = `¿Por qué pasa "${subject}"? Tirá causas a ciegas. Hablamos de causas, no de personas.`;
      content = (
        <Card pad={20}>
          <div style={{ textAlign: "center", marginBottom: isFacil ? 0 : 14 }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--st-focus)" }}>{causeCount}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>causas propuestas</div></div>
          {!isFacil && (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input autoFocus value={cardDraft.cause ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, cause: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addCause()} placeholder="Una posible causa…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none" }} />
                <Button icon="Plus" onClick={addCause}>Sumar</Button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{myCauses.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-focus)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 6 }}>· tuya</span></div>)}</div>
            </>
          )}
        </Card>
      );
      controls = isFacil ? <Button full size="lg" icon="Eye" disabled={busy || causeCount === 0} onClick={fNext}>Revelar causas ({causeCount})</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Sumá las causas que veas. Se revelan todas juntas.</p>;
    } else if (step === "causes_reveal") {
      sub = "Las causas, a la vista. Después el equipo vota cuál pesa más.";
      content = <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{causeCards.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}</div>)}{!causeCards.length && <p className="muted" style={{ fontSize: "var(--t-sm)", textAlign: "center" }}>No se cargaron causas.</p>}</div>;
      controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Votar causas</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El equipo va a votar la causa que más pesa.</p>;
    } else if (step === "vote") {
      const shown = !!session.result.cvoteShown;
      const cVoters = new Set(inputs.filter((i) => i.key === "cvote").map((i) => i.userId)).size;
      const maxC = Math.max(1, ...causeCards.map((c) => cvoteCount[c.id] ?? 0));
      sub = shown ? "Resultado: cuál causa pesa más. El facilitador confirma cuál profundizar." : "¿Cuál causa pesa más? Votá una. La votación está oculta hasta que el facilitador la muestre.";
      content = shown ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...causeCards].sort((a, b) => (cvoteCount[b.id] ?? 0) - (cvoteCount[a.id] ?? 0)).map((c) => { const on = c.text === votedCause; return (
            <button key={c.id} onClick={() => isFacil && setResult(sessionId, { cause: c.text })} disabled={!isFacil} style={{ textAlign: "left", background: on ? "color-mix(in srgb, var(--st-focus) 14%, var(--card))" : "var(--card)", border: `1px solid ${on ? "var(--st-focus)" : "var(--line)"}`, borderRadius: "var(--r-md)", padding: "11px 13px", fontSize: "var(--t-sm)", display: "flex", alignItems: "center", gap: 10, cursor: isFacil ? "pointer" : "default" }}>
              <span style={{ color: on ? "var(--st-focus)" : "var(--ink-3)" }}><Icon name={on ? "CircleCheck" : "Circle"} size={17} /></span>
              <span style={{ flex: 1 }}>{c.text}</span>
              <div style={{ width: 80 }}><Bar value={((cvoteCount[c.id] ?? 0) / maxC) * 100} color="var(--st-focus)" height={6} /></div>
              <span className="num" style={{ fontWeight: 700, width: 18, textAlign: "right" }}>{cvoteCount[c.id] ?? 0}</span>
            </button>
          ); })}
          {isFacil && <p className="muted" style={{ fontSize: "var(--t-xs)", textAlign: "center", marginTop: 4 }}>Tocá la causa a profundizar (la más votada queda sugerida).</p>}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {causeCards.map((c) => { const on = !isFacil && myVote === c.id; return (
              <button key={c.id} onClick={() => { if (!isFacil) setMyInput(sessionId, "cvote", { id: c.id }); }} disabled={isFacil} style={{ textAlign: "left", background: on ? "color-mix(in srgb, var(--st-focus) 14%, var(--card))" : "var(--card)", border: `1px solid ${on ? "var(--st-focus)" : "var(--line)"}`, borderRadius: "var(--r-md)", padding: "11px 13px", fontSize: "var(--t-sm)", display: "flex", alignItems: "center", gap: 10, cursor: isFacil ? "default" : "pointer" }}>
                <span style={{ color: on ? "var(--st-focus)" : "var(--ink-3)" }}><Icon name={on ? "CircleCheck" : "Circle"} size={17} /></span><span style={{ flex: 1 }}>{c.text}</span>
              </button>
            ); })}
            {!causeCards.length && <p className="muted" style={{ fontSize: "var(--t-sm)", textAlign: "center" }}>No se cargaron causas.</p>}
          </div>
          <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)", marginTop: 12 }}><Icon name="EyeOff" size={13} /> Votación oculta · {cVoters} de {totalInRoom} votaron</p>
        </>
      );
      controls = isFacil
        ? (shown ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || !votedCause} onClick={() => { if (!votedCause && topCause) setResult(sessionId, { cause: topCause.text }); fNext(); }}>Profundizar con 5 Porqués</Button> : <Button full size="lg" icon="Eye" disabled={busy} onClick={() => setResult(sessionId, { cvoteShown: true })}>Mostrar votación ({cVoters}/{totalInRoom})</Button>)
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Tocá la causa que más pesa. El facilitador muestra el resultado cuando todos voten.</p>;
    } else if (step === "deepen") {
      sub = 'Los "5 Porqués": preguntamos hasta la raíz. La última respuesta es la causa raíz.';
      content = (
        <Card pad={20}>
          <div className="eyebrow" style={{ color: "var(--st-focus)", marginBottom: 4 }}>Causa votada</div>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>{votedCause || "—"}</div>
          {isFacil ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span className="num" style={{ color: "var(--st-focus)", fontWeight: 800, width: 18 }}>{i + 1}</span>
                  <input defaultValue={whys[i] ?? ""} onBlur={(e) => setWhy(i, e.target.value)} placeholder={`¿Por qué? (${i + 1})`} style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "10px 12px", fontSize: "var(--t-sm)", outline: "none" }} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{cleanWhys.map((w, i) => <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><span className="num" style={{ color: "var(--st-focus)", fontWeight: 800 }}>{i + 1}.</span><div style={{ fontSize: "var(--t-sm)", lineHeight: 1.45 }}>{w}</div></div>)}{!cleanWhys.length && <span className="muted" style={{ fontSize: "var(--t-sm)" }}>Profundizando…</span>}</div>
          )}
        </Card>
      );
      controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || !root} onClick={fNext}>Confirmar causa raíz</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador profundiza con el equipo.</p>;
    } else {
      sub = "Causa raíz definida. Al cerrar, la iniciativa avanza a Prueba.";
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card pad={18} style={{ textAlign: "center", borderColor: "var(--st-focus)" }}><div className="eyebrow" style={{ color: "var(--st-focus)", marginBottom: 6 }}>Causa raíz</div><div style={{ fontSize: "var(--t-lg)", fontWeight: 800 }}>{root || "—"}</div></Card>
          {cleanWhys.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{cleanWhys.map((w, i) => <div key={i} style={{ fontSize: "var(--t-xs)", color: "var(--ink-2)" }}><b style={{ color: "var(--st-focus)" }}>{i + 1}.</b> {w}</div>)}</div>}
        </div>
      );
      controls = isFacil ? <Button full size="lg" icon="Check" disabled={busy} onClick={fFinish}>{busy ? "Guardando…" : "Cerrar y guardar sesión"}</Button> : null;
    }

    return (
      <Shell onExit={exit}>
        <div style={{ width: "100%", maxWidth: 600 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ PRUEBA (Diseñar la apuesta) ════════
  if (session.type === "proof") {
    const ideaCards = allCards.filter((c) => c.columnKey === "idea");
    const myIdeas = myCards.filter((c) => c.columnKey === "idea");
    const ideaCount = counts["idea"] ?? 0;
    const R = session.result;
    const chosen = (R.idea as string) ?? "";
    const betIf = (R.betIf as string) ?? "";
    const betThen = (R.betThen as string) ?? "";
    const signal = (R.signal as string) ?? "";
    const responsible = (R.responsible as string) ?? "";
    const deadline = (R.deadline as string) ?? "";
    const field: React.CSSProperties = { width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none" };
    const BetCard = (
      <div style={{ padding: "14px 16px", background: "color-mix(in srgb, var(--st-proof) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--st-proof) 30%, transparent)", borderRadius: "var(--r-md)" }}>
        <div className="eyebrow" style={{ color: "var(--st-proof)", marginBottom: 6 }}>La apuesta</div>
        <p style={{ fontSize: "var(--t-md)", lineHeight: 1.55 }}>Creemos que si <b style={{ color: "var(--green)" }}>{betIf || "…"}</b>, lograremos que <b style={{ color: "var(--st-proof)" }}>{betThen || "…"}</b>.</p>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10, fontSize: "var(--t-sm)" }}>
          <span className="muted">Señal: <b style={{ color: "var(--ink-0)" }}>{signal || "—"}</b></span>
          <span className="muted">Responsable: <b style={{ color: "var(--ink-0)" }}>{responsible || "—"}</b></span>
          <span className="muted">Plazo: <b style={{ color: "var(--ink-0)" }}>{deadline || "—"}</b></span>
        </div>
      </div>
    );

    const myVote = (inputs.find((i) => i.userId === user.id && i.key === "ivote")?.value as { id?: string })?.id;
    const ivoteCount: Record<string, number> = {};
    inputs.forEach((i) => { if (i.key === "ivote") { const id = (i.value as { id?: string })?.id; if (id) ivoteCount[id] = (ivoteCount[id] ?? 0) + 1; } });
    const topIdea = [...ideaCards].sort((a, b) => (ivoteCount[b.id] ?? 0) - (ivoteCount[a.id] ?? 0))[0];
    const myRisks = myCards.filter((c) => c.columnKey === "risk");
    const riskCards = allCards.filter((c) => c.columnKey === "risk");
    const riskCount = counts["risk"] ?? 0;
    const confirmCount = inputs.filter((i) => i.key === "confirm").length;
    const iConfirmed = inputs.some((i) => i.userId === user.id && i.key === "confirm");
    const addIdea = async () => { const t = (cardDraft.idea ?? "").trim(); if (!t) return; await addCard(sessionId, "idea", t, true); setCardDraft((d) => ({ ...d, idea: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
    const addRisk = async () => { const t = (cardDraft.risk ?? "").trim(); if (!t) return; await addCard(sessionId, "risk", t, true); setCardDraft((d) => ({ ...d, risk: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
    const fSteps = ["ideas", "ideas_reveal", "vote", "premortem", "premortem_reveal", "bet", "commit", "close"];
    const fNext = async () => { const i = fSteps.indexOf(step); setBusy(true); await setStep(sessionId, fSteps[Math.min(fSteps.length - 1, i + 1)], i + 1); setBusy(false); };
    const fFinish = async () => {
      setBusy(true);
      await finalizeSession(session, { cardCount: ideaCards.length, summaryText: `Apuesta: ${betThen || "—"}`, dataKey: "proof", dataValue: { idea: chosen, betIf, betThen, signal, responsible, deadline, risks: riskCards.map((c) => c.text), committed: confirmCount } });
      setBusy(false); exit();
    };
    const BetForm = (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Creemos que si… <span className="faint">(acción)</span></label>
          <textarea defaultValue={betIf || chosen} onBlur={(e) => setResult(sessionId, { betIf: e.target.value })} rows={2} placeholder="cerramos cada reunión con decisiones por escrito" style={{ ...field, resize: "vertical", fontFamily: "inherit" }} />
        </div>
        <div>
          <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>…lograremos que <span className="faint">(resultado)</span></label>
          <textarea defaultValue={betThen} onBlur={(e) => setResult(sessionId, { betThen: e.target.value })} rows={2} placeholder="el equipo avance sin volver a discutir lo mismo" style={{ ...field, resize: "vertical", fontFamily: "inherit" }} />
        </div>
        <div>
          <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Señal a mirar</label>
          <input defaultValue={signal} onBlur={(e) => setResult(sessionId, { signal: e.target.value })} placeholder="% de reuniones con decisiones registradas" style={field} />
        </div>
        <div>
          <label className="eyebrow" style={{ display: "block", marginBottom: 9 }}>Responsable</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(team?.members ?? []).map((m, i) => { const on = responsible === m.name; return (
              <button key={i} onClick={() => setResult(sessionId, { responsible: m.name })} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 11px 6px 6px", borderRadius: "var(--r-full)", background: on ? "color-mix(in srgb, var(--st-proof) 16%, var(--card))" : "var(--card)", border: `1px solid ${on ? "var(--st-proof)" : "var(--line-2)"}`, fontSize: "var(--t-sm)", fontWeight: 600 }}>
                <Avatar name={m.name} initials={m.initials} size={24} idx={i} />{m.name}
              </button>
            ); })}
            {!(team?.members ?? []).length && <span className="muted" style={{ fontSize: "var(--t-sm)" }}>El equipo no tiene integrantes cargados.</span>}
          </div>
        </div>
        <div>
          <label className="eyebrow" style={{ display: "block", marginBottom: 9 }}>Plazo para revisar</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["1 semana", "15 días", "30 días"].map((d) => { const on = deadline === d; return <button key={d} onClick={() => setResult(sessionId, { deadline: d })} style={{ padding: "9px 14px", borderRadius: "var(--r-full)", fontSize: "var(--t-sm)", fontWeight: 600, background: on ? "var(--st-proof)" : "var(--card-2)", color: on ? "#08120c" : "var(--ink-1)", border: "1px solid " + (on ? "var(--st-proof)" : "var(--line-2)") }}>{d}</button>; })}
          </div>
        </div>
      </div>
    );

    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "";
    if (step === "ideas") {
      sub = `¿Qué podríamos probar para mover "${subject}"? Tirá ideas a ciegas. Cantidad primero.`;
      content = (
        <Card pad={20}>
          <div style={{ textAlign: "center", marginBottom: isFacil ? 0 : 14 }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--st-proof)" }}>{ideaCount}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>ideas propuestas</div></div>
          {!isFacil && (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input autoFocus value={cardDraft.idea ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, idea: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addIdea()} placeholder="Una idea para probar…" style={field} />
                <Button icon="Plus" onClick={addIdea}>Sumar</Button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{myIdeas.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-proof)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 6 }}>· tuya</span></div>)}</div>
            </>
          )}
        </Card>
      );
      controls = isFacil ? <Button full size="lg" icon="Eye" disabled={busy || ideaCount === 0} onClick={fNext}>Revelar ideas ({ideaCount})</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Sumá tus ideas. Se revelan todas juntas.</p>;
    } else if (step === "ideas_reveal") {
      sub = "Las ideas, a la vista. Después el equipo vota la mejor apuesta.";
      content = <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{ideaCards.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}</div>)}{!ideaCards.length && <p className="muted" style={{ fontSize: "var(--t-sm)", textAlign: "center" }}>No se cargaron ideas.</p>}</div>;
      controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Votar la mejor idea</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El equipo va a votar la mejor apuesta.</p>;
    } else if (step === "vote") {
      const shown = !!session.result.ivoteShown;
      const iVoters = new Set(inputs.filter((i) => i.key === "ivote").map((i) => i.userId)).size;
      const maxV = Math.max(1, ...ideaCards.map((c) => ivoteCount[c.id] ?? 0));
      sub = shown ? "Resultado: la mejor apuesta según el equipo. El facilitador confirma cuál." : "¿Cuál es la mejor apuesta? Votá una. La votación está oculta hasta que el facilitador la muestre.";
      content = shown ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...ideaCards].sort((a, b) => (ivoteCount[b.id] ?? 0) - (ivoteCount[a.id] ?? 0)).map((c) => { const on = c.text === chosen; return (
            <button key={c.id} onClick={() => isFacil && setResult(sessionId, { idea: c.text })} disabled={!isFacil} style={{ textAlign: "left", background: on ? "color-mix(in srgb, var(--st-proof) 14%, var(--card))" : "var(--card)", border: `1px solid ${on ? "var(--st-proof)" : "var(--line)"}`, borderRadius: "var(--r-md)", padding: "11px 13px", fontSize: "var(--t-sm)", display: "flex", alignItems: "center", gap: 10, cursor: isFacil ? "pointer" : "default" }}>
              <span style={{ color: on ? "var(--st-proof)" : "var(--ink-3)" }}><Icon name={on ? "CircleCheck" : "Circle"} size={17} /></span>
              <span style={{ flex: 1 }}>{c.text}</span>
              <div style={{ width: 80 }}><Bar value={((ivoteCount[c.id] ?? 0) / maxV) * 100} color="var(--st-proof)" height={6} /></div>
              <span className="num" style={{ fontWeight: 700, width: 18, textAlign: "right" }}>{ivoteCount[c.id] ?? 0}</span>
            </button>
          ); })}
          {isFacil && <p className="muted" style={{ fontSize: "var(--t-xs)", textAlign: "center", marginTop: 4 }}>Tocá la idea a apostar (la más votada queda sugerida).</p>}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ideaCards.map((c) => { const on = !isFacil && myVote === c.id; return (
              <button key={c.id} onClick={() => { if (!isFacil) setMyInput(sessionId, "ivote", { id: c.id }); }} disabled={isFacil} style={{ textAlign: "left", background: on ? "color-mix(in srgb, var(--st-proof) 14%, var(--card))" : "var(--card)", border: `1px solid ${on ? "var(--st-proof)" : "var(--line)"}`, borderRadius: "var(--r-md)", padding: "11px 13px", fontSize: "var(--t-sm)", display: "flex", alignItems: "center", gap: 10, cursor: isFacil ? "default" : "pointer" }}>
                <span style={{ color: on ? "var(--st-proof)" : "var(--ink-3)" }}><Icon name={on ? "CircleCheck" : "Circle"} size={17} /></span><span style={{ flex: 1 }}>{c.text}</span>
              </button>
            ); })}
          </div>
          <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)", marginTop: 12 }}><Icon name="EyeOff" size={13} /> Votación oculta · {iVoters} de {totalInRoom} votaron</p>
        </>
      );
      controls = isFacil
        ? (shown ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || !chosen} onClick={() => { if (!chosen && topIdea) setResult(sessionId, { idea: topIdea.text }); fNext(); }}>Pre-mortem de la idea</Button> : <Button full size="lg" icon="Eye" disabled={busy} onClick={() => setResult(sessionId, { ivoteShown: true })}>Mostrar votación ({iVoters}/{totalInRoom})</Button>)
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Tocá la idea que más te convence. El facilitador muestra el resultado cuando todos voten.</p>;
    } else if (step === "premortem") {
      sub = "Pre-mortem: imaginá que en 15 días la prueba fracasó. ¿Qué salió mal? (anónimo)";
      content = (
        <Card pad={20}>
          <div style={{ textAlign: "center", marginBottom: isFacil ? 0 : 14 }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--risk)" }}>{riskCount}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>riesgos anticipados</div></div>
          {!isFacil && (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input autoFocus value={cardDraft.risk ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, risk: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addRisk()} placeholder="Un riesgo o motivo de fracaso…" style={field} />
                <Button icon="Plus" onClick={addRisk}>Sumar</Button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{myRisks.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--risk)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 6 }}>· tuya</span></div>)}</div>
            </>
          )}
        </Card>
      );
      controls = isFacil ? <Button full size="lg" icon="Eye" disabled={busy} onClick={fNext}>Revelar riesgos ({riskCount})</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Anticipá qué podría salir mal. Se revelan juntos.</p>;
    } else if (step === "premortem_reveal") {
      sub = "Los riesgos anticipados. El facilitador los tiene en cuenta al diseñar la apuesta.";
      content = <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{riskCards.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--risk)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}</div>)}{!riskCards.length && <p className="muted" style={{ fontSize: "var(--t-sm)", textAlign: "center" }}>Sin riesgos señalados.</p>}</div>;
      controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Diseñar la apuesta</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador diseña la apuesta con el equipo.</p>;
    } else if (step === "bet") {
      sub = "La apuesta del equipo. El facilitador la escribe; todos la ven en vivo.";
      content = <>{BetCard}{isFacil && <div style={{ marginTop: 16 }}>{BetForm}</div>}</>;
      controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Pasar al compromiso</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador está diseñando la apuesta.</p>;
    } else if (step === "commit") {
      sub = "Leé la apuesta. Si estás de acuerdo, comprometete.";
      content = (
        <>
          {BetCard}
          <div style={{ marginTop: 16, padding: "12px 14px", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="eyebrow">Compromisos</span>
            <span className="num" style={{ fontWeight: 800, color: "var(--green)" }}>{confirmCount}/{totalInRoom}</span>
          </div>
        </>
      );
      controls = (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {iConfirmed
            ? <div style={{ textAlign: "center", color: "var(--green)", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Icon name="CircleCheck" size={20} /> Te comprometiste con la prueba</div>
            : <Button full size="lg" icon="Check" disabled={busy} onClick={() => setMyInput(sessionId, "confirm", { ok: true })}>Entiendo la apuesta y me comprometo</Button>}
          {isFacil && <Button full size="lg" variant={iConfirmed ? "primary" : "secondary"} icon="Check" disabled={busy} onClick={fFinish}>{busy ? "Guardando…" : "Cerrar y guardar sesión"}</Button>}
        </div>
      );
    } else {
      sub = "La apuesta quedó definida. ¡A probar!";
      content = BetCard;
      controls = isFacil ? <Button full size="lg" icon="Check" disabled={busy} onClick={fFinish}>{busy ? "Guardando…" : "Cerrar y guardar sesión"}</Button> : null;
    }

    return (
      <Shell onExit={exit}>
        <div style={{ width: "100%", maxWidth: 600 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ SEGUIMIENTO (¿Cómo vamos?) ════════
  if (session.type === "follow") {
    const R = session.result;
    const current = Number(R.current ?? 0);
    const proof = initiative?.data?.proof as { signal?: string } | undefined;
    const signalName = proof?.signal || "Señal de avance";
    const onTrack = current >= 50;
    const blockerCards = allCards.filter((c) => c.columnKey === "blocker");
    const myBlockers = myCards.filter((c) => c.columnKey === "blocker");
    const blockerCount = counts["blocker"] ?? 0;
    const seeVals = inputs.filter((i) => i.key === "see").map((i) => Number((i.value as { v?: number })?.v ?? 0));
    const seeAvg = seeVals.length ? Math.round((seeVals.reduce((a, b) => a + b, 0) / seeVals.length) * 33) : 0;
    const FDECIDE = [{ k: "continue", l: "Continuar", c: "var(--success)", i: "Play", d: "Vamos bien, seguimos" }, { k: "adjust", l: "Ajustar", c: "var(--warning)", i: "Wrench", d: "Corregimos algo" }, { k: "escalate", l: "Escalar", c: "var(--risk)", i: "TriangleAlert", d: "Necesitamos ayuda" }];
    const fdecision = (R.fdecision as string) ?? "";
    const fdl = FDECIDE.find((x) => x.k === fdecision);
    const PROG = [{ l: "Sin avance", v: 0 }, { l: "Algo", v: 33 }, { l: "Bien", v: 66 }, { l: "Logrado", v: 100 }];
    const Gauge = (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{signalName}</span>
          <Pill color={onTrack ? "var(--success)" : "var(--warning)"} bg={onTrack ? "var(--success-bg)" : "var(--warning-bg)"} icon={onTrack ? "TrendingUp" : "TriangleAlert"}>{onTrack ? "En camino" : "Necesita atención"}</Pill>
        </div>
        <div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--st-follow)", marginBottom: 8 }}>{current}%</div>
        <Bar value={current} glow color={onTrack ? "var(--green)" : "var(--warning)"} />
      </div>
    );

    const mySee = (inputs.find((i) => i.userId === user.id && i.key === "see")?.value as { v?: number })?.v;
    const SEE = [{ v: 0, l: "Sin avance" }, { v: 1, l: "Algo" }, { v: 2, l: "Bien" }, { v: 3, l: "Logrado" }];
    const fSteps = ["progress", "blockers", "blockers_reveal", "decide", "close"];
    const fNext = async () => { const i = fSteps.indexOf(step); setBusy(true); await setStep(sessionId, fSteps[Math.min(fSteps.length - 1, i + 1)], i + 1); setBusy(false); };
    const fFinish = async () => { setBusy(true); await finalizeSession(session, { cardCount: blockerCount, summaryText: `Avance: ${current}% · ${fdl?.l ?? "—"}`, dataKey: "follow", dataValue: { current, signal: signalName, blockers: blockerCards.map((c) => c.text), decision: fdecision }, noAdvance: true }); setBusy(false); exit(); };
    const addBlocker = async () => { const t = (cardDraft.blocker ?? "").trim(); if (!t) return; await addCard(sessionId, "blocker", t, true); setCardDraft((d) => ({ ...d, blocker: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };

    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "";
    if (step === "progress") {
      sub = "¿Cómo viene la prueba? Cada uno marca cómo ve la señal; el facilitador define el avance oficial.";
      content = (
        <Card pad={20}>
          {Gauge}
          <div style={{ marginTop: 16 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>¿Cómo lo ves vos?</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
              {SEE.map((s) => { const on = mySee === s.v; return (
                <button key={s.v} onClick={() => setMyInput(sessionId, "see", { v: s.v })} style={{ padding: "12px", borderRadius: "var(--r-md)", background: on ? "color-mix(in srgb, var(--st-follow) 16%, var(--card))" : "var(--card)", border: `1px solid ${on ? "var(--st-follow)" : "var(--line)"}`, fontWeight: 600, fontSize: "var(--t-sm)" }}>{s.l}</button>
              ); })}
            </div>
            {seeVals.length > 0 && <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 8, textAlign: "center" }}>Lectura del equipo: ~{seeAvg}% ({seeVals.length} {seeVals.length === 1 ? "voto" : "votos"})</p>}
          </div>
        </Card>
      );
      controls = isFacil ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Avance oficial</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{PROG.map((p) => { const on = current === p.v; return <button key={p.v} onClick={() => setResult(sessionId, { current: p.v })} style={{ padding: "9px 14px", borderRadius: "var(--r-full)", fontSize: "var(--t-sm)", fontWeight: 600, background: on ? "var(--st-follow)" : "var(--card-2)", color: on ? "#08120c" : "var(--ink-1)", border: "1px solid " + (on ? "var(--st-follow)" : "var(--line-2)") }}>{p.l}</button>; })}</div>
          </div>
          <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Siguiente: trabas</Button>
        </div>
      ) : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador define el avance oficial.</p>;
    } else if (step === "blockers") {
      sub = "¿Qué nos está trabando para sostener la prueba? Se escriben a ciegas.";
      content = (
        <Card pad={20}>
          <div style={{ textAlign: "center", marginBottom: isFacil ? 0 : 14 }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--warning)" }}>{blockerCount}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>trabas señaladas</div></div>
          {!isFacil && (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input autoFocus value={cardDraft.blocker ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, blocker: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addBlocker()} placeholder="Algo que nos traba…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none" }} />
                <Button icon="Plus" onClick={addBlocker}>Sumar</Button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{myBlockers.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--warning)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 6 }}>· tuya</span></div>)}</div>
            </>
          )}
        </Card>
      );
      controls = isFacil ? <Button full size="lg" icon="Eye" disabled={busy} onClick={fNext}>Revelar trabas ({blockerCount})</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Sumá las trabas que veas. El facilitador las revela.</p>;
    } else if (step === "blockers_reveal") {
      sub = "Las trabas del equipo, a la vista.";
      content = <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{blockerCards.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--warning)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}</div>)}{!blockerCards.length && <p className="muted" style={{ fontSize: "var(--t-sm)", textAlign: "center" }}>Sin trabas. 🙌</p>}</div>;
      controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Decidir cómo sigue</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador decide cómo sigue.</p>;
    } else if (step === "decide") {
      sub = "¿La prueba continúa, se ajusta o hay que escalar?";
      content = (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 10 }}>
          {FDECIDE.map((o) => { const on = fdecision === o.k; const st: React.CSSProperties = { textAlign: "left", padding: 14, borderRadius: "var(--r-lg)", background: on ? `color-mix(in srgb, ${o.c} 14%, var(--card))` : "var(--card)", border: `1px solid ${on ? o.c : "var(--line-2)"}`, opacity: isFacil || on ? 1 : 0.5 }; const inner = (<><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: o.c }}><Icon name={o.i} size={18} /></span><span style={{ fontWeight: 700 }}>{o.l}</span>{on && <span style={{ marginLeft: "auto", color: o.c }}><Icon name="CheckCircle2" size={16} /></span>}</div><p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 4 }}>{o.d}</p></>); return isFacil ? <button key={o.k} onClick={() => setResult(sessionId, { fdecision: o.k })} style={st}>{inner}</button> : <div key={o.k} style={st}>{inner}</div>; })}
        </div>
      );
      controls = isFacil ? <Button full size="lg" icon="Check" disabled={busy || !fdecision} onClick={fFinish}>{busy ? "Guardando…" : "Cerrar y guardar check-in"}</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador define cómo sigue y cierra.</p>;
    } else {
      sub = "Check-in registrado. La prueba sigue en curso.";
      content = <Card pad={20}>{Gauge}{fdl && <div style={{ marginTop: 12 }}><Pill color={fdl.c} bg={`color-mix(in srgb, ${fdl.c} 14%, transparent)`} icon={fdl.i}>{fdl.l}</Pill></div>}</Card>;
      controls = isFacil ? <Button full size="lg" icon="ArrowLeft" onClick={exit}>Volver</Button> : null;
    }

    return (
      <Shell onExit={exit}>
        <div style={{ width: "100%", maxWidth: 600 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ APRENDIZAJE (Cerrar el ciclo) ════════
  if (session.type === "learn") {
    const R = session.result;
    const resultKey = (R.result as string) ?? "";
    const decision = (R.decision as string) ?? "";
    const learnCards = allCards.filter((c) => c.columnKey === "learning");
    const myLearn = myCards.filter((c) => c.columnKey === "learning");
    const learnCount = counts["learning"] ?? 0;
    const RESULTS = [{ k: "yes", l: "Funcionó", c: "var(--success)", i: "CircleCheck" }, { k: "partial", l: "A medias", c: "var(--warning)", i: "CircleDot" }, { k: "no", l: "No funcionó", c: "var(--risk)", i: "CircleX" }];
    const DECISIONS = [{ k: "consolidate", l: "Consolidar", c: "var(--success)", i: "Anchor", d: "Volverlo hábito" }, { k: "iterate", l: "Iterar", c: "var(--st-proof)", i: "RefreshCw", d: "Nueva apuesta" }, { k: "drop", l: "Soltar", c: "var(--ink-2)", i: "Archive", d: "Atender otra" }];
    const rl = RESULTS.find((x) => x.k === resultKey);
    const dl = DECISIONS.find((x) => x.k === decision);
    const Picked = (
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {rl && <Pill color={rl.c} bg={`color-mix(in srgb, ${rl.c} 14%, transparent)`} icon="Flag">Resultado: {rl.l}</Pill>}
        {dl && <Pill color={dl.c} bg={`color-mix(in srgb, ${dl.c} 14%, transparent)`} icon="GitFork">Decisión: {dl.l}</Pill>}
      </div>
    );

    const myRef = (inputs.find((i) => i.userId === user.id && i.key === "reflection")?.value as { text?: string })?.text ?? "";
    const reflected = inputs.some((i) => i.userId === user.id && i.key === "reflected");
    const reflectedCount = inputs.filter((i) => i.key === "reflected").length;
    const addLearning = async () => { const t = (cardDraft.learning ?? "").trim(); if (!t) return; await addCard(sessionId, "learning", t, true); setCardDraft((d) => ({ ...d, learning: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
    const fSteps = ["result", "reflect", "learnings", "learnings_reveal", "decision", "close"];
    const fNext = async () => { const i = fSteps.indexOf(step); setBusy(true); await setStep(sessionId, fSteps[Math.min(fSteps.length - 1, i + 1)], i + 1); setBusy(false); };
    const fFinish = async () => {
      setBusy(true);
      await finalizeSession(session, {
        cardCount: learnCount, summaryText: `Resultado: ${rl?.l ?? "—"} · ${dl?.l ?? "—"}`,
        dataKey: "learn", dataValue: { result: resultKey, learnings: learnCards.map((c) => c.text), decision },
        noAdvance: true, status: decision === "iterate" ? "active" : "done", stageOverride: decision === "iterate" ? "proof" : undefined,
      });
      setBusy(false); exit();
    };
    const PickRow = (opts: { k: string; l: string; c: string; i: string; d?: string }[], value: string, key: string, editable = true) => (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 10 }}>
        {opts.map((o) => { const on = value === o.k; const inner = (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: o.c }}><Icon name={o.i} size={18} /></span><span style={{ fontWeight: 700 }}>{o.l}</span>{on && <span style={{ marginLeft: "auto", color: o.c }}><Icon name="CheckCircle2" size={16} /></span>}</div>
            {o.d && <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 4 }}>{o.d}</p>}
          </>
        ); const st: React.CSSProperties = { textAlign: "left", padding: 14, borderRadius: "var(--r-lg)", background: on ? `color-mix(in srgb, ${o.c} 14%, var(--card))` : "var(--card)", border: `1px solid ${on ? o.c : "var(--line-2)"}`, opacity: editable || on ? 1 : 0.5 };
          return editable
            ? <button key={o.k} onClick={() => setResult(sessionId, { [key]: o.k })} style={st}>{inner}</button>
            : <div key={o.k} style={st}>{inner}</div>;
        })}
      </div>
    );

    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "";
    if (step === "result") {
      sub = "¿Funcionó la prueba? La mirada honesta del equipo. El facilitador la marca.";
      content = PickRow(RESULTS, resultKey, "result", isFacil);
      controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || !resultKey} onClick={fNext}>Siguiente: reflexión</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador marca el resultado con el equipo.</p>;
    } else if (step === "reflect") {
      sub = "Un minuto de silencio para pensar. Lo que cada uno escribe es privado: el facilitador no lo ve.";
      content = isFacil ? (
        <Card pad={24} style={{ textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: "var(--r-lg)", background: "color-mix(in srgb, var(--st-learn) 16%, transparent)", color: "var(--st-learn)", display: "grid", placeItems: "center", margin: "0 auto 12px" }}><Icon name="Lock" size={24} /></div>
          <div className="num" style={{ fontSize: "var(--t-2xl)", fontWeight: 800, color: "var(--st-learn)" }}>{reflectedCount}/{totalInRoom}</div>
          <div className="muted" style={{ fontSize: "var(--t-sm)" }}>reflexionaron en privado</div>
          <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 12, lineHeight: 1.5 }}>Las reflexiones quedan guardadas solo para cada integrante. Esto protege la honestidad del equipo.</p>
        </Card>
      ) : (
        <Card pad={24}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: "var(--st-learn)" }}><Icon name="Lock" size={16} /><span className="eyebrow" style={{ color: "var(--st-learn)" }}>Tu reflexión privada</span></div>
          <textarea defaultValue={myRef} onBlur={(e) => setMyInput(sessionId, "reflection", { text: e.target.value }, true)} rows={5} placeholder="¿Qué aprendí sobre cómo trabajo? ¿Qué quiero hacer distinto la próxima? ¿Cómo me siento con el equipo?" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "12px 14px", fontSize: "var(--t-base)", outline: "none", lineHeight: 1.5, resize: "vertical" }} />
          <Button full icon={reflected ? "Check" : "Lock"} variant={reflected ? "secondary" : "primary"} onClick={() => setMyInput(sessionId, "reflected", { ok: true })} style={{ marginTop: 12 }}>{reflected ? "Guardado en privado" : "Guardar mi reflexión"}</Button>
          <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 10, textAlign: "center" }}>Nadie más —ni el facilitador— puede leer esto.</p>
        </Card>
      );
      controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Pasar a compartir aprendizajes</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Tomate tu minuto. El facilitador sigue cuando estén.</p>;
    } else if (step === "learnings") {
      sub = "¿Qué aprendimos? Lo que nos llevamos, sirva o no la prueba. Se escriben a ciegas.";
      content = (
        <Card pad={20}>
          <div style={{ textAlign: "center", marginBottom: isFacil ? 0 : 14 }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--st-learn)" }}>{learnCount}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>aprendizajes</div></div>
          {!isFacil && (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input autoFocus value={cardDraft.learning ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, learning: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addLearning()} placeholder="Un aprendizaje…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none" }} />
                <Button icon="Plus" onClick={addLearning}>Sumar</Button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{myLearn.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-learn)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 6 }}>· tuya</span></div>)}</div>
            </>
          )}
        </Card>
      );
      controls = isFacil ? <Button full size="lg" icon="Eye" disabled={busy || learnCount === 0} onClick={fNext}>Revelar aprendizajes ({learnCount})</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Sumá tu aprendizaje. Se revelan todos juntos.</p>;
    } else if (step === "learnings_reveal") {
      sub = "Lo que se lleva el equipo.";
      content = <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{learnCards.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-learn)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}</div>)}{!learnCards.length && <p className="muted" style={{ fontSize: "var(--t-sm)", textAlign: "center" }}>Sin aprendizajes.</p>}</div>;
      controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Siguiente: decisión</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador define cómo sigue la iniciativa.</p>;
    } else if (step === "decision") {
      sub = "¿Cómo sigue esta iniciativa?";
      content = PickRow(DECISIONS, decision, "decision", isFacil);
      controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || !decision} onClick={fNext}>Revisar y cerrar</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador define la decisión con el equipo.</p>;
    } else {
      sub = decision === "iterate" ? "Al cerrar, la iniciativa vuelve a Prueba." : "Al cerrar, la iniciativa queda cerrada.";
      content = <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>{Picked}<div className="muted" style={{ fontSize: "var(--t-sm)" }}>{learnCount} {learnCount === 1 ? "aprendizaje" : "aprendizajes"} registrados</div></div>;
      controls = isFacil ? <Button full size="lg" icon="Check" disabled={busy} onClick={fFinish}>{busy ? "Guardando…" : "Cerrar el ciclo"}</Button> : null;
    }

    return (
      <Shell onExit={exit}>
        <div style={{ width: "100%", maxWidth: 600 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ EXPLORACIÓN · pantalla compartida ════════
  const goNext = async () => { const idx = STEPS.indexOf(step); const nextKey = STEPS[Math.min(STEPS.length - 1, idx + 1)]; setBusy(true); await setStep(sessionId, nextKey, idx + 1); setBusy(false); };
  const group = async () => { if (!sel.length) return; setBusy(true); const id = await createCluster(sessionId, `Tensión ${clusters.length + 1}`); if (id) for (const cid of sel) await assignCardToCluster(cid, id); setSel([]); setBusy(false); load(); };
  const finish = async () => {
    setBusy(true);
    const hasClusters = clusters.length > 0;
    const hasData = hasClusters || !!purposeText || !!criticalMeta;
    await finalizeSession(session, {
      pulseAvg: avg, cardCount: allCards.length,
      summaryText: hasClusters ? `prioridad: ${ranked[0]?.name ?? "—"}` : (purposeText ? "propósito definido" : undefined),
      dataKey: hasData ? "explore" : undefined,
      dataValue: hasData
        ? { priority: ranked[0]?.name ?? "", tensions: ranked.map((c) => ({ name: c.name, signals: cardsOf(c.id).length, dots: votesByCluster[c.id] ?? 0 })), pausedCount: ranked.slice(1).length, purpose: purposeText || undefined, criticalStage: criticalMeta ? criticalMeta.label : undefined }
        : undefined,
      pausedNames: hasClusters ? ranked.slice(1).map((c) => c.name) : undefined,
    });
    setBusy(false); exit();
  };
  const submitMyPulse = async () => { setBusy(true); const res = await submitPulse(sessionId, draft); setBusy(false); if (!res.error) setSubmitted(true); };
  const addExploreCard = async (colKey: string) => { const text = (cardDraft[colKey] ?? "").trim(); if (!text) return; await addCard(sessionId, colKey, text, anon); setCardDraft((d) => ({ ...d, [colKey]: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
  const voteCluster = async (clusterId: string, delta: number) => { if (delta > 0 && remaining <= 0) return; if (delta > 0) await addVote(sessionId, clusterId); else await removeVote(sessionId, clusterId); };

  let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
  if (step === "pulse") {
    sub = "Cinco señales, anónimas. Cada uno responde; el facilitador revela el promedio.";
    if (isFacil) {
      content = <Card pad={24}><div style={{ textAlign: "center", padding: "10px 0" }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--green)" }}>{responses.length}/{totalInRoom || team?.members.length || 0}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>respondieron</div></div></Card>;
      controls = <Button full size="lg" icon="Eye" disabled={busy || responses.length === 0} onClick={goNext}>Revelar promedio ({responses.length})</Button>;
    } else if (submitted) {
      content = <Card pad={28} style={{ textAlign: "center" }}><div style={{ width: 56, height: 56, borderRadius: "var(--r-lg)", background: "var(--success-bg)", color: "var(--green)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}><Icon name="Check" size={28} /></div><h2 style={{ fontSize: "var(--t-xl)", fontWeight: 800 }}>¡Listo!</h2><p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 6 }}>Tu pulso quedó guardado (anónimo). {responses.length} de {totalInRoom} respondieron.</p></Card>;
      controls = <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Esperá a que el facilitador continúe.</p>;
    } else {
      content = <Card pad={24}><div style={{ display: "flex", flexDirection: "column", gap: 20 }}>{PULSE_DIMS.map((d) => (<div key={d.key}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ fontSize: "var(--t-sm)", fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: d.color }} />{d.label}</span><span className="num" style={{ fontWeight: 700, color: d.color }}>{draft[d.key]}</span></div><input type="range" min={0} max={100} value={draft[d.key]} onChange={(e) => setDraft((s) => ({ ...s, [d.key]: Number(e.target.value) }))} style={{ width: "100%", accentColor: d.color }} /></div>))}</div><p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 14, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Icon name="Lock" size={13} /> Anónimo: solo se muestra el promedio.</p><p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 6, textAlign: "center" }}>{responses.length} de {totalInRoom} respondieron</p></Card>;
      controls = <Button full size="lg" icon="Send" disabled={busy} onClick={submitMyPulse}>{busy ? "Enviando…" : "Enviar mi pulso"}</Button>;
    }
  } else if (step === "pulse_reveal") {
    sub = "El pulso del equipo, revelado para todos.";
    content = <Card pad={24}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}><span style={{ fontWeight: 700 }}>Promedio del equipo</span><Pill color="var(--success)" bg="var(--success-bg)" icon="Eye">{overall}/100</Pill></div>{Averages}</Card>;
    controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={goNext}>Siguiente: tarjetas</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Esperá el siguiente paso.</p>;
  } else if (step === "cards") {
    wide = true; sub = "Escriban en silencio. Las tarjetas quedan ocultas hasta que el facilitador revele.";
    content = (
      <>
        {!isFacil && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <button onClick={() => setAnon((a) => !a)} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: "var(--r-full)", border: "1px solid var(--line-2)", background: "var(--card)", fontSize: "var(--t-sm)", fontWeight: 600 }}><Icon name={anon ? "Lock" : "Globe"} size={15} style={{ color: anon ? "var(--ink-2)" : "var(--green)" }} />Tus tarjetas: <b style={{ color: anon ? "var(--ink-1)" : "var(--green)" }}>{anon ? "Anónimas" : "Públicas"}</b><span className="faint" style={{ fontSize: "var(--t-xs)" }}>(tocá para cambiar)</span></button>
          </div>
        )}
        <div className="cards-cols" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>{COLS.map((col) => { const mine = myCards.filter((c) => c.columnKey === col.key); const n = counts[col.key] ?? 0; return (
          <div key={col.key} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 14, display: "flex", flexDirection: "column", minHeight: 240 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ color: col.color }}><Icon name={col.icon} size={16} /></span><span style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{col.label}</span><span className="num" style={{ marginLeft: "auto", fontSize: "var(--t-xs)", color: "var(--ink-2)", background: "var(--card)", borderRadius: 99, padding: "2px 8px" }}>{n}</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              {isFacil
                ? <div style={{ flex: 1, display: "grid", placeItems: "center", color: "var(--ink-3)", fontSize: "var(--t-xs)", textAlign: "center", gap: 6 }}><Icon name="Lock" size={18} /><div className="num" style={{ fontSize: "var(--t-2xl)", fontWeight: 800, color: "var(--ink-1)" }}>{n}</div>{n === 1 ? "tarjeta · oculta" : "tarjetas · ocultas"}</div>
                : <>{mine.map((c) => (<div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${col.color}`, borderRadius: "var(--r-md)", padding: "9px 11px", fontSize: "var(--t-sm)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 6 }}>{c.anonymous ? "· anónima" : "· pública"} · tuya</span></div>))}{!mine.length && <div style={{ color: "var(--ink-3)", fontSize: "var(--t-xs)", textAlign: "center", padding: 12 }}>Sumá lo tuyo…</div>}</>}
            </div>
            {!isFacil && <div style={{ marginTop: 10, display: "flex", gap: 6 }}><input value={cardDraft[col.key] ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, [col.key]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addExploreCard(col.key)} placeholder="Sumar tarjeta…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "8px 10px", fontSize: "var(--t-sm)", outline: "none" }} /><button onClick={() => addExploreCard(col.key)} style={{ background: col.color, color: "#06121f", borderRadius: "var(--r-sm)", padding: "0 11px", display: "grid", placeItems: "center" }}><Icon name="Plus" size={16} /></button></div>}
          </div>
        ); })}</div>
      </>
    );
    controls = isFacil ? <Button full size="lg" icon="Eye" disabled={busy || totalCards === 0} onClick={goNext}>Revelar tarjetas ({totalCards})</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Sumá tus tarjetas. El facilitador las revela cuando todos terminen.</p>;
  } else if (step === "cards_reveal") {
    wide = true; sub = "Todas las tarjetas a la vista. Las anónimas no muestran autor.";
    content = RevealedCards;
    controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={goNext}>Siguiente: agrupar</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador agrupa las tarjetas en tensiones.</p>;
  } else if (step === "cluster") {
    wide = true; sub = isFacil ? "Juntá las tarjetas que hablan de lo mismo. Seleccioná varias y armá una tensión." : "El facilitador agrupa las tarjetas en tensiones. Mirá cómo se arman.";
    content = (
      <div className="cluster-grid" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18, alignItems: "start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span className="eyebrow">Sueltas ({loose.length})</span>
            {isFacil && sel.length > 0 && <Button size="sm" icon="Group" disabled={busy} onClick={group}>Agrupar {sel.length}</Button>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px,1fr))", gap: 10 }}>
            {loose.map((c) => {
              const cm = colMeta(c.columnKey); const on = sel.includes(c.id);
              const cardStyle: React.CSSProperties = { textAlign: "left", background: on ? "var(--green-soft)" : "var(--card)", border: "1px solid " + (on ? "var(--green)" : "var(--line)"), borderLeft: "3px solid " + cm.color, borderRadius: "var(--r-md)", padding: "10px 11px", fontSize: "var(--t-sm)", lineHeight: 1.4, position: "relative" };
              return isFacil ? (
                <button key={c.id} onClick={() => setSel((s) => (on ? s.filter((x) => x !== c.id) : [...s, c.id]))} style={cardStyle}>
                  {on && <span style={{ position: "absolute", top: 6, right: 6, color: "var(--green)" }}><Icon name="CheckCircle2" size={14} /></span>}{c.text}
                </button>
              ) : <div key={c.id} style={cardStyle}>{c.text}</div>;
            })}
            {!loose.length && <div style={{ gridColumn: "1/-1", color: "var(--ink-3)", fontSize: "var(--t-sm)", padding: 16, textAlign: "center" }}>Todas agrupadas.</div>}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="eyebrow">Tensiones ({clusters.length})</span>
          {clusters.map((cl) => (
            <Card key={cl.id} pad={12}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ color: "var(--green)" }}><Icon name="Layers" size={15} /></span>
                {isFacil
                  ? <input defaultValue={cl.name} onBlur={(e) => renameCluster(cl.id, e.target.value)} style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", color: "var(--ink-0)", fontWeight: 700, fontSize: "var(--t-sm)", outline: "none", borderBottom: "1px dashed var(--line-2)" }} />
                  : <span style={{ flex: 1, fontWeight: 700, fontSize: "var(--t-sm)" }}>{cl.name}</span>}
                {isFacil && <button onClick={() => deleteCluster(cl.id)} style={{ color: "var(--ink-3)" }}><Icon name="Trash2" size={14} /></button>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {cardsOf(cl.id).map((c) => { const cm = colMeta(c.columnKey); return <div key={c.id} style={{ fontSize: "var(--t-xs)", color: "var(--ink-1)", padding: "5px 7px", background: "var(--card-2)", borderRadius: "var(--r-sm)", borderLeft: `2px solid ${cm.color}` }}>{c.text}</div>; })}
              </div>
            </Card>
          ))}
          {!clusters.length && <div style={{ border: "1px dashed var(--line-2)", borderRadius: "var(--r-md)", padding: 18, textAlign: "center", color: "var(--ink-3)", fontSize: "var(--t-sm)" }}>{isFacil ? "Seleccioná tarjetas y agrupalas." : "Todavía no hay tensiones."}</div>}
        </div>
      </div>
    );
    controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || clusters.length === 0} onClick={goNext}>Siguiente: votar</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador agrupa y pasa a la votación.</p>;
  } else if (step === "vote") {
    const shown = !!session.result.voteShown;
    const voters = new Set(votes.map((v) => v.userId)).size;
    const max = Math.max(1, ...ranked.map((c) => votesByCluster[c.id] ?? 0));
    sub = shown ? "Resultado de la votación: qué tensión atendemos primero." : "¿Qué tensión atendemos primero? Repartí tus puntos. La votación está oculta hasta que el facilitador la muestre.";
    content = shown ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {ranked.map((cl, i) => (
          <div key={cl.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="num" style={{ width: 20, fontWeight: 700, color: i === 0 ? "var(--green)" : "var(--ink-3)" }}>{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: "var(--t-sm)", marginBottom: 5 }}>{cl.name}</div>
              <Bar value={((votesByCluster[cl.id] ?? 0) / max) * 100} color={i === 0 ? "var(--green)" : "var(--violet)"} height={7} />
            </div>
            <span className="num" style={{ fontWeight: 700, width: 22, textAlign: "right" }}>{votesByCluster[cl.id] ?? 0}</span>
          </div>
        ))}
      </div>
    ) : (
      <>
        {!isFacil && <div style={{ textAlign: "center", marginBottom: 14 }}><span className="muted" style={{ fontSize: "var(--t-sm)" }}>Te quedan </span><span className="num" style={{ fontWeight: 800, color: "var(--green)", fontSize: "var(--t-lg)" }}>{remaining}</span><span className="muted" style={{ fontSize: "var(--t-sm)" }}> puntos</span></div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {clusters.map((cl) => { const mine = votes.filter((v) => v.userId === user.id && v.clusterId === cl.id).length; return (
            <div key={cl.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
              <div style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: "var(--t-sm)" }}>{cl.name}</div>
              {isFacil
                ? (mine > 0 ? <span className="num" style={{ color: "var(--green)", fontWeight: 700 }}>{mine}</span> : <span className="faint" style={{ fontSize: "var(--t-xs)" }}>—</span>)
                : <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button onClick={() => voteCluster(cl.id, -1)} disabled={mine === 0} style={{ width: 30, height: 30, borderRadius: "var(--r-sm)", background: "var(--card-2)", border: "1px solid var(--line-2)", color: "var(--ink-1)", opacity: mine === 0 ? 0.4 : 1 }}><Icon name="Minus" size={15} /></button>
                    <span className="num" style={{ width: 18, textAlign: "center", fontWeight: 700 }}>{mine}</span>
                    <button onClick={() => voteCluster(cl.id, 1)} disabled={remaining === 0} style={{ width: 30, height: 30, borderRadius: "var(--r-sm)", background: remaining === 0 ? "var(--card-2)" : "var(--green)", border: "1px solid var(--line-2)", color: remaining === 0 ? "var(--ink-3)" : "#06121f" }}><Icon name="Plus" size={15} /></button>
                  </div>}
            </div>
          ); })}
        </div>
        <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)", marginTop: 12 }}><Icon name="EyeOff" size={13} /> Votación oculta · {voters} de {totalInRoom} votaron</p>
      </>
    );
    controls = isFacil
      ? (shown ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={goNext}>Siguiente: propósito</Button> : <Button full size="lg" icon="Eye" disabled={busy} onClick={() => setResult(sessionId, { voteShown: true })}>Mostrar votación ({voters}/{totalInRoom})</Button>)
      : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Repartí tus {DOTS_PER} puntos. El facilitador muestra el resultado cuando todos terminen.</p>;
  } else if (step === "purpose") {
    wide = true; sub = "¿Para qué existe este equipo? Tres preguntas. Las respuestas son públicas (con tu nombre).";
    content = MultiWrite(PURPOSE_COLS, "var(--st-explore)", !isFacil, false);
    controls = isFacil
      ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><Button full size="lg" icon="Eye" disabled={busy} onClick={goNext}>Revelar respuestas</Button><button onClick={() => setStep(sessionId, "flow", STEPS.indexOf("flow"))} className="muted" style={{ fontSize: "var(--t-xs)", fontWeight: 600 }}>Saltar Propósito →</button></div>
      : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Respondé las tres. El facilitador revela cuando todos terminen.</p>;
  } else if (step === "purpose_reveal") {
    wide = true; sub = "¿Hay acuerdo o dispersión? Esa lectura es el dato.";
    content = MultiReveal(PURPOSE_COLS, true);
    controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={goNext}>Redactar el propósito</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador redacta el propósito del equipo.</p>;
  } else if (step === "purpose_decide") {
    sub = "El propósito del equipo, en una frase que todos puedan firmar.";
    content = isFacil
      ? <textarea defaultValue={purposeText} onBlur={(e) => setResult(sessionId, { purpose: e.target.value.trim() })} rows={4} placeholder="Existimos para… / Nuestro trabajo importa porque…" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "12px 14px", fontSize: "var(--t-base)", outline: "none", lineHeight: 1.5, resize: "vertical" }} />
      : <Card pad={24} style={{ borderColor: "var(--st-explore)" }}>{purposeText ? <p style={{ fontSize: "var(--t-md)", lineHeight: 1.6 }}>{purposeText}</p> : <span className="muted">Redactando el propósito…</span>}</Card>;
    controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={goNext}>Siguiente: flujo de trabajo</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador escribe el propósito con el equipo.</p>;
  } else if (step === "flow") {
    wide = true; sub = "Mapeamos el flujo de trabajo del equipo, etapa por etapa.";
    content = MultiWrite(FLOW_COLS, "var(--st-explore)", !isFacil);
    controls = isFacil
      ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><Button full size="lg" icon="Eye" disabled={busy} onClick={goNext}>Revelar flujo</Button><button onClick={() => setStep(sessionId, "close", STEPS.indexOf("close"))} className="muted" style={{ fontSize: "var(--t-xs)", fontWeight: 600 }}>Saltar Flujo → ir al cierre</button></div>
      : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Sumá lo que veas en cada etapa del flujo.</p>;
  } else if (step === "flow_reveal") {
    wide = true; sub = "El flujo completo. Ahora votamos la etapa más crítica.";
    content = MultiReveal(FLOW_COLS);
    controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={goNext}>Votar etapa crítica</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El equipo vota la etapa más crítica.</p>;
  } else if (step === "flow_vote") {
    const shown = !!session.result.flowShown;
    const fVoters = new Set(inputs.filter((i) => i.key === "critical").map((i) => i.userId)).size;
    const maxF = Math.max(1, ...FLOW_COLS.map((f) => flowVotes[f.key] ?? 0));
    sub = shown ? "Resultado: la etapa más crítica del flujo." : "¿Cuál es la etapa más crítica del flujo? Elegí una. La votación está oculta hasta que el facilitador la muestre.";
    content = shown ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {flowRanked.map((f, i) => (
          <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
            <span style={{ color: i === 0 ? "var(--st-explore)" : f.color }}><Icon name={f.icon} size={17} /></span>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: "var(--t-sm)", marginBottom: 5 }}>{f.label}</div><Bar value={((flowVotes[f.key] ?? 0) / maxF) * 100} color={i === 0 ? "var(--st-explore)" : "var(--violet)"} height={6} /></div>
            <span className="num" style={{ fontWeight: 700, width: 18, textAlign: "right" }}>{flowVotes[f.key] ?? 0}</span>
          </div>
        ))}
      </div>
    ) : (
      <>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FLOW_COLS.map((f) => { const on = !isFacil && myCritical === f.key; return (
            <button key={f.key} onClick={() => { if (!isFacil) setMyInput(sessionId, "critical", { stage: f.key }); }} disabled={isFacil} style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderRadius: "var(--r-md)", background: on ? "color-mix(in srgb, var(--st-explore) 14%, var(--card))" : "var(--card)", border: `1px solid ${on ? "var(--st-explore)" : "var(--line)"}`, cursor: isFacil ? "default" : "pointer" }}>
              <span style={{ color: on ? "var(--st-explore)" : f.color }}><Icon name={on ? "CircleCheck" : f.icon} size={17} /></span>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{f.label}</div><div className="muted" style={{ fontSize: "var(--t-xs)" }}>{f.sub}</div></div>
            </button>
          ); })}
        </div>
        <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)", marginTop: 12 }}><Icon name="EyeOff" size={13} /> Votación oculta · {fVoters} de {totalInRoom} votaron</p>
      </>
    );
    controls = isFacil
      ? (shown ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setResult(sessionId, { critical: criticalStage }); setBusy(false); goNext(); }}>Cerrar y ver el mapa</Button> : <Button full size="lg" icon="Eye" disabled={busy} onClick={() => setResult(sessionId, { flowShown: true })}>Mostrar votación ({fVoters}/{totalInRoom})</Button>)
      : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Tocá la etapa más crítica. El facilitador muestra el resultado cuando todos elijan.</p>;
  } else {
    sub = "El mapa final. Al cerrar, se guarda y la iniciativa avanza de etapa.";
    content = (
      <>
        {(purposeText || criticalMeta) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {purposeText && <div style={{ padding: "12px 14px", background: "color-mix(in srgb, var(--st-explore) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--st-explore) 28%, transparent)", borderRadius: "var(--r-md)" }}><div className="eyebrow" style={{ color: "var(--st-explore)", marginBottom: 4 }}>Propósito del equipo</div><p style={{ fontSize: "var(--t-sm)", lineHeight: 1.5 }}>{purposeText}</p></div>}
            {criticalMeta && <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--t-sm)" }}><Icon name={criticalMeta.icon} size={15} style={{ color: "var(--st-explore)" }} /><span className="muted">Etapa más crítica del flujo:</span> <b>{criticalMeta.label}</b></div>}
          </div>
        )}
        {RankedMap}
        {ranked.length > 1 && <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}><Icon name="Pause" size={13} /> Las {ranked.length - 1} tensiones no priorizadas quedan como iniciativas <b style={{ color: "var(--warning)" }}>pausadas</b> del equipo.</p>}
      </>
    );
    controls = isFacil ? <Button full size="lg" icon="Check" disabled={busy} onClick={finish}>{busy ? "Guardando…" : "Cerrar y guardar sesión"}</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador cierra y guarda la sesión.</p>;
  }

  return (
    <Shell onExit={exit}>
      <div style={{ width: "100%", maxWidth: wide ? 920 : 600 }}>
        {Header(sub)}
        <div style={{ marginBottom: 16 }}>{facBar}</div>
        {content}
        <div style={{ marginTop: 18 }}>{controls}</div>
      </div>
    </Shell>
  );
}
