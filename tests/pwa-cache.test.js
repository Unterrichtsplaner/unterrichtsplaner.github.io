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

  // index.html kommt online frisch vom Server (BUGS G2). Eigene Dateien ohne ?v= kämen dann noch
  // aus dem alten Cache: neues app.js mit altem sync-manager.js. Nur lib/ ändert sich nie.
  it.each(localRefs.filter(url => /\.(js|css)(\?|$)/.test(url) && !url.startsWith('lib/')))(
    'eigene Datei "%s" hat eine ?v=-Nummer', (url) => {
      expect(url).toMatch(/\?v=\d+$/);
    });

  it('alle ?v=-Nummern entsprechen der Cache-Version (npm run bump benutzen)', () => {
    const cacheVersion = sw.match(/lehrer-app-v(\d+)/)[1];
    const versions = [...(html + sw).matchAll(/\?v=(\d+)/g)].map(m => m[1]);
    expect(new Set(versions)).toEqual(new Set([cacheVersion]));
  });
});

// PNG-Größe aus dem Dateikopf (IHDR: Breite/Höhe ab Byte 16)
function pngSize(file) {
  const buf = fs.readFileSync(path.join(root, file));
  expect(buf.subarray(1, 4).toString()).toBe('PNG');
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

describe('App-Icons und Manifest (BUGS G5)', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

  it('iOS-Icon ist ein PNG mit 180×180 (SVG kann iOS nicht)', () => {
    const href = html.match(/<link rel="apple-touch-icon"[^>]*href="([^"]+)"/)[1];
    expect(pngSize(href)).toEqual([180, 180]);
  });

  it('Manifest hat PNG-Icons 192 und 512, auch als „maskable“', () => {
    const pngs = manifest.icons.filter(i => i.type === 'image/png');
    for (const size of [192, 512]) {
      const icon = pngs.find(i => i.sizes === `${size}x${size}`);
      expect(icon, `${size}px`).toBeTruthy();
      expect(pngSize(icon.src)).toEqual([size, size]);
    }
    expect(pngs.some(i => i.purpose.split(' ').includes('maskable'))).toBe(true);
  });

  it('alle Icons liegen im Offline-Cache', () => {
    manifest.icons.forEach(i => expect(assets).toContain(i.src));
    expect(assets).toContain('manifest.json');
  });

  it('Name wie im Titel, Farben wie der dunkle App-Hintergrund', () => {
    const title = html.match(/<title>([^<]+)<\/title>/)[1];
    expect(manifest.name).toBe(title);
    expect(html).toContain(`<meta name="apple-mobile-web-app-title" content="${title}" />`);
    const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
    const appBg = css.match(/--bg-primary:\s*(#[0-9a-f]+)/i)[1];
    expect(manifest.background_color).toBe(appBg);
    expect(manifest.theme_color).toBe(appBg);
  });
});
