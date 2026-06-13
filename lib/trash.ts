import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  hardDeleteTarget,
  restoreTarget,
  softDeleteTarget,
} from "@/lib/targets";
import {
  hardDeleteFunnel,
  restoreFunnel,
  softDeleteFunnel,
} from "@/lib/funnels";
import {
  hardDeleteAbTest,
  restoreAbTest,
  softDeleteAbTest,
} from "@/lib/ab";
import {
  hardDeleteCampaign,
  restoreCampaign,
  softDeleteCampaign,
} from "@/lib/campaigns";
import {
  hardDeleteCopyDeck,
  restoreCopyDeck,
  softDeleteCopyDeck,
} from "@/lib/copy";
import {
  hardDeletePricingOffer,
  restorePricingOffer,
  softDeletePricingOffer,
} from "@/lib/pricing";
import {
  hardDeleteGeoAnalysis,
  restoreGeoAnalysis,
  softDeleteGeoAnalysis,
} from "@/lib/geo";
import {
  hardDeleteMomentumChallenge,
  restoreMomentumChallenge,
  softDeleteMomentumChallenge,
} from "@/lib/momentum";
import {
  hardDeleteProfile,
  restoreProfile,
  softDeleteProfile,
} from "@/lib/profiles";
import {
  hardDeleteBrand,
  restoreBrand,
  softDeleteBrand,
} from "@/lib/cerebro";

// ============================================================
// Tipos
// ============================================================

export const TRASH_TYPES = [
  "targets",
  "funnels",
  "ab",
  "copy",
  "pricing",
  "campaign",
  "geo",
  "momentum",
  "profiles",
  "brand",
] as const;

export type TrashType = (typeof TRASH_TYPES)[number];

export function isTrashType(v: string): v is TrashType {
  return (TRASH_TYPES as readonly string[]).includes(v);
}

export type TrashItem = {
  type: TrashType;
  id: string;
  name: string;
  hint: string | null;
  created_at: string;
  deleted_at: string;
};

const TYPE_TO_TABLE: Record<TrashType, string> = {
  targets: "targets",
  funnels: "funnels",
  ab: "ab_tests",
  copy: "copy_decks",
  pricing: "pricing_offers",
  campaign: "campaigns",
  geo: "geo_analyses",
  momentum: "momentum_challenges",
  profiles: "profiles",
  brand: "brands",
};

export const TRASH_TYPE_LABEL: Record<TrashType, string> = {
  targets: "Target",
  funnels: "Embudo",
  ab: "A/B test",
  copy: "Copy deck",
  pricing: "Oferta de pricing",
  campaign: "Campaña",
  geo: "Análisis GEO",
  momentum: "Trigger de Momentum",
  profiles: "Perfil",
  brand: "Marca",
};

// ============================================================
// Acciones (despachan a la lib específica de cada entidad)
// ============================================================

export async function sendToTrash(type: TrashType, id: string): Promise<void> {
  switch (type) {
    case "targets":
      return softDeleteTarget(id);
    case "funnels":
      return softDeleteFunnel(id);
    case "ab":
      return softDeleteAbTest(id);
    case "copy":
      return softDeleteCopyDeck(id);
    case "pricing":
      return softDeletePricingOffer(id);
    case "campaign":
      return softDeleteCampaign(id);
    case "geo":
      return softDeleteGeoAnalysis(id);
    case "momentum":
      return softDeleteMomentumChallenge(id);
    case "profiles":
      return softDeleteProfile(id);
    case "brand":
      return softDeleteBrand(id);
  }
}

export async function restoreFromTrash(
  type: TrashType,
  id: string,
): Promise<void> {
  switch (type) {
    case "targets":
      return restoreTarget(id);
    case "funnels":
      return restoreFunnel(id);
    case "ab":
      return restoreAbTest(id);
    case "copy":
      return restoreCopyDeck(id);
    case "pricing":
      return restorePricingOffer(id);
    case "campaign":
      return restoreCampaign(id);
    case "geo":
      return restoreGeoAnalysis(id);
    case "momentum":
      return restoreMomentumChallenge(id);
    case "profiles":
      return restoreProfile(id);
    case "brand":
      return restoreBrand(id);
  }
}

export async function hardDelete(type: TrashType, id: string): Promise<void> {
  switch (type) {
    case "targets":
      return hardDeleteTarget(id);
    case "funnels":
      return hardDeleteFunnel(id);
    case "ab":
      return hardDeleteAbTest(id);
    case "copy":
      return hardDeleteCopyDeck(id);
    case "pricing":
      return hardDeletePricingOffer(id);
    case "campaign":
      return hardDeleteCampaign(id);
    case "geo":
      return hardDeleteGeoAnalysis(id);
    case "momentum":
      return hardDeleteMomentumChallenge(id);
    case "profiles":
      return hardDeleteProfile(id);
    case "brand":
      return hardDeleteBrand(id);
  }
}

// ============================================================
// Listado
// ============================================================

type Row = {
  id: string;
  name?: string | null;
  description?: string | null;
  hypothesis?: string | null;
  kind?: string | null;
  brief?: string | null;
  brand_name?: string | null;
  trigger_scenario?: string | null;
  backstory?: string | null;
  created_at: string;
  deleted_at: string;
};

/**
 * Columnas a seleccionar por tipo. Targets NO tiene description, sólo kind y
 * payload (no se selecciona payload aquí porque pesa). AB usa hypothesis. El
 * resto (funnels, copy_decks, pricing_offers) sí tienen description. GEO usa
 * brand_name, momentum el trigger y profiles el backstory.
 */
const SELECT_BY_TYPE: Record<TrashType, string> = {
  targets: "id, name, kind, created_at, deleted_at",
  funnels: "id, name, description, created_at, deleted_at",
  ab: "id, name, hypothesis, created_at, deleted_at",
  copy: "id, name, description, created_at, deleted_at",
  pricing: "id, name, description, created_at, deleted_at",
  campaign: "id, name, brief, created_at, deleted_at",
  geo: "id, name, brand_name, created_at, deleted_at",
  momentum: "id, name, trigger_scenario, created_at, deleted_at",
  profiles: "id, name, backstory, created_at, deleted_at",
  brand: "id, name, description, created_at, deleted_at",
};

function hintFor(type: TrashType, row: Row): string | null {
  switch (type) {
    case "ab":
      return row.hypothesis ?? null;
    case "targets":
      return row.kind ?? null;
    case "campaign":
      return row.brief ?? null;
    case "geo":
      return row.brand_name ?? null;
    case "momentum":
      return row.trigger_scenario ?? null;
    case "profiles":
      return row.backstory ?? null;
    default:
      return row.description ?? null;
  }
}

async function listTrashedFor(type: TrashType): Promise<TrashItem[]> {
  const supa = getServerClient();
  const table = TYPE_TO_TABLE[type];
  const { data, error } = await supa
    .from(table)
    .select(SELECT_BY_TYPE[type])
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];
  return rows.map((r) => ({
    type,
    id: r.id,
    name: r.name ?? "(sin nombre)",
    hint: hintFor(type, r),
    created_at: r.created_at,
    deleted_at: r.deleted_at,
  }));
}

/**
 * Devuelve todas las entidades enviadas a papelera, ordenadas por fecha de
 * borrado descendente. Falla en silencio (array vacío) si Supabase no está
 * configurado o si la tabla aún no tiene la columna `deleted_at` (la
 * migración 0007, o la 0017 para geo/momentum/profiles, está pendiente de
 * aplicar).
 */
export async function listTrash(): Promise<TrashItem[]> {
  if (!isSupabaseConfigured()) return [];
  const buckets = await Promise.all(
    TRASH_TYPES.map((t) =>
      listTrashedFor(t).catch((err) => {
        console.warn(`[listTrash] ${t} failed`, (err as Error).message);
        return [] as TrashItem[];
      }),
    ),
  );
  return buckets
    .flat()
    .sort((a, b) => (a.deleted_at < b.deleted_at ? 1 : -1));
}
