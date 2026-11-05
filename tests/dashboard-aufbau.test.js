// AH41: Dashboard in zwei Spalten. Links der Tag und „Auffällig“, rechts „Als Nächstes“ und Merkzettel.
// Vorbei gegangene Stunden sind eine leise Zeile, Zahlen bei „Auffällig“ neutral.
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

const st = (id, f, extra = {}) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
const abs = n => Array.from({ length: n }, (_, i) => ({ id: 'a' + i, date: `2026-10-${10 + i}`, type: 'abwesend', note: '' }));
function sampleDB(extra = {}) {
  return {
    settings: { teacherName: 'T', blocks: null, warnAbsences: 3, lastBackupTimestamp: Date.now() },
    lessonData: {}, supervisions: [], acknowledgedWarnings: {},
    lessonSlots: [
      { id: 'a', day: 3, block: 1, part: 'full', subject: 'Mathe', room: 'R1', color: '#3b82f6', groupId: 'g1', recurring: 'weekly' },
      { id: 'b', day: 3, block: 3, part: 'full', subject: 'Mathe', room: 'R2', color: '#3b82f6', groupId: 'g1', recurring: 'weekly' },
    ],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50 }],
    students: { g1: [st('s1', 'Anna', { attendance: abs(3) })] },
    todos: [{ id: 't1', text: 'Kopien', created: '2026-11-01' }],
    ...extra,
  };
}
const content = () => document.getElementById('dashboard-content');
const heads = col => [...content().querySelectorAll(`.dash-col-${col} .dash-heading`)].map(h => h.firstChild.textContent.trim());
const rule = sel => { const m = CSS.match(new RegExp('(?:^|[}\\s])' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}', 'm')); return m ? m[1] : ''; };
function show(db) {
  app('db = ' + JSON.stringify(db));
  app('switchView("dashboard")');
}

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 5, 8, 0));   // Do 05.11.2026
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});
afterEach(() => vi.useRealTimers());

describe('Aufbau', () => {
  it('links Heute und Auffällig, rechts Als Nächstes und Merkzettel', () => {
    show(sampleDB());
    expect(heads('left')).toEqual(['Heute', 'Auffällig']);
    expect(heads('right')).toEqual(['Als Nächstes', 'Merkzettel']);
  });
  it('Hinweis zur Datensicherheit bleibt über den Spalten', () => {
    show(sampleDB({ settings: { teacherName: 'T', blocks: null } }));
    const note = content().querySelector('.dash-safety');
    expect(note).not.toBeNull();
    expect(note.parentElement).toBe(content());
  });
  it('rechts nichts zu zeigen: nur eine Spalte, keine leere Hälfte', () => {
    show(sampleDB({ lessonSlots: [], todos: [] }));
    expect(content().querySelector('.dash-grid').classList.contains('dash-grid-single')).toBe(true);
    show(sampleDB());
    expect(content().querySelector('.dash-grid').classList.contains('dash-grid-single')).toBe(false);
  });
  it('Merkzettel-Slot wird nach dem Neuzeichnen wieder gefüllt', () => {
    show(sampleDB());
    expect(content().querySelector('.dash-col-right .dash-todos .todo-row')).not.toBeNull();
  });
});

describe('Stunden', () => {
  it('Raum steht in der Titelzeile, escapet', () => {
    const db = sampleDB();
    db.lessonSlots[0].room = 'R<b>1</b>';
    show(db);
    const title = content().querySelector('.dash-lesson .dash-lesson-title');
    expect(title.textContent).toContain('R<b>1</b>');
    expect(title.querySelector('b')).toBeNull();
    expect(content().querySelector('.dash-lesson[data-slot] .dash-lesson-room')).toBeNull();
  });
  it('Vorbei: eine leise Zeile ohne Zusätze, im Handy-Layout bleibt der Stand in der Zeile', () => {
    expect(rule('.dash-lesson.past')).toMatch(/min-height:var\(--control-h\)/);
    expect(CSS).toMatch(/\.dash-lesson\.past \.dash-lesson-status[^{]*\{display:none;\}/);
    expect(CSS).not.toMatch(/\.dash-lesson-status\{width:100%;\}/);
    expect(rule('.dash-lesson')).toMatch(/min-height:calc\(var\(--control-h\) \+ var\(--space-3\)\)/);
  });
  it('Notizen an einer Stunde bleiben eine Zeile', () => {
    expect(rule('.dash-lesson-cnotes .cn-chip')).toMatch(/white-space:nowrap/);
    expect(rule('.dash-lesson-cnotes .cn-chip')).toMatch(/text-overflow:ellipsis/);
  });
});

describe('Als Nächstes', () => {
  it('erst die Klasse, darunter wann', () => {
    show(sampleDB());
    const card = content().querySelector('.dash-next');
    const title = card.querySelector('.dash-next-title'), label = card.querySelector('.dash-next-label');
    expect(title.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(label.textContent).not.toMatch(/Nächste Stunde/);
    expect(label.textContent).toMatch(/\d\d:\d\d/);
  });
});

describe('Auffällig', () => {
  it('eine Karte mit Zeilen, Zahlen neutral', () => {
    show(sampleDB());
    expect(content().querySelector('.dash-warn-box details.dash-warn-group')).not.toBeNull();
    expect(rule('.dash-warn-count')).not.toMatch(/--danger/);
    expect(rule('.dash-warn-box summary')).toMatch(/min-height:var\(--control-h\)/);
  });
  it('niemand auffällig: ruhiger Hinweis', () => {
    show(sampleDB({ students: { g1: [st('s1', 'Anna')] } }));
    expect(content().textContent).toContain('Niemand auffällig.');
  });
});

describe('Breiten', () => {
  it('zwei Spalten erst ab 600 px Breite der Ansicht, schmal in der Reihenfolge Als Nächstes, Heute, Merkzettel, Auffällig', () => {
    expect(rule('#dashboard-content')).toMatch(/container-type:inline-size/);
    expect(CSS).toMatch(/@container \(min-width: 600px\)\{\s*\.dash-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\);/);
    expect(rule('.dash-col')).toMatch(/display:contents/);
    for (const [c, n] of [['.dash-coming', 0], ['.dash-today', 1], ['#dash-todos-slot', 2], ['.dash-warnings', 3]]) expect(rule(c), c).toMatch(new RegExp(`order:${n}`));
  });
});

describe('Merkzettel', () => {
  it('Kästchen klein, Tippfläche groß; Ansicht und Dashboard gleich', () => {
    expect(rule('.todo-check')).toMatch(/width:44px/);
    expect(rule('.todo-check .ico')).toMatch(/width:14px/);
    expect(CSS).toMatch(/\.dash-todos \.todo-list,\.todo-view \.todo-list\{/);
    expect(CSS).toMatch(/\.dash-todos \.todo-row,\.todo-view \.todo-row\{[^}]*min-height:calc\(var\(--control-h\) \+ var\(--space-3\)\)/);
  });
});
