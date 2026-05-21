"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createProfile, ProfileInputSchema } from "@/lib/profiles";

const FormSchema = z.object({
  name: z.string().min(1),
  age: z.coerce.number().int().min(0).max(120),
  gender: z.string().min(1),
  occupation: z.string().min(1),
  income_band: z.string().optional().default(""),
  geo: z.string().optional().default(""),
  openness: z.coerce.number().min(0).max(1),
  conscientiousness: z.coerce.number().min(0).max(1),
  extraversion: z.coerce.number().min(0).max(1),
  agreeableness: z.coerce.number().min(0).max(1),
  neuroticism: z.coerce.number().min(0).max(1),
  capability: z.string().optional().default(""),
  opportunity: z.string().optional().default(""),
  motivation: z.string().optional().default(""),
  backstory: z.string().min(20),
  source: z.string().optional().default("manual"),
});

function splitLines(raw: string): string[] {
  return raw
    .split(/\r?\n|;/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export type CreateProfileState = {
  ok: boolean;
  error?: string;
};

export async function createProfileAction(
  _prev: CreateProfileState,
  formData: FormData,
): Promise<CreateProfileState> {
  let parsed: z.infer<typeof FormSchema>;
  try {
    parsed = FormSchema.parse(Object.fromEntries(formData));
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  const input = ProfileInputSchema.parse({
    name: parsed.name,
    demographics: {
      age: parsed.age,
      gender: parsed.gender,
      occupation: parsed.occupation,
      income_band: parsed.income_band || undefined,
      geo: parsed.geo || undefined,
    },
    big_five: {
      openness: parsed.openness,
      conscientiousness: parsed.conscientiousness,
      extraversion: parsed.extraversion,
      agreeableness: parsed.agreeableness,
      neuroticism: parsed.neuroticism,
    },
    com_b_barriers: {
      capability: splitLines(parsed.capability),
      opportunity: splitLines(parsed.opportunity),
      motivation: splitLines(parsed.motivation),
    },
    backstory: parsed.backstory,
    source: parsed.source || "manual",
  });

  let id: string;
  try {
    const created = await createProfile(input);
    id = created.id;
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  revalidatePath("/profiles");
  redirect(`/profiles/${id}`);
}
