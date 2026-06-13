import { generateImage } from "ai";
import { uploadDataUrlToBlob, isBlobConfigured } from "@/lib/blob";
import { type Profile, getProfile } from "@/lib/profiles";
import { getServerClient } from "@/lib/supabase";
import { recordUsage } from "@/lib/usage";

/**
 * Retrato fotorrealista del perfil calibrado, generado vía AI Gateway y
 * fijado en Vercel Blob (cada generación da una cara distinta; el blob la
 * congela). El prompt NO incluye el nombre del perfil: solo características
 * demográficas y tono emocional, para minimizar parecidos casuales con
 * personas reales. La UI lo etiqueta siempre como retrato generado por IA.
 */

export const AVATAR_MODEL =
  process.env.SUAAS_AVATAR_MODEL ?? "google/imagen-4.0-generate-001";

/** Coste aproximado por retrato con Imagen 4 (catálogo del gateway). */
export const AVATAR_EST_USD = 0.04;

function moodFromNeuroticism(n: number): string {
  if (n >= 0.7) return "a tired but dignified expression, subtle worry in the eyes";
  if (n <= 0.5) return "a calm, quietly hopeful expression";
  return "a thoughtful, reserved expression";
}

function buildAvatarPrompt(profile: Profile): string {
  const d = profile.demographics;
  const isMale = /hombre|var[oó]n|masculino/i.test(d.gender);
  const subject = isMale ? "man" : "woman";
  const nationality = /francia|france/i.test(d.geo ?? "")
    ? "French"
    : "Spanish";
  return [
    `Photorealistic head-and-shoulders portrait photograph of a ${nationality} ${subject}, ${d.age} years old, who works as ${d.occupation}.`,
    `Natural window light, neutral warm background, looking at the camera with ${moodFromNeuroticism(profile.big_five.neuroticism)}.`,
    "Everyday realistic appearance and clothing, realistic skin texture, documentary photography style, 85mm lens, shallow depth of field.",
    "No text, no watermark, no logos.",
  ].join(" ");
}

/**
 * Genera el retrato, lo sube a Blob y persiste la URL en el perfil.
 * Mensajes de error de negocio seguros para el cliente.
 */
export async function generateProfileAvatar(
  profileId: string,
): Promise<{ avatar_url: string; model: string }> {
  const profile = await getProfile(profileId);
  if (!profile) throw new Error("Perfil no encontrado.");
  if (!isBlobConfigured()) {
    throw new Error(
      "Vercel Blob no está configurado (falta BLOB_READ_WRITE_TOKEN): no hay dónde guardar el retrato.",
    );
  }

  const startedAt = Date.now();
  const { image } = await generateImage({
    model: AVATAR_MODEL,
    prompt: buildAvatarPrompt(profile),
    aspectRatio: "1:1",
  });

  const avatarUrl = await uploadDataUrlToBlob({
    dataUrl: `data:${image.mediaType};base64,${image.base64}`,
    pathHint: `avatars/${profileId}`,
  });

  const supa = getServerClient();
  const { error } = await supa
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", profileId);
  if (error) throw new Error(error.message);

  // La facturación de imagen es por unidad, no por tokens: queda en meta.
  await recordUsage({
    scope: "profile_avatar",
    model: AVATAR_MODEL,
    usage: null,
    meta: {
      profile_id: profileId,
      est_usd: AVATAR_EST_USD,
      latency_ms: Date.now() - startedAt,
    },
  });

  return { avatar_url: avatarUrl, model: AVATAR_MODEL };
}
