// Gesamtprüfung 11.11.2026, AP10: Der Sync hält das Master-Passwort am Anfang fest. Wird es mittendrin
// geändert, geht der Upload trotzdem mit dem geprüften Passwort in die Cloud.
const { loadApp, loadScript, app } = require('./helpers/load-app');
const { createFakeFirebase } = require('./helpers/fake-firebase');

const UID = 'lehrer1';
let cloud;
const SM = () => app('SyncManager');
const data = name => JSON.stringify({ settings: { lastModified: 1 }, lessonSlots: [], lessonData: {}, groups: [{ id: 'g1', className: name }], students: {} });
const decrypt = (doc, pw) => app('CryptoHelper').decryptPayload(doc, pw);

beforeAll(() => {
  const fake = createFakeFirebase();
  globalThis.firebase = fake.firebase;
  cloud = fake.cloud;
  loadScript('lib/crypto-js.min.js');
  loadScript('crypto-helper.js');
  loadScript('sync-manager.js');
  loadApp();
  SM().init({ apiKey: 'test' });
});
beforeEach(() => {
  Object.assign(cloud, { store: {}, reads: 0, writes: 0, onNextRead: null, versions: {}, versionWrites: 0, versionsDenied: false });
  SM().currentUser = { uid: UID, email: 'l@example.org' };
  SM().setMasterPassword('alt-geprueft');
});

describe('AP10: Passwort mitten im Sync geändert', () => {
  it('Upload nimmt das Passwort, mit dem die Cloud entschlüsselt wurde', async () => {
    const first = await SM().sync(data('1A'), { localChanged: true, localIsEmpty: false, lastSyncedCloudTimestamp: null });
    expect(first.status).toBe('uploaded');
    const res = await SM().sync(data('1B'), {
      localChanged: true, localIsEmpty: false, lastSyncedCloudTimestamp: first.cloudTimestamp,
      onBeforeUpload: async () => { SM().setMasterPassword('neu-ungeprueft'); },   // Feld genau jetzt geändert
    });
    expect(res.status).toBe('uploaded');
    expect(JSON.parse(await decrypt(cloud.store[UID], 'alt-geprueft')).groups[0].className).toBe('1B');
  });
  it('„Passwort neu festlegen“ verschlüsselt mit dem neuen Passwort und merkt es sich erst danach', async () => {
    await SM().sync(data('1A'), { localChanged: true, localIsEmpty: false, lastSyncedCloudTimestamp: null });
    await SM().overwriteCloud(data('1C'), 'ganz-neu');
    expect(JSON.parse(await decrypt(cloud.store[UID], 'ganz-neu')).groups[0].className).toBe('1C');
    expect(SM().masterPassword).toBe('ganz-neu');
  });
  it('„Passwort neu festlegen“ scheitert: altes Passwort bleibt', async () => {
    await SM().sync(data('1A'), { localChanged: true, localIsEmpty: false, lastSyncedCloudTimestamp: null });
    cloud.onNextRead = () => { throw new Error('offline'); };
    await expect(SM().overwriteCloud(data('1C'), 'ganz-neu')).rejects.toThrow();
    expect(SM().masterPassword).toBe('alt-geprueft');
  });
});
