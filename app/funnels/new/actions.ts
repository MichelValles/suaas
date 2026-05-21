"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  FunnelInputSchema,
  createFunnel,
  type FunnelStepInput,
} from "@/lib/funnels";
import { resolveOgImage } from "@/lib/targets";

const StepFormSchema = z.object({
  name: z.string().min(1),
  intent: z.string().min(3),
  mode: z.enum(["url", "upload"]),
  source_url: z.string().optional().default(""),
  image_url_data: z.string().optional().default(""),
});

export type CreateFunnelState = {
  ok: boolean;
  error?: string;
};

export async function createFunnelAction(
  _prev: CreateFunnelState,
  formData: FormData,
): Promise<CreateFunnelState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const stepsRaw = String(formData.get("steps_json") ?? "");

  if (!name) return { ok: false, error: "El nombre del embudo es obligatorio." };

  let rawSteps: unknown;
  try {
    rawSteps = JSON.parse(stepsRaw);
  } catch {
    return { ok: false, error: "Estructura de pasos corrupta." };
  }
  if (!Array.isArray(rawSteps)) {
    return { ok: false, error: "Estructura de pasos corrupta." };
  }
  if (rawSteps.length < 2) {
    return { ok: false, error: "Un embudo necesita al menos 2 pasos." };
  }
  if (rawSteps.length > 12) {
    return { ok: false, error: "Máximo 12 pasos por embudo." };
  }

  const resolvedSteps: FunnelStepInput[] = [];
  for (let i = 0; i < rawSteps.length; i++) {
    const raw = rawSteps[i];
    let parsed: z.infer<typeof StepFormSchema>;
    try {
      parsed = StepFormSchema.parse(raw);
    } catch (err) {
      return {
        ok: false,
        error: `Paso ${i + 1}: ${(err as Error).message}`,
      };
    }

    let imageUrl: string | null = null;
    let sourceUrl: string | undefined;

    if (parsed.mode === "upload") {
      if (!parsed.image_url_data || !parsed.image_url_data.startsWith("data:")) {
        return {
          ok: false,
          error: `Paso ${i + 1}: sube una imagen válida.`,
        };
      }
      imageUrl = parsed.image_url_data;
    } else {
      if (!parsed.source_url) {
        return {
          ok: false,
          error: `Paso ${i + 1}: URL fuente obligatoria en modo URL.`,
        };
      }
      try {
        new URL(parsed.source_url);
      } catch {
        return {
          ok: false,
          error: `Paso ${i + 1}: la URL fuente no es válida.`,
        };
      }
      sourceUrl = parsed.source_url;
      const og = await resolveOgImage(parsed.source_url);
      if (!og) {
        return {
          ok: false,
          error: `Paso ${i + 1}: no se pudo resolver og:image. Prueba a subir un screenshot manualmente.`,
        };
      }
      imageUrl = og;
    }

    resolvedSteps.push({
      name: parsed.name,
      intent: parsed.intent,
      payload: {
        kind: parsed.mode,
        image_url: imageUrl,
        source_url: sourceUrl,
      },
    });
  }

  const input = FunnelInputSchema.parse({
    name,
    description: description || null,
    steps: resolvedSteps,
  });

  let id: string;
  try {
    const created = await createFunnel(input);
    id = created.id;
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  revalidatePath("/funnels");
  redirect(`/funnels/${id}`);
}
