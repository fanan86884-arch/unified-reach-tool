// Service Worker for Push Notifications and Caching
const CACHE_NAME = '2b-gym-cache-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-icon.png',
  '/favicon.ico',
  '/install'
];

// App shell HTML for offline - will load cached JS/CSS
const APP_SHELL = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#1a1b20">
  <title>2B GYM</title>
  <link rel="icon" href="/favicon.ico">
  <link rel="apple-touch-icon" href="/logo-icon.png">
  <link rel="manifest" href="/manifest.json">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: system-ui, -apple-system, sans-serif;
      background: #1a1b20; 
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
    .logo { width: 80px; height: 80px; margin-bottom: 20px; }
    h1 { font-size: 28px; margin-bottom: 10px; color: #f5c518; }
    p { color: #888; margin-bottom: 20px; line-height: 1.6; }
    .loading { 
      display: inline-block;
      width: 40px; 
      height: 40px; 
      border: 3px solid #333;
      border-top-color: #f5c518;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-top: 20px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .offline-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .retry-btn {
      background: #f5c518;
      color: #000;
      border: none;
      padding: 14px 28px;
      border-radius: 12px;
      font-weight: bold;
      font-size: 16px;
      cursor: pointer;
      margin-top: 10px;
    }
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
    // Check if we have cached app assets and redirect
    if ('caches' in window) {
      caches.match('/').then(response => {
        if (response) {
          // We have cached content, reload to show app
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      });
    }
  </script>
</body>
</html>
`;

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installed - v3');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(
    Promise.all([
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

// Fetch event - cache first for app assets, network first for API
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API requests (supabase) - these should use app's offline logic
  if (event.request.url.includes('supabase.co')) return;

  // For navigation requests, try network first but have good fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the page for offline use
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Offline - try cache first, then app shell
          return caches.match(event.request).then((response) => {
            if (response) return response;
            
            // Try to return the index page from cache
            return caches.match('/').then((indexResponse) => {
              if (indexResponse) return indexResponse;
              
              // Last resort - return offline app shell
              return new Response(APP_SHELL, {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
              });
            });
          });
        })
    );
    return;
  }

  // For other assets (JS, CSS, images) - cache first, network fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cache and update in background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }
      
      // No cache - try network
      return fetch(event.request).then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        return new Response('Offline', { status: 503 });
      });
    })
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
