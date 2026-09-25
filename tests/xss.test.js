// F1: Nutzerdaten (auch aus Import/Sync) dürfen weder HTML einschleusen noch onclick-Handler zerbrechen.
const { loadApp, app } = require('./helpers/load-app');

// Harmlos aussehender Apostroph + Anführungszeichen + eingeschleustes Element
const X = `Peter's "Test" <img data-xss src=x>`;
// IDs kommen normalerweise aus uid(), über eine importierte Datei aber auch beliebig
const ID = (s) => `${s}'"<i data-xss>`;

function evilDB() {
  const g = ID('g'), s = ID('s'), slot = ID('slot');
  return {
    settings: { teacherName: X, school: X, blocks: [{ num: 1, label: X, start: '08:00', end: '09:30' }] },
    lessonSlots: [
      { id: slot, day: 0, block: 1, subject: X, room: X, groupId: g, recurring: 'weekly', color: `red"><img data-xss src=x>` },
    ],
    lessonData: { [`${slot}_2026-09-21`]: { notes: X, hwEnabled: true, hwText: X, testEnabled: true, testText: X } },
    groups: [{
      id: g, subject: X, className: X, year: X, color: `red"><img data-xss src=x>`, schularbeitWeight: 50,
      seatingRows: 2, seatingCols: 2, seatingPlan: [{ studentId: s, x: 0, y: 0, row: 0, col: 0 }],
      gradeEvents: [{ date: '2026-09-01', label: X, type: 'test' }],
      participationEvents: [{ date: '2026-09-02', label: X }],
      attendanceEvents: [{ date: '2026-09-03', label: X }],
      homeworkEvents: [{ date: '2026-09-04', label: X }],
    }],
    students: {
      [g]: [{
        id: s, firstName: X, lastName: X,
        grades: [{ type: 'test', value: X, date: '2026-09-01', note: X }],
        attendance: [{ id: ID('a'), date: '2026-09-03', type: 'absent', note: X }],
        participation: [{ id: ID('p'), date: '2026-09-02', value: X, label: X }, { id: ID('p2'), date: '2026-09-21', value: X }],
        homework: [{ id: ID('h'), date: '2026-09-04', note: X }],
        studentNotes: [{ text: X, date: '2026-09-05' }],
      }],
    },
    acknowledgedWarnings: {},
  };
}

const G = JSON.stringify(ID('g'));
const S = JSON.stringify(ID('s'));

// Jeder Inline-Handler im aktuellen Dokument muss sich als JavaScript übersetzen lassen
function brokenHandlers() {
  const bad = [];
  document.querySelectorAll('*').forEach(el => {
    [...el.attributes].filter(a => a.name.startsWith('on')).forEach(a => {
      try { new Function('event', a.value); } catch (e) { bad.push(`${el.tagName} ${a.name}="${a.value}"`); }
    });
  });
  return bad;
}
// Gefundene Elemente entfernen, damit der nächste Fall nur seine eigenen zählt
const injected = () => { const l = [...document.querySelectorAll('[data-xss]')]; l.forEach(e => e.remove()); return l.length; };

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-21T08:30:00')); // Montag, 1. Stunde
  window.confirm = vi.fn(() => false);
  localStorage.setItem('lehrerapp_v3', JSON.stringify(evilDB()));
  loadApp();
});
afterAll(() => vi.useRealTimers());

describe('escHtml', () => {
  it('escaped auch Anführungszeichen, damit Attribute dicht bleiben', () => {
    expect(app('escHtml')(`a'b"c<d>&`)).toBe('a&#39;b&quot;c&lt;d&gt;&amp;');
  });
  it('lässt Zahlen stehen und macht aus null/undefined einen Leerstring', () => {
    expect(app('escHtml')(0)).toBe('0');
    expect(app('escHtml')(null)).toBe('');
    expect(app('escHtml')(undefined)).toBe('');
  });
});

describe('Ansichten mit präparierten Daten', () => {
  const views = {
    dashboard: () => app('switchView("dashboard")'),
    stundenplan: () => app('switchView("timetable")'),
    klassen: () => app('switchView("classes")'),
    schuelerliste: () => app(`openGroupStudents(${G})`),
    'schülerliste bearbeiten': () => app(`openGroupStudents(${G}); isStudentEditMode = true; renderStudents(); isStudentEditMode = false`),
    'übersicht noten': () => app(`openGroupStudents(${G}); switchOverviewTab("grades")`),
    'übersicht mitarbeit': () => app(`openGroupStudents(${G}); switchOverviewTab("participation")`),
    'übersicht anwesenheit': () => app(`openGroupStudents(${G}); switchOverviewTab("attendance")`),
    'übersicht hausaufgaben': () => app(`openGroupStudents(${G}); switchOverviewTab("homework")`),
    schuelerakte: () => app(`openGroupStudents(${G}); openStudentDetail(${S})`),
    stunde: () => app(`openLessonDetail(${JSON.stringify(ID('slot'))}, "2026-09-21")`),
    sitzplan: () => app(`switchView("seating"); currentSeatingGroupId = ${G}; currentSeatingDateStr = "2026-09-21"; renderSeatingPlan()`),
    'sitzplan schüler': () => app(`openSeatingStudentModal(${S}, ${G}, "2026-09-21"); revealSeatingStudentGrades()`),
    einstellungen: () => app('openSettings()'),
  };

  it.each(Object.keys(views))('%s: kein eingeschleustes HTML, alle Handler intakt', (name) => {
    views[name]();
    expect(injected()).toBe(0);
    expect(brokenHandlers()).toEqual([]);
  });

  it('Klick auf Spaltenkopf mit Apostroph öffnet die richtige Spalte', () => {
    app(`openGroupStudents(${G}); switchOverviewTab("grades")`);
    const th = [...document.querySelectorAll('#overview-content th[onclick]')].find(t => t.getAttribute('onclick').includes('openEditColumnModal'));
    const spy = vi.fn();
    new Function('openEditColumnModal', 'event', th.getAttribute('onclick'))(spy, {});
    expect(spy).toHaveBeenCalledWith('2026-09-01', X, 'test', 0);
  });
});
