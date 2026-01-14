// Service Worker for Push Notifications
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  let data = {
    title: '2B GYM',
    body: 'لديك إشعار جديد',
    icon: '/src/assets/logo.png',
    badge: '/src/assets/logo.png',
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
    icon: data.icon || '/src/assets/logo.png',
    badge: data.badge || '/src/assets/logo.png',
    tag: data.tag || 'notification',
    vibrate: [300, 100, 300, 100, 300], // Custom vibration pattern
    data: data.data || {},
    dir: 'rtl',
    lang: 'ar',
    requireInteraction: true,
    silent: false, // Allow sound
    actions: [
      { action: 'open', title: 'فتح' },
      { action: 'close', title: 'إغلاق' }
    ]
  };

  // Play notification sound by posting message to clients
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, options),
      // Notify all clients to play sound
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
        // Try to focus an existing window
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(urlToOpen);
            return;
          }
        }
        // Open new window if none found
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
