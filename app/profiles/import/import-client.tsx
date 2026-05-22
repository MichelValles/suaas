"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, XCircle } from "lucide-react";
import { detectSeparator, parseCSV } from "@/lib/csv";
import {
  PROFILE_CSV_HEADERS,
  reorderCsvRows,
  validateCsvRow,
  type CsvValidationResult,
} from "@/lib/profile-csv";
import type { ProfileInput } from "@/lib/profiles";
import { importProfilesAction, type ImportResult } from "./actions";

type Stage = "idle" | "parsed" | "importing" | "done";

export function ImportClient() {
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [separator, setSeparator] = useState<"," | ";">(",");
  const [unknownColumns, setUnknownColumns] = useState<string[]>([]);
  const [validations, setValidations] = useState<CsvValidationResult[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const stats = useMemo(() => {
    const ok = validations.filter((v) => v.ok).length;
    const ko = validations.length - ok;
    return { ok, ko, total: validations.length };
  }, [validations]);

  async function handleFile(file: File) {
    setError(null);
    setImportResult(null);
    const text = await file.text();
    const sep = detectSeparator(text);
    setSeparator(sep);
    const parsed = parseCSV(text, { separator: sep });
    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      setError("El CSV está vacío o no tiene cabecera.");
      setStage("idle");
      return;
    }
    const reordered = reorderCsvRows(parsed.headers, parsed.rows);
    setUnknownColumns(reordered.unknownColumns);
    const validated = reordered.rows.map((row, idx) =>
      validateCsvRow(reordered.headers, row, idx + 2),
    );
    setValidations(validated);
    setFileName(file.name);
    setStage("parsed");
  }

  function clearFile() {
    setFileName(null);
    setValidations([]);
    setUnknownColumns([]);
    setImportResult(null);
    setStage("idle");
    setError(null);
  }

  function confirmImport() {
    const validRows = validations.filter(
      (v): v is Extract<CsvValidationResult, { ok: true }> => v.ok,
    );
    if (validRows.length === 0) {
      setError("No hay filas válidas que importar.");
      return;
    }
    setStage("importing");
    startTransition(async () => {
      try {
        const result = await importProfilesAction({
          rows: validRows.map((r) => ({
            row: r.row,
            input: r.input as ProfileInput,
          })),
        });
        setImportResult(result);
        setStage("done");
        if (result.ok) router.refresh();
      } catch (err) {
        setError((err as Error).message);
        setStage("parsed");
      }
    });
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Dropzone
        onFile={handleFile}
        fileName={fileName}
        onClear={clearFile}
        disabled={stage === "importing"}
      />

      {error && (
        <div
          role="alert"
          style={{
            padding: 16,
            border: "1px solid var(--error-500)",
            borderRadius: "var(--radius-md)",
            color: "rgba(255,255,255,0.9)",
            background: "rgba(180,35,24,0.12)",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {stage !== "idle" && validations.length > 0 && (
        <>
          <SummaryBar
            stats={stats}
            separator={separator}
            unknownColumns={unknownColumns}
            disabled={pending || stage === "importing"}
            onConfirm={confirmImport}
            doneResult={stage === "done" ? importResult : null}
          />
          <PreviewTable validations={validations} />
        </>
      )}

      <details style={{ marginTop: 12 }}>
        <summary
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.6)",
            cursor: "pointer",
          }}
        >
          Formato esperado de CSV
        </summary>
        <div style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            Cabecera obligatoria (en cualquier orden, mayúsculas/minúsculas
            indistintas). Las listas COM-B se separan con <code>;</code> dentro
            del campo. Coma o punto y coma como separador de columnas. UTF-8
            recomendado. Edad entero 18-99. Big Five entre 0 y 1. Backstory
            mínimo 20 caracteres.
          </p>
          <pre
            className="mono"
            style={{
              fontSize: 12,
              padding: 12,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "var(--radius-sm)",
              overflowX: "auto",
              color: "rgba(255,255,255,0.85)",
            }}
          >
            {PROFILE_CSV_HEADERS.join(",")}
          </pre>
        </div>
      </details>
    </section>
  );
}

function Dropzone({
  onFile,
  fileName,
  onClear,
  disabled,
}: {
  onFile: (file: File) => void;
  fileName: string | null;
  onClear: () => void;
  disabled?: boolean;
}) {
  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (file) onFile(file);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={onDrop}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 40,
        border: "2px dashed rgba(255,255,255,0.18)",
        borderRadius: "var(--radius-md)",
        cursor: disabled ? "not-allowed" : "pointer",
        background: "rgba(255,255,255,0.02)",
        color: "rgba(255,255,255,0.65)",
        textAlign: "center",
      }}
    >
      <FileText size={28} />
      {fileName ? (
        <>
          <span style={{ color: "#fff", fontSize: 14 }}>{fileName}</span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onClear();
            }}
            className="mono"
            style={{
              background: "transparent",
              color: "rgba(255,255,255,0.65)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "var(--radius-pill)",
              padding: "6px 14px",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Cambiar fichero
          </button>
        </>
      ) : (
        <>
          <span style={{ fontSize: 14 }}>
            Arrastra el CSV aquí o haz click para seleccionar.
          </span>
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            UTF-8, hasta 500 filas
          </span>
        </>
      )}
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={onChange}
        disabled={disabled}
        style={{ display: "none" }}
      />
    </label>
  );
}

function SummaryBar({
  stats,
  separator,
  unknownColumns,
  disabled,
  onConfirm,
  doneResult,
}: {
  stats: { ok: number; ko: number; total: number };
  separator: "," | ";";
  unknownColumns: string[];
  disabled: boolean;
  onConfirm: () => void;
  doneResult: ImportResult | null;
}) {
  return (
    <div
      style={{
        padding: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "var(--radius-md)",
        background: "rgba(255,255,255,0.02)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <Stat label="Filas detectadas" value={stats.total} />
          <Stat label="Válidas" value={stats.ok} color="var(--success-500)" />
          <Stat label="Con errores" value={stats.ko} color="var(--error-500)" />
          <Stat label="Separador" value={separator === "," ? "," : ";"} />
        </div>
        {doneResult ? (
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: doneResult.ok ? "var(--success-500)" : "var(--warning-500)",
            }}
          >
            {doneResult.imported} importados · {doneResult.failed.length} fallidos
          </span>
        ) : (
          <button
            type="button"
            onClick={onConfirm}
            className="btn-pill solid"
            disabled={disabled || stats.ok === 0}
          >
            {disabled ? "Importando…" : `Importar ${stats.ok} válidas`}
          </button>
        )}
      </div>
      {unknownColumns.length > 0 && (
        <p
          style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: 12,
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          Columnas ignoradas (no coinciden con el esquema): {unknownColumns.join(", ")}.
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  color = "#fff",
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span
        className="mono"
        style={{
          fontSize: 9,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        {label}
      </span>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 22, color }}>{value}</span>
    </div>
  );
}

function PreviewTable({ validations }: { validations: CsvValidationResult[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          color: "rgba(255,255,255,0.85)",
        }}
      >
        <thead>
          <tr style={{ textAlign: "left", color: "rgba(255,255,255,0.55)" }}>
            <Th>Fila</Th>
            <Th>Estado</Th>
            <Th>Nombre</Th>
            <Th>Edad</Th>
            <Th>Género</Th>
            <Th>Ocupación</Th>
            <Th>Detalle</Th>
          </tr>
        </thead>
        <tbody>
          {validations.map((v) => {
            const name = v.ok ? v.input.name : v.raw.name ?? "—";
            const age = v.ok
              ? v.input.demographics.age
              : v.raw.age ?? "—";
            const gender = v.ok ? v.input.demographics.gender : v.raw.gender ?? "—";
            const occ = v.ok ? v.input.demographics.occupation : v.raw.occupation ?? "—";
            return (
              <tr
                key={v.row}
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  background: v.ok ? "transparent" : "rgba(180,35,24,0.05)",
                }}
              >
                <Td>
                  <span className="mono" style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                    L{v.row}
                  </span>
                </Td>
                <Td>
                  {v.ok ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--success-500)" }}>
                      <CheckCircle2 size={14} /> ok
                    </span>
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--error-500)" }}>
                      <XCircle size={14} /> error
                    </span>
                  )}
                </Td>
                <Td>{name}</Td>
                <Td>{String(age)}</Td>
                <Td>{gender}</Td>
                <Td>{occ}</Td>
                <Td>
                  {v.ok ? (
                    <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
                      backstory {v.input.backstory.length} ch
                    </span>
                  ) : (
                    <span style={{ color: "var(--error-500)", fontSize: 12 }}>{v.error}</span>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th
      className="mono"
      style={{
        padding: "8px 12px",
        fontSize: 10,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        fontWeight: 400,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>{children}</td>;
}
