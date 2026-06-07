"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Logo } from "@/components/AppShell";
import { Avatar, Bar, Button, Card, Pill } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { getTeam } from "@/lib/repository";
import { PULSE_DIMS } from "@/lib/data";
import {
  addCard, averagePulse, finalizeSession, getCardCounts, getCards, getMyCards,
  getParticipants, getPulseResponses, getSession, hasResponded, joinSession, setStep,
  submitPulse, subscribeSession,
  type LiveSession, type Participant, type PulseResponse, type SessionCard,
} from "@/lib/session";

const COLS = [
  { key: "works", label: "Lo que funciona", color: "var(--success)", icon: "ThumbsUp" },
  { key: "blocks", label: "Lo que nos traba", color: "var(--warning)", icon: "Construction" },
  { key: "unsaid", label: "Lo que nadie dice", color: "var(--violet)", icon: "EyeOff" },
] as const;

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
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<PulseResponse>({ confianza: 60, comunic: 60, claridad: 60, foco: 60, seguridad: 60 });
  const [cardDraft, setCardDraft] = useState<Record<string, string>>({ works: "", blocks: "", unsaid: "" });
  const [anon, setAnon] = useState(true);
  const joinedRef = useRef(false);
  const sessionId = params.sessionId;

  const load = async () => {
    const s = await getSession(sessionId);
    setSession(s);
    if (s) {
      const [r, p, c] = await Promise.all([getPulseResponses(sessionId), getParticipants(sessionId), getCardCounts(sessionId)]);
      setResponses(r); setParticipants(p); setCounts(c);
      if (user) {
        setSubmitted(await hasResponded(sessionId, user.id));
        setMyCards(await getMyCards(sessionId, user.id));
      }
      setAllCards(s.stepKey === "cards_reveal" ? await getCards(sessionId) : []);
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
  const isFacil = user.role !== "member";
  const step = session.stepKey ?? "pulse";
  const closed = session.status === "closed";
  const avg = averagePulse(responses);
  const overall = Math.round((avg.confianza + avg.comunic + avg.claridad + avg.foco + avg.seguridad) / 5);
  const totalInRoom = participants.length;
  const totalCards = Object.values(counts).reduce((a, b) => a + b, 0);
  const myIds = new Set(myCards.map((c) => c.id));
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
    // cards_reveal (miembro)
    return <Shell onExit={exit}><div style={{ width: "100%", maxWidth: 920 }}>{Header("Todas las tarjetas a la vista. Las anónimas no muestran autor.")}{RevealedCards}</div></Shell>;
  }

  // ════════ FACILITADOR ════════
  const goNext = async () => {
    setBusy(true);
    if (step === "pulse") await setStep(sessionId, "pulse_reveal", 1);
    else if (step === "pulse_reveal") await setStep(sessionId, "cards", 2);
    else if (step === "cards") await setStep(sessionId, "cards_reveal", 3);
    setBusy(false);
  };
  const finish = async () => { setBusy(true); await finalizeSession(session, { pulseAvg: avg, cardCount: allCards.length }); setBusy(false); exit(); };

  const ParticipantsBar = (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
      <div style={{ display: "flex" }}>{participants.slice(0, 8).map((p, i) => <span key={p.userId} style={{ marginLeft: i ? -8 : 0 }}><Avatar name={p.name} initials={p.initials} size={28} idx={i} /></span>)}</div>
      <span className="muted num" style={{ fontSize: "var(--t-sm)" }}>{totalInRoom} en la sala</span>
    </div>
  );

  let body: React.ReactNode = null, action: React.ReactNode = null, sub = "";
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
  } else {
    sub = "Todas las tarjetas a la vista. Las anónimas no muestran autor.";
    body = RevealedCards;
    action = <Button full size="lg" icon="Check" disabled={busy} onClick={finish}>Cerrar y guardar sesión</Button>;
  }

  return (
    <Shell onExit={exit}>
      <div style={{ width: "100%", maxWidth: step === "cards_reveal" ? 920 : 600 }}>
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
