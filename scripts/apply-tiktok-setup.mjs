// Setup del canal TikTok Ads (v0.55.0). Hace dos cosas, en orden:
//   1. Aplica las migraciones pendientes según suaas_migrations (0021 y
//      0022 si faltan) y recarga el schema de PostgREST.
//   2. Crea la campaña de ejemplo «IVI · TikTok · Vídeo in-feed» SIN
//      lanzar ningún run (si no existe ya una con ese nombre).
//
// Conexión: POSTGRES_URL_NON_POOLING de .env.local. Requiere `pg`
// (npm i --no-save pg). Ejecutar con: node scripts/apply-tiktok-setup.mjs
import { readFileSync } from "node:fs";
import pg from "pg";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const match = env.match(/^POSTGRES_URL_NON_POOLING="?([^"\r\n]+)"?/m);
if (!match) throw new Error("POSTGRES_URL_NON_POOLING no encontrada en .env.local");

const client = new pg.Client({
  connectionString: match[1],
  ssl: { rejectUnauthorized: false },
});
await client.connect();

// ── 1) Migraciones pendientes, en orden ──────────────────────────────
const MIGRATIONS = ["0021_meta_ads.sql", "0022_tiktok_ads.sql"];
const { rows: applied } = await client.query(
  "select name from suaas_migrations where name = any($1)",
  [MIGRATIONS],
);
const appliedSet = new Set(applied.map((r) => r.name));
const runMigration = async (name) => {
  const sql = readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8");
  await client.query(sql);
  console.log(`→ ${name} aplicada`);
};
let appliedEarlier = false;
for (const name of MIGRATIONS) {
  if (appliedSet.has(name)) {
    console.log(`✓ ${name} ya aplicada`);
    continue;
  }
  await runMigration(name);
  if (name !== MIGRATIONS[MIGRATIONS.length - 1]) appliedEarlier = true;
}
// Si una migración anterior se aplicó tarde (p. ej. la 0021 cuando la 0022
// ya constaba), sus drop+add habrán revertido los checks de strategy/cta:
// reaplicar la última (idempotente) deja el estado final correcto.
if (appliedEarlier && appliedSet.has(MIGRATIONS[MIGRATIONS.length - 1])) {
  await runMigration(MIGRATIONS[MIGRATIONS.length - 1]);
}
await client.query("NOTIFY pgrst, 'reload schema'");

// ── 2) Campaña IVI · TikTok (sin runs) ───────────────────────────────
const NAME = "IVI · TikTok · Vídeo in-feed";
const YT_ID = "9EyqYhxfz2Q"; // Spot «La noticia de mi vida»
const { rows: existing } = await client.query(
  "select id from campaigns where name = $1 and deleted_at is null",
  [NAME],
);
if (existing.length > 0) {
  console.log(`✓ La campaña ya existe (${existing[0].id})`);
} else {
  const { rows } = await client.query(
    `insert into campaigns
       (name, brief, intended_message, final_url, landing_image_url,
        landing_source_url, queries, headlines, descriptions, creatives,
        channels, strategy, company_name, cta, channel_spec)
     values ($1, $2, $3, $4, $5, $6, $7, '{}', '{}', $8::jsonb, $9, $10, $11, $12, $13::jsonb)
     returning id`,
    [
      NAME,
      "IVI: clínicas líderes de reproducción asistida en España desde 1990. 35 clínicas, tasas de éxito hasta un 23% superiores a la media, financiación hasta 24 meses sin intereses (TIN 0%) y Plan IVI Baby con garantía de devolución.",
      "IVI te ayuda a ser madre con tasas de éxito superiores a la media y garantía de devolución",
      "https://ivi.es/",
      "https://ivi.es/wp-content/uploads/2018/09/ivi.jpg",
      "https://ivi.es/",
      ["quiero ser madre", "fertilidad a los 35"],
      JSON.stringify([
        {
          kind: "youtube",
          role: "video_youtube",
          url: `https://www.youtube.com/watch?v=${YT_ID}`,
          youtube_id: YT_ID,
          thumbnail_url: `https://i.ytimg.com/vi/${YT_ID}/hqdefault.jpg`,
          label: "Spot «La noticia de mi vida»",
        },
        {
          kind: "image",
          role: "logo_square",
          url: "https://www.google.com/s2/favicons?domain=ivi.es&sz=128",
          label: "Foto de perfil (favicon)",
        },
      ]),
      ["tiktok"],
      "tiktok_video",
      "IVI",
      "Reservar ahora",
      JSON.stringify({
        network: "tiktok",
        objective: "lead_generation",
        ad_texts: [
          "Serás mamá o te devolvemos el dinero: así es el Plan IVI Baby. Primera visita sin compromiso.",
          "Tasas de éxito un 23% superiores a la media y 35 clínicas en España. Financiación TIN 0%.",
          "La noticia de tu vida puede empezar hoy. Pide tu primera cita gratuita en IVI.",
        ],
        identity_handle: "ivi.es",
        music_name: "La noticia de mi vida · IVI",
      }),
    ],
  );
  console.log(`→ Campaña creada: ${rows[0].id} (sin runs)`);
}

await client.end();
console.log("Listo.");
