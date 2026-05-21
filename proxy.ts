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
  if (/^\/(icon|apple-icon)(-[a-z0-9]+)?\.(svg|png|ico)$/i.test(pathname)) return true;
  return false;
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  return response;
}

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { pathname } = url;

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
