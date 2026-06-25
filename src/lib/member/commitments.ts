/* ============================================================
   Mis compromisos — las acciones de los loops asignadas a mí.
   Centraliza el match (hoy por nombre, hasta que la sala guarde el
   userId del responsable) en un solo lugar, que usan el home, el
   detalle del loop y la huella del miembro.
   ============================================================ */

import type { Initiative } from "@/lib/data";

export interface MyCommit {
  initId: string;
  initTitle: string;
  text: string;
  status: string; // pending | doing | done | blocked
}

/** Compromisos de estos loops asignados al usuario (por nombre). */
export function myCommitments(inits: Initiative[], userName?: string): MyCommit[] {
  const first = (userName ?? "").split(" ")[0].toLowerCase();
  const full = (userName ?? "").toLowerCase().trim();
  if (!first && !full) return [];
  const out: MyCommit[] = [];
  for (const i of inits) {
    const d = i.data ?? {};
    const statusBy = new Map((d.follow?.actionStatus ?? []).map((a) => [a.text, a.status]));
    const seen = new Set<string>();
    for (const a of [...(d.proof?.actions ?? []), ...(d.follow?.newActions ?? [])]) {
      const text = (a.text ?? "").trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      const who = (a.who ?? "").toLowerCase();
      if (who && (who.includes(first) || (full && who.includes(full)))) {
        out.push({ initId: i.id, initTitle: i.title, text, status: statusBy.get(text) ?? "pending" });
      }
    }
  }
  return out;
}
