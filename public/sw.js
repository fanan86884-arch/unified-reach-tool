// Service Worker for Push Notifications and Caching
const CACHE_NAME = '2b-gym-cache-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-icon.png',
  '/favicon.ico'
];

// App shell HTML for offline - enhanced with AMOLED black
const APP_SHELL = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#000000">
  <title>2B GYM</title>
  <link rel="icon" href="/favicon.ico">
  <link rel="apple-touch-icon" href="/logo-icon.png">
  <link rel="manifest" href="/manifest.json">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: system-ui, -apple-system, sans-serif;
      background: #000; 
      color: #fff;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 20px;
    }
    .container { max-width: 320px; }
    .logo { width: 100px; height: 100px; margin-bottom: 24px; filter: drop-shadow(0 0 20px rgba(245, 197, 24, 0.4)); }
    h1 { font-size: 32px; font-weight: 900; margin-bottom: 12px; color: #f5c518; letter-spacing: -1px; }
    p { color: #666; margin-bottom: 24px; line-height: 1.6; font-size: 14px; }
    .loading { 
      display: inline-block;
      width: 48px; 
      height: 48px; 
      border: 3px solid #1a1a1a;
      border-top-color: #f5c518;
      border-radius: 50%;
      animation: spin 0.8s ease-in-out infinite;
      margin-top: 24px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .offline-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(245, 197, 24, 0.1);
      color: #f5c518;
      padding: 10px 20px;
      border-radius: 24px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 24px;
      border: 1px solid rgba(245, 197, 24, 0.2);
    }
    .retry-btn {
      background: linear-gradient(135deg, #f5c518 0%, #d4a816 100%);
      color: #000;
      border: none;
      padding: 16px 32px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 16px;
      cursor: pointer;
      margin-top: 16px;
      box-shadow: 0 4px 20px rgba(245, 197, 24, 0.3);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .retry-btn:active { transform: scale(0.98); }
  </style>
</head>
<body>
  <div class="container">
    <img src="/logo-icon.png" alt="2B GYM" class="logo" onerror="this.style.display='none'">
    <h1>2B GYM</h1>
    <div class="offline-badge">
      <span>📶</span> وضع عدم الاتصال
    </div>
    <p>جاري تحميل البيانات المحفوظة...</p>
    <div class="loading"></div>
    <button class="retry-btn" onclick="location.reload()">إعادة المحاولة</button>
  </div>
  <script>
    // Try to load cached app
    if ('caches' in window) {
      caches.match('/').then(response => {
        if (response) {
          setTimeout(() => window.location.reload(), 1000);
        }
      });
    }
  </script>
</body>
</html>
`;

// Install event - cache static assets immediately
self.addEventListener('install', (event) => {
  console.log('Service Worker installing - v4');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('Caching static assets');
      // Cache static assets individually to handle failures gracefully
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (e) {
          console.warn('Failed to cache:', asset);
        }
      }
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean old caches and take control immediately
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated - v4');
  event.waitUntil(
    Promise.all([
      // Take control of all pages immediately
      clients.claim(),
      // Clean old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
    ])
  );
});

// Allow the app to force-activate new service worker versions
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch event - stale-while-revalidate for app, network-first for API
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API requests (supabase) - these should use app's offline logic
  if (event.request.url.includes('supabase.co')) return;

  // For navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        // Try cache first for instant load
        const cachedResponse = await caches.match(event.request);
        
        // Fetch in background to update cache
        const fetchPromise = fetch(event.request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        }).catch(() => null);

        // Return cached version immediately if available
        if (cachedResponse) {
          // Still try to update in background
          fetchPromise.catch(() => {});
          return cachedResponse;
        }

        // No cache - wait for network
        const networkResponse = await fetchPromise;
        if (networkResponse) return networkResponse;

        // Try to return the index page from cache
        const indexResponse = await caches.match('/');
        if (indexResponse) return indexResponse;
        
        // Last resort - return offline app shell
        return new Response(APP_SHELL, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      })()
    );
    return;
  }

  // For other assets (JS, CSS, images) - stale-while-revalidate
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(event.request);
      
      // Start fetch in background
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => null);

      // Return cached immediately if available
      if (cachedResponse) {
        fetchPromise.catch(() => {}); // Update in background
        return cachedResponse;
      }

      // Wait for network
      const networkResponse = await fetchPromise;
      if (networkResponse) return networkResponse;

      // Nothing available
      return new Response('Offline', { status: 503 });
    })()
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  let data = {
    title: '2B GYM',
    body: 'لديك إشعار جديد',
    icon: '/logo-icon.png',
    badge: '/logo-icon.png',
    tag: 'notification',
    data: {}
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        ...data,
        ...payload
      };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo-icon.png',
    badge: data.badge || '/logo-icon.png',
    tag: data.tag || 'notification',
    vibrate: [300, 100, 300, 100, 300],
    data: data.data || {},
    dir: 'rtl',
    lang: 'ar',
    requireInteraction: true,
    silent: false,
    actions: [
      { action: 'open', title: 'فتح' },
      { action: 'close', title: 'إغلاق' }
    ]
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, options),
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({
            type: 'PLAY_NOTIFICATION_SOUND',
            data: data
          });
        });
      })
    ])
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(urlToOpen);
            return;
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
