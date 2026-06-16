import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { getBrandWithDocuments } from "@/lib/cerebro";
import { isSupabaseConfigured } from "@/lib/supabase";
import { BrandDetail } from "./brand-detail";

export const dynamic = "force-dynamic";

export default async function BrandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="KNOWLEDGE · Cerebro" title="Supabase aún no está conectado." />
      </AppShell>
    );
  }
  const data = await getBrandWithDocuments(id);
  if (!data) notFound();

  return (
    <AppShell>
      <PageHeading
        eyebrow="KNOWLEDGE · Cerebro"
        title={data.brand.name}
        actions={
          <Link href="/cerebro" className="btn-pill">
            Volver
          </Link>
        }
      />
      <BrandDetail brand={data.brand} documents={data.documents} />
    </AppShell>
  );
}
