// AH8: Klassenübersicht als große Farbkacheln (Rückmeldung 03.11.: Zeilen helfen nicht, Klassen schnell zu finden).
// Kachel wie die Stunde im Stundenplan: Klassenfarbe als heller Grund, Klassenname groß.
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
const rule = sel => { const m = CSS.match(new RegExp('(?:^|\\n)' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}')); return m ? m[1] : ''; };

beforeAll(() => {
  loadApp();
  app(`db.groups = [{ id: 'g1', subject: 'Mathe', className: '7b', year: '2026/27', color: '#3b82f6', schularbeitWeight: 50 },
                    { id: 'g2', subject: 'Mathe', className: '5a', color: '#ef4444', schularbeitWeight: 50 },
                    { id: 'g3', subject: 'Physik', className: '9c', color: '#22c55e', schularbeitWeight: 50 }];
       db.students = { g1: [{ id: 's1', firstName: 'A', lastName: 'B', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] }], g2: [], g3: [] };
       db.lessonSlots = [{ id: 'l1', day: 0, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', recurring: 'weekly' }];
       switchView('classes')`);
});

describe('AH8: Klassen als Kacheln', () => {
  it('Kacheln im Raster, nach Fach gruppiert, innerhalb nach Klasse sortiert', () => {
    const sections = [...document.querySelectorAll('.subject-section')];
    expect(sections.map(s => s.querySelector('.subject-heading').firstChild.textContent)).toEqual(['Mathe', 'Physik']);
    expect([...sections[0].querySelectorAll('.class-tile .cr-name')].map(e => e.textContent)).toEqual(['5a', '7b']);
    expect(rule('.class-list')).toMatch(/display:grid;grid-template-columns:repeat\(auto-fill,minmax\(/);
  });
  it('Kachel in Klassenfarbe (Grundfarbe als Variable, Ton per color-mix), Name groß', () => {
    const tile = [...document.querySelectorAll('.class-tile')].find(t => t.querySelector('.cr-name').textContent === '7b');
    expect(tile.style.getPropertyValue('--card-color')).toBe('#3b82f6');
    expect(rule('.class-tile')).toMatch(/background:color-mix\(in srgb, var\(--card-color\) 15%, transparent\)/);
    expect(rule('.class-tile .cr-name')).toMatch(/font-size:26px/);
    expect(rule('.class-tile')).not.toMatch(/overflow:\s*hidden|aspect-ratio|[^-]height:/);   // wächst mit dem Inhalt (Regel 31)
  });
  it('ganze Kachel öffnet die Klasse; Sitzplan, Notizen und Bearbeiten bleiben als Knöpfe', () => {
    const tile = [...document.querySelectorAll('.class-tile')].find(t => t.querySelector('.cr-name').textContent === '7b');
    expect(tile.getAttribute('role')).toBe('button');
    expect(tile.querySelector('.cr-seating-btn')).not.toBeNull();
    expect(tile.querySelector('.cr-notes-btn')).not.toBeNull();
    expect(tile.querySelector('button[title="Bearbeiten"]')).not.toBeNull();
    expect(tile.textContent).toContain('Mathe · 2026/27');
    expect(tile.textContent).toContain('1 Schüler');
    tile.click();
    expect(app('currentGroupId')).toBe('g1');
  });
});
