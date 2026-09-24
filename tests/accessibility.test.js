// Barrierefreiheit (BUGS G4, G7): Zoom erlaubt, Escape schließt das oberste Fenster,
// Knöpfe ohne Text haben ein aria-label (Vorlesefunktion sagt sonst nur „Taste“).
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

function sampleDB() {
  return {
    settings: { teacherName: 'Test', school: '', blocks: null, warnAbsences: 1, warnHomework: 1, warnGrade: 0 },
    lessonSlots: [{ id: 'l1', day: 0, block: 1, part: 'full', subject: 'Mathe', room: '101', color: '#6366f1',
      groupId: 'g1', recurring: 'weekly' }],
    lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '1A', color: '#6366f1', schularbeitWeight: 50,
      seatingRows: 2, seatingCols: 2, seatingPlan: [{ studentId: 's1', x: 0, y: 0 }],
      gradeEvents: [{ date: '2026-09-17', label: 'Test', type: 'schularbeit' }],
      participationEvents: [{ date: '2026-09-17', label: '' }] }],
    students: {
      g1: [{ id: 's1', firstName: 'Anna', lastName: 'Muster', grades: [{ type: 'schularbeit', value: '2.0', date: '2026-09-17', note: 'Test' }],
        studentNotes: [{ text: 'Notiz', date: '2026-09-17' }],
        participation: [{ date: '2026-09-17', value: 'positive' }],
        attendance: [{ date: '2026-09-17', type: 'abwesend', note: '' }],
        homework: [{ id: 'x1', date: '2026-09-17', note: '' }] }],
    },
  };
}

// Name eines Knopfs für die Vorlesefunktion: Text (reine Symbole wie ✕ ‹ › zählen nicht), aria-label oder title
const SYMBOLS_ONLY = /^[\s✕×‹›←→↑↓+\-−…⋯✓✎]*$/u;
function unnamedButtons(scope = document) {
  return [...scope.querySelectorAll('button:not([aria-hidden="true"])')]
    .filter(b => !b.getAttribute('aria-label') && !b.getAttribute('title') && SYMBOLS_ONLY.test(b.textContent))
    .map(b => b.outerHTML.slice(0, 120));
}

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-21T09:00:00'));
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});
afterAll(() => vi.useRealTimers());

describe('G4: Zoomen ist erlaubt', () => {
  it('viewport sperrt Zoom nicht', () => {
    const viewport = html.match(/<meta name="viewport" content="([^"]+)"/)[1];
    expect(viewport).not.toMatch(/user-scalable\s*=\s*(no|0)/);
    expect(viewport).not.toMatch(/maximum-scale/);
  });

  it('html/body verbieten Pinch-Zoom nicht per touch-action', () => {
    const rule = css.match(/html,body\{[^}]*\}/)[0];
    expect(rule).not.toMatch(/touch-action:\s*pan-x pan-y/);
  });

  it('iOS zoomt nicht bei jedem Eingabefeld: auf Touch-Geräten mindestens 16 px', () => {
    expect(css).toMatch(/@media \(pointer: coarse\)\s*\{[^}]*input[^{]*select[^{]*textarea\s*\{\s*font-size:\s*16px/);
  });
});

describe('G7: Escape schließt das oberste Fenster', () => {
  const isOpen = id => !document.getElementById(id).classList.contains('hidden');
  const escape = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

  afterEach(() => document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden')));

  it('jedes normale Fenster schließt sich mit Escape', () => {
    const ids = [...document.querySelectorAll('.modal-overlay')].map(m => m.id)
      .filter(id => id !== 'modal-sync-conflict');
    expect(ids.length).toBeGreaterThan(10);
    ids.forEach(id => {
      app(`openModal(${JSON.stringify(id)})`);
      escape();
      expect(isOpen(id), id).toBe(false);
    });
  });

  it('bei zwei offenen Fenstern nur das obere (Stunde → „Schüler bewerten“)', () => {
    app('openLessonDetail("l1", "2026-09-21")');
    app('openQuickStudentListFromLesson()');
    expect(isOpen('modal-lesson-students')).toBe(true);
    escape();
    expect(isOpen('modal-lesson-students')).toBe(false);
    expect(isOpen('modal-lesson')).toBe(true);
    escape();
    expect(isOpen('modal-lesson')).toBe(false);
  });

  it('Notenformular aus der Schülerakte: Escape kehrt zur Schülerakte zurück', () => {
    app('currentGroupId = "g1"');
    app('openStudentDetail("s1")');
    expect(isOpen('modal-student-detail')).toBe(true);
    app('openGradeForm("s1", "g1", -1)');
    expect(isOpen('modal-student-detail')).toBe(false);
    escape();
    expect(isOpen('modal-grade-form')).toBe(false);
    expect(isOpen('modal-student-detail')).toBe(true);
  });

  it('Notenformular: Escape setzt den bearbeiteten Eintrag zurück (wie ✕)', () => {
    app('openModal("modal-grade-form")');
    app('currentGradeFormCtx = { studentId: "s1" }');
    escape();
    expect(app('currentGradeFormCtx')).toBeNull();
  });

  it('Stunden-Fenster: Escape speichert die Notizen wie „Schließen“', () => {
    app('openLessonDetail("l1", "2026-09-21")');
    expect(isOpen('modal-lesson')).toBe(true);
    document.getElementById('lesson-notes-text').value = 'Tafel kaputt';
    escape();
    expect(isOpen('modal-lesson')).toBe(false);
    expect(app('db.lessonData["l1_2026-09-21"].notes')).toBe('Tafel kaputt');
  });

  it('Sync-Konflikt bleibt offen – da muss man sich entscheiden', () => {
    app('openModal("modal-sync-conflict")');
    escape();
    expect(isOpen('modal-sync-conflict')).toBe(true);
  });

  it('ohne offenes Fenster passiert nichts', () => {
    expect(() => escape()).not.toThrow();
  });
});

describe('G7: Knöpfe ohne Text haben ein aria-label', () => {
  it('statisches Markup', () => {
    expect(unnamedButtons()).toEqual([]);
  });

  it('gerenderte Ansichten', () => {
    app('switchView("dashboard")');
    app('switchView("timetable")');
    app('switchView("classes")');
    app('openGroupStudents("g1")');
    ['grades', 'attendance', 'participation', 'homework'].forEach(t => app(`switchClassDashboardTab("${t}")`));
    app('openStudentDetail("s1")');
    app('switchView("seating")');
    app('openSettings()');
    expect(unnamedButtons()).toEqual([]);
  });
});
