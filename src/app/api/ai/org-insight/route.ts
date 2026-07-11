/* ============================================================
   IA · Lectura de la organización (admin / RRHH)
   ------------------------------------------------------------
   Toma los agregados cruzados de la org (clima por dimensión,
   madurez, riesgo, desarrollo) — ya anonimizados — y devuelve una
   lectura con recomendaciones, o responde una pregunta puntual.
   Solo admin/superadmin. Server-side; API key solo acá.
   ============================================================ */

import { createClient } from "@supabase/supabase-js";
import { callAnthropic, extractText } from "@/lib/ai-call";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-sonnet-4-6";

const SYSTEM =
  "Sos un analista de cultura y desarrollo organizacional que asesora a líderes y RRHH. Recibís datos AGREGADOS y anónimos de los equipos de una organización (clima por dimensión, madurez, señales de riesgo, focos de desarrollo). Respondé en español rioplatense, en markdown, conciso y accionable. Si te piden una lectura general: empezá con 2-3 oraciones de síntesis honesta, después '## Señales de atención' (viñetas con el dato concreto y qué equipo), '## Lo que viene bien', y '## Recomendaciones' (2-3 acciones concretas para el líder/RRHH). Si te hacen una pregunta puntual, respondela directo apoyándote en los datos. No inventes datos que no estén en el contexto; si falta info, decilo. No identifiques personas: los datos son de equipos, no de individuos.";

async function callerIsAdmin(token: string): Promise<{ ok: boolean }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return { ok: false };
  const sb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return { ok: false };
  const { data: prof } = await sb.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
  const role = (prof as { role?: string } | null)?.role ?? "";
  return { ok: role === "admin" || role === "superadmin" };
}

export async function POST(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const guard = await callerIsAdmin(token);
  if (!guard.ok) return Response.json({ error: "No autorizado." }, { status: 401 });

  let body: { context?: string; question?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "Body inválido." }, { status: 400 }); }
  const context = (body.context ?? "").trim();
  if (!context) return Response.json({ error: "No hay datos de la organización para analizar." }, { status: 400 });
  const question = (body.question ?? "").trim();

  const userContent = question
    ? `Datos agregados de la organización:\n${context.slice(0, 11000)}\n\nPregunta del líder: ${question.slice(0, 500)}`
    : `Datos agregados de la organización:\n${context.slice(0, 11000)}\n\nDame una lectura general de la cultura y el desarrollo, con recomendaciones.`;

  const r = await callAnthropic({
    model: MODEL, max_tokens: 1400, system: SYSTEM,
    messages: [{ role: "user", content: userContent }],
  });
  if (!r.ok) return Response.json({ error: r.error, detail: r.detail }, { status: r.status });
  return Response.json({ text: extractText(r.data), truncated: r.truncated });
}
