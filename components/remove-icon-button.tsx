"use client";

import { Trash2 } from "lucide-react";

/**
 * Icono plano de papelera para quitar elementos del estado local de un
 * formulario (filas repetibles, creatividades, pasos, segmentos, niveles).
 * No toca la papelera del sistema (eso es SendToTrashButton): solo borra
 * del estado del form. Mismo lenguaje visual que la variante «inline» de
 * SendToTrashButton. Renderízalo solo cuando la fila se pueda eliminar
 * (nada de iconos deshabilitados: si no se puede borrar, no hay icono).
 */
export function RemoveIconButton({
  onClick,
  label = "Eliminar",
  style,
}: {
  onClick: () => void;
  label?: string;
  style?: React.CSSProperties;
}) {
  const restColor = "rgba(var(--fg),0.35)";
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "none",
        border: "none",
        padding: 6,
        color: restColor,
        cursor: "pointer",
        transition: "color var(--dur-short) var(--ease-out)",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--error-text)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = restColor;
      }}
    >
      <Trash2 size={15} />
    </button>
  );
}
