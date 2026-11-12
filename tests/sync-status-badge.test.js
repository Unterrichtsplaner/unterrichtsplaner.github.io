// AH55: „Status: Synchronisiert“ in den Einstellungen überlappte die Zeile darunter. Der Kasten war ein Inline-<span>
// mit Innenabstand oben/unten (schiebt nichts weg); bei langem Status brach er dazu noch über die Zeitzeile.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

describe('Sync-Status in den Einstellungen', () => {
  it('Kasten ohne Inline-Stil, Gestaltung in style.css als eigener Block (inline-block)', () => {
    expect(html).toMatch(/<span id="sync-status-badge" class="sync-status-badge">/);
    expect(css).toMatch(/\.sync-status-badge\{display:inline-block;/);
    expect(css).toMatch(/\.sync-status\{display:flex;flex-direction:column;/);
  });
  it('Status ohne Ausrufezeichen (Regel 68)', () => {
    const app = require('./helpers/load-app').appSource();
    expect(app).not.toMatch(/'Status: [^']*!'/);
  });
});
