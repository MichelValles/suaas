import type { Channel } from "@/lib/campaigns";

/**
 * Iconos monocromos (currentColor) para las redes publicitarias soportadas
 * en el módulo de Campañas. Paths inspirados en SimpleIcons (CC0 / MIT) y
 * simplificados a un solo path por icono para mantener consistencia visual
 * con los iconos de Lucide del resto de la app.
 */
export function ChannelIcon({
  channel,
  size = 18,
}: {
  channel: Channel;
  size?: number;
}) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": true,
    role: "img" as const,
    style: { display: "block" },
  };
  switch (channel) {
    case "google":
      return (
        <svg {...props}>
          <path d="M21.35 11.1H12v3.45h5.36c-.5 2.4-2.45 3.69-5.36 3.69-3.32 0-5.96-2.65-5.96-5.96s2.64-5.96 5.96-5.96c1.5 0 2.84.54 3.9 1.4l2.6-2.6C16.8 3.6 14.55 2.75 12 2.75c-5.16 0-9.34 4.18-9.34 9.34s4.18 9.34 9.34 9.34c5.4 0 8.95-3.78 8.95-9.1 0-.62-.05-1.05-.15-1.23z" />
        </svg>
      );
    case "meta":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          role="img"
          style={{ display: "block" }}
        >
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "linkedin":
      return (
        <svg {...props}>
          <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.42v1.56h.05c.48-.9 1.65-1.85 3.4-1.85 3.63 0 4.3 2.39 4.3 5.5v6.24zM5.34 7.43c-1.14 0-2.07-.93-2.07-2.07s.93-2.07 2.07-2.07 2.07.93 2.07 2.07-.93 2.07-2.07 2.07zm1.78 13.02H3.56V9h3.56v11.45zM21.78 0H2.2C.99 0 0 .98 0 2.18v19.64C0 23.02.99 24 2.2 24h19.58c1.21 0 2.22-.98 2.22-2.18V2.18C24 .98 22.99 0 21.78 0z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...props}>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3 0 .59.05.85.13V9.4a6.34 6.34 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.69a8.16 8.16 0 0 0 4.77 1.52V6.69h-1.84z" />
        </svg>
      );
    case "x":
      return (
        <svg {...props}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
  }
}
