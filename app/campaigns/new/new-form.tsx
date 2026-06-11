"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { ChannelIcon } from "@/components/channel-icon";
import { StrategyIcon } from "@/components/strategy-icon";
import {
  CHANNEL_LABEL,
  CHANNEL_VALUES,
  CREATIVE_ROLE_LABEL,
  CTA_VALUES,
  STRATEGY_DESCRIPTION,
  STRATEGY_LABEL,
  STRATEGY_VALUES,
  extractYouTubeId,
  isStrategyImplemented,
  youtubeThumbnail,
  type Campaign as CampaignEntity,
  type Channel,
  type CreativeRole,
  type Strategy,
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
          }))
      : [],
  );
  const [companyName, setCompanyName] = useState(src?.company_name ?? "");
  const [longHeadline, setLongHeadline] = useState(src?.long_headline ?? "");
  const [cta, setCta] = useState<string>(src?.cta ?? "");

  // Estrategias con el set de assets visual (nombre de empresa, CTA y
  // creatividades con rol): Display, Performance Max y Demand Gen.
  const assetStrategy =
    strategy === "display" || strategy === "pmax" || strategy === "demand_gen";
  // El titular largo solo existe en Display y PMax (en Demand Gen es
  // exclusivo del subformato vídeo, aún no modelado).
  const usesLongHeadline = strategy === "display" || strategy === "pmax";
  // Demand Gen admite titulares de 40 caracteres; el resto, 30.
  const headlineMax = strategy === "demand_gen" ? 40 : HEADLINE_MAX;
  const headlinesCap =
    strategy === "display" || strategy === "demand_gen" ? 5 : 15;

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
    if (descriptions.length >= 4) return;
    setDescriptions([...descriptions, ""]);
  }
  function removeDescription(i: number) {
    if (descriptions.length <= 2) return;
    setDescriptions(descriptions.filter((_, idx) => idx !== i));
  }

  // ============ creatives ============
  function addCreative(kind: CreativeKind = "image") {
    if (creatives.length >= 6) return;
    setCreatives([...creatives, emptyCreative(kind)]);
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
            <ChannelTabs value={channel} onChange={setChannel} />
            <p
              style={{
                color: "rgba(var(--fg),0.55)",
                fontSize: 12,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              Cada red tiene formato propio (caps de caracteres, creatividades,
              targeting). Por ahora sólo Google Ads está implementado. Meta,
              LinkedIn, TikTok y X llegarán como módulos específicos en futuras
              versiones.
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
              Tipo de campaña dentro de {CHANNEL_LABEL[channel].split(" ")[0]}
            </span>
            <StrategyTabs value={strategy} onChange={setStrategy} />
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
        <Section title="Identidad">
          <Controlled
            label="Nombre interno de la campaña"
            value={name}
            onChange={setName}
            required
            placeholder="Hipoteca fija agosto 2026"
          />
          {assetStrategy && (
            <CharCountedInput
              label="Nombre de empresa (visible en el anuncio)"
              value={companyName}
              onChange={setCompanyName}
              max={25}
              required
              placeholder="BBVA"
            />
          )}
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
                    style={{ fontSize: 10, color: "var(--success-500)", letterSpacing: "0.18em" }}
                  >
                    Imagen resuelta
                  </span>
                )}
              </div>
              {resolveError && (
                <span style={{ color: "var(--error-500)", fontSize: 12, lineHeight: 1.5 }}>
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

        <Section
          title={
            strategy === "display"
              ? `Intereses / contexto · ${queries.length} / 5 (opcional)`
              : strategy === "pmax"
                ? `Señales de audiencia · ${queries.length} / 5 (opcional)`
                : `Queries · ${queries.length} / 5`
          }
          onAdd={addQuery}
          addLabel="+ Añadir"
          canAdd={queries.length < 5}
        >
          {queries.map((q, i) => (
            <RowWithRemove
              key={i}
              canRemove={queries.length > 1}
              onRemove={() => removeQuery(i)}
            >
              <Controlled
                label={
                  assetStrategy ? `Interés / señal ${i + 1}` : `Query ${i + 1}`
                }
                value={q}
                onChange={(v) => setQueries(updateAt(queries, i, v))}
                required={strategy === "search" && i === 0}
                placeholder={
                  assetStrategy
                    ? "lector de tech, edad 30-45"
                    : "hipoteca fija madrid"
                }
              />
            </RowWithRemove>
          ))}
        </Section>

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
          {strategy === "search" && (
            <p
              style={{
                margin: 0,
                fontSize: 12,
                lineHeight: 1.5,
                color: "rgba(var(--fg),0.5)",
              }}
            >
              Google exige mínimo 3 titulares para crear un RSA (spec oficial).
            </p>
          )}
          {headlines.map((h, i) => (
            <RowWithRemove
              key={i}
              canRemove={headlines.length > (strategy === "search" ? 3 : 1)}
              onRemove={() => removeHeadline(i)}
            >
              <CharCountedInput
                label={`Titular ${i + 1}${
                  i === 0 || (strategy === "search" && i < 3)
                    ? " · obligatorio"
                    : " · opcional"
                }`}
                value={h}
                onChange={(v) => setHeadlines(updateAt(headlines, i, v))}
                max={headlineMax}
                required={i === 0 || (strategy === "search" && i < 3)}
                placeholder="Hipoteca fija al 2,90% TAE"
              />
            </RowWithRemove>
          ))}
        </Section>

        {usesLongHeadline && (
          <Section title="Titular largo">
            <CharCountedInput
              label="Titular largo (visible en banners grandes y feeds)"
              value={longHeadline}
              onChange={setLongHeadline}
              max={90}
              required
              placeholder="Hipoteca fija al 2,90% TAE sin comisiones de apertura"
            />
          </Section>
        )}

        <Section
          title={
            assetStrategy
              ? `Descripciones · ${descriptions.length} / 5`
              : `Descripciones · ${descriptions.length} / 4`
          }
          onAdd={addDescription}
          addLabel="+ Añadir descripción"
          canAdd={descriptions.length < (assetStrategy ? 5 : 4)}
        >
          {descriptions.map((d, i) => (
            <RowWithRemove
              key={i}
              canRemove={
                descriptions.length > (strategy === "display" ? 1 : 2)
              }
              onRemove={() => removeDescription(i)}
            >
              <CharCountedTextarea
                label={`Descripción ${i + 1}`}
                value={d}
                onChange={(v) => setDescriptions(updateAt(descriptions, i, v))}
                max={DESCRIPTION_MAX}
                required={
                  i === 0 ||
                  strategy === "search" ||
                  (strategy === "pmax" && i < 2)
                }
                placeholder="Sin comisiones de apertura. Decisión en 48h."
              />
            </RowWithRemove>
          ))}
        </Section>

        {assetStrategy && (
          <Section title="CTA">
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>Botón Call To Action (visible en el anuncio)</Label>
              <select
                value={cta}
                onChange={(e) => setCta(e.currentTarget.value)}
                style={inputStyle}
              >
                <option value="">
                  {strategy === "pmax" ? "elige una CTA (obligatoria)" : "sin CTA"}
                </option>
                {CTA_VALUES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </Section>
        )}

        <Section
          title={
            strategy === "display"
              ? `Imágenes y vídeos · ${creatives.length}`
              : `Creatividades · ${creatives.length} / 6 (opcional)`
          }
          onAdd={() => addCreative("image")}
          addLabel="+ Añadir"
          canAdd={creatives.length < 20}
        >
          {assetStrategy ? (
            <p style={{ color: "rgba(var(--fg),0.55)", fontSize: 13, margin: 0, lineHeight: 1.55 }}>
              {STRATEGY_LABEL[strategy]} exige al menos <strong>1 imagen landscape (1.91:1)</strong>,
              <strong> 1 imagen square (1:1)</strong> y <strong>1 logo square (1:1)</strong>.
              Recomendado: añade portrait (4:5) para mobile y vídeo YouTube si lo tienes
              {strategy === "pmax" ? " (sin vídeo, Google autogenera uno)" : ""}.
            </p>
          ) : (
            creatives.length === 0 && (
              <p style={{ color: "rgba(var(--fg),0.55)", fontSize: 13, margin: 0 }}>
                Imagen, vídeo o YouTube. El perfil sintético ve la imagen
                directamente o el thumbnail si es vídeo / YouTube (los modelos
                actuales no procesan vídeo).
              </p>
            )
          )}
          {creatives.map((c, i) => (
            <fieldset key={i} style={fieldsetStyle}>
              <legend className="mono" style={legendStyle}>
                Creatividad {i + 1}
              </legend>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => removeCreative(i)}
                  className="btn-pill"
                  style={{ fontSize: 11 }}
                >
                  Eliminar
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ToggleButton
                  active={c.kind === "image"}
                  onClick={() => changeCreativeKind(i, "image")}
                  label="Imagen"
                />
                <ToggleButton
                  active={c.kind === "video"}
                  onClick={() => changeCreativeKind(i, "video")}
                  label="Vídeo"
                />
                <ToggleButton
                  active={c.kind === "youtube"}
                  onClick={() => changeCreativeKind(i, "youtube")}
                  label="YouTube"
                />
              </div>
              {assetStrategy && (
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

        {strategy === "display" && (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              lineHeight: 1.55,
              color: "rgba(var(--fg),0.55)",
              maxWidth: 640,
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
              maxWidth: 640,
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
              maxWidth: 640,
            }}
          >
            Demand Gen exige: 1 a 5 titulares (máx. 40c, al menos uno de 30c o menos),
            1 a 5 descripciones, nombre de empresa (máx. 25c) y creatividades con al
            menos 1 imagen landscape (1.91:1), 1 imagen square (1:1) y 1 logo (1:1).
            La CTA es opcional (automatizada por defecto).
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
          Vista previa · {STRATEGY_LABEL[strategy]}
        </span>
        {assetStrategy ? (
          <DisplayAdPreview
            companyName={companyName}
            longHeadline={longHeadline}
            previewHeadline={previewHeadline}
            previewDescription={previewDescription}
            cta={cta}
            creatives={creatives}
            finalUrl={finalUrl}
          />
        ) : (
          <SearchAdPreview
            finalUrl={finalUrl}
            previewHeadline={previewHeadline}
            previewDescription={previewDescription}
          />
        )}

        {(headlines.filter(Boolean).length > 1 ||
          descriptions.filter(Boolean).length > 1) && (
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
        sube también un thumbnail estático (jpg/png) para que el perfil sintético
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
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "end" }}>
      <div>{children}</div>
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        className="btn-pill"
        style={{ fontSize: 11, alignSelf: "end" }}
      >
        Eliminar
      </button>
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

function CharCountedInput(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  required?: boolean;
  placeholder?: string;
}) {
  const over = props.value.length > props.max;
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <Label>{props.label}</Label>
        <span
          className="mono"
          style={{
            fontSize: 10,
            color: over ? "var(--error-500)" : "rgba(var(--fg),0.45)",
          }}
        >
          {props.value.length}/{props.max}
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
  required?: boolean;
  placeholder?: string;
}) {
  const over = props.value.length > props.max;
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <Label>{props.label}</Label>
        <span
          className="mono"
          style={{
            fontSize: 10,
            color: over ? "var(--error-500)" : "rgba(var(--fg),0.45)",
          }}
        >
          {props.value.length}/{props.max}
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

function SearchAdPreview({
  finalUrl,
  previewHeadline,
  previewDescription,
}: {
  finalUrl: string;
  previewHeadline: string;
  previewDescription: string;
}) {
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
      <span
        style={{
          color: "rgba(var(--fg),0.45)",
          fontSize: 11,
          fontFamily: "var(--font-mono)",
        }}
      >
        Patrocinado
      </span>
      <span
        style={{
          color: "rgba(var(--fg),0.7)",
          fontSize: 12,
          fontFamily: "var(--font-mono)",
        }}
      >
        {displayUrl(finalUrl)}
      </span>
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

function StrategyTabs({
  value,
  onChange,
}: {
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
      {STRATEGY_VALUES.map((s) => {
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
          maxWidth: 720,
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
        const disabled = c !== "google";
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
