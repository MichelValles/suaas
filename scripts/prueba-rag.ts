/**
 * Prueba del RAG de Cerebro: embebe consultas naturales (paráfrasis que NO
 * están literalmente en el corpus) vía el gateway real y emite el SQL de
 * match_brand_chunks con el vector inline, para ejecutar la recuperación
 * pgvector real contra los documentos ya indexados de IVI.
 *
 *   npx tsx --env-file=.env.local --tsconfig tsconfig.json scripts/prueba-rag.ts
 */
import { writeFileSync } from "node:fs";
import { embed } from "ai";
import { EMBEDDING_MODEL } from "@/lib/gateway";

const BRAND = "33533ad8-f801-40f1-8e41-84ff29754408";
const QUERIES = [
  "¿puedo pagar la FIV a plazos y me devuelven el dinero si no funciona?",
  "qué probabilidad real de embarazo hay según mi edad",
];

async function main() {
  for (let i = 0; i < QUERIES.length; i++) {
    const q = QUERIES[i];
    const { embedding, usage } = await embed({ model: EMBEDDING_MODEL, value: q });
    const lit = `[${(embedding as number[]).map((x) => x.toFixed(5)).join(",")}]`;
    const sql =
      `SELECT title, chunk_index, round(similarity::numeric,3) AS sim, left(content,120) AS extracto ` +
      `FROM match_brand_chunks('${BRAND}', '${lit}'::extensions.vector(1536), 3);`;
    writeFileSync(`scripts/.out-rag-${i}.sql`, sql, "utf8");
    console.log(`Query ${i}: «${q}» -> dims ${(embedding as number[]).length}, tokens ${usage?.tokens ?? "?"}, SQL en scripts/.out-rag-${i}.sql`);
  }
}

main().catch((e) => { console.error("ERROR:", (e as Error).message); process.exit(1); });
