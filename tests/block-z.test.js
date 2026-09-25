// Block Z (nach dem Live-Gang, 25.09.2026): Cloud leeren (Z1) und Cloud-Konto löschen (Z2).
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

describe('Z1: Alles löschen – auch in der Cloud', () => {
  it('Knopf nur sichtbar, wenn angemeldet', () => {
    app('updateSyncUI()');
    expect(hidden('btn-clear-everywhere')).toBe(false);
    app('SyncManager').currentUser = null;
    app('updateSyncUI()');
    expect(hidden('btn-clear-everywhere')).toBe(true);
    expect(document.querySelector('#btn-clear-everywhere').getAttribute('onclick')).toBe('clearAllDataEverywhere()');
  });

  it('Rückfrage nennt Klassen und Schüler und „alle Geräte“; danach sind Gerät und Cloud leer', async () => {
    await syncedDevice();
    const done = app('clearAllDataEverywhere()');
    await choiceOpen();
    expect(choiceText()).toMatch(/In der Cloud: 1 Klasse, 2 Schüler/);
    expect(choiceText()).toMatch(/anderen Geräten/);
    app('answerChoice("delete")');
    await done;

    const inCloud = await cloudContent();
    expect(inCloud.groups).toHaveLength(0);
    expect(Object.keys(inCloud.students)).toHaveLength(0);
    expect(inCloud.lessonSlots).toHaveLength(0);
    expect(cloud.store[UID].lastModified).not.toBe(5000); // neue Version, Dokument bleibt
    expect(app('isLocalDBEmpty()')).toBe(true);
    expect(stored().groups).toHaveLength(0);
    // Das Gerät ist mit der leeren Cloud abgeglichen, nicht „neu“
    expect(app('isFreshEmptyDB()')).toBe(false);
    expect(app('db.syncSettings.lastSyncedCloudTimestamp')).toBe(cloud.store[UID].lastModified);

    const writes = cloud.writes;
    await sync({ manual: true });
    await settle();
    expect(cloud.writes).toBe(writes);
    expect(app('isLocalDBEmpty()')).toBe(true);
  });

  it('zweites Gerät ohne offene Eingaben übernimmt die Leere', async () => {
    await syncedDevice();
    const done = app('clearAllDataEverywhere()');
    await choiceOpen();
    app('answerChoice("delete")');
    await done;

    // Anderes Gerät: noch der alte Stand, abgeglichen mit 5000
    app('db = ' + JSON.stringify({ ...sampleDB(), syncSettings: { lastSyncedCloudTimestamp: 5000, syncedLocalModified: 1000, uid: UID } }));
    app('persistDB()');
    await sync();
    await settle();
    expect(app('isLocalDBEmpty()')).toBe(true);
    expect(hidden('modal-sync-conflict')).toBe(true);
  });

  it('zweites Gerät mit nicht übertragenen Eingaben bekommt den Konflikt-Dialog', async () => {
    await syncedDevice();
    const done = app('clearAllDataEverywhere()');
    await choiceOpen();
    app('answerChoice("delete")');
    await done;

    app('db = ' + JSON.stringify({ ...sampleDB(), syncSettings: { lastSyncedCloudTimestamp: 5000, syncedLocalModified: 1000, uid: UID } }));
    app('persistDB()');
    userEdits(`db.groups[0].className = 'Offline geändert'`);
    await sync();
    await settle();
    expect(hidden('modal-sync-conflict')).toBe(false);
    expect(app('db').groups[0].className).toBe('Offline geändert');
  });

  it('ein leeres neues Gerät lädt weiterhin nie automatisch hoch (A2/K1), „Alles löschen“ nur lokal holt die Daten zurück', async () => {
    await syncedDevice();
    app('wipeLocalData()');
    await sync();
    await settle();
    expect(cloud.writes).toBe(0);
    expect(app('db').groups).toHaveLength(1);
  });

  it('Abbrechen: nichts gelöscht', async () => {
    await syncedDevice();
    const done = app('clearAllDataEverywhere()');
    await choiceOpen();
    app('answerChoice(null)');
    await done;
    expect(cloud.writes).toBe(0);
    expect(app('db').groups).toHaveLength(1);
    expect(app('syncRunning')).toBe(false);
  });

  it('„Ohne Sicherung“ fragt noch einmal; Nein = nichts gelöscht', async () => {
    await syncedDevice();
    globalThis.confirm = () => false;
    const done = app('clearAllDataEverywhere()');
    await choiceOpen();
    app('answerChoice("delete")');
    await done;
    expect(cloud.writes).toBe(0);
    expect(app('db').groups).toHaveLength(1);
  });

  it('„Sicherung speichern“ lädt die Daten des Geräts herunter, dazu die Cloud, wenn sie anders ist', async () => {
    await syncedDevice();
    await otherDeviceUploads(sampleDB('Vom Laptop'), 6000);
    app('db.syncSettings.lastSyncedCloudTimestamp = 6000');
    const done = app('clearAllDataEverywhere()');
    await choiceOpen();
    app('answerChoice("backup")');
    await done;
    expect(downloads).toHaveLength(2);
    expect(downloads[1]).toMatch(/_Cloud_/);
    expect((await cloudContent()).groups).toHaveLength(0);
  });

  it('auf einem leeren Gerät: Zahlen aus der Cloud, Sicherung der Cloud-Daten', async () => {
    await syncedDevice();
    app('wipeLocalData()');
    const done = app('clearAllDataEverywhere()');
    await choiceOpen();
    expect(choiceText()).toMatch(/In der Cloud: 1 Klasse/);
    expect(choiceText()).not.toMatch(/Auf diesem Gerät/);
    app('answerChoice("backup")');
    await done;
    expect(downloads).toEqual([expect.stringMatching(/_Cloud_/)]);
    expect((await cloudContent()).groups).toHaveLength(0);
  });

  it('falsches Master-Passwort: nichts gelöscht, keine Rückfrage', async () => {
    await syncedDevice();
    await otherDeviceUploads(sampleDB(), 5000, 'anderes-passwort');
    await app('clearAllDataEverywhere()');
    expect(hidden('modal-choice')).toBe(true);
    expect(cloud.writes).toBe(0);
    expect(app('db').groups).toHaveLength(1);
    expect(globalThis.alert).toHaveBeenCalledWith(expect.stringMatching(/nichts gelöscht/));
  });

  it('anderes Gerät lädt während der Rückfrage hoch: nichts gelöscht', async () => {
    await syncedDevice();
    const done = app('clearAllDataEverywhere()');
    await choiceOpen();
    await otherDeviceUploads(sampleDB('Neu vom Laptop'), 7000);
    app('answerChoice("delete")');
    await done;
    expect((await cloudContent()).groups[0].className).toBe('Neu vom Laptop');
    expect(app('db').groups).toHaveLength(1);
    expect(globalThis.alert).toHaveBeenCalledWith(expect.stringMatching(/nichts gelöscht/));
  });

  it('offline: nichts gelöscht', async () => {
    await syncedDevice();
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    await app('clearAllDataEverywhere()');
    expect(cloud.reads).toBe(0);
    expect(app('db').groups).toHaveLength(1);
  });
});

describe('Z2: Cloud-Konto löschen', () => {
  function stubUser(user) {
    user.reauthenticateWithCredential = vi.fn(async () => {});
    user.reauthenticateWithPopup = vi.fn(async () => {});
    user.delete = vi.fn(async () => {});
    return user;
  }

  it('Daten behalten: Cloud-Daten weg, Anmelde-Konto gelöscht, abgemeldet, Daten auf dem Gerät bleiben', async () => {
    await syncedDevice();
    const user = stubUser(app('SyncManager').currentUser);
    const started = app('startDeleteAccount()');
    await choiceOpen();
    expect(choiceText()).toMatch(/lehrer@example.org/);
    app('answerChoice("keep")');
    await started;
    expect(hidden('sync-delete-account-group')).toBe(false);
    expect(hidden('sync-delete-account-password-group')).toBe(false);
    document.getElementById('sync-delete-account-password').value = 'login-pw';
    await app('confirmDeleteAccount()');

    expect(user.reauthenticateWithCredential).toHaveBeenCalledWith({ email: 'lehrer@example.org', password: 'login-pw' });
    expect(user.delete).toHaveBeenCalled();
    expect(cloud.store[UID].encryptedData).toBeUndefined();
    expect(cloud.store[UID].deleted).toBe(true);
    expect(app('SyncManager').currentUser).toBe(null);
    expect(app('SyncManager').masterPassword).toBe('');
    expect(localStorage.getItem('sync_master_password')).toBe(null);
    expect(app('db').groups).toHaveLength(1);
    expect(app('db').syncSettings).toBeUndefined();
    expect(hidden('sync-delete-account-group')).toBe(true);
  });

  it('Daten auch vom Gerät löschen', async () => {
    await syncedDevice();
    stubUser(app('SyncManager').currentUser);
    const started = app('startDeleteAccount()');
    await choiceOpen();
    app('answerChoice("delete")');
    await started;
    document.getElementById('sync-delete-account-password').value = 'login-pw';
    await app('confirmDeleteAccount()');
    expect(app('isLocalDBEmpty()')).toBe(true);
    expect(cloud.store[UID].deleted).toBe(true);
  });

  it('falsches Anmelde-Passwort: nichts gelöscht', async () => {
    await syncedDevice();
    const user = stubUser(app('SyncManager').currentUser);
    user.reauthenticateWithCredential = vi.fn(async () => { throw Object.assign(new Error('wrong'), { code: 'auth/wrong-password' }); });
    const started = app('startDeleteAccount()');
    await choiceOpen();
    app('answerChoice("keep")');
    await started;
    document.getElementById('sync-delete-account-password').value = 'falsch';
    await app('confirmDeleteAccount()');
    expect(user.delete).not.toHaveBeenCalled();
    expect(cloud.store[UID].encryptedData).toBeTruthy();
    expect(app('SyncManager').currentUser).toBe(user);
    expect(globalThis.alert).toHaveBeenCalledWith(expect.stringMatching(/Anmelde-Passwort stimmt nicht/));
    expect(app('syncRunning')).toBe(false);
  });

  it('Google-Konto: kein Passwortfeld, Bestätigung per Google', async () => {
    await syncedDevice();
    const user = stubUser(app('SyncManager').currentUser);
    user.providerData = [{ providerId: 'google.com' }];
    const started = app('startDeleteAccount()');
    await choiceOpen();
    app('answerChoice("keep")');
    await started;
    expect(hidden('sync-delete-account-password-group')).toBe(true);
    await app('confirmDeleteAccount()');
    expect(user.reauthenticateWithPopup).toHaveBeenCalled();
    expect(user.delete).toHaveBeenCalled();
  });

  it('anderes Gerät desselben Kontos: verständliche Meldung, abgemeldet, Daten bleiben, nichts hochgeladen', async () => {
    await syncedDevice();
    cloud.store[UID] = { deleted: true, format: 'deleted', deletedAt: 1 };
    const logout = vi.spyOn(app('SyncManager'), 'logout');
    userEdits(`db.groups[0].className = 'Geändert'`);
    await sync();
    await settle();
    await vi.waitFor(() => expect(logout).toHaveBeenCalled());
    logout.mockRestore();
    expect(cloud.store[UID].encryptedData).toBeUndefined();
    expect(app('db').groups[0].className).toBe('Geändert');
    expect(app('SyncManager').masterPassword).toBe('');
    expect(globalThis.alert).toHaveBeenCalledWith(expect.stringMatching(/Cloud-Konto wurde gelöscht/));
  });

  it('Firebase kennt das Konto nicht mehr: gleiche Meldung statt Sync-Fehler', async () => {
    await syncedDevice();
    const SM = app('SyncManager');
    const original = SM.getCloudData;
    SM.getCloudData = async () => { throw Object.assign(new Error('token expired'), { code: 'auth/user-token-expired' }); };
    await sync({ manual: true });
    await settle();
    SM.getCloudData = original;
    await vi.waitFor(() => expect(globalThis.alert).toHaveBeenCalledWith(expect.stringMatching(/Cloud-Konto wurde gelöscht/)));
    expect(app('db').groups).toHaveLength(1);
  });

  it('die Markierung sieht für die heutige App-Version wie ein neues Format aus, nicht wie ein falsches Passwort', async () => {
    await expect(app('CryptoHelper').decryptPayload({ deleted: true, format: 'deleted' }, PW))
      .rejects.toMatchObject({ name: 'UnsupportedFormatError' });
  });
});
