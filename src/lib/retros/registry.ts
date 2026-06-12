/* ============================================================
   Growthloop — Registry de retros por etapa
   ------------------------------------------------------------
   Fuente única de verdad de las retros disponibles. El selector
   de sesiones y el conductor (sala) leen de acá.
   - sessionType: tipo de sesión de la sala que la implementa.
   - entryStep: paso inicial dentro del flujo (para retros que
     viven dentro de un flujo más grande, ej: explore).
   - implemented: false ⇒ se muestra como "Próximamente".
   ============================================================ */

import type { CycleStage, DiagnosticModule } from "@/lib/data";

export interface RetroPhase {
  name: string;
  minutes?: number;
  note?: string;
}

export interface RetroDefinition {
  id: string;
  name: string;
  stage: CycleStage | DiagnosticModule;
  category: "growthloop" | "classic";
  description: string;        // una línea
  purpose: string;            // párrafo corto
  duration: number;           // minutos sugeridos
  minDuration: number;
  maxDuration: number;
  anonymous: boolean;
  asyncAvailable: boolean;
  sensitive: boolean;
  recommended: boolean;
  phases: RetroPhase[];
  note?: string;              // tip de uso para el facilitador
  sessionType: string;        // tipo de sesión en la sala
  entryStep?: string;         // paso inicial dentro del flujo
  implemented: boolean;
}

export const RETRO_REGISTRY: RetroDefinition[] = [
  // ══════════ EXPLORACIÓN · módulo de diagnóstico ══════════
  {
    id: "exploration-where-are-we", name: "¿Dónde estamos?", stage: "exploration", category: "growthloop",
    description: "La foto honesta del equipo: qué funciona, qué frena, qué nadie dice.",
    purpose: "Hacer visible lo que todos piensan y nadie dice. Escritura anónima en silencio, reveal simultáneo, agrupación y votación para priorizar tensiones.",
    duration: 30, minDuration: 20, maxDuration: 45, anonymous: true, asyncAvailable: true, sensitive: false, recommended: true,
    phases: [
      { name: "Escritura silenciosa (3 columnas, anónimo)", minutes: 7 },
      { name: "Reveal simultáneo" },
      { name: "Agrupación por clusters (facilitador)", minutes: 5 },
      { name: "Votación · 3 puntos por miembro", minutes: 5 },
      { name: "Lectura del ranking de tensiones", minutes: 5 },
    ],
    sessionType: "explore", entryStep: "cards", implemented: true,
  },
  {
    id: "exploration-why-we-exist", name: "¿Para qué existimos?", stage: "exploration", category: "growthloop",
    description: "Propósito del equipo: quién depende de nosotros y cómo mide nuestro trabajo.",
    purpose: "Clarificar el propósito y ver la dispersión de visiones. Escritura individual sin ver a los demás y reveal comparativo en columnas paralelas.",
    duration: 25, minDuration: 15, maxDuration: 35, anonymous: false, asyncAvailable: false, sensitive: false, recommended: false,
    phases: [
      { name: "Escritura individual (3 preguntas)", minutes: 8 },
      { name: "Reveal comparativo en columnas" },
      { name: "Conversación: ¿acuerdo o dispersión?", minutes: 10 },
      { name: "Decisión: propósito acordado o dispersión como variable", minutes: 5 },
    ],
    sessionType: "explore", entryStep: "purpose", implemented: true,
  },
  {
    id: "exploration-workflow", name: "¿Cómo fluye nuestro trabajo?", stage: "exploration", category: "growthloop",
    description: "Mapear el flujo real del trabajo e identificar dónde se traba.",
    purpose: "Ver el trabajo como un flujo de 4 etapas (entrada, arranque, ejecución, entrega), juntar señales anónimas por etapa y votar la etapa crítica.",
    duration: 35, minDuration: 25, maxDuration: 45, anonymous: true, asyncAvailable: true, sensitive: false, recommended: false,
    phases: [
      { name: "Tarjetas anónimas por etapa del flujo", minutes: 8 },
      { name: "Reveal por etapa" },
      { name: "Votación de etapa crítica (una por miembro)", minutes: 3 },
      { name: "Debate sobre la etapa más votada", minutes: 10 },
    ],
    sessionType: "explore", entryStep: "flow", implemented: true,
  },
  {
    id: "exploration-relationships", name: "¿Cómo nos relacionamos?", stage: "exploration", category: "growthloop",
    description: "La dinámica humana: comunicación, confianza y vínculos reales.",
    purpose: "Explorar los vínculos con cuidado: preguntas anónimas, el facilitador lee en voz alta sin proyectar, resonancia voluntaria y cierre con una palabra.",
    duration: 30, minDuration: 25, maxDuration: 45, anonymous: true, asyncAvailable: false, sensitive: true, recommended: false,
    phases: [
      { name: "Encuadre del facilitador", minutes: 3 },
      { name: "3 preguntas anónimas sobre vínculos", minutes: 8 },
      { name: "Lectura en voz alta (sin pantalla)", minutes: 8 },
      { name: "Resonancia voluntaria", minutes: 6 },
      { name: "Cierre: una palabra por miembro", minutes: 3 },
    ],
    sessionType: "relationships", entryStep: "frame", implemented: true,
  },
  {
    id: "exploration-mad-sad-glad", name: "Mad Sad Glad", stage: "exploration", category: "classic",
    description: "El clima emocional del equipo: qué enoja, qué entristece, qué alegra.",
    purpose: "Registrar el clima emocional con tres columnas simples. Escritura anónima, reveal simultáneo, agrupación y conversación sobre patrones.",
    duration: 20, minDuration: 15, maxDuration: 30, anonymous: true, asyncAvailable: true, sensitive: false, recommended: true,
    phases: [
      { name: "Escritura silenciosa: 😤 Mad / 😔 Sad / 😊 Glad", minutes: 7 },
      { name: "Reveal simultáneo por columna" },
      { name: "Agrupación", minutes: 5 },
      { name: "Lectura colectiva", minutes: 5 },
      { name: "Conversación sobre patrones", minutes: 5 },
    ],
    sessionType: "madsadglad", implemented: true,
  },
  {
    id: "exploration-one-word", name: "One Word", stage: "exploration", category: "classic",
    description: "Una sola palabra por miembro: cómo está cada uno con el equipo hoy.",
    purpose: "Chequeo ultraliviano del clima. Cada uno aporta una palabra, se revela como nube de palabras y se conversa solo si alguien quiere.",
    duration: 10, minDuration: 5, maxDuration: 15, anonymous: false, asyncAvailable: true, sensitive: false, recommended: false,
    note: "Ideal como apertura o cierre de cualquier sesión",
    phases: [
      { name: "Escritura individual (una palabra)", minutes: 2 },
      { name: "Reveal: nube de palabras" },
      { name: "Lectura y reflexión voluntaria", minutes: 5 },
    ],
    sessionType: "oneword", entryStep: "word", implemented: true,
  },
  {
    id: "exploration-timeline", name: "Timeline", stage: "exploration", category: "classic",
    description: "La historia del equipo: eventos y emociones sobre una línea de tiempo.",
    purpose: "Reconstruir el período juntos: hitos sobre la línea, emociones debajo, y conversar sobre los momentos donde el equipo vivió cosas distintas.",
    duration: 40, minDuration: 30, maxDuration: 60, anonymous: false, asyncAvailable: false, sensitive: false, recommended: false,
    note: "Ideal para equipos con historia acumulada",
    phases: [
      { name: "Construcción del eje temporal", minutes: 3 },
      { name: "Carga individual: eventos + emociones", minutes: 10 },
      { name: "Reveal y lectura colectiva", minutes: 10 },
      { name: "Conversación sobre patrones", minutes: 12 },
      { name: "Síntesis del facilitador", minutes: 5 },
    ],
    sessionType: "timeline", entryStep: "build", implemented: true,
  },
  {
    id: "exploration-hot-air-balloon", name: "Hot Air Balloon", stage: "exploration", category: "classic",
    description: "Qué nos eleva, qué nos pesa y qué tormentas vemos venir.",
    purpose: "Metáfora del globo: aire caliente (impulso), sacos de arena (lastre) y nubes de tormenta (amenazas externas). Anónimo, con votación de prioridades.",
    duration: 30, minDuration: 20, maxDuration: 40, anonymous: true, asyncAvailable: true, sensitive: false, recommended: true,
    phases: [
      { name: "Presentación del globo", minutes: 2 },
      { name: "Escritura silenciosa en 3 secciones", minutes: 8 },
      { name: "Reveal simultáneo" },
      { name: "Agrupación", minutes: 5 },
      { name: "Votación · 3 puntos por miembro", minutes: 3 },
      { name: "Conversación sobre prioridades", minutes: 7 },
    ],
    sessionType: "balloon", implemented: true,
  },
  {
    id: "exploration-team-radar", name: "Radar del Equipo", stage: "exploration", category: "classic",
    description: "Puntuar 1-5 las dimensiones del equipo y ver el radar promedio.",
    purpose: "Generar una línea de base medible. Dimensiones editables por el facilitador, puntuación anónima 1-5, radar promedio con rango y dispersión.",
    duration: 25, minDuration: 15, maxDuration: 35, anonymous: true, asyncAvailable: true, sensitive: false, recommended: true,
    note: "Genera línea de base para medir evolución",
    phases: [
      { name: "Configuración de dimensiones (4 a 10)", minutes: 3 },
      { name: "Puntuación individual anónima 1-5", minutes: 5 },
      { name: "Reveal del radar promedio + dispersión" },
      { name: "Lectura colectiva: bajas, altas, dispersas", minutes: 7 },
      { name: "Conversación + variables candidatas", minutes: 8 },
    ],
    sessionType: "teamradar", entryStep: "setup", implemented: true,
  },
  {
    id: "exploration-sailboat", name: "Sailboat", stage: "exploration", category: "classic",
    description: "Viento, ancla, rocas e isla: qué nos impulsa y qué nos puede hundir.",
    purpose: "Metáfora del velero para ver impulso, frenos, riesgos y meta en un solo tablero. Anónimo, con votación de prioridades.",
    duration: 30, minDuration: 20, maxDuration: 40, anonymous: true, asyncAvailable: true, sensitive: false, recommended: true,
    phases: [
      { name: "Presentación del velero", minutes: 2 },
      { name: "Escritura silenciosa en 4 secciones", minutes: 8 },
      { name: "Reveal simultáneo" },
      { name: "Agrupación", minutes: 5 },
      { name: "Votación · 3 puntos por miembro", minutes: 3 },
      { name: "Conversación: anclas, rocas y viento", minutes: 7 },
    ],
    sessionType: "sailboat", implemented: true,
  },
  {
    id: "exploration-circles-soup", name: "Circles & Soup", stage: "exploration", category: "classic",
    description: "Qué controlamos, en qué influimos y qué es sopa (no depende de nosotros).",
    purpose: "Clasificar las preocupaciones en círculos de control, influencia y entorno, para dejar de gastar energía en lo que no se puede cambiar.",
    duration: 30, minDuration: 25, maxDuration: 45, anonymous: false, asyncAvailable: false, sensitive: false, recommended: false,
    note: "Ideal cuando el equipo siente que todo lo que los traba viene de afuera",
    phases: [
      { name: "Presentación de los 3 círculos", minutes: 3 },
      { name: "Lluvia de preocupaciones", minutes: 5 },
      { name: "Clasificación colectiva por círculo", minutes: 10 },
      { name: "Conversación sobre el círculo de control", minutes: 7 },
      { name: "Síntesis: variables candidatas", minutes: 5 },
    ],
    sessionType: "circles", entryStep: "brain", implemented: true,
  },

  {
    id: "exploration-close", name: "Cierre de Exploración → mapa de mejoras", stage: "exploration", category: "growthloop",
    description: "Consolidar lo descubierto, priorizar en equipo y generar el mapa de mejoras.",
    purpose: "La plataforma junta las variables candidatas de todas las retros de Exploración, el equipo vota con 3 puntos en anónimo, y el resultado se convierte en el mapa: la variable 1 arranca como iniciativa activa y el resto queda en cola.",
    duration: 20, minDuration: 15, maxDuration: 30, anonymous: true, asyncAvailable: false, sensitive: false, recommended: false,
    note: "Hacela cuando sientan que ya exploraron suficiente",
    phases: [
      { name: "Variables candidatas consolidadas (con frecuencia)", minutes: 5 },
      { name: "Priorización final · 3 puntos por miembro", minutes: 5 },
      { name: "Mapa de mejoras generado + ajuste del facilitador", minutes: 5 },
      { name: "Confirmación: variable 1 activa, resto en cola", minutes: 3 },
    ],
    sessionType: "expclose", entryStep: "consolidate", implemented: true,
  },

  // ══════════ CICLO DE MEJORA ══════════
  {
    id: "objectives-tensions", name: "Tensiones y causas", stage: "objectives", category: "growthloop",
    description: "Arrancar el ciclo: tensiones de la variable elegida y sus causas posibles.",
    purpose: "Aterrizar la variable a trabajar: qué tensiones la rodean, qué señales hay y qué causas posibles pasan a Foco para priorizar.",
    duration: 30, minDuration: 20, maxDuration: 45, anonymous: true, asyncAvailable: true, sensitive: false, recommended: true,
    phases: [
      { name: "Escritura anónima de señales", minutes: 7 },
      { name: "Reveal + agrupación + votación", minutes: 10 },
      { name: "Lluvia de causas posibles", minutes: 8 },
    ],
    sessionType: "explore", entryStep: "cards", implemented: true,
  },
  {
    id: "focus-impact-effort", name: "Impacto / Esfuerzo", stage: "focus", category: "growthloop",
    description: "Priorizar las causas en un mapa único y elegir cuál atacar primero.",
    purpose: "Cada miembro ubica las causas en el mapa impacto/esfuerzo, el facilitador revela las coincidencias y el equipo elige la causa a trabajar.",
    duration: 25, minDuration: 15, maxDuration: 35, anonymous: true, asyncAvailable: false, sensitive: false, recommended: true,
    phases: [
      { name: "Puntuar cada causa en el mapa (anónimo)", minutes: 8 },
      { name: "Reveal de la matriz 2×2 con coincidencias" },
      { name: "Elegir la causa a trabajar", minutes: 8 },
    ],
    sessionType: "focus", implemented: true,
  },
  {
    id: "ideation-bet-design", name: "Diseño de la apuesta", stage: "ideation", category: "growthloop",
    description: "De la causa elegida a una apuesta concreta y medible (si / entonces).",
    purpose: "Lluvia de ideas anónima, priorización ICE, pre-mortem de riesgos y diseño de la apuesta con señal, meta, acciones y responsables.",
    duration: 40, minDuration: 30, maxDuration: 60, anonymous: true, asyncAvailable: true, sensitive: false, recommended: true,
    phases: [
      { name: "Lluvia de ideas (anónima)", minutes: 8 },
      { name: "Agrupación + ICE", minutes: 10 },
      { name: "Pre-mortem: qué podría fallar", minutes: 8 },
      { name: "Apuesta (si / entonces) + acciones", minutes: 10 },
      { name: "Compromiso del equipo", minutes: 4 },
    ],
    sessionType: "proof", implemented: true,
  },
  {
    id: "follow-checkin", name: "Check-in de la acción", stage: "follow", category: "growthloop",
    description: "¿Cómo viene la acción definida? Señal, avance y bloqueos.",
    purpose: "Mirar la apuesta en marcha: cómo viene la señal, qué acciones avanzaron, qué se trabó y qué decisión rápida hay que tomar.",
    duration: 15, minDuration: 10, maxDuration: 25, anonymous: false, asyncAvailable: true, sensitive: false, recommended: true,
    phases: [
      { name: "Estado de la señal", minutes: 5 },
      { name: "Avance de acciones y bloqueos", minutes: 7 },
      { name: "Decisión rápida", minutes: 3 },
    ],
    sessionType: "follow", implemented: false,
  },
  {
    id: "learn-cycle-close", name: "Cierre del ciclo", stage: "learn", category: "growthloop",
    description: "¿Funcionó lo que probamos? Aprendizajes y decisión de cierre.",
    purpose: "Mirar el resultado de la apuesta, reflexionar en privado, juntar aprendizajes del equipo y decidir: implementar, iterar o soltar.",
    duration: 30, minDuration: 20, maxDuration: 45, anonymous: true, asyncAvailable: false, sensitive: false, recommended: true,
    phases: [
      { name: "¿Funcionó? + dato logrado", minutes: 6 },
      { name: "Reflexión privada", minutes: 5 },
      { name: "Aprendizajes del equipo (anónimo)", minutes: 8 },
      { name: "Decisión: implementar / iterar / soltar", minutes: 8 },
    ],
    sessionType: "learn", implemented: true,
  },
];

export function retrosForStage(stage: string): RetroDefinition[] {
  return RETRO_REGISTRY.filter((r) => r.stage === stage);
}

export function retroById(id: string | undefined): RetroDefinition | undefined {
  return RETRO_REGISTRY.find((r) => r.id === id);
}
