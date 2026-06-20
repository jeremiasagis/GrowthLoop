/* ============================================================
   Señal automática · webhook de ingesta
   ------------------------------------------------------------
   Un sistema externo (Sheets/Zapier/n8n/script) hace POST acá con
   el valor actual de la señal de un loop. Lo agregamos a su
   signalLog. Autenticación por token propio del loop (no usa la
   sesión del usuario), así que necesita el service role para
   escribir saltando RLS.

   POST /api/signal/{initId}?key=TOKEN
   body: { "value": "42", "date"?: "2026-06-20" }
   ============================================================ */

import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ initId: string }> }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return Response.json({ error: "Webhook no configurado: falta SUPABASE_SERVICE_ROLE_KEY en el servidor." }, { status: 500 });
  }
  const { initId } = await ctx.params;
  const key = new URL(req.url).searchParams.get("key") ?? req.headers.get("x-signal-key") ?? "";
  if (!key) return Response.json({ error: "Falta el token (key)." }, { status: 401 });

  let body: { value?: unknown; date?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "Body inválido (se espera JSON con 'value')." }, { status: 400 }); }
  const value = body.value;
  if (value == null || `${value}`.trim() === "") return Response.json({ error: "Falta 'value'." }, { status: 400 });
  const date = (body.date && /^\d{4}-\d{2}-\d{2}/.test(body.date)) ? body.date.slice(0, 10) : new Date().toISOString().slice(0, 10);

  const sb = createClient(url, serviceKey);
  const { data: row, error: readErr } = await sb.from("initiatives").select("data").eq("id", initId).maybeSingle();
  if (readErr || !row) return Response.json({ error: "Loop no encontrado." }, { status: 404 });

  const data = (row.data as Record<string, unknown>) ?? {};
  const follow = (data.follow as Record<string, unknown>) ?? {};
  if (!follow.signalToken || follow.signalToken !== key) {
    return Response.json({ error: "Token inválido." }, { status: 401 });
  }
  const log = Array.isArray(follow.signalLog) ? (follow.signalLog as { date: string; value: string }[]) : [];
  const nextLog = [...log, { date, value: `${value}` }];
  const next = { ...data, follow: { ...follow, signalLog: nextLog } };
  const { error: updErr } = await sb.from("initiatives").update({ data: next }).eq("id", initId);
  if (updErr) return Response.json({ error: "No se pudo guardar la señal." }, { status: 500 });

  return Response.json({ ok: true, points: nextLog.length });
}
