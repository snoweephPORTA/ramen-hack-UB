// Ramen Hack service worker — v2
// HTML: network-first (always get latest code when online, cached when offline)
// Fonts/icons: cache-first
const CACHE = 'rh-cache-v2';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Never cache Firebase, Worker, or Apps Script traffic
  if (url.hostname.includes('firebaseio') || url.hostname.includes('workers.dev') ||
      url.hostname.includes('script.google') || url.hostname.includes('googleapis.com') && url.pathname.includes('macros')) return;
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    // network-first for the app itself
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request))
    );
  } else {
    // cache-first for fonts, icons, static assets
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }))
    );
  }
});
