/* ============================================================
   Growthloop — Supabase browser client (listo para enchufar)
   ------------------------------------------------------------
   Todavía no se usa: la app corre con datos de ejemplo a través
   de `repository.ts`. Cuando quieras conectar tu Supabase de
   TeamCook, completá `.env.local` y empezá a usar este cliente
   dentro de las funciones de `repository.ts`.
   ============================================================ */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/**
 * Devuelve un cliente Supabase para el navegador (singleton).
 * Lanza un error claro si faltan las variables de entorno, para
 * que sea evidente qué configurar.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copiá .env.example a .env.local y completá tus credenciales de Supabase.",
    );
  }

  browserClient = createClient(url, anonKey);
  return browserClient;
}
