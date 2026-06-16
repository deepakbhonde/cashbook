const CACHE_NAME = 'cashbook-v2';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

/* INSTALL */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );

  self.skipWaiting();
});

/* ACTIVATE */
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

/* FETCH */
self.addEventListener('fetch', (event) => {

  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => {

        if (cached) return cached;

        return fetch(event.request)
          .then(response => {

            if (
              response &&
              response.status === 200 &&
              response.type === 'basic'
            ) {

              const clone = response.clone();

              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, clone));
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

/* SHOW NOTIFICATION */
self.addEventListener('message', async (event) => {

  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {

    const payload = event.data.payload || {};

    self.registration.showNotification(
      payload.title || 'Reminder',
      {
        body: payload.body || '',
        icon: './icon-192.png',
        badge: './icon-192.png',
        tag: payload.id || 'cashbook-reminder',
        requireInteraction: true,
        data: payload
      }
    );

  }

});

/* NOTIFICATION CLICK */
self.addEventListener('notificationclick', (event) => {

  event.notification.close();

  const reminderData = event.notification.data || {};

  event.waitUntil(

    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {

      for (const client of clientList) {

        client.focus();

        client.postMessage({
          type: 'OPEN_REMINDER',
          reminderId: reminderData.id
        });

        return;
      }

      return clients.openWindow('./');

    })

  );

});

/* NOTIFICATION CLOSE */
self.addEventListener('notificationclose', (event) => {
  console.log('Reminder dismissed');
});
