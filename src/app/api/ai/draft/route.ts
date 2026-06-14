/* ============================================================
   IA · Borradores de texto (copiloto del facilitador)
   ------------------------------------------------------------
   Recibe contexto de una sesión y devuelve un texto sugerido
   (causa raíz, narrativa del resultado, etc.) que el facilitador
   edita. Server-side; la API key vive solo acá. Usuario autenticado.
   ============================================================ */

import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5";

const PROMPTS: Record<string, { system: string; maxTokens: number }> = {
  rootcause: {
    maxTokens: 200,
    system:
      "Sos un facilitador experto. A partir de las causas que el equipo agrupó y votó, redactá en UNA sola oración la causa raíz más probable de la traba, en español rioplatense, concreta y sin rodeos. Devolvé SOLO la oración, sin comillas ni preámbulo.",
  },
  narrative: {
    maxTokens: 400,
    system:
      "Sos un facilitador experto. A partir del resultado de la prueba y las reacciones anónimas del equipo, redactá una narrativa breve del ciclo (3 a 5 oraciones) que capture: qué pasó, qué funcionó, qué no funcionó y qué sorprendió. Tono honesto y humano, español rioplatense. Devolvé SOLO el texto, sin títulos, comillas ni viñetas.",
  },
};

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "La IA no está configurada (falta ANTHROPIC_API_KEY)." }, { status: 500 });

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return Response.json({ error: "No autorizado." }, { status: 401 });
  const { data: auth } = await createClient(url, anon).auth.getUser(token);
  if (!auth?.user) return Response.json({ error: "No autorizado." }, { status: 401 });

  let body: { kind?: string; context?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "Body inválido." }, { status: 400 }); }
  const cfg = PROMPTS[body.kind ?? ""];
  const context = (body.context ?? "").trim();
  if (!cfg || !context) return Response.json({ error: "Pedido inválido." }, { status: 400 });

  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL, max_tokens: cfg.maxTokens, system: cfg.system,
        messages: [{ role: "user", content: context.slice(0, 6000) }],
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
