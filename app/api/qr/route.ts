import QRCode from "qrcode";
import { type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/qr?data=<url>
 *
 * Devuelve un SVG con el QR del texto pasado. Pensado para el modal de
 * "Compartir cuestionario" en /profiles. No expone datos sensibles: sólo
 * acepta lo que el caller le pasa por query string. Se cachea agresivamente
 * porque para un mismo input el SVG es idéntico.
 */
export async function GET(req: NextRequest) {
  const data = req.nextUrl.searchParams.get("data");
  if (!data) {
    return new Response("Missing data", { status: 400 });
  }
  if (data.length > 500) {
    return new Response("Too long", { status: 400 });
  }
  try {
    const svg = await QRCode.toString(data, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 1,
      color: {
        dark: "#0e0e10",
        light: "#ffffff00",
      },
      width: 320,
    });
    return new Response(svg, {
      status: 200,
      headers: {
        "content-type": "image/svg+xml",
        "cache-control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (err) {
    console.error("[qr] generate failed", err);
    return new Response("Error", { status: 500 });
  }
}
