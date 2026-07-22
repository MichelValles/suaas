import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { InfoTooltip } from "@/components/info-tooltip";
import { BIG_FIVE_INTRO, BIG_FIVE_TRAITS } from "@/lib/big-five";
import { COM_B_BARRIERS, COM_B_INTRO } from "@/lib/com-b";
import { AVATAR_EST_USD } from "@/lib/avatar";
import { getChatModels } from "@/lib/chat-models";
import { estimateAction, partsForKind } from "@/lib/estimate";
import { getProfile, listClientSuggestions } from "@/lib/profiles";
import { isSupabaseConfigured } from "@/lib/supabase";
import { AvatarButton } from "./avatar-button";
import { ChatPanel } from "./chat-panel";
import { OptimizedForEditor } from "./optimized-for-editor";

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
          eyebrow="CONSTRUCTION · Perfiles"
          title="Supabase aún no está conectado."
        />
        <Link href="/profiles" className="btn-pill">Volver</Link>
      </AppShell>
    );
  }

  const profile = await getProfile(id);
  if (!profile) notFound();

  // Coste estimado por turno de chat, con los modelos elegidos en /tokens.
  const chatModels = await getChatModels();
  const chatEstimate = await estimateAction(
    partsForKind("chat_turn", { chatModels }),
  ).catch(() => null);

  const brandSuggestions = await listClientSuggestions().catch(() => []);

  const b = profile.big_five;

  return (
    <AppShell>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "clamp(32px, 4vw, 56px)",
        }}
      >
        <PageHeading
          eyebrow="CONSTRUCTION · Perfiles"
          title={profile.name}
          actions={
            <Link href="/profiles" className="btn-pill">
              Volver
            </Link>
          }
        />

        <section
          aria-label="Retrato del perfil"
          style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}
        >
          {profile.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={`Retrato generado por IA de ${profile.name}`}
              width={120}
              height={120}
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                objectFit: "cover",
                border: "1px solid rgba(var(--fg),0.14)",
                flexShrink: 0,
              }}
            />
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <AvatarButton
              profileId={profile.id}
              hasAvatar={Boolean(profile.avatar_url)}
              estimatedUsd={AVATAR_EST_USD}
            />
            <span style={{ fontSize: 11, color: "rgba(var(--fg),0.45)", lineHeight: 1.4 }}>
              Retrato generado por IA a partir de la demografía del perfil: no
              corresponde a ninguna persona real.
            </span>
          </div>
        </section>

        <OptimizedForEditor
          profileId={profile.id}
          current={profile.optimized_for ?? null}
          suggestions={brandSuggestions}
        />

        {profile.backstory && (
          <section
            className="backstory-box"
            aria-label="Backstory del perfil"
          >
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "var(--accent-text)",
              }}
            >
              Backstory
            </span>
            <p>{profile.backstory}</p>
          </section>
        )}

        <section
          aria-label="Rasgos Big Five"
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <SectionLabel description={BIG_FIVE_INTRO}>Big Five</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            <Trait label="Apertura" value={b.openness} tooltip={BIG_FIVE_TRAITS.openness.description} />
            <Trait label="Conciencia" value={b.conscientiousness} tooltip={BIG_FIVE_TRAITS.conscientiousness.description} />
            <Trait label="Extraversión" value={b.extraversion} tooltip={BIG_FIVE_TRAITS.extraversion.description} />
            <Trait label="Amabilidad" value={b.agreeableness} tooltip={BIG_FIVE_TRAITS.agreeableness.description} />
            <Trait label="Neuroticismo" value={b.neuroticism} tooltip={BIG_FIVE_TRAITS.neuroticism.description} />
          </div>
        </section>

        <section
          aria-label="Barreras COM-B"
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <SectionLabel description={COM_B_INTRO}>Barreras COM-B</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            <BarrierCard
              label="Capacidad"
              items={profile.com_b_barriers.capability}
              tooltip={COM_B_BARRIERS.capability.description}
            />
            <BarrierCard
              label="Oportunidad"
              items={profile.com_b_barriers.opportunity}
              tooltip={COM_B_BARRIERS.opportunity.description}
            />
            <BarrierCard
              label="Motivación"
              items={profile.com_b_barriers.motivation}
              tooltip={COM_B_BARRIERS.motivation.description}
            />
          </div>
        </section>

        <ChatPanel
          profileId={profile.id}
          profileName={profile.name}
          avatarUrl={profile.avatar_url}
          costPerTurnUsd={chatEstimate?.est_usd ?? null}
        />
      </div>
    </AppShell>
  );
}

function SectionLabel({
  children,
  description,
}: {
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
        {children}
      </h2>
      {description && (
        <p
          style={{
            color: "rgba(var(--fg),0.6)",
            fontSize: 13,
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}

function Trait({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: number;
  tooltip?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-md)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(var(--fg),0.55)",
          }}
        >
          {label}
        </span>
        {tooltip && <InfoTooltip text={tooltip} label={`Sobre ${label}`} />}
      </span>
      <div
        aria-hidden
        style={{
          height: 6,
          width: "100%",
          background: "rgba(var(--fg),0.08)",
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
        style={{ fontSize: 12, color: "rgba(var(--fg),0.85)" }}
      >
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

function BarrierCard({
  label,
  items,
  tooltip,
}: {
  label: string;
  items: string[];
  tooltip?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-md)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--accent-text)",
          }}
        >
          {label}
        </span>
        {tooltip && <InfoTooltip text={tooltip} label={`Sobre ${label}`} />}
      </span>
      {items.length === 0 ? (
        <span style={{ color: "rgba(var(--fg),0.4)", fontSize: 13 }}>
          Sin barreras registradas.
        </span>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18, color: "rgba(var(--fg),0.85)" }}>
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
