/* ============================================================
   Fundaciones — fotos congeladas e históricas del equipo
   (contrato, FODA, clima). Lee/escribe Supabase directo (como
   talent.ts/voice.ts). RLS: equipo lee, facilitador escribe.
   ============================================================ */

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type FoundationKind = "contract" | "foda" | "clima";

export interface Foundation {
  id: string;
  teamId: string;
  kind: FoundationKind;
  title?: string;
  data: Record<string, unknown>;
  createdAt?: string;
}

export const FOUNDATION_META: Record<FoundationKind, { label: string; icon: string; color: string; desc: string }> = {
  contract: { label: "Contrato de equipo", icon: "Handshake", color: "var(--green)", desc: "Cómo trabajamos: acuerdos, propósito y roles." },
  foda: { label: "FODA", icon: "LayoutGrid", color: "var(--violet)", desc: "Dónde estamos: fortalezas, oportunidades, debilidades y amenazas." },
  clima: { label: "Clima del equipo", icon: "Activity", color: "#F59E0B", desc: "Cómo estamos: el pulso del equipo en un momento." },
};
export const FOUNDATION_ORDER: FoundationKind[] = ["contract", "foda", "clima"];

/* eslint-disable @typescript-eslint/no-explicit-any */
const map = (r: any): Foundation => ({
  id: r.id, teamId: r.team_id, kind: r.kind, title: r.title ?? undefined,
  data: r.data ?? {}, createdAt: r.created_at ?? undefined,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Todos los snapshots del equipo (más nuevo primero). */
export async function getFoundations(teamId: string): Promise<Foundation[]> {
  const sb = getSupabaseBrowserClient();
  const { data } = await sb.from("team_foundations").select("*")
    .eq("team_id", teamId).order("created_at", { ascending: false });
  return (data ?? []).map(map);
}

/** Congela una versión (snapshot). */
export async function createFoundation(teamId: string, kind: FoundationKind, data: Record<string, unknown>, title?: string): Promise<{ id?: string; error?: string }> {
  const sb = getSupabaseBrowserClient();
  const { data: auth } = await sb.auth.getUser();
  const { data: row, error } = await sb.from("team_foundations")
    .insert({ team_id: teamId, kind, data, title: title ?? null, created_by: auth.user?.id ?? null })
    .select("id").single();
  return error ? { error: error.message } : { id: row.id };
}

export async function deleteFoundation(id: string): Promise<{ error?: string }> {
  const sb = getSupabaseBrowserClient();
  const { error } = await sb.from("team_foundations").delete().eq("id", id);
  return { error: error?.message };
}

export function fmtFoundationDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" });
}
