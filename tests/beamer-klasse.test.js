// AH24 Paket c: Beamer-Schutz in der Klassenansicht. Schnitte, Noten-Tabelle und Mitarbeit erscheinen nur auf
// Knopfdruck – wie im Sitzplan (Regel 16, 67). Der Zustand wird nie gespeichert und fällt beim Öffnen einer Klasse,
// beim Verlassen der Klassenansicht und beim Verlassen der App weg.
const { loadApp, app } = require('./helpers/load-app');

const st = (id, f, extra = {}) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [], lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3d63dd', schularbeitWeight: 50 }],
    students: { g1: [
      st('a', 'Anna', { grades: [{ type: 'schularbeit', value: '5.0', date: '2026-10-15', note: 'KA 1' }],
        participation: [{ id: 'p1', date: '2026-10-13', value: 'negative' }], attendance: [{ id: 'f1', date: '2026-10-16', type: 'abwesend', note: '' }] }),
      st('b', 'Ben'),
    ] },
  };
}
const btn = () => document.getElementById('btn-class-grades');
const shown = () => app('classGradesShown');
const studentsBox = () => document.getElementById('students-container');
const overview = () => document.getElementById('overview-content');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 4, 10, 0));
  app('db = ' + JSON.stringify(sampleDB()));
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});
afterEach(() => vi.useRealTimers());

describe('Reiter Schüler', () => {
  it('beim Öffnen verborgen: kein Schnitt, keine Mitarbeit; Fehlzeiten bleiben; Hinweis mit „Anzeigen“', () => {
    app('openGroupStudents("g1", "students")');
    expect(shown()).toBe(false);
    expect(studentsBox().querySelector('.student-grade-badge')).toBeNull();
    expect(studentsBox().querySelector('.student-counter[data-kind="participation"]')).toBeNull();
    expect(studentsBox().querySelector('.student-counter[data-kind="attendance"]')).not.toBeNull();
    expect(studentsBox().textContent).not.toMatch(/5,0/);
    const veil = studentsBox().querySelector('.grades-veil');
    expect(veil.textContent).toMatch(/verborgen/);
    expect(btn().classList.contains('hidden')).toBe(false);
    expect(btn().getAttribute('aria-pressed')).toBe('false');
    expect(btn().getAttribute('onclick')).toBe('toggleClassGrades()');
  });
  it('„Anzeigen“ im Hinweis zeigt Schnitt und Mitarbeit; Kopfknopf schaltet zurück', () => {
    app('openGroupStudents("g1", "students")');
    studentsBox().querySelector('.grades-veil button').click();
    expect(shown()).toBe(true);
    expect(studentsBox().querySelector('.student-grade-badge').textContent).toBe('5,0');
    expect(studentsBox().querySelector('.student-counter[data-kind="participation"]')).not.toBeNull();
    expect(studentsBox().querySelector('.grades-veil')).toBeNull();
    expect(btn().getAttribute('aria-pressed')).toBe('true');
    app('toggleClassGrades()');
    expect(studentsBox().querySelector('.student-grade-badge')).toBeNull();
  });
  it('Zeile antippen öffnet das Schüler-Fenster verborgen nicht auf „Noten“, sichtbar schon (AH28: ein „Anzeigen“)', () => {
    app('openGroupStudents("g1", "students")');
    studentsBox().querySelector('.student-row').click();
    const more = () => document.getElementById('sw-more');
    expect(more().hidden).toBe(false);
    expect(more().classList.contains('is-veiled')).toBe(true);
    expect(more().dataset.focus).not.toBe('grades');
    app('closeModal("modal-seating-student"); toggleClassGrades()');
    studentsBox().querySelector('.student-row').click();
    expect(more().classList.contains('is-veiled')).toBe(false);
    expect(more().dataset.focus).toBe('grades');
    app('closeModal("modal-seating-student")');
  });
});

describe('Reiter Noten und Mitarbeit', () => {
  it('verborgen: statt Tabelle ein Hinweis mit Knopf; keine Note und kein Smiley im Bild; „Neue Spalte“ aus', () => {
    app('openGroupStudents("g1", "grades")');
    expect(overview().querySelector('table')).toBeNull();
    expect(overview().textContent).not.toMatch(/5,0/);
    expect(overview().querySelector('.grades-veil button')).not.toBeNull();
    expect(document.getElementById('btn-add-overview-col').classList.contains('hidden')).toBe(true);
    app('switchClassDashboardTab("participation")');
    expect(overview().querySelector('.ov-part-btn')).toBeNull();
    expect(overview().querySelector('.grades-veil')).not.toBeNull();
  });
  it('„Anzeigen“ zeigt die Tabelle; bleibt beim Reiterwechsel innerhalb der Klasse sichtbar', () => {
    app('openGroupStudents("g1", "grades")');
    overview().querySelector('.grades-veil button').click();
    expect(overview().querySelector('table')).not.toBeNull();
    expect(document.getElementById('btn-add-overview-col').classList.contains('hidden')).toBe(false);
    app('switchClassDashboardTab("participation")');
    expect(overview().querySelector('.ov-part-btn')).not.toBeNull();
    app('switchClassDashboardTab("students")');
    expect(studentsBox().querySelector('.student-grade-badge')).not.toBeNull();
  });
});

describe('Andere Reiter und Zurücksetzen', () => {
  it('Fehlzeiten, Hausaufgaben, Planung: unverändert sichtbar, Knopf ausgeblendet', () => {
    for (const tab of ['attendance', 'homework', 'plan']) {
      app(`openGroupStudents("g1", "${tab}")`);
      expect(overview().querySelector('.grades-veil'), tab).toBeNull();
      expect(btn().classList.contains('hidden'), tab).toBe(true);
    }
  });
  it('wieder verborgen: neue Klasse öffnen, Klassenansicht verlassen, App verlassen; nie gespeichert', () => {
    app('openGroupStudents("g1", "students"); toggleClassGrades()');
    expect(shown()).toBe(true);
    expect(JSON.stringify(app('db'))).not.toMatch(/classGradesShown|gradesShown/);
    app('openGroupStudents("g1", "students")');
    expect(shown()).toBe(false);
    app('toggleClassGrades(); switchView("dashboard")');
    expect(shown()).toBe(false);
    app('openGroupStudents("g1", "students"); toggleClassGrades(); onAppHidden()');
    expect(shown()).toBe(false);
    expect(studentsBox().querySelector('.student-grade-badge')).toBeNull();   // sofort neu gezeichnet
  });
  it('Schnellsuche öffnet ein Schülerprofil nicht auf „Noten“', () => {
    app('openSearch()');
    const inp = document.getElementById('search-input');
    inp.value = 'anna'; inp.dispatchEvent(new Event('input'));
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(document.getElementById('modal-seating-student').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('sw-more').classList.contains('is-veiled')).toBe(true);
    expect(document.getElementById('sw-more').dataset.focus).not.toBe('grades');
    app('closeModal("modal-seating-student")');
  });
});

describe('Einstellung: Beamer-Schutz abschalten', () => {
  const box = () => document.getElementById('settings-class-grades-protect');
  it('Standard an (nicht gespeichert); aus: alles sofort sichtbar, kein Knopf, kein Hinweis', () => {
    app('openSettings()');
    expect(box().checked).toBe(true);
    box().checked = false;
    app('saveSettings()');
    expect(app('db.settings.classGradesProtect')).toBe(false);
    app('openGroupStudents("g1", "students")');
    expect(shown()).toBe(true);
    expect(studentsBox().querySelector('.grades-veil')).toBeNull();
    expect(studentsBox().querySelector('.student-grade-badge').textContent).toBe('5,0');
    expect(btn().classList.contains('hidden')).toBe(true);
    app('switchClassDashboardTab("grades")');
    expect(overview().querySelector('table')).not.toBeNull();
    app('onAppHidden(); switchView("dashboard"); openGroupStudents("g1", "participation")');
    expect(overview().querySelector('.ov-part-btn')).not.toBeNull();
  });
  it('wieder an: Speichern verbirgt sofort, Standard wird nicht gespeichert', () => {
    app('db.settings.classGradesProtect = false; openGroupStudents("g1", "students"); openSettings()');
    expect(box().checked).toBe(false);
    box().checked = true;
    app('saveSettings()');
    expect('classGradesProtect' in app('db.settings')).toBe(false);
    expect(studentsBox().querySelector('.grades-veil')).not.toBeNull();
  });
});
