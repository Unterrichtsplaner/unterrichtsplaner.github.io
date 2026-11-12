// Gesamtprüfung 11.11.2026, Paket 13 (grün): Sitzplan und Schüler-Fenster. AS7, AS8, AS9, AS10, AS11.
const { loadApp, app } = require('./helpers/load-app');

const st = (id, f, extra = {}) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null, warnGrade: 4.5,
      holidays: [{ id: 'w', label: 'Weihnachtsferien', from: '2026-12-24', until: '2027-01-08' }] },
    lessonSlots: [{ id: 'do', day: 3, block: 2, part: 'full', subject: 'Mathe', color: '#3b82f6', groupId: 'g1', recurring: 'biweekly', startDate: '2026-12-10' }],
    lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50,
      classNotes: [{ id: 'n1', text: 'Elterngespräch Familie Meier', date: '2026-12-01' }] }],
    students: { g1: [st('m', 'Max', { importantNote: 'Diabetes', notes: 'mag Fußball',
      grades: [{ type: 'mitarbeit', value: '5', date: '2026-12-01' }], studentNotes: [{ text: 'War lange auf Toilette', date: '2026-12-09' }] })] },
    todos: [{ id: 't1', text: 'Kopien für 7b', created: '2026-12-01', groupId: 'g1' }],
  };
}
const S = 'db.students.g1[0]';
beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 11, 10, 8, 0));   // Do 10.12.2026
  app('replaceDB(' + JSON.stringify(sampleDB()) + ')');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  window.confirm = () => true;
});
afterEach(() => { app('closeModal("modal-lesson"); closeModal("modal-seating-student"); closeModal("modal-add-student")'); app('switchView("dashboard")'); vi.useRealTimers(); });

describe('AS7: Stunden-Fenster aus dem Sitzplan', () => {
  const text = () => document.getElementById('modal-lesson').textContent;
  it('Klassennotizen und Merkzettel erst nach „Anzeigen“', () => {
    app('cockpitLesson = { slotId: "do", dateStr: "2026-12-10" }; openCockpitLesson()');
    expect(text()).not.toMatch(/Elterngespräch/);
    expect(text()).not.toMatch(/Kopien für 7b/);
    const btn = [...document.querySelectorAll('#modal-lesson button')].find(b => b.textContent.includes('Anzeigen'));
    btn.click();
    expect(text()).toMatch(/Elterngespräch/);
    expect(text()).toMatch(/Kopien für 7b/);
  });
  it('aus dem Stundenplan geöffnet: sofort sichtbar', () => {
    app('openLessonDetail("do", "2026-12-10")');
    expect(text()).toMatch(/Elterngespräch/);
    expect(text()).toMatch(/Kopien für 7b/);
  });
});

describe('AS8: Dashboard „Auffällig“', () => {
  it('nennt bei Noten keine Zahl, aufgeklappte Klassen klappen beim Verlassen der App zu', () => {
    app('switchView("dashboard"); renderDashboard()');
    const box = document.getElementById('view-dashboard');
    expect(box.textContent).toMatch(/Notenstand kritisch/);
    expect(box.textContent).not.toMatch(/5,0/);
    app('dashboardOpenGroups.add("g1")');
    app('onAppHidden()');
    expect(app('dashboardOpenGroups.size')).toBe(0);
  });
});

describe('AS9: „Name, Geburtstag, Hinweise ändern“', () => {
  it('Hinweisfelder verborgen, wenn im Fenster nichts eingeblendet war; Speichern behält sie', () => {
    app('openSeatingStudentModal("m", "g1", "2026-12-10")');
    app('openEditStudent()');
    expect(document.getElementById('student-hints-fields').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('student-hints-veil').textContent).toMatch(/2 Hinweise/);
    document.getElementById('new-student-first').value = 'Maximilian';
    app('saveStudent()');
    expect(app(`${S}.importantNote`)).toBe('Diabetes');
    expect(app(`${S}.firstName`)).toBe('Maximilian');
  });
  it('„Anzeigen“ zeigt die Felder', () => {
    app('openSeatingStudentModal("m", "g1", "2026-12-10")');
    app('openEditStudent()');
    document.querySelector('#student-hints-veil button').click();
    expect(document.getElementById('student-hints-fields').classList.contains('hidden')).toBe(false);
  });
  it('war im Fenster eingeblendet: Felder sofort sichtbar', () => {
    app('openSeatingStudentModal("m", "g1", "2026-12-10"); setSeatingStudentShown(true)');
    app('openEditStudent()');
    expect(document.getElementById('student-hints-fields').classList.contains('hidden')).toBe(false);
  });
});

describe('AS10: Änderungen unter „Mehr“ erscheinen oben', () => {
  it('Fehlzeit unter „Mehr“ gelöscht: „Fehlt“ ist oben nicht mehr gedrückt', () => {
    app(`${S}.attendance.push({ id: 'f1', date: '2026-12-10', type: 'abwesend' })`);
    app('openSeatingStudentModal("m", "g1", "2026-12-10", { more: true })');
    expect(document.getElementById('sw-today').textContent).toMatch(/Fehlt/);
    app(`deleteAttendance(${S}.attendance[0])`);
    expect(document.getElementById('sw-today').textContent).not.toMatch(/Fehlt/);
  });
  it('Notiz gelöscht: Sitzplan-Karte neu gezeichnet', () => {
    app('openSeatingStudentModal("m", "g1", "2026-12-10", { more: true })');
    const spy = vi.fn();
    app('globalThis.__rsv = refreshStudentViews'); globalThis.__spy = spy;
    app('refreshStudentViews = g => globalThis.__spy(g)');
    try { app(`deleteStudentNote(${S}.studentNotes[0])`); } finally { app('refreshStudentViews = globalThis.__rsv'); }
    expect(spy).toHaveBeenCalledWith('g1');
  });
});

describe('AS11: Fehl-Hinweis über die Ferien', () => {
  it('Entschuldigen entfernt den Hinweis auch 6 Wochen später', () => {
    app(`${S}.attendance.push({ id: 'f1', date: '2026-12-10', type: 'abwesend' }); addAbsenceNote("g1", "2026-12-10", ${S})`);
    expect(app('db.lessonData["do_2027-01-21"].notes')).toMatch(/Max X hat letzte Stunde/);
    app('openSeatingStudentModal("m", "g1", "2026-12-10", { fixedDate: true }); setSeatingAbsence("entschuldigt")');
    expect(app('db.lessonData["do_2027-01-21"].notes')).toBe('');
  });
});
