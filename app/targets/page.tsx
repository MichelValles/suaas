import Image from "next/image";
import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { EntityCard } from "@/components/entity-card";
import { isSupabaseConfigured } from "@/lib/supabase";
import { listTargets } from "@/lib/targets";

export const dynamic = "force-dynamic";

export default async function TargetsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading
          eyebrow="Claridad 5s · qué se evalúa"
          title="Supabase aún no está conectado."
          description="Provisiona Supabase desde el Marketplace de Vercel y aplica las migraciones."
        />
      </AppShell>
    );
  }

  let targets: Awaited<ReturnType<typeof listTargets>> = [];
  let err: string | null = null;
  try {
    targets = await listTargets();
  } catch (e) {
    err = (e as Error).message;
  }

  return (
    <AppShell>
      <PageHeading
        eyebrow="Targets · qué se evalúa"
        title="Pantallas que ponemos delante de los usuarios sintéticos."
        description="Cada test enseña una pantalla durante 5 segundos a un set de perfiles y mide qué recuerdan, cómo perciben la oferta y qué fricciones detectan. La promesa principal se contrasta vía LLM-as-judge."
        actions={
          <Link href="/targets/new" className="btn-pill solid">
            Nuevo test
          </Link>
        }
      />

      {err && <Notice tone="error">Error consultando tests: {err}</Notice>}

      {!err && targets.length === 0 && (
        <Notice>
          Todavía no hay tests de claridad. Empieza creando uno desde «Nuevo test».
        </Notice>
      )}

      {!err && targets.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {targets.map((t) => (
            <EntityCard
              key={t.id}
              href={`/targets/${t.id}`}
              trash={{ type: "targets", id: t.id, name: t.name }}
              eyebrow={t.kind === "5s_test" ? "Test 5 s" : t.kind}
              title={t.name}
              description={t.payload.main_promise}
              createdAt={t.created_at}
              media={<Thumb src={t.payload.image_url} alt={t.name} />}
              stats={[
                { label: "Runs", value: t.run_count },
                { label: "Perfiles", value: t.user_count },
              ]}
            />
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function Thumb({ src, alt }: { src: string; alt: string }) {
  const isData = src.startsWith("data:");
  // Para data: URLs Next/Image se queja; usamos <img> directo.
  if (isData) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        style={{
          width: "100%",
          aspectRatio: "16 / 9",
          objectFit: "cover",
          borderRadius: "var(--radius-sm)",
          background: "rgba(255,255,255,0.04)",
        }}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={480}
      height={270}
      unoptimized
      style={{
        width: "100%",
        height: "auto",
        aspectRatio: "16 / 9",
        objectFit: "cover",
        borderRadius: "var(--radius-sm)",
        background: "rgba(255,255,255,0.04)",
      }}
    />
  );
}

function Notice({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "error";
}) {
  const color = tone === "error" ? "var(--error-500)" : "var(--accent-500)";
  return (
    <div
      style={{
        padding: 24,
        border: `1px solid ${color}`,
        borderRadius: "var(--radius-md)",
        background: "rgba(255,255,255,0.02)",
        color: "rgba(255,255,255,0.85)",
        maxWidth: 720,
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}
