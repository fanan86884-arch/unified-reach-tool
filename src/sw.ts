/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<any>;
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// App Shell: always serve cached index.html for SPA navigations.
const navigationHandler = createHandlerBoundToURL("/index.html");
registerRoute(
  new NavigationRoute(navigationHandler, {
    // Avoid intercepting backend/function calls or asset files
    denylist: [/^\/api\//, /\.(?:json|png|jpg|jpeg|svg|ico|css|js|map|txt|woff2?)$/],
  })
);

// Static assets: fast cache with background update
registerRoute(
  ({ request }) =>
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "image" ||
    request.destination === "font",
  new StaleWhileRevalidate({
    cacheName: "2b-gym-assets",
    plugins: [new ExpirationPlugin({ maxEntries: 250, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  })
);

// Documents (non-navigation): network-first for freshness
registerRoute(
  ({ request }) => request.destination === "document",
  new NetworkFirst({
    cacheName: "2b-gym-documents",
    networkTimeoutSeconds: 3,
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 })],
  })
);

// Allow the app to force-activate new SW versions
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Push notification handler
self.addEventListener("push", (event) => {
  let data: any = {
    title: "2B GYM",
    body: "لديك إشعار جديد",
    icon: "/logo-icon.png",
    badge: "/logo-icon.png",
    tag: "notification",
    data: {},
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch {
      data.body = event.data.text();
    }
  }

  // TS libdom typings can be outdated in some setups (e.g. missing vibrate/actions).
  const options: any = {
    body: data.body,
    icon: data.icon || "/logo-icon.png",
    badge: data.badge || "/logo-icon.png",
    tag: data.tag || "notification",
    vibrate: [300, 100, 300, 100, 300],
    data: data.data || {},
    dir: "rtl",
    lang: "ar",
    requireInteraction: true,
    silent: false,
    actions: [
      { action: "open", title: "فتح" },
      { action: "close", title: "إغلاق" },
    ],
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, options),
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({ type: "PLAY_NOTIFICATION_SOUND", data });
        });
      }),
    ])
  );
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") return;
  const urlToOpen = (event.notification as any).data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      return self.clients.openWindow?.(urlToOpen);
    })
  );
});
