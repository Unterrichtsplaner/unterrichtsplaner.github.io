// Gesamtprüfung 11.11.2026, Paket 1: AQ3, AP1, AS1, AT1, AT3, AU1, AU2.
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');

const st = (id, n) => ({ id, firstName: n, lastName: 'X', grades: [{ type: 'test', value: '2.0', date: '2026-11-02', note: '' }], attendance: [], participation: [], homework: [], studentNotes: [] });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [
      { id: 'weg', day: 2, block: 1, part: 'full', subject: 'Mathe', color: '#3b82f6', groupId: 'gelöscht', recurring: 'weekly' },
      { id: 'a', day: 3, block: 1, part: 'full', subject: 'Mathe', color: '#3b82f6', groupId: 'g1', recurring: 'weekly' },
    ],
    lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50 }],
    students: { g1: [st('s1', 'Anna')] },
  };
}
const ROOT = path.join(__dirname, '..');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 11, 8, 0));   // Mi 1. Stunde: Stunde der gelöschten Klasse läuft
  app('replaceDB(' + JSON.stringify(sampleDB()) + ')');
});
afterEach(() => { app('switchView("dashboard")'); vi.useRealTimers(); });

describe('AQ3: Stunde einer gelöschten Klasse läuft', () => {
  it('Vorschlag nennt nur vorhandene Klassen', () => {
    expect(app('getSuggestedSeatingGroupId()')).toBeNull();
  });
  it('Stundenplan „Klasse“ zeichnet ohne Absturz die vorhandene Klasse', () => {
    app('timetableClassGroupId = null; switchView("timetable"); setTimetableMode("class")');
    expect(document.getElementById('ttc-group').value).toBe('g1');
    app('setTimetableMode("week")');
  });
});

describe('AP1: Einstellungen offen, Abgleich übernimmt einen Stand mit eigener Farbe', () => {
  afterEach(() => app('closeModal("modal-settings")'));
  it('das Fenster zeigt danach den neuen Stand, Speichern schreibt nichts Altes zurück', () => {
    app('openSettings()');
    expect(document.getElementById('settings-teacher-name').value).toBe('T');
    const cloud = sampleDB();
    cloud.settings.teacherName = 'Aus der Cloud';
    cloud.settings.themeBg = '#14120f'; cloud.settings.themeCard = '#211e19'; cloud.settings.themeAccent = '#c2410c';
    cloud.settings.holidays = [{ id: 'h', label: 'Herbstferien', from: '2026-10-26', until: '2026-10-30' }];
    app('replaceDB(' + JSON.stringify(cloud) + ')');
    expect(document.getElementById('settings-teacher-name').value).toBe('Aus der Cloud');
    app('saveSettings()');
    expect(app('db.settings.holidays.length')).toBe(1);
    expect(app('db.settings.teacherName')).toBe('Aus der Cloud');
  });
});

describe('AS1: Verlassen der App verbirgt Noten im Sitzplan und im Schüler-Fenster', () => {
  afterEach(() => app('closeModal("modal-seating-student")'));
  it('Noten, Mitarbeit-Verlauf und aufgedecktes Schüler-Fenster sind nach dem Zurückkommen wieder verborgen', () => {
    app('openSeatingForGroup("g1", "2026-11-11")');
    app('toggleSeatingGrades()');
    expect(document.querySelector('.seating-card .sc-gpa')).not.toBeNull();
    app('openSeatingStudentModal("s1", "g1", "2026-11-11"); revealSeatingStudent()');
    expect(app('swShown')).toBe(true);
    app('onAppHidden()');
    expect(app('seatingShowGrades')).toBe(false);
    expect(app('seatingShowTrend')).toBe(false);
    expect(document.querySelector('.seating-card .sc-gpa')).toBeNull();
    expect(app('swShown')).toBe(false);
    expect(document.getElementById('sw-more').classList.contains('is-veiled')).toBe(true);
  });
});

describe('AT3: Blocknummer aus den Daten im Klick-Befehl der leeren Zelle', () => {
  it('wird als Text übergeben, nicht als Befehl ausgeführt', () => {
    const d = sampleDB();
    d.lessonSlots = [];
    d.settings.blocks = [{ num: '1);window.__xss=1;(', start: '08:00', end: '08:45', label: 'Präpariert' }];
    app('replaceDB(' + JSON.stringify(d) + ')');
    app('switchView("timetable"); setTimetableMode("week")');
    const cells = [...document.querySelectorAll('.tt-empty-cell')];
    expect(cells.length).toBeGreaterThan(0);
    const code = cells[0].getAttribute('onclick');
    // Den Befehl so ausführen, wie es der Browser täte – mit einer Attrappe für openAddLessonSlot
    const seen = [];
    new Function('openAddLessonSlot', 'window', code)((...a) => seen.push(a), globalThis);
    expect(globalThis.__xss).toBeUndefined();
    expect(seen[0][1]).toBe('1);window.__xss=1;(');
  });
});

describe('AU1: Schrift Inter kommt aus der App, nicht von Google', () => {
  const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  it('style.css lädt nichts von fremden Servern', () => {
    expect(css).not.toMatch(/@import|googleapis|gstatic|url\(['"]?https?:/);
  });
  it('die Schriftdateien liegen in lib/fonts, mit Lizenz, und sind offline im Cache', () => {
    const files = [...css.matchAll(/url\('(lib\/fonts\/inter-[^']+)'\)/g)].map(m => m[1]);
    expect(files).toEqual(['lib/fonts/inter-latin-ext-wght.woff2', 'lib/fonts/inter-latin-wght.woff2']);
    files.forEach(f => {
      const buf = fs.readFileSync(path.join(ROOT, f));
      expect(buf.subarray(0, 4).toString()).toBe('wOF2');
      expect(sw).toContain(`'./${f}'`);
    });
    expect(fs.existsSync(path.join(ROOT, 'lib/fonts/INTER-OFL.txt'))).toBe(true);
    expect(fs.readFileSync(path.join(ROOT, 'lib/LIZENZEN.txt'), 'utf8')).toMatch(/Inter .*Open Font License/);
  });
});

describe('AU2: Datenschutzhinweise nennen die Cloud-Sicherungen', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const priv = html.slice(html.indexOf('id="modal-privacy"'), html.indexOf('<h3>Aufruf der App</h3>'));
  it('Sicherungen, Frist und Löschen stehen drin', () => {
    expect(priv).toMatch(/Sicherung vom Beginn jedes Tages der letzten 14 Tage/);
    expect(priv).toMatch(/älter als 14 Tage sind, löscht sie/);
    expect(priv).toMatch(/gelöschte Einträge .* noch in den Sicherungen/);
    expect(priv).toMatch(/entfernen auch alle Sicherungen/);
  });
});
