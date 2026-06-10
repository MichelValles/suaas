import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";

const PLANES: Array<{
  label: string;
  color: string;
  function: string;
  modules: Array<{ href: string; label: string; role: string; detail: string }>;
  pendingDetail?: string;
}> = [
  {
    label: "Construction",
    color: "#60a5fa",
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
          "Simula cómo cada perfil abordaría un Trigger antes de que ninguna marca entre en su radar: narrativa de intención, intensidad, dirección, velocidad, primeros pasos, canales y barreras.",
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
    color: "#fb923c",
    function:
      "Modula el momentum: refuerza, redirige o debilita la intención en función de todas las interacciones que recibe el usuario. Incluye performance guiado por intención y visibilidad en motores de respuesta IA.",
    modules: [
      {
        href: "/geo",
        label: "GEO Tester",
        role: "Generative Engine Optimization",
        detail:
          "Simula cómo construyen la respuesta buscadores IA (Perplexity, Google AI Overview, ChatGPT Search) por segmento JTBD. Mide visibility_score, brand_position, recommendation_tone, key_claims y missing_attributes.",
      },
      {
        href: "/campaigns",
        label: "Campañas",
        role: "Performance guiado por intención",
        detail:
          "Genera la versión ideal de un anuncio RSA o RDA por perfil y query de búsqueda. La intención del usuario segmenta el mensaje: no la demografía.",
      },
    ],
  },
  {
    label: "Value",
    color: "#a78bfa",
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
    color: "var(--accent-500)",
  },
  {
    label: "Dirección",
    values: "approaching · stable · drifting",
    description:
      "Hacia dónde se mueve la intención: se acerca a la solución, está consciente pero sin moverse, o se aleja y lo pospone.",
    color: "#60a5fa",
  },
  {
    label: "Velocidad",
    values: "accelerating · steady · decelerating",
    description:
      "Cómo cambia el momentum en el tiempo: la urgencia crece, se mantiene estable o se disipa.",
    color: "#fb923c",
  },
];

const PENDING = [
  {
    label: "Instancias como entidad",
    note: "SUAAS tiene perfiles individuales, pero no el par «perfil comportamental → N instancias»: mismo comportamiento observable, orígenes y aha moments radicalmente distintos.",
  },
  {
    label: "Gravedad agregada",
    note: "No existe una métrica que sume el momentum de las interacciones de una cohorte como fuerza gravitacional de la marca, ni una vista que cruce el momentum entre módulos.",
  },
  {
    label: "Mapa de fricción priorizado por impacto",
    note: "Los embudos ya rankean fricciones por frecuencia entre perfiles (top_friction), pero falta la dimensión instancia y la regla de severidad: lo que falla en todas las instancias se toca primero.",
  },
  {
    label: "Aha moment por instancia",
    note: "El momento de propiedad psicológica no se modela ni detecta. Es específico por instancia, detectable y acelerable.",
  },
  {
    label: "Capas de activación (Value Plane)",
    note: "No hay simulación post-alta: adopción, pertenencia, inducción de hábitos recurrentes ni predicción de churn.",
  },
  {
    label: "Repesca accionable",
    note: "behavior_class='repesca' se cuenta pero no genera la ventana de recuperación: qué mensaje recuperaría a ese perfil en función de su instancia.",
  },
  {
    label: "Evolución temporal del momentum",
    note: "El vector se mide por interacción, pero no se traza su trayectoria a lo largo del tiempo ni entre touchpoints.",
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
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.65, margin: 0 }}>
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
                border: "1px solid rgba(255,255,255,0.08)",
                borderTop: `3px solid ${d.color}`,
                borderRadius: "var(--radius-md)",
                padding: "20px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.45)",
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
                  color: "rgba(255,255,255,0.6)",
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
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: plane.color,
                  flexShrink: 0,
                }}
              />
              <SectionLabel>{plane.label} Plane</SectionLabel>
            </div>
            <p
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.65)",
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
                    borderLeft: `3px solid ${plane.color}55`,
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
                        color: "#fff",
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
                        color: plane.color,
                        opacity: 0.8,
                      }}
                    >
                      {mod.role}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.6)",
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
                borderLeft: `3px solid ${plane.color}33`,
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
                  color: "rgba(255,255,255,0.25)",
                  fontStyle: "italic",
                  letterSpacing: "0.1em",
                }}
              >
                Sin implementación directa todavía.
              </span>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.38)",
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

      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SectionLabel>Conceptos pendientes</SectionLabel>
        <p
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Huecos identificados entre el marco teórico y la implementación actual. Insumo directo
          para el roadmap.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PENDING.map((p) => (
            <div
              key={p.label}
              style={{
                padding: "14px 18px",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "var(--radius-sm)",
                background: "rgba(255,255,255,0.015)",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.5)",
                  letterSpacing: "0.1em",
                }}
              >
                {p.label}
              </span>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.38)",
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                {p.note}
              </p>
            </div>
          ))}
        </div>
      </section>
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
        color: "var(--accent-500)",
        margin: 0,
      }}
    >
      {children}
    </h2>
  );
}
