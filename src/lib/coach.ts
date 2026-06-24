/* ============================================================
   Norte coach — sugerencias proactivas (PLAN-PRODUCTO · Pilar 3).
   Reglas determinísticas (sin llamada a IA, sin costo) que detectan
   señales y proponen el próximo paso: clima cayendo, sin loops,
   señal estancada, equipo frenado, confianza baja. Se muestran como
   una card "Norte sugiere" para el facilitador.
   Complementa los "Recordatorios" (que cubren consolidación/pausa/
   cartas); acá va lo más estratégico.
   ============================================================ */

import { overallOf, type Team } from "./data";
import { getInitiatives } from "./repository";
import { betQuality, parseSignal } from "./loop";

export interface NorteSuggestion {
  key: string;
  icon: string;
  color: string;
  title: string;
  text: string;
  cta?: string;
  tab?: string;      // pestaña del equipo a la que lleva
  initId?: string;   // o un loop puntual
}

const daysSince = (iso?: string, now = Date.now()): number | null =>
  iso ? Math.floor((now - new Date(iso).getTime()) / 86400000) : null;

export function norteSuggestions(team: Team, now = Date.now()): NorteSuggestion[] {
  const out: NorteSuggestion[] = [];
  const inits = getInitiatives(team.id);
  const active = inits.filter((i) => i.status === "active");
  const data = team.data ?? {};

  // 1) El clima viene bajando.
  if ((team.pulse?.length ?? 0) >= 2) {
    const f = overallOf(team.pulse[0]);
    const l = overallOf(team.pulse[team.pulse.length - 1]);
    if (l < f - 5) {
      out.push({
        key: "pulse-down", icon: "TrendingDown", color: "var(--warning)",
        title: "El clima viene bajando",
        text: `El pulso pasó de ${f} a ${l}. Puede ser momento de un loop de Clima o una retro de relaciones.`,
        cta: "Ver pulso", tab: "pulso",
      });
    }
  }

  // 2) Hay actividad pero ningún loop abierto.
  if (!active.length && (team.sessions?.length ?? 0) > 0) {
    out.push({
      key: "no-active", icon: "Plus", color: "var(--green)",
      title: "Sin loops en curso",
      text: "El equipo tiene actividad pero ningún loop abierto. Arrancá uno para convertir lo que ven en una mejora medible.",
      cta: "Crear loop", tab: "seguimiento",
    });
  }

  // 2b) Apuesta sin señal/meta/plazo: no se va a poder medir si funcionó (B1).
  for (const i of active) {
    const hasBet = !!(i.data?.proof?.betThen || i.data?.proof?.bets?.[0]?.betThen);
    if (!hasBet) continue;
    const q = betQuality(i);
    if (!q.ok) {
      out.push({
        key: `betq-${i.id}`, icon: "Target", color: "var(--st-proof)",
        title: `"${i.title}": la apuesta no es medible`,
        text: `Falta ${q.missing.join(", ")}. Sin eso no vas a poder saber si la mejora funcionó. Completala en el loop.`,
        cta: "Ver loop", initId: i.id,
      });
    }
  }

  // 3) Una señal que no se mueve (varias mediciones sin cambio).
  for (const i of active) {
    const log = i.data?.follow?.signalLog ?? [];
    if (log.length >= 2) {
      const f = parseSignal(log[0].value);
      const l = parseSignal(log[log.length - 1].value);
      if (f != null && l != null && Math.abs(l - f) < 1e-9) {
        out.push({
          key: `stuck-${i.id}`, icon: "AlertTriangle", color: "var(--warning)",
          title: `"${i.title}": la señal no se mueve`,
          text: "Llevás varias mediciones sin cambio. Quizá toca ajustar la apuesta o pivotar.",
          cta: "Ver loop", initId: i.id,
        });
      }
    }
  }

  // 4) Equipo frenado (sin sesiones hace rato, con loops activos).
  const idle = daysSince(data.lastSessionAt, now);
  if (active.length && idle !== null && idle >= 14) {
    out.push({
      key: "idle", icon: "Clock", color: "var(--warning)",
      title: "Hace rato no hacen una sesión",
      text: `Pasaron ${idle} días desde la última. Retomá el ritmo: avanzá un loop o tomá el pulso.`,
      cta: "Ver loops", tab: "seguimiento",
    });
  }

  // 5) Confianza baja: cuidar la base antes de pedir más.
  if (team.psychSafety > 0 && team.psychSafety < 60) {
    out.push({
      key: "safety", icon: "ShieldAlert", color: "var(--warning)",
      title: "La confianza del equipo está baja",
      text: "Antes de pedir más, quizá convenga una retro de relaciones para fortalecer la base.",
      cta: "Ver herramientas", tab: "exploracion",
    });
  }

  return out;
}
