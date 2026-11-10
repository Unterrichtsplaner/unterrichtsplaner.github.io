// Entschuldigt Fehlende im Sitzplan (BUGS W11): opacity .5 machte den Namen am Beamer unlesbar (~1,4:1 dunkel, ~1,9:1 hell).
// Die Karte tritt über Fläche und Rand zurück, der Text selbst bleibt voll deckend.
const fs = require('fs');
const path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const rules = sel => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(m => m[1].split(',').some(s => s.trim() === sel)).map(m => m[2]);

describe('Kein opacity auf Text', () => {
  it.each(['.seating-card.is-absent-unexcused', '.seating-card.is-absent-excused', '.seating-card.is-absent-excused .sc-name', '.date-chip-day'])('%s', sel => {
    const found = rules(sel);
    expect(found.length, sel).toBeGreaterThan(0);
    found.forEach(body => expect(body).not.toMatch(/(^|;)\s*opacity\s*:/));
  });
  it('Name entschuldigt Fehlender in --text-secondary, durchgestrichen', () => {
    expect(rules('.seating-card.is-absent-excused .sc-name').join(';')).toMatch(/color:var\(--text-secondary\)/);
  });
});
