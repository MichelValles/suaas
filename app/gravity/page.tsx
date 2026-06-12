import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { ConceptosPendientes } from "./conceptos-pendientes";

const PLANES: Array<{
  label: string;
  index: string;
  function: string;
  modules: Array<{ href: string; label: string; role: string; detail: string }>;
  pendingDetail?: string;
}> = [
  {
    label: "Construction",
    index: "01",
    function:
      "Crea el contexto gravitacional: define por qué la marca empieza a existir en la órbita del usuario. Aquí se genera la primera atracción mediante hipersegmentación por intención.",
    modules: [
      {
        href: "/profiles",
        label: "Perfiles",
        role: "Perfil comportamental",
        detail:
          "Demografía, Big Five, COM-B y backstory. El campo intent_context almacena el JTBD del perfil: «Cuando [situación], quiero [motivación] para poder [resultado]». El Reasoner del chat emite el vector momentum (intensidad, dirección, velocidad) en cada turno.",
      },
      {
        href: "/momentum",
        label: "Momentum",
        role: "Intent Momentum ante-touchpoint",
        detail:
          "Antes de que la marca entre en la ecuación: narrativa de intención, intensidad, dirección, velocidad, primeros pasos, canales y barreras por perfil.",
      },
      {
        href: "/targets",
        label: "Claridad 5s",
        role: "Framework de conductas",
        detail:
          "El agente clasifica su conducta frente a la acción principal del flujo: óptima (completa sin fricción percibida), fuga (el coste supera al beneficio esperado) o repesca (abandona con la intención todavía viva).",
      },
      {
        href: "/funnels",
        label: "Embudos",
        role: "Certeza predictiva",
        detail:
          "El perfil recorre el flujo con su carga cognitiva real y ubica la fricción por paso. Calcula effort, intent_match y dropoff por instancia antes del lanzamiento, sin descubrir fallos en producción.",
      },
    ],
  },
  {
    label: "Acceleration",
    index: "02",
    function:
      "Modula el momentum: refuerza, redirige o debilita la intención en función de todas las interacciones que recibe el usuario. Incluye performance guiado por intención y visibilidad en motores de respuesta IA.",
    modules: [
      {
        href: "/geo",
        label: "GEO Tester",
        role: "Generative Engine Optimization",
        detail:
          "La query de cada segmento JTBD lanzada contra Claude, ChatGPT y Perplexity reales, con búsqueda web y citas. Mide visibility_score, brand_position, recommendation_tone, key_claims y missing_attributes por motor.",
      },
      {
        href: "/campaigns",
        label: "Campañas",
        role: "Performance guiado por intención",
        detail:
          "El anuncio que el usuario querría ver, ajustado a la query y al perfil. RSA o RDA: la intención segmenta el mensaje, no la demografía.",
      },
    ],
  },
  {
    label: "Value",
    index: "03",
    function:
      "Estabiliza la órbita: convierte una decisión puntual en una relación duradera. El alta es el principio, no el final. Aquí ocurre la propiedad psicológica: el aha moment en que el usuario integra el producto en su identidad.",
    modules: [],
    pendingDetail:
      "Propiedad psicológica y aha moment por instancia, onboarding por capas de activación (descubrimiento, adopción, pertenencia), inducción de hábitos recurrentes y predicción de churn.",
  },
];

const INTENT_DIMENSIONS = [
  {
    label: "Intensidad",
    values: "0 → 1",
    description:
      "Cuánta motivación hay para actuar ahora. 0 = sin intención de avanzar. 1 = acción inminente.",
    color: "var(--accent-text)",
  },
  {
    label: "Dirección",
    values: "approaching · stable · drifting",
    description:
      "Hacia dónde se mueve la intención: se acerca a la solución, está consciente pero sin moverse, o se aleja y lo pospone.",
    color: "var(--accent-text)",
  },
  {
    label: "Velocidad",
    values: "accelerating · steady · decelerating",
    description:
      "Cómo cambia el momentum en el tiempo: la urgencia crece, se mantiene estable o se disipa.",
    color: "var(--accent-text)",
  },
];


export default function GravityPage() {
  return (
    <AppShell>
      <PageHeading
        eyebrow="Sistema · gravity model"
        title="Gravity Model."
        description="Marco estratégico de referencia de SUAAS. La intención del usuario es un vector con intensidad, dirección y velocidad. Los módulos de la plataforma operan en tres planos de influencia que determinan la órbita de un usuario alrededor de una marca."
        descriptionVariant="panel"
      />

      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SectionLabel>Intent Momentum</SectionLabel>
        <p style={{ fontSize: 14, color: "rgba(var(--fg),0.65)", lineHeight: 1.65, margin: 0 }}>
          La tesis central del modelo: lo que está en el centro no es el usuario, sino su intención en
          cada momento. La intención no es binaria: tiene tres dimensiones que forman el vector
          Intent Momentum.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 16,
          }}
        >
          {INTENT_DIMENSIONS.map((d) => (
            <div
              key={d.label}
              style={{
                border: "1px solid rgba(var(--fg),0.08)",
                borderRadius: "var(--radius-md)",
                padding: "20px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                background: "rgba(var(--fg),0.02)",
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "rgba(var(--fg),0.45)",
                }}
              >
                {d.label}
              </span>
              <span
                className="mono"
                style={{ fontSize: 12, color: d.color, lineHeight: 1.5 }}
              >
                {d.values}
              </span>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(var(--fg),0.6)",
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

      {PLANES.map((plane) => (
        <section
          key={plane.label}
          style={{ display: "flex", flexDirection: "column", gap: 20 }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: "var(--accent-text)",
                }}
              >
                {plane.index}
              </span>
              <SectionLabel>{plane.label} Plane</SectionLabel>
            </div>
            <p
              style={{
                fontSize: 14,
                color: "rgba(var(--fg),0.65)",
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              {plane.function}
            </p>
          </div>

          {plane.modules.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {plane.modules.map((mod) => (
                <div
                  key={mod.href}
                  style={{
                    borderLeft: "3px solid rgba(var(--fg), 0.14)",
                    paddingLeft: 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 14,
                      flexWrap: "wrap",
                    }}
                  >
                    <Link
                      href={mod.href}
                      style={{
                        fontFamily: "var(--font-display)",
                        fontStyle: "italic",
                        fontSize: 20,
                        color: "var(--text-strong)",
                        textDecoration: "none",
                        lineHeight: 1.1,
                      }}
                    >
                      {mod.label}
                    </Link>
                    <span
                      className="mono"
                      style={{
                        fontSize: 9,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "var(--accent-text)",
                      }}
                    >
                      {mod.role}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: "rgba(var(--fg),0.6)",
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {mod.detail}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                borderLeft: "3px solid rgba(var(--fg), 0.08)",
                paddingLeft: 20,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  color: "rgba(var(--fg),0.25)",
                  fontStyle: "italic",
                  letterSpacing: "0.1em",
                }}
              >
                Value Plane sin módulo propio aún.
              </span>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(var(--fg),0.38)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {plane.pendingDetail}
              </p>
            </div>
          )}
        </section>
      ))}

      <ConceptosPendientes />
    </AppShell>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
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
  );
}
