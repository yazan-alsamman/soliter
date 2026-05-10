import { useState, useEffect, useCallback } from 'react';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const [permission,    setPermission]    = useState(() => {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission;
  });
  const [subscription,  setSubscription]  = useState(null);
  const [swRegistration, setSwReg]        = useState(null);
  const [isLoading,     setIsLoading]     = useState(false);
  const [error,         setError]         = useState(null);

  const isSupported = permission !== 'unsupported' && 'serviceWorker' in navigator && 'PushManager' in window;

  /* Register SW & restore existing subscription */
  useEffect(() => {
    if (!isSupported) return;
    navigator.serviceWorker.ready.then((reg) => {
      setSwReg(reg);
      return reg.pushManager.getSubscription();
    }).then((sub) => {
      if (sub) setSubscription(sub);
    }).catch(() => {});
  }, [isSupported]);

  /* Subscribe */
  const subscribe = useCallback(async () => {
    if (!isSupported || !swRegistration) return;
    setIsLoading(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return;

      const options = { userVisibleOnly: true };
      if (VAPID_PUBLIC_KEY) {
        options.applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      }

      const sub = await swRegistration.pushManager.subscribe(options);
      setSubscription(sub);

      /* Send subscription to backend */
      if (VAPID_PUBLIC_KEY) {
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub }),
        }).catch(() => {});
      }
    } catch (err) {
      setError(err.message || 'فشل تفعيل الإشعارات');
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, swRegistration]);

  /* Unsubscribe */
  const unsubscribe = useCallback(async () => {
    if (!subscription) return;
    setIsLoading(true);
    try {
      await subscription.unsubscribe();
      setSubscription(null);
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      }).catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [subscription]);

  /* Demo: trigger a test notification locally (no server needed) */
  const sendTestNotification = useCallback(async () => {
    if (!swRegistration || permission !== 'granted') return;
    swRegistration.showNotification('MediFlow — تذكير تجريبي', {
      body: 'لديك موعد غداً الساعة 10:00 صباحاً. نذكّرك تلقائياً.',
      icon: '/mediflow/icons/icon-192.png',
      badge: '/mediflow/icons/badge-96.png',
      dir: 'rtl',
      lang: 'ar',
      tag: 'test-demo',
      vibrate: [200, 100, 200],
      actions: [
        { action: 'view', title: 'عرض الموعد' },
        { action: 'dismiss', title: 'لاحقاً' },
      ],
    });
  }, [swRegistration, permission]);

  return {
    isSupported,
    permission,
    subscription,
    isSubscribed: Boolean(subscription),
    isLoading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}
