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
  },
];

const ACCELERATION_MODULES: ModuleItem[] = [
  {
    href: "/geo",
    icon: Bot,
    label: "GEO Tester",
    body: "Cómo construyen la respuesta Perplexity, Google AI Overview y ChatGPT Search según el JTBD del perfil. Mide visibility_score, brand_position, recommendation_tone y missing_attributes.",
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
  },
];

type ModuleItem = {
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  body: string;
  cta: string;
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
          eyebrow="Synthetic Users as a Service"
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
          color="#60a5fa"
          label="Construction Plane"
          description="Crea el contexto gravitacional: define por qué la marca empieza a existir en la órbita del usuario. Aquí se genera la primera atracción mediante hipersegmentación por intención."
          modules={CONSTRUCTION_MODULES}
        />

        {/* ACCELERATION PLANE */}
        <PlaneSection
          color="#fb923c"
          label="Acceleration Plane"
          description="Modula el momentum: refuerza, redirige o debilita la intención en función de las interacciones que recibe el usuario. Incluye performance guiado por intención y visibilidad en motores IA."
          modules={ACCELERATION_MODULES}
        />

        {/* KNOWLEDGE TOOLS */}
        <PlaneSection
          color="rgba(255,255,255,0.3)"
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
    color: "var(--accent-500)",
    description:
      "Cuánta motivación hay para actuar ahora. A mayor valor, más probable la acción en el corto plazo.",
    visual: (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            height: 3,
            background: "rgba(255,255,255,0.08)",
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
          style={{ fontSize: 22, color: "var(--accent-500)", lineHeight: 1 }}
        >
          0 → 1
        </span>
      </div>
    ),
  },
  {
    label: "Dirección",
    color: "#60a5fa",
    description:
      "Hacia dónde se mueve la intención respecto a una solución: se acerca, está inmóvil o se aleja.",
    visual: (
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {[
          { v: "approaching", color: "#4ade80", note: "activo" },
          { v: "stable", color: "#facc15", note: "latente" },
          { v: "drifting", color: "#f87171", note: "inactivo" },
        ].map((s) => (
          <div key={s.v} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              className="mono"
              style={{ fontSize: 11, color: s.color, letterSpacing: "0.08em" }}
            >
              {s.v}
            </span>
            <span
              style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}
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
    color: "#fb923c",
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
              style={{ fontSize: 13, color: "#fb923c", width: 14, textAlign: "center" }}
            >
              {s.symbol}
            </span>
            <span
              className="mono"
              style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", letterSpacing: "0.08em" }}
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
            color: "var(--accent-500)",
          }}
        >
          Intent Momentum
        </span>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(22px, 3vw, 30px)",
            lineHeight: 1.1,
            color: "#fff",
            margin: 0,
          }}
        >
          La intención es un vector, no un estado.
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.6,
            margin: 0,
            maxWidth: 560,
          }}
        >
          Cada perfil emite un vector de tres dimensiones en cada interacción. Los módulos
          de SUAAS lo calculan, lo agregan y lo cruzan para medir la fuerza gravitacional
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
              border: "1px solid rgba(255,255,255,0.07)",
              borderTop: `2px solid ${d.color}`,
              borderRadius: "var(--radius-md)",
              padding: "22px 22px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: 9,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.35)",
              }}
            >
              {d.label}
            </span>
            {d.visual}
            <p
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.45)",
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
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "var(--radius-lg)",
        padding: "clamp(36px, 5vw, 60px)",
        background: "rgba(255,255,255,0.015)",
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
            color: "var(--accent-500)",
          }}
        >
          Gravity Model
        </span>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(28px, 4vw, 42px)",
              lineHeight: 1.1,
              color: "#fff",
              margin: 0,
            }}
          >
            Tres planos.<br />Un vector.
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.6)",
              lineHeight: 1.65,
              margin: 0,
              maxWidth: 420,
            }}
          >
            La intención no es binaria: tiene{" "}
            <em style={{ color: "rgba(255,255,255,0.85)", fontStyle: "normal" }}>intensidad</em>{" "}
            (0→1),{" "}
            <em style={{ color: "rgba(255,255,255,0.85)", fontStyle: "normal" }}>dirección</em>{" "}
            (approaching · stable · drifting) y{" "}
            <em style={{ color: "rgba(255,255,255,0.85)", fontStyle: "normal" }}>velocidad</em>{" "}
            (accelerating · steady · decelerating). Los tres planos determinan ese vector antes de
            que la marca entre en la ecuación.
          </p>
        </div>

        {/* Plane pills */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { color: "#60a5fa", label: "Construction", desc: "Contexto gravitacional" },
            { color: "#fb923c", label: "Acceleration", desc: "Modulación del momentum" },
            { color: "#a78bfa", label: "Value", desc: "Estabilización de la órbita" },
          ].map((p) => (
            <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: p.color,
                  flexShrink: 0,
                  boxShadow: `0 0 8px 2px ${p.color}66`,
                }}
              />
              <span
                className="mono"
                style={{ fontSize: 11, color: p.color, letterSpacing: "0.12em" }}
              >
                {p.label}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.35)",
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
            color: "var(--accent-500)",
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
          width: "100%",
          maxWidth: 300,
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
      {/* Rings */}
      <Ring r={128} color="#60a5fa" />
      <Ring r={84} color="#fb923c" />
      <Ring r={44} color="#a78bfa" />

      {/* Labels */}
      <RingLabel r={128} angle={-28} color="#60a5fa" text="Construction" />
      <RingLabel r={84} angle={42} color="#fb923c" text="Acceleration" />
      <RingLabel r={44} angle={-55} color="#a78bfa55" text="Value" />

      {/* Center */}
      <div className="gm-center" />

      {/* Orbiting dots:Construction (2 dots, slow) */}
      <Dot r={128} color="#60a5fa" dur="16s" delay="0s" />
      <Dot r={128} color="#60a5fa" dur="16s" delay="-8s" opacity={0.5} />

      {/* Orbiting dot:Acceleration */}
      <Dot r={84} color="#fb923c" dur="10s" delay="-3s" />

      {/* Orbiting dot:Value (faint, pending) */}
      <Dot r={44} color="#a78bfa" dur="6s" delay="-1.5s" opacity={0.25} />
    </div>
  );
}

function Ring({ r, color }: { r: number; color: string }) {
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
        border: `1px solid ${color}33`,
      }}
    />
  );
}

function RingLabel({
  r,
  angle,
  color,
  text,
}: {
  r: number;
  angle: number;
  color: string;
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
        color,
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
  color,
  dur,
  delay,
  opacity = 1,
}: {
  r: number;
  color: string;
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
          background: color,
          boxShadow: `0 0 6px 2px ${color}99`,
          opacity,
        } as CSSProperties
      }
    />
  );
}

// ── Plane sections ────────────────────────────────────────────

function PlaneSection({
  color,
  label,
  description,
  modules,
}: {
  color: string;
  label: string;
  description: string;
  modules: ModuleItem[];
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: color,
              flexShrink: 0,
            }}
          />
          <h2
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color,
              margin: 0,
            }}
          >
            {label}
          </h2>
        </div>
        <p
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.6,
            margin: 0,
            maxWidth: 640,
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
        {modules.map((m) => (
          <ModuleCard key={m.href} item={m} accentColor={color} />
        ))}
      </div>
    </section>
  );
}

function ModuleCard({
  item,
  accentColor,
}: {
  item: ModuleItem;
  accentColor: string;
}) {
  return (
    <Link
      href={item.href}
      className="feature-card"
      style={{ borderTop: `2px solid ${accentColor}55` }}
    >
      <item.icon size={20} />
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: 20,
          lineHeight: 1.15,
          color: "#fff",
          margin: 0,
        }}
      >
        {item.label}
      </h3>
      <p
        style={{
          color: "rgba(255,255,255,0.6)",
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
          color: accentColor,
        }}
      >
        {item.cta} →
      </span>
    </Link>
  );
}
