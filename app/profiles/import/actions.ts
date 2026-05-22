"use server";

import { revalidatePath } from "next/cache";
import { createProfile, type ProfileInput } from "@/lib/profiles";

export type ImportResult = {
  ok: boolean;
  imported: number;
  failed: Array<{ row: number; error: string }>;
};

/**
 * Inserta perfiles en lote (uno a uno para que cada inserción falle de
 * forma independiente). Cada elemento de `payload` ya viene validado por
 * el cliente, pero `createProfile` revalida con `ProfileInputSchema` antes
 * de tocar la base.
 */
export async function importProfilesAction(payload: {
  rows: Array<{ row: number; input: ProfileInput }>;
}): Promise<ImportResult> {
  if (!Array.isArray(payload?.rows) || payload.rows.length === 0) {
    return { ok: false, imported: 0, failed: [{ row: 0, error: "No hay filas." }] };
  }
  if (payload.rows.length > 500) {
    return {
      ok: false,
      imported: 0,
      failed: [{ row: 0, error: "Máximo 500 filas por importación." }],
    };
  }

  let imported = 0;
  const failed: ImportResult["failed"] = [];

  for (const { row, input } of payload.rows) {
    try {
      await createProfile(input);
      imported += 1;
    } catch (err) {
      failed.push({ row, error: (err as Error).message });
    }
  }
  revalidatePath("/profiles");
  return { ok: failed.length === 0, imported, failed };
}
