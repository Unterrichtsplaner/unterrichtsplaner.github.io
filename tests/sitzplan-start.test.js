// AH59: Nach dem Neuladen zeigt der Sitzplan ohne laufende Stunde die Klasse, die als Nächstes dran ist,
// nicht die zuerst angelegte. Ohne Stundenplan: die oberste Klasse der Auswahl. Wahl von Hand gilt weiter in der Sitzung.
const { loadApp, app } = require('./helpers/load-app');

const st = (id, n) => ({ id, firstName: n, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] });
function sampleDB(slots = true) {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: slots ? [
      { id: 'a', day: 1, block: 2, part: 'full', subject: 'Musik', color: '#3d63dd', groupId: 'g9', recurring: 'weekly' },   // Di 2.
      { id: 'b', day: 3, block: 1, part: 'full', subject: 'Musik', color: '#3d63dd', groupId: 'g7', recurring: 'weekly' },   // Do 1.
      { id: 'c', day: 0, block: 1, part: 'full', subject: 'Musik', color: '#3d63dd', groupId: 'g5', recurring: 'weekly' },   // Mo 1.
    ] : [],
    lessonData: {},
    groups: [
      { id: 'g7', subject: 'Musik', className: '7a', color: '#3d63dd', schularbeitWeight: 50 },   // zuerst angelegt
      { id: 'g9', subject: 'Musik', className: '9b', color: '#3d63dd', schularbeitWeight: 50 },
      { id: 'g5', subject: 'Musik', className: '5a', color: '#3d63dd', schularbeitWeight: 50 },
    ],
    students: { g7: [st('s7', 'A')], g9: [st('s9', 'B')], g5: [st('s5', 'C')] },
    supervisions: [],
  };
}
const fresh = (slots = true) => { app('replaceDB(' + JSON.stringify(sampleDB(slots)) + ')'); app('currentSeatingGroupId = ""'); };

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
afterEach(() => { app('switchView("dashboard")'); vi.useRealTimers(); });

describe('Sitzplan nach dem Neuladen (AH59)', () => {
  it('Montagabend: die Klasse mit der nächsten Stunde (Di 2.), nicht die zuerst angelegte', () => {
    vi.setSystemTime(new Date(2026, 10, 9, 19, 0));   // Mo 09.11., abends
    fresh();
    app('switchView("seating")');
    expect(app('currentSeatingGroupId')).toBe('g9');
    expect(document.getElementById('seating-group-current-label').textContent).toBe('9b');
  });
  it('während einer Stunde wie bisher die Klasse, die gerade dran ist', () => {
    vi.setSystemTime(new Date(2026, 10, 12, 8, 0));   // Do 1. Stunde
    fresh();
    app('switchView("seating")');
    expect(app('currentSeatingGroupId')).toBe('g7');
  });
  it('ohne Stundenplan: die oberste Klasse der Auswahl (5a)', () => {
    vi.setSystemTime(new Date(2026, 10, 9, 19, 0));
    fresh(false);
    app('switchView("seating")');
    expect(app('currentSeatingGroupId')).toBe('g5');
  });
  it('von Hand gewählt: bleibt beim Wiederöffnen in derselben Sitzung', () => {
    vi.setSystemTime(new Date(2026, 10, 9, 19, 0));
    fresh();
    app('switchView("seating")');
    app('currentSeatingGroupId = "g5"');
    app('switchView("dashboard")');
    app('switchView("seating")');
    expect(app('currentSeatingGroupId')).toBe('g5');
  });
  it('ausgefallene nächste Stunde zählt nicht', () => {
    vi.setSystemTime(new Date(2026, 10, 9, 19, 0));
    fresh();
    app('db.lessonData["a_2026-11-10"] = { ausfall: true }');
    app('switchView("seating")');
    expect(app('currentSeatingGroupId')).toBe('g7');   // Do 12.11.
  });
});
