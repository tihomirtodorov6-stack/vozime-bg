// VoziMe - Push работи дори при затворен сайт
self.addEventListener('push', (event) => {
  let data = { title: '🔔 VoziMe', body: 'Нова поръчка!', orderId: null };
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    data.body = event.data ? event.data.text() : 'Нова поръчка!';
  }

  const options = {
    body: data.body,
    icon: '/icon-512.png',
    badge: '/icon-512.png',
    vibrate: [200, 100, 200, 100, 400],
    tag: 'vozime-' + (data.orderId || 'new'),
    renotify: true,
    data: { orderId: data.orderId, url: '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/');
    })
  );
});

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});