// BUGS Y8: Ferien und freie Tage. Regelmäßige Stunden fallen aus, Fälligkeiten springen über die Ferien.
const { loadApp, app } = require('./helpers/load-app');

const HERBST = { id: 'h1', label: 'Herbstferien', from: '2026-10-26', until: '2026-10-30' };

function sampleDB(holidays = [HERBST]) {
  return {
    settings: { teacherName: 'Test', school: '', blocks: null, holidays },
    lessonSlots: [
      { id: 'l1', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
      { id: 'l2', day: 2, block: 2, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
    ],
    lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', year: '2026/27', color: '#6366f1', schularbeitWeight: 50 }],
    students: { g1: [] },
  };
}
const setDB = d => app('db = ' + JSON.stringify(d));
const choiceOpen = () => !document.getElementById('modal-choice').classList.contains('hidden');
const flush = () => new Promise(r => setTimeout(r, 0));

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 22, 10, 0)); // Do 22.10.2026, vor den Herbstferien
  window.innerWidth = 1024;
  setDB(sampleDB());
  app('currentWeekOffset = 0; timetableDay = null; timetableChosenOn = ""');
  document.getElementById('toast-container').innerHTML = '';
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  window.confirm = () => true;
});
afterEach(() => vi.useRealTimers());

describe('Y8: Ferien im Kalender', () => {
  it('holidayAt kennt den Zeitraum einschließlich erstem und letztem Tag', () => {
    expect(app('holidayAt("2026-10-26")').label).toBe('Herbstferien');
    expect(app('holidayAt("2026-10-30")').label).toBe('Herbstferien');
    expect(app('holidayAt("2026-10-25")')).toBeFalsy();
    expect(app('holidayAt("2026-10-31")')).toBeFalsy();
  });

  it('kaputte oder fehlende Einträge stören nicht', () => {
    setDB(sampleDB([null, { label: 'x' }, { from: 3, until: 'a' }, HERBST]));
    expect(app('holidayAt("2026-10-27")').label).toBe('Herbstferien');
    setDB({ ...sampleDB(), settings: { teacherName: 'Test', blocks: null } });
    expect(app('holidayAt("2026-10-27")')).toBeFalsy();
  });

  it('regelmäßige Stunden fallen in den Ferien aus, einmalige nicht', () => {
    const l1 = app('db.lessonSlots[0]');
    expect(app('slotOccursOn')(l1, '2026-10-26')).toBe(false);
    expect(app('slotOccursOn')(l1, '2026-11-02')).toBe(true);
    const once = { id: 'o', day: 1, block: 1, recurring: 'none', specificDate: '2026-10-27' };
    expect(app('slotOccursOn')(once, '2026-10-27')).toBe(true);
  });

  it('Ferientage sind keine Schultage', () => {
    expect(app('isSchoolDay(parseDate("2026-10-27"))')).toBe(false);
    expect(app('formatDate(nextSchoolDay(parseDate("2026-10-26")))')).toBe('2026-11-02');
    expect(app('formatDate(addSchoolDays(parseDate("2026-10-23"), 1))')).toBe('2026-11-02');
  });

  it('Datumsvorschläge für HA überspringen die Ferien', () => {
    const next = app('findUpcomingLessonDates("l2", "2026-10-22", 2)').map(x => x.dateStr);
    expect(next).toEqual(['2026-11-02', '2026-11-04']);
  });

  it('„nächste Stunde“ findet auch nach sechs Wochen Sommerferien die erste Stunde', () => {
    setDB(sampleDB([{ id: 's', label: 'Sommerferien', from: '2026-10-23', until: '2026-12-04' }]));
    const next = app('findNextLesson(new Date())');
    expect(next && next.dateStr).toBe('2026-12-07');
  });

  it('Wochenansicht: Ferientage beschriftet, keine Stunden und kein „+“', () => {
    app('currentWeekOffset = 1; switchView("timetable"); renderTimetable()');
    const headers = [...document.querySelectorAll('.tt-day-header')];
    expect(headers.every(h => h.textContent.includes('Herbstferien'))).toBe(true);
    expect(document.querySelectorAll('.tt-lesson').length).toBe(0);
    expect(document.querySelectorAll('.tt-empty-cell').length).toBe(0);
  });

  it('Tagesansicht (Handy) auf einem Ferientag: Kopf nennt die Ferien', () => {
    window.innerWidth = 400;
    app('timetableDay = "2026-10-27"; timetableChosenOn = formatDate(new Date()); switchView("timetable"); renderTimetable()');
    expect(document.querySelector('.tt-day-header').textContent).toContain('Herbstferien');
    expect(document.querySelectorAll('.tt-empty-cell').length).toBe(0);
    window.innerWidth = 1024;
  });

  it('einzelner Feiertag in der Woche: nur dieser Tag ist frei', () => {
    setDB(sampleDB([{ id: 'f', label: 'Reformationstag', from: '2026-11-04', until: '2026-11-04' }]));
    app('currentWeekOffset = 2; switchView("timetable"); renderTimetable()');
    const headers = [...document.querySelectorAll('.tt-day-header')].map(h => h.textContent);
    expect(headers.filter(h => h.includes('Reformationstag'))).toHaveLength(1);
    expect(document.querySelectorAll('.tt-lesson').length).toBe(1); // Mo ja, Mi nicht
  });

  it('Dashboard in den Ferien: nennt die Ferien und zeigt den ersten Schultag danach', () => {
    vi.setSystemTime(new Date(2026, 9, 27, 9, 0)); // Di in den Ferien
    app('switchView("dashboard")');
    const text = document.getElementById('view-dashboard').textContent;
    expect(text).toContain('Herbstferien');
    expect(text).toContain('Nächster Schultag');
    expect(text).toMatch(/02\.11\./);
    expect(document.querySelectorAll('.dash-lesson').length).toBe(1);
  });
});

describe('Y8: Ferien in den Einstellungen', () => {
  const rows = () => [...document.querySelectorAll('#holidays-editor .holiday-row')];
  const fill = (row, label, from, until) => {
    row.querySelector('.holiday-name-input').value = label;
    row.querySelector('.holiday-from-input').value = from;
    row.querySelector('.holiday-until-input').value = until;
  };

  it('vorhandene Ferien stehen im Formular', () => {
    app('openSettings()');
    expect(rows()).toHaveLength(1);
    expect(rows()[0].querySelector('.holiday-name-input').value).toBe('Herbstferien');
  });

  it('Zeitraum hinzufügen → ungespeichert (Rückfrage beim Schließen), mit „Speichern“ übernommen, sortiert', () => {
    app('openSettings()');
    app('addHolidayRow()');
    fill(rows()[1], 'Buß- und Bettag', '2026-11-18', '2026-11-18');
    expect(app('settingsDirty()')).toBe(true);
    expect(app('db.settings.holidays')).toHaveLength(1);
    app('saveSettings()');
    const saved = app('db.settings.holidays');
    expect(saved.map(h => h.label)).toEqual(['Herbstferien', 'Buß- und Bettag']);
    expect(saved[1]).toMatchObject({ from: '2026-11-18', until: '2026-11-18' });
    expect(saved[1].id).toBeTruthy();
  });

  it('Ende vor Beginn oder ohne Datum: nichts gespeichert, Hinweis', () => {
    app('openSettings()');
    app('addHolidayRow()');
    fill(rows()[1], 'Weihnachten', '2027-01-08', '2026-12-21');
    app('saveSettings()');
    expect(app('db.settings.holidays')).toHaveLength(1);
    expect(document.getElementById('toast-container').textContent).toMatch(/Weihnachten/);
    fill(rows()[1], 'Weihnachten', '', '');
    app('saveSettings()');
    expect(app('db.settings.holidays')).toHaveLength(1);
  });

  it('ohne Namen heißt der Zeitraum „Ferien“', () => {
    app('openSettings()');
    app('addHolidayRow()');
    fill(rows()[1], '', '2026-12-21', '2027-01-08');
    app('saveSettings()');
    expect(app('db.settings.holidays')[1].label).toBe('Ferien');
  });

  it('Zeitraum löschen', () => {
    app('openSettings()');
    app('deleteHolidayRow(0)');
    app('saveSettings()');
    expect(app('db.settings.holidays') || []).toHaveLength(0);
  });

  it('HA, die in die neuen Ferien fällt: Angebot, sie auf die erste Stunde danach zu verschieben', async () => {
    setDB(sampleDB([]));
    app(`db.lessonData['l1_2026-10-19'] = { hwEnabled: true, hwItems: [{ id: 'hw1', text: 'S. 12', targetDate: '2026-10-26' }] }`);
    app('openSettings()');
    app('addHolidayRow()');
    fill(rows()[0], 'Herbstferien', '2026-10-26', '2026-10-30');
    app('saveSettings()');
    await flush();
    expect(choiceOpen()).toBe(true);
    expect(document.getElementById('modal-choice-text').textContent).toContain('S. 12');
    app('answerChoice("move")');
    await flush();
    expect(app(`db.lessonData['l1_2026-10-19'].hwItems[0].targetDate`)).toBe('2026-11-02');
  });

  it('Notizen in den neuen Ferien: vorher fragen, bei „Nein“ nichts speichern', () => {
    setDB(sampleDB([]));
    app(`db.lessonData['l2_2026-10-28'] = { notes: 'Ausflug vorbereiten' }`);
    let asked = '';
    window.confirm = msg => { asked = msg; return false; };
    app('openSettings()');
    app('addHolidayRow()');
    fill(rows()[0], 'Herbstferien', '2026-10-26', '2026-10-30');
    app('saveSettings()');
    expect(asked).toMatch(/Ferien/);
    expect(app('db.settings.holidays') || []).toHaveLength(0);
  });
});

describe('Y8: Ferienname aus den Daten wird nie als HTML ausgeführt', () => {
  it('Wochenansicht, Dashboard und Einstellungen escapen den Namen', () => {
    const evil = '<img src=x onerror="window.__xss=1">';
    setDB(sampleDB([{ id: 'x', label: evil, from: '2026-10-26', until: '2026-10-30' }]));
    app('currentWeekOffset = 1; switchView("timetable"); renderTimetable()');
    vi.setSystemTime(new Date(2026, 9, 27, 9, 0));
    app('switchView("dashboard")');
    app('openSettings()');
    expect(document.querySelector('#timetable-grid img, #view-dashboard img, #holidays-editor img')).toBeNull();
    expect(document.getElementById('timetable-grid').textContent).toContain('<img');
    expect(window.__xss).toBeUndefined();
  });
});
