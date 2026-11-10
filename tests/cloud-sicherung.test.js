// Cloud-Sicherungen (BUGS Z4): Beim ersten Upload eines Tages legt die App den bisherigen Cloud-Stand unverändert
// (schon verschlüsselt) unter users_data/<uid>/versions/<Tag> ab, 14 Tage lang. Ein kleines Verzeichnis (`index`)
// listet die Tage, damit die Auswahl nicht alle großen Dokumente laden muss. Fehlt die Firestore-Regel noch,
// läuft der Sync trotzdem normal weiter.
const { loadApp, loadScript, app } = require('./helpers/load-app');
const { createFakeFirebase } = require('./helpers/fake-firebase');

const PW = 'richtig-geheim';
const UID = 'lehrer1';
let cloud;

const sampleDB = (className, lastModified) => ({
  settings: { teacherName: 'Test', blocks: null, lastModified },
  lessonSlots: [], lessonData: {},
  groups: [{ id: 'g1', subject: 'Mathe', className, schularbeitWeight: 50 }],
  students: { g1: [{ id: 's1', firstName: 'Anna', lastName: 'Muster', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] }] },
});
const day = (d, h = 9) => vi.setSystemTime(new Date(2026, 10, d, h, 0));
const sync = () => app('triggerSyncInternal')();
const edit = name => { app(`db.groups[0].className = ${JSON.stringify(name)}`); app('saveDB(); clearTimeout(window.syncTimeout)'); };
const kept = () => Object.keys(cloud.versions[UID] || {}).filter(k => k !== 'index').sort();
const index = () => (cloud.versions[UID] || {}).index;
const SM = () => app('SyncManager');
const answer = async v => { await vi.waitFor(() => expect(app('typeof choiceResolve === "function"')).toBe(true)); app(`answerChoice(${JSON.stringify(v)})`); };

beforeAll(() => {
  const fake = createFakeFirebase();
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
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  day(2);
  Object.assign(cloud, { store: {}, reads: 0, writes: 0, onNextRead: null, versions: {}, versionWrites: 0, versionsDenied: false });
  Object.keys(localStorage).filter(k => k.startsWith('cloud_version_day_')).forEach(k => localStorage.removeItem(k));
  app('window.currentConflict = null; syncRunning = false; syncQueued = false; syncProblemShown = false; cloudSizeWarned = false');
  app('confirmedNewCloudPassword = ' + JSON.stringify(PW));
  SM().currentUser = { uid: UID, email: 'lehrer@example.org' };
  SM().setMasterPassword(PW);
  SM().versionsProblem = null;
  const m = new Map();
  globalThis.syncStoreForTest = { get: async k => m.get(k), put: async (k, v) => { m.set(k, v); }, clear: async () => m.clear() };
  app('syncStore = globalThis.syncStoreForTest; syncBaseSaved = null');
  app('db = ' + JSON.stringify(sampleDB('1A', 1000)));
  if (app('typeof choiceResolve === "function"')) app('answerChoice(null)');
});
afterEach(() => vi.useRealTimers());

describe('Tägliche Sicherung beim ersten Upload eines Tages', () => {
  it('erster Upload in eine leere Cloud: nichts zu sichern', async () => {
    await sync();
    expect(cloud.writes).toBe(1);
    expect(kept()).toEqual([]);
  });
  it('erster Upload des Tages sichert den bisherigen Cloud-Stand unverändert, weitere Uploads am selben Tag nicht', async () => {
    await sync();
    const before = JSON.parse(JSON.stringify(cloud.store[UID]));
    day(3, 8); edit('1B'); await sync();
    expect(kept()).toEqual(['2026-11-03']);
    expect(cloud.versions[UID]['2026-11-03']).toMatchObject(before);
    expect(index().days).toEqual([{ day: '2026-11-03', savedAt: before.lastModified }]);
    const writes = cloud.versionWrites;
    day(3, 14); edit('1C'); await sync();
    expect(cloud.versionWrites).toBe(writes);   // derselbe Tag: der Stand vom Morgen bleibt
    expect(JSON.parse(await app('CryptoHelper').decryptPayload(cloud.versions[UID]['2026-11-03'], PW)).groups[0].className).toBe('1A');
  });
  it('zweites Gerät am selben Tag überschreibt die Sicherung des Tages nicht', async () => {
    await sync();
    day(3, 8); edit('1B'); await sync();
    localStorage.removeItem('cloud_version_day_' + UID);   // wie ein anderes Gerät ohne Merker
    day(3, 15); edit('1C'); await sync();
    expect(JSON.parse(await app('CryptoHelper').decryptPayload(cloud.versions[UID]['2026-11-03'], PW)).groups[0].className).toBe('1A');
  });
  it('höchstens 14 Tage: ältere werden gelöscht', async () => {
    await sync();
    for (let d = 3; d <= 20; d++) { day(d); edit('K' + d); await sync(); }
    expect(kept().length).toBe(14);
    expect(kept()[0]).toBe('2026-11-07');
    expect(kept()[13]).toBe('2026-11-20');
    expect(index().days.length).toBe(14);
  });
  it('fehlt die Firestore-Regel: Sync läuft trotzdem, Hinweis für die Einstellungen', async () => {
    await sync();
    cloud.versionsDenied = true;
    day(3); edit('1B');
    await sync();
    expect(JSON.parse(await app('CryptoHelper').decryptPayload(cloud.store[UID], PW)).groups[0].className).toBe('1B');
    expect(app('isLocalDBChanged()')).toBe(false);
    expect(SM().versionsProblem).toBe('rules');
  });
});

describe('Lesen, Löschen', () => {
  async function threeDays() {
    await sync();
    day(3); edit('1B'); await sync();
    day(4); edit('1C'); await sync();
  }
  it('Liste der Sicherungen, neueste zuerst, und eine davon entschlüsselt lesen', async () => {
    await threeDays();
    const list = await SM().listCloudVersions();
    expect(list.map(v => v.day)).toEqual(['2026-11-04', '2026-11-03']);
    expect(JSON.parse(await SM().readCloudVersion('2026-11-04')).groups[0].className).toBe('1B');
  });
  it('alle Sicherungen löschen (Cloud leeren, Konto löschen)', async () => {
    await threeDays();
    await SM().deleteCloudVersions();
    expect(cloud.versions[UID]).toEqual({});
  });
  it('Konto löschen nimmt die Sicherungen mit', async () => {
    await threeDays();
    SM().currentUser.delete = async () => {};
    await SM().deleteAccount();
    expect(cloud.versions[UID]).toEqual({});
  });
});

describe('„Früheren Stand zurückholen“ bietet die Cloud-Sicherungen an', () => {
  it('Cloud-Sicherung wählen: ersetzt die Daten, der jetzige Stand liegt vorher im Sicherheitsnetz', async () => {
    await sync();
    day(3); edit('1B'); await sync();
    day(4); edit('1C'); await sync();
    const done = app('restoreMergeBackup()');
    await answer('c2026-11-04');   // Stand vor dem ersten Upload am 04.11. = Klasse 1B
    await answer('yes');
    await done;
    expect(app('db.groups[0].className')).toBe('1B');
    const backups = await app('mergeBackupsOfAccount()');
    expect(JSON.parse(backups[0].local).groups[0].className).toBe('1C');
    expect(backups[0].kind).toBe('restore');
  });
});
