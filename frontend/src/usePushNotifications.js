import { useState, useEffect } from 'react';
import { getPublicKey, saveSubscription } from './api';

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Check whether this browser supports push notifications at all.
// Regular Safari on iPhone does NOT — only installed PWAs on iOS 16.4+.
function isPushSupported() {
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

export function usePushNotifications() {
  const [subscriptionId, setSubscriptionId] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    // Re-save the browser's existing push subscription whenever the app opens.
    // This repairs the server-side ID automatically if a deployment replaced
    // an ephemeral database while the phone retained its subscription.
    if (!isPushSupported() || Notification.permission !== 'granted') return;
    let cancelled = false;

    async function restoreSubscription() {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (!subscription) return;
        const { subscriptionId: id } = await saveSubscription(subscription.toJSON());
        if (cancelled) return;
        localStorage.setItem('subscriptionId', id);
        setSubscriptionId(id);
        setEnabled(true);
      } catch (err) {
        if (!cancelled) setError(`Could not restore notifications: ${err.message}`);
      }
    }

    restoreSubscription();
    return () => { cancelled = true; };
  }, []);

  async function enable() {
    setError(null);

    if (!isPushSupported()) {
      setError('Push notifications are not supported in this browser. On iPhone, install this app to your Home Screen first, then open it from there.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('Notification permission was denied. Allow it in your browser settings and try again.');
        return;
      }

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const publicKey = await getPublicKey();

      const existingSubscription = await reg.pushManager.getSubscription();
      const subscription = existingSubscription || await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

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
