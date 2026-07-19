import { Hanken_Grotesk } from "next/font/google";

/**
 * PREVIEW DESECHABLE · direccion «oscuro editorial» (registro Stripe / Linear).
 * Reconstruccion completa de la pagina de perfil con todos los componentes del
 * original adaptados: retrato, backstory, Big Five (con tooltips y definicion),
 * COM-B (columnas, tooltips, definicion) y el chat Talker-Reasoner con la traza
 * del Reasoner (momentum, tono, esfuerzo, friccion simbolica, plan).
 * Full-width, sin eyebrows, acento #F9CB0D con cuentagotas. Ruta aislada.
 */

const grotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--pv-sans",
});

const ACCENT = "#F9CB0D";
const FG = "#f4f2ee";
const DIM = "rgba(244,242,238,0.62)";
const FAINT = "rgba(244,242,238,0.40)";
const LINE = "rgba(244,242,238,0.09)";
const PANEL = "rgba(244,242,238,0.022)";

const AVATAR =
  "https://1ylehremdawe3v6d.public.blob.vercel-storage.com/avatars/590840d0-db38-4a58-b462-277eb7734635-GFTm6Lh18LSmHoFHhph3Vg5E9xCBRx.png";

const BIG_FIVE_INTRO =
  "Cinco rasgos continuos de 0 a 1. Cada perfil mezcla un nivel propio en cada eje, y esos niveles condicionan cómo razona y reacciona a lo que le pongas delante.";
const COMB_INTRO =
  "Descompone qué frena o permite una conducta en tres ejes (Michie et al., 2011). Vacío en un eje significa sin barreras en esa categoría.";

const BIG_FIVE = [
  ["Apertura", 0.68, "Curiosidad por lo nuevo, ideas abstractas, arte. Alto: explora y prueba antes que nadie. Bajo: prefiere lo conocido."],
  ["Conciencia", 0.8, "Organización, disciplina, planificación. Alto: metódico, cumple plazos. Bajo: improvisa y deja cosas para después."],
  ["Extraversión", 0.45, "Energía social y búsqueda de estímulo. Alto: hablador y dinámico. Bajo: prefiere reflexionar a solas."],
  ["Amabilidad", 0.62, "Cooperación, empatía, confianza. Alto: conciliador y servicial. Bajo: competitivo y escéptico."],
  ["Neuroticismo", 0.58, "Inestabilidad emocional. Alto: ansioso y reactivo al estrés. Bajo: tranquilo y resiliente."],
] as const;

const COMB = [
  ["Capacidad", "Lo que tiene o le falta para actuar: conocimiento, habilidades, salud física y mental.", [
    "No distingue la tasa de éxito acumulada de la tasa por transferencia",
    "No sabe cuántos ciclos necesitará",
    "Desconoce qué incluye el precio base de una FIV",
  ]],
  ["Oportunidad", "Lo que su entorno le permite o le impone: recursos, dispositivos, normas, presión del momento.", [
    "Las grandes clínicas no publican precios y piden el teléfono para el dossier",
    "Agenda laboral apretada para encajar las citas",
    "Está comparando tres clínicas a la vez",
  ]],
  ["Motivación", "Lo que mueve o frena por dentro: hábitos, emociones, objetivos, creencias.", [
    "Miedo a empezar demasiado tarde",
    "Recelo a la sensación de «fábrica» de una marca grande",
    "Necesita sentir que el equipo médico la conoce",
  ]],
] as const;

function Tip({ text }: { text: string }) {
  return (
    <span className="pv-tip" tabIndex={0} aria-label={text}>
      <span className="pv-tip-dot">i</span>
      <span className="pv-tip-panel">{text}</span>
    </span>
  );
}

function Bar({ v, accent = false }: { v: number; accent?: boolean }) {
  return (
    <div style={{ position: "relative", height: 3, borderRadius: 999, background: "rgba(244,242,238,0.10)", flex: 1 }}>
      <div style={{ position: "absolute", inset: 0, width: `${v * 100}%`, borderRadius: 999, background: accent ? ACCENT : "rgba(244,242,238,0.80)" }} />
    </div>
  );
}

const CSS = `
.pv-root, .pv-root * { font-family: var(--pv-sans) !important; }
.pv-tip { position: relative; display: inline-flex; outline: none; }
.pv-tip-dot {
  display: inline-flex; align-items: center; justify-content: center;
  width: 15px; height: 15px; border-radius: 999px; font-size: 9px; font-style: italic;
  color: ${FAINT}; border: 1px solid ${LINE}; cursor: help; user-select: none;
}
.pv-tip-panel {
  position: absolute; bottom: calc(100% + 9px); left: 50%; transform: translateX(-50%) translateY(4px);
  width: max-content; max-width: 260px; padding: 10px 13px; border-radius: 9px;
  background: #1a1815; border: 1px solid ${LINE}; color: ${FG};
  font-size: 12.5px; line-height: 1.5; box-shadow: 0 12px 40px rgba(0,0,0,0.5);
  opacity: 0; pointer-events: none; transition: opacity .16s ease, transform .16s ease; z-index: 20;
}
.pv-tip:hover .pv-tip-panel, .pv-tip:focus .pv-tip-panel { opacity: 1; transform: translateX(-50%) translateY(0); }
.pv-details > summary { list-style: none; cursor: pointer; }
.pv-details > summary::-webkit-details-marker { display: none; }
.pv-send:hover { border-color: ${ACCENT} !important; }
`;

export default function DisenoPreview() {
  return (
    <div
      className={`${grotesk.variable} pv-root`}
      style={{
        minHeight: "100vh",
        color: FG,
        fontFamily: "var(--pv-sans)",
        background: `
          radial-gradient(90% 55% at 22% -8%, rgba(249,203,13,0.08), transparent 55%),
          radial-gradient(70% 50% at 92% 8%, rgba(244,242,238,0.035), transparent 55%),
          linear-gradient(180deg, #110f0d 0%, #0c0b0a 45%)`,
        padding: "clamp(40px, 6vw, 96px) clamp(24px, 6vw, 112px) 160px",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* MASTHEAD full-width, asimetrico */}
      <header style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 440px), 1fr))", gap: "clamp(32px, 5vw, 80px)", alignItems: "center", borderBottom: `1px solid ${LINE}`, paddingBottom: 56 }}>
        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={AVATAR} alt="Retrato generado por IA de Lucía Sáez" width={112} height={112} style={{ width: 112, height: 112, borderRadius: "50%", objectFit: "cover", flexShrink: 0, filter: "grayscale(0.15) contrast(1.02)" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h1 style={{ margin: 0, fontWeight: 700, fontSize: "clamp(40px, 5vw, 68px)", lineHeight: 0.98, letterSpacing: "-0.035em" }}>Lucía Sáez</h1>
            <div style={{ fontSize: 16, color: DIM }}>Arquitecta técnica · 34 años · Madrid · ingresos media-alta</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6, fontSize: 13, color: FAINT }}>
              <span style={{ borderBottom: `1px solid ${LINE}`, paddingBottom: 2 }}>Regenerar retrato · 0,04 $</span>
              <span>Retrato IA, no corresponde a nadie real</span>
            </div>
          </div>
        </div>
        <blockquote style={{ margin: 0, fontFamily: "var(--pv-sans)", fontStyle: "italic", fontWeight: 300, fontSize: "clamp(22px, 2.4vw, 31px)", lineHeight: 1.4, letterSpacing: "-0.015em", color: FG }}>
          «Quiero entender qué nos pasa y cuánto costará de verdad, para decidir con cabeza en qué clínica ponemos nuestro dinero y nuestra esperanza.»
          <footer style={{ marginTop: 16, fontFamily: "var(--pv-sans)", fontStyle: "normal", fontSize: 13, color: FAINT }}>Job to be done, en sus palabras</footer>
        </blockquote>
      </header>

      {/* Backstory (una sola columna) */}
      <section style={{ marginTop: 56 }}>
        <p style={{ margin: 0, fontSize: "clamp(17px, 1.5vw, 20px)", lineHeight: 1.62, color: "rgba(244,242,238,0.88)" }}>
          Lleva quince meses buscando embarazo con su pareja sin resultado y acaba de recibir una cita de la sanidad pública para dentro de ocho meses. Es metódica: ha leído foros, comparado tres clínicas y anotado preguntas, pero le frustra que ninguna web le dé un precio cerrado. Confía en la ciencia de las grandes redes de clínicas pero teme ser un número más.
        </p>
      </section>

      {/* Big Five + COM-B en columnas */}
      <div style={{ marginTop: 72, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))", gap: "clamp(40px, 5vw, 88px)" }}>
        {/* Big Five */}
        <section>
          <SectionHead title="Personalidad" intro={BIG_FIVE_INTRO} />
          <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 20 }}>
            {BIG_FIVE.map(([label, v, tip]) => (
              <div key={label} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 18, alignItems: "center" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 130 }}>
                  <span style={{ fontSize: 15.5 }}>{label}</span>
                  <Tip text={tip} />
                </span>
                <Bar v={v} />
                <span style={{ fontSize: 14, color: DIM, fontVariantNumeric: "tabular-nums", minWidth: 38, textAlign: "right" }}>{v.toFixed(2).replace(".", ",")}</span>
              </div>
            ))}
          </div>
        </section>

        {/* COM-B */}
        <section>
          <SectionHead title="Barreras" intro={COMB_INTRO} />
          <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 28 }}>
            {COMB.map(([cat, tip, items]) => (
              <div key={cat}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 15.5, fontWeight: 500 }}>{cat}</span>
                  <Tip text={tip} />
                </span>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                  {items.map((it) => (
                    <li key={it} style={{ fontSize: 15, lineHeight: 1.55, color: "rgba(244,242,238,0.82)", paddingLeft: 18, position: "relative" }}>
                      <span style={{ position: "absolute", left: 0, top: 10, width: 5, height: 1, background: FAINT }} />
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Chat Talker-Reasoner · panel con superficie propia */}
      <section style={{ marginTop: 96 }}>
        <SectionHead title="Conversación" intro="El Reasoner (Opus) planifica el estado, las barreras y la fricción del turno; el Talker (Sonnet) responde en voz del perfil." />

        <div
          style={{
            marginTop: 30,
            background: "linear-gradient(180deg, rgba(255,247,232,0.05), rgba(255,247,232,0.018))",
            border: `1px solid rgba(249,203,13,0.14)`,
            borderRadius: 22,
            padding: "clamp(28px, 3.5vw, 48px)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
              gap: "clamp(32px, 4vw, 64px)",
              alignItems: "start",
            }}
          >
            {/* Dialogo estilo WhatsApp */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Separador de fecha */}
              <div style={{ alignSelf: "center", background: "rgba(244,242,238,0.06)", padding: "4px 13px", borderRadius: 999, fontSize: 11.5, color: FAINT, letterSpacing: "0.02em" }}>
                19 de julio de 2026
              </div>

              {/* Saliente: la marca / entrevistador */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ maxWidth: "min(86%, 46ch)" }}>
                  <div style={{ fontSize: 12, color: DIM, textAlign: "right", marginBottom: 4, marginRight: 4 }}>IVI · clínica</div>
                  <div style={{ position: "relative", background: "#2b2411", border: "1px solid rgba(249,203,13,0.26)", borderRadius: "13px 5px 13px 13px", padding: "9px 13px 7px", fontSize: 15, lineHeight: 1.5, color: FG }}>
                    Soy de la clínica. Para darte el precio y las tasas de éxito necesitamos que nos dejes tu teléfono y te descargas el dossier en PDF. ¿Me lo facilitas?
                    <div style={{ display: "flex", gap: 5, alignItems: "center", justifyContent: "flex-end", marginTop: 3, fontSize: 11, color: FAINT }}>
                      <span>12:04</span>
                      <span style={{ color: "#6fb2d8", fontSize: 12 }}>✓✓</span>
                    </div>
                    <span aria-hidden style={{ position: "absolute", top: 0, right: -6, width: 8, height: 12, background: "#2b2411", clipPath: "polygon(0 0, 100% 0, 0 100%)" }} />
                  </div>
                </div>
              </div>

              {/* Entrante: el perfil */}
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ maxWidth: "min(92%, 52ch)" }}>
                  <div style={{ fontSize: 12, color: ACCENT, marginBottom: 4, marginLeft: 4 }}>Lucía Sáez</div>
                  <div style={{ position: "relative", background: "#1a1714", border: `1px solid ${LINE}`, borderRadius: "5px 13px 13px 13px", padding: "11px 15px 7px", fontSize: 15.5, lineHeight: 1.55, color: "rgba(244,242,238,0.9)" }}>
                    El teléfono no os lo doy, lo siento. Llevo más de un año con este circuito exacto en tres clínicas distintas: relleno un formulario, me llaman dos veces al día y el PDF nunca tiene los números que me interesan de verdad. Lo que necesito es sencillo: el precio del ciclo completo y la tasa de éxito por transferencia, no la acumulada, visible antes de dar ningún dato de contacto. Si eso está en algún sitio de vuestra web, perfecto; si no, seguimos igual que con las otras.
                    <div style={{ textAlign: "right", marginTop: 3, fontSize: 11, color: FAINT }}>12:05</div>
                    <span aria-hidden style={{ position: "absolute", top: 0, left: -6, width: 8, height: 12, background: "#1a1714", clipPath: "polygon(100% 0, 0 0, 100% 100%)" }} />
                  </div>
                </div>
              </div>

              {/* Input */}
              <div className="pv-send" style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, border: `1px solid ${LINE}`, borderRadius: 999, padding: "12px 18px", color: FAINT, fontSize: 15, transition: "border-color .16s" }}>
                <span>Escribe un mensaje al perfil…</span>
                <span style={{ fontSize: 13, color: FAINT, whiteSpace: "nowrap" }}>~0,03 $/turno</span>
              </div>
            </div>

            {/* Traza del Reasoner (columna lateral) */}
            <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: DIM, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 500, color: FG }}>Razonamiento</span>
                <span>tono escéptico</span>
                <span>esfuerzo 70%</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: DIM }}>
                <span>momentum</span>
                <span style={{ width: 60, height: 3, borderRadius: 999, background: "rgba(244,242,238,0.14)", display: "inline-block", position: "relative" }}>
                  <span style={{ position: "absolute", inset: 0, width: "25%", background: "rgba(244,242,238,0.7)", borderRadius: 999 }} />
                </span>
                <span style={{ color: FG }}>se aleja ↘</span>
              </div>
              <dl style={{ margin: "6px 0 0", display: "flex", flexDirection: "column", gap: 14, fontSize: 14.5, borderTop: `1px solid ${LINE}`, paddingTop: 18 }}>
                <div>
                  <dt style={{ color: DIM, marginBottom: 3 }}>Estado</dt>
                  <dd style={{ margin: 0, color: "rgba(244,242,238,0.86)" }}>Alerta y algo irritada; esta petición me suena a filtro comercial más que a información real.</dd>
                </div>
                <div>
                  <dt style={{ color: DIM, marginBottom: 3 }}>Barreras</dt>
                  <dd style={{ margin: 0, color: "rgba(244,242,238,0.86)" }}>opportunity: piden el teléfono sin dar precio · motivation: recelo al trato de «lead»</dd>
                </div>
                <div>
                  <dt style={{ color: ACCENT, fontWeight: 500, marginBottom: 3 }}>Fricción simbólica</dt>
                  <dd style={{ margin: 0, color: "rgba(244,242,238,0.86)" }}>
                    <span style={{ color: ACCENT, fontVariantNumeric: "tabular-nums" }}>0,75</span> · asimetría extractiva. <span style={{ color: DIM }}>Capital cultural alto: lo lee como falta de respeto a su criterio y a los meses que lleva comparando.</span>
                  </dd>
                </div>
                <div>
                  <dt style={{ color: DIM, marginBottom: 3 }}>Plan</dt>
                  <dd style={{ margin: 0, color: "rgba(244,242,238,0.86)" }}>No da el teléfono; exige precio base y tasa por transferencia antes. Firme, deja ver que compara con otras dos.</dd>
                </div>
              </dl>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHead({ title, intro }: { title: string; intro: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <h2 style={{ margin: 0, fontSize: "clamp(22px, 2vw, 28px)", fontWeight: 600, letterSpacing: "-0.02em" }}>{title}</h2>
      <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: DIM }}>{intro}</p>
    </div>
  );
}
