// Jede benutzte CSS-Variable muss definiert sein (BUGS G3).
// Eine undefinierte var(--x) fällt still weg: kein Rahmen, keine Farbe, kein Radius.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const text = ['style.css', 'index.html', 'app.js']
  .map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');

// Mit Fallback (var(--x, …)) ist eine fehlende Definition Absicht, z. B. --card-color pro Karte
const used = new Set([...text.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)].map(m => m[1]));
const defined = new Set([
  ...[...text.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]),
  ...[...text.matchAll(/setProperty\(\s*['"](--[\w-]+)/g)].map(m => m[1]),
]);

describe('CSS-Variablen', () => {
  it.each([...used])('%s ist definiert', (name) => {
    expect(defined.has(name)).toBe(true);
  });
});
