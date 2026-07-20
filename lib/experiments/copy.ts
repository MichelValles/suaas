import { generateObject } from "ai";
import { z } from "zod";
import {
  type CopyBlock,
  type CopyDeckWithBlocks,
  getCopyDeck,
} from "@/lib/copy";
import { DEFAULT_MODEL } from "@/lib/gateway";
import { getRunsModel } from "@/lib/chat-models";
import { buildSystemPrompt } from "@/lib/prompts";
import { type Profile } from "@/lib/profiles";
import { chunks, loadRunProfiles } from "@/lib/experiments/shared";
import { createRun, markRunFinished, upsertMetric } from "@/lib/runs";
import { getServerClient } from "@/lib/supabase";
import { recordUsage } from "@/lib/usage";

/**
 * Experimento: Resonancia de copy.
 * Cada perfil lee N bloques de copy (en el contexto del deck) y reacciona:
 * sentimiento, claridad, persuasión, would_click y crítica en su voz.
 */

export const CopyReactionSchema = z.object({
  sentiment: z.enum(["positivo", "negativo", "neutro", "escéptico"]),
  clarity: z.number().min(0).max(1),
  persuasion: z.number().min(0).max(1),
  would_click: z.boolean(),
  critique: z.string().min(1),
});
export type CopyReaction = z.infer<typeof CopyReactionSchema>;

export type CopyResponse = {
  profileId: string;
  blockId: string;
  position: number;
  label: string;
  text: string;
  reaction: CopyReaction;
};

export type CopySummary = {
  n: number;
  byBlock: Array<{
    blockId: string;
    position: number;
    label: string;
    text: string;
    clarity_mean: number | null;
    persuasion_mean: number | null;
    click_rate: number | null;
    sentiment: { positivo: number; negativo: number; neutro: number; escéptico: number };
  }>;
  top_block: { blockId: string; label: string } | null;
};

async function reactToBlock(
  profile: Profile,
  deck: CopyDeckWithBlocks,
  block: CopyBlock,
  model: string = DEFAULT_MODEL,
): Promise<{ output: CopyReaction; latencyMs: number; usage: unknown }> {
  const startedAt = Date.now();
  const result = await generateObject({
    model,
    schema: CopyReactionSchema,
    system: [
      buildSystemPrompt(profile),
      "",
      "## Tarea de este turno",
      `- Vas a leer una pieza de copy del deck "${deck.name}".`,
      deck.context ? `- Contexto donde aparece: ${deck.context}` : null,
      "- Reacciona como tú: 'sentiment' es lo que te dispara la lectura.",
      "- 'clarity' 0..1 según lo entiendas; 'persuasion' 0..1 según si te genera ganas de actuar.",
      "- 'would_click' es si harías click en un CTA basado en este copy.",
      "- 'critique' es 1-2 frases tuyas justificando, en tu voz, sin meta-comentarios.",
      "- No inventes funcionalidades ni asumas marcas. Si no te dice algo, dilo así.",
    ]
      .filter(Boolean)
      .join("\n"),
    prompt: [
      `Copy (label interno «${block.label}»):`,
      "",
      block.text,
    ].join("\n"),
  });
  return {
    output: result.object,
    latencyMs: Date.now() - startedAt,
    usage: result.usage ?? null,
  };
}

export type RunCopyInput = { deckId: string; profileIds: string[] };
export type RunCopyOutput = { runId: string; summary: CopySummary };

export async function runCopyTest(input: RunCopyInput): Promise<RunCopyOutput> {
  const deck = await getCopyDeck(input.deckId);
  if (!deck) throw new Error("Deck no encontrado.");
  if (deck.blocks.length < 2) throw new Error("El deck necesita al menos 2 bloques.");

  const profiles = await loadRunProfiles(input.profileIds);

  const runsModel = await getRunsModel();

  const run = await createRun({
    profile_id: profiles[0].id,
    kind: "copy_resonance",
    copy_deck_id: deck.id,
    params: { deckId: deck.id, profileIds: profiles.map((p) => p.id) },
  });

  try {
    const supa = getServerClient();
    const collected: CopyResponse[] = [];

    // Cada perfil reacciona a todos los bloques. Chunks de 5 perfiles.
    for (const chunk of chunks(profiles, 5)) {
      const results = await Promise.all(
        chunk.map(async (profile) => {
          const perBlock: CopyResponse[] = [];
          for (const block of deck.blocks) {
            const reacted = await reactToBlock(profile, deck, block, runsModel);
            await recordUsage({
              runId: run.id,
              scope: "copy_resonance",
              model: runsModel,
              usage: reacted.usage,
              meta: { latency_ms: reacted.latencyMs, block: block.position },
            }).catch(() => {});
            const row: CopyResponse = {
              profileId: profile.id,
              blockId: block.id,
              position: block.position,
              label: block.label,
              text: block.text,
              reaction: reacted.output,
            };
            perBlock.push(row);

            const { error } = await supa.from("copy_responses").upsert(
              {
                run_id: run.id,
                profile_id: profile.id,
                block_id: block.id,
                sentiment: reacted.output.sentiment,
                clarity: reacted.output.clarity,
                persuasion: reacted.output.persuasion,
                would_click: reacted.output.would_click,
                critique: reacted.output.critique,
                meta: { model: runsModel, latency_ms: reacted.latencyMs },
              },
              { onConflict: "run_id,profile_id,block_id" },
            );
            if (error) throw new Error(error.message);
          }
          return perBlock;
        }),
      );
      for (const arr of results) collected.push(...arr);
    }

    const summary = summarize(deck, profiles.length, collected);
    await upsertMetric({ run_id: run.id, key: "n", value: summary.n, unit: "count" });
    const persuasions = summary.byBlock
      .map((b) => b.persuasion_mean)
      .filter((v): v is number => v !== null);
    await upsertMetric({
      run_id: run.id,
      key: "best_persuasion_mean",
      value: persuasions.length === 0 ? 0 : Math.max(...persuasions),
      unit: "0..1",
    });
    const clickRates = summary.byBlock
      .map((b) => b.click_rate)
      .filter((v): v is number => v !== null);
    await upsertMetric({
      run_id: run.id,
      key: "mean_click_rate",
      value:
        clickRates.length === 0
          ? 0
          : clickRates.reduce((a, b) => a + b, 0) / clickRates.length,
      unit: "0..1",
    });

    await markRunFinished(run.id, "done");
    return { runId: run.id, summary };
  } catch (err) {
    await markRunFinished(run.id, "error").catch(() => {});
    throw err;
  }
}

function summarize(
  deck: CopyDeckWithBlocks,
  totalProfiles: number,
  responses: CopyResponse[],
): CopySummary {
  const byBlock = deck.blocks.map((b) => {
    const rs = responses.filter((r) => r.blockId === b.id);
    const n = rs.length;
    const clarity_mean =
      n === 0 ? null : rs.reduce((a, r) => a + r.reaction.clarity, 0) / n;
    const persuasion_mean =
      n === 0 ? null : rs.reduce((a, r) => a + r.reaction.persuasion, 0) / n;
    const click_rate =
      n === 0 ? null : rs.filter((r) => r.reaction.would_click).length / n;
    const sentiment = {
      positivo: 0,
      negativo: 0,
      neutro: 0,
      escéptico: 0,
    };
    for (const r of rs) sentiment[r.reaction.sentiment] += 1;
    return {
      blockId: b.id,
      position: b.position,
      label: b.label,
      text: b.text,
      clarity_mean,
      persuasion_mean,
      click_rate,
      sentiment,
    };
  });
  const rated = byBlock.filter(
    (b): b is (typeof byBlock)[number] & { persuasion_mean: number } =>
      b.persuasion_mean !== null,
  );
  const top =
    rated.length === 0
      ? null
      : rated.reduce((best, cur) =>
          cur.persuasion_mean > best.persuasion_mean ? cur : best,
        );
  return {
    n: totalProfiles,
    byBlock,
    top_block: top ? { blockId: top.blockId, label: top.label } : null,
  };
}

export async function listCopyResponses(runId: string): Promise<CopyResponse[]> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("copy_responses")
    .select("*, copy_blocks!inner(position, label, text)")
    .eq("run_id", runId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const block = (r as { copy_blocks: { position: number; label: string; text: string } })
      .copy_blocks;
    return {
      profileId: r.profile_id as string,
      blockId: r.block_id as string,
      position: block.position,
      label: block.label,
      text: block.text,
      reaction: {
        sentiment: r.sentiment as CopyReaction["sentiment"],
        clarity: r.clarity as number,
        persuasion: r.persuasion as number,
        would_click: r.would_click as boolean,
        critique: r.critique as string,
      },
    };
  });
}

export function summarizeCopyResponses(
  deck: CopyDeckWithBlocks,
  totalProfiles: number,
  responses: CopyResponse[],
): CopySummary {
  return summarize(deck, totalProfiles, responses);
}
