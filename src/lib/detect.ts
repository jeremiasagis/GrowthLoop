/* ============================================================
   Detección — junta lo que salió de las retros de "Salir a
   detectar" (radar de clima, sailboat, voz del cliente) en un
   texto que la IA sintetiza en desafíos para el backlog.
   ============================================================ */

import { getClosedTeamSessions, loadSessionMemories } from "@/lib/session";
import { retroById } from "@/lib/retros/registry";

/** Ids de retro de las lentes de detección (deben coincidir con la página de Desafíos). */
export const DETECT_RETRO_IDS = ["exploration-team-radar", "exploration-sailboat", "focus-client-voice"];

export interface DetectionSummary { text: string; count: number }

/** Resumen textual de las últimas sesiones de detección del equipo. */
export async function getDetectionSummary(teamId: string, max = 4): Promise<DetectionSummary> {
  const sessions = (await getClosedTeamSessions(teamId))
    .filter((s) => DETECT_RETRO_IDS.includes(s.retro ?? ""))
    .slice(0, max);
  if (!sessions.length) return { text: "", count: 0 };

  const mems = await loadSessionMemories(sessions);
  const L: string[] = [];
  for (const m of mems) {
    const name = retroById(m.retro ?? "")?.name ?? m.type;
    L.push(`\n## ${name} (${m.date})`);
    const cards = m.cards.map((c) => c.text?.trim()).filter(Boolean);
    if (cards.length) L.push(cards.map((c) => `- ${c}`).join("\n"));
    const clusters = m.clusters.map((c) => c.name?.trim()).filter(Boolean);
    if (clusters.length) L.push(`Agrupado en: ${clusters.join(", ")}.`);
    // Resultado guardado (hallazgos, tensiones, etc.) si viene como texto simple.
    const res = m.result ?? {};
    for (const [k, v] of Object.entries(res)) {
      if (typeof v === "string" && v.trim() && v.length < 400) L.push(`${k}: ${v.trim()}`);
    }
  }
  return { text: L.join("\n").trim(), count: sessions.length };
}
