/* ============================================================
   IA · Borradores de texto (copiloto del facilitador)
   ------------------------------------------------------------
   Recibe contexto de una sesión y devuelve un texto sugerido
   (causa raíz, narrativa del resultado, etc.) que el facilitador
   edita. Server-side; la API key vive solo acá. Usuario autenticado.
   ============================================================ */

import { authAndPlan } from "@/lib/ai-guard";

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
  const guard = await authAndPlan(token);
  if (!guard.ok) return Response.json({ error: "No autorizado." }, { status: 401 });
  if (!guard.aiAllowed) return Response.json({ error: "La IA está disponible en el plan Pro." }, { status: 403 });

  let body: { kind?: string; context?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "Body inválido." }, { status: 400 }); }
  const kind = body.kind ?? "";
  const context = (body.context ?? "").trim();
  if (!context) return Response.json({ error: "Pedido inválido." }, { status: 400 });

  // ── Salida estructurada (apuesta): devuelve campos ──
  if (kind === "bet") {
    const tool = {
      name: "disenar_apuesta",
      description: "Diseña una apuesta de mejora concreta y testeable.",
      input_schema: {
        type: "object",
        properties: {
          betIf: { type: "string", description: "La acción concreta que el equipo va a hacer distinto (qué exactamente)." },
          betThen: { type: "string", description: "El resultado esperado si la acción funciona." },
          signal: { type: "string", description: "Qué observar o medir para saber si avanza." },
          threshold: { type: "string", description: "Umbral numérico concreto y alcanzable en ~15 días. Ej: 'de 5 a 1 por semana'." },
        },
        required: ["betIf", "betThen", "signal", "threshold"],
      },
    };
    const system = "Sos un facilitador experto en experimentos de mejora. A partir del contexto (idea elegida, causa raíz, tensión), diseñá UNA apuesta concreta y testeable. Español rioplatense, frases cortas y sin jerga. El umbral debe ser un número concreto y realista para ~15 días.";
    let res: Response;
    try {
      res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: MODEL, max_tokens: 500, system,
          tools: [tool], tool_choice: { type: "tool", name: "disenar_apuesta" },
          messages: [{ role: "user", content: context.slice(0, 6000) }],
        }),
      });
    } catch { return Response.json({ error: "No se pudo contactar a la IA." }, { status: 502 }); }
    if (!res.ok) return Response.json({ error: "La IA no respondió bien.", detail: (await res.text()).slice(0, 300) }, { status: 502 });
    const data = await res.json();
    const toolUse = (data.content ?? []).find((b: { type?: string }) => b.type === "tool_use") as { input?: Record<string, string> } | undefined;
    return Response.json({ fields: toolUse?.input ?? {} });
  }

  // ── Texto libre (causa raíz, narrativa) ──
  const cfg = PROMPTS[kind];
  if (!cfg) return Response.json({ error: "Pedido inválido." }, { status: 400 });
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
