import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { getProfile } from "@/lib/profiles";
import { isSupabaseConfigured } from "@/lib/supabase";
import { ChatPanel } from "./chat-panel";

export const dynamic = "force-dynamic";

export default async function ProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading
          eyebrow="Perfil"
          title="Supabase aún no está conectado."
        />
        <Link href="/profiles" className="btn-pill">Volver</Link>
      </AppShell>
    );
  }

  const profile = await getProfile(id);
  if (!profile) notFound();

  const d = profile.demographics;
  const b = profile.big_five;

  return (
    <AppShell>
      <PageHeading
        eyebrow={`${d.age} · ${d.gender} · ${d.occupation}`}
        title={profile.name}
        description={profile.backstory}
        actions={
          <Link href="/profiles" className="btn-pill">
            Volver
          </Link>
        }
      />

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          maxWidth: 880,
        }}
      >
        <Trait label="Apertura" value={b.openness} />
        <Trait label="Conciencia" value={b.conscientiousness} />
        <Trait label="Extraversión" value={b.extraversion} />
        <Trait label="Amabilidad" value={b.agreeableness} />
        <Trait label="Neuroticismo" value={b.neuroticism} />
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
          maxWidth: 1100,
        }}
      >
        <BarrierCard label="Capacidad" items={profile.com_b_barriers.capability} />
        <BarrierCard label="Oportunidad" items={profile.com_b_barriers.opportunity} />
        <BarrierCard label="Motivación" items={profile.com_b_barriers.motivation} />
      </section>

      <ChatPanel profileId={profile.id} />
    </AppShell>
  );
}

function Trait({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "var(--radius-md)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.55)",
        }}
      >
        {label}
      </span>
      <div
        aria-hidden
        style={{
          height: 6,
          width: "100%",
          background: "rgba(255,255,255,0.08)",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.round(value * 100)}%`,
            background: "var(--accent-500)",
          }}
        />
      </div>
      <span
        className="mono"
        style={{ fontSize: 12, color: "rgba(255,255,255,0.85)" }}
      >
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

function BarrierCard({ label, items }: { label: string; items: string[] }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "var(--radius-md)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
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
        {label}
      </span>
      {items.length === 0 ? (
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
          Sin barreras registradas.
        </span>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18, color: "rgba(255,255,255,0.85)" }}>
          {items.map((item, idx) => (
            <li key={idx} style={{ fontSize: 14, lineHeight: 1.5 }}>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
