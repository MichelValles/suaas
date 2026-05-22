import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { ProfileLaunchPanel } from "@/components/profile-launch-panel";
import { RunsPreviousGrid } from "@/components/runs-previous";
import { getCopyDeck } from "@/lib/copy";
import { listProfiles } from "@/lib/profiles";
import { getMetricsForRun, listRunsByCopyDeck } from "@/lib/runs";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function CopyDeckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="Deck" title="Supabase aún no está conectado." />
      </AppShell>
    );
  }
  const deck = await getCopyDeck(id);
  if (!deck) notFound();
  const [profiles, runs] = await Promise.all([listProfiles(), listRunsByCopyDeck(id)]);
  const runsWithMetrics = await Promise.all(
    runs.map(async (r) => ({ run: r, metrics: await getMetricsForRun(r.id) })),
  );

  return (
    <AppShell>
      <PageHeading
        eyebrow={`Deck · ${deck.blocks.length} ${deck.blocks.length === 1 ? "bloque" : "bloques"}`}
        title={deck.name}
        description={deck.description ?? deck.context ?? undefined}
        actions={
          <Link href="/copy" className="btn-pill">
            Volver
          </Link>
        }
      />

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        {deck.blocks.map((b) => (
          <div
            key={b.id}
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "var(--radius-md)",
              padding: 20,
              background: "rgba(255,255,255,0.02)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--accent-500)",
              }}
            >
              {b.position} · {b.label}
            </span>
            <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              {b.text}
            </p>
          </div>
        ))}
      </section>

      <RunsPreviousGrid
        runs={runsWithMetrics}
        resultsBase="/experiments/copy"
        emptyHint="Sin runs todavía. Lanza el primer copy test desde el panel de abajo."
        metrics={[
          { key: "best_persuasion_mean", label: "Mejor persuasión" },
          { key: "mean_click_rate", label: "CTR medio" },
        ]}
      />

      <ProfileLaunchPanel
        title="Lanzar copy test"
        endpoint="/api/runs/copy"
        extraBody={{ deckId: deck.id }}
        progressLabel={`Cada perfil reaccionará a los ${deck.blocks.length} bloques. Estimado ~${Math.ceil(deck.blocks.length * 6)}s por perfil.`}
        kind="copy"
        profiles={profiles}
      />
    </AppShell>
  );
}

