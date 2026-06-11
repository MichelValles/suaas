import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Gate de la vista interna de la landing comercial (/propuesta).
 *
 * La landing es pública (se comparte con clientes); la calculadora muestra
 * sólo la tarifa. La vista INTERNA (rentabilidad bruta y neta) se desbloquea
 * con una contraseña vía el login del footer. Es un gate de presentación: el
 * objetivo es que un cliente que ve la landing no vea los márgenes por
 * accidente, no una barrera criptográfica (la calculadora corre en el
 * navegador). Para confidencialidad real, mover el cálculo a servidor.
 */

export const LANDING_COOKIE = "landing_internal";
export const LANDING_VALUE = "ok";
export const LANDING_MAX_AGE_SECONDS = 60 * 60 * 8;

const DEFAULT_PASSWORD = "michel101";

/** Contraseña del modo interno. Overridable con LANDING_PASSWORD en Vercel. */
export function getLandingPassword(): string {
  const env = process.env.LANDING_PASSWORD;
  return env && env.length > 0 ? env : DEFAULT_PASSWORD;
}

export function verifyLandingPassword(candidate: string): boolean {
  const expected = getLandingPassword();
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    const padded = Buffer.alloc(Math.max(a.length, b.length, 1));
    timingSafeEqual(padded, padded);
    return false;
  }
  return timingSafeEqual(a, b);
}

/** True si la cookie del modo interno está presente y es válida. */
export async function isInternalUnlocked(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(LANDING_COOKIE)?.value === LANDING_VALUE;
}
