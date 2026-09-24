// Service Worker (sw.js): welche Anfragen er abfängt (BUGS G9).
// sw.js wird in einer Attrappe der Service-Worker-Umgebung ausgeführt.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ORIGIN = 'https://unterrichtsplaner.github.io';

function loadServiceWorker() {
  const listeners = {};
  const sandbox = {
    self: {
      location: new URL(ORIGIN + '/sw.js'),
      addEventListener: (type, fn) => { listeners[type] = fn; },
      skipWaiting() {},
      clients: { claim() {} },
    },
    caches: { match: async () => undefined, open: async () => ({ put() {} }), keys: async () => [] },
    fetch: async () => new Response('netz'),
    URL, Response, Promise,
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8'), sandbox);
  return listeners;
}

// Simuliert ein fetch-Event; true = der Service Worker hat die Anfrage übernommen
function interceptsRequest(url, method = 'GET') {
  const { fetch: onFetch } = loadServiceWorker();
  let intercepted = false;
  onFetch({ request: { url, method }, respondWith: () => { intercepted = true; } });
  return intercepted;
}

describe('Service Worker fängt nur eigene Dateien ab', () => {
  it('eigene Dateien (GET) kommen aus dem Cache', () => {
    expect(interceptsRequest(ORIGIN + '/app.js?v=1')).toBe(true);
    expect(interceptsRequest(ORIGIN + '/')).toBe(true);
  });

  it('Firebase/Firestore (fremde Domain) geht direkt ins Netz – sonst dreht der Lade-Kreisel endlos', () => {
    expect(interceptsRequest('https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8')).toBe(false);
    expect(interceptsRequest('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=x', 'POST')).toBe(false);
    expect(interceptsRequest('https://fonts.googleapis.com/css2?family=Inter')).toBe(false);
  });

  it('POST-Anfragen werden nie abgefangen', () => {
    expect(interceptsRequest(ORIGIN + '/irgendwas', 'POST')).toBe(false);
  });
});
