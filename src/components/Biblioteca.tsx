"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Icon } from "@/components/icon";
import { Card, EmptyState, Pill, SectionTitle } from "@/components/ui";
import { getInitiatives } from "@/lib/repository";
import { FOUNDING_QUESTIONS, type Initiative, type Team } from "@/lib/data";

const RESULT_META: Record<string, { l: string; c: string; i: string }> = {
  yes: { l: "Funcionó", c: "var(--success)", i: "CircleCheck" },
  partial: { l: "A medias", c: "var(--warning)", i: "CircleDot" },
  no: { l: "No funcionó", c: "var(--risk)", i: "CircleX" },
};
const DECISION_META: Record<string, { l: string; c: string; i: string }> = {
  consolidate: { l: "Consolidada", c: "var(--success)", i: "Anchor" },
  iterate: { l: "Iterada", c: "var(--st-proof)", i: "RefreshCw" },
  drop: { l: "Soltada", c: "var(--ink-2)", i: "Archive" },
};

const PAGE = 12;
/** Lista con "ver más" para no renderizar cientos de items de una. */
function Paged<T>({ items, render }: { items: T[]; render: (it: T, i: number) => ReactNode }) {
  const [n, setN] = useState(PAGE);
  return (
    <>
      {items.slice(0, n).map(render)}
      {items.length > n && (
        <button onClick={() => setN((x) => x + PAGE)} className="muted" style={{ alignSelf: "flex-start", fontSize: "var(--t-xs)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5, marginTop: 2 }}>
          <Icon name="ChevronDown" size={13} /> Ver más ({items.length - n})
        </button>
      )}
    </>
  );
}

/** Contenido reutilizable de la Biblioteca del equipo (facilitador y miembro). */
export function BibliotecaContent({ team, onOpenInitiative }: { team: Team; onOpenInitiative?: (init: Initiative) => void }) {
  const inits = getInitiatives(team.id);
  const [q, setQ] = useState("");

  const { learnings, bets, rootCauses, highlights } = useMemo(() => {
    const learnings: { text: string; init: Initiative; result?: string; decision?: string }[] = [];
    const bets: { init: Initiative; betThen: string; signal?: string; result?: string }[] = [];
    const rootCauses: { init: Initiative; cause: string }[] = [];
    const highlights: { name: string; votes: number; init: Initiative }[] = [];
    for (const i of inits) {
      const d = i.data ?? {};
      (d.learn?.learnings ?? []).forEach((t) => learnings.push({ text: t, init: i, result: d.learn?.result, decision: d.learn?.decision }));
      (d.learn?.highlights ?? []).forEach((h) => highlights.push({ name: h.name, votes: h.votes, init: i }));
      const pbets = d.proof?.bets?.length ? d.proof.bets : (d.proof?.betThen ? [{ betThen: d.proof.betThen, signalMetric: d.proof?.signalMetric }] : []);
      pbets.forEach((b) => { if (b.betThen) bets.push({ init: i, betThen: b.betThen, signal: b.signalMetric || d.proof?.signal, result: d.learn?.result }); });
      if (d.focus?.rootCause) rootCauses.push({ init: i, cause: d.focus.rootCause });
    }
    highlights.sort((a, b) => b.votes - a.votes);
    return { learnings, bets, rootCauses, highlights };
  }, [inits]);

  const term = q.trim().toLowerCase();
  const matchL = learnings.filter((l) => !term || l.text.toLowerCase().includes(term) || l.init.title.toLowerCase().includes(term));
  const matchB = bets.filter((b) => !term || b.betThen.toLowerCase().includes(term) || b.init.title.toLowerCase().includes(term));
  const matchC = rootCauses.filter((c) => !term || c.cause.toLowerCase().includes(term) || c.init.title.toLowerCase().includes(term));
  const contract = team.data?.contract;
  const empty = !learnings.length && !bets.length && !rootCauses.length && !contract;

  const InitLink = ({ init }: { init: Initiative }) => onOpenInitiative
    ? <button onClick={() => onOpenInitiative(init)} className="muted" style={{ fontSize: "var(--t-xs)", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Target" size={12} /> {init.title}</button>
    : <span className="muted" style={{ fontSize: "var(--t-xs)", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Target" size={12} /> {init.title}</span>;

  if (empty) {
    return <Card pad={0}><EmptyState icon="Library" title="Todavía no hay aprendizajes">A medida que el equipo cierre ciclos de mejora, sus aprendizajes, apuestas y causas raíz se van a ir guardando acá.</EmptyState></Card>;
  }

  return (
    <>
      <div style={{ position: "relative", maxWidth: 420, marginBottom: 22 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)" }}><Icon name="Search" size={16} /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en la biblioteca…" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "10px 12px 10px 36px", fontSize: "var(--t-sm)", outline: "none" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {contract && (
          <Card pad={20}>
            <SectionTitle icon="Handshake" sub={`Firmado · ${contract.date}`}>Contrato del equipo</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
              {FOUNDING_QUESTIONS.map((qq) => contract.answers?.[qq.key] && (
                <div key={qq.key}>
                  <div className="muted" style={{ fontSize: "var(--t-xs)", fontWeight: 600 }}>{qq.q}</div>
                  <div style={{ fontSize: "var(--t-sm)", lineHeight: 1.45 }}>{contract.answers[qq.key]}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {highlights.length > 0 && (
          <Card pad={20}>
            <SectionTitle icon="Star" sub={`${highlights.length} destacados`}>Aprendizajes destacados</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              <Paged items={highlights.filter((h) => !term || h.name.toLowerCase().includes(term) || h.init.title.toLowerCase().includes(term))} render={(h, i) => (
                <span key={i} style={{ fontSize: "var(--t-sm)", padding: "6px 12px", borderRadius: "var(--r-full)", background: "color-mix(in srgb, var(--st-learn) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--st-learn) 35%, transparent)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="Star" size={12} style={{ color: "var(--st-learn)" }} />{h.name}<span className="muted num" style={{ fontSize: "var(--t-xs)" }}>{h.votes}</span></span>
              )} />
            </div>
          </Card>
        )}

        <Card pad={20}>
          <SectionTitle icon="GraduationCap" sub={`${learnings.length} en total`}>Aprendizajes</SectionTitle>
          {matchL.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
              <Paged items={matchL} render={(l, i) => { const r = l.result ? RESULT_META[l.result] : undefined; const d = l.decision ? DECISION_META[l.decision] : undefined; return (
                <div key={i} style={{ padding: "12px 14px", background: "var(--card-2)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-learn)", borderRadius: "var(--r-md)" }}>
                  <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.5 }}>{l.text}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <InitLink init={l.init} />
                    {r && <Pill color={r.c} bg={`color-mix(in srgb, ${r.c} 14%, transparent)`} icon={r.i}>{r.l}</Pill>}
                    {d && <Pill color={d.c} bg={`color-mix(in srgb, ${d.c} 14%, transparent)`} icon={d.i}>{d.l}</Pill>}
                  </div>
                </div>
              ); }} />
            </div>
          ) : <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 8, fontStyle: "italic" }}>Sin aprendizajes que coincidan.</p>}
        </Card>

        <Card pad={20}>
          <SectionTitle icon="Lightbulb" sub={`${bets.length} en total`}>Apuestas probadas</SectionTitle>
          {matchB.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
              <Paged items={matchB} render={(b, i) => { const r = b.result ? RESULT_META[b.result] : undefined; return (
                <div key={i} style={{ padding: "12px 14px", background: "var(--card-2)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-proof)", borderRadius: "var(--r-md)" }}>
                  <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.5 }}>{b.betThen}</p>
                  {b.signal && <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 4 }}>Señal: {b.signal}</p>}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <InitLink init={b.init} />
                    {r && <Pill color={r.c} bg={`color-mix(in srgb, ${r.c} 14%, transparent)`} icon={r.i}>{r.l}</Pill>}
                  </div>
                </div>
              ); }} />
            </div>
          ) : <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 8, fontStyle: "italic" }}>Sin apuestas que coincidan.</p>}
        </Card>

        <Card pad={20}>
          <SectionTitle icon="GitBranch" sub={`${rootCauses.length} en total`}>Causas raíz detectadas</SectionTitle>
          {matchC.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
              <Paged items={matchC} render={(c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", background: "var(--card-2)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-focus)", borderRadius: "var(--r-md)" }}>
                  <span style={{ fontSize: "var(--t-sm)", flex: 1, minWidth: 0 }}>{c.cause}</span>
                  <InitLink init={c.init} />
                </div>
              )} />
            </div>
          ) : <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 8, fontStyle: "italic" }}>Sin causas que coincidan.</p>}
        </Card>
      </div>
    </>
  );
}
