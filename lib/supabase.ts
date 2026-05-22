import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase server-only con service role. Toda la lectura/escritura
 * de SUAAS pasa por aquí; el navegador nunca habla directamente con la
 * base. Las vars se autoprovisionan al instalar Supabase desde el
 * Marketplace de Vercel.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let server: SupabaseClient | null = null;

export function getServerClient(): SupabaseClient {
  if (!URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase no configurado: faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (!server) {
    server = createClient(URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return server;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(URL && ANON_KEY);
}

/**
 * Detecta si un error proviene de una tabla que no existe (PostgREST
 * code `PGRST205` o mensaje "Could not find the table"). Útil para
 * mostrar mensajes de "aplica la migración X" en vez de stack traces.
 */
export function isMissingTableError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { code?: string; message?: string };
  if (e.code === "PGRST205") return true;
  if (typeof e.message === "string" && /could not find the table/i.test(e.message)) {
    return true;
  }
  return false;
}
