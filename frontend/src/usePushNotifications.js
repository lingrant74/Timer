// usePushNotifications.js — registers the service worker and subscribes
// the browser to push notifications.
import { useState, useEffect } from 'react';
import { getPublicKey, saveSubscription } from './api';

// The browser's pushManager.subscribe() needs the VAPID public key as a
// Uint8Array, but it's stored/transmitted as a base64url string.
function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const [subscriptionId, setSubscriptionId] = useState(
    () => localStorage.getItem('subscriptionId') || null
  );
  const [enabled, setEnabled] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (Notification.permission === 'granted' && subscriptionId) {
      setEnabled(true);
    }
  }, [subscriptionId]);

  async function enable() {
    setError(null);
    try {
      // 1. Ask for notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('Notification permission was denied. Allow it in your browser settings and try again.');
        return;
      }

      // 2. Register the service worker (or get the existing one)
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // 3. Get the VAPID public key from the backend
      const publicKey = await getPublicKey();

      // 4. Subscribe this device to push notifications
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,                        // required by browsers
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 5. Send the subscription to the backend so it can push to this device
      const { subscriptionId: id } = await saveSubscription(subscription.toJSON());

      localStorage.setItem('subscriptionId', id);
      setSubscriptionId(id);
      setEnabled(true);
    } catch (err) {
      setError(`Could not enable notifications: ${err.message}`);
    }
  }

  return { subscriptionId, enabled, enable, error };
}
