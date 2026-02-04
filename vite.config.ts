import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Publishable fallbacks (safe to ship in the client). These prevent a blank screen
  // if the preview environment doesn't inject VITE_* vars.
  const FALLBACK_SUPABASE_URL = "https://xlowcsumezdzgjvjcvln.supabase.co";
  const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsb3djc3VtZXpkemdqdmpjdmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NjU0OTcsImV4cCI6MjA4MjQ0MTQ5N30.6Cu9NxG4I2C0G4NEZO5ag6mzuknD_Y6VGZSEAbKlLRI";
  const FALLBACK_SUPABASE_PROJECT_ID = "xlowcsumezdzgjvjcvln";

  const resolvedUrl =
    env.VITE_SUPABASE_URL ||
    env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    FALLBACK_SUPABASE_URL;

  const resolvedKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    FALLBACK_SUPABASE_PUBLISHABLE_KEY;

  const resolvedProjectId =
    env.VITE_SUPABASE_PROJECT_ID ||
    env.SUPABASE_PROJECT_ID ||
    process.env.VITE_SUPABASE_PROJECT_ID ||
    process.env.SUPABASE_PROJECT_ID ||
    FALLBACK_SUPABASE_PROJECT_ID;

  // Make sure Vite exposes these as import.meta.env.VITE_* in dev & build.
  process.env.VITE_SUPABASE_URL = resolvedUrl;
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = resolvedKey;
  process.env.VITE_SUPABASE_PROJECT_ID = resolvedProjectId;

  return {
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
          // Preview/dev environment may sit behind redirects which breaks SW registration.
          // Keep PWA enabled for production builds.
          enabled: false,
        },
      }),
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: [
        {
          find: /^@\/integrations\/supabase\/client$/,
          replacement: path.resolve(__dirname, "./src/integrations/supabase/client.runtime.ts"),
        },
        {
          find: "@",
          replacement: path.resolve(__dirname, "./src"),
        },
      ],
    },
  };
});
