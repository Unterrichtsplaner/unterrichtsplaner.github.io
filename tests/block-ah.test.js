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
