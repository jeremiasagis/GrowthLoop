"use client";

/* ============================================================
   Compromisos con seguimiento. Consolida las acciones/compromisos
   de todos los loops del equipo en un tablero con semáforo, y deja
   actualizar su estado entre sesiones (check-in async). Cierra el
   gap entre lo que se decide en la sesión y lo que pasa después.
   El facilitador actualiza el estado; el resto lo ve.
   ============================================================ */

import { useState } from "react";
import { Icon } from "@/components/icon";
import { Card, Pill, SectionTitle } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { getInitiatives, patchInitiativeData } from "@/lib/repository";
import type { Initiative, Team } from "@/lib/data";

type St = "pending" | "doing" | "done" | "blocked";
const ORDER: St[] = ["pending", "doing", "done", "blocked"];
const META: Record<St, { l: string; c: string; bg: string; i: string }> = {
  pending: { l: "Pendiente", c: "var(--ink-2)",    bg: "var(--card-2)",   i: "Circle" },
  doing:   { l: "En curso",  c: "var(--info)",     bg: "color-mix(in srgb, var(--info) 14%, transparent)",    i: "CircleDot" },
  done:    { l: "Hecho",     c: "var(--success)",  bg: "var(--success-bg)", i: "CircleCheck" },
  blocked: { l: "Trabado",   c: "var(--warning)",  bg: "var(--warning-bg)", i: "TriangleAlert" },
};
const normSt = (s?: string): St => (ORDER.includes(s as St) ? (s as St) : "pending");

type Commit = { init: Initiative; text: string; who: string; status: St };

/** Acciones únicas de un loop (apuesta + destrabes), con su estado actual. */
function commitsOf(init: Initiative): Commit[] {
  const d = init.data ?? {};
  const raw = [...(d.proof?.actions ?? []), ...(d.follow?.newActions ?? [])];
  const statusBy = new Map((d.follow?.actionStatus ?? []).map((a) => [a.text, a.status]));
  const seen = new Set<string>();
  const out: Commit[] = [];
  for (const a of raw) {
    const text = (a.text ?? "").trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push({ init, text, who: a.who ?? "", status: normSt(statusBy.get(text)) });
  }
  return out;
}

export function TeamCommitments({ team, isFacil }: { team: Team; isFacil: boolean }) {
  const { show } = useToast();
  const [, setTick] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  const inits = getInitiatives(team.id).filter((i) => i.status !== "done");
  const groups = inits.map((i) => ({ init: i, commits: commitsOf(i) })).filter((g) => g.commits.length > 0);
  const all = groups.flatMap((g) => g.commits);
  if (!all.length) return null;

  const counts = { pending: 0, doing: 0, done: 0, blocked: 0 } as Record<St, number>;
  all.forEach((c) => { counts[c.status] += 1; });
  const pct = Math.round((counts.done / all.length) * 100);

  const setStatus = async (c: Commit, status: St) => {
    if (!isFacil) return;
    const key = `${c.init.id}:${c.text}`;
    setBusy(key);
    const cur = c.init.data?.follow?.actionStatus ?? [];
    const next = cur.some((a) => a.text === c.text)
      ? cur.map((a) => (a.text === c.text ? { ...a, status, who: a.who || c.who } : a))
      : [...cur, { text: c.text, who: c.who, status }];
    const { error } = await patchInitiativeData(c.init.id, "follow", { actionStatus: next });
    setBusy(null);
    if (error) { show("No se pudo guardar el estado.", "TriangleAlert"); return; }
    setTick((t) => t + 1);
  };
  const cycle = (c: Commit) => setStatus(c, ORDER[(ORDER.indexOf(c.status) + 1) % ORDER.length]);

  return (
    <Card pad={20}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SectionTitle icon="ListChecks" sub={isFacil ? "Tocá el estado para actualizarlo entre sesiones" : "El estado lo actualiza el facilitador"}>Compromisos del equipo</SectionTitle>
        </div>
        <div style={{ textAlign: "right", flex: "none" }}>
          <div className="num" style={{ fontSize: "var(--t-xl)", fontWeight: 800, color: "var(--green)" }}>{pct}%</div>
          <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{counts.done}/{all.length} hechos</div>
        </div>
      </div>

      {/* Semáforo */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 4px" }}>
        {ORDER.map((s) => counts[s] > 0 && (
          <span key={s} style={{ fontSize: "var(--t-xs)", fontWeight: 700, color: META[s].c, background: META[s].bg, border: `1px solid color-mix(in srgb, ${META[s].c} 30%, transparent)`, borderRadius: "var(--r-full)", padding: "3px 10px", display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Icon name={META[s].i} size={12} /> {counts[s]} {META[s].l.toLowerCase()}
          </span>
        ))}
      </div>
      <div style={{ height: 6, borderRadius: 99, background: "var(--line)", overflow: "hidden", margin: "8px 0 4px" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--green)", transition: "width .3s var(--ease)" }} />
      </div>

      {/* Por loop */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 14 }}>
        {groups.map((g) => (
          <div key={g.init.id}>
            <div className="eyebrow" style={{ marginBottom: 7, display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="Target" size={12} style={{ color: "var(--green)" }} /> {g.init.title}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {g.commits.map((c, i) => {
                const m = META[c.status];
                const key = `${c.init.id}:${c.text}`;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", background: "var(--card-2)", border: "1px solid var(--line)", borderLeft: `3px solid ${m.c}`, borderRadius: "var(--r-md)" }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: "var(--t-sm)", lineHeight: 1.4, textDecoration: c.status === "done" ? "line-through" : "none", opacity: c.status === "done" ? 0.7 : 1 }}>{c.text}</span>
                    {c.who && <Pill color="var(--ink-2)" bg="var(--card)" icon="User">{c.who}</Pill>}
                    <button
                      onClick={() => isFacil && cycle(c)}
                      disabled={!isFacil || busy === key}
                      title={isFacil ? "Cambiar estado" : m.l}
                      style={{ flex: "none", fontSize: "var(--t-xs)", fontWeight: 700, color: m.c, background: m.bg, border: `1px solid color-mix(in srgb, ${m.c} 32%, transparent)`, borderRadius: "var(--r-full)", padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 5, cursor: isFacil ? "pointer" : "default" }}>
                      <Icon name={busy === key ? "Loader" : m.i} size={12} /> {m.l}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
