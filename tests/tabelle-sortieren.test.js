// Tabellen der Klassenansicht sortieren (BUGS BG1, Wunsch 26.11.: „in der Notenübersichtstabelle sollte man auch nach
// nachnamen sortieren können“). Der Kopf „Schüler“ ist eine Auswahl mit denselben Sortierungen wie die Schülerliste (BE9),
// in allen vier Reitern, eine gemeinsame Wahl (student_list_sort, nur auf dem Gerät). Notenschnitt und Mitarbeit nur bei
// aufgedeckten Noten (Regel 16, 104).
const { loadApp, app } = require('./helpers/load-app');

const st = (id, first, last, extra = {}) => ({ id, firstName: first, lastName: last, grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
const G = (value, date = '2026-10-15') => ({ type: 'muendlich', value, date, note: '' });
const P = (value, date = '2026-10-13') => ({ id: value + date + Math.random(), date, value });
const F = (type, date) => ({ id: type + date, date, type, note: '' });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [], lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3d63dd', schularbeitWeight: 50 }],
    students: {
      g1: [
        st('a', 'Ben', 'Zander', { grades: [G('3.0')], participation: [P('positive')], attendance: [F('abwesend', '2026-10-16')] }),
        st('b', 'Anna', 'Yilmaz', { grades: [G('1.0')], participation: [P('excellent'), P('excellent', '2026-10-14')], attendance: [] }),
        st('c', 'Clara', 'Abel', { grades: [], participation: [P('negative')], attendance: [F('abwesend', '2026-10-16'), F('entschuldigt', '2026-10-17'), F('abwesend', '2026-10-20')] }),
        st('d', 'Dana', 'Becker', { grades: [G('2.0')], participation: [P('positive'), P('positive', '2026-10-14'), P('positive', '2026-10-15')], attendance: [F('entschuldigt', '2026-10-16')] }),
      ],
    },
  };
}
const box = () => document.getElementById('overview-content');
const names = () => [...box().querySelectorAll('tbody .ov-name-text')].map(x => x.textContent.trim());
const sel = () => document.getElementById('overview-sort');
const choose = v => { const s = sel(); s.value = v; s.dispatchEvent(new Event('change')); };
const show = () => app('toggleClassGrades()');
const tab = t => app(`switchClassDashboardTab(${JSON.stringify(t)})`);

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 4, 10, 0));
  localStorage.removeItem('student_list_sort');
  app('db = ' + JSON.stringify(sampleDB()));
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  app('openGroupStudents("g1", "grades")');
  show();
});
afterEach(() => vi.useRealTimers());

describe('BG1: Sortieren in der Notentabelle', () => {
  it('Kopf „Schüler“ ist eine Auswahl, Standard nach Vorname', () => {
    expect(sel()).toBeTruthy();
    expect(sel().closest('th.ov-name-col')).toBeTruthy();
    expect(sel().getAttribute('aria-label')).toMatch(/sortieren/);
    expect(sel().value).toBe('first');
    expect(names()).toEqual(['Anna Yilmaz', 'Ben Zander', 'Clara Abel', 'Dana Becker']);
  });
  it('Nachname: sortiert und als „Nachname, Vorname“, Zeile „Durchschnitt“ bleibt unten', () => {
    choose('last');
    expect(names()).toEqual(['Abel, Clara', 'Becker, Dana', 'Yilmaz, Anna', 'Zander, Ben']);
    const rows = [...box().querySelectorAll('tbody tr')];
    expect(rows[rows.length - 1].textContent).toMatch(/Durchschnitt/);
    expect(localStorage.getItem('student_list_sort')).toBe('last');
    expect(JSON.stringify(app('db'))).not.toMatch(/student_list_sort/);
  });
  it('Notenschnitt (in der Tabelle kurz „Schnitt“): beste zuerst, ohne Noten zuletzt', () => {
    expect([...sel().options].find(o => o.value === 'avg').textContent).toBe('Schnitt');
    expect([...sel().options].map(o => o.value)).toEqual(['first', 'last', 'avg', 'part', 'absent']);
    choose('avg');
    expect(names()).toEqual(['Anna Yilmaz', 'Dana Becker', 'Ben Zander', 'Clara Abel']);
  });
  it('Notenschnitt: beim Eintragen springen die Zeilen nicht, neu sortiert erst beim Wechsel des Reiters', () => {
    choose('avg');
    app('updateInlineGrade("c", "2026-10-15", "", "1", "muendlich", 0)');   // Clara bekommt eine 1
    expect(names()).toEqual(['Anna Yilmaz', 'Dana Becker', 'Ben Zander', 'Clara Abel']);   // bleibt, wo sie war
    app('updateInlineGrade("a", "2026-10-15", "", "6", "muendlich", 0)');
    expect(names()).toEqual(['Anna Yilmaz', 'Dana Becker', 'Ben Zander', 'Clara Abel']);
    tab('participation'); tab('grades');
    expect(names()).toEqual(['Anna Yilmaz', 'Clara Abel', 'Dana Becker', 'Ben Zander']);
  });
  it('nach dem Wählen hat die neue Auswahl den Fokus (Tabelle wird neu gezeichnet)', () => {
    sel().focus();
    choose('last');
    expect(document.activeElement).toBe(sel());
  });
});

describe('BG1: alle vier Reiter, eine Wahl mit der Schülerliste', () => {
  it('Mitarbeit, Fehlzeiten und HA sortieren gleich', () => {
    choose('last');
    for (const t of ['participation', 'attendance', 'homework']) {
      tab(t);
      expect(sel().value).toBe('last');
      expect(names()).toEqual(['Abel, Clara', 'Becker, Dana', 'Yilmaz, Anna', 'Zander, Ben']);
    }
  });
  it('Wahl in der Tabelle gilt in der Schülerliste und umgekehrt', () => {
    choose('last');
    tab('students');
    expect(document.getElementById('students-sort').value).toBe('last');
    const s = document.getElementById('students-sort');
    s.value = 'absent'; s.dispatchEvent(new Event('change'));
    tab('attendance');
    expect(sel().value).toBe('absent');
    expect(names()).toEqual(['Clara Abel', 'Ben Zander', 'Dana Becker', 'Anna Yilmaz']);
  });
  it('Fehltage sortieren auch bei verborgenen Noten', () => {
    app('toggleClassGrades()');   // verbergen
    tab('attendance');
    choose('absent');
    expect(names()).toEqual(['Clara Abel', 'Ben Zander', 'Dana Becker', 'Anna Yilmaz']);
  });
});

describe('BG1: Beamer-Schutz (Regel 16, 104)', () => {
  it('Noten verborgen: Fehlzeiten/HA bieten keinen Notenschnitt und keine Mitarbeit, gespeicherte Wahl bleibt alphabetisch', () => {
    localStorage.setItem('student_list_sort', 'avg');
    app('toggleClassGrades()');   // verbergen
    for (const t of ['attendance', 'homework']) {
      tab(t);
      expect([...sel().options].map(o => o.value)).toEqual(['first', 'last', 'absent']);
      expect(sel().value).toBe('first');
      expect(names()).toEqual(['Anna Yilmaz', 'Ben Zander', 'Clara Abel', 'Dana Becker']);   // verrät nichts
    }
    expect(localStorage.getItem('student_list_sort')).toBe('avg');   // Wahl bleibt für „Anzeigen“
    show();
    expect(sel().value).toBe('avg');
    expect(names()).toEqual(['Anna Yilmaz', 'Dana Becker', 'Ben Zander', 'Clara Abel']);
  });
  it('Standard folgt der Einstellung „Nachname zuerst“', () => {
    app('db.settings.studentSortOrder = "lastName"; renderOverviewTable()');
    expect(sel().value).toBe('last');
    expect(names()[0]).toBe('Abel, Clara');
  });
});
