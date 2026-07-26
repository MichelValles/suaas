"use client";

import { track } from "@vercel/analytics";
import { useEffect } from "react";

/**
 * Dispara `docs_viewed { slug }` al montar el visor de un documento. Las
 * páginas de /docs son estáticas (se generan en build), así que el evento se
 * emite en cliente; el pageview genérico ya existe, este evento añade el slug
 * como dimensión segmentable.
 */
export function DocsViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    track("docs_viewed", { slug });
  }, [slug]);
  return null;
}
