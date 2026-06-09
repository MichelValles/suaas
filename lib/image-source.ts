/**
 * Normaliza una URL de imagen antes de enviarla a Anthropic vía AI Gateway.
 *
 * Anthropic sólo acepta `image/jpeg | image/png | image/gif | image/webp` en
 * el campo `media_type` de los bloques multimodales. Cualquier otra cosa
 * (svg, avif, ico, jpg sin la "e") provoca un error como:
 *
 *   messages.0.content.1.image.source.base64.media_type:
 *   Input should be 'image/jpeg', 'image/png', 'image/gif' or 'image/webp'
 *
 * Esta función:
 *  - Acepta tanto `data:image/...;base64,...` como `http(s)://...`.
 *  - Renormaliza alias comunes: `image/jpg` -> `image/jpeg`.
 *  - Para URLs http(s), descarga y devuelve un data URL con la `media_type`
 *    real saneada.
 *  - Lanza con mensaje claro si el formato no es soportado.
 *
 * Devuelve la imagen en data URL (`data:image/<mime>;base64,...`) lista para
 * pasarla al AI SDK.
 */

import { assertPublicUrl } from "@/lib/url-safety";

const ALLOWED_MIME = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const MIME_ALIASES: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png",
};

export class UnsupportedImageError extends Error {
  constructor(public mime: string) {
    super(
      `Formato de imagen no soportado para el modelo (${mime || "desconocido"}). ` +
        `Convierte a JPEG, PNG, GIF o WEBP.`,
    );
    this.name = "UnsupportedImageError";
  }
}

function canonicalMime(mime: string | null | undefined): string | null {
  if (!mime) return null;
  const trimmed = mime.split(";")[0]?.trim().toLowerCase() ?? "";
  return MIME_ALIASES[trimmed] ?? trimmed;
}

function assertAllowed(mime: string | null): asserts mime is string {
  if (!mime || !ALLOWED_MIME.has(mime)) {
    throw new UnsupportedImageError(mime ?? "");
  }
}

/**
 * Parsea una data URL `data:<mime>;base64,<payload>`. Devuelve null si no es
 * data URL.
 */
function parseDataUrl(
  src: string,
): { mime: string | null; base64: string } | null {
  const match = src.match(/^data:([^;,]+)?(?:;[^,]*)*,(.*)$/i);
  if (!match) return null;
  return {
    mime: canonicalMime(match[1] ?? null),
    base64: match[2] ?? "",
  };
}

function bufferToBase64(buf: ArrayBuffer): string {
  // Disponible en Node.js (runtime de Vercel Functions).
  return Buffer.from(buf).toString("base64");
}

/**
 * Resuelve `image_url` a un data URL con media_type aceptado por Anthropic.
 * Lanza UnsupportedImageError si el formato no es soportado.
 */
export async function resolveImageForApi(imageUrl: string): Promise<string> {
  if (!imageUrl) {
    throw new UnsupportedImageError("");
  }

  // Caso 1: ya es data URL.
  const dataParts = parseDataUrl(imageUrl);
  if (dataParts) {
    assertAllowed(dataParts.mime);
    return `data:${dataParts.mime};base64,${dataParts.base64}`;
  }

  // Caso 2: http(s). Validar anti-SSRF antes de descargar.
  if (!/^https?:\/\//i.test(imageUrl)) {
    throw new UnsupportedImageError("");
  }
  await assertPublicUrl(imageUrl);

  const res = await fetch(imageUrl, {
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; SUAAS/0.16; +https://suaas.flat101.business)",
      Accept: "image/*",
    },
  });
  if (!res.ok) {
    throw new Error(
      `No se pudo descargar la imagen del target (HTTP ${res.status}).`,
    );
  }
  const mime = canonicalMime(res.headers.get("content-type"));
  assertAllowed(mime);
  const buf = await res.arrayBuffer();
  return `data:${mime};base64,${bufferToBase64(buf)}`;
}
