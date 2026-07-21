import Link from "next/link";
import { cookies } from "next/headers";
import { AppShell, PageHeading } from "@/components/app-shell";
import {
  type EstimateKind,
  type EstimatePart,
  estimateManyUsd,
  partsForKind,
} from "@/lib/estimate";
import { getRunsModel } from "@/lib/chat-models";
import { isGatewayConfigured } from "@/lib/gateway";
import { SEED_COOKIE, SEED_VALUE } from "@/lib/seed-auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { SeedGate } from "@/components/seed-gate";
import { type Kind, type KindCost, SeedExamplesClient } from "./client";

export const dynamic = "force-dynamic";

/**
 * Multiplicadores por perfil de cada seed, espejo del contenido estático de
 * lib/seed-examples.ts (copy 4 bloques, pricing 4 niveles, funnel 4 pasos,
 * campaña 3 queries × 1 canal, GEO 3 segmentos, IVI 16 huecos de query con
 * mensaje pretendido: 14 de las 6 campañas de Google + 2 de la de TikTok).
 * Si el contenido del seed cambia, actualizar aquí.
 */
const SEED_KIND_OPTS: Record<
  Kind,
  { kind: EstimateKind; perProfile?: number; judge?: boolean }
> = {
  clarity: { kind: "five_second" },
  copy: { kind: "copy", perProfile: 4 },
  pricing: { kind: "pricing", perProfile: 4 },
  ab: { kind: "ab" },
  funnel: { kind: "funnel", perProfile: 4 },
  campaign: { kind: "campaign", perProfile: 3 },
  campaign_strategies: { kind: "campaign", perProfile: 16, judge: true },
  geo: { kind: "geo", perProfile: 3 },
  momentum: { kind: "momentum" },
};

/**
 * Coste fijo + variable por perfil de cada kind, derivado de dos estimaciones
 * (1 y 2 perfiles): la parte que no escala (síntesis, segmentos de GEO) queda
 * en fixedUsd. Una sola carga de medias para todos los kinds.
 */
async function computeSeedCosts(): Promise<Partial<Record<Kind, KindCost>> | null> {
  try {
    const runsModel = await getRunsModel();
    const groups: Record<string, EstimatePart[]> = {};
    for (const [k, o] of Object.entries(SEED_KIND_OPTS)) {
      groups[`${k}:1`] = partsForKind(o.kind, {
        profiles: 1,
        perProfile: o.perProfile,
        judge: o.judge,
        runsModel,
      });
      groups[`${k}:2`] = partsForKind(o.kind, {
        profiles: 2,
        perProfile: o.perProfile,
        judge: o.judge,
        runsModel,
      });
    }
    const usd = await estimateManyUsd(groups);
    const out: Partial<Record<Kind, KindCost>> = {};
    for (const k of Object.keys(SEED_KIND_OPTS) as Kind[]) {
      const perProfileUsd = Math.max(0, usd[`${k}:2`] - usd[`${k}:1`]);
      out[k] = {
        perProfileUsd,
        fixedUsd: Math.max(0, usd[`${k}:1`] - perProfileUsd),
      };
    }
    return out;
  } catch {
    return null;
  }
}

export default async function SeedExamplesPage() {
  const supaOk = isSupabaseConfigured();
  const gwOk = isGatewayConfigured();
  const jar = await cookies();
  const unlocked = jar.get(SEED_COOKIE)?.value === SEED_VALUE;
  const costByKind =
    supaOk && gwOk && unlocked ? await computeSeedCosts() : null;
  return (
    <AppShell>
      <PageHeading
        eyebrow="SISTEMA"
        title="Sembrar"
        description="Sin brief se siembran los ejemplos de muestra predefinidos. Con brief, el contenido de cada módulo se genera con IA a medida de la marca o sector que describas."
        actions={
          <Link href="/" className="btn-pill">
            Volver al panel
          </Link>
        }
      />
      {!supaOk && <Notice>Supabase no está configurado.</Notice>}
      {!gwOk && (
        <Notice>
          AI Gateway no está configurado. La creación de ejemplos funcionará,
          pero "lanzar runs" requiere gateway activo.
        </Notice>
      )}
      {supaOk && !unlocked && <SeedGate />}
      {supaOk && unlocked && <SeedExamplesClient costByKind={costByKind} />}
    </AppShell>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 16,
        border: "1px solid var(--warning-text)",
        borderRadius: "var(--radius-md)",
        background: "rgba(var(--fg),0.03)",
        color: "rgba(var(--fg),0.85)",
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}
