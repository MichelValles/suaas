import Image from "next/image";
import Link from "next/link";
import { APP_VERSION } from "@/lib/version";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ink-900)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "clamp(20px, 3vw, 32px) clamp(24px, 5vw, 64px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Link
          href="/"
          aria-label="Inicio USAAS"
          style={{ display: "inline-flex", alignItems: "center", gap: 16 }}
        >
          <Image
            src="/logos/flat101.svg"
            alt="Flat 101"
            width={96}
            height={24}
            style={{ height: 24, width: "auto", filter: "brightness(0) invert(1)" }}
            priority
          />
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.28em",
              color: "var(--accent-500)",
              textTransform: "uppercase",
            }}
          >
            USAAS
          </span>
        </Link>
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontSize: 12,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
          className="mono"
        >
          <Link href="/" style={{ color: "rgba(255,255,255,0.7)" }}>
            Panel
          </Link>
          <Link href="/profiles" style={{ color: "rgba(255,255,255,0.7)" }}>
            Perfiles
          </Link>
          <Link href="/targets" style={{ color: "rgba(255,255,255,0.7)" }}>
            Targets
          </Link>
          <span
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.24em",
            }}
          >
            v{APP_VERSION}
          </span>
        </nav>
      </header>
      <main
        style={{
          flex: 1,
          padding: "clamp(28px, 5vw, 64px) clamp(24px, 5vw, 64px)",
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        {children}
      </main>
      <footer
        className="mono"
        style={{
          padding: "20px clamp(24px, 5vw, 64px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.4)",
        }}
      >
        <span>usaas.flat101.business</span>
        <span>build {APP_VERSION}</span>
      </footer>
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        maxWidth: 880,
      }}
    >
      {eyebrow && (
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--accent-500)",
          }}
        >
          {eyebrow}
        </span>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <h1
          className="display"
          style={{
            color: "#fff",
            fontSize: "clamp(36px, 5vw, 72px)",
            lineHeight: 1.05,
            maxWidth: 720,
          }}
        >
          {title}
        </h1>
        {actions}
      </div>
      {description && (
        <p
          className="body-lg"
          style={{ color: "rgba(255,255,255,0.7)", maxWidth: 640 }}
        >
          {description}
        </p>
      )}
    </header>
  );
}
