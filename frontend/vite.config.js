/**
 * @file frontend/vite.config.js
 * @description Configuration Vite (React + Tailwind) + PWA minimale (install + update contrôlée).
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Update contrôlée : on affiche un toast puis on recharge à la demande.
      registerType: "prompt",
      includeAssets: [
        "icons/apple-touch-icon.png",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/icon-192-maskable.png",
        "icons/icon-512-maskable.png",
      ],
      manifest: {
        name: "Ginioux Flamary",
        short_name: "GF",
        description:
          "Application interne Ginioux Flamary : suivi des commandes, production et expéditions.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#f0f0f0",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-192-maskable.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
      devOptions: {
        // Dev : active le service worker pour tester en local.
        enabled: false,
      },
    }),
  ],
});
