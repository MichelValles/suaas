/**
 * Mensaje estándar cuando una página intenta leer tablas que aún no existen
 * en Supabase. Sin layout propio: se renderiza dentro del AppShell de cada
 * página. Indica qué migración aplicar.
 */
export function MigrationNeeded({
  migration,
  feature,
  details,
}: {
  migration: string;
  feature: string;
  details?: string;
}) {
  return (
    <div
      role="alert"
      style={{
        padding: 24,
        border: "1px solid var(--warning-500)",
        borderRadius: "var(--radius-md)",
        background: "rgba(180,83,9,0.08)",
        color: "rgba(var(--fg),0.85)",
        lineHeight: 1.55,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <strong style={{ color: "var(--warning-500)" }}>
        Migración pendiente para usar {feature}.
      </strong>
      <p style={{ margin: 0, fontSize: 14 }}>
        Aplica{" "}
        <code
          className="mono"
          style={{
            padding: "2px 6px",
            background: "rgba(0,0,0,0.3)",
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          {migration}
        </code>{" "}
        en el SQL editor de Supabase (proyecto SUAAS · Marketplace de Vercel).
        Hasta entonces esta sección queda inactiva.
      </p>
      {details && (
        <p style={{ margin: 0, fontSize: 12, color: "rgba(var(--fg),0.55)" }}>
          {details}
        </p>
      )}
    </div>
  );
}
