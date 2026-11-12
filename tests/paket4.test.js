// Gesamtprüfung 11.11.2026, Paket 4: Schülerapp. AT2, AT4, AT5, AT6, AT7, AT8.
const { loadApp, loadScript, app } = require('./helpers/load-app');
const { createFakeFirebase } = require('./helpers/fake-firebase');

const CLASS = 'K'.repeat(22), ANNA = 'A'.repeat(22), BEN = 'B'.repeat(22), OTHER = 'O'.repeat(22);
const P = (id, date, value) => ({ id, date, value });
function sampleDB() {
  return {
    settings: { teacherName: 'Erika Testmann', blocks: null, studentApp: { on: true } },
    lessonSlots: [{ id: 's1', day: 0, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', color: '#6366f1', recurring: 'weekly' }],
    lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#6366f1', schularbeitWeight: 50,
      studentApp: { on: true, access: { id: CLASS, key: 'k'.repeat(43) }, personal: { on: true, step: 15 } } }],
    students: { g1: [
      { id: 'a', firstName: 'Anna', lastName: 'A', grades: [], attendance: [], homework: [], studentNotes: [], participation: [P('p1', '2026-11-02', 'positive')],
        studentApp: { access: { id: ANNA, key: 'a'.repeat(43) } } },
      { id: 'b', firstName: 'Ben', lastName: 'B', grades: [], attendance: [], homework: [], studentNotes: [], participation: [],
        studentApp: { access: { id: BEN, key: 'b'.repeat(43) } } },
    ] },
  };
}
let cloud;
const SM = () => app('SyncManager');
const publish = force => app(`publishStudentApps(${force ? 'true' : ''})`);
const studentTakes = id => { cloud.shares[id] = { format: 1, iv: 'x', data: 'gefälscht', owner: 'schueler', updated: 1 }; };

beforeAll(() => {
  const fake = createFakeFirebase();
  globalThis.firebase = fake.firebase;
  cloud = fake.cloud;
  loadScript('lib/crypto-js.min.js');
  loadScript('crypto-helper.js');
  loadScript('sync-manager.js');
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
  SM().init({ apiKey: 'test' });
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 9, 10, 0));
  Object.assign(cloud, { store: {}, shares: {}, shareWrites: 0, shareDenied: false, shareUid: 'u1', versions: {} });
  SM().currentUser = { uid: 'u1', email: 'l@example.org' };
  app('db = migrateDB(' + JSON.stringify(sampleDB()) + ')');
  Object.keys(localStorage).filter(k => k.startsWith('sa_')).forEach(k => localStorage.removeItem(k));
  app('clearTimeout(saPublishTimer); saPublishTimer = null; saPendingAt = null; saPublishing = false; saPublishAgain = false; studentAppProblem = null');
});
afterEach(() => { app('clearTimeout(saPublishTimer); saPublishTimer = null'); vi.useRealTimers(); });

describe('AT2: Ausschalten gibt die Kennung nicht frei', () => {
  it('Klassenseite aus: Dokument bleibt im eigenen Konto, ohne Inhalt; ein Schüler kann es nicht übernehmen', async () => {
    await publish();
    expect(cloud.shares[CLASS].owner).toBe('u1');
    app('setStudentAppOn("g1", false)');
    await publish();
    expect(cloud.shares[CLASS]).toMatchObject({ owner: 'u1', format: 0, data: '' });
    expect(cloud.shares[ANNA]).toMatchObject({ owner: 'u1', format: 0, data: '' });
    // Schüler versucht, die Seite zu übernehmen: Regel „Besitzer bleibt gleich“
    await expect(firebase.firestore().collection('shares').doc(CLASS).set({ format: 1, iv: 'x', data: 'y', owner: 'schueler', updated: 1 })).rejects.toThrow();
    app('setStudentAppOn("g1", true)');
    await publish();
    const page = await app('StudentShare').decrypt(cloud.shares[CLASS], 'k'.repeat(43));
    expect(page.cls).toBe('7b');
  });
  it('neuer Link: der alte bleibt gesperrt statt frei', async () => {
    await publish();
    app('renewStudentAppAccess("g1", true)');
    await publish();
    expect(cloud.shares[CLASS]).toMatchObject({ owner: 'u1', format: 0 });
  });
});

describe('AT4: Eine fremde Seite legt nicht alles lahm', () => {
  it('Seite gehört einem anderen Konto: übrige Seiten gehen trotzdem raus, Meldung nennt den Grund', async () => {
    studentTakes(ANNA);
    await publish();
    expect(cloud.shares[CLASS].owner).toBe('u1');
    expect(cloud.shares[BEN].owner).toBe('u1');
    expect(app('studentAppProblem')).toBe('taken');
    expect(app('studentAppStatusText(studentAppOf(db.groups[0]))')).not.toMatch(/Regeln/);
  });
  it('vorgemerkte Löschung einer fremden Seite klemmt die Warteschlange nicht', async () => {
    studentTakes(OTHER);
    app(`queueShareDeletion(${JSON.stringify(OTHER)})`);
    await publish();
    expect(cloud.shares[CLASS].owner).toBe('u1');
    expect(JSON.parse(localStorage.getItem('sa_delete_queue') || '[]')).toEqual([]);
  });
});

describe('AT5: Konto löschen nur, wenn alle Schülerseiten weg sind', () => {
  it('deleteAllStudentShares löscht wirklich, versucht jede Seite und meldet Fehler', async () => {
    await publish();
    const orig = SM().deleteShare;
    SM().deleteShare = async function (id) {   // Annas Seite: Verbindung bricht ab
      if (id === ANNA) throw Object.assign(new Error('offline'), { code: 'unavailable' });
      return orig.call(this, id);
    };
    try {
      const ok = await app('deleteAllStudentShares()');
      expect(ok).toBe(false);
      expect(cloud.shares[CLASS]).toBeUndefined();
      expect(cloud.shares[BEN]).toBeUndefined();
      expect(JSON.parse(localStorage.getItem('sa_delete_queue'))).toEqual([ANNA]);   // bleibt vorgemerkt
    } finally { SM().deleteShare = orig; }
  });
  it('Konto löschen bricht ab, solange Seiten übrig sind', async () => {
    await publish();
    SM().reauthenticate = async () => {};
    const del = SM().deleteAccount = vi.fn(async () => {});
    const orig = SM().deleteShare;
    SM().deleteShare = async () => { throw Object.assign(new Error('offline'), { code: 'unavailable' }); };
    globalThis.alert = vi.fn();
    try {
      app('syncRunning = false; accountDeleteChoice = "keep"');
      SM().usesPasswordLogin = () => false;
      await app('confirmDeleteAccount()');
      expect(del).not.toHaveBeenCalled();
      expect(globalThis.alert.mock.calls[0][0]).toMatch(/nicht gelöscht/);
    } finally { SM().deleteShare = orig; app('syncRunning = false; accountDeleting = false'); }
  });
  it('Seite gehört einem anderen Konto: zählt nicht als übrig (lässt sich nie löschen)', async () => {
    await publish();
    studentTakes(ANNA);
    expect(await app('deleteAllStudentShares()')).toBe(true);
  });
  it('alles gelöscht: true', async () => {
    await publish();
    expect(await app('deleteAllStudentShares()')).toBe(true);
    expect(Object.keys(cloud.shares)).toEqual([]);
  });
});

describe('AT6: Sicherung laden behält die Schülerapp-Links', () => {
  beforeEach(() => {
    const m = new Map();
    globalThis.syncStoreForTest = { get: async k => m.get(k), put: async (k, v) => { m.set(k, v); }, clear: async () => m.clear() };
    app('syncStore = globalThis.syncStoreForTest');
    globalThis.confirm = () => true;
  });
  it('Klasse und Schüler behalten ihre jetzigen Zugänge; weggefallene werden gesperrt, alte aus der Sicherung nicht wiederbelebt', async () => {
    const backup = sampleDB();
    backup.groups[0].studentApp.access = { id: 'X'.repeat(22), key: 'x'.repeat(43) };   // alter, längst ersetzter Link
    backup.students.g1 = [backup.students.g1[0]];   // Ben gab es damals noch nicht
    backup.students.g1[0].studentApp.access = { id: 'Y'.repeat(22), key: 'y'.repeat(43) };
    backup.groups.push({ id: 'g2', subject: 'Bio', className: '5a', studentApp: { on: true, access: { id: 'Z'.repeat(22), key: 'z'.repeat(43) } } });
    backup.students.g2 = [];
    await app('importBackup(' + JSON.stringify(backup) + ')');
    expect(app('db.groups[0].studentApp.access.id')).toBe(CLASS);
    expect(app('db.students.g1[0].studentApp.access.id')).toBe(ANNA);
    expect(app('db.groups[1].studentApp.access.id')).not.toBe('Z'.repeat(22));   // gelöschte Klasse: neuer Link
    expect(JSON.parse(localStorage.getItem('sa_delete_queue'))).toContain(BEN);
  });
});

describe('AT7: Schülerseiten nur aus einem abgeglichenen Stand', () => {
  it('Zeitgeber und Verlassen der App schreiben nicht direkt, sondern gleichen erst ab', async () => {
    const calls = [];
    app('globalThis.__origTSI = triggerSyncInternal');
    globalThis.__spy = o => calls.push(o || {});
    app('triggerSyncInternal = globalThis.__spy');
    try {
      app('saPendingAt = Date.now() + 1000');
      app('onAppHidden()');
      expect(cloud.shareWrites).toBe(0);
      expect(calls.length).toBeGreaterThan(0);
      expect(app('saForceAfterSync')).toBe(true);
    } finally { app('triggerSyncInternal = globalThis.__origTSI; saForceAfterSync = false'); }
  });
});

describe('AT8: Keine Fehltage auf der persönlichen Seite', () => {
  it('Jahreskarte: Fehltag leer wie „nichts“, längste Serie trotzdem über den Fehltag', () => {
    app(`db.lessonSlots[0].day = 0`);
    app(`db.students.g1[0].participation = [${['2026-10-19', '2026-11-02'].map((d, i) => `{id:'q${i}',date:'${d}',value:'positive'}`).join(',')}]`);
    app(`db.students.g1[0].attendance = [{ id: 'f1', date: '2026-10-26', type: 'abwesend' }]`);
    const snap = app('studentPersonalSnapshot(db.groups[0], db.students.g1[0], new Date())');
    expect(JSON.stringify(snap.year)).not.toMatch(/"a"/);
    expect(snap.year.find(c => c.date === '2026-10-26').v).toBeNull();
    expect(snap.yearBest).toBe(2);
  });
});
