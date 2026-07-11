/* ============================================================
   Muro de reconocimiento (kudos) entre pares. Persistente,
   celebratorio, sin ranking individual. Lee/escribe Supabase
   directo. RLS: cualquier integrante ve el muro de su equipo;
   uno reconoce en nombre propio a otro del equipo.
   ============================================================ */

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export interface Kudo {
  id: string;
  teamId: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  emoji?: string;
  createdAt?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const map = (r: any): Kudo => ({
  id: r.id, teamId: r.team_id, fromUserId: r.from_user_id, toUserId: r.to_user_id,
  text: r.text, emoji: r.emoji ?? undefined, createdAt: r.created_at ?? undefined,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

/** El muro del equipo (todos los kudos, más nuevo primero). */
export async function getTeamKudos(teamId: string, limit = 40): Promise<Kudo[]> {
  const sb = getSupabaseBrowserClient();
  const { data } = await sb.from("kudos").select("*")
    .eq("team_id", teamId).order("created_at", { ascending: false }).limit(limit);
  return (data ?? []).map(map);
}

/** Dar un reconocimiento a alguien del equipo. */
export async function giveKudo(input: { teamId: string; toUserId: string; text: string; emoji?: string }): Promise<{ error?: string }> {
  const sb = getSupabaseBrowserClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return { error: "Sesión expirada." };
  if (input.toUserId === auth.user.id) return { error: "No podés reconocerte a vos mismo." };
  const { error } = await sb.from("kudos").insert({
    team_id: input.teamId, from_user_id: auth.user.id, to_user_id: input.toUserId,
    text: input.text.trim(), emoji: input.emoji ?? null,
  });
  return { error: error?.message };
}

/** Retractar un kudo propio. */
export async function deleteKudo(id: string): Promise<{ error?: string }> {
  const sb = getSupabaseBrowserClient();
  const { error } = await sb.from("kudos").delete().eq("id", id);
  return { error: error?.message };
}
