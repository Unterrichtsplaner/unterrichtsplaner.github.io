// Gesamtprüfung 11.11.2026, Paket 17 (grün): Abgleich und Sync-Anzeige. AP11–AP17. Aufbau wie block-z.test.js.
// Wie block-t.test.js: echte sync-manager.js + crypto-helper.js, Firebase als Attrappe.
const { loadApp, loadScript, app } = require('./helpers/load-app');
const { createFakeFirebase } = require('./helpers/fake-firebase');

const PW = 'richtig-geheim';
const UID = 'lehrer1';

let cloud, fake;

function sampleDB(className = '1A', extra = {}) {
  return {
    settings: { teacherName: 'Test', blocks: null, lastModified: 1000 },
    lessonSlots: [{ id: 'sl1', day: 0, block: 1, part: 'full', subject: 'Mathe 1A', groupId: 'g1', recurring: 'weekly' }],
    lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathe', className, schularbeitWeight: 50 }],
    students: { g1: [
      { id: 's1', firstName: 'Anna', lastName: 'Muster', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] },
      { id: 's2', firstName: 'Ben', lastName: 'Beispiel', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] },
    ] },
    ...extra,
  };
}

async function otherDeviceUploads(data, timestamp, password = PW, uid = UID) {
  cloud.store[uid] = {
    ...(await app('CryptoHelper').encryptPayload(JSON.stringify(data), password)),
    lastModified: timestamp,
  };
}
async function cloudContent(password = PW, uid = UID) {
  return JSON.parse(await app('CryptoHelper').decryptPayload(cloud.store[uid], password));
}
function userEdits(code) {
  app(code);
  app('saveDB(); clearTimeout(window.syncTimeout); window.syncTimeout = null');
}
const sync = (opts) => app('triggerSyncInternal')(opts);
const settle = () => vi.waitFor(() => expect(app('syncRunning')).toBe(false));
const hidden = id => document.getElementById(id).classList.contains('hidden');
const choiceText = () => document.getElementById('modal-choice-text').textContent;
const choiceOpen = () => vi.waitFor(() => expect(hidden('modal-choice')).toBe(false));
const stored = () => JSON.parse(localStorage.getItem('lehrerapp_v3'));

// Gerät, das mit der Cloud (Stand 5000) abgeglichen ist
async function syncedDevice(data = sampleDB()) {
  await otherDeviceUploads(data, 5000);
  app('db = ' + JSON.stringify({ ...data, syncSettings: { lastSyncedCloudTimestamp: 5000, syncedLocalModified: data.settings.lastModified, uid: UID } }));
  app('persistDB()');
}

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

let downloads;
beforeEach(() => {
  cloud.store = {};
  cloud.reads = 0;
  cloud.writes = 0;
  cloud.onNextRead = null;
  globalThis.alert.mockClear();
  globalThis.confirm = () => true;
  downloads = [];
  URL.createObjectURL = () => 'blob:test';
  URL.revokeObjectURL = () => {};
  HTMLAnchorElement.prototype.click = function () { downloads.push(this.download); };
  if (app('choiceResolve')) app('answerChoice(null)');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
  app('window.currentConflict = null; syncRunning = false; syncQueued = false; syncAfterModalClose = false; syncProblemShown = false; syncErrorShown = false; foreignAccountAccepted = ""; foreignAccountDeclined = ""; foreignAccountAsking = false; foreignWriteAsking = false; dbRev = storedDBRev()');
  app('cancelDeleteAccount()');
  app('confirmedNewCloudPassword = ' + JSON.stringify(PW));
  const SM = app('SyncManager');
  SM.currentUser = { uid: UID, email: 'lehrer@example.org', providerData: [{ providerId: 'password' }] };
  SM.setMasterPassword(PW);
  app('db = ' + JSON.stringify(sampleDB()));
  app('persistDB()');
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});


function stubUser(user) {
  user.reauthenticateWithCredential = vi.fn(async () => {});
  user.reauthenticateWithPopup = vi.fn(async () => {});
  user.delete = vi.fn(async () => {});
  return user;
}
const syncBase = () => globalThis.__base;
beforeEach(() => {
  const m = new Map();
  globalThis.syncStoreForTest = { get: async k => m.get(k), put: async (k, v) => { m.set(k, v); }, clear: async () => m.clear() };
  app('syncStore = globalThis.syncStoreForTest; syncBaseSaved = null');
  globalThis.__store = m;
});
const baseRec = () => globalThis.__store.get('base_' + UID);

describe('AP11: gemeinsamer Stand nach „Passwort neu“ und „Cloud leeren“', () => {
  it('Passwort neu: Basis passt zur neuen Cloud-Version', async () => {
    await syncedDevice();
    document.getElementById('sync-reset-password').value = 'neu-geheim';
    document.getElementById('sync-reset-password-confirm').value = 'neu-geheim';
    await app('confirmCloudPasswordReset()');
    await vi.waitFor(() => expect(baseRec()).toBeTruthy());
    expect(baseRec().cloudTimestamp).toBe(cloud.store[UID].lastModified);
  });
  it('Cloud leeren: Basis ist der leere Stand', async () => {
    await syncedDevice();
    const done = app('clearAllDataEverywhere()');
    await choiceOpen();
    app('answerChoice("delete")');
    await done;
    await vi.waitFor(() => expect(baseRec()).toBeTruthy());
    expect(baseRec().cloudTimestamp).toBe(cloud.store[UID].lastModified);
    expect(JSON.parse(baseRec().data).groups).toEqual([]);
  });
});

describe('AP12: Konto löschen bricht nach der Markierung ab', () => {
  async function startDelete() {
    const started = app('startDeleteAccount()');
    await choiceOpen();
    app('answerChoice("keep")');
    await started;
    document.getElementById('sync-delete-account-password').value = 'login-pw';
  }
  it('ehrliche Meldung, Formular bleibt offen, der nächste Sync meldet nicht ab', async () => {
    await syncedDevice();
    const user = stubUser(app('SyncManager').currentUser);
    user.delete = vi.fn(async () => { throw Object.assign(new Error('offline'), { code: 'auth/network-request-failed' }); });
    await startDelete();
    await app('confirmDeleteAccount()');
    expect(cloud.store[UID].deleted).toBe(true);
    expect(globalThis.alert.mock.calls.pop()[0]).toMatch(/Cloud-Daten sind schon gelöscht/);
    expect(hidden('sync-delete-account-group')).toBe(false);
    await sync();
    expect(app('SyncManager').currentUser).not.toBe(null);   // nicht still abgemeldet
  });
  it('zweiter Versuch schließt ab, ohne die Markierung neu zu schreiben', async () => {
    await syncedDevice();
    const user = stubUser(app('SyncManager').currentUser);
    user.delete = vi.fn(async () => { throw Object.assign(new Error('offline'), { code: 'auth/network-request-failed' }); });
    await startDelete();
    await app('confirmDeleteAccount()');
    user.delete = vi.fn(async () => {});
    const writes = cloud.writes;
    await app('confirmDeleteAccount()');
    expect(user.delete).toHaveBeenCalled();
    expect(cloud.writes).toBe(writes);
    expect(app('SyncManager').currentUser).toBe(null);
  });
});

describe('AP13: Upload wartet nicht ewig auf die Tages-Sicherung', () => {
  it('saveToCloud kehrt zurück, auch wenn die Sicherung hängt', async () => {
    await syncedDevice();
    const SM = app('SyncManager');
    const orig = SM._keepDailyVersion;
    SM._keepDailyVersion = () => new Promise(() => {});   // hängt (kein Netz)
    SM.versionWaitMs = 50;
    try {
      await expect(SM.saveToCloud(JSON.stringify(sampleDB('X')), 5000)).resolves.toBeTruthy();
    } finally { SM._keepDailyVersion = orig; SM.versionWaitMs = 5000; }
  });
});

describe('AP14: Sync-Anzeige', () => {
  it('„Passwort wiederholen“ statt „Passwort fehlt“, solange das Wiederholungsfeld offen ist', () => {
    app('showNewPasswordConfirm()');
    expect(app('syncStateInfo().detail')).toBe('Passwort wiederholen');
    app('cancelNewCloudPassword()');
  });
  it('Daten eines anderen Kontos, Frage abgebrochen: „Sync pausiert“, nicht „Abgeglichen“', () => {
    app('db.syncSettings = { uid: "anderes-konto" }; foreignAccountDeclined = ' + JSON.stringify(UID));
    expect(app('syncStateInfo().head')).toBe('Sync pausiert');
    expect(app('syncStateInfo().detail')).toMatch(/anderes Konto/);
  });
});

describe('AP15: Sync-Stand wird im Takt neu gerechnet', () => {
  it('Rückkehr in die App zeichnet die Anzeige neu', () => {
    const spy = vi.fn(); globalThis.__usi = spy;
    app('globalThis.__orig = updateSyncIndicator; updateSyncIndicator = () => globalThis.__usi()');
    try {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      expect(spy).toHaveBeenCalled();
    } finally { app('updateSyncIndicator = globalThis.__orig'); }
  });
});

describe('AP16/AP17: Abgleich', () => {
  const base = () => sampleDB('1A');
  it('Hintergrund und Hell/Dunkel bleiben zusammen', () => {
    const b = base(); b.settings.themeBg = '#1f2937'; b.settings.theme = 'dark';
    const l = JSON.parse(JSON.stringify(b)); l.settings.themeBg = '#334155'; l.settings.themeCard = '#475569';   // Schiefer, dunkel
    const c = JSON.parse(JSON.stringify(b)); c.settings.themeBg = '#fae8b4'; c.settings.themeCard = '#fdf4d8'; c.settings.theme = 'light';
    const r = app('mergeDB')(b, l, c);
    expect(r.merged.settings.themeBg).toBe('#334155');
    expect(r.merged.settings.theme).toBe('dark');
  });
  it('Fragen zeigen Klartext: Aufsicht, Tempo, Merkzettel-Klasse', () => {
    const b = base(); b.supervisions = [{ id: 'a', day: 0, start: '09:30', end: '09:50', place: 'Hof', recurring: 'weekly' }];
    b.todos = [{ id: 't', text: 'Kopien', created: '2026-11-01', groupId: 'g1' }];
    b.groups.push({ id: 'g2', subject: 'Bio', className: '8a' });
    const l = JSON.parse(JSON.stringify(b)); l.supervisions[0].day = 2; l.todos[0].groupId = 'g2';
    const c = JSON.parse(JSON.stringify(b)); c.supervisions[0].day = 1; delete c.todos[0].groupId;
    const r = app('mergeDB')(b, l, c);
    const text = JSON.stringify(r.conflicts);
    expect(text).toMatch(/Mittwoch|Mi/);
    expect(text).not.toMatch(/"local":2|"cloud":1/);
    expect(text).toMatch(/8a/);
  });
});
