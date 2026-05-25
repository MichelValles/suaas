import type { Metadata } from "next";
import { OnboardClient } from "./onboard-client";

export const metadata: Metadata = {
  title: "Crea tu gemelo sintético · SUAAS",
  description:
    "Contesta unas preguntas en 10 minutos y veremos cómo se comporta tu gemelo sintético.",
  robots: { index: false, follow: false },
};

export default function OnboardPage() {
  return <OnboardClient />;
}
