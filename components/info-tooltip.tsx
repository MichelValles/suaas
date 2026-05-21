/**
 * InfoTooltip
 *
 * Tooltip CSS-only sobre tokens del DS. No usa state ni efectos, así que
 * puede vivir en Server Components.
 *
 * Las clases (`tooltip-host`, `tooltip-trigger`, `tooltip-panel`) están
 * definidas en `app/globals.css`. Se muestra con `:hover` y
 * `:focus-within` (incluye accesibilidad por teclado).
 */
export function InfoTooltip({
  text,
  label,
}: {
  text: string;
  /** Accessible label for the trigger button. Default "Información". */
  label?: string;
}) {
  return (
    <span className="tooltip-host">
      <button
        type="button"
        className="tooltip-trigger mono"
        aria-label={label ?? "Información"}
      >
        i
      </button>
      <span role="tooltip" className="tooltip-panel">
        {text}
      </span>
    </span>
  );
}
