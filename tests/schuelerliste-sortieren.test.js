// Schülerliste der Klasse sortieren und durchnummerieren (BUGS BE9, Wunsch 15.11.): Vorname, Nachname, Notenschnitt,
// Mitarbeit, Fehltage; Nummer vor jedem Namen und Anzahl oben. Notenschnitt und Mitarbeit nur bei aufgedeckten Noten
// (Beamer-Schutz, Regel 16), sonst alphabetisch. Wahl nur auf dem Gerät, eine für alle Klassen.
const { loadApp, app } = require('./helpers/load-app');

const st = (id, first, last, extra = {}) => ({ id, firstName: first, lastName: last, grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
const G = (value, date = '2026-10-15') => ({ type: 'muendlich', value, date, note: '' });
const P = (value, date = '2026-10-13') => ({ id: value + date + Math.random(), date, value });
const F = (type, date) => ({ id: type + date, date, type, note: '' });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [], lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3d63dd', schularbeitWeight: 50 },
      { id: 'g2', subject: 'Physik', className: 'Q11', color: '#3d63dd', schularbeitWeight: 50, gradeScale: '0-15' }],
    students: {
      g1: [
        st('a', 'Ben', 'Zander', { grades: [G('3.0')], participation: [P('positive')], attendance: [F('abwesend', '2026-10-16')] }),
        st('b', 'Anna', 'Yilmaz', { grades: [G('1.0')], participation: [P('excellent'), P('excellent', '2026-10-14')], attendance: [] }),
        st('c', 'Clara', 'Abel', { grades: [], participation: [P('negative')], attendance: [F('abwesend', '2026-10-16'), F('entschuldigt', '2026-10-17'), F('abwesend', '2026-10-20')] }),
        st('d', 'Dana', 'Becker', { grades: [G('2.0')], participation: [P('positive'), P('positive', '2026-10-14'), P('positive', '2026-10-15')], attendance: [F('entschuldigt', '2026-10-16')] }),
      ],
      g2: [st('x', 'Xaver', 'X', { grades: [G('9')] }), st('y', 'Yara', 'Y', { grades: [G('14')] }), st('z', 'Zoe', 'Z', { grades: [G('3')] })],
    },
  };
}
const box = () => document.getElementById('students-container');
const names = () => [...box().querySelectorAll('.student-row .student-name')].map(x => x.textContent.trim());
const nums = () => [...box().querySelectorAll('.student-row .student-num')].map(x => x.textContent.trim());
const sel = () => document.getElementById('students-sort');
const choose = v => { const s = sel(); s.value = v; s.dispatchEvent(new Event('change')); };
const show = () => app('toggleClassGrades()');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 4, 10, 0));
  localStorage.removeItem('student_list_sort');
  app('db = ' + JSON.stringify(sampleDB()));
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  app('openGroupStudents("g1", "students")');
});
afterEach(() => vi.useRealTimers());

describe('BE9: Nummer und Anzahl', () => {
  it('jeder Name mit Nummer, oben die Anzahl; Standard nach Vorname', () => {
    expect(box().querySelector('.students-count').textContent).toBe('4 Schüler');
    expect(names()).toEqual(['Anna Yilmaz', 'Ben Zander', 'Clara Abel', 'Dana Becker']);
    expect(nums()).toEqual(['1', '2', '3', '4']);
  });
  it('ein Schüler: „1 Schüler“', () => {
    app('db.students.g1 = db.students.g1.slice(0, 1); renderStudents()');
    expect(box().querySelector('.students-count').textContent).toBe('1 Schüler');
  });
});

describe('BE9: Sortieren', () => {
  it('Nachname: sortiert und als „Nachname, Vorname“', () => {
    choose('last');
    expect(names()).toEqual(['Abel, Clara', 'Becker, Dana', 'Yilmaz, Anna', 'Zander, Ben']);
    expect(nums()).toEqual(['1', '2', '3', '4']);
  });
  it('Fehltage: meiste zuerst (unentschuldigt + entschuldigt), auch bei verborgenen Noten', () => {
    choose('absent');
    expect(names()).toEqual(['Clara Abel', 'Ben Zander', 'Dana Becker', 'Anna Yilmaz']);
  });
  it('Notenschnitt verborgen: nicht wählbar, Liste bleibt alphabetisch; nach „Anzeigen“ beste zuerst, ohne Noten zuletzt', () => {
    expect([...sel().options].map(o => o.value)).toEqual(['first', 'last', 'absent']);
    localStorage.setItem('student_list_sort', 'avg');
    app('renderStudents()');
    expect(names()).toEqual(['Anna Yilmaz', 'Ben Zander', 'Clara Abel', 'Dana Becker']);   // verrät nichts
    expect(box().querySelector('.students-sort-note').textContent).toMatch(/Anzeigen/);
    show();
    expect([...sel().options].map(o => o.value)).toEqual(['first', 'last', 'avg', 'part', 'absent']);
    expect(sel().value).toBe('avg');
    expect(names()).toEqual(['Anna Yilmaz', 'Dana Becker', 'Ben Zander', 'Clara Abel']);
    app('toggleClassGrades()');   // „Verbergen“
    expect(names()).toEqual(['Anna Yilmaz', 'Ben Zander', 'Clara Abel', 'Dana Becker']);
  });
  it('Notenschnitt in Punkte-Klassen: höchste Punktzahl zuerst', () => {
    localStorage.setItem('student_list_sort', 'avg');
    app('openGroupStudents("g2", "students")');
    show();
    expect(names()).toEqual(['Yara Y', 'Xaver X', 'Zoe Z']);
  });
  it('Mitarbeit: meiste Plusse zuerst (++ zählt doppelt)', () => {
    show();
    choose('part');
    expect(names()).toEqual(['Anna Yilmaz', 'Dana Becker', 'Ben Zander', 'Clara Abel']);   // 4, 3, 1, 0
  });
  it('Wahl gilt für alle Klassen, nur auf dem Gerät, nie in db', () => {
    choose('last');
    expect(localStorage.getItem('student_list_sort')).toBe('last');
    app('openGroupStudents("g2", "students")');
    expect(sel().value).toBe('last');
    expect(JSON.stringify(app('db'))).not.toMatch(/student_list_sort/);
  });
  it('Standard folgt der Einstellung „Nachname zuerst“', () => {
    app('db.settings.studentSortOrder = "lastName"; renderStudents()');
    expect(sel().value).toBe('last');
    expect(names()[0]).toBe('Abel, Clara');
  });
});
