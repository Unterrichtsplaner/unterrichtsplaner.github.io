// AH28 Fehler: „Zum Profil“ im Sitzplan verließ den Sitzplan (sprang in die Klassenansicht) und öffnete das Profil auf
// „Noten“ – am Beamer standen dann alle Noten offen (Regel 16). Jetzt: Profil über der aktuellen Ansicht, nie auf „Noten“.
const { loadApp, app } = require('./helpers/load-app');

const st = (id, f, extra = {}) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [], lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50 },
      { id: 'g2', subject: 'Mathe', className: '5a', color: '#22c55e', schularbeitWeight: 50 }],
    students: { g1: [st('a', 'Anna', { grades: [{ type: 'schularbeit', value: '5.0', date: '2026-10-15', note: 'KA 1' }] })], g2: [st('b', 'Ben')] },
  };
}
const activeView = () => document.querySelector('.view.active').id;
const activeTab = () => document.querySelector('#modal-student-detail .tab-btn.active').textContent.trim();
const hidden = id => document.getElementById(id).classList.contains('hidden');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 4, 10, 0));
  app('db = ' + JSON.stringify(sampleDB()));
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});
afterEach(() => vi.useRealTimers());

describe('AH28: „Zum Profil“ aus dem Sitzplan', () => {
  it('bleibt im Sitzplan, Profil darüber, nicht auf „Noten“', () => {
    app('switchView("classes"); openGroupStudents("g2"); openSeatingForGroup("g1")');
    expect(activeView()).toBe('view-seating');
    app('openSeatingStudentModal("a", "g1", "2026-11-04"); jumpToStudentDetailFromSeating()');
    expect(activeView()).toBe('view-seating');
    expect(hidden('modal-seating-student')).toBe(true);
    expect(hidden('modal-student-detail')).toBe(false);
    expect(document.getElementById('sdetail-name').textContent).toBe('Anna X');
    expect(activeTab()).not.toMatch(/Noten/);
    expect(document.getElementById('student-tab-grades').classList.contains('hidden')).toBe(true);
    app('closeModal("modal-student-detail")');
    expect(activeView()).toBe('view-seating');
  });
  it('Eintrag im Profil zeigt sich sofort im Sitzplan', () => {
    app('openSeatingForGroup("g1"); openSeatingStudentModal("a", "g1", "2026-11-04"); jumpToStudentDetailFromSeating()');
    app('getCurrentStudent().attendance.push({ id: "f1", date: "2026-11-04", type: "abwesend", note: "" }); refreshStudentViews("g1")');
    expect(app('db.students.g1[0].attendance.length')).toBe(1);
    app('closeModal("modal-student-detail")');
  });
  it('aus der Klassenansicht mit sichtbaren Noten: wie bisher auf „Noten“', () => {
    app('openGroupStudents("g1", "grades"); toggleClassGrades(); openSeatingStudentModal("a", "g1", "2026-11-04"); jumpToStudentDetailFromSeating()');
    expect(activeView()).toBe('view-students');
    expect(activeTab()).toMatch(/Noten/);
    app('closeModal("modal-student-detail")');
  });
});
