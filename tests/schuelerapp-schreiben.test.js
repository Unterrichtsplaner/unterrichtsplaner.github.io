// Schülerseiten schreiben sparsam (BUGS AK3): Firestore erlaubt im kostenlosen Tarif 20.000 Schreibvorgänge am Tag für
// das ganze Projekt. Früher schrieb jeder Sync alle geänderten Seiten neu, und weil jede persönliche Seite die ganze
// Klassenseite enthielt, änderte ein Plus alle 25 Seiten einer Klasse.
const { loadApp, app } = require('./helpers/load-app');

const P = (id, date, value) => ({ id, date, value });
function sampleDB() {
  return {
    settings: { teacherName: 'Erika Testmann', blocks: null, studentApp: { on: true } },
    lessonSlots: [{ id: 's1', day: 0, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', color: '#6366f1', recurring: 'weekly' }],
    lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#6366f1', schularbeitWeight: 50,
      studentApp: { on: true, access: { id: 'K'.repeat(22), key: 'k'.repeat(43) }, personal: { on: true, step: 15 }, goal: { target: 100, reward: 'Spiel', since: '2026-09-01' } } }],
    students: { g1: [
      { id: 'a', firstName: 'Anna', lastName: 'A', grades: [], attendance: [], homework: [], studentNotes: [], participation: [P('p1', '2026-11-02', 'positive')],
        studentApp: { access: { id: 'A'.repeat(22), key: 'a'.repeat(43) } } },
      { id: 'b', firstName: 'Ben', lastName: 'B', grades: [], attendance: [], homework: [], studentNotes: [], participation: [],
        studentApp: { access: { id: 'B'.repeat(22), key: 'b'.repeat(43) } } },
    ] },
  };
}
const writes = [];
function stubCloud() {
  const SM = app('SyncManager');
  SM.isInitialized = true; SM.currentUser = { uid: 'u1' };
  SM.publishShare = async id => { writes.push(id); };
  SM.deleteShare = async () => true;
}
const at = (h, m) => vi.setSystemTime(new Date(2026, 10, 9, h, m));
const publish = force => app(`publishStudentApps(${force ? 'true' : ''})`);
const CLASS = 'K'.repeat(22), ANNA = 'A'.repeat(22), BEN = 'B'.repeat(22);

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  at(10, 0);
  app('db = migrateDB(' + JSON.stringify(sampleDB()) + ')');
  Object.keys(localStorage).filter(k => k.startsWith('sa_')).forEach(k => localStorage.removeItem(k));
  app('clearTimeout(saPublishTimer); saPublishTimer = null; saPendingAt = null; saPublishing = false; saPublishAgain = false; studentAppProblem = null');
  stubCloud();
  writes.length = 0;
});
afterEach(() => { app('clearTimeout(saPublishTimer); saPublishTimer = null'); vi.useRealTimers(); });

describe('Persönliche Seite verweist auf die Klassenseite statt sie mitzuschicken', () => {
  it('Auszug enthält Kennung und Schlüssel der Klassenseite, nicht die Klassenseite selbst', () => {
    const snap = app('studentPersonalSnapshot(db.groups[0], db.students.g1[0], new Date())');
    expect(snap.klasse).toBeUndefined();
    expect(snap.klasseRef).toEqual({ id: CLASS, key: 'k'.repeat(43) });
  });
  it('ein Plus ändert nur die Seite dieses Schülers und die Klassenseite (Klassenziel)', async () => {
    await publish();
    expect(writes.sort()).toEqual([ANNA, BEN, CLASS].sort());   // alles neu: sofort
    writes.length = 0;
    at(10, 30);
    app("db.students.g1[0].participation.push({ id: 'p2', date: '2026-11-09', value: 'excellent' })");
    await publish();
    expect(writes.sort()).toEqual([ANNA, CLASS].sort());
  });
});

describe('Geänderte Seiten höchstens alle 10 Minuten', () => {
  it('Änderung kurz nach dem letzten Schreiben: wartet, merkt sich, wann; nach 10 Minuten geht sie raus', async () => {
    await publish();
    writes.length = 0;
    at(10, 3);
    app("db.students.g1[0].participation.push({ id: 'p2', date: '2026-11-09', value: 'excellent' })");
    await publish();
    expect(writes).toEqual([]);
    expect(app('saPendingAt')).toBe(new Date(2026, 10, 9, 10, 10).getTime());
    at(10, 10);
    await publish();
    expect(writes.sort()).toEqual([ANNA, CLASS].sort());
    expect(app('saPendingAt')).toBeNull();
  });
  it('„Jetzt senden“ und Verlassen der App schreiben sofort', async () => {
    await publish();
    writes.length = 0;
    at(10, 2);
    app("db.students.g1[0].participation.push({ id: 'p2', date: '2026-11-09', value: 'excellent' })");
    await publish(true);
    expect(writes.sort()).toEqual([ANNA, CLASS].sort());
    writes.length = 0;
    at(10, 4);
    app("db.students.g1[1].participation.push({ id: 'q1', date: '2026-11-09', value: 'positive' })");
    await publish();
    expect(writes).toEqual([]);
    app('onAppHidden()');
    await vi.waitFor(() => expect(writes.sort()).toEqual([BEN, CLASS].sort()));
  });
  it('neue Seiten (noch nie geschrieben) gehen sofort raus, damit der Code gleich funktioniert', async () => {
    await publish();
    writes.length = 0;
    at(10, 1);
    app("db.students.g1.push({ id: 'c', firstName: 'Cem', lastName: 'C', grades: [], attendance: [], homework: [], studentNotes: [], participation: [] })");
    await publish();
    expect(writes.length).toBe(1);
    expect(writes[0]).not.toBe(CLASS);
  });
  it('unveränderte Seiten werden nie neu geschrieben', async () => {
    await publish();
    writes.length = 0;
    at(11, 0);
    await publish();
    await publish(true);
    expect(writes).toEqual([]);
  });
});

describe('Reiter „Schülerapp“ zeigt, wann die Schüler es sehen', () => {
  it('wartende Änderung: Uhrzeit und Knopf „Jetzt senden“', async () => {
    await publish();
    at(10, 3);
    app("db.students.g1[0].participation.push({ id: 'p2', date: '2026-11-09', value: 'excellent' })");
    await publish();
    expect(app('studentAppStatusText(studentAppOf(db.groups[0]))')).toMatch(/um 10:10 an die Schüler/);
    expect(app('studentAppSendNowHTML()')).toMatch(/Jetzt senden/);
    await publish(true);
    expect(app('studentAppSendNowHTML()')).toBe('');
  });
});
