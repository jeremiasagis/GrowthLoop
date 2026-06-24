/* ============================================================
   IA · Norte co-crea un loop
   ------------------------------------------------------------
   A partir del problema descrito en una frase, propone el arranque
   de un loop de mejora: objetivo SMART, zonas de causa probables y
   una apuesta inicial. El equipo lo cura después en las retros.
   Server-side; API key solo acá; usuario auth + plan Pro/Business.
   ============================================================ */

import { authAndPlan } from "@/lib/ai-guard";
import { callAnthropic, extractToolInput } from "@/lib/ai-call";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-haiku-4-5";

const SYSTEM =
  "Sos un coach de mejora continua de equipos. A partir de un problema descrito en pocas palabras, armás el arranque de un 'loop' de mejora (estilo PDCA / Lean). Devolvés —vía la herramienta— un objetivo SMART en una frase, 2 a 4 zonas de causa PROBABLES (hipótesis a validar con el equipo, no causas definitivas) y una apuesta inicial (si hacemos X, esperamos Y, medido por la señal Z). En español rioplatense, concreto y accionable, sin jerga ni relleno. No inventes datos del equipo que no estén en el contexto.";

const TOOL = {
  name: "armar_loop",
  description: "Arma el punto de partida de un loop de mejora a partir del problema.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Nombre corto del loop: qué se va a mejorar (máx ~6 palabras)." },
      objective: { type: "string", description: "Objetivo SMART en una sola frase (específico, medible, con horizonte)." },
      causes: { type: "array", items: { type: "string" }, description: "2 a 4 zonas de causa probables a explorar (hipótesis)." },
      bet: {
        type: "object",
        properties: {
          if: { type: "string", description: "La acción a probar (el 'si hacemos…')." },
          then: { type: "string", description: "El resultado esperado (el 'lograríamos…')." },
          signal: { type: "string", description: "La señal/métrica que diría si va bien." },
        },
        required: ["if", "then", "signal"],
      },
    },
    required: ["title", "objective", "causes", "bet"],
  },
};

export async function POST(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const guard = await authAndPlan(token);
  if (!guard.ok) return Response.json({ error: "No autorizado." }, { status: 401 });
  if (!guard.aiAllowed) return Response.json({ error: "Norte está disponible en el plan Pro." }, { status: 403 });

  let body: { problem?: string; context?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "Body inválido." }, { status: 400 }); }
  const problem = (body.problem ?? "").trim();
  if (!problem) return Response.json({ error: "Contame el problema en una frase." }, { status: 400 });
  const context = (body.context ?? "").slice(0, 2000);

  const r = await callAnthropic({
    model: MODEL, max_tokens: 900, system: SYSTEM,
    tools: [TOOL], tool_choice: { type: "tool", name: "armar_loop" },
    messages: [{ role: "user", content: `Problema: ${problem}${context ? `\n\nContexto del equipo:\n${context}` : ""}` }],
  });
  if (!r.ok) return Response.json({ error: r.error, detail: r.detail }, { status: r.status });

  const input = extractToolInput(r.data, "armar_loop");
  if (!input) return Response.json({ error: "La IA no devolvió una propuesta." }, { status: 502 });
  return Response.json(input);
}
