"use client";

/* ============================================================
   Detalle de persona — 360 (radar de brecha) + 1-a-1.
   El facilitador inicia/cierra el 360, comparte el link de evaluación,
   ve la brecha (auto vs equipo) y lleva los 1-a-1 (agenda de Norte +
   notas + compromisos). PLAN-DESARROLLO Parte A.
   ============================================================ */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, EmptyState, Pill, PulseRadar, SectionTitle } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { getOrg, getTeam } from "@/lib/repository";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { planLimits, to100, to5 } from "@/lib/data";
import {
  closeReview, createOneOnOne, createReview, getOneOnOnes, getReviewAggregate, getReviewsForTeam,
  teamCompetencies, updateOneOnOne, type OneOnOne, type ReviewAggregate, type TalentReview,
} from "@/lib/talent";

const CPAL = ["#00E87A", "#3B82F6", "#7C3AED", "#06B6D4", "#F59E0B", "#EF4444", "#EC4899", "#A3E635", "#14B8A6", "#F97316"];

export default function PersonaDetailPage() {
  const router = useRouter();
  const { show } = useToast();
  const { id: teamId, memberId } = useParams<{ id: string; memberId: string }>();
  const team = getTeam(teamId);
  const member = team?.members.find((m) => m.userId === memberId);
  const aiEnabled = planLimits(getOrg(team?.orgId ?? "")?.plan).ai;

  const [reviews, setReviews] = useState<TalentReview[]>([]);
  const [agg, setAgg] = useState<ReviewAggregate | null>(null);
  const [ooos, setOoos] = useState<OneOnOne[]>([]);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const rs = (await getReviewsForTeam(teamId)).filter((r) => r.subjectUserId === memberId);
      if (!active) return;
      setReviews(rs);
      const lastClosed = rs.find((r) => r.status === "closed");
      setAgg(lastClosed ? await getReviewAggregate(lastClosed.id) : null);
      setOoos(await getOneOnOnes({ teamId, memberUserId: memberId }));
    })();
    return () => { active = false; };
  }, [teamId, memberId, tick]);

  if (!team || !member) return <div className="screen-pad"><Card pad={24}><p className="muted">Persona no encontrada.</p></Card></div>;

  const openReview = reviews.find((r) => r.status === "open");
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const startReview = async () => {
    setBusy(true);
    const { error, id } = await createReview(teamId, memberId, teamCompetencies(team));
    setBusy(false);
    if (error) { show("No se pudo iniciar el 360 (¿corriste la migración?).", "TriangleAlert"); return; }
    show("360 abierto. Compartí el link.", "Check"); setTick((t) => t + 1);
    void id;
  };
  const endReview = async (id: string) => {
    setBusy(true); const { error } = await closeReview(id); setBusy(false);
    if (error) { show("No se pudo cerrar.", "TriangleAlert"); return; }
    setTick((t) => t + 1);
  };
  const newOoo = async () => {
    setBusy(true);
    const { error } = await createOneOnOne(teamId, memberId, reviews.find((r) => r.status === "closed")?.id);
    setBusy(false);
    if (error) { show("No se pudo crear el 1-a-1.", "TriangleAlert"); return; }
    setTick((t) => t + 1);
  };

  // Radar de brecha: auto (verde) vs equipo/pares (violeta punteado).
  const dims = (agg?.competencies ?? teamCompetencies(team)).map((c, i) => ({ key: c.key, label: c.label, color: CPAL[i % CPAL.length] }));
  const conv = (r?: Record<string, number> | null) => r ? Object.fromEntries(Object.entries(r).map(([k, v]) => [k, to100(v)])) : {};

  return (
    <div className="screen-pad" style={{ maxWidth: 820 }}>
      <button onClick={() => router.push(`/equipos/${team.id}/personas`)} className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--t-xs)", fontWeight: 600, marginBottom: 10 }}><Icon name="ChevronLeft" size={13} /> Desarrollo</button>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
        <span style={{ width: 46, height: 46, borderRadius: 99, background: "var(--card-2)", color: "var(--ink-1)", display: "grid", placeItems: "center", fontWeight: 800, flex: "none" }}>{member.initials}</span>
        <div><h1 style={{ fontSize: "var(--t-xl)", fontWeight: 800 }}>{member.name}</h1><p className="muted" style={{ fontSize: "var(--t-sm)" }}>Desarrollo individual · {team.name}</p></div>
      </div>

      {/* 360 */}
      <Card pad={20} style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap", justifyContent: "space-between" }}>
          <SectionTitle icon="Radar" sub="Cómo se ve vs. cómo lo ve el equipo">360 de competencias</SectionTitle>
          {!openReview && <Button size="sm" icon="Plus" disabled={busy} onClick={startReview}>Iniciar 360</Button>}
        </div>

        {openReview && (
          <div style={{ marginTop: 12, padding: "12px 14px", background: "color-mix(in srgb, var(--info) 7%, var(--card))", border: "1px solid color-mix(in srgb, var(--info) 30%, transparent)", borderRadius: "var(--r-md)" }}>
            <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 6 }}>360 abierto · compartí el link</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <code style={{ flex: 1, minWidth: 0, fontSize: "var(--t-xs)", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", padding: "8px 10px", overflowX: "auto", whiteSpace: "nowrap" }}>{origin}/360/{openReview.id}</code>
              <Button size="sm" variant="secondary" icon="Copy" onClick={() => { navigator.clipboard?.writeText(`${origin}/360/${openReview.id}`); show("Link copiado", "Check"); }}>Copiar</Button>
              <Button size="sm" variant="secondary" icon="Lock" disabled={busy} onClick={() => endReview(openReview.id)}>Cerrar y ver</Button>
            </div>
            <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 8 }}>Pasáselo a la persona (autoevaluación) y a sus compañeros. Los pares son anónimos (se muestra el promedio, mínimo 3).</p>
          </div>
        )}

        {agg ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ maxWidth: 420, margin: "0 auto" }}>
              <PulseRadar values={conv(agg.self)} compare={agg.peers ? conv(agg.peers) : undefined} dims={dims} size={340} />
            </div>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", fontSize: "var(--t-xs)", margin: "4px 0 14px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 3, background: "var(--green)" }} /> Autoevaluación</span>
              {agg.peers && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 3, background: "var(--violet)" }} /> Equipo ({agg.peerCount} pares)</span>}
            </div>
            {/* brecha por competencia */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {dims.map((d) => {
                const s = agg.self?.[d.key], p = agg.peers?.[d.key], l = agg.leader?.[d.key];
                const gap = s != null && p != null ? Math.round((p - s) * 10) / 10 : null;
                return (
                  <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--t-sm)", padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                    <span style={{ flex: 1, minWidth: 0, fontWeight: 600 }}>{d.label}</span>
                    <span className="num muted" title="Autoevaluación">auto {s != null ? s.toFixed(1) : "—"}</span>
                    {l != null && <span className="num muted" title="Líder">líder {l.toFixed(1)}</span>}
                    <span className="num muted" title="Equipo (pares)">equipo {p != null ? p.toFixed(1) : "—"}</span>
                    {gap != null && Math.abs(gap) >= 0.5 && <Pill color={gap < 0 ? "var(--warning)" : "var(--success)"} bg={gap < 0 ? "var(--warning-bg)" : "var(--success-bg)"} icon={gap < 0 ? "ArrowDown" : "ArrowUp"}>{gap < 0 ? "punto ciego" : "fortaleza oculta"}</Pill>}
                  </div>
                );
              })}
            </div>
            {!agg.peers && <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 10, fontStyle: "italic" }}>Faltan pares para mostrar la mirada del equipo (mínimo 3, por anonimato).</p>}
          </div>
        ) : !openReview && (
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 12, fontStyle: "italic" }}>Todavía no hay un 360 cerrado. Iniciá uno para ver la brecha entre cómo se ve y cómo lo ve el equipo.</p>
        )}
      </Card>

      {/* 1-a-1 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <SectionTitle icon="MessagesSquare" sub="Tus conversaciones de desarrollo">Reuniones 1-a-1</SectionTitle>
        <Button size="sm" icon="Plus" disabled={busy} onClick={newOoo}>Abrir 1-a-1</Button>
      </div>
      {ooos.length === 0 ? (
        <Card pad={0}><EmptyState icon="MessagesSquare" title="Sin 1-a-1 todavía">Abrí el primero: Norte te arma una agenda con las brechas del 360 y las señales del equipo.</EmptyState></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {ooos.map((o) => <OneOnOneCard key={o.id} ooo={o} team={team} agg={agg} aiEnabled={aiEnabled} onChanged={() => setTick((t) => t + 1)} />)}
        </div>
      )}
    </div>
  );
}

const C_ORDER = ["pending", "doing", "done", "blocked"];
const C_META: Record<string, { l: string; c: string }> = {
  pending: { l: "Pendiente", c: "var(--ink-2)" }, doing: { l: "En curso", c: "var(--info)" },
  done: { l: "Hecho", c: "var(--success)" }, blocked: { l: "Trabado", c: "var(--warning)" },
};

function OneOnOneCard({ ooo, team, agg, aiEnabled, onChanged }: { ooo: OneOnOne; team: import("@/lib/data").Team; agg: ReviewAggregate | null; aiEnabled: boolean; onChanged: () => void }) {
  const { show } = useToast();
  const [notes, setNotes] = useState(ooo.notes ?? "");
  const [agenda, setAgenda] = useState<string[]>(ooo.agenda ?? []);
  const [commits, setCommits] = useState(ooo.commitments ?? []);
  const [newC, setNewC] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  const saveNotes = async () => { if (notes !== (ooo.notes ?? "")) await updateOneOnOne(ooo.id, { notes }); };
  const saveCommits = async (next: typeof commits) => { setCommits(next); await updateOneOnOne(ooo.id, { commitments: next }); onChanged(); };
  const addCommit = () => { const t = newC.trim(); if (!t) return; saveCommits([...commits, { text: t, status: "pending" }]); setNewC(""); };
  const cycleCommit = (i: number) => saveCommits(commits.map((c, k) => k === i ? { ...c, status: C_ORDER[(C_ORDER.indexOf(c.status ?? "pending") + 1) % C_ORDER.length] } : c));

  const armarAgenda = async () => {
    if (aiBusy) return;
    setAiBusy(true);
    try {
      const gaps = agg ? (agg.competencies ?? []).map((c) => { const s = agg.self?.[c.key], p = agg.peers?.[c.key]; return p != null && s != null ? `${c.label}: auto ${s.toFixed(1)} vs equipo ${p.toFixed(1)}` : null; }).filter(Boolean).join("; ") : "";
      const ctx = `Persona del equipo "${team.name}". Brechas del 360: ${gaps || "sin 360 aún"}. Objetivo del equipo: ${team.data?.objective?.text ?? "—"}. Compromisos previos: ${commits.map((c) => c.text).join("; ") || "ninguno"}.`;
      const { data: s } = await getSupabaseBrowserClient().auth.getSession();
      const res = await fetch("/api/ai/norte", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${s.session?.access_token ?? ""}` }, body: JSON.stringify({ kind: "oneononePrep", context: ctx }) });
      const json = await res.json();
      if (!res.ok || json.error) { show(json.error ?? "No se pudo armar.", "TriangleAlert"); setAiBusy(false); return; }
      const items = (json.text ?? "").split("\n").map((l: string) => l.replace(/^[-*\d.\s]+/, "").trim()).filter(Boolean).slice(0, 6);
      setAgenda(items); await updateOneOnOne(ooo.id, { agenda: items });
    } catch { show("No se pudo contactar a Norte.", "TriangleAlert"); }
    setAiBusy(false);
  };

  return (
    <Card pad={18}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Icon name="Calendar" size={14} style={{ color: "var(--ink-3)" }} />
        <span className="num muted" style={{ fontSize: "var(--t-xs)" }}>{ooo.date ? new Date(ooo.date).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span>
        <Pill color="var(--ink-2)" bg="var(--card)" icon="Lock">privado</Pill>
      </div>

      <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>Agenda
        <button onClick={aiEnabled ? armarAgenda : () => show("✨ Norte está en el plan Pro.", "Lock")} style={{ marginLeft: "auto", fontSize: "var(--t-xs)", fontWeight: 700, color: "var(--violet)", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name={aiBusy ? "Loader" : "Sparkles"} size={12} /> {aiBusy ? "Armando…" : "Armar con Norte"}</button>
      </div>
      {agenda.length > 0 ? (
        <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: "var(--t-sm)", lineHeight: 1.6 }}>{agenda.map((a, i) => <li key={i}>{a}</li>)}</ul>
      ) : <p className="muted" style={{ fontSize: "var(--t-xs)", marginBottom: 12, fontStyle: "italic" }}>Sin agenda. Armala con Norte o escribí abajo.</p>}

      <div className="eyebrow" style={{ marginBottom: 6 }}>Notas (privadas, líder ↔ persona)</div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} rows={3} placeholder="De qué hablaron, acuerdos, contexto…" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "10px 12px", fontSize: "var(--t-sm)", outline: "none", resize: "vertical", marginBottom: 12 }} />

      <div className="eyebrow" style={{ marginBottom: 6 }}>Compromisos</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {commits.map((c, i) => { const m = C_META[c.status ?? "pending"]; return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--t-sm)" }}>
            <span style={{ flex: 1, minWidth: 0, textDecoration: c.status === "done" ? "line-through" : "none", opacity: c.status === "done" ? 0.7 : 1 }}>{c.text}</span>
            <button onClick={() => cycleCommit(i)} style={{ flex: "none", fontSize: "var(--t-xs)", fontWeight: 700, color: m.c, background: `color-mix(in srgb, ${m.c} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${m.c} 30%, transparent)`, borderRadius: "var(--r-full)", padding: "3px 9px" }}>{m.l}</button>
          </div>
        ); })}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input value={newC} onChange={(e) => setNewC(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCommit()} placeholder="Nuevo compromiso…" style={{ flex: 1, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "7px 10px", fontSize: "var(--t-sm)", outline: "none" }} />
        <Button size="sm" variant="secondary" icon="Plus" onClick={addCommit}>Sumar</Button>
      </div>
    </Card>
  );
}
