/* ============================================================
   Growthloop — Catálogo de retrospectivas (18)
   ------------------------------------------------------------
   La metodología: cada etapa del ciclo ofrece varias retros y
   el facilitador elige cuál usar. La marcada como `recommended`
   es la sugerida por defecto (y la que hoy tiene flujo completo).
   El detalle de fases de cada una se implementa por fases.
   ============================================================ */

import type { StageKey } from "./data";

export interface RetroDef {
  key: string;
  stage: StageKey;
  name: string;
  purpose: string;
  durationMin: number;
  async: boolean;                 // admite modo asincrónico
  anonymity: "Sí" | "No" | "Parcial";
  sensitive?: boolean;            // requiere cuidado del facilitador
  optional?: boolean;             // no se usa siempre
  recommended?: boolean;          // sugerida por defecto en la etapa
}

export const RETROS: RetroDef[] = [
  // ── EXPLORACIÓN ──
  { key: "explore_state", stage: "explore", name: "¿Dónde estamos?", purpose: "Fotografía honesta del estado actual. Hacer visible lo que todos piensan y nadie dice.", durationMin: 30, async: true, anonymity: "Sí", recommended: true },
  { key: "explore_purpose", stage: "explore", name: "¿Para qué existimos?", purpose: "Clarificar el propósito del equipo y sus clientes. Ver la dispersión de visiones.", durationMin: 25, async: false, anonymity: "No" },
  { key: "explore_flow", stage: "explore", name: "¿Cómo fluye nuestro trabajo?", purpose: "Mapear el flujo real del trabajo e identificar dónde se pierde valor.", durationMin: 35, async: true, anonymity: "Parcial" },
  { key: "explore_relations", stage: "explore", name: "¿Cómo nos relacionamos?", purpose: "Explorar la dinámica humana: comunicación, confianza, vínculos reales.", durationMin: 30, async: false, anonymity: "Sí", sensitive: true },

  // ── FOCO ──
  { key: "focus_where", stage: "focus", name: "¿Dónde se traba?", purpose: "Mapear la variable como flujo y localizar con precisión dónde se pierde valor.", durationMin: 30, async: true, anonymity: "Parcial" },
  { key: "focus_why", stage: "focus", name: "¿Por qué está pasando?", purpose: "Ir de síntoma a causa raíz sin culpar personas (cadena de porqués).", durationMin: 35, async: false, anonymity: "Parcial", recommended: true },
  { key: "focus_impact", stage: "focus", name: "Impacto y frecuencia", purpose: "Priorizar qué traba atacar primero con criterio compartido (matriz).", durationMin: 25, async: true, anonymity: "Sí" },
  { key: "focus_client", stage: "focus", name: "La voz del cliente", purpose: "Contrastar la percepción interna con cómo lo vive quien recibe el trabajo.", durationMin: 30, async: false, anonymity: "Sí" },

  // ── PRUEBA ──
  { key: "proof_hmw", stage: "proof", name: "¿Cómo podríamos?", purpose: "Generar muchas ideas para atacar la causa raíz, sin juicio previo.", durationMin: 30, async: true, anonymity: "Sí", recommended: true },
  { key: "proof_choose", stage: "proof", name: "¿Cuál elegimos?", purpose: "Elegir la mejor idea con criterio visual y compartido (matriz + ICE).", durationMin: 25, async: false, anonymity: "No" },
  { key: "proof_premortem", stage: "proof", name: "¿Qué podría fallar?", purpose: "Pre-mortem: anticipar por qué fallaría la prueba y mitigar antes.", durationMin: 25, async: true, anonymity: "Sí" },
  { key: "proof_design", stage: "proof", name: "Diseño de la prueba", purpose: "Convertir la idea en un experimento con apuesta, señal, responsable y 3 filtros.", durationMin: 30, async: false, anonymity: "No" },

  // ── SEGUIMIENTO ──
  { key: "follow_how", stage: "follow", name: "¿Cómo venimos?", purpose: "Check-in del día 7: avance de la señal, obstáculos y honestidad del equipo.", durationMin: 30, async: true, anonymity: "No", recommended: true },
  { key: "follow_blockers", stage: "follow", name: "¿Qué nos está frenando?", purpose: "Destrabar obstáculos concretos que bloquean la ejecución de la prueba.", durationMin: 25, async: true, anonymity: "Sí" },

  // ── APRENDIZAJE ──
  { key: "learn_what", stage: "learn", name: "¿Qué pasó?", purpose: "Leer el resultado en conjunto y acordar una narrativa compartida honesta.", durationMin: 25, async: false, anonymity: "Sí", recommended: true },
  { key: "learn_learned", stage: "learn", name: "¿Qué aprendimos?", purpose: "Separar resultado de aprendizaje y guardarlo en la biblioteca del equipo.", durationMin: 25, async: true, anonymity: "No" },
  { key: "learn_next", stage: "learn", name: "¿Qué sigue?", purpose: "Decidir el próximo movimiento: implementar, iterar, pivotar o pausar.", durationMin: 20, async: false, anonymity: "No" },
  { key: "learn_team", stage: "learn", name: "¿Cómo estamos como equipo?", purpose: "Evaluar el proceso de mejora (no el contenido) y ajustarlo.", durationMin: 20, async: true, anonymity: "Sí", optional: true },
];

export const retrosForStage = (stage: StageKey): RetroDef[] => RETROS.filter((r) => r.stage === stage);
export const retroByKey = (key?: string): RetroDef | undefined => (key ? RETROS.find((r) => r.key === key) : undefined);
