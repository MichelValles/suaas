import { cookies } from "next/headers";
import { z } from "zod";
import {
  LANDING_COOKIE,
  LANDING_MAX_AGE_SECONDS,
  LANDING_VALUE,
  verifyLandingPassword,
} from "@/lib/landing-auth";

export const runtime = "nodejs";

const BodySchema = z.object({
  password: z.string().optional(),
  lock: z.boolean().optional(),
});

export async function POST(request: Request) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json().catch(() => ({})));
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const jar = await cookies();

  // Cerrar el modo interno.
  if (body.lock) {
    jar.delete(LANDING_COOKIE);
    return Response.json({ ok: true, unlocked: false });
  }

  if (!body.password || !verifyLandingPassword(body.password)) {
    return Response.json({ ok: false }, { status: 401 });
  }

  jar.set(LANDING_COOKIE, LANDING_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: LANDING_MAX_AGE_SECONDS,
  });
  return Response.json({ ok: true, unlocked: true });
}
