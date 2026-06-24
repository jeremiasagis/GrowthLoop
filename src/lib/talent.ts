/* ============================================================
   Capa individual — 360 de competencias + 1-a-1.
   Lee/escribe Supabase directo (no pasa por el store; estas vistas
   se cargan lazy por página). RLS protege el anonimato de pares y la
   privacidad del 1-a-1; el agregado viene por la RPC get_review_aggregate.
   ============================================================ */

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Competency, Team } from "@/lib/data";

export const DEFAULT_COMPETENCIES: Competency[] = [
  { key: "comunicacion", label: "Comunicación" },
  { key: "autonomia", label: "Autonomía" },
  { key: "colaboracion", label: "Colaboración" },
  { key: "resultados", label: "Foco en resultados" },
  { key: "aprendizaje", label: "Aprendizaje continuo" },
  { key: "iniciativa", label: "Iniciativa" },
];
export function teamCompetencies(team: Team | null | undefined): Competency[] {
  const c = team?.data?.competencies;
  return c && c.length >= 3 ? c : DEFAULT_COMPETENCIES;
}

export interface TalentReview {
  id: string; teamId: string; subjectUserId: string; status: "open" | "closed";
  competencies: Competency[]; createdBy?: string; createdAt?: string; closedAt?: string;
}
export interface ReviewAggregate {
  self: Record<string, number>; leader: Record<string, number>;
  peers: Record<string, number> | null; peerCount: number; competencies: Competency[];
}
export interface OneOnOne {
  id: string; teamId: string; leaderUserId?: string; memberUserId: string; date?: string;
  reviewId?: string; agenda: string[]; notes?: string;
  commitments: { text: string; status?: string; due?: string }[]; createdAt?: string;
}

const mapReview = (r: any): TalentReview => ({
  id: r.id, teamId: r.team_id, subjectUserId: r.subject_user_id, status: r.status,
  competencies: r.competencies ?? [], createdBy: r.created_by ?? undefined,
  createdAt: r.created_at ?? undefined, closedAt: r.closed_at ?? undefined,
});
const mapOoo = (r: any): OneOnOne => ({
  id: r.id, teamId: r.team_id, leaderUserId: r.leader_user_id ?? undefined, memberUserId: r.member_user_id,
  date: r.date ?? undefined, reviewId: r.review_id ?? undefined, agenda: r.agenda ?? [],
  notes: r.notes ?? undefined, commitments: r.commitments ?? [], createdAt: r.created_at ?? undefined,
});

// ── 360 ──
export async function createReview(teamId: string, subjectUserId: string, competencies: Competency[]): Promise<{ id?: string; error?: string }> {
  const sb = getSupabaseBrowserClient();
  const { data: auth } = await sb.auth.getUser();
  const { data, error } = await sb.from("talent_reviews")
    .insert({ team_id: teamId, subject_user_id: subjectUserId, competencies, created_by: auth.user?.id ?? null })
    .select("id").single();
  return error ? { error: error.message } : { id: data.id };
}
export async function getReviewsForTeam(teamId: string): Promise<TalentReview[]> {
  const sb = getSupabaseBrowserClient();
  const { data } = await sb.from("talent_reviews").select("*").eq("team_id", teamId).order("created_at", { ascending: false });
  return (data ?? []).map(mapReview);
}
export async function getReview(id: string): Promise<TalentReview | null> {
  const sb = getSupabaseBrowserClient();
  const { data } = await sb.from("talent_reviews").select("*").eq("id", id).maybeSingle();
  return data ? mapReview(data) : null;
}
export async function closeReview(id: string): Promise<{ error?: string }> {
  const sb = getSupabaseBrowserClient();
  const { error } = await sb.from("talent_reviews").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", id);
  return { error: error?.message };
}
export async function submitRating(reviewId: string, ratings: Record<string, number>, comment?: string): Promise<{ error?: string }> {
  const sb = getSupabaseBrowserClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return { error: "Sesión expirada." };
  const { error } = await sb.from("talent_ratings").upsert(
    { review_id: reviewId, rater_user_id: auth.user.id, ratings, comment: comment ?? null },
    { onConflict: "review_id,rater_user_id" },
  );
  return { error: error?.message };
}
export async function getMyRating(reviewId: string): Promise<{ ratings: Record<string, number>; comment?: string } | null> {
  const sb = getSupabaseBrowserClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;
  const { data } = await sb.from("talent_ratings").select("ratings,comment").eq("review_id", reviewId).eq("rater_user_id", auth.user.id).maybeSingle();
  return data ? { ratings: (data.ratings as Record<string, number>) ?? {}, comment: data.comment ?? undefined } : null;
}
export async function getReviewAggregate(reviewId: string): Promise<ReviewAggregate | null> {
  const sb = getSupabaseBrowserClient();
  const { data, error } = await sb.rpc("get_review_aggregate", { p_review_id: reviewId });
  if (error || !data) return null;
  return data as ReviewAggregate;
}

// ── 1-a-1 ──
export async function createOneOnOne(teamId: string, memberUserId: string, reviewId?: string): Promise<{ id?: string; error?: string }> {
  const sb = getSupabaseBrowserClient();
  const { data: auth } = await sb.auth.getUser();
  const { data, error } = await sb.from("one_on_ones")
    .insert({ team_id: teamId, member_user_id: memberUserId, leader_user_id: auth.user?.id ?? null, review_id: reviewId ?? null })
    .select("id").single();
  return error ? { error: error.message } : { id: data.id };
}
export async function getOneOnOnes(opts: { teamId?: string; memberUserId?: string }): Promise<OneOnOne[]> {
  const sb = getSupabaseBrowserClient();
  let q = sb.from("one_on_ones").select("*").order("date", { ascending: false });
  if (opts.teamId) q = q.eq("team_id", opts.teamId);
  if (opts.memberUserId) q = q.eq("member_user_id", opts.memberUserId);
  const { data } = await q;
  return (data ?? []).map(mapOoo);
}
export async function getMyOneOnOnes(): Promise<OneOnOne[]> {
  const sb = getSupabaseBrowserClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return [];
  const { data } = await sb.from("one_on_ones").select("*").eq("member_user_id", auth.user.id).order("date", { ascending: false });
  return (data ?? []).map(mapOoo);
}
export async function updateOneOnOne(id: string, patch: Partial<Pick<OneOnOne, "agenda" | "notes" | "commitments" | "date">>): Promise<{ error?: string }> {
  const sb = getSupabaseBrowserClient();
  const row: Record<string, unknown> = {};
  if (patch.agenda) row.agenda = patch.agenda;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.commitments) row.commitments = patch.commitments;
  if (patch.date) row.date = patch.date;
  const { error } = await sb.from("one_on_ones").update(row).eq("id", id);
  return { error: error?.message };
}
