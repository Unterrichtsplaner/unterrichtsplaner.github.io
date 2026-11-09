// W1 (Regel 16): „Noten zeigen“ im Sitzplan gilt nur dort. Nach dem Verlassen des Sitzplans darf das Schüler-Fenster
// (über Stunde, Dashboard, Suche …) die Noten nicht sofort zeigen – sonst stehen sie am Beamer.
const { loadApp, app } = require('./helpers/load-app');

function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [], lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50 }],
    students: { g1: [{ id: 'a', firstName: 'Anna', lastName: 'A', studentNotes: [], attendance: [], participation: [], homework: [],
      grades: [{ type: 'schularbeit', value: '5.0', date: '2026-11-02', note: 'KA 1' }] }] },
  };
}
const veiled = () => document.getElementById('sw-more').classList.contains('is-veiled');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 9, 10, 0));
  app('db = migrateDB(' + JSON.stringify(sampleDB()) + ')');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});
afterEach(() => vi.useRealTimers());

describe('W1: Noten aus dem Sitzplan bleiben nicht eingeschaltet', () => {
  it('im Sitzplan eingeblendet: das Schüler-Fenster dort zeigt sie (wie bisher)', () => {
    app('openSeatingForGroup("g1"); toggleSeatingGrades()');
    app('openSeatingStudentModal("a", "g1", "2026-11-09")');
    expect(veiled()).toBe(false);
    app('closeModal("modal-seating-student")');
  });

  it('Sitzplan verlassen → Noten wieder aus; Schüler-Fenster von anderswo verborgen', () => {
    app('openSeatingForGroup("g1"); toggleSeatingGrades()');
    app('switchView("timetable")');
    expect(app('seatingShowGrades')).toBe(false);
    app('openSeatingStudentModal("a", "g1", "2026-11-09")');
    expect(veiled()).toBe(true);
    app('closeModal("modal-seating-student")');
  });

  it('auch ohne Ansichtswechsel: außerhalb des Sitzplans gilt der Sitzplan-Schalter nie', () => {
    app('openSeatingForGroup("g1"); toggleSeatingGrades(); switchView("dashboard"); seatingShowGrades = true');
    app('openSeatingStudentModal("a", "g1", "2026-11-09")');
    expect(veiled()).toBe(true);
    app('closeModal("modal-seating-student")');
  });
});
