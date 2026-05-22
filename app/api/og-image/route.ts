import { internalError, validationError } from "@/lib/error-response";
import { resolveOgImageDetailed } from "@/lib/targets";

export const runtime = "nodejs";

/**
 * GET /api/og-image?url=https://...
 *
 * Resuelve la imagen Open Graph de una URL pública. Devuelve la URL de la
 * imagen (absoluta) o un mensaje de error legible cuando la página no la
 * expone o cuando el host no pasa las protecciones anti-SSRF de
 * `assertPublicUrl` (lib/url-safety.ts).
 *
 * Pensado para previews en formularios (Campaign Tester, Five-second,
 * Funnel) sin tener que enviar el form entero.
 */
export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) return validationError("Falta el parámetro 'url'.");
  try {
    new URL(url);
  } catch {
    return validationError("URL inválida.");
  }
  try {
    const og = await resolveOgImageDetailed(url);
    if (!og.ok) {
      const intro =
        og.reason === "fetch"
          ? "No pudimos descargar la URL"
          : og.reason === "status"
            ? "La URL respondió con error"
            : "La URL no expone una imagen Open Graph";
      return Response.json(
        { ok: false, error: `${intro}: ${og.detail}` },
        { status: 422 },
      );
    }
    return Response.json({ ok: true, url: og.url });
  } catch (err) {
    return internalError(500, "/api/og-image", err);
  }
}
