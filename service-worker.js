const CACHE_NAME = 'cashbook-v2';  // Version bump to force update

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request)
          .then(response => {
            if (response && response.status === 200 && response.type === 'basic') {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return response;
          });
      })
      .catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      })
  );
});

// ============================================
// NOTIFICATION CLICK HANDLER – opens specific reminder
// ============================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Extract reminder ID from tag
  const reminderId = event.notification.tag.replace('reminder-', '');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a window/tab is already open, focus it and pass reminder ID via URL
        for (const client of clientList) {
          if (client.url && 'focus' in client) {
            client.focus();
            // Use URL hash or query param to pass the reminder ID
            client.navigate(`/?reminder=${reminderId}`);
            return client;
          }
        }
        // Otherwise open a new window with the reminder ID
        return clients.openWindow(`/?reminder=${reminderId}`);
      })
  );
});
