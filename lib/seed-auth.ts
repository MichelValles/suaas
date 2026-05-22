import { timingSafeEqual } from "node:crypto";

export const SEED_COOKIE = "seed_access";
export const SEED_VALUE = "ok";
export const SEED_MAX_AGE_SECONDS = 60 * 60 * 8;

const DEV_FALLBACK_SEED_PASSWORD = "michel101";

/**
 * Contraseña adicional para acceder a /seed-examples y al endpoint
 * /api/seed/examples. La protección existe para que no se siembren
 * ejemplos por accidente (consumen tokens del gateway). El login global
 * de la app ya está antes; esto es una segunda barrera intencional.
 *
 * - En desarrollo (`NODE_ENV !== "production"`) usa `SEED_PASSWORD` o,
 *   si falta, el fallback `michel101` para iteración local.
 * - En producción exige `SEED_PASSWORD` definida y no vacía. Si no lo
 *   está devuelve `null` y `verifySeedPassword` rechaza cualquier
 *   intento. Evita que el segundo factor sea conocido por estar en el
 *   repo público (default hardcodeado).
 */
export function getSeedPassword(): string | null {
  const env = process.env.SEED_PASSWORD;
  if (env && env.length > 0) return env;
  if (process.env.NODE_ENV !== "production") return DEV_FALLBACK_SEED_PASSWORD;
  return null;
}

export function verifySeedPassword(candidate: string): boolean {
  const expected = getSeedPassword();
  if (!expected) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    const padded = Buffer.alloc(Math.max(a.length, b.length, 1));
    timingSafeEqual(padded, padded);
    return false;
  }
  return timingSafeEqual(a, b);
}
