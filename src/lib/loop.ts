/* ============================================================
   LoopThread — el "hilo" normalizado de un loop.
   Es la base de la capa de información (PLAN-TECNICO · WS1): en vez
   de leer claves sueltas de cada etapa, el expediente del loop, el
   tablero del equipo y la inteligencia leen este resumen único.
   Se DERIVA de initiatives.data ya guardado (backfill + futuro en
   una sola función pura), sin migración ni tocar finalizeSession.
   ============================================================ */

import type { Initiative, InitiativeData } from "./data";

export interface LoopThread {
  symptom?: string;   // el problema/síntoma que dio origen al loop
  rootCause?: string; // la causa raíz (etapa Analizar)
  bet?: { if?: string; then?: string; signalMetric?: string; signalTarget?: string }; // la apuesta (Diseñar)
  signal?: { before?: string; now?: string; delta?: number | null; metric?: string; target?: string }; // la señal (Probar)
  learning?: string;  // el aprendizaje clave (Aprender)
  decision?: string;  // la decisión de cierre (implement/iterate/pivot/pause)
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

  return { symptom, rootCause, bet, signal, learning, decision };
}
