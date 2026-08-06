/**
 * Service Worker: sw.js
 * Taisen Platform Offline Cache & Background Sync Service Worker
 */

const CACHE_NAME = 'taisen-offline-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/TAISEN_LIGHT_NEW.png',
  '/TAISEN_DARK_NEW.png',
];

// Install Event: Precache static app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Precaching App Shell Assets');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing Old Cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Stale-While-Revalidate strategy for static assets, Network-First for API
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip non-GET or chrome-extension requests
  if (event.request.method !== 'GET' || requestUrl.protocol === 'chrome-extension:') {
    return;
  }

  // Handle Static Assets / App Shell
  if (PRECACHE_ASSETS.includes(requestUrl.pathname) || event.request.destination === 'image' || event.request.destination === 'font' || event.request.destination === 'style' || event.request.destination === 'script') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // For API endpoints, Network First with Offline Fallback
  if (requestUrl.pathname.includes('/api/') || requestUrl.pathname.includes('/workspaces')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
