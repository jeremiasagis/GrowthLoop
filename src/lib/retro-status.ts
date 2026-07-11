/* ============================================================
   Almacén de retros — estado global activa/archivada de cada retro
   del catálogo (gestionado por el superadmin). Sin fila = activa.
   ============================================================ */

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/** Mapa retro_id → active. La ausencia de una clave = activa (default). */
export async function getRetroStatus(): Promise<Record<string, boolean>> {
  const sb = getSupabaseBrowserClient();
  const { data } = await sb.from("platform_retro_status").select("retro_id, active");
  const m: Record<string, boolean> = {};
  for (const r of (data ?? []) as { retro_id: string; active: boolean }[]) m[r.retro_id] = r.active;
  return m;
}

export function isRetroActive(status: Record<string, boolean>, retroId: string): boolean {
  return status[retroId] !== false; // default: activa
}

export async function setRetroActive(retroId: string, active: boolean): Promise<{ error?: string }> {
  const sb = getSupabaseBrowserClient();
  const { error } = await sb.from("platform_retro_status")
    .upsert({ retro_id: retroId, active, updated_at: new Date().toISOString() }, { onConflict: "retro_id" });
  return { error: error?.message };
}
