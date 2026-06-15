const CACHE_NAME = 'cashbook-v3';
const urlsToCache = [
  '/tools/index.html',
  '/tools/manifest.json',
  '/tools/icon-192.png',
  '/tools/icon-512.png'
];

// Install event - cache all files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Cache all URLs
      await cache.addAll(urlsToCache);
      // Also cache the root (important for PWA)
      await cache.add('/tools/');
      return cache;
    })
  );
  self.skipWaiting();
});

// Fetch event - network first, then cache, with offline fallback
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  
  // Handle navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/tools/index.html');
      })
    );
    return;
  }
  
  // For other assets (CSS, JS, icons) - cache first
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }
      return fetch(event.request).then(response => {
        // Cache new files as they come
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Return a simple offline response for non-navigation requests
        if (event.request.destination === 'image') {
          return new Response(null, { status: 404, statusText: 'Not Found' });
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});
