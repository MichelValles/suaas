import { z } from "zod";
import { getRunsStatsByEntity } from "@/lib/runs";
import { getServerClient, isMissingColumnError } from "@/lib/supabase";
import { assertPublicUrl } from "@/lib/url-safety";

const FETCH_TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 1_500_000; // 1.5 MB; <head> rara vez excede 200 KB.
const MAX_REDIRECTS = 3;

// ============================================================
// Schemas (zod) : la fuente de verdad de la forma del dato.
// ============================================================

export const FiveSecondPayloadSchema = z.object({
  kind: z.literal("5s_test"),
  main_promise: z.string().min(3, "La promesa principal es obligatoria."),
  image_url: z
    .string()
    .refine(
      (v) => /^https?:\/\//i.test(v) || /^data:image\//i.test(v),
      "Debe ser una URL http(s) o un data:image URL.",
    ),
  source_url: z.string().url().optional(),
});
export type FiveSecondPayload = z.infer<typeof FiveSecondPayloadSchema>;

export const TargetPayloadSchema = FiveSecondPayloadSchema; // futuros kinds aquí
export type TargetPayload = FiveSecondPayload;

export const TargetInputSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  payload: TargetPayloadSchema,
});
export type TargetInput = z.infer<typeof TargetInputSchema>;

export type Target = {
  id: string;
  created_at: string;
  kind: "5s_test";
  name: string;
  payload: FiveSecondPayload;
};

// ============================================================
// CRUD (server only)
// ============================================================

export async function listTargets(): Promise<
  Array<Target & { run_count: number; user_count: number }>
> {
  const supa = getServerClient();
  let { data, error } = await supa
    .from("targets")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (isMissingColumnError(error, "deleted_at")) {
    ({ data, error } = await supa
      .from("targets")
      .select("*")
      .order("created_at", { ascending: false }));
  }
  if (error) throw new Error(error.message);
  const targets = (data ?? []) as Target[];
  if (targets.length === 0) return [];
  const stats = await getRunsStatsByEntity(
    "target_id",
    targets.map((t) => t.id),
  );
  return targets.map((t) => ({
    ...t,
    run_count: stats.get(t.id)?.runs ?? 0,
    user_count: stats.get(t.id)?.users ?? 0,
  }));
}

export async function getTarget(id: string): Promise<Target | null> {
  const supa = getServerClient();
  let { data, error } = await supa
    .from("targets")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (isMissingColumnError(error, "deleted_at")) {
    ({ data, error } = await supa
      .from("targets")
      .select("*")
      .eq("id", id)
      .maybeSingle());
  }
  if (error) throw new Error(error.message);
  return (data ?? null) as Target | null;
}

export async function softDeleteTarget(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa
    .from("targets")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function restoreTarget(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa
    .from("targets")
    .update({ deleted_at: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function hardDeleteTarget(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa.from("targets").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createTarget(input: TargetInput): Promise<Target> {
  const parsed = TargetInputSchema.parse(input);
  const supa = getServerClient();
  const { data, error } = await supa
    .from("targets")
    .insert({
      kind: parsed.payload.kind,
      name: parsed.name,
      payload: parsed.payload,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Target;
}

// ============================================================
// Helper: resolver og:image de una URL pública
// ============================================================

export type OgImageResolution =
  | { ok: true; url: string }
  | { ok: false; reason: "fetch" | "status" | "not-found"; detail: string };

/**
 * Sondea el HTML de `sourceUrl` y devuelve la primera imagen Open Graph /
 * Twitter Card que encuentre. Acepta atributos en cualquier orden, tags
 * multilínea y los alias más comunes (og:image, og:image:url, twitter:image,
 * twitter:image:src). Como último recurso lee `<link rel="image_src">`.
 *
 * Para entornos donde sólo necesitamos saber «¿hay imagen?», la versión legacy
 * `resolveOgImage()` mantiene el contrato anterior (string | null).
 */
export async function resolveOgImageDetailed(
  sourceUrl: string,
): Promise<OgImageResolution> {
  // Validar host público y seguir redirects manualmente, revalidando cada
  // salto. Evita SSRF a localhost/RFC1918/metadata cloud y redirects
  // maliciosos hacia hosts internos.
  let currentUrl: string = sourceUrl;
  let res: Response | null = null;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      await assertPublicUrl(currentUrl);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(currentUrl, {
          redirect: "manual",
          signal: controller.signal,
          headers: {
            // UA de Chrome real: muchas landings corporativas sirven HTML
            // distinto a UAs marcadas como bot.
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
          },
        });
      } finally {
        clearTimeout(timeout);
      }
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          return { ok: false, reason: "status", detail: `HTTP ${response.status} sin Location.` };
        }
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }
      res = response;
      break;
    }
    if (!res) {
      return { ok: false, reason: "fetch", detail: "Demasiadas redirecciones." };
    }
  } catch (err) {
    return { ok: false, reason: "fetch", detail: (err as Error).message };
  }
  if (!res.ok) {
    return {
      ok: false,
      reason: "status",
      detail: `HTTP ${res.status} al pedir la URL.`,
    };
  }
  const html = await readBoundedText(res, MAX_HTML_BYTES);

  // Sólo nos quedamos con el <head> si lo encontramos: las landings grandes
  // tienen MB de body que ralentizan el regex.
  const headMatch = html.match(/<head[\s\S]*?<\/head>/i);
  const haystack = headMatch ? headMatch[0] : html;

  // Lista de patrones por orden de preferencia.
  const patterns: RegExp[] = [
    // og:image / og:image:url / og:image:secure_url (property antes que content)
    /<meta[^>]+property=["']og:image(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["']/i,
    // Atributos invertidos: content antes que property
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url|:url)?["']/i,
    // twitter:image / twitter:image:src
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
    // Itemprop image (Schema.org básico)
    /<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["']/i,
    // Link rel="image_src" (fallback histórico)
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
  ];

  for (const re of patterns) {
    const m = haystack.match(re);
    if (m?.[1]) {
      return { ok: true, url: absolutize(m[1].trim(), sourceUrl) };
    }
  }
  return {
    ok: false,
    reason: "not-found",
    detail:
      "La página respondió pero no incluye og:image, twitter:image ni link rel=image_src en el HTML.",
  };
}

/**
 * Versión simple para compatibilidad: devuelve la URL o null.
 */
export async function resolveOgImage(sourceUrl: string): Promise<string | null> {
  const out = await resolveOgImageDetailed(sourceUrl);
  return out.ok ? out.url : null;
}

function absolutize(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

/**
 * Lee el body como texto deteniéndose cuando excede `maxBytes`. Evita
 * que un servidor malicioso (o lento) nos haga procesar GBs en memoria.
 */
async function readBoundedText(res: Response, maxBytes: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let received = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
      break;
    }
    chunks.push(decoder.decode(value, { stream: true }));
  }
  chunks.push(decoder.decode());
  return chunks.join("");
}
