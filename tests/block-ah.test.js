// Rückmeldungen 03.11.2026 (BUGS AH)
const fs = require('fs');
const path = require('path');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

describe('AH1: App vom Home-Bildschirm füllt das iPad', () => {
  it('als Home-Bildschirm-App: #app so hoch wie der Bildschirm, Rand in App-Farbe', () => {
    const block = CSS.match(/@media \(display-mode: standalone\)\{([\s\S]*?)\n\}/);
    expect(block).not.toBeNull();
    expect(block[1]).toMatch(/html,body\{background:var\(--bg-primary\);\}/);
    expect(block[1]).toMatch(/#app\{height:100%;\}/);
    // muss nach der Grundregel mit 100dvh stehen, sonst gewinnt die
    expect(CSS.indexOf('@media (display-mode: standalone)')).toBeGreaterThan(CSS.indexOf('height:100dvh'));
  });
  it('mit Seitenleiste: Ansichten bis unten, nur die Leiste hält Abstand zum Home-Balken (nach den Grundregeln)', () => {
    const i = CSS.indexOf('#sidebar,#sidebar.collapsed{padding-bottom:env(safe-area-inset-bottom);}');
    expect(i).toBeGreaterThan(-1);
    expect(CSS.slice(CSS.lastIndexOf('@media', i), i)).toMatch(/@media \(min-width: 601px\)\{\s*#app\{padding-bottom:0;\}/);
    expect(i).toBeGreaterThan(CSS.indexOf('#sidebar.collapsed { width: 88px; padding: 0; }'));
    expect(i).toBeGreaterThan(CSS.search(/#sidebar\{width:var\(--sidebar-width\)/));
  });
});

// Zweiter Anlauf (AH1b), im iPad-Simulator (iOS 26) gemessen: Mit „black-translucent“ liegt die Seite unter der
// Statusleiste, ist aber um deren Höhe zu kurz (unten ein Streifen, den keine Seite erreicht), und iOS legt einen
// Schleier über die Statusleiste. Ohne den Meta-Tag beginnt die Seite unter der Statusleiste und reicht bis unten.
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const { loadApp, app } = require('./helpers/load-app');
describe('AH1b: Statusleiste über der Seite', () => {
  it('kein „black-translucent“, Statusleisten-Farbe über theme-color', () => {
    expect(HTML).not.toMatch(/apple-mobile-web-app-status-bar-style/);
    expect(HTML).toMatch(/<meta name="theme-color"/);
    expect(HTML).toMatch(/viewport-fit=cover/);   // Home-Balken unten weiter über safe-area
  });
  it('feste Kante oben in App-Farbe, damit iOS keinen Schleier über den Rand legt', () => {
    expect(HTML).toMatch(/<div id="top-edge" aria-hidden="true"><\/div>/);
    const block = CSS.match(/@media \(display-mode: standalone\)\{([\s\S]*?)\n\}/)[1];
    expect(block).toMatch(/#top-edge\{display:block;position:fixed;top:0;left:0;right:0;height:max\(env\(safe-area-inset-top\),6px\)/);
  });
});

// AH3b: „falsche Minuten“. Eine Stunde aus der Zeit mit Doppelstunden ist noch als „2. Hälfte“ gespeichert. In einer
// Einzelstunde zeigt der Stundenplan sie als ganze Stunde (AA2), Restzeit und Cockpit rechneten aber mit der halben.
describe('AH3b: einzelne Hälfte in einer Einzelstunde zählt wie eine ganze', () => {
  beforeAll(() => {
    loadApp();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 10, 8, 10));   // Di 10.11.2026, 08:10
    app(`db.settings.blocks = [{ num: 1, label: '1. Stunde', start: '08:00', end: '08:45' }, { num: 2, label: '2. Stunde', start: '08:50', end: '09:35' }];
      db.groups = [{ id: 'g1', subject: 'Mathe', className: '7a', schularbeitWeight: 50 }]; db.students = { g1: [] };
      db.lessonSlots = [{ id: 'h', day: 1, block: 1, part: 'second', subject: 'Mathe', groupId: 'g1', recurring: 'weekly' },
                        { id: 'f', day: 1, block: 2, part: 'first', subject: 'Mathe', groupId: 'g1', recurring: 'weekly' }]`);
  });
  afterAll(() => vi.useRealTimers());
  it('Zeiten über den ganzen Block', () => {
    const l = app('lessonsOnDate("2026-11-10")');
    expect(l.map(x => x.range)).toEqual([{ start: 480, end: 525 }, { start: 530, end: 575 }]);
  });
  it('Cockpit: läuft schon, noch 35 Min', () => {
    const info = app('seatingCockpitInfo("g1", "2026-11-10")');
    expect(info.running).toBe(true);
    expect(info.minsLeft).toBe(35);
  });
  it('Stundenplan-Kachel: „noch 35 min“', () => {
    app('switchView("timetable"); renderTimetable()');
    expect(document.getElementById('view-timetable').textContent).toContain('noch 35 min');
  });
  it('echte Hälften in einem Doppelblock bleiben halbe Stunden', () => {
    app(`db.settings.blocks = [{ num: 1, label: '1. Block', start: '08:00', end: '09:30' }];
      db.lessonSlots = [{ id: 'a', day: 1, block: 1, part: 'first', subject: 'Mathe', groupId: 'g1', recurring: 'weekly' }]`);
    expect(app('lessonsOnDate("2026-11-10")')[0].range).toEqual({ start: 480, end: 525 });
  });
});

// AH1c: Ohne black-translucent nimmt iOS für die Statusleiste die Farbe beim ersten Zeichnen. Online lief app.js dafür
// zu spät: Leiste beige (Grundfarbe aus style.css) statt Eisblau. Das Skript im <head> setzt die Farben jetzt selbst.
describe('AH1c: Farben schon vor dem ersten Zeichnen', () => {
  const headScript = HTML.match(/<head>[\s\S]*?<script>([\s\S]*?)<\/script>/)[1];
  const run = settings => {
    const root = document.documentElement;
    root.removeAttribute('style'); root.setAttribute('data-theme', 'light');
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
    meta.content = '#bfdbfe';
    if (settings) localStorage.setItem('lehrerapp_v3', JSON.stringify({ settings })); else localStorage.removeItem('lehrerapp_v3');
    new Function(headScript)();
    return { bg: root.style.getPropertyValue('--bg-primary'), sidebar: root.style.getPropertyValue('--sidebar-bg'),
      card: root.style.getPropertyValue('--bg-card'), mode: root.getAttribute('data-theme'), meta: meta.content };
  };
  afterAll(() => localStorage.removeItem('lehrerapp_v3'));
  it('ohne Daten und mit Standardfarbe: Eisblau, hell', () => {
    expect(run(null)).toEqual({ bg: '#bfdbfe', sidebar: '#bfdbfe', card: '#dbeafe', mode: 'light', meta: '#bfdbfe' });
    expect(run({ theme: 'dark' })).toMatchObject({ bg: '#bfdbfe', mode: 'light' });          // Standard ist immer hell
    expect(run({ themeBg: '#0f1117', theme: 'dark' })).toMatchObject({ bg: '#bfdbfe', mode: 'light' });   // altes Dunkel-Standard
  });
  it('eigene Farbe: wie app.js (applyThemePreview)', () => {
    expect(run({ themeBg: '#1e293b', themeCard: '#334155', theme: 'dark' }))
      .toEqual({ bg: '#1e293b', sidebar: '#1e293b', card: '#334155', mode: 'dark', meta: '#1e293b' });
    expect(run({ themeBg: '#fde68a' })).toMatchObject({ bg: '#fde68a', mode: 'dark', card: '' });
  });
});

// AH6: Sitzplan, untere Leiste (Timer) auf derselben Höhe wie die Linie über „Einstellungen“. Seit AH1 hält die
// Seitenleiste Abstand zum Home-Balken; die Leiste im Sitzplan muss denselben Abstand bekommen.
describe('AH6: Linie der Sitzplan-Leiste = Linie über „Einstellungen“', () => {
  it('ab 601 px: Leiste um den Home-Balken höher, nach den übrigen Regeln', () => {
    const rule = '.seating-tools-bar{min-height:calc(80px + env(safe-area-inset-bottom));padding-top:8px;padding-bottom:calc(8px + env(safe-area-inset-bottom));}';
    const i = CSS.indexOf(rule);
    expect(i).toBeGreaterThan(-1);
    expect(CSS.slice(CSS.lastIndexOf('@media', i), i)).toMatch(/@media \(min-width: 601px\)\{\s*$/);
    expect(i).toBeGreaterThan(CSS.lastIndexOf('.seating-tools-bar { padding: 8px 10px'));
    expect(CSS).toMatch(/\.sidebar-footer\{border-top:1px solid var\(--border\);height:80px;/);
  });
});

// AH7: Geburtstag, den niemand eingetragen hat. Das Datumsfeld stand direkt unter dem Namen: Auf dem iPad springt
// „Weiter“ hinein, iOS öffnet die Datumsauswahl und trägt beim Schließen das heutige Datum ein.
describe('AH7: Geburtstag nur, wenn er stimmen kann', () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 3, 10, 0));
    app(`db.groups = [{ id: 'g1', subject: 'Mathe', className: '7a', schularbeitWeight: 50 }];
      db.students = { g1: [{ id: 's1', firstName: 'Anna', lastName: 'B', birthday: '2026-11-03', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] },
                           { id: 's2', firstName: 'Ben', lastName: 'C', birthday: '2013-05-04', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] }] };
      currentGroupId = 'g1'`);
  });
  afterAll(() => vi.useRealTimers());
  it('Feld steht nicht mehr direkt hinter dem Namen, sondern am Ende', () => {
    const body = HTML.slice(HTML.indexOf('id="modal-add-student"'), HTML.indexOf('saveStudent()'));
    expect(body.indexOf('new-student-birthday')).toBeGreaterThan(body.indexOf('new-student-notes'));
  });
  it('unmögliches Datum (jünger als 3 Jahre) zählt nicht als Geburtstag', () => {
    expect(app('birthdayInfo(db.students.g1[0], "2026-11-03")')).toBeNull();
    expect(app('birthdayInfo(db.students.g1[1], "2026-05-04")')).not.toBeNull();
  });
  it('Speichern mit unmöglichem Datum: Hinweis, nichts gespeichert', () => {
    app('currentStudentId = "s2"; openEditStudent()');
    document.getElementById('new-student-birthday').value = '2026-11-03';
    app('saveStudent()');
    expect(app('db.students.g1[1].birthday')).toBe('2013-05-04');
    expect(document.getElementById('modal-add-student').classList.contains('hidden')).toBe(false);
    app('closeModal("modal-add-student")');
  });
  it('Bearbeiten zeigt einen unmöglichen Geburtstag nicht an', () => {
    app('currentStudentId = "s1"; openEditStudent()');
    expect(document.getElementById('new-student-birthday').value).toBe('');
    app('closeModal("modal-add-student")');
  });
});

// AH11: Mit zwei Fingern ließ sich die ganze App vergrößern (iPad, 03.11.). iOS beachtet „user-scalable=no“ allein
// nicht mehr; das Zusammenziehen meldet es als „gesture…“-Ereignis, das die App abfängt. maximum-scale=1 verhindert
// außerdem das automatische Hineinzoomen beim Tippen in kleine Eingabefelder (iPhone).
describe('AH11: kein Zoomen mit zwei Fingern', () => {
  it('Viewport ohne Zoom', () => {
    const vp = HTML.match(/<meta name="viewport" content="([^"]*)"/)[1];
    expect(vp).toMatch(/maximum-scale=1/);
    expect(vp).toMatch(/user-scalable=no/);
    expect(vp).toMatch(/viewport-fit=cover/);
  });
  it('Zwei-Finger-Geste wird abgefangen', () => {
    for (const type of ['gesturestart', 'gesturechange']) {
      const e = new Event(type, { cancelable: true, bubbles: true });
      document.body.dispatchEvent(e);
      expect(e.defaultPrevented).toBe(true);
    }
  });
});

// AH17: Markieren wie in einer App: Bedienelemente nicht (kein Kopieren-Menü beim langen Drücken auf dem iPad),
// Inhalte und Eingabefelder schon (Entscheidung 03.11.)
describe('AH17: was sich markieren lässt', () => {
  const block = () => CSS.slice(CSS.indexOf('/* Markieren (AH17)'), CSS.indexOf('/* Ende Markieren (AH17) */'));
  it('Grundsatz nicht markierbar, ohne Kopieren-Menü', () => {
    expect(block()).toMatch(/body\{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;\}/);
  });
  it('Inhalte wieder markierbar: Tabellen, Profil, Stunden-Fenster, Heute, Datenschutz, Neuigkeiten, Notizen', () => {
    for (const sel of ['#overview-content', '#modal-student-detail .modal-body', '#modal-lesson .modal-body', '#seating-today-body',
      '#modal-privacy .modal-body', '#modal-whats-new .modal-body', '.cn-chip', '.seating-notes'])
      expect(block()).toContain(sel);
    expect(block()).toMatch(/\{-webkit-user-select:text;user-select:text;-webkit-touch-callout:default;\}/);
  });
  it('Knöpfe auch darin nicht, Eingabefelder immer (danach, damit sie gewinnen)', () => {
    const b = block();
    expect(b.indexOf('button, [role="button"], .tab-btn{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;}')).toBeGreaterThan(b.indexOf('#overview-content'));
    expect(b.indexOf('input, textarea, [contenteditable="true"]{-webkit-user-select:text;user-select:text;-webkit-touch-callout:default;}')).toBeGreaterThan(b.indexOf('button, [role="button"]'));
  });
});
