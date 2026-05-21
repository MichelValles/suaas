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
  title: "SUAAS · Flat 101",
  description: "Plataforma de test con usuarios sintéticos.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${nunito.variable} ${dmSerif.variable}`}
      style={{ height: "100%" }}
    >
      <body style={{ minHeight: "100%" }}>
        <ConsoleBanner />
        {children}
      </body>
    </html>
  );
}
