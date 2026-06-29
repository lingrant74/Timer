// sw.js — Service Worker
// Runs in the background even when the browser tab is closed.
// Receives push events sent by the backend and shows notifications.

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  const title   = data.title || 'Timer done!';
  const options = {
    body:  data.body  || 'A timer has finished.',
    icon:  '/icon-192.png',
    badge: '/icon-192.png',
    // tag prevents duplicate notifications for the same timer
    tag:   `timer-${data.timerId}`,
    // renotify: true re-fires the sound/vibration even if the tag matches
    renotify: true,
    data: { url: self.registration.scope },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Bring the app to the foreground, or open a new tab if none is open
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(self.registration.scope);
      })
  );
});
