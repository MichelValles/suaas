import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Subir el límite del body de Server Actions desde el default de 1MB.
  // Los uploads de imágenes llegan como data: URL base64 (≈ 1.33× del
  // tamaño original), así que con 1MB se quedaba corto en cuanto pasaban
  // de ~700KB de imagen real. 10MB cubre screenshots de pantalla completa.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default config;
