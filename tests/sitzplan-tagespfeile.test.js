// Sitzplan: Pfeile ↑/↓ zur vorigen/nächsten Stunde mit einer anderen Klasse (BUGS BE10, Variante A im Kopf):
// am selben Tag, über das Tagesende hinaus zum nächsten/vorigen Schultag; Ausfall zählt nicht; welche Stunde einer
// Klasse gemeint ist, merkt sich die App (zwei Stunden derselben Klasse am Tag).
const { loadApp, app } = require('./helpers/load-app');

const once = (id, gid, date, day, block) => ({ id, day, block, part: 'full', subject: 'X', color: '#3b82f6', groupId: gid, recurring: 'none', specificDate: date });
const G = (id, cls, subject) => ({ id, subject, className: cls, color: '#3b82f6', schularbeitWeight: 50 });
const st = id => ({ id, firstName: id, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    // Mo 16.11.: 10a 1. Block, 9c 2. Block, 10a 3. Block · Di 17.11.: 8b 1. Block
    lessonSlots: [once('a1', 'g10a', '2026-11-16', 0, 1), once('c2', 'g9c', '2026-11-16', 0, 2), once('a3', 'g10a', '2026-11-16', 0, 3),
      once('b1', 'g8b', '2026-11-17', 1, 1)],
    lessonData: {}, supervisions: [],
    groups: [G('g10a', '10a', 'Musik'), G('g9c', '9c', 'Musik'), G('g8b', '8b', 'Physik')],
    students: { g10a: [st('s1')], g9c: [st('s2')], g8b: [st('s3')] },
  };
}
const up = () => document.getElementById('btn-seating-up');
const down = () => document.getElementById('btn-seating-down');
const where = () => app('[currentSeatingGroupId, currentSeatingDateStr]');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 16, 8, 0));   // Mo 16.11., 1. Block läuft
  app('replaceDB(migrateDB(' + JSON.stringify(sampleDB()) + '))');
  app('seatingDayAnchor = null');
  app('openSeatingForGroup("g10a", "2026-11-16")');
});
afterEach(() => vi.useRealTimers());

describe('BE10: Pfeile ↑/↓ im Sitzplan-Kopf', () => {
  it('Knöpfe stehen neben ‹ ›, mit Klasse und Namen für VoiceOver', () => {
    expect(document.getElementById('btn-seating-next').parentElement.contains(down())).toBe(true);
    expect(down().textContent).toContain('9c');
    expect(down().getAttribute('aria-label')).toMatch(/Nächste Stunde: 9c Musik/);
    expect(up().disabled).toBe(true);   // davor gibt es keine Stunde
  });
  it('↓ zur nächsten Klasse am Tag, wieder ↓ zur zweiten Stunde der 10a, dann zum nächsten Schultag', () => {
    app('seatingStepDay(1)');
    expect(where()).toEqual(['g9c', '2026-11-16']);
    app('seatingStepDay(1)');
    expect(where()).toEqual(['g10a', '2026-11-16']);
    expect(down().textContent).toMatch(/8b/);   // gemerkt: die 10a im 3. Block, nicht die im 1.
    expect(up().textContent).toMatch(/9c/);
    app('seatingStepDay(1)');
    expect(where()).toEqual(['g8b', '2026-11-17']);
    expect(down().disabled).toBe(true);
    app('seatingStepDay(-1)');
    expect(where()).toEqual(['g10a', '2026-11-16']);   // letzte Stunde des Vortags
    app('seatingStepDay(-1)');
    expect(where()).toEqual(['g9c', '2026-11-16']);
  });
  it('anderer Tag: Leiste zeigt die gemerkte Stunde (3. Block), nicht die erste der Klasse', () => {
    vi.setSystemTime(new Date(2026, 10, 13, 9, 0));   // Fr davor: der 16.11. ist ein anderer Tag
    app('openSeatingForGroup("g9c", "2026-11-16")');
    app('seatingStepDay(1)');
    expect(where()).toEqual(['g10a', '2026-11-16']);
    expect(document.getElementById('seating-cockpit').textContent).toMatch(/3\. Block/);
  });
  it('ausgefallene Stunden zählen nicht, dieselbe Klasse wird übersprungen', () => {
    app('db.lessonData["c2_2026-11-16"] = { ausfall: true }; renderSeatingPlan()');
    expect(down().textContent).toMatch(/8b/);
    app('seatingStepDay(1)');
    expect(where()).toEqual(['g8b', '2026-11-17']);
  });
  it('Klasse ohne Stunde an dem Tag: ↓ zur ersten Stunde des Tages', () => {
    app('openSeatingForGroup("g8b", "2026-11-16")');
    app('seatingStepDay(1)');
    expect(where()).toEqual(['g10a', '2026-11-16']);
  });
  it('Klassenname wird escaped (Regel 3)', () => {
    app('db.groups[1].className = "<img data-xss src=x>"; renderSeatingPlan()');
    expect(document.querySelector('.seating-date-nav [data-xss]')).toBeNull();
    expect(down().textContent).toContain('<img data-xss src=x>');
  });
});
