import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";
import { createRequire } from "node:module";

const { version } = createRequire(import.meta.url)("./package.json");

// Configuración de build para producción (Vercel) — sin acoplamiento a Medo.dev
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
    {
      // Sustituye %APP_VERSION% en index.html (cache-busting del favicon).
      name: "html-app-version",
      transformIndexHtml: {
        order: "pre" as const,
        handler: (html: string) => html.replaceAll("%APP_VERSION%", version),
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
