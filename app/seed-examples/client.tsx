"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

type Kind =
  | "clarity"
  | "copy"
  | "pricing"
  | "ab"
  | "funnel"
  | "campaign"
  | "geo"
  | "momentum";

type ResultRow = {
  kind: string;
  ok: boolean;
  targetId?: string;
  deckId?: string;
  offerId?: string;
  abTestId?: string;
  funnelId?: string;
  campaignId?: string;
  geoId?: string;
  momentumId?: string;
  ran?: boolean;
  runId?: string;
  runIds?: string[];
  error?: string;
};

type Response = {
  ok: boolean;
  profileIds: string[];
  results: ResultRow[];
};

export function SeedExamplesClient() {
  const router = useRouter();
  const [launch, setLaunch] = useState(3);
  const [brief, setBrief] = useState("");
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [pendingKind, setPendingKind] = useState<Kind | "all" | null>(null);

  function trigger(kinds?: Kind[]) {
    setError(null);
    setData(null);
    setPendingKind(kinds && kinds.length === 1 ? kinds[0] : "all");
    startTransition(async () => {
      try {
        const trimmed = brief.trim();
        const res = await fetch("/api/seed/examples", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            launch,
            ...(kinds ? { kinds } : {}),
            ...(trimmed ? { brief: trimmed } : {}),
          }),
        });
        const json = (await res.json()) as Response & { error?: string };
        if (!res.ok) {
          setError(json?.error ?? `HTTP ${res.status}`);
          return;
        }
        setData(json);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setPendingKind(null);
      }
    });
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div
        style={{
          padding: 20,
          border: "1px solid rgba(var(--fg),0.08)",
          borderRadius: "var(--radius-md)",
          background: "rgba(var(--fg),0.02)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(var(--fg),0.55)",
            }}
          >
            Brief (opcional): los ejemplos se generan con IA a medida
          </span>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.currentTarget.value)}
            disabled={pending}
            maxLength={2000}
            rows={3}
            placeholder="Ej: una marca de zapatillas sostenibles para corredores urbanos en España. Vacío = ejemplos de muestra predefinidos."
            style={{
              background: "rgba(var(--fg),0.03)",
              border: "1px solid rgba(var(--fg),0.12)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 12px",
              color: "var(--text-strong)",
              fontSize: 14,
              lineHeight: 1.5,
              outline: "none",
              fontFamily: "var(--font-sans)",
              resize: "vertical",
            }}
          />
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 16,
            alignItems: "end",
          }}
        >
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(var(--fg),0.55)",
            }}
          >
            Perfiles aleatorios por run (0 = solo crear sin lanzar)
          </span>
          <input
            type="number"
            min={0}
            max={10}
            step={1}
            value={launch}
            onChange={(e) => {
              const v = parseInt(e.currentTarget.value, 10);
              if (Number.isFinite(v)) setLaunch(Math.min(Math.max(v, 0), 10));
            }}
            disabled={pending}
            inputMode="numeric"
            pattern="[0-9]*"
            style={{
              background: "rgba(var(--fg),0.03)",
              border: "1px solid rgba(var(--fg),0.12)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 12px",
              color: "var(--text-strong)",
              fontSize: 14,
              outline: "none",
              fontFamily: "var(--font-sans)",
              maxWidth: 160,
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => trigger()}
          disabled={pending}
          className="btn-pill solid"
        >
          {pending && pendingKind === "all" ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Loader2 size={14} className="spin" /> Sembrando los 8…
            </span>
          ) : launch > 0 ? (
            `Crear los 8 y lanzar (${launch} perfiles)`
          ) : (
            "Crear los 8 (sin lanzar)"
          )}
        </button>
        </div>
      </div>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
        }}
      >
        <li>
          <Recipe
            kind="clarity"
            title="Claridad 5s"
            body="Target Linear · landing del producto. Resolución de og:image en runtime."
            onTrigger={trigger}
            pending={pending}
            pendingKind={pendingKind}
          />
        </li>
        <li>
          <Recipe
            kind="copy"
            title="Copy resonance"
            body="4 variantes de headline para el servicio CRO de Flat 101."
            onTrigger={trigger}
            pending={pending}
            pendingKind={pendingKind}
          />
        </li>
        <li>
          <Recipe
            kind="pricing"
            title="Pricing"
            body="Flat 101 Lab con 4 niveles: founder · actual · agency · enterprise."
            onTrigger={trigger}
            pending={pending}
            pendingKind={pendingKind}
          />
        </li>
        <li>
          <Recipe
            kind="ab"
            title="A/B test"
            body="Vercel vs Netlify. Resolución de og:image en runtime."
            onTrigger={trigger}
            pending={pending}
            pendingKind={pendingKind}
          />
        </li>
        <li>
          <Recipe
            kind="funnel"
            title="Embudo"
            body="Onboarding Stripe · home → producto → casos → precios."
            onTrigger={trigger}
            pending={pending}
            pendingKind={pendingKind}
          />
        </li>
        <li>
          <Recipe
            kind="campaign"
            title="Campaña Paid Search"
            body="Anuncio RSA de Vercel con 5 titulares, 2 descripciones y 3 queries objetivo."
            onTrigger={trigger}
            pending={pending}
            pendingKind={pendingKind}
          />
        </li>
        <li>
          <Recipe
            kind="geo"
            title="GEO Tester"
            body="Visibilidad de Flat 101 en buscadores IA con 3 segmentos de intención JTBD."
            onTrigger={trigger}
            pending={pending}
            pendingKind={pendingKind}
          />
        </li>
        <li>
          <Recipe
            kind="momentum"
            title="Momentum"
            body="Trigger de activación (urgencia dental) asignado a perfiles aleatorios."
            onTrigger={trigger}
            pending={pending}
            pendingKind={pendingKind}
          />
        </li>
      </ul>

      {error && (
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
          {error}
        </div>
      )}

      {data && <ResultsBlock data={data} />}
    </section>
  );
}

function Recipe({
  kind,
  title,
  body,
  onTrigger,
  pending,
  pendingKind,
}: {
  kind: Kind;
  title: string;
  body: string;
  onTrigger: (kinds?: Kind[]) => void;
  pending: boolean;
  pendingKind: Kind | "all" | null;
}) {
  const isMine = pendingKind === kind;
  return (
    <div
      style={{
        padding: 16,
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-md)",
        background: "rgba(var(--fg),0.02)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        height: "100%",
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--accent-text)",
        }}
      >
        {title}
      </span>
      <p
        style={{
          color: "rgba(var(--fg),0.7)",
          fontSize: 13,
          lineHeight: 1.5,
          margin: 0,
          flex: 1,
        }}
      >
        {body}
      </p>
      <button
        type="button"
        onClick={() => onTrigger([kind])}
        disabled={pending}
        className="btn-pill"
        style={{ alignSelf: "flex-start", fontSize: 12 }}
      >
        {isMine ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Loader2 size={12} className="spin" /> Sembrando…
          </span>
        ) : (
          "Sembrar sólo este"
        )}
      </button>
    </div>
  );
}

function ResultsBlock({ data }: { data: Response }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
        Resultado · {data.profileIds.length} perfiles usados
      </h2>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {data.results.map((r, i) => (
          <li
            key={i}
            style={{
              padding: 14,
              border: `1px solid ${r.ok ? "rgba(var(--fg),0.08)" : "var(--error-500)"}`,
              borderRadius: "var(--radius-md)",
              background: r.ok ? "rgba(var(--fg),0.02)" : "rgba(180,35,24,0.06)",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span style={{ marginTop: 2, flexShrink: 0 }}>
              {r.ok ? (
                <CheckCircle2 size={16} color="var(--success-500)" />
              ) : (
                <XCircle size={16} color="var(--error-500)" />
              )}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(var(--fg),0.7)",
                }}
              >
                {r.kind}
              </span>
              {r.ok ? (
                <ResultLinks row={r} />
              ) : (
                <span style={{ color: "var(--error-500)", fontSize: 13 }}>{r.error}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultLinks({ row }: { row: ResultRow }) {
  const links: { href: string; label: string }[] = [];
  if (row.kind === "clarity") {
    if (row.targetId) links.push({ href: `/targets/${row.targetId}`, label: "Ver target" });
    if (row.runId) links.push({ href: `/experiments/five-second/${row.runId}`, label: "Ver run" });
  } else if (row.kind === "copy") {
    if (row.deckId) links.push({ href: `/copy/${row.deckId}`, label: "Ver deck" });
    if (row.runId) links.push({ href: `/experiments/copy/${row.runId}`, label: "Ver run" });
  } else if (row.kind === "pricing") {
    if (row.offerId) links.push({ href: `/pricing/${row.offerId}`, label: "Ver oferta" });
    if (row.runId) links.push({ href: `/experiments/pricing/${row.runId}`, label: "Ver run" });
  } else if (row.kind === "ab") {
    if (row.abTestId) links.push({ href: `/ab/${row.abTestId}`, label: "Ver A/B" });
    if (row.abTestId && row.runIds) {
      links.push({ href: `/experiments/ab/${row.abTestId}`, label: "Ver resultados" });
    }
  } else if (row.kind === "funnel") {
    if (row.funnelId) links.push({ href: `/funnels/${row.funnelId}`, label: "Ver embudo" });
    if (row.runId) links.push({ href: `/experiments/funnel/${row.runId}`, label: "Ver run" });
  } else if (row.kind === "campaign") {
    if (row.campaignId) links.push({ href: `/campaigns/${row.campaignId}`, label: "Ver campaña" });
    if (row.runId) links.push({ href: `/experiments/campaign/${row.runId}`, label: "Ver run" });
  } else if (row.kind === "geo") {
    if (row.geoId) {
      links.push({
        href: `/geo/${row.geoId}`,
        label: row.ran ? "Ver análisis" : "Ver análisis (sin lanzar)",
      });
    }
  } else if (row.kind === "momentum") {
    if (row.momentumId) {
      links.push({
        href: `/momentum/${row.momentumId}`,
        label: row.ran ? "Ver Trigger" : "Ver Trigger (sin lanzar)",
      });
    }
  }
  if (links.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--accent-text)",
            textDecoration: "underline",
            textUnderlineOffset: 3,
          }}
        >
          {l.label} →
        </Link>
      ))}
    </div>
  );
}
