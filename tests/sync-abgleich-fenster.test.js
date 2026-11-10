// AH4, Nachprüfung: Der Abgleich läuft mit Wartezeiten (Speicher). Was in dieser Zeit passiert, darf nichts kaputt machen.
const { loadApp, loadScript, app } = require('./helpers/load-app');
const { createFakeFirebase } = require('./helpers/fake-firebase');

const PW = 'richtig-geheim', UID = 'lehrer1';
let cloud, fake, store;
const st = (id, f) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] });
const sampleDB = () => ({
  settings: { teacherName: 'T', blocks: null, lastModified: 1000 },
  lessonSlots: [{ id: 'sl1', day: 0, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', recurring: 'weekly' }],
  lessonData: {}, supervisions: [],
  groups: [{ id: 'g1', subject: 'Mathe', className: '7b', schularbeitWeight: 50 }],
  students: { g1: [st('a', 'Anna'), st('b', 'Ben')] },
});
const memoryStore = () => {
  const m = new Map();
  return { m, get: async k => m.get(k), put: async (k, v) => { m.set(k, v); }, clear: async () => m.clear() };
};
const cloudContent = async () => JSON.parse(await app('CryptoHelper').decryptPayload(cloud.store[UID], PW));
async function otherDevice(edit) {
  const d = await cloudContent();
  edit(d);
  cloud.store[UID] = { ...(await app('CryptoHelper').encryptPayload(JSON.stringify(d), PW)), lastModified: cloud.store[UID].lastModified + 1000 };
}
const userEdits = code => { app(code); app('saveDB(); clearTimeout(window.syncTimeout); window.syncTimeout = null'); };
const sync = o => app('triggerSyncInternal')(o);

beforeAll(() => {
  fake = createFakeFirebase();
  globalThis.firebase = fake.firebase;
  cloud = fake.cloud;
  globalThis.alert = vi.fn();
  globalThis.confirm = () => true;
  loadScript('lib/crypto-js.min.js');
  loadScript('crypto-helper.js');
  loadScript('sync-manager.js');
  loadApp();
  app('SyncManager').init({ apiKey: 'test' });
});
beforeEach(async () => {
  cloud.store = {};
  store = memoryStore();
  globalThis.syncStoreForTest = store;
  app('syncStore = globalThis.syncStoreForTest; syncBaseSaved = null');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
  app('window.currentConflict = null; syncQueued = false; syncAfterModalClose = false');
  app('SyncManager').currentUser = { uid: UID };
  app('SyncManager').masterPassword = PW;
  app(`replaceDB(migrateDB(${JSON.stringify(sampleDB())}))`);
  app('newCloudPasswordConfirmed = () => true');
  await sync();
  await vi.waitFor(() => expect(app('syncRunning')).toBe(false));
});

describe('Fenster öffnet sich, während der Abgleich auf den Speicher wartet', () => {
  it('Stand wird nicht getauscht; nach dem Schließen läuft der Abgleich', async () => {
    await otherDevice(d => { d.students.g1[1].studentNotes.push({ text: 'Cloud', date: '2026-11-01' }); });
    userEdits('db.students.g1[0].studentNotes.push({ text: "Gerät", date: "2026-11-02" })');
    const realGet = store.get;
    store.get = async k => { document.getElementById('modal-add-group')?.classList.remove('hidden'); return realGet(k); };
    const before = app('db');
    await sync();
    store.get = realGet;
    expect(app('db')).toBe(before);
    expect(app('syncAfterModalClose')).toBe(true);
    document.getElementById('modal-add-group').classList.add('hidden');
    app('syncAfterModalClose = false');
    await sync();
    await vi.waitFor(() => expect(app('syncRunning')).toBe(false));
    await sync();
    await vi.waitFor(() => expect(app('syncRunning')).toBe(false));
    const names = (await cloudContent()).students.g1.flatMap(s => s.studentNotes.map(n => n.text));
    expect(names.sort()).toEqual(['Cloud', 'Gerät']);
  });
});

describe('Speicher kaputt', () => {
  it('Speichern scheitert beim Übernehmen: Stand bleibt, nichts wird hochgeladen', async () => {
    await otherDevice(d => { d.students.g1[1].studentNotes.push({ text: 'Cloud', date: '2026-11-01' }); });
    userEdits('db.students.g1[0].studentNotes.push({ text: "Gerät", date: "2026-11-02" })');
    const before = app('db'), written = cloud.store[UID].lastModified;
    app('window.__p = persistDB; persistDB = () => false');
    await sync();
    app('persistDB = window.__p');
    expect(app('db')).toBe(before);
    expect(cloud.store[UID].lastModified).toBe(written);
  });
  it('Speicher antwortet nie: Abgleich läuft nach der Zeitgrenze weiter (Fenster mit dem ganzen Stand), Sync bleibt nicht hängen', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const realIDB = globalThis.indexedDB;
    globalThis.indexedDB = { open: () => ({}) };
    const p = app('idbRequest')('readonly', s => s.get('x'));
    let failed = null;
    p.catch(e => { failed = e; });
    await vi.advanceTimersByTimeAsync(app('IDB_TIMEOUT_MS') + 1);
    expect(failed).not.toBeNull();
    globalThis.indexedDB = realIDB;
    vi.useRealTimers();
  });
  it('Fehler beim Öffnen der Transaktion landet als Fehler beim Aufrufer', async () => {
    const realIDB = globalThis.indexedDB;
    const open = {};
    globalThis.indexedDB = { open: () => { setTimeout(() => { open.result = { transaction() { throw new Error('kaputt'); }, close() {} }; open.onsuccess(); }, 0); return open; } };
    await expect(app('idbRequest')('readonly', s => s.get('x'))).rejects.toThrow(/kaputt/);
    globalThis.indexedDB = realIDB;
  });
});

describe('Sicherheitsnetz', () => {
  const rec = (time, tag) => ({ time, uid: UID, local: JSON.stringify({ ...sampleDB(), settings: { teacherName: tag, lastModified: 1 } }), cloud: '{}' });
  it('Gleiche Stände werden nur einmal gemerkt (offene Fragen schieben nichts hinaus)', async () => {
    await app('keepMergeBackup')('A', 'B');
    await app('keepMergeBackup')('A', 'B');
    await app('keepMergeBackup')('C', 'B');
    expect((await store.get('merge_backups')).length).toBe(2);
  });
  it('Auch ältere Stände sind erreichbar', async () => {
    await store.put('merge_backups', [rec(2000, 'neu'), rec(1000, 'alt')]);
    const run = app('restoreMergeBackup')();
    await vi.waitFor(() => expect(document.querySelectorAll('#modal-choice-buttons button').length).toBeGreaterThan(0));
    let buttons = [...document.querySelectorAll('#modal-choice-buttons button')];
    expect(buttons.filter(b => /Auf diesem Gerät/.test(b.textContent)).length).toBe(2);   // zwei Stände des Geräts (dazu evtl. Cloud-Sicherungen, Z4)
    buttons[1].click();
    await vi.waitFor(() => expect(document.getElementById('modal-choice-title').textContent).toBe('Stand vor dem Zusammenführen'));
    buttons = [...document.querySelectorAll('#modal-choice-buttons button')];
    buttons[0].click();               // Stand dieses Geräts
    await run;
    expect(app('db.settings.teacherName')).toBe('alt');
  });
  it('Stände eines anderen Kontos werden nicht angeboten', async () => {
    await store.put('merge_backups', [{ ...rec(2000, 'fremd'), uid: 'jemand' }]);
    document.getElementById('merge-restore-row').classList.remove('hidden');
    const pw = app('SyncManager').masterPassword;
    app('SyncManager').masterPassword = '';   // ohne Cloud: nur Stände dieses Kontos zählen
    await app('refreshMergeRestoreButton')();
    expect(document.getElementById('merge-restore-row').classList.contains('hidden')).toBe(true);
    app('SyncManager').masterPassword = pw;
  });
});
