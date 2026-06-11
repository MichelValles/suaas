import Image from "next/image";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import Link from "next/link";
import { listProfiles } from "@/lib/profiles";
import { getMetricsForRun, listRunsByTarget } from "@/lib/runs";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getTarget } from "@/lib/targets";
import { ProfileLaunchPanel } from "@/components/profile-launch-panel";
import { RunsPreviousGrid } from "@/components/runs-previous";

export const dynamic = "force-dynamic";

export default async function TargetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="Test de claridad" title="Supabase aún no está conectado." />
        <Link href="/targets" className="btn-pill">
          Volver
        </Link>
      </AppShell>
    );
  }

  const target = await getTarget(id);
  if (!target) notFound();

  const [profiles, runs] = await Promise.all([
    listProfiles(),
    listRunsByTarget(target.id),
  ]);

  const runsWithMetrics = await Promise.all(
    runs.map(async (r) => ({
      run: r,
      metrics: await getMetricsForRun(r.id),
    })),
  );

  return (
    <AppShell>
      <PageHeading
        eyebrow={`Claridad 5s · ${target.name}`}
        title={target.payload.main_promise}
        description={
          target.payload.source_url
            ? `Fuente: ${target.payload.source_url}`
            : undefined
        }
        actions={
          <Link href="/targets" className="btn-pill">
            Volver
          </Link>
        }
      />

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 24,
          alignItems: "start",
        }}
      >
        <Hero src={target.payload.image_url} alt={target.name} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            border: "1px solid rgba(var(--fg),0.08)",
            borderRadius: "var(--radius-md)",
            padding: 24,
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--accent-text)",
            }}
          >
            Cómo funciona el test
          </span>
          <p
            className="body"
            style={{
              color: "rgba(var(--fg),0.75)",
              fontSize: 14,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Cada perfil ve la pantalla durante 5 segundos. Luego responde qué
            recuerda y qué cree que se le ofrece. Un segundo modelo compara ese
            recuerdo con la promesa principal y devuelve un score 0..1
            (comprehension_rate).
          </p>
        </div>
      </section>

      <RunsPreviousGrid
        runs={runsWithMetrics}
        resultsBase="/experiments/five-second"
        emptyHint="Sin runs todavía. Lanza el primer test desde el panel de abajo."
        metrics={[
          { key: "mean_clarity", label: "Claridad" },
          { key: "mean_comprehension", label: "Compr." },
        ]}
      />

      <ProfileLaunchPanel
        title="Lanzar test 5s"
        endpoint="/api/runs/five-second"
        extraBody={{ targetId: target.id }}
        estimateEndpoint="/api/estimate/run?kind=five_second"
        progressLabel="Lanzando run, esto puede tardar 30-60 s para 5 perfiles."
        kind="five-second"
        profiles={profiles}
      />
    </AppShell>
  );
}

function Hero({ src, alt }: { src: string; alt: string }) {
  const isData = src.startsWith("data:");
  if (isData) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        style={{
          width: "100%",
          aspectRatio: "16 / 10",
          objectFit: "cover",
          borderRadius: "var(--radius-md)",
          background: "rgba(var(--fg),0.04)",
          border: "1px solid rgba(var(--fg),0.08)",
        }}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={960}
      height={600}
      unoptimized
      style={{
        width: "100%",
        height: "auto",
        aspectRatio: "16 / 10",
        objectFit: "cover",
        borderRadius: "var(--radius-md)",
        background: "rgba(var(--fg),0.04)",
        border: "1px solid rgba(var(--fg),0.08)",
      }}
    />
  );
}

