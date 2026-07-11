/* ============================================================
   Mis compromisos — las acciones de los loops asignadas a mí.
   El responsable (`who`) se elige de un dropdown del roster, así que
   es el nombre EXACTO de un miembro: lo resolvemos a su userId y
   matcheamos por identidad (no por substring del nombre de pila, que
   filtraba entre homónimos y falsos positivos tipo "Ana" en "Susana").
   Soporta `whoId` explícito si la sala llega a guardarlo.
   ============================================================ */

import type { Initiative, Person } from "@/lib/data";

export interface MyCommit {
  initId: string;
  initTitle: string;
  text: string;
  status: string; // pending | doing | done | blocked
}

const norm = (s?: string) => (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/** Compromisos de estos loops asignados al usuario, por identidad (userId). */
export function myCommitments(
  inits: Initiative[],
  me?: { id?: string; name?: string },
  roster?: Person[],
): MyCommit[] {
  const meId = me?.id;
  const meName = norm(me?.name);
  if (!meId && !meName) return [];

  // Nombre exacto del responsable → userId del miembro (roster).
  const whoToId = (who?: string): string | undefined => {
    const n = norm(who);
    if (!n) return undefined;
    return roster?.find((m) => m.userId && norm(m.name) === n)?.userId;
  };
  const isMine = (a: { who?: string; whoId?: string }): boolean => {
    if (a.whoId && meId) return a.whoId === meId;          // 1) identidad explícita
    const wid = whoToId(a.who);
    if (wid) return !!meId && wid === meId;                // 2) nombre resuelto a userId
    return !!meName && norm(a.who) === meName;             // 3) fallback: nombre exacto
  };

  const out: MyCommit[] = [];
  for (const i of inits) {
    const d = i.data ?? {};
    const statusBy = new Map((d.follow?.actionStatus ?? []).map((a) => [a.text, a.status]));
    const seen = new Set<string>();
    for (const a of [...(d.proof?.actions ?? []), ...(d.follow?.newActions ?? [])]) {
      const text = (a.text ?? "").trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      if (isMine(a)) {
        out.push({ initId: i.id, initTitle: i.title, text, status: statusBy.get(text) ?? "pending" });
      }
    }
  }
  return out;
}
