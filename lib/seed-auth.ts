import { timingSafeEqual } from "node:crypto";

export const SEED_COOKIE = "seed_access";
export const SEED_VALUE = "ok";
export const SEED_MAX_AGE_SECONDS = 60 * 60 * 8;

const DEFAULT_SEED_PASSWORD = "michel101";

/**
 * Contraseña adicional para acceder a /seed-examples y al endpoint
 * /api/seed/examples. La protección existe para que no se siembren
 * ejemplos por accidente (consumen tokens del gateway). El login global
 * de la app ya está antes; esto es una segunda barrera intencional.
 *
 * Override opcional vía `SEED_PASSWORD`. Si no está definida, cae al
 * default acordado (`michel101`).
 */
export function getSeedPassword(): string {
  const env = process.env.SEED_PASSWORD;
  if (env && env.length > 0) return env;
  return DEFAULT_SEED_PASSWORD;
}

export function verifySeedPassword(candidate: string): boolean {
  const expected = getSeedPassword();
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    const padded = Buffer.alloc(Math.max(a.length, b.length, 1));
    timingSafeEqual(padded, padded);
    return false;
  }
  return timingSafeEqual(a, b);
}
