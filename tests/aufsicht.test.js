// BUGS AA4: Pausenaufsicht – eigene Einträge zwischen den Blöcken, im Stundenplan und im Dashboard.
const { loadApp, app } = require('./helpers/load-app');

const MON = '2026-10-19';
const HOF = { id: 'a1', day: 0, start: '09:15', end: '09:45', place: 'Hof', recurring: 'weekly' };

function sampleDB(supervisions = [HOF], extra = {}) {
  return {
    settings: { teacherName: 'Test', school: '', blocks: null, ...extra },
    lessonSlots: [
      { id: 'l1', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
      { id: 'l2', day: 0, block: 2, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
    ],
    lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#6366f1', schularbeitWeight: 50 }],
    students: { g1: [] },
    ...(supervisions ? { supervisions } : {}),
  };
}
const setDB = d => app('db = ' + JSON.stringify(d));
const val = id => document.getElementById(id).value;
const setVal = (id, v) => { document.getElementById(id).value = v; };
const isOpen = id => !document.getElementById(id).classList.contains('hidden');
const toast = () => document.getElementById('toast-container').textContent;

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 19, 8, 58)); // Mo 19.10.2026, im 1. Block
  window.innerWidth = 1024;
  setDB(sampleDB());
  app('currentWeekOffset = 0; timetableDay = null; timetableChosenOn = ""');
  document.getElementById('toast-container').innerHTML = '';
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  window.confirm = () => true;
});
afterEach(() => vi.useRealTimers());

describe('AA4: Daten', () => {
  it('Altdaten ohne Aufsichten: leere Liste, nichts sonst geändert', () => {
    const old = sampleDB(null);
    const migrated = app('migrateDB')(JSON.parse(JSON.stringify(old)));
    expect(migrated.supervisions).toEqual([]);
    expect(migrated.lessonSlots).toEqual(old.lessonSlots);
  });

  it('supervisionsOn: wöchentlich, A/B-Woche, einmalig, nach Uhrzeit sortiert, nicht in den Ferien', () => {
    setDB(sampleDB([
      { id: 'b', day: 0, start: '11:15', end: '11:45', place: 'Halle', recurring: 'weekly' },
      HOF,
      { id: 'ab', day: 0, start: '07:30', end: '07:45', place: 'Bus', recurring: 'biweekly', startDate: '2026-10-26' },
      { id: 'once', day: 1, start: '13:15', end: '13:45', place: 'Mensa', recurring: 'none', specificDate: '2026-10-20' },
    ]));
    expect(app(`supervisionsOn('${MON}')`).map(s => s.id)).toEqual(['a1', 'b']);
    expect(app(`supervisionsOn('2026-10-26')`).map(s => s.id)).toEqual(['ab', 'a1', 'b']);
    expect(app(`supervisionsOn('2026-10-20')`).map(s => s.id)).toEqual(['once']);
    expect(app(`supervisionsOn('2026-10-27')`)).toEqual([]);
    app(`db.settings.holidays = [{ id: 'h', label: 'Herbstferien', from: '2026-10-26', until: '2026-10-30' }]`);
    expect(app(`supervisionsOn('2026-10-26')`)).toEqual([]);
  });
});

describe('AA4: Stundenplan', () => {
  const breakRows = () => [...document.querySelectorAll('.tt-break-label')];

  it('ohne Aufsichten: keine Pausenzeilen (Plan sieht aus wie bisher)', () => {
    setDB(sampleDB([]));
    app('switchView("timetable"); renderTimetable()');
    expect(breakRows()).toHaveLength(0);
    expect(document.querySelectorAll('.tt-supervision').length).toBe(0);
  });

  it('Woche: Pausenzeile nach dem 1. Block, Aufsicht am Montag, antippbar', () => {
    app('switchView("timetable"); renderTimetable()');
    expect(breakRows()).toHaveLength(1);
    const chips = [...document.querySelectorAll('.tt-supervision')];
    expect(chips).toHaveLength(1);
    expect(chips[0].textContent).toContain('Hof');
    expect(chips[0].getAttribute('role')).toBe('button');
    // Reihenfolge im Raster: 1. Block-Zellen, dann Pausenzeile, dann 2. Block
    const order = [...document.getElementById('timetable-grid').children].map(el =>
      el.classList.contains('tt-break-label') ? 'pause' : el.classList.contains('tt-time-label') ? el.textContent.trim().slice(0, 8) : null).filter(Boolean);
    expect(order).toEqual(['1. Block', 'pause', '2. Block', '3. Block', '4. Block']);
    const rows = document.getElementById('timetable-grid').style.gridTemplateRows;
    expect(rows.split(' ').filter(r => r === 'auto').length).toBe(2); // Kopf + Pause
  });

  it('Tagesansicht (Handy) zeigt die Aufsicht ebenso', () => {
    window.innerWidth = 400;
    app('switchView("timetable"); renderTimetable()');
    expect(document.querySelector('.tt-supervision').textContent).toContain('Hof');
    window.innerWidth = 1024;
  });

  it('Knopf „+ Aufsicht“ öffnet das Formular, vorbelegt mit der ersten Pause', () => {
    app('switchView("timetable"); renderTimetable()');
    const btn = document.querySelector('#timetable-grid .tt-add-supervision');
    expect(btn && btn.textContent).toMatch(/Aufsicht/);
    app('openSupervisionForm()');
    expect(isOpen('modal-supervision')).toBe(true);
    expect(val('sup-day')).toBe('0');
    expect(val('sup-start')).toBe('09:15');
    expect(val('sup-end')).toBe('09:45');
    expect(val('sup-recurring')).toBe('weekly');
    expect(document.getElementById('btn-delete-supervision').classList.contains('hidden')).toBe(true);
  });
});

describe('AA4: Formular', () => {
  it('neue Aufsicht speichern', () => {
    setDB(sampleDB([]));
    app('openSupervisionForm()');
    setVal('sup-day', '2'); setVal('sup-start', '11:15'); setVal('sup-end', '11:45'); setVal('sup-place', 'Turnhalle');
    app('saveSupervision()');
    expect(isOpen('modal-supervision')).toBe(false);
    expect(app('db.supervisions')).toHaveLength(1);
    expect(app('db.supervisions[0]')).toMatchObject({ day: 2, start: '11:15', end: '11:45', place: 'Turnhalle', recurring: 'weekly' });
    expect(app('db.supervisions[0].id')).toBeTruthy();
  });

  it('Ende nicht nach Beginn: abgelehnt, Fenster bleibt offen', () => {
    setDB(sampleDB([]));
    app('openSupervisionForm()');
    setVal('sup-start', '10:00'); setVal('sup-end', '09:50');
    app('saveSupervision()');
    expect(app('db.supervisions')).toHaveLength(0);
    expect(isOpen('modal-supervision')).toBe(true);
    expect(toast()).toMatch(/Ende/);
  });

  it('A/B-Woche und einmalig brauchen ein Datum; der Wochentag kommt aus dem Datum', () => {
    setDB(sampleDB([]));
    app('openSupervisionForm()');
    setVal('sup-recurring', 'biweekly');
    app('updateSupervisionFormFields()');
    expect(document.getElementById('sup-date-group').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('sup-day-group').classList.contains('hidden')).toBe(true);
    expect(val('sup-date')).toBe('2026-10-19');   // vorbelegt: nächster Schultag
    setVal('sup-date', '');
    app('saveSupervision()');
    expect(app('db.supervisions')).toHaveLength(0);
    setVal('sup-date', '2026-10-21');
    app('saveSupervision()');
    expect(app('db.supervisions[0]')).toMatchObject({ day: 2, recurring: 'biweekly', startDate: '2026-10-21' });
  });

  it('Wochenende als Datum: abgelehnt', () => {
    setDB(sampleDB([]));
    app('openSupervisionForm()');
    setVal('sup-recurring', 'none');
    setVal('sup-date', '2026-10-24');
    app('saveSupervision()');
    expect(app('db.supervisions')).toHaveLength(0);
  });

  it('Bearbeiten über den Eintrag selbst (nicht per Index), Löschen mit Rückfrage', () => {
    app('openSupervisionForm("a1")');
    expect(val('sup-place')).toBe('Hof');
    app('db.supervisions.unshift({ id: "z", day: 3, start: "07:30", end: "07:45", place: "Bus", recurring: "weekly" })'); // Sync dazwischen
    setVal('sup-place', 'Schulhof');
    app('saveSupervision()');
    expect(app('db.supervisions').find(s => s.id === 'a1').place).toBe('Schulhof');
    expect(app('db.supervisions').find(s => s.id === 'z').place).toBe('Bus');
    app('openSupervisionForm("a1")');
    app('deleteSupervision()');
    expect(app('db.supervisions').map(s => s.id)).toEqual(['z']);
  });

  it('Schließen mit Änderungen fragt; „Nein“ lässt das Fenster offen', () => {
    app('openSupervisionForm("a1")');
    setVal('sup-place', 'Anderswo');
    window.confirm = () => false;
    app('closeModalLikeButton("modal-supervision")');
    expect(isOpen('modal-supervision')).toBe(true);
    window.confirm = () => true;
    app('closeModalLikeButton("modal-supervision")');
    expect(isOpen('modal-supervision')).toBe(false);
    expect(app('db.supervisions[0].place')).toBe('Hof');
  });

  it('Schließen ohne Änderungen fragt nicht', () => {
    let asked = false;
    window.confirm = () => { asked = true; return true; };
    app('openSupervisionForm("a1")');
    app('closeModalLikeButton("modal-supervision")');
    expect(asked).toBe(false);
  });
});

describe('AA4: Dashboard „Heute“', () => {
  it('Aufsicht steht zwischen den Stunden, mit „beginnt in … min“', () => {
    app('switchView("dashboard")');
    const rows = [...document.querySelectorAll('#view-dashboard .dash-lesson')];
    const texts = rows.map(r => r.textContent.replace(/\s+/g, ' '));
    const i = texts.findIndex(t => t.includes('Aufsicht'));
    expect(i).toBe(1); // nach dem 1. Block, vor dem 2.
    expect(rows[i].classList.contains('dash-supervision')).toBe(true);
    expect(texts[i]).toContain('Hof');
    expect(texts[i]).toMatch(/beginnt in 17 min/);
  });

  it('nur Aufsichten, keine Stunden: trotzdem aufgeführt', () => {
    setDB({ ...sampleDB(), lessonSlots: [] });
    app('switchView("dashboard")');
    expect(document.getElementById('view-dashboard').textContent).toContain('Hof');
  });
});

describe('AA4: Ort aus den Daten wird nie als HTML ausgeführt', () => {
  it('Stundenplan und Dashboard escapen den Ort', () => {
    setDB(sampleDB([{ ...HOF, place: '<img src=x onerror="window.__xss2=1">' }]));
    app('switchView("timetable"); renderTimetable()');
    app('switchView("dashboard")');
    expect(document.querySelector('#timetable-grid img, #view-dashboard img')).toBeNull();
    expect(window.__xss2).toBeUndefined();
  });
});
