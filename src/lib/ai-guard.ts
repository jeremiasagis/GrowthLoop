/* ============================================================
   IA · Guard server-side
   ------------------------------------------------------------
   Valida que el que llama esté autenticado y que su cuenta tenga
   IA habilitada (plan Pro/Business). Backstop del gating del front.
   ============================================================ */

import { createClient } from "@supabase/supabase-js";

export type AiGuard = { ok: boolean; aiAllowed: boolean };

/** Verifica token de Supabase + plan de la org del usuario. */
export async function authAndPlan(token: string): Promise<AiGuard> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return { ok: false, aiAllowed: false };
  const sb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return { ok: false, aiAllowed: false };
  // Plan = el de la organización del perfil del usuario.
  const { data: prof } = await sb.from("profiles").select("org_id").eq("id", u.user.id).maybeSingle();
  const orgId = (prof as { org_id?: string } | null)?.org_id;
  let plan = "starter";
  if (orgId) {
    const { data: org } = await sb.from("organizations").select("plan").eq("id", orgId).maybeSingle();
    plan = (org as { plan?: string } | null)?.plan ?? "starter";
  }
  // Normalizamos para que un "Pro" / " pro " en la DB no niegue la IA por error.
  const norm = plan.toLowerCase().trim();
  return { ok: true, aiAllowed: norm === "pro" || norm === "business" };
}
