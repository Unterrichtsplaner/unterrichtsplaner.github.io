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
