"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Logo } from "@/components/AppShell";
import { Avatar, Bar, Button, Card, Pill } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { getInitiatives, getTeam } from "@/lib/repository";
import { retroByKey } from "@/lib/retros";
import { useToast } from "@/components/Toast";
import { PULSE_DIMS, FOUNDING_QUESTIONS } from "@/lib/data";
import {
  addCard, addVote, assignCardToCluster, averagePulse, createCluster, deleteCluster,
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
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (user && !joinedRef.current) { joinedRef.current = true; joinSession(sessionId, user.name, user.initials); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
  const exit = () => router.push(isFacil ? `/equipos/${session.teamId}` : "/member");

  if (closed) {
    return (
      <Shell onExit={exit}>
        <Card pad={28} style={{ textAlign: "center", maxWidth: 440 }}>
          <div style={{ width: 56, height: 56, borderRadius: "var(--r-lg)", background: "var(--success-bg)", color: "var(--green)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}><Icon name="Check" size={28} /></div>
          <h2 style={{ fontSize: "var(--t-xl)", fontWeight: 800 }}>La sesión terminó</h2>
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 6, marginBottom: 18 }}>Gracias por participar. Lo trabajado quedó guardado en el equipo.</p>
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
  const MultiWrite = (cols: { key: string; label: string }[], color: string) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
      {cols.map((col) => {
        const mine = myCards.filter((c) => c.columnKey === col.key);
        const add = async () => { const t = (cardDraft[col.key] ?? "").trim(); if (!t) return; await addCard(sessionId, col.key, t, true); setCardDraft((d) => ({ ...d, [col.key]: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
        return (
          <div key={col.key} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 12, display: "flex", flexDirection: "column", minHeight: 200 }}>
            <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 8 }}>{col.label} <span className="num muted" style={{ fontSize: "var(--t-xs)" }}>{counts[col.key] ?? 0}</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>{mine.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${color}`, borderRadius: "var(--r-sm)", padding: "7px 9px", fontSize: "var(--t-xs)" }}>{c.text}</div>)}</div>
            <div style={{ marginTop: 8, display: "flex", gap: 5 }}><input value={cardDraft[col.key] ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, [col.key]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Sumar…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "6px 8px", fontSize: "var(--t-xs)", outline: "none" }} /><button onClick={add} style={{ background: color, color: "#08120c", borderRadius: "var(--r-sm)", padding: "0 9px", display: "grid", placeItems: "center" }}><Icon name="Plus" size={14} /></button></div>
          </div>
        );
      })}
    </div>
  );
  const MultiReveal = (cols: { key: string; label: string }[]) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
      {cols.map((col) => <div key={col.key} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 12 }}><div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 8 }}>{col.label}</div><div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{allCards.filter((c) => c.columnKey === col.key).map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-sm)", padding: "7px 9px", fontSize: "var(--t-xs)" }}>{c.text}</div>)}</div></div>)}
    </div>
  );
  const facBar = (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
      <div style={{ display: "flex" }}>{participants.slice(0, 8).map((p, i) => <span key={p.userId} style={{ marginLeft: i ? -8 : 0 }}><Avatar name={p.name} initials={p.initials} size={28} idx={i} /></span>)}</div>
      <span className="muted num" style={{ fontSize: "var(--t-sm)" }}>{totalInRoom} en la sala</span>
    </div>
  );

  // ════════ SESIÓN FUNDACIONAL · contrato de equipo ════════
  if (session.type === "founding") {
    const answers = (session.result.answers as Record<string, string>) ?? {};
    const signs = inputs.filter((i) => i.key === "sign");
    const signerIds = new Set(signs.map((i) => i.userId));
    const iSigned = signerIds.has(user.id);
    const signerNames = participants.filter((p) => signerIds.has(p.userId)).map((p) => p.name);
    const taF: React.CSSProperties = { width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "10px 12px", fontSize: "var(--t-sm)", outline: "none", lineHeight: 1.5, resize: "vertical" };
    const answeredCount = FOUNDING_QUESTIONS.filter((q) => (answers[q.key] ?? "").trim()).length;

    const ContractView = (editable: boolean) => (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {FOUNDING_QUESTIONS.map((q, i) => (
          <Card key={q.key} pad={16} style={editable ? undefined : { borderColor: answers[q.key] ? "var(--st-explore)" : "var(--line)" }}>
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

    // ── Miembro ──
    if (!isFacil) {
      if (step === "welcome") {
        return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 480 }}>{Header("Antes de arrancar a trabajar, acordamos cómo vamos a funcionar como equipo.")}<Card pad={28} style={{ textAlign: "center" }}><div style={{ width: 56, height: 56, borderRadius: "var(--r-lg)", background: "color-mix(in srgb, var(--st-explore) 18%, transparent)", color: "var(--st-explore)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}><Icon name="Handshake" size={28} /></div><h2 style={{ fontSize: "var(--t-xl)", fontWeight: 800 }}>Sesión Fundacional</h2><p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 8 }}>Vamos a construir juntos el contrato del equipo. Te vamos a pedir que lo firmes al final.</p></Card></div></Shell>;
      }
      if (step === "contract") {
        return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 640 }}>{Header("Estamos acordando el contrato. Hablen y construyan cada respuesta juntos.")}{ContractView(false)}</div></Shell>;
      }
      if (step === "sign") {
        return (
          <Shell onExit={exit}>
            <div style={{ width: "100%", maxWidth: 560 }}>
              {Header("Leé el contrato del equipo. Si estás de acuerdo, firmalo.")}
              {ContractView(false)}
              <div style={{ marginTop: 16 }}>
                {iSigned
                  ? <div style={{ textAlign: "center", color: "var(--green)", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Icon name="CircleCheck" size={20} /> Firmaste el contrato</div>
                  : <Button full size="lg" icon="PenLine" onClick={() => setMyInput(sessionId, "sign", { ok: true })}>Firmo este contrato</Button>}
                <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-xs)", marginTop: 10 }}>{signerIds.size} de {totalInRoom} firmaron</p>
              </div>
            </div>
          </Shell>
        );
      }
      return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("¡Contrato firmado! Ya pueden arrancar con su primera iniciativa.")}{ContractView(false)}</div></Shell>;
    }

    // ── Facilitador ──
    const fSteps = ["welcome", "contract", "sign", "close"];
    const fNext = async () => { const i = fSteps.indexOf(step); setBusy(true); await setStep(sessionId, fSteps[Math.min(fSteps.length - 1, i + 1)], i + 1); setBusy(false); };
    const fFinish = async () => {
      setBusy(true);
      const contract = { answers, signedBy: [...signerIds], signedNames: signerNames, date: new Date().toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" }) };
      await finalizeSession(session, { summaryText: `Contrato firmado por ${signerIds.size}`, teamData: { contract } });
      setBusy(false); exit();
    };
    let fbody: React.ReactNode = null, faction: React.ReactNode = null, fsub = "", fwide = false;
    if (step === "welcome") {
      fsub = "Explicá el sentido: acordar cómo funcionamos antes de trabajar. Cuando todos estén, arrancá.";
      fbody = <div style={{ textAlign: "center", padding: "8px 0" }}><div style={{ width: 56, height: 56, borderRadius: "var(--r-lg)", background: "color-mix(in srgb, var(--st-explore) 18%, transparent)", color: "var(--st-explore)", display: "grid", placeItems: "center", margin: "0 auto 12px" }}><Icon name="Handshake" size={28} /></div><p style={{ fontSize: "var(--t-md)", fontWeight: 700 }}>Sesión Fundacional</p><p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 4 }}>Construyan el contrato del equipo y fírmenlo.</p></div>;
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Empezar el contrato</Button>;
    } else if (step === "contract") {
      fwide = true; fsub = "Facilitá la conversación. Escribí el acuerdo del equipo en cada pregunta.";
      fbody = ContractView(true);
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy || answeredCount === 0} onClick={fNext}>Pasar a la firma ({answeredCount}/{FOUNDING_QUESTIONS.length})</Button>;
    } else if (step === "sign") {
      fsub = "Cada integrante firma desde su pantalla. El contrato queda guardado en el equipo.";
      fbody = (
        <>
          {ContractView(false)}
          <div style={{ marginTop: 16, padding: "12px 14px", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="eyebrow">Firmas</span>
              <span className="num" style={{ fontWeight: 800, color: "var(--green)" }}>{signerIds.size}/{totalInRoom}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {signerNames.map((n) => <Pill key={n} color="var(--green)" bg="var(--success-bg)" icon="PenLine">{n}</Pill>)}
              {!signerNames.length && <span className="muted" style={{ fontSize: "var(--t-sm)" }}>Esperando firmas…</span>}
            </div>
          </div>
          {!iSigned && <div style={{ marginTop: 12 }}><Button full variant="secondary" icon="PenLine" onClick={() => setMyInput(sessionId, "sign", { ok: true })}>Firmar yo también</Button></div>}
        </>
      );
      faction = <Button full size="lg" icon="Check" disabled={busy || signerIds.size === 0} onClick={fFinish}>{busy ? "Guardando…" : "Cerrar y guardar el contrato"}</Button>;
    }
    return (
      <Shell onExit={exit}>
        <div style={{ width: "100%", maxWidth: fwide ? 720 : 560 }}>
          {Header(fsub)}
          <Card pad={24}>{facBar}{fbody}<div style={{ marginTop: 22 }}>{faction}</div></Card>
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

    if (!isFacil) {
      if (step === "report") {
        const mine = (inputs.find((i) => i.userId === user.id && i.key === "stuck")?.value as { v?: number })?.v;
        return (
          <Shell onExit={exit}>
            <div style={{ width: "100%", maxWidth: 520 }}>
              {Header(`Pasaron ~30 días. ¿Se mantuvo "${change}"?`)}
              <Card pad={24}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {STUCK.map((s) => { const on = mine === s.v; return (
                    <button key={s.v} onClick={() => setMyInput(sessionId, "stuck", { v: s.v })} style={{ padding: "13px 14px", borderRadius: "var(--r-md)", background: on ? "color-mix(in srgb, var(--st-learn) 14%, var(--card))" : "var(--card)", border: `1px solid ${on ? "var(--st-learn)" : "var(--line)"}`, fontWeight: 600, fontSize: "var(--t-sm)", textAlign: "left" }}>{s.l}</button>
                  ); })}
                </div>
                <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 12, textAlign: "center" }}>El facilitador cierra la consolidación con el equipo.</p>
              </Card>
            </div>
          </Shell>
        );
      }
      return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 520 }}>{Header("Consolidación del equipo.")}<Card pad={24} style={{ textAlign: "center" }}>{ol ? <><Pill color={ol.c} bg={`color-mix(in srgb, ${ol.c} 14%, transparent)`} icon={ol.i}>{ol.l}</Pill>{cnote && <p style={{ fontSize: "var(--t-sm)", marginTop: 12, lineHeight: 1.5 }}>{cnote}</p>}</> : <span className="muted">Definiendo…</span>}</Card></div></Shell>;
    }

    // facilitador
    const fSteps = ["report", "decide", "close"];
    const fNext = async () => { const i = fSteps.indexOf(step); setBusy(true); await setStep(sessionId, fSteps[Math.min(fSteps.length - 1, i + 1)], i + 1); setBusy(false); };
    const fFinish = async () => { setBusy(true); await finalizeSession(session, { summaryText: `Consolidación: ${ol?.l ?? "—"}`, dataKey: "consolidate", dataValue: { outcome, note: cnote, date: new Date().toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" }) }, noAdvance: true, status: "done" }); setBusy(false); exit(); };
    let fbody: React.ReactNode = null, faction: React.ReactNode = null, fsub = "";
    if (step === "report") {
      fsub = `¿El equipo sostuvo "${change}"? Mirá cómo lo ve cada uno.`;
      const maxS = Math.max(1, ...STUCK.map((s) => stuckCount[s.v] ?? 0));
      fbody = (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {STUCK.map((s) => (
            <div key={s.v} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ flex: 1, fontSize: "var(--t-sm)", fontWeight: 600 }}>{s.l}</span>
              <div style={{ width: 120 }}><Bar value={((stuckCount[s.v] ?? 0) / maxS) * 100} color="var(--st-learn)" height={7} /></div>
              <span className="num" style={{ fontWeight: 700, width: 18, textAlign: "right" }}>{stuckCount[s.v] ?? 0}</span>
            </div>
          ))}
          <div className="muted" style={{ fontSize: "var(--t-sm)", textAlign: "center", marginTop: 4 }}>{stuckVals.length} de {totalInRoom} respondieron</div>
        </div>
      );
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Definir el resultado</Button>;
    } else if (step === "decide") {
      fsub = "Con el equipo, definí si el cambio se consolidó y dejá una nota.";
      fbody = (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 10 }}>
            {CONS.map((o) => { const on = outcome === o.k; return (
              <button key={o.k} onClick={() => setResult(sessionId, { outcome: o.k })} style={{ textAlign: "left", padding: 14, borderRadius: "var(--r-lg)", background: on ? `color-mix(in srgb, ${o.c} 14%, var(--card))` : "var(--card)", border: `1px solid ${on ? o.c : "var(--line-2)"}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: o.c }}><Icon name={o.i} size={18} /></span><span style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{o.l}</span></div>
                <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 4 }}>{o.d}</p>
              </button>
            ); })}
          </div>
          <textarea defaultValue={cnote} onBlur={(e) => setResult(sessionId, { cnote: e.target.value.trim() })} rows={3} placeholder="¿Qué ayudó o qué faltó para sostenerlo? Una nota para el equipo." style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-sm)", outline: "none", lineHeight: 1.5, resize: "vertical" }} />
        </div>
      );
      faction = <Button full size="lg" icon="Check" disabled={busy || !outcome} onClick={fFinish}>{busy ? "Guardando…" : "Cerrar consolidación"}</Button>;
    }
    return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header(fsub)}<Card pad={24}>{facBar}{fbody}<div style={{ marginTop: 22 }}>{faction}</div></Card></div></Shell>;
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

    if (!isFacil) {
      if (step === "causes") {
        const add = async () => {
          const t = (cardDraft.cause ?? "").trim(); if (!t) return;
          await addCard(sessionId, "cause", t, true);
          setCardDraft((d) => ({ ...d, cause: "" }));
          if (user) setMyCards(await getMyCards(sessionId, user.id));
        };
        return (
          <Shell onExit={exit}>
            <div style={{ width: "100%", maxWidth: 560 }}>
              {Header(`¿Por qué pasa "${subject}"? Tirá las causas que se te ocurran. Hablamos de causas, no de personas.`)}
              <Card pad={24}>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <input autoFocus value={cardDraft.cause ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, cause: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Una posible causa…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none" }} />
                  <Button icon="Plus" onClick={add}>Sumar</Button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {myCauses.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-focus)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 6 }}>· tuya</span></div>)}
                  {!myCauses.length && <div style={{ color: "var(--ink-3)", fontSize: "var(--t-sm)", textAlign: "center", padding: 16 }}>Sumá la primera causa…</div>}
                </div>
                <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 14, textAlign: "center" }}>{causeCount} causas entre todos · se revelan juntas</p>
              </Card>
            </div>
          </Shell>
        );
      }
      if (step === "causes_reveal") {
        return (
          <Shell onExit={exit}>
            <div style={{ width: "100%", maxWidth: 560 }}>
              {Header("Las causas, a la vista. Después votamos cuál pesa más.")}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {causeCards.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}</div>)}
              </div>
            </div>
          </Shell>
        );
      }
      if (step === "vote") {
        const myVote = (inputs.find((i) => i.userId === user.id && i.key === "cvote")?.value as { id?: string })?.id;
        return (
          <Shell onExit={exit}>
            <div style={{ width: "100%", maxWidth: 560 }}>
              {Header("¿Cuál causa te parece la que más pesa? Elegí una.")}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {causeCards.map((c) => { const on = myVote === c.id; return (
                  <button key={c.id} onClick={() => setMyInput(sessionId, "cvote", { id: c.id })} style={{ textAlign: "left", padding: "12px 14px", borderRadius: "var(--r-md)", background: on ? "color-mix(in srgb, var(--st-focus) 14%, var(--card))" : "var(--card)", border: `1px solid ${on ? "var(--st-focus)" : "var(--line)"}`, display: "flex", alignItems: "center", gap: 11, fontSize: "var(--t-sm)" }}>
                    <span style={{ color: on ? "var(--st-focus)" : "var(--ink-3)" }}><Icon name={on ? "CircleCheck" : "Circle"} size={18} /></span>{c.text}
                  </button>
                ); })}
              </div>
              <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)", marginTop: 14 }}>El facilitador cierra la votación.</p>
            </div>
          </Shell>
        );
      }
      if (step === "deepen") {
        return (
          <Shell onExit={exit}>
            <div style={{ width: "100%", maxWidth: 560 }}>
              {Header('Los "5 Porqués": el equipo profundiza la causa hasta la raíz.')}
              <Card pad={20}>
                <div className="eyebrow" style={{ color: "var(--st-focus)", marginBottom: 6 }}>Causa</div>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>{votedCause || "—"}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {whys.filter((w) => (w ?? "").trim()).map((w, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span className="num" style={{ color: "var(--st-focus)", fontWeight: 800 }}>{i + 1}.</span>
                      <div style={{ fontSize: "var(--t-sm)", lineHeight: 1.45 }}>{w}</div>
                    </div>
                  ))}
                  {!whys.filter((w) => (w ?? "").trim()).length && <span className="muted" style={{ fontSize: "var(--t-sm)" }}>Profundizando…</span>}
                </div>
              </Card>
            </div>
          </Shell>
        );
      }
      return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 520 }}>{Header("Causa raíz definida.")}<Card pad={24} style={{ textAlign: "center" }}><div className="eyebrow" style={{ color: "var(--st-focus)", marginBottom: 8 }}>Causa raíz</div><div style={{ fontSize: "var(--t-lg)", fontWeight: 800 }}>{root || "—"}</div></Card></div></Shell>;
    }

    // FACILITADOR (foco)
    const fSteps = ["causes", "causes_reveal", "vote", "deepen", "close"];
    const fNext = async () => { const i = fSteps.indexOf(step); setBusy(true); await setStep(sessionId, fSteps[Math.min(fSteps.length - 1, i + 1)], i + 1); setBusy(false); };
    const setWhy = (idx: number, val: string) => { const next = [...whys]; next[idx] = val; setResult(sessionId, { whys: next }); };
    const fFinish = async () => {
      setBusy(true);
      await finalizeSession(session, { cardCount: causeCards.length, summaryText: `Causa raíz: ${root || "—"}`, dataKey: "focus", dataValue: { rootCause: root, cause: votedCause, whys: whys.filter((w) => (w ?? "").trim()), causes: causeCards.map((c) => c.text) } });
      setBusy(false); exit();
    };
    const partsBar = (
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex" }}>{participants.slice(0, 8).map((p, i) => <span key={p.userId} style={{ marginLeft: i ? -8 : 0 }}><Avatar name={p.name} initials={p.initials} size={28} idx={i} /></span>)}</div>
        <span className="muted num" style={{ fontSize: "var(--t-sm)" }}>{totalInRoom} en la sala</span>
      </div>
    );
    let fbody: React.ReactNode = null, faction: React.ReactNode = null, fsub = "";
    if (step === "causes") {
      fsub = `Profundizando "${subject}". Los miembros escriben causas a ciegas.`;
      fbody = <div style={{ textAlign: "center", padding: "10px 0" }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--st-focus)" }}>{causeCount}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>causas propuestas</div></div>;
      faction = <Button full size="lg" icon="Eye" disabled={busy || causeCount === 0} onClick={fNext}>Revelar causas ({causeCount})</Button>;
    } else if (step === "causes_reveal") {
      fsub = "Repasen las causas. Después el equipo vota cuál pesa más.";
      fbody = (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {causeCards.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}</div>)}
          {!causeCards.length && <p className="muted" style={{ fontSize: "var(--t-sm)" }}>No se cargaron causas.</p>}
        </div>
      );
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Votar causas</Button>;
    } else if (step === "vote") {
      fsub = "El equipo vota la causa que más pesa. Confirmá cuál vamos a profundizar.";
      const maxC = Math.max(1, ...causeCards.map((c) => cvoteCount[c.id] ?? 0));
      fbody = (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...causeCards].sort((a, b) => (cvoteCount[b.id] ?? 0) - (cvoteCount[a.id] ?? 0)).map((c) => { const on = c.text === votedCause; return (
            <button key={c.id} onClick={() => setResult(sessionId, { cause: c.text })} style={{ textAlign: "left", background: on ? "color-mix(in srgb, var(--st-focus) 14%, var(--card))" : "var(--card)", border: `1px solid ${on ? "var(--st-focus)" : "var(--line)"}`, borderRadius: "var(--r-md)", padding: "11px 13px", fontSize: "var(--t-sm)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: on ? "var(--st-focus)" : "var(--ink-3)" }}><Icon name={on ? "CircleCheck" : "Circle"} size={17} /></span>
              <span style={{ flex: 1 }}>{c.text}</span>
              <div style={{ width: 80 }}><Bar value={((cvoteCount[c.id] ?? 0) / maxC) * 100} color="var(--st-focus)" height={6} /></div>
              <span className="num" style={{ fontWeight: 700, width: 18, textAlign: "right" }}>{cvoteCount[c.id] ?? 0}</span>
            </button>
          ); })}
          {!causeCards.length && <p className="muted" style={{ fontSize: "var(--t-sm)" }}>No se cargaron causas.</p>}
        </div>
      );
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy || !votedCause} onClick={() => { if (!votedCause && topCause) setResult(sessionId, { cause: topCause.text }); fNext(); }}>Profundizar con 5 Porqués</Button>;
    } else if (step === "deepen") {
      fsub = "Preguntá «¿por qué?» hasta llegar a la raíz. La última respuesta es la causa raíz.";
      fbody = (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Card pad={14} style={{ borderColor: "var(--st-focus)" }}><div className="eyebrow" style={{ color: "var(--st-focus)", marginBottom: 4 }}>Causa votada</div><div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{votedCause || "—"}</div></Card>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span className="num" style={{ color: "var(--st-focus)", fontWeight: 800, width: 18 }}>{i + 1}</span>
              <input defaultValue={whys[i] ?? ""} onBlur={(e) => setWhy(i, e.target.value)} placeholder={`¿Por qué? (${i + 1})`} style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "10px 12px", fontSize: "var(--t-sm)", outline: "none" }} />
            </div>
          ))}
        </div>
      );
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy || !root} onClick={fNext}>Confirmar causa raíz</Button>;
    } else {
      fsub = "Causa raíz definida. Al cerrar, la iniciativa avanza a Prueba.";
      fbody = (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card pad={18} style={{ textAlign: "center", borderColor: "var(--st-focus)" }}><div className="eyebrow" style={{ color: "var(--st-focus)", marginBottom: 6 }}>Causa raíz</div><div style={{ fontSize: "var(--t-lg)", fontWeight: 800 }}>{root || "—"}</div></Card>
          {!!whys.filter((w) => (w ?? "").trim()).length && <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{whys.filter((w) => (w ?? "").trim()).map((w, i) => <div key={i} style={{ fontSize: "var(--t-xs)", color: "var(--ink-2)" }}><b style={{ color: "var(--st-focus)" }}>{i + 1}.</b> {w}</div>)}</div>}
        </div>
      );
      faction = <Button full size="lg" icon="Check" disabled={busy} onClick={fFinish}>{busy ? "Guardando…" : "Cerrar y guardar sesión"}</Button>;
    }
    return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 600 }}>{Header(fsub)}<Card pad={24}>{partsBar}{fbody}<div style={{ marginTop: 22 }}>{faction}</div></Card></div></Shell>;
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

    if (!isFacil) {
      if (step === "ideas") {
        const add = async () => {
          const t = (cardDraft.idea ?? "").trim(); if (!t) return;
          await addCard(sessionId, "idea", t, true);
          setCardDraft((d) => ({ ...d, idea: "" }));
          if (user) setMyCards(await getMyCards(sessionId, user.id));
        };
        return (
          <Shell onExit={exit}>
            <div style={{ width: "100%", maxWidth: 560 }}>
              {Header(`¿Qué podríamos probar para mover "${subject}"? Tirá ideas. Cantidad primero.`)}
              <Card pad={24}>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <input autoFocus value={cardDraft.idea ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, idea: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Una idea para probar…" style={field} />
                  <Button icon="Plus" onClick={add}>Sumar</Button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {myIdeas.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-proof)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 6 }}>· tuya</span></div>)}
                  {!myIdeas.length && <div style={{ color: "var(--ink-3)", fontSize: "var(--t-sm)", textAlign: "center", padding: 16 }}>Sumá la primera idea…</div>}
                </div>
                <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 14, textAlign: "center" }}>{ideaCount} ideas entre todos · se revelan juntas</p>
              </Card>
            </div>
          </Shell>
        );
      }
      if (step === "ideas_reveal") {
        return (
          <Shell onExit={exit}>
            <div style={{ width: "100%", maxWidth: 560 }}>
              {Header("Las ideas, a la vista. El facilitador elige cuál apostar.")}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ideaCards.map((c) => <div key={c.id} style={{ background: c.text === chosen ? "color-mix(in srgb, var(--st-proof) 14%, var(--card))" : "var(--card)", border: `1px solid ${c.text === chosen ? "var(--st-proof)" : "var(--line)"}`, borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}</div>)}
              </div>
            </div>
          </Shell>
        );
      }
      if (step === "vote") {
        const myVote = (inputs.find((i) => i.userId === user.id && i.key === "ivote")?.value as { id?: string })?.id;
        return (
          <Shell onExit={exit}>
            <div style={{ width: "100%", maxWidth: 560 }}>
              {Header("¿Cuál idea te parece la mejor apuesta? Elegí una.")}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {ideaCards.map((c) => { const on = myVote === c.id; return (
                  <button key={c.id} onClick={() => setMyInput(sessionId, "ivote", { id: c.id })} style={{ textAlign: "left", padding: "12px 14px", borderRadius: "var(--r-md)", background: on ? "color-mix(in srgb, var(--st-proof) 14%, var(--card))" : "var(--card)", border: `1px solid ${on ? "var(--st-proof)" : "var(--line)"}`, display: "flex", alignItems: "center", gap: 11, fontSize: "var(--t-sm)" }}>
                    <span style={{ color: on ? "var(--st-proof)" : "var(--ink-3)" }}><Icon name={on ? "CircleCheck" : "Circle"} size={18} /></span>{c.text}
                  </button>
                ); })}
              </div>
              <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)", marginTop: 14 }}>El facilitador cierra la votación.</p>
            </div>
          </Shell>
        );
      }
      if (step === "premortem") {
        const myRisks = myCards.filter((c) => c.columnKey === "risk");
        const add = async () => { const t = (cardDraft.risk ?? "").trim(); if (!t) return; await addCard(sessionId, "risk", t, true); setCardDraft((d) => ({ ...d, risk: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
        return (
          <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("Pre-mortem: imaginá que en 15 días la prueba fracasó. ¿Qué salió mal? (anónimo)")}
            <Card pad={24}>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <input autoFocus value={cardDraft.risk ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, risk: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Un riesgo o motivo de fracaso…" style={field} />
                <Button icon="Plus" onClick={add}>Sumar</Button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {myRisks.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--risk)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 6 }}>· tuya</span></div>)}
                {!myRisks.length && <div style={{ color: "var(--ink-3)", fontSize: "var(--t-sm)", textAlign: "center", padding: 16 }}>Anticipá qué podría salir mal…</div>}
              </div>
            </Card></div></Shell>
        );
      }
      if (step === "premortem_reveal") {
        const riskCards = allCards.filter((c) => c.columnKey === "risk");
        return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("Los riesgos anticipados. El facilitador los tiene en cuenta al diseñar la apuesta.")}<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{riskCards.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--risk)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}</div>)}{!riskCards.length && <p className="muted" style={{ fontSize: "var(--t-sm)" }}>Sin riesgos señalados.</p>}</div></div></Shell>;
      }
      if (step === "bet") {
        return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("El facilitador está diseñando la apuesta con el equipo.")}{BetCard}</div></Shell>;
      }
      if (step === "commit") {
        const iConfirmed = inputs.some((i) => i.userId === user.id && i.key === "confirm");
        const confirmCount = inputs.filter((i) => i.key === "confirm").length;
        return (
          <Shell onExit={exit}>
            <div style={{ width: "100%", maxWidth: 520 }}>
              {Header("Leé la apuesta. Si estás de acuerdo, comprometete.")}
              {BetCard}
              <div style={{ marginTop: 16 }}>
                {iConfirmed
                  ? <div style={{ textAlign: "center", color: "var(--green)", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Icon name="CircleCheck" size={20} /> Te comprometiste con la prueba</div>
                  : <Button full size="lg" icon="Check" onClick={() => setMyInput(sessionId, "confirm", { ok: true })}>Entiendo la apuesta y me comprometo</Button>}
                <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-xs)", marginTop: 10 }}>{confirmCount} de {totalInRoom} se comprometieron</p>
              </div>
            </div>
          </Shell>
        );
      }
      return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("La apuesta quedó definida. ¡A probar!")}{BetCard}</div></Shell>;
    }

    // FACILITADOR (prueba)
    const ivoteCount: Record<string, number> = {};
    inputs.forEach((i) => { if (i.key === "ivote") { const id = (i.value as { id?: string })?.id; if (id) ivoteCount[id] = (ivoteCount[id] ?? 0) + 1; } });
    const topIdea = [...ideaCards].sort((a, b) => (ivoteCount[b.id] ?? 0) - (ivoteCount[a.id] ?? 0))[0];
    const riskCards = allCards.filter((c) => c.columnKey === "risk");
    const riskCount = counts["risk"] ?? 0;
    const confirmCount = inputs.filter((i) => i.key === "confirm").length;
    const fSteps = ["ideas", "ideas_reveal", "vote", "premortem", "premortem_reveal", "bet", "commit", "close"];
    const fNext = async () => { const i = fSteps.indexOf(step); setBusy(true); await setStep(sessionId, fSteps[Math.min(fSteps.length - 1, i + 1)], i + 1); setBusy(false); };
    const fFinish = async () => {
      setBusy(true);
      await finalizeSession(session, { cardCount: ideaCards.length, summaryText: `Apuesta: ${betThen || "—"}`, dataKey: "proof", dataValue: { idea: chosen, betIf, betThen, signal, responsible, deadline, risks: riskCards.map((c) => c.text), committed: confirmCount } });
      setBusy(false); exit();
    };
    const partsBar = (
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex" }}>{participants.slice(0, 8).map((p, i) => <span key={p.userId} style={{ marginLeft: i ? -8 : 0 }}><Avatar name={p.name} initials={p.initials} size={28} idx={i} /></span>)}</div>
        <span className="muted num" style={{ fontSize: "var(--t-sm)" }}>{totalInRoom} en la sala</span>
      </div>
    );
    let fbody: React.ReactNode = null, faction: React.ReactNode = null, fsub = "";
    if (step === "ideas") {
      fsub = "Los miembros tiran ideas a ciegas. El contenido se revela todo junto.";
      fbody = <div style={{ textAlign: "center", padding: "10px 0" }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--st-proof)" }}>{ideaCount}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>ideas propuestas</div></div>;
      faction = <Button full size="lg" icon="Eye" disabled={busy || ideaCount === 0} onClick={fNext}>Revelar ideas ({ideaCount})</Button>;
    } else if (step === "ideas_reveal") {
      fsub = "Repasen las ideas. Después el equipo vota la mejor apuesta.";
      fbody = (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ideaCards.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}</div>)}
          {!ideaCards.length && <p className="muted" style={{ fontSize: "var(--t-sm)" }}>No se cargaron ideas.</p>}
        </div>
      );
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Votar la mejor idea</Button>;
    } else if (step === "vote") {
      fsub = "El equipo vota. Confirmá la idea a apostar (la más votada queda sugerida).";
      const maxV = Math.max(1, ...ideaCards.map((c) => ivoteCount[c.id] ?? 0));
      fbody = (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...ideaCards].sort((a, b) => (ivoteCount[b.id] ?? 0) - (ivoteCount[a.id] ?? 0)).map((c) => { const on = c.text === chosen; return (
            <button key={c.id} onClick={() => setResult(sessionId, { idea: c.text })} style={{ textAlign: "left", background: on ? "color-mix(in srgb, var(--st-proof) 14%, var(--card))" : "var(--card)", border: `1px solid ${on ? "var(--st-proof)" : "var(--line)"}`, borderRadius: "var(--r-md)", padding: "11px 13px", fontSize: "var(--t-sm)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: on ? "var(--st-proof)" : "var(--ink-3)" }}><Icon name={on ? "CircleCheck" : "Circle"} size={17} /></span>
              <span style={{ flex: 1 }}>{c.text}</span>
              <div style={{ width: 80 }}><Bar value={((ivoteCount[c.id] ?? 0) / maxV) * 100} color="var(--st-proof)" height={6} /></div>
              <span className="num" style={{ fontWeight: 700, width: 18, textAlign: "right" }}>{ivoteCount[c.id] ?? 0}</span>
            </button>
          ); })}
        </div>
      );
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy || !chosen} onClick={() => { if (!chosen && topIdea) setResult(sessionId, { idea: topIdea.text }); fNext(); }}>Pre-mortem de la idea</Button>;
    } else if (step === "premortem") {
      fsub = "Antes de diseñar: imaginen que fracasó. Los miembros anticipan riesgos a ciegas.";
      fbody = <div style={{ textAlign: "center", padding: "10px 0" }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--risk)" }}>{riskCount}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>riesgos anticipados</div></div>;
      faction = <Button full size="lg" icon="Eye" disabled={busy} onClick={fNext}>Revelar riesgos ({riskCount})</Button>;
    } else if (step === "premortem_reveal") {
      fsub = "Los riesgos del equipo. Tenelos a mano al diseñar la apuesta y la señal.";
      fbody = <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{riskCards.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--risk)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}</div>)}{!riskCards.length && <p className="muted" style={{ fontSize: "var(--t-sm)" }}>Sin riesgos señalados.</p>}</div>;
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Diseñar la apuesta</Button>;
    } else if (step === "bet") {
      fsub = "Escribí la apuesta con el equipo. Se ve en vivo en las pantallas de todos.";
      fbody = (
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
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Pasar al compromiso</Button>;
    } else if (step === "commit") {
      fsub = "Cada integrante lee la apuesta y se compromete desde su pantalla.";
      fbody = (
        <>
          {BetCard}
          <div style={{ marginTop: 16, padding: "12px 14px", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="eyebrow">Compromisos</span>
            <span className="num" style={{ fontWeight: 800, color: "var(--green)" }}>{confirmCount}/{totalInRoom}</span>
          </div>
        </>
      );
      faction = <Button full size="lg" icon="Check" disabled={busy} onClick={fFinish}>{busy ? "Guardando…" : "Cerrar y guardar sesión"}</Button>;
    } else {
      fsub = "La apuesta quedó definida. Al cerrar, la iniciativa avanza a Seguimiento.";
      fbody = BetCard;
      faction = <Button full size="lg" icon="Check" disabled={busy} onClick={fFinish}>{busy ? "Guardando…" : "Cerrar y guardar sesión"}</Button>;
    }
    return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 600 }}>{Header(fsub)}<Card pad={24}>{partsBar}{fbody}<div style={{ marginTop: 22 }}>{faction}</div></Card></div></Shell>;
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

    if (!isFacil) {
      if (step === "progress") {
        const mySee = (inputs.find((i) => i.userId === user.id && i.key === "see")?.value as { v?: number })?.v;
        const SEE = [{ v: 0, l: "Sin avance" }, { v: 1, l: "Algo" }, { v: 2, l: "Bien" }, { v: 3, l: "Logrado" }];
        return (
          <Shell onExit={exit}>
            <div style={{ width: "100%", maxWidth: 520 }}>
              {Header(`¿Cómo ves vos "${signalName}"? Tu lectura suma al promedio del equipo.`)}
              <Card pad={24}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
                  {SEE.map((s) => { const on = mySee === s.v; return (
                    <button key={s.v} onClick={() => setMyInput(sessionId, "see", { v: s.v })} style={{ padding: "14px 12px", borderRadius: "var(--r-md)", background: on ? "color-mix(in srgb, var(--st-follow) 16%, var(--card))" : "var(--card)", border: `1px solid ${on ? "var(--st-follow)" : "var(--line)"}`, fontWeight: 600, fontSize: "var(--t-sm)", color: on ? "var(--ink-0)" : "var(--ink-1)" }}>{s.l}</button>
                  ); })}
                </div>
                <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 12, textAlign: "center" }}>El facilitador define el avance oficial con el equipo.</p>
              </Card>
            </div>
          </Shell>
        );
      }
      if (step === "decide") return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 520 }}>{Header("¿Cómo sigue la prueba? El facilitador define con el equipo.")}<Card pad={24} style={{ textAlign: "center" }}>{fdl ? <Pill color={fdl.c} bg={`color-mix(in srgb, ${fdl.c} 14%, transparent)`} icon={fdl.i}>{fdl.l}</Pill> : <span className="muted">Definiendo…</span>}</Card></div></Shell>;
      if (step === "blockers") {
        const add = async () => { const t = (cardDraft.blocker ?? "").trim(); if (!t) return; await addCard(sessionId, "blocker", t, true); setCardDraft((d) => ({ ...d, blocker: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
        return (
          <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("¿Qué nos está trabando para sostener la prueba?")}
            <Card pad={24}>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <input autoFocus value={cardDraft.blocker ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, blocker: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Algo que nos traba…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none" }} />
                <Button icon="Plus" onClick={add}>Sumar</Button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {myBlockers.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--warning)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 6 }}>· tuya</span></div>)}
                {!myBlockers.length && <div style={{ color: "var(--ink-3)", fontSize: "var(--t-sm)", textAlign: "center", padding: 16 }}>Si no hay trabas, esperá al facilitador.</div>}
              </div>
            </Card></div></Shell>
        );
      }
      if (step === "blockers_reveal") return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("Las trabas, a la vista.")}<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{blockerCards.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--warning)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}</div>)}{!blockerCards.length && <p className="muted" style={{ fontSize: "var(--t-sm)" }}>Sin trabas. 🙌</p>}</div></div></Shell>;
      return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("Avance registrado.")}<Card pad={24}>{Gauge}</Card></div></Shell>;
    }

    const fSteps = ["progress", "blockers", "blockers_reveal", "decide", "close"];
    const fNext = async () => { const i = fSteps.indexOf(step); setBusy(true); await setStep(sessionId, fSteps[Math.min(fSteps.length - 1, i + 1)], i + 1); setBusy(false); };
    const fFinish = async () => { setBusy(true); await finalizeSession(session, { cardCount: blockerCount, summaryText: `Avance: ${current}% · ${fdl?.l ?? "—"}`, dataKey: "follow", dataValue: { current, signal: signalName, blockers: blockerCards.map((c) => c.text), decision: fdecision }, noAdvance: true }); setBusy(false); exit(); };
    const partsBar = <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}><div style={{ display: "flex" }}>{participants.slice(0, 8).map((p, i) => <span key={p.userId} style={{ marginLeft: i ? -8 : 0 }}><Avatar name={p.name} initials={p.initials} size={28} idx={i} /></span>)}</div><span className="muted num" style={{ fontSize: "var(--t-sm)" }}>{totalInRoom} en la sala</span></div>;
    let fbody: React.ReactNode = null, faction: React.ReactNode = null, fsub = "";
    if (step === "progress") {
      fsub = "El equipo reporta cómo ve la señal. Definí el avance oficial.";
      fbody = <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{Gauge}{seeVals.length > 0 && <div style={{ padding: "10px 12px", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", fontSize: "var(--t-sm)" }}><span className="muted">Lectura del equipo: </span><b style={{ color: "var(--st-follow)" }}>~{seeAvg}%</b> <span className="muted">({seeVals.length} {seeVals.length === 1 ? "voto" : "votos"})</span></div>}<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{PROG.map((p) => { const on = current === p.v; return <button key={p.v} onClick={() => setResult(sessionId, { current: p.v })} style={{ padding: "9px 14px", borderRadius: "var(--r-full)", fontSize: "var(--t-sm)", fontWeight: 600, background: on ? "var(--st-follow)" : "var(--card-2)", color: on ? "#08120c" : "var(--ink-1)", border: "1px solid " + (on ? "var(--st-follow)" : "var(--line-2)") }}>{p.l}</button>; })}</div></div>;
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Siguiente: trabas</Button>;
    } else if (step === "blockers") {
      fsub = "Los miembros escriben las trabas a ciegas.";
      fbody = <div style={{ textAlign: "center", padding: "10px 0" }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--warning)" }}>{blockerCount}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>trabas señaladas</div></div>;
      faction = <Button full size="lg" icon="Eye" disabled={busy} onClick={fNext}>Revelar trabas ({blockerCount})</Button>;
    } else if (step === "blockers_reveal") {
      fsub = "Las trabas del equipo.";
      fbody = <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{blockerCards.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--warning)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}</div>)}{!blockerCards.length && <p className="muted" style={{ fontSize: "var(--t-sm)" }}>Sin trabas. 🙌</p>}</div>;
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Decidir cómo sigue</Button>;
    } else if (step === "decide") {
      fsub = "Con el equipo: ¿la prueba continúa, se ajusta o hay que escalar?";
      fbody = (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 10 }}>
          {FDECIDE.map((o) => { const on = fdecision === o.k; return (
            <button key={o.k} onClick={() => setResult(sessionId, { fdecision: o.k })} style={{ textAlign: "left", padding: 14, borderRadius: "var(--r-lg)", background: on ? `color-mix(in srgb, ${o.c} 14%, var(--card))` : "var(--card)", border: `1px solid ${on ? o.c : "var(--line-2)"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: o.c }}><Icon name={o.i} size={18} /></span><span style={{ fontWeight: 700 }}>{o.l}</span>{on && <span style={{ marginLeft: "auto", color: o.c }}><Icon name="CheckCircle2" size={16} /></span>}</div>
              <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 4 }}>{o.d}</p>
            </button>
          ); })}
        </div>
      );
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy || !fdecision} onClick={fNext}>Revisar y cerrar</Button>;
    } else {
      fsub = "Check-in registrado. La prueba sigue en curso (no cambia de etapa).";
      fbody = <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{Gauge}{fdl && <Pill color={fdl.c} bg={`color-mix(in srgb, ${fdl.c} 14%, transparent)`} icon={fdl.i}>{fdl.l}</Pill>}<div className="muted" style={{ fontSize: "var(--t-sm)" }}>{blockerCount} {blockerCount === 1 ? "traba" : "trabas"} registradas</div></div>;
      faction = <Button full size="lg" icon="Check" disabled={busy} onClick={fFinish}>{busy ? "Guardando…" : "Cerrar y guardar check-in"}</Button>;
    }
    return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 600 }}>{Header(fsub)}<Card pad={24}>{partsBar}{fbody}<div style={{ marginTop: 22 }}>{faction}</div></Card></div></Shell>;
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

    if (!isFacil) {
      if (step === "result") return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 520 }}>{Header("¿Funcionó la prueba? El facilitador marca el resultado con el equipo.")}<Card pad={24} style={{ textAlign: "center" }}>{rl ? <Pill color={rl.c} bg={`color-mix(in srgb, ${rl.c} 14%, transparent)`} icon="Flag">{rl.l}</Pill> : <span className="muted">Definiendo…</span>}</Card></div></Shell>;
      if (step === "reflect") {
        const myRef = (inputs.find((i) => i.userId === user.id && i.key === "reflection")?.value as { text?: string })?.text ?? "";
        const reflected = inputs.some((i) => i.userId === user.id && i.key === "reflected");
        return (
          <Shell onExit={exit}>
            <div style={{ width: "100%", maxWidth: 520 }}>
              {Header("Un minuto de silencio para pensar. Lo que escribas es tuyo: el facilitador no lo ve.")}
              <Card pad={24}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: "var(--st-learn)" }}><Icon name="Lock" size={16} /><span className="eyebrow" style={{ color: "var(--st-learn)" }}>Reflexión privada</span></div>
                <textarea defaultValue={myRef} onBlur={(e) => setMyInput(sessionId, "reflection", { text: e.target.value }, true)} rows={5} placeholder="¿Qué aprendí sobre cómo trabajo? ¿Qué quiero hacer distinto la próxima? ¿Cómo me siento con el equipo?" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "12px 14px", fontSize: "var(--t-base)", outline: "none", lineHeight: 1.5, resize: "vertical" }} />
                <Button full icon={reflected ? "Check" : "Lock"} variant={reflected ? "secondary" : "primary"} onClick={() => setMyInput(sessionId, "reflected", { ok: true })} style={{ marginTop: 12 }}>{reflected ? "Guardado en privado" : "Guardar mi reflexión"}</Button>
                <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 10, textAlign: "center" }}>Nadie más —ni el facilitador— puede leer esto.</p>
              </Card>
            </div>
          </Shell>
        );
      }
      if (step === "learnings") {
        const add = async () => { const t = (cardDraft.learning ?? "").trim(); if (!t) return; await addCard(sessionId, "learning", t, true); setCardDraft((d) => ({ ...d, learning: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
        return (
          <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("¿Qué aprendimos? Lo que nos llevamos, sirva o no la prueba.")}
            <Card pad={24}>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <input autoFocus value={cardDraft.learning ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, learning: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Un aprendizaje…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none" }} />
                <Button icon="Plus" onClick={add}>Sumar</Button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {myLearn.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-learn)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 6 }}>· tuya</span></div>)}
                {!myLearn.length && <div style={{ color: "var(--ink-3)", fontSize: "var(--t-sm)", textAlign: "center", padding: 16 }}>Sumá tu aprendizaje…</div>}
              </div>
            </Card></div></Shell>
        );
      }
      if (step === "learnings_reveal") return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("Los aprendizajes del equipo.")}<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{learnCards.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-learn)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}</div>)}</div></div></Shell>;
      if (step === "decision") return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 520 }}>{Header("¿Y ahora qué? El facilitador define la decisión con el equipo.")}<Card pad={24} style={{ textAlign: "center" }}>{dl ? <Pill color={dl.c} bg={`color-mix(in srgb, ${dl.c} 14%, transparent)`} icon="GitFork">{dl.l}</Pill> : <span className="muted">Definiendo…</span>}</Card></div></Shell>;
      return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("Ciclo cerrado.")}<Card pad={24} style={{ display: "flex", justifyContent: "center" }}>{Picked}</Card></div></Shell>;
    }

    const fSteps = ["result", "reflect", "learnings", "learnings_reveal", "decision", "close"];
    const fNext = async () => { const i = fSteps.indexOf(step); setBusy(true); await setStep(sessionId, fSteps[Math.min(fSteps.length - 1, i + 1)], i + 1); setBusy(false); };
    const reflectedCount = inputs.filter((i) => i.key === "reflected").length;
    const fFinish = async () => {
      setBusy(true);
      await finalizeSession(session, {
        cardCount: learnCount, summaryText: `Resultado: ${rl?.l ?? "—"} · ${dl?.l ?? "—"}`,
        dataKey: "learn", dataValue: { result: resultKey, learnings: learnCards.map((c) => c.text), decision },
        noAdvance: true, status: decision === "iterate" ? "active" : "done", stageOverride: decision === "iterate" ? "proof" : undefined,
      });
      setBusy(false); exit();
    };
    const partsBar = <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}><div style={{ display: "flex" }}>{participants.slice(0, 8).map((p, i) => <span key={p.userId} style={{ marginLeft: i ? -8 : 0 }}><Avatar name={p.name} initials={p.initials} size={28} idx={i} /></span>)}</div><span className="muted num" style={{ fontSize: "var(--t-sm)" }}>{totalInRoom} en la sala</span></div>;
    const PickRow = (opts: { k: string; l: string; c: string; i: string; d?: string }[], value: string, key: string) => (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 10 }}>
        {opts.map((o) => { const on = value === o.k; return (
          <button key={o.k} onClick={() => setResult(sessionId, { [key]: o.k })} style={{ textAlign: "left", padding: 14, borderRadius: "var(--r-lg)", background: on ? `color-mix(in srgb, ${o.c} 14%, var(--card))` : "var(--card)", border: `1px solid ${on ? o.c : "var(--line-2)"}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: o.c }}><Icon name={o.i} size={18} /></span><span style={{ fontWeight: 700 }}>{o.l}</span>{on && <span style={{ marginLeft: "auto", color: o.c }}><Icon name="CheckCircle2" size={16} /></span>}</div>
            {o.d && <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 4 }}>{o.d}</p>}
          </button>
        ); })}
      </div>
    );
    let fbody: React.ReactNode = null, faction: React.ReactNode = null, fsub = "";
    if (step === "result") {
      fsub = "La mirada honesta del equipo sobre el resultado.";
      fbody = PickRow(RESULTS, resultKey, "result");
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy || !resultKey} onClick={fNext}>Siguiente: reflexión</Button>;
    } else if (step === "reflect") {
      fsub = "Dales 60 segundos de silencio para reflexionar en privado. No vas a ver lo que escriben: es de cada persona.";
      fbody = (
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div style={{ width: 52, height: 52, borderRadius: "var(--r-lg)", background: "color-mix(in srgb, var(--st-learn) 16%, transparent)", color: "var(--st-learn)", display: "grid", placeItems: "center", margin: "0 auto 12px" }}><Icon name="Lock" size={24} /></div>
          <div className="num" style={{ fontSize: "var(--t-2xl)", fontWeight: 800, color: "var(--st-learn)" }}>{reflectedCount}/{totalInRoom}</div>
          <div className="muted" style={{ fontSize: "var(--t-sm)" }}>reflexionaron en privado</div>
          <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 12, lineHeight: 1.5 }}>Las reflexiones quedan guardadas solo para cada integrante. Esto protege la honestidad del equipo.</p>
        </div>
      );
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Pasar a compartir aprendizajes</Button>;
    } else if (step === "learnings") {
      fsub = "Los miembros escriben aprendizajes a ciegas.";
      fbody = <div style={{ textAlign: "center", padding: "10px 0" }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--st-learn)" }}>{learnCount}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>aprendizajes</div></div>;
      faction = <Button full size="lg" icon="Eye" disabled={busy || learnCount === 0} onClick={fNext}>Revelar aprendizajes ({learnCount})</Button>;
    } else if (step === "learnings_reveal") {
      fsub = "Lo que se lleva el equipo.";
      fbody = <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{learnCards.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-learn)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}</div>)}</div>;
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Siguiente: decisión</Button>;
    } else if (step === "decision") {
      fsub = "¿Cómo sigue esta iniciativa?";
      fbody = PickRow(DECISIONS, decision, "decision");
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy || !decision} onClick={fNext}>Revisar y cerrar</Button>;
    } else {
      fsub = decision === "iterate" ? "Al cerrar, la iniciativa vuelve a Prueba." : "Al cerrar, la iniciativa queda cerrada.";
      fbody = <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{Picked}<div className="muted" style={{ fontSize: "var(--t-sm)" }}>{learnCount} {learnCount === 1 ? "aprendizaje" : "aprendizajes"} registrados</div></div>;
      faction = <Button full size="lg" icon="Check" disabled={busy} onClick={fFinish}>{busy ? "Guardando…" : "Cerrar el ciclo"}</Button>;
    }
    return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 600 }}>{Header(fsub)}<Card pad={24}>{partsBar}{fbody}<div style={{ marginTop: 22 }}>{faction}</div></Card></div></Shell>;
  }

  // ════════ MIEMBRO ════════
  if (!isFacil) {
    if (step === "pulse") {
      if (submitted) {
        return (
          <Shell onExit={exit}>
            <Card pad={28} style={{ textAlign: "center", maxWidth: 440 }}>
              <div style={{ width: 56, height: 56, borderRadius: "var(--r-lg)", background: "var(--success-bg)", color: "var(--green)", display: "grid", placeItems: "center", margin: "0 auto 14px", animation: "pop-in .3s var(--spring)" }}><Icon name="Check" size={28} /></div>
              <h2 style={{ fontSize: "var(--t-xl)", fontWeight: 800 }}>¡Listo!</h2>
              <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 6 }}>Tu pulso quedó guardado (anónimo). Esperá a que el facilitador continúe.</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, color: "var(--ink-2)", fontSize: "var(--t-sm)" }}><Icon name="Users" size={15} /> {responses.length} de {totalInRoom} respondieron</div>
            </Card>
          </Shell>
        );
      }
      const submit = async () => { setBusy(true); const res = await submitPulse(sessionId, draft); setBusy(false); if (!res.error) setSubmitted(true); };
      return (
        <Shell onExit={exit}>
          <div style={{ width: "100%", maxWidth: 560 }}>
            {Header("5 señales, anónimas. Movélas según cómo sentís al equipo hoy.")}
            <Card pad={24}>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {PULSE_DIMS.map((d) => (
                  <div key={d.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: "var(--t-sm)", fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: d.color }} />{d.label}</span>
                      <span className="num" style={{ fontWeight: 700, color: d.color }}>{draft[d.key]}</span>
                    </div>
                    <input type="range" min={0} max={100} value={draft[d.key]} onChange={(e) => setDraft((s) => ({ ...s, [d.key]: Number(e.target.value) }))} style={{ width: "100%", accentColor: d.color }} />
                  </div>
                ))}
              </div>
              <Button full size="lg" icon="Send" disabled={busy} onClick={submit} style={{ marginTop: 22 }}>{busy ? "Enviando…" : "Enviar mi pulso"}</Button>
              <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 12, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Icon name="Lock" size={13} /> Anónimo: solo se muestra el promedio.</p>
            </Card>
          </div>
        </Shell>
      );
    }
    if (step === "pulse_reveal") {
      return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("El pulso del equipo, revelado.")}<Card pad={24}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}><span style={{ fontWeight: 700 }}>Promedio del equipo</span><Pill color="var(--success)" bg="var(--success-bg)" icon="Eye">{overall}/100</Pill></div>{Averages}</Card><p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)", marginTop: 16 }}>Esperá a que el facilitador abra el siguiente paso.</p></div></Shell>;
    }
    if (step === "cards") {
      const add = async (colKey: string) => {
        const text = (cardDraft[colKey] ?? "").trim();
        if (!text) return;
        await addCard(sessionId, colKey, text, anon);
        setCardDraft((d) => ({ ...d, [colKey]: "" }));
        if (user) setMyCards(await getMyCards(sessionId, user.id));
      };
      return (
        <Shell onExit={exit}>
          <div style={{ width: "100%", maxWidth: 920 }}>
            {Header("Escribí en silencio. Tus tarjetas quedan ocultas hasta que el facilitador revele.")}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <button onClick={() => setAnon((a) => !a)} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: "var(--r-full)", border: "1px solid var(--line-2)", background: "var(--card)", fontSize: "var(--t-sm)", fontWeight: 600 }}>
                <Icon name={anon ? "Lock" : "Globe"} size={15} style={{ color: anon ? "var(--ink-2)" : "var(--green)" }} />
                Tus tarjetas: <b style={{ color: anon ? "var(--ink-1)" : "var(--green)" }}>{anon ? "Anónimas" : "Públicas"}</b>
                <span className="faint" style={{ fontSize: "var(--t-xs)" }}>(tocá para cambiar)</span>
              </button>
            </div>
            <div className="cards-cols" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {COLS.map((col) => {
                const mine = myCards.filter((c) => c.columnKey === col.key);
                return (
                  <div key={col.key} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 14, display: "flex", flexDirection: "column", minHeight: 240 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <span style={{ color: col.color }}><Icon name={col.icon} size={16} /></span>
                      <span style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{col.label}</span>
                      <span className="num" style={{ marginLeft: "auto", fontSize: "var(--t-xs)", color: "var(--ink-2)", background: "var(--card)", borderRadius: 99, padding: "2px 8px" }}>{counts[col.key] ?? 0}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                      {mine.map((c) => (
                        <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${col.color}`, borderRadius: "var(--r-md)", padding: "9px 11px", fontSize: "var(--t-sm)" }}>
                          {c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 6 }}>{c.anonymous ? "· anónima" : "· pública"} · tuya</span>
                        </div>
                      ))}
                      {!mine.length && <div style={{ color: "var(--ink-3)", fontSize: "var(--t-xs)", textAlign: "center", padding: 12 }}>Sumá lo tuyo…</div>}
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                      <input value={cardDraft[col.key] ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, [col.key]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add(col.key)} placeholder="Sumar tarjeta…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "8px 10px", fontSize: "var(--t-sm)", outline: "none" }} />
                      <button onClick={() => add(col.key)} style={{ background: col.color, color: "#06121f", borderRadius: "var(--r-sm)", padding: "0 11px", display: "grid", placeItems: "center" }}><Icon name="Plus" size={16} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Shell>
      );
    }
    if (step === "cards_reveal") {
      return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 920 }}>{Header("Todas las tarjetas a la vista. Las anónimas no muestran autor.")}{RevealedCards}</div></Shell>;
    }
    if (step === "cluster") {
      return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 920 }}>{Header("El facilitador está agrupando las tarjetas en tensiones.")}{ClustersView}</div></Shell>;
    }
    if (step === "vote") {
      const vote = async (clusterId: string, delta: number) => {
        if (delta > 0 && remaining <= 0) return;
        if (delta > 0) await addVote(sessionId, clusterId); else await removeVote(sessionId, clusterId);
      };
      return (
        <Shell onExit={exit}>
          <div style={{ width: "100%", maxWidth: 600 }}>
            {Header(`Tenés ${DOTS_PER} puntos. ¿Qué tensión atendemos primero?`)}
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <span className="muted" style={{ fontSize: "var(--t-sm)" }}>Te quedan </span>
              <span className="num" style={{ fontWeight: 800, color: "var(--green)", fontSize: "var(--t-lg)" }}>{remaining}</span>
              <span className="muted" style={{ fontSize: "var(--t-sm)" }}> puntos</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {clusters.map((cl) => {
                const mine = votes.filter((v) => v.userId === user.id && v.clusterId === cl.id).length;
                return (
                  <Card key={cl.id} pad={16}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "var(--t-base)" }}>{cl.name}</div>
                        <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{cardsOf(cl.id).length} señales</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button onClick={() => vote(cl.id, -1)} disabled={mine === 0} style={{ width: 32, height: 32, borderRadius: "var(--r-sm)", background: "var(--card-2)", border: "1px solid var(--line-2)", color: "var(--ink-1)", opacity: mine === 0 ? 0.4 : 1 }}><Icon name="Minus" size={16} /></button>
                        <span className="num" style={{ width: 22, textAlign: "center", fontWeight: 700 }}>{mine}</span>
                        <button onClick={() => vote(cl.id, 1)} disabled={remaining === 0} style={{ width: 32, height: 32, borderRadius: "var(--r-sm)", background: remaining === 0 ? "var(--card-2)" : "var(--green)", border: "1px solid var(--line-2)", color: remaining === 0 ? "var(--ink-3)" : "#06121f" }}><Icon name="Plus" size={16} /></button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
            <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)", marginTop: 16 }}>El facilitador cierra la votación cuando todos terminen.</p>
          </div>
        </Shell>
      );
    }
    // ── Fase Propósito (miembro) ──
    if (step === "purpose") {
      return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 920 }}>{Header("¿Para qué existe este equipo? Respondé las tres. Estas tarjetas son públicas.")}{MultiWrite(PURPOSE_COLS, "var(--st-explore)")}</div></Shell>;
    }
    if (step === "purpose_reveal") {
      return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 920 }}>{Header("Las respuestas del equipo, lado a lado. ¿Hay acuerdo o dispersión?")}{MultiReveal(PURPOSE_COLS)}</div></Shell>;
    }
    if (step === "purpose_decide") {
      return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("El facilitador redacta el propósito del equipo.")}<Card pad={24} style={{ borderColor: "var(--st-explore)" }}>{purposeText ? <p style={{ fontSize: "var(--t-md)", lineHeight: 1.6 }}>{purposeText}</p> : <span className="muted">Redactando el propósito…</span>}</Card></div></Shell>;
    }
    // ── Fase Flujo de trabajo (miembro) ──
    if (step === "flow") {
      return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 920 }}>{Header("Mapeá el flujo de trabajo del equipo, etapa por etapa.")}{MultiWrite(FLOW_COLS, "var(--st-explore)")}</div></Shell>;
    }
    if (step === "flow_reveal") {
      return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 920 }}>{Header("El flujo completo, a la vista. ¿Dónde se traba más seguido?")}{MultiReveal(FLOW_COLS)}</div></Shell>;
    }
    if (step === "flow_vote") {
      return (
        <Shell onExit={exit}>
          <div style={{ width: "100%", maxWidth: 560 }}>
            {Header("¿Cuál es la etapa más crítica del flujo? Elegí una.")}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {FLOW_COLS.map((f) => { const on = myCritical === f.key; return (
                <button key={f.key} onClick={() => setMyInput(sessionId, "critical", { stage: f.key })} style={{ textAlign: "left", padding: "13px 14px", borderRadius: "var(--r-md)", background: on ? "color-mix(in srgb, var(--st-explore) 14%, var(--card))" : "var(--card)", border: `1px solid ${on ? "var(--st-explore)" : "var(--line)"}`, display: "flex", alignItems: "center", gap: 11 }}>
                  <span style={{ color: on ? "var(--st-explore)" : f.color }}><Icon name={on ? "CircleCheck" : f.icon} size={18} /></span>
                  <div><div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{f.label}</div><div className="muted" style={{ fontSize: "var(--t-xs)" }}>{f.sub}</div></div>
                </button>
              ); })}
            </div>
            <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)", marginTop: 14 }}>El facilitador cierra la votación cuando todos elijan.</p>
          </div>
        </Shell>
      );
    }
    // close (miembro)
    return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 600 }}>{Header("Mapa de tensiones priorizado por el equipo.")}{RankedMap}{criticalMeta && <Card pad={16} style={{ marginTop: 14, borderColor: "var(--st-explore)" }}><div className="eyebrow" style={{ color: "var(--st-explore)", marginBottom: 4 }}>Etapa más crítica del flujo</div><div style={{ fontWeight: 700 }}>{criticalMeta.label}</div></Card>}</div></Shell>;
  }

  // ════════ FACILITADOR ════════
  const goNext = async () => {
    const idx = STEPS.indexOf(step);
    const nextKey = STEPS[Math.min(STEPS.length - 1, idx + 1)];
    setBusy(true); await setStep(sessionId, nextKey, idx + 1); setBusy(false);
  };
  const group = async () => {
    if (!sel.length) return;
    setBusy(true);
    const id = await createCluster(sessionId, `Tensión ${clusters.length + 1}`);
    if (id) for (const cid of sel) await assignCardToCluster(cid, id);
    setSel([]); setBusy(false); load();
  };
  const finish = async () => {
    setBusy(true);
    const hasClusters = clusters.length > 0;
    const hasData = hasClusters || !!purposeText || !!criticalMeta;
    await finalizeSession(session, {
      pulseAvg: avg, cardCount: allCards.length,
      summaryText: hasClusters ? `prioridad: ${ranked[0]?.name ?? "—"}` : (purposeText ? "propósito definido" : undefined),
      dataKey: hasData ? "explore" : undefined,
      dataValue: hasData
        ? {
            priority: ranked[0]?.name ?? "",
            tensions: ranked.map((c) => ({ name: c.name, signals: cardsOf(c.id).length, dots: votesByCluster[c.id] ?? 0 })),
            pausedCount: ranked.slice(1).length,
            purpose: purposeText || undefined,
            criticalStage: criticalMeta ? criticalMeta.label : undefined,
          }
        : undefined,
      pausedNames: hasClusters ? ranked.slice(1).map((c) => c.name) : undefined,
    });
    setBusy(false); exit();
  };

  const ParticipantsBar = (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
      <div style={{ display: "flex" }}>{participants.slice(0, 8).map((p, i) => <span key={p.userId} style={{ marginLeft: i ? -8 : 0 }}><Avatar name={p.name} initials={p.initials} size={28} idx={i} /></span>)}</div>
      <span className="muted num" style={{ fontSize: "var(--t-sm)" }}>{totalInRoom} en la sala</span>
    </div>
  );

  let body: React.ReactNode = null, action: React.ReactNode = null, sub = "", wide = false;
  if (step === "pulse") {
    sub = "Los miembros responden su pulso desde su login. El contador se actualiza en vivo.";
    body = <div style={{ textAlign: "center", padding: "10px 0" }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--green)" }}>{responses.length}/{totalInRoom || team?.members.length || 0}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>respondieron</div></div>;
    action = <Button full size="lg" icon="Eye" disabled={busy || responses.length === 0} onClick={goNext}>Revelar promedio ({responses.length})</Button>;
  } else if (step === "pulse_reveal") {
    sub = "El pulso del equipo, revelado para todos.";
    body = <><div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}><Pill color="var(--success)" bg="var(--success-bg)" icon="Eye">{overall}/100</Pill></div>{Averages}</>;
    action = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={goNext}>Siguiente: tarjetas</Button>;
  } else if (step === "cards") {
    sub = "Los miembros escriben a ciegas. Vos ves el conteo; el contenido se revela todo junto.";
    body = (
      <div style={{ display: "flex", gap: 12 }}>
        {COLS.map((col) => (
          <div key={col.key} style={{ flex: 1, textAlign: "center", padding: "16px 8px", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
            <span style={{ color: col.color }}><Icon name={col.icon} size={18} /></span>
            <div className="num" style={{ fontSize: "var(--t-2xl)", fontWeight: 800, margin: "4px 0" }}>{counts[col.key] ?? 0}</div>
            <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{col.label}</div>
          </div>
        ))}
      </div>
    );
    action = <Button full size="lg" icon="Eye" disabled={busy || totalCards === 0} onClick={goNext}>Revelar tarjetas ({totalCards})</Button>;
  } else if (step === "cards_reveal") {
    wide = true; sub = "Todas las tarjetas a la vista. Las anónimas no muestran autor.";
    body = RevealedCards;
    action = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={goNext}>Siguiente: agrupar</Button>;
  } else if (step === "cluster") {
    wide = true; sub = "Juntá las tarjetas que hablan de lo mismo. Seleccioná varias y armá una tensión.";
    body = (
      <div className="cluster-grid" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18, alignItems: "start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span className="eyebrow">Sueltas ({loose.length})</span>
            {sel.length > 0 && <Button size="sm" icon="Group" disabled={busy} onClick={group}>Agrupar {sel.length}</Button>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px,1fr))", gap: 10 }}>
            {loose.map((c) => { const cm = colMeta(c.columnKey); const on = sel.includes(c.id); return (
              <button key={c.id} onClick={() => setSel((s) => (on ? s.filter((x) => x !== c.id) : [...s, c.id]))}
                style={{ textAlign: "left", background: on ? "var(--green-soft)" : "var(--card)", border: "1px solid " + (on ? "var(--green)" : "var(--line)"), borderLeft: "3px solid " + cm.color, borderRadius: "var(--r-md)", padding: "10px 11px", fontSize: "var(--t-sm)", lineHeight: 1.4, position: "relative" }}>
                {on && <span style={{ position: "absolute", top: 6, right: 6, color: "var(--green)" }}><Icon name="CheckCircle2" size={14} /></span>}{c.text}
              </button>
            ); })}
            {!loose.length && <div style={{ gridColumn: "1/-1", color: "var(--ink-3)", fontSize: "var(--t-sm)", padding: 16, textAlign: "center" }}>Todas agrupadas.</div>}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="eyebrow">Tensiones ({clusters.length})</span>
          {clusters.map((cl) => (
            <Card key={cl.id} pad={12}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ color: "var(--green)" }}><Icon name="Layers" size={15} /></span>
                <input defaultValue={cl.name} onBlur={(e) => renameCluster(cl.id, e.target.value)} style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", color: "var(--ink-0)", fontWeight: 700, fontSize: "var(--t-sm)", outline: "none", borderBottom: "1px dashed var(--line-2)" }} />
                <button onClick={() => deleteCluster(cl.id)} style={{ color: "var(--ink-3)" }}><Icon name="Trash2" size={14} /></button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {cardsOf(cl.id).map((c) => { const cm = colMeta(c.columnKey); return <div key={c.id} style={{ fontSize: "var(--t-xs)", color: "var(--ink-1)", padding: "5px 7px", background: "var(--card-2)", borderRadius: "var(--r-sm)", borderLeft: `2px solid ${cm.color}` }}>{c.text}</div>; })}
              </div>
            </Card>
          ))}
          {!clusters.length && <div style={{ border: "1px dashed var(--line-2)", borderRadius: "var(--r-md)", padding: 18, textAlign: "center", color: "var(--ink-3)", fontSize: "var(--t-sm)" }}>Seleccioná tarjetas y agrupalas.</div>}
        </div>
      </div>
    );
    action = <Button full size="lg" iconRight="ArrowRight" disabled={busy || clusters.length === 0} onClick={goNext}>Siguiente: votar</Button>;
  } else if (step === "vote") {
    sub = "Los miembros reparten sus puntos. La votación se actualiza en vivo.";
    const max = Math.max(1, ...ranked.map((c) => votesByCluster[c.id] ?? 0));
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
    );
    action = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={goNext}>Siguiente: propósito</Button>;
  } else if (step === "purpose") {
    wide = true; sub = "El equipo responde para qué existe. Vos ves el conteo; se revela todo junto.";
    body = (
      <div style={{ display: "flex", gap: 12 }}>
        {PURPOSE_COLS.map((col) => (
          <div key={col.key} style={{ flex: 1, textAlign: "center", padding: "16px 8px", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
            <div className="num" style={{ fontSize: "var(--t-2xl)", fontWeight: 800, margin: "4px 0", color: "var(--st-explore)" }}>{counts[col.key] ?? 0}</div>
            <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{col.label}</div>
          </div>
        ))}
      </div>
    );
    action = <Button full size="lg" icon="Eye" disabled={busy} onClick={goNext}>Revelar respuestas</Button>;
  } else if (step === "purpose_reveal") {
    wide = true; sub = "¿Hay acuerdo o dispersión? Esa lectura es el dato.";
    body = MultiReveal(PURPOSE_COLS);
    action = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={goNext}>Redactar el propósito</Button>;
  } else if (step === "purpose_decide") {
    sub = "Sintetizá una frase de propósito que el equipo pueda firmar.";
    body = <textarea defaultValue={purposeText} onBlur={(e) => setResult(sessionId, { purpose: e.target.value.trim() })} rows={4} placeholder="Existimos para… / Nuestro trabajo importa porque…" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "12px 14px", fontSize: "var(--t-base)", outline: "none", lineHeight: 1.5, resize: "vertical" }} />;
    action = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={goNext}>Siguiente: flujo de trabajo</Button>;
  } else if (step === "flow") {
    wide = true; sub = "El equipo mapea su flujo de trabajo etapa por etapa.";
    body = (
      <div style={{ display: "flex", gap: 10 }}>
        {FLOW_COLS.map((col) => (
          <div key={col.key} style={{ flex: 1, textAlign: "center", padding: "14px 6px", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
            <span style={{ color: col.color }}><Icon name={col.icon} size={17} /></span>
            <div className="num" style={{ fontSize: "var(--t-2xl)", fontWeight: 800, margin: "4px 0" }}>{counts[col.key] ?? 0}</div>
            <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{col.label}</div>
          </div>
        ))}
      </div>
    );
    action = <Button full size="lg" icon="Eye" disabled={busy} onClick={goNext}>Revelar flujo</Button>;
  } else if (step === "flow_reveal") {
    wide = true; sub = "El flujo completo. Ahora votamos la etapa más crítica.";
    body = MultiReveal(FLOW_COLS);
    action = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={goNext}>Votar etapa crítica</Button>;
  } else if (step === "flow_vote") {
    sub = "Los miembros eligen la etapa más crítica. Conteo en vivo.";
    const maxF = Math.max(1, ...FLOW_COLS.map((f) => flowVotes[f.key] ?? 0));
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {flowRanked.map((f, i) => (
          <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: i === 0 ? "var(--st-explore)" : f.color }}><Icon name={f.icon} size={16} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: "var(--t-sm)", marginBottom: 5 }}>{f.label}</div>
              <Bar value={((flowVotes[f.key] ?? 0) / maxF) * 100} color={i === 0 ? "var(--st-explore)" : "var(--violet)"} height={7} />
            </div>
            <span className="num" style={{ fontWeight: 700, width: 22, textAlign: "right" }}>{flowVotes[f.key] ?? 0}</span>
          </div>
        ))}
      </div>
    );
    action = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={async () => { setBusy(true); await setResult(sessionId, { critical: criticalStage }); setBusy(false); goNext(); }}>Cerrar y ver el mapa</Button>;
  } else {
    wide = false; sub = "El mapa final. Al cerrar, se guarda y la iniciativa avanza de etapa.";
    body = (
      <>
        {(purposeText || criticalMeta) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {purposeText && <div style={{ padding: "12px 14px", background: "color-mix(in srgb, var(--st-explore) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--st-explore) 28%, transparent)", borderRadius: "var(--r-md)" }}><div className="eyebrow" style={{ color: "var(--st-explore)", marginBottom: 4 }}>Propósito del equipo</div><p style={{ fontSize: "var(--t-sm)", lineHeight: 1.5 }}>{purposeText}</p></div>}
            {criticalMeta && <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--t-sm)" }}><Icon name={criticalMeta.icon} size={15} style={{ color: "var(--st-explore)" }} /><span className="muted">Etapa más crítica del flujo:</span> <b>{criticalMeta.label}</b></div>}
          </div>
        )}
        {RankedMap}
        {session.type === "explore" && ranked.length > 1 && (
          <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}><Icon name="Pause" size={13} /> Las {ranked.length - 1} tensiones no priorizadas quedan como iniciativas <b style={{ color: "var(--warning)" }}>pausadas</b> del equipo.</p>
        )}
      </>
    );
    action = <Button full size="lg" icon="Check" disabled={busy} onClick={finish}>{busy ? "Guardando…" : "Cerrar y guardar sesión"}</Button>;
  }

  return (
    <Shell onExit={exit}>
      <div style={{ width: "100%", maxWidth: wide ? 920 : 600 }}>
        {Header(sub)}
        <Card pad={24}>
          {ParticipantsBar}
          {body}
          <div style={{ marginTop: 22 }}>{action}</div>
        </Card>
      </div>
    </Shell>
  );
}
