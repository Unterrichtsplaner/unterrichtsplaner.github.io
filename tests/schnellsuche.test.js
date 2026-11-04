// AH19: Schnellsuche – Klassen, Schüler, Merkzettel, Klassennotizen und Planung finden und direkt öffnen.
// Nie Noten, Hinweise oder Schülernotizen durchsuchen oder anzeigen (Beamer, Regel 67).
const { loadApp, app } = require('./helpers/load-app');

// Heute: Mi 04.11.2026, 10:00. 7b hat Do 1. Block, 9c Mi 1. Block.
const st = (id, f, l, extra = {}) => ({ id, firstName: f, lastName: l, grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [
      { id: 'do', day: 3, block: 1, part: 'full', subject: 'Mathe', color: '#3d63dd', groupId: 'g1', recurring: 'weekly', room: 'R101' },
      { id: 'mi', day: 2, block: 1, part: 'full', subject: 'Physik', color: '#22c55e', groupId: 'g2', recurring: 'weekly' },
    ],
    lessonData: {},
    groups: [
      { id: 'g1', subject: 'Mathe', className: '7b', color: '#3d63dd', schularbeitWeight: 50,
        classNotes: [{ id: 'n1', text: 'Beamer-Kabel mitbringen', date: '2026-11-03' }, { id: 'n2', text: 'Beamer alt', date: '2026-10-01', until: '2026-10-02' }],
        plan: [{ id: 'p1', title: 'Bruchrechnung', lessons: 3 }, { id: 'p2', title: 'Brüche erweitern', done: true }] },
      { id: 'g2', subject: 'Physik', className: '9c', color: '#22c55e', schularbeitWeight: 50 },
    ],
    students: {
      g1: [st('s1', 'Ben', 'Becker', { notes: 'Brille', importantNote: 'Allergie Nüsse', grades: [{ type: 'muendlich', value: '5.0', date: '2026-11-02', note: 'Ben schwach' }],
                studentNotes: [{ text: 'Elterngespräch Becker', date: '2026-11-01' }] }),
           st('s2', 'Jörg', 'Müller')],
      g2: [st('s3', 'Benno', 'Wolf'), st('s4', 'Anna', 'Benz')],
    },
    supervisions: [],
    todos: [{ id: 't1', text: 'Ben wegen Fehlstunden ansprechen', created: '2026-11-03', groupId: 'g1' },
            { id: 't2', text: 'Ben erledigt', created: '2026-11-01', done: true }],
  };
}
const input = () => document.getElementById('search-input');
const type = q => { input().value = q; input().dispatchEvent(new Event('input', { bubbles: true })); };
const titles = () => [...document.querySelectorAll('#search-results .search-main .search-title')].map(e => e.textContent);
const sections = () => [...document.querySelectorAll('#search-results .search-sec')].map(e => e.textContent);
const isOpen = () => !document.getElementById('modal-search').classList.contains('hidden');
const key = (k, extra = {}) => input().dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...extra }));

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp();
  // Inline-onclick am Fensterhintergrund läuft im Test nicht (Regel 18); geprüft wird es in accessibility.test.js
  document.getElementById('modal-search').removeAttribute('onclick');
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 4, 10, 0));
  localStorage.removeItem('search_recent');
  app('db = ' + JSON.stringify(sampleDB()));
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  app('switchView("dashboard")');
});
afterEach(() => { app('closeModal("modal-search")'); vi.useRealTimers(); });

describe('Öffnen', () => {
  it('Suchfeld in der Seitenleiste, im Dashboard (Handy) und in der Klassenübersicht (Handy)', () => {
    for (const id of ['btn-search', 'btn-search-dashboard', 'btn-search-classes']) {
      expect(document.getElementById(id).getAttribute('onclick'), id).toBe('openSearch()');
    }
    app('openSearch()');
    expect(isOpen()).toBe(true);
    expect(input().value).toBe('');
  });
  it('⌘K / Strg+K öffnet die Suche, aber nicht über einem anderen Fenster', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
    expect(isOpen()).toBe(true);
    app('closeModal("modal-search")');
    app('openModal("modal-class-notes")');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
    expect(isOpen()).toBe(false);
    app('closeModal("modal-class-notes")');
  });
  it('blockiert keinen Cloud-Abgleich (liest nur)', () => {
    app('openSearch()');
    expect(app('inputModalOpen()')).toBe(false);
  });
  it('Escape schließt', () => {
    app('openSearch()');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(isOpen()).toBe(false);
  });
});

describe('Finden', () => {
  beforeEach(() => app('openSearch()'));
  it('Schüler nach Vor- und Nachname, Wortanfang zuerst; Klasse darunter', () => {
    type('ben');
    expect(sections()).toEqual(['Schüler', 'Merkzettel, Notizen, Planung']);
    expect(titles().slice(0, 3)).toEqual(['Ben Becker', 'Benno Wolf', 'Anna Benz']);
    const row = [...document.querySelectorAll('#search-results .search-main')][0];
    expect(row.querySelector('.search-sub').textContent).toBe('7b Mathe');
    expect(row.querySelector('mark').textContent).toBe('Ben');
  });
  it('Umlaute egal: „muller“ findet Jörg Müller, „jorg“ auch', () => {
    type('muller'); expect(titles()).toEqual(['Jörg Müller']);
    type('jorg'); expect(titles()).toEqual(['Jörg Müller']);
  });
  it('mehrere Wörter: „ben 9c“ findet nur Schüler der 9c', () => {
    type('ben 9c');
    expect(titles()).toEqual(['Benno Wolf', 'Anna Benz']);
  });
  it('Klasse mit nächster Stunde und Abkürzungen', () => {
    type('7b');
    expect(sections()[0]).toBe('Klassen');
    const row = document.querySelector('#search-results .search-row');
    expect(row.querySelector('.search-title').textContent).toBe('7b Mathe');
    expect(row.querySelector('.search-sub').textContent).toMatch(/^Als Nächstes: Morgen · 1\./);
    expect([...row.querySelectorAll('.search-acts button')].map(b => b.textContent)).toEqual(['Sitzplan', 'Noten', '+ Notiz']);
  });
  it('Merkzettel (nur offene), Klassennotizen (nur gültige), Planung (nur offene Themen)', () => {
    type('beamer');
    expect(titles()).toEqual(['Beamer-Kabel mitbringen']);
    type('bruch');
    expect(titles()).toEqual(['Bruchrechnung']);
    type('fehlstunden');
    expect(titles()).toEqual(['Ben wegen Fehlstunden ansprechen']);
    type('erledigt');
    expect(titles()).toEqual([]);
  });
  it('nie Noten, Hinweise oder Schülernotizen (Beamer)', () => {
    for (const q of ['brille', 'allergie', 'nüsse', 'elterngespräch', 'schwach']) {
      type(q);
      expect(titles(), q).toEqual([]);
    }
    type('ben');
    const text = document.getElementById('search-results').textContent;
    expect(text).not.toMatch(/Allergie|Brille|schwach|Elterngespräch|5,0/);
  });
  it('nichts gefunden: Hinweis, was nicht durchsucht wird', () => {
    type('xyz');
    expect(document.getElementById('search-results').textContent).toMatch(/Nichts gefunden/);
    expect(document.getElementById('search-results').textContent).toMatch(/Noten und Hinweise/);
  });
});

describe('Öffnen eines Treffers', () => {
  beforeEach(() => app('openSearch()'));
  it('Pfeiltasten wählen, Enter öffnet das Schülerprofil (in seiner Klasse)', () => {
    type('ben');
    key('ArrowDown');
    expect(document.querySelector('#search-results .search-main.is-active .search-title').textContent).toBe('Benno Wolf');
    key('ArrowUp');
    key('Enter');
    expect(isOpen()).toBe(false);
    expect(app('currentGroupId')).toBe('g1');
    expect(app('currentStudentId')).toBe('s1');
    expect(document.getElementById('modal-student-detail').classList.contains('hidden')).toBe(false);
    app('closeModal("modal-student-detail")');
  });
  it('Klasse antippen öffnet die Klasse; „Noten“ den Reiter Noten; „Sitzplan“ den Sitzplan; „+ Notiz“ die Klassennotizen', () => {
    type('7b');
    document.querySelector('#search-results .search-main').click();
    expect(document.getElementById('view-students').classList.contains('active')).toBe(true);
    expect(app('currentGroupId')).toBe('g1');

    app('openSearch()'); type('7b');
    document.querySelector('#search-results .search-acts [data-act="grades"]').click();
    expect(app('currentClassDashboardTab')).toBe('grades');

    app('openSearch()'); type('7b');
    document.querySelector('#search-results .search-acts [data-act="seating"]').click();
    expect(document.getElementById('view-seating').classList.contains('active')).toBe(true);
    expect(app('currentSeatingGroupId')).toBe('g1');

    app('openSearch()'); type('7b');
    document.querySelector('#search-results .search-acts [data-act="note"]').click();
    expect(document.getElementById('modal-class-notes').classList.contains('hidden')).toBe(false);
    app('closeModal("modal-class-notes")');
  });
  it('Planungsthema öffnet den Reiter Planung, Merkzettel-Punkt den Merkzettel', () => {
    type('bruch'); key('Enter');
    expect(app('currentClassDashboardTab')).toBe('plan');
    app('openSearch()'); type('fehlstunden'); key('Enter');
    expect(document.getElementById('view-todos').classList.contains('active')).toBe(true);
  });
  it('Treffer inzwischen weg (Sync): Hinweis, nichts öffnet sich', () => {
    type('ben');
    app('db.students.g1 = db.students.g1.filter(s => s.id !== "s1")');
    key('Enter');
    expect(document.getElementById('modal-student-detail').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('toast-container').textContent).toMatch(/gibt es nicht mehr/);
  });
});

describe('Ohne Eingabe', () => {
  it('„Springen zu“: Heute, Merkzettel mit Anzahl; Sitzplan der laufenden Klasse', () => {
    vi.setSystemTime(new Date(2026, 10, 4, 7, 50)); // 9c läuft (Mi 1. Block)
    app('openSearch()');
    expect(sections()).toEqual(['Springen zu']);
    expect(titles()).toEqual(['Heute im Stundenplan', 'Sitzplan 9c', 'Merkzettel']);
    expect(document.getElementById('search-results').textContent).toMatch(/1 offen/);
  });
  it('„Zuletzt geöffnet“: Klassen und Schüler, die man geöffnet hat; Gelöschtes fällt weg', () => {
    app('openGroupStudents("g2")');
    app('openSearch()'); type('ben'); key('Enter'); // Ben Becker (7b)
    app('closeModal("modal-student-detail")');
    app('openSearch()');
    expect(sections()).toEqual(['Zuletzt geöffnet', 'Springen zu']);
    expect(titles().slice(0, 3)).toEqual(['Ben Becker', '7b Mathe', '9c Physik']);
    app('closeModal("modal-search")');
    app('db.groups = db.groups.filter(g => g.id !== "g2")');
    app('openSearch()');
    expect(titles()).not.toContain('9c Physik');
  });
  it('kaputter Speicher für „Zuletzt“ stört nicht', () => {
    localStorage.setItem('search_recent', '{kaputt');
    app('openSearch()');
    expect(sections()).toEqual(['Springen zu']);
  });
});

describe('Handy: Suche als ganze Seite', () => {
  it('ohne graue Abdunklung: unter Tastatur und Statusleiste die Farbe der Suche', () => {
    const CSS = require('fs').readFileSync(require('path').join(__dirname, '..', 'style.css'), 'utf8');
    expect(CSS).toMatch(/@media\(max-width:600px\)\{[^@]*#modal-search\{padding:0;background:var\(--bg-secondary\);backdrop-filter:none;\}/);
  });
});
