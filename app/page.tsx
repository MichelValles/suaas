import Link from "next/link";
import {
  Activity,
  Coins,
  Compass,
  Filter,
  FlaskConical,
  Gauge,
  MessageSquareText,
  ScanEye,
  Sparkles,
  Split,
  Tag,
  Users,
} from "lucide-react";
import { AppShell, PageHeading } from "@/components/app-shell";

export default function HomePage() {
  return (
    <AppShell>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "clamp(72px, 9vw, 128px)",
          paddingBlock: "clamp(8px, 2vw, 24px)",
        }}
      >
        {/* HERO */}
        <PageHeading
          eyebrow="Synthetic Users as a Service"
          title="Experimentación predictiva con agentes calibrados."
          description="Perfiles «grounded» (Big Five + barreras COM-B + backstory), los enfrentamos a pantallas, embudos, copys y precios, y devolvemos fricciones y abandono cuantificados."
          actions={
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/profiles" className="btn-pill solid">
                Empezar por perfiles
              </Link>
              <Link href="/targets/new" className="btn-pill">
                Lanzar un test 5 s
              </Link>
            </div>
          }
        />

        {/* MÓDULOS DE TEST */}
        <section
          aria-label="Módulos de test"
          style={{ display: "flex", flexDirection: "column", gap: 28 }}
        >
          <SectionLabel Icon={FlaskConical}>Módulos de test</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
            }}
          >
            <FeatureCard
              Icon={ScanEye}
              title="Test de claridad 5 s"
              body="Cada perfil ve una pantalla 5 s y reporta recall y oferta percibida. Un LLM-as-judge compara contra la promesa principal y devuelve comprehension_rate."
              href="/targets"
              cta="Ver tests"
            />
            <FeatureCard
              Icon={Filter}
              title="Simulación de embudo"
              body="Recorre paso a paso un flujo. Por cada paso: intent_match, effort, fricciones y decisión de continuar. Drop-off y completion rate por embudo."
              href="/funnels"
              cta="Ver embudos"
            />
            <FeatureCard
              Icon={Split}
              title="A/B tests"
              body="Dos variantes de pantalla en paralelo. Compara comprensión, fricción y barreras emergentes con la misma cohorte de perfiles."
              href="/ab"
              cta="Ver experimentos"
            />
            <FeatureCard
              Icon={MessageSquareText}
              title="Copy resonance"
              body="Deck de bloques de texto: claim, beneficios, CTA. Por bloque: sentiment, claridad, persuasión y willingness to click. Con crítica en primera persona."
              href="/copy"
              cta="Ver decks"
            />
            <FeatureCard
              Icon={Tag}
              title="Pricing"
              body="Oferta común + n niveles de precio. Por nivel: would_buy, willingness to pay y valor percibido. Detecta el umbral psicológico antes de tocar la web."
              href="/pricing"
              cta="Ver ofertas"
            />
          </div>
        </section>

        {/* AGENTES Y DATOS */}
        <section
          aria-label="Agentes y datos"
          style={{ display: "flex", flexDirection: "column", gap: 28 }}
        >
          <SectionLabel Icon={Compass}>Agentes y datos</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
            }}
          >
            <FeatureCard
              Icon={Users}
              title="Perfiles grounded"
              body="Demografía, Big Five (0..1) y barreras COM-B (capability, opportunity, motivation) con un backstory que humaniza los números. Importa CSV, genera con LLM o créalos a mano."
              href="/profiles"
              cta="Ver perfiles"
            />
            <FeatureCard
              Icon={Sparkles}
              title="Arquitectura Talker · Reasoner"
              body="Cada turno, un Reasoner (Opus) modela estado interno y plan, y un Talker (Sonnet) responde en voz del perfil. Trazas completas por turno disponibles desde el chat de cada perfil."
              href="/profiles"
              cta="Probar el chat"
            />
            <FeatureCard
              Icon={Activity}
              title="Trazabilidad operativa"
              body="Diagnóstico de esquema y conteo por tabla en /diag. Consumo de tokens del AI Gateway por scope y modelo en /tokens. Sin sorpresas en factura."
              href="/diag"
              cta="Ver diagnóstico"
            />
          </div>
        </section>

        {/* TUTORIAL */}
        <section
          aria-label="Cómo funciona"
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "var(--radius-lg)",
            padding: "clamp(36px, 5vw, 64px)",
            display: "flex",
            flexDirection: "column",
            gap: 36,
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Gauge size={20} color="var(--accent-500)" />
            <h2
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "var(--accent-500)",
                margin: 0,
              }}
            >
              Cómo funciona en 4 pasos
            </h2>
          </div>
          <p
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 15,
              lineHeight: 1.6,
              margin: 0,
              maxWidth: 720,
            }}
          >
            El flujo es siempre el mismo: construir cohorte, elegir material, lanzar
            simulación, leer fricción. Los cinco módulos de test comparten esta
            estructura y son intercambiables.
          </p>
          <ol
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 36,
              padding: 0,
              margin: 0,
              listStyle: "none",
            }}
          >
            <Step
              n={1}
              title="Construye tu panel"
              body="Importa perfiles desde CSV, genera lotes con LLM a partir de 50 seeds curados o créalos a mano. Filtra por edad, Big Five o palabras del backstory."
              cta={{ href: "/profiles", label: "Perfiles" }}
            />
            <Step
              n={2}
              title="Elige qué evaluar"
              body="Una pantalla (test 5 s), un flujo (embudo), dos variantes (A/B), un deck de copies o niveles de precio. Sube URL pública (resolvemos og:image) o imagen directa."
              cta={{ href: "/targets/new", label: "Crear test" }}
            />
            <Step
              n={3}
              title="Selecciona perfiles y lanza"
              body="Hasta 20 perfiles en paralelo, chunks de 5 en vuelo, maxDuration 300 s. Cada perfil reacciona desde sus rasgos y barreras COM-B en voz propia."
              cta={{ href: "/funnels", label: "Embudos" }}
            />
            <Step
              n={4}
              title="Lee la fricción y decide"
              body="Métricas agregadas (clarity, effort, dropoff, would_buy) + drill-down por perfil con recall, percepción y crítica. Persistido en Supabase para volver a abrir cuando quieras."
              cta={{ href: "/diag", label: "Diagnóstico" }}
            />
          </ol>
        </section>

        {/* CIERRE: telemetría */}
        <section
          aria-label="Telemetría"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
          }}
        >
          <FeatureCard
            Icon={Coins}
            title="Telemetría de tokens"
            body="Cada llamada al AI Gateway queda registrada (scope, modelo, tokens, latencia). Saldo del gateway y acumulado interno desde /tokens."
            href="/tokens"
            cta="Ver consumo"
          />
          <FeatureCard
            Icon={Activity}
            title="Estado del sistema"
            body="Conteo por tabla, presencia de migraciones y badges de Supabase y AI Gateway. Cualquier desconexión se ve en /diag y en el footer."
            href="/diag"
            cta="Ver diagnóstico"
          />
        </section>
      </div>
    </AppShell>
  );
}

// ============================================================
// Sub-componentes
// ============================================================

function SectionLabel({
  Icon,
  children,
}: {
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <Icon size={18} color="var(--accent-500)" />
      <h2
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "var(--accent-500)",
          margin: 0,
        }}
      >
        {children}
      </h2>
    </div>
  );
}

function FeatureCard({
  Icon,
  title,
  body,
  href,
  cta,
}: {
  Icon: React.ComponentType<{ size?: number }>;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <Link href={href} className="feature-card">
      <Icon size={22} />
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: 22,
          lineHeight: 1.15,
          color: "#fff",
          margin: 0,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          color: "rgba(255,255,255,0.65)",
          fontSize: 13,
          lineHeight: 1.55,
          margin: 0,
          flex: 1,
        }}
      >
        {body}
      </p>
      <span
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--accent-500)",
        }}
      >
        {cta} →
      </span>
    </Link>
  );
}

function Step({
  n,
  title,
  body,
  cta,
}: {
  n: number;
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <li style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.45)",
        }}
      >
        0{n} ·
      </span>
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: 20,
          lineHeight: 1.2,
          color: "#fff",
          margin: 0,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          color: "rgba(255,255,255,0.65)",
          fontSize: 13,
          lineHeight: 1.55,
          margin: 0,
          flex: 1,
        }}
      >
        {body}
      </p>
      {cta && (
        <Link
          href={cta.href}
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--accent-500)",
          }}
        >
          Ir a {cta.label} →
        </Link>
      )}
    </li>
  );
}
