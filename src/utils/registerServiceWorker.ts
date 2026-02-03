export async function registerAppServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      // Our service worker is built as an ES module (via Vite PWA).
      type: "module",
    });

    await navigator.serviceWorker.ready;

    // Ensure the newest SW activates immediately
    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }

    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      if (!worker) return;

      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          worker.postMessage({ type: "SKIP_WAITING" });
        }
      });
    });
  } catch (err) {
    // Offline-first: if registration fails, app still works online; offline will work once SW is installed.
    console.warn("Service worker registration failed:", err);
  }
}
