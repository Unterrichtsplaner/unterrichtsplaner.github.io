// AH28 Schritt 3: Notenrunde im Sitzplan – Werkzeug „Noten geben“: Karte antippen → Zahl antippen → nächste Karte.
// Leiste über dem Raster mit Art, Anzahl und „Fertig“. Zustand nie gespeichert.
const { loadApp, app } = require('./helpers/load-app');

const MON = '2026-11-02';
const st = (id, f, extra = {}) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [], lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7a', color: '#6366f1', schularbeitWeight: 50 },
      { id: 'q1', subject: 'Mathe', className: 'Q1', color: '#22c55e', schularbeitWeight: 50, gradeScale: '0-15' }],
    students: { g1: [st('a', 'Anna'), st('b', 'Ben')], q1: [st('c', 'Cem')] },
  };
}
const bar = () => document.getElementById('grade-round-bar');
const pop = () => document.getElementById('grade-round-pop');
const card = id => [...document.querySelectorAll('.seating-card')].find(c => c.textContent.includes({ a: 'Anna', b: 'Ben', c: 'Cem' }[id]));
const stu = (g, id) => app(`db.students.${g}.find(s => s.id === "${id}")`);
const toast = () => document.getElementById('toast-container').textContent;

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 2, 10, 0));
  localStorage.removeItem('quick_grade_type');
  app('db = ' + JSON.stringify(sampleDB()));
  document.getElementById('toast-container').innerHTML = '';
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  app(`seatingRequest = { groupId: "g1", dateStr: "${MON}" }; switchView("seating")`);
});
afterEach(() => { app('endGradeRound()'); vi.useRealTimers(); });

describe('Notenrunde', () => {
  it('Werkzeug in der Leiste; Start zeigt die Leiste mit Art, Anzahl, „Fertig“', () => {
    const btn = document.getElementById('btn-seating-round');
    expect(btn.getAttribute('aria-label')).toMatch(/Noten geben/);
    expect(btn.getAttribute('onclick')).toBe('toggleGradeRound()');
    expect(bar().classList.contains('hidden')).toBe(true);
    app('toggleGradeRound()');
    expect(bar().classList.contains('hidden')).toBe(false);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(bar().querySelector('select').value).toBe('muendlich');
    expect(bar().textContent).toMatch(/0 Noten/);
    expect(bar().querySelector('.grade-round-done')).not.toBeNull();
  });
  it('Karte antippen öffnet die Tafel an der Karte (nicht das Fenster); Zahl = gespeichert, Häkchen, Hinweis mit Zahl', () => {
    app('toggleGradeRound()');
    card('a').click();
    expect(document.getElementById('modal-seating-student').classList.contains('hidden')).toBe(true);
    expect(pop()).not.toBeNull();
    expect(pop().textContent).toMatch(/Anna X/);
    pop().querySelector('[data-val="2-"]').click();
    expect(stu('g1', 'a').grades).toEqual([{ type: 'muendlich', value: '2-', date: MON, note: '' }]);
    expect(pop()).toBeNull();
    expect(card('a').classList.contains('sc-graded')).toBe(true);
    expect(card('b').classList.contains('sc-graded')).toBe(false);
    expect(bar().textContent).toMatch(/1 Note\b/);
    expect(toast()).toMatch(/Anna X: 2- \(Mündlich\)/);
    [...document.querySelectorAll('.toast-undo button')].pop().click();
    expect(stu('g1', 'a').grades).toEqual([]);
    expect(card('a').classList.contains('sc-graded')).toBe(false);
    expect(bar().textContent).toMatch(/0 Noten/);
  });
  it('Art in der Leiste wählen gilt für die nächsten Noten und wird gemerkt', () => {
    app('toggleGradeRound()');
    const sel = bar().querySelector('select');
    sel.value = 'test'; sel.dispatchEvent(new Event('change'));
    card('b').click();
    pop().querySelector('[data-val="1"]').click();
    expect(stu('g1', 'b').grades[0]).toEqual(expect.objectContaining({ type: 'test', value: '1.0' }));
    expect(app('quickGradeType("g1")')).toBe('test');
  });
  it('Tippen daneben schließt die Tafel ohne Note; „Fertig“ beendet, Karte öffnet wieder das Fenster', () => {
    app('toggleGradeRound()');
    card('a').click();
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(pop()).toBeNull();
    expect(stu('g1', 'a').grades).toEqual([]);
    bar().querySelector('.grade-round-done').click();
    expect(bar().classList.contains('hidden')).toBe(true);
    card('a').click();
    expect(document.getElementById('modal-seating-student').classList.contains('hidden')).toBe(false);
    app('closeModal("modal-seating-student")');
  });
  it('endet beim Verlassen des Sitzplans und beim Klassenwechsel; nie gespeichert', () => {
    app('toggleGradeRound()');
    expect(JSON.stringify(app('db'))).not.toMatch(/gradeRound/);
    app('switchView("dashboard")');
    expect(app('gradeRound')).toBeNull();
    app(`seatingRequest = { groupId: "g1", dateStr: "${MON}" }; switchView("seating"); toggleGradeRound(); openSeatingForGroup("q1")`);
    expect(app('gradeRound')).toBeNull();
    expect(bar().classList.contains('hidden')).toBe(true);
  });
  it('Punkte-Klasse: 0 … 15', () => {
    app(`openSeatingForGroup("q1", "${MON}"); toggleGradeRound()`);
    card('c').click();
    expect(pop().querySelectorAll('[data-val]').length).toBe(16);
    pop().querySelector('[data-val="12"]').click();
    expect(stu('q1', 'c').grades[0].value).toBe('12');
  });
  it('beendet den Bearbeiten-Modus, damit Antippen nicht verschiebt', () => {
    app('toggleSeatingEditMode()');
    expect(app('seatingEditMode')).toBe(true);
    app('toggleGradeRound()');
    expect(app('seatingEditMode')).toBe(false);
  });
});

describe('Notenrunde: Hinweise stapeln sich nicht', () => {
  it('nur der letzte Hinweis bleibt stehen', () => {
    app('toggleGradeRound()');
    card('a').click(); pop().querySelector('[data-val="2"]').click();
    card('b').click(); pop().querySelector('[data-val="3"]').click();
    expect(document.querySelectorAll('#toast-container .toast-undo').length).toBe(1);
    expect(toast()).toMatch(/Ben X: 3,0/);
  });
});
