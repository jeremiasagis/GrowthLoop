/* ============================================================
   IA · Reporte ejecutivo de un ciclo
   ------------------------------------------------------------
   Toma el resumen de datos de un ciclo cerrado y devuelve un
   informe ejecutivo en markdown, listo para compartir con el
   líder/empresa. Server-side; API key solo acá; usuario auth.
   Usa Sonnet (más calidad; se llama 1 vez por ciclo).
   ============================================================ */

import { authAndPlan } from "@/lib/ai-guard";
import { callAnthropic, extractText } from "@/lib/ai-call";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-sonnet-4-6";

const SYSTEM =
  "Sos un consultor de mejora continua que redacta informes ejecutivos claros y honestos para líderes. A partir de los datos de un ciclo de mejora de un equipo, escribí un informe breve en español rioplatense, en markdown, con esta estructura: un título; un párrafo de resumen ejecutivo (3-4 oraciones); '## Qué se probó'; '## Resultado' (con el dato concreto y si se alcanzó el umbral); '## Aprendizajes clave' (viñetas); '## Decisión y próximo paso'; y si hay datos de clima, '## Estado del equipo'. Sé concreto y directo, sin relleno ni jerga. No inventes datos que no estén en el contexto; si falta algo, no lo menciones.";

export async function POST(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const guard = await authAndPlan(token);
  if (!guard.ok) return Response.json({ error: "No autorizado." }, { status: 401 });
  if (!guard.aiAllowed) return Response.json({ error: "La IA está disponible en el plan Pro." }, { status: 403 });

  let body: { context?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "Body inválido." }, { status: 400 }); }
  const context = (body.context ?? "").trim();
  if (!context) return Response.json({ error: "No hay datos del ciclo para resumir." }, { status: 400 });

  const r = await callAnthropic({
    model: MODEL, max_tokens: 1600, system: SYSTEM,
    messages: [{ role: "user", content: context.slice(0, 12000) }],
  });
  if (!r.ok) return Response.json({ error: r.error, detail: r.detail }, { status: r.status });
  return Response.json({ text: extractText(r.data), truncated: r.truncated });
}
