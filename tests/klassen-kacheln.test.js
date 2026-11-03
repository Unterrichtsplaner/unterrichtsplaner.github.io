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

// AH12: Ansicht wählbar – Liste · Kacheln · Groß (mit nächster Stunde, Thema/Planung, Fälligem, Auffälligen)
describe('AH12: Ansicht der Klassenübersicht wählbar', () => {
  const tileOf = name => [...document.querySelectorAll('#subject-groups-container .class-row')].find(t => t.querySelector('.cr-name').textContent === name);
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 2, 10, 0));   // Mo 02.11.2026, 10:00
    app(`db.settings.warnAbsences = 2;
      db.lessonSlots = [{ id: 'l1', day: 0, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', recurring: 'weekly', room: 'R101' },
                        { id: 'l2', day: 2, block: 2, part: 'full', subject: 'Mathe', groupId: 'g1', recurring: 'weekly', room: 'R101' }];
      db.lessonData = { 'l1_2026-11-02': { done: 'Brüche kürzen\\nNr. 4', hwEnabled: true, hwItems: [{ id: 'h', text: 'S. 12 Nr. 3', targetDate: '2026-11-04' }] } };
      db.groups[0].plan = [{ id: 't1', title: 'Brüche kürzen', lessons: 1, doneLessons: ['l1_2026-11-02'] }, { id: 't2', title: 'Dezimalzahlen', lessons: 3 }];
      db.students.g1[0].attendance = [{ id: 'a1', date: '2026-10-20', type: 'abwesend' }, { id: 'a2', date: '2026-10-21', type: 'abwesend' }];
      db.acknowledgedWarnings = {};`);
  });
  afterAll(() => { app('setClassesView("tiles")'); vi.useRealTimers(); });

  it('Umschalter oben, Standard Kacheln; Wahl wird pro Gerät gemerkt', () => {
    app('switchView("classes")');
    const btns = [...document.querySelectorAll('#classes-mode button')];
    expect(btns.map(b => b.textContent.trim())).toEqual(['Liste', 'Kacheln', 'Groß']);
    expect(btns.find(b => b.dataset.mode === 'tiles').getAttribute('aria-pressed')).toBe('true');
    app('setClassesView("list")');
    expect(localStorage.getItem('classes_view')).toBe('list');
    expect(document.querySelector('#classes-mode [data-mode="list"]').getAttribute('aria-pressed')).toBe('true');
  });
  it('Liste: Zeilen ohne Kachelfarbe, alle Knöpfe da', () => {
    app('setClassesView("list")');
    const row = tileOf('7b');
    expect(row.classList.contains('class-tile')).toBe(false);
    expect(row.closest('.class-list').classList.contains('is-list')).toBe(true);
    expect(row.querySelector('.cr-seating-btn')).not.toBeNull();
    expect(row.querySelector('.cr-notes-btn')).not.toBeNull();
  });
  it('Groß: nächste Stunde, letztes Thema, geplantes Thema, Fälliges, Auffällige (nur Zahl)', () => {
    app('setClassesView("large")');
    const t = tileOf('7b');
    expect(t.classList.contains('is-large')).toBe(true);
    const d = t.querySelector('.ct-details').textContent;
    expect(d).toMatch(/Nächste Stunde.*Mi\.?, 04\.11\..*2\. Block.*R101/);
    expect(d).toMatch(/Zuletzt.*Brüche kürzen/);
    expect(d).not.toContain('Nr. 4');                                  // nur die erste Zeile
    expect(d).toMatch(/Geplant.*Dezimalzahlen \(1\/3\)/);
    expect(d).toMatch(/Fällig.*HA: S\. 12 Nr\. 3/);
    expect(d).toMatch(/Auffällig.*1 Schüler/);
    expect(d).not.toContain('A B');                                    // keine Namen
  });
  it('Groß: eine Kachel über die ganze Breite, Angaben nebeneinander (Wunsch 03.11.)', () => {
    expect(rule('.class-list.is-large')).toMatch(/grid-template-columns:minmax\(0,1fr\)/);
    expect(rule('.class-tile.is-large')).toMatch(/display:grid;grid-template-columns:minmax\(150px,220px\) minmax\(0,1fr\) auto;/);
    expect(rule('.is-large .ct-details')).toMatch(/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  });
  it('Groß: Klasse ohne Stunden zeigt nur, was es gibt', () => {
    const d = tileOf('5a').querySelector('.ct-details');
    expect(d === null || !/Nächste Stunde|Geplant|Fällig/.test(d.textContent)).toBe(true);
  });
  it('laufende Stunde heißt „jetzt“', () => {
    vi.setSystemTime(new Date(2026, 10, 2, 8, 0));   // Mo 1. Block läuft (07:45–09:15)
    app('renderSubjectGroups()');
    expect(tileOf('7b').querySelector('.ct-details').textContent).toMatch(/Nächste Stunde.*jetzt · bis 09:15/);
    vi.setSystemTime(new Date(2026, 10, 2, 10, 0));
  });
});
