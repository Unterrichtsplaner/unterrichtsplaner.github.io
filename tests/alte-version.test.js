// Zweites Gerät mit alter App-Version (v278, letzter Live-Stand vor AD/AE): Es holt Daten aus der Cloud,
// die die neue Version geschrieben hat, der Nutzer ändert dort etwas, und das Gerät speichert/lädt hoch.
// Die neuen Felder (Klassennotizen, Planung, Hinweise, Geburtstage, Halbjahr …) dürfen dabei nicht verloren gehen.
// Die alte app.js/index.html kommen aus der Git-Geschichte; ohne Git (z. B. ZIP-Download) wird übersprungen.
const { execSync } = require('child_process');
const vm = require('vm');
const { app } = require('./helpers/load-app');

const OLD = '196d3d9';   // v278
let oldApp = null, oldHtml = null;
try {
  oldApp = execSync(`git show ${OLD}:app.js`, { cwd: __dirname, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 20e6 });
  oldHtml = execSync(`git show ${OLD}:index.html`, { cwd: __dirname, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 20e6 });
} catch (e) { /* kein Git */ }

const st = (id, n, extra = {}) => ({ id, firstName: n, lastName: 'X', grades: [{ type: 'test', value: '2.0', date: '2026-10-12', note: 'Test 1' }],
  attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
// So schreibt die neue Version (v322) die Daten
function newDB() {
  return {
    settings: { teacherName: 'T', blocks: null, lastModified: 1000, halfYearEnd: '2027-01-29', schoolYearEnd: '2027-07-23',
      seatingStartInLesson: false, seatingAutoSwitch: false, federalState: 'DE-BY',
      holidays: [{ id: 'h', label: 'Herbstferien', from: '2026-11-02', until: '2026-11-06', source: 'DE-BY' }] },
    lessonSlots: [{ id: 'mo', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#3d63dd', groupId: 'g1', recurring: 'weekly' }],
    lessonData: { 'mo_2026-11-09': { notes: 'alt', done: '' } },
    groups: [{ id: 'g1', subject: 'Mathe', className: '7a', color: '#3d63dd', schularbeitWeight: 50,
      plan: [{ id: 't1', title: 'Brüche', lessons: 2, doneLessons: ['mo_2026-11-09'] }],
      classNotes: [{ id: 'n1', text: 'schon unterrichtet', date: '2026-11-02' }, { id: 'n2', text: 'Klassenfahrt', date: '2026-11-02', until: '2026-11-13' }] }],
    students: { g1: [st('a', 'Anna', { notes: 'hörgeschädigt: vorne sitzen', birthday: '2013-11-02' }), st('b', 'Ben')] },
    supervisions: [],
    syncSettings: { lastSyncedCloudTimestamp: 1000, syncedLocalModified: 1000 },
  };
}
const saved = () => JSON.parse(localStorage.getItem('lehrerapp_v3'));
function expectNewFieldsKept(d) {
  expect(d.groups[0].classNotes.map(n => n.text)).toEqual(['schon unterrichtet', 'Klassenfahrt']);
  expect(d.groups[0].classNotes[1].until).toBe('2026-11-13');
  expect(d.groups[0].plan).toEqual([{ id: 't1', title: 'Brüche', lessons: 2, doneLessons: ['mo_2026-11-09'] }]);
  const anna = d.students.g1.find(s => s.id === 'a');
  expect(anna.birthday).toBe('2013-11-02');
  expect(anna.notes).toBe('hörgeschädigt: vorne sitzen');
  expect(d.settings).toMatchObject({ halfYearEnd: '2027-01-29', schoolYearEnd: '2027-07-23', seatingStartInLesson: false, seatingAutoSwitch: false });
}

(oldApp ? describe : describe.skip)('alte App-Version (v278) mit Daten der neuen', () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 9, 10, 0));   // Mo 09.11.2026
    document.body.innerHTML = oldHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
    localStorage.setItem('lehrerapp_v3', JSON.stringify(newDB()));
    vm.runInThisContext(oldApp, { filename: 'app-v278.js' });
    window.confirm = () => true;
  });
  afterAll(() => vi.useRealTimers());

  it('lädt ohne Fehler und zeigt alle Ansichten', () => {
    expect(app('db.groups[0].className')).toBe('7a');
    for (const v of ['dashboard', 'timetable', 'classes', 'seating']) expect(() => app(`switchView("${v}")`)).not.toThrow();
    expect(() => app('openGroupStudents("g1")')).not.toThrow();
  });

  it('Note eintragen, Schüler und Klasse bearbeiten, Stunde ändern: neue Felder bleiben erhalten', () => {
    // Note per Tabelle/Formular (hier direkt) + saveDB
    app('db.students.g1[1].grades.push({ type: "oral", value: "3.0", date: "2026-11-09", note: "" }); saveDB()');
    // Schüler „Anna“ umbenennen (altes Formular)
    app('openGroupStudents("g1"); openStudentDetail("a"); openEditStudent()');
    expect(document.getElementById('new-student-notes').value).toBe('hörgeschädigt: vorne sitzen');
    document.getElementById('new-student-first').value = 'Anna-Lena';
    app('saveStudent()');
    // Klasse umbenennen (altes Formular)
    app('openEditGroup("g1")');
    document.getElementById('new-group-class').value = '7c';
    app('saveSubjectGroup()');
    // Stunde öffnen, Notiz ändern, speichern
    app('openLessonDetail("mo", "2026-11-09")');
    document.getElementById('lesson-notes-text').value = 'neu';
    app('saveLessonDataAndClose()');

    const d = saved();
    expect(d.students.g1.find(s => s.id === 'a').firstName).toBe('Anna-Lena');
    expect(d.groups[0].className).toBe('7c');
    expect(d.lessonData['mo_2026-11-09'].notes).toBe('neu');
    expect(d.students.g1[1].grades).toHaveLength(2);
    expectNewFieldsKept(d);
  });

  it('Einstellungen speichern lässt Halbjahr, Schuljahresende und Sitzplan-Schalter stehen', () => {
    app('openSettings()');
    app('saveSettings()');
    expectNewFieldsKept(saved());
  });

  it('auch was in die Cloud ginge (dieselbe db) enthält alles', () => {
    expectNewFieldsKept(JSON.parse(JSON.stringify(app('db'))));
  });
});
