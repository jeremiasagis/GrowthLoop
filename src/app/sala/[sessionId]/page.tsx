"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Logo } from "@/components/AppShell";
import { Avatar, Bar, Button, Card, Pill } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { getInitiatives, getTeam } from "@/lib/repository";
import { PULSE_DIMS } from "@/lib/data";
import {
  addCard, addVote, assignCardToCluster, averagePulse, createCluster, deleteCluster,
  finalizeSession, getCardCounts, getCards, getClusters, getMyCards, getParticipants,
  getPulseResponses, getSession, getVotes, hasResponded, joinSession, removeVote,
  renameCluster, setResult, setStep, submitPulse, subscribeSession,
  type LiveSession, type Participant, type PulseResponse, type SessionCard, type SessionCluster, type SessionVote,
} from "@/lib/session";

const COLS = [
  { key: "works", label: "Lo que funciona", color: "var(--success)", icon: "ThumbsUp" },
  { key: "blocks", label: "Lo que nos traba", color: "var(--warning)", icon: "Construction" },
  { key: "unsaid", label: "Lo que nadie dice", color: "var(--violet)", icon: "EyeOff" },
] as const;
const STEPS = ["pulse", "pulse_reveal", "cards", "cards_reveal", "cluster", "vote", "close"];
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

  const [session, setSession] = useState<LiveSession | null>(null);
  const [responses, setResponses] = useState<PulseResponse[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [myCards, setMyCards] = useState<SessionCard[]>([]);
  const [allCards, setAllCards] = useState<SessionCard[]>([]);
  const [clusters, setClusters] = useState<SessionCluster[]>([]);
  const [votes, setVotes] = useState<SessionVote[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<PulseResponse>({ confianza: 60, comunic: 60, claridad: 60, foco: 60, seguridad: 60 });
  const [cardDraft, setCardDraft] = useState<Record<string, string>>({ works: "", blocks: "", unsaid: "" });
  const [anon, setAnon] = useState(true);
  const [sel, setSel] = useState<string[]>([]);
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
      if (user) { setSubmitted(await hasResponded(sessionId, user.id)); setMyCards(await getMyCards(sessionId, user.id)); }
      const needsAll = ["cards_reveal", "cluster", "vote", "close", "causes_reveal"].includes(s.stepKey ?? "");
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
  const subject = (initiative?.data?.explore?.priority as string) || initiative?.title || "la tensión priorizada";
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

  const Header = (sub: string) => (
    <div style={{ textAlign: "center", marginBottom: 24 }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ width: 9, height: 9, borderRadius: 99, background: "var(--green)", boxShadow: "0 0 8px var(--green)", animation: "glow-pulse 1.4s infinite" }} />
        <span className="eyebrow" style={{ color: "var(--green)" }}>Sesión en vivo</span>
      </div>
      <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>{team?.name ?? "Equipo"}</h1>
      <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 4 }}>{sub}</p>
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

  // ════════ FOCO (¿Por qué pasa esto?) ════════
  if (session.type === "focus") {
    const causeCards = allCards.filter((c) => c.columnKey === "cause");
    const myCauses = myCards.filter((c) => c.columnKey === "cause");
    const causeCount = counts["cause"] ?? 0;
    const root = (session.result?.rootCause as string) ?? "";

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
              {Header("Las causas, a la vista. El facilitador define la causa raíz.")}
              {root && <Card pad={16} style={{ marginBottom: 14, borderColor: "var(--st-focus)" }}><div className="eyebrow" style={{ color: "var(--st-focus)", marginBottom: 4 }}>Causa raíz</div><div style={{ fontWeight: 700 }}>{root}</div></Card>}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {causeCards.map((c) => <div key={c.id} style={{ background: c.text === root ? "color-mix(in srgb, var(--st-focus) 14%, var(--card))" : "var(--card)", border: `1px solid ${c.text === root ? "var(--st-focus)" : "var(--line)"}`, borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}</div>)}
              </div>
            </div>
          </Shell>
        );
      }
      return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 520 }}>{Header("Causa raíz definida.")}<Card pad={24} style={{ textAlign: "center" }}><div className="eyebrow" style={{ color: "var(--st-focus)", marginBottom: 8 }}>Causa raíz</div><div style={{ fontSize: "var(--t-lg)", fontWeight: 800 }}>{root || "—"}</div></Card></div></Shell>;
    }

    // FACILITADOR (foco)
    const fSteps = ["causes", "causes_reveal", "close"];
    const fNext = async () => { const i = fSteps.indexOf(step); setBusy(true); await setStep(sessionId, fSteps[Math.min(fSteps.length - 1, i + 1)], i + 1); setBusy(false); };
    const fFinish = async () => {
      setBusy(true);
      await finalizeSession(session, { cardCount: causeCards.length, summaryText: `Causa raíz: ${root || "—"}`, dataKey: "focus", dataValue: { rootCause: root, causes: causeCards.map((c) => c.text) } });
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
      fsub = "Con el equipo, elegí la causa raíz (tocá una).";
      fbody = (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {causeCards.map((c) => { const on = c.text === root; return (
            <button key={c.id} onClick={() => setResult(sessionId, { rootCause: c.text })} style={{ textAlign: "left", background: on ? "color-mix(in srgb, var(--st-focus) 14%, var(--card))" : "var(--card)", border: `1px solid ${on ? "var(--st-focus)" : "var(--line)"}`, borderRadius: "var(--r-md)", padding: "11px 13px", fontSize: "var(--t-sm)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: on ? "var(--st-focus)" : "var(--ink-3)" }}><Icon name={on ? "CircleCheck" : "Circle"} size={17} /></span>{c.text}
            </button>
          ); })}
          {!causeCards.length && <p className="muted" style={{ fontSize: "var(--t-sm)" }}>No se cargaron causas.</p>}
        </div>
      );
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy || !root} onClick={fNext}>Confirmar causa raíz</Button>;
    } else {
      fsub = "Causa raíz definida. Al cerrar, la iniciativa avanza a Prueba.";
      fbody = <Card pad={18} style={{ textAlign: "center", borderColor: "var(--st-focus)" }}><div className="eyebrow" style={{ color: "var(--st-focus)", marginBottom: 6 }}>Causa raíz</div><div style={{ fontSize: "var(--t-lg)", fontWeight: 800 }}>{root || "—"}</div></Card>;
      faction = <Button full size="lg" icon="Check" disabled={busy} onClick={fFinish}>{busy ? "Guardando…" : "Cerrar y guardar sesión"}</Button>;
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
    // close (miembro)
    return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 600 }}>{Header("Mapa de tensiones priorizado por el equipo.")}{RankedMap}</div></Shell>;
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
    await finalizeSession(session, {
      pulseAvg: avg, cardCount: allCards.length,
      summaryText: hasClusters ? `prioridad: ${ranked[0]?.name ?? "—"}` : undefined,
      dataKey: hasClusters ? "explore" : undefined,
      dataValue: hasClusters
        ? { priority: ranked[0]?.name ?? "", tensions: ranked.map((c) => ({ name: c.name, signals: cardsOf(c.id).length, dots: votesByCluster[c.id] ?? 0 })), pausedCount: ranked.slice(1).length }
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
    action = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={goNext}>Cerrar votación</Button>;
  } else {
    wide = false; sub = "El mapa final. Al cerrar, se guarda y la iniciativa avanza de etapa.";
    body = (
      <>
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
