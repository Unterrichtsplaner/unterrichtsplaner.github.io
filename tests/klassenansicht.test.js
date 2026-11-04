// AH23 + AH24 Paket a/b: Tabellen der Klassenansicht – Scroll-Stelle bleibt beim Eintragen, neuester Tag sichtbar,
// einheitliche Zusammenfassungen und Begriffe, leise Leerzellen, Tippflächen für den Finger.
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Heute: Mi 04.11.2026
const st = (id, f, extra = {}) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [], lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3d63dd', schularbeitWeight: 50 }],
    students: { g1: [
      st('a', 'Anna', {
        participation: [{ id: 'p1', date: '2026-10-13', value: 'positive' }, { id: 'p2', date: '2026-11-04', value: 'negative' }],
        attendance: [{ id: 'f1', date: '2026-10-16', type: 'abwesend', note: '' }, { id: 'f2', date: '2026-10-22', type: 'entschuldigt', note: '' }],
        homework: [{ id: 'h1', date: '2026-10-21', note: '' }],
        grades: [{ type: 'schularbeit', value: '2.0', date: '2026-10-15', note: 'KA 1' }],
      }),
      st('b', 'Ben', { participation: [{ id: 'p3', date: '2026-10-13', value: 'neutral' }], attendance: [{ id: 'e1', date: '2026-10-16', type: 'entschuldigt', note: '' }] }),
    ] },
  };
}
const wrap = () => document.querySelector('#overview-content .overview-table-wrapper');
const heads = () => [...document.querySelectorAll('#overview-content thead th')];
const row = name => [...document.querySelectorAll('#overview-content tbody tr')].find(r => r.textContent.includes(name));

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 4, 10, 0));
  app('db = ' + JSON.stringify(sampleDB()));
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});
afterEach(() => vi.useRealTimers());

describe('AH23: Scroll-Stelle bleibt beim Eintragen', () => {
  it('Mitarbeit: Smiley antippen zeichnet neu, die Tabelle bleibt, wo sie war', () => {
    app('openGroupStudents("g1", "participation")');
    wrap().scrollLeft = 300; wrap().scrollTop = 40;
    expect(row('Ben').querySelectorAll('.ov-part-btn')[1].getAttribute('onclick')).toContain('cycleInlineParticipation(');
    app('cycleInlineParticipation("b", "2026-11-04", "")');   // Inline-onclick läuft im Test nicht (Regel 18)
    expect(app('db.students.g1[1].participation.length')).toBe(2);   // wirklich eingetragen und neu gezeichnet
    expect(wrap().scrollLeft).toBe(300);
    expect(wrap().scrollTop).toBe(40);
  });
  it('Anwesenheit: Eintrag per Feld behält die Stelle', () => {
    app('openGroupStudents("g1", "attendance")');
    wrap().scrollLeft = 120; wrap().scrollTop = 10;
    app('updateInlineAttendance("b", "2026-10-22", "F")');
    expect(app('db.students.g1[1].attendance.length')).toBe(2);
    expect(wrap().scrollLeft).toBe(120);
    expect(wrap().scrollTop).toBe(10);
  });
});

describe('AH24 b: Neuester Tag sichtbar', () => {
  it('beim Öffnen eines Reiters steht die Tabelle ganz rechts (neueste Spalte), auch nach Reiterwechsel', () => {
    const sw = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollWidth');
    Object.defineProperty(Element.prototype, 'scrollWidth', { configurable: true, get() { return 900; } });
    try {
      app('openGroupStudents("g1", "participation")');
      expect(wrap().scrollLeft).toBe(900);
      wrap().scrollLeft = 0;
      app('switchClassDashboardTab("homework")');
      app('switchClassDashboardTab("participation")');
      expect(wrap().scrollLeft).toBe(900);
    } finally { if (sw) Object.defineProperty(Element.prototype, 'scrollWidth', sw); else delete Element.prototype.scrollWidth; }
  });
  it('Spalte von heute ist markiert; Datum ohne Jahr mit Wochentag', () => {
    app('openGroupStudents("g1", "participation")');
    const today = heads().find(th => th.classList.contains('ov-today'));
    expect(today.textContent).toMatch(/Mi\.?,? 04\.11\./);
    expect(heads().map(h => h.textContent).join(' ')).not.toMatch(/2026/);
  });
  it('Zusammenfassung bleibt beim seitlichen Wischen stehen (alle vier Tabellen)', () => {
    for (const tab of ['grades', 'participation', 'attendance', 'homework']) {
      app(`openGroupStudents("g1", "${tab}")`);
      expect(heads()[1].classList.contains('ov-sum-col'), tab).toBe(true);
      expect(row('Anna').querySelectorAll('td')[1].classList.contains('ov-sum-col'), tab).toBe(true);
    }
    expect(CSS).toMatch(/\.overview-table \.ov-sum-col\{position:sticky;left:var\(--ov-name-w, 140px\);/);
  });
});

describe('AH24 a: einheitlich und leise', () => {
  it('Mitarbeit: leere Zelle ohne Emoji, jeder Knopf hat einen Namen; Bilanz wie im Reiter Schüler', () => {
    app('openGroupStudents("g1", "participation")');
    const html = document.getElementById('overview-content').innerHTML;
    expect(html).not.toContain('➖');
    const empty = row('Ben').querySelectorAll('.ov-part-btn')[1];
    expect(empty.querySelector('.ov-empty').textContent).toBe('–');
    expect(empty.getAttribute('aria-label')).toMatch(/Ben X.*keine/);
    expect(heads()[1].textContent).toBe('+ / = / –');
    const sum = row('Anna').querySelectorAll('td')[1];
    expect(sum.textContent.replace(/\s+/g, ' ').trim()).toBe('1 / 0 / 1');
    expect(sum.querySelector('.n-bad').textContent).toBe('1');
    expect(row('Ben').querySelectorAll('td')[1].querySelector('.n-bad')).toBeNull();   // 0 negativ: nicht rot
  });
  it('Anwesenheit: Zusammenfassung „F / E“ wie im Reiter Schüler, E nicht grün', () => {
    app('openGroupStudents("g1", "attendance")');
    expect(heads()[1].textContent).toBe('Fehlt F / E');
    const sum = row('Anna').querySelectorAll('td')[1];
    expect(sum.textContent.replace(/\s+/g, ' ').trim()).toBe('1 / 1');
    expect(sum.querySelector('.n-bad').textContent).toBe('1');
    const e = [...row('Ben').querySelectorAll('input')].find(i => i.value === 'E');
    expect(e.getAttribute('style') || '').not.toContain('success');
  });
  it('Reiter Schüler: „Fehlt F / E“ (nicht U), Reiter heißt „Fehlzeiten“', () => {
    app('openGroupStudents("g1", "students")');
    expect(document.querySelector('.students-head-att').textContent).toBe('Fehlt F / E');
    expect(document.querySelector('#overview-tab-attendance .tab-long').textContent).toBe('Fehlzeiten');
  });
  it('Platzhalter einheitlich „–“', () => {
    for (const tab of ['grades', 'attendance', 'homework']) {
      app(`openGroupStudents("g1", "${tab}")`);
      const ph = [...document.querySelectorAll('#overview-content tbody input')].map(i => i.getAttribute('placeholder'));
      expect(ph.length, tab).toBeGreaterThan(0);
      expect(ph.every(p => p === '–'), tab).toBe(true);
    }
  });
  it('Zahlen gleich breit; Reiter ohne Ausblend-Rand; iPad hochkant Kurzformen; Tippflächen 44 px', () => {
    expect(CSS).toMatch(/\.overview-table\{[^}]*font-variant-numeric:tabular-nums;/);
    expect(CSS).toMatch(/\.class-tabs\{[^}]*mask-image:none;[^}]*-webkit-mask-image:none;[^}]*padding-right:0;/);
    expect(CSS).toMatch(/@media \(min-width: 601px\) and \(max-width: 1023px\)\{\s*\.class-tabs \.tab-long\{display:none;\}\s*\.class-tabs \.tab-short\{display:inline;\}/);
    const coarse = CSS.match(/\/\* Klassenansicht: Tippflächen \(AH24\) \*\/\s*@media \(pointer: coarse\)\{([^@]*?)\n\}/);
    expect(coarse).not.toBeNull();
    for (const sel of ['.class-tabs .tab-btn', '.class-view-header button', '.ov-part-btn', '.student-counter']) expect(coarse[1]).toContain(sel);
    expect(coarse[1]).toMatch(/min-height:44px/);
    expect(HTML).toMatch(/id="overview-tab-attendance"[^>]*>.*<span class="tab-long">Fehlzeiten<\/span>/);
  });
});
