// Paket 2 kleiner Fehler (09.11.): W8 Handy quer, W10 Mitarbeit mit Titel auf der Sitzplan-Karte, W16 Hinweis
// „Raster zu klein“ ohne Klasse, X4 voller Klassenname in der Wochenansicht. (Y14 steht in tests/block-v.test.js.)
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');

const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
const st = (id, f, extra = {}) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [{ id: 's1', day: 0, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', color: '#3b82f6', recurring: 'weekly' }],
    lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: 'Q11 Leistungskurs Mathematik', color: '#3b82f6', schularbeitWeight: 50, seatingCols: 6, seatingRows: 5 }],
    students: { g1: [
      st('a', 'Anna', { participation: [{ id: 'p1', date: '2026-11-09', value: 'positive', label: 'Referat' }] }),
      st('b', 'Ben', { participation: [{ id: 'p2', date: '2026-11-09', value: 'excellent' }] }),
    ] },
  };
}
const card = name => [...document.querySelectorAll('.seating-card')].find(c => c.textContent.includes(name));

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 9, 10, 0));
  window.innerWidth = 1024;
  app('db = migrateDB(' + JSON.stringify(sampleDB()) + ')');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});
afterEach(() => vi.useRealTimers());

describe('W8: Handy quer', () => {
  it('bei wenig Höhe keine Mindesthöhe von 650 px (sonst scrollt die ganze Seite)', () => {
    expect(css).toMatch(/@media \(max-height: 650px\)\{#app\{min-height:0;\}\}/);
  });
});

describe('W10: Sitzplan-Karte zeigt nur Mitarbeit ohne Titel (Regel 49)', () => {
  it('„Referat“ (mit Titel) erscheint nicht als Plus auf der Karte, eine normale Mitarbeit schon', () => {
    app('openSeatingForGroup("g1", "2026-11-09")');
    expect(card('Anna').querySelector('.sc-part')).toBeNull();
    expect(card('Ben').querySelector('.sc-part')).not.toBeNull();
  });
});

describe('W16: Hinweis „Raster zu klein“', () => {
  it('verschwindet, wenn keine Klasse mehr gewählt ist', () => {
    app('db.students.g1.push({ id: "c", firstName: "Cem", lastName: "X", grades: [], attendance: [], participation: [], homework: [], studentNotes: [] })');
    app('db.groups[0].seatingCols = 2; db.groups[0].seatingRows = 2; openSeatingForGroup("g1", "2026-11-09")');   // Pult unten → 2 Plätze
    const hint = document.getElementById('seating-overflow-hint');
    expect(hint.classList.contains('hidden')).toBe(false);
    app('currentSeatingGroupId = ""; renderSeatingPlan()');
    expect(hint.classList.contains('hidden')).toBe(true);
  });
});

describe('X4: Wochenansicht zeigt den vollen Klassennamen beim Darüberfahren', () => {
  it('Klassenname der Kachel hat ein title mit dem ganzen Namen', () => {
    app('switchView("timetable"); setTimetableMode("week"); currentWeekOffset = 0; renderTimetable()');
    const el = document.querySelector('.tt-lesson .tt-lesson-class');
    expect(el.getAttribute('title')).toBe('Q11 Leistungskurs Mathematik');
  });
});
