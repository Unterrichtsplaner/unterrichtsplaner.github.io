// Service Worker (sw.js): welche Anfragen er abfängt (BUGS G9), Seite zuerst aus dem Netz (BUGS G2).
// sw.js wird in einer Attrappe der Service-Worker-Umgebung ausgeführt.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ORIGIN = 'https://unterrichtsplaner.github.io';

function loadServiceWorker(env = {}) {
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
    URL, Response, Promise, setTimeout, clearTimeout,
    ...env,
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

// Aufruf der Seite (Navigation): liefert die Antwort des Service Workers als Text
async function navigate(env) {
  const { fetch: onFetch } = loadServiceWorker(env);
  let responsePromise;
  onFetch({ request: { url: ORIGIN + '/', method: 'GET', mode: 'navigate' }, respondWith: p => { responsePromise = p; } });
  expect(responsePromise).toBeDefined();
  return (await responsePromise).text();
}

// Cache-Attrappe: kennt nur die gecachte index.html der installierten Version
function fakeCaches(puts = []) {
  return {
    match: async (req) => {
      const url = typeof req === 'string' ? req : req.url;
      return /\/$|index\.html$/.test(url) ? new Response('index aus dem Cache') : undefined;
    },
    open: async () => ({ put: (...args) => { puts.push(args); } }),
    keys: async () => [],
  };
}

describe('Seite selbst: zuerst aus dem Netz, offline aus dem Cache (G2)', () => {
  it('online: neue index.html vom Server – Updates kommen ohne zweites Öffnen an', async () => {
    const puts = [];
    const text = await navigate({ caches: fakeCaches(puts), fetch: async () => new Response('index vom Server') });
    expect(text).toBe('index vom Server');
    // Nicht in den alten Cache schreiben: die neue index.html verweist auf Dateien, die dort fehlen
    expect(puts).toEqual([]);
  });

  it('offline: index.html aus dem Cache', async () => {
    const text = await navigate({ caches: fakeCaches(), fetch: async () => { throw new TypeError('offline'); } });
    expect(text).toBe('index aus dem Cache');
  });

  it('Server-Fehler (z. B. 404 während des Deploys): index.html aus dem Cache', async () => {
    const text = await navigate({ caches: fakeCaches(), fetch: async () => new Response('weg', { status: 404 }) });
    expect(text).toBe('index aus dem Cache');
  });

  it('WLAN hängt: nach wenigen Sekunden aus dem Cache statt ewig weiß', async () => {
    vi.useFakeTimers();
    try {
      const pending = navigate({ caches: fakeCaches(), fetch: () => new Promise(() => {}) });
      await vi.advanceTimersByTimeAsync(5000);
      expect(await pending).toBe('index aus dem Cache');
    } finally {
      vi.useRealTimers();
    }
  });

  it('hängendes Netz ohne gecachte Seite (erste Installation): weiter aufs Netz warten', async () => {
    vi.useFakeTimers();
    try {
      let answer;
      const pending = navigate({
        caches: { match: async () => undefined },
        fetch: () => new Promise(resolve => { answer = resolve; }),
      });
      await vi.advanceTimersByTimeAsync(5000);
      answer(new Response('index vom Server'));
      expect(await pending).toBe('index vom Server');
    } finally {
      vi.useRealTimers();
    }
  });

  it('andere eigene Dateien bleiben cache-first', async () => {
    const { fetch: onFetch } = loadServiceWorker({
      caches: { match: async () => new Response('app aus dem Cache') },
      fetch: async () => new Response('app vom Server'),
    });
    let responsePromise;
    onFetch({ request: { url: ORIGIN + '/app.js?v=1', method: 'GET', mode: 'no-cors' }, respondWith: p => { responsePromise = p; } });
    expect(await (await responsePromise).text()).toBe('app aus dem Cache');
  });
});
