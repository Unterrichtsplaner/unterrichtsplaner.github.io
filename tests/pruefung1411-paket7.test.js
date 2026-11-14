// Gesamtprüfung 14.11.2026, Paket 7: Rest. BA1, BA4, BA5.
const { loadApp, app } = require('./helpers/load-app');

const st = (id, f, l = 'X', grades = []) => ({ id, firstName: f, lastName: l, grades, attendance: [], participation: [], homework: [], studentNotes: [] });
function sampleDB(x = {}) {
  return {
    settings: { teacherName: 'T', blocks: null, warnGrade: 4.5, warnAbsences: 3, ...(x.settings || {}) },
    lessonSlots: [], lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '8b', color: '#3b82f6', schularbeitWeight: 50 },
             { id: 'g2', subject: 'Physik', className: '8b', color: '#22c55e', schularbeitWeight: 50 }],
    students: { g1: x.g1 || [st('s1', 'Lisa', 'L')], g2: x.g2 || [] },
    acknowledgedWarnings: x.ack || {},
  };
}
const day = (y, m, d) => vi.setSystemTime(new Date(y, m - 1, d, 10, 0));
const load = d => app('replaceDB(migrateDB(' + JSON.stringify(d) + ')); periodChoice = null');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); day(2026, 11, 20); document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden')); });
afterEach(() => { app('switchView("dashboard")'); vi.useRealTimers(); });

describe('BA1: CSV und Excel runden wie App und PDF', () => {
  // KA 1, sonstige 2,7 und 4 → (1 + 3,35) / 2 = 2,175
  const grades = [{ type: 'schularbeit', value: '1', date: '2026-11-02', note: 'KA' }, { type: 'mitarbeit', value: '2.7', date: '2026-11-03', note: '' },
    { type: 'mitarbeit', value: '4', date: '2026-11-04', note: '' }];
  let exported;
  beforeEach(() => {
    exported = null;
    const RealBlob = globalThis.Blob;
    globalThis.Blob = class extends RealBlob { constructor(parts, opts) { super(parts, opts); exported = parts.join(''); } };
    URL.createObjectURL = () => 'blob:test';
    URL.revokeObjectURL = () => {};
    HTMLAnchorElement.prototype.click = () => {};
    return () => { globalThis.Blob = RealBlob; };
  });
  it('2,175 wird überall 2,18', () => {
    load(sampleDB({ g1: [st('s1', 'Lisa', 'L', grades)] }));
    expect(app('calculateStudentAverage(db.students.g1[0], "g1")')).toBeCloseTo(2.175, 6);
    app('switchView("classes"); openGroupStudents("g1")');
    app('exportGradesCSVFile()');
    expect(exported).toMatch(/;"2,18"\n/);
    const xml = app('classReportSheetXML(db.groups[0])');
    expect(xml).toMatch(/<v>2\.18<\/v>/);
    expect(xml).not.toMatch(/<v>2\.17<\/v>/);
  });
  it('Text-Noten in Excel mit Komma wie im PDF', () => {
    expect(app('gradeCellValue("2.5-")')).toBe('2,5-');
    expect(app('gradeCellValue("2.5")')).toBe(2.5);
    expect(app('gradeCellValue("+")')).toBe('+');
  });
});

describe('BA4: Klasse kopieren erkennt Altdaten mit dem Namen im Nachnamen', () => {
  it('„Lena“ im Nachnamen und „Lena“ im Vornamen sind dieselbe', () => {
    load(sampleDB({ g1: [st('a', '', 'Lena'), st('b', 'Tom', '')], g2: [st('c', 'Lena', ''), st('d', 'Jonas', '')] }));
    app('switchView("classes"); openGroupStudents("g2")');
    const sel = document.getElementById('import-from-group');
    if (![...sel.options].some(o => o.value === 'g1')) sel.add(new Option('8b Mathe', 'g1'));
    sel.value = 'g1';
    const cb = document.getElementById('import-skip-duplicates'); if (cb) cb.checked = true;
    app('importStudentsFromGroup()');
    expect(app('db.students.g2.map(s => (s.firstName + " " + s.lastName).trim()).sort()')).toEqual(['Jonas', 'Lena', 'Tom']);
  });
});

describe('BA5: Quittungen ohne Datum gelten nicht für immer', () => {
  const absent = dates => dates.map((x, i) => ({ id: 'f' + x + i, date: x, type: 'abwesend' }));
  const types = () => app('collectWarnings().map(w => w.type)');
  it('im Schuljahr 2026/27 gilt die alte Quittung, im nächsten nicht mehr', () => {
    const base = app('warningAckBase')('s1', 'absences');
    const d = sampleDB({ settings: { halfYearEnd: '2027-02-12' }, ack: { [base]: 5 } });
    d.students.g1[0].attendance = absent(['2026-11-02', '2026-11-03', '2026-11-04']);
    load(d);
    expect(types()).not.toContain('absences');   // alte Quittung (5) gilt in 2026/27 weiter
    day(2027, 10, 20);
    const d2 = sampleDB({ settings: { halfYearEnd: '2028-02-11' }, ack: { [base]: 5 } });
    d2.students.g1[0].attendance = absent(['2027-10-04', '2027-10-11', '2027-10-18']);
    load(d2);
    expect(app('warningAckBase')('s1', 'absences')).toBe(base);   // derselbe Schlüssel im 1. Halbjahr
    expect(types()).toContain('absences');
  });
});
