"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import {
  HEXACO_ITEMS,
  LIKERT_LABELS,
  type HexacoAnswers,
} from "@/lib/hexaco";
import type {
  OnboardGender,
  OnboardIncome,
  OnboardPayload,
  SynthEvent,
} from "@/lib/onboard";

// ============================================================
// Estructura del wizard
// ============================================================

type StepId =
  | "welcome"
  | "name"
  | "age"
  | "gender"
  | "geo"
  | "income"
  | `hexaco:${string}`
  | "open_routine"
  | "open_friction"
  | "review"
  | "submitting";

type State = {
  name: string;
  age: string; // se valida a número al final
  gender: OnboardGender | "";
  geo: string;
  income: OnboardIncome | "";
  answers: HexacoAnswers;
  open_routine: string;
  open_friction: string;
  hp: string;
};

const INITIAL: State = {
  name: "",
  age: "",
  gender: "",
  geo: "",
  income: "",
  answers: {},
  open_routine: "",
  open_friction: "",
  hp: "",
};

const CCAA: string[] = [
  "Andalucía",
  "Aragón",
  "Asturias",
  "Baleares",
  "Canarias",
  "Cantabria",
  "Castilla-La Mancha",
  "Castilla y León",
  "Cataluña",
  "Comunidad Valenciana",
  "Extremadura",
  "Galicia",
  "La Rioja",
  "Madrid",
  "Murcia",
  "Navarra",
  "País Vasco",
  "Ceuta",
  "Melilla",
  "Otro país",
];

const GENDERS: { value: OnboardGender; label: string }[] = [
  { value: "f", label: "Mujer" },
  { value: "m", label: "Hombre" },
  { value: "nb", label: "No binario" },
  { value: "prefer_not", label: "Prefiero no decirlo" },
];

const INCOMES: { value: OnboardIncome; label: string }[] = [
  { value: "<20k", label: "Menos de 20.000 €" },
  { value: "20-35k", label: "20.000 a 35.000 €" },
  { value: "35-50k", label: "35.000 a 50.000 €" },
  { value: "50-80k", label: "50.000 a 80.000 €" },
  { value: ">80k", label: "Más de 80.000 €" },
  { value: "prefer_not", label: "Prefiero no decirlo" },
];

// Orden de pasos. 1 bienvenida + 5 demo + 24 HEXACO + 2 abiertas + 1 review.
const STEPS: StepId[] = [
  "welcome",
  "name",
  "age",
  "gender",
  "geo",
  "income",
  ...(HEXACO_ITEMS.map((it) => `hexaco:${it.id}` as const) as StepId[]),
  "open_routine",
  "open_friction",
  "review",
];

// Labels humanos para los huecos detectados en el review.
function stepLabel(step: StepId): string {
  if (step === "name") return "Nombre";
  if (step === "age") return "Edad";
  if (step === "gender") return "Género";
  if (step === "geo") return "Lugar donde vives";
  if (step === "income") return "Rango de ingresos";
  if (step === "open_routine") return "Ocupación y día típico";
  if (step === "open_friction") return "Frustraciones online";
  if (step.startsWith("hexaco:")) {
    const id = step.slice("hexaco:".length);
    const item = HEXACO_ITEMS.find((it) => it.id === id);
    if (!item) return "Pregunta de personalidad";
    return item.statement;
  }
  return step;
}

// Número de pregunta visible (1..31). welcome y review no cuentan.
function stepQuestionNumber(step: StepId): number | null {
  const idx = STEPS.indexOf(step);
  if (idx <= 0) return null;
  if (step === "review") return null;
  return idx; // welcome es 0, así name=1, age=2, ...
}

// ============================================================
// Componente
// ============================================================

export function OnboardClient() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [state, setState] = useState<State>(INITIAL);
  const [otherCountry, setOtherCountry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<string>("scoring");
  const phraseTimer = useRef<number | null>(null);

  const totalQuestions = STEPS.length - 2; // sin bienvenida ni review
  const currentStep = STEPS[index];
  const progressIndex = Math.max(0, Math.min(index, totalQuestions));

  const canAdvance = useMemo(() => stepIsValid(currentStep, state, otherCountry), [
    currentStep,
    state,
    otherCountry,
  ]);

  const missing = useMemo(
    () => findMissing(state, otherCountry),
    [state, otherCountry],
  );

  function jumpTo(target: StepId) {
    const i = STEPS.indexOf(target);
    if (i >= 0) setIndex(i);
  }

  function goNext() {
    if (currentStep === "review") {
      // En review, si falta algo saltamos al primer paso incompleto en lugar
      // de mandar el formulario a medias.
      if (missing.length > 0) {
        jumpTo(missing[0].step);
        return;
      }
      submit();
      return;
    }
    if (!canAdvance) return;
    if (index < STEPS.length - 1) setIndex(index + 1);
  }

  function goBack() {
    if (index > 0) setIndex(index - 1);
  }

  function patch<K extends keyof State>(key: K, value: State[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function setAnswer(itemId: string, value: number) {
    setState((s) => ({ ...s, answers: { ...s.answers, [itemId]: value } }));
    // Avance automático tras 250ms (sensación táctil)
    window.setTimeout(() => {
      if (index < STEPS.length - 1) setIndex((i) => i + 1);
    }, 250);
  }

  async function submit() {
    setError(null);
    setSubmitting(true);

    // Frases narrativas que rotan mientras llega el LLM.
    const phrases: Record<string, string> = {
      scoring: "Calculando tus rasgos…",
      reasoning: "Inferiendo tus barreras…",
      composing: "Escribiendo tu vignette…",
      saving: "Guardando tu gemelo…",
    };
    setPhase("scoring");

    // Si nada llega en 4s, rotamos a "reasoning" para que la pantalla viva.
    phraseTimer.current = window.setInterval(() => {
      setPhase((p) => {
        if (p === "scoring") return "reasoning";
        if (p === "reasoning") return "composing";
        return p;
      });
    }, 4000) as unknown as number;

    const geo =
      state.geo === "Otro país" && otherCountry.trim().length > 0
        ? otherCountry.trim()
        : state.geo;

    const payload: OnboardPayload = {
      name: state.name.trim(),
      demo: {
        age: parseInt(state.age, 10),
        gender: state.gender as OnboardGender,
        geo,
        income: state.income as OnboardIncome,
      },
      answers: state.answers,
      open_routine: state.open_routine.trim(),
      open_friction: state.open_friction.trim(),
      hp: state.hp,
    };

    try {
      const res = await fetch("/api/onboard/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? `HTTP ${res.status}`);
      }
      if (!res.body) throw new Error("Respuesta sin cuerpo.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let profileId: string | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          try {
            const ev = JSON.parse(line) as SynthEvent;
            if ("phase" in ev && phrases[ev.phase]) setPhase(ev.phase);
            if ("error" in ev && ev.error) {
              throw new Error(ev.message);
            }
            if ("done" in ev && ev.done) {
              profileId = ev.profileId;
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
      if (!profileId) throw new Error("No se recibió el perfil generado.");
      if (phraseTimer.current) window.clearInterval(phraseTimer.current);
      router.push(`/onboard/result/${profileId}`);
    } catch (err) {
      if (phraseTimer.current) window.clearInterval(phraseTimer.current);
      setSubmitting(false);
      setError((err as Error).message);
    }
  }

  // ============================================================
  // Render
  // ============================================================

  if (submitting) {
    return <SubmittingScreen phase={phase} />;
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "clamp(20px, 5vw, 48px) clamp(20px, 5vw, 48px) 32px",
      }}
    >
      <ProgressHeader
        index={progressIndex}
        total={totalQuestions}
        showProgress={index > 0 && currentStep !== "review"}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: 24,
          paddingBottom: 24,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{ width: "100%", maxWidth: 560 }}
          >
            <StepBody
              step={currentStep}
              state={state}
              otherCountry={otherCountry}
              onPatch={patch}
              onAnswer={setAnswer}
              onOtherCountry={setOtherCountry}
              onJumpTo={jumpTo}
            />
            {/* Honeypot oculto */}
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={state.hp}
              onChange={(e) => patch("hp", e.target.value)}
              style={{
                position: "absolute",
                left: -9999,
                width: 1,
                height: 1,
                opacity: 0,
              }}
              aria-hidden
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            background: "rgba(220,90,90,0.12)",
            border: "1px solid rgba(220,90,90,0.3)",
            color: "#ffb3b3",
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      <Footer
        index={index}
        total={STEPS.length}
        currentStep={currentStep}
        canAdvance={canAdvance}
        missingCount={missing.length}
        onBack={goBack}
        onNext={goNext}
      />
    </div>
  );
}

// ============================================================
// Subcomponentes
// ============================================================

function ProgressHeader({
  index,
  total,
  showProgress,
}: {
  index: number;
  total: number;
  showProgress: boolean;
}) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "var(--accent-500)",
        }}
      >
        SUAAS · Crea tu gemelo
      </span>
      {showProgress && (
        <div style={{ flex: 1, maxWidth: 200, marginLeft: 24 }}>
          <div
            style={{
              height: 4,
              background: "rgba(255,255,255,0.08)",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <motion.div
              style={{
                height: "100%",
                background: "var(--accent-500)",
                borderRadius: 999,
              }}
              initial={false}
              animate={{ width: `${(index / total) * 100}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.5)",
              marginTop: 6,
              display: "block",
            }}
          >
            {index} / {total}
          </span>
        </div>
      )}
    </header>
  );
}

function Footer({
  index,
  total,
  currentStep,
  canAdvance,
  missingCount,
  onBack,
  onNext,
}: {
  index: number;
  total: number;
  currentStep: StepId;
  canAdvance: boolean;
  missingCount: number;
  onBack: () => void;
  onNext: () => void;
}) {
  const isWelcome = currentStep === "welcome";
  const isReview = currentStep === "review";
  const isHexaco = currentStep.startsWith("hexaco:");
  // En review siempre permitimos pulsar: si falta algo el handler salta al
  // primer hueco; si no, envía.
  const reviewIncomplete = isReview && missingCount > 0;
  const enabled = isReview ? true : canAdvance;
  const label = isWelcome
    ? "Empezar"
    : isReview
      ? reviewIncomplete
        ? `Tienes ${missingCount} pregunta${missingCount === 1 ? "" : "s"} sin responder`
        : "Crear mi gemelo"
      : `Siguiente (${index}/${total - 1})`;
  // En HEXACO no mostramos botón "Siguiente" (avance automático). Sí "Atrás".
  return (
    <footer
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <button
        type="button"
        onClick={onBack}
        disabled={index === 0}
        className="mono"
        style={{
          background: "transparent",
          color: index === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "var(--radius-pill)",
          padding: "10px 18px",
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          cursor: index === 0 ? "default" : "pointer",
          fontFamily: "inherit",
        }}
      >
        Atrás
      </button>
      {!isHexaco && (
        <button
          type="button"
          onClick={onNext}
          disabled={!enabled}
          className="btn-pill solid"
          style={{
            opacity: enabled ? 1 : 0.4,
            cursor: enabled ? "pointer" : "not-allowed",
            background: reviewIncomplete
              ? "rgba(255,255,255,0.08)"
              : undefined,
            color: reviewIncomplete ? "#fff" : undefined,
            borderColor: reviewIncomplete
              ? "rgba(255,255,255,0.2)"
              : undefined,
          }}
        >
          {label}
        </button>
      )}
    </footer>
  );
}

function MissingPanel({
  missing,
  onJumpTo,
}: {
  missing: MissingStep[];
  onJumpTo: (step: StepId) => void;
}) {
  return (
    <div
      role="alert"
      style={{
        background: "rgba(255, 220, 60, 0.06)",
        border: "1px solid rgba(255, 220, 60, 0.3)",
        borderLeft: "3px solid var(--accent-500)",
        borderRadius: "var(--radius-md)",
        padding: "18px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <strong style={{ color: "#fff", fontSize: 15 }}>
          Te {missing.length === 1 ? "falta 1 pregunta" : `faltan ${missing.length} preguntas`} por contestar
        </strong>
        <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
          Toca cada una para ir directo a esa pantalla.
        </span>
      </div>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          maxHeight: 220,
          overflowY: "auto",
        }}
      >
        {missing.map((m) => (
          <li key={m.step}>
            <button
              type="button"
              onClick={() => onJumpTo(m.step)}
              style={{
                width: "100%",
                textAlign: "left",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "var(--radius-md)",
                color: "rgba(255,255,255,0.9)",
                padding: "10px 14px",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--accent-500)",
                  minWidth: 56,
                }}
              >
                {m.questionNumber ? `Pregunta ${m.questionNumber}` : "Final"}
              </span>
              <span
                style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {m.label}
              </span>
              <span
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                ›
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SubmittingScreen({ phase }: { phase: string }) {
  const phrases: Record<string, string> = {
    scoring: "Calculando tus rasgos…",
    reasoning: "Inferiendo tus barreras…",
    composing: "Escribiendo tu vignette…",
    saving: "Guardando tu gemelo…",
  };
  return (
    <div
      style={{
        flex: 1,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: 32,
        textAlign: "center",
      }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.08)",
          borderTopColor: "var(--accent-500)",
        }}
      />
      <AnimatePresence mode="wait">
        <motion.p
          key={phase}
          className="display"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          style={{
            fontSize: "clamp(22px, 3vw, 32px)",
            color: "#fff",
            margin: 0,
            maxWidth: 480,
          }}
        >
          {phrases[phase] ?? "Trabajando…"}
        </motion.p>
      </AnimatePresence>
      <span
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.4)",
        }}
      >
        Esto suele tardar entre 15 y 30 segundos
      </span>
    </div>
  );
}

// ============================================================
// Render por paso
// ============================================================

function StepBody({
  step,
  state,
  otherCountry,
  onPatch,
  onAnswer,
  onOtherCountry,
  onJumpTo,
}: {
  step: StepId;
  state: State;
  otherCountry: string;
  onPatch: <K extends keyof State>(key: K, value: State[K]) => void;
  onAnswer: (itemId: string, value: number) => void;
  onOtherCountry: (v: string) => void;
  onJumpTo: (step: StepId) => void;
}) {
  if (step === "welcome") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <h1
          className="display"
          style={{
            color: "#fff",
            fontSize: "clamp(34px, 5vw, 60px)",
            lineHeight: 1.05,
            margin: 0,
          }}
        >
          Crea tu gemelo sintético.
        </h1>
        <p
          className="body-lg"
          style={{ color: "rgba(255,255,255,0.7)", margin: 0, maxWidth: 480 }}
        >
          Contesta unas preguntas durante 10 minutos. Convertiremos tus respuestas
          en un usuario sintético calibrado que reacciona como tú: con tus rasgos
          de personalidad, tu contexto y tus frustraciones. Lo usamos en tests de
          UX y CRO para anticipar cómo responderá un usuario real ante una idea.
        </p>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            color: "rgba(255,255,255,0.6)",
            fontSize: 14,
          }}
        >
          <li>· 30 preguntas, casi todas con un toque.</li>
          <li>· Sin email, sin registro, sin spam.</li>
          <li>· Al terminar verás tu gemelo y podrás descargarlo.</li>
        </ul>
      </div>
    );
  }

  if (step === "name") {
    return (
      <QuestionLayout
        eyebrow="Pregunta 1"
        title="¿Cómo te llamas?"
        hint="Puede ser un pseudónimo. Lo usaremos para mostrar tu gemelo."
      >
        <TextInput
          value={state.name}
          onChange={(v) => onPatch("name", v)}
          placeholder="Tu nombre o un alias"
          maxLength={60}
          autoFocus
        />
      </QuestionLayout>
    );
  }

  if (step === "age") {
    return (
      <QuestionLayout
        eyebrow="Pregunta 2"
        title="¿Qué edad tienes?"
        hint="Entre 18 y 99."
      >
        <TextInput
          value={state.age}
          onChange={(v) => onPatch("age", v.replace(/[^\d]/g, "").slice(0, 2))}
          placeholder="Ej. 32"
          inputMode="numeric"
          maxLength={2}
          autoFocus
        />
      </QuestionLayout>
    );
  }

  if (step === "gender") {
    return (
      <QuestionLayout
        eyebrow="Pregunta 3"
        title="¿Con qué género te identificas?"
      >
        <ChoiceGroup
          value={state.gender}
          options={GENDERS}
          onChange={(v) => onPatch("gender", v as OnboardGender)}
        />
      </QuestionLayout>
    );
  }

  if (step === "geo") {
    return (
      <QuestionLayout
        eyebrow="Pregunta 4"
        title="¿Dónde vives?"
        hint="Si no estás en España, elige «Otro país» y especifica."
      >
        <ChoiceGroup
          value={state.geo}
          options={CCAA.map((c) => ({ value: c, label: c }))}
          onChange={(v) => onPatch("geo", v)}
          compact
        />
        {state.geo === "Otro país" && (
          <TextInput
            value={otherCountry}
            onChange={onOtherCountry}
            placeholder="País o ciudad"
            maxLength={80}
          />
        )}
      </QuestionLayout>
    );
  }

  if (step === "income") {
    return (
      <QuestionLayout
        eyebrow="Pregunta 5"
        title="Ingresos anuales del hogar"
        hint="Aproximado, lo usamos para calibrar tu poder adquisitivo."
      >
        <ChoiceGroup
          value={state.income}
          options={INCOMES}
          onChange={(v) => onPatch("income", v as OnboardIncome)}
        />
      </QuestionLayout>
    );
  }

  if (step.startsWith("hexaco:")) {
    const id = step.slice("hexaco:".length);
    const item = HEXACO_ITEMS.find((it) => it.id === id);
    if (!item) return null;
    // numero en el bloque de 24 HEXACO (1..24)
    const hexacoIndex = HEXACO_ITEMS.findIndex((it) => it.id === id) + 1;
    return (
      <QuestionLayout
        eyebrow={`Personalidad ${hexacoIndex} / 24`}
        title={item.statement}
      >
        <LikertGroup
          value={state.answers[item.id]}
          onChange={(v) => onAnswer(item.id, v)}
        />
      </QuestionLayout>
    );
  }

  if (step === "open_routine") {
    return (
      <QuestionLayout
        eyebrow="Pregunta 30"
        title="¿A qué te dedicas y cómo es un día típico tuyo entre semana?"
        hint="Dos o tres frases. Tu trabajo y la rutina que más se repite. Usaremos tus palabras."
      >
        <Textarea
          value={state.open_routine}
          onChange={(v) => onPatch("open_routine", v.slice(0, 400))}
          placeholder="Trabajo de… normalmente me levanto a las…"
          autoFocus
        />
      </QuestionLayout>
    );
  }

  if (step === "open_friction") {
    return (
      <QuestionLayout
        eyebrow="Pregunta 31"
        title="¿Qué te frustra o te bloquea cuando navegas por una web o compras online?"
        hint="Dos o tres frases. Algo concreto que te haya pasado o que te pase a menudo."
      >
        <Textarea
          value={state.open_friction}
          onChange={(v) => onPatch("open_friction", v.slice(0, 400))}
          placeholder="Me frustra que… cuando intento…"
          autoFocus
        />
      </QuestionLayout>
    );
  }

  if (step === "review") {
    const missing = findMissing(state, otherCountry);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <h1
          className="display"
          style={{
            color: "#fff",
            fontSize: "clamp(28px, 4vw, 44px)",
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          {missing.length === 0
            ? `Listo, ${state.name.split(" ")[0] || "ya casi"}.`
            : `Casi listo, ${state.name.split(" ")[0] || "ya casi"}.`}
        </h1>
        {missing.length === 0 ? (
          <p
            className="body-lg"
            style={{ color: "rgba(255,255,255,0.7)", margin: 0 }}
          >
            Cuando le des al botón, calcularemos tus rasgos y compondremos tu
            gemelo sintético. Toma entre 15 y 30 segundos.
          </p>
        ) : (
          <MissingPanel missing={missing} onJumpTo={onJumpTo} />
        )}
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "var(--radius-md)",
            padding: "18px 22px",
            color: "rgba(255,255,255,0.75)",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: "#fff" }}>{state.name}</strong>
          {" · "}
          {state.age} años · {state.gender} ·{" "}
          {state.geo === "Otro país" ? otherCountry || "Otro país" : state.geo}
        </div>
      </div>
    );
  }

  return null;
}

// ============================================================
// Inputs reutilizables
// ============================================================

function QuestionLayout({
  eyebrow,
  title,
  hint,
  children,
}: {
  eyebrow: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <span
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "var(--accent-500)",
        }}
      >
        {eyebrow}
      </span>
      <h2
        className="display"
        style={{
          color: "#fff",
          fontSize: "clamp(22px, 3vw, 32px)",
          lineHeight: 1.2,
          margin: 0,
        }}
      >
        {title}
      </h2>
      {hint && (
        <p style={{ color: "rgba(255,255,255,0.55)", margin: 0, fontSize: 14 }}>
          {hint}
        </p>
      )}
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  inputMode,
  maxLength,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "text" | "numeric";
  maxLength?: number;
  autoFocus?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      maxLength={maxLength}
      autoFocus={autoFocus}
      style={{
        width: "100%",
        padding: "14px 18px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: "var(--radius-md)",
        color: "#fff",
        fontSize: 18,
        fontFamily: "inherit",
        outline: "none",
      }}
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div style={{ position: "relative" }}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={5}
        style={{
          width: "100%",
          padding: "14px 18px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: "var(--radius-md)",
          color: "#fff",
          fontSize: 16,
          lineHeight: 1.5,
          fontFamily: "inherit",
          outline: "none",
          resize: "vertical",
          minHeight: 120,
        }}
      />
      <span
        className="mono"
        style={{
          position: "absolute",
          right: 14,
          bottom: 8,
          fontSize: 10,
          letterSpacing: "0.2em",
          color: "rgba(255,255,255,0.4)",
        }}
      >
        {value.length} / 400
      </span>
    </div>
  );
}

function ChoiceGroup<V extends string>({
  value,
  options,
  onChange,
  compact = false,
}: {
  value: V | "";
  options: { value: V; label: string }[];
  onChange: (v: V) => void;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: compact ? "repeat(2, 1fr)" : "1fr",
        gap: 8,
      }}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            type="button"
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              textAlign: "left",
              padding: "14px 18px",
              background: selected
                ? "rgba(255, 220, 60, 0.12)"
                : "rgba(255,255,255,0.04)",
              border: selected
                ? "1px solid var(--accent-500)"
                : "1px solid rgba(255,255,255,0.12)",
              borderRadius: "var(--radius-md)",
              color: selected ? "#fff" : "rgba(255,255,255,0.8)",
              fontSize: 15,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 120ms ease, border-color 120ms ease",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function LikertGroup({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {LIKERT_LABELS.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            type="button"
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "12px 16px",
              background: selected
                ? "rgba(255, 220, 60, 0.12)"
                : "rgba(255,255,255,0.04)",
              border: selected
                ? "1px solid var(--accent-500)"
                : "1px solid rgba(255,255,255,0.12)",
              borderRadius: "var(--radius-md)",
              color: selected ? "#fff" : "rgba(255,255,255,0.8)",
              fontSize: 15,
              cursor: "pointer",
              fontFamily: "inherit",
              textAlign: "left",
              transition: "background 120ms ease, border-color 120ms ease",
            }}
          >
            <span
              className="mono"
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                border: selected
                  ? "1px solid var(--accent-500)"
                  : "1px solid rgba(255,255,255,0.2)",
                background: selected ? "var(--accent-500)" : "transparent",
                color: selected ? "var(--ink-900)" : "rgba(255,255,255,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {opt.value}
            </span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// Validación por paso
// ============================================================

export type MissingStep = {
  step: StepId;
  label: string;
  questionNumber: number | null;
};

function findMissing(state: State, otherCountry: string): MissingStep[] {
  const out: MissingStep[] = [];
  for (const step of STEPS) {
    if (step === "welcome" || step === "review") continue;
    if (!stepIsValid(step, state, otherCountry)) {
      out.push({
        step,
        label: stepLabel(step),
        questionNumber: stepQuestionNumber(step),
      });
    }
  }
  return out;
}

function stepIsValid(step: StepId, state: State, otherCountry: string): boolean {
  if (step === "welcome") return true;
  if (step === "name") return state.name.trim().length >= 2;
  if (step === "age") {
    const n = parseInt(state.age, 10);
    return Number.isInteger(n) && n >= 18 && n <= 99;
  }
  if (step === "gender") return state.gender !== "";
  if (step === "geo") {
    if (state.geo === "Otro país") return otherCountry.trim().length >= 2;
    return state.geo !== "";
  }
  if (step === "income") return state.income !== "";
  if (step.startsWith("hexaco:")) {
    const id = step.slice("hexaco:".length);
    const v = state.answers[id];
    return typeof v === "number" && v >= 1 && v <= 5;
  }
  if (step === "open_routine") return state.open_routine.trim().length >= 10;
  if (step === "open_friction") return state.open_friction.trim().length >= 10;
  if (step === "review") return true;
  return false;
}
