/* ============================================================
   LoopThread — el "hilo" normalizado de un loop.
   Es la base de la capa de información (PLAN-TECNICO · WS1): en vez
   de leer claves sueltas de cada etapa, el expediente del loop, el
   tablero del equipo y la inteligencia leen este resumen único.
   Se DERIVA de initiatives.data ya guardado (backfill + futuro en
   una sola función pura), sin migración ni tocar finalizeSession.
   ============================================================ */

import type { Initiative, InitiativeData, Team } from "./data";
import { overallOf } from "./data";

export interface LoopThread {
  symptom?: string;   // el problema/síntoma que dio origen al loop
  rootCause?: string; // la causa raíz (etapa Analizar)
  bet?: { if?: string; then?: string; signalMetric?: string; signalTarget?: string }; // la apuesta (Diseñar)
  signal?: { before?: string; now?: string; delta?: number | null; metric?: string; target?: string }; // la señal (Probar)
  learning?: string;  // el aprendizaje clave (Aprender)
  decision?: string;  // la decisión de cierre (implement/iterate/pivot/pause)
  sustained?: string; // resultado de consolidación: ¿el cambio se sostuvo? (sustained/partial/reverted)
}

/** Parsea un valor de señal ("72%", "3,5", "80 entregas") a número, o null. */
export function parseSignal(v?: string): number | null {
  if (v == null) return null;
  const x = parseFloat(`${v}`.replace(/[^\d.,-]/g, "").replace(",", "."));
  return isNaN(x) ? null : x;
}

/** El primer/último valor de la señal y su delta, desde el signalLog. */
function signalFromLog(d: NonNullable<InitiativeData["follow"]>): LoopThread["signal"] | undefined {
  const log = d.signalLog ?? [];
  const metric = undefined; // la métrica vive en proof; se completa abajo
  if (!log.length) {
    return d.signalNow ? { now: d.signalNow, before: undefined, delta: null, metric } : undefined;
  }
  const before = log[0]?.value;
  const now = log[log.length - 1]?.value;
  const f = parseSignal(before), l = parseSignal(now);
  const delta = f != null && l != null ? Math.round((l - f) * 100) / 100 : null;
  return { before, now, delta, metric };
}

/** Computa el hilo normalizado de un loop a partir de su data acumulada. */
export function loopThread(init: Initiative): LoopThread {
  const d = init.data ?? {};
  const focus = d.focus ?? {};
  const proof = d.proof ?? {};
  const follow = d.follow ?? {};
  const learn = d.learn ?? {};
  const bet0 = proof.bets?.[0];

  const symptom = focus.blockFormulation
    ?? d.explore?.priority
    ?? focus.priorityProblems?.[0]
    ?? init.description
    ?? undefined;

  const rootCause = focus.rootCause ?? focus.cause ?? undefined;

  const betIf = proof.betIf ?? bet0?.betIf;
  const betThen = proof.betThen ?? bet0?.betThen;
  const signalMetric = proof.signalMetric ?? bet0?.signalMetric ?? follow.signalName;
  const signalTarget = proof.signalTarget ?? bet0?.signalTarget;
  const bet = (betIf || betThen || signalMetric)
    ? { if: betIf, then: betThen, signalMetric, signalTarget }
    : undefined;

  let signal = signalFromLog(follow);
  if (signal) signal = { ...signal, metric: signalMetric, target: signalTarget };
  else if (follow.current != null) {
    signal = {
      now: `${follow.current}${follow.unit ?? ""}`,
      target: signalTarget ?? (follow.target != null ? `${follow.target}${follow.unit ?? ""}` : undefined),
      delta: null, metric: signalMetric,
    };
  }

  const learning = learn.highlightedLearning
    ?? learn.learnings?.[0]
    ?? learn.narrative
    ?? learn.result
    ?? undefined;

  const decision = learn.decision ?? undefined;
  const sustained = d.consolidate?.outcome ?? undefined;

  return { symptom, rootCause, bet, signal, learning, decision, sustained };
}

const STOP = new Set("para porque como cuando donde tienen tiene hacer hace cada todo todos esta este esto entre desde sobre pero más menos muy con sin los las del que una uno unas unos por sus nos les más nuestra nuestro equipo".split(" "));
/** Aprendizajes pasados relacionados con un texto (compounding, B5). Match determinístico por palabras. */
export function relatedLearnings<T extends { text: string }>(library: T[], query: string, max = 3): T[] {
  const tok = (s: string) => (s.toLowerCase().match(/[a-záéíóúñ]+/g) ?? []).filter((w) => w.length > 3 && !STOP.has(w));
  const q = new Set(tok(query));
  if (!q.size) return [];
  return library
    .map((e) => ({ e, score: tok(e.text).filter((w) => q.has(w)).length }))
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.e);
}

/* ============================================================
   Señal automática INTERNA: la señal del loop se alimenta sola
   desde datos que la app ya tiene (clima del equipo, compromisos
   cumplidos), sin fuente externa ni carga manual de números.
   Todo termina en follow.signalLog —la única fuente de verdad—,
   así que el resto (hilo, gráfico, recomendación) no se toca.
   ============================================================ */

export type InternalSource = "pulse" | "commitments";

export const SIGNAL_SOURCE_LABEL: Record<InternalSource, string> = {
  pulse: "Clima del equipo",
  commitments: "Compromisos cumplidos",
};

export const SIGNAL_SOURCE_UNIT: Record<InternalSource, string> = {
  pulse: "/100",
  commitments: "% hechos",
};

/** Valor actual (0-100) de una fuente interna, o null si todavía no hay datos. */
export function internalSignalNow(team: Team, init: Initiative, source: InternalSource): number | null {
  if (source === "pulse") {
    const p = team.pulse?.[team.pulse.length - 1];
    return p ? overallOf(p) : null;
  }
  const acts = init.data?.follow?.actionStatus ?? [];
  if (!acts.length) return null;
  const done = acts.filter((a) => a.status === "done").length;
  return Math.round((done / acts.length) * 100);
}

/** Serie histórica {date,value} de una fuente interna (solo el clima tiene historia). */
export function internalSignalSeries(team: Team, source: InternalSource): { date: string; value: string }[] {
  if (source === "pulse") {
    return (team.pulse ?? []).filter((p) => p.date).map((p) => ({ date: p.date, value: `${overallOf(p)}` }));
  }
  return [];
}

/** signalLog re-sincronizado con la fuente interna, o null si no hay nada nuevo que agregar. */
export function syncedSignalLog(team: Team, init: Initiative): { date: string; value: string }[] | null {
  const src = init.data?.follow?.signalSource;
  if (!src) return null;
  const log = init.data?.follow?.signalLog ?? [];
  const dates = new Set(log.map((p) => p.date));
  let add: { date: string; value: string }[] = [];
  if (src === "pulse") {
    add = internalSignalSeries(team, "pulse").filter((p) => !dates.has(p.date));
  } else {
    const v = internalSignalNow(team, init, "commitments");
    const today = new Date().toISOString().slice(0, 10);
    if (v != null && !dates.has(today)) add = [{ date: today, value: `${v}` }];
  }
  if (!add.length) return null;
  return [...log, ...add].sort((a, b) => a.date.localeCompare(b.date));
}

/** ¿El loop está cerrado? (terminado o con una decisión de Aprendizaje). */
export function loopIsClosed(init: Initiative): boolean {
  return init.status === "done" || !!init.data?.learn?.decision;
}

/** ¿El loop movió su señal? (la métrica norte del producto). */
export function loopSignalMoved(init: Initiative): boolean {
  const s = loopThread(init).signal;
  return s?.delta != null && s.delta !== 0;
}

/** ¿La apuesta es medible? (tiene señal + meta + plazo). Para el nudge de calidad (B1). */
export function betQuality(init: Initiative): { ok: boolean; missing: string[] } {
  const p = init.data?.proof ?? {};
  const bet0 = p.bets?.[0];
  const has = (v?: string) => !!(v && `${v}`.trim());
  const missing: string[] = [];
  if (!has(p.signalMetric ?? bet0?.signalMetric)) missing.push("señal");
  if (!has(p.signalTarget ?? bet0?.signalTarget)) missing.push("meta");
  if (!has(p.deadline ?? bet0?.deadline)) missing.push("plazo");
  return { ok: missing.length === 0, missing };
}

/** Recomendación adaptativa según cómo se movió la señal (B2). Heurística, no prescriptiva. */
export function loopRecommendation(init: Initiative): { kind: "iterate" | "keep" | "implement"; title: string; text: string } | null {
  const s = loopThread(init).signal;
  const log = init.data?.follow?.signalLog ?? [];
  if (!s || !s.now) return null;
  const now = parseSignal(s.now);
  const target = parseSignal(s.target);
  // Sin movimiento tras varias mediciones → ajustar o pivotar.
  if (log.length >= 2 && (s.delta == null || s.delta === 0)) {
    return { kind: "iterate", title: "La señal no se mueve", text: "Varias mediciones sin cambio: quizá la apuesta no es la correcta. Considerá iterar (ajustarla) o pivotar (volver a la causa)." };
  }
  if (s.delta != null && s.delta !== 0) {
    // Llegó a la meta (en la dirección en que se viene moviendo) → cerrar implementando.
    const reached = target != null && now != null && ((s.delta > 0 && now >= target) || (s.delta < 0 && now <= target));
    if (reached) return { kind: "implement", title: "¡Llegaste a la meta!", text: "La señal alcanzó el objetivo. Es momento de cerrar el loop e implementar el cambio para que se sostenga." };
    return { kind: "keep", title: "La señal se está moviendo", text: "Vas en la dirección correcta. Seguí midiendo; cuando llegue a la meta, cerrá implementando." };
  }
  return null;
}
