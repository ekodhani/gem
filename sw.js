const CACHE_NAME = 'game-q-v1';

// File inti yang wajib ke-cache biar app shell bisa buka offline.
// Tambahkan path game lain di sini kalau perlu (mis. './night_rush/night_rush.html').
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './night_rush/night_rush.html',
  './dino_escape/dino_escape.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll akan gagal seluruhnya kalau salah satu path 404 — pakai per-file
      // supaya file yang belum ada tidak menggagalkan install.
      return Promise.all(
        CORE_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn('SW: gagal cache', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Strategi: network-first untuk HTML (biar update game kepakai duluan),
// cache-first untuk asset statis lain. Fallback ke cache saat offline.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isHTML = req.headers.get('accept')?.includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((res) => res || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => cached);
    })
  );
});