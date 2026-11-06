// AH51: Klassenlehrer/in als Dauerinfo. Nur der Name, nie im Sitzplan. Dieselbe Klasse in zwei Fächern muss man nur einmal eintragen.
const { loadApp, app } = require('./helpers/load-app');

const st = (id, f) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] });
const grp = (id, c, subj, extra = {}) => ({ id, className: c, subject: subj, year: '2026/27', color: '#3b82f6', schularbeitWeight: 50, ...extra });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null, lastBackupTimestamp: 1 },
    lessonSlots: [{ id: 'a', day: 3, block: 1, part: 'full', subject: 'Mathe', room: 'R1', color: '#3b82f6', groupId: 'g1', recurring: 'weekly' }],
    lessonData: {}, supervisions: [],
    groups: [grp('g1', '7b', 'Mathe'), grp('g2', '7b', 'Physik'), grp('g3', '7b', 'Kunst', { year: '2025/26' }), grp('g4', '8a', 'Mathe')],
    students: { g1: [st('s1', 'Anna')], g2: [], g3: [], g4: [] },
  };
}
const $ = id => document.getElementById(id);
const g = id => app(`db.groups.find(x => x.id === "${id}")`);
const edit = (id, name) => { app(`openEditGroup("${id}")`); $('new-group-teacher').value = name; app('saveSubjectGroup()'); };

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  app('db = ' + JSON.stringify(sampleDB()));
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});

describe('Eintragen', () => {
  it('Feld im Klassen-Formular; gespeichert ohne Leerzeichen, leer wird nicht gespeichert', () => {
    edit('g1', '  Frau Meier ');
    expect(g('g1').classTeacher).toBe('Frau Meier');
    edit('g1', '');
    expect('classTeacher' in g('g1')).toBe(false);
  });
  it('Bearbeiten zeigt den gespeicherten Namen, Altdaten ein leeres Feld', () => {
    app('db.groups[0].classTeacher = "Frau Meier"; openEditGroup("g1")');
    expect($('new-group-teacher').value).toBe('Frau Meier');
    app('closeModal("modal-add-group"); openEditGroup("g4")');
    expect($('new-group-teacher').value).toBe('');
  });
  it('dieselbe Klasse im selben Schuljahr bekommt den Namen mit, wenn sie noch keinen hat', () => {
    app('db.groups[3].classTeacher = "Herr Alt"');
    edit('g1', 'Frau Meier');
    expect(g('g2').classTeacher).toBe('Frau Meier');   // 7b Physik
    expect(g('g3').classTeacher).toBeUndefined();      // 7b im letzten Schuljahr
    expect(g('g4').classTeacher).toBe('Herr Alt');     // andere Klasse
  });
  it('ein schon eingetragener anderer Name bleibt stehen', () => {
    app('db.groups[1].classTeacher = "Herr Alt"');
    edit('g1', 'Frau Meier');
    expect(g('g2').classTeacher).toBe('Herr Alt');
  });
  it('Leeren löscht nur bei dieser Klasse', () => {
    edit('g1', 'Frau Meier');
    edit('g1', '');
    expect(g('g1').classTeacher).toBeUndefined();
    expect(g('g2').classTeacher).toBe('Frau Meier');
  });
  it('neues Fach in derselben Klasse übernimmt den Namen, auch ohne Eingabe', () => {
    edit('g1', 'Frau Meier');
    app('openAddSubjectGroup()');
    $('new-group-class').value = '7b'; $('new-group-subject').value = 'Musik'; $('new-group-year').value = '2026/27';
    expect($('new-group-teacher').value).toBe('');
    app('saveSubjectGroup()');
    expect(app('db.groups.find(x => x.subject === "Musik")').classTeacher).toBe('Frau Meier');
  });
});

describe('Anzeigen', () => {
  beforeEach(() => app('db.groups[0].classTeacher = "Frau <b>Meier</b>"'));
  it('Klassenkopf', () => {
    app('openGroupStudents("g1")');
    expect($('student-view-subtitle').textContent).toBe('Mathe · 2026/27 · KL Frau <b>Meier</b>');
  });
  it('ohne Namen bleibt alles wie bisher', () => {
    app('openGroupStudents("g4")');
    expect($('student-view-subtitle').textContent).toBe('Mathe · 2026/27');
  });
  it('Klassenkarte in allen drei Ansichten, als Text', () => {
    for (const v of ['tiles', 'list', 'large']) {
      app(`setClassesView("${v}"); switchView("classes")`);
      const card = [...document.querySelectorAll('.class-row')].find(r => r.textContent.includes('Frau <b>Meier</b>'));
      expect(card, v).toBeTruthy();
      expect(card.querySelector('.cr-meta b b, small b'), v).toBeNull();
    }
    app('setClassesView("tiles")');
  });
  it('Stunden-Fenster', () => {
    app('openLessonDetail("a", "2026-11-05")');
    expect($('lesson-modal-subtitle').textContent).toContain('KL Frau <b>Meier</b>');
    app('closeModal("modal-lesson")');
  });
  it('nicht im Sitzplan', () => {
    app('openSeatingForGroup("g1"); switchView("seating")');
    expect($('view-seating').textContent).not.toContain('Meier');
  });
});

describe('Abgleich', () => {
  it('zwei verschiedene Namen: Frage mit lesbarem Feldnamen', () => {
    const base = sampleDB(), l = sampleDB(), c = sampleDB();
    l.groups[0].classTeacher = 'Frau Meier'; c.groups[0].classTeacher = 'Herr Alt';
    const r = app(`mergeDB(${JSON.stringify(base)}, ${JSON.stringify(l)}, ${JSON.stringify(c)})`);
    const qs = JSON.stringify(r.conflicts);
    expect(qs).toContain('Klassenlehrer');
    expect(qs).not.toContain('classTeacher"');
  });
  it('nur eine Seite ändert: wird still übernommen', () => {
    const base = sampleDB(), l = sampleDB(), c = sampleDB();
    c.groups[0].classTeacher = 'Herr Alt';
    const r = app(`mergeDB(${JSON.stringify(base)}, ${JSON.stringify(l)}, ${JSON.stringify(c)})`);
    expect(r.conflicts).toEqual([]);
    expect(r.merged.groups[0].classTeacher).toBe('Herr Alt');
  });
});
