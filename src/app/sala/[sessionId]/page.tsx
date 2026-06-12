"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Logo } from "@/components/AppShell";
import { Avatar, Bar, Button, Card, Pill, PulseRadar } from "@/components/ui";
import { SessionTimer } from "@/components/session/Timer";
import { JoinModal } from "@/components/session/JoinModal";
import { HiddenDots, Cascade, RevealHeader, RevealPop } from "@/components/session/RevealFx";
import { useAuth } from "@/lib/auth/AuthContext";
import { getInitiatives, getTeam } from "@/lib/repository";
import { retroByKey } from "@/lib/retros";
import { retroById } from "@/lib/retros/registry";
import { useToast } from "@/components/Toast";
import { PULSE_DIMS, FOUNDING_QUESTIONS, overallOf, to5, to100 } from "@/lib/data";
import {
  addCard, addVote, assignCardToCluster, averagePulse, closeSession, createCluster, createLiveSession, deleteCard, deleteCluster, pulseOverall,
  finalizeSession, getCardCounts, getCards, getClusters, getInitiativeSessions, getInputs, getMyCards, getParticipants, getSessionContent,
  getPulseResponses, getSession, getVotes, hasResponded, joinSession, removeVote,
  renameCluster, setMyInput, setResult, setStep, submitPulse, subscribeSession, touchPresence,
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
// Cierre de Exploración: lluvia de causas posibles (van a Foco para priorizar).
const CAUSE_COLS = [{ key: "cause", label: "¿Por qué pasa? · causas posibles" }];
// FODA inicial del equipo: 4 cuadrantes clásicos, anónimo hasta revelar.
const FODA_COLS = [
  { key: "f", label: "💪 Fortalezas · lo que hacemos bien" },
  { key: "o", label: "🌱 Oportunidades · lo que podríamos aprovechar" },
  { key: "d", label: "⚠️ Debilidades · lo que nos cuesta" },
  { key: "a", label: "⛈️ Amenazas · lo que nos puede golpear de afuera" },
];
const STEPS = ["pulse", "pulse_reveal", "cards", "cards_reveal", "cluster", "vote", "purpose", "purpose_reveal", "purpose_decide", "flow", "flow_reveal", "flow_vote", "causes", "causes_reveal", "close"];
const DOTS_PER = 2;
// Secuencia de pasos por tipo de sesión (para el indicador de progreso y "volver atrás").
const STEP_SEQ: Record<string, string[]> = {
  founding: ["welcome", "contract", "sign", "close"],
  foda: ["cards", "cards_reveal", "close"],
  explore: STEPS,
  focus: ["matrix", "close"],
  proof: ["ideas", "ideas_reveal", "group", "ice", "premortem", "premortem_reveal", "bet", "commit", "close"],
  learn: ["result", "reflect", "learnings", "learnings_reveal", "group", "vote", "decision", "close"],
};

function Shell({ onExit, mood, children }: { onExit?: () => void; mood?: number | null; children: React.ReactNode }) {
  // Atmósfera: el "clima" de la sala refleja sutilmente la salud del equipo (su pulso).
  const glow = mood == null ? "rgba(0,232,122,0.10)"
    : mood >= 75 ? "rgba(0,232,122,0.17)"
    : mood >= 60 ? "rgba(0,232,122,0.10)"
    : mood >= 45 ? "rgba(59,130,246,0.10)"
    : "rgba(245,158,11,0.10)";
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: `radial-gradient(1100px 520px at 50% -160px, ${glow}, transparent), var(--bg-1)`, transition: "background .8s var(--ease)" }}>
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
  const [showJoin, setShowJoin] = useState(false);
  // Pulso: cada dimensión se puntúa 1-5 (se convierte a 0-100 al enviar).
  const [draft, setDraft] = useState<Record<string, number>>(() => Object.fromEntries(PULSE_DIMS.map((d) => [d.key, 3])));
  const [cardDraft, setCardDraft] = useState<Record<string, string>>({ works: "", blocks: "", unsaid: "" });
  const [anon, setAnon] = useState(true);
  const [sel, setSel] = useState<string[]>([]);
  const [iceDraft, setIceDraft] = useState<Record<string, { i: number; c: number; e: number }>>({});
  const joinedRef = useRef(false);
  const movedRef = useRef(false);
  const [now, setNow] = useState(() => Date.now());
  const [voteBusy, setVoteBusy] = useState(false);
  // Sesión continua: tras cerrar una etapa, el facilitador puede encadenar la siguiente.
  const [afterClose, setAfterClose] = useState<string | null>(null);
  // Foco: qué causa está "en la mano" para ubicar en el mapa único.
  const [focusSel, setFocusSel] = useState<string | null>(null);
  const sessionId = params.sessionId;
  // Resultado "más fresco que el poll": evita que dos ediciones seguidas (< 2s) se pisen
  // entre sí — cada patch local se acumula acá y los setters leen de este ref, no del estado.
  const resultRef = useRef<Record<string, unknown>>({});
  const patchResult = (partial: Record<string, unknown>) => {
    resultRef.current = { ...resultRef.current, ...partial };
    setResult(sessionId, partial);
  };
  // Input con feedback inmediato: escribe y recarga al toque (sin esperar el poll de 2s).
  const tapInput = async (key: string, value: Record<string, unknown>, isPrivate = false) => {
    await setMyInput(sessionId, key, value, isPrivate);
    load();
  };

  const load = async () => {
    const s = await getSession(sessionId);
    setSession(s);
    if (s) resultRef.current = { ...s.result, ...resultRef.current };
    // Sesión continua: si esta sesión cerró y el facilitador abrió la siguiente etapa,
    // toda la sala se muda automáticamente a la sesión nueva.
    const nextId = s?.status === "closed" ? (s.result?.nextSessionId as string | undefined) : undefined;
    if (nextId && !movedRef.current) { movedRef.current = true; router.replace(`/sala/${nextId}`); return; }
    if (s) {
      const [r, p, c, cl, v] = await Promise.all([
        getPulseResponses(sessionId), getParticipants(sessionId), getCardCounts(sessionId),
        getClusters(sessionId), getVotes(sessionId),
      ]);
      setResponses(r); setParticipants(p); setCounts(c); setClusters(cl); setVotes(v);
      setInputs(await getInputs(sessionId));
      if (user) { touchPresence(sessionId); setSubmitted(await hasResponded(sessionId, user.id)); setMyCards(await getMyCards(sessionId, user.id)); }
      // Pasos que necesitan TODAS las tarjetas reveladas ("bet"/"commit" incluidos: el editor
      // de la apuesta usa los riesgos del pre-mortem para las mitigaciones).
      const needsAll = ["cards_reveal", "cluster", "vote", "close", "group", "purpose_reveal", "purpose_decide", "flow", "flow_reveal", "flow_vote", "premortem_reveal", "causes_reveal", "ideas_reveal", "learnings_reveal", "ice", "bet", "commit"].includes(s.stepKey ?? "");
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
  }, [sessionId, user?.id]);

  useEffect(() => {
    if (user && !joinedRef.current) { joinedRef.current = true; joinSession(sessionId, user.name, user.initials); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Foco a prueba de fallos: si el resumen de Exploración no guardó las causas,
  // las leemos directamente de las tarjetas de la última sesión de Exploración.
  const [fallbackCauses, setFallbackCauses] = useState<string[]>([]);
  useEffect(() => {
    if (session?.type !== "focus" || !session.initiativeId) return;
    const saved = ((getInitiatives(session.teamId).find((i) => i.id === session.initiativeId)?.data?.explore?.causes as string[] | undefined) ?? []).filter((c) => (c ?? "").trim());
    if (saved.length) return;
    let active = true;
    (async () => {
      const ss = await getInitiativeSessions(session.initiativeId!);
      const lastExp = [...ss].reverse().find((s) => s.type === "explore");
      if (!lastExp) return;
      const content = await getSessionContent(lastExp.id);
      const causes = content.cards.filter((c) => c.columnKey === "cause").map((c) => c.text);
      if (active && causes.length) setFallbackCauses(causes);
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.type, session?.initiativeId]);

  // Tick de 1s SOLO mientras hay un timer corriendo (evita re-render de toda la sala cada segundo).
  const liveEndsAt = (session?.result as Record<string, unknown> | undefined)?.["timer"] as { endsAt?: number } | undefined;
  useEffect(() => {
    if (!liveEndsAt?.endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [liveEndsAt?.endsAt]);

  if (loading) return <Shell><span className="muted">Cargando sesión…</span></Shell>;
  if (!user) return <Shell><Card pad={24}><p className="muted">Iniciá sesión para entrar a la sala.</p></Card></Shell>;
  if (!session) return <Shell onExit={() => router.back()}><Card pad={24}><p className="muted">La sesión no existe.</p></Card></Shell>;

  const team = getTeam(session.teamId);
  // Atmósfera de la sala: el último pulso del equipo tiñe sutilmente el fondo.
  const lastPulsePt = team?.pulse?.length ? team.pulse[team.pulse.length - 1] : undefined;
  const teamMood = lastPulsePt ? overallOf(lastPulsePt) : null;
  const initiative = session.initiativeId ? getInitiatives(session.teamId).find((i) => i.id === session.initiativeId) : undefined;
  const focusPriority = (initiative?.data?.focus as { priority?: string } | undefined)?.priority;
  const subject = focusPriority || (initiative?.data?.explore?.priority as string) || initiative?.title || "la tensión priorizada";
  const isFacil = user.role !== "member";
  const step = session.stepKey ?? "pulse";
  const closed = session.status === "closed";
  const avg = averagePulse(responses);
  const overall = pulseOverall(avg);
  // Presentes reales: vistos hace menos de ~25s (heartbeat). Evita contar fantasmas.
  const activeParticipants = participants.filter((p) => !p.lastSeen || Date.now() - new Date(p.lastSeen).getTime() < 25000);
  const totalInRoom = activeParticipants.length;
  const totalCards = Object.values(counts).reduce((a, b) => a + b, 0);
  const myIds = new Set(myCards.map((c) => c.id));
  const votesByCluster: Record<string, number> = {};
  votes.forEach((v) => { votesByCluster[v.clusterId] = (votesByCluster[v.clusterId] ?? 0) + 1; });
  const myVoteCount = votes.filter((v) => v.userId === user.id).length;
  // Voto serializado: evita exceder los puntos por doble-click (recalcula remaining tras cada uno).
  const castVote = async (clusterId: string, delta: number, remaining: number) => {
    if (voteBusy) return;
    if (delta > 0 && remaining <= 0) return;
    setVoteBusy(true);
    if (delta > 0) await addVote(sessionId, clusterId); else await removeVote(sessionId, clusterId);
    await load();
    setVoteBusy(false);
  };
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
  const flowHasVotes = Object.values(flowVotes).some((n) => n > 0);
  // Sin votos no se inventa una "etapa crítica" (p.ej. si el facilitador saltó la fase Flujo).
  const criticalStage = (session.result.critical as string) || (flowHasVotes ? flowRanked[0]?.key : undefined);
  const criticalMeta = FLOW_COLS.find((f) => f.key === criticalStage);
  const myCritical = (inputs.find((i) => i.userId === user.id && i.key === "critical")?.value as { stage?: string })?.stage;
  // Si el facilitador sale de una sesión en vivo (sin haberla cerrado), la cerramos:
  // no hay nadie conduciendo, así que deja de estar "iniciada" para los miembros.
  const leave = () => router.push(isFacil ? `/equipos/${session.teamId}` : "/member");
  const exit = () => {
    if (isFacil && session.status === "live") {
      // Un click accidental en la X no debería matar la sesión de todo el equipo.
      if (!window.confirm("¿Cerrar la sesión para todo el equipo? Lo que no se guardó en la iniciativa se pierde.")) return;
      closeSession(sessionId);
    }
    leave();
  };

  if (closed) {
    // Sesión continua: el facilitador puede encadenar la siguiente etapa en la misma reunión.
    if (isFacil && afterClose && session.initiativeId) {
      const nextLabel: Record<string, string> = { focus: "Foco", proof: "Ideación", learn: "Aprendizaje" };
      const continueNow = async () => {
        const res = await createLiveSession({ teamId: session.teamId, initiativeId: session.initiativeId, type: afterClose });
        if (res.session) {
          await setResult(sessionId, { nextSessionId: res.session.id }); // arrastra a toda la sala
          movedRef.current = true;
          router.replace(`/sala/${res.session.id}`);
        }
      };
      return (
        <Shell mood={teamMood}>
          <Card pad={28} style={{ textAlign: "center", maxWidth: 460 }}>
            <div style={{ width: 56, height: 56, borderRadius: "var(--r-lg)", background: "var(--success-bg)", color: "var(--green)", display: "grid", placeItems: "center", margin: "0 auto 14px", animation: "pop-in .35s var(--spring)" }}><Icon name="Check" size={28} /></div>
            <h2 style={{ fontSize: "var(--t-xl)", fontWeight: 800 }}>Etapa cerrada y guardada</h2>
            <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 6, marginBottom: 20 }}>¿Siguen ahora con <b style={{ color: "var(--ink-0)" }}>{nextLabel[afterClose]}</b>? El equipo pasa automáticamente, sin volver a entrar.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Button full size="lg" iconRight="ArrowRight" onClick={continueNow}>Continuar a {nextLabel[afterClose]} ahora</Button>
              <Button full variant="secondary" icon="ArrowLeft" onClick={leave}>Terminar por hoy</Button>
            </div>
          </Card>
        </Shell>
      );
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <Card pad={28} style={{ textAlign: "center", maxWidth: 440 }}>
          <div style={{ width: 56, height: 56, borderRadius: "var(--r-lg)", background: "var(--success-bg)", color: "var(--green)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}><Icon name={user?.role === "member" ? "PartyPopper" : "Check"} size={28} /></div>
          <h2 style={{ fontSize: "var(--t-xl)", fontWeight: 800 }}>{user?.role === "member" ? "¡Gracias por participar!" : "La sesión terminó"}</h2>
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 6, marginBottom: 18 }}>{user?.role === "member" ? "Lo que trabajaron quedó guardado en el equipo. ¡Nos vemos en la próxima sesión! 👋" : "Lo trabajado quedó guardado en el equipo."}</p>
          <Button full icon="ArrowLeft" onClick={exit}>Volver</Button>
        </Card>
      </Shell>
    );
  }

  const retroLabel = retroByKey(session.retro)?.name ?? retroById(session.retro)?.name;
  const Header = (sub: string) => (
    <div style={{ textAlign: "center", marginBottom: 24 }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ width: 9, height: 9, borderRadius: 99, background: "var(--green)", boxShadow: "0 0 8px var(--green)", animation: "glow-pulse 1.4s infinite" }} />
        <span className="eyebrow" style={{ color: "var(--green)" }}>{retroLabel ?? "Sesión en vivo"}</span>
      </div>
      <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>{team?.name ?? "Equipo"}</h1>
      {(() => {
        // El Norte de ESTA sesión: el objetivo de la iniciativa (o el legacy del equipo).
        const objText = (initiative?.objectiveId ? team?.objectives?.find((o) => o.id === initiative.objectiveId)?.text : undefined) ?? team?.data?.objective?.text;
        return objText ? (
          <div style={{ marginTop: 6 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: "var(--r-full)", background: "var(--green-soft)", border: "1px solid color-mix(in srgb, var(--green) 30%, transparent)", fontSize: "var(--t-xs)", fontWeight: 600, color: "var(--ink-1)", maxWidth: 520 }}>
              <Icon name="Compass" size={12} style={{ color: "var(--green)", flexShrink: 0 }} />
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{objText}</span>
            </span>
          </div>
        ) : null;
      })()}
      <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 4 }}>{sub}</p>
      {isFacil && (
        <button onClick={() => setShowJoin(true)} style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: "var(--r-full)", border: "1px solid var(--line-2)", background: "var(--card)", color: "var(--ink-1)", fontSize: "var(--t-sm)", fontWeight: 600 }}>
          <Icon name="QrCode" size={15} /> Invitar al equipo {session.joinCode ? `· ${session.joinCode}` : ""}
        </button>
      )}
      {showJoin && <JoinModal url={typeof window !== "undefined" ? window.location.href : ""} code={session.joinCode} onClose={() => setShowJoin(false)} />}
    </div>
  );

  // El radar promedio del equipo + el detalle por dimensión (escala 1-5).
  const Averages = (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <PulseRadar values={avg} size={320} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "8px 18px" }}>
        {PULSE_DIMS.map((d) => (
          <div key={d.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: "var(--t-xs)", fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: d.color, flexShrink: 0 }} />{d.label}</span>
            <span className="num" style={{ fontWeight: 700, color: d.color }}>{avg[d.key] != null ? to5(avg[d.key]).toFixed(1) : "—"}</span>
          </div>
        ))}
      </div>
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
                    {isFacil && <span role="button" tabIndex={0} title="Borrar tarjeta (duplicada / typo)" onClick={async () => { if (window.confirm("¿Borrar esta tarjeta?")) { await deleteCard(c.id); load(); } }} style={{ marginLeft: "auto", color: "var(--ink-3)", display: "inline-flex", cursor: "pointer", padding: 2 }}><Icon name="Trash2" size={12} /></span>}
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
            <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 8 }}>{col.label} <span className="num muted" style={{ fontSize: "var(--t-xs)" }}>🔒 {n}</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              {mine.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${color}`, borderRadius: "var(--r-sm)", padding: "7px 9px", fontSize: "var(--t-xs)" }}>{c.text}</div>)}
              {!mine.length && <div style={{ color: "var(--ink-3)", fontSize: "var(--t-xs)", textAlign: "center", padding: 12 }}>{editable ? "Sumá lo tuyo · queda oculto" : "Ocultas hasta revelar"}</div>}
            </div>
            {editable && <div style={{ marginTop: 8, display: "flex", gap: 5 }}><input value={cardDraft[col.key] ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, [col.key]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Sumar…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "6px 8px", fontSize: "var(--t-xs)", outline: "none" }} /><button onClick={add} style={{ background: color, color: "#08120c", borderRadius: "var(--r-sm)", padding: "0 9px", display: "grid", placeItems: "center" }}><Icon name="Plus" size={14} /></button></div>}
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
  const goBack = async () => {
    if (stepIdx <= 0) return;
    setBusy(true);
    // Al volver atrás, re-ocultar votaciones/revelados y limpiar el timer del paso.
    await setResult(sessionId, { voteShown: false, cvoteShown: false, ivoteShown: false, flowShown: false, stuckShown: false, iceShown: false, lvoteShown: false, timer: null });
    await setStep(sessionId, seq[stepIdx - 1], stepIdx - 1);
    setBusy(false);
  };
  const facBar = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {isFacil && stepIdx > 0 && <button onClick={goBack} disabled={busy} title="Paso anterior" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--ink-2)", fontSize: "var(--t-xs)", fontWeight: 600, padding: "4px 8px", borderRadius: "var(--r-sm)", border: "1px solid var(--line-2)", background: "var(--card)" }}><Icon name="ChevronLeft" size={14} /> Volver</button>}
        <span className="muted num" style={{ fontSize: "var(--t-xs)" }}>Paso {stepIdx + 1} de {stepTotal}</span>
        <div style={{ flex: 1, height: 4, borderRadius: 99, background: "var(--card-2)", overflow: "hidden", minWidth: 60 }}><div style={{ height: "100%", width: `${((stepIdx + 1) / stepTotal) * 100}%`, background: "var(--green)", borderRadius: 99, transition: "width .4s var(--ease)" }} /></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex" }}>{activeParticipants.slice(0, 8).map((p, i) => <span key={p.userId} style={{ marginLeft: i ? -8 : 0 }}><Avatar name={p.name} initials={p.initials} size={28} idx={i} /></span>)}</div>
        <span className="muted num" style={{ fontSize: "var(--t-sm)" }}>{totalInRoom} en la sala</span>
        {isFacil && !timer && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span className="muted" style={{ fontSize: "var(--t-xs)", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Timer" size={14} /> Timer:</span>
            {[2, 5, 10, 15].map((m) => <button key={m} onClick={() => launchTimer(m)} style={{ padding: "4px 10px", borderRadius: "var(--r-full)", fontSize: "var(--t-xs)", fontWeight: 700, background: "var(--card)", border: "1px solid var(--line-2)", color: "var(--ink-1)" }}>{m}′</button>)}
          </div>
        )}
      </div>
      {timer && <SessionTimer secs={timerSecs} total={timerTotal} running={timerRunning} control={isFacil} onToggle={toggleTimer} onReset={stopTimer} onAdd={addTimerMin} />}
    </div>
  );

  // ════════ PULSO SEMANAL · compartido por todas las sesiones ════════
  // Si la sesión arranca con "pulse"/"pulse_reveal" (porque el equipo no hizo el pulso esta
  // semana), se maneja acá para cualquier tipo; al terminar va al primer paso real de la etapa.
  if (step === "pulse" || step === "pulse_reveal") {
    const NORMAL_FIRST: Record<string, string> = { explore: "cards", focus: "matrix", proof: "ideas", learn: "result" };
    const afterPulse = (session.result.entryStep as string) ?? NORMAL_FIRST[session.type] ?? "cards";
    const toReveal = async () => { setBusy(true); await setStep(sessionId, "pulse_reveal", 1); setBusy(false); };
    const goAfterPulse = async () => { setBusy(true); await setStep(sessionId, afterPulse, 0); setBusy(false); };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "";
    if (step === "pulse") {
      sub = "Pulso del equipo. Ocho dimensiones, del 1 al 5, en anónimo.";
      // Tablero compartido: el miembro puntúa cada dimensión 1-5 y envía; el facilitador ve el contador y revela el radar.
      content = isFacil ? (
        <Card pad={24}><div style={{ textAlign: "center", padding: "8px 0" }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--green)" }}>{responses.length}/{totalInRoom || team?.members.length || 0}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>respondieron el pulso</div><p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 10 }}>El equipo puntúa en anónimo. Vos revelás el radar promedio.</p></div></Card>
      ) : (
        <Card pad={24}>
          {submitted && <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--green)", fontSize: "var(--t-sm)", fontWeight: 600, marginBottom: 14 }}><Icon name="Check" size={16} /> Tu pulso quedó guardado (anónimo).</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, opacity: submitted ? 0.85 : 1 }}>{PULSE_DIMS.map((d) => (
            <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ flex: 1, minWidth: 150, fontSize: "var(--t-sm)", fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: d.color, flexShrink: 0 }} />{d.label}</span>
              <div style={{ display: "flex", gap: 6 }}>
                {[1, 2, 3, 4, 5].map((v) => {
                  const on = draft[d.key] === v;
                  return (
                    <button key={v} disabled={submitted} onClick={() => setDraft((s) => ({ ...s, [d.key]: v }))} className="num"
                      style={{ width: 34, height: 34, borderRadius: 99, fontWeight: 800, fontSize: "var(--t-sm)", border: `1.5px solid ${on ? d.color : "var(--line-2)"}`, background: on ? `color-mix(in srgb, ${d.color} 22%, transparent)` : "var(--card)", color: on ? d.color : "var(--ink-2)", cursor: submitted ? "default" : "pointer", transition: "all .15s var(--ease)" }}>
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}</div>
          <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 14, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Icon name="Lock" size={13} /> Anónimo · {responses.length} de {totalInRoom} respondieron</p>
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Eye" disabled={busy || responses.length === 0} onClick={toReveal}>Revelar radar del equipo ({responses.length})</Button>
        : submitted
          ? <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Esperá a que el facilitador revele el radar del equipo.</p>
          : <Button full size="lg" icon="Send" disabled={busy} onClick={async () => { setBusy(true); const res = await submitPulse(sessionId, Object.fromEntries(PULSE_DIMS.map((d) => [d.key, to100(draft[d.key] ?? 3)]))); setBusy(false); if (!res.error) setSubmitted(true); }}>{busy ? "Enviando…" : "Enviar mi pulso"}</Button>;
    } else {
      sub = "El pulso del equipo, revelado para todos.";
      content = <Card pad={24}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}><span style={{ fontWeight: 700 }}>El radar del equipo</span><Pill color="var(--success)" bg="var(--success-bg)" icon="Eye">{to5(overall).toFixed(1)}/5</Pill></div>{Averages}</Card>;
      controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={goAfterPulse}>Continuar con la sesión</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador continúa con la sesión.</p>;
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: 560 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

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
      setBusy(false); leave();
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
                  ? <textarea defaultValue={answers[q.key] ?? ""} onBlur={(e) => patchResult({ answers: { ...((resultRef.current.answers as Record<string, string>) ?? {}), [q.key]: e.target.value.trim() } })} rows={2} placeholder="El acuerdo del equipo…" style={taF} />
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
            : <Button full size="lg" icon="PenLine" disabled={busy} onClick={() => tapInput("sign", { ok: true })}>Firmo este contrato</Button>}
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
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: wide ? 720 : 560 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ FODA · diagnóstico inicial del equipo (4 cuadrantes) ════════
  if (session.type === "foda") {
    const total = allCards.length;
    const fFinish = async () => {
      setBusy(true);
      const get = (k: string) => allCards.filter((c) => c.columnKey === k).map((c) => c.text);
      const foda = { f: get("f"), o: get("o"), d: get("d"), a: get("a"), date: new Date().toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" }) };
      await finalizeSession(session, { summaryText: `FODA del equipo: ${total} aportes`, cardCount: total, teamData: { foda } });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "";
    if (step === "cards") {
      sub = isFacil
        ? "El equipo completa los cuatro cuadrantes en anónimo. Vos facilitás y revelás."
        : "La foto inicial del equipo: sumá lo tuyo en cada cuadrante. Queda oculto hasta revelar.";
      content = MultiWrite(FODA_COLS, "var(--green)", !isFacil);
      controls = isFacil
        ? <Button full size="lg" icon="Eye" disabled={busy || total === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "cards_reveal", 1); setBusy(false); }}>Revelar FODA ({total})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Cuando estén todos, el facilitador revela.</p>;
    } else {
      sub = "El FODA del equipo, revelado para todos. Conversen sobre lo que aparece.";
      content = MultiReveal(FODA_COLS);
      controls = isFacil
        ? <Button full size="lg" icon="Check" disabled={busy} onClick={fFinish}>{busy ? "Guardando…" : "Cerrar y guardar el FODA"}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador cierra y el FODA queda guardado en el equipo.</p>;
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: 880 }}>
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
    const R = session.result;
    // Causas que dejó Exploración (el insumo de Foco) — del resumen guardado, o directo de las tarjetas.
    const savedCauses = ((initiative?.data?.explore?.causes as string[] | undefined) ?? []).filter((c) => (c ?? "").trim());
    const exploreCauses = savedCauses.length ? savedCauses : fallbackCauses;
    const causes = exploreCauses.map((text, i) => ({ id: `c${i}`, text }));
    const matrixShown = !!R.matrixShown;
    const chosenIdx = R.causeIdx as number | undefined;
    const ieFor = (id: string) => inputs.filter((i) => i.key === `ie:${id}`).map((i) => i.value as { impact?: number; effort?: number });
    const avgIE = (id: string): { impact: number; effort: number; n: number } | null => { const xs = ieFor(id); if (!xs.length) return null; const im = xs.reduce((a, v) => a + (v.impact ?? 0), 0) / xs.length; const ef = xs.reduce((a, v) => a + (v.effort ?? 0), 0) / xs.length; return { impact: im, effort: ef, n: xs.length }; };
    const myIE = (id: string) => inputs.find((i) => i.userId === user.id && i.key === `ie:${id}`)?.value as { impact?: number; effort?: number } | undefined;
    const setMyIE = (id: string, patch: Record<string, number>) => { const cur = myIE(id) ?? {}; tapInput(`ie:${id}`, { ...cur, ...patch }); };
    const raters = new Set(inputs.filter((i) => i.key.startsWith("ie:")).map((i) => i.voterKey)).size;
    const scored = causes.map((c) => { const a = avgIE(c.id); return { ...c, ie: a, score: a ? a.impact - a.effort : -99 }; }).sort((x, y) => y.score - x.score);
    const chosen = chosenIdx != null ? causes[chosenIdx] : undefined;
    const fSteps = ["matrix", "close"];
    const fFinish = async () => {
      setBusy(true);
      await finalizeSession(session, {
        pulseAvg: avg, summaryText: `Causa elegida: ${chosen?.text ?? "—"}`,
        dataKey: "focus", dataValue: { cause: chosen?.text ?? "", rootCause: chosen?.text ?? "", causes: exploreCauses },
      });
      setBusy(false); setAfterClose("proof");
    };

    // Paleta por causa (para el mapa y las etiquetas).
    const CPAL = ["var(--st-explore)", "var(--st-proof)", "var(--warning)", "var(--st-learn)", "var(--violet)", "var(--risk)", "var(--info)", "var(--success)"];
    const cColor = (id: string) => CPAL[causes.findIndex((x) => x.id === id) % CPAL.length];
    // Etiquetas de cuadrante (esquinas), compartidas por pad y mapa.
    const QuadLabels = (
      <>
        <span style={{ position: "absolute", top: 6, left: 8, fontSize: 9, fontWeight: 800, color: "var(--success)", opacity: 0.75 }}>QUICK WIN</span>
        <span style={{ position: "absolute", top: 6, right: 8, fontSize: 9, fontWeight: 800, color: "var(--violet)", opacity: 0.75 }}>APUESTA GRANDE</span>
        <span style={{ position: "absolute", bottom: 6, left: 8, fontSize: 9, fontWeight: 800, color: "var(--ink-3)", opacity: 0.75 }}>RELLENO</span>
        <span style={{ position: "absolute", bottom: 6, right: 8, fontSize: 9, fontWeight: 800, color: "var(--risk)", opacity: 0.75 }}>EVITAR</span>
      </>
    );
    const padBase: React.CSSProperties = { position: "relative", width: "100%", borderRadius: "var(--r-md)", border: "1px solid var(--line-2)", background: "linear-gradient(135deg, color-mix(in srgb, var(--success) 6%, var(--card-2)) 0%, var(--card-2) 50%, color-mix(in srgb, var(--risk) 5%, var(--card-2)) 100%)", overflow: "hidden" };
    const CrossLines = (
      <>
        <span style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--line-2)" }} />
        <span style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "var(--line-2)" }} />
      </>
    );
    // Mapa ÚNICO compartido: elegís la ficha de una causa y tocás dónde cae en el plano.
    // Cada uno ve solo SUS fichas hasta que el facilitador revela (ahí se ven las coincidencias).
    const placedIds = causes.filter((c) => { const m = myIE(c.id); return m?.impact != null && m?.effort != null; }).map((c) => c.id);
    const activeCause = causes.find((c) => c.id === focusSel) ?? causes.find((c) => !placedIds.includes(c.id)) ?? causes[0];
    const placeOnBoard = (e: React.MouseEvent<HTMLDivElement>) => {
      if (isFacil || !activeCause) return; // el facilitador no participa
      const r = e.currentTarget.getBoundingClientRect();
      const fx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const fy = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      const effort = Math.round((fx * 4 + 1) * 2) / 2;
      const impact = Math.round(((1 - fy) * 4 + 1) * 2) / 2;
      setMyIE(activeCause.id, { impact, effort });
      // Pasa solo a la siguiente causa sin ubicar.
      const next = causes.find((c) => c.id !== activeCause.id && !placedIds.includes(c.id));
      setFocusSel(next?.id ?? null);
    };
    const SingleBoard = (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* fichas: tocá una para tenerla "en la mano", después tocá el mapa */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {causes.map((c, i) => { const placed = placedIds.includes(c.id); const on = !isFacil && activeCause?.id === c.id; return (
            <button key={c.id} disabled={isFacil} onClick={() => setFocusSel(c.id)}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: "var(--r-full)", fontSize: "var(--t-sm)", fontWeight: 600, background: on ? `color-mix(in srgb, ${cColor(c.id)} 16%, var(--card))` : "var(--card)", border: `1px solid ${on ? cColor(c.id) : "var(--line-2)"}`, boxShadow: on ? `0 0 10px color-mix(in srgb, ${cColor(c.id)} 40%, transparent)` : "none", cursor: isFacil ? "default" : "pointer", maxWidth: 280 }}>
              <span className="num" style={{ width: 18, height: 18, borderRadius: 99, background: cColor(c.id), color: "#06121f", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 10, flexShrink: 0 }}>{i + 1}</span>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.text}</span>
              {placed && <Icon name="CircleCheck" size={13} style={{ color: "var(--green)", flexShrink: 0 }} />}
            </button>
          ); })}
        </div>
        <div onClick={placeOnBoard} style={{ ...padBase, aspectRatio: "3 / 2", cursor: isFacil ? "default" : "crosshair" }}>
          {CrossLines}{QuadLabels}
          {/* tus fichas ya ubicadas */}
          {causes.map((c, i) => { const m = myIE(c.id); if (m?.impact == null || m?.effort == null) return null; return (
            <span key={c.id} title={c.text} onClick={(e) => { e.stopPropagation(); if (!isFacil) setFocusSel(c.id); }}
              style={{ position: "absolute", left: `${((m.effort - 1) / 4) * 100}%`, top: `${(1 - (m.impact - 1) / 4) * 100}%`, transform: "translate(-50%,-50%)", width: 24, height: 24, borderRadius: 99, background: cColor(c.id), color: "#06121f", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 11, border: "2px solid var(--bg-1)", boxShadow: `0 0 10px ${cColor(c.id)}`, animation: "pop-in .3s var(--spring)", cursor: "pointer", zIndex: 1 }} className="num">{i + 1}</span>
          ); })}
          {placedIds.length === 0 && (
            <span className="faint" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", fontSize: "var(--t-sm)", display: "inline-flex", alignItems: "center", gap: 6, pointerEvents: "none" }}>
              <Icon name={isFacil ? "EyeOff" : "Hand"} size={15} /> {isFacil ? "El equipo ubica las causas en privado" : "Tocá el mapa para ubicar la causa seleccionada"}
            </span>
          )}
        </div>
        {!isFacil && activeCause && <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-xs)" }}>En la mano: <b style={{ color: cColor(activeCause.id) }}>{activeCause.text}</b> · tocá el mapa donde cae (↑ impacto · ← menos esfuerzo). Tocá una ficha para re-ubicarla.</p>}
      </div>
    );
    // Mapa revelado: cada causa plotteada en su posición promedio; los votos individuales como "calor"; la ganadora brilla.
    const TheMatrix = (
      <div>
        <div style={{ ...padBase, aspectRatio: "3 / 2" }}>
          {CrossLines}{QuadLabels}
          {causes.map((c) => ieFor(c.id).map((v, j) => (v.impact != null && v.effort != null) ? (
            <span key={`${c.id}-${j}`} style={{ position: "absolute", left: `${((v.effort - 1) / 4) * 100}%`, top: `${(1 - (v.impact - 1) / 4) * 100}%`, transform: "translate(-50%,-50%)", width: 7, height: 7, borderRadius: 99, background: cColor(c.id), opacity: 0.32 }} />
          ) : null))}
          {scored.filter((c) => c.ie).map((c, i) => {
            const x = ((c.ie!.effort - 1) / 4) * 100, y = (1 - (c.ie!.impact - 1) / 4) * 100;
            const win = i === 0;
            return (
              <span key={c.id} title={c.text} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)", width: win ? 30 : 24, height: win ? 30 : 24, borderRadius: 99, background: cColor(c.id), color: "#06121f", display: "grid", placeItems: "center", fontWeight: 800, fontSize: win ? 13 : 11, border: "2px solid var(--bg-1)", boxShadow: win ? `0 0 0 2px ${cColor(c.id)}, 0 0 18px ${cColor(c.id)}` : "var(--sh-sm)", animation: win ? "glow-pulse 1.6s infinite" : `gl-reveal .5s var(--spring) ${(i * 0.08).toFixed(2)}s both`, zIndex: win ? 2 : 1 }} className="num">{causes.findIndex((x2) => x2.id === c.id) + 1}</span>
            );
          })}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, justifyContent: "center" }}>
          {causes.map((c, i) => <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--t-xs)", padding: "4px 10px", borderRadius: "var(--r-full)", background: "var(--card-2)", border: "1px solid var(--line)" }}><span className="num" style={{ width: 16, height: 16, borderRadius: 99, background: cColor(c.id), color: "#06121f", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 10 }}>{i + 1}</span>{c.text}</span>)}
        </div>
      </div>
    );

    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (causes.length === 0) {
      sub = "Foco necesita las causas que salen de Exploración.";
      content = <Card pad={24} style={{ textAlign: "center" }}><p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.55 }}>Esta iniciativa todavía no tiene causas cargadas. Primero hacé la sesión de <b style={{ color: "var(--ink-0)" }}>Exploración</b> con el equipo (termina con la lluvia de causas) y volvé a Foco.</p></Card>;
      controls = isFacil ? <Button full size="lg" icon="ArrowLeft" onClick={exit}>Volver</Button> : null;
    } else if (step === "matrix") {
      wide = true;
      sub = matrixShown ? "Dónde cae cada causa. El facilitador elige cuál atacar primero." : "Puntuá cada causa por impacto y esfuerzo (1–5). Anónimo y oculto hasta que el facilitador lo muestre.";
      if (!matrixShown) {
        // Tablero compartido: cada uno UBICA la causa en el plano (tap-to-place). Oculto hasta revelar.
        content = (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {SingleBoard}
            <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-xs)" }}><Icon name="EyeOff" size={12} /> Anónimo · {raters} de {totalInRoom} ubicaron las causas</p>
          </div>
        );
        controls = isFacil
          ? <Button full size="lg" icon="Eye" disabled={busy} onClick={() => setResult(sessionId, { matrixShown: true })}>Mostrar la matriz ({raters}/{totalInRoom})</Button>
          : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Puntuá las causas. El facilitador muestra el resultado cuando todos terminen.</p>;
      } else {
        // Revelado: TODOS ven la misma matriz + la causa elegida (solo el facilitador puede elegir).
        content = (
          <>
            <RevealHeader n={scored.filter((c) => c.ie).length} label="causas en el mapa" color="var(--st-focus)" />
            <RevealPop>{TheMatrix}</RevealPop>
            <div style={{ marginTop: 16 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>{isFacil ? "Elegí la causa a trabajar" : "Causa a trabajar"}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {scored.map((c) => { const idx = causes.findIndex((x) => x.id === c.id); const on = chosenIdx === idx; return (
                  <button key={c.id} disabled={!isFacil} onClick={() => setResult(sessionId, { causeIdx: idx })} style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: "var(--r-md)", background: on ? "color-mix(in srgb, var(--st-focus) 14%, var(--card))" : "var(--card)", border: `1px solid ${on ? "var(--st-focus)" : "var(--line)"}`, cursor: isFacil ? "pointer" : "default" }}>
                    <span style={{ color: on ? "var(--st-focus)" : "var(--ink-3)" }}><Icon name={on ? "CircleCheck" : "Circle"} size={17} /></span>
                    <span style={{ flex: 1, fontSize: "var(--t-sm)", fontWeight: 600 }}>{c.text}</span>
                    {c.ie && <span className="muted num" style={{ fontSize: "var(--t-xs)" }}>I {c.ie.impact.toFixed(1)} · E {c.ie.effort.toFixed(1)}</span>}
                  </button>
                ); })}
              </div>
            </div>
          </>
        );
        controls = isFacil
          ? <Button full size="lg" icon="Check" disabled={busy || chosenIdx == null} onClick={fFinish}>{busy ? "Guardando…" : "Cerrar Foco con esta causa"}</Button>
          : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador elige la causa y cierra Foco.</p>;
      }
    } else {
      sub = "Foco cerrado. La iniciativa pasa a Ideación.";
      content = <Card pad={24} style={{ textAlign: "center" }}>{chosen ? <Pill color="var(--st-focus)" bg="color-mix(in srgb, var(--st-focus) 14%, transparent)" icon="Crosshair">{chosen.text}</Pill> : <span className="muted">—</span>}</Card>;
      controls = isFacil ? <Button full size="lg" icon="ArrowLeft" onClick={exit}>Volver</Button> : null;
    }

    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: wide ? 760 : 560 }}>
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
    const field: React.CSSProperties = { width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none" };
    const rootNote = (initiative?.data?.focus?.rootCause as string) ?? "";
    const tensionNote = (initiative?.data?.explore?.priority as string) ?? "";
    const myRisks = myCards.filter((c) => c.columnKey === "risk");
    const riskCards = allCards.filter((c) => c.columnKey === "risk");
    const riskCount = counts["risk"] ?? 0;
    const confirmCount = inputs.filter((i) => i.key === "confirm").length;
    const iConfirmed = inputs.some((i) => i.userId === user.id && i.key === "confirm");
    const addIdea = async () => { const t = (cardDraft.idea ?? "").trim(); if (!t) return; await addCard(sessionId, "idea", t, true); setCardDraft((d) => ({ ...d, idea: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
    const addRisk = async () => { const t = (cardDraft.risk ?? "").trim(); if (!t) return; await addCard(sessionId, "risk", t, true); setCardDraft((d) => ({ ...d, risk: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
    const groupIdeas = async () => { if (!sel.length) return; setBusy(true); const id = await createCluster(sessionId, `Idea ${clusters.length + 1}`); if (id) for (const cid of sel) await assignCardToCluster(cid, id); setSel([]); setBusy(false); load(); };
    // ICE (Impacto · Confianza · Facilidad) por grupo de ideas
    const ICE_D: [("i" | "c" | "e"), string][] = [["i", "Impacto"], ["c", "Confianza"], ["e", "Facilidad"]];
    const iceScore = (cid: string) => { const xs = inputs.filter((i) => i.key === `ice:${cid}`).map((i) => i.value as { i: number; c: number; e: number }); if (!xs.length) return 0; return Math.round((xs.reduce((s, v) => s + ((v.i ?? 0) + (v.c ?? 0) + (v.e ?? 0)) / 3, 0) / xs.length) * 10) / 10; };
    const iceSubmitters = new Set(inputs.filter((i) => i.key.startsWith("ice:")).map((i) => i.voterKey)).size;
    const iMyIce = inputs.some((i) => i.userId === user.id && i.key.startsWith("ice:"));
    const iceRanked = [...clusters].sort((a, b) => iceScore(b.id) - iceScore(a.id));
    const iceTop = iceRanked[0];
    const submitIce = async () => { setBusy(true); for (const cl of clusters) { const d = iceDraft[cl.id] ?? { i: 5, c: 5, e: 5 }; await setMyInput(sessionId, `ice:${cl.id}`, d); } setBusy(false); };
    // ── Apuestas (1 o 2 en paralelo) ──
    type Bet = { betIf?: string; betThen?: string; signalMetric?: string; signalTarget?: string; signalHow?: string; deadline?: string; actions?: { text: string; who: string }[]; mitig?: Record<string, string> };
    const chosenIds = (((R.ideaClusterIds as string[]) ?? ((R.ideaClusterId as string) ? [R.ideaClusterId as string] : [])) as string[]).slice(0, 2);
    const chosenGroups = chosenIds.map((id) => clusters.find((c) => c.id === id)).filter(Boolean) as SessionCluster[];
    const betSlots = chosenGroups.length ? chosenGroups : ([null] as (SessionCluster | null)[]);
    const bets = (R.bets as Bet[]) ?? [];
    const getBet = (i: number): Bet => bets[i] ?? {};
    // Los setters leen del ref (lo más fresco) para que dos ediciones seguidas no se pisen.
    const setBet = (i: number, patch: Bet) => { const cur = ((resultRef.current.bets as Bet[]) ?? []).map((b) => ({ ...b })); while (cur.length <= i) cur.push({}); cur[i] = { ...cur[i], ...patch }; patchResult({ bets: cur }); };
    const toggleBetGroup = (id: string) => { const curIds = (((resultRef.current.ideaClusterIds as string[]) ?? chosenIds) as string[]).slice(0, 2); const next = curIds.includes(id) ? curIds.filter((x) => x !== id) : (curIds.length < 2 ? [...curIds, id] : curIds); patchResult({ ideaClusterIds: next, ideaClusterId: next[0] ?? "", idea: next[0] ? (clusters.find((c) => c.id === next[0])?.name ?? "") : "" }); };
    // Hueco punteado: el espacio en blanco de la frase que se va completando en vivo.
    const Gap = ({ w = 110 }: { w?: number }) => <span style={{ display: "inline-block", width: w, borderBottom: "2px dashed color-mix(in srgb, var(--st-proof) 55%, transparent)", verticalAlign: "baseline" }}>&nbsp;</span>;
    const BetCardFor = (i: number) => { const b = getBet(i); const grp = chosenGroups[i]; const acts = (b.actions ?? []).filter((a) => (a.text ?? "").trim()); return (
      <div key={i} style={{ padding: "16px 18px", background: "color-mix(in srgb, var(--st-proof) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--st-proof) 30%, transparent)", borderRadius: "var(--r-md)" }}>
        <div className="eyebrow" style={{ color: "var(--st-proof)", marginBottom: 8 }}>{betSlots.length > 1 ? `Apuesta ${i + 1}` : "La apuesta"}{grp ? ` · ${grp.name}` : ""}</div>
        <p style={{ fontSize: "var(--t-md)", lineHeight: 1.8 }}>
          Creemos que si {b.betIf ? <b style={{ color: "var(--green)" }}>{b.betIf}</b> : <Gap w={150} />}, lograremos que {b.betThen ? <b style={{ color: "var(--st-proof)" }}>{b.betThen}</b> : <Gap w={150} />},
          y lo vamos a ver en {b.signalMetric ? <b style={{ color: "var(--info)" }}>{b.signalMetric}</b> : <Gap w={110} />}{b.signalTarget ? <span> (meta <b style={{ color: "var(--info)" }}>{b.signalTarget}</b>)</span> : null}.
        </p>
        {acts.length > 0 && <div style={{ marginTop: 10 }}><div className="eyebrow" style={{ marginBottom: 6 }}>Acciones · responsables</div><div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{acts.map((a, k) => <div key={k} style={{ fontSize: "var(--t-sm)", display: "flex", alignItems: "center", gap: 8 }}><Icon name="CheckSquare" size={14} style={{ color: "var(--st-proof)" }} /><span style={{ flex: 1 }}>{a.text}</span>{a.who && <span className="num" style={{ fontSize: "var(--t-xs)", color: "var(--ink-2)" }}>{a.who}</span>}</div>)}</div></div>}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10, fontSize: "var(--t-sm)" }}>
          {b.signalHow && <span className="muted">Cómo se mide: <b style={{ color: "var(--ink-0)" }}>{b.signalHow}</b></span>}
          <span className="muted">Plazo: <b style={{ color: "var(--ink-0)" }}>{b.deadline || "—"}</b></span>
        </div>
        {b.mitig && Object.values(b.mitig).some((v) => (v ?? "").trim()) && <div style={{ marginTop: 10 }}><div className="eyebrow" style={{ marginBottom: 6 }}>Mitigaciones</div><div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{riskCards.filter((rk) => (b.mitig![rk.id] ?? "").trim()).map((rk) => <div key={rk.id} style={{ fontSize: "var(--t-xs)", color: "var(--ink-2)" }}><span style={{ color: "var(--risk)" }}>{rk.text}</span> → <b style={{ color: "var(--ink-0)" }}>{b.mitig![rk.id]}</b></div>)}</div></div>}
      </div>
    ); };
    const BetCardsAll = <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{betSlots.map((_, i) => BetCardFor(i))}</div>;
    const BetEditorFor = (i: number) => { const b = getBet(i); const acts = b.actions ?? []; const grp = chosenGroups[i]; return (
      <div key={i} style={{ display: "flex", flexDirection: "column", gap: 12, border: betSlots.length > 1 ? "1px solid var(--line)" : undefined, borderRadius: "var(--r-lg)", padding: betSlots.length > 1 ? 14 : 0 }}>
        {betSlots.length > 1 && <div className="eyebrow" style={{ color: "var(--st-proof)" }}>Apuesta {i + 1}{grp ? ` · ${grp.name}` : ""}</div>}
        {/* Mad-Libs: la frase se completa en los blancos, delante de todos. */}
        {(() => {
          const blank = (color: string): React.CSSProperties => ({ display: "inline-block", verticalAlign: "baseline", background: "transparent", border: "none", borderBottom: `2px dashed color-mix(in srgb, ${color} 60%, transparent)`, color, fontWeight: 700, fontSize: "inherit", fontFamily: "inherit", outline: "none", padding: "0 4px", maxWidth: "100%" });
          return (
            <div className="betml" style={{ padding: "16px 18px", background: "color-mix(in srgb, var(--st-proof) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--st-proof) 26%, transparent)", borderRadius: "var(--r-md)", fontSize: "var(--t-md)", lineHeight: 2 }}>
              <span>Creemos que si</span>
              <input defaultValue={b.betIf || grp?.name || ""} onBlur={(e) => setBet(i, { betIf: e.target.value })} placeholder="hacemos este cambio concreto…" style={{ ...blank("var(--green)"), width: "auto", minWidth: 220, flex: 1 }} />
              <span>, lograremos que</span>
              <input defaultValue={b.betThen} onBlur={(e) => setBet(i, { betThen: e.target.value })} placeholder="pase este resultado…" style={{ ...blank("var(--st-proof)"), width: "auto", minWidth: 220 }} />
              <span>, y lo vamos a ver en</span>
              <input defaultValue={b.signalMetric} onBlur={(e) => setBet(i, { signalMetric: e.target.value })} placeholder="qué métrica…" style={{ ...blank("var(--info)"), width: "auto", minWidth: 140 }} />
              <span> (meta</span>
              <input defaultValue={b.signalTarget} onBlur={(e) => setBet(i, { signalTarget: e.target.value })} placeholder="de 30% a 80%" style={{ ...blank("var(--info)"), width: "auto", minWidth: 110 }} />
              <span>).</span>
            </div>
          );
        })()}
        <input defaultValue={b.signalHow} onBlur={(e) => setBet(i, { signalHow: e.target.value })} placeholder="¿Cómo se mide? ¿Quién lo registra?" style={field} />
        <div>
          <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Acciones concretas · responsable</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {acts.map((a, k) => (
              <div key={k} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input defaultValue={a.text} onBlur={(e) => { const n = acts.map((x) => ({ ...x })); n[k] = { ...n[k], text: e.target.value }; setBet(i, { actions: n }); }} placeholder={`Acción ${k + 1}…`} style={{ ...field, flex: 1, minWidth: 0 }} />
                <select value={a.who || ""} onChange={(e) => { const n = acts.map((x) => ({ ...x })); n[k] = { ...n[k], who: e.target.value }; setBet(i, { actions: n }); }} style={{ background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "9px 8px", fontSize: "var(--t-sm)", outline: "none", maxWidth: 130 }}>
                  <option value="">¿Quién?</option>
                  {(team?.members ?? []).map((m, mk) => <option key={mk} value={m.name}>{m.name}</option>)}
                </select>
                <button onClick={() => setBet(i, { actions: acts.filter((_, x) => x !== k) })} style={{ color: "var(--ink-3)" }}><Icon name="Trash2" size={15} /></button>
              </div>
            ))}
            <Button size="sm" variant="secondary" icon="Plus" onClick={() => setBet(i, { actions: [...acts, { text: "", who: "" }] })}>Agregar acción</Button>
          </div>
        </div>
        {riskCards.length > 0 && (
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Mitigaciones</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {riskCards.map((rk) => <div key={rk.id} style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ flex: "0 0 40%", fontSize: "var(--t-xs)", color: "var(--risk)" }}>{rk.text}</span><input defaultValue={(b.mitig ?? {})[rk.id] ?? ""} onBlur={(e) => setBet(i, { mitig: { ...(b.mitig ?? {}), [rk.id]: e.target.value } })} placeholder="¿Cómo lo prevenimos?" style={{ ...field, flex: 1, minWidth: 0 }} /></div>)}
            </div>
          </div>
        )}
        <div>
          <label className="eyebrow" style={{ display: "block", marginBottom: 9 }}>Plazo para revisar</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{["1 semana", "15 días", "30 días"].map((d) => { const on = b.deadline === d; return <button key={d} onClick={() => setBet(i, { deadline: d })} style={{ padding: "9px 14px", borderRadius: "var(--r-full)", fontSize: "var(--t-sm)", fontWeight: 600, background: on ? "var(--st-proof)" : "var(--card-2)", color: on ? "#08120c" : "var(--ink-1)", border: "1px solid " + (on ? "var(--st-proof)" : "var(--line-2)") }}>{d}</button>; })}</div>
        </div>
      </div>
    ); };
    const BetEditorsAll = <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{chosenGroups.map((_, i) => BetEditorFor(i))}</div>;
    const fSteps = ["ideas", "ideas_reveal", "group", "ice", "premortem", "premortem_reveal", "bet", "commit", "close"];
    const fNext = async () => { const i = fSteps.indexOf(step); setBusy(true); await setStep(sessionId, fSteps[Math.min(fSteps.length - 1, i + 1)], i + 1); setBusy(false); };
    const fFinish = async () => {
      setBusy(true);
      const secondary = iceRanked.filter((c) => !chosenIds.includes(c.id)).map((c) => ({ name: c.name, ice: iceScore(c.id) }));
      const betsOut = betSlots.map((g, i) => { const b = getBet(i); const mit = riskCards.map((rk) => ({ risk: rk.text, plan: (b.mitig ?? {})[rk.id] ?? "" })).filter((m) => m.plan.trim()); return { name: g?.name ?? "", betIf: b.betIf ?? "", betThen: b.betThen ?? "", signalMetric: b.signalMetric ?? "", signalTarget: b.signalTarget ?? "", signalHow: b.signalHow ?? "", deadline: b.deadline ?? "", actions: (b.actions ?? []).filter((a) => (a.text ?? "").trim()), mitigations: mit }; });
      const b0 = betsOut[0] ?? { name: "", betIf: "", betThen: "", signalMetric: "", signalTarget: "", signalHow: "", deadline: "", actions: [] as { text: string; who: string }[], mitigations: [] as { risk: string; plan: string }[] };
      await finalizeSession(session, { pulseAvg: avg, cardCount: ideaCards.length, summaryText: `Apuesta: ${b0.betThen || "—"}`, dataKey: "proof", dataValue: { idea: b0.name, bets: betsOut, betIf: b0.betIf, betThen: b0.betThen, signal: b0.signalMetric ? `${b0.signalMetric}${b0.signalTarget ? ` → ${b0.signalTarget}` : ""}` : "", signalMetric: b0.signalMetric, signalTarget: b0.signalTarget, signalHow: b0.signalHow, responsible: b0.actions[0]?.who || "", actions: b0.actions, deadline: b0.deadline, risks: riskCards.map((c) => c.text), mitigations: b0.mitigations, committed: confirmCount, secondaryIdeas: secondary } });
      setBusy(false); setAfterClose("learn");
    };
    const proofReminder = (rootNote || tensionNote) ? (
      <div style={{ padding: "9px 12px", background: "color-mix(in srgb, var(--st-focus) 8%, transparent)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", marginBottom: 14, fontSize: "var(--t-xs)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Icon name="GitBranch" size={13} style={{ color: "var(--st-focus)" }} />
        <span className="muted">Causa raíz:</span> <b style={{ color: "var(--ink-0)" }}>{rootNote || "—"}</b>
        {tensionNote && <span className="muted" style={{ width: "100%" }}><Icon name="Star" size={12} /> Tensión: {tensionNote}</span>}
      </div>
    ) : null;

    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (step === "ideas") {
      sub = `¿Qué podríamos probar para mover "${subject}"? Tirá ideas a ciegas. Cantidad primero.`;
      content = (
        <Card pad={20}>
          <HiddenDots n={ideaCount} label="ideas en el aire · ocultas" color="var(--st-proof)" />
          {!isFacil && <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input value={cardDraft.idea ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, idea: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addIdea()} placeholder="Una idea para probar…" style={field} />
            <Button icon="Plus" onClick={addIdea}>Sumar</Button>
          </div>}
          {!isFacil && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{myIdeas.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-proof)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 6 }}>· tuya</span></div>)}</div>}
        </Card>
      );
      controls = isFacil ? <Button full size="lg" icon="Eye" disabled={busy || ideaCount === 0} onClick={fNext}>Revelar ideas ({ideaCount})</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Sumá tus ideas. Se revelan todas juntas.</p>;
    } else if (step === "ideas_reveal") {
      sub = "Las ideas, a la vista. Después las agrupamos por tema.";
      content = <><RevealHeader n={ideaCards.length} label="ideas sobre la mesa" color="var(--st-proof)" /><Cascade>{ideaCards.map((c) => <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-proof)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}><span style={{ flex: 1 }}>{c.text}</span>{isFacil && <span role="button" tabIndex={0} title="Borrar" onClick={async () => { if (window.confirm("¿Borrar esta idea?")) { await deleteCard(c.id); load(); } }} style={{ color: "var(--ink-3)", display: "inline-flex", cursor: "pointer" }}><Icon name="Trash2" size={13} /></span>}</div>)}</Cascade>{!ideaCards.length && <p className="muted" style={{ fontSize: "var(--t-sm)", textAlign: "center" }}>No se cargaron ideas.</p>}</>;
      controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Agrupar ideas</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador agrupa las ideas parecidas.</p>;
    } else if (step === "group") {
      wide = true; sub = isFacil ? "Juntá las ideas parecidas en grupos para puntuarlas mejor." : "El facilitador agrupa las ideas parecidas.";
      content = (
        <div className="cluster-grid" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18, alignItems: "start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span className="eyebrow">Sueltas ({loose.length})</span>
              {isFacil && sel.length > 0 && <Button size="sm" icon="Group" disabled={busy} onClick={groupIdeas}>Agrupar {sel.length}</Button>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px,1fr))", gap: 10 }}>
              {loose.map((c) => { const on = sel.includes(c.id); const st: React.CSSProperties = { textAlign: "left", background: on ? "var(--green-soft)" : "var(--card)", border: "1px solid " + (on ? "var(--green)" : "var(--line)"), borderLeft: "3px solid var(--st-proof)", borderRadius: "var(--r-md)", padding: "10px 11px", fontSize: "var(--t-sm)", lineHeight: 1.4, position: "relative" };
                return isFacil ? <button key={c.id} onClick={() => setSel((s) => (on ? s.filter((x) => x !== c.id) : [...s, c.id]))} style={st}>{on && <span style={{ position: "absolute", top: 6, right: 6, color: "var(--green)" }}><Icon name="CheckCircle2" size={14} /></span>}{c.text}</button> : <div key={c.id} style={st}>{c.text}</div>;
              })}
              {!loose.length && <div style={{ gridColumn: "1/-1", color: "var(--ink-3)", fontSize: "var(--t-sm)", padding: 16, textAlign: "center" }}>Todas agrupadas.</div>}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span className="eyebrow">Grupos de ideas ({clusters.length})</span>
            {clusters.map((cl) => (
              <Card key={cl.id} pad={12}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ color: "var(--st-proof)" }}><Icon name="Layers" size={15} /></span>
                  {isFacil ? <input defaultValue={cl.name} onBlur={(e) => { if (e.target.value.trim()) renameCluster(cl.id, e.target.value.trim()); }} title="Tocá para ponerle un nombre que el equipo recuerde" placeholder="Nombre del grupo…" style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", color: "var(--ink-0)", fontWeight: 700, fontSize: "var(--t-sm)", outline: "none", borderBottom: "1px dashed color-mix(in srgb, var(--green) 55%, transparent)" }} /> : <span style={{ flex: 1, fontWeight: 700, fontSize: "var(--t-sm)" }}>{cl.name}</span>}
                  {isFacil && <button onClick={() => deleteCluster(cl.id)} style={{ color: "var(--ink-3)" }}><Icon name="Trash2" size={14} /></button>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{cardsOf(cl.id).map((c) => <div key={c.id} style={{ fontSize: "var(--t-xs)", color: "var(--ink-1)", padding: "5px 7px", background: "var(--card-2)", borderRadius: "var(--r-sm)", borderLeft: "2px solid var(--st-proof)" }}>{c.text}</div>)}</div>
              </Card>
            ))}
            {!clusters.length && <div style={{ border: "1px dashed var(--line-2)", borderRadius: "var(--r-md)", padding: 18, textAlign: "center", color: "var(--ink-3)", fontSize: "var(--t-sm)" }}>{isFacil ? "Seleccioná ideas y agrupalas." : "Todavía no hay grupos."}</div>}
          </div>
        </div>
      );
      controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || clusters.length === 0} onClick={fNext}>Puntuar con ICE</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Mirá cómo se agrupan las ideas.</p>;
    } else if (step === "ice") {
      const shown = !!session.result.iceShown;
      sub = shown ? "Resultado ICE: qué idea conviene apostar (impacto · confianza · facilidad)." : "Puntuá cada grupo: Impacto, Confianza y Facilidad (1–10). Oculto hasta que el facilitador lo muestre.";
      content = shown ? (
        <>
          <RevealHeader n={iceRanked.length} label={`ideas puntuadas · gana "${iceRanked[0]?.name ?? "—"}"`} color="var(--st-proof)" />
          <Cascade>
            {iceRanked.map((cl, i) => { const on = chosenIds.includes(cl.id); const sc = iceScore(cl.id); return (
              <button key={cl.id} onClick={() => isFacil && toggleBetGroup(cl.id)} disabled={!isFacil} style={{ width: "100%", textAlign: "left", background: on ? "color-mix(in srgb, var(--st-proof) 14%, var(--card))" : "var(--card)", border: `1px solid ${on ? "var(--st-proof)" : "var(--line)"}`, borderRadius: "var(--r-md)", padding: "11px 13px", fontSize: "var(--t-sm)", display: "flex", alignItems: "center", gap: 10, cursor: isFacil ? "pointer" : "default", boxShadow: i === 0 ? "var(--glow-soft)" : "none" }}>
                {isFacil && <span style={{ color: on ? "var(--st-proof)" : "var(--ink-3)" }}><Icon name={on ? "CircleCheck" : "Circle"} size={16} /></span>}
                <span className="num" style={{ width: 18, fontWeight: 700, color: i === 0 ? "var(--st-proof)" : "var(--ink-3)" }}>{i + 1}</span>
                <span style={{ flex: 1 }}>{cl.name}</span>
                <div style={{ width: 70 }}><Bar value={(sc / 10) * 100} color="var(--st-proof)" height={6} /></div>
                <span className="num" style={{ fontWeight: 700, width: 28, textAlign: "right" }}>{sc}</span>
              </button>
            ); })}
          </Cascade>
          {isFacil && <p className="muted" style={{ fontSize: "var(--t-xs)", textAlign: "center", marginTop: 10 }}>Elegí 1 o 2 ideas para apostar (la de mayor ICE queda sugerida). Las demás quedan para probar después.</p>}
        </>
      ) : (
        <>
          {isFacil ? (
            <Card pad={24}><HiddenDots n={iceSubmitters} label={`de ${totalInRoom} puntuaron · oculto hasta revelar`} color="var(--st-proof)" /></Card>
          ) : iMyIce ? (
            <Card pad={24} style={{ textAlign: "center" }}><Icon name="Check" size={26} style={{ color: "var(--green)" }} /><p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 8 }}>Puntuaste. Esperá a que el facilitador muestre el resultado.</p></Card>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {clusters.map((cl) => { const d = iceDraft[cl.id] ?? { i: 5, c: 5, e: 5 }; return (
                <Card key={cl.id} pad={16}>
                  <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 10 }}>{cl.name}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {ICE_D.map(([k, label]) => (
                      <div key={k}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--t-xs)", marginBottom: 3 }}><span className="muted">{label}</span><span className="num" style={{ fontWeight: 700 }}>{d[k]}</span></div>
                        <input type="range" min={1} max={10} value={d[k]} onChange={(e) => setIceDraft((p) => ({ ...p, [cl.id]: { ...d, [k]: Number(e.target.value) } }))} style={{ width: "100%", accentColor: "var(--st-proof)" }} />
                      </div>
                    ))}
                  </div>
                </Card>
              ); })}
              {clusters.length > 1 && (() => {
                // Ranking vivo: se reordena mientras movés las perillas (solo tu vista).
                const myRank = [...clusters].map((cl) => { const d = iceDraft[cl.id] ?? { i: 5, c: 5, e: 5 }; return { cl, sc: Math.round(((d.i + d.c + d.e) / 3) * 10) / 10 }; }).sort((a, b) => b.sc - a.sc);
                return (
                  <Card pad={14}>
                    <div className="eyebrow" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Icon name="ListOrdered" size={13} /> Tu ranking (en vivo, privado)</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {myRank.map((r, i) => (
                        <div key={r.cl.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--t-sm)", transition: "all .3s var(--ease)" }}>
                          <span className="num" style={{ width: 16, fontWeight: 800, color: i === 0 ? "var(--st-proof)" : "var(--ink-3)" }}>{i + 1}</span>
                          <span style={{ flex: 1, minWidth: 0, fontWeight: i === 0 ? 700 : 500 }}>{r.cl.name}</span>
                          <div style={{ width: 64 }}><Bar value={(r.sc / 10) * 100} color={i === 0 ? "var(--st-proof)" : "var(--ink-3)"} height={5} /></div>
                          <span className="num" style={{ fontWeight: 700, width: 30, textAlign: "right", fontSize: "var(--t-xs)" }}>{r.sc}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })()}
            </div>
          )}
          {!iMyIce && clusters.length > 0 && <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-xs)", marginTop: 10 }}><Icon name="EyeOff" size={12} /> Puntuación anónima · {iceSubmitters} de {totalInRoom} puntuaron.</p>}
        </>
      );
      controls = isFacil
        ? (shown ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={() => { if (chosenIds.length === 0 && iceTop) toggleBetGroup(iceTop.id); fNext(); }}>Pre-mortem {chosenIds.length > 1 ? `(${chosenIds.length} apuestas)` : "de la idea"}</Button> : <Button full size="lg" icon="Eye" disabled={busy} onClick={() => setResult(sessionId, { iceShown: true })}>Mostrar ranking ICE ({iceSubmitters}/{totalInRoom})</Button>)
        : (iMyIce ? <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador muestra el ranking cuando todos puntúen.</p> : <Button full size="lg" icon="Send" disabled={busy || !clusters.length} onClick={submitIce}>{busy ? "Enviando…" : "Enviar mis puntuaciones"}</Button>);
    } else if (step === "premortem") {
      sub = "Pre-mortem: imaginá que en 15 días la prueba fracasó. ¿Qué salió mal? (anónimo)";
      content = (
        <Card pad={20}>
          <HiddenDots n={riskCount} label="riesgos anticipados · ocultos" color="var(--risk)" />
          {!isFacil && <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input value={cardDraft.risk ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, risk: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addRisk()} placeholder="Un riesgo o motivo de fracaso…" style={field} />
            <Button icon="Plus" onClick={addRisk}>Sumar</Button>
          </div>}
          {!isFacil && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{myRisks.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--risk)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 6 }}>· tuya</span></div>)}</div>}
        </Card>
      );
      controls = isFacil ? <Button full size="lg" icon="Eye" disabled={busy} onClick={fNext}>Revelar riesgos ({riskCount})</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Anticipá qué podría salir mal. Se revelan juntos.</p>;
    } else if (step === "premortem_reveal") {
      sub = "Los riesgos anticipados. El facilitador los tiene en cuenta al diseñar la apuesta.";
      content = <><RevealHeader n={riskCards.length} label="riesgos sobre la mesa" color="var(--risk)" /><Cascade>{riskCards.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--risk)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}</div>)}</Cascade>{!riskCards.length && <p className="muted" style={{ fontSize: "var(--t-sm)", textAlign: "center" }}>Sin riesgos señalados.</p>}</>;
      controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Diseñar la apuesta</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador diseña la apuesta con el equipo.</p>;
    } else if (step === "bet") {
      wide = betSlots.length > 1; sub = betSlots.length > 1 ? "Las apuestas del equipo. El facilitador las escribe; todos las ven." : "La apuesta del equipo. El facilitador la escribe; todos la ven en vivo.";
      content = isFacil ? BetEditorsAll : BetCardsAll;
      controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Pasar al compromiso</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador está diseñando la apuesta.</p>;
    } else if (step === "commit") {
      sub = betSlots.length > 1 ? "Leé las apuestas. Si estás de acuerdo, comprometete." : "Leé la apuesta. Si estás de acuerdo, comprometete.";
      content = (
        <>
          {BetCardsAll}
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
            : <Button full size="lg" icon="Check" disabled={busy} onClick={() => tapInput("confirm", { ok: true })}>Me comprometo a llevar adelante estas acciones</Button>}
          {isFacil && <Button full size="lg" variant={iConfirmed ? "primary" : "secondary"} icon="Check" disabled={busy} onClick={fFinish}>{busy ? "Guardando…" : "Cerrar y guardar sesión"}</Button>}
        </div>
      );
    } else {
      sub = betSlots.length > 1 ? "Las apuestas quedaron definidas. ¡A probar!" : "La apuesta quedó definida. ¡A probar!";
      const secIdeas = iceRanked.filter((c) => !chosenIds.includes(c.id));
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {BetCardsAll}
          {secIdeas.length > 0 && <div style={{ padding: "10px 12px", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}><div className="eyebrow" style={{ marginBottom: 6 }}><Icon name="Archive" size={12} /> Ideas para probar después</div>{secIdeas.map((c) => <div key={c.id} style={{ fontSize: "var(--t-xs)", color: "var(--ink-2)", display: "flex", justifyContent: "space-between" }}><span>{c.name}</span><span className="num">ICE {iceScore(c.id)}</span></div>)}</div>}
        </div>
      );
      controls = isFacil ? <Button full size="lg" icon="Check" disabled={busy} onClick={fFinish}>{busy ? "Guardando…" : "Cerrar y guardar sesión"}</Button> : null;
    }

    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: wide ? 920 : 600 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {proofReminder}
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
    const DECISIONS = [{ k: "consolidate", l: "Implementar", c: "var(--success)", i: "Anchor", d: "Lo adoptamos como forma de trabajo" }, { k: "iterate", l: "Iterar", c: "var(--st-proof)", i: "RefreshCw", d: "Nueva apuesta sobre lo mismo" }, { k: "drop", l: "Soltar", c: "var(--ink-2)", i: "Archive", d: "No siguió · atender otra causa" }];
    const rl = RESULTS.find((x) => x.k === resultKey);
    const dl = DECISIONS.find((x) => x.k === decision);
    // Recordatorio + datos de la(s) apuesta(s) y su resultado en Seguimiento
    const proofD = initiative?.data?.proof as { betThen?: string; signalMetric?: string; signalTarget?: string; bets?: { name?: string; betThen?: string; signalMetric?: string; signalTarget?: string }[] } | undefined;
    const followCheckins = (initiative?.data?.follow?.betCheckins as { value?: string; pct?: number }[] | undefined) ?? [];
    const learnBets = (proofD?.bets?.length ? proofD.bets : [{ name: "", betThen: proofD?.betThen, signalMetric: proofD?.signalMetric, signalTarget: proofD?.signalTarget }]);
    // Resultado de equipo (co-igual al de tarea): tendencia del pulso del equipo.
    const lpts = team?.pulse ?? [];
    const ovOf = overallOf;
    const lpCur = lpts.length ? ovOf(lpts[lpts.length - 1]) : null;
    const lpDelta = lpts.length > 1 ? lpCur! - ovOf(lpts[lpts.length - 2]) : null;
    const hasBet = !!(proofD?.betThen || proofD?.bets?.length);
    const learnReminder = (hasBet || lpCur !== null) ? (
      <div style={{ padding: "9px 12px", background: "color-mix(in srgb, var(--st-proof) 8%, transparent)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", marginBottom: 14, fontSize: "var(--t-xs)", display: "flex", flexDirection: "column", gap: 4 }}>
        {hasBet && learnBets.map((b, i) => <div key={i}><span className="muted">{learnBets.length > 1 ? `Apuesta ${i + 1}: ` : "La apuesta: "}</span><b style={{ color: "var(--st-proof)" }}>{b.betThen || "—"}</b>{(b.signalMetric || b.signalTarget) && <span className="muted"> · señal: {b.signalMetric}{b.signalTarget ? ` (meta ${b.signalTarget})` : ""}{followCheckins[i]?.value ? ` → logrado ${followCheckins[i]?.value}` : ""}</span>}</div>)}
        {lpCur !== null && <div><span className="muted">Resultado de equipo · salud: </span><b style={{ color: "var(--st-learn)" }}>{lpCur}%</b>{lpDelta !== null && lpDelta !== 0 && <b style={{ color: lpDelta > 0 ? "var(--success)" : "var(--risk)", marginLeft: 6 }}>{lpDelta > 0 ? "+" : ""}{lpDelta} vs la sesión anterior</b>}</div>}
      </div>
    ) : null;
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
    const groupLearnings = async () => { if (!sel.length) return; setBusy(true); const id = await createCluster(sessionId, `Aprendizaje ${clusters.length + 1}`); if (id) for (const cid of sel) await assignCardToCluster(cid, id); setSel([]); setBusy(false); load(); };
    const voteLearn = (clusterId: string, delta: number) => castVote(clusterId, delta, remaining);
    const lShown = !!R.lvoteShown;
    const fSteps = ["result", "reflect", "learnings", "learnings_reveal", "group", "vote", "decision", "close"];
    const fNext = async () => { const i = fSteps.indexOf(step); setBusy(true); await setStep(sessionId, fSteps[Math.min(fSteps.length - 1, i + 1)], i + 1); setBusy(false); };
    const fFinish = async () => {
      setBusy(true);
      // Decisión/resultado GENERAL de la iniciativa a partir de TODAS las apuestas.
      // Prioridad de etapa: si alguna apuesta itera, la iniciativa vuelve a Prueba (se re-testea);
      // si no, queda cerrada. La decisión por apuesta se guarda igual en decisions[]/results[]
      // (la consolidación de una apuesta puntual se ofrece aparte en la iniciativa).
      const anyIterate = decisions.includes("iterate");
      const anyConsolidate = decisions.includes("consolidate");
      const overallDecision = anyIterate ? "iterate" : anyConsolidate ? "consolidate" : (decisions[0] ?? "drop");
      const uniqResults = [...new Set(results.filter(Boolean))];
      const overallResult = uniqResults.length === 1 ? uniqResults[0] : (results.length ? "partial" : "");
      const rOv = RESULTS.find((x) => x.k === overallResult);
      const dOv = DECISIONS.find((x) => x.k === overallDecision);
      await finalizeSession(session, {
        pulseAvg: avg, cardCount: learnCount, summaryText: `Resultado: ${rOv?.l ?? "—"} · ${dOv?.l ?? "—"}`,
        dataKey: "learn", dataValue: { result: overallResult, results, decision: overallDecision, decisions, achieved, learnings: learnCards.map((c) => c.text), highlights: ranked.map((c) => ({ name: c.name, votes: votesByCluster[c.id] ?? 0 })).filter((h) => h.votes > 0) },
        noAdvance: true, status: anyIterate ? "active" : "done", stageOverride: anyIterate ? "ideation" : undefined,
      });
      setBusy(false); leave();
    };
    const results = (R.results as string[]) ?? (resultKey ? [resultKey] : []);
    const decisions = (R.decisions as string[]) ?? (decision ? [decision] : []);
    const setArr = (which: "results" | "decisions", i: number, val: string) => { const arr = (((resultRef.current[which] as string[]) ?? (which === "results" ? results : decisions))).slice(); while (arr.length <= i) arr.push(""); arr[i] = val; patchResult({ [which]: arr }); };
    const achieved = (R.achieved as string[]) ?? [];
    const setAchieved = (i: number, val: string) => { const arr = (((resultRef.current.achieved as string[]) ?? achieved)).slice(); while (arr.length <= i) arr.push(""); arr[i] = val; patchResult({ achieved: arr }); };
    // "Dial" de veredicto: la opción elegida brilla y crece; las demás se apagan.
    const PickRow = (opts: { k: string; l: string; c: string; i: string; d?: string }[], value: string, onPick: (k: string) => void, editable = true) => (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 10 }}>
        {opts.map((o) => { const on = value === o.k; const dim = !!value && !on; const inner = (
          <>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}>
              <span style={{ color: o.c, transform: on ? "scale(1.25)" : "scale(1)", transition: "transform .25s var(--spring)", display: "inline-flex" }}><Icon name={o.i} size={26} /></span>
              <span style={{ fontWeight: 800, fontSize: "var(--t-sm)" }}>{o.l}</span>
              {o.d && <p className="muted" style={{ fontSize: "var(--t-xs)", lineHeight: 1.35 }}>{o.d}</p>}
            </div>
          </>
        ); const st: React.CSSProperties = { textAlign: "center", padding: "16px 12px", borderRadius: "var(--r-lg)", background: on ? `color-mix(in srgb, ${o.c} 14%, var(--card))` : "var(--card)", border: `1px solid ${on ? o.c : "var(--line-2)"}`, opacity: dim ? 0.45 : editable || on ? 1 : 0.6, boxShadow: on ? `0 0 0 1px ${o.c}, 0 0 18px color-mix(in srgb, ${o.c} 35%, transparent)` : "none", transition: "all .25s var(--ease)", animation: on ? "pop-in .3s var(--spring)" : undefined };
          return editable
            ? <button key={o.k} onClick={() => onPick(o.k)} style={st}>{inner}</button>
            : <div key={o.k} style={st}>{inner}</div>;
        })}
      </div>
    );
    const betLabel = (i: number) => learnBets.length > 1 ? `Apuesta ${i + 1}${learnBets[i]?.name ? ` · ${learnBets[i]?.name}` : ""}` : "";
    const PickPerBet = (opts: { k: string; l: string; c: string; i: string; d?: string }[], which: "results" | "decisions") => (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {learnBets.map((b, i) => (
          <div key={i}>
            {learnBets.length > 1 && <div className="eyebrow" style={{ color: "var(--st-proof)", marginBottom: 8 }}>{betLabel(i)}{which === "results" && (b.signalTarget || followCheckins[i]?.value) && <span className="faint" style={{ marginLeft: 6 }}>meta {b.signalTarget || "—"}{followCheckins[i]?.value ? ` · logrado ${followCheckins[i]?.value}` : ""}</span>}</div>}
            {PickRow(opts, (which === "results" ? results : decisions)[i] ?? "", (k) => setArr(which, i, k), isFacil)}
          </div>
        ))}
      </div>
    );

    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (step === "result") {
      sub = learnBets.length > 1 ? "¿Funcionó cada apuesta que probaron? La mirada honesta del equipo, con el dato al lado." : "¿Funcionó la apuesta que probaron? La mirada honesta del equipo, con el dato al lado.";
      content = (
        <>
          {PickPerBet(RESULTS, "results")}
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {learnBets.map((b, i) => (
              <Card key={i} pad={14}>
                <div className="eyebrow" style={{ marginBottom: 10 }}>{learnBets.length > 1 ? `Apuesta ${i + 1} · ` : ""}El dato{b.signalMetric ? ` · ${b.signalMetric}` : ""}</div>
                {/* antes → después */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: isFacil ? 12 : 0, flexWrap: "wrap" }}>
                  <div style={{ textAlign: "center", padding: "10px 18px", borderRadius: "var(--r-md)", background: "var(--card-2)", border: "1px solid var(--line)" }}>
                    <div className="muted" style={{ fontSize: 10 }}>la meta</div>
                    <div className="num" style={{ fontSize: "var(--t-lg)", fontWeight: 800, color: "var(--ink-1)" }}>{b.signalTarget || "—"}</div>
                  </div>
                  <Icon name="ArrowRight" size={20} style={{ color: "var(--st-learn)" }} />
                  <div style={{ textAlign: "center", padding: "10px 18px", borderRadius: "var(--r-md)", background: achieved[i] ? "color-mix(in srgb, var(--st-learn) 12%, var(--card))" : "var(--card-2)", border: `1px solid ${achieved[i] ? "var(--st-learn)" : "var(--line)"}`, transition: "all .3s var(--ease)" }}>
                    <div className="muted" style={{ fontSize: 10 }}>lo logrado</div>
                    <div className="num" style={{ fontSize: "var(--t-lg)", fontWeight: 800, color: achieved[i] ? "var(--st-learn)" : "var(--ink-3)" }}>{achieved[i] || "?"}</div>
                  </div>
                </div>
                {isFacil && <input defaultValue={achieved[i] ?? ""} onBlur={(e) => setAchieved(i, e.target.value.trim())} placeholder="¿Qué valor lograron / qué pasó?" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "10px 12px", fontSize: "var(--t-sm)", outline: "none" }} />}
              </Card>
            ))}
          </div>
        </>
      );
      controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || results.filter(Boolean).length < learnBets.length} onClick={fNext}>Siguiente: reflexión</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador marca el resultado con el equipo.</p>;
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
          <Button full icon={reflected ? "Check" : "Lock"} variant={reflected ? "secondary" : "primary"} onClick={() => tapInput("reflected", { ok: true })} style={{ marginTop: 12 }}>{reflected ? "Guardado en privado" : "Guardar mi reflexión"}</Button>
          <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 10, textAlign: "center" }}>Nadie más —ni el facilitador— puede leer esto.</p>
        </Card>
      );
      controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Pasar a compartir aprendizajes</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Tomate tu minuto. El facilitador sigue cuando estén.</p>;
    } else if (step === "learnings") {
      sub = "¿Qué aprendimos? Lo que nos llevamos, sirva o no la prueba. Se escriben a ciegas.";
      content = (
        <Card pad={20}>
          <HiddenDots n={learnCount} label="aprendizajes · ocultos" color="var(--st-learn)" />
          {!isFacil && <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input value={cardDraft.learning ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, learning: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addLearning()} placeholder="Un aprendizaje…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none" }} />
            <Button icon="Plus" onClick={addLearning}>Sumar</Button>
          </div>}
          {!isFacil && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{myLearn.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-learn)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 6 }}>· tuya</span></div>)}</div>}
        </Card>
      );
      controls = isFacil ? <Button full size="lg" icon="Eye" disabled={busy || learnCount === 0} onClick={fNext}>Revelar aprendizajes ({learnCount})</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Sumá tu aprendizaje. Se revelan todos juntos.</p>;
    } else if (step === "learnings_reveal") {
      sub = "Lo que se lleva el equipo. Después agrupamos y votamos los más importantes.";
      content = <><RevealHeader n={learnCards.length} label="aprendizajes del equipo" color="var(--st-learn)" /><Cascade>{learnCards.map((c) => <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-learn)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}><span style={{ flex: 1 }}>{c.text}</span>{isFacil && <span role="button" tabIndex={0} title="Borrar" onClick={async () => { if (window.confirm("¿Borrar este aprendizaje?")) { await deleteCard(c.id); load(); } }} style={{ color: "var(--ink-3)", display: "inline-flex", cursor: "pointer" }}><Icon name="Trash2" size={13} /></span>}</div>)}</Cascade>{!learnCards.length && <p className="muted" style={{ fontSize: "var(--t-sm)", textAlign: "center" }}>Sin aprendizajes.</p>}</>;
      controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Agrupar aprendizajes</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador agrupa los aprendizajes.</p>;
    } else if (step === "group") {
      wide = true; sub = isFacil ? "Agrupá los aprendizajes parecidos. Después se votan los más importantes." : "El facilitador agrupa los aprendizajes.";
      content = (
        <div className="cluster-grid" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18, alignItems: "start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span className="eyebrow">Sueltos ({loose.length})</span>
              {isFacil && sel.length > 0 && <Button size="sm" icon="Group" disabled={busy} onClick={groupLearnings}>Agrupar {sel.length}</Button>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px,1fr))", gap: 10 }}>
              {loose.map((c) => { const on = sel.includes(c.id); const st: React.CSSProperties = { textAlign: "left", background: on ? "var(--green-soft)" : "var(--card)", border: "1px solid " + (on ? "var(--green)" : "var(--line)"), borderLeft: "3px solid var(--st-learn)", borderRadius: "var(--r-md)", padding: "10px 11px", fontSize: "var(--t-sm)", lineHeight: 1.4, position: "relative" };
                return isFacil ? <button key={c.id} onClick={() => setSel((s) => (on ? s.filter((x) => x !== c.id) : [...s, c.id]))} style={st}>{on && <span style={{ position: "absolute", top: 6, right: 6, color: "var(--green)" }}><Icon name="CheckCircle2" size={14} /></span>}{c.text}</button> : <div key={c.id} style={st}>{c.text}</div>;
              })}
              {!loose.length && <div style={{ gridColumn: "1/-1", color: "var(--ink-3)", fontSize: "var(--t-sm)", padding: 16, textAlign: "center" }}>Todos agrupados.</div>}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span className="eyebrow">Grupos ({clusters.length})</span>
            {clusters.map((cl) => (
              <Card key={cl.id} pad={12}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ color: "var(--st-learn)" }}><Icon name="Layers" size={15} /></span>
                  {isFacil ? <input defaultValue={cl.name} onBlur={(e) => { if (e.target.value.trim()) renameCluster(cl.id, e.target.value.trim()); }} title="Tocá para ponerle un nombre que el equipo recuerde" placeholder="Nombre del grupo…" style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", color: "var(--ink-0)", fontWeight: 700, fontSize: "var(--t-sm)", outline: "none", borderBottom: "1px dashed color-mix(in srgb, var(--green) 55%, transparent)" }} /> : <span style={{ flex: 1, fontWeight: 700, fontSize: "var(--t-sm)" }}>{cl.name}</span>}
                  {isFacil && <button onClick={() => deleteCluster(cl.id)} style={{ color: "var(--ink-3)" }}><Icon name="Trash2" size={14} /></button>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{cardsOf(cl.id).map((c) => <div key={c.id} style={{ fontSize: "var(--t-xs)", color: "var(--ink-1)", padding: "5px 7px", background: "var(--card-2)", borderRadius: "var(--r-sm)", borderLeft: "2px solid var(--st-learn)" }}>{c.text}</div>)}</div>
              </Card>
            ))}
            {!clusters.length && <div style={{ border: "1px dashed var(--line-2)", borderRadius: "var(--r-md)", padding: 18, textAlign: "center", color: "var(--ink-3)", fontSize: "var(--t-sm)" }}>{isFacil ? "Seleccioná aprendizajes y agrupalos." : "Todavía no hay grupos."}</div>}
          </div>
        </div>
      );
      controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || clusters.length === 0} onClick={fNext}>Votar los más importantes</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Mirá cómo se agrupan los aprendizajes.</p>;
    } else if (step === "vote") {
      const lVoters = new Set(votes.map((v) => v.voterKey)).size;
      const maxL = Math.max(1, ...ranked.map((c) => votesByCluster[c.id] ?? 0));
      sub = lShown ? "Los aprendizajes más importantes del equipo." : "¿Cuáles aprendizajes son los más importantes? Repartí tus puntos (oculto).";
      content = lShown ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ranked.map((cl, i) => (
            <div key={cl.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--t-sm)" }}>
              <span className="num" style={{ width: 18, fontWeight: 700, color: i === 0 ? "var(--st-learn)" : "var(--ink-3)" }}>{i + 1}</span>
              <span style={{ flex: 1 }}>{cl.name}</span>
              <div style={{ width: 80 }}><Bar value={((votesByCluster[cl.id] ?? 0) / maxL) * 100} color="var(--st-learn)" height={6} /></div>
              <span className="num" style={{ fontWeight: 700, width: 18, textAlign: "right" }}>{votesByCluster[cl.id] ?? 0}</span>
            </div>
          ))}
        </div>
      ) : (
        <>
          {!isFacil && (
            <div style={{ textAlign: "center", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span className="muted" style={{ fontSize: "var(--t-sm)" }}>Tus puntos:</span>
              {Array.from({ length: DOTS_PER }).map((_, i) => <span key={i} style={{ width: 16, height: 16, borderRadius: 99, background: i < remaining ? "var(--st-learn)" : "var(--card-2)", border: `1px solid ${i < remaining ? "var(--st-learn)" : "var(--line-2)"}`, transition: "all .25s var(--ease)" }} />)}
              <span className="faint" style={{ fontSize: "var(--t-xs)" }}>tocá un aprendizaje para soltarlos</span>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {clusters.map((cl) => { const mine = votes.filter((v) => v.userId === user.id && v.clusterId === cl.id).length; return (
              <button key={cl.id} disabled={isFacil} onClick={() => { if (!isFacil && remaining > 0) voteLearn(cl.id, 1); }}
                style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", background: mine > 0 ? "color-mix(in srgb, var(--st-learn) 8%, var(--card))" : "var(--card)", border: `1px solid ${mine > 0 ? "color-mix(in srgb, var(--st-learn) 45%, var(--line))" : "var(--line)"}`, borderRadius: "var(--r-md)", cursor: isFacil ? "default" : remaining > 0 ? "pointer" : "default", transition: "all .2s var(--ease)" }}>
                <div style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: "var(--t-sm)" }}>{cl.name}</div>
                {!isFacil && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    {Array.from({ length: mine }).map((_, k) => <span key={k} style={{ width: 14, height: 14, borderRadius: 99, background: "var(--st-learn)", animation: "pop-in .3s var(--spring)" }} />)}
                    {mine > 0 && <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); voteLearn(cl.id, -1); }} title="Quitar un punto" style={{ display: "inline-flex", color: "var(--ink-3)", padding: 3 }}><Icon name="X" size={13} /></span>}
                    {mine === 0 && remaining > 0 && <span className="faint" style={{ fontSize: "var(--t-xs)" }}>tocar para votar</span>}
                  </span>
                )}
              </button>
            ); })}
          </div>
          <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)", marginTop: 12 }}><Icon name="EyeOff" size={13} /> Votación oculta · {lVoters} de {totalInRoom} votaron</p>
        </>
      );
      controls = isFacil
        ? (lShown ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Siguiente: decisión</Button> : <Button full size="lg" icon="Eye" disabled={busy} onClick={() => setResult(sessionId, { lvoteShown: true })}>Mostrar votación ({lVoters}/{totalInRoom})</Button>)
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Repartí tus {DOTS_PER} puntos. El facilitador muestra el resultado.</p>;
    } else if (step === "decision") {
      sub = learnBets.length > 1 ? "¿Cómo sigue cada apuesta? Cada una puede implementarse, iterar o soltarse." : "¿Cómo sigue esta iniciativa?";
      content = (
        <>
          {/* la bifurcación: tres caminos posibles */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 14 }}>
            <span style={{ width: 14, height: 14, borderRadius: 99, background: "var(--st-learn)", boxShadow: "0 0 10px var(--st-learn)" }} />
            <svg width="220" height="34" viewBox="0 0 220 34" style={{ display: "block" }} aria-hidden>
              <path d="M110 0 v8 M110 8 C 110 22, 20 14, 20 34 M110 8 v26 M110 8 C 110 22, 200 14, 200 34" stroke="color-mix(in srgb, var(--st-learn) 50%, transparent)" strokeWidth="2" fill="none" />
            </svg>
          </div>
          {PickPerBet(DECISIONS, "decisions")}
        </>
      );
      controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || decisions.filter(Boolean).length < learnBets.length} onClick={fNext}>Revisar y cerrar</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador define la decisión con el equipo.</p>;
    } else {
      sub = decisions.includes("iterate") ? "Al cerrar, la iniciativa vuelve a Ideación." : "Al cerrar, la iniciativa queda cerrada.";
      // Celebración + racha: cuántas mejoras seguidas del equipo funcionaron.
      const won = results.length > 0 && results.every((r) => r === "yes");
      const partial = !won && results.some((r) => r === "yes" || r === "partial");
      const doneOk = (team?.initiatives ?? []).filter((i2) => i2.status === "done" && i2.data?.learn?.result).sort((a, b2) => (b2.createdAt ?? "").localeCompare(a.createdAt ?? ""));
      let streak = 0; for (const i2 of doneOk) { if (i2.data?.learn?.result === "yes") streak++; else break; }
      if (won) streak += 1;
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(won || partial) && (
            <div style={{ textAlign: "center", padding: "18px 16px", borderRadius: "var(--r-lg)", background: won ? "linear-gradient(180deg, rgba(0,232,122,0.12), var(--card))" : "var(--card)", border: `1px solid ${won ? "color-mix(in srgb, var(--green) 45%, transparent)" : "var(--line)"}`, animation: "pop-in .45s var(--spring)", boxShadow: won ? "var(--glow-soft)" : "none" }}>
              <div style={{ fontSize: 34, lineHeight: 1, marginBottom: 6 }}>{won ? "🎉" : "💪"}</div>
              <div style={{ fontWeight: 800, fontSize: "var(--t-md)" }}>{won ? "¡La apuesta funcionó!" : "Hubo avance — y mucho aprendizaje"}</div>
              {streak >= 2 && <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--t-sm)", fontWeight: 700, color: "var(--warning)" }}>🔥 {streak} mejoras seguidas que funcionaron</div>}
            </div>
          )}
          {learnBets.map((b, i) => { const r = RESULTS.find((x) => x.k === results[i]); const d = DECISIONS.find((x) => x.k === decisions[i]); return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "10px 12px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
              {learnBets.length > 1 && <span style={{ fontSize: "var(--t-sm)", fontWeight: 700, flex: 1, minWidth: 100 }}>{betLabel(i)}</span>}
              {r && <Pill color={r.c} bg={`color-mix(in srgb, ${r.c} 14%, transparent)`} icon="Flag">{r.l}</Pill>}
              {d && <Pill color={d.c} bg={`color-mix(in srgb, ${d.c} 14%, transparent)`} icon="GitFork">{d.l}</Pill>}
            </div>
          ); })}
          <div className="muted" style={{ fontSize: "var(--t-sm)", textAlign: "center" }}>{learnCount} {learnCount === 1 ? "aprendizaje" : "aprendizajes"} registrados</div>
          {decisions.includes("consolidate") && <p className="muted" style={{ fontSize: "var(--t-sm)", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Icon name="Anchor" size={14} style={{ color: "var(--st-learn)" }} /> Implementar: el cambio queda adoptado como forma de trabajo del equipo.</p>}
        </div>
      );
      controls = isFacil ? <Button full size="lg" icon="Check" disabled={busy} onClick={fFinish}>{busy ? "Guardando…" : "Cerrar el ciclo"}</Button> : null;
    }

    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: wide ? 920 : 600 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {learnReminder}
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
    const causeList = allCards.filter((c) => c.columnKey === "cause").map((c) => c.text);
    const hasData = hasClusters || !!purposeText || !!criticalMeta || causeList.length > 0;
    await finalizeSession(session, {
      pulseAvg: avg, cardCount: allCards.length,
      summaryText: hasClusters ? `prioridad: ${ranked[0]?.name ?? "—"}` : (causeList.length ? `${causeList.length} causas` : (purposeText ? "propósito definido" : undefined)),
      dataKey: hasData ? "explore" : undefined,
      dataValue: hasData
        ? { priority: ranked[0]?.name ?? "", tensions: ranked.map((c) => ({ name: c.name, signals: cardsOf(c.id).length, dots: votesByCluster[c.id] ?? 0 })), pausedCount: ranked.slice(1).length, purpose: purposeText || undefined, criticalStage: criticalMeta ? criticalMeta.label : undefined, causes: causeList }
        : undefined,
      pausedNames: hasClusters ? ranked.slice(1).map((c) => c.name) : undefined,
    });
    setBusy(false); setAfterClose("focus");
  };
  const submitMyPulse = async () => { setBusy(true); const res = await submitPulse(sessionId, draft); setBusy(false); if (!res.error) setSubmitted(true); };
  const addExploreCard = async (colKey: string) => { const text = (cardDraft[colKey] ?? "").trim(); if (!text) return; await addCard(sessionId, colKey, text, anon); setCardDraft((d) => ({ ...d, [colKey]: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
  const voteCluster = (clusterId: string, delta: number) => castVote(clusterId, delta, remaining);

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
    content = <Card pad={24}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}><span style={{ fontWeight: 700 }}>El radar del equipo</span><Pill color="var(--success)" bg="var(--success-bg)" icon="Eye">{to5(overall).toFixed(1)}/5</Pill></div>{Averages}</Card>;
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
        <HiddenDots n={totalCards} label="cosas dichas · ocultas hasta revelar" color="var(--st-explore)" />
        <div className="cards-cols" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>{COLS.map((col) => { const mine = myCards.filter((c) => c.columnKey === col.key); const n = counts[col.key] ?? 0; return (
          <div key={col.key} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 14, display: "flex", flexDirection: "column", minHeight: 240 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ color: col.color }}><Icon name={col.icon} size={16} /></span><span style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{col.label}</span><span className="num" style={{ marginLeft: "auto", fontSize: "var(--t-xs)", color: "var(--ink-2)", background: "var(--card)", borderRadius: 99, padding: "2px 8px" }} title="escritas · ocultas">🔒 {n}</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              {mine.map((c) => (<div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${col.color}`, borderRadius: "var(--r-md)", padding: "9px 11px", fontSize: "var(--t-sm)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 6 }}>{c.anonymous ? "· anónima" : "· pública"} · tuya</span></div>))}
              {!mine.length && <div style={{ color: "var(--ink-3)", fontSize: "var(--t-xs)", textAlign: "center", padding: 12 }}>{isFacil ? "Ocultas hasta revelar." : "Las tarjetas quedan ocultas hasta revelar. Sumá lo tuyo…"}</div>}
            </div>
            {!isFacil && <div style={{ marginTop: 10, display: "flex", gap: 6 }}><input value={cardDraft[col.key] ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, [col.key]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addExploreCard(col.key)} placeholder="Sumar tarjeta…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "8px 10px", fontSize: "var(--t-sm)", outline: "none" }} /><button onClick={() => addExploreCard(col.key)} style={{ background: col.color, color: "#06121f", borderRadius: "var(--r-sm)", padding: "0 11px", display: "grid", placeItems: "center" }}><Icon name="Plus" size={16} /></button></div>}
          </div>
        ); })}</div>
      </>
    );
    controls = isFacil ? <Button full size="lg" icon="Eye" disabled={busy || totalCards === 0} onClick={goNext}>Revelar tarjetas ({totalCards})</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Sumá tus tarjetas. El facilitador las revela cuando todos terminen.</p>;
  } else if (step === "cards_reveal") {
    wide = true; sub = "Todas las tarjetas a la vista. Las anónimas no muestran autor.";
    content = <><RevealHeader n={totalCards} label="cosas que estaban en el aire" color="var(--st-explore)" /><RevealPop>{RevealedCards}</RevealPop></>;
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
                  ? <input defaultValue={cl.name} onBlur={(e) => { if (e.target.value.trim()) renameCluster(cl.id, e.target.value.trim()); }} title="Tocá para ponerle un nombre que el equipo recuerde" placeholder="Nombre del grupo…" style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", color: "var(--ink-0)", fontWeight: 700, fontSize: "var(--t-sm)", outline: "none", borderBottom: "1px dashed color-mix(in srgb, var(--green) 55%, transparent)" }} />
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
    const voters = new Set(votes.map((v) => v.voterKey)).size;
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
        {!isFacil && (
          <div style={{ textAlign: "center", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span className="muted" style={{ fontSize: "var(--t-sm)" }}>Tus puntos:</span>
            {Array.from({ length: DOTS_PER }).map((_, i) => <span key={i} style={{ width: 16, height: 16, borderRadius: 99, background: i < remaining ? "var(--green)" : "var(--card-2)", border: `1px solid ${i < remaining ? "var(--green)" : "var(--line-2)"}`, boxShadow: i < remaining ? "0 0 8px rgba(0,232,122,0.5)" : "none", transition: "all .25s var(--ease)" }} />)}
            <span className="faint" style={{ fontSize: "var(--t-xs)" }}>tocá una tensión para soltarlos</span>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {clusters.map((cl) => { const mine = votes.filter((v) => v.userId === user.id && v.clusterId === cl.id).length; return (
            <button key={cl.id} onClick={() => { if (!isFacil && remaining > 0) voteCluster(cl.id, 1); }}
              style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", background: mine > 0 ? "color-mix(in srgb, var(--green) 8%, var(--card))" : "var(--card)", border: `1px solid ${mine > 0 ? "color-mix(in srgb, var(--green) 45%, var(--line))" : "var(--line)"}`, borderRadius: "var(--r-md)", cursor: isFacil ? "default" : remaining > 0 ? "pointer" : "default", transition: "all .2s var(--ease)" }}>
              {isFacil
                ? <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6 }} onClick={(e) => e.stopPropagation()}><Icon name="Pencil" size={12} style={{ color: "var(--ink-3)", flexShrink: 0 }} /><input defaultValue={cl.name} onBlur={(e) => { if (e.target.value.trim()) renameCluster(cl.id, e.target.value.trim()); }} title="Editá el nombre de la tensión" style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", color: "var(--ink-0)", fontWeight: 600, fontSize: "var(--t-sm)", outline: "none", borderBottom: "1px dashed var(--line-2)" }} /></span>
                : <div style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: "var(--t-sm)" }}>{cl.name}</div>}
              {!isFacil && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  {Array.from({ length: mine }).map((_, k) => <span key={k} style={{ width: 14, height: 14, borderRadius: 99, background: "var(--green)", boxShadow: "0 0 7px rgba(0,232,122,0.6)", animation: "pop-in .3s var(--spring)" }} />)}
                  {mine > 0 && <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); voteCluster(cl.id, -1); }} title="Quitar un punto" style={{ display: "inline-flex", color: "var(--ink-3)", padding: 3 }}><Icon name="X" size={13} /></span>}
                  {mine === 0 && remaining > 0 && <span className="faint" style={{ fontSize: "var(--t-xs)" }}>tocar para votar</span>}
                </span>
              )}
            </button>
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
      ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><Button full size="lg" icon="Eye" disabled={busy} onClick={goNext}>Revelar respuestas</Button><Button full variant="secondary" icon="SkipForward" disabled={busy} onClick={() => setStep(sessionId, "flow", STEPS.indexOf("flow"))}>Saltar el módulo Propósito</Button></div>
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
      ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><Button full size="lg" icon="Eye" disabled={busy} onClick={goNext}>Revelar flujo</Button><Button full variant="secondary" icon="SkipForward" disabled={busy} onClick={() => setStep(sessionId, "causes", STEPS.indexOf("causes"))}>Saltar el módulo Flujo → ir a causas</Button></div>
      : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Sumá lo que veas en cada etapa del flujo.</p>;
  } else if (step === "flow_reveal") {
    wide = true; sub = "El flujo completo. Ahora votamos la etapa más crítica.";
    content = MultiReveal(FLOW_COLS);
    controls = isFacil ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={goNext}>Votar etapa crítica</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El equipo vota la etapa más crítica.</p>;
  } else if (step === "flow_vote") {
    const shown = !!session.result.flowShown;
    const fVoters = new Set(inputs.filter((i) => i.key === "critical").map((i) => i.voterKey)).size;
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
            <button key={f.key} onClick={() => { if (!isFacil) tapInput("critical", { stage: f.key }); }} disabled={isFacil} style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderRadius: "var(--r-md)", background: on ? "color-mix(in srgb, var(--st-explore) 14%, var(--card))" : "var(--card)", border: `1px solid ${on ? "var(--st-explore)" : "var(--line)"}`, cursor: isFacil ? "default" : "pointer" }}>
              <span style={{ color: on ? "var(--st-explore)" : f.color }}><Icon name={on ? "CircleCheck" : f.icon} size={17} /></span>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{f.label}</div><div className="muted" style={{ fontSize: "var(--t-xs)" }}>{f.sub}</div></div>
            </button>
          ); })}
        </div>
        <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)", marginTop: 12 }}><Icon name="EyeOff" size={13} /> Votación oculta · {fVoters} de {totalInRoom} votaron</p>
      </>
    );
    controls = isFacil
      ? (shown ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setResult(sessionId, { critical: criticalStage }); setBusy(false); goNext(); }}>Siguiente: causas</Button> : <Button full size="lg" icon="Eye" disabled={busy} onClick={() => setResult(sessionId, { flowShown: true })}>Mostrar votación ({fVoters}/{totalInRoom})</Button>)
      : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Tocá la etapa más crítica. El facilitador muestra el resultado cuando todos elijan.</p>;
  } else if (step === "causes") {
    wide = true;
    const n = counts["cause"] ?? 0;
    sub = "¿Por qué pasa? Cada uno suma causas posibles (anónimas, ocultas hasta revelar). Van a Foco para elegir cuál atacar.";
    content = <><HiddenDots n={counts["cause"] ?? 0} label="causas posibles · ocultas" color="var(--st-focus)" />{MultiWrite(CAUSE_COLS, "var(--st-focus)", !isFacil)}</>;
    controls = isFacil
      ? <Button full size="lg" icon="Eye" disabled={busy || n === 0} onClick={goNext}>Revelar causas ({n})</Button>
      : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Sumá las causas que veas. El facilitador las revela cuando todos terminen.</p>;
  } else if (step === "causes_reveal") {
    wide = true;
    sub = "Todas las causas a la vista. En Foco van a priorizarlas por impacto y esfuerzo.";
    content = <><RevealHeader n={allCards.filter((c) => c.columnKey === "cause").length} label="causas posibles" color="var(--st-focus)" /><RevealPop>{MultiReveal(CAUSE_COLS)}</RevealPop></>;
    controls = isFacil
      ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={goNext}>Siguiente: cerrar</Button>
      : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Quedan registradas para la etapa de Foco.</p>;
  } else {
    sub = "El resumen final. Al cerrar, se guarda y la iniciativa avanza de etapa.";
    content = (
      <>
        {(purposeText || criticalMeta) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {purposeText && <div style={{ padding: "12px 14px", background: "color-mix(in srgb, var(--st-explore) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--st-explore) 28%, transparent)", borderRadius: "var(--r-md)" }}><div className="eyebrow" style={{ color: "var(--st-explore)", marginBottom: 4 }}>Propósito del equipo</div><p style={{ fontSize: "var(--t-sm)", lineHeight: 1.5 }}>{purposeText}</p></div>}
            {criticalMeta && <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--t-sm)" }}><Icon name={criticalMeta.icon} size={15} style={{ color: "var(--st-explore)" }} /><span className="muted">Etapa más crítica del flujo:</span> <b>{criticalMeta.label}</b></div>}
          </div>
        )}
        {(() => { const cz = allCards.filter((c) => c.columnKey === "cause"); return cz.length > 0 ? (
          <div style={{ padding: "12px 14px", background: "color-mix(in srgb, var(--st-focus) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--st-focus) 26%, transparent)", borderRadius: "var(--r-md)", marginBottom: 16 }}>
            <div className="eyebrow" style={{ color: "var(--st-focus)", marginBottom: 6 }}>Causas posibles ({cz.length}) · pasan a Foco</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{cz.map((c) => <span key={c.id} style={{ fontSize: "var(--t-xs)", padding: "4px 10px", borderRadius: "var(--r-full)", background: "var(--card-2)", border: "1px solid var(--line)" }}>{c.text}</span>)}</div>
          </div>
        ) : null; })()}
        {RankedMap}
        {ranked.length > 1 && <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}><Icon name="Pause" size={13} /> Las {ranked.length - 1} tensiones no priorizadas quedan como iniciativas <b style={{ color: "var(--warning)" }}>pausadas</b> del equipo.</p>}
      </>
    );
    controls = isFacil ? <Button full size="lg" icon="Check" disabled={busy} onClick={finish}>{busy ? "Guardando…" : "Cerrar y guardar sesión"}</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador cierra y guarda la sesión.</p>;
  }

  return (
    <Shell onExit={exit} mood={teamMood}>
      <div style={{ width: "100%", maxWidth: wide ? 920 : 600 }}>
        {Header(sub)}
        <div style={{ marginBottom: 16 }}>{facBar}</div>
        {content}
        <div style={{ marginTop: 18 }}>{controls}</div>
      </div>
    </Shell>
  );
}
