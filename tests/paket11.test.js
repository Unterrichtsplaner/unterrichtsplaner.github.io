// Gesamtprüfung 11.11.2026, Paket 11 (grün): Noten und Klassenansicht. AR5, AR6, AR7, AR9, AR10, AR11, AR12, AR13.
const { loadApp, app, showGradesOnOpen } = require('./helpers/load-app');

const st = (id, f, extra = {}) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
function sampleDB(settings = {}) {
  return {
    settings: { teacherName: 'T', blocks: null, ...settings },
    lessonSlots: [], lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50 },
             { id: 'g2', subject: 'Bio', className: '5a', color: '#22c55e', schularbeitWeight: 50 }],
    students: { g1: [st('a', 'Anna', { grades: [{ type: 'mitarbeit', value: '2', date: '2026-11-02', note: 'Vokabeltest' }] }), st('b', 'Ben')],
                g2: [st('c', 'Cem', { grades: [{ type: 'mitarbeit', value: '3', date: '2026-11-02', note: 'Zellbau' }] })] },
  };
}
const S = id => `Object.values(db.students).flat().find(x => x.id === "${id}")`;
const load = (s = {}) => app('replaceDB(' + JSON.stringify(sampleDB(s)) + '); periodChoice = null');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 14, 10, 0));   // Sa 14.11.2026
  load();
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
  window.confirm = () => true;
  if (app('typeof choiceResolve === "function"')) app('answerChoice(null)');
});
afterEach(() => { app('switchView("dashboard")'); vi.useRealTimers(); });

describe('AR5: Neue Spalte am Wochenende', () => {
  it('schlägt den letzten Schultag vor', () => {
    app('switchView("classes"); openGroupStudents("g1"); switchClassDashboardTab("grades"); openAddColumnModal()');
    expect(document.getElementById('new-col-date').value).toBe('2026-11-13');
  });
});

describe('AR6: Notenformular aus dem Schüler-Fenster', () => {
  it('nimmt den Tag des Fensters', () => {
    app('openSeatingStudentModal("a", "g1", "2026-11-10")');
    app('openGradeFormForCurrentStudentDetailed()');
    expect(document.getElementById('gf-date').value).toBe('2026-11-10');
  });
});

describe('AR7: Eintrag außerhalb des gezeigten Halbjahrs', () => {
  it('schnelle Note im 2. Halbjahr, Anzeige 1. Halbjahr: Zeitraum springt um', () => {
    vi.setSystemTime(new Date(2027, 2, 1, 10, 0));
    load({ halfYearEnd: '2027-02-12' });
    app('setPeriodChoice("h1")');
    app('openSeatingStudentModal("a", "g1", "2027-03-01")');
    app('giveQuickGrade("2")');
    expect(app('periodKey()')).not.toBe('h1');
  });
  it('Fehlzeit unter „Mehr“ ebenso', () => {
    vi.setSystemTime(new Date(2027, 2, 1, 10, 0));
    load({ halfYearEnd: '2027-02-12' });
    app('setPeriodChoice("h1")');
    app('openSeatingStudentModal("a", "g1", "2027-03-01", { more: true })');
    document.getElementById('new-att-date').value = '2027-03-01';
    app('addAttendanceEntry()');
    expect(app('periodKey()')).not.toBe('h1');
  });
});

describe('AR9: Text-Noten', () => {
  it('„n. b.“ bleibt „n. b.“, Zahlen bekommen ein Komma', () => {
    expect(app('gradeText("n. b.")')).toBe('n. b.');
    expect(app('gradeText("2.5")')).toBe('2,5');
    expect(app('gradeText("2.5-")')).toBe('2,5-');
    expect(app('gradeText("+")')).toBe('+');
  });
});

describe('AR10: Titel-Vorschläge der schnellen Note', () => {
  it('kommen aus der Klasse des Schülers', () => {
    app('openGradeForm("c", "g2", -1)'); app('closeGradeForm(); closeModal("modal-grade-form")');   // Liste zeigt jetzt Bio
    app('openSeatingStudentModal("b", "g1", "2026-11-13"); openSeatingGradePad(true)');
    const opts = [...document.querySelectorAll('#gf-column-titles option')].map(o => o.value);
    expect(opts).toEqual(['Vokabeltest']);
  });
});

describe('AR11: Klasse umbenannt', () => {
  it('Leiste zeigt den neuen Namen im Schnellzugriff', () => {
    load({ quickLinks: [{ id: 'q', groupId: 'g1', target: 'seating' }] });
    app('openEditGroup("g1")');
    document.getElementById('new-group-class').value = '7c';
    app('saveSubjectGroup()');
    expect(document.querySelector('.nav-items').textContent).toMatch(/7c/);
  });
});

describe('AR12: Löschen im Fenster „Klasse bearbeiten“, dann Abbrechen', () => {
  it('Fenster bleibt offen', () => {
    app('openEditGroup("g1")');
    window.confirm = () => false;
    document.getElementById('btn-delete-group').click();
    expect(document.getElementById('modal-add-group').classList.contains('hidden')).toBe(false);
    expect(app('db.groups.length')).toBe(2);
  });
});

describe('AR13: Reiter Schülerapp, obwohl sie aus ist', () => {
  it('merkt sich „Schüler“ und zeigt den Knopf „Noten zeigen“', () => {
    app('switchView("classes"); openGroupStudents("g1"); switchClassDashboardTab("studentapp")');
    expect(app('currentClassDashboardTab')).toBe('students');
    expect(document.getElementById('overview-tab-students').classList.contains('active')).toBe(true);
  });
});

describe('AR8: Gewichtung 0 % bzw. 100 %', () => {
  it('100 %: nur Klassenarbeiten zählen, vorher „–“', () => {
    app('db.groups[0].schularbeitWeight = 100');
    expect(app(`calculateStudentAverage(${S('a')}, "g1")`)).toBeNull();
    app(`${S('a')}.grades.push({ type: 'schularbeit', value: '4', date: '2026-11-05' })`);
    expect(app(`calculateStudentAverage(${S('a')}, "g1")`)).toBe(4);
  });
  it('0 %: Klassenarbeiten zählen nie', () => {
    app('db.groups[0].schularbeitWeight = 0');
    app(`${S('a')}.grades = [{ type: 'schularbeit', value: '5', date: '2026-11-05' }]`);
    expect(app(`calculateStudentAverage(${S('a')}, "g1")`)).toBeNull();
  });
  it('dazwischen wie bisher: fehlt eine Art, gilt die andere', () => {
    app('db.groups[0].schularbeitWeight = 70');
    expect(app(`calculateStudentAverage(${S('a')}, "g1")`)).toBe(2);
  });
});
