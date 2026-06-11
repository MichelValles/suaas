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
 *  - Redimensiona a un máximo de 1024px de lado largo (jpeg/png/webp): el
 *    modelo cobra por píxel, no por byte, y las imágenes llegaban a
 *    resolución completa del origen.
 *  - Lanza con mensaje claro si el formato no es soportado.
 *
 * Devuelve la imagen en data URL (`data:image/<mime>;base64,...`) lista para
 * pasarla al AI SDK.
 */

import sharp from "sharp";
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

/**
 * Lado largo máximo antes de enviar al modelo. Anthropic cobra por píxel
 * (~ancho×alto/750 tokens, reescalado server-side a 1568px): bajar a 1024px
 * recorta el coste multimodal por imagen sin perder señal para el scoring
 * (incidente de la cuota, v0.47: creatividades a resolución completa).
 */
const MAX_EDGE = 1024;

/** Formatos que se redimensionan. GIF pasa intacto (preserva la animación;
 * el modelo solo ve el primer frame de todos modos). */
const RESIZABLE = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Reduce la imagen a MAX_EDGE de lado largo si lo supera, manteniendo el
 * formato (un screenshot png sigue siendo png: el texto no gana artefactos
 * jpeg). Si sharp no puede procesarla, devuelve el original: mejor una
 * imagen grande que ninguna.
 */
async function downscaleIfNeeded(
  buf: Buffer,
  mime: string,
): Promise<{ buf: Buffer; mime: string }> {
  if (!RESIZABLE.has(mime)) return { buf, mime };
  try {
    const img = sharp(buf, { failOn: "none" });
    const meta = await img.metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (!w || !h || Math.max(w, h) <= MAX_EDGE) return { buf, mime };
    const out = await img
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .toBuffer();
    return { buf: out, mime };
  } catch {
    return { buf, mime };
  }
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
    const scaled = await downscaleIfNeeded(
      Buffer.from(dataParts.base64, "base64"),
      dataParts.mime,
    );
    return `data:${scaled.mime};base64,${scaled.buf.toString("base64")}`;
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
  const raw = Buffer.from(await res.arrayBuffer());
  const scaled = await downscaleIfNeeded(raw, mime);
  return `data:${scaled.mime};base64,${scaled.buf.toString("base64")}`;
}
