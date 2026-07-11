"use client";

/* ============================================================
   Mi desarrollo — el espejo del miembro (capa individual).
   Reutiliza la capa de talento (talent.ts) del lado de quien es
   evaluado: su 360 (cómo se ve vs. cómo lo ve el equipo, con el
   anonimato de pares ya garantizado por la RPC) y sus 1-a-1
   (agenda, notas y compromisos de desarrollo), en modo lectura.
   ============================================================ */

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { Button, Card, EmptyState, Pill, PulseRadar, SectionTitle } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth/AuthContext";
import { useMemberTeam } from "@/lib/member/team";
import { getMemberTeam } from "@/lib/repository";
import {
  getReviewsForTeam, getReviewAggregate, getMyOneOnOnes, teamCompetencies,
  type ReviewAggregate, type OneOnOne,
} from "@/lib/talent";
import { to100 } from "@/lib/data";
import { getMyFocuses, setMyFocusStatus, proposeMyFocus, FOCUS_STATUS, DOMAINS, DOMAIN_META, domainMeta, type Challenge } from "@/lib/challenges";

const CPAL = ["var(--green)", "var(--violet)", "var(--info)", "var(--warning)", "#22d3ee", "#f59e0b", "#a78bfa", "#34d399"];

const COMMIT_DOT: Record<string, string> = { done: "var(--success)", doing: "var(--info)", blocked: "var(--risk)", pending: "var(--ink-3)" };

function fmtDate(iso?: string) {
  if (!iso) return "Sin fecha";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "Sin fecha" : d.toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" });
}

function OneOnOneView({ ooo }: { ooo: OneOnOne }) {
  return (
    <Card pad={18} style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Icon name="MessagesSquare" size={16} style={{ color: "var(--violet)" }} />
        <span style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>1-a-1 · {fmtDate(ooo.date)}</span>
      </div>

      {ooo.agenda.length > 0 ? (
        <>
          <div className="eyebrow" style={{ marginBottom: 6 }}>De qué hablamos</div>
          <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: "var(--t-sm)", lineHeight: 1.6 }}>
            {ooo.agenda.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </>
      ) : <p className="muted" style={{ fontSize: "var(--t-xs)", marginBottom: 12, fontStyle: "italic" }}>Sin agenda registrada.</p>}

      {ooo.notes && ooo.notes.trim() && (
        <div style={{ marginBottom: 12 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Notas de la conversación</div>
          <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.55, color: "var(--ink-1)", whiteSpace: "pre-wrap" }}>{ooo.notes}</p>
        </div>
      )}

      {ooo.commitments.length > 0 && (
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Mis compromisos de desarrollo</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {ooo.commitments.map((c, i) => {
              const done = c.status === "done";
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: "var(--t-sm)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: COMMIT_DOT[c.status ?? "pending"] ?? "var(--ink-3)", flex: "none" }} />
                  <span style={{ flex: 1, minWidth: 0, textDecoration: done ? "line-through" : "none", opacity: done ? 0.65 : 1 }}>{c.text}</span>
                  {c.due && <span className="num muted" style={{ fontSize: "var(--t-xs)" }}>{fmtDate(c.due)}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function MemberDesarrollo() {
  const { user } = useAuth();
  const { show } = useToast();
  const { teamId } = useMemberTeam();
  const team = getMemberTeam(teamId);
  const [agg, setAgg] = useState<ReviewAggregate | null>(null);
  const [hasReview, setHasReview] = useState(false);
  const [ooos, setOoos] = useState<OneOnOne[]>([]);
  const [focuses, setFocuses] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [propose, setPropose] = useState(false);
  const [pTitle, setPTitle] = useState("");
  const [pDetail, setPDetail] = useState("");
  const [pDomain, setPDomain] = useState<string>("comunicacion");
  const [pBusy, setPBusy] = useState(false);

  useEffect(() => {
    if (!team?.id || !user?.id) return;
    const tid = team.id, uid = user.id;
    let active = true;
    (async () => {
      const mine = (await getReviewsForTeam(tid)).filter((r) => r.subjectUserId === uid);
      const lastClosed = mine.find((r) => r.status === "closed");
      const a = lastClosed ? await getReviewAggregate(lastClosed.id) : null;
      const o = (await getMyOneOnOnes()).filter((x) => x.teamId === tid);
      const f = (await getMyFocuses()).filter((x) => x.teamId === tid);
      if (active) { setHasReview(mine.length > 0); setAgg(a); setOoos(o); setFocuses(f); setLoading(false); }
    })();
    return () => { active = false; };
  }, [team?.id, user?.id]);

  const cycleFocus = async (f: Challenge) => {
    const next = FOCUS_STATUS[f.status]?.next ?? "doing";
    await setMyFocusStatus(f.id, next);
    if (team?.id) setFocuses((await getMyFocuses()).filter((x) => x.teamId === team.id));
  };

  const submitFocus = async () => {
    if (!pTitle.trim() || pBusy || !team?.id) return;
    setPBusy(true);
    const { error } = await proposeMyFocus({ teamId: team.id, title: pTitle, detail: pDetail, domain: pDomain });
    setPBusy(false);
    if (error) { show("No se pudo crear el foco.", "TriangleAlert"); return; }
    setPTitle(""); setPDetail(""); setPropose(false); show("Foco creado — es tuyo, marcá tu avance cuando quieras", "Check");
    setFocuses((await getMyFocuses()).filter((x) => x.teamId === team.id));
  };

  if (!team) return <div className="screen-pad"><Card pad={24}><p className="muted">No estás asignado a un equipo todavía.</p></Card></div>;

  const dims = (agg?.competencies ?? teamCompetencies(team)).map((c, i) => ({ key: c.key, label: c.label, color: CPAL[i % CPAL.length] }));
  const conv = (r?: Record<string, number> | null) => r ? Object.fromEntries(Object.entries(r).map(([k, v]) => [k, to100(v)])) : {};

  return (
    <div className="screen-pad" style={{ maxWidth: 820 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Mi desarrollo</h1>
        <p className="muted" style={{ marginTop: 4 }}>Tu espejo en el equipo: cómo venís creciendo y tus conversaciones 1-a-1.</p>
      </div>

      {/* ── Mis focos de desarrollo ── */}
      <Card pad={20} style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <SectionTitle icon="Target" sub="En qué estás creciendo — vos manejás tu avance">Mis focos de desarrollo</SectionTitle>
          <Button size="sm" variant="secondary" icon="Plus" onClick={() => setPropose(true)}>Proponer un foco</Button>
        </div>
        {focuses.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {focuses.map((f) => {
              const dm = domainMeta(f.domain);
              const st = FOCUS_STATUS[f.status] ?? FOCUS_STATUS.open;
              return (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", background: "var(--card-2)", border: "1px solid var(--line)", borderLeft: `3px solid ${dm.color}`, borderRadius: "var(--r-md)" }}>
                  <Icon name={dm.icon} size={15} style={{ color: dm.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "var(--t-sm)", fontWeight: 600, textDecoration: f.status === "done" ? "line-through" : "none", opacity: f.status === "done" ? 0.7 : 1 }}>{f.title}</div>
                    {f.detail && <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 1 }}>{f.detail}</p>}
                    {f.source === "self" && <span style={{ fontSize: "var(--t-xs)", fontWeight: 700, color: "var(--green)" }}>Propuesto por vos</span>}
                  </div>
                  <button onClick={() => cycleFocus(f)} title="Cambiar estado" style={{ flex: "none", padding: "5px 11px", borderRadius: "var(--r-full)", fontSize: "var(--t-xs)", fontWeight: 700, border: `1px solid ${st.color}`, background: `color-mix(in srgb, ${st.color} 12%, var(--card))`, color: st.color }}>{st.label}</button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 12, fontStyle: "italic" }}>Todavía no tenés focos. Proponé uno vos mismo —en qué querés crecer— o tu facilitador puede asignarte alguno en un 1-a-1.</p>
        )}
      </Card>

      {propose && (
        <div onClick={() => setPropose(false)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(7,11,22,0.7)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(520px,100%)", maxHeight: "88vh", overflowY: "auto", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", padding: 24, animation: "pop-in .25s var(--spring)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ width: 38, height: 38, borderRadius: "var(--r-md)", background: "color-mix(in srgb, var(--violet) 16%, transparent)", color: "var(--violet)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="Target" size={19} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: "var(--t-md)" }}>Proponer un foco propio</div>
                <div className="muted" style={{ fontSize: "var(--t-xs)" }}>En qué querés crecer. Es tuyo — vos marcás el avance.</div>
              </div>
              <button onClick={() => setPropose(false)} style={{ color: "var(--ink-2)" }}><Icon name="X" size={20} /></button>
            </div>
            <input value={pTitle} onChange={(e) => setPTitle(e.target.value)} placeholder="Ej. Ganar seguridad presentando ante el equipo" autoFocus
              style={{ width: "100%", background: "var(--card-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "10px 12px", fontSize: "var(--t-sm)", outline: "none", marginBottom: 10 }} />
            <textarea value={pDetail} onChange={(e) => setPDetail(e.target.value)} placeholder="¿Por qué? ¿Cómo se vería lograrlo? (opcional)"
              style={{ width: "100%", minHeight: 70, background: "var(--card-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: 12, fontSize: "var(--t-sm)", resize: "vertical", outline: "none", marginBottom: 12 }} />
            <div className="eyebrow" style={{ marginBottom: 8 }}>Área</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {DOMAINS.map((d) => {
                const dm = DOMAIN_META[d];
                const on = pDomain === d;
                return (
                  <button key={d} onClick={() => setPDomain(d)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 11px", borderRadius: "var(--r-full)", fontSize: "var(--t-xs)", fontWeight: 700, border: `1px solid ${on ? dm.color : "var(--line-2)"}`, background: on ? `color-mix(in srgb, ${dm.color} 12%, var(--card))` : "var(--card)", color: on ? dm.color : "var(--ink-2)" }}>
                    <Icon name={dm.icon} size={13} /> {dm.label}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Button variant="ghost" onClick={() => setPropose(false)}>Cancelar</Button>
              <Button icon={pBusy ? "Loader" : "Check"} disabled={!pTitle.trim() || pBusy} onClick={submitFocus}>{pBusy ? "Creando…" : "Crear foco"}</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mi 360 ── */}
      <Card pad={20} style={{ marginBottom: 22 }}>
        <SectionTitle icon="Radar" sub="Cómo te ves vos vs. cómo te ve el equipo">Mi 360</SectionTitle>
        {loading ? (
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 12 }}>Cargando…</p>
        ) : agg ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ maxWidth: 420, margin: "0 auto" }}>
              <PulseRadar values={conv(agg.self)} compare={agg.peers ? conv(agg.peers) : undefined} dims={dims} size={340} />
            </div>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", fontSize: "var(--t-xs)", margin: "4px 0 14px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 3, background: "var(--green)" }} /> Cómo te ves</span>
              {agg.peers && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 3, background: "var(--violet)" }} /> Cómo te ve el equipo ({agg.peerCount} pares)</span>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {dims.map((d) => {
                const s = agg.self?.[d.key], p = agg.peers?.[d.key], l = agg.leader?.[d.key];
                const gap = s != null && p != null ? Math.round((p - s) * 10) / 10 : null;
                return (
                  <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--t-sm)", padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                    <span style={{ flex: 1, minWidth: 0, fontWeight: 600 }}>{d.label}</span>
                    <span className="num muted" title="Cómo te ves">vos {s != null ? s.toFixed(1) : "—"}</span>
                    {l != null && <span className="num muted" title="Tu facilitador">facilitador {l.toFixed(1)}</span>}
                    <span className="num muted" title="Cómo te ve el equipo">equipo {p != null ? p.toFixed(1) : "—"}</span>
                    {gap != null && Math.abs(gap) >= 0.5 && <Pill color={gap < 0 ? "var(--warning)" : "var(--success)"} bg={gap < 0 ? "var(--warning-bg)" : "var(--success-bg)"} icon={gap < 0 ? "ArrowDown" : "ArrowUp"}>{gap < 0 ? "punto ciego" : "fortaleza oculta"}</Pill>}
                  </div>
                );
              })}
            </div>
            {!agg.peers && <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 10, fontStyle: "italic" }}>Todavía faltan pares para mostrar la mirada del equipo (mínimo 3, por anonimato).</p>}
          </div>
        ) : (
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 12, fontStyle: "italic" }}>
            {hasReview
              ? "Tu 360 está en curso. Cuando se cierre vas a ver acá tu espejo: cómo te ves vos vs. cómo te ve el equipo."
              : "Todavía no tenés un 360. Tu facilitador puede iniciar uno para que veas, por competencia, cómo te ve el equipo (los pares son anónimos)."}
          </p>
        )}
      </Card>

      {/* ── Mis 1-a-1 ── */}
      <SectionTitle icon="MessagesSquare" sub="Tus conversaciones de desarrollo con el facilitador">Mis 1-a-1</SectionTitle>
      <div style={{ marginTop: 10 }}>
        {loading ? (
          <p className="muted" style={{ fontSize: "var(--t-sm)" }}>Cargando…</p>
        ) : ooos.length === 0 ? (
          <Card pad={0}><EmptyState icon="MessagesSquare" title="Sin 1-a-1 todavía">Cuando tengas un 1-a-1 con tu facilitador vas a ver acá la agenda, las notas y tus compromisos de desarrollo.</EmptyState></Card>
        ) : (
          ooos.map((o) => <OneOnOneView key={o.id} ooo={o} />)
        )}
      </div>
    </div>
  );
}
