const CACHE = 'rossy-app-v1';
const SHELL = ['./', 'index.html', 'styles.css', 'store.js', 'app.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png',
  'img/cocina.jpg', 'img/casa.jpg', 'img/piscina.jpg', 'img/jardin.jpg', 'img/cortinas-sala.jpg',
  'img/cortinas-sheer-altas.jpg', 'img/cortinas-zebra.jpg', 'img/screens-oficina.jpg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // red primero (siempre la versión más nueva), caché como respaldo sin conexión
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok && new URL(e.request.url).origin === location.origin) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
