// Ramen Hack Service Worker
// Version - update this to force cache refresh
const CACHE_NAME = 'ramen-hack-ub-v2';

const CACHED_FILES = [
  './ramen-hack-order.html',
  './ramen-hack-kitchen.html',
  './ramen-hack-cashier.html',
];

// On install - cache all files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching app files');
      return cache.addAll(CACHED_FILES);
    }).then(() => self.skipWaiting())
  );
});

// On activate - clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => {
              console.log('[SW] Removing old cache:', key);
              return caches.delete(key);
            })
      )
    ).then(() => self.clients.claim())
  );
});

// On fetch - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip Firebase and Google API requests - always use network for those
  const url = event.request.url;
  if (
    url.includes('firebaseio.com') ||
    url.includes('firebase.google.com') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com') ||
    url.includes('fonts.googleapis.com')
  ) {
    return; // Let browser handle Firebase/Google normally
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Serve from cache, update in background
        const networkFetch = fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {}); // silent fail if offline
        return cached;
      }
      // Not in cache - try network
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // Offline and not cached - return offline page if HTML
        if (event.request.destination === 'document') {
          return caches.match('./ramen-hack-order.html');
        }
      });
    })
  );
});
