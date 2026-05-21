import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase clients.
 *
 * - `getBrowserClient()`: cliente público (anon key). Para el navegador.
 * - `getServerClient()`: cliente con service role. Sólo en Server Components,
 *   Route Handlers o Server Actions. Nunca exponer al cliente.
 *
 * Las vars se autoprovisionan al instalar Supabase desde el Marketplace de Vercel.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let browser: SupabaseClient | null = null;
let server: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient {
  if (!URL || !ANON_KEY) {
    throw new Error("Supabase no configurado: faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  if (!browser) browser = createClient(URL, ANON_KEY);
  return browser;
}

export function getServerClient(): SupabaseClient {
  if (!URL || !SERVICE_ROLE_KEY) {
    throw new Error("Supabase no configurado: faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
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
