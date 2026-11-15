// BE8 (15.11.): Zähler in der Sitzplan-Leiste ragte über den Rand, Wort in den Mitarbeit-Knöpfen saß auf der Linie.
// Gemessen im Browser (Leiste 80 px: vorher 2 px Luft unten, jetzt 7; Knöpfe vorher 3 px, jetzt 9). Hier nur die Regeln.
const fs = require('fs');
const path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

describe('BE8: Luft in Sitzplan-Leiste und Mitarbeit-Knöpfen', () => {
  it('Leiste ab 521 px: Zähler 28 px hoch, kleiner Abstand zum Thema, Tippfläche größer', () => {
    const block = css.slice(css.indexOf('@container seating (min-width: 521px){\n  .seating-cockpit{height:80px'));
    const body = block.slice(0, block.indexOf('\n}\n'));
    expect(body).toMatch(/\.cockpit-main\{gap:var\(--space-1\);\}/);
    expect(body).toMatch(/\.cockpit-count\{min-height:28px;position:relative;\}/);
    expect(body).toMatch(/\.cockpit-count::after\{content:'';position:absolute;inset:-4px 0;\}/);
  });
  it('Mitarbeit-Knöpfe im Schüler-Fenster mit Innenabstand oben und unten', () => {
    expect(css).toMatch(/\.sw-faces button\{padding:var\(--space-2\) 0;\}/);
    expect(css).toMatch(/\.sw-faces small\{[^}]*line-height:1\.2;/);
  });
});
