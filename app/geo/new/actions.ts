"use server";

import { redirect } from "next/navigation";
import { createGeoAnalysis, SegmentInputSchema } from "@/lib/geo";
import { isSupabaseConfigured } from "@/lib/supabase";
import { z } from "zod";

const GeoFormSchema = z.object({
  name: z.string().min(1, "Nombre obligatorio"),
  brand_name: z.string().min(1, "Nombre de marca obligatorio"),
  brand_description: z.string().min(20, "Descripción mínima de 20 caracteres"),
  // Marca de Cerebro (opcional): habilita el retrieval RAG en el runner.
  brand_id: z.string().optional(),
  segments_json: z.string().min(2, "Introduce al menos un segmento"),
});

export type GeoFormState = { ok: boolean; error?: string };

export async function createGeoAnalysisAction(
  _prev: GeoFormState,
  formData: FormData,
): Promise<GeoFormState> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase no configurado." };
  }
  const result = GeoFormSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    const msg = result.error.issues.map((i) => i.message).join(" · ");
    return { ok: false, error: msg };
  }

  let segments: unknown;
  try {
    segments = JSON.parse(result.data.segments_json);
  } catch {
    return { ok: false, error: "El JSON de segmentos no es válido." };
  }
  const segParsed = z.array(SegmentInputSchema).safeParse(segments);
  if (!segParsed.success) {
    return {
      ok: false,
      error: "Segmentos inválidos: " + segParsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  if (segParsed.data.length === 0) {
    return { ok: false, error: "Introduce al menos un segmento." };
  }
  if (segParsed.data.length > 10) {
    return { ok: false, error: "Máximo 10 segmentos por análisis." };
  }

  let analysisId: string;
  try {
    const analysis = await createGeoAnalysis({
      name: result.data.name,
      brand_name: result.data.brand_name,
      brand_description: result.data.brand_description,
      brand_id: result.data.brand_id?.trim() || null,
      segments: segParsed.data,
    });
    analysisId = analysis.id;
  } catch (err) {
    console.error("[createGeoAnalysisAction] insert failed", err);
    return { ok: false, error: "No se pudo guardar el análisis. Inténtalo de nuevo." };
  }

  // redirect lanza NEXT_REDIRECT: debe quedar fuera del try/catch.
  redirect(`/geo/${analysisId}`);
}
