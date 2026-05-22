/**
 * Utilities CSV mínimas, isomórficas (corren en cliente y servidor).
 * Sin dependencias externas. Implementación lo bastante robusta para el
 * caso de SUAAS: separador detectable (`,` o `;`), comillas dobles con
 * escapado por duplicación (RFC 4180), tolerante a finales de línea
 * `\n` o `\r\n`.
 */

export function detectSeparator(text: string): "," | ";" {
  // Muestra primera línea con contenido.
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

export type ParsedCsv = {
  headers: string[];
  rows: string[][];
  separator: "," | ";";
};

export function parseCSV(text: string, opts?: { separator?: "," | ";" }): ParsedCsv {
  // Quitar BOM si lo hay.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const sep = opts?.separator ?? detectSeparator(text);
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === sep) {
      row.push(field);
      field = "";
      continue;
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      // ignora filas totalmente vacías
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += c;
  }
  // Último campo si la última línea no termina en \n
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== "") rows.push(row);
  }

  const headers = (rows.shift() ?? []).map((h) => h.trim());
  return { headers, rows, separator: sep };
}

export function stringifyCSV(
  rows: Array<Record<string, unknown>>,
  headers: string[],
  opts?: { separator?: "," | ";" },
): string {
  const sep = opts?.separator ?? ",";
  const out: string[] = [headers.map((h) => escape(h, sep)).join(sep)];
  for (const r of rows) {
    out.push(headers.map((h) => escape(r[h], sep)).join(sep));
  }
  return out.join("\r\n");
}

function escape(value: unknown, sep: string): string {
  if (value == null) return "";
  const s = typeof value === "string" ? value : String(value);
  if (s.includes('"') || s.includes(sep) || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
