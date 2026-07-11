/* ============================================================
   IA · Sintetizar lo detectado → desafíos
   ------------------------------------------------------------
   Toma lo que salió de las retros de detección (radar de clima,
   sailboat, voz del cliente) y propone desafíos concretos para el
   backlog del equipo. Server-side; API key solo acá; Pro.
   ============================================================ */

import { authAndPlan } from "@/lib/ai-guard";
import { callAnthropic, extractToolInput } from "@/lib/ai-call";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-sonnet-4-6";
const DOMAINS = ["comunicacion", "cliente", "eficiencia", "clima", "otro"];

export async function POST(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const guard = await authAndPlan(token);
  if (!guard.ok) return Response.json({ error: "No autorizado." }, { status: 401 });
  if (!guard.aiAllowed) return Response.json({ error: "La IA está disponible en el plan Pro." }, { status: 403 });

  let body: { context?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "Body inválido." }, { status: 400 }); }
  const context = (body.context ?? "").trim();
  if (!context) return Response.json({ challenges: [] });

  const tool = {
    name: "proponer_desafios",
    description: "Propone 3 a 6 desafíos concretos a partir de lo detectado.",
    input_schema: {
      type: "object",
      properties: {
        challenges: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "El desafío en una frase accionable (máx ~90 caracteres)." },
              detail: { type: "string", description: "Una oración de contexto: qué señal lo respalda." },
              scope: { type: "string", enum: ["collective", "individual"], description: "colectivo (del equipo) o individual (de una persona)." },
              domain: { type: "string", enum: DOMAINS, description: "área del desafío." },
            },
            required: ["title", "detail", "scope", "domain"],
          },
        },
      },
      required: ["challenges"],
    },
  };
  const system =
    "Sos un facilitador experto de mejora continua. A partir de lo que un equipo detectó en sus retros (clima, obstáculos, voz del cliente), proponé de 3 a 6 desafíos CONCRETOS y accionables para su backlog. Cada uno debe surgir de una señal real del texto (no inventes). Preferí desafíos colectivos salvo que claramente sea el desarrollo de una persona. Español rioplatense, títulos accionables y sin jerga. Elegí el dominio más adecuado.";

  const r = await callAnthropic({
    model: MODEL, max_tokens: 900, system,
    tools: [tool], tool_choice: { type: "tool", name: "proponer_desafios" },
    messages: [{ role: "user", content: `Lo que el equipo detectó:\n${context.slice(0, 9000)}` }],
  });
  if (!r.ok) return Response.json({ error: r.error, detail: r.detail }, { status: r.status });

  const input = extractToolInput<{ challenges?: { title?: string; detail?: string; scope?: string; domain?: string }[] }>(r.data, "proponer_desafios");
  const challenges = (input?.challenges ?? [])
    .filter((c) => c.title && c.title.trim())
    .slice(0, 6)
    .map((c) => ({
      title: c.title!.trim().slice(0, 120),
      detail: (c.detail ?? "").trim(),
      scope: c.scope === "individual" ? "individual" : "collective",
      domain: DOMAINS.includes(c.domain ?? "") ? c.domain! : "otro",
    }));
  return Response.json({ challenges });
}
