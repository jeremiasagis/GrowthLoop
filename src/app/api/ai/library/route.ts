/* ============================================================
   IA · Preguntarle a la Biblioteca de aprendizajes
   ------------------------------------------------------------
   Recibe una pregunta en lenguaje natural + los aprendizajes del
   equipo, y devuelve una síntesis breve + los ids más relevantes.
   Búsqueda semántica por ranking del modelo (sin embeddings).
   Server-side; API key solo acá; usuario autenticado.
   ============================================================ */

import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5";

type Item = { id: string; text: string; type?: string };

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "La IA no está configurada (falta ANTHROPIC_API_KEY)." }, { status: 500 });

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return Response.json({ error: "No autorizado." }, { status: 401 });
  const { data: auth } = await createClient(url, anon).auth.getUser(token);
  if (!auth?.user) return Response.json({ error: "No autorizado." }, { status: 401 });

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

  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL, max_tokens: 700, system,
        tools: [tool], tool_choice: { type: "tool", name: "responder" },
        messages: [{ role: "user", content: userMsg }],
      }),
    });
  } catch { return Response.json({ error: "No se pudo contactar a la IA." }, { status: 502 }); }
  if (!res.ok) return Response.json({ error: "La IA no respondió bien.", detail: (await res.text()).slice(0, 300) }, { status: 502 });

  const data = await res.json();
  const toolUse = (data.content ?? []).find((b: { type?: string }) => b.type === "tool_use") as { input?: { answer?: string; relevantIds?: string[] } } | undefined;
  const valid = new Set(items.map((i) => i.id));
  return Response.json({
    answer: (toolUse?.input?.answer ?? "").trim(),
    relevantIds: (toolUse?.input?.relevantIds ?? []).filter((id) => valid.has(id)),
  });
}
