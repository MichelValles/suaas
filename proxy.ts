import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, AUTH_VALUE } from "@/lib/auth";

const PUBLIC_PATHS = new Set([
  "/login",
  "/api/auth",
  "/robots.txt",
  "/favicon.ico",
]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/logos/")) return true;
  // Onboard público: cuestionario para convertir humanos reales en perfiles
  // sintéticos. No requiere login porque se comparte con personas externas.
  if (pathname === "/onboard") return true;
  if (pathname.startsWith("/onboard/")) return true;
  if (pathname.startsWith("/api/onboard/")) return true;
  if (pathname === "/api/qr") return true;
  // Landing comercial pública (se comparte con clientes). La vista interna de
  // la calculadora se protege aparte con su propia contraseña.
  if (pathname === "/propuesta") return true;
  if (pathname.startsWith("/api/propuesta/")) return true;
  if (/^\/(icon|apple-icon)(-[a-z0-9]+)?\.(svg|png|ico)$/i.test(pathname)) return true;
  return false;
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  return response;
}

const LEGACY_HOST = "usaas.flat101.business";
const CANONICAL_HOST = "suaas.flat101.business";

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { pathname } = url;

  // Redirect permanente del dominio legado (rename USAAS -> SUAAS).
  const host = request.headers.get("host")?.toLowerCase() ?? "";
  if (host === LEGACY_HOST) {
    url.host = CANONICAL_HOST;
    return NextResponse.redirect(url, 308);
  }

  if (isPublic(pathname)) {
    return withSecurityHeaders(NextResponse.next());
  }

  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (cookie !== AUTH_VALUE) {
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
