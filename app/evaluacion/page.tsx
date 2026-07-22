import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { getRunsModel } from "@/lib/chat-models";
import { EvaluacionClient } from "./evaluacion-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gravity · Evaluación de calidad" };

export default async function EvaluacionPage() {
  const runsModel = await getRunsModel().catch(
    () => "anthropic/claude-sonnet-4.6",
  );
  return (
    <AppShell>
      <PageHeading
        eyebrow="SISTEMA"
        title="Evaluación de calidad"
        description="Puntúa la calidad de las salidas del modelo sobre un golden set de perfiles calibrados, con un juez de otra familia de modelo (rompe la circularidad de juzgar a Claude con Claude). Sirve para comparar modelos (Opus vs Sonnet vs Haiku) y cazar regresiones de prompt entre versiones."
        actions={
          <Link href="/observabilidad" className="btn-pill">
            Consumo
          </Link>
        }
      />
      <EvaluacionClient defaultTarget={runsModel} />
    </AppShell>
  );
}
