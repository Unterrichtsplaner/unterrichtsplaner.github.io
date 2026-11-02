// Sitzplan: „Heute“-Knopf (Rückmeldung 02.11.)
const { loadApp, app } = require('./helpers/load-app');
const st = (id, n) => ({ id, firstName: n, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] });
const db = { settings: { teacherName: 'T', blocks: null }, lessonSlots: [], lessonData: {},
  groups: [{ id: 'g1', subject: 'Mathe', className: '7a', color: '#3d63dd', schularbeitWeight: 50 }], students: { g1: [st('a', 'Anna')] } };
beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(db)); loadApp(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 10, 4, 10, 0)); app('db = ' + JSON.stringify(db)); });
afterEach(() => vi.useRealTimers());

describe('Sitzplan: Heute', () => {
  it('springt vom gewählten Datum zurück auf heute und ist dann markiert', () => {
    app('switchView("seating")');
    const btn = document.getElementById('btn-seating-today');
    expect(btn.getAttribute('onclick')).toBe('seatingGoToday()');
    expect(btn.classList.contains('active')).toBe(true);
    app('onHiddenDateChange("2027-02-15")');         // über den Kalender weggesprungen
    expect(app('currentSeatingDateStr')).toBe('2027-02-15');
    expect(btn.classList.contains('active')).toBe(false);
    app('seatingGoToday()');
    expect(app('currentSeatingDateStr')).toBe('2026-11-04');
    expect(btn.classList.contains('active')).toBe(true);
    expect(document.querySelector('#seating-date-strip .date-chip.active').textContent).toContain('4');
  });
  it('am Wochenende: nächster Schultag', () => {
    vi.setSystemTime(new Date(2026, 10, 7, 10, 0));   // Sa
    app('switchView("seating"); onHiddenDateChange("2027-02-15"); seatingGoToday()');
    expect(app('currentSeatingDateStr')).toBe('2026-11-09');
  });
});
