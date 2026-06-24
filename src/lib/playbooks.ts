/* ============================================================
   Loop Playbooks (PLAN-PRODUCTO · Pilar 1 / §5).
   Recetas precargadas: el equipo elige un objetivo y el loop nace
   con el camino de retros por etapa, la señal sugerida y el seed
   de Norte ya puestos. Convierte la hoja en blanco en un playbook.
   Set de lanzamiento: 5 con señal medible y obvia + Express + A medida.
   ============================================================ */

export interface PlaybookStep {
  stage: string;   // "exploration" | "focus" | "ideation" | "follow" | "learn"
  retroId: string; // retro primaria sugerida para esa etapa
}

export interface LoopPlaybook {
  key: string;
  name: string;
  icon: string;
  symptom: string;       // "¿qué le pasa a tu equipo?" — la puerta de entrada
  title: string;         // nombre por defecto del loop
  objective: string;     // descripción/objetivo por defecto
  signal: { metric: string };
  seed: { causes: string[]; bet: { if: string; then: string; signal: string } };
  path: PlaybookStep[];
}

export const LOOP_PLAYBOOKS: LoopPlaybook[] = [
  {
    key: "entregas",
    name: "Entregas y calidad",
    icon: "PackageCheck",
    symptom: "Nos atrasamos o las entregas vuelven con problemas",
    title: "Reducir entregas tardías",
    objective: "Bajar el % de entregas fuera de plazo y el retrabajo este trimestre.",
    signal: { metric: "% de entregas a tiempo" },
    seed: {
      causes: ["Priorización poco clara", "Dependencias externas", "Estimaciones optimistas", "Interrupciones frecuentes"],
      bet: { if: "fijamos un cierre de alcance 48 h antes de cada entrega", then: "menos entregas se atrasan", signal: "% de entregas a tiempo" },
    },
    path: [
      { stage: "focus", retroId: "focus-where-is-the-block" },
      { stage: "ideation", retroId: "ideation-bet-design" },
      { stage: "follow", retroId: "follow-how-are-we-doing" },
      { stage: "learn", retroId: "learn-cycle-close" },
    ],
  },
  {
    key: "comunicacion",
    name: "Comunicación interna",
    icon: "MessagesSquare",
    symptom: "Hay malentendidos, repreguntas o info que no llega",
    title: "Mejorar la comunicación del equipo",
    objective: "Que la información clave llegue clara y a tiempo a todos.",
    signal: { metric: "Pulso de Comunicación (radar)" },
    seed: {
      causes: ["Demasiados canales", "Reuniones poco efectivas", "Decisiones sin documentar"],
      bet: { if: "documentamos cada decisión en un solo lugar", then: "bajan los malentendidos", signal: "repreguntas por semana" },
    },
    path: [
      { stage: "exploration", retroId: "exploration-relationships" },
      { stage: "focus", retroId: "focus-opposite-pairs" },
      { stage: "ideation", retroId: "ideation-bet-design" },
      { stage: "follow", retroId: "follow-how-are-we-doing" },
      { stage: "learn", retroId: "learn-cycle-close" },
    ],
  },
  {
    key: "cliente",
    name: "Relación con el cliente",
    icon: "Handshake",
    symptom: "El cliente se queja o la experiencia se rompe en algún punto",
    title: "Mejorar la relación con el cliente",
    objective: "Subir la satisfacción del cliente y bajar los reclamos.",
    signal: { metric: "NPS / reclamos por mes" },
    seed: {
      causes: ["Expectativas no alineadas", "Demoras en la respuesta", "Falta de visibilidad del estado"],
      bet: { if: "contrastamos lo que creemos del cliente con su feedback real", then: "cerramos la brecha", signal: "NPS / reclamos" },
    },
    path: [
      { stage: "focus", retroId: "focus-client-voice" },
      { stage: "ideation", retroId: "ideation-bet-design" },
      { stage: "follow", retroId: "follow-how-are-we-doing" },
      { stage: "learn", retroId: "learn-cycle-close" },
    ],
  },
  {
    key: "eficiencia",
    name: "Eficiencia / retrabajo",
    icon: "RefreshCw",
    symptom: "Rehacemos cosas o perdemos tiempo en lo mismo",
    title: "Reducir el retrabajo",
    objective: "Bajar las veces que algo vuelve para rehacerse.",
    signal: { metric: "% de tareas reabiertas" },
    seed: {
      causes: ["Requisitos ambiguos", "Revisión tardía", "Definición de 'listo' poco clara"],
      bet: { if: "acordamos una definición de 'listo' y la chequeamos antes de cerrar", then: "menos cosas vuelven", signal: "% de tareas reabiertas" },
    },
    path: [
      { stage: "focus", retroId: "focus-why-is-it-happening" },
      { stage: "ideation", retroId: "ideation-bet-design" },
      { stage: "follow", retroId: "follow-how-are-we-doing" },
      { stage: "learn", retroId: "learn-cycle-close" },
    ],
  },
  {
    key: "clima",
    name: "Clima y motivación",
    icon: "Thermometer",
    symptom: "El equipo está desmotivado o el clima bajó",
    title: "Mejorar el clima del equipo",
    objective: "Subir el clima y la motivación del equipo de forma sostenida.",
    signal: { metric: "Pulso general del equipo" },
    seed: {
      causes: ["Carga de trabajo despareja", "Falta de reconocimiento", "Poca claridad de rumbo"],
      bet: { if: "hacemos un ritual de reconocimiento semanal", then: "mejora el clima", signal: "pulso general" },
    },
    path: [
      { stage: "exploration", retroId: "exploration-team-radar" },
      { stage: "focus", retroId: "focus-why-is-it-happening" },
      { stage: "ideation", retroId: "ideation-bet-design" },
      { stage: "follow", retroId: "follow-team-radar" },
      { stage: "learn", retroId: "learn-cycle-close" },
    ],
  },
];

export function playbookByKey(key?: string): LoopPlaybook | undefined {
  return key ? LOOP_PLAYBOOKS.find((p) => p.key === key) : undefined;
}
