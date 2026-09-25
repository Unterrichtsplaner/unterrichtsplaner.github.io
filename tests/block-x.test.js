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
