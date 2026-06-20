/* ============================================================
   Madurez de mejora continua (estilo CMM). Mide en qué prácticas
   el equipo es maduro —no puntos vacíos— a partir de datos que ya
   existen, y dice cuál es la PRÓXIMA práctica a desarrollar.
   6 capacidades, cada una con nivel 0-4.
   ============================================================ */

import { teamProgress } from "./gamification";
import type { Team } from "./data";

export interface MaturityDim {
  key: string; label: string; icon: string;
  level: number;      // 0..4
  why: string;        // estado actual, en una frase
  next: string;       // qué falta para el próximo nivel ("" si ya es 4)
}
export interface CIMaturity {
  dims: MaturityDim[];
  overall: number;        // 0..4 (promedio)
  overallLabel: string;
  weakest: MaturityDim;   // la capacidad con menor nivel (próxima a trabajar)
}

const OVERALL = ["Incipiente", "En formación", "En práctica", "Consolidada", "Referente"];
const MAX = 4;

/** Nivel = cantidad de hitos alcanzados en orden (el primer false corta). */
function levelFrom(milestones: boolean[]): number {
  let n = 0;
  for (const ok of milestones) { if (!ok) break; n++; }
  return Math.min(MAX, n);
}

export function ciMaturity(team: Team): CIMaturity {
  const inits = team.initiatives ?? [];
  const data = team.data ?? {};
  const has = (fn: (i: typeof inits[number]) => boolean) => inits.filter(fn).length;

  // Diagnóstico con datos.
  const exploredAny = !!data.foda || (team.sessions ?? []).some((s) => s.stage === "exploration" || (s.retro ?? "").startsWith("exploration-"));
  const radar = (team.sessions ?? []).some((s) => (s.retro ?? "").includes("radar")) || (team.pulse?.length ?? 0) > 0;
  const causes = has((i) => !!i.data?.focus?.rootCause);
  const diag = levelFrom([exploredAny || radar, radar, causes >= 1, causes >= 2]);

  // Apuestas medibles.
  const bets = has((i) => !!(i.data?.proof?.betThen || i.data?.proof?.bets?.length));
  const withSignal = has((i) => !!(i.data?.proof?.signalMetric || i.data?.proof?.signal));
  const withTarget = has((i) => !!i.data?.proof?.signalTarget);
  const bet = levelFrom([bets >= 1, withSignal >= 1, withTarget >= 1, withTarget >= 2]);

  // Disciplina de seguimiento.
  const started = has((i) => { const f = i.data?.follow; return !!(f && (f.startedAt || f.signalLog?.length || f.signalNow)); });
  const measured = has((i) => { const f = i.data?.follow; return !!(f && (f.signalLog?.length || f.signalNow)); });
  const decided = has((i) => !!i.data?.follow?.decision);
  const follow = levelFrom([started >= 1, measured >= 1, decided >= 1, decided >= 2]);

  // Cierre de loops.
  const cycles = has((i) => i.status === "done" || !!i.data?.learn?.decision);
  const close = levelFrom([cycles >= 1, cycles >= 2, cycles >= 3, cycles >= 5]);

  // Aprendizaje institucional.
  const lib = data.library ?? [];
  const transfer = lib.filter((e) => e.transferable).length;
  const learn = levelFrom([lib.length >= 1, lib.length >= 5, transfer >= 1, transfer >= 3]);

  // Ritmo y constancia.
  const streak = teamProgress(team).streak;
  const rhythm = levelFrom([streak >= 1, streak >= 2, streak >= 4, streak >= 6]);

  const NEXT: Record<string, string[]> = {
    diag:   ["Hagan un diagnóstico: un FODA o un radar de clima.", "Midan el clima del equipo con un Radar.", "En un loop, lleguen a la causa raíz del problema.", "Repitan el análisis de causa en otro loop.", ""],
    bet:    ["Diseñen una apuesta medible en un loop.", "Definan la señal que van a mirar.", "Pónganle una meta concreta a esa señal.", "Sostengan apuestas con señal y meta en más de un loop.", ""],
    follow: ["Arranquen el seguimiento de una apuesta.", "Registren la señal medida.", "Tomen una decisión a partir de la señal (continuar/ajustar/detener).", "Hagan seguimiento medido en más de un loop.", ""],
    close:  ["Cierren su primer loop de punta a punta.", "Cierren un segundo loop.", "Lleguen a 3 loops cerrados.", "Lleguen a 5 loops cerrados.", ""],
    learn:  ["Guarden su primer aprendizaje en la biblioteca.", "Acumulen 5 aprendizajes.", "Marquen un aprendizaje como transferible.", "Tengan 3 aprendizajes transferibles.", ""],
    rhythm: ["Abran una sesión para arrancar el ritmo.", "Sostengan el ritmo 2 ventanas seguidas.", "Lleguen a 4 ventanas seguidas con actividad.", "Lleguen a 6 ventanas seguidas.", ""],
  };
  const WHY: Record<string, string[]> = {
    diag:   ["Todavía no hay diagnóstico.", "Hicieron un primer diagnóstico.", "Miden el clima del equipo.", "Llegan a la causa raíz de sus problemas.", "Diagnóstico con datos, consistente."],
    bet:    ["Las mejoras todavía no son apuestas.", "Diseñan apuestas.", "Sus apuestas tienen señal.", "Sus apuestas tienen señal y meta.", "Apuestas medibles, sostenidas."],
    follow: ["Todavía no hacen seguimiento.", "Arrancan el seguimiento.", "Miden la señal.", "Deciden a partir de la señal.", "Seguimiento disciplinado en varios loops."],
    close:  ["Todavía no cerraron un loop.", "Cerraron su primer loop.", "Cierran loops con regularidad.", "Tienen varios loops cerrados.", "Cierran loops de forma sostenida."],
    learn:  ["Todavía no capturan aprendizajes.", "Empiezan a guardar aprendizajes.", "Tienen una biblioteca activa.", "Identifican aprendizajes transferibles.", "Institucionalizan lo que aprenden."],
    rhythm: ["Sin ritmo todavía.", "Empiezan a tomar ritmo.", "Sostienen el ritmo.", "Ritmo constante.", "Constancia ejemplar."],
  };

  const mk = (key: string, label: string, icon: string, level: number): MaturityDim =>
    ({ key, label, icon, level, why: WHY[key][level], next: NEXT[key][level] });

  const dims: MaturityDim[] = [
    mk("diag", "Diagnóstico con datos", "Search", diag),
    mk("bet", "Apuestas medibles", "Lightbulb", bet),
    mk("follow", "Disciplina de seguimiento", "Activity", follow),
    mk("close", "Cierre de loops", "CircleCheck", close),
    mk("learn", "Aprendizaje institucional", "GraduationCap", learn),
    mk("rhythm", "Ritmo y constancia", "Flame", rhythm),
  ];

  const overall = dims.reduce((a, d) => a + d.level, 0) / dims.length;
  const weakest = dims.reduce((m, d) => (d.level < m.level ? d : m), dims[0]);
  return { dims, overall, overallLabel: OVERALL[Math.round(overall)], weakest };
}
