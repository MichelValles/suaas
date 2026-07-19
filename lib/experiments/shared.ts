import { listActiveProfilesByIds, type Profile } from "@/lib/profiles";

/** Troceo genérico para los chunks de concurrencia de los runners. */
export function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Carga la muestra de un run en UNA query, preservando el orden de
 * profileIds y los mismos mensajes de error que el bucle anterior.
 */
export async function loadRunProfiles(
  profileIds: string[],
  max = 20,
): Promise<Profile[]> {
  const byId = new Map(
    (await listActiveProfilesByIds(profileIds)).map((p) => [p.id, p]),
  );
  const profiles = profileIds.map((pid) => {
    const p = byId.get(pid);
    if (!p) throw new Error(`Perfil ${pid} no encontrado.`);
    return p;
  });
  if (profiles.length === 0) throw new Error("Sin perfiles para evaluar.");
  if (profiles.length > max) throw new Error(`Máximo ${max} perfiles por run.`);
  return profiles;
}
