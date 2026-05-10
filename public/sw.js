/* MediFlow Patient Portal — Service Worker v1 */

const CACHE_VERSION = 'mediflow-portal-v1';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const API_CACHE     = `${CACHE_VERSION}-api`;

const PRECACHE_URLS = [
  '/mediflow/',
  '/mediflow/index.html',
];

/* ─── Install ──────────────────────────────────────────────────────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

/* ─── Activate ─────────────────────────────────────────────────────────────── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('mediflow-') && k !== STATIC_CACHE && k !== API_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ─── Fetch — Network-first for API, Cache-first for assets ─────────────────── */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  /* API calls: network-first, skip cache on failure */
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  /* Static assets: cache-first with network update */
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok && (
            url.pathname.endsWith('.js') ||
            url.pathname.endsWith('.css') ||
            url.pathname.endsWith('.png') ||
            url.pathname.endsWith('.svg') ||
            url.pathname.endsWith('.woff2') ||
            url.pathname === '/mediflow/' ||
            url.pathname === '/mediflow/index.html'
          )) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});

/* ─── Push Notifications ────────────────────────────────────────────────────── */
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data?.json() ?? {}; } catch { data = { body: event.data?.text() || '' }; }

  const title   = data.title   || 'MediFlow — تذكير موعد';
  const body    = data.body    || 'لديك موعد قريب. اضغط للتفاصيل.';
  const tag     = data.tag     || 'mediflow-appt';
  const url     = data.url     || '/mediflow/portal/dashboard';
  const urgency = data.urgency || 'normal'; // 'high' | 'normal' | 'low'

  const options = {
    body,
    icon:  '/mediflow/icons/icon-192.png',
    badge: '/mediflow/icons/badge-96.png',
    tag,
    dir: 'rtl',
    lang: 'ar',
    timestamp: data.timestamp ? new Date(data.timestamp).getTime() : Date.now(),
    requireInteraction: urgency === 'high',
    silent: urgency === 'low',
    vibrate: urgency === 'high' ? [300, 100, 300, 100, 300] : [200, 100, 200],
    data: { url, appointmentId: data.appointmentId },
    actions: [
      { action: 'view',    title: 'عرض الموعد',  icon: '/mediflow/icons/icon-192.png' },
      { action: 'dismiss', title: 'لاحقاً' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/* ─── Notification click ────────────────────────────────────────────────────── */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/mediflow/portal/dashboard';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        /* Focus existing window that already has the portal open */
        const existing = clientList.find(
          (c) => c.url.includes('/mediflow/') && 'focus' in c
        );
        if (existing) {
          existing.focus();
          existing.navigate?.(targetUrl);
          return;
        }
        /* Open a new window */
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

/* ─── Push subscription change ──────────────────────────────────────────────── */
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey,
    }).then((subscription) => {
      /* POST new subscription to backend */
      return fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });
    })
  );
});
