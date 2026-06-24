/* ============================================================
   IA · Cliente compartido de Anthropic
   ------------------------------------------------------------
   Un solo lugar para llamar a la Messages API. Centraliza:
   - reintentos ante sobrecarga (429/529/5xx) con backoff,
   - timeout por intento (AbortController),
   - detección de truncado (stop_reason === "max_tokens"),
   - logging del request_id de Anthropic ante errores.
   Las rutas /api/ai/* lo usan en vez de armar el fetch a mano.
   ============================================================ */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const TIMEOUT_MS = 50_000; // tope por intento; debe quedar por debajo de maxDuration
const MAX_RETRIES = 2; // total de intentos = 3 (solo ante errores reintentables)

type Block = { type?: string; text?: string; input?: unknown; name?: string };
export type AnthropicData = { content?: Block[]; stop_reason?: string };

export type AiResult =
  | { ok: true; data: AnthropicData; truncated: boolean }
  | { ok: false; status: number; error: string; detail?: string };

type CallBody = {
  model: string;
  max_tokens: number;
  system?: string;
  messages: { role: string; content: string }[];
  tools?: unknown[];
  tool_choice?: unknown;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const backoff = (attempt: number) => Math.min(4000, 500 * 2 ** attempt) + Math.floor(Math.random() * 250);

/** Llama a la Messages API con reintentos, timeout y logging. */
export async function callAnthropic(body: CallBody): Promise<AiResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, status: 500, error: "La IA no está configurada (falta ANTHROPIC_API_KEY)." };

  let lastDetail = "";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
    } catch (e) {
      clearTimeout(timer);
      // Timeout propio: no reintentamos (volvería a colgar y excede maxDuration).
      if (e instanceof Error && e.name === "AbortError") {
        console.error(`[ai-call] ${body.model} timeout tras ${TIMEOUT_MS}ms`);
        return { ok: false, status: 504, error: "La IA tardó demasiado en responder.", detail: "timeout" };
      }
      lastDetail = e instanceof Error ? e.message : "network";
      if (attempt < MAX_RETRIES) { await sleep(backoff(attempt)); continue; }
      return { ok: false, status: 502, error: "No se pudo contactar a la IA.", detail: lastDetail };
    }
    clearTimeout(timer);

    if (res.ok) {
      const data = (await res.json()) as AnthropicData;
      return { ok: true, data, truncated: data.stop_reason === "max_tokens" };
    }

    lastDetail = (await res.text()).slice(0, 300);
    const reqId = res.headers.get("request-id") ?? "";
    const retryable = res.status === 429 || res.status === 529 || res.status >= 500;
    console.error(`[ai-call] ${body.model} status=${res.status} req=${reqId} attempt=${attempt} ${lastDetail}`);
    if (retryable && attempt < MAX_RETRIES) {
      const ra = Number(res.headers.get("retry-after"));
      await sleep(Number.isFinite(ra) && ra > 0 ? ra * 1000 : backoff(attempt));
      continue;
    }
    return { ok: false, status: 502, error: "La IA no respondió bien.", detail: lastDetail };
  }
  return { ok: false, status: 502, error: "La IA no respondió bien.", detail: lastDetail };
}

/** Junta los bloques de texto de la respuesta. */
export function extractText(data: AnthropicData): string {
  return (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
}

/** Devuelve el input del primer bloque tool_use (opcionalmente por nombre), o null. */
export function extractToolInput<T = Record<string, unknown>>(data: AnthropicData, name?: string): T | null {
  const tool = (data.content ?? []).find((b) => b.type === "tool_use" && (!name || b.name === name));
  return (tool?.input as T) ?? null;
}
