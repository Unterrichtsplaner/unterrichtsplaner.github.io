// Paket kleiner Ärgernisse (09.11.): W7 Fenster auf dem iPhone, X5 „+“ in der Tagesansicht, W12 Tippflächen.
// (W9 Timer steht in tests/seating-timer.test.js.)
const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
const rule = sel => {
  const i = css.indexOf(sel + '{');
  return i < 0 ? '' : css.slice(i, css.indexOf('}', i));
};

describe('W7: Fenster passen auf das iPhone (Regel 56)', () => {
  it('Höhe nach der sichtbaren Fläche (dvh nach vh als Rückfall)', () => {
    expect(rule('.modal')).toMatch(/max-height:92vh;max-height:92dvh;/);
  });
  it('nicht per align-items/justify-content zentriert, sondern per margin:auto (sonst ragt Überstand oben hinaus)', () => {
    expect(rule('.modal-overlay')).not.toMatch(/align-items:center|justify-content:center/);
    expect(rule('.modal')).toMatch(/margin:auto/);
  });
  it('Fenster mit eigener Lage bleiben dort: Zufall unten, Suche oben', () => {
    expect(rule('#modal-seating-randomizer .modal')).toMatch(/margin:auto auto 0/);
    expect(rule('.search-palette')).toMatch(/margin:0 auto/);
  });
});

describe('X5: Tagesansicht zeigt „+“ in leeren Stunden (auf dem Handy gibt es kein Darüberfahren)', () => {
  it('in der Tagesansicht leise sichtbar, in der Woche weiter nur beim Darüberfahren', () => {
    expect(rule('.timetable-grid.day-view .tt-add-icon')).toMatch(/color:var\(--text-muted\)/);
    expect(rule('.tt-add-icon')).toMatch(/color:transparent/);
  });
});

describe('W12: Tippflächen auf Touch-Geräten', () => {
  it('„Rückgängig“ im Hinweis so hoch wie alle Knöpfe (--control-h, Regel 85)', () => {
    expect(rule('.toast-undo button')).toMatch(/min-height:var\(--control-h\)/);
  });
  it('Farbfelder auf Touch-Geräten so groß wie Knöpfe, am Laptop unverändert', () => {
    expect(css).toMatch(/@media \(pointer: coarse\)\{\.color-swatch\{width:var\(--control-h\);height:var\(--control-h\);\}\}/);
    expect(rule('.color-swatch')).toMatch(/width:26px;height:26px/);
  });
});
