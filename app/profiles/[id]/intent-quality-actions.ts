"use server";

import { getRunsModel } from "@/lib/chat-models";
import { judgeIntentQuality, pickJudgeModel, type EvalScores } from "@/lib/eval";
import { getProfile } from "@/lib/profiles";

export type IntentQualityState = {
  ok: boolean;
  scores?: EvalScores;
  judge?: string;
  error?: string;
};

/**
 * Evalúa on-demand la calidad del JTBD (intent_context) del perfil con el juez
 * independiente. No persiste: el JTBD es un campo estático, así que se juzga
 * cuando se quiere comprobar (control de fidelidad puntual, no una métrica de
 * producto). El coste se registra bajo el scope `quality_judge`.
 */
export async function judgeIntentQualityAction(
  profileId: string,
): Promise<IntentQualityState> {
  try {
    const profile = await getProfile(profileId);
    if (!profile) return { ok: false, error: "Perfil no encontrado." };
    const jtbd = profile.intent_context?.trim();
    if (!jtbd) {
      return { ok: false, error: "Este perfil no tiene JTBD todavía." };
    }
    const judgeModel = pickJudgeModel(await getRunsModel());
    const scores = await judgeIntentQuality(profile, jtbd, judgeModel, {
      profile_id: profileId,
    });
    return { ok: true, scores, judge: judgeModel };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
