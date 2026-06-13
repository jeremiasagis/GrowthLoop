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
    sessionType: "whyhappening", entryStep: "whframe", implemented: true,
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
    sessionType: "impactfreq", entryStep: "iflist", implemented: true,
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
    sessionType: "clientvoice", entryStep: "cvclient", implemented: true,
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
    sessionType: "fishbone", entryStep: "fbsetup", implemented: true,
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
    sessionType: "perfection", entryStep: "pgscore", implemented: true,
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
    sessionType: "opposites", entryStep: "oppairs", implemented: true,
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
    sessionType: "journey", entryStep: "sdsetup", implemented: true,
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
    sessionType: "stacey", entryStep: "stintro", implemented: true,
  },
  {
    id: "ideation-bet-design", name: "Diseño de la apuesta · flujo guiado", stage: "ideation", category: "growthloop",
    description: "Todo Ideación en una sesión: ideas, elección, pre-mortem y diseño de la prueba.",
    purpose: "El camino rápido todo-en-uno: lluvia de ideas anónima, priorización ICE, pre-mortem de riesgos y diseño de la apuesta con señal, meta, acciones y responsables. Las retros de abajo son las versiones modulares de cada paso.",
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
    id: "ideation-how-might-we", name: "¿Cómo podríamos?", stage: "ideation", category: "growthloop",
    description: "Lluvia de ideas anónima a partir de un ¿Cómo podríamos…? bien formulado.",
    purpose: "Abrir el abanico de ideas para atacar la causa raíz: formular el HMW, ideación silenciosa con timer, reveal simultáneo, lectura express, agrupación y votación. El top 3 pasa a ¿Cuál elegimos?.",
    duration: 30, minDuration: 20, maxDuration: 45, anonymous: true, asyncAvailable: true, sensitive: false, recommended: true,
    phases: [
      { name: "Formular el ¿Cómo podríamos…?", minutes: 5 },
      { name: "Ideación silenciosa (anónima)", minutes: 5 },
      { name: "Reveal simultáneo" },
      { name: "Lectura express (30s c/u)", minutes: 5 },
      { name: "Agrupación temática", minutes: 5 },
      { name: "Votación · 3 puntos → top 3", minutes: 3 },
    ],
    sessionType: "hmw", entryStep: "hmwframe", implemented: true,
  },
  {
    id: "ideation-which-do-we-choose", name: "¿Cuál elegimos?", stage: "ideation", category: "growthloop",
    description: "Elegir la idea a probar con matriz impacto/esfuerzo y desempate ICE.",
    purpose: "De las finalistas a una sola: matriz 2×2 impacto vs. esfuerzo, y si hay empate, desempate por ICE (impacto·confianza·facilidad). Queda la idea elegida con su justificación.",
    duration: 25, minDuration: 15, maxDuration: 35, anonymous: false, asyncAvailable: false, sensitive: false, recommended: true,
    phases: [
      { name: "Las finalistas a la vista", minutes: 3 },
      { name: "Matriz impacto / esfuerzo", minutes: 10 },
      { name: "Desempate ICE (si hace falta)", minutes: 7 },
      { name: "Confirmación de la elegida", minutes: 2 },
    ],
    sessionType: "ideachoose", entryStep: "icpresent", implemented: true,
  },
  {
    id: "ideation-what-could-fail", name: "¿Qué podría fallar?", stage: "ideation", category: "growthloop",
    description: "Pre-mortem: imaginar el fracaso para mitigar los riesgos antes de arrancar.",
    purpose: "Imaginar que la prueba ya fracasó y descubrir por qué: riesgos anónimos por categoría (ejecución, adopción, diseño, externo), votación y mitigaciones con responsable y fecha para el top 3.",
    duration: 25, minDuration: 15, maxDuration: 35, anonymous: true, asyncAvailable: false, sensitive: false, recommended: true,
    note: "Usar siempre antes de Diseño de la prueba",
    phases: [
      { name: "Encuadre del pre-mortem", minutes: 1 },
      { name: "Fracasos imaginados (anónimo)", minutes: 5 },
      { name: "Reveal + agrupar por categoría", minutes: 5 },
      { name: "Votación · top 3 riesgos", minutes: 2 },
      { name: "Mitigaciones (responsable + fecha)", minutes: 7 },
    ],
    sessionType: "premortem", entryStep: "pmframe", implemented: true,
  },
  {
    id: "ideation-experiment-design", name: "Diseño de la prueba", stage: "ideation", category: "growthloop",
    description: "La apuesta concreta: acción, señal, umbral y 3 filtros de validación.",
    purpose: "Convertir la idea en una prueba ejecutable: template de apuesta (si/entonces), acción, responsable, señal y umbral de éxito; 3 filtros obligatorios (observable, medible en plazo, depende del equipo) y compromiso de cada miembro.",
    duration: 30, minDuration: 20, maxDuration: 45, anonymous: false, asyncAvailable: false, sensitive: false, recommended: true,
    note: "Siempre la última retro de Ideación — obligatoria para cerrar la etapa",
    phases: [
      { name: "Contexto: causa, idea y riesgos", minutes: 2 },
      { name: "Template de la apuesta", minutes: 15 },
      { name: "3 filtros de validación", minutes: 5 },
      { name: "Confirmación colectiva", minutes: 3 },
    ],
    sessionType: "betdesign", entryStep: "bdcontext", implemented: true,
  },
  {
    id: "ideation-start-stop-continue", name: "Start · Stop · Continue", stage: "ideation", category: "classic",
    description: "Qué empezar, qué dejar y qué mantener — la forma más directa de definir acciones.",
    purpose: "Ideal cuando el equipo ya sabe qué necesita cambiar: tres columnas (empezar/parar/continuar), votación y las más votadas de Start y Stop se vuelven acciones con responsable y plazo.",
    duration: 25, minDuration: 15, maxDuration: 35, anonymous: true, asyncAvailable: true, sensitive: false, recommended: true,
    phases: [
      { name: "Contexto (variable / causa)", minutes: 2 },
      { name: "Escritura silenciosa en 3 columnas", minutes: 7 },
      { name: "Reveal + agrupación", minutes: 5 },
      { name: "Votación · 3 puntos", minutes: 3 },
      { name: "Conversación y acciones", minutes: 8 },
    ],
    sessionType: "startstop", implemented: true,
  },
  {
    id: "ideation-daki", name: "DAKI", stage: "ideation", category: "classic",
    description: "Drop · Add · Keep · Improve — distingue mejorar lo que existe de agregar algo nuevo.",
    purpose: "Cuando hay muchas ideas mezcladas y hay que clasificarlas antes de priorizar. Cuatro columnas; el foco va en Drop e Improve, que son las más accionables para la causa raíz.",
    duration: 30, minDuration: 20, maxDuration: 40, anonymous: true, asyncAvailable: true, sensitive: false, recommended: false,
    phases: [
      { name: "Contexto + las 4 categorías", minutes: 3 },
      { name: "Escritura silenciosa en 4 columnas", minutes: 8 },
      { name: "Reveal + agrupación", minutes: 5 },
      { name: "Votación (foco Drop e Improve)", minutes: 3 },
      { name: "Conversación y acciones", minutes: 7 },
    ],
    sessionType: "daki", implemented: true,
  },
  {
    id: "ideation-storyboarding", name: "Design Storyboarding", stage: "ideation", category: "classic",
    description: "Dibujar paso a paso cómo se vería la solución en acción.",
    purpose: "Activa el pensamiento concreto y revela asunciones ocultas cuando cada uno dibuja su versión. Cada miembro arma un storyboard de 6 cuadros, se presentan, se ven coincidencias y divergencias y se arma uno consensuado.",
    duration: 35, minDuration: 25, maxDuration: 50, anonymous: false, asyncAvailable: false, sensitive: false, recommended: false,
    phases: [
      { name: "Encuadre", minutes: 2 },
      { name: "Storyboard individual (6 cuadros)", minutes: 10 },
      { name: "Presentación (2 min c/u)", minutes: 10 },
      { name: "Coincidencias y divergencias", minutes: 8 },
      { name: "Storyboard consensuado", minutes: 5 },
    ],
    sessionType: "storyboard", entryStep: "sbframe", implemented: true,
  },
  {
    id: "ideation-the-archer", name: "The Archer", stage: "ideation", category: "classic",
    description: "Definir el objetivo con precisión (la diana) antes de diseñar la acción.",
    purpose: "Evita diseñar una acción sin saber a dónde apunta. Una diana de 3 anillos: resultado general, métricas posibles y el bullseye (una métrica con un número). El bullseye pre-carga la señal del Diseño de la prueba.",
    duration: 25, minDuration: 15, maxDuration: 35, anonymous: false, asyncAvailable: true, sensitive: false, recommended: false,
    phases: [
      { name: "Encuadre", minutes: 2 },
      { name: "Construir la diana (3 anillos)", minutes: 12 },
      { name: "Alineación del equipo", minutes: 8 },
      { name: "Cierre: objetivo definido", minutes: 3 },
    ],
    sessionType: "archer", entryStep: "arframe", implemented: true,
  },
  {
    id: "ideation-lean-coffee", name: "Lean Coffee", stage: "ideation", category: "classic",
    description: "El equipo arma su propia agenda de ideas y las trabaja por tiempo.",
    purpose: "Cuando hay muchas ideas y poco tiempo: cada uno propone temas, se votan, y se trabajan en orden con un timer por tema (seguir/pasar). Genera ownership sobre lo que se trabaja.",
    duration: 45, minDuration: 30, maxDuration: 60, anonymous: false, asyncAvailable: false, sensitive: false, recommended: false,
    phases: [
      { name: "Proponer temas", minutes: 5 },
      { name: "Votar la agenda", minutes: 3 },
      { name: "Trabajar por tema (5 min c/u)", minutes: 30 },
      { name: "Cierre: decisiones y acciones", minutes: 7 },
    ],
    sessionType: "leancoffee", entryStep: "lctopics", implemented: true,
  },
  {
    id: "follow-how-are-we-doing", name: "¿Cómo venimos?", stage: "follow", category: "growthloop",
    description: "El check-in de la prueba: señal, fidelidad de ejecución, obstáculos y decisión.",
    purpose: "La retro central de Seguimiento. El responsable reporta el valor de la señal y si se ejecutó como se diseñó; el equipo destraba obstáculos, decide (continuar/ajustar/detener) y deja una lectura honesta y anónima de cómo viene la prueba.",
    duration: 30, minDuration: 20, maxDuration: 40, anonymous: false, asyncAvailable: true, sensitive: false, recommended: true,
    note: "Obligatoria — la primera (y mínima) retro de Seguimiento",
    phases: [
      { name: "Ficha de la prueba (días, señal, responsable)", minutes: 2 },
      { name: "Reporte del responsable (señal, fidelidad, obstáculos)", minutes: 10 },
      { name: "Destrabe rápido (si hay obstáculos)", minutes: 8 },
      { name: "Decisión: continuar / ajustar / detener", minutes: 5 },
      { name: "Pregunta de honestidad anónima 🟢🟡🔴", minutes: 3 },
    ],
    sessionType: "follow", entryStep: "fwcard", implemented: true,
  },
  {
    id: "follow-what-is-blocking-us", name: "¿Qué nos está frenando?", stage: "follow", category: "growthloop",
    description: "Destrabar: mapear obstáculos, clasificarlos y plan de 48 horas.",
    purpose: "Cuando en el check-in emergieron obstáculos que necesitan trabajo. Mapeo anónimo, clasificación (internos/sistema/externos), priorización y acciones de destrabe con responsable y plazo de 48 horas.",
    duration: 25, minDuration: 15, maxDuration: 35, anonymous: true, asyncAvailable: false, sensitive: false, recommended: false,
    note: "Usar cuando hay obstáculos que necesitan más trabajo",
    phases: [
      { name: "Contexto (obstáculos del check-in)", minutes: 2 },
      { name: "Mapeo de obstáculos (anónimo)", minutes: 5 },
      { name: "Clasificación por tipo", minutes: 5 },
      { name: "Priorización · 2 puntos", minutes: 3 },
      { name: "Plan de destrabe (48hs)", minutes: 8 },
    ],
    sessionType: "blocking", entryStep: "blframe", implemented: true,
  },
  {
    id: "follow-roti", name: "ROTI", stage: "follow", category: "classic",
    description: "¿Está valiendo la pena el tiempo que invertimos en esta prueba?",
    purpose: "Señal temprana de que la prueba no genera valor proporcional al tiempo. Rápida y honesta: cada uno puntúa 1-5 el retorno de la inversión de tiempo y se conversa lo bajo.",
    duration: 15, minDuration: 10, maxDuration: 20, anonymous: true, asyncAvailable: true, sensitive: false, recommended: false,
    phases: [
      { name: "Encuadre", minutes: 1 },
      { name: "Puntuación anónima 1-5", minutes: 3 },
      { name: "Reveal: promedio y distribución", minutes: 2 },
      { name: "Conversación sobre lo bajo", minutes: 7 },
    ],
    sessionType: "roti", entryStep: "rtscore", implemented: true,
  },
  {
    id: "follow-perfection-game", name: "Perfection Game", stage: "follow", category: "classic",
    description: "¿En qué número está la ejecución y qué falta para subir 2 puntos?",
    purpose: "Versión cuantitativa del check-in: el equipo puntúa 1-10 cómo viene la ejecución (no el resultado) y define qué haría falta para subir 2 puntos en los próximos días.",
    duration: 20, minDuration: 15, maxDuration: 30, anonymous: true, asyncAvailable: true, sensitive: false, recommended: false,
    phases: [
      { name: "Encuadre con la prueba visible", minutes: 2 },
      { name: "Puntuación anónima 1-10", minutes: 3 },
      { name: "Reveal: promedio, rango y dispersión", minutes: 2 },
      { name: "¿Qué falta para subir 2 puntos? + acciones", minutes: 8 },
    ],
    sessionType: "fwperfection", entryStep: "fpframe", implemented: true,
  },
  {
    id: "follow-team-radar", name: "Radar del Equipo", stage: "follow", category: "classic",
    description: "¿Cómo evolucionó el equipo desde que arrancó la prueba? (vs. el radar base)",
    purpose: "Compara las mismas dimensiones del Radar de Exploración para ver si la prueba mejora la salud del equipo más allá de la métrica. Requiere un radar base de Exploración.",
    duration: 20, minDuration: 15, maxDuration: 30, anonymous: true, asyncAvailable: true, sensitive: false, recommended: false,
    note: "Requiere haber hecho Radar del Equipo en Exploración",
    phases: [
      { name: "Mostrar el radar base", minutes: 2 },
      { name: "Puntuación actual anónima 1-5", minutes: 5 },
      { name: "Reveal comparativo (base vs. hoy)", minutes: 5 },
      { name: "Conversación sobre los movimientos", minutes: 6 },
    ],
    sessionType: "fwradar", entryStep: "rbase", implemented: true,
  },
  {
    id: "follow-starfish", name: "Starfish", stage: "follow", category: "classic",
    description: "5 ajustes a la ejecución: seguir / menos / más / empezar / dejar.",
    purpose: "Más granular que continuar/ajustar/detener. Cinco secciones para ordenar qué ajustar en la ejecución de la prueba antes de priorizar y definir acciones.",
    duration: 25, minDuration: 15, maxDuration: 35, anonymous: true, asyncAvailable: true, sensitive: false, recommended: false,
    phases: [
      { name: "Contexto (la prueba en ejecución)", minutes: 2 },
      { name: "Escritura silenciosa en 5 secciones", minutes: 7 },
      { name: "Reveal + agrupación", minutes: 3 },
      { name: "Votación · 3 puntos", minutes: 3 },
      { name: "Acciones de ajuste + cierre", minutes: 10 },
    ],
    sessionType: "starfish", implemented: true,
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
    note: "Modo rápido: cierra el ciclo en una sola sesión (resultado + aprendizajes + decisión).",
  },

  // ── APRENDIZAJE · retros de proceso (propias) ──
  {
    id: "learn-what-happened", name: "¿Qué pasó?", stage: "learn", category: "growthloop",
    description: "Mirar el resultado real de la prueba y construir la narrativa compartida del ciclo.",
    purpose: "La primera retro de Aprendizaje. Presenta la ficha de la prueba cerrada (apuesta, señal inicial→final, umbral, fidelidad), da un silencio intencional para procesar, recoge reacciones anónimas en 3 columnas y termina con una narrativa compartida del resultado, redactada por el facilitador y aprobada por el equipo.",
    duration: 25, minDuration: 20, maxDuration: 35, anonymous: true, asyncAvailable: false, sensitive: false, recommended: true,
    note: "Siempre la primera retro de Aprendizaje.",
    phases: [
      { name: "Presentación del resultado", minutes: 5 },
      { name: "Silencio intencional (60s)", minutes: 1 },
      { name: "Reacción individual anónima (3 columnas)", minutes: 5 },
      { name: "Reveal y lectura colectiva", minutes: 8 },
      { name: "Narrativa compartida del ciclo", minutes: 7 },
    ],
    sessionType: "lwhappened", entryStep: "lwresult", implemented: false,
  },
  {
    id: "learn-what-did-we-learn", name: "¿Qué aprendimos?", stage: "learn", category: "growthloop",
    description: "Separar resultado de aprendizaje: qué sabemos ahora, qué haríamos distinto, qué transfiere.",
    purpose: "Después de ¿Qué pasó? Distingue el resultado del aprendizaje, recoge aprendizajes del equipo, los clasifica por tipo con flags de transferibilidad y urgencia, y los guarda en la Biblioteca del equipo. Cierra eligiendo el aprendizaje destacado del ciclo.",
    duration: 25, minDuration: 20, maxDuration: 35, anonymous: false, asyncAvailable: false, sensitive: false, recommended: true,
    note: "Siempre después de ¿Qué pasó?",
    phases: [
      { name: "Distinción clave", minutes: 1 },
      { name: "Escritura de aprendizajes", minutes: 7 },
      { name: "Lectura y resonancia", minutes: 5 },
      { name: "Clasificación para la Biblioteca", minutes: 7 },
      { name: "Aprendizaje destacado del ciclo", minutes: 5 },
    ],
    sessionType: "lwlearned", entryStep: "lwldistinct", implemented: false,
  },
  {
    id: "learn-what-is-next", name: "¿Qué sigue?", stage: "learn", category: "growthloop",
    description: "Decidir el destino de la variable: implementar, iterar, pivotar o pausar.",
    purpose: "La decisión de cierre del ciclo. Presenta las 4 opciones con su consecuencia en la plataforma, abre el debate sin tomar partido, registra la decisión con su razón y mueve la variable automáticamente en el mapa (Consolidación / Ideación / Foco / Pausada).",
    duration: 20, minDuration: 15, maxDuration: 30, anonymous: false, asyncAvailable: false, sensitive: false, recommended: true,
    note: "No puede cerrarse la etapa sin esta retro.",
    phases: [
      { name: "Las 4 opciones", minutes: 3 },
      { name: "Debate (a favor / en contra)", minutes: 7 },
      { name: "Decisión con justificación", minutes: 5 },
      { name: "Movimiento automático de la variable", minutes: 2 },
    ],
    sessionType: "lwnext", entryStep: "lwnopts", implemented: false,
  },
  {
    id: "learn-how-are-we-as-a-team", name: "¿Cómo estamos como equipo?", stage: "learn", category: "growthloop",
    description: "No qué mejoramos, sino cómo lo hacemos juntos: evaluar el proceso del equipo.",
    purpose: "Mira la forma de trabajar del equipo en el proceso, no el resultado. Evaluación anónima del proceso, ajustes concretos votados, y una reflexión privada de cada miembro (visible solo para sí mismo).",
    duration: 20, minDuration: 15, maxDuration: 30, anonymous: true, asyncAvailable: false, sensitive: false, recommended: false,
    note: "Opcional. La plataforma la sugiere automáticamente cada 3 ciclos.",
    phases: [
      { name: "Encuadre", minutes: 1 },
      { name: "Evaluación anónima del proceso", minutes: 7 },
      { name: "Reveal y lectura", minutes: 5 },
      { name: "Ajustes acordados (votados)", minutes: 4 },
      { name: "Reflexión privada", minutes: 3 },
    ],
    sessionType: "lwteam", entryStep: "lwtframe", implemented: false,
  },

  // ── APRENDIZAJE · retros clásicas ──
  {
    id: "learn-4ls", name: "4 L's", stage: "learn", category: "classic",
    description: "Cierre completo del ciclo en 4 dimensiones: gustó, aprendimos, faltó, anhelamos.",
    purpose: "Alternativa más estructurada a las retros propias para equipos que necesitan más andamiaje para reflexionar. Cubre lo positivo, lo que faltó y lo que se desea para el próximo ciclo. Los aprendizajes (Learned) se pueden exportar a la Biblioteca.",
    duration: 30, minDuration: 20, maxDuration: 40, anonymous: true, asyncAvailable: true, sensitive: false, recommended: false,
    phases: [
      { name: "Contexto", minutes: 2 },
      { name: "Escritura silenciosa (4 columnas)", minutes: 8 },
      { name: "Reveal simultáneo", minutes: 1 },
      { name: "Agrupación", minutes: 5 },
      { name: "Votación · 3 puntos", minutes: 3 },
      { name: "Conversación sobre las más votadas", minutes: 8 },
      { name: "Exportar a la Biblioteca", minutes: 2 },
    ],
    sessionType: "fourls", entryStep: "flcontext", implemented: false,
  },
  {
    id: "learn-kudos", name: "Kudos Retro", stage: "learn", category: "classic",
    description: "Espacio dedicado exclusivamente al reconocimiento y la gratitud.",
    purpose: "Sin agenda de mejora. Solo gratitud y reconocimiento por el trabajo del ciclo. Genera clima positivo para arrancar el próximo ciclo con energía. Especialmente poderosa después de ciclos difíciles o cuando la prueba no funcionó.",
    duration: 20, minDuration: 15, maxDuration: 30, anonymous: false, asyncAvailable: true, sensitive: false, recommended: true,
    phases: [
      { name: "Encuadre", minutes: 1 },
      { name: "Escritura de kudos", minutes: 7 },
      { name: "Entrega de kudos", minutes: 10 },
      { name: "Cierre", minutes: 2 },
    ],
    sessionType: "kudos", entryStep: "kudwrite", implemented: false,
  },
  {
    id: "learn-letter-to-future-self", name: "Carta al equipo futuro", stage: "learn", category: "classic",
    description: "El equipo escribe consejos a su versión futura con los aprendizajes del ciclo.",
    purpose: "Conecta el aprendizaje de este ciclo con compromisos concretos para el próximo. Genera memoria narrativa del equipo. La carta se guarda con una fecha objetivo y queda visible como recordatorio in-app.",
    duration: 25, minDuration: 20, maxDuration: 35, anonymous: false, asyncAvailable: true, sensitive: false, recommended: false,
    phases: [
      { name: "Encuadre (destinatario futuro)", minutes: 2 },
      { name: "Escritura individual", minutes: 8 },
      { name: "Lectura compartida", minutes: 10 },
      { name: "Temas comunes → compromisos", minutes: 5 },
    ],
    sessionType: "letter", entryStep: "ltframe", implemented: false,
  },
  {
    id: "learn-speed-dating", name: "Speed Dating", stage: "learn", category: "classic",
    description: "Conversaciones rápidas cara a cara para cerrar roces o tensiones acumuladas.",
    purpose: "Cuando el ciclo tuvo momentos difíciles entre miembros y el equipo necesita cerrar tensiones interpersonales antes de arrancar el próximo ciclo. Única retro que trabaja las relaciones bilaterales. No funciona con conflictos graves: en ese caso trabajar en privado primero.",
    duration: 25, minDuration: 20, maxDuration: 35, anonymous: false, asyncAvailable: false, sensitive: true, recommended: false,
    note: "Sensible. Requiere contrato de equipo activo. Las conversaciones de las parejas NO se guardan.",
    phases: [
      { name: "Encuadre y reglas", minutes: 3 },
      { name: "Formación de parejas", minutes: 1 },
      { name: "Rondas de speed dating", minutes: 15 },
      { name: "Plenario de cierre (voluntario)", minutes: 5 },
      { name: "Cierre (One Word)", minutes: 1 },
    ],
    sessionType: "speeddating", entryStep: "sdwarn", implemented: false,
  },
];

export function retrosForStage(stage: string): RetroDefinition[] {
  return RETRO_REGISTRY.filter((r) => r.stage === stage);
}

export function retroById(id: string | undefined): RetroDefinition | undefined {
  return RETRO_REGISTRY.find((r) => r.id === id);
}

/** Etapa a la que pertenece un tipo de sesión (para historiales y cierres).
 *  Los tipos legacy atados a iniciativas mapean al ciclo nuevo. */
const LEGACY_TYPE_STAGE: Record<string, string> = {
  explore: "objectives", focus: "focus", proof: "ideation", learn: "learn", follow: "follow",
};
export function stageOfSessionType(type: string): string {
  return LEGACY_TYPE_STAGE[type] ?? RETRO_REGISTRY.find((r) => r.sessionType === type)?.stage ?? type;
}
