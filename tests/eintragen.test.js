// AH24 Pakete d+e: ruhigere Notentabelle, schmalere Schülerliste, „+ Heute“ ohne Fenster, Fehlzeiten/HA per
// Antippen, Mitarbeit mit kleiner Auswahl. Entfernen per Antippen bietet „Rückgängig“ (Regel 45).
const fs = require('fs');
const path = require('path');
const { loadApp, app, showGradesOnOpen } = require('./helpers/load-app');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const st = (id, f, extra = {}) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
function sampleDB(scale) {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [], lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3d63dd', schularbeitWeight: 50, ...(scale ? { gradeScale: scale } : {}),
      attendanceEvents: [{ date: '2026-10-22', label: '' }], homeworkEvents: [{ date: '2026-10-21', label: '' }], participationEvents: [{ date: '2026-10-13', label: '' }] }],
    students: { g1: [
      st('a', 'Anna', { grades: [{ type: 'schularbeit', value: '2.0', date: '2026-10-15', note: 'KA 1' }] }),
      st('b', 'Ben', { grades: [{ type: 'schularbeit', value: '4.0', date: '2026-10-15', note: 'KA 1' }] }),
      st('c', 'Cem', { grades: [{ type: 'schularbeit', value: '5.0', date: '2026-10-15', note: 'KA 1' }] }),
    ] },
  };
}
const row = name => [...document.querySelectorAll('#overview-content tbody tr')].find(r => r.textContent.includes(name));
const toast = () => document.getElementById('toast-container').textContent;
const undo = () => [...document.querySelectorAll('.toast-undo button')].pop().click();
const stu = id => app(`db.students.g1.find(s => s.id === "${id}")`);

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); showGradesOnOpen(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 4, 10, 0));   // Mi 04.11.2026
  app('db = ' + JSON.stringify(sampleDB()));
  document.getElementById('toast-container').innerHTML = '';
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});
afterEach(() => { app('closeParticipationPicker()'); vi.useRealTimers(); });

describe('d: Notentabelle ruhig', () => {
  it('nur schwache Noten farbig: 1–3 Schriftfarbe, 4 orange, 5–6 rot mit Fläche', () => {
    app('openGroupStudents("g1", "grades")');
    const cell = name => row(name).querySelectorAll('td')[2];
    const color = name => cell(name).querySelector('input').style.color;
    expect(color('Anna')).toBe('var(--text-primary)');
    expect(color('Ben')).toBe('var(--grade-4)');
    expect(color('Cem')).toBe('var(--danger)');
    expect(cell('Cem').classList.contains('ov-grade-weak')).toBe(true);
    expect(cell('Ben').classList.contains('ov-grade-weak')).toBe(false);
    expect(row('Anna').querySelectorAll('td')[1].style.color).toBe('var(--text-primary)');   // Ø ebenso
  });
  it('Punkte-Skala: unter 5 Punkten rot, sonst Schriftfarbe', () => {
    app(`db = ${JSON.stringify(sampleDB('0-15'))}; db.students.g1[0].grades[0].value = "12"; db.students.g1[2].grades[0].value = "3"; openGroupStudents("g1", "grades")`);
    expect(row('Anna').querySelectorAll('td')[2].querySelector('input').style.color).toBe('var(--text-primary)');
    expect(row('Cem').querySelectorAll('td')[2].classList.contains('ov-grade-weak')).toBe(true);
  });
  it('Zellen ohne Kästchen, Rahmen erst beim Antippen; Schülerliste schmaler mit Streifen', () => {
    expect(CSS).toMatch(/\.overview-table \.ov-grade-input\{[^}]*background:transparent;[^}]*border-color:transparent;/);
    expect(CSS).toMatch(/\.overview-table \.ov-grade-input:focus\{[^}]*border-color:var\(--accent\);/);
    expect(CSS).toMatch(/\.overview-table td\.ov-grade-weak\{background:var\(--danger-soft\);\}/);
    expect(CSS).toMatch(/#students-container\{max-width:760px;\}/);
    expect(CSS).toMatch(/\.student-row:nth-child\(even of \.student-row\)\{background:/);
  });
});

describe('e: „+ Heute“', () => {
  it('Kopfknopf: Noten „+ Neue Spalte“ (Fenster), sonst „+ Heute“ und „Andere Spalte …“', () => {
    expect(HTML).toMatch(/id="btn-add-overview-col"[^>]*onclick="addOverviewColumn\(\)"/);
    expect(HTML).toMatch(/id="btn-add-overview-other"[^>]*onclick="openAddColumnModal\(\)"/);
    app('openGroupStudents("g1", "grades")');
    expect(document.getElementById('btn-add-overview-col').textContent).toMatch(/Neue Spalte/);
    expect(document.getElementById('btn-add-overview-other').classList.contains('hidden')).toBe(true);
    app('switchClassDashboardTab("attendance")');
    expect(document.getElementById('btn-add-overview-col').textContent).toMatch(/Heute/);
    expect(document.getElementById('btn-add-overview-other').classList.contains('hidden')).toBe(false);
  });
  it('legt die Spalte von heute ohne Fenster an; zweimal = keine Doppelte', () => {
    for (const [tab, field] of [['participation', 'participationEvents'], ['attendance', 'attendanceEvents'], ['homework', 'homeworkEvents']]) {
      app(`openGroupStudents("g1", "${tab}"); addOverviewColumn()`);
      expect(app(`db.groups[0].${field}.filter(e => e.date === "2026-11-04").length`), tab).toBe(1);
      expect(document.querySelector('#overview-content th.ov-today'), tab).not.toBeNull();
      app('addOverviewColumn()');
      expect(app(`db.groups[0].${field}.filter(e => e.date === "2026-11-04").length`), tab).toBe(1);
    }
    expect(document.getElementById('modal-add-column').classList.contains('hidden')).toBe(true);
  });
  it('am Wochenende: letzter Schultag (Regel 58)', () => {
    vi.setSystemTime(new Date(2026, 10, 7, 10, 0));   // Sa
    app('openGroupStudents("g1", "attendance"); addOverviewColumn()');
    expect(app('db.groups[0].attendanceEvents.map(e => e.date)')).toContain('2026-11-06');
  });
});

describe('e: Fehlzeiten und Hausaufgaben per Antippen', () => {
  it('Fehlzeiten: Knöpfe statt Eingabefelder, Erklärzeile; – → F → E → Z → –, Grund bleibt beim Umschalten', () => {
    app('openGroupStudents("g1", "attendance")');
    expect(document.querySelector('#overview-content tbody input')).toBeNull();
    const b = row('Ben').querySelectorAll('.ov-cycle-btn')[0];
    expect(b.getAttribute('onclick')).toContain('cycleInlineAttendance(');
    expect(b.getAttribute('aria-label')).toMatch(/Ben X.*da/);
    expect(document.querySelector('#overview-content .ov-legend').textContent).toMatch(/F.*E.*Z/);
    app('cycleInlineAttendance("b", "2026-10-22")');
    expect(stu('b').attendance.map(a => a.type)).toEqual(['abwesend']);
    app('db.students.g1[1].attendance[0].note = "krank"; cycleInlineAttendance("b", "2026-10-22")');
    expect(stu('b').attendance).toEqual([expect.objectContaining({ type: 'entschuldigt', note: 'krank' })]);
    app('cycleInlineAttendance("b", "2026-10-22")');
    expect(stu('b').attendance[0].type).toBe('zuspät');
    app('cycleInlineAttendance("b", "2026-10-22")');
    expect(stu('b').attendance).toEqual([]);
    expect(toast()).toMatch(/Rückgängig/);
    undo();
    expect(stu('b').attendance).toEqual([expect.objectContaining({ type: 'zuspät', note: 'krank' })]);
  });
  it('am Laptop: F/E/Z tippen setzt direkt, Entf löscht', () => {
    app('openGroupStudents("g1", "attendance")');
    const b = () => row('Anna').querySelectorAll('.ov-cycle-btn')[0];
    b().dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true }));
    expect(stu('a').attendance.map(a => a.type)).toEqual(['entschuldigt']);
    b().dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    expect(stu('a').attendance).toEqual([]);
  });
  it('Hausaufgaben: – → X → – mit „Rückgängig“', () => {
    app('openGroupStudents("g1", "homework")');
    expect(document.querySelector('#overview-content tbody input')).toBeNull();
    expect(row('Ben').querySelector('.ov-cycle-btn').getAttribute('onclick')).toContain('cycleInlineHomework(');
    app('cycleInlineHomework("b", "2026-10-21", "")');
    expect(stu('b').homework.length).toBe(1);
    app('cycleInlineHomework("b", "2026-10-21", "")');
    expect(stu('b').homework.length).toBe(0);
    undo();
    expect(stu('b').homework.length).toBe(1);
  });
});

describe('e: Mitarbeit mit kleiner Auswahl', () => {
  const open = (i = 0) => app(`openParticipationPicker(document.querySelectorAll("#overview-content tbody tr")[1].querySelectorAll(".ov-part-btn")[${i}], "b", "2026-10-13", "")`);
  const pop = () => document.getElementById('ov-part-pop');
  it('Antippen öffnet 😊 😐 ☹️ leer; Wahl trägt ein und schließt', () => {
    app('openGroupStudents("g1", "participation")');
    expect(row('Ben').querySelector('.ov-part-btn').getAttribute('onclick')).toContain('openParticipationPicker(this,');
    open();
    expect([...pop().querySelectorAll('button')].map(b => b.getAttribute('aria-label'))).toEqual(['gut', 'neutral', 'schlecht', 'leer']);
    pop().querySelectorAll('button')[1].click();
    expect(stu('b').participation).toEqual([expect.objectContaining({ date: '2026-10-13', value: 'neutral' })]);
    expect(pop()).toBeNull();
  });
  it('„leer“ entfernt mit „Rückgängig“; Escape und Tippen daneben schließen ohne Änderung', () => {
    app('db.students.g1[1].participation = [{ id: "p", date: "2026-10-13", label: "", value: "positive" }]; openGroupStudents("g1", "participation")');
    open();
    expect(pop().querySelector('button.on').getAttribute('aria-label')).toBe('gut');
    pop().querySelectorAll('button')[3].click();
    expect(stu('b').participation).toEqual([]);
    undo();
    expect(stu('b').participation.length).toBe(1);
    open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(pop()).toBeNull();
    open();
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(pop()).toBeNull();
    expect(stu('b').participation[0].value).toBe('positive');
  });
});
