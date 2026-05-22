"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { uploadDataUrlToBlob } from "@/lib/blob";
import {
  TargetInputSchema,
  createTarget,
  resolveOgImageDetailed,
} from "@/lib/targets";

const FormSchema = z.object({
  name: z.string().min(1),
  main_promise: z.string().min(3),
  mode: z.enum(["url", "upload"]),
  source_url: z.string().optional().default(""),
  image_url_data: z.string().optional().default(""),
});

export type CreateTargetState = {
  ok: boolean;
  error?: string;
};

export async function createTargetAction(
  _prev: CreateTargetState,
  formData: FormData,
): Promise<CreateTargetState> {
  let parsed: z.infer<typeof FormSchema>;
  try {
    parsed = FormSchema.parse(Object.fromEntries(formData));
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  let imageUrl: string | null = null;
  let sourceUrl: string | undefined;

  if (parsed.mode === "upload") {
    if (!parsed.image_url_data || !parsed.image_url_data.startsWith("data:")) {
      return { ok: false, error: "Sube una imagen válida (formato data:image/*)." };
    }
    try {
      imageUrl = await uploadDataUrlToBlob({
        dataUrl: parsed.image_url_data,
        pathHint: `targets/${slugify(parsed.name)}/screen`,
      });
    } catch (err) {
      return { ok: false, error: `Error subiendo la imagen: ${(err as Error).message}` };
    }
  } else {
    if (!parsed.source_url) {
      return { ok: false, error: "URL fuente obligatoria en modo URL." };
    }
    try {
      // sanity-check de URL
      new URL(parsed.source_url);
    } catch {
      return { ok: false, error: "La URL fuente no es válida." };
    }
    sourceUrl = parsed.source_url;
    const og = await resolveOgImageDetailed(parsed.source_url);
    if (!og.ok) {
      const intro =
        og.reason === "fetch"
          ? "No pudimos descargar la URL"
          : og.reason === "status"
            ? "La URL respondió con error"
            : "La URL no expone una imagen Open Graph";
      return {
        ok: false,
        error: `${intro}: ${og.detail} Sube un screenshot manualmente desde el modo «Upload».`,
      };
    }
    imageUrl = og.url;
  }

  const input = TargetInputSchema.parse({
    name: parsed.name,
    payload: {
      kind: "5s_test",
      main_promise: parsed.main_promise,
      image_url: imageUrl,
      source_url: sourceUrl,
    },
  });

  let id: string;
  try {
    const created = await createTarget(input);
    id = created.id;
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  revalidatePath("/targets");
  redirect(`/targets/${id}`);
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "untitled";
}
