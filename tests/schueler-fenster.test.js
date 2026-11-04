// AH28 Schritt 1: Schüler-Fenster (Sitzplan, Stunde, Klasse) kompakt – oben was man im Unterricht braucht, Note mit
// drei Tipps (Schüler → „Note geben“ → Zahl), Seltenes unter „Mehr zu …“.
const { loadApp, app } = require('./helpers/load-app');

const st = (id, f, extra = {}) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [], lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50 },
      { id: 'q1', subject: 'Mathe', className: 'Q1', color: '#22c55e', schularbeitWeight: 50, gradeScale: '0-15' }],
    students: {
      g1: [st('a', 'Anna', { grades: [{ type: 'schularbeit', value: '5.0', date: '2026-10-15', note: 'KA 1' }], notes: 'mag Fußball' }), st('b', 'Ben')],
      q1: [st('c', 'Cem')],
    },
  };
}
const M = () => document.getElementById('modal-seating-student');
const q = sel => M().querySelector(sel);
const pad = () => document.getElementById('sw-grade-pad');
const toast = () => document.getElementById('toast-container').textContent;
const stu = (g, id) => app(`db.students.${g}.find(s => s.id === "${id}")`);
const openAnna = () => app('openSeatingStudentModal("a", "g1", "2026-11-04")');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 4, 10, 0));
  localStorage.removeItem('quick_grade_type');
  app('db = ' + JSON.stringify(sampleDB()));
  document.getElementById('toast-container').innerHTML = '';
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});
afterEach(() => vi.useRealTimers());

describe('kompakt', () => {
  it('Kopf: Name, Klasse · Fach · Tag; kein „Zum Profil“ mehr oben', () => {
    openAnna();
    expect(document.getElementById('seating-student-title').textContent).toBe('Anna X');
    expect(document.getElementById('seating-student-sub').textContent).toMatch(/7b · Mathe · Mi\.?,? 04\.11\./);
    expect(M().querySelector('.modal-header').textContent).not.toMatch(/Zum Profil/);
  });
  it('oben: drei Gesichter und vier gleich ruhige Knöpfe (keine Farben inline)', () => {
    openAnna();
    expect([...M().querySelectorAll('.sw-faces [data-action]')].map(b => b.dataset.action)).toEqual(['positive', 'neutral', 'negative']);
    const seg = [...M().querySelectorAll('.sw-seg [data-action]')];
    expect(seg.map(b => b.textContent.trim())).toEqual(['Fehlt', 'Entschuldigt', 'Zu spät', 'HA fehlt']);
    expect(seg.map(b => b.dataset.action)).toEqual(['abwesend', 'entschuldigt', 'zuspät', 'homework']);
    expect(seg.every(b => !b.getAttribute('style'))).toBe(true);
  });
  it('Hinweise, Noten und Mitarbeit-Bilanz erst unter „Mehr zu Anna“ (zu); Aufklappen zeigt sie', () => {
    openAnna();
    const more = document.getElementById('sw-more');
    expect(more.hidden).toBe(true);
    for (const id of ['seating-student-hint', 'grades-list', 'participation-list', 'attendance-list', 'student-homework-list', 'student-notes-list', 'seating-student-participation-summary'])
      expect(more.contains(document.getElementById(id)), id).toBe(true);
    const btn = document.getElementById('sw-more-btn');
    expect(btn.textContent).toMatch(/Mehr zu Anna/);
    btn.click();
    expect(more.hidden).toBe(false);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    app('closeModal("modal-seating-student"); openSeatingStudentModal("b", "g1", "2026-11-04")');
    expect(document.getElementById('sw-more').hidden).toBe(true);   // jedes Öffnen wieder zu
  });
});

describe('Note geben', () => {
  it('„Note geben“ öffnet die Tafel: Art-Chips, 1+ … 6− (18 Knöpfe); keine vorhandene Note sichtbar', () => {
    openAnna();
    expect(pad()).toBeNull();
    q('#sw-grade-btn').click();
    expect(pad()).not.toBeNull();
    expect([...pad().querySelectorAll('.sw-chips [data-type]')].map(b => b.dataset.type)).toEqual(['muendlich', 'test', 'mitarbeit', 'projekt', 'sonstig']);
    expect(pad().querySelector('.sw-chips .on').dataset.type).toBe('muendlich');
    const vals = [...pad().querySelectorAll('.sw-grid [data-val]')].map(b => b.dataset.val);
    expect(vals.length).toBe(18);
    expect(vals.slice(0, 3)).toEqual(['1+', '2+', '3+']);
    expect(vals).toContain('2-');
    expect(pad().textContent).not.toMatch(/5,0/);
  });
  it('Zahl antippen = gespeichert (Tag des Fensters, gewählte Art), Fenster zu, Hinweis mit Zahl und „Rückgängig“', () => {
    openAnna();
    q('#sw-grade-btn').click();
    pad().querySelector('[data-val="2-"]').click();
    expect(stu('g1', 'a').grades).toContainEqual({ type: 'muendlich', value: '2-', date: '2026-11-04', note: '' });
    expect(M().classList.contains('hidden')).toBe(true);
    expect(toast()).toMatch(/Anna X: 2- \(Mündlich\)/);
    [...document.querySelectorAll('.toast-undo button')].pop().click();
    expect(stu('g1', 'a').grades.length).toBe(1);
  });
  it('Art merken je Klasse (nur auf dem Gerät); Titel wahlweise', () => {
    openAnna();
    q('#sw-grade-btn').click();
    pad().querySelector('[data-type="test"]').click();
    expect(pad().querySelector('.sw-chips .on').dataset.type).toBe('test');
    pad().querySelector('#sw-grade-title-btn').click();
    const title = pad().querySelector('#sw-grade-title');
    title.value = 'Vokabeltest';
    pad().querySelector('[data-val="1"]').click();
    expect(stu('g1', 'a').grades).toContainEqual({ type: 'test', value: '1.0', date: '2026-11-04', note: 'Vokabeltest' });
    expect(JSON.stringify(app('db'))).not.toMatch(/quick_grade_type/);
    app('openSeatingStudentModal("b", "g1", "2026-11-04")');
    q('#sw-grade-btn').click();
    expect(pad().querySelector('.sw-chips .on').dataset.type).toBe('test');
    expect(pad().querySelector('#sw-grade-title')).toBeNull();   // Titel gilt nur einmal
  });
  it('Punkte-Klasse: 0 … 15, keine Tendenzen', () => {
    app('openSeatingStudentModal("c", "q1", "2026-11-04")');
    q('#sw-grade-btn').click();
    const vals = [...pad().querySelectorAll('.sw-grid [data-val]')].map(b => b.dataset.val);
    expect(vals.length).toBe(16);
    expect(vals).toContain('15');
    expect(vals.some(v => /[+-]/.test(v))).toBe(false);
    pad().querySelector('[data-val="11"]').click();
    expect(stu('q1', 'c').grades[0]).toEqual(expect.objectContaining({ value: '11', type: 'muendlich' }));
  });
  it('Abbrechen klappt die Tafel zu, nichts gespeichert', () => {
    openAnna();
    q('#sw-grade-btn').click();
    pad().querySelector('.sw-pad-cancel').click();
    expect(pad()).toBeNull();
    expect(stu('g1', 'a').grades.length).toBe(1);
  });
});

describe('AH28 Schritt 2: „Mehr zu …“ ersetzt das Profil', () => {
  it('ein Fenster für alles: das alte Profil-Fenster gibt es nicht mehr; Profil = Fenster mit „Mehr“ offen', () => {
    expect(document.getElementById('modal-student-detail')).toBeNull();
    app('openGroupStudents("g1"); openStudentDetail("a")');
    expect(M().classList.contains('hidden')).toBe(false);
    expect(document.getElementById('sw-more').hidden).toBe(false);
    expect(document.getElementById('seating-student-sub').textContent).toMatch(/7b · Mathe · Mi\.?,? 04\.11\./);
    app('closeModal("modal-seating-student")');
  });
  it('Abschnitte untereinander, ohne Reiter; Noten, Mitarbeit, Notizen, Hinweise privat; ein „Anzeigen“', () => {
    openAnna();
    const secs = [...document.querySelectorAll('#sw-more .sw-sec')].map(s => s.id.replace('sw-sec-', ''));
    expect(secs).toEqual(['grades', 'participation', 'attendance', 'homework', 'notes', 'hints']);
    expect([...document.querySelectorAll('#sw-more [data-private]')].map(s => s.id.replace('sw-sec-', ''))).toEqual(['grades', 'participation', 'notes', 'hints']);
    expect(M().querySelectorAll('.tab-btn').length).toBe(0);
    expect(M().querySelectorAll('#sw-reveal').length).toBe(1);
    q('#sw-more-btn').click();
    q('#sw-reveal').click();
    expect(document.getElementById('sw-more').classList.contains('is-veiled')).toBe(false);
  });
  it('Hinweis zum Lesen, nicht als offenes Feld', () => {
    openAnna();
    expect(document.querySelector('#seating-student-hint .sw-hint').textContent).toContain('mag Fußball');
    expect(document.querySelector('#seating-student-hint textarea')).toBeNull();
  });
  it('„…“: Ändern, Export, Löschen im Menü; Löschen fragt und schließt', () => {
    openAnna();
    const menu = document.getElementById('sw-menu');
    expect(menu.hidden).toBe(true);
    q('#sw-menu-btn').click();
    expect(menu.hidden).toBe(false);
    expect([...menu.querySelectorAll('[data-menu]')].map(b => b.dataset.menu)).toEqual(['edit', 'export', 'delete']);
    window.confirm = () => true;
    menu.querySelector('[data-menu="delete"]').click();
    expect(app('db.students.g1.map(s => s.id)')).toEqual(['b']);
    expect(M().classList.contains('hidden')).toBe(true);
  });
  it('Notenformular aus dem Fenster: danach wieder offen, „Mehr“ und „Anzeigen“ wie vorher', () => {
    openAnna();
    q('#sw-more-btn').click();
    q('#sw-reveal').click();
    q('#sw-grade-form-btn').click();
    expect(document.getElementById('modal-grade-form').classList.contains('hidden')).toBe(false);
    app('cancelGradeForm()');
    expect(M().classList.contains('hidden')).toBe(false);
    expect(document.getElementById('sw-more').hidden).toBe(false);
    expect(document.getElementById('sw-more').classList.contains('is-veiled')).toBe(false);
    app('closeModal("modal-seating-student")');
  });
});
