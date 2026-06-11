import type { Metadata } from "next";
import type { CSSProperties } from "react";
import {
  AI_PROVIDERS,
  BUDGET_REF_USD,
  TIERS,
  runCostEur,
  runsForBudget,
} from "@/lib/landing-pricing";
import { PricingCalculator } from "./calculator";

export const metadata: Metadata = {
  title: "Propuesta · Flat 101",
  description: "Usuarios sintéticos para decisiones de producto, precio y campañas.",
};

// Marca comercial del producto (no se usa el nombre interno). Cambiar aquí
// para renombrarlo en toda la landing.
const BRAND = "Prisma";

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

export default function PropuestaPage() {
  return (
    <main
      style={{
        maxWidth: 1080,
        margin: "0 auto",
        padding: "clamp(28px, 5vw, 64px) clamp(20px, 4vw, 48px) 96px",
        display: "flex",
        flexDirection: "column",
        gap: "clamp(56px, 8vw, 104px)",
      }}
    >
      {/* ── Cabecera ── */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <FlatLogo />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 22,
              color: "var(--text-strong)",
            }}
          >
            {BRAND}
          </span>
        </div>
        <span className="mono" style={{ fontSize: 11, color: "rgba(var(--fg),0.4)", letterSpacing: "0.1em" }}>
          Propuesta comercial
        </span>
      </header>

      {/* ── Hero ── */}
      <section style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 760 }}>
        <span style={sectionLabel}>Usuarios sintéticos · by Flat 101</span>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(38px, 6vw, 68px)",
            lineHeight: 1.04,
            letterSpacing: "-0.015em",
            color: "var(--text-strong)",
            margin: 0,
          }}
        >
          Valida la decisión antes de gastar en ella.
        </h1>
        <p style={{ fontSize: "clamp(16px, 1.6vw, 20px)", lineHeight: 1.6, color: "rgba(var(--fg),0.7)", maxWidth: 620 }}>
          {BRAND} pone a prueba tu web, tus campañas, tu precio y tu mensaje frente a una
          cohorte de usuarios sintéticos calibrados con tu cliente real. Resultados en
          minutos, por una fracción de lo que cuesta un estudio con usuarios reales.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
          <a href="#paquetes" className="btn-pill solid">Ver paquetes</a>
          <a href="#calculadora" className="btn-pill">Calcular tarifa</a>
        </div>
      </section>

      {/* ── El valor ── */}
      <section style={{ display: "flex", flexDirection: "column", gap: 28 }}>
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
          <ValueCard
            stat="4.000-10.000 €"
            label="Un único test moderado"
            body="Con usuarios reales: incentivos, reclutamiento y horas de analista por cada estudio."
          />
          <ValueCard
            stat="2-4 semanas"
            label="Sólo en reclutar"
            body="El diseño avanza sin evidencia mientras esperas a tener participantes."
          />
          <ValueCard
            stat="Minutos"
            label="Con usuarios sintéticos"
            body="Lanza el test, recibe el vector de intención y las barreras al instante. Itera el mismo día."
          />
          <ValueCard
            stat="80 / 20"
            label="El encaje honesto"
            body="Sintético para el 80% inicial (iterar, descartar, priorizar). El research humano caro, sólo para el 20% crítico."
          />
        </div>
      </section>

      {/* ── Qué puedes testear ── */}
      <section style={{ display: "flex", flexDirection: "column", gap: 28 }}>
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
      <section id="paquetes" style={{ display: "flex", flexDirection: "column", gap: 28, scrollMarginTop: 32 }}>
        <SectionHead
          label="Paquetes"
          title="Instancia dedicada, tu marca, presupuesto de IA incluido."
        />
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
                border: t.featured
                  ? "1px solid var(--accent-500)"
                  : "1px solid rgba(var(--fg),0.1)",
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
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 38,
                    color: "var(--text-strong)",
                    lineHeight: 1,
                  }}
                >
                  {eur(t.priceMonth)}
                </span>
                <span style={{ fontSize: 13, color: "rgba(var(--fg),0.5)" }}>/mes</span>
              </div>
              <span style={{ fontSize: 12, color: "rgba(var(--fg),0.45)" }}>
                + {eur(t.setup)} de setup de calibración
              </span>
              <p style={{ fontSize: 13, color: "rgba(var(--fg),0.7)", lineHeight: 1.5, margin: 0 }}>
                {t.blurb}
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {t.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      fontSize: 13,
                      color: "rgba(var(--fg),0.7)",
                      lineHeight: 1.45,
                      display: "flex",
                      gap: 8,
                    }}
                  >
                    <span style={{ color: "var(--accent-text)" }}>·</span>
                    {f}
                  </li>
                ))}
              </ul>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(var(--fg),0.4)",
                  marginTop: "auto",
                  paddingTop: 8,
                }}
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

      {/* ── Módulo de coste de IA ── */}
      <section style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <SectionHead
          label="Motor de IA"
          title="Elige proveedor. El coste por run cambia, el resultado no."
        />
        <p style={{ fontSize: 14, color: "rgba(var(--fg),0.6)", lineHeight: 1.6, maxWidth: 680 }}>
          La plataforma corre sobre el Vercel AI Gateway: puede usar Anthropic (motor
          actual), OpenAI, Google Gemini o Perplexity sin cambiar el producto. Un{" "}
          <em style={{ fontStyle: "normal", color: "rgba(var(--fg),0.85)" }}>run estándar</em>{" "}
          (un experimento sobre una cohorte pequeña, ~20.000 tokens de entrada y 2.500 de
          salida) cuesta esto, y esto es lo que rinde un presupuesto de {BUDGET_REF_USD} $/mes:
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {AI_PROVIDERS.map((p) => (
            <div key={p.provider} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <span
                  className="mono"
                  style={{
                    fontSize: 12,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "var(--text-strong)",
                  }}
                >
                  {p.provider}
                </span>
                <span style={{ fontSize: 12, color: "rgba(var(--fg),0.45)" }}>{p.note}</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                  <thead>
                    <tr>
                      {["Modelo", "$/Mtok entrada", "$/Mtok salida", "Coste/run", `Runs con ${BUDGET_REF_USD} $/mes`].map(
                        (h, i) => (
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
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {p.models.map((m) => (
                      <tr key={m.id}>
                        <td style={{ ...cellStyle, textAlign: "left", color: "var(--text-strong)" }}>
                          {m.label}
                          {m.current && (
                            <span
                              className="mono"
                              style={{
                                fontSize: 9,
                                marginLeft: 8,
                                color: "var(--accent-text)",
                                letterSpacing: "0.1em",
                              }}
                            >
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
                  coste/run). Sus modelos Sonar traen búsqueda web en vivo: encajan en el
                  módulo GEO.
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Calculadora ── */}
      <section id="calculadora" style={{ display: "flex", flexDirection: "column", gap: 28, scrollMarginTop: 32 }}>
        <SectionHead
          label="Calculadora"
          title="Tarificador y rentabilidad."
        />
        <p style={{ fontSize: 14, color: "rgba(var(--fg),0.6)", lineHeight: 1.6, maxWidth: 680 }}>
          Ajusta paquete, número de clientes, motor de IA y uso. En modo cliente muestra sólo
          la tarifa y lo que incluye; en modo interno, la rentabilidad bruta y neta de la flota.
        </p>
        <PricingCalculator />
      </section>

      {/* ── Cierre ── */}
      <section
        className="surface-feature"
        style={{
          borderRadius: "var(--radius-lg)",
          padding: "clamp(32px, 5vw, 52px)",
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
            fontSize: "clamp(26px, 3.5vw, 40px)",
            color: "var(--accent-500)",
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          Una sola decisión equivocada cuesta más que un año de plataforma.
        </h2>
        <p style={{ fontSize: 15, color: "rgba(var(--fg),0.7)", lineHeight: 1.6, maxWidth: 600 }}>
          Empieza con un piloto sobre una decisión real. Si te ahorra un solo estudio o
          sube tu conversión un punto, el retorno es inmediato.
        </p>
        <a href="#paquetes" className="btn-pill solid">Elegir paquete</a>
      </section>

      <footer style={{ display: "flex", alignItems: "center", gap: 12, color: "rgba(var(--fg),0.4)" }}>
        <FlatLogo size={48} />
        <span style={{ fontSize: 12 }}>
          {BRAND} · una solución de Flat 101. Cifras orientativas (2026), basadas en medias
          de uso reales.
        </span>
      </footer>
    </main>
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

const MODULES = [
  { title: "Claridad 5s", body: "Qué entiende el usuario de tu pantalla en 5 segundos: comprensión y fricción percibida." },
  { title: "Embudos", body: "El perfil recorre tu flujo con su carga cognitiva real y marca el abandono por paso." },
  { title: "Campañas", body: "El anuncio que el usuario querría ver, ajustado a su intención y a la query." },
  { title: "Pricing", body: "El umbral psicológico de precio antes de tocar la web: disposición a pagar por nivel." },
  { title: "Copy", body: "Bloque a bloque: claridad, persuasión y ganas de hacer clic." },
  { title: "GEO", body: "Cómo te ven Perplexity, ChatGPT Search y Google AI: visibilidad y posición de marca." },
  { title: "A/B", body: "Dos variantes en paralelo sobre la misma cohorte, con barreras emergentes." },
  { title: "Momentum", body: "La intención antes de que tu marca entre en la ecuación: intensidad, dirección y velocidad." },
];

function SectionHead({ label, title }: { label: string; title: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <span style={sectionLabel}>{label}</span>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: "clamp(24px, 3vw, 34px)",
          lineHeight: 1.12,
          color: "var(--text-strong)",
          margin: 0,
          maxWidth: 720,
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
        padding: "22px 22px 20px",
        background: "rgba(var(--fg),0.02)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: 26,
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
