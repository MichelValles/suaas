import { timingSafeEqual } from "node:crypto";

export const AUTH_COOKIE = "auth_suaas";
export const AUTH_VALUE = "ok";
export const AUTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const DEV_FALLBACK_PASSWORD = "michel101";

/**
 * Devuelve la contraseña global de acceso.
 *
 * - En desarrollo (`NODE_ENV !== "production"`), usa `ACCESS_PASSWORD` o,
 *   si falta, el fallback `michel101` para acelerar la iteración local.
 * - En producción, exige que `ACCESS_PASSWORD` esté definida y no vacía.
 *   Si no lo está devuelve `null` y `verifyAccessPassword` rechazará todo
 *   intento de login. Evita exponer la app si un deploy se hiciese sin la
 *   env por error.
 */
export function getAccessPassword(): string | null {
  const env = process.env.ACCESS_PASSWORD;
  if (env && env.length > 0) return env;
  if (process.env.NODE_ENV !== "production") return DEV_FALLBACK_PASSWORD;
  return null;
}

/**
 * Comparación constant-time del password recibido vs. el esperado.
 * Defensa frente a timing attacks aun siendo una superficie pequeña.
 */
export function verifyAccessPassword(candidate: string): boolean {
  const expected = getAccessPassword();
  if (!expected) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Llamamos igual a timingSafeEqual con buffers del mismo tamaño para
    // gastar el mismo tiempo. Devolver false antes filtraría la longitud
    // por canal lateral.
    const padded = Buffer.alloc(Math.max(a.length, b.length, 1));
    timingSafeEqual(padded, padded);
    return false;
  }
  return timingSafeEqual(a, b);
}
