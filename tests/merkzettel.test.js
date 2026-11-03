// AH18: Merkzettel – schnell etwas aufschreiben, an das man denken will. Eigener Menüpunkt, offene Punkte im
// Dashboard, Klasse und Frist wahlweise, antippen = abhaken mit „Rückgängig“. Nie im Sitzplan (Beamer).
const { loadApp, app } = require('./helpers/load-app');

// Heute: Mi 04.11.2026, 10:00. 7a hat Mi 1. Block.
const st = (id, n) => ({ id, firstName: n, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] });
function sampleDB(todos = []) {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [{ id: 'mi', day: 2, block: 1, part: 'full', subject: 'Mathe', color: '#3d63dd', groupId: 'g1', recurring: 'weekly' }],
    lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '7a', color: '#3d63dd', schularbeitWeight: 50 },
             { id: 'g2', subject: 'Physik', className: '9c', color: '#22c55e', schularbeitWeight: 50 }],
    students: { g1: [st('a', 'Anna')], g2: [] },
    supervisions: [],
    todos,
  };
}
const T = (id, text, extra = {}) => ({ id, text, created: '2026-11-02', ...extra });
const input = () => document.getElementById('todo-input');
const openTexts = () => [...document.querySelectorAll('#todo-open .todo-row .todo-text')].map(e => e.textContent);
const rowOf = text => [...document.querySelectorAll('#view-todos .todo-row')].find(r => r.querySelector('.todo-text').textContent === text);
const add = (text, groupId = '', due = '') => {
  input().value = text;
  document.getElementById('todo-group').value = groupId;
  document.getElementById('todo-due').value = due;
  document.getElementById('btn-todo-add').click();
};

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 4, 10, 0));
  app('db = ' + JSON.stringify(sampleDB()));
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  app('todoEdit = null; switchView("todos")');
  input().value = '';
});
afterEach(() => { app('switchView("dashboard")'); vi.useRealTimers(); });

describe('Menüpunkt und Eintragen', () => {
  it('eigener Menüpunkt „Merkzettel“, öffnet die Ansicht', () => {
    const nav = document.getElementById('nav-todos');
    expect(nav.textContent.trim()).toBe('Merkzettel');
    expect(nav.classList.contains('active')).toBe(true);
    expect(document.getElementById('view-todos').classList.contains('active')).toBe(true);
  });
  it('Text + Enter trägt ein (ab heute, zählt als Änderung), Feld wird leer', () => {
    const before = app('db.settings.lastModified');
    input().value = 'Kopien 7b';
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(app('db.todos')).toEqual([expect.objectContaining({ text: 'Kopien 7b', created: '2026-11-04' })]);
    expect(app('db.todos[0].groupId')).toBeUndefined();
    expect(app('db.todos[0].due')).toBeUndefined();
    expect(app('db.settings.lastModified')).not.toBe(before);
    expect(input().value).toBe('');
    expect(openTexts()).toEqual(['Kopien 7b']);
  });
  it('mit Klasse und Frist; danach sind auch Klasse und Frist wieder leer', () => {
    add('Elternbrief einsammeln', 'g1', '2026-11-06');
    expect(app('db.todos[0]')).toMatchObject({ text: 'Elternbrief einsammeln', groupId: 'g1', due: '2026-11-06' });
    expect(document.getElementById('todo-group').value).toBe('');
    expect(document.getElementById('todo-due').value).toBe('');
    const r = rowOf('Elternbrief einsammeln');
    expect(r.querySelector('.todo-class').textContent).toBe('7a');
    expect(r.querySelector('.todo-due').textContent).toBe('bis Fr., 06.11.');
  });
  it('leerer Text legt nichts an', () => {
    add('   ');
    expect(app('db.todos')).toEqual([]);
  });
  it('Klassenauswahl zeigt alle Klassen', () => {
    expect([...document.querySelectorAll('#todo-group option')].map(o => o.textContent)).toEqual(['Ohne Klasse', '7a Mathe', '9c Physik']);
  });
});

describe('Liste', () => {
  beforeEach(() => {
    app(`db.todos = ${JSON.stringify([
      T('a', 'ohne Frist alt', { created: '2026-11-01' }), T('b', 'ohne Frist neu', { created: '2026-11-03' }),
      T('c', 'übermorgen', { due: '2026-11-06' }), T('d', 'heute', { due: '2026-11-04' }), T('e', 'überfällig', { due: '2026-11-02' }),
      T('f', 'morgen', { due: '2026-11-05' }), T('g', 'erledigt', { done: true, doneAt: '2026-11-03' })])}; renderTodos()`);
  });
  it('Fristen zuerst nach Datum (überfällig oben), dann ohne Frist, neueste zuerst; Erledigtes getrennt', () => {
    expect(openTexts()).toEqual(['überfällig', 'heute', 'morgen', 'übermorgen', 'ohne Frist neu', 'ohne Frist alt']);
    expect([...document.querySelectorAll('#todo-done .todo-text')].map(e => e.textContent)).toEqual(['erledigt']);
  });
  it('Frist in Worten, überfällig rot', () => {
    expect(rowOf('heute').querySelector('.todo-due').textContent).toBe('heute');
    expect(rowOf('morgen').querySelector('.todo-due').textContent).toBe('morgen');
    const late = rowOf('überfällig').querySelector('.todo-due');
    expect(late.textContent).toBe('überfällig seit Mo., 02.11.');
    expect(late.classList.contains('is-late')).toBe(true);
  });
  it('Abhaken mit „Rückgängig“; Erledigtes wieder öffnen', () => {
    rowOf('heute').querySelector('.todo-check').click();
    expect(app('db.todos.find(t => t.id === "d")')).toMatchObject({ done: true, doneAt: '2026-11-04' });
    expect(openTexts()).not.toContain('heute');
    document.querySelector('.toast-undo button').click();
    expect(app('db.todos.find(t => t.id === "d")').done).toBeUndefined();
    expect(openTexts()).toContain('heute');
    rowOf('erledigt').querySelector('.todo-check').click();
    expect(app('db.todos.find(t => t.id === "g")').done).toBeUndefined();
  });
  it('Erledigtes löschen per ✕ mit „Rückgängig“', () => {
    rowOf('erledigt').querySelector('.todo-del').click();
    expect(app('db.todos.find(t => t.id === "g")')).toBeUndefined();
    document.querySelector('.toast-undo button').click();
    expect(app('db.todos.find(t => t.id === "g")')).toBeTruthy();
  });
  it('Bearbeiten: Stift lädt den Punkt ins Feld, Speichern ändert denselben Punkt', () => {
    rowOf('morgen').querySelector('.todo-edit').click();
    expect(input().value).toBe('morgen');
    expect(document.getElementById('todo-due').value).toBe('2026-11-05');
    expect(document.getElementById('btn-todo-add').textContent).toBe('Speichern');
    input().value = 'morgen früh';
    document.getElementById('btn-todo-add').click();
    expect(app('db.todos.filter(t => t.text.startsWith("morgen")).map(t => t.id + ":" + t.text)')).toEqual(['f:morgen früh']);
    expect(document.getElementById('btn-todo-add').getAttribute('aria-label')).toBe('Merken');
  });
  it('bearbeiteter Punkt inzwischen weg (Sync): Hinweis, kein neuer Punkt', () => {
    rowOf('morgen').querySelector('.todo-edit').click();
    app('db.todos = db.todos.filter(t => t.id !== "f")');
    input().value = 'geändert';
    document.getElementById('btn-todo-add').click();
    expect(app('db.todos.some(t => t.text === "geändert")')).toBe(false);
    expect(document.getElementById('toast-container').textContent).toMatch(/gibt es nicht mehr/);
  });
  it('Neuzeichnen (z. B. Cloud-Übernahme) lässt Eingetipptes stehen', () => {
    input().value = 'halb getippt';
    app('renderTodos()');
    expect(input().value).toBe('halb getippt');
  });
});

describe('Dashboard, Stunden-Fenster, Klasse löschen', () => {
  beforeEach(() => {
    app(`db.todos = ${JSON.stringify([T('a', 'Kopien 7a', { groupId: 'g1' }), T('b', 'Elternabend', { due: '2026-11-04' }),
      T('c', 'Physik vorbereiten', { groupId: 'g2' }), T('d', 'alt erledigt', { done: true, groupId: 'g1' })])}`);
  });
  it('Dashboard: offene Punkte oben, abhaken geht dort, „Alle“ öffnet den Merkzettel', () => {
    app('switchView("dashboard")');
    const sec = document.querySelector('.dash-todos');
    expect([...sec.querySelectorAll('.todo-text')].map(e => e.textContent)).toEqual(['Elternabend', 'Physik vorbereiten', 'Kopien 7a']);
    sec.querySelector('.todo-row .todo-check').click();
    expect(app('db.todos.find(t => t.id === "b").done')).toBe(true);
    document.querySelector('.dash-todos .dash-todos-all').click();
    expect(document.getElementById('view-todos').classList.contains('active')).toBe(true);
  });
  it('Dashboard ohne offene Punkte: kein Abschnitt', () => {
    app('db.todos = []; switchView("dashboard")');
    expect(document.querySelector('.dash-todos')).toBeNull();
  });
  it('Stunden-Fenster zeigt die offenen Punkte der Klasse, abhaken geht dort', () => {
    app('openLessonDetail("mi", "2026-11-04")');
    const box = document.getElementById('lesson-todos');
    expect(box.classList.contains('hidden')).toBe(false);
    expect([...box.querySelectorAll('.todo-text')].map(e => e.textContent)).toEqual(['Kopien 7a']);
    box.querySelector('.todo-check').click();
    expect(app('db.todos.find(t => t.id === "a").done')).toBe(true);
    expect(box.classList.contains('hidden')).toBe(true);
    app('closeModal("modal-lesson")');
  });
  it('Klasse löschen: Punkte bleiben, nur ohne Klasse', () => {
    window.confirm = () => true;
    app('deleteGroup("g1")');
    expect(app('db.todos.find(t => t.id === "a")')).toMatchObject({ text: 'Kopien 7a' });
    expect(app('"groupId" in db.todos.find(t => t.id === "a")')).toBe(false);
  });
  it('nie im Sitzplan (Beamer)', () => {
    app(`seatingRequest = { groupId: "g1", dateStr: "2026-11-04" }; switchView("seating")`);
    expect(document.getElementById('view-seating').textContent).not.toMatch(/Kopien 7a/);
  });
});

describe('Daten', () => {
  it('ein Gerät nur mit Merkzettel gilt nicht als leer (wird beim Anmelden nicht still überschrieben)', () => {
    app(`db = ${JSON.stringify({ settings: { teacherName: '', blocks: null }, lessonSlots: [], lessonData: {}, groups: [], students: {}, todos: [T('a', 'x')] })}`);
    expect(app('isLocalDBEmpty()')).toBe(false);
  });
  it('alte Daten ohne todos: Ansicht und Dashboard laufen, nichts wird angelegt', () => {
    app(`db = ${JSON.stringify({ ...sampleDB(), todos: undefined })}; switchView("todos"); switchView("dashboard")`);
    expect('todos' in app('db')).toBe(false);
  });
  it('kaputte Einträge (aus Import/neuerer App) werden übersprungen, nicht gelöscht', () => {
    app(`db.todos = [null, 5, { id: 'x' }, ${JSON.stringify(T('ok', 'gut'))}]; renderTodos()`);
    expect(openTexts()).toEqual(['gut']);
    expect(app('db.todos.length')).toBe(4);
  });
});
