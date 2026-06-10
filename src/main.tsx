import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Auto-recover from stale chunk references after a new deploy.
// When index.html is cached but lazy-loaded JS chunks have been replaced,
// dynamic import() throws "Importing a module script failed." — reload once.
const RELOAD_FLAG = "chunk-reload-attempt";
const isChunkLoadError = (msg: string) =>
  /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|ChunkLoadError/i.test(
    msg
  );

const tryReload = () => {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return;
    sessionStorage.setItem(RELOAD_FLAG, "1");
  } catch {}
  // Clear caches so the next load fetches fresh assets
  const doReload = () => window.location.reload();
  if (typeof caches !== "undefined") {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).finally(doReload);
  } else {
    doReload();
  }
};

window.addEventListener("error", (e) => {
  if (e?.message && isChunkLoadError(e.message)) tryReload();
});
window.addEventListener("unhandledrejection", (e) => {
  const msg = (e?.reason && (e.reason.message || String(e.reason))) || "";
  if (isChunkLoadError(msg)) tryReload();
});

// Clear the reload flag on successful full load
window.addEventListener("load", () => {
  try {
    sessionStorage.removeItem(RELOAD_FLAG);
  } catch {}
});

// Service Worker is now auto-registered by vite-plugin-pwa
createRoot(document.getElementById("root")!).render(<App />);
