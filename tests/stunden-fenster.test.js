// AH36: Stunden-Fenster nach dem Muster des Schüler-Fensters. Karten paarweise in Reihen; fehlt eine Karte, füllt die andere die Reihe.
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');
const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
const block = css.slice(css.indexOf('/* Stunden-Fenster (AH36)'), css.indexOf('/* Ende Stunden-Fenster (AH36) */'));

const st = (id, f) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [{ id: 'l1', day: 2, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', recurring: 'weekly' }, { id: 'l2', day: 2, block: 2, part: 'full', subject: 'Frei', recurring: 'weekly' }],
    lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50, plan: [{ id: 'p1', title: 'Brüche', lessons: 3 }] }],
    students: { g1: [st('a', 'Anna')] },
  };
}
const DATE = '2026-11-04';
const rows = () => [...document.querySelectorAll('#lesson-notes-form > .lc-row')];
const ids = row => [...row.children].map(c => c.id || [...c.classList].find(x => x.startsWith('lc-')));

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 4, 10, 0));
  app('db = ' + JSON.stringify(sampleDB()));
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});
afterEach(() => vi.useRealTimers());

describe('Aufbau', () => {
  it('vier Reihen mit festen Paaren', () => {
    expect(rows().map(ids)).toEqual([
      ['lesson-absent-container', 'lesson-todos'],
      ['lesson-plan-box', 'lesson-class-notes'],
      ['lc-content', 'lc-notes'],
      ['lc-hw', 'lc-test'],
    ]);
  });
  it('Kopf: Titel, nächste Stunden und Knöpfe nebeneinander; drei gleiche Knöpfe in einer Leiste', () => {
    const head = document.querySelector('.modal-lesson-detail .modal-header');
    expect([...head.children].map(c => c.id || c.className)).toEqual(['lesson-head-title', 'next-lesson-banner', 'lesson-head-btns']);
    expect([...document.querySelector('.lesson-quick').children].map(b => b.id)).toEqual(['lesson-seating-link-container', 'lesson-btn-overview', 'lesson-btn-students']);
  });
  it('Knöpfe tragen den langen Namen als aria-label', () => {
    expect(document.getElementById('lesson-seating-link-container').getAttribute('aria-label')).toBe('Sitzplan öffnen');
    expect(document.getElementById('lesson-btn-overview').getAttribute('aria-label')).toBe('Notenübersicht');
    expect(document.getElementById('lesson-btn-students').getAttribute('aria-label')).toBe('Schüler bewerten');
  });
});

describe('Inhalt', () => {
  it('Stunde mit Klasse: Leiste da, Thema mit Überschrift und eigener Zeile für den Knopf', () => {
    app(`openLessonDetail("l1", "${DATE}")`);
    const seat = document.getElementById('lesson-seating-link-container');
    expect(seat.classList.contains('hidden')).toBe(false);
    const box = document.getElementById('lesson-plan-box');
    expect(box.querySelector('.notes-section-label').textContent).toMatch(/Geplant · Stunde 1 von 3/);
    expect(box.querySelector('.lesson-plan-row b').textContent).toBe('Brüche');
    expect(box.querySelector('.lesson-plan-row .lesson-plan-btn')).not.toBeNull();
    app('closeModal("modal-lesson")');
  });
  it('Klasse ohne geplantes Thema: Karte hat dieselbe Überschrift-Zeile', () => {
    app(`db.groups[0].plan = []; openLessonDetail("l1", "${DATE}")`);
    const box = document.getElementById('lesson-plan-box');
    expect(box.querySelector('.notes-section-label').textContent).toBe('Planung');
    expect(box.textContent).toMatch(/Kein Thema geplant/);
    app('closeModal("modal-lesson")');
  });
  it('Stunde ohne Klasse: Knöpfe weg, beide Karten der Reihe weg', () => {
    app(`openLessonDetail("l2", "${DATE}")`);
    ['lesson-seating-link-container', 'lesson-btn-overview', 'lesson-btn-students', 'lesson-plan-box', 'lesson-class-notes'].forEach(id =>
      expect(document.getElementById(id).classList.contains('hidden'), id).toBe(true));
    app('closeModal("modal-lesson")');
  });
});

describe('Regeln im Stylesheet', () => {
  it('fehlt eine Karte, füllt die andere die Reihe: Spalten entstehen aus den sichtbaren Karten', () => {
    expect(block).toMatch(/\.lc-row\{[^}]*display:grid;[^}]*grid-auto-flow:column;[^}]*grid-auto-columns:minmax\(0,1fr\)/);
  });
  it('leere Reihe und leere Knopfleiste nehmen keinen Platz', () => {
    expect(block).toMatch(/\.lc-row:not\(:has\(> :not\(\.hidden\)\)\)\{display:none;\}/);
    expect(block).toMatch(/\.lesson-quick:not\(:has\(> :not\(\.hidden\)\)\)\{display:none;\}/);
  });
  it('Handy: eine Spalte in der bisherigen Reihenfolge, HA und Test vor den Notizen', () => {
    expect(block).toMatch(/\.lc-row\{display:contents;\}/);
    const order = id => Number((block.match(new RegExp(`${id}\\{order:(\\d+);`)) || [])[1]);
    expect(order('\\.lc-hw')).toBeLessThan(order('\\.lc-notes'));
    expect(order('\\.lc-test')).toBeLessThan(order('\\.lc-notes'));
    expect(order('\\.lc-content')).toBeLessThan(order('\\.lc-hw'));
  });
  it('ab iPad-Breite gilt die Reihenfolge der Reihen, nicht die des Handys', () => {
    const wide = block.slice(block.indexOf('@media (min-width: 800px)'));
    expect(wide).toMatch(/#lesson-notes-form \.notes-section\{order:0;\}/);
  });
  it('Eingabezeilen und Thema stehen unten in der Karte, damit sie nebeneinander auf einer Linie liegen', () => {
    expect(block).toMatch(/#lesson-notes-form \.notes-section > \.lesson-plan-row,[^{]*\{[^}]*margin-top:auto/);
    expect(block).toMatch(/#lesson-notes-form \.notes-section-body \.add-entry-row\{margin-top:auto;\}/);
  });
  it('nur Abstände aus der festen Reihe', () => {
    expect(block.length).toBeGreaterThan(500);
    const bad = block.match(/(?:^|[;{\s])(?:padding|margin|gap)[a-z-]*:[^;}]*\d+px[^;}]*/g) || [];
    expect(bad).toEqual([]);
  });
});
