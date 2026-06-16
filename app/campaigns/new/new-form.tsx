"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { BrandPicker } from "@/components/brand-picker";
import { useFormStatus } from "react-dom";
import {
  Bookmark,
  Heart,
  Loader2,
  MessageCircle,
  Music,
  Plus,
  Share2,
} from "lucide-react";
import { ChannelIcon } from "@/components/channel-icon";
import { RemoveIconButton } from "@/components/remove-icon-button";
import { StrategyIcon } from "@/components/strategy-icon";
import {
  CHANNEL_LABEL,
  CHANNEL_STRATEGIES,
  CHANNEL_VALUES,
  CREATIVE_ROLE_LABEL,
  CTA_VALUES,
  DEFAULT_STRATEGY_BY_CHANNEL,
  META_CTA_VALUES,
  META_LIMITS,
  META_OBJECTIVE_DESCRIPTION,
  META_OBJECTIVE_LABEL,
  META_OBJECTIVE_VALUES,
  META_PLACEMENT_LABEL,
  META_PLACEMENT_STRATEGIES,
  META_PLACEMENT_VALUES,
  STRATEGY_DESCRIPTION,
  STRATEGY_LABEL,
  TIKTOK_CTA_VALUES,
  TIKTOK_LIMITS,
  TIKTOK_OBJECTIVE_DESCRIPTION,
  TIKTOK_OBJECTIVE_LABEL,
  TIKTOK_OBJECTIVE_VALUES,
  extractYouTubeId,
  isMetaStrategy,
  isStrategyImplemented,
  isTikTokStrategy,
  isVerticalPlacement,
  metaSpecOf,
  tiktokSpecOf,
  youtubeThumbnail,
  type Campaign as CampaignEntity,
  type Channel,
  type CreativeRole,
  type MetaObjective,
  type MetaPlacement,
  type Strategy,
  type TikTokObjective,
} from "@/lib/campaigns";
import {
  createCampaignAction,
  type CreateCampaignState,
} from "./actions";

const initial: CreateCampaignState = { ok: false };

type LandingMode = "og" | "upload";
type CreativeKind = "image" | "video" | "youtube";
type Creative = {
  kind: CreativeKind;
  role: CreativeRole;
  url: string;
  upload_data: string;
  label: string;
  youtube_id: string | null;
  thumbnail_url: string | null;
  card_headline: string;
  card_description: string;
};
const emptyCreative = (
  kind: CreativeKind = "image",
  role: CreativeRole = "generic",
): Creative => ({
  kind,
  role,
  url: "",
  upload_data: "",
  label: "",
  youtube_id: null,
  thumbnail_url: null,
  card_headline: "",
  card_description: "",
});

const HEADLINE_MAX = 30;
const DESCRIPTION_MAX = 90;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.host + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return url || "ejemplo.com";
  }
}

/** Creatividad con los campos de medio vaciados (cambio de kind o de rol). */
function resetMedia(c: Creative, kind: CreativeKind): Creative {
  return { ...c, kind, url: "", upload_data: "", youtube_id: null, thumbnail_url: null };
}

/**
 * Al entrar en una estrategia de TikTok, las creatividades arrastradas de
 * otra estrategia o canal se renormalizan para que el rol REAL coincida
 * con lo que la UI muestra: sin esto, roles residuales (generic, cover…)
 * se pintaban como tarjetas pero viajaban intactos al servidor, que
 * rechazaba el submit con un error que contradecía al formulario.
 */
function normalizeCreativesFor(strategy: Strategy, prev: Creative[]): Creative[] {
  if (!isTikTokStrategy(strategy)) return prev;
  return prev.map((c) => {
    if (c.role === "logo_square") {
      // El avatar es siempre una imagen (98x98).
      return c.kind === "image" ? c : resetMedia(c, "image");
    }
    if (strategy === "tiktok_carousel") {
      // Las tarjetas del carousel son imágenes (el resto de kinds pierde
      // su medio: el formato no los admite).
      const card = c.kind === "image" ? c : resetMedia(c, "image");
      return card.role === "card" ? card : { ...card, role: "card" as CreativeRole };
    }
    return c.role === "generic" ? c : { ...c, role: "generic" as CreativeRole };
  });
}

export function NewCampaignForm({ duplicateFrom }: { duplicateFrom?: CampaignEntity }) {
  const [state, formAction] = useActionState(createCampaignAction, initial);

  const src = duplicateFrom;
  const [name, setName] = useState(src ? `${src.name} (copia)` : "");
  const [channel, setChannel] = useState<Channel>(src?.channels[0] ?? "google");
  const [strategy, setStrategy] = useState<Strategy>(src?.strategy ?? "search");
  const [brief, setBrief] = useState(src?.brief ?? "");
  const [intendedMessage, setIntendedMessage] = useState(src?.intended_message ?? "");
  const [finalUrl, setFinalUrl] = useState(src?.final_url ?? "");
  const [landingMode, setLandingMode] = useState<LandingMode>("og");
  const [landingUpload, setLandingUpload] = useState<string>("");
  const [landingPreviewName, setLandingPreviewName] = useState<string>("");
  // Al duplicar se reutiliza la imagen de landing ya resuelta/subida de la
  // campaña original (la action acepta landing_resolved_url tal cual): no
  // hay que resubir ni volver a resolver nada.
  const [resolvedLanding, setResolvedLanding] = useState<string>(
    src?.landing_image_url ?? "",
  );
  const [resolveStatus, setResolveStatus] = useState<
    "idle" | "loading" | "ok" | "error"
  >(src?.landing_image_url ? "ok" : "idle");
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [queries, setQueries] = useState<string[]>(
    src && src.queries.length > 0 ? src.queries : [""],
  );
  const [headlines, setHeadlines] = useState<string[]>(
    src && src.headlines.length > 0 ? src.headlines : ["", "", ""],
  );
  const [descriptions, setDescriptions] = useState<string[]>(
    src && src.descriptions.length > 0 ? src.descriptions : ["", ""],
  );
  const [creatives, setCreatives] = useState<Creative[]>(
    src
      ? src.creatives
          .filter((c) => /^https?:\/\//i.test(c.url))
          .map((c) => ({
            kind: c.kind,
            role: c.role,
            url: c.url,
            upload_data: "",
            label: c.label ?? "",
            youtube_id: c.youtube_id ?? null,
            thumbnail_url: c.thumbnail_url ?? null,
            card_headline: c.card_headline ?? "",
            card_description: c.card_description ?? "",
          }))
      : [],
  );
  const [companyName, setCompanyName] = useState(src?.company_name ?? "");
  const [longHeadline, setLongHeadline] = useState(src?.long_headline ?? "");
  const [cta, setCta] = useState<string>(src?.cta ?? "");
  // Meta: objetivo ODAX, placement de simulación, textos principales y
  // enlace visible (channel_spec). TikTok: objetivo, variantes de texto,
  // @usuario y música (channel_spec con network "tiktok").
  const srcMetaSpec = src ? metaSpecOf(src) : null;
  const srcTikTokSpec = src ? tiktokSpecOf(src) : null;
  const [metaObjective, setMetaObjective] = useState<MetaObjective>(
    srcMetaSpec?.objective ?? "traffic",
  );
  const [metaPlacement, setMetaPlacement] = useState<MetaPlacement>(
    srcMetaSpec?.placement ?? "instagram_feed",
  );
  const [primaryTexts, setPrimaryTexts] = useState<string[]>(
    srcMetaSpec?.primary_texts?.length ? srcMetaSpec.primary_texts : [""],
  );
  const [displayLink, setDisplayLink] = useState(srcMetaSpec?.display_link ?? "");
  const [tiktokObjective, setTiktokObjective] = useState<TikTokObjective>(
    srcTikTokSpec?.objective ?? "traffic",
  );
  const [adTexts, setAdTexts] = useState<string[]>(
    srcTikTokSpec?.ad_texts?.length ? srcTikTokSpec.ad_texts : [""],
  );
  const [identityHandle, setIdentityHandle] = useState(
    srcTikTokSpec?.identity_handle ?? "",
  );
  const [musicName, setMusicName] = useState(srcTikTokSpec?.music_name ?? "");
  // Producto (solo shopping): espejo de los atributos obligatorios del feed.
  const [productId, setProductId] = useState(src?.product?.id ?? "");
  const [productTitle, setProductTitle] = useState(src?.product?.title ?? "");
  const [productDescription, setProductDescription] = useState(
    src?.product?.description ?? "",
  );
  const [productPrice, setProductPrice] = useState(src?.product?.price ?? "");
  const [productAvailability, setProductAvailability] = useState<string>(
    src?.product?.availability ?? "in_stock",
  );
  const [productBrand, setProductBrand] = useState(src?.product?.brand ?? "");
  const [productGtin, setProductGtin] = useState(src?.product?.gtin ?? "");
  const [productMpn, setProductMpn] = useState(src?.product?.mpn ?? "");
  const [productCondition, setProductCondition] = useState<string>(
    src?.product?.condition ?? "",
  );

  const isMeta = isMetaStrategy(strategy);
  const isTikTok = isTikTokStrategy(strategy);
  const isSpark = strategy === "tiktok_spark";
  // Estrategias con el set de assets visual (CTA de lista y preview de
  // banner): Display, Performance Max y Demand Gen.
  const assetStrategy =
    strategy === "display" || strategy === "pmax" || strategy === "demand_gen";
  // Nombre de empresa y roles de creatividad: también en Search (el bloque
  // «Business information» de la spec 17092074 exige nombre y logo 1:1).
  const showsBusinessAssets = assetStrategy || strategy === "search";
  // El titular largo existe en Display y PMax (obligatorio) y en Video
  // (opcional, según su tabla de text assets). En Demand Gen es exclusivo
  // del subformato vídeo, aún no modelado.
  const usesLongHeadline =
    strategy === "display" || strategy === "pmax" || strategy === "video";
  // Demand Gen admite titulares de 40 caracteres; el resto de Google, 30.
  // En Meta el cap duro es el técnico de la API (255c) y los ~40 visibles
  // se avisan sin bloquear.
  const headlineMax = isMeta
    ? META_LIMITS.headline.max
    : strategy === "demand_gen"
      ? 40
      : HEADLINE_MAX;
  const headlinesCap =
    strategy === "video"
      ? 1
      : strategy === "display" || strategy === "demand_gen" || isMeta
        ? 5
        : 15;
  const descriptionsCap =
    strategy === "video" ? 1 : assetStrategy || isMeta ? 5 : 4;
  // Formatos que admite el placement de Meta elegido (matriz oficial).
  const placementAllows = META_PLACEMENT_STRATEGIES[metaPlacement];
  const metaVertical = isVerticalPlacement(metaPlacement);

  // Cuando el usuario cambia la URL final, invalidamos la imagen resuelta para
  // que vuelva a pulsar el botón explícitamente. Evita previews stale. Se
  // salta el mount: al duplicar, finalUrl y resolvedLanding llegan sembrados
  // y el primer pase no debe invalidarlos.
  const skipFirstInvalidate = useRef(true);
  useEffect(() => {
    if (skipFirstInvalidate.current) {
      skipFirstInvalidate.current = false;
      return;
    }
    if (resolvedLanding) {
      setResolvedLanding("");
      setResolveStatus("idle");
      setResolveError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalUrl]);

  function updateAt<T>(arr: T[], i: number, value: T): T[] {
    return arr.map((v, idx) => (idx === i ? value : v));
  }

  // ============ queries ============
  function addQuery() {
    if (queries.length >= 5) return;
    setQueries([...queries, ""]);
  }
  function removeQuery(i: number) {
    if (queries.length <= 1) return;
    setQueries(queries.filter((_, idx) => idx !== i));
  }

  // ============ headlines ============
  function addHeadline() {
    if (headlines.length >= 15) return;
    setHeadlines([...headlines, ""]);
  }
  function removeHeadline(i: number) {
    if (headlines.length <= 1) return;
    setHeadlines(headlines.filter((_, idx) => idx !== i));
  }

  // ============ descriptions ============
  function addDescription() {
    if (descriptions.length >= descriptionsCap) return;
    setDescriptions([...descriptions, ""]);
  }
  function removeDescription(i: number) {
    if (descriptions.length <= 2) return;
    setDescriptions(descriptions.filter((_, idx) => idx !== i));
  }

  // ============ primary texts (Meta) ============
  function addPrimaryText() {
    if (primaryTexts.length >= META_LIMITS.variants) return;
    setPrimaryTexts([...primaryTexts, ""]);
  }
  function removePrimaryText(i: number) {
    if (primaryTexts.length <= 1) return;
    setPrimaryTexts(primaryTexts.filter((_, idx) => idx !== i));
  }

  // ============ ad texts (TikTok) ============
  function addAdText() {
    if (adTexts.length >= TIKTOK_LIMITS.variants) return;
    setAdTexts([...adTexts, ""]);
  }
  function removeAdText(i: number) {
    if (adTexts.length <= 1) return;
    setAdTexts(adTexts.filter((_, idx) => idx !== i));
  }

  // ============ creatives ============
  function addCreative(kind: CreativeKind = "image", role: CreativeRole = "generic") {
    // El límite real del carousel de TikTok son 35 TARJETAS (el avatar va
    // aparte), no 35 creatividades totales.
    if (
      strategy === "tiktok_carousel" &&
      role === "card" &&
      creatives.filter((c) => c.role === "card").length >=
        TIKTOK_LIMITS.carousel_images.max
    ) {
      return;
    }
    const cap =
      strategy === "tiktok_carousel"
        ? TIKTOK_LIMITS.carousel_images.max + 1
        : strategy === "meta_carousel" || strategy === "meta_collection"
          ? 12
          : 6;
    if (creatives.length >= cap) return;
    setCreatives([...creatives, emptyCreative(kind, role)]);
  }
  function removeCreative(i: number) {
    setCreatives(creatives.filter((_, idx) => idx !== i));
  }
  function patchCreative(i: number, patch: Partial<Creative>) {
    setCreatives((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    );
  }
  function changeCreativeKind(i: number, kind: CreativeKind) {
    setCreatives((prev) =>
      prev.map((c, idx) =>
        idx === i
          ? { ...c, kind, url: "", upload_data: "", youtube_id: null, thumbnail_url: null }
          : c,
      ),
    );
  }
  function setCreativeYouTubeUrl(i: number, url: string) {
    const id = extractYouTubeId(url);
    patchCreative(i, {
      url,
      youtube_id: id,
      thumbnail_url: id ? youtubeThumbnail(id) : null,
    });
  }

  async function onLandingFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setLandingUpload(dataUrl);
    setLandingPreviewName(file.name);
  }
  async function onCreativeFile(
    i: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    const kind: CreativeKind = file.type.startsWith("video/") ? "video" : "image";
    patchCreative(i, {
      upload_data: dataUrl,
      kind,
      label: creatives[i]?.label || file.name,
    });
  }

  async function resolveOg() {
    if (!finalUrl) {
      setResolveError("Introduce primero la URL final.");
      setResolveStatus("error");
      return;
    }
    setResolveStatus("loading");
    setResolveError(null);
    try {
      const res = await fetch(`/api/og-image?url=${encodeURIComponent(finalUrl)}`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setResolveStatus("error");
        setResolveError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      setResolvedLanding(json.url as string);
      setResolveStatus("ok");
    } catch (err) {
      setResolveStatus("error");
      setResolveError((err as Error).message);
    }
  }

  const payload = {
    name,
    channels: [channel] as Channel[],
    strategy,
    brief: brief.trim() || null,
    intended_message: intendedMessage.trim() || null,
    channel_spec: isMeta
      ? {
          objective: metaObjective,
          placement: metaPlacement,
          primary_texts: primaryTexts.map((t) => t.trim()).filter(Boolean),
          display_link: displayLink.trim() || null,
        }
      : isTikTok
        ? {
            network: "tiktok" as const,
            objective: tiktokObjective,
            ad_texts: adTexts.map((t) => t.trim()).filter(Boolean),
            identity_handle: identityHandle.trim().replace(/^@/, "") || null,
            music_name: musicName.trim() || null,
          }
        : null,
    product:
      strategy === "shopping"
        ? {
            id: productId.trim(),
            title: productTitle.trim(),
            description: productDescription.trim(),
            price: productPrice.trim(),
            availability: productAvailability,
            brand: productBrand.trim() || null,
            gtin: productGtin.trim() || null,
            mpn: productMpn.trim() || null,
            condition: productCondition || null,
          }
        : null,
    final_url: finalUrl,
    landing_mode: landingMode,
    landing_upload_data: landingUpload,
    landing_resolved_url: resolvedLanding || null,
    queries,
    headlines,
    descriptions,
    creatives,
    company_name: companyName.trim() || null,
    long_headline: longHeadline.trim() || null,
    cta: cta || null,
  };

  // Para el preview: muestra el snippet (headline 1 + description 1) y la
  // landing si hay imagen disponible.
  const previewHeadline = headlines[0] || "Tu titular aquí";
  const previewDescription =
    descriptions[0] || "Tu descripción aparecerá aquí debajo del titular.";
  const previewImage =
    landingMode === "upload" ? landingUpload : resolvedLanding;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 360px)",
        gap: 32,
        alignItems: "start",
      }}
    >
      <form
        action={formAction}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 24,
          width: "100%",
        }}
      >
        <input
          type="hidden"
          name="payload_json"
          value={JSON.stringify(payload)}
        />

        {/* Campos comunes a todas las estrategias: primero, para que el
            cambio de estrategia nunca borre ni esconda lo ya rellenado. */}
        <Section title="Campaña">
          <BrandPicker
            onPick={(b) => {
              setCompanyName(b.name);
              setBrief(b.context);
            }}
            onClear={() => {
              setCompanyName("");
              setBrief("");
            }}
            hint="Rellena el nombre de empresa y el brief desde Cerebro. El brief solo alimenta a los jueces, nunca al perfil que ve el anuncio."
          />
          <Controlled
            label="Nombre interno de la campaña"
            value={name}
            onChange={setName}
            required
            placeholder="Hipoteca fija agosto 2026"
          />
          <ControlledTextArea
            label="Brief interno (opcional, no se muestra al perfil)"
            rows={2}
            value={brief}
            onChange={setBrief}
            placeholder="Promesa diferencial vs ING. Limitaciones legales: no decir TAE."
          />
          <Controlled
            label="Mensaje que quieres que entiendan (opcional, activa el juez de comprensión)"
            value={intendedMessage}
            onChange={setIntendedMessage}
            maxLength={200}
            placeholder="Hipoteca fija sin comisiones de apertura para menores de 35"
          />
        </Section>

        <Section title="Landing">
          <Controlled
            label="URL final del anuncio"
            value={finalUrl}
            onChange={setFinalUrl}
            required
            placeholder="https://miweb.com/landing-hipoteca"
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ToggleButton
              active={landingMode === "og"}
              onClick={() => setLandingMode("og")}
              label="Resolver og:image"
            />
            <ToggleButton
              active={landingMode === "upload"}
              onClick={() => setLandingMode("upload")}
              label="Subir screenshot"
            />
          </div>
          {landingMode === "og" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: 14,
                border: "1px dashed rgba(var(--fg),0.12)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={resolveOg}
                  disabled={!finalUrl || resolveStatus === "loading"}
                  className="btn-pill solid"
                  style={{ fontSize: 12 }}
                >
                  {resolveStatus === "loading" ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Loader2 size={12} className="spin" /> Resolviendo…
                    </span>
                  ) : resolvedLanding ? (
                    "Volver a resolver"
                  ) : (
                    "Resolver og:image"
                  )}
                </button>
                {resolveStatus === "ok" && (
                  <span
                    className="mono"
                    style={{ fontSize: 10, color: "var(--success-text)", letterSpacing: "0.18em" }}
                  >
                    Imagen resuelta
                  </span>
                )}
              </div>
              {resolveError && (
                <span style={{ color: "var(--error-text)", fontSize: 12, lineHeight: 1.5 }}>
                  {resolveError}
                </span>
              )}
              {resolvedLanding && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={resolvedLanding}
                  alt="Preview landing"
                  style={{
                    maxWidth: "100%",
                    maxHeight: 240,
                    objectFit: "cover",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid rgba(var(--fg),0.08)",
                  }}
                />
              )}
            </div>
          )}
          {landingMode === "upload" && (
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>Screenshot de la landing</Label>
              <input
                type="file"
                accept="image/*"
                onChange={onLandingFile}
                style={inputStyle}
              />
              {landingPreviewName && (
                <span className="mono" style={{ fontSize: 11, color: "rgba(var(--fg),0.55)" }}>
                  {landingPreviewName} cargado.
                </span>
              )}
              {landingUpload && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={landingUpload}
                  alt="Preview landing"
                  style={{
                    maxWidth: "100%",
                    maxHeight: 240,
                    objectFit: "cover",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid rgba(var(--fg),0.08)",
                    marginTop: 6,
                  }}
                />
              )}
            </label>
          )}
        </Section>

        <Section title="Canal">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(var(--fg),0.55)",
              }}
            >
              ¿En qué red simulamos el anuncio?
            </span>
            <ChannelTabs
              value={channel}
              onChange={(c) => {
                setChannel(c);
                const allowed = CHANNEL_STRATEGIES[c];
                let next = strategy;
                if (!allowed.includes(strategy)) {
                  next = DEFAULT_STRATEGY_BY_CHANNEL[c] ?? allowed[0] ?? "search";
                  setStrategy(next);
                }
                setCreatives((prev) => normalizeCreativesFor(next, prev));
              }}
            />
            <p
              style={{
                color: "rgba(var(--fg),0.55)",
                fontSize: 12,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              Cada red tiene formato propio (caps de caracteres, creatividades,
              targeting). Google Ads, Meta Ads y TikTok Ads están implementados
              con sus campos y límites reales. LinkedIn y X llegarán como
              módulos específicos en futuras versiones.
            </p>
          </div>
        </Section>

        <Section title="Estrategia">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(var(--fg),0.55)",
              }}
            >
              {channel === "meta" || channel === "tiktok"
                ? `Formato del anuncio en ${CHANNEL_LABEL[channel].split(" ")[0]}`
                : `Tipo de campaña dentro de ${CHANNEL_LABEL[channel].split(" ")[0]}`}
            </span>
            <StrategyTabs
              channel={channel}
              value={strategy}
              onChange={(s) => {
                setStrategy(s);
                setCreatives((prev) => normalizeCreativesFor(s, prev));
              }}
            />
            <p
              style={{
                color: "rgba(var(--fg),0.55)",
                fontSize: 12,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {STRATEGY_DESCRIPTION[strategy]}
            </p>
          </div>
        </Section>

        {!isStrategyImplemented(strategy) && (
          <UnderConstruction strategy={strategy} />
        )}

        {isStrategyImplemented(strategy) && (
        <>
        {isMeta && (
          <Section title="Configuración de Meta">
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>Objetivo de la campaña (ODAX)</Label>
              <select
                value={metaObjective}
                onChange={(e) => setMetaObjective(e.currentTarget.value as MetaObjective)}
                style={inputStyle}
              >
                {META_OBJECTIVE_VALUES.map((o) => (
                  <option key={o} value={o}>
                    {META_OBJECTIVE_LABEL[o]}
                  </option>
                ))}
              </select>
            </label>
            <p
              style={{
                color: "rgba(var(--fg),0.55)",
                fontSize: 12,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {META_OBJECTIVE_DESCRIPTION[metaObjective]}
            </p>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>Placement de simulación (dónde lo ve el perfil)</Label>
              <select
                value={metaPlacement}
                onChange={(e) => setMetaPlacement(e.currentTarget.value as MetaPlacement)}
                style={inputStyle}
              >
                {META_PLACEMENT_VALUES.map((p) => {
                  const allowed = META_PLACEMENT_STRATEGIES[p].includes(strategy);
                  return (
                    <option key={p} value={p} disabled={!allowed}>
                      {META_PLACEMENT_LABEL[p]}
                      {allowed ? "" : " · no admite este formato"}
                    </option>
                  );
                })}
              </select>
            </label>
            {!placementAllows.includes(strategy) && (
              <p
                style={{
                  color: "var(--error-text)",
                  fontSize: 12,
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                {META_PLACEMENT_LABEL[metaPlacement]} no admite el formato{" "}
                {STRATEGY_LABEL[strategy]} (matriz oficial de placements). Elige
                otro placement o cambia el formato.
              </p>
            )}
            <p
              style={{
                color: "rgba(var(--fg),0.55)",
                fontSize: 12,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              En la cuenta real activarías Advantage+ placements (todas las
              ubicaciones). Aquí eliges UNA para simularla con fidelidad: el
              contexto, los campos visibles y el truncado del copy cambian por
              placement. Para testear otra ubicación, duplica la campaña.
            </p>
          </Section>
        )}

        {isTikTok && (
          <Section title="Configuración de TikTok">
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>Objetivo de la campaña</Label>
              <select
                value={tiktokObjective}
                onChange={(e) =>
                  setTiktokObjective(e.currentTarget.value as TikTokObjective)
                }
                style={inputStyle}
              >
                {TIKTOK_OBJECTIVE_VALUES.map((o) => (
                  <option key={o} value={o}>
                    {TIKTOK_OBJECTIVE_LABEL[o]}
                  </option>
                ))}
              </select>
            </label>
            <p
              style={{
                color: "rgba(var(--fg),0.55)",
                fontSize: 12,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {TIKTOK_OBJECTIVE_DESCRIPTION[tiktokObjective]}
            </p>
            <p
              style={{
                color: "rgba(var(--fg),0.55)",
                fontSize: 12,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              La simulación coloca el anuncio en el feed «Para ti» de TikTok (el
              placement principal). Pangle y Global App Bundle, las redes
              externas de ByteDance, no están modelados.
            </p>
          </Section>
        )}

        {(showsBusinessAssets || isMeta || isTikTok) && (
          <Section
            title={
              isMeta
                ? "Identidad y enlace"
                : isTikTok
                  ? "Identidad de la cuenta"
                  : "Identidad de marca"
            }
          >
            <CharCountedInput
              label={
                isMeta
                  ? "Nombre de la página de Facebook (identidad del anuncio)"
                  : isTikTok
                    ? "Nombre visible (display name; en pantalla se muestran ~20 caracteres)"
                    : "Nombre de empresa (visible en el anuncio)"
              }
              value={companyName}
              onChange={setCompanyName}
              max={
                isMeta
                  ? META_LIMITS.page_name.max
                  : isTikTok
                    ? TIKTOK_LIMITS.display_name.max
                    : 25
              }
              recommended={isTikTok ? TIKTOK_LIMITS.display_name.recommended : undefined}
              required
              placeholder={isMeta ? "BBVA España" : isTikTok ? "BBVA" : "BBVA"}
            />
            {isMeta && (
              <Controlled
                label="Enlace visible (display link, opcional; si no, se muestra el dominio de la URL final)"
                value={displayLink}
                onChange={setDisplayLink}
                placeholder="miweb.com/hipotecas"
              />
            )}
            {isTikTok && (
              <>
                <CharCountedInput
                  label={
                    isSpark
                      ? "Usuario de la cuenta del post (@, sin la arroba) · obligatorio"
                      : "Usuario mostrado (@, opcional; si no, se deriva del nombre visible)"
                  }
                  value={identityHandle}
                  onChange={setIdentityHandle}
                  max={TIKTOK_LIMITS.identity_handle.max}
                  required={isSpark}
                  placeholder="bbva_es"
                />
                <p
                  style={{
                    color: "rgba(var(--fg),0.55)",
                    fontSize: 12,
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  {isSpark
                    ? "El Spark Ad usa la identidad REAL de la cuenta del post (avatar, nombre y @). La foto de perfil se añade como creatividad con rol «Foto de perfil»."
                    : "TikTok está retirando las identidades personalizadas (2026): los anuncios nuevos salen de un perfil verificado. La foto de perfil (98x98, 1:1) se añade como creatividad con rol «Foto de perfil»."}
                </p>
              </>
            )}
          </Section>
        )}

        <Section
          title={
            strategy === "display" || isMeta || isTikTok
              ? `Intereses / contexto · ${queries.length} / 5 (opcional)`
              : strategy === "pmax"
                ? `Señales de audiencia · ${queries.length} / 5 (opcional)`
                : strategy === "shopping"
                  ? `Búsquedas de producto · ${queries.length} / 5`
                  : `Queries · ${queries.length} / 5`
          }
          onAdd={addQuery}
          addLabel="+ Añadir"
          canAdd={queries.length < 5}
        >
          {isMeta && (
            <p
              style={{
                color: "rgba(var(--fg),0.55)",
                fontSize: 12,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              En Meta no hay búsqueda: estos intereses simulan por qué el
              algoritmo le enseña el anuncio al perfil (targeting por afinidad).
              Sin intereses, el perfil lo ve sin contexto previo.
            </p>
          )}
          {isTikTok && (
            <p
              style={{
                color: "rgba(var(--fg),0.55)",
                fontSize: 12,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              En TikTok el feed «Para ti» decide: estos intereses simulan las
              señales reales del targeting (vídeos terminados o guardados y
              hashtags vistos en los últimos 7-15 días, creadores seguidos).
              Sin intereses, el perfil lo ve sin contexto previo.
            </p>
          )}
          {queries.map((q, i) => (
            <RowWithRemove
              key={i}
              canRemove={queries.length > 1}
              onRemove={() => removeQuery(i)}
            >
              <Controlled
                label={
                  assetStrategy || isMeta || isTikTok
                    ? `Interés / señal ${i + 1}`
                    : `Query ${i + 1}`
                }
                value={q}
                onChange={(v) => setQueries(updateAt(queries, i, v))}
                required={
                  (strategy === "search" || strategy === "shopping") && i === 0
                }
                placeholder={
                  isTikTok
                    ? "vídeos de fitness, hashtag gymtok"
                    : assetStrategy || isMeta
                      ? "lector de tech, edad 30-45"
                      : "hipoteca fija madrid"
                }
              />
            </RowWithRemove>
          ))}
        </Section>

        {isMeta && (
          <Section
            title={`Textos principales · ${primaryTexts.length} / ${META_LIMITS.variants}`}
            onAdd={addPrimaryText}
            addLabel="+ Añadir variante"
            canAdd={primaryTexts.length < META_LIMITS.variants}
          >
            <p
              style={{
                color: "rgba(var(--fg),0.55)",
                fontSize: 12,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              El texto principal aparece encima de la creatividad y es el copy
              central del anuncio en Meta. Cada perfil ve UNA variante (como el
              flexible ad format real). Máximo técnico 1.024 caracteres, pero el
              feed corta con «Ver más» hacia los{" "}
              {strategy === "meta_carousel" ? "80" : "125"}: el contador avisa
              al pasarlos.
            </p>
            {primaryTexts.map((t, i) => (
              <RowWithRemove
                key={i}
                canRemove={primaryTexts.length > 1}
                onRemove={() => removePrimaryText(i)}
              >
                <CharCountedTextarea
                  label={`Texto principal ${i + 1}${i === 0 ? " · obligatorio" : " · opcional"}`}
                  value={t}
                  onChange={(v) => setPrimaryTexts(updateAt(primaryTexts, i, v))}
                  max={META_LIMITS.primary_text.max}
                  recommended={
                    strategy === "meta_carousel"
                      ? META_LIMITS.primary_text.recommended_carousel
                      : META_LIMITS.primary_text.recommended
                  }
                  required={i === 0}
                  placeholder="Hipoteca fija sin comisiones de apertura. Respuesta en 48 horas, sin letra pequeña."
                />
              </RowWithRemove>
            ))}
          </Section>
        )}

        {isTikTok && (
          <Section
            title={`Texto del anuncio · ${adTexts.length} / ${TIKTOK_LIMITS.variants}`}
            onAdd={addAdText}
            addLabel="+ Añadir variante"
            canAdd={adTexts.length < TIKTOK_LIMITS.variants}
          >
            <p
              style={{
                color: "rgba(var(--fg),0.55)",
                fontSize: 12,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {isSpark
                ? "El caption del post orgánico (en Spark se conserva tal cual: admite emojis y hashtags; máximo 150 caracteres en el push de R&F). El feed lo corta a ~2 líneas con «más»."
                : "El caption sobre el vídeo: 1-100 caracteres, SIN emojis, «#» ni «{ }» (spec oficial). El feed lo corta a ~2 líneas con «más»."}{" "}
              Cada perfil ve UNA variante (así rotan los textos en Smart+).
            </p>
            {adTexts.map((t, i) => (
              <RowWithRemove
                key={i}
                canRemove={adTexts.length > 1}
                onRemove={() => removeAdText(i)}
              >
                <CharCountedTextarea
                  label={`Texto ${i + 1}${i === 0 ? " · obligatorio" : " · opcional"}`}
                  value={t}
                  onChange={(v) => setAdTexts(updateAt(adTexts, i, v))}
                  max={
                    isSpark ? TIKTOK_LIMITS.spark_caption.max : TIKTOK_LIMITS.ad_text.max
                  }
                  required={i === 0}
                  placeholder="Hipoteca fija sin comisiones de apertura. Respuesta en 48 horas."
                />
              </RowWithRemove>
            ))}
          </Section>
        )}

        {isTikTok && (
          <Section title={strategy === "tiktok_carousel" ? "Música · obligatoria" : "Música (opcional)"}>
            <Controlled
              label={
                strategy === "tiktok_carousel"
                  ? "Nombre de la pista (suena en bucle sobre las imágenes)"
                  : "Nombre de la pista (si va vacío se muestra «Promoted music»)"
              }
              value={musicName}
              onChange={setMusicName}
              maxLength={TIKTOK_LIMITS.music_name.max}
              required={strategy === "tiktok_carousel"}
              placeholder={
                strategy === "tiktok_carousel"
                  ? "Upbeat Pop · Commercial Music Library"
                  : "Sonido original · tu marca"
              }
            />
            <p
              style={{
                color: "rgba(var(--fg),0.55)",
                fontSize: 12,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {strategy === "tiktok_carousel"
                ? "El carousel exige música (mínimo 2 segundos, en bucle): de la Commercial Music Library o subida propia (mp3/wav/m4a/flac, hasta 10 MB)."
                : "En vídeo la música va embebida en el propio archivo; aquí solo se indica el nombre que aparece en la fila inferior del anuncio."}
            </p>
          </Section>
        )}

        {strategy === "shopping" && (
          <Section title="Producto (feed de Merchant Center)">
            <CharCountedInput
              label="Id del producto (usa el SKU)"
              value={productId}
              onChange={setProductId}
              max={50}
              required
              placeholder="SKU-TRAIL-GTX-42-AZ"
            />
            <CharCountedInput
              label="Título del producto"
              value={productTitle}
              onChange={setProductTitle}
              max={150}
              required
              placeholder="Zapatillas trail Hombre GTX 42 azul"
            />
            <ControlledTextArea
              label="Descripción del producto"
              rows={3}
              value={productDescription}
              onChange={setProductDescription}
              placeholder="Zapatillas de trail running con membrana impermeable…"
            />
            <Controlled
              label="Precio con divisa (ISO 4217)"
              value={productPrice}
              onChange={setProductPrice}
              required
              placeholder="89.95 EUR"
            />
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>Disponibilidad</Label>
              <select
                value={productAvailability}
                onChange={(e) => setProductAvailability(e.currentTarget.value)}
                style={inputStyle}
              >
                <option value="in_stock">En stock</option>
                <option value="out_of_stock">Agotado</option>
                <option value="preorder">Reserva previa</option>
                <option value="backorder">Bajo pedido</option>
              </select>
            </label>
            <CharCountedInput
              label="Marca (obligatoria en productos nuevos salvo libros, películas y música)"
              value={productBrand}
              onChange={setProductBrand}
              max={70}
              placeholder="Salomon"
            />
            <Controlled
              label="GTIN (8 a 14 dígitos, muy recomendado si existe)"
              value={productGtin}
              onChange={setProductGtin}
              placeholder="0613919012345"
            />
            <CharCountedInput
              label="MPN (obligatorio en el feed real solo si no hay GTIN)"
              value={productMpn}
              onChange={setProductMpn}
              max={70}
              placeholder="GTX-42-AZ"
            />
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>Condición (solo si no es nuevo)</Label>
              <select
                value={productCondition}
                onChange={(e) => setProductCondition(e.currentTarget.value)}
                style={inputStyle}
              >
                <option value="">nuevo (por defecto)</option>
                <option value="refurbished">reacondicionado</option>
                <option value="used">usado</option>
              </select>
            </label>
          </Section>
        )}

        {strategy !== "shopping" && strategy !== "meta_carousel" && !isTikTok && (
        <Section
          title={
            strategy === "display"
              ? `Titulares cortos · ${headlines.length} / 5`
              : `Titulares · ${headlines.length} / ${headlinesCap}`
          }
          onAdd={addHeadline}
          addLabel="+ Añadir titular"
          canAdd={headlines.length < headlinesCap}
        >
          {isMeta && (
            <p
              style={{
                color: "rgba(var(--fg),0.55)",
                fontSize: 12,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              El titular aparece junto al botón CTA, bajo la creatividad.
              {metaVertical
                ? " En Stories, Reels y Estados NO se muestra: el perfil solo verá el texto principal y la creatividad."
                : " Visibles ~40 caracteres (27 en Feed de Facebook); el resto se trunca."}
              {strategy === "meta_single"
                ? " Cada perfil ve UNA variante muestreada."
                : ""}
            </p>
          )}
          {headlines.map((h, i) => (
            <RowWithRemove
              key={i}
              canRemove={headlines.length > 1}
              onRemove={() => removeHeadline(i)}
            >
              <CharCountedInput
                label={`Titular ${i + 1}${i === 0 ? " · obligatorio" : " · opcional"}`}
                value={h}
                onChange={(v) => setHeadlines(updateAt(headlines, i, v))}
                max={headlineMax}
                recommended={isMeta ? META_LIMITS.headline.recommended : undefined}
                required={i === 0}
                placeholder={
                  isMeta ? "Hipoteca fija sin comisiones" : "Hipoteca fija al 2,90% TAE"
                }
              />
            </RowWithRemove>
          ))}
        </Section>
        )}

        {usesLongHeadline && (
          <Section title={strategy === "video" ? "Titular largo (opcional)" : "Titular largo"}>
            <CharCountedInput
              label={
                strategy === "video"
                  ? "Titular largo (solo se muestra en anuncios in-feed)"
                  : "Titular largo (visible en banners grandes y feeds)"
              }
              value={longHeadline}
              onChange={setLongHeadline}
              max={90}
              required={strategy !== "video"}
              placeholder="Hipoteca fija al 2,90% TAE sin comisiones de apertura"
            />
          </Section>
        )}

        {strategy !== "shopping" &&
          strategy !== "meta_carousel" &&
          !isTikTok &&
          !(isMeta && metaVertical) && (
        <Section
          title={`Descripciones · ${descriptions.length} / ${descriptionsCap}${isMeta ? " (opcional)" : ""}`}
          onAdd={addDescription}
          addLabel="+ Añadir descripción"
          canAdd={descriptions.length < descriptionsCap}
        >
          {isMeta && (
            <p
              style={{
                color: "rgba(var(--fg),0.55)",
                fontSize: 12,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              La descripción del enlace solo se muestra en algunos placements
              (bajo el titular, cuando Meta estima que hay espacio). Visibles
              ~30 caracteres. Puedes dejarla vacía.
            </p>
          )}
          {descriptions.map((d, i) => (
            <RowWithRemove
              key={i}
              canRemove={
                descriptions.length >
                (strategy === "display" || strategy === "video" || isMeta ? 1 : 2)
              }
              onRemove={() => removeDescription(i)}
            >
              <CharCountedTextarea
                label={`Descripción ${i + 1}`}
                value={d}
                onChange={(v) => setDescriptions(updateAt(descriptions, i, v))}
                max={isMeta ? META_LIMITS.description.max : DESCRIPTION_MAX}
                recommended={isMeta ? META_LIMITS.description.recommended : undefined}
                required={!isMeta && (i === 0 || (strategy === "pmax" && i < 2))}
                placeholder="Sin comisiones de apertura. Decisión en 48h."
              />
            </RowWithRemove>
          ))}
        </Section>
        )}

        {(assetStrategy ||
          strategy === "video" ||
          strategy === "search" ||
          isMeta ||
          isTikTok) && (
          <Section title="CTA">
            {strategy === "video" ? (
              <CharCountedInput
                label="Texto del botón CTA (opcional; Google admite máximo 10 caracteres en Video)"
                value={cta}
                onChange={setCta}
                max={10}
                placeholder="Ver oferta"
              />
            ) : isTikTok ? (
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Label>
                  Botón CTA (lista cerrada de TikTok; aparece bajo el caption a los pocos segundos)
                </Label>
                <select
                  value={cta}
                  onChange={(e) => setCta(e.currentTarget.value)}
                  required
                  style={inputStyle}
                >
                  <option value="">elige el botón (obligatorio)</option>
                  {TIKTOK_CTA_VALUES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            ) : isMeta ? (
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Label>
                  Botón CTA (lista cerrada de Meta; el botón está siempre presente)
                </Label>
                <select
                  value={cta}
                  onChange={(e) => setCta(e.currentTarget.value)}
                  required
                  style={inputStyle}
                >
                  <option value="">elige el botón (obligatorio)</option>
                  {META_CTA_VALUES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Label>Botón Call To Action (visible en el anuncio)</Label>
                <select
                  value={cta}
                  onChange={(e) => setCta(e.currentTarget.value)}
                  style={inputStyle}
                >
                  <option value="">
                    {strategy === "pmax" || strategy === "demand_gen"
                      ? "elige una CTA (obligatoria)"
                      : "sin CTA"}
                  </option>
                  {CTA_VALUES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </Section>
        )}

        <Section
          title={
            strategy === "display"
              ? `Imágenes y vídeos · ${creatives.length}`
              : strategy === "meta_carousel"
                ? `Tarjetas · ${creatives.filter((c) => c.role === "card").length} / 10`
                : strategy === "tiktok_carousel"
                  ? `Tarjetas · ${creatives.filter((c) => c.role === "card").length} / 35`
                  : strategy === "meta_collection"
                    ? `Portada y productos · ${creatives.length}`
                    : strategy === "meta_single" ||
                        strategy === "tiktok_video" ||
                        strategy === "tiktok_spark"
                      ? `Creatividad · ${creatives.length}`
                      : `Creatividades · ${creatives.length} / 6 (opcional)`
          }
          onAdd={() =>
            addCreative(
              strategy === "video"
                ? "youtube"
                : strategy === "tiktok_video" || strategy === "tiktok_spark"
                  ? creatives.some((c) => c.kind === "video" || c.kind === "youtube")
                    ? "image"
                    : "video"
                  : "image",
              strategy === "meta_carousel" || strategy === "tiktok_carousel"
                ? "card"
                : strategy === "meta_collection"
                  ? creatives.some((c) => c.role === "cover")
                    ? "card"
                    : "cover"
                  : (strategy === "tiktok_video" || strategy === "tiktok_spark") &&
                      creatives.some((c) => c.kind === "video" || c.kind === "youtube")
                    ? "logo_square"
                    : "generic",
            )
          }
          addLabel={
            strategy === "meta_carousel" || strategy === "tiktok_carousel"
              ? "+ Añadir tarjeta"
              : "+ Añadir"
          }
          canAdd={
            strategy === "tiktok_carousel"
              ? creatives.filter((c) => c.role === "card").length <
                TIKTOK_LIMITS.carousel_images.max
              : creatives.length < 20
          }
        >
          {strategy === "tiktok_video" || strategy === "tiktok_spark" ? (
            <p style={{ color: "rgba(var(--fg),0.55)", fontSize: 13, margin: 0, lineHeight: 1.55 }}>
              {strategy === "tiktok_spark" ? "El Spark Ad" : "El vídeo in-feed"} exige{" "}
              <strong>1 vídeo con miniatura</strong> (el perfil calibrado evalúa la
              miniatura, los modelos no procesan vídeo). Spec: 9:16 vertical
              recomendado (mínimo 540x960; admite 1:1 y 16:9), 5-60 segundos
              (mejor rendimiento 21-34s), máximo 500 MB. La interfaz tapa los
              bordes: deja libre ~13% superior, ~25% inferior y ~13% del lateral
              derecho. Opcional: una imagen con rol «Foto de perfil» (98x98, 1:1)
              como avatar de la cuenta.
            </p>
          ) : strategy === "tiktok_carousel" ? (
            <p style={{ color: "rgba(var(--fg),0.55)", fontSize: 13, margin: 0, lineHeight: 1.55 }}>
              El carousel lleva <strong>de 2 a 35 imágenes</strong> (mejor CTR con 3 o
              con 7-9), JPG/PNG, vertical 720x1280 recomendado (otros ratios
              recortan en negro). Pasan solas en orden y se pueden deslizar; un
              solo caption, una música y un botón CTA para todas. El perfil
              calibrado ve las 4 primeras imágenes.
            </p>
          ) : strategy === "meta_single" ? (
            <p style={{ color: "rgba(var(--fg),0.55)", fontSize: 13, margin: 0, lineHeight: 1.55 }}>
              El anuncio único exige <strong>1 creatividad</strong>: imagen (JPG/PNG) o
              vídeo con miniatura (el perfil calibrado evalúa la miniatura, los
              modelos no procesan vídeo). Ratio según placement:{" "}
              {metaVertical
                ? "9:16 a pantalla completa (deja libre el 14% superior, el 35% inferior y el 6% lateral: ahí va la interfaz)"
                : "1:1 o 4:5 (recomendado 1440x1800)"}
              .
            </p>
          ) : strategy === "meta_carousel" ? (
            <p style={{ color: "rgba(var(--fg),0.55)", fontSize: 13, margin: 0, lineHeight: 1.55 }}>
              La secuencia lleva <strong>de 2 a 10 tarjetas</strong>, cada una con su
              imagen 1:1 (mínimo 1080x1080), su titular (45c recomendados) y su
              descripción opcional (18c).
              {metaPlacement === "threads_feed"
                ? " En Threads las tarjetas solo pueden ser imágenes."
                : " Puedes mezclar imagen y vídeo (con miniatura)."}{" "}
              El perfil calibrado ve las 4 primeras imágenes y la lista completa de titulares.
            </p>
          ) : strategy === "meta_collection" ? (
            <p style={{ color: "rgba(var(--fg),0.55)", fontSize: 13, margin: 0, lineHeight: 1.55 }}>
              La colección exige <strong>1 portada</strong> (imagen o vídeo con miniatura,
              rol «Portada») y <strong>al menos 4 tiles de producto</strong> (rol «Tarjeta»,
              con el nombre del producto como titular y el precio en la
              descripción). Las imágenes de producto se recortan a 1:1.
            </p>
          ) : strategy === "video" ? (
            <p style={{ color: "rgba(var(--fg),0.55)", fontSize: 13, margin: 0, lineHeight: 1.55 }}>
              Video exige <strong>1 vídeo de YouTube</strong> (o subido); duración
              recomendada 10 segundos o más. El perfil calibrado evalúa su miniatura
              junto al copy (los modelos no procesan vídeo).
            </p>
          ) : strategy === "shopping" ? (
            <p style={{ color: "rgba(var(--fg),0.55)", fontSize: 13, margin: 0, lineHeight: 1.55 }}>
              Shopping exige <strong>la imagen principal del producto</strong> (mínimo
              500x500 px, sin marcas de agua ni texto promocional). Puedes añadir
              imágenes adicionales.
            </p>
          ) : strategy === "search" ? (
            <p style={{ color: "rgba(var(--fg),0.55)", fontSize: 13, margin: 0, lineHeight: 1.55 }}>
              Search exige <strong>1 logo (1:1)</strong> (bloque Business information de la
              spec). La imagen square (1:1) y la horizontal (1.91:1) son opcionales.
            </p>
          ) : assetStrategy ? (
            <p style={{ color: "rgba(var(--fg),0.55)", fontSize: 13, margin: 0, lineHeight: 1.55 }}>
              {STRATEGY_LABEL[strategy]} exige al menos <strong>1 imagen landscape (1.91:1)</strong>,
              <strong> 1 imagen square (1:1)</strong> y <strong>1 logo square (1:1)</strong>.
              Recomendado: añade portrait (4:5) para mobile y vídeo YouTube si lo tienes
              {strategy === "pmax" ? " (sin vídeo, Google autogenera uno)" : ""}.
            </p>
          ) : (
            creatives.length === 0 && (
              <p style={{ color: "rgba(var(--fg),0.55)", fontSize: 13, margin: 0 }}>
                Imagen, vídeo o YouTube. El perfil calibrado ve la imagen
                directamente o el thumbnail si es vídeo / YouTube (los modelos
                actuales no procesan vídeo).
              </p>
            )
          )}
          {creatives.map((c, i) => (
            <fieldset key={i} style={fieldsetStyle}>
              <legend className="mono" style={legendStyle}>
                {strategy === "meta_carousel" || strategy === "tiktok_carousel"
                  ? c.role === "logo_square"
                    ? "Foto de perfil"
                    : `Tarjeta ${i + 1}`
                  : strategy === "meta_collection"
                    ? c.role === "cover"
                      ? "Portada"
                      : `Producto ${i + 1}`
                    : isTikTok && c.role === "logo_square"
                      ? "Foto de perfil"
                      : `Creatividad ${i + 1}`}
              </legend>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <RemoveIconButton onClick={() => removeCreative(i)} />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ToggleButton
                  active={c.kind === "image"}
                  onClick={() => changeCreativeKind(i, "image")}
                  label="Imagen"
                />
                {!(isMeta && metaPlacement === "threads_feed" && c.role === "card") &&
                  !(strategy === "tiktok_carousel" && c.role === "card") &&
                  !(isTikTok && c.role === "logo_square") && (
                  <ToggleButton
                    active={c.kind === "video"}
                    onClick={() => changeCreativeKind(i, "video")}
                    label="Vídeo"
                  />
                )}
                {!isMeta &&
                  !(strategy === "tiktok_carousel" && c.role === "card") &&
                  !(isTikTok && c.role === "logo_square") && (
                  <ToggleButton
                    active={c.kind === "youtube"}
                    onClick={() => changeCreativeKind(i, "youtube")}
                    label={isTikTok ? "YouTube (miniatura)" : "YouTube"}
                  />
                )}
              </div>
              {isTikTok && (
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <Label>Rol en el anuncio</Label>
                  <select
                    value={c.role}
                    onChange={(e) => {
                      const role = e.currentTarget.value as CreativeRole;
                      // El avatar y las tarjetas son imágenes: al cambiar a
                      // un rol de imagen se resetea el medio de vídeo.
                      const needsImage =
                        role === "logo_square" || strategy === "tiktok_carousel";
                      patchCreative(
                        i,
                        needsImage && c.kind !== "image"
                          ? { ...resetMedia(c, "image"), role }
                          : { role },
                      );
                    }}
                    style={inputStyle}
                  >
                    {strategy === "tiktok_carousel" ? (
                      <option value="card">Tarjeta del carousel (imagen)</option>
                    ) : (
                      <option value="generic">Vídeo del anuncio</option>
                    )}
                    <option value="logo_square">Foto de perfil (98x98, 1:1)</option>
                  </select>
                </label>
              )}
              {strategy === "meta_collection" && (
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <Label>Rol en la colección</Label>
                  <select
                    value={c.role === "cover" ? "cover" : "card"}
                    onChange={(e) =>
                      patchCreative(i, { role: e.currentTarget.value as CreativeRole })
                    }
                    style={inputStyle}
                  >
                    <option value="cover">Portada (1 obligatoria)</option>
                    <option value="card">Tile de producto (mínimo 4)</option>
                  </select>
                </label>
              )}
              {isMeta && c.role === "card" && (
                <>
                  <CharCountedInput
                    label={
                      strategy === "meta_collection"
                        ? "Nombre del producto"
                        : "Titular de la tarjeta · obligatorio"
                    }
                    value={c.card_headline}
                    onChange={(v) => patchCreative(i, { card_headline: v })}
                    max={META_LIMITS.card_headline.max}
                    recommended={META_LIMITS.card_headline.recommended}
                    required
                    placeholder={
                      strategy === "meta_collection"
                        ? "Zapatillas trail GTX azul"
                        : "Hipoteca fija sin comisiones"
                    }
                  />
                  <CharCountedInput
                    label={
                      strategy === "meta_collection"
                        ? "Precio / detalle (opcional)"
                        : "Descripción de la tarjeta (opcional)"
                    }
                    value={c.card_description}
                    onChange={(v) => patchCreative(i, { card_description: v })}
                    max={META_LIMITS.card_description.max}
                    recommended={META_LIMITS.card_description.recommended}
                    placeholder={
                      strategy === "meta_collection" ? "89,95 EUR" : "Desde 2,90% TAE"
                    }
                  />
                </>
              )}
              {showsBusinessAssets && (
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <Label>Rol en el anuncio</Label>
                  <select
                    value={c.role}
                    onChange={(e) =>
                      patchCreative(i, { role: e.currentTarget.value as CreativeRole })
                    }
                    style={inputStyle}
                  >
                    <option value="generic">{CREATIVE_ROLE_LABEL.generic}</option>
                    <option value="landscape_image">
                      {CREATIVE_ROLE_LABEL.landscape_image} · obligatorio
                    </option>
                    <option value="square_image">
                      {CREATIVE_ROLE_LABEL.square_image} · obligatorio
                    </option>
                    <option value="portrait_image">
                      {CREATIVE_ROLE_LABEL.portrait_image}
                    </option>
                    <option value="logo_square">
                      {CREATIVE_ROLE_LABEL.logo_square} · obligatorio
                    </option>
                    <option value="logo_landscape">
                      {CREATIVE_ROLE_LABEL.logo_landscape}
                    </option>
                    <option value="video_youtube">
                      {CREATIVE_ROLE_LABEL.video_youtube}
                    </option>
                  </select>
                </label>
              )}

              {c.kind === "image" && (
                <CreativeImageInput
                  creative={c}
                  onUrl={(v) => patchCreative(i, { url: v, upload_data: "" })}
                  onFile={(e) => onCreativeFile(i, e)}
                />
              )}
              {c.kind === "video" && (
                <CreativeVideoInput
                  creative={c}
                  onUrl={(v) => patchCreative(i, { url: v, upload_data: "" })}
                  onFile={(e) => onCreativeFile(i, e)}
                  onThumbnail={(v) => patchCreative(i, { thumbnail_url: v || null })}
                />
              )}
              {c.kind === "youtube" && (
                <CreativeYouTubeInput
                  creative={c}
                  onUrl={(v) => setCreativeYouTubeUrl(i, v)}
                />
              )}

              <Controlled
                label="Etiqueta interna (opcional)"
                value={c.label}
                onChange={(v) => patchCreative(i, { label: v })}
                placeholder="Banner 300x250 v1"
              />
            </fieldset>
          ))}
        </Section>

        {state.error && (
          <div
            role="alert"
            style={{
              padding: 16,
              border: "1px solid var(--error-500)",
              borderRadius: "var(--radius-md)",
              color: "rgba(var(--fg),0.9)",
              background: "rgba(180,35,24,0.12)",
              fontSize: 14,
            }}
          >
            {state.error}
          </div>
        )}

        {strategy === "search" && (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              lineHeight: 1.55,
              color: "rgba(var(--fg),0.55)",
            }}
          >
            Search (RSA) exige: 1 a 15 titulares (máx. 30c), 1 a 4 descripciones
            (máx. 90c), nombre de empresa (máx. 25c) y 1 logo (1:1). La CTA es
            opcional (automatizada).
          </p>
        )}

        {strategy === "display" && (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              lineHeight: 1.55,
              color: "rgba(var(--fg),0.55)",
            }}
          >
            Display exige: nombre de empresa (máx. 25c), titular largo (máx. 90c) y
            creatividades con al menos 1 imagen landscape (1.91:1), 1 imagen square (1:1)
            y 1 logo square (1:1). Máximo 5 titulares cortos.
          </p>
        )}

        {strategy === "pmax" && (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              lineHeight: 1.55,
              color: "rgba(var(--fg),0.55)",
            }}
          >
            Performance Max exige: mínimo 3 titulares (al menos uno de 15c o menos),
            titular largo (máx. 90c), 2 descripciones, nombre de empresa (máx. 25c),
            CTA y creatividades con al menos 1 imagen landscape (1.91:1), 1 imagen
            square (1:1) y 1 logo square (1:1).
          </p>
        )}

        {strategy === "demand_gen" && (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              lineHeight: 1.55,
              color: "rgba(var(--fg),0.55)",
            }}
          >
            Demand Gen exige: 1 a 5 titulares (máx. 40c, al menos uno de 30c o menos),
            1 a 5 descripciones, nombre de empresa (máx. 25c), CTA y creatividades con
            al menos 1 imagen landscape (1.91:1), 1 imagen square (1:1) y 1 logo (1:1).
            La imagen vertical (4:5) es opcional.
          </p>
        )}

        {strategy === "video" && (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              lineHeight: 1.55,
              color: "rgba(var(--fg),0.55)",
            }}
          >
            Video lleva: 1 vídeo de YouTube (duración recomendada 10s o más),
            1 titular (máx. 30c) y 1 descripción (máx. 90c). Opcionales: titular
            largo (máx. 90c, solo in-feed) y CTA de máximo 10 caracteres.
          </p>
        )}

        {strategy === "shopping" && (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              lineHeight: 1.55,
              color: "rgba(var(--fg),0.55)",
            }}
          >
            Shopping exige: producto completo (título máx. 150c, descripción, precio
            con divisa, disponibilidad), al menos 1 búsqueda de producto y la imagen
            principal. La URL final es el link del producto; no hay titulares ni
            descripciones redactados (la ficha la genera Google desde el feed).
          </p>
        )}

        {strategy === "meta_single" && (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              lineHeight: 1.55,
              color: "rgba(var(--fg),0.55)",
            }}
          >
            El anuncio único de Meta exige: nombre de página, 1 a 5 textos
            principales (se trunca con «Ver más» hacia los 125c), 1 a 5 titulares
            (~40c visibles), botón CTA de la lista y 1 creatividad. Las
            descripciones de enlace son opcionales. Cada perfil ve UNA combinación
            muestreada, como sirve Meta el flexible ad format.
          </p>
        )}

        {strategy === "meta_carousel" && (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              lineHeight: 1.55,
              color: "rgba(var(--fg),0.55)",
            }}
          >
            La secuencia de Meta exige: nombre de página, 1 a 5 textos principales
            (80c recomendados), botón CTA y de 2 a 10 tarjetas, cada una con su
            imagen 1:1 y su titular (45c recomendados). La descripción por tarjeta
            (18c) es opcional.
          </p>
        )}

        {strategy === "meta_collection" && (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              lineHeight: 1.55,
              color: "rgba(var(--fg),0.55)",
            }}
          >
            La colección de Meta exige: nombre de página, 1 a 5 textos principales,
            1 titular (40c visibles), botón CTA, 1 portada y al menos 4 tiles de
            producto. Solo placements móviles: feeds y Stories de Instagram.
          </p>
        )}

        {strategy === "tiktok_video" && (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              lineHeight: 1.55,
              color: "rgba(var(--fg),0.55)",
            }}
          >
            El vídeo in-feed de TikTok exige: nombre visible (40c técnicos, ~20
            visibles), 1 a 5 textos de anuncio (100c, sin emojis ni «#»), botón
            CTA de la lista y 1 vídeo con miniatura (9:16 recomendado). El
            @usuario y la foto de perfil son opcionales.
          </p>
        )}

        {strategy === "tiktok_carousel" && (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              lineHeight: 1.55,
              color: "rgba(var(--fg),0.55)",
            }}
          >
            El carousel de TikTok exige: nombre visible, 1 a 5 textos de anuncio
            (100c, sin emojis ni «#»), botón CTA, música (suena en bucle) y de 2
            a 35 imágenes (vertical 720x1280 recomendado).
          </p>
        )}

        {strategy === "tiktok_spark" && (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              lineHeight: 1.55,
              color: "rgba(var(--fg),0.55)",
            }}
          >
            El Spark Ad exige: la cuenta del post (@usuario y nombre visible), el
            caption del post (admite emojis y hashtags, máx. 150c), botón CTA y el
            vídeo orgánico con miniatura. En la cuenta real necesitarías el código
            de autorización del creador (7 a 365 días).
          </p>
        )}

        <Submit />
        </>
        )}
      </form>

      {/* Preview en vivo */}
      <aside
        style={{
          position: "sticky",
          top: 24,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--accent-text)",
          }}
        >
          Vista previa ·{" "}
          {isMeta
            ? `${STRATEGY_LABEL[strategy]} · ${META_PLACEMENT_LABEL[metaPlacement]}`
            : isTikTok
              ? `${STRATEGY_LABEL[strategy]} · Feed «Para ti»`
              : STRATEGY_LABEL[strategy]}
        </span>
        {isMeta ? (
          <MetaAdPreview
            strategy={strategy}
            placement={metaPlacement}
            companyName={companyName}
            primaryText={primaryTexts.find(Boolean) ?? ""}
            previewHeadline={headlines[0] ?? ""}
            previewDescription={descriptions[0] ?? ""}
            cta={cta}
            displayLink={displayLink}
            creatives={creatives}
            finalUrl={finalUrl}
          />
        ) : isTikTok ? (
          <TikTokAdPreview
            strategy={strategy}
            companyName={companyName}
            identityHandle={identityHandle}
            adText={adTexts.find(Boolean) ?? ""}
            musicName={musicName}
            cta={cta}
            creatives={creatives}
          />
        ) : strategy === "shopping" ? (
          <ShoppingAdPreview
            title={productTitle}
            price={productPrice}
            brand={productBrand}
            availability={productAvailability}
            creatives={creatives}
            finalUrl={finalUrl}
          />
        ) : strategy === "video" ? (
          <VideoAdPreview
            previewHeadline={previewHeadline}
            previewDescription={previewDescription}
            cta={cta}
            creatives={creatives}
            finalUrl={finalUrl}
          />
        ) : strategy === "demand_gen" ? (
          <FeedAdPreview
            companyName={companyName}
            previewHeadline={previewHeadline}
            previewDescription={previewDescription}
            cta={cta}
            creatives={creatives}
            finalUrl={finalUrl}
          />
        ) : assetStrategy ? (
          <>
            <DisplayAdPreview
              companyName={companyName}
              longHeadline={longHeadline}
              previewHeadline={previewHeadline}
              previewDescription={previewDescription}
              cta={cta}
              creatives={creatives}
              finalUrl={finalUrl}
            />
            {strategy === "pmax" && (
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  lineHeight: 1.5,
                  color: "rgba(var(--fg),0.45)",
                }}
              >
                Performance Max combina los recursos automáticamente: esta es una
                de las composiciones posibles.
              </p>
            )}
          </>
        ) : (
          <SearchAdPreview
            finalUrl={finalUrl}
            companyName={companyName}
            creatives={creatives}
            previewHeadline={previewHeadline}
            previewDescription={previewDescription}
          />
        )}

        {(headlines.filter(Boolean).length > 1 ||
          descriptions.filter(Boolean).length > 1 ||
          (isMeta && primaryTexts.filter(Boolean).length > 1) ||
          (isTikTok && adTexts.filter(Boolean).length > 1)) && (
          <div
            style={{
              border: "1px solid rgba(var(--fg),0.08)",
              borderRadius: "var(--radius-md)",
              background: "rgba(var(--fg),0.02)",
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {isTikTok && adTexts.filter(Boolean).length > 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.22em",
                    color: "rgba(var(--fg),0.55)",
                    textTransform: "uppercase",
                  }}
                >
                  Otras variantes del texto
                </span>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {adTexts.slice(1).map((t, i) =>
                    t ? (
                      <li
                        key={i}
                        style={{
                          color: "rgba(var(--fg),0.7)",
                          fontSize: 12,
                          lineHeight: 1.55,
                        }}
                      >
                        T{i + 2}: {t}
                      </li>
                    ) : null,
                  )}
                </ul>
              </div>
            )}
            {isMeta && primaryTexts.filter(Boolean).length > 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.22em",
                    color: "rgba(var(--fg),0.55)",
                    textTransform: "uppercase",
                  }}
                >
                  Otros textos principales
                </span>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {primaryTexts.slice(1).map((t, i) =>
                    t ? (
                      <li
                        key={i}
                        style={{
                          color: "rgba(var(--fg),0.7)",
                          fontSize: 12,
                          lineHeight: 1.55,
                        }}
                      >
                        T{i + 2}: {t.length > 140 ? `${t.slice(0, 140)}…` : t}
                      </li>
                    ) : null,
                  )}
                </ul>
              </div>
            )}
            {headlines.filter(Boolean).length > 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.22em",
                    color: "rgba(var(--fg),0.55)",
                    textTransform: "uppercase",
                  }}
                >
                  Otros titulares
                </span>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {headlines.slice(1).map((h, i) =>
                    h ? (
                      <li
                        key={i}
                        style={{
                          color: "var(--serp-link)", opacity: 0.85,
                          fontSize: 13,
                          lineHeight: 1.35,
                        }}
                      >
                        H{i + 2}: {h}
                      </li>
                    ) : null,
                  )}
                </ul>
              </div>
            )}
            {descriptions.filter(Boolean).length > 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.22em",
                    color: "rgba(var(--fg),0.55)",
                    textTransform: "uppercase",
                  }}
                >
                  Otras descripciones
                </span>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {descriptions.slice(1).map((d, i) =>
                    d ? (
                      <li
                        key={i}
                        style={{
                          color: "rgba(var(--fg),0.7)",
                          fontSize: 12,
                          lineHeight: 1.55,
                        }}
                      >
                        D{i + 2}: {d}
                      </li>
                    ) : null,
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {previewImage && (
          <div
            style={{
              border: "1px solid rgba(var(--fg),0.08)",
              borderRadius: "var(--radius-md)",
              background: "rgba(var(--fg),0.02)",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span
              className="mono"
              style={{ fontSize: 10, letterSpacing: "0.22em", color: "rgba(var(--fg),0.55)" }}
            >
              Landing
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt="Landing"
              style={{
                width: "100%",
                maxHeight: 200,
                objectFit: "cover",
                borderRadius: "var(--radius-sm)",
              }}
            />
          </div>
        )}

        {creatives.length > 0 && (
          <div
            style={{
              border: "1px solid rgba(var(--fg),0.08)",
              borderRadius: "var(--radius-md)",
              background: "rgba(var(--fg),0.02)",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span
              className="mono"
              style={{ fontSize: 10, letterSpacing: "0.22em", color: "rgba(var(--fg),0.55)" }}
            >
              Creatividades · {creatives.length}
            </span>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
                gap: 6,
              }}
            >
              {creatives.map((c, i) => (
                <CreativeThumb key={i} c={c} />
              ))}
            </div>
          </div>
        )}

      </aside>
    </div>
  );
}

// ============================================================
// Subcomponentes locales
// ============================================================

function CreativeImageInput({
  creative,
  onUrl,
  onFile,
}: {
  creative: Creative;
  onUrl: (v: string) => void;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Controlled
        label="URL de la imagen (opcional si subes archivo)"
        value={creative.url}
        onChange={onUrl}
        placeholder="https://cdn.miweb.com/banner-300x250.png"
      />
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Label>O sube un archivo</Label>
        <input
          type="file"
          accept="image/*"
          onChange={onFile}
          style={inputStyle}
        />
      </label>
      <Preview src={creative.upload_data || creative.url} />
    </div>
  );
}

function CreativeVideoInput({
  creative,
  onUrl,
  onFile,
  onThumbnail,
}: {
  creative: Creative;
  onUrl: (v: string) => void;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onThumbnail: (v: string) => void;
}) {
  const src = creative.upload_data || creative.url;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Controlled
        label="URL del vídeo (opcional si subes archivo)"
        value={creative.url}
        onChange={onUrl}
        placeholder="https://cdn.miweb.com/spot-15s.mp4"
      />
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Label>O sube un archivo de vídeo</Label>
        <input type="file" accept="video/*" onChange={onFile} style={inputStyle} />
      </label>
      <Controlled
        label="Thumbnail (URL, opcional · lo verá el modelo)"
        value={creative.thumbnail_url ?? ""}
        onChange={onThumbnail}
        placeholder="https://cdn.miweb.com/spot-thumb.jpg"
      />
      <p style={{ color: "rgba(var(--fg),0.55)", fontSize: 12, lineHeight: 1.55, margin: 0 }}>
        Los modelos actuales no procesan vídeo. Si subes un .mp4 o pones una URL,
        sube también un thumbnail estático (jpg/png) para que el perfil calibrado
        pueda &quot;verlo&quot;. Sin thumbnail la creatividad se ignora.
      </p>
      {src && (
        /* eslint-disable-next-line jsx-a11y/media-has-caption */
        <video src={src} controls style={previewBox} />
      )}
    </div>
  );
}

function CreativeYouTubeInput({
  creative,
  onUrl,
}: {
  creative: Creative;
  onUrl: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Controlled
        label="URL de YouTube"
        value={creative.url}
        onChange={onUrl}
        placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      />
      {creative.youtube_id ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <iframe
            title={`YouTube ${creative.youtube_id}`}
            src={`https://www.youtube.com/embed/${creative.youtube_id}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            style={{
              width: "100%",
              aspectRatio: "16 / 9",
              border: 0,
              borderRadius: "var(--radius-sm)",
            }}
          />
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.18em",
              color: "rgba(var(--fg),0.55)",
            }}
          >
            Thumbnail enviado al modelo · {creative.youtube_id}
          </span>
        </div>
      ) : (
        creative.url && (
          <span style={{ color: "var(--warning-500)", fontSize: 12 }}>
            No reconozco el ID de YouTube en esa URL. Acepta formatos
            youtube.com/watch?v=, youtu.be/ y youtube.com/shorts/.
          </span>
        )
      )}
    </div>
  );
}

function Preview({ src }: { src: string }) {
  if (!src) return null;
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={src} alt="Preview" style={previewBox} />
  );
}

function Section({
  title,
  children,
  onAdd,
  addLabel,
  canAdd,
}: {
  title: string;
  children: React.ReactNode;
  onAdd?: () => void;
  addLabel?: string;
  canAdd?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "var(--accent-text)",
          }}
        >
          {title}
        </span>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            disabled={canAdd === false}
            className="btn-pill"
            style={{ fontSize: 11 }}
          >
            {addLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function RowWithRemove({
  children,
  canRemove,
  onRemove,
}: {
  children: React.ReactNode;
  canRemove: boolean;
  onRemove: () => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: canRemove ? "1fr auto" : "1fr",
        gap: 8,
        alignItems: "end",
      }}
    >
      <div>{children}</div>
      {canRemove && (
        <RemoveIconButton onClick={onRemove} style={{ marginBottom: 6 }} />
      )}
    </div>
  );
}

function Controlled(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Label>{props.label}</Label>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value)}
        placeholder={props.placeholder}
        required={props.required}
        maxLength={props.maxLength}
        style={inputStyle}
      />
    </label>
  );
}

function ControlledTextArea(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Label>{props.label}</Label>
      <textarea
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value)}
        rows={props.rows ?? 3}
        placeholder={props.placeholder}
        required={props.required}
        style={{ ...inputStyle, fontFamily: "var(--font-sans)", lineHeight: 1.5 }}
      />
    </label>
  );
}

/**
 * Contador con dos umbrales: `max` es el límite duro del input (técnico de
 * la plataforma) y `recommended` el visible antes de truncar (Meta): al
 * superarlo el contador avisa en ámbar sin bloquear el envío.
 */
function charCountColor(len: number, max: number, recommended?: number): string {
  if (len > max) return "var(--error-500)";
  if (recommended !== undefined && len > recommended) return "var(--warning-text)";
  return "rgba(var(--fg),0.45)";
}

function CharCountedInput(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  recommended?: number;
  required?: boolean;
  placeholder?: string;
}) {
  const overRec =
    props.recommended !== undefined && props.value.length > props.recommended;
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <Label>{props.label}</Label>
        <span
          className="mono"
          title={
            overRec
              ? `Por encima de los ${props.recommended} caracteres recomendados: la plataforma lo trunca visualmente.`
              : undefined
          }
          style={{
            fontSize: 10,
            color: charCountColor(props.value.length, props.max, props.recommended),
          }}
        >
          {props.value.length}/
          {props.recommended !== undefined
            ? `${props.recommended} rec (${props.max} máx)`
            : props.max}
        </span>
      </div>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value)}
        maxLength={props.max}
        required={props.required}
        placeholder={props.placeholder}
        style={inputStyle}
      />
    </label>
  );
}

function CharCountedTextarea(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  recommended?: number;
  required?: boolean;
  placeholder?: string;
}) {
  const overRec =
    props.recommended !== undefined && props.value.length > props.recommended;
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <Label>{props.label}</Label>
        <span
          className="mono"
          title={
            overRec
              ? `Por encima de los ${props.recommended} caracteres recomendados: la plataforma lo trunca visualmente.`
              : undefined
          }
          style={{
            fontSize: 10,
            color: charCountColor(props.value.length, props.max, props.recommended),
          }}
        >
          {props.value.length}/
          {props.recommended !== undefined
            ? `${props.recommended} rec (${props.max} máx)`
            : props.max}
        </span>
      </div>
      <textarea
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value)}
        rows={2}
        maxLength={props.max}
        required={props.required}
        placeholder={props.placeholder}
        style={{ ...inputStyle, fontFamily: "var(--font-sans)", lineHeight: 1.5 }}
      />
    </label>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "btn-pill solid" : "btn-pill"}
      style={{ fontSize: 11 }}
    >
      {label}
    </button>
  );
}

/** Primer creative que cumpla el filtro, con su mejor src disponible. */
function creativeSrc(
  creatives: Creative[],
  match: (c: Creative) => boolean,
): string {
  const c = creatives.find((x) => match(x) && (x.upload_data || x.url || x.thumbnail_url));
  if (!c) return "";
  if (c.kind === "youtube" || c.kind === "video") {
    return c.thumbnail_url || (c.youtube_id ? youtubeThumbnail(c.youtube_id) : "");
  }
  return c.upload_data || c.url;
}

function SearchAdPreview({
  finalUrl,
  companyName,
  creatives,
  previewHeadline,
  previewDescription,
}: {
  finalUrl: string;
  companyName: string;
  creatives: Creative[];
  previewHeadline: string;
  previewDescription: string;
}) {
  const logoSrc = creativeSrc(creatives, (c) => c.role === "logo_square");
  return (
    <div
      style={{
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-md)",
        background: "rgba(var(--fg),0.02)",
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {logoSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={logoSrc}
            alt="Logo"
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              objectFit: "cover",
              border: "1px solid rgba(var(--fg),0.1)",
            }}
          />
        ) : (
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "rgba(var(--fg),0.08)",
              display: "inline-block",
            }}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
          <span style={{ color: "rgba(var(--fg),0.85)", fontSize: 12 }}>
            {companyName || "Tu empresa"}
          </span>
          <span
            style={{
              color: "rgba(var(--fg),0.5)",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
          >
            Patrocinado · {displayUrl(finalUrl)}
          </span>
        </div>
      </div>
      <p
        style={{
          color: "var(--serp-link)",
          fontSize: 18,
          margin: 0,
          lineHeight: 1.3,
        }}
      >
        {previewHeadline}
      </p>
      <p
        style={{
          color: "rgba(var(--fg),0.78)",
          fontSize: 13,
          margin: 0,
          lineHeight: 1.55,
        }}
      >
        {previewDescription}
      </p>
    </div>
  );
}

function FeedAdPreview({
  companyName,
  previewHeadline,
  previewDescription,
  cta,
  creatives,
  finalUrl,
}: {
  companyName: string;
  previewHeadline: string;
  previewDescription: string;
  cta: string;
  creatives: Creative[];
  finalUrl: string;
}) {
  const imageSrc =
    creativeSrc(creatives, (c) => c.role === "square_image") ||
    creativeSrc(creatives, (c) => c.role === "landscape_image") ||
    creativeSrc(creatives, (c) => c.kind === "image");
  const logoSrc = creativeSrc(creatives, (c) => c.role === "logo_square");
  return (
    <div
      style={{
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-md)",
        background: "rgba(var(--fg),0.02)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          background: "rgba(var(--fg),0.04)",
          aspectRatio: "1 / 1",
          maxHeight: 220,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(var(--fg),0.4)",
          fontSize: 11,
          fontFamily: "var(--font-mono)",
        }}
      >
        {imageSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageSrc}
            alt="Imagen del anuncio"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          "imagen square (1:1)"
        )}
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {logoSrc && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={logoSrc}
              alt="Logo"
              style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }}
            />
          )}
          <span style={{ color: "rgba(var(--fg),0.7)", fontSize: 12 }}>
            {companyName || "Tu empresa"}
          </span>
          <span
            style={{
              color: "rgba(var(--fg),0.4)",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
            }}
          >
            · Patrocinado
          </span>
        </div>
        <p style={{ color: "var(--text-strong)", fontSize: 15, margin: 0, lineHeight: 1.35 }}>
          {previewHeadline}
        </p>
        <p style={{ color: "rgba(var(--fg),0.7)", fontSize: 12, margin: 0, lineHeight: 1.5 }}>
          {previewDescription}
        </p>
        <span
          className="mono"
          style={{ fontSize: 10, color: "rgba(var(--fg),0.45)" }}
        >
          {displayUrl(finalUrl)}
        </span>
        {cta && (
          <span
            className="btn-pill solid"
            style={{ alignSelf: "flex-start", fontSize: 11, pointerEvents: "none" }}
          >
            {cta}
          </span>
        )}
      </div>
    </div>
  );
}

function VideoAdPreview({
  previewHeadline,
  previewDescription,
  cta,
  creatives,
  finalUrl,
}: {
  previewHeadline: string;
  previewDescription: string;
  cta: string;
  creatives: Creative[];
  finalUrl: string;
}) {
  const thumbSrc = creativeSrc(
    creatives,
    (c) => c.kind === "youtube" || c.kind === "video",
  );
  return (
    <div
      style={{
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-md)",
        background: "rgba(var(--fg),0.02)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          position: "relative",
          background: "rgba(var(--fg),0.06)",
          aspectRatio: "16 / 9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(var(--fg),0.4)",
          fontSize: 11,
          fontFamily: "var(--font-mono)",
        }}
      >
        {thumbSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={thumbSrc}
            alt="Miniatura del vídeo"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          "miniatura del vídeo (16:9)"
        )}
        <span
          className="mono"
          style={{
            position: "absolute",
            right: 8,
            bottom: 8,
            padding: "4px 10px",
            background: "rgba(10,11,13,0.78)",
            color: "#ffffff",
            fontSize: 10,
            letterSpacing: "0.08em",
            borderRadius: 3,
          }}
        >
          Saltar anuncio ▸
        </span>
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ color: "var(--text-strong)", fontSize: 15, margin: 0, lineHeight: 1.35 }}>
          {previewHeadline}
        </p>
        <p style={{ color: "rgba(var(--fg),0.7)", fontSize: 12, margin: 0, lineHeight: 1.5 }}>
          {previewDescription}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {cta && (
            <span
              className="btn-pill solid"
              style={{ fontSize: 11, pointerEvents: "none" }}
            >
              {cta}
            </span>
          )}
          <span className="mono" style={{ fontSize: 10, color: "rgba(var(--fg),0.45)" }}>
            {displayUrl(finalUrl)}
          </span>
        </div>
      </div>
    </div>
  );
}

function ShoppingAdPreview({
  title,
  price,
  brand,
  availability,
  creatives,
  finalUrl,
}: {
  title: string;
  price: string;
  brand: string;
  availability: string;
  creatives: Creative[];
  finalUrl: string;
}) {
  const imageSrc = creativeSrc(creatives, (c) => c.kind === "image");
  return (
    <div
      style={{
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-md)",
        background: "rgba(var(--fg),0.02)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          background: "rgba(var(--fg),0.04)",
          aspectRatio: "1 / 1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(var(--fg),0.4)",
          fontSize: 11,
          fontFamily: "var(--font-mono)",
        }}
      >
        {imageSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageSrc}
            alt="Imagen del producto"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          "foto del producto"
        )}
      </div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
        <p
          style={{
            color: "var(--serp-link)",
            fontSize: 13,
            margin: 0,
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title || "Título del producto"}
        </p>
        <span style={{ color: "var(--text-strong)", fontSize: 15, fontFamily: "var(--font-mono)" }}>
          {price || "0.00 EUR"}
        </span>
        <span className="mono" style={{ fontSize: 10, color: "rgba(var(--fg),0.5)" }}>
          {brand ? `${brand} · ` : ""}
          {displayUrl(finalUrl)}
        </span>
        {availability !== "in_stock" && (
          <span className="mono" style={{ fontSize: 10, color: "var(--warning-text)" }}>
            {availability === "out_of_stock"
              ? "Agotado"
              : availability === "preorder"
                ? "Reserva previa"
                : "Bajo pedido"}
          </span>
        )}
      </div>
    </div>
  );
}

function DisplayAdPreview({
  companyName,
  longHeadline,
  previewHeadline,
  previewDescription,
  cta,
  creatives,
  finalUrl,
}: {
  companyName: string;
  longHeadline: string;
  previewHeadline: string;
  previewDescription: string;
  cta: string;
  creatives: Creative[];
  finalUrl: string;
}) {
  const landscape = creatives.find(
    (c) => c.role === "landscape_image" && (c.upload_data || c.url),
  );
  const logo = creatives.find(
    (c) => c.role === "logo_square" && (c.upload_data || c.url),
  );
  const landscapeSrc = landscape ? landscape.upload_data || landscape.url : "";
  const logoSrc = logo ? logo.upload_data || logo.url : "";

  return (
    <div
      style={{
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-md)",
        background: "rgba(var(--fg),0.02)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          background: "rgba(var(--fg),0.04)",
          aspectRatio: "1.91 / 1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(var(--fg),0.4)",
          fontSize: 11,
          fontFamily: "var(--font-mono)",
        }}
      >
        {landscapeSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={landscapeSrc}
            alt="Landscape"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <span>Imagen landscape · 1.91:1</span>
        )}
      </div>
      <div
        style={{
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {logoSrc ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={logoSrc}
              alt="Logo"
              style={{
                width: 28,
                height: 28,
                objectFit: "cover",
                borderRadius: "var(--radius-sm)",
                background: "rgba(var(--fg),0.06)",
              }}
            />
          ) : (
            <span
              className="mono"
              style={{
                width: 28,
                height: 28,
                borderRadius: "var(--radius-sm)",
                background: "rgba(var(--fg),0.06)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                color: "rgba(var(--fg),0.4)",
              }}
            >
              Logo
            </span>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span
              style={{
                color: "rgba(var(--fg),0.9)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {companyName || "Tu empresa"}
            </span>
            <span
              className="mono"
              style={{
                color: "rgba(var(--fg),0.45)",
                fontSize: 10,
              }}
            >
              Patrocinado · {displayUrl(finalUrl)}
            </span>
          </div>
        </div>
        <p
          style={{
            color: "rgba(var(--fg),0.95)",
            fontSize: 16,
            lineHeight: 1.3,
            margin: 0,
          }}
        >
          {longHeadline || previewHeadline || "Tu titular largo aquí"}
        </p>
        {(previewHeadline || longHeadline) && previewHeadline && (
          <p
            style={{
              color: "var(--serp-link)", opacity: 0.85,
              fontSize: 12,
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {previewHeadline}
          </p>
        )}
        <p
          style={{
            color: "rgba(var(--fg),0.7)",
            fontSize: 12,
            margin: 0,
            lineHeight: 1.55,
          }}
        >
          {previewDescription}
        </p>
        <button
          type="button"
          disabled
          style={{
            alignSelf: "flex-start",
            padding: "8px 16px",
            borderRadius: "var(--radius-sm)",
            background: cta ? "var(--accent-500)" : "rgba(var(--fg),0.08)",
            color: cta ? "var(--ink-900)" : "rgba(var(--fg),0.5)",
            border: 0,
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "default",
          }}
        >
          {cta || "Sin CTA"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Previews de Meta: feed (single), 9:16 (stories/reels/status),
// carousel y colección. Replican el truncado real del copy.
// ============================================================

function metaPreviewVisibleChars(strategy: Strategy, placement: MetaPlacement): number {
  if (placement === "instagram_reels") return 72;
  if (placement === "threads_feed") return 160;
  if (strategy === "meta_carousel") return 80;
  return 125;
}

function truncateVisible(text: string, visible: number): { text: string; truncated: boolean } {
  if (text.length <= visible) return { text, truncated: false };
  return { text: `${text.slice(0, visible).trimEnd()}…`, truncated: true };
}

function MetaPageHeader({
  companyName,
  logoSrc,
}: {
  companyName: string;
  logoSrc: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {logoSrc ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={logoSrc}
          alt="Página"
          style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
        />
      ) : (
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "rgba(var(--fg),0.08)",
            display: "inline-block",
          }}
        />
      )}
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
        <span style={{ color: "var(--text-strong)", fontSize: 13, fontWeight: 600 }}>
          {companyName || "Tu página"}
        </span>
        <span
          className="mono"
          style={{ color: "rgba(var(--fg),0.45)", fontSize: 10 }}
        >
          Patrocinado
        </span>
      </div>
    </div>
  );
}

function MetaPrimaryText({
  text,
  visible,
}: {
  text: string;
  visible: number;
}) {
  const t = truncateVisible(text || "Tu texto principal aparecerá aquí.", visible);
  return (
    <p style={{ color: "rgba(var(--fg),0.85)", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
      {t.text}
      {t.truncated && (
        <span style={{ color: "rgba(var(--fg),0.45)" }}> Ver más</span>
      )}
    </p>
  );
}

function MetaAdPreview({
  strategy,
  placement,
  companyName,
  primaryText,
  previewHeadline,
  previewDescription,
  cta,
  displayLink,
  creatives,
  finalUrl,
}: {
  strategy: Strategy;
  placement: MetaPlacement;
  companyName: string;
  primaryText: string;
  previewHeadline: string;
  previewDescription: string;
  cta: string;
  displayLink: string;
  creatives: Creative[];
  finalUrl: string;
}) {
  const visible = metaPreviewVisibleChars(strategy, placement);
  const link = displayLink || displayUrl(finalUrl);
  const vertical = isVerticalPlacement(placement);
  const logoSrc = ""; // Meta no pide logo aparte: el avatar es el de la página.

  if (strategy === "meta_carousel") {
    const cards = creatives.filter((c) => c.role === "card");
    return (
      <div style={metaCardShell}>
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          <MetaPageHeader companyName={companyName} logoSrc={logoSrc} />
          <MetaPrimaryText text={primaryText} visible={visible} />
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            padding: "0 14px 12px",
          }}
        >
          {(cards.length > 0 ? cards : [null, null]).map((c, i) => (
            <div
              key={i}
              style={{
                flex: "0 0 72%",
                border: "1px solid rgba(var(--fg),0.08)",
                borderRadius: "var(--radius-sm)",
                overflow: "hidden",
                background: "rgba(var(--fg),0.02)",
              }}
            >
              <div
                style={{
                  aspectRatio: "1 / 1",
                  background: "rgba(var(--fg),0.04)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(var(--fg),0.4)",
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                }}
              >
                {c && (c.upload_data || c.url || c.thumbnail_url) ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={
                      c.kind === "video"
                        ? c.thumbnail_url || c.upload_data || c.url
                        : c.upload_data || c.url
                    }
                    alt={c.card_headline || `Tarjeta ${i + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  `tarjeta ${i + 1} · 1:1`
                )}
              </div>
              <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ color: "var(--text-strong)", fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>
                  {truncateVisible(c?.card_headline || "Titular de la tarjeta", 45).text}
                </span>
                {c?.card_description && (
                  <span style={{ color: "rgba(var(--fg),0.6)", fontSize: 11 }}>
                    {truncateVisible(c.card_description, 18).text}
                  </span>
                )}
                {cta && (
                  <span
                    className="btn-pill"
                    style={{ alignSelf: "flex-start", fontSize: 10, marginTop: 4, pointerEvents: "none" }}
                  >
                    {cta}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (strategy === "meta_collection") {
    const cover = creatives.find((c) => c.role === "cover");
    const tiles = creatives.filter((c) => c.role === "card");
    const coverSrc = cover
      ? cover.kind === "video"
        ? cover.thumbnail_url || cover.upload_data || cover.url
        : cover.upload_data || cover.url
      : "";
    return (
      <div style={metaCardShell}>
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          <MetaPageHeader companyName={companyName} logoSrc={logoSrc} />
          <MetaPrimaryText text={primaryText} visible={visible} />
        </div>
        <div
          style={{
            aspectRatio: "1.91 / 1",
            background: "rgba(var(--fg),0.04)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(var(--fg),0.4)",
            fontSize: 11,
            fontFamily: "var(--font-mono)",
          }}
        >
          {coverSrc ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={coverSrc}
              alt="Portada"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            "portada (imagen o vídeo)"
          )}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 2,
            padding: 2,
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => {
            const t = tiles[i];
            const src = t ? t.upload_data || t.url || t.thumbnail_url || "" : "";
            return (
              <div
                key={i}
                style={{
                  aspectRatio: "1 / 1",
                  background: "rgba(var(--fg),0.04)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(var(--fg),0.35)",
                  fontSize: 9,
                  fontFamily: "var(--font-mono)",
                  overflow: "hidden",
                }}
              >
                {src ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={src}
                    alt={t?.card_headline ?? `Producto ${i + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  `tile ${i + 1}`
                )}
              </div>
            );
          })}
        </div>
        <div
          style={{
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            background: "rgba(var(--fg),0.03)",
          }}
        >
          <span style={{ color: "var(--text-strong)", fontSize: 13, fontWeight: 600 }}>
            {truncateVisible(previewHeadline || "Tu titular", 40).text}
          </span>
          {cta && (
            <span className="btn-pill solid" style={{ fontSize: 10, pointerEvents: "none" }}>
              {cta}
            </span>
          )}
        </div>
      </div>
    );
  }

  // meta_single
  const main = creatives.find(
    (c) =>
      (c.kind === "image" && (c.upload_data || c.url)) ||
      (c.kind === "video" && (c.thumbnail_url || c.upload_data || c.url)),
  );
  const mainSrc = main
    ? main.kind === "video"
      ? main.thumbnail_url || main.upload_data || main.url
      : main.upload_data || main.url
    : "";

  if (vertical) {
    return (
      <div
        style={{
          ...metaCardShell,
          position: "relative",
          aspectRatio: "9 / 16",
          maxHeight: 460,
          overflow: "hidden",
          background: "rgba(var(--fg),0.05)",
        }}
      >
        {mainSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={mainSrc}
            alt="Creatividad"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <span
            className="mono"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(var(--fg),0.4)",
              fontSize: 11,
            }}
          >
            creatividad 9:16
          </span>
        )}
        {/* Safe zones: 14% superior y 35% inferior reservados a la interfaz */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            padding: "10px 12px",
            background: "linear-gradient(rgba(10,11,13,0.55), transparent)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
          className="theme-dark-fixed"
        >
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.25)",
              display: "inline-block",
            }}
          />
          <span style={{ color: "#ffffff", fontSize: 12, fontWeight: 600 }}>
            {companyName || "Tu página"}
          </span>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 10 }}>
            Patrocinado
          </span>
        </div>
        <div
          className="theme-dark-fixed"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "14px 12px",
            background: "linear-gradient(transparent, rgba(10,11,13,0.65))",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {primaryText && (
            <p style={{ color: "rgba(255,255,255,0.92)", fontSize: 12, margin: 0, lineHeight: 1.4 }}>
              {truncateVisible(primaryText, visible).text}
            </p>
          )}
          <span
            className="btn-pill solid"
            style={{ alignSelf: "center", fontSize: 11, pointerEvents: "none" }}
          >
            {cta || "Más información"} ↑
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={metaCardShell}>
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        <MetaPageHeader companyName={companyName} logoSrc={logoSrc} />
        <MetaPrimaryText text={primaryText} visible={visible} />
      </div>
      <div
        style={{
          aspectRatio: placement === "threads_feed" ? "4 / 5" : "1 / 1",
          maxHeight: 260,
          background: "rgba(var(--fg),0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(var(--fg),0.4)",
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          overflow: "hidden",
        }}
      >
        {mainSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={mainSrc}
            alt="Creatividad"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          "creatividad 1:1 / 4:5"
        )}
      </div>
      <div
        style={{
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          background: "rgba(var(--fg),0.03)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <span className="mono" style={{ fontSize: 9, color: "rgba(var(--fg),0.45)", textTransform: "uppercase" }}>
            {link}
          </span>
          <span
            style={{
              color: "var(--text-strong)",
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1.3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {truncateVisible(previewHeadline || "Tu titular", 40).text}
          </span>
          {previewDescription && (
            <span style={{ color: "rgba(var(--fg),0.55)", fontSize: 11 }}>
              {truncateVisible(previewDescription, 30).text}
            </span>
          )}
        </div>
        <span className="btn-pill solid" style={{ fontSize: 11, pointerEvents: "none", flexShrink: 0 }}>
          {cta || "Más información"}
        </span>
      </div>
    </div>
  );
}

const metaCardShell: React.CSSProperties = {
  border: "1px solid rgba(var(--fg),0.08)",
  borderRadius: "var(--radius-md)",
  background: "rgba(var(--fg),0.02)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

// ============================================================
// Preview de TikTok: el feed «Para ti» a pantalla completa (9:16) con
// la anatomía real del anuncio: tabs superiores, columna de iconos a
// la derecha (avatar + corazón + comentarios + guardar + compartir +
// disco), @usuario + «Patrocinado» + caption + fila de música abajo a
// la izquierda y botón CTA que el sistema colorea a los pocos segundos.
// Contexto siempre oscuro: colores fijos bajo .theme-dark-fixed.
// ============================================================

function TikTokAdPreview({
  strategy,
  companyName,
  identityHandle,
  adText,
  musicName,
  cta,
  creatives,
}: {
  strategy: Strategy;
  companyName: string;
  identityHandle: string;
  adText: string;
  musicName: string;
  cta: string;
  creatives: Creative[];
}) {
  const carousel = strategy === "tiktok_carousel";
  const spark = strategy === "tiktok_spark";
  const cards = creatives.filter(
    (c) => c.role === "card" && c.kind === "image" && (c.upload_data || c.url),
  );
  const [cardIndex, setCardIndex] = useState(0);
  const safeIndex = cards.length > 0 ? Math.min(cardIndex, cards.length - 1) : 0;
  const videoSrc = creativeSrc(
    creatives,
    (c) => (c.kind === "video" || c.kind === "youtube") && c.role !== "logo_square",
  );
  const avatarSrc = creativeSrc(creatives, (c) => c.role === "logo_square");
  const mediaSrc = carousel
    ? cards[safeIndex]
      ? cards[safeIndex].upload_data || cards[safeIndex].url
      : ""
    : videoSrc;
  const handle =
    identityHandle.trim().replace(/^@/, "") ||
    companyName.trim().toLowerCase().replace(/\s+/g, "") ||
    "tucuenta";
  // El feed corta el caption a ~2 líneas con «más» (4 líneas es el máximo).
  const caption = truncateVisible(
    adText || "Tu texto del anuncio aparecerá aquí.",
    80,
  );
  const music = musicName.trim() || `Promoted music · ${companyName || "tu marca"}`;

  return (
    <div
      className="theme-dark-fixed"
      style={{
        position: "relative",
        aspectRatio: "9 / 16",
        maxHeight: 480,
        borderRadius: "var(--radius-md)",
        border: "1px solid rgba(var(--fg),0.08)",
        overflow: "hidden",
        background: "#0a0b0d",
      }}
    >
      {mediaSrc ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={mediaSrc}
          alt={carousel ? `Tarjeta ${safeIndex + 1}` : "Miniatura del vídeo"}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <span
          className="mono"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.4)",
            fontSize: 11,
          }}
        >
          {carousel ? "tarjeta 720x1280" : "vídeo 9:16 (miniatura)"}
        </span>
      )}

      {/* Tabs superiores del feed */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "10px 12px",
          background: "linear-gradient(rgba(10,11,13,0.5), transparent)",
          display: "flex",
          justifyContent: "center",
          gap: 14,
        }}
      >
        <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
          Siguiendo
        </span>
        <span
          style={{
            color: "#ffffff",
            fontSize: 12,
            fontWeight: 700,
            borderBottom: "2px solid #ffffff",
            paddingBottom: 2,
          }}
        >
          Para ti
        </span>
      </div>

      {/* Carousel: contador y flechas */}
      {carousel && (
        <>
          <span
            className="mono"
            style={{
              position: "absolute",
              top: 36,
              right: 10,
              padding: "2px 8px",
              borderRadius: "var(--radius-pill)",
              background: "rgba(10,11,13,0.55)",
              color: "rgba(255,255,255,0.85)",
              fontSize: 10,
            }}
          >
            {cards.length > 0 ? safeIndex + 1 : 1}/{Math.max(cards.length, 2)}
          </span>
          {cards.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Tarjeta anterior"
                onClick={() => setCardIndex((safeIndex - 1 + cards.length) % cards.length)}
                style={tiktokArrowStyle("left")}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Tarjeta siguiente"
                onClick={() => setCardIndex((safeIndex + 1) % cards.length)}
                style={tiktokArrowStyle("right")}
              >
                ›
              </button>
            </>
          )}
        </>
      )}

      {/* Columna derecha de iconos */}
      <div
        style={{
          position: "absolute",
          right: 8,
          bottom: 110,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
        }}
      >
        <span style={{ position: "relative", display: "inline-flex" }}>
          {avatarSrc ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={avatarSrc}
              alt="Foto de perfil"
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                objectFit: "cover",
                border: "1.5px solid #ffffff",
              }}
            />
          ) : (
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.25)",
                border: "1.5px solid #ffffff",
                display: "inline-block",
              }}
            />
          )}
          <span
            style={{
              position: "absolute",
              bottom: -7,
              left: "50%",
              transform: "translateX(-50%)",
              width: 15,
              height: 15,
              borderRadius: "50%",
              background: "#FE2C55",
              color: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Plus size={11} strokeWidth={3} />
          </span>
        </span>
        <TikTokSideIcon icon={<Heart size={26} fill="currentColor" />} count="12,4 K" />
        <TikTokSideIcon icon={<MessageCircle size={26} fill="currentColor" />} count="208" />
        <TikTokSideIcon icon={<Bookmark size={26} fill="currentColor" />} count="96" />
        <TikTokSideIcon icon={<Share2 size={26} fill="currentColor" />} count="54" />
        <span
          className="spin-slow"
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at center, rgba(255,255,255,0.35) 28%, rgba(20,20,22,0.95) 32%)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
          }}
        >
          <Music size={12} />
        </span>
      </div>

      {/* Bloque inferior izquierdo */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 54,
          padding: "12px 12px 12px",
          background: "linear-gradient(transparent, rgba(10,11,13,0.75))",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {carousel && cards.length > 1 && (
          <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
            {cards.map((_, i) => (
              <span
                key={i}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background:
                    i === safeIndex ? "#ffffff" : "rgba(255,255,255,0.35)",
                  display: "inline-block",
                }}
              />
            ))}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ color: "#ffffff", fontSize: 13, fontWeight: 700 }}>
            @{handle}
          </span>
          <span
            className="mono"
            style={{
              fontSize: 8,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "2px 6px",
              borderRadius: 3,
              background: "rgba(255,255,255,0.18)",
              color: "rgba(255,255,255,0.85)",
            }}
          >
            Patrocinado
          </span>
          {spark && (
            <span
              style={{
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 4,
                border: "1px solid rgba(255,255,255,0.6)",
                color: "#ffffff",
              }}
            >
              Seguir
            </span>
          )}
        </div>
        <p
          style={{
            color: "rgba(255,255,255,0.92)",
            fontSize: 12,
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {caption.text}
          {caption.truncated && (
            <span style={{ color: "rgba(255,255,255,0.55)" }}> más</span>
          )}
        </p>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "rgba(255,255,255,0.8)",
            fontSize: 11,
          }}
        >
          <Music size={11} />
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {music}
          </span>
        </span>
        <span
          style={{
            marginTop: 2,
            padding: "9px 12px",
            borderRadius: 6,
            background: cta ? "#FE2C55" : "rgba(255,255,255,0.18)",
            color: cta ? "#ffffff" : "rgba(255,255,255,0.7)",
            fontSize: 12,
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          {cta || "Elige el botón CTA"}
        </span>
      </div>
    </div>
  );
}

function TikTokSideIcon({ icon, count }: { icon: React.ReactNode; count: string }) {
  return (
    <span
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        color: "#ffffff",
      }}
    >
      {icon}
      <span className="mono" style={{ fontSize: 9, color: "rgba(255,255,255,0.85)" }}>
        {count}
      </span>
    </span>
  );
}

function tiktokArrowStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    [side]: 6,
    top: "44%",
    width: 26,
    height: 26,
    borderRadius: "50%",
    border: 0,
    background: "rgba(10,11,13,0.55)",
    color: "#ffffff",
    fontSize: 16,
    lineHeight: 1,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

function StrategyTabs({
  channel,
  value,
  onChange,
}: {
  channel: Channel;
  value: Strategy;
  onChange: (v: Strategy) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Estrategia"
      style={{
        display: "flex",
        gap: 0,
        borderBottom: "1px solid rgba(var(--fg),0.1)",
        overflowX: "auto",
      }}
    >
      {CHANNEL_STRATEGIES[channel].map((s) => {
        const active = value === s;
        const implemented = isStrategyImplemented(s);
        const color = !implemented
          ? "rgba(var(--fg),0.35)"
          : active
            ? "var(--accent-500)"
            : "rgba(var(--fg),0.6)";
        return (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(s)}
            title={
              implemented
                ? STRATEGY_DESCRIPTION[s]
                : `En construcción · ${STRATEGY_DESCRIPTION[s]}`
            }
            style={{
              background: "transparent",
              border: 0,
              borderBottom: active
                ? "2px solid var(--accent-500)"
                : "2px solid transparent",
              padding: "10px 14px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color,
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              whiteSpace: "nowrap",
              transition: "color var(--dur-short) var(--ease-out)",
            }}
          >
            <StrategyIcon strategy={s} size={14} />
            <span>{STRATEGY_LABEL[s]}</span>
            {!implemented && (
              <span
                className="mono"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  padding: "2px 6px",
                  borderRadius: "var(--radius-pill)",
                  border: "1px solid rgba(var(--fg),0.18)",
                  color: "rgba(var(--fg),0.5)",
                }}
              >
                Próx.
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function UnderConstruction({ strategy }: { strategy: Strategy }) {
  return (
    <div
      style={{
        border: "1px dashed rgba(var(--fg),0.15)",
        borderRadius: "var(--radius-md)",
        background: "rgba(var(--fg),0.02)",
        padding: "28px 32px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <StrategyIcon strategy={strategy} size={20} />
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--accent-text)",
          }}
        >
          {STRATEGY_LABEL[strategy]} · En construcción
        </span>
      </div>
      <p
        style={{
          margin: 0,
          color: "rgba(var(--fg),0.75)",
          fontSize: 14,
          lineHeight: 1.65,
        }}
      >
        {STRATEGY_DESCRIPTION[strategy]}
      </p>
      <p
        style={{
          margin: 0,
          color: "rgba(var(--fg),0.55)",
          fontSize: 12,
          lineHeight: 1.55,
        }}
      >
        Cada estrategia tendrá su propio formulario y su propio runner cuando
        esté implementada. Mientras tanto, usa <strong>Search (RSA)</strong>{" "}
        para probar tus textos.
      </p>
    </div>
  );
}

function ChannelTabs({
  value,
  onChange,
}: {
  value: Channel;
  onChange: (v: Channel) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Canal publicitario"
      style={{
        display: "flex",
        gap: 0,
        borderBottom: "1px solid rgba(var(--fg),0.1)",
        overflowX: "auto",
      }}
    >
      {CHANNEL_VALUES.map((c) => {
        const active = value === c;
        const disabled = CHANNEL_STRATEGIES[c].length === 0;
        const color = disabled
          ? "rgba(var(--fg),0.3)"
          : active
            ? "var(--accent-500)"
            : "rgba(var(--fg),0.6)";
        return (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={active}
            aria-disabled={disabled}
            onClick={() => {
              if (disabled) return;
              onChange(c);
            }}
            title={disabled ? "Próximamente · cada red tendrá sus propios campos" : undefined}
            style={{
              background: "transparent",
              border: 0,
              borderBottom: active
                ? "2px solid var(--accent-500)"
                : "2px solid transparent",
              padding: "10px 14px",
              cursor: disabled ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color,
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              whiteSpace: "nowrap",
              opacity: disabled ? 0.6 : 1,
              transition: "color var(--dur-short) var(--ease-out)",
            }}
          >
            <ChannelIcon channel={c} size={16} />
            <span>{CHANNEL_LABEL[c]}</span>
            {disabled && (
              <span
                className="mono"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  padding: "2px 6px",
                  borderRadius: "var(--radius-pill)",
                  border: "1px solid rgba(var(--fg),0.18)",
                  color: "rgba(var(--fg),0.5)",
                }}
              >
                Próx.
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function CreativeThumb({ c }: { c: Creative }) {
  if (c.kind === "youtube") {
    const src = c.thumbnail_url ?? "";
    if (!src) return <ThumbPlaceholder label="YouTube" />;
    /* eslint-disable-next-line @next/next/no-img-element */
    return <img src={src} alt={c.label} style={thumbStyle} />;
  }
  if (c.kind === "video") {
    const src = c.thumbnail_url || c.upload_data || c.url;
    if (!src) return <ThumbPlaceholder label="Vídeo" />;
    if (src.startsWith("data:video") || /\.(mp4|webm|mov)$/i.test(src)) {
      /* eslint-disable-next-line jsx-a11y/media-has-caption */
      return <video src={src} muted style={thumbStyle} />;
    }
    /* eslint-disable-next-line @next/next/no-img-element */
    return <img src={src} alt={c.label} style={thumbStyle} />;
  }
  const src = c.upload_data || c.url;
  if (!src) return <ThumbPlaceholder label="Imagen" />;
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={src} alt={c.label} style={thumbStyle} />;
}

function ThumbPlaceholder({ label }: { label: string }) {
  return (
    <div
      className="mono"
      style={{
        ...thumbStyle,
        background: "rgba(var(--fg),0.04)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(var(--fg),0.5)",
        fontSize: 10,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
      }}
    >
      {label}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="mono"
      style={{
        fontSize: 10,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "rgba(var(--fg),0.55)",
      }}
    >
      {children}
    </span>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-pill solid" disabled={pending} style={{ alignSelf: "flex-start" }}>
      {pending ? "Creando…" : "Crear campaña"}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  background: "rgba(var(--fg),0.03)",
  border: "1px solid rgba(var(--fg),0.12)",
  borderRadius: "var(--radius-sm)",
  padding: "10px 12px",
  color: "var(--text-strong)",
  fontSize: 14,
  outline: "none",
  fontFamily: "var(--font-sans)",
};

const fieldsetStyle: React.CSSProperties = {
  border: "1px solid rgba(var(--fg),0.08)",
  borderRadius: "var(--radius-md)",
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  margin: 0,
};

const legendStyle: React.CSSProperties = {
  padding: "0 8px",
  marginLeft: 8,
  fontSize: 10,
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  color: "var(--accent-text)",
};

const previewBox: React.CSSProperties = {
  maxWidth: "100%",
  maxHeight: 200,
  objectFit: "cover",
  borderRadius: "var(--radius-sm)",
  border: "1px solid rgba(var(--fg),0.08)",
};

const thumbStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: "1 / 1",
  objectFit: "cover",
  borderRadius: "var(--radius-sm)",
  border: "1px solid rgba(var(--fg),0.08)",
};
