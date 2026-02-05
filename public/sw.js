const CACHE_NAME = 'meldra-pwa-v1';

// Cache only same-origin GET requests. Do not cache API responses.
const SHOULD_CACHE = (req) => {
  try {
    const url = new URL(req.url);
    if (req.method !== 'GET') return false;
    if (url.origin !== self.location.origin) return false;
    if (url.pathname.startsWith('/api/')) return false;
    return true;
  } catch (_) {
    return false;
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // App shell minimal set; additional assets will be cached on demand.
      await cache.addAll(['/']);
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
      self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (!SHOULD_CACHE(req)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Cache-first for static assets.
      const cached = await cache.match(req);
      if (cached) return cached;

      try {
        const res = await fetch(req);
        // Only cache successful basic responses.
        if (res && res.ok && res.type === 'basic') {
          cache.put(req, res.clone());
        }
        return res;
      } catch (e) {
        // Offline fallback: return cached '/' if available.
        const fallback = await cache.match('/');
        if (fallback) return fallback;
        throw e;
      }
    })()
  );
});
