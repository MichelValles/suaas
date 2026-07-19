import Link from "next/link";
import type { CSSProperties } from "react";
import {
  Bot,
  Filter,
  Megaphone,
  MessageSquareText,
  ScanEye,
  Split,
  Tag,
  Users,
  Zap,
} from "lucide-react";
import { AppShell, PageHeading } from "@/components/app-shell";
import { BetaOnly } from "@/components/beta-only";

const CONSTRUCTION_MODULES: ModuleItem[] = [
  {
    href: "/profiles",
    icon: Users,
    label: "Perfiles",
    body: "Demografía, Big Five, COM-B y backstory. Cada perfil tiene chat propio con arquitectura Talker · Reasoner y emite el vector Intent Momentum en cada turno.",
    cta: "Construir cohorte",
  },
  {
    href: "/momentum",
    icon: Zap,
    label: "Momentum",
    body: "Antes de que la marca entre en la ecuación: cómo aborda cada perfil un Trigger real. Intensidad, dirección, velocidad y primeros pasos.",
    cta: "Medir intent",
  },
  {
    href: "/targets",
    icon: ScanEye,
    label: "Claridad 5s",
    body: "El agente clasifica la conducta frente a la acción principal del flujo: óptima, fuga o repesca. Devuelve comprehension_rate y fricción percibida.",
    cta: "Testear claridad",
  },
  {
    href: "/funnels",
    icon: Filter,
    label: "Embudos",
    body: "El perfil recorre el flujo con su carga cognitiva real. Devuelve effort, intent_match y dropoff por paso antes del lanzamiento.",
    cta: "Analizar flujo",
    beta: true,
  },
];

const ACCELERATION_MODULES: ModuleItem[] = [
  {
    href: "/geo",
    icon: Bot,
    label: "GEO Tester",
    body: "La query de cada segmento JTBD lanzada contra Claude, ChatGPT y Perplexity reales, con búsqueda web y citas. Mide visibility_score, brand_position, recommendation_tone y missing_attributes por motor.",
    cta: "Auditar visibilidad",
  },
  {
    href: "/campaigns",
    icon: Megaphone,
    label: "Campañas",
    body: "El anuncio que el usuario querría ver, ajustado a la query y al perfil. RSA o RDA: la intención segmenta el mensaje, no la demografía.",
    cta: "Ajustar mensajes",
  },
];

const KNOWLEDGE_MODULES: ModuleItem[] = [
  {
    href: "/ab",
    icon: Split,
    label: "A/B tests",
    body: "Dos variantes en paralelo. Compara comprensión, fricción y barreras emergentes con la misma cohorte de perfiles.",
    cta: "Comparar variantes",
    beta: true,
  },
  {
    href: "/copy",
    icon: MessageSquareText,
    label: "Copy",
    body: "Deck de bloques de texto: claim, beneficios, CTA. Por bloque: sentiment, claridad, persuasión y willingness to click.",
    cta: "Evaluar copy",
  },
  {
    href: "/pricing",
    icon: Tag,
    label: "Pricing",
    body: "N niveles de precio. Por nivel: would_buy, willingness to pay y valor percibido. Detecta el umbral psicológico antes de tocar la web.",
    cta: "Calibrar precio",
    beta: true,
  },
];

type ModuleItem = {
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  body: string;
  cta: string;
  /** Solo visible con el modo beta activo (módulo aún sin desarrollar). */
  beta?: boolean;
};

export default function HomePage() {
  return (
    <AppShell>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "clamp(64px, 8vw, 108px)",
          paddingBlock: "clamp(8px, 2vw, 24px)",
        }}
      >
        {/* HERO */}
        <PageHeading
          eyebrow="GRAVITY"
          title="La intención tiene masa."
          description="Perfiles grounded con Big Five, COM-B y backstory. Los enfrentamos a pantallas, embudos, copies y precios: devolvemos el vector de intención antes de que el usuario llegue a tu web."
          actions={
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/profiles" className="btn-pill solid">
                Empezar con perfiles
              </Link>
              <Link href="/gravity" className="btn-pill">
                Ver el modelo
              </Link>
            </div>
          }
        />

        {/* GRAVITY MODEL VISUAL */}
        <GravityVisual />

        {/* INTENT MOMENTUM */}
        <IntentMomentumSection />

        {/* CONSTRUCTION PLANE */}
        <PlaneSection
          index="01"
          label="Construction Plane"
          description="Crea el contexto gravitacional: define por qué la marca empieza a existir en la órbita del usuario. Aquí se genera la primera atracción mediante hipersegmentación por intención."
          modules={CONSTRUCTION_MODULES}
        />

        {/* ACCELERATION PLANE */}
        <PlaneSection
          index="02"
          label="Acceleration Plane"
          description="Modula el momentum: refuerza, redirige o debilita la intención en función de las interacciones que recibe el usuario. Incluye performance guiado por intención y visibilidad en motores IA."
          modules={ACCELERATION_MODULES}
        />

        {/* KNOWLEDGE TOOLS */}
        <PlaneSection
          label="Knowledge Tools"
          description="Herramientas de experimentación clásica. Complementan el modelo con datos de copy, precio y variantes de pantalla."
          modules={KNOWLEDGE_MODULES}
        />
      </div>
    </AppShell>
  );
}

// ── Intent Momentum section ───────────────────────────────────

const DIMENSIONS = [
  {
    label: "Intensidad",
    description:
      "Cuánta motivación hay para actuar ahora. A mayor valor, más probable la acción en el corto plazo.",
    visual: (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            height: 3,
            background: "rgba(var(--fg),0.08)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: "72%",
              background: "var(--accent-500)",
              borderRadius: 2,
            }}
          />
        </div>
        <span
          className="mono"
          style={{ fontSize: 22, color: "var(--accent-text)", lineHeight: 1 }}
        >
          0 → 1
        </span>
      </div>
    ),
  },
  {
    label: "Dirección",
    description:
      "Hacia dónde se mueve la intención respecto a una solución: se acerca, está inmóvil o se aleja.",
    visual: (
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {[
          { v: "approaching", color: "var(--success-text)", note: "activo" },
          { v: "stable", color: "var(--warning-text)", note: "latente" },
          { v: "drifting", color: "var(--error-text)", note: "inactivo" },
        ].map((s) => (
          <div key={s.v} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              className="mono"
              style={{ fontSize: 11, color: s.color, letterSpacing: "0.08em" }}
            >
              {s.v}
            </span>
            <span
              style={{ fontSize: 10, color: "rgba(var(--fg),0.25)" }}
            >
              {s.note}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    label: "Velocidad",
    description:
      "Cómo cambia el momentum en el tiempo: si la urgencia crece, se mantiene o se disipa.",
    visual: (
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {[
          { v: "accelerating", symbol: "↑" },
          { v: "steady", symbol: "→" },
          { v: "decelerating", symbol: "↓" },
        ].map((s) => (
          <div key={s.v} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              className="mono"
              style={{ fontSize: 13, color: "var(--accent-text)", width: 14, textAlign: "center" }}
            >
              {s.symbol}
            </span>
            <span
              className="mono"
              style={{ fontSize: 11, color: "rgba(var(--fg),0.45)", letterSpacing: "0.08em" }}
            >
              {s.v}
            </span>
          </div>
        ))}
      </div>
    ),
  },
];

function IntentMomentumSection() {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span
          className="mono"
          style={{
            fontSize: 9,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "var(--accent-text)",
          }}
        >
          Intent Momentum
        </span>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(22px, 3vw, 30px)",
            lineHeight: 1.1,
            color: "var(--text-strong)",
            margin: 0,
          }}
        >
          La intención es un vector, no un estado.
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "rgba(var(--fg),0.5)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Cada perfil emite un vector de tres dimensiones en cada interacción. Los módulos
          de Gravity lo calculan, lo agregan y lo cruzan para medir la fuerza gravitacional
          real antes de lanzar cualquier campaña o experimento.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        {DIMENSIONS.map((d) => (
          <div
            key={d.label}
            style={{
              border: "1px solid rgba(var(--fg),0.07)",
              borderRadius: "var(--radius-md)",
              padding: "22px 22px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              background: "rgba(var(--fg),0.02)",
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: 9,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "rgba(var(--fg),0.35)",
              }}
            >
              {d.label}
            </span>
            {d.visual}
            <p
              style={{
                fontSize: 12,
                color: "rgba(var(--fg),0.45)",
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {d.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Gravity Model visual block ────────────────────────────────

function GravityVisual() {
  return (
    <section
      style={{
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-lg)",
        padding: "clamp(36px, 5vw, 60px)",
        background: "rgba(var(--fg),0.015)",
        display: "flex",
        gap: "clamp(36px, 6vw, 80px)",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      {/* Text */}
      <div style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: 28 }}>
        <span
          className="mono"
          style={{
            fontSize: 9,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "var(--accent-text)",
          }}
        >
          Gravity Model
        </span>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(28px, 4vw, 42px)",
              lineHeight: 1.1,
              color: "var(--text-strong)",
              margin: 0,
            }}
          >
            Tres planos.<br />Un vector.
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "rgba(var(--fg),0.6)",
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            La intención no es binaria: tiene{" "}
            <em style={{ color: "rgba(var(--fg),0.85)", fontStyle: "normal" }}>intensidad</em>{" "}
            (0→1),{" "}
            <em style={{ color: "rgba(var(--fg),0.85)", fontStyle: "normal" }}>dirección</em>{" "}
            (approaching · stable · drifting) y{" "}
            <em style={{ color: "rgba(var(--fg),0.85)", fontStyle: "normal" }}>velocidad</em>{" "}
            (accelerating · steady · decelerating). Los tres planos determinan ese vector antes de
            que la marca entre en la ecuación.
          </p>
        </div>

        {/* Plane index */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { n: "01", label: "Construction", desc: "Contexto gravitacional" },
            { n: "02", label: "Acceleration", desc: "Modulación del momentum" },
            { n: "03", label: "Value", desc: "Estabilización de la órbita" },
          ].map((p) => (
            <div key={p.label} style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  color: "var(--accent-text)",
                  letterSpacing: "0.08em",
                }}
              >
                {p.n}
              </span>
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  color: "rgba(var(--fg),0.85)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                {p.label}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "rgba(var(--fg),0.35)",
                  letterSpacing: "0.02em",
                }}
              >
                {p.desc}
              </span>
            </div>
          ))}
        </div>

        <Link
          href="/gravity"
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--accent-text)",
            textDecoration: "none",
          }}
        >
          Explorar el modelo →
        </Link>
      </div>

      {/* Orbital diagram */}
      <div
        style={{
          flex: "0 0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto",
        }}
      >
        <OrbitalDiagram />
      </div>
    </section>
  );
}

function OrbitalDiagram() {
  const SIZE = 280;
  return (
    <div style={{ position: "relative", width: SIZE, height: SIZE }}>
      {/* Rings: un solo acento (el centro); las órbitas viven en el
          canal del tema con alphas decrecientes hacia el interior */}
      <Ring r={128} alpha={0.28} />
      <Ring r={84} alpha={0.18} />
      <Ring r={44} alpha={0.1} />

      {/* Labels */}
      <RingLabel r={128} angle={-28} alpha={0.5} text="01 Construction" />
      <RingLabel r={84} angle={42} alpha={0.38} text="02 Acceleration" />
      <RingLabel r={44} angle={-55} alpha={0.22} text="03 Value" />

      {/* Center: la intención, la única masa con color */}
      <div className="gm-center" />

      {/* Orbiting dots:Construction (2 dots, slow) */}
      <Dot r={128} dur="16s" delay="0s" opacity={0.9} />
      <Dot r={128} dur="16s" delay="-8s" opacity={0.5} />

      {/* Orbiting dot:Acceleration */}
      <Dot r={84} dur="10s" delay="-3s" opacity={0.75} />

      {/* Orbiting dot:Value (faint, pending) */}
      <Dot r={44} dur="6s" delay="-1.5s" opacity={0.25} />
    </div>
  );
}

function Ring({ r, alpha }: { r: number; alpha: number }) {
  const d = r * 2;
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: d,
        height: d,
        marginTop: -r,
        marginLeft: -r,
        borderRadius: "50%",
        border: `1px solid rgba(var(--fg), ${alpha})`,
      }}
    />
  );
}

function RingLabel({
  r,
  angle,
  alpha,
  text,
}: {
  r: number;
  angle: number;
  alpha: number;
  text: string;
}) {
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * r;
  const y = Math.sin(rad) * r;
  return (
    <span
      className="mono"
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
        fontSize: 8,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: `rgba(var(--fg), ${alpha})`,
        whiteSpace: "nowrap",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      {text}
    </span>
  );
}

function Dot({
  r,
  dur,
  delay,
  opacity = 1,
}: {
  r: number;
  dur: string;
  delay: string;
  opacity?: number;
}) {
  return (
    <div
      className="gm-dot"
      style={
        {
          "--orbit-r": `${r}px`,
          "--orbit-dur": dur,
          animationDelay: delay,
          background: "rgba(var(--fg), 0.85)",
          opacity,
        } as CSSProperties
      }
    />
  );
}

// ── Plane sections ────────────────────────────────────────────

function PlaneSection({
  index,
  label,
  description,
  modules,
}: {
  index?: string;
  label: string;
  description: string;
  modules: ModuleItem[];
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          {index && (
            <span
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: "0.08em",
                color: "var(--accent-text)",
              }}
            >
              {index}
            </span>
          )}
          <h2
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "rgba(var(--fg),0.85)",
              margin: 0,
            }}
          >
            {label}
          </h2>
        </div>
        <p
          style={{
            fontSize: 13,
            color: "rgba(var(--fg),0.5)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {description}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {modules.map((m) =>
          m.beta ? (
            <BetaOnly key={m.href}>
              <ModuleCard item={m} />
            </BetaOnly>
          ) : (
            <ModuleCard key={m.href} item={m} />
          ),
        )}
      </div>
    </section>
  );
}

function ModuleCard({ item }: { item: ModuleItem }) {
  return (
    <Link href={item.href} className="feature-card">
      <item.icon size={20} />
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 20,
          lineHeight: 1.15,
          color: "var(--text-strong)",
          margin: 0,
        }}
      >
        {item.label}
      </h3>
      <p
        style={{
          color: "rgba(var(--fg),0.6)",
          fontSize: 13,
          lineHeight: 1.55,
          margin: 0,
          flex: 1,
        }}
      >
        {item.body}
      </p>
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--accent-text)",
        }}
      >
        {item.cta} →
      </span>
    </Link>
  );
}
