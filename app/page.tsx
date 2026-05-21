import Link from "next/link";
import {
  Activity,
  Filter,
  Gauge,
  ScanEye,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { AppShell, PageHeading } from "@/components/app-shell";

export default function HomePage() {
  return (
    <AppShell>
      <PageHeading
        eyebrow="Synthetic Users as a Service"
        title="Experimentación predictiva con agentes calibrados."
        description="SUAAS construye perfiles 'grounded' (vignettes + Big Five + barreras COM-B), los pone delante de tus pantallas o embudos y mide claridad, fricción y abandono. Iteras copy y UX en minutos, no semanas."
        actions={
          <Link href="/profiles" className="btn-pill solid">
            Empezar por perfiles
          </Link>
        }
      />

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        <FeatureCard
          Icon={Users}
          title="Perfiles grounded"
          body="Demografía, Big Five 0..1 y barreras COM-B (capability / opportunity / motivation) + backstory. Hablan en primera persona como ese usuario."
          href="/profiles"
          cta="Ver perfiles"
        />
        <FeatureCard
          Icon={ScanEye}
          title="Test de claridad 5 s"
          body="Cada perfil ve una pantalla 5 s y reporta recall y oferta percibida. Un LLM-as-judge compara contra la promesa principal y devuelve comprehension_rate."
          href="/targets"
          cta="Ver targets"
        />
        <FeatureCard
          Icon={Filter}
          title="Simulación de embudo"
          body="Recorre paso a paso un flujo. Por cada paso: intent_match, effort, fricciones y decisión de continuar. Drop-off y completion rate por embudo."
          href="/funnels"
          cta="Ver embudos"
        />
        <FeatureCard
          Icon={Sparkles}
          title="Arquitectura Talker · Reasoner"
          body="Cada turno: un Reasoner (Opus) modela estado interno y plan, un Talker (Sonnet) responde en voz del perfil. Trazas completas por turno."
          href="/profiles"
          cta="Probar el chat"
        />
        <FeatureCard
          Icon={Target}
          title="Métricas que importan"
          body="clarity, comprehension_rate, effort_ratio, completion_rate, mean_intent_match. Persistidas en Supabase, consultables por run y por target."
          href="/diag"
          cta="Ver estado"
        />
        <FeatureCard
          Icon={Activity}
          title="Trazabilidad operativa"
          body="Diagnóstico de tablas, consumo de tokens del gateway por modelo y por scope, runs y dropoffs por perfil. Todo accesible desde el sidebar."
          href="/tokens"
          cta="Ver tokens"
        />
      </section>

      <section
        style={{
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "var(--radius-md)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
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
            Cómo funciona en 3 pasos
          </h2>
        </div>
        <ol
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 24,
            padding: 0,
            margin: 0,
            listStyle: "none",
          }}
        >
          <Step
            n={1}
            title="Define el perfil"
            body="Demografía, Big Five y barreras COM-B. Un backstory de 20+ caracteres convierte los números en alguien con nombre y rutina."
          />
          <Step
            n={2}
            title="Sube la pantalla o el embudo"
            body="URL pública (resolvemos og:image) o screenshot directo. Para embudos, encadenas pantallas con un intent por paso."
          />
          <Step
            n={3}
            title="Lanza el run y lee la fricción"
            body="Hasta 20 perfiles en paralelo, chunks de 5. Por cada uno: percepción, esfuerzo, barreras y decisión. Métricas agregadas listas para revisar."
          />
        </ol>
      </section>
    </AppShell>
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
    <Link
      href={href}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 20,
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "var(--radius-md)",
        background: "rgba(255,255,255,0.02)",
        transition: "border-color var(--dur-short) var(--ease-out)",
      }}
    >
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
}: {
  n: number;
  title: string;
  body: string;
}) {
  return (
    <li style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.55)",
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
        }}
      >
        {body}
      </p>
    </li>
  );
}
