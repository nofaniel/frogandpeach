// Minimal service worker — cache the static shell, network-first for HTML.
const CACHE = 'flathub-v1';
const SHELL = ['/static/style.css', '/static/app.js', '/static/manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Static: cache-first
  if (url.pathname.startsWith('/static/')) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return resp;
    })));
    return;
  }
  // HTML: network-first, fall back to cached "/"
  e.respondWith(fetch(req).then(resp => {
    const copy = resp.clone();
    caches.open(CACHE).then(c => c.put(req, copy));
    return resp;
  }).catch(() => caches.match(req).then(r => r || caches.match('/'))));
});
