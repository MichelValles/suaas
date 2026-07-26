import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { Markdown } from "@/components/markdown";
import { DocsViewTracker } from "./docs-view-tracker";

/**
 * Visor de la documentación viva del proyecto (`docs/*.md`) dentro de la app,
 * para que se pueda leer sin ir al repositorio. Se genera de forma estática en
 * build (los `.md` se leen del repo, no en runtime) y queda tras el gate de auth
 * del proxy. Solo sirve los documentos que existen (`dynamicParams = false`).
 */

const DOCS_DIR = path.join(process.cwd(), "docs");

// Slugs de fichero simples: sin barras, sin `..`, sin traversal.
function isSafeSlug(slug: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(slug) && !slug.includes("..");
}

export function generateStaticParams() {
  try {
    return fs
      .readdirSync(DOCS_DIR)
      .filter((f) => f.endsWith(".md"))
      .map((f) => ({ slug: f.replace(/\.md$/, "") }));
  } catch {
    return [];
  }
}

export const dynamicParams = false;

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isSafeSlug(slug)) notFound();

  const file = path.join(DOCS_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) notFound();
  // Reescribe los enlaces internos a otros .md para que naveguen dentro del
  // visor (`[X](./X.md)` -> `[X](/docs/X)`), no a rutas del repo.
  const content = fs
    .readFileSync(file, "utf8")
    .replace(/\]\(\.?\/?([A-Za-z0-9._-]+)\.md(#[^)]*)?\)/g, "](/docs/$1)");

  return (
    <AppShell>
      <DocsViewTracker slug={slug} />
      <PageHeading
        eyebrow="DOCUMENTACIÓN"
        title={`${slug}.md`}
        actions={
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/docs" className="btn-pill">
              Índice de docs
            </Link>
            <Link href="/gravity/onboarding" className="btn-pill">
              Onboarding
            </Link>
          </div>
        }
      />
      <div style={{ maxWidth: "84ch" }}>
        <Markdown>{content}</Markdown>
      </div>
    </AppShell>
  );
}
