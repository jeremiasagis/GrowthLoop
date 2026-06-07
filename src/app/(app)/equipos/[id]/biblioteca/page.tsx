"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, EmptyState, Pill, SectionTitle } from "@/components/ui";
import { getInitiatives, getTeam } from "@/lib/repository";
import { FOUNDING_QUESTIONS, type Initiative } from "@/lib/data";

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

export default function BibliotecaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const teamId = params.id || "";
  const team = getTeam(teamId);
  const inits = getInitiatives(teamId);
  const [q, setQ] = useState("");

  const { learnings, bets, rootCauses } = useMemo(() => {
    const learnings: { text: string; init: Initiative; result?: string; decision?: string }[] = [];
    const bets: { init: Initiative; betThen: string; signal?: string; result?: string }[] = [];
    const rootCauses: { init: Initiative; cause: string }[] = [];
    for (const i of inits) {
      const d = i.data ?? {};
      (d.learn?.learnings ?? []).forEach((t) => learnings.push({ text: t, init: i, result: d.learn?.result, decision: d.learn?.decision }));
      if (d.proof?.betThen) bets.push({ init: i, betThen: d.proof.betThen, signal: d.proof.signal, result: d.learn?.result });
      if (d.focus?.rootCause) rootCauses.push({ init: i, cause: d.focus.rootCause });
    }
    return { learnings, bets, rootCauses };
  }, [inits]);

  const term = q.trim().toLowerCase();
  const matchL = learnings.filter((l) => !term || l.text.toLowerCase().includes(term) || l.init.title.toLowerCase().includes(term));
  const matchB = bets.filter((b) => !term || b.betThen.toLowerCase().includes(term) || b.init.title.toLowerCase().includes(term));
  const matchC = rootCauses.filter((c) => !term || c.cause.toLowerCase().includes(term) || c.init.title.toLowerCase().includes(term));
  const contract = team?.data?.contract;
  const empty = !learnings.length && !bets.length && !rootCauses.length && !contract;

  if (!team) {
    return <div className="screen-pad"><Card pad={0}><EmptyState icon="SearchX" title="Equipo no encontrado">No pudimos encontrar este equipo.</EmptyState></Card></div>;
  }

  return (
    <div className="screen-pad">
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "var(--t-sm)", marginBottom: 14, flexWrap: "wrap" }}>
        <button onClick={() => router.push("/organizaciones")} className="muted">Equipos</button>
        <span className="faint"><Icon name="ChevronRight" size={13} /></span>
        <button onClick={() => router.push(`/equipos/${teamId}`)} className="muted">{team.name}</button>
        <span className="faint"><Icon name="ChevronRight" size={13} /></span>
        <span style={{ fontWeight: 600 }}>Biblioteca</span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 10 }}><Icon name="Library" size={26} style={{ color: "var(--green)" }} /> Biblioteca del equipo</h1>
          <p className="muted" style={{ marginTop: 4 }}>El conocimiento que {team.name} fue acumulando ciclo a ciclo: aprendizajes, apuestas y causas raíz.</p>
        </div>
        <Button variant="secondary" icon="ArrowLeft" onClick={() => router.push(`/equipos/${teamId}`)}>Volver al equipo</Button>
      </div>

      {empty ? (
        <Card pad={0}><EmptyState icon="Library" title="Todavía no hay aprendizajes">A medida que el equipo cierre ciclos de mejora, sus aprendizajes, apuestas y causas raíz se van a ir guardando acá.</EmptyState></Card>
      ) : (
        <>
          {!empty && (
            <div style={{ position: "relative", maxWidth: 420, marginBottom: 22 }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)" }}><Icon name="Search" size={16} /></span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en la biblioteca…" style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "10px 12px 10px 36px", fontSize: "var(--t-sm)", outline: "none" }} />
            </div>
          )}

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

            <Card pad={20}>
              <SectionTitle icon="GraduationCap" sub={`${learnings.length} en total`}>Aprendizajes</SectionTitle>
              {matchL.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                  {matchL.map((l, i) => { const r = l.result ? RESULT_META[l.result] : undefined; const d = l.decision ? DECISION_META[l.decision] : undefined; return (
                    <div key={i} style={{ padding: "12px 14px", background: "var(--card-2)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-learn)", borderRadius: "var(--r-md)" }}>
                      <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.5 }}>{l.text}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        <button onClick={() => router.push(`/equipos/${teamId}/iniciativa/${l.init.id}`)} className="muted" style={{ fontSize: "var(--t-xs)", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Target" size={12} /> {l.init.title}</button>
                        {r && <Pill color={r.c} bg={`color-mix(in srgb, ${r.c} 14%, transparent)`} icon={r.i}>{r.l}</Pill>}
                        {d && <Pill color={d.c} bg={`color-mix(in srgb, ${d.c} 14%, transparent)`} icon={d.i}>{d.l}</Pill>}
                      </div>
                    </div>
                  ); })}
                </div>
              ) : <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 8, fontStyle: "italic" }}>Sin aprendizajes que coincidan.</p>}
            </Card>

            <Card pad={20}>
              <SectionTitle icon="Lightbulb" sub={`${bets.length} en total`}>Apuestas probadas</SectionTitle>
              {matchB.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                  {matchB.map((b, i) => { const r = b.result ? RESULT_META[b.result] : undefined; return (
                    <div key={i} style={{ padding: "12px 14px", background: "var(--card-2)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-proof)", borderRadius: "var(--r-md)" }}>
                      <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.5 }}>{b.betThen}</p>
                      {b.signal && <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 4 }}>Señal: {b.signal}</p>}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        <button onClick={() => router.push(`/equipos/${teamId}/iniciativa/${b.init.id}`)} className="muted" style={{ fontSize: "var(--t-xs)", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Target" size={12} /> {b.init.title}</button>
                        {r && <Pill color={r.c} bg={`color-mix(in srgb, ${r.c} 14%, transparent)`} icon={r.i}>{r.l}</Pill>}
                      </div>
                    </div>
                  ); })}
                </div>
              ) : <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 8, fontStyle: "italic" }}>Sin apuestas que coincidan.</p>}
            </Card>

            <Card pad={20}>
              <SectionTitle icon="GitBranch" sub={`${rootCauses.length} en total`}>Causas raíz detectadas</SectionTitle>
              {matchC.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                  {matchC.map((c, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", background: "var(--card-2)", border: "1px solid var(--line)", borderLeft: "3px solid var(--st-focus)", borderRadius: "var(--r-md)" }}>
                      <span style={{ fontSize: "var(--t-sm)", flex: 1, minWidth: 0 }}>{c.cause}</span>
                      <button onClick={() => router.push(`/equipos/${teamId}/iniciativa/${c.init.id}`)} className="muted" style={{ fontSize: "var(--t-xs)", display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}><Icon name="Target" size={12} /> {c.init.title}</button>
                    </div>
                  ))}
                </div>
              ) : <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 8, fontStyle: "italic" }}>Sin causas que coincidan.</p>}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
