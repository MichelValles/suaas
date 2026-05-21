import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getFunnel } from "@/lib/funnels";

export const dynamic = "force-dynamic";

export default async function FunnelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="Embudo" title="Supabase aún no está conectado." />
        <Link href="/funnels" className="btn-pill">
          Volver
        </Link>
      </AppShell>
    );
  }

  const funnel = await getFunnel(id);
  if (!funnel) notFound();

  return (
    <AppShell>
      <PageHeading
        eyebrow={`Embudo · ${funnel.steps.length} ${funnel.steps.length === 1 ? "paso" : "pasos"}`}
        title={funnel.name}
        description={funnel.description ?? undefined}
        actions={
          <Link href="/funnels" className="btn-pill">
            Volver
          </Link>
        }
      />

      <section
        style={{
          padding: 20,
          border: "1px dashed rgba(255,255,255,0.12)",
          borderRadius: "var(--radius-md)",
          color: "rgba(255,255,255,0.6)",
          fontSize: 13,
          lineHeight: 1.6,
          maxWidth: 720,
        }}
      >
        Lanzar runs sobre embudos llegará en una iteración posterior de v0.5.0.
        Por ahora puedes definir y revisar la secuencia de pantallas.
      </section>

      <ol
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          counterReset: "step",
        }}
      >
        {funnel.steps.map((step, idx) => (
          <li
            key={step.id}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 420px) minmax(0, 1fr)",
              gap: 20,
              padding: 20,
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "var(--radius-md)",
              background: "rgba(255,255,255,0.02)",
              alignItems: "start",
            }}
          >
            <Hero src={step.payload.image_url} alt={`${step.name} · paso ${idx + 1}`} />

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  color: "var(--accent-500)",
                }}
              >
                Paso {idx + 1} de {funnel.steps.length} · {step.payload.kind}
              </span>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: 28,
                  lineHeight: 1.15,
                  color: "#fff",
                  margin: 0,
                }}
              >
                {step.name}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  Intent
                </span>
                <p
                  style={{
                    color: "rgba(255,255,255,0.85)",
                    fontSize: 14,
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {step.intent}
                </p>
              </div>
              {step.payload.source_url && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    Fuente
                  </span>
                  <a
                    href={step.payload.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "rgba(255,255,255,0.7)",
                      fontSize: 13,
                      wordBreak: "break-all",
                    }}
                  >
                    {step.payload.source_url}
                  </a>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
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
          borderRadius: "var(--radius-sm)",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={840}
      height={525}
      unoptimized
      style={{
        width: "100%",
        height: "auto",
        aspectRatio: "16 / 10",
        objectFit: "cover",
        borderRadius: "var(--radius-sm)",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    />
  );
}
