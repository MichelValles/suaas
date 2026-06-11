import type { Metadata } from "next";
import type { CSSProperties } from "react";
import {
  AI_PROVIDERS,
  BUDGET_REF_USD,
  TIERS,
  runCostEur,
  runsForBudget,
} from "@/lib/landing-pricing";
import { isInternalUnlocked } from "@/lib/landing-auth";
import { PricingCalculator } from "./calculator";
import { UnlockForm } from "./unlock-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gravity · Flat 101",
  description: "Valida decisiones de producto, precio y campañas con perfiles modelados.",
};

// Marca comercial del producto (no se usa el nombre interno). Cambiar aquí
// para renombrarlo en toda la landing.
const BRAND = "Gravity";

const NAV = [
  { href: "#metodologia", label: "Metodología" },
  { href: "#incluye", label: "Qué incluye" },
  { href: "#paquetes", label: "Paquetes" },
  { href: "#motor", label: "Motor de IA" },
  { href: "#calculadora", label: "Calculadora" },
];

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

const anchorOffset: CSSProperties = { scrollMarginTop: 88 };

export default async function PropuestaPage() {
  const unlocked = await isInternalUnlocked();

  return (
    <div id="top">
      {/* ── Nav con anclas ── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "var(--surface-app)",
          borderBottom: "1px solid rgba(var(--fg),0.08)",
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "14px clamp(16px, 4vw, 40px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <a href="#top" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <FlatLogo size={52} />
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: 20,
                color: "var(--text-strong)",
              }}
            >
              {BRAND}
            </span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: "6px 20px", flexWrap: "wrap" }}>
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="mono"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(var(--fg),0.6)",
                }}
              >
                {n.label}
              </a>
            ))}
            <a href="#paquetes" className="btn-pill solid" style={{ padding: "10px 20px" }}>
              Hablemos →
            </a>
          </div>
        </div>
      </nav>

      <main
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "clamp(40px, 6vw, 88px) clamp(16px, 4vw, 40px) 0",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(64px, 9vw, 120px)",
        }}
      >
        {/* ── Hero ── */}
        <section style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <span style={sectionLabel}>Gravity · una metodología de Flat 101</span>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(40px, 7vw, 84px)",
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
              color: "var(--text-strong)",
              margin: 0,
            }}
          >
            Valida la decisión antes de gastar en ella.
          </h1>
          <p style={{ fontSize: "clamp(17px, 1.8vw, 22px)", lineHeight: 1.55, color: "rgba(var(--fg),0.72)", maxWidth: 780 }}>
            {BRAND} pone a prueba tu web, tus campañas, tu precio y tu mensaje frente a una
            cohorte de <strong style={{ color: "var(--text-strong)" }}>perfiles modelados</strong>{" "}
            calibrados con tu cliente real. Resultados en minutos, por una fracción de lo que
            cuesta un estudio con usuarios reales.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
            <a href="#paquetes" className="btn-pill solid">Ver paquetes →</a>
            <a href="#metodologia" className="btn-pill">Cómo funciona</a>
          </div>
        </section>

        {/* ── Metodología: Gravity Model ── */}
        <section id="metodologia" style={{ ...anchorOffset, display: "flex", flexDirection: "column", gap: 36 }}>
          <SectionHead label="La metodología" title="No es un funnel. Es una órbita." />
          <div
            style={{
              display: "flex",
              gap: "clamp(36px, 6vw, 72px)",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: "1 1 320px", display: "flex", flexDirection: "column", gap: 26 }}>
              <p style={{ fontSize: 15, color: "rgba(var(--fg),0.7)", lineHeight: 1.65, maxWidth: 520 }}>
                La intención de tu cliente no es un sí o un no: tiene{" "}
                <em style={{ fontStyle: "normal", color: "var(--text-strong)" }}>intensidad</em>,{" "}
                <em style={{ fontStyle: "normal", color: "var(--text-strong)" }}>dirección</em> y{" "}
                <em style={{ fontStyle: "normal", color: "var(--text-strong)" }}>velocidad</em>. No
                recorre un embudo lineal: orbita alrededor de tu marca. Gravity actúa sobre esa
                órbita en tres planos.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {PLANES.map((p) => (
                  <div key={p.n} style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
                    <span
                      className="mono"
                      style={{ fontSize: 13, color: "var(--accent-text)", letterSpacing: "0.06em", flexShrink: 0 }}
                    >
                      {p.n}
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>
                        {p.title}
                      </span>
                      <span style={{ fontSize: 13, color: "rgba(var(--fg),0.6)", lineHeight: 1.55 }}>
                        {p.body}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ flex: "0 0 auto", margin: "0 auto" }}>
              <OrbitalDiagram />
            </div>
          </div>
        </section>

        {/* ── El valor (datos grandes, estilo flat101) ── */}
        <section style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <SectionHead
            label="Por qué"
            title="El research tradicional cobra por persona, por hora y por semanas."
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <ValueCard stat="4.000-10.000 €" label="Un único test moderado" body="Con usuarios reales: incentivos, reclutamiento y horas de analista por cada estudio." />
            <ValueCard stat="2-4 semanas" label="Sólo en reclutar" body="El diseño avanza sin evidencia mientras esperas a tener participantes." />
            <ValueCard stat="Minutos" label="Con Gravity" body="Lanza el test, recibe el vector de intención y las barreras al instante. Itera el mismo día." />
            <ValueCard stat="80 / 20" label="El encaje honesto" body="Perfiles modelados para el 80% inicial. El research humano caro, sólo para el 20% crítico." />
          </div>
        </section>

        {/* ── Qué incluye ── */}
        <section id="incluye" style={{ ...anchorOffset, display: "flex", flexDirection: "column", gap: 32 }}>
          <SectionHead label="Qué incluye" title="Un laboratorio completo de decisión." />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            {MODULES.map((m) => (
              <div
                key={m.title}
                style={{
                  border: "1px solid rgba(var(--fg),0.08)",
                  borderRadius: "var(--radius-md)",
                  padding: "22px 22px 20px",
                  background: "rgba(var(--fg),0.02)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <span className="mono" style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--accent-text)" }}>
                  {m.plane}
                </span>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontStyle: "italic",
                    fontSize: 19,
                    color: "var(--text-strong)",
                    margin: 0,
                  }}
                >
                  {m.title}
                </h3>
                <p style={{ fontSize: 13, color: "rgba(var(--fg),0.6)", lineHeight: 1.55, margin: 0 }}>
                  {m.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Paquetes ── */}
        <section id="paquetes" style={{ ...anchorOffset, display: "flex", flexDirection: "column", gap: 32 }}>
          <SectionHead label="Paquetes" title="Instancia dedicada, tu marca, presupuesto de IA incluido." />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
              alignItems: "stretch",
            }}
          >
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
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: t.featured ? "var(--accent-text)" : "rgba(var(--fg),0.6)",
                    }}
                  >
                    {t.name}
                  </span>
                  {t.featured && (
                    <span
                      className="mono"
                      style={{
                        fontSize: 9,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "var(--ink-900)",
                        background: "var(--accent-500)",
                        padding: "2px 7px",
                        borderRadius: "var(--radius-pill)",
                      }}
                    >
                      Recomendado
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 40, color: "var(--text-strong)", lineHeight: 1 }}>
                    {eur(t.priceMonth)}
                  </span>
                  <span style={{ fontSize: 13, color: "rgba(var(--fg),0.5)" }}>/mes</span>
                </div>
                <span style={{ fontSize: 12, color: "rgba(var(--fg),0.45)" }}>
                  + {eur(t.setup)} de setup de calibración
                </span>
                <p style={{ fontSize: 13, color: "rgba(var(--fg),0.7)", lineHeight: 1.5, margin: 0 }}>{t.blurb}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {t.features.map((f) => (
                    <li key={f} style={{ fontSize: 13, color: "rgba(var(--fg),0.7)", lineHeight: 1.45, display: "flex", gap: 8 }}>
                      <span style={{ color: "var(--accent-text)" }}>·</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <span
                  className="mono"
                  style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(var(--fg),0.4)", marginTop: "auto", paddingTop: 8 }}
                >
                  {t.target}
                </span>
              </div>
            ))}
          </div>
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
              <strong style={{ color: "var(--text-strong)" }}>Enterprise</strong> a medida (&gt; 2.900 €/mes):
              multi-marca, integraciones, formación y varias instancias.
            </span>
            <span style={{ fontSize: 13, color: "rgba(var(--fg),0.6)" }}>
              <strong style={{ color: "var(--text-strong)" }}>Piloto</strong> puntual desde 490 €,
              descontable de la primera mensualidad.
            </span>
          </div>
        </section>

        {/* ── Motor de IA ── */}
        <section id="motor" style={{ ...anchorOffset, display: "flex", flexDirection: "column", gap: 28 }}>
          <SectionHead label="Motor de IA" title="Elige proveedor. El coste por run cambia, el resultado no." />
          <p style={{ fontSize: 14, color: "rgba(var(--fg),0.6)", lineHeight: 1.6, maxWidth: 720 }}>
            La plataforma corre sobre el Vercel AI Gateway: puede usar Anthropic (motor actual),
            OpenAI, Google Gemini o Perplexity sin cambiar el producto. Un{" "}
            <em style={{ fontStyle: "normal", color: "rgba(var(--fg),0.85)" }}>run estándar</em>{" "}
            (un experimento sobre una cohorte pequeña, ~20.000 tokens de entrada y 2.500 de salida)
            cuesta esto, y esto es lo que rinde un presupuesto de {BUDGET_REF_USD} $/mes:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {AI_PROVIDERS.map((p) => (
              <div key={p.provider} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                  <span className="mono" style={{ fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-strong)" }}>
                    {p.provider}
                  </span>
                  <span style={{ fontSize: 12, color: "rgba(var(--fg),0.45)" }}>{p.note}</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                    <thead>
                      <tr>
                        {["Modelo", "$/Mtok entrada", "$/Mtok salida", "Coste/run", `Runs con ${BUDGET_REF_USD} $/mes`].map((h, i) => (
                          <th
                            key={h}
                            style={{
                              textAlign: i === 0 ? "left" : "right",
                              fontSize: 10,
                              letterSpacing: "0.12em",
                              textTransform: "uppercase",
                              color: "rgba(var(--fg),0.4)",
                              fontWeight: 500,
                              padding: "6px 12px",
                              borderBottom: "1px solid rgba(var(--fg),0.1)",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {p.models.map((m) => (
                        <tr key={m.id}>
                          <td style={{ ...cellStyle, textAlign: "left", color: "var(--text-strong)" }}>
                            {m.label}
                            {m.current && (
                              <span className="mono" style={{ fontSize: 9, marginLeft: 8, color: "var(--accent-text)", letterSpacing: "0.1em" }}>
                                ACTUAL
                              </span>
                            )}
                          </td>
                          <td style={cellStyle}>{m.inUsd.toLocaleString("es-ES")} $</td>
                          <td style={cellStyle}>{m.outUsd.toLocaleString("es-ES")} $</td>
                          <td style={cellStyle}>{eur(runCostEur(m), 3)}</td>
                          <td style={{ ...cellStyle, color: "var(--accent-text)" }}>
                            ~{runsForBudget(m, BUDGET_REF_USD).toLocaleString("es-ES")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {p.provider === "Perplexity" && (
                  <span style={{ fontSize: 11, color: "rgba(var(--fg),0.4)" }}>
                    Perplexity cobra un fee por request además de los tokens (incluido en el
                    coste/run). Sus modelos Sonar traen búsqueda web en vivo: encajan en el módulo GEO.
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Calculadora ── */}
        <section id="calculadora" style={{ ...anchorOffset, display: "flex", flexDirection: "column", gap: 28 }}>
          <SectionHead label="Calculadora" title="Tarificador y rentabilidad." />
          <p style={{ fontSize: 14, color: "rgba(var(--fg),0.6)", lineHeight: 1.6, maxWidth: 720 }}>
            Ajusta paquete, número de clientes, motor de IA y uso para ver la tarifa y lo que
            incluye. La vista interna (rentabilidad bruta y neta) se desbloquea con la contraseña
            del pie de página.
          </p>
          <PricingCalculator unlocked={unlocked} />
        </section>

        {/* ── Cierre ── */}
        <section
          className="surface-feature"
          style={{
            borderRadius: "var(--radius-lg)",
            padding: "clamp(32px, 5vw, 56px)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            alignItems: "flex-start",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(28px, 4vw, 44px)",
              color: "var(--accent-500)",
              margin: 0,
              lineHeight: 1.08,
            }}
          >
            Una sola decisión equivocada cuesta más que un año de plataforma.
          </h2>
          <p style={{ fontSize: 15, color: "rgba(var(--fg),0.7)", lineHeight: 1.6, maxWidth: 620 }}>
            Empieza con un piloto sobre una decisión real. Si te ahorra un solo estudio o sube tu
            conversión un punto, el retorno es inmediato.
          </p>
          <a href="#paquetes" className="btn-pill solid">Elegir paquete →</a>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "40px clamp(16px, 4vw, 40px) 56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          flexWrap: "wrap",
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

const cellStyle: CSSProperties = {
  textAlign: "right",
  fontSize: 13,
  fontFamily: "var(--font-mono)",
  fontVariantNumeric: "tabular-nums",
  color: "rgba(var(--fg),0.7)",
  padding: "9px 12px",
  borderBottom: "1px solid rgba(var(--fg),0.05)",
};

const PLANES = [
  {
    n: "01",
    title: "Construcción · por qué entras en su órbita",
    body: "Hipersegmentación por intención con perfiles modelados: define por qué tu marca empieza a existir para ese usuario.",
  },
  {
    n: "02",
    title: "Aceleración · refuerza o redirige la intención",
    body: "Campañas, visibilidad en motores de IA (GEO) y mensajes guiados por intención. Cada interacción modula el momentum.",
  },
  {
    n: "03",
    title: "Valor · convierte la decisión en relación",
    body: "Claridad, embudos y permanencia. Donde una decisión puntual se estabiliza en una órbita duradera.",
  },
];

const MODULES = [
  { plane: "Aceleración", title: "Claridad 5s", body: "Qué entiende el usuario de tu pantalla en 5 segundos: comprensión y fricción percibida." },
  { plane: "Aceleración", title: "Embudos", body: "El perfil recorre tu flujo con su carga cognitiva real y marca el abandono por paso." },
  { plane: "Aceleración", title: "Campañas", body: "El anuncio que el usuario querría ver, ajustado a su intención y a la query." },
  { plane: "Construcción", title: "Pricing", body: "El umbral psicológico de precio antes de tocar la web: disposición a pagar por nivel." },
  { plane: "Aceleración", title: "Copy", body: "Bloque a bloque: claridad, persuasión y ganas de hacer clic." },
  { plane: "Aceleración", title: "GEO", body: "Cómo te ven Perplexity, ChatGPT Search y Google AI: visibilidad y posición de marca." },
  { plane: "Aceleración", title: "A/B", body: "Dos variantes en paralelo sobre la misma cohorte, con barreras emergentes." },
  { plane: "Construcción", title: "Momentum", body: "La intención antes de que tu marca entre en la ecuación: intensidad, dirección y velocidad." },
];

function SectionHead({ label, title }: { label: string; title: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <span style={sectionLabel}>{label}</span>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: "clamp(26px, 3.4vw, 40px)",
          lineHeight: 1.1,
          color: "var(--text-strong)",
          margin: 0,
          maxWidth: 820,
        }}
      >
        {title}
      </h2>
    </div>
  );
}

function ValueCard({ stat, label, body }: { stat: string; label: string; body: string }) {
  return (
    <div
      style={{
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-md)",
        padding: "26px 24px 22px",
        background: "rgba(var(--fg),0.02)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: "clamp(30px, 3.6vw, 40px)",
          color: "var(--accent-text)",
          lineHeight: 1,
        }}
      >
        {stat}
      </span>
      <span className="mono" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(var(--fg),0.5)" }}>
        {label}
      </span>
      <p style={{ fontSize: 13, color: "rgba(var(--fg),0.6)", lineHeight: 1.5, margin: 0 }}>{body}</p>
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

function FlatLogo({ size = 64 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 150 40"
      width={size}
      height={(size * 40) / 150}
      role="img"
      aria-label="Flat 101"
      style={{ color: "var(--text-strong)", flexShrink: 0 }}
    >
      <g transform="scale(0.199) translate(5.5, 0)" fill="currentColor">
        <path fillRule="evenodd" clipRule="evenodd" d="M599.256 0.210449C576.664 0.210449 563.733 14.9163 563.733 42.4163V158.005C563.733 185.505 576.367 200.21 599.256 200.21C622.144 200.21 634.778 185.505 634.778 158.005V42.4163C634.778 14.9163 621.921 0.210449 599.256 0.210449ZM624.151 158.593C624.151 179.549 615.307 189.769 599.256 189.769C583.204 189.769 574.36 179.549 574.36 158.593V41.8281C574.36 20.8722 583.204 10.6516 599.256 10.6516C615.307 10.6516 624.151 20.5781 624.151 41.8281V158.519V158.593Z" />
        <path fillRule="evenodd" clipRule="evenodd" d="M600.698 0.210449C578.106 0.210449 565.176 14.9163 565.176 42.4163V158.005C565.176 185.505 577.809 200.21 600.698 200.21C623.587 200.21 636.22 185.505 636.22 158.005V42.4163C636.22 14.9163 623.364 0.210449 600.698 0.210449ZM625.593 158.593C625.593 179.549 616.75 189.769 600.698 189.769C584.646 189.769 575.803 179.549 575.803 158.593V41.8281C575.803 20.8722 584.646 10.6516 600.698 10.6516C616.75 10.6516 625.593 20.5781 625.593 41.8281V158.519V158.593Z" />
        <path fillRule="evenodd" clipRule="evenodd" d="M109.157 186.902V3.07812H98.6045V197.343H150.104V186.902H109.157Z" />
        <path fillRule="evenodd" clipRule="evenodd" d="M0.65918 197.343H11.2861V106.166H47.3283V95.6517H11.2861V13.5193H51.9358V3.07812H0.65918V197.343Z" />
        <path fillRule="evenodd" clipRule="evenodd" d="M296.426 13.5193H325.334V197.343H335.589V13.5193H364.497V3.07812H296.426V13.5193Z" />
        <path d="M510.894 3.07812H500.268V197.416H510.894V3.07812Z" />
        <path d="M698.099 3.07812H687.472V197.416H698.099V3.07812Z" />
        <path fillRule="evenodd" clipRule="evenodd" d="M236.828 3.07812H225.978L190.753 197.343H201.603L231.403 26.2399L261.203 197.343H272.052L236.828 3.07812Z" />
      </g>
    </svg>
  );
}
