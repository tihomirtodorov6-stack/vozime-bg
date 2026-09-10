// VoziMe Service Worker - Push Notifications
self.addEventListener('push', (event) => {
  console.log('Push received', event);
  let data = { title: '🔔 VoziMe', body: 'Нова нотификация!', orderId: null };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    data.body = event.data? event.data.text() : 'Нова поръчка!';
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: data.title.includes('ВРАТАТА')? [500,200,500,200,1000] : [200,100,200,100,400],
    tag: data.orderId || 'vozime-notification',
    renotify: true,
    requireInteraction: data.title.includes('ВРАТАТА') || data.title.includes('МАГАЗИНА'),
    data: { orderId: data.orderId, url: '/' },
    actions: [
      { action: 'open', title: '👁️ Отвори' },
      { action: 'close', title: '❌ Затвори' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked', event);
  event.notification.close();

  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('install', (event) => {
  console.log('SW installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('SW activated');
  event.waitUntil(clients.claim());
});