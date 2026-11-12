// Gesamtprüfung 11.11.2026, Paket 5: Rundung, Halbjahre, Schuljahr. AR1, AR2, AR3, AR4.
const { loadApp, app } = require('./helpers/load-app');

const G = (id, date, value, type = 'mitarbeit') => ({ id, date, value, type, note: '' });
function sampleDB(settings = {}) {
  return {
    settings: { teacherName: 'T', blocks: null, warnGrade: 4.5, warnAbsences: 3, ...settings },
    lessonSlots: [], lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '8b', color: '#3b82f6', schularbeitWeight: 50 }],
    students: { g1: [{ id: 's1', firstName: 'Lisa', lastName: 'L', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] }] },
    acknowledgedWarnings: {},
  };
}
const day = (y, m, d) => vi.setSystemTime(new Date(y, m - 1, d, 10, 0));
const load = d => app('replaceDB(migrateDB(' + JSON.stringify(d) + ')); periodChoice = null');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); day(2027, 10, 20); });
afterEach(() => vi.useRealTimers());

describe('AR1: Schnitt genau auf ,x5', () => {
  it('rundet kaufmännisch, auch wenn die Kommazahl intern knapp darunter liegt', () => {
    expect(app('formatGradeAverage(2.15)')).toBe('2,2');
    expect(app('formatGradeAverage(1.05)')).toBe('1,1');
    expect(app('formatGradeAverage(4.45)')).toBe('4,5');
    expect(app('formatGradeAverage(2.25, 2)')).toBe('2,25');
    expect(app('formatGradeAverage(2.14)')).toBe('2,1');
    expect(app('formatGradeAverage(null)')).toBe('–');
  });
  it('Warnung bei genau 4,5 (gewichteter Schnitt liegt intern bei 4,4999…)', () => {
    const d = sampleDB();
    d.groups[0].schularbeitWeight = 70;
    d.students.g1[0].grades = [G('a', '2027-09-20', '4.1', 'schularbeit'), G('b', '2027-09-21', '4.3', 'schularbeit'), G('c', '2027-09-22', '5.2')];
    load(d);
    expect(app('calculateStudentAverage(db.students.g1[0], "g1")')).toBe(4.5);
    expect(app('collectWarnings().map(w => w.type)')).toContain('grade');
  });
});

describe('AR4: Halbjahresende des nächsten Schuljahrs', () => {
  it('im Juli zählt ein schon eingetragenes Halbjahresende fürs nächste Jahr nicht', () => {
    day(2027, 7, 10);
    const d = sampleDB({ halfYearEnd: '2028-02-11' });
    d.students.g1[0].grades = [G('a', '2027-03-01', '2')];
    load(d);
    expect(app('halfYearSplit()')).toBeNull();
    expect(app('calculateStudentAverage(db.students.g1[0], "g1")')).toBe(2);
  });
  it('im neuen Schuljahr gilt es', () => {
    day(2027, 10, 1);
    load(sampleDB({ halfYearEnd: '2028-02-11' }));
    expect(app('halfYearSplit()')).toBe('2028-02-11');
  });
});

describe('AR3: „Schuljahr“ beginnt am 1. August', () => {
  function withOldGrades() {
    const d = sampleDB({ halfYearEnd: '2028-02-11' });
    d.students.g1[0].grades = [G('alt', '2027-03-01', '1'), G('neu', '2027-10-01', '3')];
    return d;
  }
  it('nach dem Stichtag: Noten aus dem Vorjahr zählen nicht im Schuljahres-Schnitt', () => {
    day(2028, 3, 1);
    load(withOldGrades());
    expect(app('periodKey()')).toBe('year');
    expect(app('calculateStudentAverage(db.students.g1[0], "g1")')).toBe(3);
  });
  it('ältere Einträge bleiben erreichbar: Wahl „Alle Jahre“ (nur wenn es sie gibt)', () => {
    day(2028, 3, 1);
    load(withOldGrades());
    app('openGroupStudents("g1")');
    const opt = document.querySelector('#period-select option[value="all"]');
    expect(opt && !opt.hidden).toBe(true);
    app('setPeriodChoice("all")');
    expect(app('calculateStudentAverage(db.students.g1[0], "g1")')).toBe(2);
    const d = withOldGrades(); d.students.g1[0].grades.shift();
    load(d);
    app('openGroupStudents("g1")');
    expect(document.querySelector('#period-select option[value="all"]').hidden).toBe(true);
  });
});

describe('AR2: Erledigte Warnung aus dem Vorjahr', () => {
  const absent = dates => dates.map((x, i) => ({ id: 'f' + x + i, date: x, type: 'abwesend' }));
  const types = () => app('collectWarnings().map(w => w.type)');
  it('ein „Erledigt“ aus dem 1. Halbjahr des Vorjahrs hält im neuen 1. Halbjahr nichts zurück', () => {
    day(2026, 12, 1);
    const d = sampleDB({ halfYearEnd: '2027-02-12' });
    d.students.g1[0].attendance = absent(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06']);
    load(d);
    expect(types()).toContain('absences');
    app('acknowledgeWarning("s1", "absences", 5)');
    expect(types()).not.toContain('absences');
    // ein Jahr später, kein Schuljahreswechsel, neues Halbjahresende
    day(2027, 10, 20);
    app('db.settings.halfYearEnd = "2028-02-11"');
    app('db.students.g1[0].attendance.push(...' + JSON.stringify(absent(['2027-10-04', '2027-10-11', '2027-10-18'])) + ')');
    expect(types()).toContain('absences');
  });
  it('im selben Schuljahr bleibt „Erledigt“ gültig', () => {
    day(2026, 12, 1);
    const d = sampleDB({ halfYearEnd: '2027-02-12' });
    d.students.g1[0].attendance = absent(['2026-11-02', '2026-11-03', '2026-11-04']);
    load(d);
    app('acknowledgeWarning("s1", "absences", 3)');
    day(2027, 1, 20);
    expect(types()).not.toContain('absences');
  });
});
