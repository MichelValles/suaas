import { z } from "zod";
import { getServerClient } from "@/lib/supabase";

// ============================================================
// Schemas (zod) — la fuente de verdad de la forma del dato.
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

export async function listTargets(): Promise<Target[]> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("targets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Target[];
}

export async function getTarget(id: string): Promise<Target | null> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("targets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as Target | null;
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

export async function resolveOgImage(sourceUrl: string): Promise<string | null> {
  let html: string;
  try {
    const res = await fetch(sourceUrl, {
      redirect: "follow",
      headers: {
        // UA realista para evitar bloqueos a bots básicos.
        "User-Agent":
          "Mozilla/5.0 (compatible; SUAAS/0.4; +https://suaas.flat101.business)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  }

  // Cogemos el primer match razonable de og:image (con cualquier orden de atributos).
  const candidates = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const re of candidates) {
    const m = html.match(re);
    if (m?.[1]) return absolutize(m[1], sourceUrl);
  }
  return null;
}

function absolutize(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}
