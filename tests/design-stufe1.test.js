// Anti-Slop Stufe 1 (BUGS AE1–AE3, AE7, AE9): keine Verlaufsschrift, kein Leuchten, ruhige Meldungen, keine Spaß-Bewegung
const fs = require('fs');
const path = require('path');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const JS = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

describe('Anti-Slop Stufe 1', () => {
  it('keine Verlaufsschrift (Logo)', () => {
    expect(CSS).not.toMatch(/background-clip:\s*text/);
    expect(CSS).not.toMatch(/text-fill-color:\s*transparent/);
  });
  it('kein farbiges Leuchten unter Knöpfen und Fenstern', () => {
    expect(CSS).not.toMatch(/--shadow-accent/);
    expect(CSS + HTML).not.toMatch(/box-shadow:\s*0 \d+px \d+px var\(--accent-glow\)/);
    expect(HTML).not.toMatch(/box-shadow:\s*0 0 30px/);
  });
  it('Meldungen ohne Ausrufezeichen und ohne „erfolgreich“', () => {
    const toasts = JS.match(/showToast\((['`])(.*?)\1/g) || [];
    expect(toasts.filter(t => /!['`]$|erfolgreich/.test(t))).toEqual([]);
  });
  it('keine Geviertstriche in sichtbaren Texten', () => {
    expect(HTML).not.toMatch(/—/);
    expect(JS.replace(/\/\/.*$/gm, '').replace(/\[-–—\]/g, '')).not.toMatch(/—/);
  });
  it('keine Gedankenstriche „ – “ in sichtbaren Texten, nur in Spannen (12.10. – 16.10., 07:45 – 08:30) (AE11)', () => {
    // Spanne: Zahl oder ${…} auf beiden Seiten
    const span = /(\d\.?|\}) – (\d|\$\{)/g;
    const html = HTML.replace(/<!--[\s\S]*?-->/g, '').replace(span, '');
    const js = JS.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '').replace(span, '');
    expect(html.split('\n').filter(l => / – /.test(l))).toEqual([]);
    expect(js.split('\n').filter(l => / – /.test(l))).toEqual([]);
  });
  it('Darüberfahren vergrößert nichts (Bewegung nur für Zustände)', () => {
    const hoverBlocks = CSS.match(/@media \(hover: hover\)\{[^@]*?\}\}/g) || [];
    expect(hoverBlocks.filter(b => /scale\(/.test(b))).toEqual([]);
    expect(CSS).toMatch(/@keyframes slideUp\{from\{opacity:0;transform:translateY\(6px\)\}/);
  });
});
