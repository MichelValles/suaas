/**
 * Higieniza errores que salen al cliente. Los mensajes detallados se
 * registran en `console.error` (visibles en logs de Vercel) pero la
 * respuesta HTTP devuelve sólo un mensaje genérico para no filtrar
 * estructura interna de la base, nombres de columnas, paths, claves
 * parciales, etc.
 *
 * Errores de validación (status 4xx) son tratados por separado: ahí el
 * mensaje viene del schema zod del propio body, no del servidor, y es
 * seguro devolverlo al cliente para que sepa qué corregir.
 */
export function internalError(
  status: number,
  tag: string,
  err: unknown,
): Response {
  const e = err as Error & { cause?: unknown };
  console.error(`[${tag}] error`, {
    message: e.message,
    stack: e.stack,
    cause: e.cause,
  });
  return new Response(
    JSON.stringify({ ok: false, error: "Error interno." }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

export function validationError(message: string): Response {
  return new Response(
    JSON.stringify({ ok: false, error: message }),
    { status: 400, headers: { "Content-Type": "application/json" } },
  );
}

export function serviceUnavailable(message: string): Response {
  return new Response(
    JSON.stringify({ ok: false, error: message }),
    { status: 503, headers: { "Content-Type": "application/json" } },
  );
}
