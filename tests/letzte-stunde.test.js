// AH56: Im Stunden-Fenster steht in der Thema-Kachel, was die Klasse in der Stunde davor gemacht hat.
// AH57: Symbole auf mittleren/großen Sitzplan-Karten als Plaketten am Rand, nie über dem Namen.
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');

const st = (id, n) => ({ id, firstName: n, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [
      { id: 'mo', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#3d63dd', groupId: 'g1', recurring: 'weekly' },
      { id: 'mo3', day: 0, block: 3, part: 'full', subject: 'Mathe', color: '#3d63dd', groupId: 'g1', recurring: 'weekly' },
      { id: 'do', day: 3, block: 1, part: 'full', subject: 'Mathe', color: '#3d63dd', groupId: 'g1', recurring: 'weekly' },
      { id: 'frei', day: 0, block: 2, part: 'full', subject: 'AG', color: '#999', recurring: 'weekly' },
    ],
    lessonData: { 'do_2026-11-05': { done: 'Brüche erweitern\nS. 34 Nr. 2' }, 'mo_2026-11-02': { done: 'Alt' } },
    groups: [{ id: 'g1', subject: 'Mathe', className: '7a', color: '#3d63dd', schularbeitWeight: 50 }],
    students: { g1: [st('a', 'Anna')] },
    supervisions: [],
  };
}
const prev = () => document.querySelector('#lesson-plan-box .lesson-plan-prev');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 9, 7, 0));   // Mo 09.11.2026
  app('replaceDB(' + JSON.stringify(sampleDB()) + ')');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});
afterEach(() => { app('closeModal("modal-lesson")'); vi.useRealTimers(); });

describe('Letzte Stunde im Stunden-Fenster (AH56)', () => {
  it('erste Stunde der Woche: Inhalt der Stunde vom Donnerstag, mit Datum', () => {
    app('openLessonDetail("mo", "2026-11-09")');
    expect(prev().querySelector('span').textContent).toBe('Letzte Stunde · Do., 05.11.');
    expect(prev().querySelector('p').textContent).toBe('Brüche erweitern\nS. 34 Nr. 2');
  });
  it('zweite Stunde am selben Tag: die Stunde davor an diesem Tag', () => {
    app('db.lessonData["mo_2026-11-09"] = { done: "Einstieg Kürzen" }');
    app('openLessonDetail("mo3", "2026-11-09")');
    expect(prev().querySelector('p').textContent).toBe('Einstieg Kürzen');
  });
  it('ausgefallene Stunde zählt nicht, davor ohne Inhalt: nichts anzeigen', () => {
    app('db.lessonData["do_2026-11-05"] = { ausfall: true }; db.lessonData["mo3_2026-11-02"] = { done: "Alt" }');
    app('openLessonDetail("mo", "2026-11-09")');
    expect(prev().querySelector('p').textContent).toBe('Alt');   // die Stunde davor (Mo, 3. Stunde)
    app('closeModal("modal-lesson")');
    app('db.lessonData["mo3_2026-11-02"] = {}');
    app('openLessonDetail("mo", "2026-11-09")');
    expect(prev()).toBeNull();
  });
  it('Inhalt wird escaped (Regel 3)', () => {
    app('db.lessonData["do_2026-11-05"] = { done: "<img src=x onerror=alert(1)>" }');
    app('openLessonDetail("mo", "2026-11-09")');
    expect(prev().querySelector('img')).toBeNull();
    expect(prev().querySelector('p').textContent).toBe('<img src=x onerror=alert(1)>');
  });
  it('Stunde ohne Klasse: keine Thema-Kachel', () => {
    app('openLessonDetail("frei", "2026-11-09")');
    expect(document.getElementById('lesson-plan-box').classList.contains('hidden')).toBe(true);
  });
});

describe('Symbole auf Sitzplan-Karten (AH57)', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
  it('mittlere und große Karten: Plaketten halb über der Ecke, innerhalb des kleinsten Kartenabstands', () => {
    const m = css.match(/\.seating-card:not\(\.tiny\) \.sc-marks\{top:(-\d+)px;left:(-\d+)px;/);
    expect(m).not.toBeNull();
    // kleinster Abstand Karte ↔ Rand bei nicht winzigen Karten: 10 % von 64 px
    expect(-Number(m[1])).toBeLessThanOrEqual(6.4);
    expect(-Number(m[2])).toBeLessThanOrEqual(6.4);
  });
  it('kleine Karten (Handy) behalten die Punkte in der Ecke', () => {
    expect(css).toMatch(/\.seating-card\.tiny \.sc-mark\{display:block;width:5px;height:5px;/);
  });
});
