// Block X (Review 25.09.2026, dritte Runde): Durchklicken – Layout, iPad.
const fs = require('fs');
const path = require('path');

const CSS = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
// Oberste #app-Regel (außerhalb jeder @media-Regel)
const baseApp = CSS.match(/^#app\{[^}]*\}/m)[0];

describe('X1: App füllt auf dem iPad den ganzen Bildschirm', () => {
  it('die Grundregel begrenzt #app nicht und zeichnet keinen Kartenrahmen', () => {
    expect(baseApp).not.toMatch(/max-width/);
    expect(baseApp).not.toMatch(/max-height/);
    expect(baseApp).not.toMatch(/border-radius/);
    expect(baseApp).not.toMatch(/box-shadow/);
  });

  it('der Kartenrahmen gilt nur für große Fenster mit Maus (nicht für Touch-Geräte)', () => {
    const framed = CSS.match(/@media \(hover: ?hover\) and \(pointer: ?fine\)[^{]*\{\s*#app\{[^}]*max-width:1180px[^}]*\}/);
    expect(framed).not.toBeNull();
    // Das größte iPad (Pro 13″) ist quer 1376 px breit und kann mit Trackpad hover/fine melden: Breite darüber
    // schließt es in beiden Ausrichtungen aus. Die Höhe muss Platz für die Karte (820 px) samt Rand lassen.
    const minW = Number(framed[0].match(/min-width: ?(\d+)px/)[1]);
    const minH = Number(framed[0].match(/min-height: ?(\d+)px/)[1]);
    expect(minW).toBeGreaterThan(1376);
    expect(minH).toBeGreaterThan(820);
  });
});

describe('X7: Ziehen am Rand bewegt nicht die ganze App (Gummiband-Effekt)', () => {
  it('html und body federn nicht nach', () => {
    const rule = CSS.match(/^html,body\{[^}]*\}/m)[0];
    expect(rule).toMatch(/overscroll-behavior:none/);
  });
});

describe('X8: keine vermeidbaren Meldungen in der Konsole', () => {
  const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const SW = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');

  it('Tab-Symbol ist angegeben (sonst sucht der Browser favicon.ico → 404) und liegt im Offline-Cache', () => {
    const icons = [...HTML.matchAll(/<link rel="icon"[^>]*href="([^"]+)"/g)].map(m => m[1]);
    expect(icons.length).toBeGreaterThan(0);
    icons.forEach(href => {
      expect(fs.existsSync(path.join(__dirname, '..', href)), href).toBe(true);
      expect(SW).toContain(`'./${href}'`);
    });
  });

  it('Vollbild vom Home-Bildschirm: neue Angabe plus die alte für ältere iPads', () => {
    expect(HTML).toMatch(/<meta name="mobile-web-app-capable" content="yes"/);
    expect(HTML).toMatch(/<meta name="apple-mobile-web-app-capable" content="yes"/);
  });
});

describe('X9: jede Beschriftung gehört zu ihrem Feld (Chrome „No label associated with a form field“)', () => {
  const { loadApp } = require('./helpers/load-app');
  beforeAll(() => loadApp());

  it('jedes <label> hat ein Feld (per for oder darin)', () => {
    const loose = [...document.querySelectorAll('label')].filter(l => !l.control).map(l => l.textContent.trim());
    expect(loose).toEqual([]);
  });

  it('Tippen auf die Beschriftung setzt den Fokus ins Feld', () => {
    const label = document.querySelector('label[for="new-student-first"]');
    expect(label).not.toBeNull();
    expect(label.control.id).toBe('new-student-first');
  });

  it('Farbauswahl und Hälften-Auswahl sind als Gruppe mit Namen ausgezeichnet', () => {
    ['lesson-color-picker', 'group-color-picker', 'settings-bg-colors', 'settings-accent-colors', 'lesson-part-options'].forEach(id => {
      const el = document.getElementById(id);
      expect(el, id).not.toBeNull();
      const nameEl = document.getElementById(el.getAttribute('aria-labelledby') || '');
      expect(nameEl && nameEl.textContent.trim(), id).toBeTruthy();
      expect(['group', 'radiogroup'], id).toContain(el.getAttribute('role'));
    });
  });
});
