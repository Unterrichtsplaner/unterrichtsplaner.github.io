// Y7: Halbjahre. Stichtag = Halbjahresende aus den Einstellungen (AD4). Umschalter „1. Halbjahr · 2. Halbjahr · Schuljahr“
// in der Klassenansicht (nur Ansichtszustand, nie in db): Schnitte, Tabellen, Schülerliste, Schüler-Fenster, Bericht folgen
// ihm. Standard vor dem Stichtag 1. Halbjahr, danach Schuljahr. Warnungen zählen immer das laufende Halbjahr.
const { loadApp, app, showGradesOnOpen } = require('./helpers/load-app');

const HY = '2027-02-12';   // Halbjahresende (Freitag)
const g1 = (value, date, type = 'schularbeit', note = '') => ({ type, value, date, note });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null, halfYearEnd: HY, warnAbsences: 3, warnHomework: 3, warnGrade: 4.5 },
    lessonSlots: [], lessonData: {}, supervisions: [], acknowledgedWarnings: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50 }],
    students: { g1: [
      { id: 'a', firstName: 'Anna', lastName: 'A', studentNotes: [],
        grades: [g1('2.0', '2026-10-15'), g1('3.0', '2026-12-10', 'test'), g1('5.0', '2027-03-04'), g1('4.0', '2027-03-11', 'test')],
        attendance: [{ id: 'x1', date: '2026-11-02', type: 'abwesend', note: '' }, { id: 'x2', date: '2026-11-05', type: 'abwesend', note: '' },
          { id: 'x3', date: '2026-11-09', type: 'abwesend', note: '' }, { id: 'x4', date: '2027-03-01', type: 'abwesend', note: '' },
          { id: 'x5', date: '2027-03-02', type: 'entschuldigt', note: '' }],
        participation: [{ id: 'p1', date: '2026-11-02', value: 'positive' }, { id: 'p2', date: '2027-03-01', value: 'negative' }],
        homework: [{ id: 'h1', date: '2026-11-02', note: '' }, { id: 'h2', date: '2027-03-01', note: '' }] },
      { id: 'b', firstName: 'Ben', lastName: 'B', studentNotes: [], grades: [g1('1.0', '2026-10-15')], attendance: [], participation: [], homework: [] },
    ] },
  };
}
const setNow = (y, m, d) => { vi.setSystemTime(new Date(y, m - 1, d, 10, 0)); };
const avg = (range) => app(`calculateStudentAverage(db.students.g1[0], "g1"${range === undefined ? '' : `, ${range}`})`);

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  setNow(2026, 12, 15);
  app('periodChoice = null; db = migrateDB(' + JSON.stringify(sampleDB()) + ')');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});
afterEach(() => vi.useRealTimers());

describe('Zeiträume', () => {
  it('vor dem Stichtag: Standard 1. Halbjahr (ab 1. August bis Stichtag)', () => {
    expect(app('periodKey()')).toBe('h1');
    expect(app('viewPeriod()')).toEqual({ key: 'h1', from: '2026-08-01', to: HY });
    expect(app('runningHalf()').key).toBe('h1');
  });

  it('nach dem Stichtag: Standard Schuljahr (alles), laufendes Halbjahr ist das 2.', () => {
    setNow(2027, 3, 15);
    expect(app('periodKey()')).toBe('year');
    expect(app('viewPeriod()')).toBeNull();
    expect(app('runningHalf()')).toEqual({ key: 'h2', from: '2027-02-13', to: null });
  });

  it('ohne Halbjahresende oder mit einem aus dem letzten Schuljahr: keine Halbjahre, alles wie bisher', () => {
    app('delete db.settings.halfYearEnd');
    expect(app('viewPeriod()')).toBeNull();
    expect(app('runningHalf()')).toBeNull();
    app('db.settings.halfYearEnd = "2026-02-13"');   // altes Schuljahr
    expect(app('halfYearSplit()')).toBeNull();
    expect(avg()).toBeCloseTo((3.5 * 50 + 3.5 * 50) / 100);   // alle Noten wie vor Y7
  });

  it('Wahl gilt nur auf dem Gerät: nie in db', () => {
    const before = app('JSON.stringify(db)');
    app('setPeriodChoice("h2")');
    expect(app('periodKey()')).toBe('h2');
    expect(app('JSON.stringify(db)')).toBe(before);
  });
});

describe('Notenschnitt nur über calculateStudentAverage (Regel 1)', () => {
  it('1. Halbjahr, 2. Halbjahr, Schuljahr; ohne Angabe der gewählte Zeitraum', () => {
    expect(avg('periodRange("h1")')).toBeCloseTo(2.5);   // KA 2,0 und Test 3,0 → je 50 %
    expect(avg('periodRange("h2")')).toBeCloseTo(4.5);   // KA 5,0 und Test 4,0
    expect(avg('null')).toBeCloseTo(3.5);
    expect(avg()).toBeCloseTo(2.5);   // Standard vor dem Stichtag
    app('setPeriodChoice("year")');
    expect(avg()).toBeCloseTo(3.5);
  });

  it('Klassenschnitt ebenso', () => {
    expect(app('calculateGroupAverage("g1", periodRange("h1"))')).toBeCloseTo((2.5 + 1) / 2);
    expect(app('calculateGroupAverage("g1", periodRange("h2"))')).toBeCloseTo(4.5);   // Ben hat im 2. Halbjahr keine Noten
  });
});

describe('Klassenansicht', () => {
  const open = tab => { app(`openGroupStudents("g1", "${tab}")`); showGradesOnOpen(); };
  const heads = () => [...document.querySelectorAll('#overview-content thead th')].slice(2).map(th => th.textContent.replace(/\s+/g, ' ').trim());
  const sumOf = name => [...document.querySelectorAll('#overview-content tbody tr')].find(tr => tr.textContent.includes(name)).querySelector('.ov-sum-col').textContent.replace(/\s+/g, ' ').trim();

  it('Umschalter nur mit Halbjahresende sichtbar und zeigt den Zeitraum', () => {
    open('students');
    expect(document.getElementById('period-pick').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('period-select').value).toBe('h1');
    app('delete db.settings.halfYearEnd'); open('students');
    expect(document.getElementById('period-pick').classList.contains('hidden')).toBe(true);
  });

  it('Noten: nur Spalten und Schnitt des gewählten Halbjahrs', () => {
    open('grades');
    expect(heads().length).toBe(2);   // 15.10. und 10.12.
    expect(sumOf('Anna')).toBe('2,5');
    app('setPeriodChoice("h2")');
    expect(heads().length).toBe(2);   // 04.03. und 11.03.
    expect(sumOf('Anna')).toBe('4,5');
    app('setPeriodChoice("year")');
    expect(heads().length).toBe(4);
  });

  it('Fehlzeiten, Hausaufgaben, Mitarbeit: Spalten und Zusammenfassungen nach Halbjahr', () => {
    open('attendance');
    expect(sumOf('Anna')).toBe('3 / 0');
    app('setPeriodChoice("h2")');
    expect(sumOf('Anna')).toBe('1 / 1');
    app('switchClassDashboardTab("homework")');
    expect(sumOf('Anna')).toBe('1');
    app('setPeriodChoice("year")');
    expect(sumOf('Anna')).toBe('2');
    app('setPeriodChoice("h1"); switchClassDashboardTab("participation")');
    expect(heads().length).toBe(1);
  });

  it('Schülerliste: Fehlt F / E und Zahl der Noten nach Halbjahr', () => {
    open('students');
    const row = () => [...document.querySelectorAll('#students-container .student-row')].find(r => r.textContent.includes('Anna'));
    expect(row().querySelector('[data-kind="attendance"]').textContent.replace(/\s+/g, '')).toBe('Fehlt3/0');
    expect(row().querySelector('.student-quick-notes').textContent).toMatch(/^2 Noten/);
    app('setPeriodChoice("year")');
    expect(row().querySelector('.student-quick-notes').textContent).toMatch(/^4 Noten/);
  });

  it('neue Spalte für heute außerhalb des gezeigten Halbjahrs: Umschalter springt auf Schuljahr', () => {
    setNow(2027, 3, 15);
    open('attendance');
    app('setPeriodChoice("h1")');
    app('addTodayColumn()');
    expect(app('periodKey()')).toBe('year');
    expect(heads().some(h => h.includes('15.03'))).toBe(true);
  });
});

describe('Schüler-Fenster, Bericht, CSV', () => {
  it('Schüler-Fenster: Schnitt mit Zeitraum, Listen nach Halbjahr', () => {
    app('openStudentDetail("a", "g1")');
    expect(document.getElementById('grades-summary').textContent).toMatch(/2,5\s*Ø 1\. Halbjahr/);
    expect(document.querySelectorAll('#grades-list .grade-item').length).toBe(2);
    expect(document.querySelectorAll('#attendance-list .entry-item').length).toBe(3);
    expect(document.getElementById('seating-student-participation-summary').textContent).toMatch(/^Mitarbeit im 1\. Halbjahr/);
    app('closeModal("modal-seating-student")');
  });

  it('Klassen-Bericht: Spalten, Schnitte, Zählungen und Überschrift nach Halbjahr', () => {
    const d = app('classReportData(db.groups[0])');
    expect(d.period).toBe('1. Halbjahr');
    expect(d.cols.length).toBe(2);
    const anna = d.rows.find(r => r.name.startsWith('A'));
    expect(anna).toMatchObject({ f: 3, e: 0, ha: 1 });
    expect(anna.avg).toBeCloseTo(2.5);
    expect(app('classReportData(db.groups[0], null)').cols.length).toBe(4);
  });

  it('Text-Export eines Schülers bleibt vollständig, mit Schnitt je Halbjahr', () => {
    let txt = '';
    const realBlob = window.Blob, realUrl = { c: URL.createObjectURL, r: URL.revokeObjectURL };
    window.Blob = function (parts) { txt = parts.join(''); return new realBlob(parts); };
    URL.createObjectURL = () => 'blob:test'; URL.revokeObjectURL = () => {};
    try { app('profileGroupId = "g1"; currentStudentId = "a"; exportCurrentStudent()'); }
    finally { window.Blob = realBlob; URL.createObjectURL = realUrl.c; URL.revokeObjectURL = realUrl.r; }
    expect(txt).toMatch(/Schnitt aller Noten: 3,50, 1\. Halbjahr: 2,50, 2\. Halbjahr: 4,50/);
    expect((txt.match(/Klassenarbeit \| Note|Sonstige Leistung \| Note/g) || []).length).toBe(4);
  });
});

describe('Warnungen: laufendes Halbjahr (Y7)', () => {
  const warn = type => app(`collectWarnings().filter(w => w.student.id === "a" && w.type === "${type}")`);

  it('1. Halbjahr: 3 unentschuldigte → Warnung; quittiert unter dem bisherigen Namen (ältere Versionen lesen ihn)', () => {
    expect(warn('absences')[0].count).toBe(3);
    app('acknowledgeWarning("a", "absences", 3)');
    expect(app('db.acknowledgedWarnings.a_absences')).toBe(3);
    expect(warn('absences')).toEqual([]);
  });

  it('2. Halbjahr zählt neu, und ein höherer Stand aus dem 1. Halbjahr hält neue Warnungen nicht zurück', () => {
    app('db.acknowledgedWarnings.a_absences = 5');   // im 1. Halbjahr bei 5 quittiert
    setNow(2027, 3, 15);
    app('db.students.g1[0].attendance.push({ id: "x6", date: "2027-03-08", type: "abwesend" }, { id: "x7", date: "2027-03-09", type: "abwesend" })');
    expect(warn('absences')[0].count).toBe(3);
    app('acknowledgeWarning("a", "absences", 3)');
    expect(app('db.acknowledgedWarnings["a_absences_h2-2027-02-13"]')).toBe(3);
    expect(app('db.acknowledgedWarnings.a_absences')).toBe(5);
    expect(warn('absences')).toEqual([]);
  });

  it('Notenwarnung nach dem Schnitt des laufenden Halbjahrs, auch wenn die Ansicht „Schuljahr“ zeigt', () => {
    expect(warn('grade')).toEqual([]);   // 1. Halbjahr: 2,5
    setNow(2027, 3, 15);
    expect(app('periodKey()')).toBe('year');
    expect(warn('grade')[0].desc).toMatch(/4,50/);   // 2. Halbjahr: 4,5 (Schuljahr wäre 3,5)
  });

  it('Löschen eines Schülers räumt auch die Quittungen fürs 2. Halbjahr auf', () => {
    app('db.acknowledgedWarnings["a_absences_h2-2027-02-13"] = 2; db.acknowledgedWarnings["b_absences"] = 1');
    app('cleanUpDeletedStudents("g1", [db.students.g1[0]])');
    expect(app('Object.keys(db.acknowledgedWarnings)')).toEqual(['b_absences']);
  });
});
