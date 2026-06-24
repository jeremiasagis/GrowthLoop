/* ============================================================
   IA · Preguntarle a la Biblioteca de aprendizajes
   ------------------------------------------------------------
   Recibe una pregunta en lenguaje natural + los aprendizajes del
   equipo, y devuelve una síntesis breve + los ids más relevantes.
   Búsqueda semántica por ranking del modelo (sin embeddings).
   Server-side; API key solo acá; usuario autenticado.
   ============================================================ */

import { authAndPlan } from "@/lib/ai-guard";
import { callAnthropic, extractToolInput } from "@/lib/ai-call";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-haiku-4-5";

type Item = { id: string; text: string; type?: string };

export async function POST(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const guard = await authAndPlan(token);
  if (!guard.ok) return Response.json({ error: "No autorizado." }, { status: 401 });
  if (!guard.aiAllowed) return Response.json({ error: "La IA está disponible en el plan Pro." }, { status: 403 });

  let body: { question?: string; items?: Item[] };
  try { body = await req.json(); } catch { return Response.json({ error: "Body inválido." }, { status: 400 }); }
  const question = (body.question ?? "").trim();
  const items = (body.items ?? []).filter((i) => i && i.id && (i.text ?? "").trim()).slice(0, 200);
  if (!question || items.length === 0) return Response.json({ answer: "", relevantIds: [] });

  const tool = {
    name: "responder",
    description: "Responde la pregunta usando solo los aprendizajes provistos.",
    input_schema: {
      type: "object",
      properties: {
        answer: { type: "string", description: "Síntesis breve (2-4 oraciones) que responde la pregunta, basada SOLO en los aprendizajes. Si no hay nada relevante, decilo." },
        relevantIds: { type: "array", items: { type: "string" }, description: "IDs de los aprendizajes más relevantes, del más al menos relevante. Vacío si ninguno aplica." },
      },
      required: ["answer", "relevantIds"],
    },
  };
  const system = "Sos el asistente de la biblioteca de aprendizajes de un equipo de mejora continua. Respondé SOLO con base en los aprendizajes provistos, en español rioplatense, sin inventar. Si la pregunta no se relaciona con ningún aprendizaje, decilo con honestidad.";
  const userMsg = `Pregunta: ${question}\n\nAprendizajes (id · [tipo] · texto):\n${items.map((i) => `${i.id} · [${i.type ?? "—"}] · ${i.text}`).join("\n")}`;

  const r = await callAnthropic({
    model: MODEL, max_tokens: 700, system,
    tools: [tool], tool_choice: { type: "tool", name: "responder" },
    messages: [{ role: "user", content: userMsg }],
  });
  if (!r.ok) return Response.json({ error: r.error, detail: r.detail }, { status: r.status });

  const input = extractToolInput<{ answer?: string; relevantIds?: string[] }>(r.data, "responder");
  const valid = new Set(items.map((i) => i.id));
  return Response.json({
    answer: (input?.answer ?? "").trim(),
    relevantIds: (input?.relevantIds ?? []).filter((id) => valid.has(id)),
  });
}
