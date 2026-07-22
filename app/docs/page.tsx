import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";

/**
 * Índice de la documentación viva del proyecto. Lista los `docs/*.md` reales
 * (leídos en build) agrupados por tema; cada uno abre en el visor `/docs/[slug]`.
 */

const DOCS_DIR = path.join(process.cwd(), "docs");

const GROUPS: { title: string; slugs: string[] }[] = [
  { title: "Empieza aquí", slugs: ["README", "ONBOARDING-SOCIOLOGO"] },
  { title: "Alto nivel", slugs: ["ARQUITECTURA-CONCEPTUAL", "GRAVITY-MODEL"] },
  { title: "Motor de perfiles", slugs: ["PERFILES-CALIBRADOS", "BASE-CONOCIMIENTO"] },
  {
    title: "Casos reales",
    slugs: ["GRAVITY-MODEL-IVI", "IVI-PUBLICO-OBJETIVO", "ADESLAS-DENTAL-PUBLICO-OBJETIVO", "GEO-PRUEBA-IVI"],
  },
  { title: "Infraestructura y negocio", slugs: ["PROYECTO", "DESARROLLO", "Plan-venta", "SISTEMA-DISENO"] },
  {
    title: "Estado y decisiones",
    slugs: ["ROADMAP", "SIGUIENTE-PASO", "AUDITORIA-SEGURIDAD", "CAMPANAS-PLAN-MEJORA", "VERTEX-AI-VALORACION", "ORQUESTACION-VALORACION"],
  },
];

function listDocs(): Set<string> {
  try {
    return new Set(
      fs
        .readdirSync(DOCS_DIR)
        .filter((f) => f.endsWith(".md"))
        .map((f) => f.replace(/\.md$/, "")),
    );
  } catch {
    return new Set();
  }
}

export default function DocsIndexPage() {
  const available = listDocs();
  const grouped = new Set(GROUPS.flatMap((g) => g.slugs));
  const others = [...available].filter((s) => !grouped.has(s)).sort();

  return (
    <AppShell>
      <PageHeading
        eyebrow="DOCUMENTACIÓN"
        title="Documentación del proyecto"
        description="La documentación viva del repositorio, legible dentro de la app. Empieza por README (índice anotado) o por el onboarding."
        descriptionVariant="panel"
        actions={
          <Link href="/gravity/onboarding" className="btn-pill">
            Onboarding
          </Link>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {GROUPS.map((g) => {
          const slugs = g.slugs.filter((s) => available.has(s));
          if (slugs.length === 0) return null;
          return <DocGroup key={g.title} title={g.title} slugs={slugs} />;
        })}
        {others.length > 0 && <DocGroup title="Otros" slugs={others} />}
      </div>
    </AppShell>
  );
}

function DocGroup({ title, slugs }: { title: string; slugs: string[] }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "var(--accent-text)",
          margin: 0,
        }}
      >
        {title}
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 10,
        }}
      >
        {slugs.map((slug) => (
          <Link
            key={slug}
            href={`/docs/${slug}`}
            className="mono"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              border: "1px solid rgba(var(--fg),0.1)",
              borderRadius: "var(--radius-md)",
              padding: "12px 16px",
              textDecoration: "none",
              fontSize: 13,
              color: "var(--text-strong)",
              background: "rgba(var(--fg),0.02)",
            }}
          >
            <span>{slug}.md</span>
            <span style={{ color: "var(--accent-text)" }}>→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
