// AH34: Abstände nur aus der festen Reihe (--space-1 … --space-6 = 4, 8, 12, 16, 24, 32).
// Erlaubt daneben: 0, feine 1 und 2 px (Plaketten, Haarlinien) und große Maße ab 40 px (Einrückungen, Leerflächen).
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const SPACING = /(?:^|[;{\s"'])((?:padding|margin)(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?|gap|row-gap|column-gap)\s*:\s*([^;}"']+)/g;
const badValues = text => {
  const out = [];
  for (const m of text.matchAll(SPACING)) {
    for (const v of m[2].matchAll(/(-?\d*\.?\d+)px/g)) {
      const n = Math.abs(parseFloat(v[1]));
      if (n > 2 && n < 40) { out.push(`${m[1]}: ${m[2].trim()}`); break; }
    }
  }
  return out;
};

describe('Abstände nur aus der festen Reihe', () => {
  it('style.css', () => {
    expect(badValues(read('style.css').replace(/\/\*[\s\S]*?\*\//g, ''))).toEqual([]);
  });
  it('Inline-Stile in index.html', () => {
    const inline = [...read('index.html').matchAll(/style="([^"]*)"/g)].map(m => m[1]).join(';');
    expect(badValues(inline)).toEqual([]);
  });
  it('Inline-Stile in app.js', () => {
    const inline = [...read('app.js').matchAll(/style="([^"]*)"/g)].map(m => m[1]).join(';');
    expect(badValues(inline)).toEqual([]);
  });
});

describe('Ein Seitenrand für alle Ansichten', () => {
  const css = read('style.css');
  it('--page-x: 24, auf dem Handy 16', () => {
    expect(css).toMatch(/:root\{[^}]*--page-x:var\(--space-5\);/);
    expect(css).toMatch(/@media \(max-width: 600px\)\{:root\{--page-x:var\(--space-4\);\}\}/);
  });
  it('Kopf und Inhalt jeder Ansicht nutzen ihn; keine zentrierte Spalte mit eigener Breite', () => {
    for (const rule of [/\.view-header\{[^}]*padding:0 var\(--page-x\)/, /\.timetable-grid-wrapper\{[^}]*padding:var\(--space-4\) var\(--page-x\)/, /#overview-content\{[^}]*padding:var\(--space-4\) var\(--page-x\)/, /#dashboard-content\{[^}]*padding:var\(--space-4\) var\(--page-x\)/, /\.todo-view\{[^}]*padding:var\(--space-4\) var\(--page-x\)/, /\.class-view-header\{[^}]*padding:var\(--space-4\) var\(--page-x\)/]) {
      expect(css).toMatch(rule);
    }
    expect(css).not.toMatch(/#dashboard-content\{[^}]*max-width/);
    expect(css).not.toMatch(/\.todo-view\{[^}]*max-width/);
    expect(css).not.toMatch(/\.subject-section\{[^}]*max-width/);
  });
});
