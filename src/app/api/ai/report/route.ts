/* ============================================================
   IA · Reporte ejecutivo de un ciclo
   ------------------------------------------------------------
   Toma el resumen de datos de un ciclo cerrado y devuelve un
   informe ejecutivo en markdown, listo para compartir con el
   líder/empresa. Server-side; API key solo acá; usuario auth.
   Usa Sonnet (más calidad; se llama 1 vez por ciclo).
   ============================================================ */

import { authAndPlan } from "@/lib/ai-guard";

export const runtime = "nodejs";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

const SYSTEM =
  "Sos un consultor de mejora continua que redacta informes ejecutivos claros y honestos para líderes. A partir de los datos de un ciclo de mejora de un equipo, escribí un informe breve en español rioplatense, en markdown, con esta estructura: un título; un párrafo de resumen ejecutivo (3-4 oraciones); '## Qué se probó'; '## Resultado' (con el dato concreto y si se alcanzó el umbral); '## Aprendizajes clave' (viñetas); '## Decisión y próximo paso'; y si hay datos de clima, '## Estado del equipo'. Sé concreto y directo, sin relleno ni jerga. No inventes datos que no estén en el contexto; si falta algo, no lo menciones.";

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "La IA no está configurada (falta ANTHROPIC_API_KEY)." }, { status: 500 });

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const guard = await authAndPlan(token);
  if (!guard.ok) return Response.json({ error: "No autorizado." }, { status: 401 });
  if (!guard.aiAllowed) return Response.json({ error: "La IA está disponible en el plan Pro." }, { status: 403 });

  let body: { context?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "Body inválido." }, { status: 400 }); }
  const context = (body.context ?? "").trim();
  if (!context) return Response.json({ error: "No hay datos del ciclo para resumir." }, { status: 400 });

  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL, max_tokens: 1600, system: SYSTEM,
        messages: [{ role: "user", content: context.slice(0, 12000) }],
      }),
    });
  } catch {
    return Response.json({ error: "No se pudo contactar a la IA." }, { status: 502 });
  }
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    return Response.json({ error: "La IA no respondió bien.", detail }, { status: 502 });
  }
  const data = await res.json();
  const text = (data.content ?? []).filter((b: { type?: string }) => b.type === "text").map((b: { text?: string }) => b.text ?? "").join("").trim();
  return Response.json({ text });
}
