const CACHE_NAME = 'lehrer-app-v192';
const ASSETS = [
  './',
  './index.html',
  './app.js?v=192',
  './style.css?v=192',
  './manifest.json',
  './icon.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './lib/crypto-js.min.js',
  './crypto-helper.js?v=192',
  './lib/firebase-app-compat.js',
  './lib/firebase-auth-compat.js',
  './lib/firebase-firestore-compat.js',
  './firebase-config.js?v=192',
  './sync-manager.js?v=192'
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

// Wie lange die Seite auf den Server wartet, bevor sie die gecachte Version zeigt (hängendes Schul-WLAN)
const NAVIGATION_TIMEOUT_MS = 3000;

// Die Seite selbst (index.html): zuerst aus dem Netz, damit ein Update schon beim ersten Öffnen ankommt;
// offline, bei Serverfehler oder hängendem Netz die gecachte Version (BUGS G2).
// Die frische index.html wird NICHT in den Cache gelegt: sie verweist auf neue ?v=-Dateien, die in diesem
// Cache fehlen – offline passte dann nichts mehr zusammen. Den neuen Stand cacht der neue Service Worker.
function networkFirstPage(request) {
  const fromCache = () => caches.match(request).then(r => r || caches.match('./index.html'));
  return new Promise(resolve => {
    let done = false;
    const finish = (responsePromise) => { if (!done) { done = true; resolve(responsePromise); } };
    // Ohne gecachte Seite (noch nie installiert) weiter aufs Netz warten
    const timer = setTimeout(() => fromCache().then(cached => { if (cached) finish(cached); }), NAVIGATION_TIMEOUT_MS);
    fetch(request)
      .then(response => {
        clearTimeout(timer);
        if (response.ok) { finish(response); return; }
        // Serverfehler: lieber die gecachte Seite, und nur wenn es die nicht gibt, die Fehlerseite
        finish(fromCache().then(cached => cached || response));
      })
      .catch(() => { clearTimeout(timer); finish(fromCache().then(cached => cached || Response.error())); });
  });
}

self.addEventListener('fetch', event => {
  // Nur eigene Dateien abfangen. Firebase (Login, Firestore-Dauerverbindung) und andere Domains
  // gehen direkt ins Netz – sonst dreht der Lade-Kreisel endlos und „offline“ wird umgangen.
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstPage(event.request));
    return;
  }
  // Alle anderen eigenen Dateien: cache-first (dank ?v=-Nummer passen sie immer zur Seite)
  event.respondWith(
    caches.match(event.request).then(cachedResponse => cachedResponse || fetch(event.request))
  );
});
