// F1: Nutzerdaten (auch aus Import/Sync) dürfen weder HTML einschleusen noch onclick-Handler zerbrechen.
const { loadApp, app, showGradesOnOpen } = require('./helpers/load-app');

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
    lessonData: { [`${slot}_2026-09-21`]: { notes: X, done: X, hwEnabled: true, hwText: X, testEnabled: true, testText: X, hwItems: [{ id: 'h1', text: X, targetDate: '2026-09-21' }], testItems: [{ id: 't1', text: X, targetDate: '2026-09-21' }] } },
    groups: [{
      id: g, subject: X, className: X, year: X, color: `red"><img data-xss src=x>`, schularbeitWeight: 50,
      plan: [{ id: ID('t'), title: X, note: X, lessons: 2 }],
      classNotes: [{ id: ID('n'), text: X, date: '2026-09-20', until: '2026-09-30' }, { id: ID('n2'), text: X, until: X }], // AD15, auch kaputtes Datum
      seatingRows: 2, seatingCols: 2, seatingPlan: [{ studentId: s, x: 0, y: 0, row: 0, col: 0 }],
      gradeEvents: [{ date: '2026-09-01', label: X, type: 'test' }],
      participationEvents: [{ date: '2026-09-02', label: X }],
      attendanceEvents: [{ date: '2026-09-03', label: X }],
      homeworkEvents: [{ date: '2026-09-04', label: X }],
    }],
    students: {
      [g]: [{
        id: s, firstName: X, lastName: X, notes: X, importantNote: X, birthday: '2010-09-21', // Hinweis + Geburtstag (AD2/AD6)
        grades: [{ type: 'test', value: X, date: '2026-09-01', note: X }, { type: X, value: '2', date: '2026-09-02', note: X }], // präparierter Typ: BUGS Q1
        attendance: [{ id: ID('a'), date: '2026-09-03', type: 'absent', note: X }],
        participation: [{ id: ID('p'), date: '2026-09-02', value: X, label: X }, { id: ID('p2'), date: '2026-09-21', value: X }],
        homework: [{ id: ID('h'), date: '2026-09-04', note: X }],
        studentNotes: [{ text: X, date: '2026-09-05' }],
      }],
    },
    acknowledgedWarnings: {},
    todos: [{ id: ID('todo'), text: X, created: '2026-09-20', groupId: g, due: '2026-09-21' }, { id: ID('todo2'), text: X, done: true, due: X }], // AH18
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
  loadApp(); showGradesOnOpen();
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
    merkzettel: () => app('switchView("todos")'),   // AH18
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
    'sitzplan schüler hinweis': () => app(`openSeatingStudentModal(${S}, ${G}, "2026-09-21"); renderSeatingStudentHint(true)`),
    'sitzplan cockpit + verlauf': () => {
      app(`switchView("seating"); currentSeatingGroupId = ${G}; currentSeatingDateStr = "2026-09-21"; seatingShowTrend = true; renderSeatingPlan()`);
      expect(document.getElementById('seating-cockpit').classList.contains('hidden')).toBe(false); // Cockpit wirklich gezeichnet
      app('seatingShowTrend = false');
    },
    'planung (klassenansicht)': () => app(`openGroupStudents(${G}); switchClassDashboardTab("plan")`),
    'schülerapp (klassenansicht, einstellungen, beamer)': () => {   // AJ1
      app('SyncManager.isInitialized = true; SyncManager.currentUser = { uid: "u1" }');
      app(`db.settings.studentApp = { on: true, name: ${JSON.stringify(X)} }; setStudentAppOn(${G}, true); setStudentAppGoal(${G}, { target: 10, reward: ${JSON.stringify(X)} })`);
      app(`openGroupStudents(${G}, "studentapp")`);
      expect(document.querySelector('#overview-content .sa-qr svg')).not.toBeNull();   // Reiter wirklich gezeichnet
      expect(injected()).toBe(0); expect(brokenHandlers()).toEqual([]);
      app(`showStudentAppBeamer(${G})`);
      expect(injected()).toBe(0);
      app('closeModal("modal-studentapp-beamer"); openSettings(); showSettingsPane("studentapp")');
      expect(document.getElementById('settings-studentapp-classes').querySelector('.sa-class-row')).not.toBeNull();
      expect(injected()).toBe(0); expect(brokenHandlers()).toEqual([]);
      // Der Auszug selbst geht verschlüsselt raus; escapen muss die Schülerseite (tests/schuelerseite.test.js)
      app('closeModal("modal-settings"); SyncManager.isInitialized = false; SyncManager.currentUser = null');
    },
    'neues schuljahr (alle schritte, vorlagen)': () => {   // Y6
      app('exportData = () => {}; openNewYear()');
      document.getElementById('ny-backup').click(); document.getElementById('ny-next').click();
      expect(document.querySelectorAll('#ny-body .ny-row').length).toBeGreaterThan(0);   // Klassen wirklich gezeichnet
      expect(injected()).toBe(0); expect(brokenHandlers()).toEqual([]);
      document.getElementById('ny-next').click();
      expect(injected()).toBe(0);
      app('newYearState = null; closeModal("modal-new-year")');
      app(`db.planTemplates = [{ id: ${JSON.stringify(X)}, name: ${JSON.stringify(X)}, year: ${JSON.stringify(X)}, topics: [{ id: "t", title: ${JSON.stringify(X)} }] }]`);
      app('openSettings(); showSettingsPane("data")');
      expect(document.getElementById('plan-templates-list').children.length).toBe(1);
      expect(injected()).toBe(0); expect(brokenHandlers()).toEqual([]);
      app('closeModal("modal-settings")');
    },
    'planung thema-fenster': () => app(`openPlanTopicForm(${G}, db.groups[0].plan[0])`),
    'stundenplan klasse': () => {
      app(`switchView("timetable"); timetableClassGroupId = ${G}; setTimetableMode("class")`);
      expect(document.querySelectorAll('.ttc-row').length).toBeGreaterThan(0);   // Klassenliste wirklich gezeichnet
      expect(injected()).toBe(0); expect(brokenHandlers()).toEqual([]);
      app('setTimetableMode("week")');
    },
    'stundenplan tag (thema in kachel)': () => {
      app(`switchView("timetable"); setTimetableMode("day"); setTimetableDay(parseDate("2026-09-21")); renderTimetable()`);
      expect(document.querySelector('.tt-lesson-topic')).not.toBeNull();
      expect(injected()).toBe(0); expect(brokenHandlers()).toEqual([]);
      app('setTimetableMode("week")');
    },
    'stunde mit geplantem thema': () => app(`openLessonDetail(${JSON.stringify(ID('slot'))}, "2026-09-21"); renderLessonPlanBox(db.lessonSlots[0], "2026-09-21")`),
    'sitzplan heute-fenster': () => app(`switchView("seating"); currentSeatingGroupId = ${G}; currentSeatingDateStr = "2026-09-21"; renderSeatingPlan(); openSeatingToday()`),
    'klassennotizen (liste, dashboard, stunde)': () => {
      app('switchView("classes")');
      expect(document.querySelector('.cr-notes')).not.toBeNull();   // Notizen wirklich gezeichnet
      expect(injected()).toBe(0); expect(brokenHandlers()).toEqual([]);
      app(`openLessonDetail(${JSON.stringify(ID('slot'))}, "2026-09-21")`);
      expect(document.getElementById('lesson-class-notes').classList.contains('hidden')).toBe(false);
      expect(injected()).toBe(0); expect(brokenHandlers()).toEqual([]);
      app('closeModal("modal-lesson")');
    },
    'klassennotizen-fenster': () => {
      app(`db.groups.push({ id: 'g-andere', className: '8a', subject: 'D', classNotes: [{ id: 'z', text: ${JSON.stringify(X)} }] }); openClassNotes(${G})`);
      expect(document.querySelectorAll('#class-notes-list .cn-item').length).toBe(2);
      expect(document.querySelectorAll('.cn-suggest').length).toBe(0);   // gleicher Text schon da
      app('closeModal("modal-class-notes"); db.groups.pop()');
    },
    'schnellsuche (zuletzt + treffer)': () => {   // AH19
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));   // Suche öffnet nie über einem anderen Fenster
      app(`openGroupStudents(${G}); openStudentDetail(${S}); closeModal("modal-seating-student"); openSearch()`);
      expect(document.querySelectorAll('#search-results .search-main').length).toBeGreaterThan(2);   // Zuletzt + Springen gezeichnet
      expect(injected()).toBe(0); expect(brokenHandlers()).toEqual([]);
      const inp = document.getElementById('search-input');
      inp.value = 'peter'; inp.dispatchEvent(new Event('input'));
      expect(document.querySelectorAll('#search-results .search-sec').length).toBe(3);   // Klassen, Schüler, Merkzettel/Notizen/Planung
      expect(injected()).toBe(0); expect(brokenHandlers()).toEqual([]);
      app('closeModal("modal-search")');
    },
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
