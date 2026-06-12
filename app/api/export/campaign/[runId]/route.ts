import { getCampaignWithTrashed, metaSpecOf, tiktokSpecOf } from "@/lib/campaigns";
import {
  GENERAL_CONTEXT_QUERY,
  listCampaignResponses,
  type CampaignResponse,
} from "@/lib/experiments/campaign";
import { listProfilesByIds } from "@/lib/profiles";
import { getRun } from "@/lib/runs";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Export de un run de campaña. Tres formatos:
 *  - (default)            CSV humano para Excel en español: BOM UTF-8,
 *                         separador «;», una fila por respuesta.
 *  - ?format=ads_editor   CSV para Google Ads Editor (separador «,»):
 *                         fila «Original» con los assets de la campaña y
 *                         fila «SUAAS ideas» con el top de versiones ideales
 *                         rankeadas por intent, truncadas a 30/90.
 *  - ?format=meta         CSV con la estructura de un anuncio de Meta
 *                         (Primary Text 1..5, Headline 1..5, Description
 *                         1..5, CTA, URLs): fila «Original» y fila «SUAAS
 *                         ideas» (titulares ideales a 40c y textos
 *                         principales ideales a 125c).
 *  - ?format=tiktok       CSV con la estructura de un anuncio de TikTok
 *                         (Ad Text 1..5, Display Name, CTA, URL): fila
 *                         «Original» y fila «SUAAS ideas» (captions
 *                         ideales a 100c).
 *
 * Tras el proxy de auth global, como el resto de /api no público.
 */

type Ctx = { params: Promise<{ runId: string }> };

function csvCell(value: string | number | null, separator: string): string {
  const s = value === null ? "" : String(value);
  if (s.includes(separator) || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvLine(cells: (string | number | null)[], separator: string): string {
  return cells.map((c) => csvCell(c, separator)).join(separator);
}

function fmtNum(v: number | null): string {
  return v === null ? "" : v.toFixed(2).replace(".", ",");
}

/** Top de assets ideales por intent del original, dedupe insensible a mayúsculas. */
function topIdeals(
  responses: CampaignResponse[],
  pick: (r: CampaignResponse) => string,
  maxLen: number,
  count: number,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of [...responses].sort((a, b) => b.intent_to_click - a.intent_to_click)) {
    const text = pick(r).slice(0, maxLen).trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= count) break;
  }
  return out;
}

export async function GET(req: Request, ctx: Ctx) {
  if (!isSupabaseConfigured()) {
    return Response.json({ ok: false, error: "Supabase no configurado." }, { status: 503 });
  }
  const { runId } = await ctx.params;
  const run = await getRun(runId);
  if (!run || run.kind !== "campaign") {
    return Response.json({ ok: false, error: "Run no encontrado." }, { status: 404 });
  }
  const campaignId = run.campaign_id ?? (run.params?.campaignId as string | undefined);
  const campaign = campaignId ? await getCampaignWithTrashed(campaignId) : null;
  if (!campaign) {
    return Response.json({ ok: false, error: "Campaña no encontrada." }, { status: 404 });
  }
  const responses = await listCampaignResponses(runId);

  const format = new URL(req.url).searchParams.get("format");

  if (format === "ads_editor") {
    // Cabeceras RSA de Google Ads Editor: Headline 1..15, Description 1..4.
    const header = [
      "Campaign",
      "Ad Group",
      ...Array.from({ length: 15 }, (_, i) => `Headline ${i + 1}`),
      ...Array.from({ length: 4 }, (_, i) => `Description ${i + 1}`),
      "Final URL",
    ];
    const pad = (xs: string[], n: number) =>
      Array.from({ length: n }, (_, i) => xs[i] ?? "");

    const idealHeadlines = topIdeals(responses, (r) => r.ideal_headline, 30, 15);
    const idealDescriptions = topIdeals(responses, (r) => r.ideal_description, 90, 4);
    // «SUAAS ideas»: ideales primero, completados con los originales.
    const mixedHeadlines = [
      ...idealHeadlines,
      ...campaign.headlines.filter(
        (h) => !idealHeadlines.some((x) => x.toLowerCase() === h.toLowerCase()),
      ),
    ].slice(0, 15);
    const mixedDescriptions = [
      ...idealDescriptions,
      ...campaign.descriptions.filter(
        (d) => !idealDescriptions.some((x) => x.toLowerCase() === d.toLowerCase()),
      ),
    ].slice(0, 4);

    const rows = [
      csvLine(header, ","),
      csvLine(
        [
          campaign.name,
          "Original",
          ...pad(campaign.headlines.map((h) => h.slice(0, 30)), 15),
          ...pad(campaign.descriptions.map((d) => d.slice(0, 90)), 4),
          campaign.final_url,
        ],
        ",",
      ),
      csvLine(
        [
          campaign.name,
          "SUAAS ideas",
          ...pad(mixedHeadlines, 15),
          ...pad(mixedDescriptions, 4),
          campaign.final_url,
        ],
        ",",
      ),
    ];
    return new Response("﻿" + rows.join("\r\n") + "\r\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ads-editor-${runId.slice(0, 8)}.csv"`,
      },
    });
  }

  if (format === "meta") {
    // Estructura de un anuncio de Meta: hasta 5 variantes por campo de
    // texto (asset_feed_spec). «SUAAS ideas» mezcla ideales y originales.
    const header = [
      "Campaign",
      "Ad Name",
      ...Array.from({ length: 5 }, (_, i) => `Primary Text ${i + 1}`),
      ...Array.from({ length: 5 }, (_, i) => `Headline ${i + 1}`),
      ...Array.from({ length: 5 }, (_, i) => `Description ${i + 1}`),
      "Call To Action",
      "Display Link",
      "Website URL",
    ];
    const pad = (xs: string[], n: number) =>
      Array.from({ length: n }, (_, i) => xs[i] ?? "");

    const originalPrimaries = metaSpecOf(campaign)?.primary_texts ?? [];
    // El «texto principal ideal» de los perfiles viaja en ideal_description
    // (así lo instruye el runner para Meta).
    const idealPrimaries = topIdeals(responses, (r) => r.ideal_description, 125, 5);
    const idealHeadlines = topIdeals(responses, (r) => r.ideal_headline, 40, 5);
    const mixedPrimaries = [
      ...idealPrimaries,
      ...originalPrimaries.filter(
        (t) => !idealPrimaries.some((x) => x.toLowerCase() === t.toLowerCase()),
      ),
    ].slice(0, 5);
    const mixedHeadlines = [
      ...idealHeadlines,
      ...campaign.headlines.filter(
        (h) => !idealHeadlines.some((x) => x.toLowerCase() === h.toLowerCase()),
      ),
    ].slice(0, 5);

    const rows = [
      csvLine(header, ","),
      csvLine(
        [
          campaign.name,
          "Original",
          ...pad(originalPrimaries, 5),
          ...pad(campaign.headlines, 5),
          ...pad(campaign.descriptions, 5),
          campaign.cta ?? "",
          metaSpecOf(campaign)?.display_link ?? "",
          campaign.final_url,
        ],
        ",",
      ),
      csvLine(
        [
          campaign.name,
          "SUAAS ideas",
          ...pad(mixedPrimaries, 5),
          ...pad(mixedHeadlines, 5),
          ...pad(campaign.descriptions, 5),
          campaign.cta ?? "",
          metaSpecOf(campaign)?.display_link ?? "",
          campaign.final_url,
        ],
        ",",
      ),
    ];
    return new Response("﻿" + rows.join("\r\n") + "\r\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="meta-ads-${runId.slice(0, 8)}.csv"`,
      },
    });
  }

  if (format === "tiktok") {
    // Estructura de un anuncio de TikTok: hasta 5 variantes de ad text
    // (Smart+ ad_text_list). «SUAAS ideas» mezcla captions ideales (100c)
    // con los originales.
    const spec = tiktokSpecOf(campaign);
    const header = [
      "Campaign",
      "Ad Name",
      ...Array.from({ length: 5 }, (_, i) => `Ad Text ${i + 1}`),
      "Display Name",
      "Identity Handle",
      "Call To Action",
      "Music",
      "Landing Page URL",
    ];
    const pad = (xs: string[], n: number) =>
      Array.from({ length: n }, (_, i) => xs[i] ?? "");

    const originalTexts = spec?.ad_texts ?? [];
    // El «caption ideal» de los perfiles viaja en ideal_description (así lo
    // instruye el runner para TikTok).
    const idealTexts = topIdeals(responses, (r) => r.ideal_description, 100, 5);
    const mixedTexts = [
      ...idealTexts,
      ...originalTexts.filter(
        (t) => !idealTexts.some((x) => x.toLowerCase() === t.toLowerCase()),
      ),
    ].slice(0, 5);

    const fixedCols = [
      campaign.company_name ?? "",
      spec?.identity_handle ? `@${spec.identity_handle}` : "",
      campaign.cta ?? "",
      spec?.music_name ?? "",
      campaign.final_url,
    ];
    const rows = [
      csvLine(header, ","),
      csvLine([campaign.name, "Original", ...pad(originalTexts, 5), ...fixedCols], ","),
      csvLine([campaign.name, "SUAAS ideas", ...pad(mixedTexts, 5), ...fixedCols], ","),
    ];
    return new Response("﻿" + rows.join("\r\n") + "\r\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tiktok-ads-${runId.slice(0, 8)}.csv"`,
      },
    });
  }

  // CSV humano: una fila por respuesta, separador «;» (Excel en español).
  const profiles = await listProfilesByIds([...new Set(responses.map((r) => r.profileId))]);
  const nameById = new Map(profiles.map((p) => [p.id, p.name]));

  const header = [
    "perfil",
    "perfil_id",
    "canal",
    "query",
    "intent_to_click",
    "claridad",
    "credibilidad",
    "diferenciacion",
    "landing_match",
    "barreras",
    "oferta_percibida",
    "razonamiento",
    "titular_ideal",
    "descripcion_ideal",
    "promesa_ideal",
    "comentario_libre",
  ];
  const rows = [
    csvLine(header, ";"),
    ...responses.map((r) =>
      csvLine(
        [
          nameById.get(r.profileId) ?? r.profileId.slice(0, 8),
          r.profileId,
          r.channel,
          r.query === GENERAL_CONTEXT_QUERY ? "Contexto general" : r.query,
          fmtNum(r.intent_to_click),
          fmtNum(r.clarity),
          fmtNum(r.credibility),
          fmtNum(r.differentiation),
          fmtNum(r.landing_match),
          r.barriers.join(" | "),
          r.perceived_offer,
          r.reasoning ?? "",
          r.ideal_headline,
          r.ideal_description,
          r.ideal_promise,
          r.ideal_free_text ?? "",
        ],
        ";",
      ),
    ),
  ];
  return new Response("﻿" + rows.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="campaign-run-${runId.slice(0, 8)}.csv"`,
    },
  });
}
