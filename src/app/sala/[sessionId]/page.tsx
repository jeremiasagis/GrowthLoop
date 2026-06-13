"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Logo } from "@/components/AppShell";
import { Avatar, Bar, Button, Card, Pill, PulseRadar } from "@/components/ui";
import { SessionTimer } from "@/components/session/Timer";
import { JoinModal } from "@/components/session/JoinModal";
import { HiddenDots, Cascade, RevealHeader, RevealPop } from "@/components/session/RevealFx";
import { useAuth } from "@/lib/auth/AuthContext";
import { createInitiative, getInitiatives, getTeam } from "@/lib/repository";
import { retroByKey } from "@/lib/retros";
import { retroById } from "@/lib/retros/registry";
import { WordCloud } from "@/components/WordCloud";
import { RoomLiveFx } from "@/components/RoomLiveFx";
import { TimelineBoard, TL_EMO, type TlEvent } from "@/components/TimelineBoard";
import { CirclesDiagram, CIRCLE_META, type CircleKey } from "@/components/CirclesDiagram";
import { CauseTree } from "@/components/CauseTree";
import { FishboneDiagram } from "@/components/FishboneDiagram";
import { OpposingScale } from "@/components/OpposingScales";
import { JourneyBoard, type JourneyCol } from "@/components/JourneyBoard";
import { StaceyMatrix, STACEY_ZONES, zoneOf } from "@/components/StaceyMatrix";
import { StoryboardCanvas } from "@/components/StoryboardCanvas";
import { ArcherTarget } from "@/components/ArcherTarget";
import { HonestyPulse, type HonestyKey } from "@/components/HonestyPulse";
import { OneWordClosing } from "@/components/OneWordClosing";
import { SignalProgressChart } from "@/components/SignalProgressChart";
import { KudosCard, KUDO_EMOJIS } from "@/components/KudosCard";
import { useToast } from "@/components/Toast";
import { PULSE_DIMS, FOUNDING_QUESTIONS, LEARNING_TYPES, overallOf, to5, to100, type LearningEntry } from "@/lib/data";
import {
  addCard, addVote, assignCardToCluster, averagePulse, closeSession, createCluster, createLiveSession, deleteCard, deleteCluster, pulseOverall,
  finalizeSession, getCardCounts, getCards, getClusters, getInitiativeSessions, getInputs, getMyCards, getParticipants, getSessionContent,
  getClosedTeamSessions, getLastClosedTeamSession, getPulseResponses, getSession, getVotes, hasResponded, joinSession, removeVote,
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
// Retros clásicas de tablero: mismas fases (tarjetas → reveal → agrupar →
// votar → cierre) con columnas propias de cada metáfora.
const RETRO_COLS: Record<string, { key: string; label: string; color: string; icon: string }[]> = {
  madsadglad: [
    { key: "mad",  label: "😤 Mad · ¿Qué te frustró o molestó?",        color: "var(--risk)",    icon: "Angry" },
    { key: "sad",  label: "😔 Sad · ¿Qué te entristeció o decepcionó?", color: "#3B82F6",        icon: "Frown" },
    { key: "glad", label: "😊 Glad · ¿Qué te alegró o satisfizo?",      color: "var(--success)", icon: "Smile" },
  ],
  balloon: [
    { key: "fire",  label: "🔥 Aire caliente · ¿qué nos eleva?",        color: "var(--warning)", icon: "Flame" },
    { key: "sand",  label: "⚓ Sacos de arena · ¿qué nos pesa?",         color: "#94A3B8",        icon: "Anchor" },
    { key: "storm", label: "⛈️ Tormentas · amenazas externas",          color: "var(--violet)",  icon: "CloudLightning" },
  ],
  sailboat: [
    { key: "wind",   label: "💨 Viento · ¿qué nos impulsa?",   color: "var(--success)", icon: "Wind" },
    { key: "anchor", label: "⚓ Ancla · ¿qué nos frena?",       color: "var(--warning)", icon: "Anchor" },
    { key: "rocks",  label: "🪨 Rocas · ¿qué riesgos vemos?",  color: "var(--risk)",    icon: "TriangleAlert" },
    { key: "island", label: "🏝️ Isla · ¿hacia dónde vamos?",   color: "var(--green)",   icon: "Flag" },
  ],
  startstop: [
    { key: "start",    label: "🟢 Start · ¿qué empezar?",   color: "var(--success)", icon: "Play" },
    { key: "stop",     label: "🔴 Stop · ¿qué dejar?",      color: "var(--risk)",    icon: "CircleStop" },
    { key: "continue", label: "🔵 Continue · ¿qué mantener?", color: "#3B82F6",      icon: "Repeat" },
  ],
  daki: [
    { key: "drop",    label: "🗑️ Drop · eliminar",   color: "var(--risk)",    icon: "Trash2" },
    { key: "add",     label: "➕ Add · incorporar",  color: "var(--success)", icon: "Plus" },
    { key: "keep",    label: "✅ Keep · preservar",  color: "#3B82F6",        icon: "Check" },
    { key: "improve", label: "🔧 Improve · mejorar", color: "var(--warning)", icon: "Wrench" },
  ],
  starfish: [
    { key: "keep",  label: "⭐ Seguir · lo que funciona, mantenerlo",   color: "var(--success)", icon: "Star" },
    { key: "more",  label: "➕ Más de · intensificar lo que rinde",    color: "#3B82F6",        icon: "TrendingUp" },
    { key: "less",  label: "➖ Menos de · bajar lo que no aporta",      color: "var(--warning)", icon: "TrendingDown" },
    { key: "start", label: "🚀 Empezar · algo nuevo que falta probar", color: "var(--st-follow)", icon: "Play" },
    { key: "stop",  label: "🛑 Dejar · lo que no funciona, cortarlo",  color: "var(--risk)",    icon: "CircleStop" },
  ],
};

// FODA del equipo: matriz 2×2 (internas arriba, externas abajo), anónimo hasta revelar.
const FODA_COLS = [
  { key: "f", label: "💪 Fortalezas · lo que hacemos bien", color: "var(--green)" },
  { key: "d", label: "⚠️ Debilidades · lo que nos cuesta", color: "var(--warning)" },
  { key: "o", label: "🌱 Oportunidades · lo que podríamos aprovechar", color: "#3B82F6" },
  { key: "a", label: "⛈️ Amenazas · lo que nos puede golpear de afuera", color: "var(--risk)" },
];
const STEPS = ["pulse", "pulse_reveal", "cards", "cards_reveal", "cluster", "vote", "purpose", "purpose_reveal", "purpose_decide", "flow", "flow_reveal", "flow_vote", "causes", "causes_reveal", "close"];
const DOTS_PER = 2;
// Secuencia de pasos por tipo de sesión (para el indicador de progreso y "volver atrás").
const STEP_SEQ: Record<string, string[]> = {
  founding: ["welcome", "contract", "sign", "close"],
  foda: ["cards", "cards_reveal", "close"],
  madsadglad: ["cards", "cards_reveal", "cluster", "vote", "close"],
  balloon: ["cards", "cards_reveal", "cluster", "vote", "close"],
  sailboat: ["cards", "cards_reveal", "cluster", "vote", "close"],
  startstop: ["cards", "cards_reveal", "cluster", "vote", "close"],
  daki: ["cards", "cards_reveal", "cluster", "vote", "close"],
  oneword: ["word", "word_reveal", "close"],
  teamradar: ["setup", "rate", "radar_reveal"],
  timeline: ["build", "tload", "timeline_reveal"],
  circles: ["brain", "classify", "soup_close"],
  relationships: ["frame", "questions", "read", "relword", "rel_close"],
  expclose: ["consolidate", "vote", "map"],
  whereblock: ["wbsetup", "wbcards", "wbvote", "wbdeep", "wbform"],
  whyhappening: ["whframe", "whcauses", "whcluster", "whvote", "whtree", "whvalidate"],
  impactfreq: ["iflist", "ifrate", "ifmatrix"],
  clientvoice: ["cvclient", "cvperc", "cvcontrast", "cvsynth"],
  fishbone: ["fbsetup", "fbcauses", "fbvote", "fbdeep", "fbmain"],
  perfection: ["pgscore", "pgreveal", "pgfactors", "pgsynth"],
  opposites: ["oppairs", "oprate", "opreveal", "opsynth"],
  journey: ["sdsetup", "sdanalyze", "sdvote", "sddeep", "sdsynth"],
  stacey: ["stintro", "stplace", "streveal", "stzone"],
  hmw: ["hmwframe", "hmwwrite", "hmwreveal", "hmwread", "hmwcluster", "hmwvote"],
  ideachoose: ["icpresent", "icmatrix", "icice", "icconfirm"],
  premortem: ["pmframe", "pmwrite", "pmcat", "pmvote", "pmmitigate", "pmclose"],
  betdesign: ["bdcontext", "bdtemplate", "bdfilters", "bdconfirm"],
  storyboard: ["sbframe", "sbdraw", "sbpresent", "sbconsensus"],
  archer: ["arframe", "arbuild", "aralign", "arclose"],
  leancoffee: ["lctopics", "lcvote", "lcwork", "lcclose"],
  follow: ["fwcard", "fwreport", "fwunblock", "fwdecision", "fwhonesty"],
  blocking: ["blframe", "blmap", "blclass", "blvote", "blplan"],
  roti: ["rtscore", "rtreveal", "rttalk"],
  fwperfection: ["fpframe", "fpscore", "fpreveal", "fpactions"],
  fwradar: ["rbase", "rate", "rcompare", "rtalk"],
  starfish: ["cards", "cards_reveal", "cluster", "vote", "close"],
  lwhappened: ["lwresult", "lwsilence", "lwreact", "lwreveal", "lwnarrative", "lwclose"],
  lwlearned: ["lwldistinct", "lwlwrite", "lwlread", "lwlclassify", "lwlhighlight", "lwlclose"],
  lwnext: ["lwnopts", "lwndebate", "lwndecide", "lwnclose"],
  lwteam: ["lwtframe", "lwteval", "lwtreveal", "lwtadjust", "lwtprivate", "lwtclose"],
  fourls: ["flcontext", "flwrite", "flreveal", "flvote", "fltalk", "flexport", "flclose"],
  kudos: ["kudwrite", "kuddeliver", "kudclose"],
  letter: ["ltframe", "ltwrite", "ltread", "lttheme", "ltclose"],
  speeddating: ["sdwarn", "sdframe", "sdpairs", "sdrounds", "sdplenary", "sdclose"],
  consolidation: ["concheck", "conresult"],
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
  const [stage, setStage] = useState(false);
  const toggleStage = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) { el.requestFullscreen?.().catch(() => {}); setStage(true); }
    else { document.exitFullscreen?.().catch(() => {}); setStage(false); }
  };
  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement) setStage(false); };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);
  return (
    <div className={stage ? "stage-mode" : ""} style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: `radial-gradient(1100px 520px at 50% -160px, ${glow}, transparent), var(--bg-1)`, transition: "background .8s var(--ease)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid var(--line)" }}>
        {onExit ? <button onClick={onExit} className="stage-hide" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--ink-2)", fontSize: "var(--t-sm)", fontWeight: 600 }}><Icon name="X" size={18} /> Salir</button> : <span style={{ width: 60 }} />}
        <Logo />
        <button onClick={toggleStage} title={stage ? "Salir de pantalla completa" : "Modo escenario (proyectar)"} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: stage ? "var(--green)" : "var(--ink-2)", fontSize: "var(--t-sm)", fontWeight: 600, minWidth: 60, justifyContent: "flex-end" }}>
          <Icon name={stage ? "Minimize2" : "Maximize2"} size={17} /><span className="hide-sm">{stage ? "Salir" : "Escenario"}</span>
        </button>
      </header>
      <main style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 20px 80px" }}>{children}</main>
      <RoomLiveFx />
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
  // Foco: ficha que se está arrastrando en el mapa (posición local en fracción 0-1).
  const [ieDrag, setIeDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  // ¿Cuál elegimos?: ficha que el facilitador arrastra en la matriz impacto/esfuerzo.
  const [icDrag, setIcDrag] = useState<{ i: number; x: number; y: number } | null>(null);
  // Storyboarding: borrador local de los 6 cuadros del miembro.
  const [sbDraft, setSbDraft] = useState<string[]>(() => ["", "", "", "", "", ""]);
  // Timeline: hito y emoción elegidos para el próximo evento del miembro.
  const [tlPick, setTlPick] = useState<{ m: number; emo: "pos" | "neu" | "neg" }>({ m: 0, emo: "pos" });
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
      const needsAll = [
        "cards_reveal", "cluster", "vote", "close", "group", "purpose_reveal", "purpose_decide", "flow", "flow_reveal", "flow_vote", "premortem_reveal", "causes_reveal", "ideas_reveal", "learnings_reveal", "ice", "bet", "commit",
        // retros nuevas: pasos donde las tarjetas de todos deben verse
        "word_reveal", "timeline_reveal", "brain", "classify", "soup_close", "read", "rel_close", "whcluster",
        "cvcontrast", "fbcauses", "fbvote", "fbdeep", "fbmain", "pgfactors", "pgsynth",
        "sdanalyze", "sdvote", "sddeep", "sdsynth", "wbdeep",
        "hmwreveal", "hmwread", "hmwcluster", "hmwvote",
        "pmcat", "pmvote", "pmmitigate", "pmclose",
        "sbdraw", "sbpresent", "sbconsensus",
        "lctopics", "lcvote", "lcwork", "lcclose",
        "blclass", "blvote", "blplan", "fpactions",
        "lwreveal", "lwnarrative",
        "lwlread", "lwlclassify", "lwlhighlight",
        "lwtreveal", "lwtadjust",
        "flreveal", "flvote", "fltalk", "flexport",
        "kuddeliver",
      ].includes(s.stepKey ?? "");
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

  // Cierre de Exploración: la plataforma consolida las variables candidatas
  // de todas las retros de Exploración cerradas (con frecuencia de aparición).
  useEffect(() => {
    if (!session || session.type !== "expclose" || session.status !== "live") return;
    if (!user || user.role === "member") return;
    if (session.result.expVars) return;
    let active = true;
    (async () => {
      const all = await getClosedTeamSessions(session.teamId);
      const CLUSTERY = ["explore", "madsadglad", "balloon", "sailboat"];
      const found: string[] = [];
      for (const s of all) {
        if (s.id === session.id) continue;
        const r = s.result ?? {};
        for (const k of ["trCandidates", "circleCandidates", "tlPatterns", "relPatterns"]) {
          for (const v of ((r[k] as string[]) ?? [])) found.push(v);
        }
        if (CLUSTERY.includes(s.type)) {
          const c = await getSessionContent(s.id);
          for (const cl of c.clusters) found.push(cl.name);
        }
      }
      const freq = new Map<string, { name: string; freq: number }>();
      for (const raw of found) {
        const k = raw.trim().toLowerCase(); if (!k) continue;
        const cur = freq.get(k);
        if (cur) cur.freq += 1; else freq.set(k, { name: raw.trim(), freq: 1 });
      }
      const vars = [...freq.values()].sort((a, b) => b.freq - a.freq);
      if (active) patchResult({ expVars: vars });
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.type, session?.status, session?.id, user?.role, !!session?.result?.expVars]);

  // Radar del Equipo: si ya hicieron esta retro antes, traemos el radar
  // anterior para superponerlo y ver la evolución.
  const [prevRadar, setPrevRadar] = useState<{ avg: Record<string, number>; dims?: { key: string; label: string }[]; date?: string } | null>(null);
  useEffect(() => {
    if (session?.type !== "teamradar" && session?.type !== "fwradar") return;
    let active = true;
    (async () => {
      const last = await getLastClosedTeamSession(session.teamId, "teamradar", session.id);
      const avg = last?.result?.trAvg as Record<string, number> | undefined;
      const dims = last?.result?.trDims as { key: string; label: string }[] | undefined;
      if (active && avg) setPrevRadar({ avg, dims, date: last?.createdAt });
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.type, session?.teamId]);

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
  if (!session) return (
    <Shell onExit={() => router.back()}>
      <Card pad={26} style={{ maxWidth: 460, textAlign: "center" }}>
        <div style={{ fontSize: 30, marginBottom: 10 }}>🔎</div>
        <p style={{ fontWeight: 700, marginBottom: 6 }}>No encontramos esta sesión con tu cuenta.</p>
        <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.55 }}>
          Estás logueado como <b style={{ color: "var(--ink-0)" }}>{user.name}</b> ({user.role === "member" ? "miembro" : user.role}).
          Si la sesión existe, esta cuenta no pertenece al equipo que la abrió. Pedile el código al facilitador y unite con él.
        </p>
        <Button full icon="Radio" onClick={() => router.push("/join")} style={{ marginTop: 16 }}>Unirme con un código</Button>
      </Card>
    </Shell>
  );

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
  // Columnas del tablero según la retro (las clásicas traen su metáfora propia).
  const RCOLS = RETRO_COLS[session.type] ?? COLS;
  const colMeta = (key: string) => RCOLS.find((c) => c.key === key) ?? RCOLS[0];
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
      {showJoin && <JoinModal url={typeof window !== "undefined" ? `${window.location.origin}/join?code=${session.joinCode ?? ""}` : ""} code={session.joinCode} onClose={() => setShowJoin(false)} />}
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
    <div className="cards-cols" style={{ display: "grid", gridTemplateColumns: `repeat(${RCOLS.length}, 1fr)`, gap: 14 }}>
      {RCOLS.map((col) => {
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
    await setResult(sessionId, { voteShown: false, cvoteShown: false, ivoteShown: false, flowShown: false, stuckShown: false, iceShown: false, lvoteShown: false, matrixShown: false, whVoteShown: false, fbVoteShown: false, sdVoteShown: false, wbVoteShown: false, closeWordShown: false, flShown: false, fwHonestShown: false, conShown: false, kudIdx: 0, sdRound: 0, lhSilenceAt: null, timer: null });
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

  // ── Cierre universal de Aprendizaje (One Word) · reusado por todas las retros de learn ──
  const closeWords = inputs.filter((i) => i.key === "closeword").map((i) => (i.value as { w?: string }).w).filter((w): w is string => !!w);
  const myCloseWord = (inputs.find((i) => i.userId === user.id && i.key === "closeword")?.value as { w?: string } | undefined)?.w;
  const closeWordShown = !!session.result.closeWordShown;
  const learnClosing = (question?: string) => (
    <OneWordClosing question={question} mine={myCloseWord} onSubmit={(w) => tapInput("closeword", { w })} revealed={closeWordShown} words={closeWords} count={closeWords.length} total={totalInRoom} isFacil={isFacil} />
  );
  const learnCloseControls = (finishFn: () => void) => isFacil
    ? (closeWordShown
      ? <Button full size="lg" icon="Check" disabled={busy} onClick={finishFn}>{busy ? "Guardando…" : "Cerrar la sesión"}</Button>
      : <Button full size="lg" icon="Eye" disabled={busy || closeWords.length === 0} onClick={() => setResult(sessionId, { closeWordShown: true })}>Revelar nube de cierre ({closeWords.length}/{totalInRoom})</Button>)
    : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>{closeWordShown ? "El facilitador cierra la sesión." : "Elegí tu palabra de cierre."}</p>;

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
    const total = totalCards; // de counts: disponible aunque las tarjetas sigan ocultas
    const fFinish = async () => {
      setBusy(true);
      const get = (k: string) => allCards.filter((c) => c.columnKey === k).map((c) => c.text);
      const foda = { f: get("f"), o: get("o"), d: get("d"), a: get("a"), date: new Date().toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" }) };
      await finalizeSession(session, { summaryText: `FODA del equipo: ${total} aportes`, cardCount: total, teamData: { foda } });
      setBusy(false); leave();
    };
    // La matriz 2×2 con brújula al centro: internas arriba, externas abajo.
    const addF = async (colKey: string) => { const t = (cardDraft[colKey] ?? "").trim(); if (!t) return; await addCard(sessionId, colKey, t, true); setCardDraft((d) => ({ ...d, [colKey]: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
    const FodaBoard = (editable: boolean, reveal: boolean) => (
      <div style={{ position: "relative", borderRadius: "var(--r-lg)", border: "1px solid var(--line)", overflow: "hidden", background: "color-mix(in srgb, var(--green) 4%, var(--bg-2))", padding: 14 }}>
        <span className="scene-center" aria-hidden style={{ position: "absolute", left: "50%", top: "50%", fontSize: 56, transform: "translate(-50%,-50%)", opacity: 0.85, pointerEvents: "none", zIndex: 2, filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.3))" }}>🧭</span>
        <div className="cards-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, position: "relative" }}>
          {FODA_COLS.map((col, i) => {
            const mine = myCards.filter((c) => c.columnKey === col.key);
            const revealed = allCards.filter((c) => c.columnKey === col.key);
            const list = reveal ? revealed : mine;
            const n = counts[col.key] ?? 0;
            const [title, q] = col.label.split(" · ");
            return (
              <Fragment key={col.key}>
                {i === 0 && <div className="eyebrow" style={{ gridColumn: "1 / -1", color: "var(--ink-2)" }}>De puertas adentro · lo que depende de nosotros</div>}
                {i === 2 && <div className="eyebrow" style={{ gridColumn: "1 / -1", color: "var(--ink-2)", marginTop: 4 }}>De puertas afuera · el contexto</div>}
                <div style={{ background: `color-mix(in srgb, ${col.color} 7%, var(--bg-2))`, border: `1px solid color-mix(in srgb, ${col.color} 40%, var(--line))`, borderTop: `3px solid ${col.color}`, borderRadius: "var(--r-lg)", padding: 12, display: "flex", flexDirection: "column", minHeight: 170 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                    <span style={{ fontWeight: 800, fontSize: "var(--t-sm)" }}>{title}</span>
                    {!reveal && <span className="num" style={{ marginLeft: "auto", fontSize: "var(--t-xs)", color: "var(--ink-2)", background: "var(--card)", borderRadius: 99, padding: "1px 7px" }} title="escritas · ocultas">🔒 {n}</span>}
                    {reveal && <span className="num" style={{ marginLeft: "auto", fontSize: "var(--t-xs)", color: col.color, fontWeight: 800 }}>{revealed.length}</span>}
                  </div>
                  {q && <div className="muted" style={{ fontSize: "var(--t-xs)", marginBottom: 8 }}>{q}</div>}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                    {list.map((c, k) => (
                      <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${col.color}`, borderRadius: "var(--r-md)", padding: "8px 10px", fontSize: "var(--t-xs)", lineHeight: 1.4, animation: reveal ? `pop-in .4s var(--spring) ${k * 0.04}s both` : undefined }}>{c.text}{!reveal && <span className="faint" style={{ fontSize: 10, marginLeft: 5 }}>· tuya</span>}</div>
                    ))}
                    {!list.length && <div style={{ color: "var(--ink-3)", fontSize: "var(--t-xs)", textAlign: "center", padding: 8 }}>{reveal ? "Sin aportes" : editable ? "Sumá lo tuyo · queda oculto" : "Ocultas hasta revelar"}</div>}
                  </div>
                  {editable && !reveal && (
                    <div style={{ marginTop: 8, display: "flex", gap: 5 }}>
                      <input value={cardDraft[col.key] ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, [col.key]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addF(col.key)} placeholder="Sumar…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "7px 9px", fontSize: "var(--t-xs)", outline: "none" }} />
                      <button onClick={() => addF(col.key)} style={{ background: col.color, color: "#06121f", borderRadius: "var(--r-sm)", padding: "0 10px", display: "grid", placeItems: "center" }}><Icon name="Plus" size={14} /></button>
                    </div>
                  )}
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    );
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "";
    if (step === "cards") {
      sub = isFacil
        ? "El equipo completa los cuatro cuadrantes en anónimo. Vos facilitás y revelás."
        : "La foto inicial del equipo: sumá lo tuyo en cada cuadrante. Queda oculto hasta revelar.";
      content = FodaBoard(!isFacil, false);
      controls = isFacil
        ? <Button full size="lg" icon="Eye" disabled={busy || total === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "cards_reveal", 1); setBusy(false); }}>Revelar FODA ({total})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Cuando estén todos, el facilitador revela.</p>;
    } else {
      sub = "El FODA del equipo, revelado para todos. Conversen sobre lo que aparece.";
      content = <RevealPop>{FodaBoard(false, true)}</RevealPop>;
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

  // ════════ ONE WORD · una palabra por miembro, nube al revelar ════════
  if (session.type === "oneword") {
    const PROMPTS: Record<string, { label: string; q: string }> = {
      open: { label: "Apertura", q: "¿Con una sola palabra, cómo llegás a esta sesión?" },
      diag: { label: "Diagnóstico", q: "¿Con una sola palabra, cómo estás con el equipo hoy?" },
      close: { label: "Cierre", q: "¿Con una sola palabra, cómo te vas de esta sesión?" },
    };
    const variant = (session.result.owVariant as string) ?? "diag";
    const myWord = myCards.find((c) => c.columnKey === "word");
    const wordCards = allCards.filter((c) => c.columnKey === "word");
    const total = counts["word"] ?? wordCards.length;
    const submitWord = async () => {
      const w = (cardDraft.word ?? "").trim().split(/\s+/)[0]?.slice(0, 24);
      if (!w || myWord) return;
      await addCard(sessionId, "word", w, true);
      setCardDraft((d) => ({ ...d, word: "" }));
      if (user) setMyCards(await getMyCards(sessionId, user.id));
    };
    const owFinish = async () => {
      setBusy(true);
      await finalizeSession(session, { pulseAvg: avg, summaryText: `One Word (${PROMPTS[variant]?.label ?? ""}): ${wordCards.length} palabras` });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "";
    if (step === "word") {
      sub = "Una sola palabra por persona. Sin explicaciones obligatorias.";
      content = (
        <>
          {isFacil && (
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 14, flexWrap: "wrap" }}>
              {Object.entries(PROMPTS).map(([k, p]) => (
                <button key={k} onClick={() => setResult(sessionId, { owVariant: k })} style={{ padding: "5px 12px", borderRadius: "var(--r-full)", fontSize: "var(--t-xs)", fontWeight: 700, border: `1px solid ${variant === k ? "var(--green)" : "var(--line-2)"}`, background: variant === k ? "color-mix(in srgb, var(--green) 14%, var(--card))" : "var(--card)", color: variant === k ? "var(--green)" : "var(--ink-2)" }}>{p.label}</button>
              ))}
            </div>
          )}
          <Card pad={28} style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: "var(--t-xl)", fontWeight: 800, lineHeight: 1.35, marginBottom: 18 }}>{PROMPTS[variant]?.q}</h2>
            {isFacil ? (
              <div><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--green)" }}>{total}/{totalInRoom}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>palabras enviadas</div></div>
            ) : myWord ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--green)", fontWeight: 700 }}><Icon name="Check" size={18} /> Tu palabra: “{myWord.text}”</div>
            ) : (
              <div style={{ display: "flex", gap: 8, maxWidth: 320, margin: "0 auto" }}>
                <input value={cardDraft.word ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, word: e.target.value.split(/\s+/)[0] ?? "" }))} onKeyDown={(e) => e.key === "Enter" && submitWord()} placeholder="Una palabra…" maxLength={24} style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "12px 14px", fontSize: "var(--t-md)", textAlign: "center", outline: "none" }} />
                <Button icon="Send" onClick={submitWord} disabled={!(cardDraft.word ?? "").trim()}>Enviar</Button>
              </div>
            )}
            <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 14 }}>{total} de {totalInRoom} enviaron · se revelan todas juntas</p>
          </Card>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Eye" disabled={busy || total === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "word_reveal", 1); setBusy(false); }}>Revelar nube de palabras ({total})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador revela cuando estén todas.</p>;
    } else {
      sub = "La nube del equipo. El facilitador lee las palabras; comentar es voluntario.";
      content = (
        <Card pad={28}>
          <WordCloud words={wordCards.map((c) => c.text)} size="lg" />
          <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)", marginTop: 14 }}>“¿Alguien quiere decir algo sobre su palabra?” — participación voluntaria.</p>
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Check" disabled={busy} onClick={owFinish}>{busy ? "Guardando…" : "Cerrar y guardar"}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador cierra la sesión.</p>;
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: 620 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ RADAR DEL EQUIPO · dimensiones editables, 1-5 anónimo ════════
  if (session.type === "teamradar") {
    const CPAL = ["#00E87A", "#3B82F6", "#7C3AED", "#06B6D4", "#F59E0B", "#EF4444", "#EC4899", "#A3E635", "#14B8A6", "#F97316"];
    const defDims = PULSE_DIMS.map((d) => ({ key: d.key, label: d.label }));
    const trDims = ((session.result.trDims as { key: string; label: string }[]) ?? defDims);
    const radarDims = trDims.map((d, i) => ({ key: d.key, label: d.label, color: CPAL[i % CPAL.length] }));
    const trAvg = averagePulse(responses);
    const trOverall = pulseOverall(trAvg);
    // Rango y dispersión por dimensión (sobre las respuestas individuales anónimas).
    const rangeOf = (k: string) => {
      const vals = responses.map((r) => r[k]).filter((v) => typeof v === "number");
      if (!vals.length) return null;
      return { min: Math.min(...vals), max: Math.max(...vals), spread: Math.max(...vals) - Math.min(...vals) };
    };
    const sortedLow = radarDims.filter((d) => trAvg[d.key] != null).sort((a, b) => (trAvg[a.key] ?? 0) - (trAvg[b.key] ?? 0));
    const mostSpread = [...radarDims].map((d) => ({ d, r: rangeOf(d.key) })).filter((x) => x.r).sort((a, b) => (b.r!.spread) - (a.r!.spread)).slice(0, 2);
    const setDims = (next: { key: string; label: string }[]) => patchResult({ trDims: next });
    const trFinish = async () => {
      setBusy(true);
      // Persistimos el radar en el result de la sesión: sirve de línea de base
      // para superponer la próxima vez y como variable candidata en el cierre.
      await setResult(sessionId, { trAvg, trDims, trCandidates: sortedLow.slice(0, 2).map((d) => d.label) });
      await finalizeSession(session, {
        cardCount: 0,
        summaryText: `Radar del equipo: ${to5(trOverall).toFixed(1)}/5 · más baja: ${sortedLow[0]?.label ?? "—"}`,
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "";
    if (step === "setup") {
      sub = isFacil ? "Adaptá las dimensiones al equipo: renombrá, sacá (mínimo 4) o sumá (máximo 10)." : "El facilitador está configurando las dimensiones a puntuar.";
      content = isFacil ? (
        <Card pad={20}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {trDims.map((d, i) => (
              <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: CPAL[i % CPAL.length], flexShrink: 0 }} />
                <input defaultValue={d.label} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== d.label) setDims(trDims.map((x) => x.key === d.key ? { ...x, label: v } : x)); }}
                  style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "8px 10px", fontSize: "var(--t-sm)", outline: "none" }} />
                <button disabled={trDims.length <= 4} onClick={() => setDims(trDims.filter((x) => x.key !== d.key))} title={trDims.length <= 4 ? "Mínimo 4 dimensiones" : "Quitar"} style={{ color: trDims.length <= 4 ? "var(--ink-3)" : "var(--risk)", padding: 4 }}><Icon name="Trash2" size={15} /></button>
              </div>
            ))}
          </div>
          {trDims.length < 10 && (
            <Button size="sm" variant="secondary" icon="Plus" style={{ marginTop: 12 }} onClick={() => setDims([...trDims, { key: `x${Date.now().toString(36)}`, label: `Dimensión ${trDims.length + 1}` }])}>Agregar dimensión</Button>
          )}
        </Card>
      ) : (
        <Card pad={24}><div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>{trDims.map((d, i) => <Pill key={d.key} color={CPAL[i % CPAL.length]} bg={`color-mix(in srgb, ${CPAL[i % CPAL.length]} 14%, transparent)`}>{d.label}</Pill>)}</div></Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || trDims.length < 4} onClick={async () => { setBusy(true); await setStep(sessionId, "rate", 1); setBusy(false); }}>Empezar la puntuación ({trDims.length} dimensiones)</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>En un momento arranca la puntuación.</p>;
    } else if (step === "rate") {
      sub = "Puntuá cada dimensión del 1 al 5. Anónimo: solo se revela el promedio.";
      content = isFacil ? (
        <Card pad={24}><div style={{ textAlign: "center", padding: "8px 0" }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--green)" }}>{responses.length}/{totalInRoom}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>puntuaron</div></div></Card>
      ) : (
        <Card pad={24}>
          {submitted && <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--green)", fontSize: "var(--t-sm)", fontWeight: 600, marginBottom: 14 }}><Icon name="Check" size={16} /> Tu puntuación quedó guardada (anónima).</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, opacity: submitted ? 0.85 : 1 }}>
            {radarDims.map((d) => (
              <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ flex: 1, minWidth: 150, fontSize: "var(--t-sm)", fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: d.color, flexShrink: 0 }} />{d.label}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {[1, 2, 3, 4, 5].map((v) => { const on = (draft[d.key] ?? 3) === v; return (
                    <button key={v} disabled={submitted} onClick={() => setDraft((s) => ({ ...s, [d.key]: v }))} className="num" style={{ width: 34, height: 34, borderRadius: 99, fontWeight: 800, fontSize: "var(--t-sm)", border: `1.5px solid ${on ? d.color : "var(--line-2)"}`, background: on ? `color-mix(in srgb, ${d.color} 22%, transparent)` : "var(--card)", color: on ? d.color : "var(--ink-2)", cursor: submitted ? "default" : "pointer" }}>{v}</button>
                  ); })}
                </div>
              </div>
            ))}
          </div>
          <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 14, textAlign: "center" }}><Icon name="Lock" size={12} /> 1 Muy mal · 3 Regular · 5 Muy bien — {responses.length} de {totalInRoom} puntuaron</p>
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Eye" disabled={busy || responses.length === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "radar_reveal", 2); setBusy(false); }}>Revelar radar ({responses.length})</Button>
        : submitted
          ? <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Esperá a que el facilitador revele el radar.</p>
          : <Button full size="lg" icon="Send" disabled={busy} onClick={async () => { setBusy(true); const res = await submitPulse(sessionId, Object.fromEntries(radarDims.map((d) => [d.key, to100(draft[d.key] ?? 3)]))); setBusy(false); if (!res.error) setSubmitted(true); }}>{busy ? "Enviando…" : "Enviar mi puntuación"}</Button>;
    } else {
      sub = "El radar del equipo. Miren las más bajas, las más altas y dónde perciben distinto.";
      content = (
        <Card pad={24}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontWeight: 700 }}>Radar del equipo</span>
            <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
              {prevRadar && <span className="muted" style={{ fontSize: "var(--t-xs)", display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 14, height: 0, borderTop: "2px dashed var(--violet)" }} /> radar anterior</span>}
              <Pill color="var(--success)" bg="var(--success-bg)" icon="Eye">{to5(trOverall).toFixed(1)}/5</Pill>
            </span>
          </div>
          <PulseRadar values={trAvg} dims={radarDims} size={330} compare={prevRadar?.avg} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
            {radarDims.map((d) => { const r = rangeOf(d.key); if (!r || trAvg[d.key] == null) return null; return (
              <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--t-xs)" }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, fontWeight: 600 }}>{d.label}</span>
                <span className="num muted">rango {to5(r.min).toFixed(1)}–{to5(r.max).toFixed(1)}</span>
                <span className="num" style={{ fontWeight: 800, color: d.color, width: 34, textAlign: "right" }}>{to5(trAvg[d.key]).toFixed(1)}</span>
              </div>
            ); })}
          </div>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 6, fontSize: "var(--t-sm)" }}>
            {sortedLow[0] && <div><Icon name="TrendingDown" size={14} style={{ color: "var(--warning)" }} /> <b>Más bajas:</b> {sortedLow.slice(0, 2).map((d) => d.label).join(" · ")} <span className="muted">→ variables candidatas a mejorar</span></div>}
            {sortedLow.length > 2 && <div><Icon name="TrendingUp" size={14} style={{ color: "var(--success)" }} /> <b>Fortalezas:</b> {sortedLow.slice(-2).reverse().map((d) => d.label).join(" · ")}</div>}
            {mostSpread[0] && mostSpread[0].r!.spread >= 50 && <div><Icon name="Split" size={14} style={{ color: "var(--violet)" }} /> <b>Perciben distinto:</b> {mostSpread.filter((x) => x.r!.spread >= 50).map((x) => x.d.label).join(" · ")}</div>}
          </div>
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Check" disabled={busy} onClick={trFinish}>{busy ? "Guardando…" : "Cerrar y guardar el radar"}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>“¿Por qué estamos así en las más bajas? ¿Qué haría falta para subir 2 puntos?”</p>;
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: 640 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ TIMELINE · hitos + eventos con emoción ════════
  if (session.type === "timeline") {
    const milestones = (session.result.tlMilestones as string[]) ?? [];
    const evCards = allCards.filter((c) => c.columnKey.startsWith("ev:"));
    // Contador por counts (sirve con tarjetas ocultas) y guarda: con eventos
    // cargados no se pueden borrar hitos (desplazaría los índices).
    const evCount = Object.entries(counts).reduce((a, [k, v]) => (k.startsWith("ev:") ? a + v : a), 0);
    const events: TlEvent[] = evCards.map((c) => {
      const [, mi, emo] = c.columnKey.split(":");
      return { mIdx: Number(mi) || 0, emo: (["pos", "neu", "neg"].includes(emo) ? emo : "neu") as TlEvent["emo"], text: c.text, author: c.authorId ? participants.find((p) => p.userId === c.authorId)?.name : undefined };
    });
    const myEvents = myCards.filter((c) => c.columnKey.startsWith("ev:"));
    const patterns = (session.result.tlPatterns as string[]) ?? [];
    const addMilestone = () => { const t = (cardDraft.mile ?? "").trim(); if (!t) return; patchResult({ tlMilestones: [...milestones, t] }); setCardDraft((d) => ({ ...d, mile: "" })); };
    const addEvent = async () => {
      const t = (cardDraft.tlev ?? "").trim(); if (!t) return;
      await addCard(sessionId, `ev:${tlPick.m}:${tlPick.emo}`, t, false);
      setCardDraft((d) => ({ ...d, tlev: "" }));
      if (user) setMyCards(await getMyCards(sessionId, user.id));
    };
    const addPattern = () => { const t = (cardDraft.tlpat ?? "").trim(); if (!t) return; patchResult({ tlPatterns: [...patterns, t] }); setCardDraft((d) => ({ ...d, tlpat: "" })); };
    const tlFinish = async () => {
      setBusy(true);
      await finalizeSession(session, { pulseAvg: avg, cardCount: evCount, summaryText: `Timeline: ${evCount} eventos${patterns.length ? ` · ${patterns.length} patrones` : ""}` });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (step === "build") {
      sub = isFacil ? "Armá el eje: los hitos del período (entregas, cambios, eventos)." : "El facilitador arma la línea de tiempo del período.";
      content = (
        <Card pad={20}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {milestones.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="num" style={{ width: 22, color: "var(--green)", fontWeight: 800 }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: "var(--t-sm)", fontWeight: 600 }}>{m}</span>
                {isFacil && <button disabled={evCount > 0} title={evCount > 0 ? "Con eventos cargados no se pueden borrar hitos" : "Quitar"} onClick={() => patchResult({ tlMilestones: milestones.filter((_, k) => k !== i) })} style={{ color: evCount > 0 ? "var(--line-2)" : "var(--ink-3)" }}><Icon name="Trash2" size={14} /></button>}
              </div>
            ))}
            {!milestones.length && <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>Ej: “Lanzamiento v2”, “Cambio de líder”, “Cierre de trimestre”…</p>}
          </div>
          {isFacil && (
            <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
              <input value={cardDraft.mile ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, mile: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addMilestone()} placeholder="Agregar hito…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "8px 10px", fontSize: "var(--t-sm)", outline: "none" }} />
              <Button size="sm" icon="Plus" onClick={addMilestone}>Sumar</Button>
            </div>
          )}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || milestones.length < 2} onClick={async () => { setBusy(true); await setStep(sessionId, "tload", 1); setBusy(false); }}>Cargar eventos ({milestones.length} hitos)</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>En un momento van a cargar sus eventos.</p>;
    } else if (step === "tload") {
      sub = "Sumá eventos que recuerdes del período y cómo te sentiste en cada uno.";
      content = (
        <Card pad={20}>
          {isFacil ? (
            <div style={{ textAlign: "center", padding: "8px 0" }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--green)" }}>{evCount}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>eventos cargados · ocultos hasta revelar</div></div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
                <select value={tlPick.m} onChange={(e) => setTlPick((s) => ({ ...s, m: Number(e.target.value) }))} style={{ background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 10px", fontSize: "var(--t-sm)", outline: "none" }}>
                  {milestones.map((m, i) => <option key={i} value={i}>Cerca de: {m}</option>)}
                </select>
                <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                  {(Object.entries(TL_EMO) as [TlEvent["emo"], typeof TL_EMO[keyof typeof TL_EMO]][]).map(([k, e]) => (
                    <button key={k} onClick={() => setTlPick((s) => ({ ...s, emo: k }))} style={{ padding: "7px 14px", borderRadius: "var(--r-full)", fontSize: "var(--t-sm)", fontWeight: 700, border: `1.5px solid ${tlPick.emo === k ? e.color : "var(--line-2)"}`, background: tlPick.emo === k ? `color-mix(in srgb, ${e.color} 16%, var(--card))` : "var(--card)" }}>{e.emoji} {e.label}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={cardDraft.tlev ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, tlev: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addEvent()} placeholder="¿Qué pasó?" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 10px", fontSize: "var(--t-sm)", outline: "none" }} />
                  <Button size="sm" icon="Plus" onClick={addEvent}>Sumar</Button>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {myEvents.map((c) => { const [, mi, emo] = c.columnKey.split(":"); const e = TL_EMO[(emo as TlEvent["emo"])] ?? TL_EMO.neu; return (
                  <div key={c.id} style={{ fontSize: "var(--t-xs)", padding: "7px 9px", background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${e.color}`, borderRadius: "var(--r-sm)" }}>{e.emoji} {c.text} <span className="faint">· {milestones[Number(mi)] ?? ""}</span></div>
                ); })}
              </div>
              <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 10, textAlign: "center" }}>{evCount} eventos del equipo · se revelan todos juntos</p>
            </>
          )}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Eye" disabled={busy || evCount === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "timeline_reveal", 2); setBusy(false); }}>Revelar timeline ({evCount})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador revela el timeline completo.</p>;
    } else {
      wide = true;
      sub = "El timeline del equipo, de izquierda a derecha. ¿Dónde vivieron cosas distintas?";
      content = (
        <>
          <Card pad={20} style={{ marginBottom: 14 }}>
            <TimelineBoard milestones={milestones} events={events} />
          </Card>
          <Card pad={16}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Patrones del período ({patterns.length})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {patterns.map((p, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--t-sm)" }}><Icon name="Sparkles" size={13} style={{ color: "var(--green)" }} /><span style={{ flex: 1 }}>{p}</span>{isFacil && <button onClick={() => patchResult({ tlPatterns: patterns.filter((_, k) => k !== i) })} style={{ color: "var(--ink-3)" }}><Icon name="X" size={13} /></button>}</div>)}
              {!patterns.length && <p className="muted" style={{ fontSize: "var(--t-xs)", fontStyle: "italic" }}>“¿Qué momento fue el más difícil? ¿Qué hizo tan bueno al mejor?” — el facilitador registra 2-3 patrones.</p>}
            </div>
            {isFacil && (
              <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                <input value={cardDraft.tlpat ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, tlpat: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addPattern()} placeholder="Registrar patrón…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "8px 10px", fontSize: "var(--t-sm)", outline: "none" }} />
                <Button size="sm" icon="Plus" onClick={addPattern}>Sumar</Button>
              </div>
            )}
          </Card>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Check" disabled={busy} onClick={tlFinish}>{busy ? "Guardando…" : "Cerrar y guardar el timeline"}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador sintetiza los patrones y cierra.</p>;
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: wide ? 920 : 620 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ CIRCLES & SOUP · control, influencia y sopa ════════
  if (session.type === "circles") {
    const worries = allCards.filter((c) => c.columnKey === "worry");
    const circleMap = (session.result.circleMap as Record<string, CircleKey>) ?? {};
    const counts3: Record<CircleKey, number> = { control: 0, influence: 0, soup: 0 };
    for (const w of worries) { const k = circleMap[w.id]; if (k) counts3[k] += 1; }
    const unclassified = worries.filter((w) => !circleMap[w.id]);
    const ORDER: CircleKey[] = ["control", "influence", "soup"];
    const cycleCircle = (id: string) => {
      const cur = circleMap[id];
      const next = cur ? ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length] : "control";
      patchResult({ circleMap: { ...((resultRef.current.circleMap as Record<string, CircleKey>) ?? {}), [id]: next } });
    };
    const addWorry = async () => {
      const t = (cardDraft.worry ?? "").trim(); if (!t) return;
      await addCard(sessionId, "worry", t, false);
      setCardDraft((d) => ({ ...d, worry: "" }));
      if (user) setMyCards(await getMyCards(sessionId, user.id));
    };
    const csFinish = async () => {
      setBusy(true);
      const candidates = worries.filter((w) => circleMap[w.id] === "control").map((w) => w.text);
      await setResult(sessionId, { circleCandidates: candidates });
      await finalizeSession(session, { pulseAvg: avg, cardCount: worries.length, summaryText: `Circles & Soup: ${counts3.control} en control · ${counts3.soup} en la sopa` });
      setBusy(false); leave();
    };
    const WorryCard = ({ w }: { w: SessionCard }) => {
      const k = circleMap[w.id];
      const color = k ? CIRCLE_META[k].color : "var(--line-2)";
      return (
        <button disabled={!isFacil || step !== "classify"} onClick={() => cycleCircle(w.id)} title={isFacil ? "Tocar para mover de círculo" : undefined}
          style={{ textAlign: "left", fontSize: "var(--t-xs)", padding: "7px 9px", background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${color}`, borderRadius: "var(--r-sm)", lineHeight: 1.4, cursor: isFacil && step === "classify" ? "pointer" : "default" }}>
          {w.text}
        </button>
      );
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (step === "brain") {
      sub = "Vuelquen todas las trabas y preocupaciones del equipo. Sin clasificar todavía.";
      content = (
        <Card pad={20}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 8 }}>
            {worries.map((w) => <div key={w.id} style={{ fontSize: "var(--t-xs)", padding: "7px 9px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-sm)", lineHeight: 1.4 }}>{w.text}</div>)}
            {!worries.length && <p className="muted" style={{ gridColumn: "1/-1", fontSize: "var(--t-sm)", fontStyle: "italic", textAlign: "center", padding: 10 }}>Todo lo que traba al equipo, una idea por tarjeta.</p>}
          </div>
          {!isFacil && (
            <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
              <input value={cardDraft.worry ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, worry: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addWorry()} placeholder="Sumar preocupación…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 10px", fontSize: "var(--t-sm)", outline: "none" }} />
              <Button size="sm" icon="Plus" onClick={addWorry}>Sumar</Button>
            </div>
          )}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || worries.length === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "classify", 1); setBusy(false); }}>Clasificar en círculos ({worries.length})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Cuando estén todas, las clasifican juntos.</p>;
    } else if (step === "classify" || step === "soup_close") {
      wide = true;
      sub = step === "classify"
        ? (isFacil ? "Debatan dónde va cada una; tocá una tarjeta para moverla de círculo." : "Debatan dónde va cada una: ¿la controlamos, influimos o es sopa?")
        : "Foco en el círculo de control: ¿cuáles no estamos atacando aunque podríamos?";
      content = (
        <>
          <CirclesDiagram counts={counts3} size={250} />
          {unclassified.length > 0 && (
            <Card pad={14} style={{ margin: "12px 0" }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Sin clasificar ({unclassified.length})</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px,1fr))", gap: 7 }}>{unclassified.map((w) => <WorryCard key={w.id} w={w} />)}</div>
            </Card>
          )}
          <div className="cards-cols" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 12 }}>
            {ORDER.map((k) => (
              <div key={k} style={{ background: "var(--bg-2)", border: `1px solid color-mix(in srgb, ${CIRCLE_META[k].color} 35%, var(--line))`, borderRadius: "var(--r-lg)", padding: 12, opacity: step === "soup_close" && k !== "control" ? 0.7 : 1 }}>
                <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", color: CIRCLE_META[k].color, marginBottom: 2 }}>{CIRCLE_META[k].label} · {counts3[k]}</div>
                <div className="muted" style={{ fontSize: 10, marginBottom: 8 }}>{CIRCLE_META[k].hint}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {worries.filter((w) => circleMap[w.id] === k).map((w) => <WorryCard key={w.id} w={w} />)}
                </div>
              </div>
            ))}
          </div>
          {step === "soup_close" && (
            <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 12, textAlign: "center" }}>
              Las del círculo de <b style={{ color: "var(--green)" }}>control</b> quedan como variables candidatas. “¿Estamos gastando energía en la sopa?”
            </p>
          )}
        </>
      );
      controls = step === "classify"
        ? (isFacil
          ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || unclassified.length > 0} onClick={async () => { setBusy(true); await setStep(sessionId, "soup_close", 2); setBusy(false); }}>{unclassified.length > 0 ? `Faltan ${unclassified.length} por clasificar` : "Conversar y cerrar"}</Button>
          : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador mueve las tarjetas según lo que acuerden.</p>)
        : (isFacil
          ? <Button full size="lg" icon="Check" disabled={busy} onClick={csFinish}>{busy ? "Guardando…" : `Cerrar · ${counts3.control} variables candidatas`}</Button>
          : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador cierra y guarda la clasificación.</p>);
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: wide ? 920 : 620 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ ¿CÓMO NOS RELACIONAMOS? · retro sensible ════════
  if (session.type === "relationships") {
    const REL_COLS = [
      { key: "rq1", label: "¿Qué hace que la comunicación fluya en este equipo?" },
      { key: "rq2", label: "¿Qué te cuesta decir o pedir en este equipo?" },
      { key: "rq3", label: "¿Qué vínculo o dinámica te gustaría que cambie?" },
    ];
    const relCount = REL_COLS.reduce((a, q) => a + (counts[q.key] ?? 0), 0); // contador con tarjetas ocultas
    const relWordCount = counts["relword"] ?? 0;
    const relWords = allCards.filter((c) => c.columnKey === "relword");
    const myRelWord = myCards.find((c) => c.columnKey === "relword");
    const relPatterns = (session.result.relPatterns as string[]) ?? [];
    const relPaused = !!session.result.relPaused;
    const resonates = new Set(inputs.filter((i) => i.key === "resonate").map((i) => i.voterKey)).size;
    const iResonated = inputs.some((i) => i.key === "resonate" && i.userId === user.id);
    const addRelPattern = () => { const t = (cardDraft.relpat ?? "").trim(); if (!t) return; patchResult({ relPatterns: [...relPatterns, t] }); setCardDraft((d) => ({ ...d, relpat: "" })); };
    const submitRelWord = async () => {
      const w = (cardDraft.relword ?? "").trim().split(/\s+/)[0]?.slice(0, 24);
      if (!w || myRelWord) return;
      await addCard(sessionId, "relword", w, true);
      setCardDraft((d) => ({ ...d, relword: "" }));
      if (user) setMyCards(await getMyCards(sessionId, user.id));
    };
    const relFinish = async () => {
      setBusy(true);
      await finalizeSession(session, { cardCount: relCount, summaryText: `Relaciones: ${relCount} aportes${relPatterns.length ? ` · ${relPatterns.length} patrones` : ""}` });
      setBusy(false); leave();
    };
    // Botón de emergencia: el facilitador pausa y gestiona en privado.
    const EmergencyBar = isFacil ? (
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        {relPaused
          ? <Button size="sm" icon="Play" onClick={() => setResult(sessionId, { relPaused: false })}>Retomar la sesión</Button>
          : <button onClick={() => setResult(sessionId, { relPaused: true })} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: "var(--r-full)", border: "1px solid color-mix(in srgb, var(--warning) 45%, transparent)", background: "var(--warning-bg)", color: "var(--warning)", fontSize: "var(--t-xs)", fontWeight: 700 }}><Icon name="PauseCircle" size={14} /> Pausar y gestionar en privado</button>}
      </div>
    ) : null;
    // Pantalla de pausa para los miembros.
    if (relPaused && !isFacil) {
      return (
        <Shell onExit={exit} mood={teamMood}>
          <div style={{ width: "100%", maxWidth: 480, textAlign: "center" }}>
            {Header("Pausa")}
            <Card pad={32}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🫧</div>
              <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, marginBottom: 8 }}>Hacemos una pausa</h2>
              <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.6 }}>El facilitador pausó la sesión para gestionar algo en privado. Está bien — estas conversaciones a veces necesitan aire. Quedate cerca.</p>
            </Card>
          </div>
        </Shell>
      );
    }
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (step === "frame") {
      sub = "Antes de empezar: el encuadre lo es todo en esta retro.";
      content = (
        <Card pad={26}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ width: 44, height: 44, borderRadius: "var(--r-lg)", background: "var(--warning-bg)", color: "var(--warning)", display: "grid", placeItems: "center" }}><Icon name="ShieldAlert" size={22} /></span>
            <div><div style={{ fontWeight: 800 }}>Retro sensible</div><div className="muted" style={{ fontSize: "var(--t-xs)" }}>Hablamos de vínculos, no de personas culpables.</div></div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: "var(--t-sm)", lineHeight: 1.55 }}>
            <p><b>El facilitador encuadra en voz alta:</b></p>
            <p>· Lo que se diga acá es del equipo y queda en el equipo.</p>
            <p>· Las respuestas son anónimas y <b>no se proyectan</b>: las voy a leer yo, en voz alta, con cuidado.</p>
            <p>· Hablamos de dinámicas y patrones, no de nombres propios.</p>
            <p>· Si algo se pone difícil, paro la sesión y lo gestionamos en privado.</p>
          </div>
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "questions", 1); setBusy(false); }}>Empezar las preguntas</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador está encuadrando la conversación.</p>;
    } else if (step === "questions") {
      wide = true;
      sub = "Tres preguntas sobre vínculos. Anónimo de verdad: nadie ve quién escribió qué.";
      content = <>{EmergencyBar}{MultiWrite(REL_COLS, "var(--warning)", !isFacil, true)}</>;
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || relCount === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "read", 2); setBusy(false); }}>Pasar a la lectura ({relCount})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Escribí con honestidad. El facilitador va a leer sin mostrar pantalla.</p>;
    } else if (step === "read") {
      wide = isFacil;
      sub = isFacil ? "Leé en voz alta, despacio. Solo vos ves las tarjetas." : "Escuchá. Si algo te resuena, avisalo.";
      content = isFacil ? (
        <>
          {EmergencyBar}
          <div style={{ padding: "8px 12px", marginBottom: 12, background: "var(--warning-bg)", borderRadius: "var(--r-md)", fontSize: "var(--t-xs)", color: "var(--warning)", display: "flex", alignItems: "center", gap: 6 }}><Icon name="EyeOff" size={13} /> Esta pantalla NO se comparte. Los miembros solo escuchan.</div>
          {MultiReveal(REL_COLS)}
          <Card pad={14} style={{ marginTop: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Patrones relacionales que escuchás ({relPatterns.length})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {relPatterns.map((p, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--t-sm)" }}><Icon name="Sparkles" size={13} style={{ color: "var(--warning)" }} /><span style={{ flex: 1 }}>{p}</span><button onClick={() => patchResult({ relPatterns: relPatterns.filter((_, k) => k !== i) })} style={{ color: "var(--ink-3)" }}><Icon name="X" size={13} /></button></div>)}
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
              <input value={cardDraft.relpat ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, relpat: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addRelPattern()} placeholder="Registrar patrón…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "8px 10px", fontSize: "var(--t-sm)", outline: "none" }} />
              <Button size="sm" icon="Plus" onClick={addRelPattern}>Sumar</Button>
            </div>
          </Card>
        </>
      ) : (
        <Card pad={32} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>👂</div>
          <p style={{ fontSize: "var(--t-md)", fontWeight: 700, marginBottom: 6 }}>El facilitador está leyendo las respuestas en voz alta.</p>
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 20 }}>Sin pantalla compartida, sin autores. Solo escuchar.</p>
          {iResonated
            ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--green)", fontWeight: 700 }}><Icon name="HeartHandshake" size={18} /> Avisaste que algo te resonó</div>
            : <Button size="lg" icon="HeartHandshake" onClick={() => tapInput("resonate", { at: Date.now() })}>Me resuena algo de esto</Button>}
          <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 14 }}>{resonates} {resonates === 1 ? "persona resonó" : "personas resonaron"} · es voluntario</p>
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "relword", 3); setBusy(false); }}>Cerrar con una palabra · {resonates} resonancias</Button>
        : null;
    } else if (step === "relword") {
      sub = "Cerramos con una palabra por persona: ¿cómo te vas de esta conversación?";
      content = (
        <Card pad={28} style={{ textAlign: "center" }}>
          {isFacil ? (
            <div><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--green)" }}>{relWordCount}/{totalInRoom}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>palabras de cierre</div></div>
          ) : myRelWord ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--green)", fontWeight: 700 }}><Icon name="Check" size={18} /> Tu palabra: “{myRelWord.text}”</div>
          ) : (
            <div style={{ display: "flex", gap: 8, maxWidth: 320, margin: "0 auto" }}>
              <input value={cardDraft.relword ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, relword: e.target.value.split(/\s+/)[0] ?? "" }))} onKeyDown={(e) => e.key === "Enter" && submitRelWord()} placeholder="Una palabra…" maxLength={24} style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "12px 14px", fontSize: "var(--t-md)", textAlign: "center", outline: "none" }} />
              <Button icon="Send" onClick={submitRelWord} disabled={!(cardDraft.relword ?? "").trim()}>Enviar</Button>
            </div>
          )}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Eye" disabled={busy || relWordCount === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "rel_close", 4); setBusy(false); }}>Revelar palabras ({relWordCount})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador revela las palabras de cierre.</p>;
    } else {
      sub = "Las palabras del equipo. Gracias por la honestidad.";
      content = (
        <>
          <Card pad={24} style={{ marginBottom: 14 }}><WordCloud words={relWords.map((c) => c.text)} size="lg" /></Card>
          {relPatterns.length > 0 && (
            <Card pad={16}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Patrones relacionales identificados</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{relPatterns.map((p, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--t-sm)" }}><Icon name="Sparkles" size={13} style={{ color: "var(--warning)" }} />{p}</div>)}</div>
            </Card>
          )}
        </>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Check" disabled={busy} onClick={relFinish}>{busy ? "Guardando…" : "Cerrar y guardar"}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador cierra la sesión.</p>;
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: wide ? 920 : 620 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ CIERRE DE EXPLORACIÓN · variables → mapa de mejoras ════════
  if (session.type === "expclose") {
    const EXP_DOTS = 3;
    const expRemaining = EXP_DOTS - myVoteCount;
    const expVars = session.result.expVars as { name: string; freq: number }[] | undefined;
    const expSkip = new Set((session.result.expSkip as string[]) ?? []);
    const included = ranked.filter((cl) => !expSkip.has(cl.id));
    const toggleSkip = (id: string) => {
      const cur = new Set((resultRef.current.expSkip as string[]) ?? []);
      if (cur.has(id)) cur.delete(id); else cur.add(id);
      patchResult({ expSkip: [...cur] });
    };
    const addVar = () => {
      const t = (cardDraft.expvar ?? "").trim(); if (!t || !expVars) return;
      patchResult({ expVars: [...expVars, { name: t, freq: 1 }] });
      setCardDraft((d) => ({ ...d, expvar: "" }));
    };
    const startVote = async () => {
      if (busy || !expVars?.length) return;
      setBusy(true);
      if (!clusters.length) for (const v of expVars) await createCluster(sessionId, v.name);
      await load();
      await setStep(sessionId, "vote", 1);
      setBusy(false);
    };
    const confirmMap = async () => {
      if (busy || !included.length) return;
      setBusy(true);
      for (let i = 0; i < included.length; i++) {
        await createInitiative({ teamId: session.teamId, title: included[i].name, status: i === 0 ? "active" : "paused", stage: "objectives" });
      }
      await finalizeSession(session, {
        summaryText: `Mapa de mejoras: ${included.length} variables · activa: ${included[0].name}`,
        teamData: { explorationClosedAt: new Date().toISOString() },
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "";
    if (step === "consolidate") {
      sub = "Todo lo que emergió en Exploración, consolidado. El facilitador puede ajustar la lista.";
      content = !expVars ? (
        <Card pad={28} style={{ textAlign: "center" }}><div style={{ fontSize: 32, marginBottom: 10 }}>🔭</div><p className="muted" style={{ fontSize: "var(--t-sm)" }}>Juntando las variables candidatas de todas las retros de Exploración…</p></Card>
      ) : (
        <Card pad={20}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Variables candidatas ({expVars.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {expVars.map((v, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
                <span style={{ flex: 1, fontSize: "var(--t-sm)", fontWeight: 600 }}>{v.name}</span>
                <Pill color={v.freq > 1 ? "var(--green)" : "var(--ink-2)"} bg={v.freq > 1 ? "var(--success-bg)" : "var(--card-2)"}>{v.freq > 1 ? `apareció ${v.freq} veces` : "1 vez"}</Pill>
                {isFacil && <button onClick={() => patchResult({ expVars: expVars.filter((_, k) => k !== i) })} style={{ color: "var(--ink-3)" }}><Icon name="X" size={14} /></button>}
              </div>
            ))}
            {!expVars.length && <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>No se encontraron variables — agregá a mano lo que el equipo descubrió.</p>}
          </div>
          {isFacil && (
            <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
              <input value={cardDraft.expvar ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, expvar: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addVar()} placeholder="Agregar variable…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "8px 10px", fontSize: "var(--t-sm)", outline: "none" }} />
              <Button size="sm" icon="Plus" onClick={addVar}>Sumar</Button>
            </div>
          )}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || !expVars?.length} onClick={startVote}>{busy ? "Preparando…" : `Pasar a la priorización (${expVars?.length ?? 0})`}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>En un momento priorizan entre todos.</p>;
    } else if (step === "vote") {
      const shown = !!session.result.voteShown;
      const voters = new Set(votes.map((v) => v.voterKey)).size;
      const max = Math.max(1, ...ranked.map((c) => votesByCluster[c.id] ?? 0));
      sub = shown ? "La prioridad del equipo, revelada." : "¿Qué variable trabajamos primero? 3 puntos por persona, en anónimo.";
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
              {Array.from({ length: EXP_DOTS }).map((_, i) => <span key={i} style={{ width: 16, height: 16, borderRadius: 99, background: i < expRemaining ? "var(--green)" : "var(--card-2)", border: `1px solid ${i < expRemaining ? "var(--green)" : "var(--line-2)"}` }} />)}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {clusters.map((cl) => { const mine = votes.filter((v) => v.userId === user.id && v.clusterId === cl.id).length; return (
              <button key={cl.id} onClick={() => { if (!isFacil && expRemaining > 0) castVote(cl.id, 1, expRemaining); }}
                style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", background: mine > 0 ? "color-mix(in srgb, var(--green) 8%, var(--card))" : "var(--card)", border: `1px solid ${mine > 0 ? "color-mix(in srgb, var(--green) 45%, var(--line))" : "var(--line)"}`, borderRadius: "var(--r-md)", cursor: isFacil ? "default" : "pointer" }}>
                <div style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: "var(--t-sm)" }}>{cl.name}</div>
                {!isFacil && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    {Array.from({ length: mine }).map((_, k) => <span key={k} style={{ width: 14, height: 14, borderRadius: 99, background: "var(--green)", boxShadow: "0 0 7px rgba(0,232,122,0.6)" }} />)}
                    {mine > 0 && <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); castVote(cl.id, -1, expRemaining); }} style={{ display: "inline-flex", color: "var(--ink-3)", padding: 3 }}><Icon name="X" size={13} /></span>}
                  </span>
                )}
              </button>
            ); })}
          </div>
          <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)", marginTop: 12 }}><Icon name="EyeOff" size={13} /> Votación oculta · {voters} de {totalInRoom} votaron</p>
        </>
      );
      controls = isFacil
        ? (shown
          ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "map", 2); setBusy(false); }}>Generar el mapa de mejoras</Button>
          : <Button full size="lg" icon="Eye" disabled={busy} onClick={() => setResult(sessionId, { voteShown: true })}>Mostrar votación ({voters}/{totalInRoom})</Button>)
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Repartí tus {EXP_DOTS} puntos. El facilitador revela el resultado.</p>;
    } else {
      sub = "El mapa de mejoras del equipo. El facilitador puede ajustar antes de confirmar.";
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ranked.map((cl) => {
            const skipped = expSkip.has(cl.id);
            const pos = included.findIndex((x) => x.id === cl.id);
            return (
              <div key={cl.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", background: pos === 0 ? "color-mix(in srgb, var(--green) 10%, var(--card))" : "var(--card)", border: `1px solid ${pos === 0 ? "var(--green)" : "var(--line)"}`, borderRadius: "var(--r-md)", opacity: skipped ? 0.45 : 1 }}>
                <span style={{ width: 32, height: 32, borderRadius: 99, display: "grid", placeItems: "center", flex: "none", background: pos === 0 ? "var(--green)" : "var(--card-2)", color: pos === 0 ? "#08120c" : "var(--ink-2)" }}><Icon name={pos === 0 ? "Target" : skipped ? "X" : "Clock"} size={15} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", textDecoration: skipped ? "line-through" : "none" }}>{cl.name}</div>
                  <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{skipped ? "fuera del mapa" : pos === 0 ? "ACTIVA · arranca en Objetivos" : `en cola · prioridad ${pos + 1}`} · {votesByCluster[cl.id] ?? 0} votos</div>
                </div>
                {isFacil && <Button size="sm" variant="secondary" onClick={() => toggleSkip(cl.id)}>{skipped ? "Incluir" : "Sacar"}</Button>}
              </div>
            );
          })}
          <p className="muted" style={{ fontSize: "var(--t-xs)", textAlign: "center" }}>Al confirmar, cada variable se crea como iniciativa del equipo: la primera activa, el resto pausadas en cola.</p>
        </div>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Check" disabled={busy || !included.length} onClick={confirmMap}>{busy ? "Creando el mapa…" : `Confirmar mapa (${included.length} variables)`}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Este es el mapa que sale de Exploración. El facilitador confirma.</p>;
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: 620 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ ¿POR QUÉ ESTÁ PASANDO? · causas → árbol → causa raíz ════════
  if (session.type === "whyhappening") {
    const whTrouble = (session.result.whTrouble as string) || (initiative?.data?.focus?.blockFormulation as string) || "";
    const whCount = counts["whc"] ?? 0; // contador aunque las tarjetas sigan ocultas
    const tree = (session.result.whTree as { id: string; text: string; parent?: string }[]) ?? [];
    const whRoot = (session.result.whRoot as string) ?? "";
    const whVoteShown = !!session.result.whVoteShown;
    const whVoters = new Set(votes.map((v) => v.voterKey)).size;
    const WH_DOTS = 3;
    const whRemaining = WH_DOTS - myVoteCount;
    const vVals = inputs.filter((i) => i.key === "whval");
    const vCount = (k: string) => vVals.filter((v) => (v.value as { v?: string }).v === k).length;
    const myWhVal = (inputs.find((i) => i.userId === user.id && i.key === "whval")?.value as { v?: string } | undefined)?.v;
    const addWh = async () => { const t = (cardDraft.whc ?? "").trim(); if (!t) return; await addCard(sessionId, "whc", t, true); setCardDraft((d) => ({ ...d, whc: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
    const whGroup = async () => { if (!sel.length) return; setBusy(true); const id = await createCluster(sessionId, `Causa ${clusters.length + 1}`); if (id) for (const cid of sel) await assignCardToCluster(cid, id); setSel([]); setBusy(false); load(); };
    const treePatch = (next: { id: string; text: string; parent?: string }[]) => patchResult({ whTree: next });
    const treeDelete = (id: string) => {
      const drop = new Set([id]);
      let grew = true;
      while (grew) { grew = false; for (const n of tree) if (n.parent && drop.has(n.parent) && !drop.has(n.id)) { drop.add(n.id); grew = true; } }
      treePatch(tree.filter((n) => !drop.has(n.id)));
    };
    const TroubleChip = whTrouble ? (
      <div style={{ padding: "10px 14px", marginBottom: 14, background: "color-mix(in srgb, var(--st-focus) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--st-focus) 32%, transparent)", borderRadius: "var(--r-md)", fontSize: "var(--t-sm)", lineHeight: 1.5 }}>
        <span className="eyebrow" style={{ color: "var(--st-focus)", display: "block", marginBottom: 3 }}>La traba</span>{whTrouble}
      </div>
    ) : null;
    const whFinish = async () => {
      setBusy(true);
      const total = vVals.length || 1;
      const agreement = Math.round((vCount("yes") / total) * 100);
      await finalizeSession(session, {
        pulseAvg: avg, cardCount: whCount,
        summaryText: `Causa raíz: ${whRoot.slice(0, 70)}${whRoot.length > 70 ? "…" : ""} · acuerdo ${agreement}%`,
        dataKey: "focus", dataValue: { rootCause: whRoot, cause: whRoot, secondaryCauses: ranked.slice(2).map((c) => ({ name: c.name, votes: votesByCluster[c.id] ?? 0 })) },
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (step === "whframe") {
      sub = "El encuadre antes de buscar causas.";
      content = (
        <Card pad={26} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>🔍</div>
          <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, marginBottom: 8 }}>Hoy buscamos por qué está pasando esto,<br />no quién tiene la culpa.</h2>
          {whTrouble && !isFacil && <p style={{ fontSize: "var(--t-sm)", marginTop: 14, padding: "10px 14px", background: "var(--card)", borderRadius: "var(--r-md)", lineHeight: 1.5 }}>{whTrouble}</p>}
          {isFacil && (
            <div style={{ marginTop: 16, textAlign: "left" }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>La traba que analizamos {initiative?.data?.focus?.blockFormulation ? "(vino de ¿Dónde se traba?)" : ""}</div>
              <textarea defaultValue={whTrouble} onBlur={(e) => patchResult({ whTrouble: e.target.value.trim() })} rows={2} placeholder="Escribí la traba si no viene de la retro anterior…" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "10px 12px", fontSize: "var(--t-sm)", outline: "none", lineHeight: 1.5, resize: "vertical" }} />
            </div>
          )}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || !whTrouble.trim()} onClick={async () => { setBusy(true); await setStep(sessionId, "whcauses", 1); setBusy(false); }}>Buscar causas</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador encuadra y arranca.</p>;
    } else if (step === "whcauses") {
      sub = "“Creo que esto está pasando porque…” — anónimo, tantas como quieras.";
      content = (
        <>
          {TroubleChip}
          <Card pad={20}>
            <HiddenDots n={whCount} label="causas escritas · ocultas hasta agrupar" color="var(--st-focus)" />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
              {myCards.filter((c) => c.columnKey === "whc").map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-focus)", borderRadius: "var(--r-md)", padding: "9px 11px", fontSize: "var(--t-sm)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 5 }}>· tuya</span></div>)}
            </div>
            {!isFacil && (
              <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
                <input value={cardDraft.whc ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, whc: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addWh()} placeholder="Creo que esto está pasando porque…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" }} />
                <Button size="sm" icon="Plus" onClick={addWh}>Sumar</Button>
              </div>
            )}
          </Card>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || whCount === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "whcluster", 2); setBusy(false); }}>Agrupar causas ({whCount})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Una causa por tarjeta. El facilitador agrupa después.</p>;
    } else if (step === "whcluster") {
      wide = true;
      sub = isFacil ? "Agrupación silenciosa: juntá las que hablan de lo mismo, sin leer en voz alta todavía." : "El facilitador agrupa las causas por temas, en silencio.";
      content = (
        <>
          {TroubleChip}
          <div className="cluster-grid" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18, alignItems: "start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span className="eyebrow">Sueltas ({loose.length})</span>
                {isFacil && sel.length > 0 && <Button size="sm" icon="Group" disabled={busy} onClick={whGroup}>Agrupar {sel.length}</Button>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px,1fr))", gap: 10 }}>
                {loose.map((c) => {
                  const on = sel.includes(c.id);
                  const st: React.CSSProperties = { textAlign: "left", background: on ? "var(--green-soft)" : "var(--card)", border: "1px solid " + (on ? "var(--green)" : "var(--line)"), borderLeft: "3px solid var(--st-focus)", borderRadius: "var(--r-md)", padding: "10px 11px", fontSize: "var(--t-sm)", lineHeight: 1.4 };
                  return isFacil
                    ? <button key={c.id} onClick={() => setSel((s) => (on ? s.filter((x) => x !== c.id) : [...s, c.id]))} style={st}>{c.text}</button>
                    : <div key={c.id} style={st}>{c.text}</div>;
                })}
                {!loose.length && <div style={{ gridColumn: "1/-1", color: "var(--ink-3)", fontSize: "var(--t-sm)", padding: 16, textAlign: "center" }}>Todas agrupadas.</div>}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span className="eyebrow">Grupos de causas ({clusters.length})</span>
              {clusters.map((cl) => (
                <Card key={cl.id} pad={12}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ color: "var(--st-focus)" }}><Icon name="Layers" size={15} /></span>
                    {isFacil
                      ? <input defaultValue={cl.name} onBlur={(e) => { if (e.target.value.trim()) renameCluster(cl.id, e.target.value.trim()); }} placeholder="Nombre del grupo…" style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", color: "var(--ink-0)", fontWeight: 700, fontSize: "var(--t-sm)", outline: "none", borderBottom: "1px dashed color-mix(in srgb, var(--st-focus) 55%, transparent)" }} />
                      : <span style={{ flex: 1, fontWeight: 700, fontSize: "var(--t-sm)" }}>{cl.name}</span>}
                    {isFacil && <button onClick={() => deleteCluster(cl.id)} style={{ color: "var(--ink-3)" }}><Icon name="Trash2" size={14} /></button>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {cardsOf(cl.id).map((c) => <div key={c.id} style={{ fontSize: "var(--t-xs)", color: "var(--ink-1)", padding: "5px 7px", background: "var(--card-2)", borderRadius: "var(--r-sm)", borderLeft: "2px solid var(--st-focus)" }}>{c.text}</div>)}
                  </div>
                </Card>
              ))}
              {!clusters.length && <div style={{ border: "1px dashed var(--line-2)", borderRadius: "var(--r-md)", padding: 18, textAlign: "center", color: "var(--ink-3)", fontSize: "var(--t-sm)" }}>{isFacil ? "Seleccioná tarjetas y agrupalas." : "Todavía no hay grupos."}</div>}
            </div>
          </div>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || clusters.length === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "whvote", 3); setBusy(false); }}>Votar las más probables</Button>
        : null;
    } else if (step === "whvote") {
      sub = whVoteShown ? "Las 2 más votadas arrancan el árbol de causas." : "¿Qué causas son las más probables? 3 puntos por persona, en anónimo.";
      const max = Math.max(1, ...ranked.map((c) => votesByCluster[c.id] ?? 0));
      content = (
        <>
          {TroubleChip}
          {whVoteShown ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {ranked.map((cl, i) => (
                <div key={cl.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="num" style={{ width: 20, fontWeight: 700, color: i < 2 ? "var(--st-focus)" : "var(--ink-3)" }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "var(--t-sm)", marginBottom: 5 }}>{cl.name}{i < 2 && <Pill color="var(--st-focus)" bg="color-mix(in srgb, var(--st-focus) 14%, transparent)" icon="GitBranch">rama del árbol</Pill>}</div>
                    <Bar value={((votesByCluster[cl.id] ?? 0) / max) * 100} color={i < 2 ? "var(--st-focus)" : "var(--violet)"} height={7} />
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
                  {Array.from({ length: WH_DOTS }).map((_, i) => <span key={i} style={{ width: 16, height: 16, borderRadius: 99, background: i < whRemaining ? "var(--st-focus)" : "var(--card-2)", border: `1px solid ${i < whRemaining ? "var(--st-focus)" : "var(--line-2)"}` }} />)}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {clusters.map((cl) => { const mine = votes.filter((v) => v.userId === user.id && v.clusterId === cl.id).length; return (
                  <button key={cl.id} onClick={() => { if (!isFacil && whRemaining > 0) castVote(cl.id, 1, whRemaining); }}
                    style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", background: mine > 0 ? "color-mix(in srgb, var(--st-focus) 8%, var(--card))" : "var(--card)", border: `1px solid ${mine > 0 ? "color-mix(in srgb, var(--st-focus) 45%, var(--line))" : "var(--line)"}`, borderRadius: "var(--r-md)", cursor: isFacil ? "default" : "pointer" }}>
                    <div style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: "var(--t-sm)" }}>{cl.name}</div>
                    {!isFacil && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        {Array.from({ length: mine }).map((_, k) => <span key={k} style={{ width: 14, height: 14, borderRadius: 99, background: "var(--st-focus)" }} />)}
                        {mine > 0 && <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); castVote(cl.id, -1, whRemaining); }} style={{ display: "inline-flex", color: "var(--ink-3)", padding: 3 }}><Icon name="X" size={13} /></span>}
                      </span>
                    )}
                  </button>
                ); })}
              </div>
              <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)", marginTop: 12 }}><Icon name="EyeOff" size={13} /> Votación oculta · {whVoters} de {totalInRoom} votaron</p>
            </>
          )}
        </>
      );
      controls = isFacil
        ? (whVoteShown
          ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => {
              setBusy(true);
              if (!tree.length && ranked.length) {
                const roots = ranked.slice(0, 2).map((c, i) => ({ id: `r${i}`, text: c.name }));
                await setResult(sessionId, { whTree: roots });
              }
              await setStep(sessionId, "whtree", 4); setBusy(false);
            }}>Armar el árbol de causas</Button>
          : <Button full size="lg" icon="Eye" disabled={busy} onClick={() => setResult(sessionId, { whVoteShown: true })}>Mostrar votación ({whVoters}/{totalInRoom})</Button>)
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Repartí tus {WH_DOTS} puntos.</p>;
    } else if (step === "whtree") {
      wide = true;
      sub = isFacil ? "Preguntá en cadena: “¿y por qué está pasando eso?” — máx 3 niveles. Agregá lo que diga el equipo." : "El árbol de causas se arma en vivo: ¿y por qué está pasando eso?";
      content = (
        <>
          {TroubleChip}
          <Card pad={20}>
            <CauseTree nodes={tree} editable={isFacil} maxDepth={3}
              onAdd={(pid) => treePatch([...((resultRef.current.whTree as typeof tree) ?? tree), { id: `n${Date.now().toString(36)}`, text: "", parent: pid }])}
              onEdit={(id, text) => treePatch((((resultRef.current.whTree as typeof tree) ?? tree)).map((n) => n.id === id ? { ...n, text } : n))}
              onDelete={treeDelete} />
          </Card>
          {isFacil && (
            <Card pad={16} style={{ marginTop: 14, border: "1px solid color-mix(in srgb, var(--warning) 40%, var(--line))" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <Icon name="ShieldAlert" size={18} style={{ color: "var(--warning)", flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, fontSize: "var(--t-xs)", lineHeight: 1.5 }}>
                  <b>⚠ ¿La cadena apunta hacia el líder?</b> Recomendación: nombrar el patrón (no la persona), formularlo como variable del sistema y agendar una charla privada post-retro.
                  {!!session.result.whProtocol && <div style={{ marginTop: 6, color: "var(--warning)", fontWeight: 700 }}>Protocolo aplicado: reformulá el nodo como “Proceso de [X]”, no “Comportamiento de [nombre]”.</div>}
                </div>
                {!session.result.whProtocol && <Button size="sm" variant="secondary" onClick={() => patchResult({ whProtocol: true })}>Aplicar protocolo</Button>}
              </div>
            </Card>
          )}
        </>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || !tree.length} onClick={async () => { setBusy(true); await setStep(sessionId, "whvalidate", 5); setBusy(false); }}>Validar la causa raíz</Button>
        : null;
    } else {
      sub = "La causa raíz, formulada. El equipo valida antes de cerrar.";
      const deepest = tree.filter((n) => n.text.trim() && !tree.some((c) => c.parent === n.id));
      const template = whRoot || (deepest.length ? `La causa raíz de la traba es ${deepest[0].text}` : "La causa raíz de la traba es ");
      content = (
        <>
          {TroubleChip}
          <Card pad={20}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>La causa raíz, en una oración</div>
            {isFacil
              ? <textarea defaultValue={template} onBlur={(e) => patchResult({ whRoot: e.target.value.trim() })} rows={3} style={{ width: "100%", background: "var(--card)", border: "1px solid color-mix(in srgb, var(--st-focus) 45%, var(--line-2))", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "12px 14px", fontSize: "var(--t-md)", fontWeight: 600, outline: "none", lineHeight: 1.5, resize: "vertical" }} />
              : <p style={{ fontSize: "var(--t-md)", fontWeight: 600, lineHeight: 1.55, color: whRoot ? "var(--ink-0)" : "var(--ink-3)" }}>{whRoot || "El facilitador está redactando…"}</p>}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {!isFacil ? (
                <>
                  <Button size="sm" variant={myWhVal === "yes" ? "primary" : "secondary"} onClick={() => tapInput("whval", { v: "yes" })}>Sí</Button>
                  <Button size="sm" variant={myWhVal === "partial" ? "primary" : "secondary"} onClick={() => tapInput("whval", { v: "partial" })}>Parcialmente</Button>
                  <Button size="sm" variant={myWhVal === "no" ? "primary" : "secondary"} onClick={() => tapInput("whval", { v: "no" })}>No</Button>
                </>
              ) : <span className="muted" style={{ fontSize: "var(--t-sm)" }}>Si no es “Sí”, ajustá hasta el acuerdo.</span>}
              <span className="num" style={{ marginLeft: "auto", fontSize: "var(--t-sm)", fontWeight: 700 }}>
                <span style={{ color: "var(--success)" }}>Sí {vCount("yes")}</span> · <span style={{ color: "var(--warning)" }}>Parcial {vCount("partial")}</span> · <span style={{ color: "var(--risk)" }}>No {vCount("no")}</span>
              </span>
            </div>
          </Card>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Check" disabled={busy || !whRoot.trim()} onClick={whFinish}>{busy ? "Guardando…" : `Cerrar con esta causa raíz (Sí: ${vCount("yes")})`}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Validá: Sí / Parcialmente / No.</p>;
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: wide ? 920 : 640 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ IMPACTO Y FRECUENCIA · matriz gravedad × frecuencia ════════
  if (session.type === "impactfreq") {
    type Prob = { id: string; name: string; desc?: string };
    const probs = (session.result.ifProbs as Prob[]) ?? [];
    const chosen2 = new Set((session.result.ifChosen as string[]) ?? []);
    const FREQ = ["Rara vez", "A veces", "Siempre"];
    const GRAV = ["Poco", "Bastante", "Mucho"];
    const myRate = (id: string) => (inputs.find((i) => i.userId === user.id && i.key === `if:${id}`)?.value as { f?: number; g?: number } | undefined) ?? {};
    const avgOf = (id: string) => {
      const xs = inputs.filter((i) => i.key === `if:${id}`).map((i) => i.value as { f?: number; g?: number });
      if (!xs.length) return null;
      return { f: xs.reduce((a, v) => a + (v.f ?? 2), 0) / xs.length, g: xs.reduce((a, v) => a + (v.g ?? 2), 0) / xs.length, n: xs.length };
    };
    const ifRaters = new Set(inputs.filter((i) => i.key.startsWith("if:")).map((i) => i.voterKey)).size;
    const quad = (a: { f: number; g: number }) => {
      const hiF = a.f >= 2, hiG = a.g >= 2;
      if (hiG && hiF) return { k: "aa", label: "grave y frecuente", color: "var(--green)" };
      if (hiG && !hiF) return { k: "ab", label: "grave pero raro", color: "#EAB308" };
      if (!hiG && hiF) return { k: "ba", label: "frecuente pero menor", color: "#F97316" };
      return { k: "bb", label: "menor prioridad", color: "#94A3B8" };
    };
    const iDoneAll = probs.length > 0 && probs.every((p) => { const r = myRate(p.id); return r.f != null && r.g != null; });
    const suggestions = [
      initiative?.data?.focus?.blockFormulation,
      initiative?.data?.focus?.rootCause,
      ...((initiative?.data?.focus?.secondaryCauses ?? []).map((s) => s.name)),
    ].filter((s): s is string => !!s && !probs.some((p) => p.name === s)).slice(0, 4);
    const addProb = (name: string, desc?: string) => {
      if (!name.trim()) return;
      patchResult({ ifProbs: [...(((resultRef.current.ifProbs as Prob[]) ?? probs)), { id: `p${Date.now().toString(36)}`, name: name.trim(), desc: desc?.trim() || undefined }] });
    };
    const ifFinish = async () => {
      setBusy(true);
      const sel2 = probs.filter((p) => chosen2.has(p.id));
      await finalizeSession(session, {
        pulseAvg: avg,
        summaryText: `Priorizado: ${sel2.map((p) => p.name).join(" · ") || "—"}`,
        dataKey: "focus", dataValue: { priorityProblems: sel2.map((p) => p.name) },
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (step === "iflist") {
      sub = isFacil ? "Cargá las trabas a comparar (nombre corto + una línea)." : "El facilitador carga las trabas que van a comparar.";
      content = (
        <Card pad={20}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {probs.map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
                <span className="num" style={{ color: "var(--st-focus)", fontWeight: 800 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{p.name}</div>
                  {p.desc && <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{p.desc}</div>}
                </div>
                {isFacil && <button onClick={() => patchResult({ ifProbs: probs.filter((x) => x.id !== p.id) })} style={{ color: "var(--ink-3)" }}><Icon name="X" size={14} /></button>}
              </div>
            ))}
            {!probs.length && <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>Sin trabas cargadas todavía.</p>}
          </div>
          {isFacil && suggestions.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>De sesiones previas de Foco</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {suggestions.map((s, i) => <button key={i} onClick={() => addProb(s)} style={{ fontSize: "var(--t-xs)", padding: "5px 10px", borderRadius: "var(--r-full)", background: "var(--card-2)", border: "1px dashed var(--line-2)", color: "var(--ink-1)" }}>+ {s.length > 60 ? s.slice(0, 60) + "…" : s}</button>)}
              </div>
            </div>
          )}
          {isFacil && (
            <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <input value={cardDraft.ifname ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, ifname: e.target.value }))} placeholder="Nombre corto…" style={{ flex: 1, minWidth: 140, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "8px 10px", fontSize: "var(--t-sm)", outline: "none" }} />
              <input value={cardDraft.ifdesc ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, ifdesc: e.target.value }))} placeholder="Descripción en una línea (opcional)" style={{ flex: 2, minWidth: 180, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "8px 10px", fontSize: "var(--t-sm)", outline: "none" }} />
              <Button size="sm" icon="Plus" onClick={() => { addProb(cardDraft.ifname ?? "", cardDraft.ifdesc); setCardDraft((d) => ({ ...d, ifname: "", ifdesc: "" })); }}>Sumar</Button>
            </div>
          )}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || probs.length < 2} onClick={async () => { setBusy(true); await setStep(sessionId, "ifrate", 1); setBusy(false); }}>Evaluar en equipo ({probs.length})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>En un momento evalúan cada traba.</p>;
    } else if (step === "ifrate") {
      sub = "Para cada traba: ¿qué tan seguido pasa y qué tan grave es? Anónimo.";
      content = isFacil ? (
        <Card pad={24}><div style={{ textAlign: "center", padding: "8px 0" }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--green)" }}>{ifRaters}/{totalInRoom}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>evaluaron</div></div></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {probs.map((p) => {
            const r = myRate(p.id);
            return (
              <Card key={p.id} pad={16}>
                <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 2 }}>{p.name}</div>
                {p.desc && <div className="muted" style={{ fontSize: "var(--t-xs)", marginBottom: 8 }}>{p.desc}</div>}
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 8 }}>
                  {[{ lab: "Frecuencia", opts: FREQ, key: "f" as const }, { lab: "Gravedad", opts: GRAV, key: "g" as const }].map((dim) => (
                    <div key={dim.key} style={{ flex: 1, minWidth: 200 }}>
                      <div className="eyebrow" style={{ marginBottom: 6 }}>{dim.lab}</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {dim.opts.map((o, i) => {
                          const on = r[dim.key] === i + 1;
                          return <button key={o} onClick={() => tapInput(`if:${p.id}`, { ...r, [dim.key]: i + 1 })} style={{ flex: 1, padding: "9px 6px", borderRadius: "var(--r-md)", fontSize: "var(--t-xs)", fontWeight: 700, border: `1.5px solid ${on ? "var(--st-focus)" : "var(--line-2)"}`, background: on ? "color-mix(in srgb, var(--st-focus) 16%, var(--card))" : "var(--card)", color: on ? "var(--st-focus)" : "var(--ink-2)" }}>{o}</button>;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
          {iDoneAll && <p style={{ textAlign: "center", color: "var(--green)", fontWeight: 700, fontSize: "var(--t-sm)" }}><Icon name="Check" size={15} /> Evaluaste todas (anónimo)</p>}
        </div>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Eye" disabled={busy || ifRaters === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "ifmatrix", 2); setBusy(false); }}>Revelar la matriz ({ifRaters})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>{ifRaters} de {totalInRoom} evaluaron · la matriz se arma con el promedio.</p>;
    } else {
      wide = true;
      sub = "La matriz del equipo. El debate va en la zona grave y frecuente.";
      const placed = probs.map((p, i) => ({ p, i, a: avgOf(p.id) })).filter((x) => x.a);
      content = (
        <>
          <Card pad={16} style={{ marginBottom: 14 }}>
            <div style={{ position: "relative", width: "100%", aspectRatio: "3/2", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
              {/* cuadrantes tintados */}
              <div style={{ position: "absolute", left: "50%", right: 0, top: 0, bottom: "50%", background: "color-mix(in srgb, var(--green) 8%, transparent)" }} />
              <div style={{ position: "absolute", left: 0, right: "50%", top: 0, bottom: "50%", background: "color-mix(in srgb, #EAB308 7%, transparent)" }} />
              <div style={{ position: "absolute", left: "50%", right: 0, top: "50%", bottom: 0, background: "color-mix(in srgb, #F97316 7%, transparent)" }} />
              <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--line-2)" }} />
              <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "var(--line-2)" }} />
              <span className="muted" style={{ position: "absolute", top: 6, left: 8, fontSize: 10 }}>GRAVE ↑</span>
              <span className="muted" style={{ position: "absolute", bottom: 6, right: 8, fontSize: 10 }}>FRECUENTE →</span>
              {placed.map(({ p, i, a }) => {
                const x = ((a!.f - 1) / 2) * 86 + 7;
                const y = 93 - ((a!.g - 1) / 2) * 86;
                const q = quad(a!);
                return (
                  <span key={p.id} title={`${p.name} · ${q.label}`} className="num" style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)", width: 30, height: 30, borderRadius: 99, display: "grid", placeItems: "center", fontWeight: 800, fontSize: "var(--t-sm)", background: `color-mix(in srgb, ${q.color} 24%, var(--card))`, border: `2px solid ${q.color}`, color: q.color, boxShadow: chosen2.has(p.id) ? `0 0 12px ${q.color}` : "none", animation: "pop-in .4s var(--spring) both" }}>{i + 1}</span>
                );
              })}
            </div>
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {placed.sort((x, y) => (y.a!.f + y.a!.g) - (x.a!.f + x.a!.g)).map(({ p, i, a }) => {
              const q = quad(a!);
              const isChosen = chosen2.has(p.id);
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: isChosen ? `color-mix(in srgb, ${q.color} 10%, var(--card))` : "var(--card)", border: `1px solid ${isChosen ? q.color : "var(--line)"}`, borderRadius: "var(--r-md)" }}>
                  <span className="num" style={{ width: 26, height: 26, borderRadius: 99, display: "grid", placeItems: "center", fontWeight: 800, fontSize: "var(--t-xs)", background: `color-mix(in srgb, ${q.color} 22%, transparent)`, color: q.color, flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{p.name}</span>
                    <span className="muted" style={{ fontSize: "var(--t-xs)", marginLeft: 8 }}>{q.label}</span>
                  </div>
                  {isFacil && <Button size="sm" variant={isChosen ? "primary" : "secondary"} onClick={() => { const cur = new Set((resultRef.current.ifChosen as string[]) ?? [...chosen2]); if (cur.has(p.id)) cur.delete(p.id); else if (cur.size < 2) cur.add(p.id); patchResult({ ifChosen: [...cur] }); }}>{isChosen ? "Elegida" : "Elegir"}</Button>}
                </div>
              );
            })}
          </div>
          {isFacil && (
            <Card pad={14} style={{ marginTop: 12 }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Para el debate (zona grave y frecuente)</div>
              <div style={{ fontSize: "var(--t-sm)", display: "flex", flexDirection: "column", gap: 4 }}>
                <span>· “¿Hay algo que la matriz no está capturando?”</span>
                <span>· “¿Algún problema tiene urgencia externa que no se ve?”</span>
              </div>
            </Card>
          )}
        </>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Check" disabled={busy || chosen2.size === 0} onClick={ifFinish}>{busy ? "Guardando…" : `Cerrar con ${chosen2.size === 2 ? "estas 2 trabas" : "esta traba"}`}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El equipo elige una o dos para trabajar. El facilitador registra.</p>;
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: wide ? 760 : 620 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ LA VOZ DEL CLIENTE · percepción vs. realidad ════════
  if (session.type === "clientvoice") {
    const CV_COLS = [
      { key: "cv1", label: "¿Qué creés que valora más el cliente de nuestro trabajo?" },
      { key: "cv2", label: "¿Qué creés que le molesta o frustra de trabajar con nosotros?" },
      { key: "cv3", label: "¿Qué creés que piensa pero nunca nos dijo?" },
    ];
    const cvClient = (session.result.cvClient as string) || (initiative?.data?.focus?.clientName as string) || "";
    const cvCount = CV_COLS.reduce((a, q) => a + (counts[q.key] ?? 0), 0); // contador con tarjetas aún ocultas
    const cvHasFb = session.result.cvHasFb as boolean | undefined;
    const cvFeedback = (session.result.cvFeedback as string) ?? "";
    const cvMarks = (session.result.cvMarks as Record<string, string>) ?? {};
    const cvSynth = (session.result.cvSynth as string) ?? "";
    const MARKS = [
      { k: "ok", icon: "✅", label: "Confirmado", color: "var(--success)" },
      { k: "no", icon: "❌", label: "Incorrecto", color: "var(--risk)" },
      { k: "na", icon: "❓", label: "Sin datos", color: "#94A3B8" },
    ];
    const cycleMark = (id: string) => {
      const order = ["ok", "no", "na"];
      const cur = cvMarks[id];
      const next = cur ? order[(order.indexOf(cur) + 1) % 3] : "ok";
      patchResult({ cvMarks: { ...((resultRef.current.cvMarks as Record<string, string>) ?? {}), [id]: next } });
    };
    const ClientChip = cvClient ? (
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: "var(--r-full)", background: "color-mix(in srgb, var(--st-focus) 12%, var(--card))", border: "1px solid color-mix(in srgb, var(--st-focus) 40%, transparent)", color: "var(--st-focus)", fontSize: "var(--t-xs)", fontWeight: 700 }}>
          <Icon name="UserCheck" size={13} /> Cliente: {cvClient}
        </span>
      </div>
    ) : null;
    const cvFinish = async () => {
      setBusy(true);
      const task = cvHasFb === false && (session.result.cvHow || session.result.cvWho)
        ? { how: (session.result.cvHow as string) ?? "", who: (session.result.cvWho as string) ?? "", due: (session.result.cvWhen as string) ?? "" }
        : undefined;
      await finalizeSession(session, {
        pulseAvg: avg, cardCount: cvCount,
        summaryText: `Voz del cliente (${cvClient || "—"})${task ? " · queda tarea de conseguir feedback" : ""}`,
        dataKey: "focus", dataValue: { clientName: cvClient, clientGap: cvSynth, ...(task ? { clientFbTask: task } : {}) },
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (step === "cvclient") {
      sub = "¿A quién afecta directamente la traba que identificamos?";
      content = (
        <Card pad={24}>
          <div style={{ textAlign: "center", marginBottom: 14 }}><span style={{ fontSize: 34 }}>🎯</span></div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>El cliente de esta variable</div>
          {isFacil
            ? <input defaultValue={cvClient} onBlur={(e) => patchResult({ cvClient: e.target.value.trim() })} placeholder="Nombre o descripción del cliente (interno o externo)…" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-md)", fontWeight: 600, outline: "none" }} />
            : <p style={{ fontSize: "var(--t-md)", fontWeight: 600, color: cvClient ? "var(--ink-0)" : "var(--ink-3)" }}>{cvClient || "El facilitador lo está definiendo…"}</p>}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || !cvClient.trim()} onClick={async () => { setBusy(true); await setStep(sessionId, "cvperc", 1); setBusy(false); }}>Empezar las percepciones</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador confirma quién es el cliente.</p>;
    } else if (step === "cvperc") {
      wide = true;
      sub = "Lo que el equipo CREE del cliente. Anónimo, oculto hasta contrastar.";
      content = <>{ClientChip}{MultiWrite(CV_COLS, "var(--st-focus)", !isFacil, true)}</>;
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || cvCount === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "cvcontrast", 2); setBusy(false); }}>Contrastar con la realidad ({cvCount})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Respondé las tres con honestidad.</p>;
    } else if (step === "cvcontrast") {
      wide = true;
      sub = cvHasFb === undefined
        ? "¿Tenemos feedback real del cliente para contrastar?"
        : cvHasFb ? "Percepción vs. realidad: marcá cada percepción según el feedback." : "Sin feedback real: diseñemos cómo conseguirlo.";
      content = (
        <>
          {ClientChip}
          {isFacil && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 14 }}>
              <Button size="sm" variant={cvHasFb === true ? "primary" : "secondary"} icon="MessageSquareQuote" onClick={() => patchResult({ cvHasFb: true })}>Tengo feedback real</Button>
              <Button size="sm" variant={cvHasFb === false ? "primary" : "secondary"} icon="SearchX" onClick={() => patchResult({ cvHasFb: false })}>No tengo feedback</Button>
            </div>
          )}
          {cvHasFb === true && (
            <div className="cluster-grid" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {CV_COLS.map((q) => (
                  <div key={q.key}>
                    <div style={{ fontWeight: 700, fontSize: "var(--t-xs)", marginBottom: 6 }}>{q.label}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {allCards.filter((c) => c.columnKey === q.key).map((c) => {
                        const m = MARKS.find((x) => x.k === cvMarks[c.id]);
                        return (
                          <button key={c.id} disabled={!isFacil} onClick={() => cycleMark(c.id)} title={isFacil ? "Tocar para marcar: ✅ → ❌ → ❓" : undefined}
                            style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 8, background: "var(--card)", border: `1px solid ${m ? m.color : "var(--line)"}`, borderRadius: "var(--r-md)", padding: "8px 10px", fontSize: "var(--t-xs)", lineHeight: 1.4, cursor: isFacil ? "pointer" : "default" }}>
                            <span style={{ flexShrink: 0 }}>{m?.icon ?? "○"}</span>
                            <span style={{ flex: 1 }}>{c.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <Card pad={14}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>El feedback real del cliente</div>
                {isFacil
                  ? <textarea defaultValue={cvFeedback} onBlur={(e) => patchResult({ cvFeedback: e.target.value })} rows={8} placeholder="Pegá o resumí el feedback real…" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "10px 12px", fontSize: "var(--t-sm)", outline: "none", lineHeight: 1.5, resize: "vertical" }} />
                  : <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.55, whiteSpace: "pre-wrap", color: cvFeedback ? "var(--ink-0)" : "var(--ink-3)" }}>{cvFeedback || "El facilitador lo está cargando…"}</p>}
                <div className="muted" style={{ fontSize: 10, marginTop: 8 }}>✅ Confirmado · ❌ Incorrecto · ❓ Sin datos</div>
              </Card>
            </div>
          )}
          {cvHasFb === false && (
            <Card pad={20}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><Icon name="ClipboardList" size={17} style={{ color: "var(--warning)" }} /><span style={{ fontWeight: 700 }}>Tarea: conseguir feedback real</span></div>
              {isFacil ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input defaultValue={(session.result.cvHow as string) ?? ""} onBlur={(e) => patchResult({ cvHow: e.target.value })} placeholder="¿Cómo y cuándo vamos a conseguirlo? (ej: 3 entrevistas esta quincena)" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" }} />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input defaultValue={(session.result.cvWho as string) ?? ""} onBlur={(e) => patchResult({ cvWho: e.target.value })} placeholder="Responsable" style={{ flex: 1, minWidth: 140, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" }} />
                    <input type="date" defaultValue={(session.result.cvWhen as string) ?? ""} onBlur={(e) => patchResult({ cvWhen: e.target.value })} style={{ flex: 1, minWidth: 140, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" }} />
                  </div>
                  <p className="muted" style={{ fontSize: "var(--t-xs)" }}>Queda como tarea pendiente en la iniciativa. Mientras tanto, trabajamos con las percepciones reveladas abajo.</p>
                </div>
              ) : <p className="muted" style={{ fontSize: "var(--t-sm)" }}>El facilitador define cómo conseguir feedback real. Mientras, miren las percepciones.</p>}
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>{MultiReveal(CV_COLS)}</div>
            </Card>
          )}
          {cvHasFb === undefined && !isFacil && <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador decide si hay feedback real para contrastar.</p>}
        </>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || cvHasFb === undefined} onClick={async () => { setBusy(true); await setStep(sessionId, "cvsynth", 3); setBusy(false); }}>Pasar a la síntesis</Button>
        : null;
    } else {
      sub = "La síntesis de la brecha entre lo que creemos y lo que el cliente vive.";
      const template = cvSynth || `El equipo cree que el cliente valora X; las señales indican que realmente valora Y.`;
      content = (
        <>
          {ClientChip}
          <Card pad={20}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>La brecha, en una o dos oraciones</div>
            {isFacil
              ? <textarea defaultValue={template} onBlur={(e) => patchResult({ cvSynth: e.target.value.trim() })} rows={3} style={{ width: "100%", background: "var(--card)", border: "1px solid color-mix(in srgb, var(--st-focus) 45%, var(--line-2))", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "12px 14px", fontSize: "var(--t-md)", fontWeight: 600, outline: "none", lineHeight: 1.5, resize: "vertical" }} />
              : <p style={{ fontSize: "var(--t-md)", fontWeight: 600, lineHeight: 1.55, color: cvSynth ? "var(--ink-0)" : "var(--ink-3)" }}>{cvSynth || "El facilitador está redactando…"}</p>}
            {cvHasFb === false && (session.result.cvHow as string) && (
              <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="ClipboardList" size={13} style={{ color: "var(--warning)" }} /> Tarea pendiente: {session.result.cvHow as string}{(session.result.cvWho as string) ? ` · ${session.result.cvWho}` : ""}{(session.result.cvWhen as string) ? ` · antes del ${session.result.cvWhen}` : ""}
              </p>
            )}
          </Card>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Check" disabled={busy || !cvSynth.trim()} onClick={cvFinish}>{busy ? "Guardando…" : "Cerrar y guardar"}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador cierra con la síntesis acordada.</p>;
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: wide ? 920 : 620 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ FISHBONE / ISHIKAWA · causas por categoría ════════
  if (session.type === "fishbone") {
    const FB_DEFAULT = [
      { key: "fb_p", label: "👥 Personas", color: "#00E87A" },
      { key: "fb_pr", label: "⚙️ Procesos", color: "#3B82F6" },
      { key: "fb_h", label: "🛠️ Herramientas", color: "#F59E0B" },
      { key: "fb_e", label: "🌍 Entorno", color: "#7C3AED" },
    ];
    const EXTRA_COLORS = ["#EC4899", "#06B6D4"];
    const fbCats = (session.result.fbCats as { key: string; label: string; color: string }[]) ?? FB_DEFAULT;
    const fbProblem = (session.result.fbProblem as string) || (initiative?.data?.focus?.blockFormulation as string) || (initiative?.data?.focus?.rootCause as string) || "";
    const fbSilent = !!session.result.fbSilent;
    type FbCause = { id: string; text: string; cat: string };
    const fbCauses = (session.result.fbCauses as FbCause[]) ?? [];
    const memberCauses: FbCause[] = allCards.filter((c) => c.columnKey.startsWith("fb_")).map((c) => ({ id: c.id, text: c.text, cat: c.columnKey }));
    const allCauses = [...fbCauses, ...memberCauses];
    const causesOf = (k: string) => allCauses.filter((c) => c.cat === k);
    const fbCritVotes: Record<string, number> = {};
    inputs.filter((i) => i.key === "fbcrit").forEach((i) => { const k = (i.value as { k?: string }).k; if (k) fbCritVotes[k] = (fbCritVotes[k] ?? 0) + 1; });
    const fbTotalCrit = Object.values(fbCritVotes).reduce((a, b) => a + b, 0);
    const myFbCrit = (inputs.find((i) => i.userId === user.id && i.key === "fbcrit")?.value as { k?: string } | undefined)?.k;
    const fbWinner = fbCats.reduce((best, c) => ((fbCritVotes[c.key] ?? 0) > (fbCritVotes[best.key] ?? 0) ? c : best), fbCats[0]);
    const fbMain = (session.result.fbMain as string) ?? "";
    const fbVals = inputs.filter((i) => i.key === "fbval");
    const fbYes = fbVals.filter((v) => (v.value as { ok?: boolean }).ok).length;
    const myFbVal = (inputs.find((i) => i.userId === user.id && i.key === "fbval")?.value as { ok?: boolean } | undefined)?.ok;
    const diagCats = fbCats.map((c) => ({ ...c, count: causesOf(c.key).length }));
    const addFbCause = (cat: string, text: string) => {
      if (!text.trim()) return;
      patchResult({ fbCauses: [...(((resultRef.current.fbCauses as FbCause[]) ?? fbCauses)), { id: `f${Date.now().toString(36)}`, text: text.trim(), cat }] });
    };
    const addFbCard = async (cat: string) => { const t = (cardDraft[cat] ?? "").trim(); if (!t) return; await addCard(sessionId, cat, t, true); setCardDraft((d) => ({ ...d, [cat]: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
    const fbFinish = async () => {
      setBusy(true);
      const total = fbVals.length || 1;
      await finalizeSession(session, {
        pulseAvg: avg, cardCount: allCauses.length,
        summaryText: `Fishbone: ${fbMain.slice(0, 60)}${fbMain.length > 60 ? "…" : ""} (${fbWinner.label})`,
        dataKey: "focus", dataValue: { rootCause: fbMain, cause: fbMain, secondaryCauses: causesOf(fbWinner.key).filter((c) => c.text !== fbMain).slice(0, 5).map((c) => ({ name: c.text, votes: 0 })) },
      });
      void total;
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (step === "fbsetup") {
      wide = true;
      sub = isFacil ? "El problema en la cabeza del pez y las categorías (renombrables, máx 6)." : "El facilitador prepara el diagrama.";
      content = (
        <>
          <Card pad={16} style={{ marginBottom: 14 }}><FishboneDiagram problem={fbProblem} cats={diagCats} /></Card>
          {isFacil && (
            <Card pad={18}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>El problema central</div>
              <textarea defaultValue={fbProblem} onBlur={(e) => patchResult({ fbProblem: e.target.value.trim() })} rows={2} placeholder="La traba que analizamos…" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "10px 12px", fontSize: "var(--t-sm)", outline: "none", lineHeight: 1.5, resize: "vertical", marginBottom: 12 }} />
              <div className="eyebrow" style={{ marginBottom: 6 }}>Categorías (espinas)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {fbCats.map((c) => (
                  <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0 }} />
                    <input defaultValue={c.label} onBlur={(e) => { const v = e.target.value.trim(); if (v) patchResult({ fbCats: fbCats.map((x) => x.key === c.key ? { ...x, label: v } : x) }); }} style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "7px 9px", fontSize: "var(--t-sm)", fontWeight: 600, outline: "none" }} />
                    {fbCats.length > 4 && <button onClick={() => patchResult({ fbCats: fbCats.filter((x) => x.key !== c.key) })} style={{ color: "var(--ink-3)" }}><Icon name="Trash2" size={14} /></button>}
                  </div>
                ))}
              </div>
              {fbCats.length < 6 && <Button size="sm" variant="secondary" icon="Plus" style={{ marginTop: 10 }} onClick={() => patchResult({ fbCats: [...fbCats, { key: `fb_x${Date.now().toString(36)}`, label: `Categoría ${fbCats.length + 1}`, color: EXTRA_COLORS[fbCats.length - 4] ?? "#A3E635" }] })}>Agregar categoría</Button>}
            </Card>
          )}
        </>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || !fbProblem.trim()} onClick={async () => { setBusy(true); await setStep(sessionId, "fbcauses", 1); setBusy(false); }}>Empezar la lluvia de causas</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>En un momento arrancan las causas.</p>;
    } else if (step === "fbcauses") {
      wide = true;
      sub = fbSilent
        ? "Modo silencioso: cada uno suma causas en la categoría que corresponda."
        : isFacil ? "El equipo aporta en voz alta; vos escribís en la espina que corresponda." : "Aporten causas en voz alta: el facilitador las escribe en el diagrama.";
      content = (
        <>
          <Card pad={16} style={{ marginBottom: 14 }}><FishboneDiagram problem={fbProblem} cats={diagCats} /></Card>
          {isFacil && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <button onClick={() => patchResult({ fbSilent: !fbSilent })} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 13px", borderRadius: "var(--r-full)", border: "1px solid var(--line-2)", background: "var(--card)", fontSize: "var(--t-xs)", fontWeight: 700, color: fbSilent ? "var(--green)" : "var(--ink-2)" }}>
                <Icon name={fbSilent ? "PenLine" : "Mic"} size={13} /> {fbSilent ? "Modo silencioso activado" : "Activar modo silencioso (cada uno escribe)"}
              </button>
            </div>
          )}
          <div className="cards-cols" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {fbCats.map((c) => (
              <div key={c.key} style={{ background: "var(--bg-2)", border: `1px solid color-mix(in srgb, ${c.color} 38%, var(--line))`, borderTop: `3px solid ${c.color}`, borderRadius: "var(--r-lg)", padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 8 }}>{c.label} <span className="num muted" style={{ fontSize: "var(--t-xs)" }}>{causesOf(c.key).length}</span></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {causesOf(c.key).map((x) => (
                    <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${c.color}`, borderRadius: "var(--r-sm)", padding: "7px 9px", fontSize: "var(--t-xs)", lineHeight: 1.4 }}>
                      <span style={{ flex: 1 }}>{x.text}</span>
                      {isFacil && fbCauses.some((f) => f.id === x.id) && <button onClick={() => patchResult({ fbCauses: fbCauses.filter((f) => f.id !== x.id) })} style={{ color: "var(--ink-3)" }}><Icon name="X" size={12} /></button>}
                    </div>
                  ))}
                  {!causesOf(c.key).length && <span className="faint" style={{ fontSize: "var(--t-xs)", textAlign: "center", padding: 6 }}>Sin causas todavía</span>}
                </div>
                {(isFacil || fbSilent) && (
                  <div style={{ marginTop: 8, display: "flex", gap: 5 }}>
                    <input value={cardDraft[c.key] ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, [c.key]: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") { if (isFacil) { addFbCause(c.key, cardDraft[c.key] ?? ""); setCardDraft((d) => ({ ...d, [c.key]: "" })); } else addFbCard(c.key); } }} placeholder="Sumar causa…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "7px 9px", fontSize: "var(--t-xs)", outline: "none" }} />
                    <button onClick={() => { if (isFacil) { addFbCause(c.key, cardDraft[c.key] ?? ""); setCardDraft((d) => ({ ...d, [c.key]: "" })); } else addFbCard(c.key); }} style={{ background: c.color, color: "#06121f", borderRadius: "var(--r-sm)", padding: "0 10px", display: "grid", placeItems: "center" }}><Icon name="Plus" size={14} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || allCauses.length === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "fbvote", 2); setBusy(false); }}>Votar la espina crítica ({allCauses.length})</Button>
        : null;
    } else if (step === "fbvote") {
      wide = true;
      const shown = !!session.result.fbVoteShown;
      sub = shown ? "La espina crítica del equipo." : "¿En qué categoría están las causas más relevantes? Una elección por persona.";
      content = (
        <>
          <Card pad={16} style={{ marginBottom: 14 }}><FishboneDiagram problem={fbProblem} cats={diagCats} highlight={shown ? fbWinner.key : undefined} /></Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {fbCats.map((c) => {
              const v = fbCritVotes[c.key] ?? 0;
              const pct = fbTotalCrit ? Math.round((v / fbTotalCrit) * 100) : 0;
              const isWin = shown && c.key === fbWinner.key && fbTotalCrit > 0;
              const on = myFbCrit === c.key;
              return (
                <button key={c.key} disabled={isFacil || shown} onClick={() => tapInput("fbcrit", { k: c.key })}
                  style={{ width: "100%", textAlign: "left", padding: "11px 13px", background: isWin || (on && !shown) ? `color-mix(in srgb, ${c.color} 10%, var(--card))` : "var(--card)", border: `1px solid ${isWin || (on && !shown) ? c.color : "var(--line)"}`, borderRadius: "var(--r-md)", cursor: isFacil || shown ? "default" : "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: "var(--t-sm)" }}>{c.label}</span>
                    {!shown && on && <Icon name="CheckCircle2" size={15} style={{ color: c.color }} />}
                    {shown && <span className="num" style={{ fontWeight: 800, color: isWin ? c.color : "var(--ink-2)" }}>{pct}%</span>}
                  </div>
                  {shown && <div style={{ marginTop: 6 }}><Bar value={pct} color={c.color} height={6} /></div>}
                </button>
              );
            })}
          </div>
          {!shown && <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)", marginTop: 10 }}><Icon name="EyeOff" size={13} /> {fbTotalCrit} de {totalInRoom} votaron</p>}
        </>
      );
      controls = isFacil
        ? (shown
          ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "fbdeep", 3); setBusy(false); }}>Profundizar en {fbWinner.label}</Button>
          : <Button full size="lg" icon="Eye" disabled={busy || fbTotalCrit === 0} onClick={() => setResult(sessionId, { fbVoteShown: true })}>Mostrar resultado ({fbTotalCrit}/{totalInRoom})</Button>)
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Elegí una categoría. El facilitador muestra el resultado.</p>;
    } else if (step === "fbdeep") {
      sub = `Profundizamos en ${fbWinner.label}: ¿cuál de estas causas es la más determinante?`;
      content = (
        <>
          <Card pad={18} style={{ marginBottom: 14, border: `1px solid color-mix(in srgb, ${fbWinner.color} 45%, var(--line))` }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>{fbWinner.label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {causesOf(fbWinner.key).map((x, i) => <div key={x.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${fbWinner.color}`, borderRadius: "var(--r-md)", padding: "9px 11px", fontSize: "var(--t-sm)", lineHeight: 1.4, animation: `pop-in .4s var(--spring) ${i * 0.04}s both` }}>{x.text}</div>)}
            </div>
          </Card>
          {isFacil && (
            <Card pad={16}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Preguntas para profundizar</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: "var(--t-sm)" }}>
                <span>· “¿Cuál de estas causas es la más determinante?”</span>
                <span>· “¿Hay alguna causa que genera las demás?”</span>
                <span>· “¿Cuándo está esta causa en su peor momento?”</span>
              </div>
            </Card>
          )}
        </>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "fbmain", 4); setBusy(false); }}>Formular la causa principal</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Conversen: ¿cuál es la causa más determinante?</p>;
    } else {
      wide = true;
      sub = "El diagrama completo, con la causa principal destacada. El equipo valida.";
      content = (
        <>
          <Card pad={16} style={{ marginBottom: 14 }}><FishboneDiagram problem={fbProblem} cats={diagCats} highlight={fbWinner.key} /></Card>
          <Card pad={20}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>La causa principal, en una oración</div>
            {isFacil
              ? <textarea defaultValue={fbMain} onBlur={(e) => patchResult({ fbMain: e.target.value.trim() })} rows={2} placeholder={`La causa principal dentro de ${fbWinner.label} es…`} style={{ width: "100%", background: "var(--card)", border: `1px solid color-mix(in srgb, ${fbWinner.color} 45%, var(--line-2))`, borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "12px 14px", fontSize: "var(--t-md)", fontWeight: 600, outline: "none", lineHeight: 1.5, resize: "vertical" }} />
              : <p style={{ fontSize: "var(--t-md)", fontWeight: 600, lineHeight: 1.55, color: fbMain ? "var(--ink-0)" : "var(--ink-3)" }}>{fbMain || "El facilitador está redactando…"}</p>}
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {!isFacil ? (
                <>
                  <Button size="sm" variant={myFbVal === true ? "primary" : "secondary"} icon="ThumbsUp" onClick={() => tapInput("fbval", { ok: true })}>Sí</Button>
                  <Button size="sm" variant={myFbVal === false ? "primary" : "secondary"} icon="Hand" onClick={() => tapInput("fbval", { ok: false })}>Ajustar</Button>
                </>
              ) : <span className="muted" style={{ fontSize: "var(--t-sm)" }}>Las causas secundarias quedan registradas para ciclos futuros.</span>}
              <span className="num" style={{ marginLeft: "auto", fontSize: "var(--t-sm)", fontWeight: 700 }}><span style={{ color: "var(--success)" }}>👍 {fbYes}</span> · <span style={{ color: "var(--warning)" }}>✋ {fbVals.length - fbYes}</span></span>
            </div>
          </Card>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Check" disabled={busy || !fbMain.trim()} onClick={fbFinish}>{busy ? "Guardando…" : `Cerrar con esta causa (👍 ${fbYes})`}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Validá la formulación.</p>;
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: wide ? 920 : 640 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ PERFECTION GAME · ¿en qué número estamos? ════════
  if (session.type === "perfection") {
    const pgVar = (session.result.pgVar as string) || initiative?.title || "la variable elegida";
    const pgScores = inputs.filter((i) => i.key === "pg").map((i) => (i.value as { v?: number }).v).filter((v): v is number => typeof v === "number");
    const myPg = (inputs.find((i) => i.userId === user.id && i.key === "pg")?.value as { v?: number } | undefined)?.v;
    const pgAvg = pgScores.length ? pgScores.reduce((a, b) => a + b, 0) / pgScores.length : 0;
    const pgMin = pgScores.length ? Math.min(...pgScores) : 0;
    const pgMax = pgScores.length ? Math.max(...pgScores) : 0;
    const highSpread = pgScores.length > 1 && pgMax - pgMin > 3;
    const factors = allCards.filter((c) => c.columnKey === "pgf");
    const pgGroup = async () => { if (!sel.length) return; setBusy(true); const id = await createCluster(sessionId, `Factor ${clusters.length + 1}`); if (id) for (const cid of sel) await assignCardToCluster(cid, id); setSel([]); setBusy(false); load(); };
    const pgCands = new Set((session.result.pgCands as string[]) ?? []);
    const factorNames = [...clusters.map((c) => c.name), ...loose.filter((c) => c.columnKey === "pgf").map((c) => c.text)];
    const VarChipPg = (
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: "var(--r-full)", background: "color-mix(in srgb, var(--st-focus) 12%, var(--card))", border: "1px solid color-mix(in srgb, var(--st-focus) 40%, transparent)", color: "var(--st-focus)", fontSize: "var(--t-xs)", fontWeight: 700 }}>
          <Icon name="Crosshair" size={13} /> Variable: {pgVar}
        </span>
      </div>
    );
    const addPgf = async () => { const t = (cardDraft.pgf ?? "").trim(); if (!t) return; await addCard(sessionId, "pgf", t, false); setCardDraft((d) => ({ ...d, pgf: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
    const pgFinish = async () => {
      setBusy(true);
      const cands = [...pgCands];
      await finalizeSession(session, {
        pulseAvg: avg, cardCount: factors.length,
        summaryText: `Perfection Game: ${pgAvg.toFixed(1)}/10 · ${cands.length} causas candidatas`,
        dataKey: "focus", dataValue: { perfectionScore: Math.round(pgAvg * 10) / 10, ...(cands.length ? { candidateFactors: cands } : {}) },
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (step === "pgscore") {
      sub = `¿En qué número estamos como equipo en relación a ${pgVar}? Anónimo, del 1 al 10.`;
      content = (
        <>
          {VarChipPg}
          <Card pad={24}>
            {isFacil ? (
              <>
                <div className="eyebrow" style={{ marginBottom: 6 }}>La variable a evaluar</div>
                <input defaultValue={pgVar} onBlur={(e) => { const v = e.target.value.trim(); if (v) patchResult({ pgVar: v }); }} style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", fontWeight: 600, outline: "none", marginBottom: 16 }} />
                <div style={{ textAlign: "center" }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--green)" }}>{pgScores.length}/{totalInRoom}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>puntuaron · oculto hasta revelar</div></div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: "var(--t-sm)", fontWeight: 600 }}>Tu puntuación</span>
                  <span className="num" style={{ fontSize: "var(--t-2xl)", fontWeight: 800, color: "var(--st-focus)" }}>{myPg ?? "—"}</span>
                </div>
                <input type="range" min={1} max={10} step={1} value={myPg ?? 5} onChange={(e) => tapInput("pg", { v: Number(e.target.value) })} style={{ width: "100%", accentColor: "var(--st-focus)" }} />
                <div className="muted num" style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--t-xs)", marginTop: 4 }}><span>1</span><span>5</span><span>10</span></div>
                <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 12, textAlign: "center" }}><Icon name="Lock" size={12} /> Anónimo · {pgScores.length} de {totalInRoom} puntuaron</p>
              </>
            )}
          </Card>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Eye" disabled={busy || pgScores.length === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "pgreveal", 1); setBusy(false); }}>Revelar puntuaciones ({pgScores.length})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Mové el slider. El facilitador revela cuando estén todos.</p>;
    } else if (step === "pgreveal") {
      sub = "Las puntuaciones del equipo, reveladas.";
      content = (
        <>
          {VarChipPg}
          <Card pad={24}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 18, marginBottom: 18, flexWrap: "wrap" }}>
              <span><span className="num" style={{ fontSize: 44, fontWeight: 800, color: "var(--st-focus)" }}>{pgAvg.toFixed(1)}</span><span className="muted" style={{ fontSize: "var(--t-sm)" }}>/10 promedio</span></span>
              <span className="num muted" style={{ fontSize: "var(--t-sm)" }}>rango {pgMin}–{pgMax}</span>
            </div>
            <div style={{ position: "relative", height: 46, margin: "0 8px" }}>
              <div style={{ position: "absolute", left: 0, right: 0, top: 20, height: 6, borderRadius: 99, background: "var(--card-2)" }} />
              {[1, 5, 10].map((m) => <span key={m} className="num muted" style={{ position: "absolute", left: `${((m - 1) / 9) * 100}%`, top: 32, fontSize: 10, transform: "translateX(-50%)" }}>{m}</span>)}
              {pgScores.map((s, i) => (
                <span key={i} style={{ position: "absolute", left: `${((s - 1) / 9) * 100}%`, top: 14, width: 18, height: 18, borderRadius: 99, background: "color-mix(in srgb, var(--st-focus) 30%, var(--card))", border: "2px solid var(--st-focus)", transform: "translateX(-50%)", animation: `pop-in .4s var(--spring) ${i * 0.06}s both` }} />
              ))}
              <span style={{ position: "absolute", left: `${((pgAvg - 1) / 9) * 100}%`, top: 8, width: 3, height: 30, background: "var(--green)", transform: "translateX(-50%)", borderRadius: 2 }} title="promedio" />
            </div>
            {highSpread && (
              <div style={{ marginTop: 16, padding: "10px 12px", background: "var(--warning-bg)", border: "1px solid color-mix(in srgb, var(--warning) 40%, transparent)", borderRadius: "var(--r-md)", fontSize: "var(--t-sm)", display: "flex", gap: 8 }}>
                <Icon name="Split" size={16} style={{ color: "var(--warning)", flexShrink: 0, marginTop: 1 }} />
                <span><b>Alta dispersión:</b> el equipo percibe la situación muy diferente (diferencia de {pgMax - pgMin} puntos). Vale la pena preguntar por qué.</span>
              </div>
            )}
          </Card>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "pgfactors", 2); setBusy(false); }}>La pregunta clave</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Miren el promedio y el rango.</p>;
    } else if (step === "pgfactors") {
      wide = true;
      sub = `¿Qué tendría que pasar para subir 2 puntos (de ${pgAvg.toFixed(1)} a ${Math.min(10, pgAvg + 2).toFixed(1)})? Con tu nombre.`;
      content = (
        <>
          {VarChipPg}
          <div className="cluster-grid" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span className="eyebrow">Respuestas ({factors.length})</span>
                {isFacil && sel.length > 0 && <Button size="sm" icon="Group" disabled={busy} onClick={pgGroup}>Agrupar {sel.length}</Button>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 8 }}>
                {loose.filter((c) => c.columnKey === "pgf").map((c) => {
                  const on = sel.includes(c.id);
                  const author = c.authorId ? participants.find((p) => p.userId === c.authorId)?.name : undefined;
                  const st: React.CSSProperties = { textAlign: "left", background: on ? "var(--green-soft)" : "var(--card)", border: "1px solid " + (on ? "var(--green)" : "var(--line)"), borderLeft: "3px solid var(--st-focus)", borderRadius: "var(--r-md)", padding: "9px 10px", fontSize: "var(--t-xs)", lineHeight: 1.4 };
                  const inner = <>{c.text}{author && <div className="muted" style={{ fontSize: 10, marginTop: 3 }}>· {author}</div>}</>;
                  return isFacil ? <button key={c.id} onClick={() => setSel((s) => (on ? s.filter((x) => x !== c.id) : [...s, c.id]))} style={st}>{inner}</button> : <div key={c.id} style={st}>{inner}</div>;
                })}
                {!factors.length && <p className="muted" style={{ gridColumn: "1/-1", fontSize: "var(--t-sm)", fontStyle: "italic", textAlign: "center", padding: 10 }}>“¿Qué está impidiendo que ya estemos ahí?”</p>}
              </div>
              {!isFacil && (
                <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
                  <input value={cardDraft.pgf ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, pgf: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addPgf()} placeholder="Para subir 2 puntos tendría que pasar…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" }} />
                  <Button size="sm" icon="Plus" onClick={addPgf}>Sumar</Button>
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span className="eyebrow">Factores agrupados ({clusters.length})</span>
              {clusters.map((cl) => (
                <Card key={cl.id} pad={12}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ color: "var(--st-focus)" }}><Icon name="Layers" size={14} /></span>
                    {isFacil
                      ? <input defaultValue={cl.name} onBlur={(e) => { if (e.target.value.trim()) renameCluster(cl.id, e.target.value.trim()); }} style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", color: "var(--ink-0)", fontWeight: 700, fontSize: "var(--t-sm)", outline: "none", borderBottom: "1px dashed color-mix(in srgb, var(--st-focus) 55%, transparent)" }} />
                      : <span style={{ flex: 1, fontWeight: 700, fontSize: "var(--t-sm)" }}>{cl.name}</span>}
                    <span className="num muted" style={{ fontSize: "var(--t-xs)" }}>{cardsOf(cl.id).length}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {cardsOf(cl.id).map((c) => <div key={c.id} style={{ fontSize: 10, color: "var(--ink-1)", padding: "4px 6px", background: "var(--card-2)", borderRadius: "var(--r-sm)" }}>{c.text}</div>)}
                  </div>
                </Card>
              ))}
              {!clusters.length && <div style={{ border: "1px dashed var(--line-2)", borderRadius: "var(--r-md)", padding: 14, textAlign: "center", color: "var(--ink-3)", fontSize: "var(--t-xs)" }}>{isFacil ? "Agrupá las respuestas similares." : "El facilitador agrupa las similares."}</div>}
            </div>
          </div>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || factors.length === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "pgsynth", 3); setBusy(false); }}>Síntesis</Button>
        : null;
    } else {
      sub = "Los factores más mencionados pueden trabajarse como causas raíz en otras sesiones de Foco.";
      content = (
        <>
          {VarChipPg}
          <Card pad={20}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Factores para subir de {pgAvg.toFixed(1)} a {Math.min(10, pgAvg + 2).toFixed(1)}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {factorNames.map((name, i) => {
                const on = pgCands.has(name);
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: on ? "color-mix(in srgb, var(--st-focus) 9%, var(--card))" : "var(--card)", border: `1px solid ${on ? "var(--st-focus)" : "var(--line)"}`, borderRadius: "var(--r-md)" }}>
                    <Icon name={on ? "Crosshair" : "Minus"} size={14} style={{ color: on ? "var(--st-focus)" : "var(--ink-3)", flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: "var(--t-sm)", fontWeight: 600 }}>{name}</span>
                    {isFacil && <Button size="sm" variant={on ? "primary" : "secondary"} onClick={() => { const cur = new Set((resultRef.current.pgCands as string[]) ?? [...pgCands]); if (cur.has(name)) cur.delete(name); else cur.add(name); patchResult({ pgCands: [...cur] }); }}>{on ? "Candidata ✓" : "Marcar candidata"}</Button>}
                  </div>
                );
              })}
              {!factorNames.length && <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>Sin factores registrados.</p>}
            </div>
          </Card>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Check" disabled={busy} onClick={pgFinish}>{busy ? "Guardando…" : `Cerrar · ${pgCands.size} causas candidatas`}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador marca las candidatas y cierra.</p>;
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: wide ? 920 : 620 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ PARES DE OPUESTOS · tensiones sistémicas hoy vs. ideal ════════
  if (session.type === "opposites") {
    const OP_SUGGESTED: [string, string][] = [
      ["Calidad", "Velocidad"], ["Autonomía", "Alineación"], ["Innovación", "Estabilidad"],
      ["Foco", "Flexibilidad"], ["Proceso", "Resultado"], ["Individual", "Equipo"], ["Corto plazo", "Largo plazo"],
    ];
    type OpPair = { id: string; a: string; b: string };
    const opPairs = (session.result.opPairs as OpPair[]) ?? [];
    const myOp = (pid: string) => (inputs.find((i) => i.userId === user.id && i.key === `op:${pid}`)?.value as { t?: number; i?: number } | undefined) ?? {};
    const opVals = (pid: string) => {
      const xs = inputs.filter((i) => i.key === `op:${pid}`).map((i) => i.value as { t?: number; i?: number });
      return { today: xs.map((x) => x.t).filter((v): v is number => v != null), ideal: xs.map((x) => x.i).filter((v): v is number => v != null) };
    };
    const opRaters = new Set(inputs.filter((i) => i.key.startsWith("op:")).map((i) => i.voterKey)).size;
    const gapOf = (pid: string) => {
      const { today, ideal } = opVals(pid);
      if (!today.length || !ideal.length) return 0;
      const t = today.reduce((a, b) => a + b, 0) / today.length;
      const i = ideal.reduce((a, b) => a + b, 0) / ideal.length;
      return Math.abs(i - t);
    };
    const biggest = opPairs.length ? opPairs.reduce((best, p) => (gapOf(p.id) > gapOf(best.id) ? p : best), opPairs[0]) : undefined;
    const opSynth = (session.result.opSynth as string) ?? "";
    const addPair = (a: string, b: string) => {
      if (!a.trim() || !b.trim() || opPairs.length >= 3) return;
      patchResult({ opPairs: [...(((resultRef.current.opPairs as OpPair[]) ?? opPairs)), { id: `op${Date.now().toString(36)}`, a: a.trim(), b: b.trim() }] });
    };
    const opFinish = async () => {
      setBusy(true);
      await finalizeSession(session, {
        pulseAvg: avg,
        summaryText: `Tensión: ${biggest ? `${biggest.a} ←→ ${biggest.b}` : "—"} · brecha ${biggest ? gapOf(biggest.id).toFixed(1) : "0"}`,
        dataKey: "focus", dataValue: { tensionPair: biggest ? `${biggest.a} ←→ ${biggest.b}` : undefined, tensionHypothesis: opSynth },
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (step === "oppairs") {
      sub = isFacil ? "Elegí 2 o 3 pares relevantes para la variable (sugeridos o propios)." : "El facilitador define los pares de opuestos.";
      content = (
        <Card pad={20}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {opPairs.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
                <span style={{ flex: 1, fontWeight: 700, fontSize: "var(--t-sm)", textAlign: "center" }}>{p.a} <span className="muted" style={{ fontWeight: 400 }}>←————→</span> {p.b}</span>
                {isFacil && <button onClick={() => patchResult({ opPairs: opPairs.filter((x) => x.id !== p.id) })} style={{ color: "var(--ink-3)" }}><Icon name="X" size={14} /></button>}
              </div>
            ))}
            {!opPairs.length && <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic", textAlign: "center" }}>Máximo 3 pares por sesión.</p>}
          </div>
          {isFacil && opPairs.length < 3 && (
            <>
              <div className="eyebrow" style={{ margin: "14px 0 6px" }}>Sugeridos</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {OP_SUGGESTED.filter(([a, b]) => !opPairs.some((p) => p.a === a && p.b === b)).map(([a, b]) => (
                  <button key={a} onClick={() => addPair(a, b)} style={{ fontSize: "var(--t-xs)", padding: "5px 11px", borderRadius: "var(--r-full)", background: "var(--card-2)", border: "1px dashed var(--line-2)", color: "var(--ink-1)", fontWeight: 600 }}>+ {a} ←→ {b}</button>
                ))}
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <input value={cardDraft.opa ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, opa: e.target.value }))} placeholder="Extremo A" style={{ flex: 1, minWidth: 120, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "8px 10px", fontSize: "var(--t-sm)", outline: "none" }} />
                <input value={cardDraft.opb ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, opb: e.target.value }))} placeholder="Extremo B" style={{ flex: 1, minWidth: 120, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "8px 10px", fontSize: "var(--t-sm)", outline: "none" }} />
                <Button size="sm" icon="Plus" onClick={() => { addPair(cardDraft.opa ?? "", cardDraft.opb ?? ""); setCardDraft((d) => ({ ...d, opa: "", opb: "" })); }}>Sumar</Button>
              </div>
            </>
          )}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || opPairs.length < 1} onClick={async () => { setBusy(true); await setStep(sessionId, "oprate", 1); setBusy(false); }}>Evaluar ({opPairs.length} {opPairs.length === 1 ? "par" : "pares"})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>En un momento evalúan cada par.</p>;
    } else if (step === "oprate") {
      sub = "Para cada par: ¿dónde está el equipo HOY (azul) y dónde debería estar IDEALMENTE (verde)?";
      content = isFacil ? (
        <Card pad={24}><div style={{ textAlign: "center", padding: "8px 0" }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--green)" }}>{opRaters}/{totalInRoom}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>evaluaron</div></div></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {opPairs.map((p) => {
            const r = myOp(p.id);
            return (
              <Card key={p.id} pad={16}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontWeight: 800, fontSize: "var(--t-sm)" }}>{p.a}</span>
                  <span style={{ fontWeight: 800, fontSize: "var(--t-sm)" }}>{p.b}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: "var(--t-xs)", fontWeight: 700, color: "#3B82F6", width: 38 }}>HOY</span>
                  <input type="range" min={1} max={10} value={r.t ?? 5} onChange={(e) => tapInput(`op:${p.id}`, { ...r, t: Number(e.target.value) })} style={{ flex: 1, accentColor: "#3B82F6" }} />
                  <span className="num" style={{ width: 20, fontWeight: 800, color: "#3B82F6" }}>{r.t ?? "—"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: "var(--t-xs)", fontWeight: 700, color: "var(--green)", width: 38 }}>IDEAL</span>
                  <input type="range" min={1} max={10} value={r.i ?? 5} onChange={(e) => tapInput(`op:${p.id}`, { ...r, i: Number(e.target.value) })} style={{ flex: 1, accentColor: "var(--green)" }} />
                  <span className="num" style={{ width: 20, fontWeight: 800, color: "var(--green)" }}>{r.i ?? "—"}</span>
                </div>
              </Card>
            );
          })}
          <p className="muted" style={{ fontSize: "var(--t-xs)", textAlign: "center" }}>{opRaters} de {totalInRoom} evaluaron · se revela todo junto</p>
        </div>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Eye" disabled={busy || opRaters === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "opreveal", 2); setBusy(false); }}>Revelar ({opRaters})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Marcá los dos puntos en cada par.</p>;
    } else if (step === "opreveal") {
      wide = true;
      sub = "Todos los puntos superpuestos. ¿Dónde está la brecha más grande entre hoy e ideal?";
      content = (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {opPairs.map((p) => {
              const { today, ideal } = opVals(p.id);
              const isBig = biggest?.id === p.id && opPairs.length > 1;
              return (
                <Card key={p.id} pad={18} style={isBig ? { border: "1.5px solid var(--st-focus)" } : undefined}>
                  {isBig && <Pill color="var(--st-focus)" bg="color-mix(in srgb, var(--st-focus) 14%, transparent)" icon="Zap">mayor brecha</Pill>}
                  <div style={{ marginTop: isBig ? 8 : 0 }}><OpposingScale a={p.a} b={p.b} today={today} ideal={ideal} /></div>
                </Card>
              );
            })}
          </div>
          {isFacil && biggest && (
            <Card pad={16} style={{ marginTop: 14 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Para la conversación ({biggest.a} ←→ {biggest.b})</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: "var(--t-sm)" }}>
                <span>· “¿Por qué estamos tan lejos del extremo que queremos?”</span>
                <span>· “¿Qué nos lleva a ese extremo?” · “¿Qué costaría movernos?”</span>
                <span>· <b>“¿Hay algo que nos conviene del extremo donde estamos?”</b> ← la clave: a veces ahí vive la causa raíz</span>
              </div>
            </Card>
          )}
        </>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "opsynth", 3); setBusy(false); }}>Formular la tensión</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>🔵 hoy · 🟢 ideal — conversen sobre la brecha más grande.</p>;
    } else {
      sub = "La tensión identificada y la hipótesis de causa. El equipo valida.";
      const tmpl = opSynth || (biggest ? `El equipo tiende hacia ${(() => { const v = opVals(biggest.id); const t = v.today.length ? v.today.reduce((a, b) => a + b, 0) / v.today.length : 5; return t <= 5 ? biggest.a : biggest.b; })()} cuando en realidad necesita estar más cerca de ${(() => { const v = opVals(biggest.id); const i = v.ideal.length ? v.ideal.reduce((a, b) => a + b, 0) / v.ideal.length : 5; return i <= 5 ? biggest.a : biggest.b; })()}. Esto puede estar causado por ` : "");
      content = (
        <Card pad={20}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>La tensión + hipótesis de causa raíz</div>
          {isFacil
            ? <textarea defaultValue={tmpl} onBlur={(e) => patchResult({ opSynth: e.target.value.trim() })} rows={4} style={{ width: "100%", background: "var(--card)", border: "1px solid color-mix(in srgb, var(--st-focus) 45%, var(--line-2))", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "12px 14px", fontSize: "var(--t-md)", fontWeight: 600, outline: "none", lineHeight: 1.5, resize: "vertical" }} />
            : <p style={{ fontSize: "var(--t-md)", fontWeight: 600, lineHeight: 1.55, color: opSynth ? "var(--ink-0)" : "var(--ink-3)" }}>{opSynth || "El facilitador está redactando…"}</p>}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Check" disabled={busy || !opSynth.trim()} onClick={opFinish}>{busy ? "Guardando…" : "Cerrar con esta tensión"}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Validen o ajusten la formulación en voz alta.</p>;
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: wide ? 760 : 620 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ SERVICE DESIGN · el journey del cliente ════════
  if (session.type === "journey") {
    const sdClient = (session.result.sdClient as string) || (initiative?.data?.focus?.clientName as string) || "";
    const sdSteps = (session.result.sdSteps as string[]) ?? [];
    const sdCur = (session.result.sdCur as number) ?? 0;
    const TYPES = [
      { key: "act", label: "¿Qué hace el equipo en este paso?", color: "#3B82F6", icon: "Footprints" },
      { key: "fri", label: "¿Qué genera fricción o frustración acá?", color: "var(--risk)", icon: "Flame" },
      { key: "str", label: "¿Qué hace bien el equipo acá?", color: "var(--success)", icon: "ThumbsUp" },
    ];
    const cardsAt = (i: number, t: string) => allCards.filter((c) => c.columnKey === `sd:${i}:${t}`);
    const emoAt = (i: number) => {
      const xs = inputs.filter((x) => x.key === `sdemo:${i}`).map((x) => (x.value as { e?: string }).e);
      return { pos: xs.filter((e) => e === "pos").length, neu: xs.filter((e) => e === "neu").length, neg: xs.filter((e) => e === "neg").length };
    };
    const myEmoAt = (i: number) => (inputs.find((x) => x.userId === user.id && x.key === `sdemo:${i}`)?.value as { e?: string } | undefined)?.e;
    const jCols: JourneyCol[] = sdSteps.map((name, i) => ({
      name, actions: cardsAt(i, "act").map((c) => c.text), frictions: cardsAt(i, "fri").map((c) => c.text), strengths: cardsAt(i, "str").map((c) => c.text), emo: emoAt(i),
    }));
    const sdCritVotes: Record<number, number> = {};
    inputs.filter((i) => i.key === "sdcrit").forEach((i) => { const k = (i.value as { k?: number }).k; if (k != null) sdCritVotes[k] = (sdCritVotes[k] ?? 0) + 1; });
    const sdTotalCrit = Object.values(sdCritVotes).reduce((a, b) => a + b, 0);
    const mySdCrit = (inputs.find((i) => i.userId === user.id && i.key === "sdcrit")?.value as { k?: number } | undefined)?.k;
    const sdWinner = sdSteps.reduce((best, _, i) => ((sdCritVotes[i] ?? 0) > (sdCritVotes[best] ?? 0) ? i : best), 0);
    const sdSynth = (session.result.sdSynth as string) ?? "";
    const addStep = () => { const t = (cardDraft.sdstep ?? "").trim(); if (!t || sdSteps.length >= 8) return; patchResult({ sdSteps: [...sdSteps, t] }); setCardDraft((d) => ({ ...d, sdstep: "" })); };
    const addSd = async (t: string) => { const k = `sd:${sdCur}:${t}`; const v = (cardDraft[k] ?? "").trim(); if (!v) return; await addCard(sessionId, k, v, false); setCardDraft((d) => ({ ...d, [k]: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
    const sdFinish = async () => {
      setBusy(true);
      await finalizeSession(session, {
        pulseAvg: avg, cardCount: allCards.filter((c) => c.columnKey.startsWith("sd:")).length,
        summaryText: `Journey: fricción en “${sdSteps[sdWinner] ?? "—"}”`,
        dataKey: "focus", dataValue: { journeyCritical: sdSteps[sdWinner], journeyFinding: sdSynth, clientName: sdClient || undefined },
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (step === "sdsetup") {
      sub = isFacil ? "Confirmá el cliente y armá el journey con el equipo (4 a 8 pasos, en orden)." : "El facilitador arma el journey del cliente con lo que aporta el equipo.";
      content = (
        <Card pad={20}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>El cliente</div>
          {isFacil
            ? <input defaultValue={sdClient} onBlur={(e) => patchResult({ sdClient: e.target.value.trim() })} placeholder="¿Quién es el cliente de esta variable?" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", fontWeight: 600, outline: "none", marginBottom: 14 }} />
            : <p style={{ fontSize: "var(--t-sm)", fontWeight: 600, marginBottom: 14 }}>{sdClient || "—"}</p>}
          <div className="eyebrow" style={{ marginBottom: 6 }}>Los pasos del journey ({sdSteps.length}/8)</div>
          <p className="muted" style={{ fontSize: "var(--t-xs)", marginBottom: 10 }}>“¿Cuáles son los pasos que sigue el cliente desde que necesita algo hasta que lo recibe y lo usa?”</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {sdSteps.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span className="num" style={{ width: 20, color: "var(--st-focus)", fontWeight: 800 }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: "var(--t-sm)", fontWeight: 600 }}>{s}</span>
                {isFacil && <button disabled={Object.keys(counts).some((k) => k.startsWith("sd:"))} title={Object.keys(counts).some((k) => k.startsWith("sd:")) ? "Con tarjetas cargadas no se pueden borrar pasos" : "Quitar"} onClick={() => patchResult({ sdSteps: sdSteps.filter((_, k) => k !== i) })} style={{ color: "var(--ink-3)" }}><Icon name="X" size={13} /></button>}
              </div>
            ))}
          </div>
          {isFacil && sdSteps.length < 8 && (
            <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
              <input value={cardDraft.sdstep ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, sdstep: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addStep()} placeholder="Agregar paso…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "8px 10px", fontSize: "var(--t-sm)", outline: "none" }} />
              <Button size="sm" icon="Plus" onClick={addStep}>Sumar</Button>
            </div>
          )}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || sdSteps.length < 4} onClick={async () => { setBusy(true); await setStep(sessionId, "sdanalyze", 1); setBusy(false); }}>Analizar paso a paso ({sdSteps.length}{sdSteps.length < 4 ? " · mínimo 4" : ""})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Aporten los pasos en voz alta.</p>;
    } else if (step === "sdanalyze") {
      wide = true;
      sub = `Paso ${sdCur + 1} de ${sdSteps.length}: “${sdSteps[sdCur] ?? ""}”. Aporten tarjetas y su emoción.`;
      content = (
        <>
          <Card pad={14} style={{ marginBottom: 14 }}><JourneyBoard cols={jCols} current={sdCur} /></Card>
          <Card pad={18}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              {isFacil && <Button size="sm" variant="secondary" icon="ChevronLeft" disabled={sdCur === 0} onClick={() => patchResult({ sdCur: sdCur - 1 })}>Anterior</Button>}
              <span style={{ flex: 1, fontWeight: 800, textAlign: "center" }}>{sdSteps[sdCur]}</span>
              {isFacil && <Button size="sm" variant="secondary" iconRight="ChevronRight" disabled={sdCur >= sdSteps.length - 1} onClick={() => patchResult({ sdCur: sdCur + 1 })}>Siguiente paso</Button>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 14 }}>
              <span className="muted" style={{ fontSize: "var(--t-xs)" }}>¿Qué siente el cliente acá?</span>
              {(["pos", "neu", "neg"] as const).map((e) => {
                const emoji = e === "pos" ? "😊" : e === "neu" ? "😐" : "😔";
                const on = myEmoAt(sdCur) === e;
                return <button key={e} disabled={isFacil} onClick={() => tapInput(`sdemo:${sdCur}`, { e })} style={{ fontSize: 22, padding: "4px 10px", borderRadius: "var(--r-md)", border: `1.5px solid ${on ? "var(--st-focus)" : "var(--line-2)"}`, background: on ? "color-mix(in srgb, var(--st-focus) 14%, var(--card))" : "var(--card)", opacity: isFacil ? 0.5 : 1 }}>{emoji}</button>;
              })}
            </div>
            {!isFacil && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {TYPES.map((t) => (
                  <div key={t.key} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ color: t.color, flexShrink: 0 }} title={t.label}><Icon name={t.icon} size={15} /></span>
                    <input value={cardDraft[`sd:${sdCur}:${t.key}`] ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, [`sd:${sdCur}:${t.key}`]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addSd(t.key)} placeholder={t.label} style={{ flex: 1, minWidth: 0, background: "var(--card)", border: `1px solid color-mix(in srgb, ${t.color} 35%, var(--line-2))`, borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "8px 10px", fontSize: "var(--t-xs)", outline: "none" }} />
                    <button onClick={() => addSd(t.key)} style={{ background: t.color, color: "#fff", borderRadius: "var(--r-sm)", padding: "5px 9px", display: "grid", placeItems: "center" }}><Icon name="Plus" size={13} /></button>
                  </div>
                ))}
              </div>
            )}
            {isFacil && <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El equipo aporta tarjetas y emociones para este paso. Avanzá cuando esté maduro.</p>}
          </Card>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "sdvote", 2); setBusy(false); }}>Votar el punto crítico</Button>
        : null;
    } else if (step === "sdvote") {
      wide = true;
      const shown = !!session.result.sdVoteShown;
      sub = shown ? "El punto crítico del journey." : "¿En qué paso tiene el cliente la peor experiencia? Una elección por persona.";
      content = (
        <>
          <Card pad={14} style={{ marginBottom: 14 }}><JourneyBoard cols={jCols} highlight={shown ? sdWinner : undefined} /></Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sdSteps.map((s, i) => {
              const v = sdCritVotes[i] ?? 0;
              const pct = sdTotalCrit ? Math.round((v / sdTotalCrit) * 100) : 0;
              const isWin = shown && i === sdWinner && sdTotalCrit > 0;
              const on = mySdCrit === i;
              const fr = cardsAt(i, "fri").length;
              return (
                <button key={i} disabled={isFacil || shown} onClick={() => tapInput("sdcrit", { k: i })}
                  style={{ width: "100%", textAlign: "left", padding: "11px 13px", background: isWin || (on && !shown) ? "color-mix(in srgb, var(--risk) 8%, var(--card))" : "var(--card)", border: `1px solid ${isWin || (on && !shown) ? "var(--risk)" : "var(--line)"}`, borderRadius: "var(--r-md)", cursor: isFacil || shown ? "default" : "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: "var(--t-sm)" }}>{i + 1}. {s}{fr > 0 && <span className="muted" style={{ fontSize: "var(--t-xs)", marginLeft: 6 }}>🔥 {fr} fricciones</span>}</span>
                    {!shown && on && <Icon name="CheckCircle2" size={15} style={{ color: "var(--risk)" }} />}
                    {shown && <span className="num" style={{ fontWeight: 800, color: isWin ? "var(--risk)" : "var(--ink-2)" }}>{pct}%</span>}
                  </div>
                  {shown && <div style={{ marginTop: 6 }}><Bar value={pct} color={isWin ? "var(--risk)" : "var(--violet)"} height={6} /></div>}
                </button>
              );
            })}
          </div>
          {!shown && <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)", marginTop: 10 }}><Icon name="EyeOff" size={13} /> {sdTotalCrit} de {totalInRoom} votaron</p>}
        </>
      );
      controls = isFacil
        ? (shown
          ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "sddeep", 3); setBusy(false); }}>Profundizar en “{sdSteps[sdWinner]}”</Button>
          : <Button full size="lg" icon="Eye" disabled={busy || sdTotalCrit === 0} onClick={() => setResult(sessionId, { sdVoteShown: true })}>Mostrar resultado ({sdTotalCrit}/{totalInRoom})</Button>)
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Elegí el paso con la peor experiencia.</p>;
    } else if (step === "sddeep") {
      sub = `Profundizamos en “${sdSteps[sdWinner] ?? ""}”: ¿qué causa la fricción y qué debería pasar?`;
      content = (
        <>
          <Card pad={18} style={{ marginBottom: 14, border: "1px solid color-mix(in srgb, var(--risk) 40%, var(--line))" }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>🔥 {sdSteps[sdWinner]}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {cardsAt(sdWinner, "fri").map((c, i) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--risk)", borderRadius: "var(--r-md)", padding: "9px 11px", fontSize: "var(--t-sm)", lineHeight: 1.4, animation: `pop-in .4s var(--spring) ${i * 0.04}s both` }}>{c.text}</div>)}
              {!cardsAt(sdWinner, "fri").length && <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>Sin fricciones cargadas en este paso.</p>}
            </div>
          </Card>
          {isFacil && (
            <Card pad={16}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Preguntas para profundizar</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: "var(--t-sm)" }}>
                <span>· “¿Qué está causando esta fricción específicamente?”</span>
                <span>· “¿Qué debería pasar acá para que el cliente tuviera una experiencia positiva?”</span>
                <span>· “¿Qué necesitaría el equipo para lograrlo?”</span>
              </div>
            </Card>
          )}
        </>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "sdsynth", 4); setBusy(false); }}>Formular el hallazgo</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Conversen sobre la causa y el cambio necesario.</p>;
    } else {
      sub = "El hallazgo del journey. El equipo valida antes de cerrar.";
      const emo = emoAt(sdWinner);
      const mainEmo = emo.neg >= emo.pos && emo.neg >= emo.neu ? "frustración" : emo.pos >= emo.neu ? "satisfacción" : "indiferencia";
      const tmpl = sdSynth || `El punto de mayor fricción en el journey es “${sdSteps[sdWinner] ?? ""}”. El cliente siente ${mainEmo} porque … Para mejorarlo necesitaríamos …`;
      content = (
        <Card pad={20}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>El hallazgo</div>
          {isFacil
            ? <textarea defaultValue={tmpl} onBlur={(e) => patchResult({ sdSynth: e.target.value.trim() })} rows={4} style={{ width: "100%", background: "var(--card)", border: "1px solid color-mix(in srgb, var(--st-focus) 45%, var(--line-2))", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "12px 14px", fontSize: "var(--t-md)", fontWeight: 600, outline: "none", lineHeight: 1.5, resize: "vertical" }} />
            : <p style={{ fontSize: "var(--t-md)", fontWeight: 600, lineHeight: 1.55, color: sdSynth ? "var(--ink-0)" : "var(--ink-3)" }}>{sdSynth || "El facilitador está redactando…"}</p>}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Check" disabled={busy || !sdSynth.trim()} onClick={sdFinish}>{busy ? "Guardando…" : "Cerrar con este hallazgo"}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Validen el hallazgo en voz alta.</p>;
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: wide ? 980 : 620 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ MATRIZ DE STACEY · ¿qué tan complejo es el problema? ════════
  if (session.type === "stacey") {
    const stVar = (session.result.stVar as string) || (initiative?.data?.focus?.blockFormulation as string) || initiative?.title || "la traba identificada";
    const stPoints = inputs.filter((i) => i.key === "st").map((i) => i.value as { x?: number; y?: number }).filter((p): p is { x: number; y: number } => p.x != null && p.y != null);
    const mydSt = (inputs.find((i) => i.userId === user.id && i.key === "st")?.value as { x?: number; y?: number } | undefined);
    const mySt = mydSt?.x != null && mydSt?.y != null ? { x: mydSt.x, y: mydSt.y } : undefined;
    const centroid = stPoints.length ? { x: stPoints.reduce((a, p) => a + p.x, 0) / stPoints.length, y: stPoints.reduce((a, p) => a + p.y, 0) / stPoints.length } : undefined;
    const zone = centroid ? zoneOf(centroid.x, centroid.y) : undefined;
    const ZONE_TALK: Record<string, string[]> = {
      simple: ["“Si es simple, ¿por qué no lo resolvimos antes?”", "“¿Qué mejor práctica podemos aplicar?”"],
      complicated: ["“¿Qué experto o análisis necesitamos?”", "“¿Tenemos esa capacidad adentro o necesitamos ayuda externa?”"],
      complex: ["“No hay una solución evidente. Necesitamos experimentar.”", "“¿Qué experimento pequeño podríamos correr para aprender más?”"],
      chaotic: ["“Esto es una urgencia. ¿Qué acción inmediata estabiliza la situación, aunque sea temporal?”"],
    };
    const ZONE_NEXT: Record<string, string> = {
      simple: "En Ideación busquen una práctica probada.",
      complicated: "En Ideación consideren traer perspectiva externa.",
      complex: "En Ideación diseñen un experimento pequeño. (Acá vive Growthloop 💚)",
      chaotic: "Antes de Ideación necesitan estabilizar.",
    };
    const VarChipSt = (
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: "var(--r-full)", background: "color-mix(in srgb, var(--st-focus) 12%, var(--card))", border: "1px solid color-mix(in srgb, var(--st-focus) 40%, transparent)", color: "var(--st-focus)", fontSize: "var(--t-xs)", fontWeight: 700, maxWidth: "100%" }}>
          <Icon name="Crosshair" size={13} style={{ flexShrink: 0 }} /> <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{stVar}</span>
        </span>
      </div>
    );
    const stFinish = async () => {
      setBusy(true);
      const z = zone ? STACEY_ZONES[zone] : undefined;
      await finalizeSession(session, {
        pulseAvg: avg,
        summaryText: `Stacey: ${z?.label ?? "—"} · ${zone ? ZONE_NEXT[zone] : ""}`,
        dataKey: "focus", dataValue: { staceyZone: z?.label, staceyAdvice: zone ? ZONE_NEXT[zone] : undefined },
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "";
    if (step === "stintro") {
      sub = "Antes de diseñar una solución: ¿qué tan complejo es este problema?";
      content = (
        <>
          {VarChipSt}
          <Card pad={18} style={{ marginBottom: 14 }}><StaceyMatrix points={[]} /></Card>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 8 }}>
            {(Object.entries(STACEY_ZONES) as [string, { label: string; color: string; desc: string }][]).map(([k, z]) => (
              <div key={k} style={{ padding: "10px 12px", background: "var(--card)", border: `1px solid color-mix(in srgb, ${z.color} 38%, var(--line))`, borderLeft: `3px solid ${z.color}`, borderRadius: "var(--r-md)" }}>
                <div style={{ fontWeight: 800, fontSize: "var(--t-sm)", color: z.color }}>{z.label}</div>
                <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 2, lineHeight: 1.4 }}>{z.desc}</div>
              </div>
            ))}
          </div>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "stplace", 1); setBusy(false); }}>Posicionarse en la matriz</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador explica las 4 zonas.</p>;
    } else if (step === "stplace") {
      sub = isFacil ? "Cada miembro toca la matriz donde cree que está el problema. Anónimo." : "Tocá la matriz: ¿cuánta certeza tenemos de cómo resolverlo y cuánto acuerdo de qué hacer?";
      content = (
        <>
          {VarChipSt}
          <Card pad={18}>
            <StaceyMatrix points={[]} my={isFacil ? undefined : mySt} editable={!isFacil} onPlace={(x, y) => tapInput("st", { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 })} />
            <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 10, textAlign: "center" }}>
              {isFacil ? <><Icon name="EyeOff" size={12} /> {stPoints.length} de {totalInRoom} se posicionaron · oculto hasta revelar</> : mySt ? "Marcaste tu posición (podés tocar de nuevo para moverla)." : "Tocá donde creas que está el problema."}
            </p>
          </Card>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Eye" disabled={busy || stPoints.length === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "streveal", 2); setBusy(false); }}>Revelar posiciones ({stPoints.length})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador revela cuando estén todos.</p>;
    } else if (step === "streveal") {
      sub = "Todas las posiciones + el centroide ⭐ del equipo.";
      content = (
        <>
          {VarChipSt}
          <Card pad={18}>
            <StaceyMatrix points={stPoints} centroid={centroid} />
            {zone && (
              <div style={{ marginTop: 14, padding: "12px 14px", background: `color-mix(in srgb, ${STACEY_ZONES[zone].color} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${STACEY_ZONES[zone].color} 40%, transparent)`, borderRadius: "var(--r-md)" }}>
                <div style={{ fontWeight: 800, color: STACEY_ZONES[zone].color, marginBottom: 2 }}>Zona del equipo: {STACEY_ZONES[zone].label}</div>
                <div style={{ fontSize: "var(--t-sm)", lineHeight: 1.5 }}>{STACEY_ZONES[zone].desc}</div>
              </div>
            )}
          </Card>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "stzone", 3); setBusy(false); }}>Conversar sobre la zona</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Miren dónde cayó el equipo y la dispersión.</p>;
    } else {
      sub = zone ? `El problema es ${STACEY_ZONES[zone].label.toLowerCase()}. ¿Qué significa para lo que sigue?` : "Conversación sobre la zona.";
      content = (
        <>
          {VarChipSt}
          {zone && (
            <>
              <Card pad={18} style={{ marginBottom: 14, border: `1px solid color-mix(in srgb, ${STACEY_ZONES[zone].color} 45%, var(--line))` }}>
                <div style={{ fontWeight: 800, fontSize: "var(--t-md)", color: STACEY_ZONES[zone].color, marginBottom: 8 }}>{STACEY_ZONES[zone].label}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "var(--t-sm)" }}>
                  {ZONE_TALK[zone].map((q, i) => <span key={i}>· {q}</span>)}
                </div>
              </Card>
              <Card pad={18} style={{ background: "color-mix(in srgb, var(--st-proof) 7%, var(--card))", border: "1px solid color-mix(in srgb, var(--st-proof) 35%, var(--line))" }}>
                <div className="eyebrow" style={{ color: "var(--st-proof)", marginBottom: 6 }}>Implicancia para Ideación</div>
                <p style={{ fontSize: "var(--t-md)", fontWeight: 700, lineHeight: 1.5 }}>{ZONE_NEXT[zone]}</p>
              </Card>
            </>
          )}
        </>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Check" disabled={busy || !zone} onClick={stFinish}>{busy ? "Guardando…" : "Cerrar y guardar la zona"}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador cierra con la implicancia para Ideación.</p>;
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: 640 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ ¿QUÉ PODRÍA FALLAR? · pre-mortem ════════
  if (session.type === "premortem") {
    const chosenIdea = (initiative?.data?.proof?.chosenIdea as string) || (session.result.pmIdea as string) || "";
    const risks = allCards.filter((c) => c.columnKey === "risk");
    const riskCount = counts["risk"] ?? 0;
    const PM_CATS = [
      { k: "exec", label: "🔴 Ejecución", desc: "no tuvimos tiempo/recursos", color: "var(--risk)" },
      { k: "adopt", label: "🟡 Adopción", desc: "no cambiamos el hábito", color: "#EAB308" },
      { k: "design", label: "🟠 Diseño", desc: "la idea no era la correcta", color: "#F97316" },
      { k: "ext", label: "⚪ Externo", desc: "algo de afuera lo bloqueó", color: "#94A3B8" },
    ];
    const pmCat = (session.result.pmCat as Record<string, string>) ?? {};
    const cycleCat = (id: string) => { const order = PM_CATS.map((c) => c.k); const cur = pmCat[id]; const next = cur ? order[(order.indexOf(cur) + 1) % order.length] : order[0]; patchResult({ pmCat: { ...((resultRef.current.pmCat as Record<string, string>) ?? {}), [id]: next } }); };
    const myPmIds = ((inputs.find((x) => x.userId === user.id && x.key === "pmv")?.value as { ids?: string[] } | undefined)?.ids) ?? [];
    const pmVotesOf = (id: string) => inputs.filter((x) => x.key === "pmv").reduce((a, x) => a + (((x.value as { ids?: string[] }).ids ?? []).includes(id) ? 1 : 0), 0);
    const togglePmVote = (id: string) => { const cur = new Set(myPmIds); if (cur.has(id)) cur.delete(id); else if (cur.size < 2) cur.add(id); tapInput("pmv", { ids: [...cur] }); };
    const pmVoters = new Set(inputs.filter((x) => x.key === "pmv" && ((x.value as { ids?: string[] }).ids ?? []).length).map((x) => x.voterKey)).size;
    const topRisks = [...risks].sort((a, b) => pmVotesOf(b.id) - pmVotesOf(a.id)).slice(0, 3);
    const pmMit = (session.result.pmMit as Record<string, { text?: string; who?: string; due?: string }>) ?? {};
    const setMit = (id: string, patch: Record<string, string>) => patchResult({ pmMit: { ...((resultRef.current.pmMit as Record<string, unknown>) ?? {}), [id]: { ...(pmMit[id] ?? {}), ...patch } } });
    const pmOks = new Set(inputs.filter((i) => i.key === "pmok").map((i) => i.userId));
    const addRisk = async () => { const t = (cardDraft.risk ?? "").trim(); if (!t) return; await addCard(sessionId, "risk", t, true); setCardDraft((d) => ({ ...d, risk: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
    const IdeaChip = chosenIdea ? (
      <div style={{ padding: "10px 14px", marginBottom: 14, background: "color-mix(in srgb, var(--st-proof) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--st-proof) 28%, transparent)", borderRadius: "var(--r-md)", fontSize: "var(--t-sm)" }}><span className="eyebrow" style={{ color: "var(--st-proof)", display: "block", marginBottom: 3 }}>La idea que vamos a probar</span>{chosenIdea}</div>
    ) : null;
    const pmFinish = async () => {
      setBusy(true);
      const mitigations = topRisks.map((r) => ({ risk: r.text, plan: pmMit[r.id]?.text ?? "", who: pmMit[r.id]?.who, due: pmMit[r.id]?.due }));
      await finalizeSession(session, {
        pulseAvg: avg, cardCount: risks.length,
        summaryText: `Pre-mortem: ${risks.length} riesgos · ${topRisks.length} mitigados`,
        dataKey: "proof", dataValue: { risks: topRisks.map((r) => r.text), mitigations },
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (step === "pmframe") {
      sub = "El encuadre del pre-mortem.";
      content = (
        <Card pad={26} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🔮</div>
          <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, lineHeight: 1.4 }}>Imaginen que pasaron 15 días<br />y la prueba fracasó. ¿Qué pasó?</h2>
          {chosenIdea && !isFacil && <p style={{ fontSize: "var(--t-sm)", marginTop: 14, padding: "10px 14px", background: "var(--card)", borderRadius: "var(--r-md)", lineHeight: 1.5 }}><b>La idea:</b> {chosenIdea}</p>}
          {isFacil && (
            <div style={{ marginTop: 16, textAlign: "left" }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>La idea que probamos {initiative?.data?.proof?.chosenIdea ? "(de ¿Cuál elegimos?)" : ""}</div>
              <textarea defaultValue={chosenIdea} onBlur={(e) => patchResult({ pmIdea: e.target.value.trim() })} rows={2} placeholder="La idea elegida…" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "10px 12px", fontSize: "var(--t-sm)", outline: "none", lineHeight: 1.5, resize: "vertical" }} />
            </div>
          )}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "pmwrite", 1); setBusy(false); }}>Imaginar los fracasos</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador encuadra el ejercicio.</p>;
    } else if (step === "pmwrite") {
      sub = "“La prueba fracasó porque…” — anónimo, todas las que se te ocurran.";
      content = (
        <>
          {IdeaChip}
          <Card pad={20}>
            <HiddenDots n={riskCount} label="riesgos · ocultos hasta revelar" color="var(--risk)" />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
              {myCards.filter((c) => c.columnKey === "risk").map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--risk)", borderRadius: "var(--r-md)", padding: "9px 11px", fontSize: "var(--t-sm)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 5 }}>· tuya</span></div>)}
            </div>
            {!isFacil && (
              <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
                <input value={cardDraft.risk ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, risk: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addRisk()} placeholder="Fracasó porque…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" }} />
                <Button size="sm" icon="Plus" onClick={addRisk}>Sumar</Button>
              </div>
            )}
          </Card>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Eye" disabled={busy || riskCount === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "pmcat", 2); setBusy(false); }}>Revelar y clasificar ({riskCount})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Anotá los fracasos posibles. El facilitador revela cuando todos terminen.</p>;
    } else if (step === "pmcat") {
      wide = true;
      sub = isFacil ? "Tocá cada riesgo para clasificarlo por tipo." : "El facilitador clasifica cada riesgo por tipo.";
      content = (
        <>
          {IdeaChip}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 14 }}>
            {PM_CATS.map((c) => <span key={c.k} title={c.desc} style={{ fontSize: "var(--t-xs)", padding: "4px 10px", borderRadius: "var(--r-full)", background: `color-mix(in srgb, ${c.color} 12%, var(--card))`, border: `1px solid ${c.color}`, color: c.color, fontWeight: 700 }}>{c.label}</span>)}
          </div>
          <div className="cards-cols" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {PM_CATS.map((cat) => (
              <div key={cat.k} style={{ background: "var(--bg-2)", border: `1px solid color-mix(in srgb, ${cat.color} 35%, var(--line))`, borderTop: `3px solid ${cat.color}`, borderRadius: "var(--r-lg)", padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 8 }}>{cat.label} <span className="num muted">{risks.filter((r) => pmCat[r.id] === cat.k).length}</span></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {risks.filter((r) => pmCat[r.id] === cat.k).map((r) => (
                    <button key={r.id} disabled={!isFacil} onClick={() => cycleCat(r.id)} style={{ textAlign: "left", background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${cat.color}`, borderRadius: "var(--r-sm)", padding: "7px 9px", fontSize: "var(--t-xs)", lineHeight: 1.4, cursor: isFacil ? "pointer" : "default" }}>{r.text}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {risks.some((r) => !pmCat[r.id]) && (
            <Card pad={12} style={{ marginTop: 12 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Sin clasificar ({risks.filter((r) => !pmCat[r.id]).length})</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px,1fr))", gap: 7 }}>
                {risks.filter((r) => !pmCat[r.id]).map((r) => <button key={r.id} disabled={!isFacil} onClick={() => cycleCat(r.id)} title={isFacil ? "Tocar para clasificar" : undefined} style={{ textAlign: "left", background: "var(--card)", border: "1px dashed var(--line-2)", borderRadius: "var(--r-sm)", padding: "7px 9px", fontSize: "var(--t-xs)", lineHeight: 1.4, cursor: isFacil ? "pointer" : "default" }}>{r.text}</button>)}
              </div>
            </Card>
          )}
        </>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "pmvote", 3); setBusy(false); }}>Votar los más probables</Button>
        : null;
    } else if (step === "pmvote") {
      const shown = !!session.result.voteShown;
      sub = shown ? "Los 3 riesgos más probables." : "¿Cuáles son los más probables? 2 puntos por persona.";
      const max = Math.max(1, ...risks.map((r) => pmVotesOf(r.id)));
      const rankedRisks = [...risks].sort((a, b) => pmVotesOf(b.id) - pmVotesOf(a.id));
      content = (
        <>
          {IdeaChip}
          {!shown && !isFacil && <div style={{ textAlign: "center", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><span className="muted" style={{ fontSize: "var(--t-sm)" }}>Tus puntos:</span>{Array.from({ length: 2 }).map((_, i) => <span key={i} style={{ width: 16, height: 16, borderRadius: 99, background: i < (2 - myPmIds.length) ? "var(--risk)" : "var(--card-2)", border: `1px solid ${i < (2 - myPmIds.length) ? "var(--risk)" : "var(--line-2)"}` }} />)}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(shown ? rankedRisks : risks).map((r, i) => { const v = pmVotesOf(r.id); const on = myPmIds.includes(r.id); const top = shown && i < 3 && v > 0; return (
              <button key={r.id} disabled={isFacil || shown} onClick={() => togglePmVote(r.id)}
                style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: top ? "color-mix(in srgb, var(--risk) 9%, var(--card))" : on && !shown ? "color-mix(in srgb, var(--risk) 6%, var(--card))" : "var(--card)", border: `1px solid ${top || (on && !shown) ? "var(--risk)" : "var(--line)"}`, borderRadius: "var(--r-md)", cursor: isFacil || shown ? "default" : "pointer" }}>
                {shown && <span className="num" style={{ width: 18, fontWeight: 700, color: i < 3 ? "var(--risk)" : "var(--ink-3)" }}>{i + 1}</span>}
                <span style={{ flex: 1, fontSize: "var(--t-sm)", fontWeight: 600 }}>{r.text}</span>
                {!shown && on && <Icon name="CheckCircle2" size={15} style={{ color: "var(--risk)" }} />}
                {shown && <div style={{ width: 70 }}><Bar value={(v / max) * 100} color={i < 3 ? "var(--risk)" : "var(--violet)"} height={6} /></div>}
                {shown && <span className="num" style={{ fontWeight: 700, width: 18, textAlign: "right" }}>{v}</span>}
              </button>
            ); })}
          </div>
          {!shown && <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)", marginTop: 12 }}><Icon name="EyeOff" size={13} /> {pmVoters} de {totalInRoom} votaron</p>}
        </>
      );
      controls = isFacil
        ? (shown
          ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "pmmitigate", 4); setBusy(false); }}>Mitigar el top 3</Button>
          : <Button full size="lg" icon="Eye" disabled={busy || pmVoters === 0} onClick={() => setResult(sessionId, { voteShown: true })}>Mostrar resultado ({pmVoters}/{totalInRoom})</Button>)
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Repartí tus 2 puntos.</p>;
    } else if (step === "pmmitigate") {
      sub = "Para cada riesgo: cómo lo mitigamos, quién y para cuándo.";
      content = (
        <>
          {IdeaChip}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {topRisks.map((r, i) => (
              <Card key={r.id} pad={16}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><span className="num" style={{ width: 22, height: 22, borderRadius: 99, background: "var(--risk)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 11 }}>{i + 1}</span><b style={{ fontSize: "var(--t-sm)" }}>{r.text}</b></div>
                {isFacil ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input defaultValue={pmMit[r.id]?.text ?? ""} onBlur={(e) => setMit(r.id, { text: e.target.value })} placeholder="Para mitigarlo vamos a…" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" }} />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <select defaultValue={pmMit[r.id]?.who ?? ""} onChange={(e) => setMit(r.id, { who: e.target.value })} style={{ flex: 1, minWidth: 130, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" }}>
                        <option value="">Responsable…</option>
                        {(team?.members ?? []).map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
                      </select>
                      <input type="date" defaultValue={pmMit[r.id]?.due ?? ""} onBlur={(e) => setMit(r.id, { due: e.target.value })} style={{ flex: 1, minWidth: 130, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" }} />
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: "var(--t-sm)" }}>{pmMit[r.id]?.text ? <>{pmMit[r.id]?.text}{pmMit[r.id]?.who ? ` · ${pmMit[r.id]?.who}` : ""}{pmMit[r.id]?.due ? ` · ${pmMit[r.id]?.due}` : ""}</> : <span className="muted">El facilitador está definiendo la mitigación…</span>}</div>
                )}
              </Card>
            ))}
            {!topRisks.length && <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>Sin riesgos votados.</p>}
          </div>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "pmclose", 5); setBusy(false); }}>Confirmar y cerrar</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador define las mitigaciones.</p>;
    } else {
      sub = "Los riesgos y sus mitigaciones. ¿Estamos listos para arrancar?";
      const iOk = pmOks.has(user.id);
      content = (
        <>
          {IdeaChip}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            {topRisks.map((r, i) => (
              <Card key={r.id} pad={14}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}><span className="num" style={{ color: "var(--risk)", fontWeight: 800 }}>{i + 1}</span><b style={{ fontSize: "var(--t-sm)" }}>{r.text}</b></div>
                <div style={{ fontSize: "var(--t-sm)", color: "var(--ink-1)" }}>→ {pmMit[r.id]?.text || "—"}{pmMit[r.id]?.who ? ` · ${pmMit[r.id]?.who}` : ""}{pmMit[r.id]?.due ? ` · ${pmMit[r.id]?.due}` : ""}</div>
              </Card>
            ))}
          </div>
          <div style={{ textAlign: "center" }}>
            {!isFacil
              ? (iOk ? <span style={{ color: "var(--green)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="CircleCheck" size={18} /> Confirmaste que estamos listos</span> : <Button size="lg" icon="ThumbsUp" onClick={() => tapInput("pmok", { ok: true })}>Las mitigaciones alcanzan para arrancar</Button>)
              : <span className="muted num" style={{ fontSize: "var(--t-sm)" }}>{pmOks.size}/{totalInRoom} confirmaron</span>}
          </div>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Check" disabled={busy} onClick={pmFinish}>{busy ? "Guardando…" : "Cerrar pre-mortem"}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador cierra cuando el equipo está listo.</p>;
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: wide ? 860 : 620 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ LEAN COFFEE · agenda del equipo, trabajada por tiempo ════════
  if (session.type === "leancoffee") {
    const topics = allCards.filter((c) => c.columnKey === "topic");
    const myLcIds = ((inputs.find((x) => x.userId === user.id && x.key === "lcv")?.value as { ids?: string[] } | undefined)?.ids) ?? [];
    const lcVotesOf = (id: string) => inputs.filter((x) => x.key === "lcv").reduce((a, x) => a + (((x.value as { ids?: string[] }).ids ?? []).includes(id) ? 1 : 0), 0);
    const agenda = [...topics].sort((a, b) => lcVotesOf(b.id) - lcVotesOf(a.id));
    const lcVoters = new Set(inputs.filter((x) => x.key === "lcv" && ((x.value as { ids?: string[] }).ids ?? []).length).map((x) => x.voterKey)).size;
    const lcCur = (session.result.lcCur as number) ?? 0;
    const lcNotes = (session.result.lcNotes as Record<string, { dec?: string; act?: string }>) ?? {};
    const setNote = (id: string, patch: Record<string, string>) => patchResult({ lcNotes: { ...((resultRef.current.lcNotes as Record<string, unknown>) ?? {}), [id]: { ...(lcNotes[id] ?? {}), ...patch } } });
    const cont = inputs.filter((i) => i.key === `lccont:${lcCur}`).map((i) => (i.value as { v?: string }).v);
    const goYes = cont.filter((v) => v === "yes").length, goNo = cont.filter((v) => v === "no").length;
    const myCont = (inputs.find((i) => i.userId === user.id && i.key === `lccont:${lcCur}`)?.value as { v?: string } | undefined)?.v;
    const addTopic = async () => { const t = (cardDraft.topic ?? "").trim(); if (!t) return; await addCard(sessionId, "topic", t, false); setCardDraft((d) => ({ ...d, topic: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
    const toggleLcVote = (id: string) => { const cur = new Set(myLcIds); if (cur.has(id)) cur.delete(id); else if (cur.size < 2) cur.add(id); tapInput("lcv", { ids: [...cur] }); };
    const lcFinish = async () => {
      setBusy(true);
      const acts = agenda.map((t) => lcNotes[t.id]?.act).filter((a): a is string => !!a && a.trim().length > 0);
      await finalizeSession(session, {
        pulseAvg: avg, cardCount: topics.length,
        summaryText: `Lean Coffee: ${agenda.length} temas · ${acts.length} acciones`,
        dataKey: acts.length ? "proof" : undefined, dataValue: acts.length ? { finalists: acts.slice(0, 3) } : undefined,
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (step === "lctopics") {
      sub = "Cada uno propone los temas o ideas que quiere trabajar hoy.";
      content = (
        <Card pad={20}>
          {initiative?.data?.focus?.rootCause && <div style={{ padding: "8px 12px", marginBottom: 12, background: "color-mix(in srgb, var(--st-focus) 9%, transparent)", borderRadius: "var(--r-md)", fontSize: "var(--t-xs)" }}><b>Causa raíz:</b> {initiative.data.focus.rootCause}</div>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
            {topics.map((t) => { const author = t.authorId ? participants.find((p) => p.userId === t.authorId)?.name : undefined; return <span key={t.id} style={{ fontSize: "var(--t-xs)", padding: "5px 10px", borderRadius: "var(--r-full)", background: "var(--card)", border: "1px solid var(--line)" }}>{t.text}{author && <span className="faint" style={{ marginLeft: 5 }}>· {author}</span>}</span>; })}
            {!topics.length && <span className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>Sin temas todavía.</span>}
          </div>
          {!isFacil && (
            <div style={{ display: "flex", gap: 6 }}>
              <input value={cardDraft.topic ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, topic: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addTopic()} placeholder="Un tema para trabajar…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" }} />
              <Button size="sm" icon="Plus" onClick={addTopic}>Sumar</Button>
            </div>
          )}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || topics.length === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "lcvote", 1); setBusy(false); }}>Votar la agenda ({topics.length})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Proponé los temas que te interesan.</p>;
    } else if (step === "lcvote") {
      const shown = !!session.result.voteShown;
      sub = shown ? "La agenda, en orden de prioridad." : "¿Qué temas trabajamos primero? 2 puntos por persona.";
      const max = Math.max(1, ...topics.map((t) => lcVotesOf(t.id)));
      content = (
        <>
          {!shown && !isFacil && <div style={{ textAlign: "center", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><span className="muted" style={{ fontSize: "var(--t-sm)" }}>Tus puntos:</span>{Array.from({ length: 2 }).map((_, i) => <span key={i} style={{ width: 16, height: 16, borderRadius: 99, background: i < (2 - myLcIds.length) ? "var(--st-proof)" : "var(--card-2)", border: `1px solid ${i < (2 - myLcIds.length) ? "var(--st-proof)" : "var(--line-2)"}` }} />)}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(shown ? agenda : topics).map((t, i) => { const v = lcVotesOf(t.id); const on = myLcIds.includes(t.id); return (
              <button key={t.id} disabled={isFacil || shown} onClick={() => toggleLcVote(t.id)}
                style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: on && !shown ? "color-mix(in srgb, var(--st-proof) 8%, var(--card))" : "var(--card)", border: `1px solid ${on && !shown ? "var(--st-proof)" : "var(--line)"}`, borderRadius: "var(--r-md)", cursor: isFacil || shown ? "default" : "pointer" }}>
                {shown && <span className="num" style={{ width: 18, fontWeight: 700, color: i === 0 ? "var(--st-proof)" : "var(--ink-3)" }}>{i + 1}</span>}
                <span style={{ flex: 1, fontSize: "var(--t-sm)", fontWeight: 600 }}>{t.text}</span>
                {!shown && on && <Icon name="CheckCircle2" size={15} style={{ color: "var(--st-proof)" }} />}
                {shown && <div style={{ width: 70 }}><Bar value={(v / max) * 100} color={i === 0 ? "var(--st-proof)" : "var(--violet)"} height={6} /></div>}
                {shown && <span className="num" style={{ fontWeight: 700, width: 18, textAlign: "right" }}>{v}</span>}
              </button>
            ); })}
          </div>
          {!shown && <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)", marginTop: 12 }}><Icon name="EyeOff" size={13} /> {lcVoters} de {totalInRoom} votaron</p>}
        </>
      );
      controls = isFacil
        ? (shown
          ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "lcwork", 2); setBusy(false); }}>Empezar a trabajar la agenda</Button>
          : <Button full size="lg" icon="Eye" disabled={busy || lcVoters === 0} onClick={() => setResult(sessionId, { voteShown: true })}>Mostrar agenda ({lcVoters}/{totalInRoom})</Button>)
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Repartí tus 2 puntos.</p>;
    } else if (step === "lcwork") {
      const t = agenda[lcCur];
      sub = `Tema ${lcCur + 1} de ${agenda.length}. Lanzá el timer y registren decisiones y acciones.`;
      content = t ? (
        <>
          <Card pad={18} style={{ marginBottom: 14, border: "1px solid color-mix(in srgb, var(--st-proof) 40%, var(--line))" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <span className="num" style={{ width: 24, height: 24, borderRadius: 99, background: "var(--st-proof)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 11 }}>{lcCur + 1}</span>
              <b style={{ flex: 1, fontSize: "var(--t-md)" }}>{t.text}</b>
              {isFacil && <span className="muted" style={{ fontSize: "var(--t-xs)" }}>⏱ usá el timer de arriba (5′)</span>}
            </div>
            {isFacil ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div><div className="eyebrow" style={{ marginBottom: 5 }}>Decisiones</div><textarea defaultValue={lcNotes[t.id]?.dec ?? ""} onBlur={(e) => setNote(t.id, { dec: e.target.value })} rows={2} placeholder="Lo que se decidió…" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none", resize: "vertical" }} /></div>
                <div><div className="eyebrow" style={{ marginBottom: 5 }}>Acciones</div><textarea defaultValue={lcNotes[t.id]?.act ?? ""} onBlur={(e) => setNote(t.id, { act: e.target.value })} rows={2} placeholder="Qué se va a hacer (va a Diseño de la prueba)…" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none", resize: "vertical" }} /></div>
              </div>
            ) : (
              <div style={{ fontSize: "var(--t-sm)", display: "flex", flexDirection: "column", gap: 6 }}>
                {lcNotes[t.id]?.dec && <div><b>Decisiones:</b> {lcNotes[t.id]?.dec}</div>}
                {lcNotes[t.id]?.act && <div><b>Acciones:</b> {lcNotes[t.id]?.act}</div>}
              </div>
            )}
          </Card>
          {/* seguir / pasar */}
          <Card pad={16} style={{ textAlign: "center" }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>¿Seguimos o pasamos?</div>
            {!isFacil
              ? <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <Button size="sm" variant={myCont === "yes" ? "primary" : "secondary"} onClick={() => tapInput(`lccont:${lcCur}`, { v: "yes" })}>👍 Seguir</Button>
                  <Button size="sm" variant={myCont === "no" ? "primary" : "secondary"} onClick={() => tapInput(`lccont:${lcCur}`, { v: "no" })}>👎 Pasar</Button>
                </div>
              : <div style={{ display: "flex", gap: 16, justifyContent: "center", fontSize: "var(--t-sm)", fontWeight: 700 }}><span style={{ color: "var(--green)" }}>👍 {goYes}</span><span style={{ color: "var(--ink-3)" }}>👎 {goNo}</span></div>}
          </Card>
        </>
      ) : <Card pad={20}><p className="muted" style={{ fontSize: "var(--t-sm)" }}>No quedan temas.</p></Card>;
      controls = isFacil
        ? <div style={{ display: "flex", gap: 8 }}>
            <Button full variant="secondary" icon="Plus" disabled={busy} onClick={() => launchTimer(5)}>+5 min</Button>
            {lcCur < agenda.length - 1
              ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setResult(sessionId, { lcCur: lcCur + 1, timer: null }); setBusy(false); }}>Siguiente tema</Button>
              : <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "lcclose", 3); setBusy(false); }}>Cerrar</Button>}
          </div>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Votá seguir o pasar cuando suene el timer.</p>;
    } else {
      wide = true;
      sub = "Lo que trabajó el equipo: decisiones y acciones por tema.";
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {agenda.filter((t) => lcNotes[t.id]?.dec || lcNotes[t.id]?.act).map((t, i) => (
            <Card key={t.id} pad={14}>
              <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 6 }}>{i + 1}. {t.text}</div>
              {lcNotes[t.id]?.dec && <div style={{ fontSize: "var(--t-sm)" }}><b>Decisión:</b> {lcNotes[t.id]?.dec}</div>}
              {lcNotes[t.id]?.act && <div style={{ fontSize: "var(--t-sm)", color: "var(--st-proof)" }}><b>Acción:</b> {lcNotes[t.id]?.act}</div>}
            </Card>
          ))}
          {!agenda.some((t) => lcNotes[t.id]?.dec || lcNotes[t.id]?.act) && <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>No quedaron decisiones registradas.</p>}
        </div>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Check" disabled={busy} onClick={lcFinish}>{busy ? "Guardando…" : "Cerrar Lean Coffee"}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador cierra la sesión.</p>;
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: wide ? 760 : 600 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ THE ARCHER · la diana: definir el objetivo con precisión ════════
  if (session.type === "archer") {
    const arOuter = (session.result.arOuter as string) ?? "";
    const arMetrics = (session.result.arMetrics as string[]) ?? [];
    const arBull = (session.result.arBull as string) ?? "";
    const arOks = new Set(inputs.filter((i) => i.key === "arok").map((i) => i.userId));
    const iArOk = arOks.has(user.id);
    const arFinish = async () => {
      setBusy(true);
      await finalizeSession(session, {
        pulseAvg: avg,
        summaryText: `Objetivo: ${arBull || arOuter || "definido"}`,
        dataKey: "proof", dataValue: { bullseye: arBull },
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "";
    if (step === "arframe") {
      sub = "Antes de decidir qué hacer, definamos con precisión a dónde apuntamos.";
      content = (
        <Card pad={26} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🎯</div>
          <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, lineHeight: 1.4 }}>¿Qué queremos lograr, exactamente?</h2>
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 8, lineHeight: 1.55 }}>Vamos a armar una diana: el resultado general, las métricas posibles y el centro — una sola métrica con un número.</p>
          {initiative?.data?.focus?.rootCause && <p style={{ fontSize: "var(--t-sm)", marginTop: 12, padding: "10px 14px", background: "var(--card)", borderRadius: "var(--r-md)" }}><b>La causa raíz:</b> {initiative.data.focus.rootCause}</p>}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "arbuild", 1); setBusy(false); }}>Construir la diana</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador encuadra el ejercicio.</p>;
    } else if (step === "arbuild") {
      sub = isFacil ? "Completá la diana de afuera hacia adentro." : "El equipo arma la diana del objetivo.";
      const ip: React.CSSProperties = { width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" };
      content = (
        <div className="cluster-grid" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 18, alignItems: "start" }}>
          {isFacil ? (
            <Card pad={18}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div><div className="eyebrow" style={{ marginBottom: 5 }}>Anillo exterior · Resultado general</div><input defaultValue={arOuter} onBlur={(e) => patchResult({ arOuter: e.target.value.trim() })} placeholder="Ej: que las entregas lleguen a tiempo" style={ip} /></div>
                <div>
                  <div className="eyebrow" style={{ marginBottom: 5 }}>Anillo medio · Métricas posibles</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {arMetrics.map((m, i) => <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}><input defaultValue={m} onBlur={(e) => patchResult({ arMetrics: arMetrics.map((x, k) => k === i ? e.target.value.trim() : x) })} style={{ ...ip, flex: 1 }} /><button onClick={() => patchResult({ arMetrics: arMetrics.filter((_, k) => k !== i) })} style={{ color: "var(--ink-3)" }}><Icon name="X" size={14} /></button></div>)}
                    {arMetrics.length < 4 && <Button size="sm" variant="secondary" icon="Plus" onClick={() => patchResult({ arMetrics: [...arMetrics, ""] })}>Métrica</Button>}
                  </div>
                </div>
                <div><div className="eyebrow" style={{ marginBottom: 5, color: "var(--green)" }}>🎯 Centro · El bullseye (una métrica, un número)</div><input defaultValue={arBull} onBlur={(e) => patchResult({ arBull: e.target.value.trim() })} placeholder="Ej: reducir entregas tarde de 5 a 1 por semana" style={{ ...ip, border: "1px solid color-mix(in srgb, var(--green) 45%, var(--line-2))" }} /></div>
              </div>
            </Card>
          ) : <Card pad={16}><ArcherTarget outer={arOuter} metrics={arMetrics} bull={arBull} /></Card>}
          <Card pad={16}><ArcherTarget outer={arOuter} metrics={arMetrics} bull={arBull} /></Card>
        </div>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || !arBull.trim()} onClick={async () => { setBusy(true); await setStep(sessionId, "aralign", 2); setBusy(false); }}>Alinear al equipo</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador completa la diana con el equipo.</p>;
    } else if (step === "aralign") {
      sub = "¿Todos apuntan al mismo centro?";
      content = (
        <>
          <Card pad={18} style={{ marginBottom: 14 }}><ArcherTarget outer={arOuter} metrics={arMetrics} bull={arBull} /></Card>
          <div style={{ textAlign: "center" }}>
            {!isFacil
              ? (iArOk ? <span style={{ color: "var(--green)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="CircleCheck" size={18} /> Apuntás al mismo centro</span> : <Button size="lg" icon="Target" onClick={() => tapInput("arok", { ok: true })}>Sí, este es el centro</Button>)
              : <span className="muted num" style={{ fontSize: "var(--t-sm)" }}>{arOks.size}/{totalInRoom} confirmaron el bullseye</span>}
          </div>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "arclose", 3); setBusy(false); }}>Cerrar el objetivo</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Si no apuntás al mismo centro, decilo en voz alta antes de cerrar.</p>;
    } else {
      sub = "El objetivo del equipo queda definido. Pre-carga la señal de Diseño de la prueba.";
      content = <Card pad={20}><ArcherTarget outer={arOuter} metrics={arMetrics} bull={arBull} hit /></Card>;
      controls = isFacil
        ? <Button full size="lg" icon="Check" disabled={busy || !arBull.trim()} onClick={arFinish}>{busy ? "Guardando…" : "Cerrar con este objetivo"}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador cierra el objetivo.</p>;
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: step === "arbuild" ? 820 : 560 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ DESIGN STORYBOARDING · dibujar la solución en 6 cuadros ════════
  if (session.type === "storyboard") {
    const parseFrames = (s: string): string[] => { try { const a = JSON.parse(s); return Array.isArray(a) ? a : ["", "", "", "", "", ""]; } catch { return ["", "", "", "", "", ""]; } };
    const myBoard = myCards.find((c) => c.columnKey === "sb");
    const boards = allCards.filter((c) => c.columnKey === "sb");
    const sbFinal = (session.result.sbFinal as string[]) ?? ["", "", "", "", "", ""];
    const saveBoard = async () => {
      setBusy(true);
      if (myBoard) await deleteCard(myBoard.id);
      await addCard(sessionId, "sb", JSON.stringify(sbDraft), false);
      if (user) setMyCards(await getMyCards(sessionId, user.id));
      setBusy(false);
    };
    const sbFinish = async () => {
      setBusy(true);
      await finalizeSession(session, {
        pulseAvg: avg, cardCount: boards.length,
        summaryText: `Storyboard consensuado · ${boards.length} aportes`,
        dataKey: "proof", dataValue: { chosenIdea: sbFinal.filter(Boolean).join(" → ") || undefined },
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (step === "sbframe") {
      sub = "Vamos a dibujar cómo se ve la idea en acción, paso a paso.";
      content = (
        <Card pad={26} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🎬</div>
          <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, lineHeight: 1.4 }}>Dibujá la solución en 6 cuadros</h2>
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 8, lineHeight: 1.55 }}>No importa si sabés dibujar: escribí con palabras y emojis. Cuadro 1: cómo es hoy. Cuadros 2-5: los pasos. Cuadro 6: el resultado.</p>
          {initiative?.data?.proof?.chosenIdea && <p style={{ fontSize: "var(--t-sm)", marginTop: 12, padding: "10px 14px", background: "var(--card)", borderRadius: "var(--r-md)" }}><b>La idea:</b> {initiative.data.proof.chosenIdea}</p>}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "sbdraw", 1); setBusy(false); }}>Empezar a dibujar</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador encuadra el ejercicio.</p>;
    } else if (step === "sbdraw") {
      wide = true;
      sub = isFacil ? "Cada uno arma su storyboard. Vos ves cuántos terminaron." : "Armá tu storyboard de 6 cuadros y guardalo.";
      content = isFacil ? (
        <Card pad={24}><div style={{ textAlign: "center", padding: "8px 0" }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--green)" }}>{boards.length}/{totalInRoom}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>storyboards listos</div></div></Card>
      ) : (
        <Card pad={16}>
          <StoryboardCanvas frames={sbDraft} editable onChange={(i, v) => setSbDraft((d) => d.map((x, k) => k === i ? v : x))} />
          <div style={{ marginTop: 12, textAlign: "center" }}>
            {myBoard && <span className="muted" style={{ fontSize: "var(--t-xs)", display: "block", marginBottom: 6 }}><Icon name="Check" size={12} style={{ color: "var(--green)" }} /> Guardado · podés seguir editando y volver a guardar</span>}
            <Button icon="Save" disabled={busy || !sbDraft.some((f) => f.trim())} onClick={saveBoard}>{busy ? "Guardando…" : myBoard ? "Actualizar mi storyboard" : "Guardar mi storyboard"}</Button>
          </div>
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Eye" disabled={busy || boards.length === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "sbpresent", 2); setBusy(false); }}>Ver los storyboards ({boards.length})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Guardá tu storyboard. El facilitador avanza cuando estén.</p>;
    } else if (step === "sbpresent") {
      wide = true;
      sub = "Cada uno presenta el suyo (2 min). Miren coincidencias y diferencias.";
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {boards.map((b) => {
            const author = b.authorId ? participants.find((p) => p.userId === b.authorId)?.name : undefined;
            return (
              <Card key={b.id} pad={14}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>{author ?? "Storyboard"}</div>
                <StoryboardCanvas frames={parseFrames(b.text)} size="sm" />
              </Card>
            );
          })}
          {!boards.length && <p className="muted" style={{ fontSize: "var(--t-sm)" }}>Sin storyboards.</p>}
        </div>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "sbconsensus", 3); setBusy(false); }}>Armar el storyboard consensuado</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Presenten y comparen. ¿Dónde coinciden? ¿Dónde difieren?</p>;
    } else {
      wide = true;
      sub = "El storyboard final del equipo, combinando lo mejor de cada uno.";
      content = (
        <Card pad={16}>
          {isFacil
            ? <StoryboardCanvas frames={sbFinal} editable onChange={(i, v) => patchResult({ sbFinal: sbFinal.map((x, k) => k === i ? v : x) })} />
            : <StoryboardCanvas frames={sbFinal} />}
          {isFacil && <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 10, textAlign: "center" }}>Combiná los pasos más acordados. El equipo valida cada cuadro.</p>}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Check" disabled={busy || !sbFinal.some((f) => f.trim())} onClick={sbFinish}>{busy ? "Guardando…" : "Cerrar con el storyboard consensuado"}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador arma el storyboard final.</p>;
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: wide ? 820 : 620 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ DISEÑO DE LA PRUEBA · la apuesta + 3 filtros ════════
  if (session.type === "betdesign") {
    const pd = initiative?.data?.proof;
    const r = session.result;
    const f = (k: string, fallback = "") => (r[k] as string) ?? fallback;
    const others = (r.bdOthers as string[]) ?? [];
    const filters = [
      { k: "bdF1", q: "¿Es observable?", bad: "“Mejorar la comunicación”", good: "“Reducir de 3 a 1 las reuniones sin acuerdos por semana”", fix: "Reformulá la señal para que se vea sin interpretación subjetiva." },
      { k: "bdF2", q: "¿Es medible en 15 días?", bad: "“Cambiar la cultura del equipo”", good: "“3 entregas a tiempo esta quincena”", fix: "Ajustá el plazo o la señal para que el cambio sea visible en el tiempo definido." },
      { k: "bdF3", q: "¿Depende solo del equipo?", bad: "“Que el cliente apruebe más rápido”", good: "“Mandar el informe 2 días antes”", fix: "Reformulá para que la señal sea algo que el equipo controla directamente." },
    ];
    const allFilters = filters.every((x) => r[x.k] === true);
    const bdOks = new Set(inputs.filter((i) => i.key === "bdok").map((i) => i.userId));
    const iBdOk = bdOks.has(user.id);
    const bdFinish = async () => {
      setBusy(true);
      await finalizeSession(session, {
        pulseAvg: avg,
        summaryText: `Prueba: ${f("bdThen") || f("bdIf") || "diseñada"}`,
        dataKey: "proof",
        dataValue: {
          betIf: f("bdIf"), betThen: f("bdThen"), signalMetric: f("bdSignal"), signalTarget: f("bdThreshold"),
          signalHow: f("bdAction"), responsible: f("bdResp"), deadline: f("bdDeadline"),
          actions: f("bdAction") ? [{ text: f("bdAction"), who: f("bdResp") }] : undefined,
        },
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (step === "bdcontext") {
      sub = "Todo lo que sabemos, antes de diseñar la prueba.";
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {pd?.chosenIdea && <Card pad={16}><div className="eyebrow" style={{ color: "var(--st-proof)", marginBottom: 4 }}>La idea que vamos a probar</div><div style={{ fontSize: "var(--t-sm)", fontWeight: 600 }}>{pd.chosenIdea}</div></Card>}
          {initiative?.data?.focus?.rootCause && <Card pad={16}><div className="eyebrow" style={{ color: "var(--st-focus)", marginBottom: 4 }}>La causa raíz (de Foco)</div><div style={{ fontSize: "var(--t-sm)" }}>{initiative.data.focus.rootCause}</div></Card>}
          {!!(pd?.mitigations?.length) && (
            <Card pad={16}>
              <div className="eyebrow" style={{ color: "var(--risk)", marginBottom: 8 }}>Riesgos a vigilar (de ¿Qué podría fallar?)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {pd.mitigations!.map((m, i) => <div key={i} style={{ fontSize: "var(--t-sm)" }}><b>{m.risk}</b>{m.plan ? <span className="muted"> → {m.plan}</span> : null}</div>)}
              </div>
            </Card>
          )}
          {!pd?.chosenIdea && !initiative?.data?.focus?.rootCause && <Card pad={16}><p className="muted" style={{ fontSize: "var(--t-sm)" }}>Sin contexto previo de Foco/Ideación — lo definimos directamente en el template.</p></Card>}
        </div>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "bdtemplate", 1); setBusy(false); }}>Diseñar la apuesta</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador repasa el contexto.</p>;
    } else if (step === "bdtemplate") {
      wide = true;
      sub = isFacil ? "Completá la apuesta con el equipo." : "El equipo diseña la apuesta. Sugerí por voz/reacción.";
      const ta: React.CSSProperties = { width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none", lineHeight: 1.5, resize: "vertical" };
      const Field = ({ k, label, placeholder, rows }: { k: string; label: string; placeholder?: string; rows?: number }) => (
        <div>
          <div className="eyebrow" style={{ marginBottom: 5 }}>{label}</div>
          {isFacil
            ? (rows ? <textarea defaultValue={f(k)} onBlur={(e) => patchResult({ [k]: e.target.value.trim() })} rows={rows} placeholder={placeholder} style={ta} /> : <input defaultValue={f(k)} onBlur={(e) => patchResult({ [k]: e.target.value.trim() })} placeholder={placeholder} style={ta} />)
            : <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.5, color: f(k) ? "var(--ink-0)" : "var(--ink-3)" }}>{f(k) || placeholder}</p>}
        </div>
      );
      content = (
        <Card pad={20}>
          <div style={{ padding: "12px 14px", background: "color-mix(in srgb, var(--st-proof) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--st-proof) 28%, transparent)", borderRadius: "var(--r-md)", fontSize: "var(--t-sm)", lineHeight: 1.7, marginBottom: 16 }}>
            Creemos que si <b style={{ color: f("bdIf") ? "var(--st-proof)" : "var(--ink-3)" }}>{f("bdIf") || "[acción]"}</b>, lograremos <b style={{ color: f("bdThen") ? "var(--st-proof)" : "var(--ink-3)" }}>{f("bdThen") || "[resultado]"}</b>. Lo mediremos con <b style={{ color: f("bdSignal") ? "var(--st-proof)" : "var(--ink-3)" }}>{f("bdSignal") || "[señal]"}</b>{f("bdDeadline") ? <> antes del <b style={{ color: "var(--st-proof)" }}>{f("bdDeadline")}</b></> : " [fecha]"}.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field k="bdIf" label="Si… (la acción)" placeholder="¿Qué exactamente vamos a hacer distinto?" rows={2} />
            <Field k="bdThen" label="…lograremos (el resultado)" placeholder="¿Qué esperamos que cambie?" />
            {pd?.bullseye && !f("bdSignal") && <p className="muted" style={{ fontSize: "var(--t-xs)" }}>Sugerencia de The Archer: {pd.bullseye}</p>}
            <Field k="bdSignal" label="Señal de avance" placeholder="¿Qué número/observación nos dice que va bien?" />
            <Field k="bdThreshold" label="Umbral de éxito (número concreto)" placeholder="Ej: de 5 a 1 por semana" />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div className="eyebrow" style={{ marginBottom: 5 }}>Responsable</div>
                {isFacil
                  ? <select defaultValue={f("bdResp")} onChange={(e) => patchResult({ bdResp: e.target.value })} style={ta}><option value="">Elegir…</option>{(team?.members ?? []).map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}</select>
                  : <p style={{ fontSize: "var(--t-sm)" }}>{f("bdResp") || "—"}</p>}
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div className="eyebrow" style={{ marginBottom: 5 }}>Fecha de revisión</div>
                {isFacil ? <input type="date" defaultValue={f("bdDeadline")} onBlur={(e) => patchResult({ bdDeadline: e.target.value })} style={ta} /> : <p style={{ fontSize: "var(--t-sm)" }}>{f("bdDeadline") || "—"}</p>}
              </div>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Otros involucrados</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(team?.members ?? []).map((m) => { const on = others.includes(m.name); return (
                  <button key={m.name} disabled={!isFacil} onClick={() => { const cur = new Set((resultRef.current.bdOthers as string[]) ?? others); if (cur.has(m.name)) cur.delete(m.name); else cur.add(m.name); patchResult({ bdOthers: [...cur] }); }}
                    style={{ fontSize: "var(--t-xs)", padding: "5px 10px", borderRadius: "var(--r-full)", border: `1px solid ${on ? "var(--st-proof)" : "var(--line-2)"}`, background: on ? "color-mix(in srgb, var(--st-proof) 14%, var(--card))" : "var(--card)", color: on ? "var(--st-proof)" : "var(--ink-2)", fontWeight: 600 }}>{m.name}</button>
                ); })}
              </div>
            </div>
          </div>
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || !f("bdIf") || !f("bdThen") || !f("bdSignal")} onClick={async () => { setBusy(true); await setStep(sessionId, "bdfilters", 2); setBusy(false); }}>Validar con los 3 filtros</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador completa la apuesta.</p>;
    } else if (step === "bdfilters") {
      sub = "3 filtros obligatorios. No avanzamos hasta que los 3 estén en verde.";
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filters.map((flt) => {
            const v = r[flt.k] as boolean | undefined;
            return (
              <Card key={flt.k} pad={16} style={{ border: `1px solid ${v === true ? "var(--green)" : v === false ? "var(--risk)" : "var(--line)"}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: "var(--t-sm)", flex: 1 }}>{flt.q}</span>
                  {isFacil ? (
                    <span style={{ display: "flex", gap: 6 }}>
                      <Button size="sm" variant={v === true ? "primary" : "secondary"} icon="Check" onClick={() => patchResult({ [flt.k]: true })}>Sí</Button>
                      <Button size="sm" variant={v === false ? "primary" : "secondary"} icon="X" onClick={() => patchResult({ [flt.k]: false })}>No</Button>
                    </span>
                  ) : <span style={{ color: v === true ? "var(--green)" : v === false ? "var(--risk)" : "var(--ink-3)", fontWeight: 700 }}>{v === true ? "✅" : v === false ? "❌" : "○"}</span>}
                </div>
                {v === false && (
                  <div style={{ marginTop: 10, padding: "9px 11px", background: "var(--warning-bg)", border: "1px solid color-mix(in srgb, var(--warning) 35%, transparent)", borderRadius: "var(--r-md)", fontSize: "var(--t-xs)", lineHeight: 1.5 }}>
                    <Icon name="Lightbulb" size={13} style={{ color: "var(--warning)" }} /> {flt.fix}<br /><span className="muted">Mal: {flt.bad} · Bien: {flt.good}</span>
                  </div>
                )}
              </Card>
            );
          })}
          {!allFilters && <p className="muted" style={{ fontSize: "var(--t-xs)", textAlign: "center" }}><Icon name="Lock" size={12} /> La prueba se confirma cuando los 3 filtros están en verde.</p>}
        </div>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || !allFilters} onClick={async () => { setBusy(true); await setStep(sessionId, "bdconfirm", 3); setBusy(false); }}>{allFilters ? "Pasar a la confirmación" : "Faltan filtros en verde"}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador valida los 3 filtros.</p>;
    } else {
      sub = "La prueba está lista. Cada uno se compromete a ejecutarla.";
      content = (
        <>
          <Card pad={20} style={{ marginBottom: 14, border: "1.5px solid var(--st-proof)" }}>
            <div className="eyebrow" style={{ color: "var(--st-proof)", marginBottom: 6 }}>Nuestra apuesta</div>
            <p style={{ fontSize: "var(--t-md)", fontWeight: 600, lineHeight: 1.6 }}>Si <b>{f("bdIf")}</b>, lograremos <b>{f("bdThen")}</b>. Lo mediremos con <b>{f("bdSignal")}</b>{f("bdThreshold") ? <> ({f("bdThreshold")})</> : null}{f("bdDeadline") ? <> antes del <b>{f("bdDeadline")}</b></> : null}.</p>
            {f("bdResp") && <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 8 }}>Responsable: <b style={{ color: "var(--ink-0)" }}>{f("bdResp")}</b>{others.length ? ` · con ${others.join(", ")}` : ""}</p>}
          </Card>
          <div style={{ textAlign: "center" }}>
            {!isFacil
              ? (iBdOk ? <span style={{ color: "var(--green)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="CircleCheck" size={18} /> Te comprometiste a ejecutarla</span> : <Button size="lg" icon="HandHeart" onClick={() => tapInput("bdok", { ok: true })}>Entiendo la prueba y me comprometo</Button>)
              : (
                <div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {(team?.members ?? []).map((m, i) => <span key={m.name} title={m.name} style={{ position: "relative" }}><Avatar name={m.name} initials={m.initials} size={32} idx={i} />{[...bdOks].some((id) => participants.find((p) => p.userId === id)?.name === m.name) && <span style={{ position: "absolute", bottom: -2, right: -2, background: "var(--green)", borderRadius: 99, width: 14, height: 14, display: "grid", placeItems: "center" }}><Icon name="Check" size={9} style={{ color: "#fff" }} /></span>}</span>)}
                  </div>
                  <span className="num muted" style={{ fontSize: "var(--t-sm)" }}>{bdOks.size}/{totalInRoom} se comprometieron</span>
                </div>
              )}
          </div>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Rocket" disabled={busy} onClick={bdFinish}>{busy ? "Guardando…" : bdOks.size >= totalInRoom ? "Cerrar · la prueba arranca" : `Cerrar (${bdOks.size}/${totalInRoom} confirmaron)`}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador cierra cuando el equipo se comprometió.</p>;
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: wide ? 760 : 620 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ ¿CÓMO VENIMOS? · check-in de la prueba ════════
  if (session.type === "follow") {
    const pf = initiative?.data?.proof;
    const fl = initiative?.data?.follow;
    const r = session.result;
    const fv = (k: string) => (r[k] as string) ?? "";
    const fidelity = fv("fwFidelity");
    const hasBlockers = !!r.fwHasBlockers;
    const decision = fv("fwDecision");
    const startedAt = fl?.startedAt ?? (r.fwStartedAt as string) ?? "";
    const deadline = pf?.deadline ?? "";
    const dayInfo = (() => {
      if (!startedAt || !deadline) return null;
      const s = new Date(startedAt).getTime(), d = new Date(deadline).getTime(), now = Date.now();
      const total = Math.max(1, Math.round((d - s) / 86400000));
      const elapsed = Math.max(0, Math.round((now - s) / 86400000));
      return { total, elapsed, left: Math.max(0, total - elapsed), pct: Math.min(100, (elapsed / total) * 100) };
    })();
    const honestVotes = inputs.filter((i) => i.key === "fwhonest").map((i) => (i.value as { v?: string }).v);
    const hc = { green: honestVotes.filter((v) => v === "green").length, yellow: honestVotes.filter((v) => v === "yellow").length, red: honestVotes.filter((v) => v === "red").length };
    const myHonest = (inputs.find((i) => i.userId === user.id && i.key === "fwhonest")?.value as { v?: string } | undefined)?.v as HonestyKey | undefined;
    const honestShown = !!r.fwHonestShown;
    const worry = hc.yellow + hc.red > hc.green;
    const fwFinish = async () => {
      setBusy(true);
      const today = new Date().toLocaleDateString("es", { day: "2-digit", month: "short" });
      const prevLog = (fl?.signalLog as { date: string; value: string }[] | undefined) ?? [];
      const signalLog = fv("fwSignalNow") ? [...prevLog, { date: today, value: fv("fwSignalNow") }] : prevLog;
      await finalizeSession(session, {
        pulseAvg: avg,
        summaryText: `Check-in: señal ${fv("fwSignalNow") || "—"} · ${decision === "stop" ? "detener" : decision === "adjust" ? "ajustar" : "continuar"}`,
        dataKey: "follow",
        dataValue: {
          signalNow: fv("fwSignalNow"), fidelity, fidelityNote: fv("fwFidelityNote"),
          blockers: hasBlockers && fv("fwBlockers") ? [fv("fwBlockers")] : [],
          adjustNote: fv("fwAdjust"), decision, startedAt: startedAt || new Date().toISOString(),
          honesty: hc, signalLog,
        },
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "";
    const FichaCard = (
      <Card pad={18} style={{ border: "1px solid color-mix(in srgb, var(--st-follow) 40%, var(--line))" }}>
        <div className="eyebrow" style={{ color: "var(--st-follow)", marginBottom: 8 }}>La prueba en marcha</div>
        {(pf?.betIf || pf?.betThen) && <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.55, marginBottom: 10 }}>Si <b>{pf?.betIf || "…"}</b>, lograremos <b>{pf?.betThen || "…"}</b>.</p>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: "var(--t-xs)" }}>
          {pf?.signalMetric && <span><span className="muted">Señal:</span> <b>{pf.signalMetric}</b>{pf.signalTarget ? ` → ${pf.signalTarget}` : ""}</span>}
          {pf?.responsible && <span><span className="muted">Responsable:</span> <b>{pf.responsible}</b></span>}
          {deadline && <span><span className="muted">Revisión:</span> <b>{deadline}</b></span>}
        </div>
        {dayInfo && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--t-xs)", marginBottom: 4 }}><span className="muted">Día {dayInfo.elapsed} de {dayInfo.total}</span><span className="num" style={{ fontWeight: 700, color: dayInfo.left <= 2 ? "var(--warning)" : "var(--ink-2)" }}>{dayInfo.left} días restantes</span></div>
            <div style={{ height: 6, borderRadius: 99, background: "var(--card-2)", overflow: "hidden" }}><div style={{ height: "100%", width: `${dayInfo.pct}%`, background: "var(--st-follow)", borderRadius: 99 }} /></div>
          </div>
        )}
      </Card>
    );
    const ta: React.CSSProperties = { width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none", lineHeight: 1.5, resize: "vertical" };
    if (step === "fwcard") {
      sub = "La ficha de la prueba que estamos siguiendo.";
      content = FichaCard;
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "fwreport", 1); setBusy(false); }}>Reportar el avance</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El responsable va a reportar cómo viene.</p>;
    } else if (step === "fwreport") {
      sub = isFacil ? "Reporte del responsable (lo completás en pantalla)." : "El responsable reporta el avance.";
      content = (
        <>
          {FichaCard}
          <Card pad={18} style={{ marginTop: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 5 }}>Valor actual de la señal</div>
                {isFacil ? <input defaultValue={fv("fwSignalNow")} onBlur={(e) => patchResult({ fwSignalNow: e.target.value.trim() })} placeholder={pf?.signalMetric ? `Ej: ${pf.signalTarget ?? "valor"}` : "Valor de la señal hoy"} style={ta as React.CSSProperties} /> : <p style={{ fontSize: "var(--t-sm)" }}>{fv("fwSignalNow") || "—"}</p>}
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>¿Se ejecutó como la diseñamos?</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[{ k: "yes", t: "✅ Sí, completamente" }, { k: "partial", t: "⚡ Parcialmente" }, { k: "no", t: "❌ No llegamos" }].map((o) => (
                    <button key={o.k} disabled={!isFacil} onClick={() => patchResult({ fwFidelity: o.k })} style={{ padding: "8px 12px", borderRadius: "var(--r-md)", fontSize: "var(--t-sm)", fontWeight: 600, border: `1.5px solid ${fidelity === o.k ? "var(--st-follow)" : "var(--line-2)"}`, background: fidelity === o.k ? "color-mix(in srgb, var(--st-follow) 14%, var(--card))" : "var(--card)" }}>{o.t}</button>
                  ))}
                </div>
                {(fidelity === "partial" || fidelity === "no") && isFacil && <textarea defaultValue={fv("fwFidelityNote")} onBlur={(e) => patchResult({ fwFidelityNote: e.target.value })} rows={2} placeholder={fidelity === "partial" ? "¿Qué no pudimos hacer y por qué?" : "¿Qué pasó?"} style={{ ...ta, marginTop: 8 } as React.CSSProperties} />}
                {(fidelity === "partial" || fidelity === "no") && !isFacil && fv("fwFidelityNote") && <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 6 }}>{fv("fwFidelityNote")}</p>}
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>¿Hay obstáculos bloqueando?</div>
                {isFacil ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => patchResult({ fwHasBlockers: true })} style={{ padding: "7px 14px", borderRadius: "var(--r-full)", fontWeight: 700, fontSize: "var(--t-sm)", border: `1.5px solid ${hasBlockers ? "var(--warning)" : "var(--line-2)"}`, background: hasBlockers ? "var(--warning-bg)" : "var(--card)", color: hasBlockers ? "var(--warning)" : "var(--ink-2)" }}>Sí</button>
                    <button onClick={() => patchResult({ fwHasBlockers: false })} style={{ padding: "7px 14px", borderRadius: "var(--r-full)", fontWeight: 700, fontSize: "var(--t-sm)", border: `1.5px solid ${r.fwHasBlockers === false ? "var(--success)" : "var(--line-2)"}`, background: r.fwHasBlockers === false ? "var(--success-bg)" : "var(--card)", color: r.fwHasBlockers === false ? "var(--green)" : "var(--ink-2)" }}>No</button>
                  </div>
                ) : <p style={{ fontSize: "var(--t-sm)" }}>{hasBlockers ? "Sí" : r.fwHasBlockers === false ? "No" : "—"}</p>}
                {hasBlockers && isFacil && <textarea defaultValue={fv("fwBlockers")} onBlur={(e) => patchResult({ fwBlockers: e.target.value })} rows={2} placeholder="¿Cuál es el obstáculo?" style={{ ...ta, marginTop: 8 } as React.CSSProperties} />}
                {hasBlockers && !isFacil && fv("fwBlockers") && <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 6 }}>{fv("fwBlockers")}</p>}
              </div>
            </div>
          </Card>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || !fidelity} onClick={async () => { setBusy(true); await setStep(sessionId, hasBlockers ? "fwunblock" : "fwdecision", hasBlockers ? 2 : 3); setBusy(false); }}>{hasBlockers ? "Destrabar" : "Pasar a la decisión"}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El responsable completa el reporte.</p>;
    } else if (step === "fwunblock") {
      sub = "Destrabe rápido. Se ajusta la acción, no la apuesta.";
      content = (
        <>
          <div style={{ padding: "12px 14px", marginBottom: 14, background: "var(--warning-bg)", border: "1px solid color-mix(in srgb, var(--warning) 40%, transparent)", borderRadius: "var(--r-md)", fontSize: "var(--t-sm)", lineHeight: 1.5 }}>
            <Icon name="Info" size={14} style={{ color: "var(--warning)" }} /> Se puede ajustar <b>la acción</b> (cómo ejecutamos). <b>No</b> se cambia la apuesta (qué queremos lograr). Si ajustan algo, documentalo.
          </div>
          {hasBlockers && fv("fwBlockers") && <Card pad={14} style={{ marginBottom: 12 }}><div className="eyebrow" style={{ marginBottom: 4 }}>El obstáculo</div><div style={{ fontSize: "var(--t-sm)" }}>{fv("fwBlockers")}</div></Card>}
          <Card pad={16}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>El ajuste (qué y por qué)</div>
            {isFacil ? <textarea defaultValue={fv("fwAdjust")} onBlur={(e) => patchResult({ fwAdjust: e.target.value })} rows={3} placeholder="Para destrabar vamos a…" style={ta as React.CSSProperties} /> : <p style={{ fontSize: "var(--t-sm)" }}>{fv("fwAdjust") || "El equipo está definiendo el destrabe…"}</p>}
          </Card>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "fwdecision", 3); setBusy(false); }}>Pasar a la decisión</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Conversen cómo destrabar.</p>;
    } else if (step === "fwdecision") {
      sub = "¿Qué hacemos con la prueba?";
      content = (
        <Card pad={20}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[{ k: "continue", t: "Continuar como está", ic: "Play", c: "var(--green)" }, { k: "adjust", t: "Ajustar algo específico", ic: "Settings2", c: "var(--warning)" }, { k: "stop", t: "Detener la prueba", ic: "CircleStop", c: "var(--risk)" }].map((o) => (
              <button key={o.k} disabled={!isFacil} onClick={() => patchResult({ fwDecision: o.k })} style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", borderRadius: "var(--r-md)", textAlign: "left", border: `1.5px solid ${decision === o.k ? o.c : "var(--line-2)"}`, background: decision === o.k ? `color-mix(in srgb, ${o.c} 12%, var(--card))` : "var(--card)" }}>
                <Icon name={o.ic} size={17} style={{ color: o.c }} /><span style={{ fontWeight: 600, fontSize: "var(--t-sm)" }}>{o.t}</span>
              </button>
            ))}
          </div>
          {(decision === "adjust" || decision === "stop") && isFacil && <textarea defaultValue={fv("fwDecisionNote")} onBlur={(e) => patchResult({ fwDecisionNote: e.target.value })} rows={2} placeholder={decision === "stop" ? "Justificación del cierre anticipado…" : "¿Qué ajustamos y por qué?"} style={{ ...ta, marginTop: 12 } as React.CSSProperties} />}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || !decision} onClick={async () => { setBusy(true); await setStep(sessionId, "fwhonesty", 4); setBusy(false); }}>Última: honestidad del equipo</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador registra la decisión.</p>;
    } else {
      sub = honestShown ? "Cómo siente el equipo que viene la prueba." : "Anónimo y honesto: ¿cómo ves que viene la prueba realmente?";
      content = (
        <>
          <Card pad={20}>
            {!isFacil && !honestShown
              ? <HonestyPulse counts={hc} mine={myHonest} onVote={(k) => tapInput("fwhonest", { v: k })} />
              : <HonestyPulse counts={hc} revealed />}
          </Card>
          {honestShown && worry && isFacil && (
            <div style={{ marginTop: 12, padding: "12px 14px", background: "var(--warning-bg)", border: "1px solid color-mix(in srgb, var(--warning) 45%, transparent)", borderRadius: "var(--r-md)", fontSize: "var(--t-sm)", lineHeight: 1.5 }}>
              <Icon name="TriangleAlert" size={16} style={{ color: "var(--warning)" }} /> El equipo siente algo diferente al reporte. Considerá abrir el espacio para hablarlo antes de cerrar.
            </div>
          )}
        </>
      );
      controls = isFacil
        ? (honestShown
          ? <Button full size="lg" icon="Check" disabled={busy} onClick={fwFinish}>{busy ? "Guardando…" : "Cerrar el check-in"}</Button>
          : <Button full size="lg" icon="Eye" disabled={busy || honestVotes.length === 0} onClick={() => setResult(sessionId, { fwHonestShown: true })}>Revelar ({honestVotes.length}/{totalInRoom})</Button>)
        : (honestShown ? <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador cierra el check-in.</p> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Respondé con honestidad. Es anónimo.</p>);
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: 600 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ ROTI · ¿está valiendo la pena el tiempo? ════════
  if (session.type === "roti") {
    const RT_LABELS = ["Tiempo perdido", "Poco valor", "Aceptable", "Buen retorno", "Muy valioso"];
    const RT_EMO = ["😞", "🙁", "😐", "🙂", "🤩"];
    const rtScores = inputs.filter((i) => i.key === "rt").map((i) => (i.value as { v?: number }).v).filter((v): v is number => typeof v === "number");
    const myRt = (inputs.find((i) => i.userId === user.id && i.key === "rt")?.value as { v?: number } | undefined)?.v;
    const rtAvg = rtScores.length ? rtScores.reduce((a, b) => a + b, 0) / rtScores.length : 0;
    const rtDist = [1, 2, 3, 4, 5].map((n) => rtScores.filter((s) => s === n).length);
    const rtLow = rtScores.filter((s) => s <= 2).length;
    const rtFinish = async () => {
      setBusy(true);
      await finalizeSession(session, { pulseAvg: avg, summaryText: `ROTI: ${rtAvg.toFixed(1)}/5 · ${rtScores.length} respuestas${rtLow ? ` · ${rtLow} bajas` : ""}` });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "";
    if (step === "rtscore") {
      sub = "¿Está valiendo la pena el tiempo que le dedicamos a esta prueba? Anónimo, del 1 al 5.";
      content = (
        <Card pad={24}>
          {isFacil ? (
            <div style={{ textAlign: "center" }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--green)" }}>{rtScores.length}/{totalInRoom}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>respondieron · oculto hasta revelar</div></div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[5, 4, 3, 2, 1].map((n) => { const on = myRt === n; return (
                  <button key={n} onClick={() => tapInput("rt", { v: n })} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: "var(--r-md)", textAlign: "left", border: `1.5px solid ${on ? "var(--st-follow)" : "var(--line-2)"}`, background: on ? "color-mix(in srgb, var(--st-follow) 13%, var(--card))" : "var(--card)", cursor: "pointer" }}>
                    <span style={{ fontSize: 22 }}>{RT_EMO[n - 1]}</span>
                    <span className="num" style={{ fontWeight: 800, width: 14, color: on ? "var(--st-follow)" : "var(--ink-2)" }}>{n}</span>
                    <span style={{ flex: 1, fontSize: "var(--t-sm)", fontWeight: 600 }}>{RT_LABELS[n - 1]}</span>
                    {on && <Icon name="CheckCircle2" size={16} style={{ color: "var(--st-follow)" }} />}
                  </button>
                ); })}
              </div>
              <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 12, textAlign: "center" }}><Icon name="Lock" size={12} /> Anónimo · {rtScores.length} de {totalInRoom} respondieron</p>
            </>
          )}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Eye" disabled={busy || rtScores.length === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "rtreveal", 1); setBusy(false); }}>Revelar resultado ({rtScores.length})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Elegí tu puntuación. El facilitador revela cuando estén todos.</p>;
    } else if (step === "rtreveal") {
      sub = "El retorno del tiempo, según el equipo.";
      const maxD = Math.max(1, ...rtDist);
      content = (
        <Card pad={24}>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <span className="num" style={{ fontSize: 48, fontWeight: 800, color: rtAvg >= 3.5 ? "var(--green)" : rtAvg >= 2.5 ? "var(--warning)" : "var(--risk)" }}>{rtAvg.toFixed(1)}</span>
            <span className="muted" style={{ fontSize: "var(--t-sm)" }}>/5 promedio</span>
            <div style={{ fontSize: 30, marginTop: 4 }}>{RT_EMO[Math.max(0, Math.round(rtAvg) - 1)]}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[5, 4, 3, 2, 1].map((n) => { const c = rtDist[n - 1]; return (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16, width: 22 }}>{RT_EMO[n - 1]}</span>
                <span className="num muted" style={{ width: 12, fontWeight: 700 }}>{n}</span>
                <div style={{ flex: 1, height: 10, borderRadius: 99, background: "var(--card-2)", overflow: "hidden" }}><div style={{ height: "100%", width: `${(c / maxD) * 100}%`, background: n <= 2 ? "var(--risk)" : n === 3 ? "var(--warning)" : "var(--green)", borderRadius: 99 }} /></div>
                <span className="num" style={{ width: 18, textAlign: "right", fontWeight: 700 }}>{c}</span>
              </div>
            ); })}
          </div>
          {rtLow > 0 && <div style={{ marginTop: 14, padding: "10px 12px", background: "var(--risk-bg)", border: "1px solid color-mix(in srgb, var(--risk) 35%, transparent)", borderRadius: "var(--r-md)", fontSize: "var(--t-sm)", lineHeight: 1.5 }}><Icon name="TriangleAlert" size={14} style={{ color: "var(--risk)" }} /> {rtLow} {rtLow === 1 ? "persona siente" : "personas sienten"} que el tiempo no está rindiendo. Vale la pena escucharlo.</div>}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "rttalk", 2); setBusy(false); }}>Conversarlo</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador abre la conversación.</p>;
    } else {
      sub = "Pongamos en palabras lo bajo: ¿qué nos haría sentir que el tiempo rinde?";
      content = (
        <Card pad={20}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}><span className="num" style={{ fontSize: "var(--t-2xl)", fontWeight: 800, color: rtAvg >= 3.5 ? "var(--green)" : rtAvg >= 2.5 ? "var(--warning)" : "var(--risk)" }}>{rtAvg.toFixed(1)}/5</span><span className="muted" style={{ fontSize: "var(--t-sm)" }}>{rtScores.length} respuestas{rtLow ? ` · ${rtLow} bajas` : ""}</span></div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Qué nos llevamos de la conversación</div>
          {isFacil
            ? <textarea defaultValue={(session.result.rtNote as string) ?? ""} onBlur={(e) => patchResult({ rtNote: e.target.value.trim() })} rows={3} placeholder="Lo que dijo el equipo sobre el retorno del tiempo…" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-sm)", outline: "none", lineHeight: 1.5, resize: "vertical" }} />
            : <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.55, color: (session.result.rtNote as string) ? "var(--ink-0)" : "var(--ink-3)" }}>{(session.result.rtNote as string) || "El facilitador está tomando nota…"}</p>}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Check" disabled={busy} onClick={rtFinish}>{busy ? "Guardando…" : "Cerrar ROTI"}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Compartí qué te haría sentir que el tiempo rinde.</p>;
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

  // ════════ PERFECTION GAME (Seguimiento) · ¿en qué número está la ejecución? ════════
  if (session.type === "fwperfection") {
    const pf = initiative?.data?.proof;
    const fpScores = inputs.filter((i) => i.key === "fp").map((i) => (i.value as { v?: number }).v).filter((v): v is number => typeof v === "number");
    const myFp = (inputs.find((i) => i.userId === user.id && i.key === "fp")?.value as { v?: number } | undefined)?.v;
    const fpAvg = fpScores.length ? fpScores.reduce((a, b) => a + b, 0) / fpScores.length : 0;
    const fpMin = fpScores.length ? Math.min(...fpScores) : 0;
    const fpMax = fpScores.length ? Math.max(...fpScores) : 0;
    const fpSpread = fpScores.length > 1 && fpMax - fpMin > 3;
    const target = Math.min(10, Math.round(fpAvg) + 2);
    const fpSugg = allCards.filter((c) => c.columnKey === "fps");
    const fpActs = (session.result.fpActs as Record<string, { text?: string; who?: string }>) ?? {};
    const setFpAct = (i: number, patch: Record<string, string>) => patchResult({ fpActs: { ...((resultRef.current.fpActs as Record<string, unknown>) ?? {}), [i]: { ...(fpActs[i] ?? {}), ...patch } } });
    const addFps = async () => { const t = (cardDraft.fps ?? "").trim(); if (!t) return; await addCard(sessionId, "fps", t, true); setCardDraft((d) => ({ ...d, fps: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
    const FpFicha = (pf?.betIf || pf?.signalMetric) ? (
      <div style={{ padding: "10px 14px", marginBottom: 14, background: "color-mix(in srgb, var(--st-follow) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--st-follow) 28%, transparent)", borderRadius: "var(--r-md)", fontSize: "var(--t-sm)", lineHeight: 1.5 }}>
        <span className="eyebrow" style={{ color: "var(--st-follow)", display: "block", marginBottom: 3 }}>La prueba que estamos ejecutando</span>
        {pf?.betIf ? <>Si <b>{pf.betIf}</b>{pf?.betThen ? <>, lograremos <b>{pf.betThen}</b></> : ""}.</> : pf?.signalMetric}
      </div>
    ) : null;
    const fpFinish = async () => {
      setBusy(true);
      const newActions = [0, 1, 2].map((i) => ({ text: fpActs[i]?.text ?? "", who: fpActs[i]?.who ?? "" })).filter((a) => a.text.trim());
      await finalizeSession(session, {
        pulseAvg: avg, cardCount: fpSugg.length,
        summaryText: `Perfection Game: ${fpAvg.toFixed(1)}/10 · ${newActions.length} acciones para subir`,
        dataKey: "follow", dataValue: { newActions },
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "";
    if (step === "fpframe") {
      sub = "Vamos a puntuar cómo viene la ejecución de la prueba — no el resultado.";
      content = (
        <Card pad={24} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🎯</div>
          <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, lineHeight: 1.4 }}>¿Qué tan bien estamos<br />ejecutando la prueba?</h2>
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 12, lineHeight: 1.5 }}>Puntuamos del 1 al 10 cómo venimos ejecutando (la disciplina, el ritmo, la constancia) y definimos qué nos haría subir 2 puntos.</p>
          {FpFicha && <div style={{ marginTop: 16, textAlign: "left" }}>{FpFicha}</div>}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "fpscore", 1); setBusy(false); }}>Puntuar la ejecución</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador encuadra el ejercicio.</p>;
    } else if (step === "fpscore") {
      sub = "¿En qué número está la ejecución? Anónimo, del 1 al 10.";
      content = (
        <Card pad={24}>
          {isFacil ? (
            <div style={{ textAlign: "center" }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--green)" }}>{fpScores.length}/{totalInRoom}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>puntuaron · oculto hasta revelar</div></div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: "var(--t-sm)", fontWeight: 600 }}>Tu puntuación</span>
                <span className="num" style={{ fontSize: "var(--t-2xl)", fontWeight: 800, color: "var(--st-follow)" }}>{myFp ?? "—"}</span>
              </div>
              <input type="range" min={1} max={10} step={1} value={myFp ?? 5} onChange={(e) => tapInput("fp", { v: Number(e.target.value) })} style={{ width: "100%", accentColor: "var(--st-follow)" }} />
              <div className="muted num" style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--t-xs)", marginTop: 4 }}><span>1</span><span>5</span><span>10</span></div>
              <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 12, textAlign: "center" }}><Icon name="Lock" size={12} /> Anónimo · {fpScores.length} de {totalInRoom} puntuaron</p>
            </>
          )}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Eye" disabled={busy || fpScores.length === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "fpreveal", 2); setBusy(false); }}>Revelar puntuaciones ({fpScores.length})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Mové el slider. El facilitador revela cuando estén todos.</p>;
    } else if (step === "fpreveal") {
      sub = "Las puntuaciones de la ejecución, reveladas.";
      content = (
        <Card pad={24}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 18, marginBottom: 18, flexWrap: "wrap" }}>
            <span><span className="num" style={{ fontSize: 44, fontWeight: 800, color: fpAvg >= 7 ? "var(--green)" : fpAvg >= 4 ? "var(--warning)" : "var(--risk)" }}>{fpAvg.toFixed(1)}</span><span className="muted" style={{ fontSize: "var(--t-sm)" }}>/10 promedio</span></span>
            <span className="num muted" style={{ fontSize: "var(--t-sm)" }}>rango {fpMin}–{fpMax}</span>
          </div>
          <div style={{ position: "relative", height: 46, margin: "0 8px" }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: 20, height: 6, borderRadius: 99, background: "var(--card-2)" }} />
            {[1, 5, 10].map((m) => <span key={m} className="num muted" style={{ position: "absolute", left: `${((m - 1) / 9) * 100}%`, top: 32, fontSize: 10, transform: "translateX(-50%)" }}>{m}</span>)}
            {fpScores.map((s, i) => (
              <span key={i} style={{ position: "absolute", left: `${((s - 1) / 9) * 100}%`, top: 14, width: 18, height: 18, borderRadius: 99, background: "color-mix(in srgb, var(--st-follow) 30%, var(--card))", border: "2px solid var(--st-follow)", transform: "translateX(-50%)", animation: `pop-in .4s var(--spring) ${i * 0.06}s both` }} />
            ))}
          </div>
          {fpSpread && <div style={{ marginTop: 14, padding: "10px 12px", background: "var(--warning-bg)", border: "1px solid color-mix(in srgb, var(--warning) 35%, transparent)", borderRadius: "var(--r-md)", fontSize: "var(--t-sm)", lineHeight: 1.5 }}><Icon name="Info" size={14} style={{ color: "var(--warning)" }} /> Hay mucha dispersión: no todos viven la ejecución igual. Vale la pena entender por qué.</div>}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "fpactions", 3); setBusy(false); }}>¿Qué falta para subir 2 puntos?</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador sigue al plan de mejora.</p>;
    } else {
      sub = `Estamos en ${fpAvg.toFixed(1)}. ¿Qué nos haría llegar a ${target} en los próximos días?`;
      content = (
        <>
          <Card pad={18} style={{ marginBottom: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Ideas del equipo (anónimo)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: isFacil ? 0 : 12 }}>
              {fpSugg.map((c) => <span key={c.id} style={{ fontSize: "var(--t-sm)", padding: "6px 11px", borderRadius: "var(--r-full)", background: "var(--card)", border: "1px solid var(--line)" }}>{c.text}</span>)}
              {!fpSugg.length && <span className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>Sin ideas todavía…</span>}
            </div>
            {!isFacil && (
              <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
                <input value={cardDraft.fps ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, fps: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addFps()} placeholder="Nos haría subir si…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" }} />
                <Button size="sm" icon="Plus" onClick={addFps}>Sumar</Button>
              </div>
            )}
          </Card>
          {isFacil ? (
            <Card pad={18}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>Acciones concretas para subir (con responsable)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input defaultValue={fpActs[i]?.text ?? ""} onBlur={(e) => setFpAct(i, { text: e.target.value })} placeholder={`Acción ${i + 1}…`} style={{ flex: 2, minWidth: 160, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" }} />
                    <select defaultValue={fpActs[i]?.who ?? ""} onChange={(e) => setFpAct(i, { who: e.target.value })} style={{ flex: 1, minWidth: 120, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" }}>
                      <option value="">Responsable…</option>
                      {(team?.members ?? []).map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card pad={16}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Acciones para subir</div>
              {[0, 1, 2].some((i) => fpActs[i]?.text)
                ? <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{[0, 1, 2].filter((i) => fpActs[i]?.text).map((i) => <div key={i} style={{ fontSize: "var(--t-sm)" }}>• {fpActs[i]?.text}{fpActs[i]?.who ? ` · ${fpActs[i]?.who}` : ""}</div>)}</div>
                : <p className="muted" style={{ fontSize: "var(--t-sm)" }}>El facilitador está definiendo las acciones…</p>}
            </Card>
          )}
        </>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Check" disabled={busy} onClick={fpFinish}>{busy ? "Guardando…" : "Cerrar y guardar acciones"}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Sumá lo que nos haría subir 2 puntos.</p>;
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: 600 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ RADAR DEL EQUIPO (Seguimiento) · evolución vs. el radar base ════════
  if (session.type === "fwradar") {
    const CPAL = ["#00E87A", "#3B82F6", "#7C3AED", "#06B6D4", "#F59E0B", "#EF4444", "#EC4899", "#A3E635", "#14B8A6", "#F97316"];
    const baseDims = prevRadar?.dims;
    const frDimsRaw = baseDims && baseDims.length ? baseDims : PULSE_DIMS.map((d) => ({ key: d.key, label: d.label }));
    const frDims = frDimsRaw.map((d, i) => ({ key: d.key, label: d.label, color: CPAL[i % CPAL.length] }));
    const frAvg = averagePulse(responses);
    const frOverall = pulseOverall(frAvg);
    const baseOverall = prevRadar ? pulseOverall(prevRadar.avg) : 0;
    const delta = (k: string) => prevRadar?.avg[k] != null && frAvg[k] != null ? to5(frAvg[k]) - to5(prevRadar.avg[k]) : null;
    const moves = frDims.map((d) => ({ d, dl: delta(d.key) })).filter((x) => x.dl != null) as { d: typeof frDims[number]; dl: number }[];
    const ups = [...moves].filter((m) => m.dl >= 0.3).sort((a, b) => b.dl - a.dl);
    const downs = [...moves].filter((m) => m.dl <= -0.3).sort((a, b) => a.dl - b.dl);
    const frFinish = async () => {
      setBusy(true);
      await setResult(sessionId, { trAvg: frAvg, trDims: frDimsRaw });
      const overallDelta = prevRadar ? to5(frOverall) - to5(baseOverall) : 0;
      await finalizeSession(session, {
        cardCount: 0,
        summaryText: prevRadar
          ? `Radar de seguimiento: ${to5(frOverall).toFixed(1)}/5 (${overallDelta >= 0 ? "+" : ""}${overallDelta.toFixed(1)} vs. base)`
          : `Radar de seguimiento: ${to5(frOverall).toFixed(1)}/5`,
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "";
    if (step === "rbase") {
      sub = prevRadar ? "Este es el radar base, de cuando arrancamos. Hoy lo volvemos a medir." : "Vamos a medir la salud del equipo durante la prueba.";
      content = prevRadar ? (
        <Card pad={24}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontWeight: 700 }}>Radar base (Exploración)</span>
            <Pill color="var(--violet)" bg="color-mix(in srgb, var(--violet) 14%, transparent)">{to5(baseOverall).toFixed(1)}/5</Pill>
          </div>
          <PulseRadar values={prevRadar.avg} dims={frDims} size={320} />
        </Card>
      ) : (
        <Card pad={24} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>📡</div>
          <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.55 }}>No encontramos un Radar del Equipo previo de Exploración, así que esta vez tomamos la <b>línea de base</b>. La próxima podremos comparar la evolución.</p>
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "rate", 1); setBusy(false); }}>Puntuar cómo estamos hoy</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador muestra el radar base.</p>;
    } else if (step === "rate") {
      sub = "Puntuá cada dimensión del 1 al 5 según cómo está el equipo hoy. Anónimo.";
      content = isFacil ? (
        <Card pad={24}><div style={{ textAlign: "center", padding: "8px 0" }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--green)" }}>{responses.length}/{totalInRoom}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>puntuaron</div></div></Card>
      ) : (
        <Card pad={24}>
          {submitted && <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--green)", fontSize: "var(--t-sm)", fontWeight: 600, marginBottom: 14 }}><Icon name="Check" size={16} /> Tu puntuación quedó guardada (anónima).</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, opacity: submitted ? 0.85 : 1 }}>
            {frDims.map((d) => (
              <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ flex: 1, minWidth: 150, fontSize: "var(--t-sm)", fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: d.color, flexShrink: 0 }} />{d.label}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {[1, 2, 3, 4, 5].map((v) => { const on = (draft[d.key] ?? 3) === v; return (
                    <button key={v} disabled={submitted} onClick={() => setDraft((s) => ({ ...s, [d.key]: v }))} className="num" style={{ width: 34, height: 34, borderRadius: 99, fontWeight: 800, fontSize: "var(--t-sm)", border: `1.5px solid ${on ? d.color : "var(--line-2)"}`, background: on ? `color-mix(in srgb, ${d.color} 22%, transparent)` : "var(--card)", color: on ? d.color : "var(--ink-2)", cursor: submitted ? "default" : "pointer" }}>{v}</button>
                  ); })}
                </div>
              </div>
            ))}
          </div>
          <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 14, textAlign: "center" }}><Icon name="Lock" size={12} /> 1 Muy mal · 3 Regular · 5 Muy bien — {responses.length} de {totalInRoom} puntuaron</p>
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Eye" disabled={busy || responses.length === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "rcompare", 2); setBusy(false); }}>Revelar comparativo ({responses.length})</Button>
        : submitted
          ? <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Esperá a que el facilitador revele el radar.</p>
          : <Button full size="lg" icon="Send" disabled={busy} onClick={async () => { setBusy(true); const res = await submitPulse(sessionId, Object.fromEntries(frDims.map((d) => [d.key, to100(draft[d.key] ?? 3)]))); setBusy(false); if (!res.error) setSubmitted(true); }}>{busy ? "Enviando…" : "Enviar mi puntuación"}</Button>;
    } else if (step === "rcompare") {
      sub = prevRadar ? "Base (punteado) vs. hoy. ¿Qué se movió desde que arrancamos?" : "El radar del equipo hoy.";
      content = (
        <Card pad={24}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontWeight: 700 }}>Evolución del equipo</span>
            <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
              {prevRadar && <span className="muted" style={{ fontSize: "var(--t-xs)", display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 14, height: 0, borderTop: "2px dashed var(--violet)" }} /> base {to5(baseOverall).toFixed(1)}</span>}
              <Pill color="var(--success)" bg="var(--success-bg)" icon="Eye">{to5(frOverall).toFixed(1)}/5</Pill>
            </span>
          </div>
          <PulseRadar values={frAvg} dims={frDims} size={330} compare={prevRadar?.avg} />
          {prevRadar && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
              {frDims.map((d) => { const dl = delta(d.key); if (dl == null) return null; const up = dl >= 0.3, down = dl <= -0.3; return (
                <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--t-xs)" }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, fontWeight: 600 }}>{d.label}</span>
                  <span className="num muted">{to5(prevRadar.avg[d.key]).toFixed(1)} → {to5(frAvg[d.key]).toFixed(1)}</span>
                  <span className="num" style={{ fontWeight: 800, width: 44, textAlign: "right", color: up ? "var(--green)" : down ? "var(--risk)" : "var(--ink-3)" }}>{dl >= 0 ? "+" : ""}{dl.toFixed(1)}</span>
                </div>
              ); })}
            </div>
          )}
          {prevRadar && (ups.length > 0 || downs.length > 0) && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 6, fontSize: "var(--t-sm)" }}>
              {ups[0] && <div><Icon name="TrendingUp" size={14} style={{ color: "var(--success)" }} /> <b>Subió:</b> {ups.slice(0, 3).map((m) => m.d.label).join(" · ")}</div>}
              {downs[0] && <div><Icon name="TrendingDown" size={14} style={{ color: "var(--risk)" }} /> <b>Bajó:</b> {downs.slice(0, 3).map((m) => m.d.label).join(" · ")} <span className="muted">→ ¿la prueba tiene algo que ver?</span></div>}
            </div>
          )}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "rtalk", 3); setBusy(false); }}>Conversar los movimientos</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Miren qué subió y qué bajó.</p>;
    } else {
      sub = "¿Qué explica los movimientos? ¿La prueba tiene que ver?";
      content = (
        <Card pad={20}>
          {prevRadar && (
            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              {ups[0] && <span style={{ fontSize: "var(--t-xs)", padding: "5px 10px", borderRadius: "var(--r-full)", background: "var(--success-bg)", color: "var(--green)", fontWeight: 700 }}>↑ {ups[0].d.label}</span>}
              {downs[0] && <span style={{ fontSize: "var(--t-xs)", padding: "5px 10px", borderRadius: "var(--r-full)", background: "var(--risk-bg)", color: "var(--risk)", fontWeight: 700 }}>↓ {downs[0].d.label}</span>}
            </div>
          )}
          <div className="eyebrow" style={{ marginBottom: 6 }}>Qué nos llevamos</div>
          {isFacil
            ? <textarea defaultValue={(session.result.frNote as string) ?? ""} onBlur={(e) => patchResult({ frNote: e.target.value.trim() })} rows={3} placeholder="Lo que el equipo entiende de los movimientos…" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-sm)", outline: "none", lineHeight: 1.5, resize: "vertical" }} />
            : <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.55, color: (session.result.frNote as string) ? "var(--ink-0)" : "var(--ink-3)" }}>{(session.result.frNote as string) || "El facilitador está tomando nota…"}</p>}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Check" disabled={busy} onClick={frFinish}>{busy ? "Guardando…" : "Cerrar y guardar el radar"}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Compartí cómo ves los movimientos.</p>;
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: 640 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ ¿QUÉ NOS ESTÁ FRENANDO? · mapear, clasificar y destrabar (48hs) ════════
  if (session.type === "blocking") {
    const obs = allCards.filter((c) => c.columnKey === "obs");
    const obsCount = counts["obs"] ?? 0;
    const priorBlockers = (initiative?.data?.follow?.blockers as string[] | undefined) ?? [];
    const BL_CATS = [
      { k: "internal", label: "🟢 Internos", desc: "depende de nosotros", color: "var(--success)" },
      { k: "system", label: "🟡 Del sistema", desc: "procesos, otras áreas, herramientas", color: "var(--warning)" },
      { k: "external", label: "⚪ Externos", desc: "fuera de nuestro alcance", color: "#94A3B8" },
    ];
    const blCat = (session.result.blCat as Record<string, string>) ?? {};
    const cycleBlCat = (id: string) => { const order = BL_CATS.map((c) => c.k); const cur = blCat[id]; const next = cur ? order[(order.indexOf(cur) + 1) % order.length] : order[0]; patchResult({ blCat: { ...((resultRef.current.blCat as Record<string, string>) ?? {}), [id]: next } }); };
    const myBlIds = ((inputs.find((x) => x.userId === user.id && x.key === "blv")?.value as { ids?: string[] } | undefined)?.ids) ?? [];
    const blVotesOf = (id: string) => inputs.filter((x) => x.key === "blv").reduce((a, x) => a + (((x.value as { ids?: string[] }).ids ?? []).includes(id) ? 1 : 0), 0);
    const toggleBlVote = (id: string) => { const cur = new Set(myBlIds); if (cur.has(id)) cur.delete(id); else if (cur.size < 2) cur.add(id); tapInput("blv", { ids: [...cur] }); };
    const blVoters = new Set(inputs.filter((x) => x.key === "blv" && ((x.value as { ids?: string[] }).ids ?? []).length).map((x) => x.voterKey)).size;
    const topObs = [...obs].sort((a, b) => blVotesOf(b.id) - blVotesOf(a.id)).slice(0, 3);
    const blPlan = (session.result.blPlan as Record<string, { text?: string; who?: string; due?: string }>) ?? {};
    const setPlan = (id: string, patch: Record<string, string>) => patchResult({ blPlan: { ...((resultRef.current.blPlan as Record<string, unknown>) ?? {}), [id]: { ...(blPlan[id] ?? {}), ...patch } } });
    const addObs = async () => { const t = (cardDraft.obs ?? "").trim(); if (!t) return; await addCard(sessionId, "obs", t, true); setCardDraft((d) => ({ ...d, obs: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
    const blFinish = async () => {
      setBusy(true);
      const newActions = topObs.map((o) => ({ text: blPlan[o.id]?.text ?? "", who: blPlan[o.id]?.who ?? "" })).filter((a) => a.text.trim());
      await finalizeSession(session, {
        pulseAvg: avg, cardCount: obs.length,
        summaryText: `Destrabe: ${obs.length} obstáculos · ${newActions.length} acciones a 48hs`,
        dataKey: "follow",
        dataValue: { blockers: topObs.map((o) => o.text), newActions },
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (step === "blframe") {
      sub = "Vamos a mirar de frente lo que nos está frenando.";
      content = (
        <Card pad={26} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🚧</div>
          <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, lineHeight: 1.4 }}>¿Qué nos está frenando<br />para que la prueba avance?</h2>
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 12, lineHeight: 1.5 }}>Los mapeamos en anónimo, los clasificamos por tipo, priorizamos y salimos con un plan de 48 horas.</p>
          {priorBlockers.length > 0 && (
            <div style={{ marginTop: 16, textAlign: "left", background: "var(--warning-bg)", border: "1px solid color-mix(in srgb, var(--warning) 35%, transparent)", borderRadius: "var(--r-md)", padding: "12px 14px" }}>
              <div className="eyebrow" style={{ color: "var(--warning)", marginBottom: 6 }}>Obstáculos del último check-in</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: "var(--t-sm)", lineHeight: 1.6 }}>{priorBlockers.map((b, i) => <li key={i}>{b}</li>)}</ul>
            </div>
          )}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "blmap", 1); setBusy(false); }}>Mapear los obstáculos</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador encuadra el ejercicio.</p>;
    } else if (step === "blmap") {
      sub = "¿Qué te está frenando? — anónimo, todas las que se te ocurran.";
      content = (
        <Card pad={20}>
          <HiddenDots n={obsCount} label="obstáculos · ocultos hasta revelar" color="var(--warning)" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
            {myCards.filter((c) => c.columnKey === "obs").map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--warning)", borderRadius: "var(--r-md)", padding: "9px 11px", fontSize: "var(--t-sm)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 5 }}>· tuya</span></div>)}
          </div>
          {!isFacil && (
            <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
              <input value={cardDraft.obs ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, obs: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addObs()} placeholder="Nos está frenando…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" }} />
              <Button size="sm" icon="Plus" onClick={addObs}>Sumar</Button>
            </div>
          )}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Eye" disabled={busy || obsCount === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "blclass", 2); setBusy(false); }}>Revelar y clasificar ({obsCount})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Anotá lo que te frena. El facilitador revela cuando todos terminen.</p>;
    } else if (step === "blclass") {
      wide = true;
      sub = isFacil ? "Tocá cada obstáculo para clasificarlo por tipo." : "El facilitador clasifica cada obstáculo por tipo.";
      content = (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 14 }}>
            {BL_CATS.map((c) => <span key={c.k} title={c.desc} style={{ fontSize: "var(--t-xs)", padding: "4px 10px", borderRadius: "var(--r-full)", background: `color-mix(in srgb, ${c.color} 12%, var(--card))`, border: `1px solid ${c.color}`, color: c.color, fontWeight: 700 }}>{c.label}</span>)}
          </div>
          <div className="cards-cols" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {BL_CATS.map((cat) => (
              <div key={cat.k} style={{ background: "var(--bg-2)", border: `1px solid color-mix(in srgb, ${cat.color} 35%, var(--line))`, borderTop: `3px solid ${cat.color}`, borderRadius: "var(--r-lg)", padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 8 }}>{cat.label} <span className="num muted">{obs.filter((o) => blCat[o.id] === cat.k).length}</span></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {obs.filter((o) => blCat[o.id] === cat.k).map((o) => (
                    <button key={o.id} disabled={!isFacil} onClick={() => cycleBlCat(o.id)} style={{ textAlign: "left", background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${cat.color}`, borderRadius: "var(--r-sm)", padding: "7px 9px", fontSize: "var(--t-xs)", lineHeight: 1.4, cursor: isFacil ? "pointer" : "default" }}>{o.text}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {obs.some((o) => !blCat[o.id]) && (
            <Card pad={12} style={{ marginTop: 12 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Sin clasificar ({obs.filter((o) => !blCat[o.id]).length})</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px,1fr))", gap: 7 }}>
                {obs.filter((o) => !blCat[o.id]).map((o) => <button key={o.id} disabled={!isFacil} onClick={() => cycleBlCat(o.id)} title={isFacil ? "Tocar para clasificar" : undefined} style={{ textAlign: "left", background: "var(--card)", border: "1px dashed var(--line-2)", borderRadius: "var(--r-sm)", padding: "7px 9px", fontSize: "var(--t-xs)", lineHeight: 1.4, cursor: isFacil ? "pointer" : "default" }}>{o.text}</button>)}
              </div>
            </Card>
          )}
        </>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "blvote", 3); setBusy(false); }}>Priorizar los más urgentes</Button>
        : null;
    } else if (step === "blvote") {
      const shown = !!session.result.voteShown;
      sub = shown ? "Los obstáculos a destrabar primero." : "¿Cuáles nos frenan más? 2 puntos por persona.";
      const max = Math.max(1, ...obs.map((o) => blVotesOf(o.id)));
      const ranked = [...obs].sort((a, b) => blVotesOf(b.id) - blVotesOf(a.id));
      content = (
        <>
          {!shown && !isFacil && <div style={{ textAlign: "center", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><span className="muted" style={{ fontSize: "var(--t-sm)" }}>Tus puntos:</span>{Array.from({ length: 2 }).map((_, i) => <span key={i} style={{ width: 16, height: 16, borderRadius: 99, background: i < (2 - myBlIds.length) ? "var(--warning)" : "var(--card-2)", border: `1px solid ${i < (2 - myBlIds.length) ? "var(--warning)" : "var(--line-2)"}` }} />)}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(shown ? ranked : obs).map((o, i) => { const v = blVotesOf(o.id); const on = myBlIds.includes(o.id); const top = shown && i < 3 && v > 0; const cat = BL_CATS.find((c) => c.k === blCat[o.id]); return (
              <button key={o.id} disabled={isFacil || shown} onClick={() => toggleBlVote(o.id)}
                style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: top ? "color-mix(in srgb, var(--warning) 9%, var(--card))" : on && !shown ? "color-mix(in srgb, var(--warning) 6%, var(--card))" : "var(--card)", border: `1px solid ${top || (on && !shown) ? "var(--warning)" : "var(--line)"}`, borderRadius: "var(--r-md)", cursor: isFacil || shown ? "default" : "pointer" }}>
                {shown && <span className="num" style={{ width: 18, fontWeight: 700, color: i < 3 ? "var(--warning)" : "var(--ink-3)" }}>{i + 1}</span>}
                {cat && <span style={{ width: 8, height: 8, borderRadius: 99, background: cat.color, flexShrink: 0 }} />}
                <span style={{ flex: 1, fontSize: "var(--t-sm)", fontWeight: 600 }}>{o.text}</span>
                {!shown && on && <Icon name="CheckCircle2" size={15} style={{ color: "var(--warning)" }} />}
                {shown && <div style={{ width: 70 }}><Bar value={(v / max) * 100} color={i < 3 ? "var(--warning)" : "var(--violet)"} height={6} /></div>}
                {shown && <span className="num" style={{ fontWeight: 700, width: 18, textAlign: "right" }}>{v}</span>}
              </button>
            ); })}
          </div>
          {!shown && <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)", marginTop: 12 }}><Icon name="EyeOff" size={13} /> {blVoters} de {totalInRoom} votaron</p>}
        </>
      );
      controls = isFacil
        ? (shown
          ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "blplan", 4); setBusy(false); }}>Plan de destrabe</Button>
          : <Button full size="lg" icon="Eye" disabled={busy || blVoters === 0} onClick={() => setResult(sessionId, { voteShown: true })}>Mostrar prioridades ({blVoters}/{totalInRoom})</Button>)
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Repartí tus 2 puntos.</p>;
    } else {
      sub = "Para cada obstáculo: qué hacemos en las próximas 48 horas y quién.";
      content = (
        <>
          <div style={{ padding: "10px 14px", marginBottom: 14, background: "color-mix(in srgb, var(--st-follow) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--st-follow) 28%, transparent)", borderRadius: "var(--r-md)", fontSize: "var(--t-sm)", lineHeight: 1.5 }}>
            <Icon name="Clock" size={14} style={{ color: "var(--st-follow)" }} /> Acciones chicas y concretas para los próximos 2 días. No planes largos: lo mínimo para destrabar.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {topObs.map((o, i) => (
              <Card key={o.id} pad={16}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><span className="num" style={{ width: 22, height: 22, borderRadius: 99, background: "var(--st-follow)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 11 }}>{i + 1}</span><b style={{ fontSize: "var(--t-sm)" }}>{o.text}</b></div>
                {isFacil ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input defaultValue={blPlan[o.id]?.text ?? ""} onBlur={(e) => setPlan(o.id, { text: e.target.value })} placeholder="En 48hs vamos a…" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" }} />
                    <select defaultValue={blPlan[o.id]?.who ?? ""} onChange={(e) => setPlan(o.id, { who: e.target.value })} style={{ background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" }}>
                      <option value="">Responsable…</option>
                      {(team?.members ?? []).map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div style={{ fontSize: "var(--t-sm)" }}>{blPlan[o.id]?.text ? <>{blPlan[o.id]?.text}{blPlan[o.id]?.who ? ` · ${blPlan[o.id]?.who}` : ""}</> : <span className="muted">El facilitador está definiendo el destrabe…</span>}</div>
                )}
              </Card>
            ))}
            {!topObs.length && <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>Sin obstáculos votados.</p>}
          </div>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Check" disabled={busy} onClick={blFinish}>{busy ? "Guardando…" : "Cerrar y guardar el plan"}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador define el plan de destrabe.</p>;
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: wide ? 860 : 620 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ ¿CÓMO PODRÍAMOS? · lluvia de ideas → top 3 ════════
  if (session.type === "hmw") {
    const rootCause = (initiative?.data?.focus?.rootCause as string) || (initiative?.data?.focus?.cause as string) || "";
    const hmwQ = (session.result.hmwQ as string) ?? "";
    const ideas = allCards.filter((c) => c.columnKey === "idea");
    const ideaCount = counts["idea"] ?? 0;
    const HMW_DOTS = 3;
    const hmwRemaining = HMW_DOTS - myVoteCount;
    const hmwVoters = new Set(votes.map((v) => v.voterKey)).size;
    const hmwShown = !!session.result.voteShown;
    const addIdea = async () => { const t = (cardDraft.idea ?? "").trim(); if (!t) return; await addCard(sessionId, "idea", t, true); setCardDraft((d) => ({ ...d, idea: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
    const hmwGroup = async () => { if (!sel.length) return; setBusy(true); const id = await createCluster(sessionId, `Idea ${clusters.length + 1}`); if (id) for (const cid of sel) await assignCardToCluster(cid, id); setSel([]); setBusy(false); load(); };
    const HmwBanner = hmwQ ? (
      <div style={{ padding: "10px 14px", marginBottom: 14, background: "color-mix(in srgb, var(--st-proof) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--st-proof) 32%, transparent)", borderRadius: "var(--r-md)", fontSize: "var(--t-md)", fontWeight: 700, lineHeight: 1.45, textAlign: "center" }}>{hmwQ}</div>
    ) : null;
    const hmwFinish = async () => {
      setBusy(true);
      const top = ranked.slice(0, 3).map((c) => c.name);
      const looseTop = !clusters.length ? ideas.slice(0, 3).map((c) => c.text) : [];
      const finalists = (top.length ? top : looseTop);
      await finalizeSession(session, {
        pulseAvg: avg, cardCount: ideas.length,
        summaryText: `${ideas.length} ideas · top: ${finalists[0] ?? "—"}`,
        dataKey: "proof", dataValue: { hmw: hmwQ, finalists },
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (step === "hmwframe") {
      sub = "Formulamos la pregunta que va a abrir las ideas.";
      content = (
        <Card pad={22}>
          {rootCause && <div style={{ padding: "10px 12px", marginBottom: 14, background: "color-mix(in srgb, var(--st-focus) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--st-focus) 28%, transparent)", borderRadius: "var(--r-md)" }}><div className="eyebrow" style={{ color: "var(--st-focus)", marginBottom: 3 }}>La causa raíz {initiative?.data?.focus?.rootCause ? "(de Foco)" : ""}</div><div style={{ fontSize: "var(--t-sm)", fontWeight: 600 }}>{rootCause}</div></div>}
          <div className="eyebrow" style={{ marginBottom: 6 }}>¿Cómo podríamos…?</div>
          {isFacil
            ? <textarea defaultValue={hmwQ || "¿Cómo podríamos … para que …?"} onBlur={(e) => patchResult({ hmwQ: e.target.value.trim() })} rows={2} style={{ width: "100%", background: "var(--card)", border: "1px solid color-mix(in srgb, var(--st-proof) 45%, var(--line-2))", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-md)", fontWeight: 600, outline: "none", lineHeight: 1.5, resize: "vertical" }} />
            : <p style={{ fontSize: "var(--t-md)", fontWeight: 600, lineHeight: 1.5, color: hmwQ ? "var(--ink-0)" : "var(--ink-3)" }}>{hmwQ || "El facilitador está formulando la pregunta…"}</p>}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || !hmwQ.trim()} onClick={async () => { setBusy(true); await setStep(sessionId, "hmwwrite", 1); setBusy(false); }}>Empezar la ideación</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador formula la pregunta.</p>;
    } else if (step === "hmwwrite") {
      sub = "En silencio: tirá todas las ideas que se te ocurran. Quedan ocultas hasta revelar.";
      content = (
        <>
          {HmwBanner}
          <Card pad={20}>
            <HiddenDots n={ideaCount} label="ideas · ocultas hasta revelar" color="var(--st-proof)" />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
              {myCards.filter((c) => c.columnKey === "idea").map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-proof)", borderRadius: "var(--r-md)", padding: "9px 11px", fontSize: "var(--t-sm)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 5 }}>· tuya</span></div>)}
            </div>
            {!isFacil && (
              <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
                <input value={cardDraft.idea ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, idea: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addIdea()} placeholder="Una idea…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" }} />
                <Button size="sm" icon="Plus" onClick={addIdea}>Sumar</Button>
              </div>
            )}
          </Card>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Eye" disabled={busy || ideaCount === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "hmwreveal", 2); setBusy(false); }}>Revelar ideas ({ideaCount})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Tirá tantas ideas como quieras. El facilitador revela cuando todos terminen.</p>;
    } else if (step === "hmwreveal" || step === "hmwread") {
      wide = true;
      sub = step === "hmwreveal" ? "¡Todas las ideas a la vista!" : "Lectura express: cada uno lee sus ideas en voz alta (30s).";
      content = <>{HmwBanner}<RevealHeader n={ideas.length} label="ideas" color="var(--st-proof)" /><RevealPop><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 10 }}>{ideas.map((c, i) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-proof)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)", lineHeight: 1.4, animation: `gl-pop-strong .5s var(--spring) ${(i * 0.04).toFixed(2)}s both` }}>{c.text}</div>)}</div></RevealPop></>;
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, step === "hmwreveal" ? "hmwread" : "hmwcluster", step === "hmwreveal" ? 3 : 4); setBusy(false); }}>{step === "hmwreveal" ? "Lectura express" : "Agrupar ideas"}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>{step === "hmwreveal" ? "Mirá todas las ideas." : "Leé las tuyas en voz alta, 30 segundos."}</p>;
    } else if (step === "hmwcluster") {
      wide = true;
      sub = isFacil ? "Agrupá las ideas que van juntas. Después votamos." : "El facilitador agrupa las ideas afines.";
      content = (
        <>
          {HmwBanner}
          <div className="cluster-grid" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18, alignItems: "start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span className="eyebrow">Sueltas ({loose.filter((c) => c.columnKey === "idea").length})</span>
                {isFacil && sel.length > 0 && <Button size="sm" icon="Group" disabled={busy} onClick={hmwGroup}>Agrupar {sel.length}</Button>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px,1fr))", gap: 10 }}>
                {loose.filter((c) => c.columnKey === "idea").map((c) => {
                  const on = sel.includes(c.id);
                  const st: React.CSSProperties = { textAlign: "left", background: on ? "var(--green-soft)" : "var(--card)", border: "1px solid " + (on ? "var(--green)" : "var(--line)"), borderLeft: "3px solid var(--st-proof)", borderRadius: "var(--r-md)", padding: "10px 11px", fontSize: "var(--t-sm)", lineHeight: 1.4 };
                  return isFacil
                    ? <button key={c.id} onClick={() => setSel((s) => (on ? s.filter((x) => x !== c.id) : [...s, c.id]))} style={st}>{c.text}</button>
                    : <div key={c.id} style={st}>{c.text}</div>;
                })}
                {!loose.filter((c) => c.columnKey === "idea").length && <div style={{ gridColumn: "1/-1", color: "var(--ink-3)", fontSize: "var(--t-sm)", padding: 16, textAlign: "center" }}>Todas agrupadas.</div>}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span className="eyebrow">Grupos ({clusters.length})</span>
              {clusters.map((cl) => (
                <Card key={cl.id} pad={12}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ color: "var(--st-proof)" }}><Icon name="Layers" size={15} /></span>
                    {isFacil
                      ? <input defaultValue={cl.name} onBlur={(e) => { if (e.target.value.trim()) renameCluster(cl.id, e.target.value.trim()); }} style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", color: "var(--ink-0)", fontWeight: 700, fontSize: "var(--t-sm)", outline: "none", borderBottom: "1px dashed color-mix(in srgb, var(--st-proof) 55%, transparent)" }} />
                      : <span style={{ flex: 1, fontWeight: 700, fontSize: "var(--t-sm)" }}>{cl.name}</span>}
                    {isFacil && <button onClick={() => deleteCluster(cl.id)} style={{ color: "var(--ink-3)" }}><Icon name="Trash2" size={14} /></button>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {cardsOf(cl.id).map((c) => <div key={c.id} style={{ fontSize: "var(--t-xs)", color: "var(--ink-1)", padding: "5px 7px", background: "var(--card-2)", borderRadius: "var(--r-sm)" }}>{c.text}</div>)}
                  </div>
                </Card>
              ))}
              {!clusters.length && <div style={{ border: "1px dashed var(--line-2)", borderRadius: "var(--r-md)", padding: 18, textAlign: "center", color: "var(--ink-3)", fontSize: "var(--t-sm)" }}>{isFacil ? "Seleccioná ideas y agrupalas." : "Sin grupos aún."}</div>}
            </div>
          </div>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "hmwvote", 5); setBusy(false); }}>Votar las mejores</Button>
        : null;
    } else {
      sub = hmwShown ? "Las 3 ideas más votadas pasan a ¿Cuál elegimos?." : "¿Cuáles probarías? 3 puntos por persona.";
      const voteItems = clusters.length ? clusters : ideas.map((c) => ({ id: c.id, name: c.text }));
      const max = Math.max(1, ...voteItems.map((c) => votesByCluster[c.id] ?? 0));
      const rankedItems = [...voteItems].sort((a, b) => (votesByCluster[b.id] ?? 0) - (votesByCluster[a.id] ?? 0));
      content = (
        <>
          {HmwBanner}
          {hmwShown ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {rankedItems.map((cl, i) => (
                <div key={cl.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="num" style={{ width: 20, fontWeight: 700, color: i < 3 ? "var(--st-proof)" : "var(--ink-3)" }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "var(--t-sm)", marginBottom: 5 }}>{cl.name}{i < 3 && <Pill color="var(--st-proof)" bg="color-mix(in srgb, var(--st-proof) 14%, transparent)" icon="Star">finalista</Pill>}</div>
                    <Bar value={((votesByCluster[cl.id] ?? 0) / max) * 100} color={i < 3 ? "var(--st-proof)" : "var(--violet)"} height={7} />
                  </div>
                  <span className="num" style={{ fontWeight: 700, width: 22, textAlign: "right" }}>{votesByCluster[cl.id] ?? 0}</span>
                </div>
              ))}
            </div>
          ) : (
            <>
              {!isFacil && <div style={{ textAlign: "center", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><span className="muted" style={{ fontSize: "var(--t-sm)" }}>Tus puntos:</span>{Array.from({ length: HMW_DOTS }).map((_, i) => <span key={i} style={{ width: 16, height: 16, borderRadius: 99, background: i < hmwRemaining ? "var(--st-proof)" : "var(--card-2)", border: `1px solid ${i < hmwRemaining ? "var(--st-proof)" : "var(--line-2)"}` }} />)}</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {voteItems.map((cl) => { const mine = votes.filter((v) => v.userId === user.id && v.clusterId === cl.id).length; return (
                  <button key={cl.id} onClick={() => { if (!isFacil && hmwRemaining > 0) castVote(cl.id, 1, hmwRemaining); }}
                    style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", background: mine > 0 ? "color-mix(in srgb, var(--st-proof) 8%, var(--card))" : "var(--card)", border: `1px solid ${mine > 0 ? "color-mix(in srgb, var(--st-proof) 45%, var(--line))" : "var(--line)"}`, borderRadius: "var(--r-md)", cursor: isFacil ? "default" : "pointer" }}>
                    <div style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: "var(--t-sm)" }}>{cl.name}</div>
                    {!isFacil && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{Array.from({ length: mine }).map((_, k) => <span key={k} style={{ width: 14, height: 14, borderRadius: 99, background: "var(--st-proof)" }} />)}{mine > 0 && <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); castVote(cl.id, -1, hmwRemaining); }} style={{ display: "inline-flex", color: "var(--ink-3)", padding: 3 }}><Icon name="X" size={13} /></span>}</span>}
                  </button>
                ); })}
              </div>
              <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)", marginTop: 12 }}><Icon name="EyeOff" size={13} /> {hmwVoters} de {totalInRoom} votaron</p>
            </>
          )}
        </>
      );
      controls = isFacil
        ? (hmwShown
          ? <Button full size="lg" icon="Check" disabled={busy} onClick={hmwFinish}>{busy ? "Guardando…" : "Cerrar · top 3 a ¿Cuál elegimos?"}</Button>
          : <Button full size="lg" icon="Eye" disabled={busy || hmwVoters === 0} onClick={() => setResult(sessionId, { voteShown: true })}>Mostrar votación ({hmwVoters}/{totalInRoom})</Button>)
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Repartí tus {HMW_DOTS} puntos.</p>;
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

  // ════════ ¿CUÁL ELEGIMOS? · matriz impacto/esfuerzo + ICE ════════
  if (session.type === "ideachoose") {
    const fromHmw = (initiative?.data?.proof?.finalists as string[] | undefined) ?? [];
    const icIdeas = (session.result.icIdeas as string[]) ?? fromHmw;
    const icPos = (session.result.icPos as Record<number, { x: number; y: number }>) ?? {};
    const posOf = (i: number) => icPos[i] ?? { x: 0.5, y: 0.18 + (i % 5) * 0.14 };
    const iceAvg = (i: number) => {
      const xs = inputs.filter((x) => x.key === `ice:${i}`).map((x) => x.value as { imp?: number; conf?: number; eas?: number });
      if (!xs.length) return null;
      const a = (k: "imp" | "conf" | "eas") => xs.reduce((s, v) => s + (v[k] ?? 5), 0) / xs.length;
      return { imp: a("imp"), conf: a("conf"), eas: a("eas"), score: (a("imp") + a("conf") + a("eas")) / 3, n: xs.length };
    };
    const myIce = (i: number) => (inputs.find((x) => x.userId === user.id && x.key === `ice:${i}`)?.value as { imp?: number; conf?: number; eas?: number } | undefined) ?? {};
    const iceRaters = new Set(inputs.filter((x) => x.key.startsWith("ice:")).map((x) => x.voterKey)).size;
    const iceWinner = icIdeas.length ? icIdeas.map((_, i) => ({ i, s: iceAvg(i)?.score ?? -1 })).reduce((b, x) => (x.s > b.s ? x : b)).i : 0;
    const icChosen = session.result.icChosen as number | undefined;
    const QUAD = [
      { x: 0, y: 0, w: 50, h: 50, c: "var(--green)", label: "alto impacto · bajo esfuerzo" },
      { x: 50, y: 0, w: 50, h: 50, c: "#EAB308", label: "alto impacto · alto esfuerzo" },
      { x: 0, y: 50, w: 50, h: 50, c: "#F97316", label: "bajo impacto · bajo esfuerzo" },
      { x: 50, y: 50, w: 50, h: 50, c: "var(--risk)", label: "bajo impacto · alto esfuerzo" },
    ];
    const padXY = (el: HTMLElement, cx: number, cy: number) => { const r = el.getBoundingClientRect(); return { x: Math.min(1, Math.max(0, (cx - r.left) / r.width)), y: Math.min(1, Math.max(0, (cy - r.top) / r.height)) }; };
    const icFinish = async () => {
      setBusy(true);
      const chosen = icChosen ?? iceWinner;
      await finalizeSession(session, {
        pulseAvg: avg,
        summaryText: `Idea elegida: ${icIdeas[chosen] ?? "—"}`,
        dataKey: "proof", dataValue: { chosenIdea: icIdeas[chosen] ?? "" },
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (step === "icpresent") {
      sub = isFacil ? "Las ideas finalistas. Podés ajustar la lista antes de la matriz." : "Las ideas finalistas que vamos a comparar.";
      content = (
        <Card pad={20}>
          {!fromHmw.length && isFacil && <p className="muted" style={{ fontSize: "var(--t-xs)", marginBottom: 10 }}>No vinieron de ¿Cómo podríamos?. Cargalas a mano.</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {icIdeas.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
                <span className="num" style={{ color: "var(--st-proof)", fontWeight: 800 }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: "var(--t-sm)", fontWeight: 600 }}>{t}</span>
                {isFacil && <button onClick={() => patchResult({ icIdeas: icIdeas.filter((_, k) => k !== i) })} style={{ color: "var(--ink-3)" }}><Icon name="X" size={14} /></button>}
              </div>
            ))}
            {!icIdeas.length && <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>Sin ideas todavía.</p>}
          </div>
          {isFacil && (
            <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
              <input value={cardDraft.icadd ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, icadd: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter" && (cardDraft.icadd ?? "").trim()) { patchResult({ icIdeas: [...icIdeas, cardDraft.icadd!.trim()] }); setCardDraft((d) => ({ ...d, icadd: "" })); } }} placeholder="Agregar idea…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "8px 10px", fontSize: "var(--t-sm)", outline: "none" }} />
              <Button size="sm" icon="Plus" onClick={() => { if ((cardDraft.icadd ?? "").trim()) { patchResult({ icIdeas: [...icIdeas, cardDraft.icadd!.trim()] }); setCardDraft((d) => ({ ...d, icadd: "" })); } }}>Sumar</Button>
            </div>
          )}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || icIdeas.length < 2} onClick={async () => { setBusy(true); if (!session.result.icIdeas) await setResult(sessionId, { icIdeas }); await setStep(sessionId, "icmatrix", 1); setBusy(false); }}>Ubicar en la matriz ({icIdeas.length})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>En un momento las ubican en la matriz.</p>;
    } else if (step === "icmatrix") {
      wide = true;
      sub = isFacil ? "Arrastrá cada idea según su impacto y esfuerzo. La esquina verde es la zona ganadora." : "El equipo ubica las ideas por impacto y esfuerzo.";
      content = (
        <Card pad={16}>
          <div onPointerMove={(e) => { if (!icDrag) return; const c = padXY(e.currentTarget, e.clientX, e.clientY); setIcDrag({ ...icDrag, ...c }); }}
            onPointerUp={(e) => { if (!icDrag) return; const c = padXY(e.currentTarget, e.clientX, e.clientY); patchResult({ icPos: { ...((resultRef.current.icPos as Record<number, { x: number; y: number }>) ?? {}), [icDrag.i]: c } }); setIcDrag(null); }}
            style={{ position: "relative", width: "100%", aspectRatio: "3/2", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", overflow: "hidden", touchAction: isFacil ? "none" : "auto" }}>
            {QUAD.map((q, k) => <div key={k} style={{ position: "absolute", left: `${q.x}%`, top: `${q.y}%`, width: `${q.w}%`, height: `${q.h}%`, background: `color-mix(in srgb, ${q.c} 8%, transparent)` }} />)}
            <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--line-2)" }} />
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "var(--line-2)" }} />
            <span className="muted" style={{ position: "absolute", top: 6, left: 8, fontSize: 10 }}>IMPACTO ↑</span>
            <span className="muted" style={{ position: "absolute", bottom: 6, right: 8, fontSize: 10 }}>ESFUERZO →</span>
            <span style={{ position: "absolute", top: 6, left: "26%", fontSize: 9, color: "var(--green)", fontWeight: 800, transform: "translateX(-50%)" }}>★ ganá acá</span>
            {icIdeas.map((t, i) => {
              const dragging = icDrag?.i === i;
              const p = dragging ? { x: icDrag!.x, y: icDrag!.y } : posOf(i);
              return (
                <button key={i} disabled={!isFacil} title={t}
                  onPointerDown={(e) => { if (!isFacil) return; e.stopPropagation(); (e.currentTarget.parentElement as HTMLElement)?.setPointerCapture(e.pointerId); const c = padXY(e.currentTarget.parentElement as HTMLElement, e.clientX, e.clientY); setIcDrag({ i, ...c }); }}
                  style={{ position: "absolute", left: `${p.x * 100}%`, top: `${p.y * 100}%`, transform: "translate(-50%,-50%)", maxWidth: 150, display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: "var(--r-full)", background: "var(--st-proof)", color: "#fff", fontSize: "var(--t-xs)", fontWeight: 700, boxShadow: `0 0 ${dragging ? 16 : 8}px color-mix(in srgb, var(--st-proof) 60%, transparent)`, cursor: isFacil ? "grab" : "default", touchAction: "none", zIndex: dragging ? 3 : 1, lineHeight: 1.25 }}>
                  <span className="num" style={{ flexShrink: 0 }}>{i + 1}</span><span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t}</span>
                </button>
              );
            })}
          </div>
        </Card>
      );
      controls = isFacil
        ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Button full size="lg" icon="Check" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "icconfirm", 3); setBusy(false); }}>Hay una clara ganadora → elegir</Button>
            <Button full variant="secondary" icon="Scale" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "icice", 2); setBusy(false); }}>Hay debate → desempatar con ICE</Button>
          </div>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Sugerí posiciones por reacción/voz. El facilitador mueve las fichas.</p>;
    } else if (step === "icice") {
      sub = "Desempate ICE: puntuá cada idea (impacto · confianza · facilidad), del 1 al 10.";
      content = isFacil ? (
        <>
          <Card pad={20} style={{ marginBottom: 14 }}><div style={{ textAlign: "center" }}><div className="num" style={{ fontSize: "var(--t-2xl)", fontWeight: 800, color: "var(--green)" }}>{iceRaters}/{totalInRoom}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>puntuaron</div></div></Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {icIdeas.map((t, i) => { const a = iceAvg(i); const win = a && i === iceWinner; return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: win ? "color-mix(in srgb, var(--st-proof) 10%, var(--card))" : "var(--card)", border: `1px solid ${win ? "var(--st-proof)" : "var(--line)"}`, borderRadius: "var(--r-md)" }}>
                <span style={{ flex: 1, fontSize: "var(--t-sm)", fontWeight: 600 }}>{t}{win && <Pill color="var(--st-proof)" bg="color-mix(in srgb, var(--st-proof) 14%, transparent)" icon="Star">mayor ICE</Pill>}</span>
                <span className="num" style={{ fontWeight: 800, color: "var(--st-proof)", fontSize: "var(--t-lg)" }}>{a ? a.score.toFixed(1) : "—"}</span>
              </div>
            ); })}
          </div>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {icIdeas.map((t, i) => { const r = myIce(i); return (
            <Card key={i} pad={16}>
              <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 10 }}>{i + 1}. {t}</div>
              {([["imp", "Impacto"], ["conf", "Confianza"], ["eas", "Facilidad"]] as const).map(([k, lab]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ width: 76, fontSize: "var(--t-xs)", fontWeight: 600 }}>{lab}</span>
                  <input type="range" min={1} max={10} value={(r as Record<string, number>)[k] ?? 5} onChange={(e) => tapInput(`ice:${i}`, { ...r, [k]: Number(e.target.value) })} style={{ flex: 1, accentColor: "var(--st-proof)" }} />
                  <span className="num" style={{ width: 18, fontWeight: 800, color: "var(--st-proof)" }}>{(r as Record<string, number>)[k] ?? "—"}</span>
                </div>
              ))}
            </Card>
          ); })}
        </div>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || iceRaters === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "icconfirm", 3); setBusy(false); }}>Ver la elegida</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Puntuá las {icIdeas.length} ideas.</p>;
    } else {
      sub = "La idea que vamos a probar. El equipo confirma.";
      const chosen = icChosen ?? iceWinner;
      content = (
        <>
          <Card pad={24} style={{ textAlign: "center", border: "1.5px solid var(--st-proof)" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
            <div className="eyebrow" style={{ color: "var(--st-proof)", marginBottom: 6 }}>La idea elegida</div>
            <div style={{ fontSize: "var(--t-lg)", fontWeight: 800, lineHeight: 1.4 }}>{icIdeas[chosen] ?? "—"}</div>
            {iceAvg(chosen) && <div className="num muted" style={{ fontSize: "var(--t-sm)", marginTop: 6 }}>ICE {iceAvg(chosen)!.score.toFixed(1)}/10</div>}
          </Card>
          {isFacil && icIdeas.length > 1 && (
            <div style={{ marginTop: 12 }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>¿Otra? Elegí manualmente</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {icIdeas.map((t, i) => <button key={i} onClick={() => patchResult({ icChosen: i })} style={{ fontSize: "var(--t-xs)", padding: "6px 11px", borderRadius: "var(--r-full)", border: `1px solid ${i === chosen ? "var(--st-proof)" : "var(--line-2)"}`, background: i === chosen ? "color-mix(in srgb, var(--st-proof) 14%, var(--card))" : "var(--card)", color: i === chosen ? "var(--st-proof)" : "var(--ink-2)", fontWeight: 600 }}>{i + 1}. {t.length > 30 ? t.slice(0, 30) + "…" : t}</button>)}
              </div>
            </div>
          )}
        </>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Check" disabled={busy} onClick={icFinish}>{busy ? "Guardando…" : "Cerrar con esta idea"}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador confirma la idea elegida.</p>;
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: wide ? 760 : 600 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ ¿DÓNDE SE TRABA? · embudo adaptado a la variable ════════
  if (session.type === "whereblock") {
    const WB_DEFAULT = [
      { key: "wb0", label: "Entrada", hint: "¿Cómo llega una tarea al equipo?" },
      { key: "wb1", label: "Definición", hint: "¿Cómo se aclara qué hay que hacer?" },
      { key: "wb2", label: "Ejecución", hint: "¿Dónde aparece la traba?" },
      { key: "wb3", label: "Cierre", hint: "¿Cómo validamos antes de entregar?" },
    ];
    const wbStages = (session.result.wbStages as { key: string; label: string; hint: string }[]) ?? WB_DEFAULT;
    const wbVar = (session.result.wbVariable as string) || initiative?.title || "la variable elegida";
    const critVotes: Record<string, number> = {};
    inputs.filter((i) => i.key === "wbcrit").forEach((i) => { const k = (i.value as { k?: string }).k; if (k) critVotes[k] = (critVotes[k] ?? 0) + 1; });
    const totalCrit = Object.values(critVotes).reduce((a, b) => a + b, 0);
    const myCrit = (inputs.find((i) => i.userId === user.id && i.key === "wbcrit")?.value as { k?: string } | undefined)?.k;
    const winner = wbStages.reduce((best, s) => ((critVotes[s.key] ?? 0) > (critVotes[best.key] ?? 0) ? s : best), wbStages[0]);
    const winnerPct = totalCrit ? Math.round(((critVotes[winner.key] ?? 0) / totalCrit) * 100) : 0;
    const wbForm = (session.result.wbForm as string) ?? "";
    const vals = inputs.filter((i) => i.key === "wbval");
    const yes = vals.filter((v) => (v.value as { ok?: boolean }).ok).length;
    const adjust = vals.length - yes;
    const myVal = (inputs.find((i) => i.userId === user.id && i.key === "wbval")?.value as { ok?: boolean } | undefined)?.ok;
    const wbCount = (k: string) => counts[k] ?? 0;
    const wbTotal = wbStages.reduce((a, s) => a + wbCount(s.key), 0);
    const addWb = async (k: string) => { const t = (cardDraft[k] ?? "").trim(); if (!t) return; await addCard(sessionId, k, t, true); setCardDraft((d) => ({ ...d, [k]: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
    const VarChip = (
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: "var(--r-full)", background: "color-mix(in srgb, var(--st-focus) 12%, var(--card))", border: "1px solid color-mix(in srgb, var(--st-focus) 40%, transparent)", color: "var(--st-focus)", fontSize: "var(--t-xs)", fontWeight: 700 }}>
          <Icon name="Crosshair" size={13} /> Variable: {wbVar}
        </span>
      </div>
    );
    const wbFinish = async () => {
      setBusy(true);
      await finalizeSession(session, {
        pulseAvg: avg, cardCount: wbTotal,
        summaryText: `Traba en ${winner.label} (${winnerPct}%)`,
        dataKey: "focus", dataValue: { blockStage: winner.label, blockPct: winnerPct, blockFormulation: wbForm },
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (step === "wbsetup") {
      sub = isFacil ? "Adaptá el embudo a la variable: renombrá las etapas para que suenen al equipo." : "El facilitador está adaptando el embudo a la variable.";
      content = (
        <>
          {VarChip}
          <Card pad={20}>
            {isFacil && (
              <div style={{ marginBottom: 14 }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>La variable que trabajamos</div>
                <input defaultValue={wbVar} onBlur={(e) => { const v = e.target.value.trim(); if (v) patchResult({ wbVariable: v }); }} style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", fontWeight: 600, outline: "none" }} />
              </div>
            )}
            <div className="eyebrow" style={{ marginBottom: 8 }}>Las 4 etapas del embudo</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {wbStages.map((s, i) => (
                <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="num" style={{ width: 22, color: "var(--st-focus)", fontWeight: 800 }}>{i + 1}</span>
                  {isFacil
                    ? <input defaultValue={s.label} onBlur={(e) => { const v = e.target.value.trim(); if (v) patchResult({ wbStages: wbStages.map((x) => x.key === s.key ? { ...x, label: v } : x) }); }} style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "8px 10px", fontSize: "var(--t-sm)", fontWeight: 600, outline: "none" }} />
                    : <span style={{ flex: 1, fontWeight: 600, fontSize: "var(--t-sm)" }}>{s.label}</span>}
                  <span className="muted hide-sm" style={{ fontSize: "var(--t-xs)", maxWidth: 220 }}>{s.hint}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); if (!session.result.wbStages) await setResult(sessionId, { wbStages }); await setStep(sessionId, "wbcards", 1); setBusy(false); }}>Empezar la carga de observaciones</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>En un momento cargan observaciones.</p>;
    } else if (step === "wbcards") {
      wide = true;
      sub = `¿Qué pasa en cada etapa en relación a ${wbVar}? Anónimo, oculto hasta revelar.`;
      content = (
        <>
          {VarChip}
          <div className="cards-cols" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {wbStages.map((s, i) => {
              const mine = myCards.filter((c) => c.columnKey === s.key);
              return (
                <div key={s.key} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 12, display: "flex", flexDirection: "column", minHeight: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span className="num" style={{ color: "var(--st-focus)", fontWeight: 800, fontSize: "var(--t-xs)" }}>{i + 1}</span>
                    <span style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{s.label}</span>
                    <span className="num" style={{ marginLeft: "auto", fontSize: "var(--t-xs)", color: "var(--ink-2)" }} title="escritas · ocultas">🔒 {wbCount(s.key)}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 10, marginBottom: 8 }}>{s.hint}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                    {mine.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-focus)", borderRadius: "var(--r-sm)", padding: "7px 9px", fontSize: "var(--t-xs)" }}>{c.text}</div>)}
                    {!mine.length && <div style={{ color: "var(--ink-3)", fontSize: "var(--t-xs)", textAlign: "center", padding: 8 }}>{isFacil ? "Ocultas hasta revelar" : "Sumá lo tuyo…"}</div>}
                  </div>
                  {!isFacil && (
                    <div style={{ marginTop: 8, display: "flex", gap: 5 }}>
                      <input value={cardDraft[s.key] ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, [s.key]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addWb(s.key)} placeholder="Sumar…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "7px 9px", fontSize: "var(--t-xs)", outline: "none" }} />
                      <button onClick={() => addWb(s.key)} style={{ background: "var(--st-focus)", color: "#fff", borderRadius: "var(--r-sm)", padding: "0 10px", display: "grid", placeItems: "center" }}><Icon name="Plus" size={14} /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || wbTotal === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "wbvote", 2); setBusy(false); }}>Votar la etapa crítica ({wbTotal})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Sumá observaciones en las etapas donde veas algo.</p>;
    } else if (step === "wbvote") {
      const shown = !!session.result.wbVoteShown;
      sub = shown ? "El resultado: dónde se concentra la traba." : "¿En qué etapa se concentra más la traba? Una sola elección por persona.";
      content = (
        <>
          {VarChip}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {wbStages.map((s) => {
              const v = critVotes[s.key] ?? 0;
              const pct = totalCrit ? Math.round((v / totalCrit) * 100) : 0;
              const isWin = shown && s.key === winner.key && totalCrit > 0;
              const on = myCrit === s.key;
              return (
                <button key={s.key} disabled={isFacil || shown} onClick={() => tapInput("wbcrit", { k: s.key })}
                  style={{ width: "100%", textAlign: "left", padding: "13px 14px", background: isWin ? "color-mix(in srgb, var(--st-focus) 12%, var(--card))" : on && !shown ? "color-mix(in srgb, var(--st-focus) 8%, var(--card))" : "var(--card)", border: `1px solid ${isWin || (on && !shown) ? "var(--st-focus)" : "var(--line)"}`, borderRadius: "var(--r-md)", cursor: isFacil || shown ? "default" : "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: "var(--t-sm)" }}>{s.label}{isWin && <Pill color="var(--st-focus)" bg="color-mix(in srgb, var(--st-focus) 14%, transparent)" icon="Crosshair">etapa crítica</Pill>}</span>
                    {!shown && on && <Icon name="CheckCircle2" size={16} style={{ color: "var(--st-focus)" }} />}
                    {shown && <span className="num" style={{ fontWeight: 800, color: isWin ? "var(--st-focus)" : "var(--ink-2)" }}>{pct}%</span>}
                  </div>
                  {shown && <div style={{ marginTop: 7 }}><Bar value={pct} color={isWin ? "var(--st-focus)" : "var(--violet)"} height={7} /></div>}
                </button>
              );
            })}
          </div>
          {!shown && <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)", marginTop: 12 }}><Icon name="EyeOff" size={13} /> {totalCrit} de {totalInRoom} votaron</p>}
        </>
      );
      controls = isFacil
        ? (shown
          ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "wbdeep", 3); setBusy(false); }}>Profundizar en {winner.label}</Button>
          : <Button full size="lg" icon="Eye" disabled={busy || totalCrit === 0} onClick={() => setResult(sessionId, { wbVoteShown: true })}>Mostrar resultado ({totalCrit}/{totalInRoom})</Button>)
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Elegí una etapa. El facilitador muestra el resultado.</p>;
    } else if (step === "wbdeep") {
      wide = true;
      sub = `Profundizamos solo en ${winner.label}: cuándo pasa, cuándo no, qué necesitaría fluir.`;
      const winnerCards = allCards.filter((c) => c.columnKey === winner.key);
      content = (
        <>
          {VarChip}
          <Card pad={18} style={{ marginBottom: 14, border: "1px solid color-mix(in srgb, var(--st-focus) 45%, var(--line))" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Icon name="Crosshair" size={16} style={{ color: "var(--st-focus)" }} />
              <span style={{ fontWeight: 800 }}>{winner.label}</span>
              <Pill color="var(--st-focus)" bg="color-mix(in srgb, var(--st-focus) 14%, transparent)">{winnerPct}% de los votos</Pill>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 8 }}>
              {winnerCards.map((c, i) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-focus)", borderRadius: "var(--r-md)", padding: "9px 11px", fontSize: "var(--t-xs)", lineHeight: 1.4, animation: `pop-in .4s var(--spring) ${i * 0.04}s both` }}>{c.text}</div>)}
              {!winnerCards.length && <p className="muted" style={{ gridColumn: "1/-1", fontSize: "var(--t-sm)", fontStyle: "italic" }}>Sin observaciones cargadas en esta etapa.</p>}
            </div>
          </Card>
          {isFacil && (
            <>
              <Card pad={16} style={{ marginBottom: 14 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Preguntas para tirar al equipo</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "var(--t-sm)" }}>
                  <span>· “¿Cuándo pasa esto con más frecuencia?”</span>
                  <span>· “¿Hay momentos en que NO pasa? ¿Qué es diferente?”</span>
                  <span>· “¿Qué necesitaría pasar para que esta etapa fluyera mejor?”</span>
                </div>
              </Card>
              <Card pad={16}>
                <div className="eyebrow" style={{ marginBottom: 8 }}><Icon name="EyeOff" size={12} /> Tus notas (solo las ves vos)</div>
                <textarea defaultValue={(session.result.wbNotes as string) ?? ""} onBlur={(e) => patchResult({ wbNotes: e.target.value })} rows={3} placeholder="Lo que escuchás en la conversación…" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "10px 12px", fontSize: "var(--t-sm)", outline: "none", lineHeight: 1.5, resize: "vertical" }} />
              </Card>
            </>
          )}
          {!isFacil && <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Conversen: ¿cuándo pasa más? ¿cuándo no pasa? ¿qué necesitaría esta etapa?</p>}
        </>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "wbform", 4); setBusy(false); }}>Formular la traba</Button>
        : null;
    } else {
      sub = "La formulación de la traba. El equipo valida antes de cerrar.";
      const template = `La traba principal de ${wbVar} está en ${winner.label} y se manifiesta como `;
      content = (
        <>
          {VarChip}
          <Card pad={20}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>La traba, en una oración</div>
            {isFacil
              ? <textarea defaultValue={wbForm || template} onBlur={(e) => patchResult({ wbForm: e.target.value.trim() })} rows={3} style={{ width: "100%", background: "var(--card)", border: "1px solid color-mix(in srgb, var(--st-focus) 45%, var(--line-2))", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "12px 14px", fontSize: "var(--t-md)", fontWeight: 600, outline: "none", lineHeight: 1.5, resize: "vertical" }} />
              : <p style={{ fontSize: "var(--t-md)", fontWeight: 600, lineHeight: 1.55, color: wbForm ? "var(--ink-0)" : "var(--ink-3)" }}>{wbForm || "El facilitador está redactando…"}</p>}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {!isFacil ? (
                <>
                  <Button size="sm" variant={myVal === true ? "primary" : "secondary"} icon="ThumbsUp" onClick={() => tapInput("wbval", { ok: true })}>Sí, es esto</Button>
                  <Button size="sm" variant={myVal === false ? "primary" : "secondary"} icon="Hand" onClick={() => tapInput("wbval", { ok: false })}>✋ Ajustar</Button>
                </>
              ) : <span className="muted" style={{ fontSize: "var(--t-sm)" }}>Ajustá la redacción en vivo hasta que haya acuerdo.</span>}
              <span className="num" style={{ marginLeft: "auto", fontSize: "var(--t-sm)", fontWeight: 700 }}>
                <span style={{ color: "var(--success)" }}>👍 {yes}</span> · <span style={{ color: "var(--warning)" }}>✋ {adjust}</span>
              </span>
            </div>
          </Card>
        </>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Check" disabled={busy || !wbForm.trim()} onClick={wbFinish}>{busy ? "Guardando…" : `Cerrar con esta traba (👍 ${yes})`}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Validá la formulación. El facilitador cierra cuando hay acuerdo.</p>;
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: wide ? 920 : 620 }}>
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
    const padCoords = (el: HTMLElement, clientX: number, clientY: number) => {
      const r = el.getBoundingClientRect();
      return { x: Math.min(1, Math.max(0, (clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (clientY - r.top) / r.height)) };
    };
    const commitDrag = (id: string, x: number, y: number) => {
      const effort = Math.round((x * 4 + 1) * 2) / 2;
      const impact = Math.round(((1 - y) * 4 + 1) * 2) / 2;
      setMyIE(id, { impact, effort });
      const next = causes.find((c) => c.id !== id && !placedIds.includes(c.id));
      setFocusSel(next?.id ?? null);
    };
    // pointerdown en el pad vacío: agarra la causa "en la mano" y empieza a arrastrarla.
    const padDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (isFacil || !activeCause) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const c = padCoords(e.currentTarget, e.clientX, e.clientY);
      setIeDrag({ id: activeCause.id, ...c });
    };
    const padMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!ieDrag) return;
      const c = padCoords(e.currentTarget, e.clientX, e.clientY);
      setIeDrag({ id: ieDrag.id, ...c });
    };
    const padUp = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!ieDrag) return;
      const c = padCoords(e.currentTarget, e.clientX, e.clientY);
      commitDrag(ieDrag.id, c.x, c.y);
      setIeDrag(null);
    };
    const SingleBoard = (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* fichas: tocá una para tenerla "en la mano", después arrastrala al mapa */}
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
        <div onPointerDown={padDown} onPointerMove={padMove} onPointerUp={padUp} style={{ ...padBase, aspectRatio: "3 / 2", cursor: isFacil ? "default" : "grab", touchAction: isFacil ? "auto" : "none" }}>
          {CrossLines}{QuadLabels}
          {/* tus fichas ya ubicadas (o la que se está arrastrando, en su posición local) */}
          {causes.map((c, i) => {
            const dragging = ieDrag?.id === c.id;
            const m = myIE(c.id);
            const placed = m?.impact != null && m?.effort != null;
            if (!dragging && !placed) return null;
            const left = dragging ? ieDrag!.x * 100 : (((m?.effort ?? 3) - 1) / 4) * 100;
            const top = dragging ? ieDrag!.y * 100 : (1 - ((m?.impact ?? 3) - 1) / 4) * 100;
            return (
              <span key={c.id} title={c.text} onPointerDown={(e) => { if (isFacil) return; e.stopPropagation(); (e.currentTarget.parentElement as HTMLElement)?.setPointerCapture(e.pointerId); setFocusSel(c.id); const cc = padCoords(e.currentTarget.parentElement as HTMLElement, e.clientX, e.clientY); setIeDrag({ id: c.id, ...cc }); }}
                style={{ position: "absolute", left: `${left}%`, top: `${top}%`, transform: "translate(-50%,-50%)", width: dragging ? 28 : 24, height: dragging ? 28 : 24, borderRadius: 99, background: cColor(c.id), color: "#06121f", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 11, border: "2px solid var(--bg-1)", boxShadow: `0 0 ${dragging ? 16 : 10}px ${cColor(c.id)}`, animation: dragging ? "none" : "pop-in .3s var(--spring)", cursor: "grab", touchAction: "none", zIndex: dragging ? 3 : 1 }} className="num">{i + 1}</span>
            );
          })}
          {placedIds.length === 0 && !ieDrag && (
            <span className="faint" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", fontSize: "var(--t-sm)", display: "inline-flex", alignItems: "center", gap: 6, pointerEvents: "none", textAlign: "center" }}>
              <Icon name={isFacil ? "EyeOff" : "Hand"} size={15} /> {isFacil ? "El equipo ubica las causas en privado" : "Arrastrá la causa al mapa donde cae"}
            </span>
          )}
        </div>
        {!isFacil && activeCause && <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-xs)" }}>En la mano: <b style={{ color: cColor(activeCause.id) }}>{activeCause.text}</b> · arrastrala al mapa (↑ impacto · ← menos esfuerzo). Podés arrastrar una ficha ya puesta para re-ubicarla.</p>}
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

  // ════════ ¿QUÉ PASÓ? · resultado real + narrativa compartida (Aprendizaje A) ════════
  if (session.type === "lwhappened") {
    const pf = initiative?.data?.proof;
    const fl = initiative?.data?.follow;
    const r = session.result;
    const COLS3 = [
      { key: "lhwork", label: "✅ ¿Qué funcionó de lo que hicimos?", color: "var(--success)" },
      { key: "lhfail", label: "⚠️ ¿Qué no funcionó o no salió como esperábamos?", color: "var(--risk)" },
      { key: "lhsurp", label: "💡 ¿Qué nos sorprendió, para bien o para mal?", color: "var(--st-proof)" },
    ];
    const reactCount = COLS3.reduce((a, c) => a + (counts[c.key] ?? 0), 0);
    const achieved = (r.lhAchieved as string) ?? "";
    const ACH = [{ k: "yes", t: "✅ Sí", c: "var(--success)" }, { k: "partial", t: "⚡ Parcialmente", c: "var(--warning)" }, { k: "no", t: "❌ No", c: "var(--risk)" }];
    const log = (fl?.signalLog as { date: string; value: string }[] | undefined) ?? [];
    const sigStart = log[0]?.value ?? "";
    const sigEnd = log[log.length - 1]?.value ?? (fl?.signalNow as string) ?? "";
    const parseNum = (s: string) => { const n = parseFloat(`${s}`.replace(/[^0-9.,-]/g, "").replace(",", ".")); return Number.isFinite(n) ? n : null; };
    const tgtN = pf?.signalTarget ? parseNum(pf.signalTarget) : null;
    const endN = parseNum(sigEnd);
    const sigColor = (tgtN != null && endN != null) ? (endN >= tgtN ? "var(--success)" : achieved === "partial" ? "var(--warning)" : "var(--risk)") : "var(--ink-1)";
    const executed = (fl?.fidelity as string) ?? "";
    const EXEC_LABEL: Record<string, string> = { yes: "Sí, completamente", partial: "Parcialmente", no: "No llegamos" };
    const narrative = (r.lhNarrative as string) ?? "";
    const narrOks = new Set(inputs.filter((i) => i.key === "lhnarrok").map((i) => i.userId));
    const silenceAt = r.lhSilenceAt as number | undefined;
    const silenceLeft = silenceAt ? Math.max(0, 60 - Math.round((now - silenceAt) / 1000)) : 60;
    const lhFinish = async () => {
      setBusy(true);
      await finalizeSession(session, {
        pulseAvg: avg, cardCount: reactCount,
        summaryText: `¿Qué pasó?: ${ACH.find((a) => a.k === achieved)?.t ?? "—"}`,
        dataKey: "learn",
        dataValue: { result: achieved, executed, narrative, closeWords },
        noAdvance: true,
      });
      setBusy(false); leave();
    };
    const Ficha = (
      <Card pad={18} style={{ border: "1px solid color-mix(in srgb, var(--st-learn) 35%, var(--line))" }}>
        <div className="eyebrow" style={{ color: "var(--st-learn)", marginBottom: 8 }}>La prueba cerrada</div>
        {(pf?.betIf || pf?.betThen) && <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.5, marginBottom: 10 }}>Apostamos: si <b>{pf?.betIf || "…"}</b>, lograríamos <b>{pf?.betThen || "…"}</b>.</p>}
        {pf?.chosenIdea && <p style={{ fontSize: "var(--t-xs)", marginBottom: 10 }}><span className="muted">Acción ejecutada:</span> {pf.chosenIdea}</p>}
        {(sigStart || sigEnd) && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <span className="muted" style={{ fontSize: "var(--t-xs)" }}>Señal{pf?.signalMetric ? ` · ${pf.signalMetric}` : ""}:</span>
            <span className="num" style={{ fontWeight: 700 }}>{sigStart || "—"}</span>
            <Icon name="ArrowRight" size={14} style={{ color: sigColor }} />
            <span className="num" style={{ fontWeight: 800, color: sigColor }}>{sigEnd || "—"}</span>
            {pf?.signalTarget && <span className="muted num" style={{ fontSize: "var(--t-xs)" }}>(meta {pf.signalTarget})</span>}
          </div>
        )}
        {log.length > 1 && <div style={{ margin: "8px 0" }}><SignalProgressChart log={log} target={pf?.signalTarget} height={70} /></div>}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 6, fontSize: "var(--t-xs)" }}>
          <span><span className="muted">¿Se alcanzó el umbral?</span> <b>{ACH.find((a) => a.k === achieved)?.t ?? "—"}</b></span>
          {executed && <span><span className="muted">¿Se ejecutó como se diseñó?</span> <b>{EXEC_LABEL[executed] ?? executed}</b></span>}
        </div>
      </Card>
    );
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (step === "lwresult") {
      sub = "El resultado real de la prueba, con el dato al lado.";
      content = (
        <>
          {Ficha}
          {isFacil && (
            <Card pad={16} style={{ marginTop: 12 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>¿Se alcanzó el umbral? (tu lectura del dato)</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ACH.map((o) => <button key={o.k} onClick={() => patchResult({ lhAchieved: o.k })} style={{ padding: "8px 14px", borderRadius: "var(--r-full)", fontWeight: 700, fontSize: "var(--t-sm)", border: `1.5px solid ${achieved === o.k ? o.c : "var(--line-2)"}`, background: achieved === o.k ? `color-mix(in srgb, ${o.c} 13%, var(--card))` : "var(--card)", color: achieved === o.k ? o.c : "var(--ink-2)" }}>{o.t}</button>)}
              </div>
            </Card>
          )}
        </>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || !achieved} onClick={async () => { setBusy(true); await setResult(sessionId, { lhSilenceAt: Date.now() }); await setStep(sessionId, "lwsilence", 1); setBusy(false); }}>Tomar un momento</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador presenta el resultado.</p>;
    } else if (step === "lwsilence") {
      sub = "Tomemos un momento para procesar lo que pasó…";
      content = (
        <Card pad={32} style={{ textAlign: "center" }}>
          <div className="num" style={{ fontSize: 64, fontWeight: 800, color: silenceLeft > 0 ? "var(--st-learn)" : "var(--green)", lineHeight: 1 }}>{silenceLeft}</div>
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 12, lineHeight: 1.5 }}>Sin escribir ni votar. Solo dejá que el resultado se asiente.{isFacil && " Observá cómo reacciona el equipo."}</p>
          <div style={{ height: 6, borderRadius: 99, background: "var(--card-2)", overflow: "hidden", marginTop: 18 }}><div style={{ height: "100%", width: `${(1 - silenceLeft / 60) * 100}%`, background: "var(--st-learn)", borderRadius: 99, transition: "width 1s linear" }} /></div>
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || silenceLeft > 0} onClick={async () => { setBusy(true); await setStep(sessionId, "lwreact", 2); setBusy(false); }}>{silenceLeft > 0 ? `Esperá ${silenceLeft}s…` : "Abrir la reacción del equipo"}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Respirá. Procesemos juntos.</p>;
    } else if (step === "lwreact") {
      sub = "Tu reacción honesta, en anónimo. Todas las tarjetas que quieras.";
      content = (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 12 }}>
          {COLS3.map((col) => {
            const mine = myCards.filter((c) => c.columnKey === col.key);
            return (
              <Card key={col.key} pad={14} style={{ borderTop: `3px solid ${col.color}` }}>
                <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 8, lineHeight: 1.35 }}>{col.label}</div>
                <HiddenDots n={counts[col.key] ?? 0} label="ocultas" color={col.color} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {mine.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${col.color}`, borderRadius: "var(--r-sm)", padding: "7px 9px", fontSize: "var(--t-xs)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 4 }}>· tuya</span></div>)}
                </div>
                {!isFacil && (
                  <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                    <input value={cardDraft[col.key] ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, [col.key]: e.target.value }))} onKeyDown={async (e) => { if (e.key === "Enter") { const t = (cardDraft[col.key] ?? "").trim(); if (!t) return; await addCard(sessionId, col.key, t, true); setCardDraft((d) => ({ ...d, [col.key]: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); } }} placeholder="Sumar…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "7px 9px", fontSize: "var(--t-xs)", outline: "none" }} />
                    <button onClick={async () => { const t = (cardDraft[col.key] ?? "").trim(); if (!t) return; await addCard(sessionId, col.key, t, true); setCardDraft((d) => ({ ...d, [col.key]: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); }} style={{ width: 30, borderRadius: "var(--r-sm)", background: col.color, color: "#08120c", border: "none", display: "grid", placeItems: "center" }}><Icon name="Plus" size={14} /></button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Eye" disabled={busy || reactCount === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "lwreveal", 3); setBusy(false); }}>Revelar y leer ({reactCount})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Escribí tu reacción. El facilitador revela cuando todos terminen.</p>;
    } else if (step === "lwreveal") {
      wide = true;
      sub = isFacil ? "Leé en voz alta. No interpretes todavía: solo leé y dejá que el equipo procese." : "Lectura colectiva. Escuchemos lo que aportó cada uno.";
      content = (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))", gap: 12 }}>
          {COLS3.map((col) => {
            const cs = allCards.filter((c) => c.columnKey === col.key);
            return (
              <div key={col.key} style={{ background: "var(--bg-2)", border: `1px solid color-mix(in srgb, ${col.color} 30%, var(--line))`, borderTop: `3px solid ${col.color}`, borderRadius: "var(--r-lg)", padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 8, lineHeight: 1.35 }}>{col.label} <span className="num muted">{cs.length}</span></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {cs.map((c, i) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${col.color}`, borderRadius: "var(--r-sm)", padding: "8px 10px", fontSize: "var(--t-sm)", animation: `pop-in .4s var(--spring) ${i * 0.04}s both` }}>{c.text}</div>)}
                  {!cs.length && <div className="faint" style={{ fontSize: "var(--t-xs)", textAlign: "center", padding: 12 }}>Sin tarjetas</div>}
                </div>
              </div>
            );
          })}
        </div>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "lwnarrative", 4); setBusy(false); }}>Construir la narrativa</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Escuchá la lectura del facilitador.</p>;
    } else if (step === "lwnarrative") {
      sub = "La narrativa compartida del ciclo. El facilitador redacta, el equipo aprueba.";
      content = (
        <Card pad={20}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Lo que pasó, en palabras del equipo</div>
          {isFacil
            ? <textarea defaultValue={narrative} onBlur={(e) => patchResult({ lhNarrative: e.target.value })} rows={6} placeholder={"Lo que pasó fue…\nFuncionó…\nNo funcionó…\nLo más sorprendente fue…"} style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "12px 14px", fontSize: "var(--t-sm)", outline: "none", lineHeight: 1.6, resize: "vertical" }} />
            : <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.6, whiteSpace: "pre-wrap", color: narrative ? "var(--ink-0)" : "var(--ink-3)" }}>{narrative || "El facilitador está redactando la narrativa…"}</p>}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {!isFacil
              ? (narrOks.has(user.id) ? <span style={{ color: "var(--green)", fontWeight: 700, fontSize: "var(--t-sm)", display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="CircleCheck" size={16} /> Aprobaste la narrativa</span> : <Button size="sm" icon="ThumbsUp" disabled={!narrative} onClick={() => tapInput("lhnarrok", { ok: true })}>Refleja lo que pasó</Button>)
              : <span className="muted" style={{ fontSize: "var(--t-sm)" }}>Editá hasta que el equipo se sienta reflejado.</span>}
            <span className="num" style={{ marginLeft: "auto", fontSize: "var(--t-sm)", fontWeight: 700, color: "var(--green)" }}>{narrOks.size}/{totalInRoom} aprobaron</span>
          </div>
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || !narrative.trim()} onClick={async () => { setBusy(true); await setStep(sessionId, "lwclose", 5); setBusy(false); }}>Cerrar con una palabra</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Aprobá la narrativa cuando te sientas reflejado.</p>;
    } else {
      sub = "El ritual de cierre del ciclo.";
      content = learnClosing();
      controls = learnCloseControls(lhFinish);
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: wide ? 860 : 620 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ ¿QUÉ APRENDIMOS? · aprendizajes → Biblioteca (Aprendizaje B) ════════
  if (session.type === "lwlearned") {
    const lrn = allCards.filter((c) => c.columnKey === "lrn");
    const lrnCount = counts["lrn"] ?? 0;
    const QS = [
      "¿Qué sabemos ahora que no sabíamos antes de esta prueba?",
      "¿Qué haríamos diferente si pudiéramos volver a empezar?",
      "¿Qué de esto aplica a otras variables del equipo? (transferencia)",
    ];
    const myStars = ((inputs.find((i) => i.userId === user.id && i.key === "lstar")?.value as { ids?: string[] } | undefined)?.ids) ?? [];
    const starsOf = (id: string) => inputs.filter((i) => i.key === "lstar").reduce((a, x) => a + (((x.value as { ids?: string[] }).ids ?? []).includes(id) ? 1 : 0), 0);
    const toggleStar = (id: string) => { const cur = new Set(myStars); if (cur.has(id)) cur.delete(id); else cur.add(id); tapInput("lstar", { ids: [...cur] }); };
    const lrnMeta = (session.result.lrnMeta as Record<string, { type?: string; transferable?: boolean; urgent?: boolean }>) ?? {};
    const setMeta = (id: string, patch: Record<string, unknown>) => patchResult({ lrnMeta: { ...((resultRef.current.lrnMeta as Record<string, unknown>) ?? {}), [id]: { ...(lrnMeta[id] ?? {}), ...patch } } });
    const highlight = (session.result.lrnHighlight as string) ?? "";
    const addLrn = async () => { const t = (cardDraft.lrn ?? "").trim(); if (!t) return; await addCard(sessionId, "lrn", t, false); setCardDraft((d) => ({ ...d, lrn: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
    const ranked = [...lrn].sort((a, b) => starsOf(b.id) - starsOf(a.id));
    const lwlFinish = async () => {
      setBusy(true);
      const nowIso = new Date().toISOString();
      const entries: LearningEntry[] = lrn.map((c) => ({
        id: c.id, text: c.text, initiativeId: initiative?.id, initiativeTitle: initiative?.title,
        stage: "learn", type: lrnMeta[c.id]?.type as LearningEntry["type"], resonances: starsOf(c.id),
        transferable: !!lrnMeta[c.id]?.transferable, urgent: !!lrnMeta[c.id]?.urgent,
        highlighted: c.id === highlight, date: nowIso,
      }));
      const existing = (team?.data?.library as LearningEntry[] | undefined) ?? [];
      const merged = [...existing.filter((e) => !entries.some((n) => n.id === e.id)), ...entries];
      const highlightText = lrn.find((c) => c.id === highlight)?.text ?? "";
      await finalizeSession(session, {
        pulseAvg: avg, cardCount: lrnCount,
        summaryText: `${lrn.length} aprendizajes${highlightText ? ` · destacado: ${highlightText.slice(0, 40)}` : ""}`,
        dataKey: "learn", dataValue: { learnings: lrn.map((c) => c.text), highlightedLearning: highlightText, closeWords },
        teamData: { library: merged }, noAdvance: true,
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "";
    if (step === "lwldistinct") {
      sub = "Una distinción antes de empezar.";
      content = (
        <Card pad={28} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 34, marginBottom: 12 }}>🧠</div>
          <p style={{ fontSize: "var(--t-lg)", fontWeight: 700, lineHeight: 1.5 }}>Un resultado exitoso no garantiza aprendizaje.<br />Un resultado fallido puede generar el aprendizaje más valioso.</p>
          <p className="muted" style={{ fontSize: "var(--t-md)", marginTop: 12 }}>Hoy separamos las dos cosas.</p>
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "lwlwrite", 1); setBusy(false); }}>Escribir los aprendizajes</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador encuadra el ejercicio.</p>;
    } else if (step === "lwlwrite") {
      sub = "Sin apuro. Una tarjeta por aprendizaje. Acá no es anónimo.";
      content = (
        <Card pad={20}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            {QS.map((q, i) => <div key={i} style={{ display: "flex", gap: 8, fontSize: "var(--t-sm)", lineHeight: 1.4 }}><span className="num" style={{ color: "var(--st-learn)", fontWeight: 800 }}>{i + 1}</span><span>{q}</span></div>)}
          </div>
          <HiddenDots n={lrnCount} label="aprendizajes · se leen al revelar" color="var(--st-learn)" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
            {myCards.filter((c) => c.columnKey === "lrn").map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-learn)", borderRadius: "var(--r-sm)", padding: "8px 10px", fontSize: "var(--t-sm)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 4 }}>· tuyo</span></div>)}
          </div>
          {!isFacil && (
            <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
              <input value={cardDraft.lrn ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, lrn: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addLrn()} placeholder="Aprendimos que…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" }} />
              <Button size="sm" icon="Plus" onClick={addLrn}>Sumar</Button>
            </div>
          )}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Eye" disabled={busy || lrnCount === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "lwlread", 2); setBusy(false); }}>Leer y resonar ({lrnCount})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Escribí tus aprendizajes. El facilitador abre la lectura cuando estén todos.</p>;
    } else if (step === "lwlread") {
      sub = "Cada uno lee sus aprendizajes. Poné ⭐ a los que más te resuenan.";
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ranked.map((c) => { const stars = starsOf(c.id); const on = myStars.includes(c.id); const author = participants.find((p) => p.userId === c.authorId)?.name; return (
            <Card key={c.id} pad={14} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "var(--t-sm)", lineHeight: 1.45 }}>{c.text}</div>
                {author && <div className="faint" style={{ fontSize: 10, marginTop: 3 }}>· {author}</div>}
              </div>
              <button onClick={() => { if (!isFacil) toggleStar(c.id); }} disabled={isFacil} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: "var(--r-full)", border: `1.5px solid ${on ? "var(--warning)" : "var(--line-2)"}`, background: on ? "color-mix(in srgb, var(--warning) 14%, var(--card))" : "var(--card)", color: on ? "var(--warning)" : "var(--ink-2)", fontWeight: 700, cursor: isFacil ? "default" : "pointer" }}>
                <Icon name="Star" size={14} style={on ? { fill: "var(--warning)" } : undefined} /> {stars}
              </button>
            </Card>
          ); })}
        </div>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "lwlclassify", 3); setBusy(false); }}>Clasificar para la Biblioteca</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Marcá con ⭐ los que más te resuenan.</p>;
    } else if (step === "lwlclassify") {
      sub = isFacil ? "Clasificá cada aprendizaje. Se guardan en la Biblioteca del equipo." : "El facilitador clasifica los aprendizajes para la Biblioteca.";
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ranked.map((c) => { const m = lrnMeta[c.id] ?? {}; return (
            <Card key={c.id} pad={14}>
              <div style={{ fontSize: "var(--t-sm)", lineHeight: 1.45, marginBottom: 10 }}>{c.text} {starsOf(c.id) > 0 && <span className="num" style={{ color: "var(--warning)", fontSize: "var(--t-xs)" }}>⭐{starsOf(c.id)}</span>}</div>
              {isFacil ? (
                <>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    {LEARNING_TYPES.map((t) => { const on = m.type === t.k; return <button key={t.k} onClick={() => setMeta(c.id, { type: t.k })} style={{ padding: "5px 10px", borderRadius: "var(--r-full)", fontSize: "var(--t-xs)", fontWeight: 600, border: `1.5px solid ${on ? t.color : "var(--line-2)"}`, background: on ? `color-mix(in srgb, ${t.color} 14%, var(--card))` : "var(--card)", color: on ? t.color : "var(--ink-2)" }}>{t.emoji} {t.label}</button>; })}
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: "var(--t-xs)" }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}><input type="checkbox" checked={!!m.transferable} onChange={(e) => setMeta(c.id, { transferable: e.target.checked })} /> Transferible a otras variables</label>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}><input type="checkbox" checked={!!m.urgent} onChange={(e) => setMeta(c.id, { urgent: e.target.checked })} /> Urgente aplicar el próximo ciclo</label>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: "var(--t-xs)" }}>
                  {m.type && <span style={{ color: LEARNING_TYPES.find((t) => t.k === m.type)?.color }}>{LEARNING_TYPES.find((t) => t.k === m.type)?.emoji} {LEARNING_TYPES.find((t) => t.k === m.type)?.label}</span>}
                  {m.transferable && <span className="muted">· transferible</span>}{m.urgent && <span className="muted">· urgente</span>}
                </div>
              )}
            </Card>
          ); })}
        </div>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || lrn.some((c) => !lrnMeta[c.id]?.type)} onClick={async () => { setBusy(true); await setStep(sessionId, "lwlhighlight", 4); setBusy(false); }}>{lrn.some((c) => !lrnMeta[c.id]?.type) ? "Clasificá todos para seguir" : "Elegir el destacado"}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador clasifica cada aprendizaje.</p>;
    } else if (step === "lwlhighlight") {
      sub = "El aprendizaje más valioso del ciclo. Aparece destacado en el dashboard.";
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ranked.map((c) => { const on = highlight === c.id; return (
            <button key={c.id} disabled={!isFacil} onClick={() => patchResult({ lrnHighlight: c.id })} style={{ textAlign: "left", padding: "13px 15px", borderRadius: "var(--r-md)", border: `1.5px solid ${on ? "var(--st-learn)" : "var(--line-2)"}`, background: on ? "color-mix(in srgb, var(--st-learn) 12%, var(--card))" : "var(--card)", cursor: isFacil ? "pointer" : "default", display: "flex", alignItems: "center", gap: 10 }}>
              {on ? <Icon name="Star" size={18} style={{ color: "var(--st-learn)", fill: "var(--st-learn)" }} /> : <Icon name="Circle" size={18} style={{ color: "var(--line-2)" }} />}
              <span style={{ flex: 1, fontSize: "var(--t-sm)", fontWeight: on ? 700 : 500 }}>{c.text}</span>
              {starsOf(c.id) > 0 && <span className="num" style={{ color: "var(--warning)", fontSize: "var(--t-xs)" }}>⭐{starsOf(c.id)}</span>}
            </button>
          ); })}
        </div>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || !highlight} onClick={async () => { setBusy(true); await setStep(sessionId, "lwlclose", 5); setBusy(false); }}>Cerrar con una palabra</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador elige el aprendizaje destacado.</p>;
    } else {
      sub = "El ritual de cierre del ciclo.";
      content = learnClosing();
      controls = learnCloseControls(lwlFinish);
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: 640 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ ¿QUÉ SIGUE? · decisión de cierre + destino de la variable (Aprendizaje C) ════════
  if (session.type === "lwnext") {
    const r = session.result;
    const NOPTS = [
      { k: "implement", t: "Implementar", emoji: "🟢", color: "var(--success)", desc: "La prueba funcionó y queremos que sea la nueva forma de trabajar.", q: "¿Qué necesitamos para que se sostenga sin que nadie lo monitoree?", conseq: "La variable entra en Consolidación por 30 días." },
      { k: "iterate", t: "Iterar", emoji: "🔄", color: "var(--st-proof)", desc: "Funcionó parcialmente o aprendimos algo que nos hace querer probar una variante.", q: "¿Qué ajustamos en la apuesta o en la acción?", conseq: "La variable vuelve a Ideación con la apuesta ajustada precargada." },
      { k: "pivot", t: "Pivotar", emoji: "🔀", color: "var(--warning)", desc: "No funcionó pero entendemos mejor el problema.", q: "¿Qué prueba diferente diseñamos con lo que aprendimos?", conseq: "La variable vuelve a Foco con los aprendizajes como contexto." },
      { k: "pause", t: "Pausar", emoji: "⏸️", color: "var(--ink-2)", desc: "No es el momento de seguir con esta variable.", q: "¿Qué la bloquea? ¿Cuándo la retomamos?", conseq: "La variable queda Pausada en el mapa, con fecha tentativa de revisión." },
    ];
    const decision = (r.lnDecision as string) ?? "";
    const reason = (r.lnReason as string) ?? "";
    const pauseDate = (r.lnPauseDate as string) ?? "";
    const dl = NOPTS.find((o) => o.k === decision);
    const lnArgs = (r.lnArgs as Record<string, { pro?: string; con?: string }>) ?? {};
    const setArg = (k: string, patch: Record<string, string>) => patchResult({ lnArgs: { ...((resultRef.current.lnArgs as Record<string, unknown>) ?? {}), [k]: { ...(lnArgs[k] ?? {}), ...patch } } });
    const decOks = new Set(inputs.filter((i) => i.key === "lndecok").map((i) => i.userId));
    const lnFinish = async () => {
      setBusy(true);
      await finalizeSession(session, {
        pulseAvg: avg,
        summaryText: `Decisión: ${dl?.t ?? "—"}`,
        dataKey: "learn",
        dataValue: { decision, decisionReason: reason, ...(decision === "pause" && pauseDate ? { pauseReviewAt: pauseDate } : {}), closeWords },
        noAdvance: true,
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (step === "lwnopts") {
      wide = true;
      sub = "¿Qué hacemos con esta variable? Cuatro caminos, cada uno con su consecuencia.";
      content = (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))", gap: 12 }}>
          {NOPTS.map((o) => (
            <Card key={o.k} pad={16} style={{ borderTop: `3px solid ${o.color}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><span style={{ fontSize: 22 }}>{o.emoji}</span><b style={{ fontSize: "var(--t-md)", color: o.color }}>{o.t}</b></div>
              <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.45, marginBottom: 8 }}>{o.desc}</p>
              <p className="muted" style={{ fontSize: "var(--t-xs)", fontStyle: "italic", marginBottom: 8 }}>{o.q}</p>
              <div style={{ fontSize: "var(--t-xs)", padding: "7px 10px", borderRadius: "var(--r-sm)", background: `color-mix(in srgb, ${o.color} 9%, transparent)`, border: `1px solid color-mix(in srgb, ${o.color} 28%, transparent)` }}><Icon name="ArrowRight" size={12} style={{ color: o.color }} /> {o.conseq}</div>
            </Card>
          ))}
        </div>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "lwndebate", 1); setBusy(false); }}>Abrir el debate</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador presenta las opciones.</p>;
    } else if (step === "lwndebate") {
      wide = true;
      sub = isFacil ? "Facilitá sin tomar partido. Un argumento a favor y uno en contra de cada camino." : "Debatamos cada camino: a favor y en contra.";
      content = (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))", gap: 12 }}>
          {NOPTS.map((o) => { const a = lnArgs[o.k] ?? {}; return (
            <Card key={o.k} pad={14} style={{ borderTop: `3px solid ${o.color}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><span style={{ fontSize: 18 }}>{o.emoji}</span><b style={{ fontSize: "var(--t-sm)", color: o.color }}>{o.t}</b></div>
              <div style={{ marginBottom: 8 }}>
                <div className="eyebrow" style={{ marginBottom: 4, color: "var(--success)" }}>A favor</div>
                {isFacil ? <textarea defaultValue={a.pro} onBlur={(e) => setArg(o.k, { pro: e.target.value })} rows={2} placeholder="Un argumento a favor…" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "7px 9px", fontSize: "var(--t-xs)", outline: "none", resize: "vertical" }} /> : <p style={{ fontSize: "var(--t-xs)", minHeight: 16 }}>{a.pro || "—"}</p>}
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom: 4, color: "var(--risk)" }}>En contra</div>
                {isFacil ? <textarea defaultValue={a.con} onBlur={(e) => setArg(o.k, { con: e.target.value })} rows={2} placeholder="Un argumento en contra…" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "7px 9px", fontSize: "var(--t-xs)", outline: "none", resize: "vertical" }} /> : <p style={{ fontSize: "var(--t-xs)", minHeight: 16 }}>{a.con || "—"}</p>}
              </div>
            </Card>
          ); })}
        </div>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "lwndecide", 2); setBusy(false); }}>Tomar la decisión</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El equipo converge naturalmente.</p>;
    } else if (step === "lwndecide") {
      sub = "Decidimos [opción] porque [razón].";
      content = (
        <Card pad={20}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 10, marginBottom: 16 }}>
            {NOPTS.map((o) => { const on = decision === o.k; const dim = !!decision && !on; return (
              <button key={o.k} disabled={!isFacil} onClick={() => patchResult({ lnDecision: o.k })} style={{ textAlign: "center", padding: "16px 10px", borderRadius: "var(--r-lg)", background: on ? `color-mix(in srgb, ${o.color} 14%, var(--card))` : "var(--card)", border: `1.5px solid ${on ? o.color : "var(--line-2)"}`, opacity: dim ? 0.5 : 1, cursor: isFacil ? "pointer" : "default", boxShadow: on ? `0 0 14px color-mix(in srgb, ${o.color} 30%, transparent)` : "none", transition: "all .2s" }}>
                <div style={{ fontSize: 26, transform: on ? "scale(1.15)" : "scale(1)", transition: "transform .2s" }}>{o.emoji}</div>
                <div style={{ fontWeight: 800, fontSize: "var(--t-sm)", marginTop: 4 }}>{o.t}</div>
              </button>
            ); })}
          </div>
          {dl && (
            <>
              <div style={{ fontSize: "var(--t-xs)", padding: "8px 11px", borderRadius: "var(--r-sm)", background: `color-mix(in srgb, ${dl.color} 9%, transparent)`, border: `1px solid color-mix(in srgb, ${dl.color} 28%, transparent)`, marginBottom: 12 }}><Icon name="ArrowRight" size={12} style={{ color: dl.color }} /> {dl.conseq}</div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>¿Por qué? (obligatorio)</div>
              {isFacil
                ? <textarea defaultValue={reason} onBlur={(e) => patchResult({ lnReason: e.target.value })} rows={2} placeholder={`Elegimos ${dl.t.toLowerCase()} porque…`} style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "10px 12px", fontSize: "var(--t-sm)", outline: "none", lineHeight: 1.5, resize: "vertical" }} />
                : <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.5, color: reason ? "var(--ink-0)" : "var(--ink-3)" }}>{reason || "El facilitador registra la razón…"}</p>}
              {decision === "pause" && isFacil && (
                <div style={{ marginTop: 10 }}>
                  <div className="eyebrow" style={{ marginBottom: 5 }}>¿Cuándo la revisamos?</div>
                  <input type="date" defaultValue={pauseDate} onBlur={(e) => patchResult({ lnPauseDate: e.target.value })} style={{ background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "8px 10px", fontSize: "var(--t-sm)", outline: "none" }} />
                </div>
              )}
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {!isFacil
                  ? (decOks.has(user.id) ? <span style={{ color: "var(--green)", fontWeight: 700, fontSize: "var(--t-sm)", display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="CircleCheck" size={16} /> Confirmaste</span> : <Button size="sm" icon="ThumbsUp" disabled={!decision || !reason} onClick={() => tapInput("lndecok", { ok: true })}>Confirmo la decisión</Button>)
                  : <span className="muted" style={{ fontSize: "var(--t-sm)" }}>El equipo confirma con un clic.</span>}
                <span className="num" style={{ marginLeft: "auto", fontSize: "var(--t-sm)", fontWeight: 700, color: "var(--green)" }}>{decOks.size}/{totalInRoom} confirmaron</span>
              </div>
            </>
          )}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || !decision || !reason.trim() || (decision === "pause" && !pauseDate)} onClick={async () => { setBusy(true); await setStep(sessionId, "lwnclose", 3); setBusy(false); }}>Cerrar con una palabra</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador registra la decisión y su razón.</p>;
    } else {
      sub = "El ritual de cierre del ciclo.";
      content = (
        <>
          {dl && <div style={{ marginBottom: 14, padding: "12px 14px", borderRadius: "var(--r-md)", background: `color-mix(in srgb, ${dl.color} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${dl.color} 30%, transparent)`, fontSize: "var(--t-sm)", lineHeight: 1.5 }}><b style={{ color: dl.color }}>{dl.emoji} {dl.t}.</b> {dl.conseq} <span className="muted">Se aplica al cerrar la etapa de Aprendizaje.</span></div>}
          {learnClosing()}
        </>
      );
      controls = learnCloseControls(lnFinish);
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: wide ? 820 : 600 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ ¿CÓMO ESTAMOS COMO EQUIPO? · proceso + reflexión privada (Aprendizaje D) ════════
  if (session.type === "lwteam") {
    const r = session.result;
    const TCOLS = [
      { key: "ltwork", label: "✅ ¿Qué funciona de cómo hacemos estas sesiones?", color: "var(--success)" },
      { key: "ltchg", label: "🔧 ¿Qué cambiaríamos del formato o la dinámica?", color: "var(--warning)" },
      { key: "ltneed", label: "🌱 ¿Qué necesitamos para que siga siendo útil?", color: "var(--st-proof)" },
    ];
    const evalCount = TCOLS.reduce((a, c) => a + (counts[c.key] ?? 0), 0);
    const adjusts = (r.ltAdjust as string[]) ?? ["", ""];
    const setAdjust = (i: number, val: string) => { const arr = (((resultRef.current.ltAdjust as string[]) ?? adjusts)).slice(); while (arr.length <= i) arr.push(""); arr[i] = val; patchResult({ ltAdjust: arr }); };
    const myOks = ((inputs.find((i) => i.userId === user.id && i.key === "ltok")?.value as { ids?: string[] } | undefined)?.ids) ?? [];
    const okOf = (i: number) => inputs.filter((x) => x.key === "ltok").reduce((a, x) => a + (((x.value as { ids?: string[] }).ids ?? []).includes(String(i)) ? 1 : 0), 0);
    const toggleOk = (i: number) => { const cur = new Set(myOks); const k = String(i); if (cur.has(k)) cur.delete(k); else cur.add(k); tapInput("ltok", { ids: [...cur] }); };
    const realAdjusts = adjusts.map((t, i) => ({ t, i })).filter((a) => a.t.trim());
    const approvedAdjusts = realAdjusts.filter((a) => okOf(a.i) > totalInRoom / 2).map((a) => a.t);
    const myPriv = (inputs.find((i) => i.userId === user.id && i.key === "ltprivate")?.value as { a?: string; b?: string; c?: string } | undefined) ?? {};
    const privDone = inputs.some((i) => i.userId === user.id && i.key === "ltdone");
    const privCount = inputs.filter((i) => i.key === "ltdone").length;
    const setPriv = (patch: Record<string, string>) => setMyInput(sessionId, "ltprivate", { ...myPriv, ...patch }, true);
    const ltFinish = async () => {
      setBusy(true);
      await finalizeSession(session, {
        pulseAvg: avg, cardCount: evalCount,
        summaryText: `Proceso del equipo · ${approvedAdjusts.length} ajustes acordados`,
        dataKey: "learn", dataValue: { processAdjustments: approvedAdjusts, closeWords },
        noAdvance: true,
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (step === "lwtframe") {
      sub = "No sobre qué mejoramos, sino sobre cómo lo hacemos juntos.";
      content = (
        <Card pad={28} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 34, marginBottom: 12 }}>🧩</div>
          <p style={{ fontSize: "var(--t-lg)", fontWeight: 700, lineHeight: 1.5 }}>¿Está funcionando la forma en que trabajamos en este proceso?</p>
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 10 }}>Miramos la dinámica del equipo, no el resultado de la prueba.</p>
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "lwteval", 1); setBusy(false); }}>Evaluar el proceso</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador encuadra el ejercicio.</p>;
    } else if (step === "lwteval") {
      sub = "Tu mirada sobre el proceso, en anónimo.";
      content = (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 12 }}>
          {TCOLS.map((col) => {
            const mine = myCards.filter((c) => c.columnKey === col.key);
            return (
              <Card key={col.key} pad={14} style={{ borderTop: `3px solid ${col.color}` }}>
                <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 8, lineHeight: 1.35 }}>{col.label}</div>
                <HiddenDots n={counts[col.key] ?? 0} label="ocultas" color={col.color} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {mine.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${col.color}`, borderRadius: "var(--r-sm)", padding: "7px 9px", fontSize: "var(--t-xs)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 4 }}>· tuya</span></div>)}
                </div>
                {!isFacil && (
                  <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                    <input value={cardDraft[col.key] ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, [col.key]: e.target.value }))} onKeyDown={async (e) => { if (e.key === "Enter") { const t = (cardDraft[col.key] ?? "").trim(); if (!t) return; await addCard(sessionId, col.key, t, true); setCardDraft((d) => ({ ...d, [col.key]: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); } }} placeholder="Sumar…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "7px 9px", fontSize: "var(--t-xs)", outline: "none" }} />
                    <button onClick={async () => { const t = (cardDraft[col.key] ?? "").trim(); if (!t) return; await addCard(sessionId, col.key, t, true); setCardDraft((d) => ({ ...d, [col.key]: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); }} style={{ width: 30, borderRadius: "var(--r-sm)", background: col.color, color: "#08120c", border: "none", display: "grid", placeItems: "center" }}><Icon name="Plus" size={14} /></button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Eye" disabled={busy || evalCount === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "lwtreveal", 2); setBusy(false); }}>Revelar y leer ({evalCount})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Escribí tu mirada del proceso, en anónimo.</p>;
    } else if (step === "lwtreveal") {
      wide = true;
      sub = isFacil ? "Leé las tarjetas. Prestá atención a los patrones que se repiten." : "Lectura del proceso del equipo.";
      content = (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))", gap: 12 }}>
          {TCOLS.map((col) => {
            const cs = allCards.filter((c) => c.columnKey === col.key);
            return (
              <div key={col.key} style={{ background: "var(--bg-2)", border: `1px solid color-mix(in srgb, ${col.color} 30%, var(--line))`, borderTop: `3px solid ${col.color}`, borderRadius: "var(--r-lg)", padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 8, lineHeight: 1.35 }}>{col.label} <span className="num muted">{cs.length}</span></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {cs.map((c, i) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${col.color}`, borderRadius: "var(--r-sm)", padding: "8px 10px", fontSize: "var(--t-sm)", animation: `pop-in .4s var(--spring) ${i * 0.04}s both` }}>{c.text}</div>)}
                  {!cs.length && <div className="faint" style={{ fontSize: "var(--t-xs)", textAlign: "center", padding: 12 }}>Sin tarjetas</div>}
                </div>
              </div>
            );
          })}
        </div>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "lwtadjust", 3); setBusy(false); }}>Proponer ajustes</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Escuchá la lectura del facilitador.</p>;
    } else if (step === "lwtadjust") {
      sub = "Uno o dos ajustes concretos al proceso. El equipo vota si los implementamos.";
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[0, 1].map((i) => {
            const text = adjusts[i] ?? "";
            const votes = okOf(i);
            const on = myOks.includes(String(i));
            const approved = votes > totalInRoom / 2;
            return (
              <Card key={i} pad={16}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Ajuste {i + 1}{approved && text.trim() ? " · acordado ✓" : ""}</div>
                {isFacil
                  ? <textarea defaultValue={text} onBlur={(e) => setAdjust(i, e.target.value)} rows={2} placeholder={i === 0 ? "A partir de la próxima sesión vamos a…" : "(Opcional) Otro ajuste…"} style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none", lineHeight: 1.5, resize: "vertical" }} />
                  : <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.5, color: text ? "var(--ink-0)" : "var(--ink-3)" }}>{text || "—"}</p>}
                {text.trim() && (
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    {!isFacil
                      ? <Button size="sm" variant={on ? "primary" : "secondary"} icon={on ? "Check" : "ThumbsUp"} onClick={() => toggleOk(i)}>{on ? "Lo implementamos" : "Implementarlo"}</Button>
                      : <span className="muted" style={{ fontSize: "var(--t-xs)" }}>¿Lo implementamos?</span>}
                    <span className="num" style={{ marginLeft: "auto", fontWeight: 700, color: approved ? "var(--green)" : "var(--ink-2)" }}>{votes}/{totalInRoom} {approved ? "· acordado" : ""}</span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "lwtprivate", 4); setBusy(false); }}>Reflexión privada</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Votá los ajustes que quieras implementar.</p>;
    } else if (step === "lwtprivate") {
      sub = "Un momento para vos. Esto es privado: nadie más —ni el facilitador— lo lee.";
      content = isFacil ? (
        <Card pad={24} style={{ textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: "var(--r-lg)", background: "color-mix(in srgb, var(--st-learn) 16%, transparent)", color: "var(--st-learn)", display: "grid", placeItems: "center", margin: "0 auto 12px" }}><Icon name="Lock" size={24} /></div>
          <div className="num" style={{ fontSize: "var(--t-2xl)", fontWeight: 800, color: "var(--st-learn)" }}>{privCount}/{totalInRoom}</div>
          <div className="muted" style={{ fontSize: "var(--t-sm)" }}>reflexionaron en privado</div>
          <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 12, lineHeight: 1.5 }}>Cada reflexión queda guardada solo para su autor. Protege la honestidad del equipo.</p>
        </Card>
      ) : (
        <Card pad={20}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: "var(--st-learn)" }}><Icon name="Lock" size={16} /><span className="eyebrow" style={{ color: "var(--st-learn)" }}>Tu reflexión privada</span></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[{ k: "a", q: "¿Qué aprendí yo en este ciclo sobre cómo trabajo?" }, { k: "b", q: "¿Qué quiero hacer diferente en el próximo?" }, { k: "c", q: "¿Cómo me siento con el equipo hoy?" }].map((f) => (
              <div key={f.k}>
                <div style={{ fontSize: "var(--t-sm)", fontWeight: 600, marginBottom: 5 }}>{f.q}</div>
                <textarea defaultValue={(myPriv as Record<string, string>)[f.k] ?? ""} onBlur={(e) => setPriv({ [f.k]: e.target.value })} rows={2} style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none", lineHeight: 1.5, resize: "vertical" }} />
              </div>
            ))}
          </div>
          <Button full icon={privDone ? "Check" : "Lock"} variant={privDone ? "secondary" : "primary"} onClick={() => tapInput("ltdone", { ok: true })} style={{ marginTop: 12 }}>{privDone ? "Guardado en privado" : "Guardar mi reflexión"}</Button>
          <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 10, textAlign: "center" }}>Nadie más puede leer esto.</p>
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "lwtclose", 5); setBusy(false); }}>Cerrar con una palabra</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Tomate tu momento. El facilitador sigue cuando estén.</p>;
    } else {
      sub = "El ritual de cierre del ciclo.";
      content = learnClosing();
      controls = learnCloseControls(ltFinish);
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: wide ? 820 : 600 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ 4 L'S · cierre del ciclo en 4 dimensiones (Aprendizaje E) ════════
  if (session.type === "fourls") {
    const FLCOLS = [
      { key: "flliked", label: "👍 Liked · ¿qué disfrutamos o valoramos?", color: "var(--success)" },
      { key: "fllearned", label: "📚 Learned · ¿qué aprendimos?", color: "var(--st-learn)" },
      { key: "fllacked", label: "😕 Lacked · ¿qué nos faltó?", color: "var(--warning)" },
      { key: "fllonged", label: "🌟 Longed for · ¿qué deseamos para el próximo ciclo?", color: "var(--st-proof)" },
    ];
    const flAll = allCards.filter((c) => FLCOLS.some((col) => col.key === c.columnKey));
    const flCount = FLCOLS.reduce((a, c) => a + (counts[c.key] ?? 0), 0);
    const myFlIds = ((inputs.find((i) => i.userId === user.id && i.key === "flv")?.value as { ids?: string[] } | undefined)?.ids) ?? [];
    const flVotesOf = (id: string) => inputs.filter((x) => x.key === "flv").reduce((a, x) => a + (((x.value as { ids?: string[] }).ids ?? []).includes(id) ? 1 : 0), 0);
    const toggleFlVote = (id: string) => { const cur = new Set(myFlIds); if (cur.has(id)) cur.delete(id); else if (cur.size < 3) cur.add(id); tapInput("flv", { ids: [...cur] }); };
    const flVoters = new Set(inputs.filter((x) => x.key === "flv" && ((x.value as { ids?: string[] }).ids ?? []).length).map((x) => x.voterKey)).size;
    const flShown = !!session.result.flShown;
    const learnedCards = allCards.filter((c) => c.columnKey === "fllearned");
    const longedCards = allCards.filter((c) => c.columnKey === "fllonged");
    const lackedCards = allCards.filter((c) => c.columnKey === "fllacked");
    const topOf = (cards: typeof flAll, n = 3) => [...cards].sort((a, b) => flVotesOf(b.id) - flVotesOf(a.id)).filter((c) => flVotesOf(c.id) > 0).slice(0, n);
    const flExportSel = new Set((session.result.flExportSel as string[]) ?? learnedCards.map((c) => c.id));
    const flExportMeta = (session.result.flExportMeta as Record<string, { type?: string; transferable?: boolean; urgent?: boolean }>) ?? {};
    const setExpMeta = (id: string, patch: Record<string, unknown>) => patchResult({ flExportMeta: { ...((resultRef.current.flExportMeta as Record<string, unknown>) ?? {}), [id]: { ...(flExportMeta[id] ?? {}), ...patch } } });
    const toggleExp = (id: string) => { const cur = new Set(flExportSel); if (cur.has(id)) cur.delete(id); else cur.add(id); patchResult({ flExportSel: [...cur] }); };
    const learnPriorContext = initiative?.data?.learn as { narrative?: string; result?: string } | undefined;
    const addFl = async (colKey: string) => { const t = (cardDraft[colKey] ?? "").trim(); if (!t) return; await addCard(sessionId, colKey, t, true); setCardDraft((d) => ({ ...d, [colKey]: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
    const flFinish = async () => {
      setBusy(true);
      const nowIso = new Date().toISOString();
      const exported: LearningEntry[] = learnedCards.filter((c) => flExportSel.has(c.id)).map((c) => ({
        id: c.id, text: c.text, initiativeId: initiative?.id, initiativeTitle: initiative?.title,
        stage: "learn", type: flExportMeta[c.id]?.type as LearningEntry["type"], resonances: flVotesOf(c.id),
        transferable: !!flExportMeta[c.id]?.transferable, urgent: !!flExportMeta[c.id]?.urgent, date: nowIso,
      }));
      const existing = (team?.data?.library as LearningEntry[] | undefined) ?? [];
      const merged = [...existing.filter((e) => !exported.some((n) => n.id === e.id)), ...exported];
      const desires = topOf(longedCards).map((c) => c.text);
      await finalizeSession(session, {
        pulseAvg: avg, cardCount: flCount,
        summaryText: `4 L's: ${flAll.length} tarjetas · ${exported.length} a la Biblioteca`,
        dataKey: "learn", dataValue: { learnings: learnedCards.map((c) => c.text), desires, closeWords },
        teamData: exported.length ? { library: merged } : undefined, noAdvance: true,
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (step === "flcontext") {
      sub = "Vamos a hacer un cierre completo del ciclo en 4 dimensiones.";
      content = (
        <Card pad={22} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔚</div>
          <p style={{ fontSize: "var(--t-md)", fontWeight: 700, lineHeight: 1.45 }}>Liked · Learned · Lacked · Longed for</p>
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 8 }}>Lo que gustó, lo que aprendimos, lo que faltó y lo que anhelamos.</p>
          {learnPriorContext?.narrative && <div style={{ marginTop: 14, textAlign: "left", padding: "10px 12px", background: "color-mix(in srgb, var(--st-learn) 8%, transparent)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", fontSize: "var(--t-xs)", lineHeight: 1.5 }}><span className="eyebrow" style={{ color: "var(--st-learn)", display: "block", marginBottom: 4 }}>El resultado del ciclo</span>{learnPriorContext.narrative}</div>}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "flwrite", 1); setBusy(false); }}>Empezar</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador encuadra el cierre.</p>;
    } else if (step === "flwrite") {
      sub = "Escritura silenciosa, en anónimo. Una idea por tarjeta, sin límite.";
      content = (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 12 }}>
          {FLCOLS.map((col) => {
            const mine = myCards.filter((c) => c.columnKey === col.key);
            return (
              <Card key={col.key} pad={14} style={{ borderTop: `3px solid ${col.color}` }}>
                <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 8, lineHeight: 1.35 }}>{col.label}</div>
                <HiddenDots n={counts[col.key] ?? 0} label="ocultas" color={col.color} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {mine.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${col.color}`, borderRadius: "var(--r-sm)", padding: "7px 9px", fontSize: "var(--t-xs)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 4 }}>· tuya</span></div>)}
                </div>
                {!isFacil && (
                  <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                    <input value={cardDraft[col.key] ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, [col.key]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addFl(col.key)} placeholder="Sumar…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "7px 9px", fontSize: "var(--t-xs)", outline: "none" }} />
                    <button onClick={() => addFl(col.key)} style={{ width: 30, borderRadius: "var(--r-sm)", background: col.color, color: "#08120c", border: "none", display: "grid", placeItems: "center" }}><Icon name="Plus" size={14} /></button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Eye" disabled={busy || flCount === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "flreveal", 2); setBusy(false); }}>Revelar el tablero ({flCount})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Completá las 4 dimensiones. El facilitador revela cuando todos terminen.</p>;
    } else if (step === "flreveal") {
      wide = true;
      sub = "El tablero del equipo. Agrupá lo similar mentalmente; después votamos.";
      content = (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 12 }}>
          {FLCOLS.map((col) => {
            const cs = allCards.filter((c) => c.columnKey === col.key);
            return (
              <div key={col.key} style={{ background: "var(--bg-2)", border: `1px solid color-mix(in srgb, ${col.color} 30%, var(--line))`, borderTop: `3px solid ${col.color}`, borderRadius: "var(--r-lg)", padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 8, lineHeight: 1.35 }}>{col.label} <span className="num muted">{cs.length}</span></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {cs.map((c, i) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${col.color}`, borderRadius: "var(--r-sm)", padding: "8px 10px", fontSize: "var(--t-sm)", animation: `pop-in .4s var(--spring) ${i * 0.03}s both` }}>{c.text}</div>)}
                  {!cs.length && <div className="faint" style={{ fontSize: "var(--t-xs)", textAlign: "center", padding: 12 }}>Sin tarjetas</div>}
                </div>
              </div>
            );
          })}
        </div>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "flvote", 3); setBusy(false); }}>Votar (3 puntos c/u)</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Mirá el tablero completo.</p>;
    } else if (step === "flvote") {
      wide = true;
      sub = flShown ? "Las más votadas de cada dimensión." : "3 puntos por persona, en cualquier tarjeta. Foco en Learned y Longed for.";
      content = (
        <>
          {!flShown && !isFacil && <div style={{ textAlign: "center", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><span className="muted" style={{ fontSize: "var(--t-sm)" }}>Tus puntos:</span>{Array.from({ length: 3 }).map((_, i) => <span key={i} style={{ width: 15, height: 15, borderRadius: 99, background: i < (3 - myFlIds.length) ? "var(--st-learn)" : "var(--card-2)", border: `1px solid ${i < (3 - myFlIds.length) ? "var(--st-learn)" : "var(--line-2)"}` }} />)}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 12 }}>
            {FLCOLS.map((col) => {
              const cs = [...allCards.filter((c) => c.columnKey === col.key)].sort((a, b) => flVotesOf(b.id) - flVotesOf(a.id));
              return (
                <div key={col.key} style={{ background: "var(--bg-2)", border: `1px solid color-mix(in srgb, ${col.color} 30%, var(--line))`, borderTop: `3px solid ${col.color}`, borderRadius: "var(--r-lg)", padding: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 8, lineHeight: 1.35 }}>{col.label}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {cs.map((c) => { const v = flVotesOf(c.id); const on = myFlIds.includes(c.id); return (
                      <button key={c.id} disabled={isFacil || flShown} onClick={() => toggleFlVote(c.id)} style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 8, background: on && !flShown ? `color-mix(in srgb, ${col.color} 10%, var(--card))` : "var(--card)", border: `1px solid ${on && !flShown ? col.color : "var(--line)"}`, borderRadius: "var(--r-sm)", padding: "8px 10px", fontSize: "var(--t-xs)", cursor: isFacil || flShown ? "default" : "pointer" }}>
                        <span style={{ flex: 1 }}>{c.text}</span>
                        {flShown ? <span className="num" style={{ fontWeight: 800, color: v > 0 ? col.color : "var(--ink-3)" }}>{v}</span> : on && <Icon name="CheckCircle2" size={13} style={{ color: col.color }} />}
                      </button>
                    ); })}
                    {!cs.length && <div className="faint" style={{ fontSize: "var(--t-xs)", textAlign: "center", padding: 8 }}>—</div>}
                  </div>
                </div>
              );
            })}
          </div>
          {!flShown && <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)", marginTop: 12 }}><Icon name="EyeOff" size={13} /> {flVoters} de {totalInRoom} votaron</p>}
        </>
      );
      controls = isFacil
        ? (flShown
          ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "fltalk", 4); setBusy(false); }}>Conversar las más votadas</Button>
          : <Button full size="lg" icon="Eye" disabled={busy || flVoters === 0} onClick={() => setResult(sessionId, { flShown: true })}>Mostrar votación ({flVoters}/{totalInRoom})</Button>)
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Repartí tus 3 puntos.</p>;
    } else if (step === "fltalk") {
      sub = "Conversación sobre lo más votado.";
      const Block = (title: string, q: string, cards: typeof flAll, color: string) => (
        <Card pad={14}>
          <div className="eyebrow" style={{ color, marginBottom: 6 }}>{title}</div>
          <p className="muted" style={{ fontSize: "var(--t-xs)", fontStyle: "italic", marginBottom: 8 }}>{q}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {cards.length ? cards.map((c) => <div key={c.id} style={{ fontSize: "var(--t-sm)", display: "flex", gap: 6 }}><Icon name="Dot" size={16} style={{ color }} /><span style={{ flex: 1 }}>{c.text}</span><span className="num muted">{flVotesOf(c.id)}</span></div>) : <span className="muted" style={{ fontSize: "var(--t-xs)" }}>Sin votos.</span>}
          </div>
        </Card>
      );
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Block("📚 Learned más votados", "¿Cómo nos aseguramos de aplicar esto? (se sugieren para la Biblioteca)", topOf(learnedCards), "var(--st-learn)")}
          {Block("😕 Lacked más votados", "¿Qué haríamos diferente en el próximo ciclo?", topOf(lackedCards), "var(--warning)")}
          {Block("🌟 Longed for más votados", "¿Cómo convertimos estos deseos en objetivos del próximo ciclo?", topOf(longedCards), "var(--st-proof)")}
        </div>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "flexport", 5); setBusy(false); }}>Exportar a la Biblioteca</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Conversemos las más votadas.</p>;
    } else if (step === "flexport") {
      sub = isFacil ? "Elegí qué aprendizajes (Learned) van a la Biblioteca, con su tipo." : "El facilitador selecciona los aprendizajes para la Biblioteca.";
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {learnedCards.length === 0 && <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>No hubo tarjetas en Learned.</p>}
          {learnedCards.map((c) => { const sel = flExportSel.has(c.id); const m = flExportMeta[c.id] ?? {}; return (
            <Card key={c.id} pad={14} style={{ opacity: sel ? 1 : 0.6 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <button disabled={!isFacil} onClick={() => toggleExp(c.id)} style={{ marginTop: 1, color: sel ? "var(--st-learn)" : "var(--ink-3)" }}><Icon name={sel ? "CheckSquare" : "Square"} size={18} /></button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "var(--t-sm)", lineHeight: 1.45, marginBottom: sel ? 8 : 0 }}>{c.text}</div>
                  {sel && isFacil && (
                    <>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        {LEARNING_TYPES.map((t) => { const on = m.type === t.k; return <button key={t.k} onClick={() => setExpMeta(c.id, { type: t.k })} style={{ padding: "4px 9px", borderRadius: "var(--r-full)", fontSize: 11, fontWeight: 600, border: `1.5px solid ${on ? t.color : "var(--line-2)"}`, background: on ? `color-mix(in srgb, ${t.color} 14%, var(--card))` : "var(--card)", color: on ? t.color : "var(--ink-2)" }}>{t.emoji} {t.label}</button>; })}
                      </div>
                      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11 }}>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }}><input type="checkbox" checked={!!m.transferable} onChange={(e) => setExpMeta(c.id, { transferable: e.target.checked })} /> Transferible</label>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }}><input type="checkbox" checked={!!m.urgent} onChange={(e) => setExpMeta(c.id, { urgent: e.target.checked })} /> Urgente</label>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ); })}
        </div>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "flclose", 6); setBusy(false); }}>Cerrar con una palabra</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador exporta los aprendizajes.</p>;
    } else {
      sub = "El ritual de cierre del ciclo.";
      content = learnClosing();
      controls = learnCloseControls(flFinish);
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: wide ? 880 : 620 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ KUDOS RETRO · reconocimiento y gratitud (Aprendizaje F) ════════
  if (session.type === "kudos") {
    type Kudo = { to?: string; emoji?: string; text?: string };
    const parseKudo = (s: string): Kudo => { try { return JSON.parse(s) as Kudo; } catch { return { text: s }; } };
    const kudoCards = allCards.filter((c) => c.columnKey === "kudo");
    const kudoCount = counts["kudo"] ?? 0;
    const myKudos = myCards.filter((c) => c.columnKey === "kudo");
    const nameOf = (uid?: string) => participants.find((p) => p.userId === uid)?.name ?? "alguien";
    const initOf = (name: string) => (team?.members.find((m) => m.name === name)?.name ?? name).split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    const kudIdx = (session.result.kudIdx as number) ?? 0;
    const receivers = new Set(kudoCards.map((c) => parseKudo(c.text).to).filter(Boolean) as string[]);
    const noKudos = (team?.members ?? []).map((m) => m.name).filter((n) => !receivers.has(n));
    const kudTo = (cardDraft.kudoTo ?? "") as string;
    const kudEmoji = (cardDraft.kudoEmoji ?? "") as string;
    const kudText = (cardDraft.kudoText ?? "") as string;
    const addKudo = async () => {
      if (!kudTo || !kudText.trim()) return;
      await addCard(sessionId, "kudo", JSON.stringify({ to: kudTo, emoji: kudEmoji, text: kudText.trim() }), false);
      setCardDraft((d) => ({ ...d, kudoTo: "", kudoEmoji: "", kudoText: "" }));
      if (user) setMyCards(await getMyCards(sessionId, user.id));
    };
    const emojiTally = kudoCards.reduce((acc, c) => { const e = parseKudo(c.text).emoji; if (e) acc[e] = (acc[e] ?? 0) + 1; return acc; }, {} as Record<string, number>);
    const kudFinish = async () => {
      setBusy(true);
      await finalizeSession(session, {
        pulseAvg: avg, cardCount: kudoCount,
        summaryText: `Kudos: ${kudoCards.length} reconocimientos`,
        dataKey: "learn", dataValue: { closeWords },
        noAdvance: true,
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "", wide = false;
    if (step === "kudwrite") {
      sub = "Acá no hablamos de qué mejorar. Solo de lo que valoramos del trabajo de cada uno.";
      content = (
        <Card pad={20}>
          {isFacil ? (
            <div style={{ textAlign: "center", padding: "8px 0" }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--warning)" }}>{kudoCount}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>kudos escritos · {receivers.size}/{(team?.members.length ?? 0)} reconocidos</div></div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {myKudos.map((c) => { const k = parseKudo(c.text); return <div key={c.id} style={{ fontSize: "var(--t-sm)", padding: "8px 10px", background: "var(--card-2)", border: "1px solid var(--line)", borderRadius: "var(--r-sm)" }}>{k.emoji} <b>{k.to}</b>: {k.text}</div>; })}
              </div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Quiero reconocer a…</div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>
                {(team?.members ?? []).map((m) => { const on = kudTo === m.name; return <button key={m.name} onClick={() => setCardDraft((d) => ({ ...d, kudoTo: m.name }))} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: "var(--r-full)", fontSize: "var(--t-xs)", fontWeight: 600, border: `1.5px solid ${on ? "var(--warning)" : "var(--line-2)"}`, background: on ? "color-mix(in srgb, var(--warning) 13%, var(--card))" : "var(--card)" }}><Avatar name={m.name} size={18} idx={0} /> {m.name}</button>; })}
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {KUDO_EMOJIS.map((e) => <button key={e} onClick={() => setCardDraft((d) => ({ ...d, kudoEmoji: kudEmoji === e ? "" : e }))} style={{ fontSize: 20, padding: "4px 8px", borderRadius: "var(--r-sm)", border: `1.5px solid ${kudEmoji === e ? "var(--warning)" : "var(--line-2)"}`, background: kudEmoji === e ? "color-mix(in srgb, var(--warning) 13%, var(--card))" : "var(--card)" }}>{e}</button>)}
              </div>
              <textarea value={kudText} onChange={(e) => setCardDraft((d) => ({ ...d, kudoText: e.target.value }))} rows={2} placeholder="…por…" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none", lineHeight: 1.5, resize: "vertical" }} />
              <Button full icon="Plus" disabled={!kudTo || !kudText.trim()} onClick={addKudo} style={{ marginTop: 10 }}>Sumar este kudo</Button>
              <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 10, textAlign: "center" }}>Escribí al menos uno. Sin límite. No es anónimo: el reconocimiento vale más cuando se sabe quién lo da.</p>
            </>
          )}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Gift" disabled={busy || kudoCount === 0} onClick={async () => { setBusy(true); await setResult(sessionId, { kudIdx: 0 }); await setStep(sessionId, "kuddeliver", 1); setBusy(false); }}>Entregar los kudos ({kudoCount})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Escribí tu reconocimiento. El facilitador entrega cuando estén todos.</p>;
    } else if (step === "kuddeliver") {
      sub = isFacil ? "Leé cada kudo en voz alta. Sin debate, solo reconocimiento." : "La entrega de los kudos del equipo.";
      const cur = kudoCards[kudIdx];
      const curK = cur ? parseKudo(cur.text) : null;
      const delivered = kudoCards.slice(0, kudIdx);
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {curK && <KudosCard from={{ name: nameOf(cur!.authorId) }} to={{ name: curK.to ?? "—", initials: initOf(curK.to ?? "") }} text={curK.text ?? ""} emoji={curK.emoji} big />}
          {kudIdx >= kudoCards.length && <Card pad={20} style={{ textAlign: "center" }}><div style={{ fontSize: 30 }}>🎉</div><p style={{ fontSize: "var(--t-md)", fontWeight: 700, marginTop: 8 }}>Esto es lo que construimos juntos en este ciclo.</p></Card>}
          {delivered.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="eyebrow">Ya entregados</div>
              {delivered.map((c, i) => { const k = parseKudo(c.text); return <KudosCard key={c.id} from={{ name: nameOf(c.authorId) }} to={{ name: k.to ?? "—", initials: initOf(k.to ?? "") }} text={k.text ?? ""} emoji={k.emoji} idx={i} />; })}
            </div>
          )}
          {isFacil && noKudos.length > 0 && kudIdx >= kudoCards.length && (
            <div style={{ padding: "10px 13px", background: "var(--card-2)", border: "1px dashed var(--line-2)", borderRadius: "var(--r-md)", fontSize: "var(--t-xs)", lineHeight: 1.5 }}>
              <Icon name="Info" size={13} /> Sin kudos todavía: <b>{noKudos.join(", ")}</b>. Sin forzar, podés preguntar: "¿alguien quiere agregar algo para ellos?"
            </div>
          )}
        </div>
      );
      controls = isFacil
        ? (kudIdx < kudoCards.length
          ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={() => setResult(sessionId, { kudIdx: kudIdx + 1 })}>Siguiente kudo ({kudIdx + 1}/{kudoCards.length})</Button>
          : <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "kudclose", 2); setBusy(false); }}>Cerrar con una palabra</Button>)
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Escuchá los reconocimientos del equipo.</p>;
    } else {
      sub = "El ritual de cierre del ciclo.";
      content = (
        <>
          {Object.keys(emojiTally).length > 0 && <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 14 }}>{Object.entries(emojiTally).sort((a, b) => b[1] - a[1]).map(([e, n]) => <span key={e} style={{ fontSize: "var(--t-sm)" }}>{e} <span className="num muted">{n}</span></span>)}</div>}
          {learnClosing()}
        </>
      );
      controls = learnCloseControls(kudFinish);
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: wide ? 720 : 600 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ CARTA AL EQUIPO FUTURO · memoria narrativa (Aprendizaje G) ════════
  if (session.type === "letter") {
    const r = session.result;
    const defaultTarget = (() => { const d = new Date(now); d.setMonth(d.getMonth() + 3); return d.toISOString().slice(0, 10); })();
    const targetDate = (r.ltTargetDate as string) || defaultTarget;
    const fmtLong = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" }); };
    const letters = inputs.filter((i) => i.key === "letter").map((i) => ({ uid: i.userId, text: (i.value as { text?: string }).text ?? "", name: participants.find((p) => p.userId === i.userId)?.name ?? "alguien" })).filter((l) => l.text.trim());
    const myLetter = (inputs.find((i) => i.userId === user.id && i.key === "letter")?.value as { text?: string } | undefined)?.text ?? "";
    const written = inputs.filter((i) => i.key === "letter" && ((i.value as { text?: string }).text ?? "").trim()).length;
    const commits = (r.ltCommit as string[]) ?? ["", "", ""];
    const setCommit = (i: number, val: string) => { const arr = (((resultRef.current.ltCommit as string[]) ?? commits)).slice(); while (arr.length <= i) arr.push(""); arr[i] = val; patchResult({ ltCommit: arr }); };
    const ltFinish = async () => {
      setBusy(true);
      await finalizeSession(session, {
        pulseAvg: avg,
        summaryText: `Carta al equipo futuro · ${letters.length} cartas`,
        dataKey: "learn", dataValue: { commitments: commits.filter((c) => c.trim()), letterDate: targetDate, closeWords },
        noAdvance: true,
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "";
    if (step === "ltframe") {
      sub = "Le escribimos al equipo del futuro. ¿Qué queremos que recuerden de este ciclo?";
      content = (
        <Card pad={24} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>✉️</div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Destinatario</div>
          <p style={{ fontSize: "var(--t-lg)", fontWeight: 800, lineHeight: 1.4 }}>El equipo {team?.name ?? ""}<br /><span style={{ color: "var(--st-learn)" }}>el {fmtLong(targetDate)}</span></p>
          {isFacil && (
            <div style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span className="muted" style={{ fontSize: "var(--t-xs)" }}>Fecha objetivo:</span>
              <input type="date" defaultValue={targetDate} onBlur={(e) => { if (e.target.value) patchResult({ ltTargetDate: e.target.value }); }} style={{ background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "7px 10px", fontSize: "var(--t-sm)", outline: "none" }} />
            </div>
          )}
          <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 14, lineHeight: 1.5 }}>La carta queda guardada con esta fecha y aparece como recordatorio in-app cuando llegue el momento.</p>
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "ltwrite", 1); setBusy(false); }}>Escribir las cartas</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador encuadra el ejercicio.</p>;
    } else if (step === "ltwrite") {
      sub = "Tu carta, a tu manera. No anónima.";
      content = isFacil ? (
        <Card pad={24} style={{ textAlign: "center" }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--st-learn)" }}>{written}/{totalInRoom}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>escribieron su carta</div></Card>
      ) : (
        <Card pad={20}>
          <div style={{ fontSize: "var(--t-xs)", color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 12, padding: "10px 12px", background: "var(--card-2)", borderRadius: "var(--r-md)" }}>
            Estructura sugerida (no obligatoria):<br />· Lo más importante que aprendimos fue…<br />· Si pudiéramos volver a hacer X lo haríamos diferente porque…<br />· Lo que queremos que recuerden es…<br />· El consejo más importante que les damos es…
          </div>
          <textarea defaultValue={myLetter} onBlur={(e) => setMyInput(sessionId, "letter", { text: e.target.value })} rows={8} placeholder="Querido equipo del futuro…" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "12px 14px", fontSize: "var(--t-sm)", outline: "none", lineHeight: 1.6, resize: "vertical" }} />
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Eye" disabled={busy || written === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "ltread", 2); setBusy(false); }}>Lectura compartida ({written})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Escribí tu carta. El facilitador abre la lectura cuando estén.</p>;
    } else if (step === "ltread") {
      sub = "Cada uno lee su carta en voz alta. Escuchamos en silencio.";
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {letters.map((l, i) => (
            <Card key={l.uid} pad={16} style={{ animation: `pop-in .4s var(--spring) ${i * 0.05}s both` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><Avatar name={l.name} size={26} idx={i} /><b style={{ fontSize: "var(--t-sm)" }}>{l.name}</b></div>
              <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{l.text}</p>
            </Card>
          ))}
          {!letters.length && <p className="muted" style={{ fontSize: "var(--t-sm)" }}>Todavía no hay cartas.</p>}
        </div>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "lttheme", 3); setBusy(false); }}>Identificar temas comunes</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Escuchá las cartas del equipo.</p>;
    } else if (step === "lttheme") {
      sub = "Los temas que se repiten se vuelven compromisos del equipo para el próximo ciclo.";
      content = (
        <Card pad={20}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Compromisos del equipo (lo que se repite en las cartas)</div>
          {isFacil ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[0, 1, 2].map((i) => <input key={i} defaultValue={commits[i] ?? ""} onBlur={(e) => setCommit(i, e.target.value)} placeholder={`Compromiso ${i + 1}…`} style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" }} />)}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {commits.filter((c) => c.trim()).length ? commits.filter((c) => c.trim()).map((c, i) => <div key={i} style={{ fontSize: "var(--t-sm)", display: "flex", gap: 6 }}><Icon name="Flag" size={14} style={{ color: "var(--st-learn)" }} /><span>{c}</span></div>) : <p className="muted" style={{ fontSize: "var(--t-sm)" }}>El facilitador está identificando los temas…</p>}
            </div>
          )}
          <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 12 }}>Quedan visibles en el dashboard del equipo.</p>
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "ltclose", 4); setBusy(false); }}>Cerrar con una palabra</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador identifica los temas comunes.</p>;
    } else {
      sub = "El ritual de cierre del ciclo.";
      content = learnClosing();
      controls = learnCloseControls(ltFinish);
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: 640 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ SPEED DATING · cerrar tensiones de a dos (Aprendizaje H · sensible) ════════
  if (session.type === "speeddating") {
    const r = session.result;
    const hasContract = !!team?.data?.contract;
    // Parejas rotativas (método del círculo). Determinista, sin azar.
    const players = (team?.members ?? []).map((m) => m.name);
    const genRounds = (names: string[]) => {
      const arr = names.slice();
      if (arr.length < 2) return [] as [string, string][][];
      if (arr.length % 2) arr.push("—"); // bye
      const n = arr.length, half = n / 2;
      const order = arr.slice();
      const rounds: [string, string][][] = [];
      for (let r2 = 0; r2 < n - 1; r2++) {
        const pairs: [string, string][] = [];
        for (let i = 0; i < half; i++) { const a = order[i], b = order[n - 1 - i]; if (a !== "—" && b !== "—") pairs.push([a, b]); }
        rounds.push(pairs);
        order.splice(1, 0, order.pop()!); // rotate keeping first fixed
      }
      return rounds;
    };
    const allRounds = genRounds(players);
    const maxRounds = players.length > 6 ? Math.min(3, allRounds.length) : allRounds.length;
    const rounds = allRounds.slice(0, maxRounds);
    const sdRound = (r.sdRound as number) ?? 0;
    const sdQ = (r.sdQ as string[]) ?? [
      "¿Hay algo que quieras agradecerme de este ciclo?",
      "¿Hay algo que quieras pedirme para el próximo?",
      "¿Hay algo que necesite quedarse entre nosotros antes de cerrar?",
    ];
    const setQ = (i: number, val: string) => { const arr = sdQ.slice(); arr[i] = val; patchResult({ sdQ: arr }); };
    const helpReqs = inputs.filter((i) => i.key === "sdhelp").length;
    const iAskedHelp = inputs.some((i) => i.userId === user.id && i.key === "sdhelp");
    const shared = inputs.filter((i) => i.key === "sdshare").map((i) => ({ name: participants.find((p) => p.userId === i.userId)?.name ?? "alguien", text: (i.value as { text?: string }).text ?? "" })).filter((s) => s.text.trim());
    const sdShareDraft = (cardDraft.sdshare ?? "") as string;
    const sdFinish = async () => {
      setBusy(true);
      await finalizeSession(session, {
        pulseAvg: avg,
        summaryText: `Speed Dating · ${players.length} participantes · ${rounds.length} rondas${shared.length ? ` · ${shared.length} compartieron` : ""}`,
        dataKey: "learn", dataValue: { closeWords },
        noAdvance: true,
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "";
    if (step === "sdwarn") {
      sub = "Antes de abrir: esta retro trabaja relaciones personales.";
      content = (
        <Card pad={20} style={{ border: "1px solid color-mix(in srgb, var(--warning) 45%, var(--line))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: "var(--warning)" }}><Icon name="TriangleAlert" size={20} /><b style={{ fontSize: "var(--t-md)" }}>Recomendaciones</b></div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: "var(--t-sm)", lineHeight: 1.7 }}>
            <li>Asegurate de que el contrato de equipo esté activo {hasContract ? <span style={{ color: "var(--green)" }}>✓ activo</span> : <span style={{ color: "var(--risk)" }}>· no encontrado</span>}</li>
            <li>Recordá al equipo las reglas de seguridad</li>
            <li>Tené preparado el protocolo de emergencia</li>
            <li><b>No funciona si hay conflictos graves.</b> En ese caso, trabajá en privado primero.</li>
          </ul>
          {!hasContract && <div style={{ marginTop: 12, padding: "9px 12px", background: "var(--risk-bg)", border: "1px solid color-mix(in srgb, var(--risk) 40%, transparent)", borderRadius: "var(--r-md)", fontSize: "var(--t-xs)", lineHeight: 1.5 }}><Icon name="Info" size={13} style={{ color: "var(--risk)" }} /> El contrato del equipo no está activo. Conviene tenerlo antes de abrir esta retro.</div>}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" icon="ShieldCheck" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "sdframe", 1); setBusy(false); }}>Confirmar apertura</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador está preparando la sesión.</p>;
    } else if (step === "sdframe") {
      sub = "Para cerrar conversaciones pendientes del ciclo. No para resolver conflictos grandes.";
      content = (
        <Card pad={20}>
          <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.55, marginBottom: 14 }}>Es para <b>reconocer, pedir y agradecer</b> en conversaciones de a dos.</p>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Reglas</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: "var(--t-sm)", lineHeight: 1.7 }}>
            <li>Escuchamos sin interrumpir</li>
            <li>Hablamos en primera persona</li>
            <li>Lo que se dice en las parejas, queda en las parejas</li>
            <li>Nadie está obligado a compartir en el plenario</li>
          </ul>
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "sdpairs", 2); setBusy(false); }}>Formar las parejas</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Leé las reglas. Arrancamos en un momento.</p>;
    } else if (step === "sdpairs") {
      sub = `Vamos a hacer ${rounds.length} ${rounds.length === 1 ? "ronda" : "rondas"} para que se crucen.`;
      content = players.length < 2 ? (
        <Card pad={20} style={{ textAlign: "center" }}><p className="muted" style={{ fontSize: "var(--t-sm)" }}>Se necesitan al menos 2 integrantes para el Speed Dating.</p></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rounds.map((pairs, ri) => (
            <Card key={ri} pad={14}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Ronda {ri + 1}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {pairs.map(([a, b], pi) => <span key={pi} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: "var(--r-full)", background: "var(--card-2)", border: "1px solid var(--line)", fontSize: "var(--t-xs)", fontWeight: 600 }}>{a} <Icon name="ArrowLeftRight" size={12} style={{ color: "var(--st-learn)" }} /> {b}</span>)}
              </div>
            </Card>
          ))}
          <p className="muted" style={{ fontSize: "var(--t-xs)", textAlign: "center" }}>En remoto, abrí salas de breakout por pareja. Cada ronda dura 3 minutos.</p>
        </div>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy || players.length < 2} onClick={async () => { setBusy(true); await setResult(sessionId, { sdRound: 0 }); await setStep(sessionId, "sdrounds", 3); setBusy(false); }}>Empezar las rondas</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador organiza las parejas.</p>;
    } else if (step === "sdrounds") {
      const pairs = rounds[sdRound] ?? [];
      sub = `Ronda ${sdRound + 1} de ${rounds.length} · 3 minutos`;
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card pad={16}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Las parejas de esta ronda</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {pairs.map(([a, b], pi) => <span key={pi} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: "var(--r-full)", background: "color-mix(in srgb, var(--st-learn) 10%, var(--card))", border: "1px solid color-mix(in srgb, var(--st-learn) 30%, transparent)", fontSize: "var(--t-sm)", fontWeight: 700 }}>{a} <Icon name="ArrowLeftRight" size={13} style={{ color: "var(--st-learn)" }} /> {b}</span>)}
            </div>
          </Card>
          <Card pad={16}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Preguntas guía</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sdQ.map((q, i) => isFacil
                ? <input key={i} defaultValue={q} onBlur={(e) => setQ(i, e.target.value)} style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "8px 10px", fontSize: "var(--t-sm)", outline: "none" }} />
                : <div key={i} style={{ fontSize: "var(--t-sm)", display: "flex", gap: 8, lineHeight: 1.4 }}><Icon name="MessageCircle" size={14} style={{ color: "var(--st-learn)", flexShrink: 0, marginTop: 2 }} /><span>{q}</span></div>)}
            </div>
          </Card>
          {!isFacil && (
            <div style={{ textAlign: "center" }}>
              {iAskedHelp
                ? <span style={{ color: "var(--warning)", fontSize: "var(--t-sm)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="Hand" size={15} /> Avisaste al facilitador</span>
                : <button onClick={() => tapInput("sdhelp", { at: now })} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: "var(--r-full)", border: "1px solid color-mix(in srgb, var(--risk) 40%, var(--line-2))", background: "var(--card)", color: "var(--risk)", fontSize: "var(--t-xs)", fontWeight: 600 }}>🛑 Necesito hablar con el facilitador</button>}
            </div>
          )}
          {isFacil && helpReqs > 0 && <div style={{ padding: "10px 13px", background: "var(--risk-bg)", border: "1px solid color-mix(in srgb, var(--risk) 45%, transparent)", borderRadius: "var(--r-md)", fontSize: "var(--t-sm)", lineHeight: 1.5 }}><Icon name="Hand" size={15} style={{ color: "var(--risk)" }} /> {helpReqs} {helpReqs === 1 ? "persona pidió" : "personas pidieron"} hablar con vos. Acercate o pausá la sesión si hace falta.</div>}
        </div>
      );
      controls = isFacil
        ? (sdRound < rounds.length - 1
          ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={() => setResult(sessionId, { sdRound: sdRound + 1 })}>Siguiente ronda ({sdRound + 2}/{rounds.length})</Button>
          : <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "sdplenary", 4); setBusy(false); }}>Plenario de cierre</Button>)
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Conversen de a dos. El facilitador controla el tiempo.</p>;
    } else if (step === "sdplenary") {
      sub = "¿Alguien quiere compartir algo de estas conversaciones con el grupo? Voluntario.";
      content = (
        <Card pad={20}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: shared.length ? 14 : 0 }}>
            {shared.map((s, i) => <div key={i} style={{ fontSize: "var(--t-sm)", padding: "9px 11px", background: "var(--card-2)", border: "1px solid var(--line)", borderRadius: "var(--r-sm)" }}><b>{s.name}:</b> {s.text}</div>)}
            {!shared.length && <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>Nada compartido todavía. No se fuerza nada.</p>}
          </div>
          {!isFacil && (
            <div style={{ display: "flex", gap: 6 }}>
              <input value={sdShareDraft} onChange={(e) => setCardDraft((d) => ({ ...d, sdshare: e.target.value }))} placeholder="Compartir algo (opcional)…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" }} />
              <Button size="sm" icon="Send" disabled={!sdShareDraft.trim()} onClick={() => { tapInput("sdshare", { text: sdShareDraft.trim() }); setCardDraft((d) => ({ ...d, sdshare: "" })); }}>Compartir</Button>
            </div>
          )}
          <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 12, textAlign: "center" }}><Icon name="Lock" size={11} /> Las conversaciones de las parejas no se guardan. Solo lo que elijan compartir acá.</p>
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setStep(sessionId, "sdclose", 5); setBusy(false); }}>Cerrar con una palabra</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Compartí solo si querés.</p>;
    } else {
      sub = "Cerramos este ciclo con estas conversaciones.";
      content = learnClosing("¿Con una palabra, cómo se van?");
      controls = learnCloseControls(sdFinish);
    }
    return (
      <Shell onExit={exit} mood={teamMood}>
        <div style={{ width: "100%", maxWidth: 620 }}>
          {Header(sub)}
          <div style={{ marginBottom: 16 }}>{facBar}</div>
          {content}
          <div style={{ marginTop: 18 }}>{controls}</div>
        </div>
      </Shell>
    );
  }

  // ════════ CONSOLIDACIÓN · ¿se sostuvo el cambio? (micro-sesión 30 días) ════════
  if (session.type === "consolidation") {
    const r = session.result;
    const CON = [
      { k: "sustained", emoji: "✅", t: "Sí, se volvió parte de cómo trabajamos", color: "var(--success)" },
      { k: "partial", emoji: "⚡", t: "Parcialmente, algunas cosas se mantienen", color: "var(--warning)" },
      { k: "reverted", emoji: "❌", t: "No, volvimos a como estábamos", color: "var(--risk)" },
    ];
    const votes = inputs.filter((i) => i.key === "convote").map((i) => (i.value as { v?: string }).v);
    const myVote = (inputs.find((i) => i.userId === user.id && i.key === "convote")?.value as { v?: string } | undefined)?.v;
    const tally = CON.map((o) => ({ ...o, n: votes.filter((v) => v === o.k).length }));
    const winner = [...tally].sort((a, b) => b.n - a.n)[0];
    const shown = !!r.conShown;
    const pf = initiative?.data?.proof;
    const conFinish = async () => {
      setBusy(true);
      const outcome = winner?.n ? winner.k : "partial";
      const nowIso = new Date().toISOString();
      const revertLearning: LearningEntry | null = outcome === "reverted" ? {
        id: `con-${session.id}`, text: "El cambio se revirtió al retirar el monitoreo. Necesita condiciones sistémicas para sostenerse (posible efecto Hawthorne).",
        initiativeId: initiative?.id, initiativeTitle: initiative?.title, stage: "learn", type: "process", transferable: true, date: nowIso,
      } : null;
      const existing = (team?.data?.library as LearningEntry[] | undefined) ?? [];
      const merged = revertLearning ? [...existing.filter((e) => e.id !== revertLearning.id), revertLearning] : existing;
      await finalizeSession(session, {
        pulseAvg: avg,
        summaryText: `Consolidación: ${CON.find((c) => c.k === outcome)?.t ?? "—"}`,
        dataKey: "consolidate", dataValue: { outcome, date: nowIso, pending: false },
        teamData: revertLearning ? { library: merged } : undefined,
        // Sostenida → archiva la variable como mejorada; parcial/revertida → vuelve activa.
        noAdvance: true, status: outcome === "sustained" ? "done" : "active",
      });
      setBusy(false); leave();
    };
    let content: React.ReactNode = null, controls: React.ReactNode = null, sub = "";
    if (step === "concheck") {
      sub = "30 días después. La pregunta de la verdad.";
      content = (
        <Card pad={24}>
          {pf?.chosenIdea && <div style={{ padding: "10px 12px", marginBottom: 16, background: "color-mix(in srgb, var(--st-learn) 9%, transparent)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", fontSize: "var(--t-sm)" }}><span className="muted">El cambio que implementamos:</span> {pf.chosenIdea}</div>}
          <p style={{ fontSize: "var(--t-md)", fontWeight: 700, lineHeight: 1.5, textAlign: "center", marginBottom: 18 }}>¿El cambio que implementamos se sostuvo sin que nadie lo estuviera monitoreando activamente?</p>
          {isFacil ? (
            <div style={{ textAlign: "center" }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--st-learn)" }}>{votes.length}/{totalInRoom}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>respondieron · anónimo</div></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {CON.map((o) => { const on = myVote === o.k; return (
                <button key={o.k} onClick={() => tapInput("convote", { v: o.k })} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: "var(--r-md)", textAlign: "left", border: `1.5px solid ${on ? o.color : "var(--line-2)"}`, background: on ? `color-mix(in srgb, ${o.color} 13%, var(--card))` : "var(--card)", cursor: "pointer" }}>
                  <span style={{ fontSize: 22 }}>{o.emoji}</span><span style={{ flex: 1, fontSize: "var(--t-sm)", fontWeight: 600 }}>{o.t}</span>{on && <Icon name="CheckCircle2" size={16} style={{ color: o.color }} />}
                </button>
              ); })}
            </div>
          )}
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Eye" disabled={busy || votes.length === 0} onClick={async () => { setBusy(true); await setStep(sessionId, "conresult", 1); await setResult(sessionId, { conShown: true }); setBusy(false); }}>Revelar resultado ({votes.length})</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Respondé con honestidad. Es anónimo.</p>;
    } else {
      sub = "El veredicto de la consolidación.";
      const outcome = winner?.n ? winner.k : "partial";
      const ow = CON.find((c) => c.k === outcome)!;
      content = (
        <Card pad={22}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {tally.map((o) => <div key={o.k} style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 18, width: 24 }}>{o.emoji}</span><span style={{ flex: 1, fontSize: "var(--t-sm)" }}>{o.t}</span><div style={{ width: 80, height: 8, borderRadius: 99, background: "var(--card-2)", overflow: "hidden" }}><div style={{ height: "100%", width: `${(o.n / Math.max(1, votes.length)) * 100}%`, background: o.color, borderRadius: 99 }} /></div><span className="num" style={{ fontWeight: 800, width: 18, textAlign: "right", color: o.color }}>{o.n}</span></div>)}
          </div>
          <div style={{ padding: "12px 14px", borderRadius: "var(--r-md)", background: `color-mix(in srgb, ${ow.color} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${ow.color} 30%, transparent)`, fontSize: "var(--t-sm)", lineHeight: 1.5 }}>
            <b style={{ color: ow.color }}>{ow.emoji} {ow.t}.</b>{" "}
            {outcome === "sustained" && "La variable se archiva como mejorada y entra en los logros del equipo."}
            {outcome === "partial" && "La variable vuelve al mapa como activa. Conviene una sesión de Foco sobre qué impide la consolidación total."}
            {outcome === "reverted" && "La variable vuelve al mapa. Se registró un aprendizaje en la Biblioteca: el cambio necesita condiciones sistémicas para sostenerse (posible efecto Hawthorne)."}
          </div>
        </Card>
      );
      controls = isFacil
        ? <Button full size="lg" icon="Check" disabled={busy} onClick={conFinish}>{busy ? "Guardando…" : "Cerrar la consolidación"}</Button>
        : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>El facilitador cierra la consolidación.</p>;
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
  const goNext = async () => { const idx = seq.indexOf(step); const nextKey = seq[Math.min(seq.length - 1, idx + 1)]; setBusy(true); await setStep(sessionId, nextKey, idx + 1); setBusy(false); };
  const clusterNoun = session.type === "explore" ? "Tensión" : "Grupo";
  const group = async () => { if (!sel.length) return; setBusy(true); const id = await createCluster(sessionId, `${clusterNoun} ${clusters.length + 1}`); if (id) for (const cid of sel) await assignCardToCluster(cid, id); setSel([]); setBusy(false); load(); };
  const finish = async () => {
    setBusy(true);
    // Retros clásicas de tablero: guardan el top votado por sección, sin tocar la iniciativa.
    if (session.type !== "explore") {
      const tops = RCOLS.map((col) => {
        const top = ranked.find((cl) => cardsOf(cl.id).some((c) => c.columnKey === col.key));
        return top ? `${col.label.split(" ·")[0]}: ${top.name}` : null;
      }).filter(Boolean);
      // Las de Ideación (Start/Stop/Continue, DAKI) dejan sus acciones top en proof
      // para que las sugiera "Diseño de la prueba".
      const IDEATION_BOARD = ["startstop", "daki"];
      const finalists = ranked.slice(0, 3).map((c) => c.name);
      // Starfish es de Seguimiento: sus ajustes priorizados van a follow.newActions.
      const isFollowBoard = session.type === "starfish";
      const dataKey = isFollowBoard && finalists.length ? "follow" : (IDEATION_BOARD.includes(session.type) && finalists.length ? "proof" : undefined);
      const dataValue = isFollowBoard && finalists.length
        ? { newActions: finalists.map((name) => ({ text: name, who: "" })) }
        : (IDEATION_BOARD.includes(session.type) && finalists.length ? { finalists } : undefined);
      await finalizeSession(session, {
        pulseAvg: avg, cardCount: allCards.length,
        summaryText: ranked[0] ? `top: ${ranked[0].name}` : (tops[0] ?? `${allCards.length} tarjetas`),
        dataKey,
        dataValue,
      });
      setBusy(false); leave(); return;
    }
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

  // ── Tablero-escena: la retro como dibujo, cada pregunta en su zona ──
  // (sailboat por ahora; sumar acá las próximas escenas).
  const SCENES: Record<string, { bg: string; center: string; centerTop?: number; horizon?: number; order: string[]; fullLast?: boolean; deco?: { e: string; left: string; top: string; size: number }[] }> = {
    sailboat: {
      bg: "linear-gradient(180deg, color-mix(in srgb, #38bdf8 18%, var(--bg-2)) 0%, color-mix(in srgb, #38bdf8 9%, var(--bg-2)) 54%, color-mix(in srgb, #0ea5e9 24%, var(--bg-2)) 54.2%, color-mix(in srgb, #0c4a6e 30%, var(--bg-2)) 100%)",
      center: "⛵", horizon: 54, order: ["wind", "island", "anchor", "rocks"],
      deco: [{ e: "☁️", left: "38%", top: "8%", size: 26 }, { e: "🌅", left: "62%", top: "12%", size: 22 }],
    },
    balloon: {
      bg: "linear-gradient(180deg, color-mix(in srgb, #7dd3fc 22%, var(--bg-2)) 0%, color-mix(in srgb, #38bdf8 12%, var(--bg-2)) 60%, color-mix(in srgb, #86efac 14%, var(--bg-2)) 100%)",
      center: "🎈", centerTop: 44, order: ["fire", "storm", "sand"], fullLast: true,
      deco: [{ e: "☁️", left: "30%", top: "10%", size: 24 }, { e: "☁️", left: "66%", top: "16%", size: 20 }, { e: "🌄", left: "48%", top: "84%", size: 24 }],
    },
    madsadglad: {
      bg: "linear-gradient(135deg, color-mix(in srgb, #EF4444 9%, var(--bg-2)) 0%, color-mix(in srgb, #3B82F6 9%, var(--bg-2)) 50%, color-mix(in srgb, #22C55E 10%, var(--bg-2)) 100%)",
      center: "🎭", centerTop: 44, order: ["mad", "sad", "glad"], fullLast: true,
    },
  };
  const scene = SCENES[session.type];
  const SceneBoard = (editable: boolean, reveal: boolean) => {
    if (!scene) return null;
    const Panel = (col: { key: string; label: string; color: string; icon: string }) => {
      const mine = myCards.filter((c) => c.columnKey === col.key);
      const revealed = allCards.filter((c) => c.columnKey === col.key);
      const list = reveal ? revealed : mine;
      const n = counts[col.key] ?? 0;
      const [title, q] = col.label.split(" · ");
      return (
        <div key={col.key} style={{ background: "color-mix(in srgb, var(--bg-2) 86%, transparent)", backdropFilter: "blur(3px)", border: `1px solid color-mix(in srgb, ${col.color} 45%, var(--line))`, borderRadius: "var(--r-lg)", padding: 12, display: "flex", flexDirection: "column", minHeight: 150 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
            <span style={{ fontWeight: 800, fontSize: "var(--t-sm)" }}>{title}</span>
            {!reveal && <span className="num" style={{ marginLeft: "auto", fontSize: "var(--t-xs)", color: "var(--ink-2)", background: "var(--card)", borderRadius: 99, padding: "1px 7px" }} title="escritas · ocultas">🔒 {n}</span>}
            {reveal && <span className="num" style={{ marginLeft: "auto", fontSize: "var(--t-xs)", color: col.color, fontWeight: 800 }}>{revealed.length}</span>}
          </div>
          {q && <div className="muted" style={{ fontSize: "var(--t-xs)", marginBottom: 8 }}>{q}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            {list.map((c, i) => (
              <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${col.color}`, borderRadius: "var(--r-md)", padding: "8px 10px", fontSize: "var(--t-xs)", lineHeight: 1.4, animation: reveal ? `pop-in .4s var(--spring) ${i * 0.04}s both` : undefined }}>
                {c.text}
                {!reveal && <span className="faint" style={{ fontSize: 10, marginLeft: 5 }}>· tuya</span>}
              </div>
            ))}
            {!list.length && <div style={{ color: "var(--ink-3)", fontSize: "var(--t-xs)", textAlign: "center", padding: 8 }}>{reveal ? "Sin tarjetas" : editable ? "Sumá lo tuyo · queda oculto" : "Ocultas hasta revelar"}</div>}
          </div>
          {editable && !reveal && (
            <div style={{ marginTop: 8, display: "flex", gap: 5 }}>
              <input value={cardDraft[col.key] ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, [col.key]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addExploreCard(col.key)} placeholder="Sumar…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "7px 9px", fontSize: "var(--t-xs)", outline: "none" }} />
              <button onClick={() => addExploreCard(col.key)} style={{ background: col.color, color: "#06121f", borderRadius: "var(--r-sm)", padding: "0 10px", display: "grid", placeItems: "center" }}><Icon name="Plus" size={14} /></button>
            </div>
          )}
        </div>
      );
    };
    return (
      <div style={{ position: "relative", borderRadius: "var(--r-lg)", border: "1px solid var(--line)", overflow: "hidden", background: scene.bg }}>
        {scene.horizon != null && <div aria-hidden style={{ position: "absolute", left: 0, right: 0, top: `${scene.horizon}%`, borderTop: "2px solid color-mix(in srgb, #7dd3fc 30%, transparent)" }} />}
        {(scene.deco ?? []).map((d, i) => (
          <span key={i} className="scene-center" aria-hidden style={{ position: "absolute", left: d.left, top: d.top, fontSize: d.size, opacity: 0.7, pointerEvents: "none", zIndex: 0 }}>{d.e}</span>
        ))}
        <div className="scene-center" aria-hidden style={{ position: "absolute", left: "50%", top: `${scene.centerTop ?? 52}%`, fontSize: 80, animation: "gl-float 4.5s ease-in-out infinite", pointerEvents: "none", zIndex: 0, filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.3))" }}>{scene.center}</div>
        <div className="scene-grid" style={{ zIndex: 1 }}>
          {scene.order.map((k, i) => {
            const col = RCOLS.find((c) => c.key === k);
            if (!col) return null;
            const isFull = scene.fullLast && i === scene.order.length - 1;
            return (
              <div key={col.key} style={isFull ? { gridColumn: "1 / -1", maxWidth: 480, width: "100%", justifySelf: "center" } : undefined}>
                {Panel(col)}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // El flujo como pipeline: las 4 etapas encadenadas con flechas.
  const FlowRibbon = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
      {FLOW_COLS.map((f, i) => (
        <Fragment key={f.key}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: "var(--r-full)", border: `1.5px solid ${f.color}`, background: `color-mix(in srgb, ${f.color} 12%, var(--card))`, color: f.color, fontWeight: 700, fontSize: "var(--t-xs)" }}><Icon name={f.icon} size={13} /> {f.label}</span>
          {i < FLOW_COLS.length - 1 && <Icon name="ArrowRight" size={15} style={{ color: "var(--ink-3)" }} />}
        </Fragment>
      ))}
    </div>
  );

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
        {scene ? SceneBoard(!isFacil, false) : <div className="cards-cols" style={{ display: "grid", gridTemplateColumns: `repeat(${RCOLS.length}, 1fr)`, gap: 14 }}>{RCOLS.map((col) => { const mine = myCards.filter((c) => c.columnKey === col.key); const n = counts[col.key] ?? 0; return (
          <div key={col.key} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 14, display: "flex", flexDirection: "column", minHeight: 240 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ color: col.color }}><Icon name={col.icon} size={16} /></span><span style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{col.label}</span><span className="num" style={{ marginLeft: "auto", fontSize: "var(--t-xs)", color: "var(--ink-2)", background: "var(--card)", borderRadius: 99, padding: "2px 8px" }} title="escritas · ocultas">🔒 {n}</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              {mine.map((c) => (<div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${col.color}`, borderRadius: "var(--r-md)", padding: "9px 11px", fontSize: "var(--t-sm)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 6 }}>{c.anonymous ? "· anónima" : "· pública"} · tuya</span></div>))}
              {!mine.length && <div style={{ color: "var(--ink-3)", fontSize: "var(--t-xs)", textAlign: "center", padding: 12 }}>{isFacil ? "Ocultas hasta revelar." : "Las tarjetas quedan ocultas hasta revelar. Sumá lo tuyo…"}</div>}
            </div>
            {!isFacil && <div style={{ marginTop: 10, display: "flex", gap: 6 }}><input value={cardDraft[col.key] ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, [col.key]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addExploreCard(col.key)} placeholder="Sumar tarjeta…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "8px 10px", fontSize: "var(--t-sm)", outline: "none" }} /><button onClick={() => addExploreCard(col.key)} style={{ background: col.color, color: "#06121f", borderRadius: "var(--r-sm)", padding: "0 11px", display: "grid", placeItems: "center" }}><Icon name="Plus" size={16} /></button></div>}
          </div>
        ); })}</div>}
      </>
    );
    controls = isFacil ? <Button full size="lg" icon="Eye" disabled={busy || totalCards === 0} onClick={goNext}>Revelar tarjetas ({totalCards})</Button> : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Sumá tus tarjetas. El facilitador las revela cuando todos terminen.</p>;
  } else if (step === "cards_reveal") {
    wide = true; sub = "Todas las tarjetas a la vista. Las anónimas no muestran autor.";
    content = <><RevealHeader n={totalCards} label="cosas que estaban en el aire" color="var(--st-explore)" /><RevealPop>{scene ? SceneBoard(false, true) : RevealedCards}</RevealPop></>;
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
    sub = shown ? `Resultado de la votación: qué ${clusterNoun.toLowerCase()} atendemos primero.` : `¿Qué ${clusterNoun.toLowerCase()} atendemos primero? Repartí tus puntos. La votación está oculta hasta que el facilitador la muestre.`;
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
      ? (shown ? <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={goNext}>{seq[seq.indexOf(step) + 1] === "close" ? "Siguiente: cierre" : "Siguiente: propósito"}</Button> : <Button full size="lg" icon="Eye" disabled={busy} onClick={() => setResult(sessionId, { voteShown: true })}>Mostrar votación ({voters}/{totalInRoom})</Button>)
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
    content = <>{FlowRibbon}{MultiWrite(FLOW_COLS, "var(--st-explore)", !isFacil)}</>;
    controls = isFacil
      ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><Button full size="lg" icon="Eye" disabled={busy} onClick={goNext}>Revelar flujo</Button><Button full variant="secondary" icon="SkipForward" disabled={busy} onClick={() => setStep(sessionId, "causes", STEPS.indexOf("causes"))}>Saltar el módulo Flujo → ir a causas</Button></div>
      : <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)" }}>Sumá lo que veas en cada etapa del flujo.</p>;
  } else if (step === "flow_reveal") {
    wide = true; sub = "El flujo completo. Ahora votamos la etapa más crítica.";
    content = <>{FlowRibbon}{MultiReveal(FLOW_COLS)}</>;
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
    sub = session.type === "explore"
      ? "El resumen final. Al cerrar, queda guardado en la etapa."
      : "El resumen final. Al cerrar, el resultado queda guardado para el equipo.";
    content = (
      <>
        {session.type === "explore" && (purposeText || criticalMeta) && (
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
        {session.type === "explore" && ranked.length > 1 && <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}><Icon name="Pause" size={13} /> Las {ranked.length - 1} tensiones no priorizadas quedan como iniciativas <b style={{ color: "var(--warning)" }}>pausadas</b> del equipo.</p>}
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
