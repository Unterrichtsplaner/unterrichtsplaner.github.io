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

describe('AH28: „Mehr zu …“ statt „Zum Profil“', () => {
  it('Sitzplan bleibt, alles im selben Fenster, verborgen (Beamer) – kein Sprung in die Klassenansicht', () => {
    app('switchView("classes"); openGroupStudents("g2"); openSeatingForGroup("g1")');
    app('openSeatingStudentModal("a", "g1", "2026-11-04"); jumpToStudentDetailFromSeating()');
    expect(activeView()).toBe('view-seating');
    expect(hidden('modal-seating-student')).toBe(false);
    expect(document.getElementById('seating-student-title').textContent).toBe('Anna X');
    expect(document.getElementById('sw-more').hidden).toBe(false);
    expect(document.getElementById('sw-more').classList.contains('is-veiled')).toBe(true);
    expect(app('currentGroupId')).toBe('g2');   // Klassenansicht dahinter bleibt bei ihrer Klasse
    app('closeModal("modal-seating-student")');
    expect(activeView()).toBe('view-seating');
  });
  it('Eintrag unter „Mehr“ zeigt sich sofort im Sitzplan; gehört zur Klasse des Fensters', () => {
    app('switchView("classes"); openGroupStudents("g2"); openSeatingForGroup("g1"); openSeatingStudentModal("a", "g1", "2026-11-04"); jumpToStudentDetailFromSeating()');
    expect(app('getCurrentStudent().id')).toBe('a');
    document.getElementById('new-att-date').value = '2026-11-03';
    app('addAttendanceEntry()');
    expect(app('db.students.g1[0].attendance.length')).toBe(1);
    expect(app('db.students.g2[0].attendance.length')).toBe(0);
    app('closeModal("modal-seating-student")');
  });
  it('aus der Klassenansicht mit sichtbaren Noten: offen und bei „Noten“', () => {
    app('openGroupStudents("g1", "grades"); toggleClassGrades(); openStudentDetail("a", "grades")');
    expect(activeView()).toBe('view-students');
    expect(document.getElementById('sw-more').classList.contains('is-veiled')).toBe(false);
    expect(document.getElementById('sw-more').dataset.focus).toBe('grades');
    app('closeModal("modal-seating-student")');
  });
  it('Bearbeiten aus dem Fenster einer anderen Klasse ändert den richtigen Schüler', () => {
    app('openGroupStudents("g2"); openSeatingForGroup("g1"); openSeatingStudentModal("a", "g1", "2026-11-04"); seatingMenuAction("edit")');
    document.getElementById('new-student-first').value = 'Annika';
    app('saveStudent()');
    expect(app('db.students.g1[0].firstName')).toBe('Annika');
    expect(app('db.students.g2[0].firstName')).toBe('Ben');
  });
});
