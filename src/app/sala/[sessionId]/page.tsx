"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Logo } from "@/components/AppShell";
import { Avatar, Bar, Button, Card, Pill } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { getInitiatives, getTeam } from "@/lib/repository";
import { retroByKey } from "@/lib/retros";
import { PULSE_DIMS } from "@/lib/data";
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
  const [inputs, setInputs] = useState<SessionInput[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
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
      const needsAll = ["cards_reveal", "cluster", "vote", "close", "causes_reveal", "ideas_reveal", "blockers_reveal", "learnings_reveal", "ice", "problems_reveal", "rate", "funnel_reveal", "funnel_vote", "risks_reveal", "mitigate", "plan"].includes(s.stepKey ?? "");
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
  const Header = (sub: string) => (
    <div style={{ textAlign: "center", marginBottom: 24 }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ width: 9, height: 9, borderRadius: 99, background: "var(--green)", boxShadow: "0 0 8px var(--green)", animation: "glow-pulse 1.4s infinite" }} />
        <span className="eyebrow" style={{ color: "var(--green)" }}>{retroLabel ?? "Sesión en vivo"}</span>
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

  // ════════ PRUEBA · "¿Cuál elegimos?" (proof_choose) ════════
  if (session.retro === "proof_choose") {
    const ideaCards = allCards.filter((c) => c.columnKey === "idea");
    const myIdeas = myCards.filter((c) => c.columnKey === "idea");
    const ideaCount = counts["idea"] ?? 0;
    const iceFor = (id: string) => {
      const rows = inputs.filter((i) => i.key === `ice:${id}`).map((i) => i.value as { i: number; c: number; e: number });
      if (!rows.length) return 0;
      return Math.round((rows.reduce((a, r) => a + (Number(r.i) + Number(r.c) + Number(r.e)) / 3, 0) / rows.length) * 10) / 10;
    };
    const ranked = [...ideaCards].sort((a, b) => iceFor(b.id) - iceFor(a.id));
    const chosen = (session.result.chosen as string) ?? (ranked[0]?.text ?? "");
    const myIce = inputs.some((i) => i.userId === user.id && i.key.startsWith("ice:"));
    const iceSubmitters = new Set(inputs.filter((i) => i.key.startsWith("ice:")).map((i) => i.userId)).size;
    const maxIce = Math.max(1, ...ideaCards.map((c) => iceFor(c.id)));
    const ICE_DIMS: [keyof { i: number; c: number; e: number }, string][] = [["i", "Impacto"], ["c", "Confianza"], ["e", "Facilidad"]];
    const RankedIce = (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ranked.map((c, idx) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="num" style={{ width: 20, fontWeight: 700, color: idx === 0 ? "var(--st-proof)" : "var(--ink-3)" }}>{idx + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: "var(--t-sm)", marginBottom: 5 }}>{c.text}</div>
              <Bar value={(iceFor(c.id) / maxIce) * 100} color={idx === 0 ? "var(--st-proof)" : "var(--violet)"} height={7} />
            </div>
            <span className="num" style={{ fontWeight: 700, width: 34, textAlign: "right" }}>{iceFor(c.id)}</span>
          </div>
        ))}
        {!ideaCards.length && <p className="muted" style={{ fontSize: "var(--t-sm)" }}>Sin ideas.</p>}
      </div>
    );

    if (!isFacil) {
      if (step === "ideas") {
        const add = async () => { const t = (cardDraft.idea ?? "").trim(); if (!t) return; await addCard(sessionId, "idea", t, true); setCardDraft((d) => ({ ...d, idea: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
        return (
          <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("¿Qué opciones tenemos para resolver esto? Tirá ideas.")}
            <Card pad={24}>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <input autoFocus value={cardDraft.idea ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, idea: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Una opción…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none" }} />
                <Button icon="Plus" onClick={add}>Sumar</Button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{myIdeas.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-proof)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 6 }}>· tuya</span></div>)}{!myIdeas.length && <div style={{ color: "var(--ink-3)", fontSize: "var(--t-sm)", textAlign: "center", padding: 16 }}>Sumá la primera opción…</div>}</div>
              <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 14, textAlign: "center" }}>{ideaCount} opciones entre todos</p>
            </Card></div></Shell>
        );
      }
      if (step === "ideas_reveal") return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("Las opciones, a la vista. Ahora las puntuamos.")}<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{ideaCards.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}</div>)}</div></div></Shell>;
      if (step === "ice") {
        if (myIce) return <Shell onExit={exit}><Card pad={28} style={{ textAlign: "center", maxWidth: 440 }}><div style={{ width: 56, height: 56, borderRadius: "var(--r-lg)", background: "var(--success-bg)", color: "var(--green)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}><Icon name="Check" size={28} /></div><h2 style={{ fontSize: "var(--t-xl)", fontWeight: 800 }}>¡Puntuaste!</h2><p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 6 }}>Esperá a que el facilitador cierre la elección.</p></Card></Shell>;
        const dr = (id: string) => iceDraft[id] ?? { i: 5, c: 5, e: 5 };
        const submitIce = async () => { setBusy(true); for (const c of ideaCards) await setMyInput(sessionId, `ice:${c.id}`, dr(c.id)); setBusy(false); };
        return (
          <Shell onExit={exit}>
            <div style={{ width: "100%", maxWidth: 600 }}>
              {Header("Puntuá cada opción del 1 al 10. Impacto, Confianza y Facilidad.")}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {ideaCards.map((c) => (
                  <Card key={c.id} pad={16}>
                    <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 10 }}>{c.text}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {ICE_DIMS.map(([k, label]) => (
                        <div key={k}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--t-xs)", marginBottom: 4 }}><span className="muted">{label}</span><span className="num" style={{ fontWeight: 700 }}>{dr(c.id)[k]}</span></div>
                          <input type="range" min={1} max={10} value={dr(c.id)[k]} onChange={(e) => setIceDraft((p) => ({ ...p, [c.id]: { ...dr(c.id), [k]: Number(e.target.value) } }))} style={{ width: "100%", accentColor: "var(--st-proof)" }} />
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
              <Button full size="lg" icon="Send" disabled={busy || !ideaCards.length} onClick={submitIce} style={{ marginTop: 16 }}>{busy ? "Enviando…" : "Enviar mis puntuaciones"}</Button>
            </div>
          </Shell>
        );
      }
      return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("La opción elegida por el equipo.")}{chosen && <Card pad={16} style={{ marginBottom: 14, borderColor: "var(--st-proof)" }}><div className="eyebrow" style={{ color: "var(--st-proof)", marginBottom: 4 }}>Elegimos</div><div style={{ fontWeight: 700 }}>{chosen}</div></Card>}<Card pad={18}>{RankedIce}</Card></div></Shell>;
    }

    // facilitador
    const fSteps = ["ideas", "ideas_reveal", "ice", "close"];
    const fNext = async () => { const i = fSteps.indexOf(step); setBusy(true); await setStep(sessionId, fSteps[Math.min(fSteps.length - 1, i + 1)], i + 1); setBusy(false); };
    const fFinish = async () => { setBusy(true); await finalizeSession(session, { summaryText: `Elegimos: ${chosen}`, dataKey: "proof", dataValue: { chosenIdea: chosen }, noAdvance: true }); setBusy(false); exit(); };
    const partsBar = <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}><div style={{ display: "flex" }}>{participants.slice(0, 8).map((p, i) => <span key={p.userId} style={{ marginLeft: i ? -8 : 0 }}><Avatar name={p.name} initials={p.initials} size={28} idx={i} /></span>)}</div><span className="muted num" style={{ fontSize: "var(--t-sm)" }}>{totalInRoom} en la sala</span></div>;
    let fbody: React.ReactNode = null, faction: React.ReactNode = null, fsub = "";
    if (step === "ideas") {
      fsub = "Junten las opciones posibles (los miembros las cargan).";
      fbody = <div style={{ textAlign: "center", padding: "10px 0" }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--st-proof)" }}>{ideaCount}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>opciones</div></div>;
      faction = <Button full size="lg" icon="Eye" disabled={busy || ideaCount === 0} onClick={fNext}>Revelar opciones ({ideaCount})</Button>;
    } else if (step === "ideas_reveal") {
      fsub = "Repasen las opciones antes de puntuarlas.";
      fbody = <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{ideaCards.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}</div>)}</div>;
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Puntuar con ICE</Button>;
    } else if (step === "ice") {
      fsub = "Cada miembro puntúa Impacto·Confianza·Facilidad. Ranking en vivo.";
      fbody = <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{RankedIce}<div className="muted" style={{ fontSize: "var(--t-sm)", textAlign: "center" }}>{iceSubmitters} de {totalInRoom} puntuaron</div></div>;
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Cerrar la elección</Button>;
    } else {
      fsub = "La opción ganadora (tocá para elegir otra si hace falta).";
      fbody = (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ranked.map((c, idx) => { const on = c.text === chosen; return (
            <button key={c.id} onClick={() => setResult(sessionId, { chosen: c.text })} style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", background: on ? "color-mix(in srgb, var(--st-proof) 14%, var(--card))" : "var(--card)", border: `1px solid ${on ? "var(--st-proof)" : "var(--line)"}`, borderRadius: "var(--r-md)", fontSize: "var(--t-sm)" }}>
              <span style={{ color: on ? "var(--st-proof)" : "var(--ink-3)" }}><Icon name={on ? "CircleCheck" : "Circle"} size={17} /></span>
              <span style={{ flex: 1 }}>{c.text}</span>
              <span className="num" style={{ fontWeight: 700, color: "var(--ink-2)" }}>ICE {iceFor(c.id)}</span>
              {idx === 0 && <Pill color="var(--st-proof)" bg="color-mix(in srgb, var(--st-proof) 14%, transparent)">top</Pill>}
            </button>
          ); })}
        </div>
      );
      faction = <Button full size="lg" icon="Check" disabled={busy || !chosen} onClick={fFinish}>{busy ? "Guardando…" : "Confirmar elección"}</Button>;
    }
    return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 600 }}>{Header(fsub)}<Card pad={24}>{partsBar}{fbody}<div style={{ marginTop: 22 }}>{faction}</div></Card></div></Shell>;
  }

  // ════════ PRUEBA · "Diseño de la prueba" (proof_design) ════════
  if (session.retro === "proof_design") {
    const R = session.result;
    const betIf = (R.betIf as string) ?? "";
    const betThen = (R.betThen as string) ?? "";
    const signal = (R.signal as string) ?? "";
    const responsible = (R.responsible as string) ?? "";
    const deadline = (R.deadline as string) ?? "";
    const filters = (R.filters as { observable?: boolean; medible?: boolean; equipo?: boolean }) ?? {};
    const allFilters = !!(filters.observable && filters.medible && filters.equipo);
    const rootCause = (initiative?.data?.focus as { rootCause?: string } | undefined)?.rootCause ?? "";
    const field: React.CSSProperties = { width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none" };
    const confirmCount = inputs.filter((i) => i.key === "confirm").length;
    const iConfirmed = inputs.some((i) => i.userId === user.id && i.key === "confirm");
    const Bet = (
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
    const Filters = (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {([["observable", "¿Es observable? (se ve sin interpretar)"], ["medible", "¿Es medible en ~15 días?"], ["equipo", "¿Depende solo del equipo?"]] as const).map(([k, label]) => {
          const on = !!filters[k];
          return <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: on ? "var(--success-bg)" : "var(--card)", border: `1px solid ${on ? "var(--green)" : "var(--line)"}`, borderRadius: "var(--r-md)", fontSize: "var(--t-sm)" }}>
            <span style={{ color: on ? "var(--green)" : "var(--ink-3)" }}><Icon name={on ? "CircleCheck" : "Circle"} size={17} /></span>{label}
          </div>;
        })}
      </div>
    );

    if (!isFacil) {
      if (step === "confirm") {
        return (
          <Shell onExit={exit}>
            <div style={{ width: "100%", maxWidth: 520 }}>
              {Header("Leé la apuesta y confirmá tu compromiso.")}
              <Card pad={24}>{Bet}
                <div style={{ marginTop: 18 }}>
                  {iConfirmed
                    ? <div style={{ textAlign: "center", color: "var(--green)", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Icon name="CircleCheck" size={20} /> Confirmaste tu compromiso</div>
                    : <Button full size="lg" icon="Check" onClick={() => setMyInput(sessionId, "confirm", { ok: true })}>Entiendo la prueba y me comprometo</Button>}
                  <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-xs)", marginTop: 10 }}>{confirmCount} de {totalInRoom} confirmaron</p>
                </div>
              </Card>
            </div>
          </Shell>
        );
      }
      return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 520 }}>{Header(step === "close" ? "La apuesta quedó definida. ¡A probar!" : "El facilitador está diseñando la apuesta con el equipo.")}{Bet}{step === "validate" && <div style={{ marginTop: 14 }}>{Filters}</div>}</div></Shell>;
    }

    // facilitador
    const fSteps = ["context", "bet", "validate", "confirm", "close"];
    const fNext = async () => { const i = fSteps.indexOf(step); setBusy(true); await setStep(sessionId, fSteps[Math.min(fSteps.length - 1, i + 1)], i + 1); setBusy(false); };
    const fFinish = async () => { setBusy(true); await finalizeSession(session, { summaryText: `Apuesta: ${betThen || "—"}`, dataKey: "proof", dataValue: { betIf, betThen, signal, responsible, deadline, filters } }); setBusy(false); exit(); };
    const partsBar = <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}><div style={{ display: "flex" }}>{participants.slice(0, 8).map((p, i) => <span key={p.userId} style={{ marginLeft: i ? -8 : 0 }}><Avatar name={p.name} initials={p.initials} size={28} idx={i} /></span>)}</div><span className="muted num" style={{ fontSize: "var(--t-sm)" }}>{totalInRoom} en la sala</span></div>;
    let fbody: React.ReactNode = null, faction: React.ReactNode = null, fsub = "";
    if (step === "context") {
      fsub = "Diseñemos la prueba a partir de la causa raíz.";
      fbody = <Card pad={16} style={{ borderColor: "var(--st-focus)" }}><div className="eyebrow" style={{ color: "var(--st-focus)", marginBottom: 6 }}>Causa raíz</div><div style={{ fontWeight: 700 }}>{rootCause || "—"}</div></Card>;
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Construir la apuesta</Button>;
    } else if (step === "bet") {
      fsub = "Escribí la apuesta con el equipo (se ve en vivo en todas las pantallas).";
      fbody = (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Creemos que si… <span className="faint">(acción)</span></label><textarea defaultValue={betIf} onBlur={(e) => setResult(sessionId, { betIf: e.target.value })} rows={2} placeholder="cerramos cada reunión con decisiones por escrito" style={{ ...field, resize: "vertical", fontFamily: "inherit" }} /></div>
          <div><label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>…lograremos que <span className="faint">(resultado)</span></label><textarea defaultValue={betThen} onBlur={(e) => setResult(sessionId, { betThen: e.target.value })} rows={2} placeholder="el equipo avance sin volver a discutir lo mismo" style={{ ...field, resize: "vertical", fontFamily: "inherit" }} /></div>
          <div><label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Señal de avance</label><input defaultValue={signal} onBlur={(e) => setResult(sessionId, { signal: e.target.value })} placeholder="% de reuniones con decisiones registradas" style={field} /></div>
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 9 }}>Responsable</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(team?.members ?? []).map((m, i) => { const on = responsible === m.name; return <button key={i} onClick={() => setResult(sessionId, { responsible: m.name })} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 11px 6px 6px", borderRadius: "var(--r-full)", background: on ? "color-mix(in srgb, var(--st-proof) 16%, var(--card))" : "var(--card)", border: `1px solid ${on ? "var(--st-proof)" : "var(--line-2)"}`, fontSize: "var(--t-sm)", fontWeight: 600 }}><Avatar name={m.name} initials={m.initials} size={24} idx={i} />{m.name}</button>; })}
              {!(team?.members ?? []).length && <span className="muted" style={{ fontSize: "var(--t-sm)" }}>El equipo no tiene integrantes cargados.</span>}
            </div>
          </div>
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 9 }}>Plazo</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{["1 semana", "15 días", "30 días"].map((d) => { const on = deadline === d; return <button key={d} onClick={() => setResult(sessionId, { deadline: d })} style={{ padding: "9px 14px", borderRadius: "var(--r-full)", fontSize: "var(--t-sm)", fontWeight: 600, background: on ? "var(--st-proof)" : "var(--card-2)", color: on ? "#08120c" : "var(--ink-1)", border: "1px solid " + (on ? "var(--st-proof)" : "var(--line-2)") }}>{d}</button>; })}</div>
          </div>
        </div>
      );
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy || !betIf || !betThen} onClick={fNext}>Validar la apuesta</Button>;
    } else if (step === "validate") {
      fsub = "Los 3 filtros tienen que pasar para poder avanzar.";
      fbody = (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {Bet}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {([["observable", "¿Es observable? (se ve sin interpretar)"], ["medible", "¿Es medible en ~15 días?"], ["equipo", "¿Depende solo del equipo?"]] as const).map(([k, label]) => {
              const on = !!filters[k];
              return <button key={k} onClick={() => setResult(sessionId, { filters: { ...filters, [k]: !on } })} style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", background: on ? "var(--success-bg)" : "var(--card)", border: `1px solid ${on ? "var(--green)" : "var(--line-2)"}`, borderRadius: "var(--r-md)", fontSize: "var(--t-sm)" }}><span style={{ color: on ? "var(--green)" : "var(--ink-3)" }}><Icon name={on ? "CircleCheck" : "Circle"} size={18} /></span>{label}</button>;
            })}
          </div>
        </div>
      );
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy || !allFilters} onClick={fNext}>{allFilters ? "Pedir compromiso del equipo" : "Pasá los 3 filtros"}</Button>;
    } else if (step === "confirm") {
      fsub = "Cada miembro confirma su compromiso desde su pantalla.";
      fbody = <div style={{ textAlign: "center", padding: "10px 0" }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--green)" }}>{confirmCount}/{totalInRoom || team?.members.length || 0}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>confirmaron su compromiso</div></div>;
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Revisar y cerrar</Button>;
    } else {
      fsub = "Al cerrar, se guarda la ficha de prueba y la iniciativa pasa a Seguimiento.";
      fbody = <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{Bet}<div className="muted" style={{ fontSize: "var(--t-sm)" }}>{confirmCount} {confirmCount === 1 ? "compromiso" : "compromisos"} · 3 filtros validados</div></div>;
      faction = <Button full size="lg" icon="Check" disabled={busy} onClick={fFinish}>{busy ? "Guardando…" : "Cerrar y lanzar la prueba"}</Button>;
    }
    return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 600 }}>{Header(fsub)}<Card pad={24}>{partsBar}{fbody}<div style={{ marginTop: 22 }}>{faction}</div></Card></div></Shell>;
  }

  // ════════ PRUEBA · "¿Qué podría fallar?" (proof_premortem) ════════
  if (session.retro === "proof_premortem") {
    const riskCards = allCards.filter((c) => c.columnKey === "risk");
    const myRisks = myCards.filter((c) => c.columnKey === "risk");
    const riskCount = counts["risk"] ?? 0;
    const mitigation = (session.result.mitigation as string) ?? "";
    const ta: React.CSSProperties = { width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none", resize: "vertical", fontFamily: "inherit" };
    const RisksList = <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{riskCards.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--risk)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}</div>)}{!riskCards.length && <p className="muted" style={{ fontSize: "var(--t-sm)" }}>Sin riesgos cargados.</p>}</div>;
    const MitBox = mitigation ? <Card pad={14} style={{ borderColor: "var(--st-proof)" }}><div className="eyebrow" style={{ color: "var(--st-proof)", marginBottom: 4 }}>Mitigación</div><div style={{ fontSize: "var(--t-sm)", whiteSpace: "pre-wrap" }}>{mitigation}</div></Card> : null;

    if (!isFacil) {
      if (step === "risks") {
        const add = async () => { const t = (cardDraft.risk ?? "").trim(); if (!t) return; await addCard(sessionId, "risk", t, true); setCardDraft((d) => ({ ...d, risk: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
        return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("Imaginá que en 15 días la prueba fracasó. ¿Por qué? Una razón por tarjeta.")}<Card pad={24}><div style={{ display: "flex", gap: 8, marginBottom: 14 }}><input autoFocus value={cardDraft.risk ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, risk: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="La prueba fracasó porque…" style={{ flex: 1, minWidth: 0, ...ta, resize: "none" }} /><Button icon="Plus" onClick={add}>Sumar</Button></div><div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{myRisks.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--risk)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 6 }}>· tuya</span></div>)}{!myRisks.length && <div style={{ color: "var(--ink-3)", fontSize: "var(--t-sm)", textAlign: "center", padding: 16 }}>Sumá el primer riesgo…</div>}</div><p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 14, textAlign: "center" }}>{riskCount} riesgos entre todos</p></Card></div></Shell>;
      }
      if (step === "risks_reveal") return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("Los riesgos, a la vista.")}{RisksList}</div></Shell>;
      if (step === "mitigate") return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("El facilitador define cómo mitigar los riesgos.")}{RisksList}{MitBox && <div style={{ marginTop: 12 }}>{MitBox}</div>}</div></Shell>;
      return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("Prueba más robusta. ¡A diseñarla!")}{MitBox}</div></Shell>;
    }
    const fSteps = ["risks", "risks_reveal", "mitigate", "close"];
    const fNext = async () => { const i = fSteps.indexOf(step); setBusy(true); await setStep(sessionId, fSteps[Math.min(fSteps.length - 1, i + 1)], i + 1); setBusy(false); };
    const fFinish = async () => { setBusy(true); await finalizeSession(session, { summaryText: `${riskCount} riesgos mitigados`, dataKey: "proof", dataValue: { risks: riskCards.map((c) => c.text), mitigation }, noAdvance: true }); setBusy(false); exit(); };
    const partsBar = <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}><div style={{ display: "flex" }}>{participants.slice(0, 8).map((p, i) => <span key={p.userId} style={{ marginLeft: i ? -8 : 0 }}><Avatar name={p.name} initials={p.initials} size={28} idx={i} /></span>)}</div><span className="muted num" style={{ fontSize: "var(--t-sm)" }}>{totalInRoom} en la sala</span></div>;
    let fbody: React.ReactNode = null, faction: React.ReactNode = null, fsub = "";
    if (step === "risks") { fsub = "Pre-mortem: los miembros escriben por qué fracasaría."; fbody = <div style={{ textAlign: "center", padding: "10px 0" }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--risk)" }}>{riskCount}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>riesgos imaginados</div></div>; faction = <Button full size="lg" icon="Eye" disabled={busy || riskCount === 0} onClick={fNext}>Revelar riesgos ({riskCount})</Button>; }
    else if (step === "risks_reveal") { fsub = "Los riesgos del equipo."; fbody = RisksList; faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Diseñar mitigaciones</Button>; }
    else if (step === "mitigate") { fsub = "¿Qué hacemos antes de arrancar para reducir estos riesgos?"; fbody = <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{RisksList}<textarea defaultValue={mitigation} onBlur={(e) => setResult(sessionId, { mitigation: e.target.value })} rows={3} placeholder="Acciones concretas de mitigación (con responsables)…" style={ta} /></div>; faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Revisar y cerrar</Button>; }
    else { fsub = "La prueba queda más robusta. (No cambia de etapa.)"; fbody = <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{RisksList}{MitBox}</div>; faction = <Button full size="lg" icon="Check" disabled={busy} onClick={fFinish}>{busy ? "Guardando…" : "Cerrar y guardar"}</Button>; }
    return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 600 }}>{Header(fsub)}<Card pad={24}>{partsBar}{fbody}<div style={{ marginTop: 22 }}>{faction}</div></Card></div></Shell>;
  }

  // ════════ SEGUIMIENTO · "¿Qué nos está frenando?" (follow_blockers) ════════
  if (session.retro === "follow_blockers") {
    const blockerCards = allCards.filter((c) => c.columnKey === "blocker");
    const myBlockers = myCards.filter((c) => c.columnKey === "blocker");
    const blockerCount = counts["blocker"] ?? 0;
    const plan = (session.result.plan as string) ?? "";
    const ta: React.CSSProperties = { width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none", resize: "vertical", fontFamily: "inherit" };
    const BlockersList = <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{blockerCards.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--warning)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}</div>)}{!blockerCards.length && <p className="muted" style={{ fontSize: "var(--t-sm)" }}>Sin obstáculos cargados.</p>}</div>;
    const PlanBox = plan ? <Card pad={14} style={{ borderColor: "var(--st-follow)" }}><div className="eyebrow" style={{ color: "var(--st-follow)", marginBottom: 4 }}>Plan de destrabe</div><div style={{ fontSize: "var(--t-sm)", whiteSpace: "pre-wrap" }}>{plan}</div></Card> : null;

    if (!isFacil) {
      if (step === "blockers") {
        const add = async () => { const t = (cardDraft.blocker ?? "").trim(); if (!t) return; await addCard(sessionId, "blocker", t, true); setCardDraft((d) => ({ ...d, blocker: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
        return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("¿Qué nos está frenando para avanzar con la prueba?")}<Card pad={24}><div style={{ display: "flex", gap: 8, marginBottom: 14 }}><input autoFocus value={cardDraft.blocker ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, blocker: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Lo que más nos frena es…" style={{ flex: 1, minWidth: 0, ...ta, resize: "none" }} /><Button icon="Plus" onClick={add}>Sumar</Button></div><div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{myBlockers.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--warning)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 6 }}>· tuya</span></div>)}{!myBlockers.length && <div style={{ color: "var(--ink-3)", fontSize: "var(--t-sm)", textAlign: "center", padding: 16 }}>Sumá el primer obstáculo…</div>}</div><p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 14, textAlign: "center" }}>{blockerCount} obstáculos entre todos</p></Card></div></Shell>;
      }
      if (step === "blockers_reveal") return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("Los obstáculos, a la vista.")}{BlockersList}</div></Shell>;
      if (step === "plan") return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("El facilitador define el plan de destrabe.")}{BlockersList}{PlanBox && <div style={{ marginTop: 12 }}>{PlanBox}</div>}</div></Shell>;
      return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("Plan de destrabe definido.")}{PlanBox}</div></Shell>;
    }
    const fSteps = ["blockers", "blockers_reveal", "plan", "close"];
    const fNext = async () => { const i = fSteps.indexOf(step); setBusy(true); await setStep(sessionId, fSteps[Math.min(fSteps.length - 1, i + 1)], i + 1); setBusy(false); };
    const fFinish = async () => { setBusy(true); await finalizeSession(session, { summaryText: `${blockerCount} obstáculos · plan definido`, dataKey: "follow", dataValue: { blockers: blockerCards.map((c) => c.text), plan }, noAdvance: true }); setBusy(false); exit(); };
    const partsBar = <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}><div style={{ display: "flex" }}>{participants.slice(0, 8).map((p, i) => <span key={p.userId} style={{ marginLeft: i ? -8 : 0 }}><Avatar name={p.name} initials={p.initials} size={28} idx={i} /></span>)}</div><span className="muted num" style={{ fontSize: "var(--t-sm)" }}>{totalInRoom} en la sala</span></div>;
    let fbody: React.ReactNode = null, faction: React.ReactNode = null, fsub = "";
    if (step === "blockers") { fsub = "Los miembros escriben qué los frena."; fbody = <div style={{ textAlign: "center", padding: "10px 0" }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--warning)" }}>{blockerCount}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>obstáculos</div></div>; faction = <Button full size="lg" icon="Eye" disabled={busy || blockerCount === 0} onClick={fNext}>Revelar ({blockerCount})</Button>; }
    else if (step === "blockers_reveal") { fsub = "Los obstáculos del equipo."; fbody = BlockersList; faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Diseñar el destrabe</Button>; }
    else if (step === "plan") { fsub = "¿Qué hacemos en las próximas 48hs? ¿Quién?"; fbody = <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{BlockersList}<textarea defaultValue={plan} onBlur={(e) => setResult(sessionId, { plan: e.target.value })} rows={3} placeholder="Acciones de destrabe con responsables y plazo…" style={ta} /></div>; faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Revisar y cerrar</Button>; }
    else { fsub = "Acciones de destrabe registradas. (Sigue en Seguimiento.)"; fbody = <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{BlockersList}{PlanBox}</div>; faction = <Button full size="lg" icon="Check" disabled={busy} onClick={fFinish}>{busy ? "Guardando…" : "Cerrar y guardar"}</Button>; }
    return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 600 }}>{Header(fsub)}<Card pad={24}>{partsBar}{fbody}<div style={{ marginTop: 22 }}>{faction}</div></Card></div></Shell>;
  }

  // ════════ EMBUDO · "¿Cómo fluye?" (explore_flow) / "¿Dónde se traba?" (focus_where) ════════
  if (session.retro === "explore_flow" || session.retro === "focus_where") {
    const isFlow = session.retro === "explore_flow";
    const FUNNEL: { key: string; label: string; sub: string }[] = isFlow
      ? [
          { key: "in", label: "Entrada", sub: "¿Cómo nos llega el trabajo?" },
          { key: "start", label: "Arranque", sub: "¿Cómo decidimos qué hacer primero?" },
          { key: "exec", label: "Ejecución", sub: "¿Dónde se traba habitualmente?" },
          { key: "deliver", label: "Entrega", sub: "¿Cómo sabemos que terminamos bien?" },
        ]
      : [
          { key: "in", label: "Entrada", sub: "¿Cómo llega una tarea?" },
          { key: "def", label: "Definición", sub: "¿Cómo se aclara qué hacer?" },
          { key: "exec", label: "Ejecución", sub: "¿Dónde aparece la traba?" },
          { key: "val", label: "Cierre", sub: "¿Cómo validamos antes de entregar?" },
        ];
    const votesByStage: Record<string, number> = {};
    inputs.filter((i) => i.key === "critical").forEach((i) => { const s = (i.value as { stage?: string }).stage; if (s) votesByStage[s] = (votesByStage[s] ?? 0) + 1; });
    const rankedStages = [...FUNNEL].sort((a, b) => (votesByStage[b.key] ?? 0) - (votesByStage[a.key] ?? 0));
    const criticalKey = (session.result.critical as string) ?? rankedStages[0]?.key ?? "";
    const criticalMeta = FUNNEL.find((f) => f.key === criticalKey);
    const myCrit = (inputs.find((i) => i.userId === user.id && i.key === "critical")?.value as { stage?: string } | undefined)?.stage;
    const totalFunnelCards = FUNNEL.reduce((a, f) => a + (counts[f.key] ?? 0), 0);
    const critSubmitters = new Set(inputs.filter((i) => i.key === "critical").map((i) => i.userId)).size;
    const maxStageVotes = Math.max(1, ...FUNNEL.map((f) => votesByStage[f.key] ?? 0));

    if (!isFacil) {
      if (step === "funnel") {
        const add = async (k: string) => { const t = (cardDraft[k] ?? "").trim(); if (!t) return; await addCard(sessionId, k, t, true); setCardDraft((d) => ({ ...d, [k]: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
        return (
          <Shell onExit={exit}>
            <div style={{ width: "100%", maxWidth: 920 }}>
              {Header(isFlow ? "¿Qué pasa en cada etapa de nuestro trabajo? Una percepción por tarjeta." : `Mapeemos el flujo de "${subject}". ¿Qué pasa en cada etapa?`)}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                {FUNNEL.map((f) => { const mine = myCards.filter((c) => c.columnKey === f.key); return (
                  <div key={f.key} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 12, display: "flex", flexDirection: "column", minHeight: 200 }}>
                    <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{f.label} <span className="num" style={{ color: "var(--ink-3)", fontSize: "var(--t-xs)" }}>{counts[f.key] ?? 0}</span></div>
                    <div className="muted" style={{ fontSize: 10, marginBottom: 8 }}>{f.sub}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>{mine.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-explore)", borderRadius: "var(--r-sm)", padding: "7px 9px", fontSize: "var(--t-xs)" }}>{c.text}</div>)}</div>
                    <div style={{ marginTop: 8, display: "flex", gap: 5 }}>
                      <input value={cardDraft[f.key] ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, [f.key]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add(f.key)} placeholder="Sumar…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "6px 8px", fontSize: "var(--t-xs)", outline: "none" }} />
                      <button onClick={() => add(f.key)} style={{ background: "var(--st-explore)", color: "#08120c", borderRadius: "var(--r-sm)", padding: "0 9px", display: "grid", placeItems: "center" }}><Icon name="Plus" size={14} /></button>
                    </div>
                  </div>
                ); })}
              </div>
            </div>
          </Shell>
        );
      }
      if (step === "funnel_reveal") return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 920 }}>{Header("El flujo, a la vista.")}<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 12 }}>{FUNNEL.map((f) => <div key={f.key} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 12 }}><div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 8 }}>{f.label}</div><div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{allCards.filter((c) => c.columnKey === f.key).map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-sm)", padding: "7px 9px", fontSize: "var(--t-xs)" }}>{c.text}</div>)}</div></div>)}</div></div></Shell>;
      if (step === "funnel_vote") {
        return (
          <Shell onExit={exit}>
            <div style={{ width: "100%", maxWidth: 520 }}>
              {Header("¿En qué etapa se pierde más? Elegí una.")}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {FUNNEL.map((f) => { const on = myCrit === f.key; return (
                  <button key={f.key} onClick={() => setMyInput(sessionId, "critical", { stage: f.key })} style={{ textAlign: "left", padding: "13px 14px", borderRadius: "var(--r-md)", background: on ? "color-mix(in srgb, var(--st-explore) 14%, var(--card))" : "var(--card)", border: `1px solid ${on ? "var(--st-explore)" : "var(--line)"}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ color: on ? "var(--st-explore)" : "var(--ink-3)" }}><Icon name={on ? "CircleCheck" : "Circle"} size={17} /></span><b style={{ fontSize: "var(--t-sm)" }}>{f.label}</b></div>
                    <div className="muted" style={{ fontSize: "var(--t-xs)", marginLeft: 27 }}>{f.sub}</div>
                  </button>
                ); })}
              </div>
            </div>
          </Shell>
        );
      }
      return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 520 }}>{Header("Etapa crítica identificada.")}<Card pad={20} style={{ textAlign: "center", borderColor: "var(--st-explore)" }}><div className="eyebrow" style={{ color: "var(--st-explore)", marginBottom: 6 }}>Donde más se pierde</div><div style={{ fontSize: "var(--t-lg)", fontWeight: 800 }}>{criticalMeta?.label ?? "—"}</div><div className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 4 }}>{criticalMeta?.sub}</div></Card></div></Shell>;
    }

    // facilitador
    const fSteps = ["funnel", "funnel_reveal", "funnel_vote", "close"];
    const fNext = async () => { const i = fSteps.indexOf(step); setBusy(true); await setStep(sessionId, fSteps[Math.min(fSteps.length - 1, i + 1)], i + 1); setBusy(false); };
    const fFinish = async () => {
      setBusy(true);
      const label = criticalMeta?.label ?? "—";
      if (isFlow) await finalizeSession(session, { summaryText: `Etapa crítica: ${label}`, dataKey: "explore", dataValue: { priority: label, criticalStage: label } });
      else await finalizeSession(session, { summaryText: `Traba en: ${label}`, dataKey: "focus", dataValue: { where: label, priority: label }, noAdvance: true });
      setBusy(false); exit();
    };
    const partsBar = <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}><div style={{ display: "flex" }}>{participants.slice(0, 8).map((p, i) => <span key={p.userId} style={{ marginLeft: i ? -8 : 0 }}><Avatar name={p.name} initials={p.initials} size={28} idx={i} /></span>)}</div><span className="muted num" style={{ fontSize: "var(--t-sm)" }}>{totalInRoom} en la sala</span></div>;
    let fbody: React.ReactNode = null, faction: React.ReactNode = null, fsub = "", wide = false;
    if (step === "funnel") {
      fsub = "Los miembros cargan percepciones por etapa del flujo.";
      fbody = <div style={{ display: "flex", gap: 10 }}>{FUNNEL.map((f) => <div key={f.key} style={{ flex: 1, textAlign: "center", padding: "14px 6px", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}><div className="num" style={{ fontSize: "var(--t-xl)", fontWeight: 800 }}>{counts[f.key] ?? 0}</div><div className="muted" style={{ fontSize: 10 }}>{f.label}</div></div>)}</div>;
      faction = <Button full size="lg" icon="Eye" disabled={busy || totalFunnelCards === 0} onClick={fNext}>Revelar ({totalFunnelCards})</Button>;
    } else if (step === "funnel_reveal") {
      wide = true; fsub = "El flujo completo. Después votan la etapa crítica.";
      fbody = <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 12 }}>{FUNNEL.map((f) => <div key={f.key} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 12 }}><div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 8 }}>{f.label}</div><div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{allCards.filter((c) => c.columnKey === f.key).map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-sm)", padding: "7px 9px", fontSize: "var(--t-xs)" }}>{c.text}</div>)}</div></div>)}</div>;
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Votar etapa crítica</Button>;
    } else if (step === "funnel_vote") {
      fsub = "¿En qué etapa se pierde más? (votación en vivo)";
      fbody = <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{rankedStages.map((f, i) => <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 12 }}><span className="num" style={{ width: 20, fontWeight: 700, color: i === 0 ? "var(--st-explore)" : "var(--ink-3)" }}>{i + 1}</span><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: "var(--t-sm)", marginBottom: 5 }}>{f.label}</div><Bar value={((votesByStage[f.key] ?? 0) / maxStageVotes) * 100} color={i === 0 ? "var(--st-explore)" : "var(--violet)"} height={7} /></div><span className="num" style={{ fontWeight: 700, width: 22, textAlign: "right" }}>{votesByStage[f.key] ?? 0}</span></div>)}<div className="muted" style={{ fontSize: "var(--t-sm)", textAlign: "center" }}>{critSubmitters} de {totalInRoom} votaron</div></div>;
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Cerrar</Button>;
    } else {
      fsub = isFlow ? "Etapa crítica del flujo. Al cerrar, queda como foco a trabajar." : "La traba está en esta etapa. Después: ¿Por qué está pasando?";
      fbody = <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{rankedStages.map((f, i) => { const on = f.key === criticalKey; return <button key={f.key} onClick={() => setResult(sessionId, { critical: f.key })} style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", background: on ? "color-mix(in srgb, var(--st-explore) 14%, var(--card))" : "var(--card)", border: `1px solid ${on ? "var(--st-explore)" : "var(--line)"}`, borderRadius: "var(--r-md)", fontSize: "var(--t-sm)" }}><span style={{ color: on ? "var(--st-explore)" : "var(--ink-3)" }}><Icon name={on ? "CircleCheck" : "Circle"} size={17} /></span><span style={{ flex: 1 }}>{f.label} <span className="muted" style={{ fontSize: "var(--t-xs)" }}>· {f.sub}</span></span><span className="num muted" style={{ fontSize: "var(--t-xs)" }}>{votesByStage[f.key] ?? 0}</span>{i === 0 && <Pill color="var(--st-explore)" bg="color-mix(in srgb, var(--st-explore) 14%, transparent)">top</Pill>}</button>; })}</div>;
      faction = <Button full size="lg" icon="Check" disabled={busy || !criticalKey} onClick={fFinish}>{busy ? "Guardando…" : "Confirmar etapa crítica"}</Button>;
    }
    return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: wide ? 920 : 600 }}>{Header(fsub)}<Card pad={24}>{partsBar}{fbody}<div style={{ marginTop: 22 }}>{faction}</div></Card></div></Shell>;
  }

  // ════════ FOCO · "Impacto y frecuencia" (focus_impact) ════════
  if (session.retro === "focus_impact") {
    const probCards = allCards.filter((c) => c.columnKey === "problem");
    const myProbs = myCards.filter((c) => c.columnKey === "problem");
    const probCount = counts["problem"] ?? 0;
    const evalRows = (id: string) => inputs.filter((i) => i.key === `eval:${id}`).map((i) => i.value as { f?: number; g?: number });
    const avgF = (id: string) => { const r = evalRows(id); return r.length ? r.reduce((a, x) => a + Number(x.f || 0), 0) / r.length : 0; };
    const avgG = (id: string) => { const r = evalRows(id); return r.length ? r.reduce((a, x) => a + Number(x.g || 0), 0) / r.length : 0; };
    const score = (id: string) => Math.round(avgF(id) * avgG(id) * 10) / 10;
    const ranked = [...probCards].sort((a, b) => score(b.id) - score(a.id));
    const chosen = (session.result.chosen as string) ?? (ranked[0]?.text ?? "");
    const myEval = (id: string) => (inputs.find((i) => i.userId === user.id && i.key === `eval:${id}`)?.value as { f?: number; g?: number }) ?? {};
    const evalSubmitters = new Set(inputs.filter((i) => i.key.startsWith("eval:")).map((i) => i.userId)).size;
    const Matrix = (
      <div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center" }}><span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: "var(--t-xs)", color: "var(--ink-3)", fontWeight: 600 }}>Gravedad →</span></div>
          <div style={{ position: "relative", flex: 1, aspectRatio: "1", maxWidth: 280, border: "1px solid var(--line)", borderRadius: "var(--r-md)", background: "var(--card)", margin: "0 auto" }}>
            <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--line)" }} />
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "var(--line)" }} />
            <span style={{ position: "absolute", top: 6, right: 8, fontSize: 10, color: "var(--st-focus)", fontWeight: 700 }}>prioridad</span>
            {probCards.map((c, idx) => { const f = avgF(c.id), g = avgG(c.id); if (!f && !g) return null; return (
              <span key={c.id} title={c.text} style={{ position: "absolute", left: `${((f - 1) / 2) * 100}%`, bottom: `${((g - 1) / 2) * 100}%`, transform: "translate(-50%, 50%)", width: 24, height: 24, borderRadius: 99, background: idx === 0 ? "var(--st-focus)" : "var(--violet)", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800, border: "2px solid var(--bg-1)" }}>{ranked.indexOf(c) + 1}</span>
            ); })}
          </div>
        </div>
        <div style={{ textAlign: "center", fontSize: "var(--t-xs)", color: "var(--ink-3)", fontWeight: 600, marginTop: 4 }}>Frecuencia →</div>
      </div>
    );
    const RankedList = (
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {ranked.map((c, idx) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--t-sm)" }}>
            <span style={{ width: 22, height: 22, borderRadius: 99, background: idx === 0 ? "var(--st-focus)" : "var(--card-2)", color: idx === 0 ? "#fff" : "var(--ink-2)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800, flex: "none" }}>{idx + 1}</span>
            <span style={{ flex: 1, minWidth: 0 }}>{c.text}</span>
            <span className="num muted" style={{ fontSize: "var(--t-xs)" }}>score {score(c.id)}</span>
          </div>
        ))}
      </div>
    );

    if (!isFacil) {
      if (step === "problems") {
        const add = async () => { const t = (cardDraft.problem ?? "").trim(); if (!t) return; await addCard(sessionId, "problem", t, true); setCardDraft((d) => ({ ...d, problem: "" })); if (user) setMyCards(await getMyCards(sessionId, user.id)); };
        return (
          <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header(`¿Qué trabas ves en "${subject}"? Una por tarjeta.`)}
            <Card pad={24}>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}><input autoFocus value={cardDraft.problem ?? ""} onChange={(e) => setCardDraft((d) => ({ ...d, problem: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Una traba…" style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none" }} /><Button icon="Plus" onClick={add}>Sumar</Button></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{myProbs.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-focus)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}<span className="faint" style={{ fontSize: 10, marginLeft: 6 }}>· tuya</span></div>)}{!myProbs.length && <div style={{ color: "var(--ink-3)", fontSize: "var(--t-sm)", textAlign: "center", padding: 16 }}>Sumá la primera traba…</div>}</div>
            </Card></div></Shell>
        );
      }
      if (step === "problems_reveal") return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("Las trabas, a la vista. Ahora las evaluamos.")}<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{probCards.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}</div>)}</div></div></Shell>;
      if (step === "rate") {
        const FREQ: [string, number][] = [["Rara vez", 1], ["A veces", 2], ["Siempre", 3]];
        const GRAV: [string, number][] = [["Poco", 1], ["Bastante", 2], ["Mucho", 3]];
        return (
          <Shell onExit={exit}>
            <div style={{ width: "100%", maxWidth: 600 }}>
              {Header("Para cada traba: ¿qué tan seguido pasa y qué tan grave es?")}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {probCards.map((c) => { const ev = myEval(c.id); return (
                  <Card key={c.id} pad={16}>
                    <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 10 }}>{c.text}</div>
                    <div style={{ marginBottom: 8 }}><div className="muted" style={{ fontSize: "var(--t-xs)", marginBottom: 5 }}>Frecuencia</div><div style={{ display: "flex", gap: 6 }}>{FREQ.map(([l, v]) => <button key={v} onClick={() => setMyInput(sessionId, `eval:${c.id}`, { ...ev, f: v })} style={{ padding: "6px 11px", borderRadius: "var(--r-full)", fontSize: "var(--t-xs)", fontWeight: 600, background: ev.f === v ? "var(--st-focus)" : "var(--card-2)", color: ev.f === v ? "#fff" : "var(--ink-1)", border: `1px solid ${ev.f === v ? "var(--st-focus)" : "var(--line-2)"}` }}>{l}</button>)}</div></div>
                    <div><div className="muted" style={{ fontSize: "var(--t-xs)", marginBottom: 5 }}>Gravedad</div><div style={{ display: "flex", gap: 6 }}>{GRAV.map(([l, v]) => <button key={v} onClick={() => setMyInput(sessionId, `eval:${c.id}`, { ...ev, g: v })} style={{ padding: "6px 11px", borderRadius: "var(--r-full)", fontSize: "var(--t-xs)", fontWeight: 600, background: ev.g === v ? "var(--st-focus)" : "var(--card-2)", color: ev.g === v ? "#fff" : "var(--ink-1)", border: `1px solid ${ev.g === v ? "var(--st-focus)" : "var(--line-2)"}` }}>{l}</button>)}</div></div>
                  </Card>
                ); })}
              </div>
              <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)", marginTop: 14 }}>Listo cuando puntúes todas. El facilitador cierra la priorización.</p>
            </div>
          </Shell>
        );
      }
      return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("Prioridad del equipo.")}{chosen && <Card pad={16} style={{ marginBottom: 14, borderColor: "var(--st-focus)" }}><div className="eyebrow" style={{ color: "var(--st-focus)", marginBottom: 4 }}>A trabajar primero</div><div style={{ fontWeight: 700 }}>{chosen}</div></Card>}<Card pad={18}>{Matrix}<div style={{ marginTop: 16 }}>{RankedList}</div></Card></div></Shell>;
    }

    // facilitador
    const fSteps = ["problems", "problems_reveal", "rate", "close"];
    const fNext = async () => { const i = fSteps.indexOf(step); setBusy(true); await setStep(sessionId, fSteps[Math.min(fSteps.length - 1, i + 1)], i + 1); setBusy(false); };
    const fFinish = async () => { setBusy(true); await finalizeSession(session, { summaryText: `Prioridad: ${chosen}`, dataKey: "focus", dataValue: { priority: chosen }, noAdvance: true }); setBusy(false); exit(); };
    const partsBar = <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}><div style={{ display: "flex" }}>{participants.slice(0, 8).map((p, i) => <span key={p.userId} style={{ marginLeft: i ? -8 : 0 }}><Avatar name={p.name} initials={p.initials} size={28} idx={i} /></span>)}</div><span className="muted num" style={{ fontSize: "var(--t-sm)" }}>{totalInRoom} en la sala</span></div>;
    let fbody: React.ReactNode = null, faction: React.ReactNode = null, fsub = "";
    if (step === "problems") {
      fsub = `Junten las trabas de "${subject}" (los miembros las cargan).`;
      fbody = <div style={{ textAlign: "center", padding: "10px 0" }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--st-focus)" }}>{probCount}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>trabas</div></div>;
      faction = <Button full size="lg" icon="Eye" disabled={busy || probCount === 0} onClick={fNext}>Revelar trabas ({probCount})</Button>;
    } else if (step === "problems_reveal") {
      fsub = "Repasen las trabas antes de evaluarlas.";
      fbody = <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{probCards.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}</div>)}</div>;
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Evaluar impacto y frecuencia</Button>;
    } else if (step === "rate") {
      fsub = "Cada miembro evalúa frecuencia y gravedad. La matriz se arma en vivo.";
      fbody = <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{Matrix}{RankedList}<div className="muted" style={{ fontSize: "var(--t-sm)", textAlign: "center" }}>{evalSubmitters} de {totalInRoom} evaluaron</div></div>;
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Cerrar la priorización</Button>;
    } else {
      fsub = "La traba prioritaria (tocá para elegir otra). Después: ¿Por qué está pasando?";
      fbody = (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {Matrix}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ranked.map((c, idx) => { const on = c.text === chosen; return (
              <button key={c.id} onClick={() => setResult(sessionId, { chosen: c.text })} style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: on ? "color-mix(in srgb, var(--st-focus) 14%, var(--card))" : "var(--card)", border: `1px solid ${on ? "var(--st-focus)" : "var(--line)"}`, borderRadius: "var(--r-md)", fontSize: "var(--t-sm)" }}>
                <span style={{ color: on ? "var(--st-focus)" : "var(--ink-3)" }}><Icon name={on ? "CircleCheck" : "Circle"} size={17} /></span>
                <span style={{ flex: 1 }}>{c.text}</span>
                <span className="num muted" style={{ fontSize: "var(--t-xs)" }}>{score(c.id)}</span>
                {idx === 0 && <Pill color="var(--st-focus)" bg="color-mix(in srgb, var(--st-focus) 14%, transparent)">top</Pill>}
              </button>
            ); })}
          </div>
        </div>
      );
      faction = <Button full size="lg" icon="Check" disabled={busy || !chosen} onClick={fFinish}>{busy ? "Guardando…" : "Confirmar prioridad"}</Button>;
    }
    return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 600 }}>{Header(fsub)}<Card pad={24}>{partsBar}{fbody}<div style={{ marginTop: 22 }}>{faction}</div></Card></div></Shell>;
  }

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
      if (step === "bet") {
        return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("El facilitador está diseñando la apuesta con el equipo.")}{BetCard}</div></Shell>;
      }
      return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("La apuesta quedó definida. ¡A probar!")}{BetCard}</div></Shell>;
    }

    // FACILITADOR (prueba)
    const fSteps = ["ideas", "ideas_reveal", "bet", "close"];
    const fNext = async () => { const i = fSteps.indexOf(step); setBusy(true); await setStep(sessionId, fSteps[Math.min(fSteps.length - 1, i + 1)], i + 1); setBusy(false); };
    const fFinish = async () => {
      setBusy(true);
      await finalizeSession(session, { cardCount: ideaCards.length, summaryText: `Apuesta: ${betThen || "—"}`, dataKey: "proof", dataValue: { idea: chosen, betIf, betThen, signal, responsible, deadline } });
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
      fsub = "Elegí la idea más simple y de más impacto para apostar.";
      fbody = (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ideaCards.map((c) => { const on = c.text === chosen; return (
            <button key={c.id} onClick={() => setResult(sessionId, { idea: c.text })} style={{ textAlign: "left", background: on ? "color-mix(in srgb, var(--st-proof) 14%, var(--card))" : "var(--card)", border: `1px solid ${on ? "var(--st-proof)" : "var(--line)"}`, borderRadius: "var(--r-md)", padding: "11px 13px", fontSize: "var(--t-sm)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: on ? "var(--st-proof)" : "var(--ink-3)" }}><Icon name={on ? "CircleCheck" : "Circle"} size={17} /></span>{c.text}
            </button>
          ); })}
          {!ideaCards.length && <p className="muted" style={{ fontSize: "var(--t-sm)" }}>No se cargaron ideas.</p>}
        </div>
      );
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy || !chosen} onClick={fNext}>Diseñar la apuesta</Button>;
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
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Revisar y cerrar</Button>;
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
      if (step === "progress") return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 560 }}>{Header("¿Cómo viene la prueba? El facilitador reporta el avance.")}<Card pad={24}>{Gauge}</Card></div></Shell>;
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

    const fSteps = ["progress", "blockers", "blockers_reveal", "close"];
    const fNext = async () => { const i = fSteps.indexOf(step); setBusy(true); await setStep(sessionId, fSteps[Math.min(fSteps.length - 1, i + 1)], i + 1); setBusy(false); };
    const fFinish = async () => { setBusy(true); await finalizeSession(session, { cardCount: blockerCount, summaryText: `Avance: ${current}%`, dataKey: "follow", dataValue: { current, signal: signalName, blockers: blockerCards.map((c) => c.text) }, noAdvance: true }); setBusy(false); exit(); };
    const partsBar = <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}><div style={{ display: "flex" }}>{participants.slice(0, 8).map((p, i) => <span key={p.userId} style={{ marginLeft: i ? -8 : 0 }}><Avatar name={p.name} initials={p.initials} size={28} idx={i} /></span>)}</div><span className="muted num" style={{ fontSize: "var(--t-sm)" }}>{totalInRoom} en la sala</span></div>;
    let fbody: React.ReactNode = null, faction: React.ReactNode = null, fsub = "";
    if (step === "progress") {
      fsub = "Reportá el avance de la prueba (con el equipo).";
      fbody = <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{Gauge}<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{PROG.map((p) => { const on = current === p.v; return <button key={p.v} onClick={() => setResult(sessionId, { current: p.v })} style={{ padding: "9px 14px", borderRadius: "var(--r-full)", fontSize: "var(--t-sm)", fontWeight: 600, background: on ? "var(--st-follow)" : "var(--card-2)", color: on ? "#08120c" : "var(--ink-1)", border: "1px solid " + (on ? "var(--st-follow)" : "var(--line-2)") }}>{p.l}</button>; })}</div></div>;
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Siguiente: trabas</Button>;
    } else if (step === "blockers") {
      fsub = "Los miembros escriben las trabas a ciegas.";
      fbody = <div style={{ textAlign: "center", padding: "10px 0" }}><div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: "var(--warning)" }}>{blockerCount}</div><div className="muted" style={{ fontSize: "var(--t-sm)" }}>trabas señaladas</div></div>;
      faction = <Button full size="lg" icon="Eye" disabled={busy} onClick={fNext}>Revelar trabas ({blockerCount})</Button>;
    } else if (step === "blockers_reveal") {
      fsub = "Las trabas del equipo.";
      fbody = <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{blockerCards.map((c) => <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid var(--warning)", borderRadius: "var(--r-md)", padding: "10px 12px", fontSize: "var(--t-sm)" }}>{c.text}</div>)}{!blockerCards.length && <p className="muted" style={{ fontSize: "var(--t-sm)" }}>Sin trabas. 🙌</p>}</div>;
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy} onClick={fNext}>Revisar y cerrar</Button>;
    } else {
      fsub = "Check-in registrado. La prueba sigue en curso (no cambia de etapa).";
      fbody = <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{Gauge}<div className="muted" style={{ fontSize: "var(--t-sm)" }}>{blockerCount} {blockerCount === 1 ? "traba" : "trabas"} registradas</div></div>;
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

    const fSteps = ["result", "learnings", "learnings_reveal", "decision", "close"];
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
      faction = <Button full size="lg" iconRight="ArrowRight" disabled={busy || !resultKey} onClick={fNext}>Siguiente: aprendizajes</Button>;
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
