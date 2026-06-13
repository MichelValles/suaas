"use client";

import { useBetaMode } from "@/components/use-beta-mode";

/**
 * Renderiza a sus hijos solo cuando el modo beta está activo. Sirve para
 * envolver, desde un Server Component, tarjetas o enlaces de módulos aún
 * no desarrollados (la home pasa el contenido ya renderizado como
 * children, así no cruza componentes no serializables por la frontera).
 */
export function BetaOnly({ children }: { children: React.ReactNode }) {
  const [beta] = useBetaMode();
  if (!beta) return null;
  return <>{children}</>;
}
