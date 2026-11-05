// AH33: Eine Höhe für Knöpfe, Felder, Auswahllisten und Umschalter (Touch 44, Maus 36). Nachgemessen wird im Browser;
// hier nur, dass niemand die Grundregel verliert. Das „+“ im runden Knopf sitzt mittig (padding/margin).
const fs = require('fs');
const path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
const block = css.slice(css.indexOf('/* Eine Höhe (AH33)'), css.indexOf('/* Ende Eine Höhe (AH33)'));

describe('Eine Höhe für alles Bedienbare', () => {
  it('Grundwert: Maus 36, Touch 44', () => {
    expect(css).toMatch(/:root\{--control-h:36px;\}/);
    expect(css).toMatch(/@media \(pointer: coarse\)\{:root\{--control-h:44px;\}\}/);
  });
  it('steht am Ende der Regeln für Knöpfe und gilt für alle Grundarten', () => {
    expect(block.length).toBeGreaterThan(0);
    for (const sel of ['.btn-primary', '.btn-secondary', '.btn-heute', '.btn-back', '.btn-icon', '.btn-circle', '.modal-close', '.classes-sort', '.tt-mode button', '.form-input', '.entry-input', '.entry-date', '.custom-form-dropdown-trigger']) {
      expect(block, sel).toContain(sel);
    }
  });
  it('setzt bei Symbol-Knöpfen kein display: Sie werden je Breite aus- und eingeblendet (Drucken, Klassen-Ansicht)', () => {
    const rule = block.match(/\.btn-icon,\.btn-circle[^{]*\{[^}]*\}/)[0];
    expect(rule).not.toMatch(/display:/);
  });
  it('runde Knöpfe: Inhalt ohne Innenabstand und ohne Rand am Symbol, sonst sitzt das „+“ links', () => {
    expect(block).toMatch(/\.btn-secondary\.btn-circle[^{]*\{[^}]*padding:0/);
    expect(block).toMatch(/\.btn-circle \.ico[^{]*\{[^}]*margin:0/);
  });
});

describe('AH35: Eine Form. Abgerundete Rechtecke, keine Pillen und Kreise', () => {
  // Rund bleiben nur Dinge, die keine Knöpfe sind: Punkte, Fortschrittsbalken, Rollbalken und der Schalter
  const ROUND_OK = /needs-attention::after|indicator-dot|toggle-slider|scrollbar-thumb|cockpit-progress|sc-trend i|sc-mark/;
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, '');
  it('style.css: keine Pille und kein Kreis außerhalb der Ausnahmen', () => {
    const bad = [];
    for (const m of plain.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (/border-radius:\s*(\d{2,}px|50%)/.test(m[2]) && !ROUND_OK.test(m[1])) bad.push(m[1].trim());
    }
    expect(bad).toEqual([]);
  });
  it('auch nicht als Inline-Stil an Bedienelementen', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const bad = [...html.matchAll(/<(button|div)[^>]*style="[^"]*border-radius:\s*(\d{2,}px|50%)[^"]*"[^>]*>/g)].map(m => m[0].slice(0, 80))
      .filter(t => !t.includes('lesson-color-dot'));
    expect(bad).toEqual([]);
  });
});
