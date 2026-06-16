"use client";

import { useEffect } from "react";
import { APP_VERSION } from "@/lib/version";

export function ConsoleBanner() {
  useEffect(() => {
    const label = "Gravity · FLAT 101";
    const host =
      typeof window !== "undefined"
        ? window.location.hostname
        : "suaas.flat101.business";

    const labelStyle =
      "background:#0a0b0d;color:#facc0d;padding:3px 8px;border-radius:2px;font-weight:700;letter-spacing:0.08em;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;";
    const versionStyle =
      "color:#facc0d;font-weight:500;margin-left:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;";
    const metaStyle =
      "color:#888;font-weight:400;margin-left:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;";

    console.log(
      `%c${label}%cv${APP_VERSION}%c· ${host}`,
      labelStyle,
      versionStyle,
      metaStyle,
    );
  }, []);

  return null;
}
