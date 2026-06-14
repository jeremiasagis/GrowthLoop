/* ============================================================
   Gamificación de Growthloop — se gamifica al EQUIPO (logro colectivo),
   sin ranking individual. Todo se deriva de datos que ya existen
   (sesiones, etapas, iniciativas, pulso, contrato/FODA), sin tablas nuevas.
   ============================================================ */

import { CYCLE_STAGES, normalizeStage, overallOf, type Initiative, type SessionLog, type Team } from "./data";

export interface Achievement { key: string; label: string; icon: string; desc: string; got: boolean; progress?: number; goal?: number }
export interface TeamLevel { idx: number; name: string; min: number; next: number | null }
export interface TeamProgress {
  xp: number;
  cycles: number;            // ciclos de mejora cerrados
  level: TeamLevel;
  toNext: number;            // XP que falta para el próximo nivel (0 si es el último)
  pct: number;               // 0-100 dentro del nivel actual
  streak: number;            // semanas/quincenas consecutivas con actividad
  cadenceDays: number;
  achievements: Achievement[];
  unlocked: Achievement[];
  mission: { label: string; tab?: string } | null;
}

const LEVELS: { name: string; min: number }[] = [
  { name: "Equipo en formación", min: 0 },
  { name: "Equipo que aprende", min: 300 },
  { name: "Equipo que mejora", min: 900 },
  { name: "Equipo de alto desempeño", min: 2000 },
  { name: "Equipo referente", min: 4000 },
];

const XP = { session: 40, stage: 120, cycle: 400, pulse: 30, foda: 60, contract: 60, objective: 40, exploration: 80 };

/** Etapas del ciclo completadas por una iniciativa (según su etapa actual / cierre). */
function stagesDone(i: Initiative): number {
  if (i.status === "done") return CYCLE_STAGES.length;
  const idx = CYCLE_STAGES.indexOf(normalizeStage(i.stage));
  return Math.max(0, idx); // las anteriores a la actual están completas
}

/** Racha: cantidad de ventanas de cadencia consecutivas (hasta hoy) con ≥1 sesión. */
function computeStreak(sessions: SessionLog[], cadenceDays: number, nowMs: number): number {
  const stamps = sessions.map((s) => (s.createdAt ? new Date(s.createdAt).getTime() : NaN)).filter((n) => !isNaN(n));
  if (!stamps.length) return 0;
  const win = cadenceDays * 86400000;
  // ¿La ventana actual (la que termina hoy) tiene actividad? Si no, la racha está rota.
  let streak = 0;
  for (let k = 0; ; k++) {
    const end = nowMs - k * win;
    const start = end - win;
    const hit = stamps.some((t) => t > start && t <= end);
    if (hit) streak++;
    else { if (k === 0) return 0; break; } // si la ventana actual no tiene, racha = 0
  }
  return streak;
}

export function teamProgress(team: Team, nowMs: number = Date.now()): TeamProgress {
  const sessions = team.sessions ?? [];
  const inits = team.initiatives ?? [];
  const data = team.data ?? {};
  // Un ciclo "cerrado" = la iniciativa terminó (done) o llegó a una decisión de
  // Aprendizaje (implementar/iterar/pivotar/pausar) aunque siga activa por iteración.
  const cycles = inits.filter((i) => i.status === "done" || !!i.data?.learn?.decision).length;
  const totalStages = inits.reduce((a, i) => a + stagesDone(i), 0);

  let xp = sessions.length * XP.session
    + totalStages * XP.stage
    + cycles * XP.cycle
    + (team.pulse?.length ?? 0) * XP.pulse;
  if (data.foda) xp += XP.foda;
  if (data.contract) xp += XP.contract;
  if (data.objective || (team.objectives ?? []).length) xp += XP.objective;
  if ((data as { explorationClosedAt?: string }).explorationClosedAt) xp += XP.exploration;

  // Nivel
  let li = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].min) li = i;
  const cur = LEVELS[li];
  const nextMin = li < LEVELS.length - 1 ? LEVELS[li + 1].min : null;
  const level: TeamLevel = { idx: li, name: cur.name, min: cur.min, next: nextMin };
  const toNext = nextMin != null ? Math.max(0, nextMin - xp) : 0;
  const pct = nextMin != null ? Math.round(((xp - cur.min) / (nextMin - cur.min)) * 100) : 100;

  const cadenceDays = data.cadence?.everyDays ?? 14;
  const streak = computeStreak(sessions, cadenceDays, nowMs);

  // Pulso: mejora del promedio (primero vs último)
  const pulseUp = (team.pulse?.length ?? 0) > 1 ? overallOf(team.pulse[team.pulse.length - 1]) - overallOf(team.pulse[0]) : 0;
  const allParticipated = sessions.length > 0; // placeholder hasta tener asistencia por sesión

  const A = (key: string, label: string, icon: string, desc: string, got: boolean, progress?: number, goal?: number): Achievement => ({ key, label, icon, desc, got, progress, goal });
  const achievements: Achievement[] = [
    A("foda", "Diagnóstico inicial", "Grid2x2", "Hicieron el FODA del equipo", !!data.foda),
    A("contract", "Contrato firmado", "Handshake", "Acordaron cómo trabajar juntos", !!data.contract),
    A("objective", "Norte definido", "Compass", "Cargaron su primer objetivo", !!(data.objective || (team.objectives ?? []).length)),
    A("explore", "Exploradores", "Telescope", "5 retros distintas de Exploración", uniqueExploreRetros(sessions) >= 5, uniqueExploreRetros(sessions), 5),
    A("firstbet", "Primera apuesta", "FlaskConical", "Diseñaron su primera prueba", inits.some((i) => !!(i.data?.proof?.betThen || i.data?.proof?.bets?.length))),
    A("following", "En la cancha", "Activity", "Hicieron seguimiento de una prueba", inits.some((i) => { const f = i.data?.follow; return !!(f && (f.signalLog?.length || f.decision || f.startedAt)); })),
    A("firstcycle", "Primer ciclo cerrado", "CircleCheck", "Completaron una mejora de punta a punta", cycles >= 1),
    A("threecycles", "En marcha", "Repeat", "Cerraron 3 ciclos de mejora", cycles >= 3, cycles, 3),
    A("resilient", "Aprenden y siguen", "RefreshCw", "Iteraron o pivotaron una variable", inits.some((i) => ["iterate", "pivot"].includes(i.data?.learn?.decision ?? ""))),
    A("library", "Biblioteca viva", "Library", "Guardaron 5 aprendizajes en la biblioteca", (data.library?.length ?? 0) >= 5, data.library?.length ?? 0, 5),
    A("streak4", "Constancia", "Flame", `4 ${cadenceDays <= 7 ? "semanas" : "quincenas"} seguidas`, streak >= 4, streak, 4),
    A("pulseup", "Clima en alza", "TrendingUp", "El pulso del equipo subió +10", pulseUp >= 10),
    A("sessions10", "Ritmo", "Activity", "10 sesiones realizadas", sessions.length >= 10, sessions.length, 10),
    A("together", "En equipo", "Users", "Participaron de sesiones en vivo", allParticipated),
  ];
  const unlocked = achievements.filter((a) => a.got);

  // Misión actual: la primera acción pendiente del recorrido.
  let mission: TeamProgress["mission"] = null;
  if (!data.foda) mission = { label: "Hagan el FODA del equipo", tab: "exploracion" };
  else if (!(data.objective || (team.objectives ?? []).length)) mission = { label: "Definí el primer objetivo", tab: "objetivos" };
  else if (!inits.length) mission = { label: "Creen la primera iniciativa", tab: "seguimiento" };
  else if (streak === 0) mission = { label: "Retomen el ritmo: abran una sesión", tab: "seguimiento" };
  else {
    const active = inits.find((i) => i.status === "active");
    if (active) mission = { label: `Avancen "${active.title}" en su etapa actual`, tab: "seguimiento" };
  }

  return { xp, cycles, level, toNext, pct, streak, cadenceDays, achievements, unlocked, mission };
}

function uniqueExploreRetros(sessions: SessionLog[]): number {
  const EXPLORE = new Set(["explore", "foda", "madsadglad", "oneword", "timeline", "balloon", "teamradar", "sailboat", "circles", "relationships"]);
  return new Set(sessions.filter((s) => EXPLORE.has(s.stage)).map((s) => s.retro)).size;
}
