import { z } from "zod";
import {
  getServerClient,
  isMissingColumnError,
  MigrationPendingError,
} from "@/lib/supabase";

// ============================================================
// Schemas (zod): forma del dato de Cerebro.
// ============================================================

export const BrandInputSchema = z.object({
  name: z.string().min(1, "El nombre de la marca es obligatorio."),
  description: z.string().optional().nullable(),
});

export const BrandSchema = BrandInputSchema.extend({
  id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const BRAND_DOCUMENT_KINDS = [
  "nota",
  "brief",
  "tono",
  "producto",
  "analytics",
  "voc",
  "informe",
] as const;

export const BrandDocumentInputSchema = z.object({
  brand_id: z.string().uuid(),
  title: z.string().min(1, "El título del documento es obligatorio."),
  kind: z.string().min(1).default("nota"),
  content: z.string().min(1, "El documento no puede estar vacío."),
});

export const BrandDocumentSchema = BrandDocumentInputSchema.extend({
  id: z.string().uuid(),
  created_at: z.string(),
});

export type BrandInput = z.infer<typeof BrandInputSchema>;
export type Brand = z.infer<typeof BrandSchema>;
export type BrandDocumentInput = z.infer<typeof BrandDocumentInputSchema>;
export type BrandDocument = z.infer<typeof BrandDocumentSchema>;

const MIGRATION = "0025_cerebro.sql";

// ============================================================
// Brands CRUD (server only)
// ============================================================

export async function listBrands(): Promise<Brand[]> {
  const supa = getServerClient();
  let { data, error } = await supa
    .from("brands")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (isMissingColumnError(error, "deleted_at")) {
    ({ data, error } = await supa
      .from("brands")
      .select("*")
      .order("created_at", { ascending: false }));
  }
  if (error) throw new Error(error.message);
  return (data ?? []) as Brand[];
}

/** Marcas no borradas con el recuento de documentos, para el listado. */
export async function listBrandsWithCounts(): Promise<
  (Brand & { doc_count: number })[]
> {
  const brands = await listBrands();
  if (brands.length === 0) return [];
  const supa = getServerClient();
  const { data, error } = await supa.from("brand_documents").select("brand_id");
  if (error) throw new Error(error.message);
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { brand_id: string }[]) {
    counts.set(row.brand_id, (counts.get(row.brand_id) ?? 0) + 1);
  }
  return brands.map((b) => ({ ...b, doc_count: counts.get(b.id) ?? 0 }));
}

export async function getBrand(id: string): Promise<Brand | null> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("brands")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as Brand | null;
}

export async function getBrandWithDocuments(
  id: string,
): Promise<{ brand: Brand; documents: BrandDocument[] } | null> {
  const brand = await getBrand(id);
  if (!brand) return null;
  const documents = await listBrandDocuments(id);
  return { brand, documents };
}

export async function createBrand(input: BrandInput): Promise<Brand> {
  const parsed = BrandInputSchema.parse(input);
  const supa = getServerClient();
  const { data, error } = await supa
    .from("brands")
    .insert({ name: parsed.name, description: parsed.description ?? null })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Brand;
}

export async function updateBrand(
  id: string,
  input: BrandInput,
): Promise<Brand> {
  const parsed = BrandInputSchema.parse(input);
  const supa = getServerClient();
  const { data, error } = await supa
    .from("brands")
    .update({ name: parsed.name, description: parsed.description ?? null })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Brand;
}

export async function softDeleteBrand(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa
    .from("brands")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (isMissingColumnError(error, "deleted_at")) {
    throw new MigrationPendingError(MIGRATION);
  }
  if (error) throw new Error(error.message);
}

export async function restoreBrand(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa
    .from("brands")
    .update({ deleted_at: null })
    .eq("id", id);
  if (isMissingColumnError(error, "deleted_at")) {
    throw new MigrationPendingError(MIGRATION);
  }
  if (error) throw new Error(error.message);
}

/** Borrado definitivo. Destruye en cascada los documentos (on delete cascade). */
export async function hardDeleteBrand(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa.from("brands").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============================================================
// Documentos de marca
// ============================================================

export async function listBrandDocuments(
  brandId: string,
): Promise<BrandDocument[]> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("brand_documents")
    .select("*")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as BrandDocument[];
}

export async function addBrandDocument(
  input: BrandDocumentInput,
): Promise<BrandDocument> {
  const parsed = BrandDocumentInputSchema.parse(input);
  const supa = getServerClient();
  const { data, error } = await supa
    .from("brand_documents")
    .insert(parsed)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as BrandDocument;
}

export async function deleteBrandDocument(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa.from("brand_documents").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============================================================
// Contexto inyectable (lo que el selector vuelca en los campos de marca)
// ============================================================

const CONTEXT_CAP = 8000;

/**
 * Construye el texto que el selector de marca vuelca en los cajones de
 * "describe la marca" de los módulos: la descripción más los documentos .md
 * concatenados. Se recorta a un tope razonable para no inflar payloads.
 */
export function buildBrandContext(
  brand: Pick<Brand, "description">,
  docs: BrandDocument[],
): string {
  const parts: string[] = [];
  if (brand.description && brand.description.trim()) {
    parts.push(brand.description.trim());
  }
  for (const d of docs) {
    parts.push(`## ${d.title}\n${d.content.trim()}`);
  }
  let ctx = parts.join("\n\n");
  if (ctx.length > CONTEXT_CAP) ctx = `${ctx.slice(0, CONTEXT_CAP)}\n\n[...]`;
  return ctx;
}

/** Lista ligera para el desplegable: id, nombre y contexto inyectable. */
export async function listBrandsForPicker(): Promise<
  { id: string; name: string; context: string }[]
> {
  const brands = await listBrands();
  if (brands.length === 0) return [];
  const supa = getServerClient();
  const { data, error } = await supa
    .from("brand_documents")
    .select("*")
    .in(
      "brand_id",
      brands.map((b) => b.id),
    );
  if (error) throw new Error(error.message);
  const docs = (data ?? []) as BrandDocument[];
  return brands.map((b) => ({
    id: b.id,
    name: b.name,
    context: buildBrandContext(b, docs.filter((d) => d.brand_id === b.id)),
  }));
}
