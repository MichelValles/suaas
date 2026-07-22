import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { getRunsModel } from "@/lib/chat-models";
import { listEvals, type EvalRow } from "@/lib/eval";
import { EvaluacionClient } from "./evaluacion-client";
import { EVAL_DIMENSIONS } from "./eval-views";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gravity · Evaluación de calidad" };

export default async function EvaluacionPage() {
  const [runsModel, evals] = await Promise.all([
    getRunsModel().catch(() => "anthropic/claude-sonnet-4.6"),
    listEvals(30),
  ]);

  return (
    <AppShell>
      <PageHeading
        eyebrow="SISTEMA"
        title="Evaluación de calidad"
        description="Puntúa la calidad de las salidas del modelo sobre un golden set de perfiles calibrados, con un juez de otra familia de modelo (rompe la circularidad de juzgar a Claude con Claude). Sirve para comparar modelos (Opus vs Sonnet vs Haiku) y cazar regresiones de prompt entre versiones."
        actions={
          <Link href="/tokens" className="btn-pill">
            Tokens y observabilidad
          </Link>
        }
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
        <EvaluacionClient defaultTarget={runsModel} />
        <EvalHistory evals={evals} />
      </div>
    </AppShell>
  );
}

function EvalHistory({ evals }: { evals: EvalRow[] }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
        Historial de evaluaciones
      </h2>
      {evals.length === 0 ? (
        <div
          style={{
            padding: "28px 24px",
            border: "1px dashed rgba(var(--fg),0.12)",
            borderRadius: "var(--radius-md)",
            color: "rgba(var(--fg),0.5)",
            fontSize: 14,
          }}
        >
          Aún no hay evaluaciones guardadas. Ejecuta una arriba para empezar a
          comparar modelos y versiones.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
              minWidth: 760,
            }}
          >
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Versión</Th>
                <Th>Modelo</Th>
                <Th>Juez</Th>
                <Th right>Global</Th>
                {EVAL_DIMENSIONS.map((d) => (
                  <Th key={d.key} right>
                    {d.label}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {evals.map((e) => (
                <tr key={e.id}>
                  <Td mono>
                    <Link
                      href={`/evaluacion/${e.id}`}
                      style={{ color: "var(--accent-text)", textDecoration: "underline" }}
                    >
                      {fmtDate(e.created_at)}
                    </Link>
                  </Td>
                  <Td mono color="rgba(var(--fg),0.5)">
                    {e.app_version ?? "·"}
                  </Td>
                  <Td mono>{modelShort(e.model)}</Td>
                  <Td mono color="rgba(var(--fg),0.5)">
                    {modelShort(e.judge)}
                  </Td>
                  <Td right mono color="var(--accent-500)">
                    {score100(e.overall)}
                  </Td>
                  {EVAL_DIMENSIONS.map((d) => (
                    <Td key={d.key} right mono color="var(--text-strong)">
                      {score100(e[d.key])}
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className="mono"
      style={{
        textAlign: right ? "right" : "left",
        padding: "8px 12px",
        fontSize: 9,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "rgba(var(--fg),0.45)",
        borderBottom: "1px solid rgba(var(--fg),0.1)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  right,
  mono,
  color,
}: {
  children: React.ReactNode;
  right?: boolean;
  mono?: boolean;
  color?: string;
}) {
  return (
    <td
      className={mono ? "mono" : undefined}
      style={{
        textAlign: right ? "right" : "left",
        padding: "8px 12px",
        color: color ?? "rgba(var(--fg),0.8)",
        borderBottom: "1px solid rgba(var(--fg),0.05)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function modelShort(model: string): string {
  return model.split("/").pop() ?? model;
}

function score100(v: number | null): string {
  return v == null ? "·" : String(Math.round(v * 100));
}
