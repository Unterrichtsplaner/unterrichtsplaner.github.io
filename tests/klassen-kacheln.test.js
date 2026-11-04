// AH8: Klassenübersicht als große Farbkacheln (Rückmeldung 03.11.: Zeilen helfen nicht, Klassen schnell zu finden).
// Kachel wie die Stunde im Stundenplan: Klassenfarbe als heller Grund, Klassenname groß.
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
const rule = sel => { const m = CSS.match(new RegExp('(?:^|\\n)' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}')); return m ? m[1] : ''; };

beforeAll(() => {
  loadApp();
  app(`db.groups = [{ id: 'g1', subject: 'Mathe', className: '7b', year: '2026/27', color: '#3b82f6', schularbeitWeight: 50 },
                    { id: 'g2', subject: 'Mathe', className: '5a', color: '#ef4444', schularbeitWeight: 50 },
                    { id: 'g3', subject: 'Physik', className: '9c', color: '#22c55e', schularbeitWeight: 50 }];
       db.students = { g1: [{ id: 's1', firstName: 'A', lastName: 'B', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] }], g2: [], g3: [] };
       db.lessonSlots = [{ id: 'l1', day: 0, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', recurring: 'weekly' }];
       switchView('classes')`);
});

describe('AH8: Klassen als Kacheln', () => {
  it('Kacheln im Raster, nach Fach gruppiert, innerhalb nach Klasse sortiert', () => {
    const sections = [...document.querySelectorAll('.subject-section')];
    expect(sections.map(s => s.querySelector('.subject-heading').firstChild.textContent)).toEqual(['Mathe', 'Physik']);
    expect([...sections[0].querySelectorAll('.class-tile .cr-name')].map(e => e.textContent)).toEqual(['5a', '7b']);
    expect(rule('.class-list')).toMatch(/display:grid;grid-template-columns:repeat\(auto-fill,minmax\(/);
  });
  it('Kachel in Klassenfarbe (Grundfarbe als Variable, Ton per color-mix), Name groß', () => {
    const tile = [...document.querySelectorAll('.class-tile')].find(t => t.querySelector('.cr-name').textContent === '7b');
    expect(tile.style.getPropertyValue('--card-color')).toBe('#3b82f6');
    expect(rule('.class-tile')).toMatch(/background:color-mix\(in srgb, var\(--card-color\) 15%, transparent\)/);
    expect(rule('.class-tile .cr-name')).toMatch(/font-size:26px/);
    expect(rule('.class-tile')).not.toMatch(/overflow:\s*hidden|aspect-ratio|[^-]height:/);   // wächst mit dem Inhalt (Regel 31)
  });
  it('ganze Kachel öffnet die Klasse; Klassenname ist der Knopf (VoiceOver, AH14); Sitzplan, Notizen, Bearbeiten bleiben', () => {
    const tile = [...document.querySelectorAll('.class-tile')].find(t => t.querySelector('.cr-name').textContent === '7b');
    expect(tile.getAttribute('role')).toBeNull();                       // keine Knöpfe in einem Knopf
    const name = tile.querySelector('button.cr-name');
    expect(name.getAttribute('aria-label')).toBe('Klasse 7b Mathe öffnen');
    expect(tile.querySelector('.cr-seating-btn')).not.toBeNull();
    expect(tile.querySelector('.cr-notes-btn')).not.toBeNull();
    expect(tile.querySelector('button[title="Bearbeiten"]')).not.toBeNull();
    expect(tile.textContent).toContain('Mathe · 2026/27');
    expect(tile.textContent).toContain('1 Schüler');
    tile.click();
    expect(app('currentGroupId')).toBe('g1');
  });
});

// AH12: Ansicht wählbar – Liste · Kacheln · Groß (mit nächster Stunde, Thema/Planung, Fälligem, Auffälligen)
describe('AH12: Ansicht der Klassenübersicht wählbar', () => {
  const tileOf = name => [...document.querySelectorAll('#subject-groups-container .class-row')].find(t => t.querySelector('.cr-name').textContent === name);
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 2, 10, 0));   // Mo 02.11.2026, 10:00
    app(`db.settings.warnAbsences = 2;
      db.lessonSlots = [{ id: 'l1', day: 0, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', recurring: 'weekly', room: 'R101' },
                        { id: 'l2', day: 2, block: 2, part: 'full', subject: 'Mathe', groupId: 'g1', recurring: 'weekly', room: 'R101' }];
      db.lessonData = { 'l1_2026-11-02': { done: 'Brüche kürzen\\nNr. 4', hwEnabled: true, hwItems: [{ id: 'h', text: 'S. 12 Nr. 3', targetDate: '2026-11-04' }] } };
      db.groups[0].plan = [{ id: 't1', title: 'Brüche kürzen', lessons: 1, doneLessons: ['l1_2026-11-02'] }, { id: 't2', title: 'Dezimalzahlen', lessons: 3 }];
      db.students.g1[0].attendance = [{ id: 'a1', date: '2026-10-20', type: 'abwesend' }, { id: 'a2', date: '2026-10-21', type: 'abwesend' }];
      db.acknowledgedWarnings = {};`);
  });
  afterAll(() => { app('setClassesView("tiles"); setClassesSort("subject")'); vi.useRealTimers(); });

  it('Umschalter oben, Standard Kacheln; Wahl geht mit den Daten in die Cloud (db.settings), Standard nie gespeichert', () => {
    app('switchView("classes")');
    const btns = [...document.querySelectorAll('#classes-mode button')];
    expect(btns.map(b => b.textContent.trim())).toEqual(['Liste', 'Kacheln', 'Groß']);
    expect(btns.find(b => b.dataset.mode === 'tiles').getAttribute('aria-pressed')).toBe('true');
    const before = app('db.settings.lastModified');
    app('setClassesView("list")');
    expect(app('db.settings.classesView')).toBe('list');
    expect(app('db.settings.lastModified')).not.toBe(before);     // zählt als Änderung → Sync
    expect(document.querySelector('#classes-mode [data-mode="list"]').getAttribute('aria-pressed')).toBe('true');
    app('setClassesView("tiles")');
    expect('classesView' in app('db.settings')).toBe(false);
    app('setClassesView("list")');
  });
  it('Wahl aus der Cloud (anderes Gerät) wird übernommen; unbekannter Wert = Standard', () => {
    app('db.settings.classesView = "large"; renderSubjectGroups()');
    expect(document.querySelector('#classes-mode [data-mode="large"]').getAttribute('aria-pressed')).toBe('true');
    app('db.settings.classesView = "riesig"; renderSubjectGroups()');
    expect(document.querySelector('#classes-mode [data-mode="tiles"]').getAttribute('aria-pressed')).toBe('true');
    app('setClassesView("list")');
  });
  it('Liste: Zeilen ohne Kachelfarbe, alle Knöpfe da', () => {
    app('setClassesView("list")');
    const row = tileOf('7b');
    expect(row.classList.contains('class-tile')).toBe(false);
    expect(row.closest('.class-list').classList.contains('is-list')).toBe(true);
    expect(row.querySelector('.cr-seating-btn')).not.toBeNull();
    expect(row.querySelector('.cr-notes-btn')).not.toBeNull();
  });
  it('Groß: nächste Stunde, letztes Thema, geplantes Thema, Fälliges, Auffällige (nur Zahl)', () => {
    localStorage.removeItem('warnings_seen');   // alles Vorhandene gilt als gesehen (AH24 f)
    app('setClassesView("large")');
    const t = tileOf('7b');
    expect(t.classList.contains('is-large')).toBe(true);
    // A+ (AH14): fester Stapel wann → Thema → zuletzt → Plaketten, ohne Etiketten
    const m = t.querySelector('.ct-main');
    expect(m.querySelector('.ct-when').textContent).toMatch(/^Mi\.?, 04\.11\. · 2\. Block · R101$/);
    expect(m.querySelector('.ct-topic').textContent).toBe('DezimalzahlenStunde 1 von 3');
    expect(m.querySelector('.ct-prev').textContent).toBe('Zuletzt: Brüche kürzen');   // nur die erste Zeile
    const chips = [...m.querySelectorAll('.ct-chip')].map(c => c.textContent);
    expect(chips).toEqual(['1 auffällig', 'HA fällig: S. 12 Nr. 3']);
    expect(m.querySelector('.ct-chip.is-watch')).not.toBeNull();       // neutral, antippbar (AH24 f)
    expect(m.textContent).not.toContain('A B');                        // keine Namen
    expect([...m.children].map(c => c.className.split(' ')[0])).toEqual(['ct-when', 'ct-topic', 'ct-prev', 'ct-chips']);
    // links nur Fach und Tage, rechts Schnitt groß
    expect(t.querySelector('.cr-meta').textContent).toBe('Mathe · Mo, Mi');
    expect(t.querySelector('.ct-score b')).not.toBeNull();
  });
  it('Groß: relativ „Heute“/„Morgen“, laufende Stunde „jetzt“ im Akzent mit Restzeit', () => {
    vi.setSystemTime(new Date(2026, 10, 3, 10, 0));   // Di: nächste Stunde Mi = morgen
    app('renderSubjectGroups()');
    expect(tileOf('7b').querySelector('.ct-when').textContent).toBe('Morgen · 2. Block · R101');
    vi.setSystemTime(new Date(2026, 10, 4, 7, 0));    // Mi früh
    app('renderSubjectGroups()');
    expect(tileOf('7b').querySelector('.ct-when').textContent).toBe('Heute · 2. Block · 09:45 · R101');
    vi.setSystemTime(new Date(2026, 10, 2, 10, 0));
  });
  it('Groß: Thema geplant, aber nicht für diese Stunde: „Kein Thema geplant“; ohne Planung keine Zeile', () => {
    app('const keep = db.groups[0].plan; db.groups[0].plan = []; renderSubjectGroups()');
    expect(tileOf('7b').querySelector('.ct-topic')).toBeNull();
    app('db.groups[0].plan = [{ id: "x", title: "Alt", lessons: 1, done: true }]; renderSubjectGroups()');
    expect(tileOf('7b').querySelector('.ct-topic').textContent).toBe('Kein Thema geplant');
    app('db.groups[0].plan = [{ id: "t1", title: "Brüche kürzen", lessons: 1, doneLessons: ["l1_2026-11-02"] }, { id: "t2", title: "Dezimalzahlen", lessons: 3 }]; renderSubjectGroups()');
  });
  it('Groß: eine Kachel über die ganze Breite, Mitte als fester Stapel; Thema Inter, nie Buchschrift (DESIGN.md)', () => {
    expect(rule('.class-list.is-large')).toMatch(/grid-template-columns:minmax\(0,1fr\)/);
    expect(rule('.class-tile.is-large')).toMatch(/display:grid;grid-template-columns:minmax\(150px,220px\) minmax\(0,1fr\) auto;/);
    expect(rule('.ct-main')).toMatch(/display:flex;flex-direction:column;/);
    expect(rule('.ct-topic')).toMatch(/font-size:16px;font-weight:600;/);
    expect(rule('.ct-topic')).not.toMatch(/font-display/);
    expect(rule('.ct-chip')).toMatch(/border-radius:var\(--radius-xs\)/);
  });
  it('Groß: Klasse ohne Stunde: „Keine Stunde geplant“, keine leeren Zeilen', () => {
    const m = tileOf('5a').querySelector('.ct-main');
    expect(m.querySelector('.ct-when').textContent).toBe('Keine Stunde geplant');
    expect(m.querySelector('.ct-topic, .ct-prev, .ct-chips')).toBeNull();
  });
  it('laufende Stunde: „jetzt“ (Akzent) und Restzeit', () => {
    vi.setSystemTime(new Date(2026, 10, 2, 8, 0));   // Mo 1. Block läuft (07:45–09:15)
    app('renderSubjectGroups()');
    const w = tileOf('7b').querySelector('.ct-when');
    expect(w.querySelector('.ct-now').textContent).toBe('jetzt');
    expect(w.textContent).toBe('jetzt1. Block · R101 · noch 75 Min');
    expect(rule('.ct-now')).toMatch(/background:var\(--accent\);color:var\(--on-accent\)/);
    vi.setSystemTime(new Date(2026, 10, 2, 10, 0));
  });
  it('Lesbarkeit auf Klassenfarbe: Grau und Notenfarben je Modus nachgemischt (≥ 4,5:1 für alle Klassenfarben)', () => {
    expect(CSS).toMatch(/\.class-row\{--text-secondary:var\(--tint-text-2\);--text-muted:var\(--tint-text-3\);\}/);
    expect(CSS).toMatch(/\.class-row \.cr-avg\{color:color-mix\(in srgb, var\(--grade\) 50%, #fff\);\}/);
    expect(CSS).toMatch(/:root\[data-theme="light"\] \.class-row \.cr-avg\{color:color-mix\(in srgb, var\(--grade\) 75%, #000\);\}/);
    expect(tileOf('7b').querySelector('.cr-avg').getAttribute('style')).toMatch(/^--grade:/);
  });
});

// Touch (iPad): Knöpfe in der Klassenübersicht und die neuen „+“ mindestens 44 px (Rückmeldung 03.11.)
describe('Tippflächen auf dem iPad', () => {
  it('Stecknadel/Stift in den Klassen und „+“ für Notizen: 44 px, Symbol 20 px', () => {
    const touch = CSS.match(/@media \(pointer: coarse\)\{\n  \.date-chip[\s\S]*?\n\}/)[0];
    expect(touch).toMatch(/\.class-row \.btn-icon, \.lcn-add-btn, \.seating-note-add\{width:44px;height:44px;\}/);
    expect(touch).toMatch(/\.class-row \.btn-icon \.ico\{width:20px;height:20px;\}/);
  });
});

// Sortierung (Wunsch 03.11.): nach Fach (Standard) · als Nächstes · nach Klasse · Auffällige zuerst; geht in die Cloud
describe('Sortierung der Klassenübersicht', () => {
  const names = () => [...document.querySelectorAll('#subject-groups-container .cr-name')].map(e => e.textContent);
  const headings = () => [...document.querySelectorAll('#subject-groups-container .subject-heading')].map(h => h.firstChild.textContent);
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 2, 10, 0));   // Mo 02.11.2026, 10:00
    app(`db.groups = [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50 },
                      { id: 'g2', subject: 'Mathe', className: '5a', color: '#ef4444', schularbeitWeight: 50 },
                      { id: 'g3', subject: 'Physik', className: '10a', color: '#22c55e', schularbeitWeight: 50 },
                      { id: 'g4', subject: 'Bio', className: 'Q1', color: '#8b5cf6', schularbeitWeight: 50 }];
      const st = (id, extra) => Object.assign({ id, firstName: id, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] }, extra);
      const abs = [{ id: 'a1', date: '2026-10-20', type: 'abwesend' }, { id: 'a2', date: '2026-10-21', type: 'abwesend' }];
      db.students = { g1: [st('s1', { attendance: abs })], g2: [], g3: [st('s2', { attendance: abs }), st('s3', { attendance: abs })], g4: [] };
      db.settings.warnAbsences = 2; db.acknowledgedWarnings = {};
      db.lessonSlots = [{ id: 'a', day: 0, block: 2, part: 'full', subject: 'Physik', groupId: 'g3', recurring: 'weekly' },
                        { id: 'b', day: 1, block: 1, part: 'full', subject: 'Mathe', groupId: 'g2', recurring: 'weekly' },
                        { id: 'c', day: 2, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', recurring: 'weekly' }];
      setClassesView('tiles'); switchView('classes')`);
  });
  afterAll(() => { app('setClassesSort("subject")'); vi.useRealTimers(); });

  it('Auswahl neben der Ansicht, Standard „Nach Fach“', () => {
    const sel = document.getElementById('classes-sort');
    expect([...sel.options].map(o => o.textContent)).toEqual(['Nach Fach', 'Als Nächstes', 'Nach Klasse', 'Auffällige zuerst']);
    expect(sel.value).toBe('subject');
    expect(headings()).toEqual(['Bio', 'Mathe', 'Physik']);
  });
  it('Als Nächstes: laufende/nächste Stunde zuerst, ohne Stunde ans Ende; keine Fach-Überschriften, nächste Stunde in der Kachel', () => {
    app('setClassesSort("next")');
    expect(names()).toEqual(['10a', '5a', '7b', 'Q1']);    // 10a läuft (2. Block 09:45), 5a Di, 7b Mi, Q1 ohne Stunde
    expect(headings()).toEqual(['Als Nächstes']);
    expect(document.querySelector('.class-tile').textContent).toMatch(/jetzt/);
    expect(app('db.settings.classesSort')).toBe('next');
  });
  it('Nach Klasse: Jahrgang, dann Buchstabe, egal welches Fach', () => {
    app('setClassesSort("class")');
    expect(names()).toEqual(['5a', '7b', '10a', 'Q1']);
  });
  it('Auffällige zuerst: meiste Schüler über den Warnschwellen oben, Anzahl als Plakette in der Kachel', () => {
    localStorage.removeItem('warnings_seen');
    app('setClassesSort("warnings")');
    expect(names()).toEqual(['10a', '7b', '5a', 'Q1']);
    expect(document.querySelector('.class-tile .ct-chip.is-watch').textContent).toBe('2 auffällig');
  });
  it('Auffällige als Plakette in allen Ansichten (auch nach Fach, auch in der Liste, AH24 f)', () => {
    localStorage.removeItem('warnings_seen');
    app('setClassesSort("subject")');
    const t7b = [...document.querySelectorAll('.class-tile')].find(t => t.querySelector('.cr-name').textContent === '7b');
    expect(t7b.querySelector('.ct-chip.is-watch').textContent).toBe('1 auffällig');
    expect([...document.querySelectorAll('.class-tile')].find(t => t.querySelector('.cr-name').textContent === '5a').querySelector('.ct-chip')).toBeNull();
    app('setClassesView("list")');
    const r7b = [...document.querySelectorAll('.class-row')].find(t => t.querySelector('.cr-name').textContent === '7b');
    expect(r7b.querySelector('.cr-meta .ct-chip.is-watch').textContent).toBe('1 auffällig');
    app('setClassesView("tiles")');
  });
  it('Standard wird nicht gespeichert; Wert aus der Cloud wird übernommen', () => {
    app('setClassesSort("subject")');
    expect('classesSort' in app('db.settings')).toBe(false);
    app('db.settings.classesSort = "class"; renderSubjectGroups()');
    expect(document.getElementById('classes-sort').value).toBe('class');
    expect(names()).toEqual(['5a', '7b', '10a', 'Q1']);
  });
});

// Restzeit/„jetzt“ in der großen Kachel laufen mit der Uhr (Regel 21), gezeichnet wird nur bei neuem Inhalt (AH3)
describe('AH14: große Kachel folgt der Uhr', () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    app(`db.groups = [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50 }];
      db.students = { g1: [] }; db.acknowledgedWarnings = {};
      db.lessonSlots = [{ id: 'l1', day: 0, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', recurring: 'weekly' }]`);
  });
  afterAll(() => { app('setClassesView("tiles")'); vi.useRealTimers(); });
  it('neue Minute → neue Restzeit; gleiche Minute → Kachel bleibt dieselbe', () => {
    vi.setSystemTime(new Date(2026, 10, 2, 8, 0, 0));
    app('setClassesView("large"); switchView("classes")');
    const when = () => document.querySelector('.class-tile .ct-when').textContent;
    expect(when()).toMatch(/noch 75 Min/);
    const tile = document.querySelector('.class-tile');
    vi.setSystemTime(new Date(2026, 10, 2, 8, 0, 30));
    app('timetableClockMinute = ""; refreshTimetableClock()');
    expect(document.querySelector('.class-tile')).toBe(tile);
    vi.setSystemTime(new Date(2026, 10, 2, 8, 1, 0));
    app('timetableClockMinute = ""; refreshTimetableClock()');
    expect(when()).toMatch(/noch 74 Min/);
  });
});

// Kacheln: „auffällig“ und Klassennotiz in einer Reihe gleicher Plaketten, jede mit Symbol darin (03.11.: vorher
// unterschiedlich eingerückt untereinander)
describe('Kacheln: Plaketten in einer Reihe', () => {
  beforeAll(() => {
    app(`db.groups = [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50,
        classNotes: [{ id: 'n1', text: 'Buch vergessen', date: '2026-11-02' }] }];
      db.students = { g1: [{ id: 's1', firstName: 'A', lastName: 'B', grades: [], participation: [], homework: [], studentNotes: [],
        attendance: [{ id: 'a1', date: '2026-10-20', type: 'abwesend' }, { id: 'a2', date: '2026-10-21', type: 'abwesend' }] }] };
      db.settings.warnAbsences = 2; db.acknowledgedWarnings = {}; db.lessonSlots = [];
      localStorage.removeItem('warnings_seen');
      setClassesView('tiles'); setClassesSort('subject'); switchView('classes')`);
  });
  it('eine Zeile, beide als .ct-chip mit Symbol, Notiz nach „auffällig“', () => {
    const tile = document.querySelector('.class-tile');
    const rows = tile.querySelectorAll('.ct-chips');
    expect(rows.length).toBe(1);
    const chips = [...rows[0].children];
    expect(chips.map(c => c.textContent)).toEqual(['1 auffällig', 'Buch vergessen']);
    expect(chips.every(c => c.classList.contains('ct-chip') && c.querySelector('svg'))).toBe(true);
    expect(rule('.ct-chips .cn-chip')).toMatch(/font-size:13px;padding:3px 9px;/);
  });
});

// Groß: „wann“ in einer eigenen Box (Wunsch 03.11.)
describe('Groß: Zeit in einer Box', () => {
  it('Kartenfläche mit Rand in Klassenfarbe, nur so breit wie der Text; „Keine Stunde geplant“ ohne Box', () => {
    expect(rule('.ct-when')).toMatch(/display:inline-flex;align-self:flex-start;/);
    expect(rule('.ct-when')).toMatch(/background:var\(--bg-elevated\);border:1px solid color-mix\(in srgb, var\(--card-color\) 40%, transparent\);/);
    expect(rule('.ct-when')).toMatch(/border-radius:var\(--radius-sm\)/);
    expect(rule('.ct-when.is-none')).toMatch(/background:none;/);
  });
});
