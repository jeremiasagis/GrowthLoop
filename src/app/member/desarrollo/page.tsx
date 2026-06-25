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
import { Card, EmptyState, Pill, PulseRadar, SectionTitle } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { useMemberTeam } from "@/lib/member/team";
import { getMemberTeam } from "@/lib/repository";
import {
  getReviewsForTeam, getReviewAggregate, getMyOneOnOnes, teamCompetencies,
  type ReviewAggregate, type OneOnOne,
} from "@/lib/talent";
import { to100 } from "@/lib/data";

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
  const { teamId } = useMemberTeam();
  const team = getMemberTeam(teamId);
  const [agg, setAgg] = useState<ReviewAggregate | null>(null);
  const [hasReview, setHasReview] = useState(false);
  const [ooos, setOoos] = useState<OneOnOne[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!team?.id || !user?.id) return;
    const tid = team.id, uid = user.id;
    let active = true;
    (async () => {
      const mine = (await getReviewsForTeam(tid)).filter((r) => r.subjectUserId === uid);
      const lastClosed = mine.find((r) => r.status === "closed");
      const a = lastClosed ? await getReviewAggregate(lastClosed.id) : null;
      const o = (await getMyOneOnOnes()).filter((x) => x.teamId === tid);
      if (active) { setHasReview(mine.length > 0); setAgg(a); setOoos(o); setLoading(false); }
    })();
    return () => { active = false; };
  }, [team?.id, user?.id]);

  if (!team) return <div className="screen-pad"><Card pad={24}><p className="muted">No estás asignado a un equipo todavía.</p></Card></div>;

  const dims = (agg?.competencies ?? teamCompetencies(team)).map((c, i) => ({ key: c.key, label: c.label, color: CPAL[i % CPAL.length] }));
  const conv = (r?: Record<string, number> | null) => r ? Object.fromEntries(Object.entries(r).map(([k, v]) => [k, to100(v)])) : {};

  return (
    <div className="screen-pad" style={{ maxWidth: 820 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Mi desarrollo</h1>
        <p className="muted" style={{ marginTop: 4 }}>Tu espejo en el equipo: cómo venís creciendo y tus conversaciones 1-a-1.</p>
      </div>

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
