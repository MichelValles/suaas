"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { PenLine, Sparkles } from "lucide-react";
import {
  setOptimizedForAction,
  type OptimizedForState,
} from "./optimized-for-actions";

/**
 * Editor inline del cliente para el que se ha modelado el perfil, en la ficha.
 * Estrellas (accent) si tiene cliente, icono de formulario si es perfil base.
 */
export function OptimizedForEditor({
  profileId,
  current,
  suggestions,
}: {
  profileId: string;
  current: string | null;
  suggestions: string[];
}) {
  const action = setOptimizedForAction.bind(null, profileId);
  const [state, formAction] = useActionState(action, {
    ok: false,
  } as OptimizedForState);
  const optimized = Boolean(current && current.trim());
  const Icon = optimized ? Sparkles : PenLine;

  return (
    <section
      aria-label="Optimización para cliente"
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <span
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "var(--accent-text)",
        }}
      >
        Optimizado para cliente
      </span>
      <form
        action={formAction}
        style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
      >
        <Icon
          size={18}
          aria-hidden
          style={{
            color: optimized ? "var(--accent-500)" : "rgba(var(--fg),0.4)",
            flexShrink: 0,
          }}
        />
        <input
          name="optimized_for"
          list="client-suggestions-ficha"
          defaultValue={current ?? ""}
          placeholder="Sin cliente (perfil base del formulario)"
          autoComplete="off"
          style={{
            background: "rgba(var(--fg),0.03)",
            border: "1px solid rgba(var(--fg),0.12)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 12px",
            color: "var(--text-strong)",
            fontSize: 14,
            outline: "none",
            fontFamily: "var(--font-sans)",
            minWidth: 240,
          }}
        />
        {suggestions.length > 0 && (
          <datalist id="client-suggestions-ficha">
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        )}
        <SaveButton />
        {state.ok && (
          <span style={{ color: "var(--success-text)", fontSize: 12 }}>
            Guardado
          </span>
        )}
        {state.error && (
          <span style={{ color: "var(--error-text)", fontSize: 12 }}>
            {state.error}
          </span>
        )}
      </form>
    </section>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn-pill"
      disabled={pending}
      style={{ fontSize: 13 }}
    >
      {pending ? "Guardando…" : "Guardar"}
    </button>
  );
}
