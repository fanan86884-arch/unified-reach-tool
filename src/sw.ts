/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { CacheFirst, StaleWhileRevalidate, NetworkFirst } from "workbox-strategies";
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
    denylist: [/^\/~oauth/, /^\/api\//, /\.(?:json|png|jpg|jpeg|svg|ico|css|js|map|txt|woff2?)$/],
  })
);

// Static assets: Cache First — serve from cache instantly, update in background
registerRoute(
  ({ request }) =>
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "image" ||
    request.destination === "font",
  new CacheFirst({
    cacheName: "2b-gym-assets",
    plugins: [new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
);

// Supabase API calls: Network first with fast timeout, fallback to cache
registerRoute(
  ({ url }) => url.hostname.includes("supabase.co"),
  new NetworkFirst({
    cacheName: "2b-gym-api",
    networkTimeoutSeconds: 3,
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 90 })],
  })
);

// Documents (non-navigation): Cache first for offline speed
registerRoute(
  ({ request }) => request.destination === "document",
  new CacheFirst({
    cacheName: "2b-gym-documents",
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 90 })],
  })
);

// Allow the app to force-activate new SW versions
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "SYNC_DATA") {
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({ type: "TRIGGER_SYNC" });
        });
      })
    );
  }
});

// Periodic background sync
self.addEventListener("periodicsync", (event: any) => {
  if (event.tag === "sync-subscribers") {
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({ type: "TRIGGER_SYNC" });
        });
      })
    );
  }
});

// Sync event for offline data
self.addEventListener("sync", (event: any) => {
  if (event.tag === "sync-offline-data") {
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({ type: "TRIGGER_SYNC" });
        });
      })
    );
  }
});

// Push notification handler — works even when app is closed
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

  // Use unique tag so multiple notifications don't collapse
  const tag = `${data.tag || "notification"}-${Date.now()}`;

  const options: NotificationOptions = {
    body: data.body,
    icon: data.icon || "/logo-icon.png",
    badge: data.badge || "/logo-icon.png",
    tag,
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
      // Try to play sound in any open window
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
      // Focus an existing window if available
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow?.(urlToOpen);
    })
  );
});

// Handle push subscription changes (e.g. browser refreshes the subscription)
self.addEventListener("pushsubscriptionchange", ((event: any) => {
  event.waitUntil(
    (async () => {
      try {
        // Re-subscribe with the same application server key
        const oldSubscription = event.oldSubscription;
        const newSubscription = await self.registration.pushManager.subscribe(
          oldSubscription?.options || { userVisibleOnly: true }
        );

        // Notify any open client to update the subscription in database
        const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        clientList.forEach((client) => {
          client.postMessage({
            type: "PUSH_SUBSCRIPTION_CHANGED",
            newSubscription: newSubscription.toJSON(),
          });
        });
      } catch (err) {
        console.error("Failed to re-subscribe on pushsubscriptionchange:", err);
      }
    })()
  );
}) as EventListener);
