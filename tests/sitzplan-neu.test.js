// Sitzplan neu (BUGS AH50): Klasse als Überschrift, Pfeile zur vorigen/nächsten Stunde der Klasse, Werkzeuge mit Namen,
// Leiste oben immer da (außerhalb der Stunde: nächste Stunde), unten vier gleiche Knöpfe mit Timer/Stoppuhr zum Aufklappen.
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Mo 02.11.2026: 7a (g1) hat Mo 1. + 3. Block und Fr 1. Block, 9c (g2) Mo 2. Block, 5b (g3) gar nicht
const MON = '2026-11-02';
const st = (id, n) => ({ id, firstName: n, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [
      { id: 'm1', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
      { id: 'p2', day: 0, block: 2, part: 'full', subject: 'Physik', color: '#22c55e', groupId: 'g2', recurring: 'weekly' },
      { id: 'm3', day: 0, block: 3, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
      { id: 'm4', day: 4, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
    ],
    lessonData: { 'm4_2026-10-30': { done: 'Brüche kürzen' } },
    groups: [{ id: 'g1', subject: 'Mathe', className: '7a', color: '#6366f1', schularbeitWeight: 50 },
             { id: 'g2', subject: 'Physik', className: '9c', color: '#22c55e', schularbeitWeight: 50 },
             { id: 'g3', subject: 'Kunst', className: '5b', color: '#e11d48', schularbeitWeight: 50 }],
    students: { g1: [st('a', 'Anna')], g2: [st('b', 'Ben')], g3: [st('c', 'Clara')] },
    supervisions: [],
  };
}
const at = (h, m = 0) => vi.setSystemTime(new Date(2026, 10, 2, h, m));
const open = (groupId = 'g1', dateStr = MON) => app(`seatingRequest = { groupId: ${JSON.stringify(groupId)}, dateStr: ${JSON.stringify(dateStr)} }; switchView("seating")`);
const $ = id => document.getElementById(id);
const cockpit = () => $('seating-cockpit');
const txt = el => el.textContent.replace(/\s+/g, ' ').trim();

let wakeRequests;
beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  at(7, 0);
  app('db = ' + JSON.stringify(sampleDB()));
  app('seatingEditMode = false; seatingShowGrades = false; seatingShowTrend = false; db.settings.seatingAutoSwitch = false');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  wakeRequests = 0;
  navigator.wakeLock = { request: vi.fn(async () => { wakeRequests++; const l = new EventTarget(); l.release = vi.fn(async () => {}); return l; }) };
});
afterEach(() => {
  if (app('seatingEditMode')) app('toggleSeatingEditMode()');
  app('closeToolPops()');
  app('switchView("dashboard")');
  vi.useRealTimers();
});
const flush = () => new Promise(r => setTimeout(r, 0));

describe('Kopf: Klasse als Überschrift', () => {
  it('Klasse groß, Fach klein daneben, kein „Sitzplan“-Titel sichtbar', () => {
    open('g1');
    expect($('seating-group-current-label').textContent).toBe('7a');
    expect($('seating-group-subject').textContent).toBe('Mathe');
    expect($('seating-group-trigger').getAttribute('aria-label')).toBe('Klasse wählen: 7a Mathe');
    expect(CSS).toMatch(/\.seating-header h1\{[^}]*display:none/);
  });
  it('Klassen-Menü ohne Inline-Stile, Punkte sind Knöpfe', () => {
    open('g1');
    expect($('seating-group-menu').getAttribute('style')).toBeNull();
    expect($('seating-group-trigger').getAttribute('style')).toBeNull();
    const items = [...document.querySelectorAll('#seating-group-menu .seating-group-item')];
    expect(items.length).toBe(3);
    items.forEach(b => expect(b.getAttribute('style')).toBeNull());
    expect(document.querySelector('#seating-group-menu .seating-group-item.active .sgi-name').textContent).toBe('Klasse 7a');
  });
});

describe('Kopf: Datum mit Pfeilen zur Stunde der Klasse', () => {
  it('keine Datums-Chips mehr; Datum als Text, Kalender beim Antippen', () => {
    open('g1');
    expect($('seating-date-strip')).toBeNull();
    expect(document.querySelector('.date-chip')).toBeNull();
    expect(txt($('seating-date-label'))).toMatch(/^Mo\.?,? 02\.11\.?$/);
    expect($('seating-date-hidden').value).toBe(MON);
    expect($('seating-date-hidden').closest('.week-label-wrap')).toBeTruthy();
  });
  it('Pfeile springen zur nächsten/vorigen Stunde der Klasse', () => {
    open('g1');
    expect($('btn-seating-next').getAttribute('aria-label')).toBe('Nächste Stunde der Klasse');
    expect($('btn-seating-prev').getAttribute('aria-label')).toBe('Vorige Stunde der Klasse');
    app('seatingStepLesson(1)');
    expect(app('currentSeatingDateStr')).toBe('2026-11-06');   // Fr
    app('seatingStepLesson(1)');
    expect(app('currentSeatingDateStr')).toBe('2026-11-09');   // Mo
    app('seatingStepLesson(-1); seatingStepLesson(-1); seatingStepLesson(-1)');
    expect(app('currentSeatingDateStr')).toBe('2026-10-30');   // Fr davor
    expect(txt($('seating-date-label'))).toMatch(/^Fr\.?,? 30\.10\.?$/);
  });
  it('Stunde fällt aus: wird übersprungen', () => {
    app('db.lessonData["m4_2026-11-06"] = { ausfall: true }');
    open('g1');
    app('seatingStepLesson(1)');
    expect(app('currentSeatingDateStr')).toBe('2026-11-09');
  });
  it('Klasse ohne Stunden: ein Schultag weiter (Wochenende übersprungen)', () => {
    vi.setSystemTime(new Date(2026, 10, 6, 7, 0));   // Fr
    open('g3', '2026-11-06');
    app('seatingStepLesson(1)');
    expect(app('currentSeatingDateStr')).toBe('2026-11-09');
    app('seatingStepLesson(-1)');
    expect(app('currentSeatingDateStr')).toBe('2026-11-06');
  });
  it('anderer Tag verbirgt die Noten wieder (Regel 16)', () => {
    open('g1');
    app('toggleSeatingGrades()');
    expect(app('seatingShowGrades')).toBe(true);
    app('seatingStepLesson(1)');
    expect(app('seatingShowGrades')).toBe(false);
  });
});

describe('Kopf: Werkzeuge mit Namen', () => {
  const label = id => $(id).querySelector('.btn-label').textContent;
  it('Noten zeigen/verbergen, Mitarbeit, Noten geben, Bearbeiten/Fertig', () => {
    open('g1');
    expect(label('btn-seating-grades')).toBe('Noten zeigen');
    expect(label('btn-seating-trend')).toBe('Mitarbeit');
    expect(label('btn-seating-round')).toBe('Noten geben');
    expect(label('btn-seating-edit')).toBe('Bearbeiten');
    app('toggleSeatingGrades()');
    expect(label('btn-seating-grades')).toBe('Noten verbergen');
    expect($('btn-seating-grades').getAttribute('aria-label')).toBe('Noten verbergen');
    app('toggleSeatingEditMode()');
    expect(label('btn-seating-edit')).toBe('Fertig');
    expect($('btn-seating-edit').classList.contains('is-editing')).toBe(true);
    expect($('btn-seating-edit').getAttribute('aria-pressed')).toBe('true');
    expect($('btn-seating-edit').getAttribute('style') || '').toBe('');
    app('toggleSeatingEditMode()');
    expect(label('btn-seating-edit')).toBe('Bearbeiten');
    expect($('btn-seating-edit').classList.contains('is-editing')).toBe(false);
  });
  it('Raster-Einstellung nur im Bearbeiten-Modus', () => {
    open('g1');
    expect($('seating-grid-tool').classList.contains('hidden')).toBe(true);
    app('toggleSeatingEditMode()');
    expect($('seating-grid-tool').classList.contains('hidden')).toBe(false);
    expect(document.querySelector('.seating-tools').classList.contains('editing')).toBe(true);   // Notenrunde weg, Raster an ihrer Stelle
    expect(CSS).toMatch(/\.seating-tools\.editing #btn-seating-round\{display:none;\}/);
    app('toggleSeatingSettings()');
    expect($('seating-settings-popup').classList.contains('hidden')).toBe(false);
    app('toggleSeatingEditMode()');
    expect($('seating-grid-tool').classList.contains('hidden')).toBe(true);
    expect($('seating-settings-popup').classList.contains('hidden')).toBe(true);
  });
});

describe('Leiste oben: immer da', () => {
  const kicker = () => txt(cockpit().querySelector('.cockpit-kicker'));
  const when = () => txt(cockpit().querySelector('.cockpit-when'));
  const sub = () => txt(cockpit().querySelector('.cockpit-time .cockpit-sub'));
  it('vor der Stunde: „Nächste Stunde“ mit Uhrzeit, ohne Bildschirm-Anhalten', async () => {
    at(7, 0);
    open('g1');
    await flush();
    expect(cockpit().classList.contains('hidden')).toBe(false);
    expect(cockpit().classList.contains('live')).toBe(false);
    expect(kicker()).toBe('Nächste Stunde');
    expect(when()).toBe('07:45');
    expect(sub()).toBe('heute · 1. Block');
    expect(wakeRequests).toBe(0);
  });
  it('in der Pause: nächste Stunde heute später, mit Thema der letzten Stunde', () => {
    at(9, 20);
    open('g1');
    expect(when()).toBe('11:45');
    expect(sub()).toBe('heute · 3. Block');
    expect(cockpit().querySelector('.cockpit-lesson-btn')).toBeTruthy();
  });
  it('nach der letzten Stunde: nächster Tag mit Stunde', () => {
    at(14, 0);
    open('g1');
    expect(kicker()).toBe('Nächste Stunde');
    expect(when()).toMatch(/^Fr\.?,? 06\.11\.?$/);
    expect(sub()).toBe('07:45 · 1. Block');
  });
  it('anderer Tag gewählt: die Stunde an diesem Tag', () => {
    at(8, 0);
    open('g1', '2026-10-30');
    expect(cockpit().classList.contains('live')).toBe(false);
    expect(kicker()).toBe('Stunde');
    expect(when()).toMatch(/^Fr\.?,? 30\.10\.?$/);
    expect(txt(cockpit().querySelector('.cockpit-topic-text'))).toBe('Brüche kürzen');
    app('openSeatingToday()');
    expect($('seating-today-title').textContent).toMatch(/^Fr\.?,? 30\.10\.? · 7a/);
  });
  it('während der Stunde: wie bisher Restzeit, Bildschirm bleibt an', async () => {
    at(8, 0);
    open('g1');
    await flush();
    expect(cockpit().classList.contains('live')).toBe(true);
    expect(txt(cockpit().querySelector('.cockpit-mins'))).toBe('75 Min');
    expect(wakeRequests).toBe(1);
  });
  it('Klasse ohne Unterricht: ruhiger Hinweis, kein „Stunde“-Knopf', () => {
    open('g3');
    expect(cockpit().classList.contains('hidden')).toBe(false);
    expect(txt(cockpit())).toContain('Kein Unterricht eingetragen');
    expect(cockpit().querySelector('.cockpit-lesson-btn')).toBeNull();
  });
  it('„Stunde“ öffnet die geplante Stunde', () => {
    at(14, 0);
    open('g1');
    app('openCockpitLesson()');
    expect(app('activeLessonId')).toBe('m4');
    expect(app('activeLessonDate')).toBe('2026-11-06');
  });
  it('feste Höhe in beiden Zuständen (Raster springt nicht)', () => {
    expect(CSS).toMatch(/\.seating-cockpit\{[^}]*height:80px/);
  });
});

describe('Raster ohne Rahmen', () => {
  it('kein Rahmen, keine Fläche, Abstand aus CSS', () => {
    expect(HTML).toMatch(/<div id="seating-canvas-wrapper">/);
    const last = CSS.slice(CSS.lastIndexOf('/* ─── Sitzplan neu (AH50)'));
    expect(last).toMatch(/\.seating-canvas\{[^}]*border:none/);
    expect(last).toMatch(/\.seating-canvas\{[^}]*background:none/);
  });
});

describe('Unten: vier gleiche Knöpfe', () => {
  it('Timer, Stoppuhr, Zufall, Gruppen', () => {
    open('g1');
    const btns = [...document.querySelectorAll('.seating-tools-bar > .seating-tool')];
    expect(btns.map(b => txt(b))).toEqual(['Timer', 'Stoppuhr', 'Zufall', 'Gruppen']);
    expect(HTML).toMatch(/id="btn-tool-timer"[^>]*aria-expanded="false"/);
  });
  it('Timer klappt ein Feld auf; Escape und Tippen daneben schließen es', () => {
    open('g1');
    expect($('tool-timer-pop').classList.contains('hidden')).toBe(true);
    app('toggleToolPop("timer")');
    expect($('tool-timer-pop').classList.contains('hidden')).toBe(false);
    expect($('btn-tool-timer').getAttribute('aria-expanded')).toBe('true');
    expect($('tool-timer-pop').contains($('timer-display'))).toBe(true);
    app('toggleToolPop("stopwatch")');                 // nur eins offen
    expect($('tool-timer-pop').classList.contains('hidden')).toBe(true);
    expect($('tool-stopwatch-pop').classList.contains('hidden')).toBe(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect($('tool-stopwatch-pop').classList.contains('hidden')).toBe(true);
    app('toggleToolPop("timer")');
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect($('tool-timer-pop').classList.contains('hidden')).toBe(true);
  });
  it('Knopf zeigt die laufende Zeit, auch bei geschlossenem Feld', () => {
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date(2026, 10, 2, 7, 0));
    open('g1');
    const lab = () => $('tool-timer-label').textContent;
    expect(lab()).toBe('Timer');
    app('adjustTimer(1)');
    expect(lab()).toBe('06:00');
    app('toggleTimer()');
    vi.advanceTimersByTime(61000);
    expect(lab()).toBe('04:59');
    expect($('btn-tool-timer').classList.contains('on')).toBe(true);
    app('resetTimer()');   // W9: zurück auf die Startzeit, ein zweites Mal auf 5:00
    expect(lab()).toBe('06:00');
    app('resetTimer()');
    expect(lab()).toBe('Timer');
    expect($('btn-tool-timer').classList.contains('on')).toBe(false);
    const sw = () => $('tool-stopwatch-label').textContent;
    expect(sw()).toBe('Stoppuhr');
    app('toggleStopwatch()');
    vi.advanceTimersByTime(65000);
    expect(sw()).toBe('01:05');
    app('toggleStopwatch()');
    expect(sw()).toBe('01:05');                         // angehalten: Zeit bleibt stehen
    app('resetStopwatch()');
    expect(sw()).toBe('Stoppuhr');
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ['Date'] });
  });
  it('Timer abgelaufen: Knopf rot', () => {
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date(2026, 10, 2, 7, 0));
    open('g1');
    app('adjustTimer(-4); toggleTimer()');
    vi.advanceTimersByTime(61000);
    expect($('btn-tool-timer').classList.contains('done')).toBe(true);
    app('resetTimer()');
    expect($('btn-tool-timer').classList.contains('done')).toBe(false);
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ['Date'] });
  });
});
