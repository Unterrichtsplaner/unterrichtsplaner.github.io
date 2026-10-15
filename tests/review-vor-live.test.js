// Review vor dem Live-Gang (15.10.2026): Befunde R1–R9 aus der Prüfung der Änderungen gegen main.
const { loadApp, app } = require('./helpers/load-app');

const HERBST = { id: 'h1', label: 'Herbstferien', from: '2026-11-02', until: '2026-11-06' };
function sampleDB(extra = {}) {
  return {
    settings: { teacherName: 'Test', school: '', blocks: null, holidays: [HERBST] },
    lessonSlots: [
      { id: 'l1', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
      { id: 'once', day: 2, block: 2, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'none', specificDate: '2026-11-04' },
    ],
    lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '7a', color: '#6366f1', schularbeitWeight: 50, seatingCols: 4, seatingRows: 3 },
             { id: 'g2', subject: 'Ethik', className: 'Ethik 7a-d', color: '#8b5cf6', schularbeitWeight: 50 }],
    students: { g1: [{ id: 'a', firstName: 'Anna', lastName: 'A', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] }], g2: [] },
    supervisions: [],
    ...extra,
  };
}
const setDB = d => app('db = ' + JSON.stringify(d));
const flush = () => new Promise(r => setTimeout(r, 0));
const choiceOpen = () => !document.getElementById('modal-choice').classList.contains('hidden');
const toast = () => document.getElementById('toast-container').textContent;

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 4, 9, 0)); // Mi 04.11.2026 – in den Herbstferien
  window.innerWidth = 1024;
  setDB(sampleDB());
  app('editingGroupId = null; currentWeekOffset = 0; timetableDay = null; timetableChosenOn = ""');
  document.getElementById('toast-container').innerHTML = '';
  if (app('choiceResolve')) app('answerChoice(null)');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  window.confirm = () => true;
});
afterEach(() => vi.useRealTimers());

describe('R1: Klassennamen mit Bereich („Ethik 7a-d“)', () => {
  it('Bearbeiten speichert den Namen unverändert', () => {
    app('openEditGroup("g2")');
    document.getElementById('weight-schularbeit').value = '40';
    app('saveSubjectGroup()');
    const g = app('db.groups').find(x => x.id === 'g2');
    expect(g.className).toBe('Ethik 7a-d');
    expect(g.schularbeitWeight).toBe(40);
  });

  it('Anlegen: Kursname mit Wort davor bleibt eine Klasse, nur „7a-d“ wird aufgeteilt', () => {
    expect(app('parseClassNames("Ethik 7a-d")')).toEqual(['Ethik 7a-d']);
    expect(app('parseClassNames("Reli 5a–c")')).toEqual(['Reli 5a–c']);
    expect(app('parseClassNames("7a-d")')).toEqual(['7a', '7b', '7c', '7d']);
    expect(app('parseClassNames("10A-C")')).toEqual(['10A', '10B', '10C']);
  });
});

describe('R2/R4: einmalige Stunde in den Ferien bleibt erreichbar', () => {
  it('ein Ferientag mit einmaliger Stunde zählt als Schultag, ohne nicht', () => {
    expect(app('isSchoolDay(parseDate("2026-11-04"))')).toBe(true);
    expect(app('isSchoolDay(parseDate("2026-11-05"))')).toBe(false);
  });

  it('Sitzplan aus dieser Stunde: Einträge landen an ihrem Tag', () => {
    app('openSeatingForGroup("g1", "2026-11-04")');
    expect(app('currentSeatingDateStr')).toBe('2026-11-04');
  });

  it('Tagesansicht (Handy) zeigt den Tag und die Stunde', () => {
    window.innerWidth = 400;
    app('switchView("timetable"); renderTimetable()');
    expect(document.querySelector('.tt-day-header').textContent).toContain('04.11.');
    expect(document.querySelectorAll('.tt-lesson').length).toBe(1);
  });

  it('Dashboard: „Heute“ mit der einmaligen Stunde', () => {
    app('switchView("dashboard")');
    const text = document.getElementById('view-dashboard').textContent;
    expect(text).toContain('Heute');
    expect(document.querySelectorAll('#view-dashboard .dash-lesson').length).toBe(1);
  });
});

describe('R3: Schnellbewertung aus der Tabelle in den Ferien', () => {
  it('Datum = letzter Schultag davor, nicht ein Tag nach den Ferien', () => {
    vi.setSystemTime(new Date(2026, 10, 5, 9, 0)); // Do 05.11., Ferien ohne Stunde
    app('currentOverviewGroupId = "g1"; openQuickRatingFromTable("a")');
    // letzter Schultag davor: 04.11. (einmalige Stunde in den Ferien zählt, R2) – nie der 09.11. nach den Ferien
    expect(app('window.currentSeatingStudent.dateStr')).toBe('2026-11-04');
  });
});

describe('R5: Vorlage Einzelstunden mit vorhandenen halben Stunden', () => {
  it('Rückfrage nennt die halben Stunden', async () => {
    app(`db.lessonSlots.push({ id: 'h', day: 1, block: 1, part: 'first', subject: 'AG', color: '#ef4444', recurring: 'weekly' })`);
    app('openSettings()');
    const p = app('chooseBlockTemplate()');
    await flush();
    expect(document.getElementById('modal-choice-text').textContent).toMatch(/1 halbe Stunde/);
    app('answerChoice(null)');
    await p;
  });

  it('ausgeblendete Hälften-Auswahl springt nicht unsichtbar auf eine Hälfte', () => {
    app('db.settings.blocks = ' + JSON.stringify([1, 2].map(n => ({ num: n, label: n + '. Stunde', start: `0${7 + n}:00`, end: `0${7 + n}:45` }))));
    app(`db.lessonSlots.push({ id: 'h', day: 0, block: 2, part: 'first', subject: 'AG', color: '#ef4444', recurring: 'weekly' })`);
    vi.setSystemTime(new Date(2026, 9, 12, 9, 0));
    app('openAddLessonSlot(0, 2, null, "full")');
    expect(document.getElementById('lesson-part-group').classList.contains('hidden')).toBe(true);
    const checked = [...document.getElementsByName('new-lesson-part')].find(r => r.checked);
    expect(checked.value).toBe('full');
  });
});

describe('R6: HA in den Ferien verschieben', () => {
  it('nicht angeboten, wenn dort eine einmalige Stunde der Klasse liegt', async () => {
    setDB(sampleDB({ settings: { teacherName: 'T', blocks: null } }));
    app(`db.lessonData['l1_2026-10-26'] = { hwEnabled: true, hwItems: [{ id: 'x', text: 'S. 12', targetDate: '2026-11-04' }] }`);
    vi.setSystemTime(new Date(2026, 9, 27, 9, 0));
    app('openSettings()');
    app('addHolidayRow()');
    const row = document.querySelector('#holidays-editor .holiday-row');
    row.querySelector('.holiday-from-input').value = '2026-11-02';
    row.querySelector('.holiday-until-input').value = '2026-11-06';
    app('saveSettings()');
    await flush();
    expect(choiceOpen()).toBe(false);
  });

  it('nur fragen, wenn sich die Ferien geändert haben (nicht bei jedem Speichern)', async () => {
    vi.setSystemTime(new Date(2026, 9, 27, 9, 0));
    app(`db.lessonData['l1_2026-10-26'] = { hwEnabled: true, hwItems: [{ id: 'x', text: 'S. 12', targetDate: '2026-11-05' }] }`);
    app('openSettings()');
    document.getElementById('settings-teacher-name').value = 'Anderer Name';
    app('saveSettings()');
    await flush();
    expect(choiceOpen()).toBe(false);
  });
});

describe('R7: Aufsichten und Ferien zählen als Daten', () => {
  it('Gerät nur mit Aufsicht oder nur mit Ferien ist nicht „leer“', () => {
    setDB({ settings: { blocks: null }, lessonSlots: [], lessonData: {}, groups: [], students: {}, supervisions: [{ id: 'u', day: 0, start: '09:00', end: '09:20', recurring: 'weekly' }] });
    expect(app('isLocalDBEmpty()')).toBe(false);
    setDB({ settings: { blocks: null, holidays: [HERBST] }, lessonSlots: [], lessonData: {}, groups: [], students: {}, supervisions: [] });
    expect(app('isLocalDBEmpty()')).toBe(false);
    setDB({ settings: { blocks: null }, lessonSlots: [], lessonData: {}, groups: [], students: {}, supervisions: [] });
    expect(app('isLocalDBEmpty()')).toBe(true);
  });
});

describe('R8: unplausible Ferien', () => {
  const addRow = (from, until) => {
    app('openSettings()');
    app('addHolidayRow()');
    const rows = document.querySelectorAll('#holidays-editor .holiday-row');
    const row = rows[rows.length - 1];
    row.querySelector('.holiday-from-input').value = from;
    row.querySelector('.holiday-until-input').value = until;
  };

  it('Tippfehler im Jahr („2205“): Rückfrage, bei „Nein“ nichts gespeichert', () => {
    let asked = '';
    window.confirm = m => { asked = m; return false; };
    addRow('2026-12-21', '2205-01-06');
    app('saveSettings()');
    expect(asked).toMatch(/ungewöhnlich lang/);
    expect(app('db.settings.holidays')).toHaveLength(1);
  });

  it('normale Sommerferien: keine Rückfrage', () => {
    let asked = false;
    window.confirm = () => { asked = true; return true; };
    addRow('2027-08-02', '2027-09-13');
    app('saveSettings()');
    expect(asked).toBe(false);
    expect(app('db.settings.holidays')).toHaveLength(2);
  });

  it('auch bei riesigen Ferien friert die App nicht ein (Suche begrenzt)', () => {
    app(`db.settings.holidays = [{ id: 'x', label: 'Fehler', from: '2026-01-01', until: '9999-12-31' }]`);
    const p0 = performance.now();
    app('nextSchoolDay(parseDate("2026-11-04"))');
    expect(performance.now() - p0).toBeLessThan(500);
  });
});

describe('R9: kaputte Ferien-Daten', () => {
  it('Dashboard stürzt nicht ab, wenn holidays keine Liste ist', () => {
    app(`db.settings.holidays = { kaputt: true }`);
    expect(() => app('switchView("dashboard")')).not.toThrow();
    expect(document.getElementById('view-dashboard').textContent.length).toBeGreaterThan(0);
  });
});
