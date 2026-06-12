const CACHE_NAME = 'lehrer-app-v172';
const ASSETS = [
  './',
  './index.html',
  './app.js?v=172',
  './style.css?v=172',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Use cache-busting on install so we don't accidentally cache old HTTP-cached files
      return Promise.all(
        ASSETS.map(url => {
          const bustUrl = url + (url.includes('?') ? '&' : '?') + 'buster=' + Date.now();
          return fetch(bustUrl).then(response => {
            if (!response.ok) throw new Error('Fetch failed for ' + url);
            return cache.put(url, response); // Save as original URL
          });
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Cache-First Strategy: NEVER go to network if it's in the cache
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Return cached version if found
      if (cachedResponse) {
        return cachedResponse;
      }
      // Otherwise fallback to network (only happens on first load or for uncached assets)
      return fetch(event.request);
    })
  );
});
