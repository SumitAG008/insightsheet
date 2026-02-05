const CACHE_NAME = 'meldra-pwa-v2';

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

const IS_NAVIGATION = (req) => {
  try {
    return req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
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

      // For navigations/HTML: network-first to avoid stale UI.
      if (IS_NAVIGATION(req)) {
        try {
          const res = await fetch(req);
          if (res && res.ok && res.type === 'basic') {
            cache.put(req, res.clone());
          }
          return res;
        } catch (e) {
          const cached = await cache.match(req);
          if (cached) return cached;
          const fallback = await cache.match('/');
          if (fallback) return fallback;
          throw e;
        }
      }

      // For static assets: cache-first.
      const cached = await cache.match(req);
      if (cached) return cached;

      const res = await fetch(req);
      if (res && res.ok && res.type === 'basic') {
        cache.put(req, res.clone());
      }
      return res;
    })()
  );
});
