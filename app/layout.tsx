import type { Metadata } from "next";
import { DM_Serif_Text, Nunito_Sans } from "next/font/google";
import { ConsoleBanner } from "@/components/console-banner";
import "./globals.css";

const nunito = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const dmSerif = DM_Serif_Text({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gravity · Flat 101",
  description: "Plataforma de test con perfiles calibrados.",
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
      className={`${nunito.variable} ${dmSerif.variable}`}
      style={{ height: "100%" }}
      suppressHydrationWarning
    >
      <body style={{ minHeight: "100%" }}>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <ConsoleBanner />
        {children}
      </body>
    </html>
  );
}
