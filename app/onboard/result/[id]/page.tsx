import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { getProfile, type Profile } from "@/lib/profiles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tu gemelo sintético · SUAAS",
  robots: { index: false, follow: false },
};

export default async function OnboardResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id).catch(() => null);
  if (!profile) return notFound();

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "clamp(20px, 5vw, 56px)",
        gap: 32,
        maxWidth: 720,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--accent-500)",
          }}
        >
          Tu gemelo sintético
        </span>
        <h1
          className="display"
          style={{
            color: "#fff",
            fontSize: "clamp(32px, 5vw, 56px)",
            lineHeight: 1.05,
            margin: 0,
          }}
        >
          Hola, {profile.name.split(" ")[0]}.
        </h1>
        <p
          className="body-lg"
          style={{ color: "rgba(255,255,255,0.7)", margin: 0 }}
        >
          Hemos convertido tus respuestas en este usuario sintético. Lo usaremos
          en estrategias de captación, creatividades y UX para anticipar cómo
          reaccionarías ante una idea.
        </p>
      </header>

      <ProfileCard profile={profile} />

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <a
          href={`/api/onboard/og?id=${profile.id}`}
          download={`gemelo-${slugify(profile.name)}.png`}
          className="btn-pill solid"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Download size={14} />
          Descargar mi gemelo
        </a>
        <Link
          href={`/profiles/${profile.id}`}
          className="btn-pill"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <ExternalLink size={14} />
          Ver en SUAAS
        </Link>
      </div>

      <p
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.35)",
          marginTop: "auto",
          textAlign: "center",
        }}
      >
        suaas.flat101.business · synthetic users as a service
      </p>
    </div>
  );
}

// ============================================================
// Tarjeta del gemelo
// ============================================================

function ProfileCard({ profile }: { profile: Profile }) {
  const d = profile.demographics;
  const b = profile.big_five;
  const c = profile.com_b_barriers;

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "var(--radius-lg)",
        background: "rgba(255,255,255,0.02)",
        padding: "clamp(20px, 4vw, 36px)",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      {/* Cabecera de la card: avatar + datos */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Avatar name={profile.name} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <strong
            className="display"
            style={{ color: "#fff", fontSize: "clamp(22px, 3vw, 32px)" }}
          >
            {profile.name}
          </strong>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>
            {d.age} años · {d.gender} · {d.occupation}
          </span>
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            {d.geo}
            {d.income_band ? ` · ${d.income_band}` : ""}
          </span>
        </div>
      </div>

      {/* Backstory */}
      <p
        className="display"
        style={{
          fontStyle: "italic",
          color: "rgba(255,255,255,0.85)",
          fontSize: "clamp(16px, 1.5vw, 19px)",
          lineHeight: 1.55,
          margin: 0,
          paddingLeft: 16,
          borderLeft: "3px solid var(--accent-500)",
        }}
      >
        {profile.backstory}
      </p>

      {/* Big Five sparkbars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          Personalidad OCEAN
        </span>
        <SparkBar label="Apertura" value={b.openness} />
        <SparkBar label="Conciencia" value={b.conscientiousness} />
        <SparkBar label="Extraversión" value={b.extraversion} />
        <SparkBar label="Amabilidad" value={b.agreeableness} />
        <SparkBar label="Neuroticismo" value={b.neuroticism} />
      </div>

      {/* Barreras COM-B */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          Barreras COM-B
        </span>
        <BarrierBlock label="Capacidad" items={c.capability} />
        <BarrierBlock label="Oportunidad" items={c.opportunity} />
        <BarrierBlock label="Motivación" items={c.motivation} />
      </div>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: "50%",
        background: "var(--accent-500)",
        color: "var(--ink-900)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-display)",
        fontSize: 28,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials || "?"}
    </div>
  );
}

function SparkBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span
        style={{
          width: 110,
          fontSize: 12,
          color: "rgba(255,255,255,0.7)",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 6,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: "var(--accent-500)",
            borderRadius: 999,
          }}
        />
      </div>
      <span
        className="mono"
        style={{
          width: 36,
          textAlign: "right",
          fontSize: 11,
          color: "rgba(255,255,255,0.5)",
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

function BarrierBlock({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.55)",
        }}
      >
        {label}
      </span>
      <ul
        style={{
          margin: 0,
          paddingLeft: 18,
          color: "rgba(255,255,255,0.8)",
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "gemelo";
}
