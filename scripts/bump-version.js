#!/usr/bin/env node
// Zählt die App-Version an ALLEN Stellen gleichzeitig hoch:
//   sw.js       → CACHE_NAME 'lehrer-app-vN' und die ?v=N in der ASSETS-Liste
//   index.html  → ?v=N bei app.js und style.css
// Ohne neue Version im Service Worker bekommen installierte Apps (iPad, Handy)
// die Änderungen nie zu sehen. Also: nach jeder Änderung vor dem Hochladen `npm run bump`.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const swPath = path.join(root, 'sw.js');
const htmlPath = path.join(root, 'index.html');

const sw = fs.readFileSync(swPath, 'utf8');
const match = sw.match(/lehrer-app-v(\d+)/);
if (!match) {
  console.error('CACHE_NAME in sw.js nicht gefunden – abgebrochen.');
  process.exit(1);
}
const next = Number(match[1]) + 1;

const setVersion = (text) => text
  .replace(/lehrer-app-v\d+/g, `lehrer-app-v${next}`)
  .replace(/\?v=\d+/g, `?v=${next}`);

fs.writeFileSync(swPath, setVersion(sw));
fs.writeFileSync(htmlPath, setVersion(fs.readFileSync(htmlPath, 'utf8')));

console.log(`Version: v${match[1]} → v${next} (sw.js + index.html)`);
