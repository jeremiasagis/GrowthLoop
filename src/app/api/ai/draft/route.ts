/* ============================================================
   IA · Borradores de texto (copiloto del facilitador)
   ------------------------------------------------------------
   Recibe contexto de una sesión y devuelve un texto sugerido
   (causa raíz, narrativa del resultado, etc.) que el facilitador
   edita. Server-side; la API key vive solo acá. Usuario autenticado.
   ============================================================ */

import { authAndPlan } from "@/lib/ai-guard";
import { callAnthropic, extractText, extractToolInput } from "@/lib/ai-call";

export const runtime = "nodejs";
export const maxDuration = 60;

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
    const r = await callAnthropic({
      model: MODEL, max_tokens: 500, system,
      tools: [tool], tool_choice: { type: "tool", name: "disenar_apuesta" },
      messages: [{ role: "user", content: context.slice(0, 6000) }],
    });
    if (!r.ok) return Response.json({ error: r.error, detail: r.detail }, { status: r.status });
    return Response.json({ fields: extractToolInput<Record<string, string>>(r.data, "disenar_apuesta") ?? {} });
  }

  // ── Texto libre (causa raíz, narrativa) ──
  const cfg = PROMPTS[kind];
  if (!cfg) return Response.json({ error: "Pedido inválido." }, { status: 400 });
  const r = await callAnthropic({
    model: MODEL, max_tokens: cfg.maxTokens, system: cfg.system,
    messages: [{ role: "user", content: context.slice(0, 6000) }],
  });
  if (!r.ok) return Response.json({ error: r.error, detail: r.detail }, { status: r.status });
  return Response.json({ text: extractText(r.data) });
}
