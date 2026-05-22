"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

type Kind = "copy" | "pricing" | "ab" | "funnel";

type ResultRow = {
  kind: string;
  ok: boolean;
  deckId?: string;
  offerId?: string;
  abTestId?: string;
  funnelId?: string;
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
        const res = await fetch("/api/seed/examples", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ launch, ...(kinds ? { kinds } : {}) }),
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
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "var(--radius-md)",
          background: "rgba(255,255,255,0.02)",
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
              color: "rgba(255,255,255,0.55)",
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
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 12px",
              color: "#fff",
              fontSize: 14,
              outline: "none",
              fontFamily: "var(--font-sans)",
              colorScheme: "dark",
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
              <Loader2 size={14} className="spin" /> Sembrando los 4…
            </span>
          ) : launch > 0 ? (
            `Crear los 4 y lanzar (${launch} perfiles)`
          ) : (
            "Crear los 4 (sin lanzar)"
          )}
        </button>
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
      </ul>

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

      {data && <ResultsBlock data={data} />}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } } .spin { animation: spin 1s linear infinite }`}</style>
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
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "var(--radius-md)",
        background: "rgba(255,255,255,0.02)",
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
          color: "var(--accent-500)",
        }}
      >
        {title}
      </span>
      <p
        style={{
          color: "rgba(255,255,255,0.7)",
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
          color: "var(--accent-500)",
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
              border: `1px solid ${r.ok ? "rgba(255,255,255,0.08)" : "var(--error-500)"}`,
              borderRadius: "var(--radius-md)",
              background: r.ok ? "rgba(255,255,255,0.02)" : "rgba(180,35,24,0.06)",
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
                  color: "rgba(255,255,255,0.7)",
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
  if (row.kind === "copy") {
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
            color: "var(--accent-500)",
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
