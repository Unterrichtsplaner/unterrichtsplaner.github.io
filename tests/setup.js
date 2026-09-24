// Gemeinsame Test-Umgebung: stellt nach, was der Browser vor app.js lädt.
// app.js wird unverändert per require() geladen und findet so dieselbe Welt vor wie in index.html.
const fs = require('fs');
const path = require('path');

// Das <body>-Markup aus index.html einsetzen, damit alle getElementById-Aufrufe echte Elemente finden.
// Inline-<script>-Tags werden über innerHTML nicht ausgeführt – gewollt.
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
document.body.innerHTML = body ? body[1] : '';

// Browser-APIs, die jsdom nicht mitbringt
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

// Cloud-Sync ist im Test aus: kein FIREBASE_CONFIG, SyncManager nur als leere Hülle.
globalThis.SyncManager = {
  isInitialized: false,
  currentUser: null,
  masterPassword: '',
  callbacks: {},
  init() { return false; },
  setMasterPassword(p) { this.masterPassword = p; },
};

localStorage.clear();

// Formulare setzen den Fokus per setTimeout (80 ms). Abwarten, damit das nicht nach dem Abbau von jsdom feuert.
afterAll(() => new Promise(r => setTimeout(r, 150)));
