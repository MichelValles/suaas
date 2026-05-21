"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createProfile, ProfileInputSchema } from "@/lib/profiles";

const FIELD_LABELS: Record<string, string> = {
  name: "Nombre",
  age: "Edad",
  gender: "Género",
  occupation: "Ocupación",
  income_band: "Banda de ingresos",
  geo: "Geo",
  openness: "Apertura",
  conscientiousness: "Conciencia",
  extraversion: "Extraversión",
  agreeableness: "Amabilidad",
  neuroticism: "Neuroticismo",
  capability: "Capacidad",
  opportunity: "Oportunidad",
  motivation: "Motivación",
  backstory: "Backstory",
};

const bigFiveField = (label: string) =>
  z.coerce
    .number({ message: `${label}: introduce un número entre 0 y 1` })
    .min(0, `${label} mínima 0`)
    .max(1, `${label} máxima 1`);

const FormSchema = z.object({
  name: z.string().min(1, "Nombre obligatorio"),
  age: z.coerce
    .number({ message: "Edad debe ser un número entero" })
    .int("Edad debe ser un número entero")
    .min(18, "Edad mínima 18")
    .max(99, "Edad máxima 99"),
  gender: z.enum(["hombre", "mujer", "otro"], {
    message: "Género debe ser hombre, mujer u otro",
  }),
  occupation: z.string().min(1, "Ocupación obligatoria"),
  income_band: z.string().optional().default(""),
  geo: z.string().optional().default(""),
  openness: bigFiveField("Apertura"),
  conscientiousness: bigFiveField("Conciencia"),
  extraversion: bigFiveField("Extraversión"),
  agreeableness: bigFiveField("Amabilidad"),
  neuroticism: bigFiveField("Neuroticismo"),
  capability: z.string().optional().default(""),
  opportunity: z.string().optional().default(""),
  motivation: z.string().optional().default(""),
  backstory: z
    .string()
    .min(20, "Backstory debe tener al menos 20 caracteres"),
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
  const result = FormSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    const seen = new Set<string>();
    const messages: string[] = [];
    for (const issue of result.error.issues) {
      const field = String(issue.path[0] ?? "");
      const label = FIELD_LABELS[field] ?? field;
      const key = `${label}|${issue.message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      messages.push(
        issue.message.startsWith(label) ? issue.message : `${label}: ${issue.message}`,
      );
    }
    return { ok: false, error: messages.join(" · ") };
  }
  const parsed = result.data;

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
