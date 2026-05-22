import { put } from "@vercel/blob";

/**
 * Sube una imagen recibida como data: URL a Vercel Blob y devuelve la URL
 * pública resultante. Si no hay BLOB_READ_WRITE_TOKEN disponible (entorno
 * sin Blob enlazado), devuelve el propio data: URL como fallback para que
 * la app siga funcionando localmente.
 *
 * El parámetro `pathHint` se usa como prefijo del nombre del blob. Vercel
 * añade un sufijo aleatorio para evitar colisiones y URLs enumerables.
 */
export async function uploadDataUrlToBlob(opts: {
  dataUrl: string;
  pathHint: string;
}): Promise<string> {
  if (!opts.dataUrl.startsWith("data:")) {
    // Ya es URL http(s), no hay nada que subir.
    return opts.dataUrl;
  }

  if (!isBlobConfigured()) {
    console.warn(
      "[uploadDataUrlToBlob] BLOB_READ_WRITE_TOKEN no disponible. Se guarda data: URL en su lugar.",
    );
    return opts.dataUrl;
  }

  const match = opts.dataUrl.match(
    /^data:((?:image|video|audio)\/[a-zA-Z0-9+.\-]+);base64,(.+)$/,
  );
  if (!match) {
    throw new Error("data: URL no parece un media base64 válido (image|video|audio).");
  }
  const mime = match[1];
  const bytes = Buffer.from(match[2], "base64");
  const ext = mimeToExt(mime);
  const key = `${stripSlashes(opts.pathHint)}.${ext}`;

  const blob = await put(key, bytes, {
    access: "public",
    contentType: mime,
    addRandomSuffix: true,
  });

  return blob.url;
}

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  };
  return map[mime] ?? mime.split("/")[1] ?? "bin";
}

function stripSlashes(s: string): string {
  return s.replace(/^\/+|\/+$/g, "");
}
