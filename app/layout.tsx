import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ConsoleBanner } from "@/components/console-banner";
import "./globals.css";

// Familia única: grotesca refinada (registro editorial oscuro, sin serif).
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gravity · Flat 101",
  description: "Plataforma de validación temprana: mide la eficacia antes de comprometer tráfico real.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

/* Aplica el tema guardado antes del primer paint. El oscuro es el de
   serie: sólo se marca el atributo cuando la preferencia es "light". */
const THEME_INIT = `(function(){try{if(localStorage.getItem("suaas-theme")==="light"){document.documentElement.dataset.theme="light"}}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={hanken.variable}
      style={{ height: "100%" }}
      suppressHydrationWarning
    >
      <body style={{ minHeight: "100%" }}>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <ConsoleBanner />
        {children}
        {/* Vercel Web Analytics: cookieless, first-party (/_vercel/insights),
            sin GTM ni datos a terceros. Solo pageviews de uso interno. */}
        <Analytics />
      </body>
    </html>
  );
}
