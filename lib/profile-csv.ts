import { ProfileFormSchema, parseProfileForm } from "@/lib/profile-form";
import type { Profile, ProfileInput } from "@/lib/profiles";

/**
 * Esquema CSV de perfiles. El orden de las columnas en la cabecera debe
 * coincidir con `PROFILE_CSV_HEADERS`. Las listas COM-B se serializan con
 * `;` interno para que un `,` (separador típico) no rompa la fila.
 */
export const PROFILE_CSV_HEADERS = [
  "name",
  "age",
  "gender",
  "occupation",
  "income_band",
  "geo",
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
  "capability",
  "opportunity",
  "motivation",
  "backstory",
  "source",
  "intent_context",
] as const;

export type ProfileCsvRow = Record<(typeof PROFILE_CSV_HEADERS)[number], string>;

export function profileToCsvRow(p: Profile): ProfileCsvRow {
  return {
    name: p.name,
    age: String(p.demographics.age),
    gender: p.demographics.gender,
    occupation: p.demographics.occupation,
    income_band: p.demographics.income_band ?? "",
    geo: p.demographics.geo ?? "",
    openness: fmtNum(p.big_five.openness),
    conscientiousness: fmtNum(p.big_five.conscientiousness),
    extraversion: fmtNum(p.big_five.extraversion),
    agreeableness: fmtNum(p.big_five.agreeableness),
    neuroticism: fmtNum(p.big_five.neuroticism),
    capability: (p.com_b_barriers.capability ?? []).join("; "),
    opportunity: (p.com_b_barriers.opportunity ?? []).join("; "),
    motivation: (p.com_b_barriers.motivation ?? []).join("; "),
    backstory: p.backstory,
    source: p.source ?? "manual",
    intent_context: p.intent_context ?? "",
  };
}

function fmtNum(n: number): string {
  // Forzar punto decimal y máximo 4 cifras significativas.
  return Number.isFinite(n) ? Number(n.toFixed(4)).toString() : "";
}

export type CsvValidationResult =
  | { ok: true; row: number; input: ProfileInput }
  | { ok: false; row: number; error: string; raw: Record<string, string> };

/**
 * Valida una fila CSV (header + valores) y devuelve un `ProfileInput`
 * listo para `createProfile`, o un error humano-legible. Reutiliza la
 * misma validación que el formulario web (parseProfileForm) para garantizar
 * la consistencia.
 */
export function validateCsvRow(
  headers: string[],
  values: string[],
  rowIndex: number,
): CsvValidationResult {
  const raw: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    raw[headers[i]] = (values[i] ?? "").trim();
  }

  // Convertir a FormData para reusar parseProfileForm.
  const form = new FormData();
  for (const key of PROFILE_CSV_HEADERS) {
    form.set(key, raw[key] ?? "");
  }

  // Validación rápida con el schema antes del parseo profundo
  // (para capturar mensajes específicos por campo en orden).
  const quick = ProfileFormSchema.safeParse(Object.fromEntries(form));
  if (!quick.success) {
    const issue = quick.error.issues[0];
    const field = String(issue.path[0] ?? "");
    return {
      ok: false,
      row: rowIndex,
      error: `${field}: ${issue.message}`,
      raw,
    };
  }

  const parsed = parseProfileForm(form);
  if (!parsed.ok) {
    return { ok: false, row: rowIndex, error: parsed.error, raw };
  }
  return { ok: true, row: rowIndex, input: parsed.input };
}

/**
 * Mapea las columnas del CSV importado a los headers canónicos. Tolera
 * variaciones obvias (mayúsculas, espacios). Devuelve `null` para columnas
 * desconocidas, que se ignoran al validar.
 */
export function normalizeHeader(h: string): (typeof PROFILE_CSV_HEADERS)[number] | null {
  const k = h.trim().toLowerCase().replace(/\s+/g, "_");
  if ((PROFILE_CSV_HEADERS as readonly string[]).includes(k)) {
    return k as (typeof PROFILE_CSV_HEADERS)[number];
  }
  return null;
}

/**
 * Reordena las columnas del CSV para que coincidan con
 * PROFILE_CSV_HEADERS. Las columnas desconocidas se descartan. Las
 * obligatorias que falten se añaden como cadena vacía (y luego fallará
 * la validación con un mensaje claro).
 */
export function reorderCsvRows(headers: string[], rows: string[][]): {
  headers: string[];
  rows: string[][];
  unknownColumns: string[];
} {
  const indexByCanonical = new Map<string, number>();
  const unknown: string[] = [];
  headers.forEach((h, idx) => {
    const canonical = normalizeHeader(h);
    if (canonical && !indexByCanonical.has(canonical)) {
      indexByCanonical.set(canonical, idx);
    } else if (!canonical) {
      unknown.push(h);
    }
  });

  const newRows = rows.map((row) =>
    PROFILE_CSV_HEADERS.map((h) => {
      const idx = indexByCanonical.get(h);
      return idx === undefined ? "" : (row[idx] ?? "").toString();
    }),
  );
  return { headers: [...PROFILE_CSV_HEADERS], rows: newRows, unknownColumns: unknown };
}
