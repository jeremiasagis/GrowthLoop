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
    id: "exploration-foda", name: "FODA del equipo", stage: "exploration", category: "classic",
    description: "Fortalezas, Oportunidades, Debilidades y Amenazas en una matriz 2×2.",
    purpose: "El diagnóstico clásico: cada miembro aporta en los cuatro cuadrantes en anónimo, el facilitador revela y la matriz queda guardada en el equipo.",
    duration: 25, minDuration: 15, maxDuration: 40, anonymous: true, asyncAvailable: true, sensitive: false, recommended: true,
    phases: [
      { name: "Escritura anónima en los 4 cuadrantes", minutes: 8 },
      { name: "Reveal de la matriz" },
      { name: "Conversación y cierre", minutes: 10 },
    ],
    sessionType: "foda", entryStep: "cards", implemented: true,
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
    id: "focus-where-is-the-block", name: "¿Dónde se traba?", stage: "focus", category: "growthloop",
    description: "Embudo adaptado a la variable: en qué etapa exacta se concentra la traba.",
    purpose: "El facilitador adapta el embudo a la variable elegida (etapas editables), el equipo carga observaciones anónimas por etapa, vota la etapa crítica (una elección), se profundiza solo ahí y se formula la traba hasta que el equipo la valida.",
    duration: 30, minDuration: 20, maxDuration: 45, anonymous: true, asyncAvailable: true, sensitive: false, recommended: true,
    phases: [
      { name: "Embudo específico (etapas editables)", minutes: 3 },
      { name: "Carga de observaciones anónimas", minutes: 8 },
      { name: "Votación de etapa crítica (una elección)", minutes: 3 },
      { name: "Profundización en la etapa más votada", minutes: 10 },
      { name: "Formulación de la traba + validación 👍/✋", minutes: 6 },
    ],
    sessionType: "whereblock", entryStep: "wbsetup", implemented: true,
  },
  {
    id: "focus-why-is-it-happening", name: "¿Por qué está pasando?", stage: "focus", category: "growthloop",
    description: "De la traba a la causa raíz: causas anónimas, votación y árbol de causas.",
    purpose: "Buscamos por qué está pasando, no quién tiene la culpa. Causas anónimas, agrupación, votación con 3 puntos, árbol de causas en cadena (máx 3 niveles) y validación de la causa raíz. Incluye protocolo para cuando la cadena apunta al líder.",
    duration: 35, minDuration: 25, maxDuration: 50, anonymous: true, asyncAvailable: false, sensitive: false, recommended: true,
    phases: [
      { name: "Encuadre (causas, no culpas)", minutes: 1 },
      { name: "Causas individuales anónimas", minutes: 5 },
      { name: "Agrupación silenciosa", minutes: 3 },
      { name: "Votación · 3 puntos por miembro", minutes: 3 },
      { name: "Árbol de causas (¿y por qué pasa eso?) ×3", minutes: 10 },
      { name: "Validación de causa raíz: Sí / Parcialmente / No", minutes: 3 },
    ],
    sessionType: "whyhappening", implemented: false,
  },
  {
    id: "focus-impact-frequency", name: "Impacto y frecuencia", stage: "focus", category: "growthloop",
    description: "Matriz gravedad × frecuencia para elegir qué traba priorizar.",
    purpose: "Cuando hay varias trabas y el equipo no sabe cuál atacar: cada miembro evalúa frecuencia y gravedad en anónimo, la plataforma arma la matriz 2×2 y el debate se concentra en la zona alto-alto.",
    duration: 25, minDuration: 15, maxDuration: 35, anonymous: true, asyncAvailable: true, sensitive: false, recommended: false,
    note: "Usar cuando hay múltiples trabas y el equipo no sabe cuál priorizar",
    phases: [
      { name: "Lista de problemas (manual o de sesiones previas)", minutes: 3 },
      { name: "Evaluación anónima: frecuencia y gravedad", minutes: 5 },
      { name: "Matriz 2×2 automática", minutes: 8 },
      { name: "Debate de los candidatos alto-alto", minutes: 7 },
      { name: "Elección (1-2 problemas)", minutes: 2 },
    ],
    sessionType: "impactfreq", implemented: false,
  },
  {
    id: "focus-client-voice", name: "La voz del cliente", stage: "focus", category: "growthloop",
    description: "Contrastar lo que el equipo cree del cliente con el feedback real.",
    purpose: "Para variables de entregas o servicio: percepciones internas anónimas (qué valora, qué le molesta, qué nunca dijo), contraste con feedback real si existe (✅/❌/❓) o diseño de cómo conseguirlo, y síntesis de la brecha.",
    duration: 30, minDuration: 20, maxDuration: 45, anonymous: true, asyncAvailable: false, sensitive: false, recommended: false,
    note: "Usar cuando la variable tiene que ver con entregas o servicio al cliente",
    phases: [
      { name: "Identificación del cliente", minutes: 3 },
      { name: "Percepción interna anónima (3 preguntas)", minutes: 7 },
      { name: "Contraste con feedback real (o tarea de conseguirlo)", minutes: 10 },
      { name: "Síntesis de la brecha", minutes: 5 },
    ],
    sessionType: "clientvoice", implemented: false,
  },
  {
    id: "focus-fishbone", name: "Fishbone / Ishikawa", stage: "focus", category: "classic",
    description: "Análisis visual de causa raíz organizado por categorías.",
    purpose: "Mapear las causas posibles de la traba en categorías (Personas, Procesos, Herramientas, Entorno) para encontrar patrones sistemáticos. Alternativa visual al árbol de causas cuando hay muchas causas posibles que organizar.",
    duration: 35, minDuration: 25, maxDuration: 50, anonymous: false, asyncAvailable: false, sensitive: false, recommended: true,
    phases: [
      { name: "Presentación del diagrama (categorías editables)", minutes: 2 },
      { name: "Lluvia de causas por categoría", minutes: 10 },
      { name: "Votación de espina crítica (una elección)", minutes: 3 },
      { name: "Profundización en la espina crítica", minutes: 10 },
      { name: "Causa principal formulada + validación", minutes: 5 },
      { name: "Síntesis del diagrama completo", minutes: 5 },
    ],
    sessionType: "fishbone", implemented: false,
  },
  {
    id: "focus-perfection-game", name: "Perfection Game", stage: "focus", category: "classic",
    description: "¿En qué número estamos y qué falta para llegar al 10?",
    purpose: "Evaluar el estado actual del equipo en la variable y definir concretamente qué faltaría para llegar al ideal. Genera conversación concreta sobre la brecha a cerrar; los factores más mencionados quedan como causas candidatas.",
    duration: 25, minDuration: 15, maxDuration: 35, anonymous: true, asyncAvailable: true, sensitive: false, recommended: false,
    phases: [
      { name: "Encuadre con la variable visible", minutes: 2 },
      { name: "Puntuación individual anónima 1-10", minutes: 3 },
      { name: "Reveal: promedio, rango y dispersión", minutes: 2 },
      { name: "¿Qué tendría que pasar para subir 2 puntos?", minutes: 10 },
      { name: "Síntesis: factores → causas candidatas", minutes: 5 },
    ],
    sessionType: "perfection", implemented: false,
  },
  {
    id: "focus-opposite-pairs", name: "Pares de Opuestos", stage: "focus", category: "classic",
    description: "Hacer visibles las tensiones y contradicciones sistémicas del equipo.",
    purpose: "Cuando la causa raíz no es lineal sino paradójica: el equipo quiere X pero hace lo contrario. Cada par se evalúa con dos puntos (hoy vs. ideal) y la conversación se centra en la brecha más grande — incluso en qué le conviene al equipo del extremo actual.",
    duration: 30, minDuration: 20, maxDuration: 40, anonymous: false, asyncAvailable: true, sensitive: false, recommended: false,
    phases: [
      { name: "Definición de pares (sugeridos o propios, máx 3)", minutes: 3 },
      { name: "Evaluación individual: HOY (azul) e IDEAL (verde)", minutes: 8 },
      { name: "Reveal comparativo superpuesto", minutes: 5 },
      { name: "Conversación sobre la tensión mayor", minutes: 10 },
      { name: "Síntesis: tensión + hipótesis de causa", minutes: 4 },
    ],
    sessionType: "opposites", implemented: false,
  },
  {
    id: "focus-service-design", name: "Service Design Retro", stage: "focus", category: "classic",
    description: "El journey del cliente paso a paso: dónde se rompe la experiencia.",
    purpose: "Para variables de entregas o servicio: mapear el recorrido completo del cliente (4-8 pasos), analizar cada paso (acción, emoción, fricción, fortaleza), votar el punto crítico y formular la causa de la fricción.",
    duration: 40, minDuration: 30, maxDuration: 60, anonymous: false, asyncAvailable: false, sensitive: false, recommended: false,
    phases: [
      { name: "Cliente + construcción del journey (4-8 pasos)", minutes: 5 },
      { name: "Análisis por paso: acción · emoción · fricción · fortaleza", minutes: 15 },
      { name: "Votación del punto crítico (una elección)", minutes: 5 },
      { name: "Profundización en el punto crítico", minutes: 10 },
      { name: "Síntesis del hallazgo + validación", minutes: 5 },
    ],
    sessionType: "journey", implemented: false,
  },
  {
    id: "focus-stacey-matrix", name: "Matriz de Stacey", stage: "focus", category: "classic",
    description: "¿El problema es simple, complicado, complejo o caótico?",
    purpose: "Antes de diseñar una solución, clasificar la complejidad del problema (acuerdo × certeza técnica). Evita aplicar soluciones simples a problemas complejos o viceversa, y sugiere el enfoque correcto para Ideación.",
    duration: 25, minDuration: 15, maxDuration: 35, anonymous: false, asyncAvailable: false, sensitive: false, recommended: false,
    phases: [
      { name: "Presentación de la matriz (4 zonas)", minutes: 3 },
      { name: "Posicionamiento individual anónimo", minutes: 5 },
      { name: "Reveal + centroide + zona ganadora", minutes: 3 },
      { name: "Conversación según la zona", minutes: 10 },
      { name: "Implicancia para Ideación", minutes: 4 },
    ],
    sessionType: "stacey", implemented: false,
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
