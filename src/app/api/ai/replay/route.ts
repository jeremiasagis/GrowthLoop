/* ============================================================
   IA · El relato del equipo — narra el viaje de mejora continua
   de UN equipo como una historia con capítulos, a partir de su
   data real (diagnósticos, loops, apuestas, aprendizajes, pulso).
   Server-side; API key solo acá; usuario auth + plan Pro/Business.
   ============================================================ */

import { authAndPlan } from "@/lib/ai-guard";

export const runtime = "nodejs";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM =
  "Sos un narrador de mejora continua. Te paso, en orden cronológico, los hitos reales del viaje de UN equipo: diagnósticos que hicieron, causas que encontraron, apuestas que diseñaron, qué probaron, qué aprendieron, decisiones, y cómo evolucionó su clima. Tu tarea: convertir eso en un relato breve y humano —no un informe— en español rioplatense, que le devuelva al equipo el sentido de su recorrido y los haga sentir el progreso. Dividilo en capítulos cronológicos. Cada capítulo: un período (si hay fecha), un título corto y evocador, y 2-4 oraciones que cuenten qué pasó y por qué importó, atado a los datos. Sé honesto: si hubo un loop que no funcionó o un clima que bajó, contalo como parte del aprendizaje, sin maquillar. No inventes hechos que no estén en los datos. El 'tone' de cada capítulo describe su carácter (inicio, diagnostico, apuesta, logro, aprendizaje, desafio).";

const TOOL = {
  name: "narrar_relato",
  description: "Devuelve el relato del equipo en capítulos.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Título del relato, evocador y propio del equipo." },
      intro: { type: "string", description: "1-2 oraciones que abren la historia." },
      chapters: {
        type: "array",
        items: {
          type: "object",
          properties: {
            period: { type: "string", description: "Fecha o período, ej 'Marzo 2026'. Vacío si no hay fecha." },
            title: { type: "string" },
            body: { type: "string" },
            tone: { type: "string", enum: ["inicio", "diagnostico", "apuesta", "logro", "aprendizaje", "desafio"] },
          },
          required: ["title", "body", "tone"],
        },
      },
    },
    required: ["title", "chapters"],
  },
};

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "La IA no está configurada (falta ANTHROPIC_API_KEY)." }, { status: 500 });

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const guard = await authAndPlan(token);
  if (!guard.ok) return Response.json({ error: "No autorizado." }, { status: 401 });
  if (!guard.aiAllowed) return Response.json({ error: "El relato del equipo está en el plan Pro." }, { status: 403 });

  let body: { context?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "Body inválido." }, { status: 400 }); }
  const context = (body.context ?? "").trim();
  if (!context) return Response.json({ error: "Todavía no hay suficiente recorrido para armar un relato." }, { status: 400 });

  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2200,
        system: SYSTEM,
        tools: [TOOL],
        tool_choice: { type: "tool", name: "narrar_relato" },
        messages: [{ role: "user", content: context.slice(0, 16000) }],
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
  const tool = (data.content ?? []).find((b: { type?: string }) => b.type === "tool_use");
  if (!tool?.input) return Response.json({ error: "La IA no devolvió un relato válido." }, { status: 502 });
  return Response.json({ relato: tool.input });
}
