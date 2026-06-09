import { generateObject } from "ai";
import { z } from "zod";
import { DEFAULT_MODEL } from "@/lib/gateway";
import { getServerClient } from "@/lib/supabase";
import { recordUsage } from "@/lib/usage";

// ============================================================
// Tipos y schemas
// ============================================================

export const SegmentInputSchema = z.object({
  label: z.string().min(1).describe("Nombre corto del segmento de intención."),
  jtbd: z
    .string()
    .min(1)
    .describe("Frase JTBD: «Cuando [situación] quiero [motivación] para poder [resultado]»."),
  query: z
    .string()
    .min(1)
    .describe("La query que este segmento escribiría en un buscador IA."),
});
export type SegmentInput = z.infer<typeof SegmentInputSchema>;

export const SegmentResultSchema = z.object({
  label: z.string(),
  query: z.string(),
  simulated_response: z
    .string()
    .describe("Respuesta simulada del motor de búsqueda IA para esta query."),
  brand_mentioned: z.boolean(),
  brand_position: z.enum(["primary", "secondary", "absent"]).describe(
    "'primary' = la marca aparece como primera recomendación o protagonista; 'secondary' = aparece en lista o de fondo; 'absent' = no aparece.",
  ),
  visibility_score: z
    .number()
    .min(0)
    .max(1)
    .describe("0 = marca ausente, 1 = primera recomendación con tono positivo."),
  recommendation_tone: z
    .enum(["positive", "neutral", "negative", "absent"])
    .describe("Tono con el que se menciona la marca. 'absent' si no aparece."),
  key_claims: z
    .array(z.string())
    .describe("Afirmaciones clave que el buscador IA hace sobre la marca. Vacío si no aparece."),
  missing_attributes: z
    .array(z.string())
    .describe(
      "Atributos que el segmento valoraría y que el buscador IA no menciona de la marca.",
    ),
});
export type SegmentResult = z.infer<typeof SegmentResultSchema>;

export type GeoAnalysisInput = {
  name: string;
  brand_name: string;
  brand_description: string;
  segments: SegmentInput[];
};

export type GeoAnalysis = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  brand_name: string;
  brand_description: string;
  segments: SegmentInput[];
  results: SegmentResult[] | null;
  status: "pending" | "running" | "done" | "error";
};

// ============================================================
// LLM: análisis de un segmento
// ============================================================

export async function analyzeSegment(
  brand_name: string,
  brand_description: string,
  segment: SegmentInput,
): Promise<{ result: SegmentResult; latencyMs: number; usage: unknown }> {
  const startedAt = Date.now();

  const system = [
    "Eres un simulador de motores de búsqueda con IA (estilo Perplexity, Google AI Overview, ChatGPT Search).",
    "Tu tarea es doble:",
    "1. Simular la respuesta que daría un buscador IA cuando un usuario con la intención descrita hace esa query.",
    "2. Analizar la presencia y visibilidad de la marca en esa respuesta.",
    "",
    "Reglas de la simulación:",
    "- Responde como lo haría el buscador: sintetiza fuentes, da una respuesta directa, menciona marcas si son relevantes.",
    "- NO favorezcas artificialmente a la marca: si no es la más conocida o relevante para la query, puede no aparecer o aparecer en segundo plano.",
    "- La respuesta simulada debe sonar natural, como texto de un resumen de buscador IA (2-4 frases).",
    "",
    "Reglas del análisis:",
    "- 'brand_mentioned': verdadero solo si el nombre de la marca aparece explícitamente en tu respuesta simulada.",
    "- 'brand_position': 'primary' si es la primera o única recomendación, 'secondary' si aparece junto a otras, 'absent' si no aparece.",
    "- 'visibility_score': combina posición y tono. 1.0 = primera recomendación positiva, 0.5 = mencionada de fondo, 0.0 = ausente.",
    "- 'key_claims': solo afirmaciones positivas o informativas que el buscador haría sobre la marca.",
    "- 'missing_attributes': qué cosas busca este segmento (según su JTBD) que la marca no comunica bien en fuentes públicas.",
  ].join("\n");

  const prompt = [
    `## Marca`,
    `Nombre: ${brand_name}`,
    `Descripción: ${brand_description}`,
    "",
    `## Segmento de intención`,
    `Label: ${segment.label}`,
    `JTBD: ${segment.jtbd}`,
    `Query al buscador IA: "${segment.query}"`,
    "",
    "Simula la respuesta del buscador y analiza la presencia de la marca.",
  ].join("\n");

  const AnalysisOutputSchema = SegmentResultSchema.omit({ label: true, query: true });

  const res = await generateObject({
    model: DEFAULT_MODEL,
    schema: AnalysisOutputSchema,
    system,
    prompt,
  });

  return {
    result: {
      label: segment.label,
      query: segment.query,
      ...res.object,
    },
    latencyMs: Date.now() - startedAt,
    usage: res.usage ?? null,
  };
}

// ============================================================
// CRUD
// ============================================================

export async function createGeoAnalysis(input: GeoAnalysisInput): Promise<GeoAnalysis> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("geo_analyses")
    .insert({
      name: input.name,
      brand_name: input.brand_name,
      brand_description: input.brand_description,
      segments: input.segments,
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as GeoAnalysis;
}

export async function listGeoAnalyses(): Promise<GeoAnalysis[]> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("geo_analyses")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as GeoAnalysis[];
}

export async function deleteGeoAnalysis(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa.from("geo_analyses").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getGeoAnalysis(id: string): Promise<GeoAnalysis | null> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("geo_analyses")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as GeoAnalysis | null;
}

export async function runGeoAnalysis(id: string): Promise<GeoAnalysis> {
  const supa = getServerClient();

  const analysis = await getGeoAnalysis(id);
  if (!analysis) throw new Error("Análisis GEO no encontrado.");
  if (analysis.status === "running") throw new Error("El análisis ya está en marcha.");

  await supa.from("geo_analyses").update({ status: "running" }).eq("id", id);

  try {
    const results: SegmentResult[] = [];
    for (const segment of analysis.segments) {
      const { result, latencyMs, usage } = await analyzeSegment(
        analysis.brand_name,
        analysis.brand_description,
        segment,
      );
      await recordUsage({
        scope: "geo_probe",
        model: DEFAULT_MODEL,
        usage,
        meta: { geo_analysis_id: id, segment_label: segment.label, latency_ms: latencyMs },
      });
      results.push(result);
    }

    const { data, error } = await supa
      .from("geo_analyses")
      .update({ status: "done", results, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as GeoAnalysis;
  } catch (err) {
    try {
      await supa
        .from("geo_analyses")
        .update({ status: "error", updated_at: new Date().toISOString() })
        .eq("id", id);
    } catch { /* silently ignore */ }
    throw err;
  }
}
