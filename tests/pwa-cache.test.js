// Prüft, dass der Service Worker genau die Dateien cacht, die index.html lädt.
// Stimmen die ?v=-Nummern nicht überein, startet die App offline nicht mehr.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

const assets = [...sw.match(/const ASSETS = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)]
  .map(m => m[1].replace(/^\.\//, ''));

const localRefs = [...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g)]
  .map(m => m[1])
  .filter(url => !/^(https?:)?\/\//.test(url));

describe('Service-Worker-Cache', () => {
  it.each(localRefs)('index.html lädt "%s" – das muss exakt so im Cache stehen', (url) => {
    expect(assets).toContain(url);
  });

  it.each(assets.filter(a => a !== ''))('Cache-Eintrag "%s" existiert als Datei', (asset) => {
    expect(fs.existsSync(path.join(root, asset.split('?')[0]))).toBe(true);
  });

  it('alle ?v=-Nummern entsprechen der Cache-Version (npm run bump benutzen)', () => {
    const cacheVersion = sw.match(/lehrer-app-v(\d+)/)[1];
    const versions = [...(html + sw).matchAll(/\?v=(\d+)/g)].map(m => m[1]);
    expect(new Set(versions)).toEqual(new Set([cacheVersion]));
  });
});
