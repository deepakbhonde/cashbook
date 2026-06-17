const CACHE_NAME = 'cashbook-v3'; // bumped: forces cache refresh

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ============================================
// INSTALL – cache all assets
// ============================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .catch(err => console.warn('[SW] Cache addAll partial failure:', err))
  );
  self.skipWaiting();
});

// ============================================
// ACTIVATE – delete old caches
// ============================================
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

// ============================================
// FETCH – cache-first strategy
// ============================================
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
// NOTIFICATION CLICK – open specific reminder
// FIX 1: Use data.reminderId (not just tag string parsing)
// FIX 2: postMessage to existing tab (avoids page reload)
//         openWindow with URL param only for new tab
// ============================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Prefer data.reminderId set in scheduleNotification; fallback to tag
  const reminderId =
    (event.notification.data && event.notification.data.reminderId)
      ? event.notification.data.reminderId
      : event.notification.tag.replace('reminder-', '');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) {
          // App tab already open → focus + postMessage (no reload!)
          // index.html's 'message' listener handles 'OPEN_REMINDER'
          const client = clientList[0];
          client.focus();
          client.postMessage({
            type: 'OPEN_REMINDER',
            payload: { reminderId }
          });
          return;
        }
        // No open tab → open new window; handleURLParams() in index.html picks it up
        return clients.openWindow(`/?reminder=${reminderId}`);
      })
  )
})
