import { AppShell, PageHeading } from "@/components/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase";
import { listTrash, TRASH_TYPE_LABEL, type TrashType } from "@/lib/trash";
import { TrashRow } from "./trash-row";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading
          eyebrow="Sistema · papelera"
          title="Supabase aún no está conectado."
          description="Provisiona Supabase desde el Marketplace de Vercel y aplica las migraciones (incluida 0007_trash.sql)."
        />
      </AppShell>
    );
  }

  let items: Awaited<ReturnType<typeof listTrash>> = [];
  let err: string | null = null;
  try {
    items = await listTrash();
  } catch (e) {
    err = (e as Error).message;
  }

  const grouped = groupByType(items);
  const totals = (Object.keys(grouped) as TrashType[]).reduce<
    Record<TrashType, number>
  >(
    (acc, t) => {
      acc[t] = grouped[t]?.length ?? 0;
      return acc;
    },
    { targets: 0, funnels: 0, ab: 0, copy: 0, pricing: 0, campaign: 0 },
  );

  return (
    <AppShell>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "clamp(32px, 4vw, 56px)",
        }}
      >
        <PageHeading
          eyebrow="Sistema · papelera"
          title="Papelera."
        />

        {err && (
          <div
            role="alert"
            style={{
              padding: 16,
              border: "1px solid var(--error-500)",
              borderRadius: "var(--radius-md)",
              background: "rgba(180,35,24,0.12)",
              color: "rgba(255,255,255,0.9)",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            Error consultando la papelera: {err}. ¿Aplicaste la migración
            `supabase/migrations/0007_trash.sql`?
          </div>
        )}

        <section
          aria-label="Resumen por tipo"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
          }}
        >
          {(Object.keys(TRASH_TYPE_LABEL) as TrashType[]).map((t) => (
            <SummaryChip key={t} label={TRASH_TYPE_LABEL[t]} count={totals[t]} />
          ))}
        </section>

        {!err && items.length === 0 ? (
          <div
            style={{
              padding: 24,
              border: "1px dashed rgba(255,255,255,0.12)",
              borderRadius: "var(--radius-md)",
              color: "rgba(255,255,255,0.55)",
              fontSize: 13,
            }}
          >
            La papelera está vacía. Cuando elimines un target, embudo, A/B test,
            copy deck u oferta de pricing, aparecerá aquí.
          </div>
        ) : null}

        {(Object.keys(grouped) as TrashType[]).map((t) => {
          const list = grouped[t];
          if (!list || list.length === 0) return null;
          return (
            <section
              key={t}
              aria-label={TRASH_TYPE_LABEL[t]}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
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
                {TRASH_TYPE_LABEL[t]} · {list.length}
              </h2>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                  gap: 12,
                }}
              >
                {list.map((item) => (
                  <TrashRow key={`${item.type}-${item.id}`} item={item} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}

function SummaryChip({ label, count }: { label: string; count: number }) {
  const active = count > 0;
  return (
    <div
      style={{
        border: `1px solid ${active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: "var(--radius-md)",
        padding: "14px 18px",
        background: "rgba(255,255,255,0.02)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        {label}
      </span>
      <span
        className="mono"
        style={{
          fontSize: 22,
          color: active ? "var(--accent-500)" : "rgba(255,255,255,0.35)",
          lineHeight: 1.1,
          fontWeight: 700,
        }}
      >
        {count}
      </span>
    </div>
  );
}

function groupByType(items: Awaited<ReturnType<typeof listTrash>>) {
  const out: Partial<Record<TrashType, typeof items>> = {};
  for (const item of items) {
    const arr = out[item.type] ?? [];
    arr.push(item);
    out[item.type] = arr;
  }
  return out;
}
