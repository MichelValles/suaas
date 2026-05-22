import { z } from "zod";
import { getServerClient } from "@/lib/supabase";

export const CopyBlockInputSchema = z.object({
  label: z.string().min(1, "El label del bloque es obligatorio."),
  text: z.string().min(3, "El copy debe tener al menos 3 caracteres."),
});
export type CopyBlockInput = z.infer<typeof CopyBlockInputSchema>;

export const CopyDeckInputSchema = z.object({
  name: z.string().min(1, "El nombre del deck es obligatorio."),
  description: z.string().optional().nullable(),
  context: z.string().optional().nullable(),
  blocks: z
    .array(CopyBlockInputSchema)
    .min(2, "Un deck necesita al menos 2 bloques.")
    .max(10, "Máximo 10 bloques por deck."),
});
export type CopyDeckInput = z.infer<typeof CopyDeckInputSchema>;

export type CopyBlock = {
  id: string;
  created_at: string;
  deck_id: string;
  position: number;
  label: string;
  text: string;
};

export type CopyDeck = {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  context: string | null;
};

export type CopyDeckWithBlocks = CopyDeck & { blocks: CopyBlock[] };

export async function listCopyDecks(): Promise<
  Array<CopyDeck & { block_count: number }>
> {
  const supa = getServerClient();
  const { data: decks, error } = await supa
    .from("copy_decks")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (!decks || decks.length === 0) return [];
  const ids = decks.map((d) => d.id);
  const { data: blocks, error: bErr } = await supa
    .from("copy_blocks")
    .select("deck_id")
    .in("deck_id", ids);
  if (bErr) throw new Error(bErr.message);
  const counts = new Map<string, number>();
  for (const row of blocks ?? []) {
    counts.set(row.deck_id, (counts.get(row.deck_id) ?? 0) + 1);
  }
  return decks.map((d) => ({
    ...(d as CopyDeck),
    block_count: counts.get(d.id) ?? 0,
  }));
}

export async function getCopyDeck(id: string): Promise<CopyDeckWithBlocks | null> {
  const supa = getServerClient();
  const { data: deck, error } = await supa
    .from("copy_decks")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!deck) return null;
  const { data: blocks, error: bErr } = await supa
    .from("copy_blocks")
    .select("*")
    .eq("deck_id", id)
    .order("position", { ascending: true });
  if (bErr) throw new Error(bErr.message);
  return { ...(deck as CopyDeck), blocks: (blocks ?? []) as CopyBlock[] };
}

export async function createCopyDeck(input: CopyDeckInput): Promise<CopyDeck> {
  const parsed = CopyDeckInputSchema.parse(input);
  const supa = getServerClient();
  const { data: deck, error } = await supa
    .from("copy_decks")
    .insert({
      name: parsed.name,
      description: parsed.description ?? null,
      context: parsed.context ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const blockRows = parsed.blocks.map((b, idx) => ({
    deck_id: deck.id,
    position: idx + 1,
    label: b.label,
    text: b.text,
  }));
  const { error: bErr } = await supa.from("copy_blocks").insert(blockRows);
  if (bErr) {
    await supa.from("copy_decks").delete().eq("id", deck.id);
    throw new Error(bErr.message);
  }
  return deck as CopyDeck;
}

export async function softDeleteCopyDeck(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa
    .from("copy_decks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function restoreCopyDeck(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa
    .from("copy_decks")
    .update({ deleted_at: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function hardDeleteCopyDeck(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa.from("copy_decks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
