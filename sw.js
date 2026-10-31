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

  // Start refreshing immediately; a cached response can be shown without waiting.
  const refresh = fetch(req).then(res => {
    if (!res.ok) return res;
    return caches.open(CACHE).then(cache => cache.put(req, res.clone())).then(() => res);
  });
  e.waitUntil(refresh.then(() => undefined).catch(() => undefined));
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      return await refresh;
    } catch (error) {
      return (await caches.match(req)) || (await caches.match('app.html'));
    }
  })());
});
