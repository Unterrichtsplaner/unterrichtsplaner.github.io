// AH10: Notiz zu einem Schüler direkt im Sitzplan (Rückmeldung 03.11.: übers Profil zu umständlich).
// Eintippen sofort; vorhandene Notizen nur auf Knopfdruck (Beamer, Regel 67).
const { loadApp, app } = require('./helpers/load-app');

const MON = '2026-11-02';
const student = (id, firstName, extra = {}) => ({ id, firstName, lastName: 'Muster', grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
const sampleDB = () => ({
  settings: { teacherName: 'T', blocks: null },
  lessonSlots: [{ id: 'm1', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' }],
  lessonData: {},
  groups: [{ id: 'g1', subject: 'Mathe', className: '7a', color: '#6366f1', schularbeitWeight: 50 }],
  students: { g1: [student('a', 'Anna', { studentNotes: [{ text: 'Elterngespräch geführt', date: '2026-10-20' }] }), student('b', 'Ben')] },
  supervisions: [],
});
const input = () => document.getElementById('seating-student-note-input');
const list = () => document.getElementById('seating-student-notes');
const open = id => app(`openSeatingStudentModal(${JSON.stringify(id)}, "g1", "${MON}")`);

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 2, 10, 0));
  app('db = ' + JSON.stringify(sampleDB()));
  app(`seatingRequest = { groupId: "g1", dateStr: "${MON}" }; switchView("seating")`);
});
afterEach(() => {
  if (!document.getElementById('modal-seating-student').classList.contains('hidden')) app('closeModal("modal-seating-student")');
  app('hideSeatingGrades && hideSeatingGrades()');
  vi.useRealTimers();
});

describe('AH10: Schülernotiz im Sitzplan', () => {
  it('Feld im Schüler-Fenster; „+“ legt die Notiz mit dem Datum des Sitzplans an', () => {
    open('b');
    input().value = 'Heft vergessen';
    document.querySelector('#modal-seating-student .seating-note-add').click();
    expect(app('db.students.g1[1].studentNotes')).toEqual([{ text: 'Heft vergessen', date: MON }]);
    expect(input().value).toBe('');
    expect(document.getElementById('modal-seating-student').classList.contains('hidden')).toBe(false);
  });
  it('Enter trägt ein; leeres Feld legt nichts an', () => {
    open('b');
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(app('db.students.g1[1].studentNotes')).toEqual([]);
    input().value = 'kam zu spät, Bus';
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(app('db.students.g1[1].studentNotes.map(n => n.text)')).toEqual(['kam zu spät, Bus']);
  });
  it('Schließen (✕, Escape, daneben) und Smiley übernehmen Eingetipptes (Regel 27)', () => {
    open('b');
    input().value = 'eins';
    app('closeModalLikeButton("modal-seating-student")');
    open('b');
    input().value = 'zwei';
    app('addParticipationSmiley("positive")');   // schließt das Fenster ohne closeModal
    expect(app('db.students.g1[1].studentNotes.map(n => n.text)')).toEqual(['eins', 'zwei']);
  });
  it('vorhandene Notizen nur auf Knopfdruck (Beamer): oben nie, unter „Mehr zu …“ erst nach „Anzeigen“ (AH28)', () => {
    open('a');
    expect(list().textContent).not.toContain('Elterngespräch');
    const more = () => document.getElementById('sw-more');
    expect(more().classList.contains('is-veiled')).toBe(true);
    expect(document.getElementById('sw-sec-notes').hasAttribute('data-private')).toBe(true);
    app('revealSeatingStudent()');
    expect(document.getElementById('student-notes-list').textContent).toContain('Elterngespräch geführt');
    app('closeModal("modal-seating-student")');
    open('a');
    expect(more().classList.contains('is-veiled')).toBe(true);   // nie gespeichert, beim nächsten Öffnen wieder zu
  });
  it('neue Notiz ist sofort lesbar (eben selbst getippt), alte bleiben verborgen', () => {
    open('a');
    input().value = 'heute super';
    document.querySelector('#modal-seating-student .seating-note-add').click();
    expect(list().textContent).toContain('heute super');
    expect(list().textContent).not.toContain('Elterngespräch');
  });
  it('Schüler inzwischen gelöscht (Sync): Hinweis statt stiller Ablage', () => {
    open('b');
    input().value = 'weg';
    app('db.students.g1 = db.students.g1.filter(s => s.id !== "b")');
    app('addSeatingStudentNote()');
    expect(document.getElementById('toast-container').textContent).toMatch(/gibt es nicht mehr/);
  });
});
