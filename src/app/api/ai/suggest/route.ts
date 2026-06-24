/* ============================================================
   IA · Sugerir qué retro hacer
   ------------------------------------------------------------
   Recomienda 1-2 retros de la etapa para este equipo, según su
   situación y (opcional) lo que el facilitador quiere trabajar.
   Elige solo de la lista provista (retros habilitadas por el plan).
   Server-side; API key solo acá; usuario autenticado.
   ============================================================ */

import { authAndPlan } from "@/lib/ai-guard";
import { callAnthropic, extractToolInput } from "@/lib/ai-call";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-haiku-4-5";

type Retro = { id: string; name: string; purpose: string };

export async function POST(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const guard = await authAndPlan(token);
  if (!guard.ok) return Response.json({ error: "No autorizado." }, { status: 401 });
  if (!guard.aiAllowed) return Response.json({ error: "La IA está disponible en el plan Pro." }, { status: 403 });

  let body: { stage?: string; intent?: string; state?: string; retros?: Retro[] };
  try { body = await req.json(); } catch { return Response.json({ error: "Body inválido." }, { status: 400 }); }
  const retros = (body.retros ?? []).filter((r) => r && r.id && r.name).slice(0, 30);
  if (retros.length === 0) return Response.json({ picks: [] });
  const intent = (body.intent ?? "").trim();

  const tool = {
    name: "recomendar",
    description: "Recomienda 1 o 2 retros de la lista.",
    input_schema: {
      type: "object",
      properties: {
        picks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "El id EXACTO de una retro de la lista." },
              reason: { type: "string", description: "Una sola oración, concreta, de por qué conviene a este equipo ahora." },
            },
            required: ["id", "reason"],
          },
        },
      },
      required: ["picks"],
    },
  };
  const system =
    "Sos un facilitador experto de equipos. Recomendá 1 o 2 retrospectivas de la LISTA provista para este equipo. Elegí SOLO por el id exacto de la lista. Si el facilitador escribió qué quiere trabajar hoy, esa intención manda; si no, guiate por el estado del equipo. Razones de una sola línea, en español rioplatense, concretas (no genéricas).";
  const userMsg =
    `Etapa: ${body.stage ?? "—"}.\n` +
    (intent ? `El facilitador quiere trabajar hoy: "${intent}".\n` : "El facilitador no especificó un foco; recomendá según el estado del equipo.\n") +
    `\nEstado del equipo:\n${(body.state ?? "Sin datos.").slice(0, 2000)}\n` +
    `\nRetros disponibles (id · nombre · para qué):\n${retros.map((r) => `${r.id} · ${r.name} · ${r.purpose}`).join("\n")}`;

  const r = await callAnthropic({
    model: MODEL, max_tokens: 600, system,
    tools: [tool], tool_choice: { type: "tool", name: "recomendar" },
    messages: [{ role: "user", content: userMsg }],
  });
  if (!r.ok) return Response.json({ error: r.error, detail: r.detail }, { status: r.status });

  const input = extractToolInput<{ picks?: { id?: string; reason?: string }[] }>(r.data, "recomendar");
  const valid = new Set(retros.map((rt) => rt.id));
  const picks = (input?.picks ?? [])
    .filter((p) => p.id && valid.has(p.id))
    .slice(0, 2)
    .map((p) => ({ id: p.id as string, reason: (p.reason ?? "").trim() }));
  return Response.json({ picks });
}
