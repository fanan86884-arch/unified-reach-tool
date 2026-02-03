import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    // Pre-cache App Shell & assets to prevent offline white screen after the first online visit.
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: false, // keep using existing public/manifest.json
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json,txt,woff,woff2}"],
      },
      includeAssets: ["favicon.ico", "logo-icon.png", "manifest.json", "offline.html"],
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
