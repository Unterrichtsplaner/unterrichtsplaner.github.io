// AH58: In der Klassenauswahl des Sitzplans steht neben jeder Klasse, wann sie dran ist (wie in der Klassenansicht).
// Reihenfolge bleibt (Fach, Klasse), das Datum des Sitzplans ändert sich beim Wählen nicht.
const { loadApp, app } = require('./helpers/load-app');

const st = (id, n) => ({ id, firstName: n, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [
      { id: 'a', day: 0, block: 1, part: 'full', subject: 'Musik', color: '#3d63dd', groupId: 'g1', recurring: 'weekly' },
      { id: 'b', day: 3, block: 3, part: 'full', subject: 'Musik', color: '#3d63dd', groupId: 'g2', recurring: 'weekly' },
      { id: 'c', day: 1, block: 2, part: 'full', subject: 'Musik', color: '#3d63dd', groupId: 'g4', recurring: 'weekly' },
    ],
    lessonData: {},
    groups: [
      { id: 'g2', subject: 'Musik', className: '7b', color: '#3d63dd', schularbeitWeight: 50 },
      { id: 'g1', subject: 'Musik', className: '7a', color: '#3d63dd', schularbeitWeight: 50 },
      { id: 'g3', subject: 'Musik', className: '<b>7c</b>', color: '#3d63dd', schularbeitWeight: 50 },
      { id: 'g4', subject: 'Musik', className: '8a', color: '#3d63dd', schularbeitWeight: 50 },
    ],
    students: { g1: [st('s1', 'Anna')], g2: [st('s2', 'Ben')], g3: [], g4: [] },
    supervisions: [],
  };
}
const items = () => [...document.querySelectorAll('#seating-group-menu .seating-group-item')];
const row = name => items().find(b => b.querySelector('.sgi-name').textContent === name);
const when = name => { const w = row(name).querySelector('.sgi-when'); return w ? w.textContent : null; };

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 9, 8, 0));   // Mo 09.11.2026, 8:00 – 7a hat gerade die 1. Stunde
  app('replaceDB(' + JSON.stringify(sampleDB()) + ')');
  app('openSeatingForGroup("g1")');
});
afterEach(() => { app('switchView("dashboard")'); vi.useRealTimers(); });

describe('Klassenauswahl im Sitzplan (AH58)', () => {
  it('neben jeder Klasse: jetzt / Morgen / Wochentag; ohne Stunden nichts', () => {
    expect(when('Klasse 7a')).toMatch(/^jetzt · bis \d\d:\d\d$/);
    expect(row('Klasse 7a').querySelector('.sgi-when').classList.contains('is-now')).toBe(true);
    expect(when('Klasse 8a')).toMatch(/^Morgen · 2\. /);
    expect(when('Klasse 7b')).toMatch(/^Do\., 12\.11\. · 3\. /);
    expect(row('Klasse 7b').querySelector('.sgi-when').classList.contains('is-now')).toBe(false);
    expect(when('Klasse <b>7c</b>')).toBeNull();
  });
  it('Reihenfolge bleibt nach Klasse, nicht nach der nächsten Stunde', () => {
    // 7b ist erst Donnerstag dran, steht aber vor 8a (morgen)
    expect(items().map(b => b.querySelector('.sgi-name').textContent).filter(n => !n.includes('<'))).toEqual(['Klasse 7a', 'Klasse 7b', 'Klasse 8a']);
  });
  it('Klassenname wird escaped (Regel 3)', () => {
    expect(document.querySelector('#seating-group-menu b')).toBeNull();
  });
  it('Aufklappen rechnet zur aktuellen Uhrzeit neu', () => {
    vi.setSystemTime(new Date(2026, 10, 9, 10, 0));   // 1. Stunde vorbei
    app('toggleCustomGroupDropdown({ stopPropagation() {} })');
    expect(document.getElementById('seating-group-menu').classList.contains('hidden')).toBe(false);
    expect(when('Klasse 7a')).toMatch(/^Do\., 12\.11\.|^Mo\., 16\.11\./);
    app('toggleCustomGroupDropdown({ stopPropagation() {} })');
  });
  it('Klasse wählen ändert das Datum nicht', () => {
    const before = app('currentSeatingDateStr');
    row('Klasse 7b').click();
    expect(app('currentSeatingGroupId')).toBe('g2');
    expect(app('currentSeatingDateStr')).toBe(before);
  });
});
