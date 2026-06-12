import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { TIERS } from "@/lib/landing-pricing";
import { isInternalUnlocked } from "@/lib/landing-auth";
import { AiCostModule } from "./ai-module";
import { PricingCalculator } from "./calculator";
import { FlatLogo } from "./flat-logo";
import { LandingNav } from "./nav";
import { UnlockForm } from "./unlock-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gravity · Flat 101",
  description: "Valida decisiones de producto, precio y campañas con perfiles calibrados.",
};

// Marca comercial del producto (no se usa el nombre interno). Cambiar aquí
// para renombrarlo en toda la landing.
const BRAND = "Gravity";

function eur(n: number, decimals = 0): string {
  return `${n.toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} €`;
}

const sectionLabel: CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.3em",
  textTransform: "uppercase",
  color: "var(--accent-text)",
  fontFamily: "var(--font-mono)",
};

const PAD = "clamp(44px, 6vw, 84px) clamp(16px, 5vw, 64px)";

export default async function PropuestaPage() {
  const unlocked = await isInternalUnlocked();

  return (
    <div id="top">
      {/* ── Nav ── */}
      <LandingNav brand={BRAND} />

      {/* ── Hero ── */}
      <Band gap={26}>
        <span style={sectionLabel}>Gravity · una metodología de Flat 101</span>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(42px, 8vw, 96px)",
            lineHeight: 1.0,
            letterSpacing: "-0.02em",
            color: "var(--text-strong)",
            margin: 0,
          }}
        >
          Valida la decisión antes de gastar en ella.
        </h1>
        <p style={{ fontSize: "clamp(17px, 1.9vw, 24px)", lineHeight: 1.5, color: "rgba(var(--fg),0.72)" }}>
          {BRAND} mide la atracción que tu marca ejerce: pone a prueba tu web y tus campañas frente
          a una cohorte de <strong style={{ color: "var(--text-strong)" }}>perfiles calibrados</strong>{" "}
          con tus clientes reales. También el precio, antes de publicarlo. Resultados en
          minutos, por una fracción de lo que cuesta un estudio con personas.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "nowrap", marginTop: 4 }}>
          <a href="#paquetes" className="btn-pill solid" style={{ padding: "11px 14px", fontSize: 12, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>Ver paquetes →</a>
          <a href="#metodologia" className="btn-pill" style={{ padding: "11px 14px", fontSize: 12, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>Cómo funciona</a>
        </div>
      </Band>

      {/* ── Metodología: Gravity Model ── */}
      <Band id="metodologia" gap={36}>
        <SectionHead label="La metodología" title="No es un funnel. Es una órbita." />
        <div style={{ display: "flex", gap: "clamp(36px, 6vw, 80px)", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 340px", display: "flex", flexDirection: "column", gap: 26 }}>
            <p style={{ fontSize: 16, color: "rgba(var(--fg),0.7)", lineHeight: 1.65 }}>
              La intención de tu cliente tiene{" "}
              <em style={{ fontStyle: "normal", color: "var(--text-strong)" }}>intensidad</em> y{" "}
              <em style={{ fontStyle: "normal", color: "var(--text-strong)" }}>dirección</em>. A veces
              también <em style={{ fontStyle: "normal", color: "var(--text-strong)" }}>prisa</em>. Esa
              intención orbita alrededor de tu marca: se acerca, se aleja, vuelve. Gravity actúa sobre
              esa órbita en tres planos.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {PLANES.map((p) => (
                <div key={p.n} style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
                  <span className="mono" style={{ fontSize: 13, color: "var(--accent-text)", letterSpacing: "0.06em", flexShrink: 0 }}>
                    {p.n}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>{p.title}</span>
                    <span style={{ fontSize: 13, color: "rgba(var(--fg),0.6)", lineHeight: 1.55 }}>{p.body}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: "0 0 auto", margin: "0 auto" }}>
            <OrbitalDiagram />
          </div>
        </div>
      </Band>

      {/* ── Qué incluye (apartado en blanco: rompe el esquema) ── */}
      <Band id="incluye" surface="paper" gap={32}>
        <SectionHead label="Qué incluye" title="Ocho pruebas que responden preguntas concretas." />
        <Grid min={240} maxCols={4}>
          {MODULES.map((m) => (
            <div
              key={m.title}
              style={{
                border: "1px solid rgba(var(--fg),0.1)",
                borderRadius: "var(--radius-md)",
                padding: "22px 22px 20px",
                background: "rgba(var(--fg),0.015)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <span className="mono" style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--accent-text)" }}>
                {m.plane}
              </span>
              <h3 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 19, color: "var(--text-strong)", margin: 0 }}>
                {m.title}
              </h3>
              <p style={{ fontSize: 13, color: "rgba(var(--fg),0.6)", lineHeight: 1.55, margin: 0 }}>{m.body}</p>
            </div>
          ))}
        </Grid>
      </Band>

      {/* ── Paquetes ── */}
      <Band id="paquetes" gap={32}>
        <SectionHead label="Paquetes" title="Cada cliente trabaja en su propia instancia, con su marca. El gasto de IA va incluido." />
        <Grid min={260}>
          {TIERS.map((t) => (
            <div
              key={t.id}
              style={{
                border: t.featured ? "1px solid var(--accent-500)" : "1px solid rgba(var(--fg),0.1)",
                borderRadius: "var(--radius-lg)",
                padding: "26px 24px",
                background: t.featured ? "rgba(250,204,13,0.04)" : "rgba(var(--fg),0.02)",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="mono" style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: t.featured ? "var(--accent-text)" : "rgba(var(--fg),0.6)" }}>
                  {t.name}
                </span>
                {t.featured && (
                  <span className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-900)", background: "var(--accent-500)", padding: "2px 7px", borderRadius: "var(--radius-pill)" }}>
                    Recomendado
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 40, color: "var(--text-strong)", lineHeight: 1 }}>{eur(t.priceMonth)}</span>
                <span style={{ fontSize: 13, color: "rgba(var(--fg),0.5)" }}>/mes</span>
              </div>
              <span style={{ fontSize: 12, color: "rgba(var(--fg),0.45)" }}>Calibración opcional: {eur(t.setup)} (una vez)</span>
              <p style={{ fontSize: 13, color: "rgba(var(--fg),0.7)", lineHeight: 1.5, margin: 0 }}>{t.blurb}</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {t.features.map((f) => (
                  <li key={f} style={{ fontSize: 13, color: "rgba(var(--fg),0.7)", lineHeight: 1.45, display: "flex", gap: 8 }}>
                    <span style={{ color: "var(--accent-text)" }}>·</span>
                    {f}
                  </li>
                ))}
              </ul>
              <span className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(var(--fg),0.4)", marginTop: "auto", paddingTop: 8 }}>
                {t.target}
              </span>
            </div>
          ))}
        </Grid>
        <div
          style={{
            border: "1px dashed rgba(var(--fg),0.14)",
            borderRadius: "var(--radius-md)",
            padding: "18px 22px",
            display: "flex",
            flexWrap: "wrap",
            gap: "8px 24px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 13, color: "rgba(var(--fg),0.6)" }}>
            <strong style={{ color: "var(--text-strong)" }}>Enterprise</strong> a medida (&gt; 2.900 €/mes): multi-marca, integraciones, formación y varias instancias.
          </span>
          <span style={{ fontSize: 13, color: "rgba(var(--fg),0.6)" }}>
            <strong style={{ color: "var(--text-strong)" }}>Piloto</strong> puntual desde 490 €, descontable de la primera mensualidad.
          </span>
        </div>
      </Band>

      {/* ── Motor de IA (interactivo) ── */}
      <Band id="motor" gap={28}>
        <SectionHead label="Motor de IA" title="Elige proveedor y presupuesto. El análisis es el mismo." />
        <p style={{ fontSize: 15, color: "rgba(var(--fg),0.65)", lineHeight: 1.6 }}>
          Funciona con la IA que prefieras: Anthropic (la que usamos hoy), OpenAI, Google o Perplexity.
          Cada test cuesta céntimos, lo comprobamos cada mes en nuestra propia factura. Pon el
          presupuesto que quieras dedicar y mira cuántos tests salen con cada una.
        </p>
        <AiCostModule defaultBudget={50} />
      </Band>

      {/* ── Calculadora ── */}
      <Band id="calculadora" gap={28}>
        <SectionHead label="Calculadora" title="Cuánto cuesta servirlo y qué margen deja." />
        <p style={{ fontSize: 15, color: "rgba(var(--fg),0.6)", lineHeight: 1.6 }}>
          Herramienta interna para echar cuentas: combinas paquetes y ves el margen que queda después
          de la infraestructura. Se abre con la contraseña del pie de página.
        </p>
        <PricingCalculator unlocked={unlocked} />
      </Band>

      {/* ── Cierre (banda oscura con titular en amarillo) ── */}
      <Band surface="feature" gap={16}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(30px, 5vw, 56px)",
            color: "var(--accent-500)",
            margin: 0,
            lineHeight: 1.05,
          }}
        >
          Una sola decisión equivocada cuesta más que un año de plataforma.
        </h2>
        <p style={{ fontSize: 16, color: "rgba(var(--fg),0.7)", lineHeight: 1.6 }}>
          Empieza con un piloto sobre una decisión real. Si te sube la conversión un punto, ya está
          pagado. Y cuando la decisión sea irreversible, llévala a un test con personas: Gravity
          filtra el 80% de las dudas antes de llegar ahí.
        </p>
        <a href="#paquetes" className="btn-pill solid">Elegir paquete →</a>
      </Band>

      {/* ── Footer ── */}
      <footer
        style={{
          padding: "36px clamp(16px, 5vw, 64px) 56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          flexWrap: "wrap",
          borderTop: "1px solid rgba(var(--fg),0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "rgba(var(--fg),0.45)" }}>
          <FlatLogo size={48} />
          <span style={{ fontSize: 12, maxWidth: 360, lineHeight: 1.5 }}>
            {BRAND} · una solución de Flat 101. Cifras orientativas (2026), basadas en medias de uso reales.
          </span>
        </div>
        <UnlockForm unlocked={unlocked} />
      </footer>
    </div>
  );
}

// ── Layout helpers ──

function Band({
  id,
  surface,
  gap = 32,
  children,
}: {
  id?: string;
  surface?: "paper" | "feature";
  gap?: number;
  children: ReactNode;
}) {
  const cls = surface === "paper" ? "surface-paper" : surface === "feature" ? "surface-feature" : undefined;
  return (
    <section id={id} className={cls} style={{ padding: PAD, scrollMarginTop: 72 }}>
      <div style={{ display: "flex", flexDirection: "column", gap }}>{children}</div>
    </section>
  );
}

function Grid({ min, maxCols, children }: { min: number; maxCols?: number; children: ReactNode }) {
  // Con maxCols, el ancho mínimo de columna nunca baja de 1/maxCols del
  // contenedor: en pantallas anchas el grid se queda en maxCols columnas.
  const minExpr = maxCols
    ? `max(${min}px, calc((100% - ${(maxCols - 1) * 16}px) / ${maxCols}))`
    : `${min}px`;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${minExpr}, 1fr))`, gap: 16 }}>
      {children}
    </div>
  );
}

const PLANES = [
  { n: "01", title: "Construcción · por qué entras en su órbita", body: "Segmentamos por intención, con perfiles calibrados, y definimos por qué tu marca empieza a existir para ese usuario." },
  { n: "02", title: "Aceleración · refuerza o redirige la intención", body: "Campañas y mensajes guiados por la intención, y cómo te ven los buscadores de IA (GEO). Cada interacción empuja la órbita o la frena." },
  { n: "03", title: "Valor · que el cliente vuelva", body: "Claridad en la web y embudos que acaban en compra. Y que esa compra se repita: la órbita se estabiliza y el cliente se queda cerca." },
];

const MODULES = [
  { plane: "Aceleración", title: "Claridad 5s", body: "Enseñamos tu pantalla 5 segundos y el perfil cuenta qué ha entendido y qué le chirría." },
  { plane: "Aceleración", title: "Embudos", body: "El perfil recorre tu flujo paso a paso y marca dónde abandonaría. Y por qué." },
  { plane: "Aceleración", title: "Campañas", body: "El anuncio que ese perfil querría ver, ajustado a su intención y a la query." },
  { plane: "Construcción", title: "Pricing", body: "Cuánto pagaría cada perfil por cada nivel, antes de que toques una línea de la web." },
  { plane: "Aceleración", title: "Copy", body: "Bloque a bloque: claridad, persuasión y ganas de hacer clic." },
  { plane: "Aceleración", title: "GEO", body: "Cómo te ven Perplexity, ChatGPT Search y Google AI cuando alguien pregunta por lo tuyo." },
  { plane: "Aceleración", title: "A/B", body: "Dos variantes ante la misma cohorte. Gana la que menos objeciones levanta." },
  { plane: "Construcción", title: "Intención", body: "Qué busca el usuario y con cuántas ganas, antes de que tu marca aparezca en su pantalla." },
];

function SectionHead({ label, title }: { label: string; title: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <span style={sectionLabel}>{label}</span>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: "clamp(26px, 3.6vw, 44px)",
          lineHeight: 1.1,
          color: "var(--text-strong)",
          margin: 0,
        }}
      >
        {title}
      </h2>
    </div>
  );
}

// ── Diagrama orbital (animación de los planos del Gravity Model) ──

function OrbitalDiagram() {
  const SIZE = 300;
  return (
    <div style={{ position: "relative", width: SIZE, height: SIZE, maxWidth: "100%" }}>
      <Ring r={138} alpha={0.28} />
      <Ring r={92} alpha={0.18} />
      <Ring r={48} alpha={0.1} />
      <RingLabel r={138} angle={-28} alpha={0.5} text="01 Construcción" />
      <RingLabel r={92} angle={42} alpha={0.38} text="02 Aceleración" />
      <RingLabel r={48} angle={-60} alpha={0.24} text="03 Valor" />
      <div className="gm-center" />
      <Dot r={138} dur="18s" delay="0s" opacity={0.9} />
      <Dot r={138} dur="18s" delay="-9s" opacity={0.5} />
      <Dot r={92} dur="11s" delay="-3s" opacity={0.75} />
      <Dot r={48} dur="7s" delay="-1.5s" opacity={0.4} />
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

function RingLabel({ r, angle, alpha, text }: { r: number; angle: number; alpha: number; text: string }) {
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

function Dot({ r, dur, delay, opacity = 1 }: { r: number; dur: string; delay: string; opacity?: number }) {
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
