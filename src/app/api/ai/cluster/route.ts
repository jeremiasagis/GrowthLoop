/* ============================================================
   IA · Agrupado de tarjetas (piloto)
   ------------------------------------------------------------
   Endpoint server-side: recibe tarjetas anónimas de una retro,
   le pide a Claude que las agrupe por tema y devuelve los grupos
   como datos ({name, cardIds}). La API key vive solo acá (server),
   nunca en el navegador. Requiere usuario autenticado.
   ============================================================ */

import { authAndPlan } from "@/lib/ai-guard";

export const runtime = "nodejs";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5";

type Card = { id: string; text: string };

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "La IA no está configurada (falta ANTHROPIC_API_KEY)." }, { status: 500 });

  // Autenticación + plan (server-side).
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const guard = await authAndPlan(token);
  if (!guard.ok) return Response.json({ error: "No autorizado." }, { status: 401 });
  if (!guard.aiAllowed) return Response.json({ error: "La IA está disponible en el plan Pro." }, { status: 403 });

  let body: { cards?: Card[]; context?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "Body inválido." }, { status: 400 }); }
  const cards = (body.cards ?? []).filter((c) => c && c.id && (c.text ?? "").trim()).slice(0, 80);
  if (cards.length < 2) return Response.json({ clusters: [] });

  const system =
    "Sos un facilitador experto de retrospectivas de equipos. Tu tarea es agrupar tarjetas anónimas que hablan del mismo tema y ponerle a cada grupo un nombre corto, claro y accionable, en español rioplatense. Reglas: no inventes ni reescribas tarjetas; cada tarjeta va en un solo grupo; las que no se parecen a ninguna otra, dejalas fuera (no las fuerces). Devolvé entre 2 y 6 grupos.";
  const userMsg = `${body.context ? body.context + "\n\n" : ""}Tarjetas (id · texto):\n${cards.map((c) => `${c.id} · ${c.text}`).join("\n")}`;

  const tool = {
    name: "agrupar",
    description: "Devuelve los grupos de tarjetas similares.",
    input_schema: {
      type: "object",
      properties: {
        clusters: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Nombre corto del grupo, máximo 6 palabras." },
              cardIds: { type: "array", items: { type: "string" }, description: "IDs de las tarjetas de este grupo." },
            },
            required: ["name", "cardIds"],
          },
        },
      },
      required: ["clusters"],
    },
  };

  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL, max_tokens: 1024, system,
        tools: [tool], tool_choice: { type: "tool", name: "agrupar" },
        messages: [{ role: "user", content: userMsg }],
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
  const toolUse = (data.content ?? []).find((b: { type?: string }) => b.type === "tool_use") as
    | { input?: { clusters?: { name?: string; cardIds?: string[] }[] } } | undefined;
  const raw = toolUse?.input?.clusters ?? [];
  const valid = new Set(cards.map((c) => c.id));
  const seen = new Set<string>();
  const clusters = raw
    .map((cl) => ({
      name: (cl.name ?? "Grupo").trim().slice(0, 60),
      cardIds: (cl.cardIds ?? []).filter((id) => valid.has(id) && !seen.has(id) && (seen.add(id), true)),
    }))
    .filter((cl) => cl.cardIds.length >= 2);

  return Response.json({ clusters });
}
