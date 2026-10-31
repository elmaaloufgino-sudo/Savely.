const CACHE = 'fyndaren-v20';
const SHELL = ['./', 'index.html', 'app.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  // Only handle our own files. Database, login, fonts and scripts go straight to the network.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('admin.html')) return;

  // Show a saved copy immediately and refresh it in the background.
  // On a first visit, fetch from the network and save a successful response.
  e.respondWith((async () => {
    const cached = await caches.match(req);
    const refresh = fetch(req).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy));
      }
      return res;
    });
    if (cached) {
      e.waitUntil(refresh.then(() => undefined).catch(() => undefined));
      return cached;
    }
    try {
      return await refresh;
    } catch (error) {
      return (await caches.match(req)) || (await caches.match('app.html'));
    }
  })());
});
