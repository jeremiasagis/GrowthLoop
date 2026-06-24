/* ============================================================
   IA · Norte — asistente de organización
   ------------------------------------------------------------
   Tres "superpoderes" sobre los datos de una organización:
   - orgReport:     informe ejecutivo unificado de todos los equipos
   - retroPlan:     qué retro/sesión le conviene a cada equipo ahora
   - libraryDigest: patrones y aprendizajes transversales
   Server-side; API key solo acá; usuario auth + plan Pro/Business.
   ============================================================ */

import { authAndPlan } from "@/lib/ai-guard";
import { callAnthropic, extractText } from "@/lib/ai-call";

export const runtime = "nodejs";
export const maxDuration = 60;

type Kind = "triage" | "orgReport" | "retroPlan" | "libraryDigest" | "teamReport" | "oneononePrep";

const CFG: Record<Kind, { model: string; max: number; system: string }> = {
  triage: {
    model: "claude-haiku-4-5",
    max: 1200,
    system:
      "Sos el asistente de un facilitador de mejora continua con varios equipos. Te paso, agrupadas por equipo, señales de alerta detectadas automáticamente (inactividad, clima bajo, iniciativas frenadas, vencimientos). Tu tarea: priorizar y devolver una lista accionable de 'qué atender' en español rioplatense, en markdown, ordenada de más urgente a menos. Para cada punto: a qué equipo, qué pasa y UNA acción concreta a hacer. Si varios equipos comparten el mismo problema, agrupalos. Sé breve y directo, sin relleno. No agregues equipos ni problemas que no estén en los datos: trabajá solo con lo que te paso.",
  },
  orgReport: {
    model: "claude-sonnet-4-6",
    max: 1800,
    system:
      "Sos un consultor de mejora continua que asesora a un líder de organización. A partir de los datos de VARIOS equipos, escribí un informe ejecutivo unificado en español rioplatense, en markdown, con esta estructura: un título; un resumen ejecutivo (estado general de la organización, 3-4 oraciones); '## Panorama por equipo' (una viñeta por equipo con su etapa, clima y qué está trabajando); '## Temas transversales' (patrones que se repiten entre equipos); '## Dónde poner el foco' (2-4 recomendaciones priorizadas). Concreto, honesto y directo, sin relleno ni jerga. No inventes datos que no estén en el contexto; si de un equipo faltan datos, decilo en una línea.",
  },
  retroPlan: {
    model: "claude-haiku-4-5",
    max: 1400,
    system:
      "Sos un coach de equipos de mejora continua. El ciclo tiene estas etapas en orden: Exploración (diagnóstico), Objetivos, Foco, Ideación, Seguimiento, Aprendizaje. A partir del estado de cada equipo (etapa actual, clima/pulso, actividad reciente), recomendá para CADA equipo la próxima retro o sesión más útil y por qué. Respondé en español rioplatense, en markdown: una sección '### {nombre del equipo}' por equipo, con la recomendación concreta (qué hacer) y 1-2 oraciones de por qué, atadas a sus datos. Breve y accionable. No inventes datos.",
  },
  libraryDigest: {
    model: "claude-haiku-4-5",
    max: 1400,
    system:
      "Sos un facilitador de aprendizaje organizacional. A partir de los aprendizajes que registraron los equipos en su biblioteca, destilá lo que importa, en español rioplatense, en markdown: '## Patrones' (temas recurrentes entre equipos, viñetas); '## Aprendizajes transferibles' (los que le sirven a toda la organización); '## Para institucionalizar' (1-3 que conviene volver práctica o norma). No inventes; si hay pocos datos, decilo con franqueza.",
  },
  teamReport: {
    model: "claude-sonnet-4-6",
    max: 1600,
    system:
      "Sos un consultor de mejora continua que le prepara a un sponsor o management un reporte ejecutivo de UN equipo. A partir de sus datos (objetivo, clima y su evolución, loops en curso con su señal antes→ahora→meta, decisiones, aprendizajes transferibles, vencimientos), escribí un reporte breve en español rioplatense, en markdown, con esta estructura: un titular de estado en una línea; '## Dónde está el equipo' (2-3 oraciones: clima, foco y ritmo); '## Loops en curso' (una viñeta por loop activo: qué problema ataca, en qué etapa está y cómo viene la señal); '## Qué se movió' (resultados o señales que cambiaron, con números si los hay); '## Aprendizajes clave' (1-3 transferibles); '## Dónde poner el foco' (1-3 recomendaciones priorizadas). Está pensado para alguien que NO estuvo en las sesiones: claro, directo, sin jerga ni relleno. No inventes datos; si falta información, decilo en una línea.",
  },
  oneononePrep: {
    model: "claude-haiku-4-5",
    max: 1000,
    system:
      "Sos un coach que ayuda a un líder a preparar un 1-a-1 de DESARROLLO con un integrante de su equipo. A partir de las brechas del 360 (cómo se ve la persona vs. cómo la ve el equipo), el objetivo del equipo y los compromisos previos, devolvé una agenda breve: 4-6 puntos concretos para conversar, en español rioplatense, uno por línea, sin numerar ni viñetas (solo el texto del punto). Enfocá en desarrollo y crecimiento (nunca en evaluación de desempeño), empezá por lo apreciativo (fortalezas) y después los puntos ciegos. Cada punto, una frase accionable. No inventes datos que no estén en el contexto.",
  },
};

export async function POST(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const guard = await authAndPlan(token);
  if (!guard.ok) return Response.json({ error: "No autorizado." }, { status: 401 });
  if (!guard.aiAllowed) return Response.json({ error: "Norte está disponible en el plan Pro." }, { status: 403 });

  let body: { kind?: string; context?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "Body inválido." }, { status: 400 }); }
  const kind = body.kind as Kind;
  const cfg = CFG[kind];
  if (!cfg) return Response.json({ error: "Acción desconocida." }, { status: 400 });
  const context = (body.context ?? "").trim();
  if (!context) return Response.json({ error: "No hay datos suficientes para esta acción." }, { status: 400 });

  const r = await callAnthropic({
    model: cfg.model, max_tokens: cfg.max, system: cfg.system,
    messages: [{ role: "user", content: context.slice(0, 14000) }],
  });
  if (!r.ok) return Response.json({ error: r.error, detail: r.detail }, { status: r.status });
  return Response.json({ text: extractText(r.data), truncated: r.truncated });
}
