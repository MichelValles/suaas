// Aplica una migración SQL contra el Postgres del proyecto usando la
// connection string directa (POSTGRES_URL_NON_POOLING de .env.local).
// Uso:  node scripts/apply-migration.mjs supabase/migrations/0019_consolidacion.sql
// Tras aplicar, recarga el schema cache de PostgREST (NOTIFY pgrst).
//
// Requiere el paquete `pg` (instalar al vuelo: npm i --no-save pg).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const file = process.argv[2];
if (!file) {
  console.error("Uso: node scripts/apply-migration.mjs <ruta-del-sql>");
  process.exit(1);
}

// .env.local sin dependencias: parse mínimo clave=valor.
const env = Object.fromEntries(
  readFileSync(resolve(".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);

const url = env.POSTGRES_URL_NON_POOLING || env.POSTGRES_URL;
if (!url) {
  console.error("No hay POSTGRES_URL_NON_POOLING en .env.local");
  process.exit(1);
}

const sql = readFileSync(resolve(file), "utf8");
const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query("begin");
  await client.query(sql);
  await client.query("commit");
  await client.query("notify pgrst, 'reload schema'");
  console.log(`OK: ${file} aplicada y schema cache recargado.`);
} catch (err) {
  await client.query("rollback").catch(() => {});
  console.error(`FALLO aplicando ${file}:`, err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
