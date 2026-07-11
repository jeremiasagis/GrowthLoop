/* ============================================================
   La voz del miembro — planteos asincrónicos al equipo.
   Lee/escribe Supabase directo (igual que talent.ts). RLS: el autor
   ve/borra lo suyo; el facilitador del equipo ve y gestiona todo.
   ============================================================ */

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type VoiceKind = "problema" | "idea" | "pregunta";

export interface TeamInput {
  id: string;
  teamId: string;
  authorUserId: string;
  kind: VoiceKind;
  text: string;
  status: string; // new | seen | converted | archived
  createdAt?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const map = (r: any): TeamInput => ({
  id: r.id, teamId: r.team_id, authorUserId: r.author_user_id,
  kind: r.kind, text: r.text, status: r.status, createdAt: r.created_at ?? undefined,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function createTeamInput(teamId: string, kind: VoiceKind, text: string): Promise<{ id?: string; error?: string }> {
  const sb = getSupabaseBrowserClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return { error: "Sesión expirada." };
  const { data, error } = await sb.from("team_inputs")
    .insert({ team_id: teamId, author_user_id: auth.user.id, kind, text })
    .select("id").single();
  return error ? { error: error.message } : { id: data.id };
}

/** Lo que YO planteé en este equipo. */
export async function getMyTeamInputs(teamId: string): Promise<TeamInput[]> {
  const sb = getSupabaseBrowserClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return [];
  const { data } = await sb.from("team_inputs").select("*")
    .eq("team_id", teamId).eq("author_user_id", auth.user.id)
    .order("created_at", { ascending: false });
  return (data ?? []).map(map);
}

/** Todo lo planteado en el equipo (el facilitador; RLS lo filtra). */
export async function getTeamInputs(teamId: string): Promise<TeamInput[]> {
  const sb = getSupabaseBrowserClient();
  const { data } = await sb.from("team_inputs").select("*")
    .eq("team_id", teamId).order("created_at", { ascending: false });
  return (data ?? []).map(map);
}

export async function setTeamInputStatus(id: string, status: string): Promise<{ error?: string }> {
  const sb = getSupabaseBrowserClient();
  const { error } = await sb.from("team_inputs").update({ status }).eq("id", id);
  return { error: error?.message };
}

export async function deleteTeamInput(id: string): Promise<{ error?: string }> {
  const sb = getSupabaseBrowserClient();
  const { error } = await sb.from("team_inputs").delete().eq("id", id);
  return { error: error?.message };
}

/* ── Banco de ideas social: las ideas se comparten con el equipo y se votan ── */
export interface TeamIdea extends TeamInput {
  votes: number;
  votedByMe: boolean;
  mine: boolean;
}

/** Todas las ideas activas del equipo, con su conteo de votos y si yo voté. */
export async function getTeamIdeas(teamId: string): Promise<TeamIdea[]> {
  const sb = getSupabaseBrowserClient();
  const { data: auth } = await sb.auth.getUser();
  const uid = auth.user?.id;
  const { data: rows } = await sb.from("team_inputs").select("*")
    .eq("team_id", teamId).eq("kind", "idea").neq("status", "archived")
    .order("created_at", { ascending: false });
  const ideas = (rows ?? []).map(map);
  if (!ideas.length) return [];
  const { data: votes } = await sb.from("team_input_votes")
    .select("input_id, user_id").in("input_id", ideas.map((i) => i.id));
  const counts = new Map<string, number>();
  const mineVotes = new Set<string>();
  for (const v of (votes ?? []) as { input_id: string; user_id: string }[]) {
    counts.set(v.input_id, (counts.get(v.input_id) ?? 0) + 1);
    if (v.user_id === uid) mineVotes.add(v.input_id);
  }
  return ideas
    .map((i) => ({ ...i, votes: counts.get(i.id) ?? 0, votedByMe: mineVotes.has(i.id), mine: i.authorUserId === uid }))
    .sort((a, b) => b.votes - a.votes);
}

export async function voteTeamInput(inputId: string, teamId: string): Promise<{ error?: string }> {
  const sb = getSupabaseBrowserClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return { error: "Sesión expirada." };
  const { error } = await sb.from("team_input_votes")
    .insert({ input_id: inputId, team_id: teamId, user_id: auth.user.id });
  return { error: error?.message };
}

export async function unvoteTeamInput(inputId: string): Promise<{ error?: string }> {
  const sb = getSupabaseBrowserClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return { error: "Sesión expirada." };
  const { error } = await sb.from("team_input_votes").delete()
    .eq("input_id", inputId).eq("user_id", auth.user.id);
  return { error: error?.message };
}

export const VOICE_KINDS: { key: VoiceKind; label: string; icon: string; color: string; placeholder: string }[] = [
  { key: "problema", label: "Un problema", icon: "TriangleAlert", color: "var(--risk)", placeholder: "¿Qué está trabando al equipo? Contalo en una o dos frases." },
  { key: "idea", label: "Una idea", icon: "Lightbulb", color: "var(--st-proof)", placeholder: "¿Qué probarías para mejorar algo?" },
  { key: "pregunta", label: "Una pregunta", icon: "HelpCircle", color: "var(--info)", placeholder: "¿Qué te gustaría entender o poner sobre la mesa?" },
];
export const voiceKind = (k: string) => VOICE_KINDS.find((v) => v.key === k) ?? VOICE_KINDS[1];
