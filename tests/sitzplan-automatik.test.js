// Sitzplan-Automatik: richtige Klasse bei Stunden ohne Pause, Klassenwechsel bei offenem Sitzplan, Start im Sitzplan
const { loadApp, app } = require('./helpers/load-app');

// Mo 02.11.2026: 7a 7:45–8:30, 9c direkt danach 8:30–9:15 (ohne Pause), Q1 9:35–10:20 (nach 20 Min Pause)
const BLOCKS = [{ num: 1, label: '1. Stunde', start: '07:45', end: '08:30' }, { num: 2, label: '2. Stunde', start: '08:30', end: '09:15' },
                { num: 3, label: '3. Stunde', start: '09:35', end: '10:20' }];
const MON = '2026-11-02';
const st = (id, n) => ({ id, firstName: n, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] });
function sampleDB(extra = {}) {
  return {
    settings: { teacherName: 'T', blocks: BLOCKS, ...extra },
    lessonSlots: [
      { id: 'a', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#3d63dd', groupId: 'g7a', recurring: 'weekly' },
      { id: 'b', day: 0, block: 2, part: 'full', subject: 'Physik', color: '#22c55e', groupId: 'g9c', recurring: 'weekly' },
      { id: 'c', day: 0, block: 3, part: 'full', subject: 'Mathe', color: '#f97316', groupId: 'gQ1', recurring: 'weekly' },
    ],
    lessonData: {},
    groups: [{ id: 'g7a', subject: 'Mathe', className: '7a', color: '#3d63dd', schularbeitWeight: 50 },
             { id: 'g9c', subject: 'Physik', className: '9c', color: '#22c55e', schularbeitWeight: 50 },
             { id: 'gQ1', subject: 'Mathe', className: 'Q1', color: '#f97316', schularbeitWeight: 50 }],
    students: { g7a: [st('s1', 'Anna')], g9c: [st('s2', 'Ben')], gQ1: [st('s3', 'Cem')] },
    supervisions: [],
  };
}
const at = (h, m) => vi.setSystemTime(new Date(2026, 10, 2, h, m, 0));
const shown = () => app('currentSeatingGroupId');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  app('db = ' + JSON.stringify(sampleDB()));
  app('seatingEditMode = false; timetableEditMode = false');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
});
afterEach(() => { app('switchView("dashboard")'); vi.useRealTimers(); });

describe('Welche Klasse? Stunden ohne Pause', () => {
  it('kurz vor Ende der 1. Stunde bleibt die 7a (die 9c folgt ohne Pause)', () => {
    at(8, 27);
    expect(app('getSuggestedSeatingGroupId()')).toBe('g7a');
    at(8, 30);
    expect(app('getSuggestedSeatingGroupId()')).toBe('g9c');
  });
  it('mit Pause dazwischen: 5 Minuten vorher schon die nächste Klasse (wie bisher)', () => {
    at(9, 31);
    expect(app('getSuggestedSeatingGroupId()')).toBe('gQ1');
  });
  it('Sitzplan öffnen um 8:27 zeigt die 7a', () => {
    at(8, 27);
    app('switchView("seating")');
    expect(shown()).toBe('g7a');
  });
});

describe('Offener Sitzplan wechselt zur nächsten Klasse', () => {
  it('ohne Pause: genau mit Stundenende, nicht vorher; mit Hinweis', () => {
    at(8, 10); app('switchView("seating")');
    expect(shown()).toBe('g7a');
    at(8, 29); app('refreshSeatingCockpit()');
    expect(shown()).toBe('g7a');
    at(8, 30); app('refreshSeatingCockpit()');
    expect(shown()).toBe('g9c');
    expect(document.getElementById('toast-container').textContent).toContain('Sitzplan: 9c Physik (nächste Stunde)');
  });
  it('mit Pause: 5 Minuten vor Beginn der nächsten', () => {
    at(9, 0); app('switchView("seating")');
    expect(shown()).toBe('g9c');
    at(9, 20); app('refreshSeatingCockpit()');
    expect(shown()).toBe('g9c');                  // Pause, nächste erst um 9:35
    at(9, 30); app('refreshSeatingCockpit()');
    expect(shown()).toBe('gQ1');
  });
  it('nicht bei offenem Fenster – danach schon', () => {
    at(8, 10); app('switchView("seating")');
    app('openSeatingStudentModal("s1", "g7a", "2026-11-02")');
    at(8, 31); app('refreshSeatingCockpit()');
    expect(shown()).toBe('g7a');
    app('closeModal("modal-seating-student")');
    app('refreshSeatingCockpit()');
    expect(shown()).toBe('g9c');
  });
  it('von Hand gewählte Klasse bleibt, bis die nächste Stunde beginnt', () => {
    at(8, 10); app('switchView("seating")');
    // Lehrkraft schaut während der 7a-Stunde in den Q1-Plan (wie Klick im Klassenmenü)
    app('currentSeatingGroupId = "gQ1"; seatingAutoLast = getSuggestedSeatingGroupId(); renderSeatingPlan()');
    at(8, 15); app('refreshSeatingCockpit()');
    expect(shown()).toBe('gQ1');
    at(8, 30); app('refreshSeatingCockpit()');    // neue Stunde → 9c
    expect(shown()).toBe('g9c');
  });
  it('nicht, wenn ein anderer Tag gewählt ist, und nicht im Bearbeiten-Modus', () => {
    at(8, 10); app('switchView("seating")');
    app('setSeatingDate("2026-11-03")');
    at(8, 31); app('refreshSeatingCockpit()');
    expect(shown()).toBe('g7a');
    app(`setSeatingDate("${MON}"); seatingEditMode = true`);
    expect(app('maybeAutoSwitchSeatingClass()')).toBe(false);
  });
  it('ausgeschaltet: kein Wechsel', () => {
    app('db.settings.seatingAutoSwitch = false');
    at(8, 10); app('switchView("seating")');
    at(8, 31); app('refreshSeatingCockpit()');
    expect(shown()).toBe('g7a');
  });
});

describe('AI3: kein Wechsel mitten im Eintragen', () => {
  const tap = () => document.getElementById('view-seating').dispatchEvent(new Event('pointerdown', { bubbles: true }));
  const offerBtn = () => document.querySelector('#seating-cockpit .cockpit-switch-btn');
  beforeEach(() => app('seatingLastTouch = null'));

  it('wer in den letzten 3 Minuten etwas angetippt hat, bleibt; die Leiste bietet „Weiter zu …“ an', () => {
    at(8, 10); app('switchView("seating")');
    at(8, 29); tap();
    at(8, 30); app('refreshSeatingCockpit()');
    expect(shown()).toBe('g7a');
    expect(offerBtn()).not.toBe(null);
    expect(offerBtn().textContent).toContain('9c');
    expect(document.getElementById('toast-container').textContent).toBe('');
    at(8, 31); app('refreshSeatingCockpit()');
    expect(shown()).toBe('g7a');                 // erst 3 Minuten nach dem letzten Antippen
  });

  it('nach 3 Minuten Ruhe wechselt er doch, mit „Rückgängig“', () => {
    at(8, 10); app('switchView("seating")');
    at(8, 29); tap();
    at(8, 30); app('refreshSeatingCockpit()');
    expect(shown()).toBe('g7a');
    at(8, 31); app('refreshSeatingCockpit()');
    expect(shown()).toBe('g7a');
    at(8, 32); app('refreshSeatingCockpit()');
    expect(shown()).toBe('g9c');
    expect(offerBtn()).toBe(null);
    const undo = document.querySelector('#toast-container .toast-undo button');
    expect(undo).not.toBe(null);
    undo.click();
    expect(shown()).toBe('g7a');
    at(8, 40); app('refreshSeatingCockpit()');   // zurückgeholt: in dieser Stunde nicht noch einmal
    expect(shown()).toBe('g7a');
  });

  it('„Weiter zu …“ wechselt sofort', () => {
    at(8, 10); app('switchView("seating")');
    at(8, 29); tap();
    at(8, 30); app('refreshSeatingCockpit()');
    expect(offerBtn().getAttribute('onclick')).toBe('switchToOfferedSeatingClass()');
    app('switchToOfferedSeatingClass()');
    expect(shown()).toBe('g9c');
    expect(offerBtn()).toBe(null);
  });

  it('Antippen in einem Fenster über dem Sitzplan zählt auch', () => {
    at(8, 10); app('switchView("seating")');
    app('openSeatingStudentModal("s1", "g7a", "2026-11-02")');
    at(8, 29); document.getElementById('modal-seating-student').dispatchEvent(new Event('pointerdown', { bubbles: true }));
    app('closeModal("modal-seating-student")');
    at(8, 30); app('refreshSeatingCockpit()');
    expect(shown()).toBe('g7a');
  });

  it('Antippen in einer anderen Ansicht zählt nicht', () => {
    at(8, 10); app('switchView("timetable")');
    at(8, 29); document.getElementById('view-timetable').dispatchEvent(new Event('pointerdown', { bubbles: true }));
    app('switchView("seating")');
    at(8, 30); app('refreshSeatingCockpit()');
    expect(shown()).toBe('g9c');
  });
});

describe('Während des Unterrichts im Sitzplan starten', () => {
  it('im Unterricht ja, sonst nein; ausschaltbar', () => {
    at(8, 0);  expect(app('shouldStartInSeating()')).toBe(true);
    at(7, 42); expect(app('shouldStartInSeating()')).toBe(true);   // 3 Min vor Beginn
    at(12, 0); expect(app('shouldStartInSeating()')).toBe(false);
    app('db.settings.seatingStartInLesson = false');
    at(8, 0);  expect(app('shouldStartInSeating()')).toBe(false);
  });
  it('Zurückkommen nach längerer Zeit springt in den Sitzplan, nach kurzer nicht', () => {
    const hide = v => { Object.defineProperty(document, 'hidden', { value: v, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); };
    app('switchView("timetable")');
    at(8, 0); hide(true);
    at(8, 5); hide(false);
    expect(document.getElementById('view-timetable').classList.contains('active')).toBe(true);
    hide(true); at(8, 25); hide(false);
    expect(document.getElementById('view-seating').classList.contains('active')).toBe(true);
    expect(shown()).toBe('g7a');
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });
  it('Start-Code ruft es auf (index lädt app.js beim Öffnen)', () => {
    const src = require('./helpers/load-app').appSource();
    expect(src).toMatch(/if \(shouldStartInSeating\(\)\) switchView\('seating'\);/);
  });
});

describe('Einstellungen', () => {
  it('beide Schalter standardmäßig an; Ausschalten wird gespeichert, Einschalten entfernt den Wert', () => {
    app('openSettings()');
    const start = document.getElementById('settings-seating-start'), auto = document.getElementById('settings-seating-autoswitch');
    expect(start.checked).toBe(true);
    expect(auto.checked).toBe(true);
    start.checked = false; auto.checked = false;
    app('saveSettings()');
    expect(app('db.settings.seatingStartInLesson')).toBe(false);
    expect(app('db.settings.seatingAutoSwitch')).toBe(false);
    app('openSettings()');
    expect(document.getElementById('settings-seating-start').checked).toBe(false);
    document.getElementById('settings-seating-start').checked = true;
    document.getElementById('settings-seating-autoswitch').checked = true;
    app('saveSettings()');
    expect('seatingStartInLesson' in app('db.settings')).toBe(false);
    expect('seatingAutoSwitch' in app('db.settings')).toBe(false);
  });
});
