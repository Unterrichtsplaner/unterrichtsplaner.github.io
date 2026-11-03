// Rückmeldungen 03.11.2026 (BUGS AH)
const fs = require('fs');
const path = require('path');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

describe('AH1: App vom Home-Bildschirm füllt das iPad', () => {
  it('als Home-Bildschirm-App: #app so hoch wie der Bildschirm, Rand in App-Farbe', () => {
    const block = CSS.match(/@media \(display-mode: standalone\)\{([\s\S]*?)\n\}/);
    expect(block).not.toBeNull();
    expect(block[1]).toMatch(/html,body\{background:var\(--bg-primary\);\}/);
    expect(block[1]).toMatch(/#app\{height:100%;\}/);
    // muss nach der Grundregel mit 100dvh stehen, sonst gewinnt die
    expect(CSS.indexOf('@media (display-mode: standalone)')).toBeGreaterThan(CSS.indexOf('height:100dvh'));
  });
  it('mit Seitenleiste: Ansichten bis unten, nur die Leiste hält Abstand zum Home-Balken (nach den Grundregeln)', () => {
    const i = CSS.indexOf('#sidebar,#sidebar.collapsed{padding-bottom:env(safe-area-inset-bottom);}');
    expect(i).toBeGreaterThan(-1);
    expect(CSS.slice(CSS.lastIndexOf('@media', i), i)).toMatch(/@media \(min-width: 601px\)\{\s*#app\{padding-bottom:0;\}/);
    expect(i).toBeGreaterThan(CSS.indexOf('#sidebar.collapsed { width: 88px; padding: 0; }'));
    expect(i).toBeGreaterThan(CSS.search(/#sidebar\{width:var\(--sidebar-width\)/));
  });
});

// Zweiter Anlauf (AH1b): iOS 26.1+ zieht über die Statusleiste einen Schleier (bei „black-translucent“), und die
// Seitenhöhe ist um die Statusleiste zu kurz. Beides lässt sich nur auf dem Gerät sehen; geprüft wird die Erkennung.
const { loadApp, app } = require('./helpers/load-app');
describe('AH1b: Home-Bildschirm-App auf dem iPad', () => {
  beforeAll(() => loadApp());
  const fit = o => app(`standaloneFullHeight(${JSON.stringify(o)})`);
  it('erkennt: Seite + Statusleiste = Bildschirm → volle Höhe (quer und hoch)', () => {
    // iPad 11″ quer: Bildschirm 834 × 1194, Seite 1194 × 802, Statusleiste 32
    expect(fit({ clientWidth: 1194, clientHeight: 802, screenWidth: 834, screenHeight: 1194, safeTop: 32 })).toBe(834);
    expect(fit({ clientWidth: 834, clientHeight: 1162, screenWidth: 834, screenHeight: 1194, safeTop: 32 })).toBe(1194);
  });
  it('ändert nichts, wenn die Höhe schon stimmt, im Fenster (Split View) oder ohne Statusleiste', () => {
    expect(fit({ clientWidth: 1194, clientHeight: 834, screenWidth: 834, screenHeight: 1194, safeTop: 32 })).toBeNull();
    expect(fit({ clientWidth: 700, clientHeight: 802, screenWidth: 834, screenHeight: 1194, safeTop: 32 })).toBeNull();
    expect(fit({ clientWidth: 1194, clientHeight: 834, screenWidth: 834, screenHeight: 1194, safeTop: 0 })).toBeNull();
    // Handy quer: zu niedrig für die feste Höhe, dort darf die Seite scrollen
    expect(fit({ clientWidth: 852, clientHeight: 393 - 20, screenWidth: 393, screenHeight: 852, safeTop: 20 })).toBeNull();
  });
  it('eigene Kante oben in App-Farbe, damit iOS keinen Schleier über die Statusleiste legt', () => {
    expect(document.getElementById('top-edge')).not.toBeNull();
    const block = CSS.match(/@media \(display-mode: standalone\)\{([\s\S]*?)\n\}/)[1];
    expect(block).toMatch(/#top-edge\{display:block;position:fixed;top:0;/);
    expect(block).toMatch(/html\.ios-gap #app\{position:fixed;/);
  });
});
