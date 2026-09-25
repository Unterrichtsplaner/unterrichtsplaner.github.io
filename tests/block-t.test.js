// Block T (Review 25.09.2026, dritte Runde): Datenverlust & Sync.
// Wie block-p.test.js: echte sync-manager.js + crypto-helper.js, Firebase als Attrappe.
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
    students: { g1: [{ id: 's1', firstName: 'Anna', lastName: 'Muster', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] }] },
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
const toasts = () => [...document.querySelectorAll('#toast-container .toast')].map(t => t.textContent).join(' | ');
const stored = () => JSON.parse(localStorage.getItem('lehrerapp_v3'));
const badge = () => document.getElementById('sync-status-badge').textContent;

function setHidden(value) {
  Object.defineProperty(document, 'hidden', { value, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
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

beforeEach(() => {
  cloud.store = {};
  cloud.reads = 0;
  cloud.writes = 0;
  cloud.onNextRead = null;
  globalThis.alert.mockClear();
  globalThis.confirm = () => true;
  if (app('choiceResolve')) app('answerChoice(null)');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
  app('window.currentConflict = null; syncRunning = false; syncQueued = false; syncAfterModalClose = false; syncProblemShown = false; cloudSizeWarned = false; syncErrorShown = false; confirmHintShown = false; foreignAccountAccepted = ""; foreignAccountDeclined = ""; foreignAccountAsking = false; foreignWriteAsking = false; storageChangedWhileModal = false; dbRev = storedDBRev()');
  app('confirmedNewCloudPassword = ' + JSON.stringify(PW));
  localStorage.removeItem('sync_master_password_confirmed');
  const SM = app('SyncManager');
  SM.currentUser = { uid: UID, email: 'lehrer@example.org' };
  SM.setMasterPassword(PW);
  app('db = ' + JSON.stringify(sampleDB()));
  app('persistDB()');
  Object.defineProperty(document, 'hidden', { value: false, configurable: true });
});

describe('T1: zwei Fenster derselben App', () => {
  function otherWindowSaves(data) {
    const raw = JSON.stringify(data);
    localStorage.setItem('lehrerapp_v3', raw);
    localStorage.setItem('lehrerapp_v3_rev', 'anderes-fenster-' + Math.random());
    return raw;
  }

  it('Speichern im anderen Fenster wird übernommen (storage-Ereignis), die eigene Eingabe kommt dazu', () => {
    const other = sampleDB('1A');
    other.students.g1[0].grades.push({ type: 'schularbeit', value: '2.0', date: '2026-09-21', note: 'KA 1' });
    other.settings.lastModified = 2000;
    const raw = otherWindowSaves(other);
    window.dispatchEvent(new StorageEvent('storage', { key: 'lehrerapp_v3', newValue: raw }));
    expect(app('db').students.g1[0].grades).toHaveLength(1);
    userEdits(`db.students.g1[0].attendance.push({ id: 'a1', date: '2026-09-22', type: 'abwesend', note: '' })`);
    expect(stored().students.g1[0].grades).toHaveLength(1);
    expect(stored().students.g1[0].attendance).toHaveLength(1);
  });

  it('ohne Ereignis (Fenster eingefroren): kein stilles Überschreiben, sondern Rückfrage', () => {
    const other = sampleDB('1A');
    other.students.g1[0].grades.push({ type: 'schularbeit', value: '2.0', date: '2026-09-21', note: 'KA 1' });
    otherWindowSaves(other);
    userEdits(`db.students.g1[0].attendance.push({ id: 'a1', date: '2026-09-22', type: 'abwesend', note: '' })`);
    expect(stored().students.g1[0].grades).toHaveLength(1);
    expect(hidden('modal-choice')).toBe(false);
    expect(document.getElementById('modal-choice-text').textContent).toMatch(/anderen Fenster/);
  });

  it('Rückfrage „anderes Fenster laden“ übernimmt dessen Stand, „dieses Fenster speichern“ schreibt den eigenen', async () => {
    const other = sampleDB('Andere');
    otherWindowSaves(other);
    userEdits(`db.groups[0].className = 'Eigene'`);
    app('answerChoice("load")');
    await vi.waitFor(() => expect(app('db').groups[0].className).toBe('Andere'));
    expect(stored().groups[0].className).toBe('Andere');

    otherWindowSaves(sampleDB('Nochmal andere'));
    userEdits(`db.groups[0].className = 'Eigene'`);
    app('answerChoice("keep")');
    await vi.waitFor(() => expect(stored().groups[0].className).toBe('Eigene'));
    // danach wieder normal speichern, ohne Rückfrage
    userEdits(`db.groups[0].className = 'Eigene 2'`);
    expect(stored().groups[0].className).toBe('Eigene 2');
    expect(hidden('modal-choice')).toBe(true);
  });

  it('Stunden-Fenster offen: fremder Stand wird erst nach dem Schließen berücksichtigt, nie still überschrieben', () => {
    app(`openLessonDetail('sl1', '2026-09-21')`);
    const other = sampleDB('1A', { lessonData: { 'sl1_2026-09-22': { notes: 'aus dem anderen Fenster' } } });
    const raw = otherWindowSaves(other);
    window.dispatchEvent(new StorageEvent('storage', { key: 'lehrerapp_v3', newValue: raw }));
    // db bleibt, solange das Fenster offen ist (seine Felder gehören zum alten Stand)
    expect(app('db').lessonData['sl1_2026-09-22']).toBeUndefined();
    document.getElementById('lesson-notes-text').value = 'vom iPad';
    app('saveLessonDataAndClose()');
    // Rückfrage statt Überschreiben
    expect(stored().lessonData['sl1_2026-09-22'].notes).toBe('aus dem anderen Fenster');
    expect(hidden('modal-choice')).toBe(false);
  });

  it('solange die Rückfrage offen ist, geht der ungespeicherte Stand nicht in die Cloud', async () => {
    await sync();
    await settle();
    const writes = cloud.writes;
    otherWindowSaves(sampleDB('Andere'));
    userEdits(`db.groups[0].className = 'Eigene'`);
    await sync();
    await settle();
    expect(cloud.writes).toBe(writes);
    app('answerChoice("load")');
    await vi.waitFor(() => expect(app('db').groups[0].className).toBe('Andere'));
    await settle();
  });

  it('anderes Fenster hat alles gelöscht → dieses Fenster zeigt den leeren Stand', () => {
    localStorage.removeItem('lehrerapp_v3');
    localStorage.setItem('lehrerapp_v3_rev', 'geloescht');
    window.dispatchEvent(new StorageEvent('storage', { key: 'lehrerapp_v3', newValue: null }));
    expect(app('db').groups).toHaveLength(0);
  });
});

describe('T2: neues Master-Passwort in leerer Cloud', () => {
  it('leeres Gerät + leere Cloud: Passwort wird sofort zur Bestätigung abgefragt, kein „auf dem neuesten Stand“', async () => {
    app('db = emptyDB(); confirmedNewCloudPassword = ""');
    await sync({ manual: true });
    await settle();
    expect(hidden('sync-master-password-confirm-group')).toBe(false);
    expect(toasts()).not.toMatch(/neuesten Stand/);
    expect(app('db').syncSettings?.lastSyncCheck).toBeUndefined();
  });

  it('automatischer Sync wartet auf Bestätigung: sichtbarer Hinweis und Status, nicht „Bereit“', async () => {
    app('confirmedNewCloudPassword = ""');
    await sync();
    await settle();
    expect(cloud.writes).toBe(0);
    expect(toasts()).toMatch(/noch einmal/);
    expect(badge()).toMatch(/Bestätigung/);
    expect(document.getElementById('nav-settings').title).toMatch(/noch einmal/);
  });

  it('bestätigtes Passwort gilt auch nach einem Neustart der App', async () => {
    app('db = emptyDB(); confirmedNewCloudPassword = ""');
    app(`storeMasterPassword(${JSON.stringify(PW)})`);
    app(`confirmNewMasterPassword(${JSON.stringify(PW)})`);
    await settle();
    // Neustart: Bestätigung im Speicher weg, am nächsten Tag die ersten Klassen anlegen
    app('confirmedNewCloudPassword = ""');
    app('db = ' + JSON.stringify(sampleDB()));
    await sync();
    await settle();
    expect(cloud.store[UID]).toBeTruthy();
    expect((await cloudContent()).groups[0].className).toBe('1A');
  });

  it('anderes Passwort gespeichert → Bestätigung gilt nicht mehr', async () => {
    app(`storeMasterPassword(${JSON.stringify(PW)}); confirmNewMasterPassword(${JSON.stringify(PW)})`);
    await settle();
    cloud.store = {};
    cloud.writes = 0;
    app('confirmedNewCloudPassword = ""');
    app('storeMasterPassword("anderes-passwort")');
    app('SyncManager').setMasterPassword('anderes-passwort');
    await sync();
    await settle();
    expect(cloud.writes).toBe(0);
  });
});

describe('T3: App wird mit offenem Stunden-Fenster verlassen', () => {
  // Verlassen stößt auch den Sync an; der soll nicht in den nächsten Test hineinlaufen
  afterEach(() => settle());

  it('eingetippter Inhalt steht nach „hidden“ im Speicher, das Fenster bleibt offen', () => {
    app(`openLessonDetail('sl1', '2026-09-21')`);
    document.getElementById('lesson-done-text').value = 'Bruchrechnung eingeführt';
    setHidden(true);
    expect(stored().lessonData['sl1_2026-09-21'].done).toBe('Bruchrechnung eingeführt');
    expect(hidden('modal-lesson')).toBe(false);
    setHidden(false);
  });

  it('auch bei pagehide', () => {
    app(`openLessonDetail('sl1', '2026-09-21')`);
    document.getElementById('lesson-notes-text').value = 'Heft einsammeln';
    window.dispatchEvent(new Event('pagehide'));
    expect(stored().lessonData['sl1_2026-09-21'].notes).toBe('Heft einsammeln');
  });

  it('ohne Änderung wird nichts als geändert markiert', () => {
    const before = app('db').settings.lastModified;
    app(`openLessonDetail('sl1', '2026-09-21')`);
    window.dispatchEvent(new Event('pagehide'));
    expect(app('db').settings.lastModified).toBe(before);
  });
});

describe('T4: Upload kommt an, die Antwort nicht', () => {
  function loseNextAnswer(error = new Error('Netzwerkfehler')) {
    const firestore = app('SyncManager').db;
    const original = firestore.runTransaction;
    firestore.runTransaction = async (fn) => {
      firestore.runTransaction = original;
      await original.call(firestore, fn);
      throw error;
    };
  }

  it('nächste Eingabe: kein Konflikt, der neue Stand geht hoch', async () => {
    await sync();
    await settle();
    userEdits(`db.groups[0].className = 'Erste Eingabe'`);
    loseNextAnswer();
    await sync();
    await settle();
    expect((await cloudContent()).groups[0].className).toBe('Erste Eingabe');
    userEdits(`db.groups[0].className = 'Zweite Eingabe'`);
    await sync();
    await settle();
    expect(app('window.currentConflict')).toBeFalsy();
    expect(hidden('modal-sync-conflict')).toBe(true);
    expect((await cloudContent()).groups[0].className).toBe('Zweite Eingabe');
  });

  it('ohne weitere Eingabe: gilt danach als synchron', async () => {
    await sync();
    await settle();
    userEdits(`db.groups[0].className = 'Erste Eingabe'`);
    loseNextAnswer();
    await sync();
    await settle();
    await sync();
    await settle();
    expect(app('isLocalDBChanged()')).toBe(false);
    expect(app('db').syncSettings.lastSyncedCloudTimestamp).toBe(cloud.store[UID].lastModified);
  });

  it('auch nach einem Neustart (versuchter Upload ist gespeichert)', async () => {
    await sync();
    await settle();
    userEdits(`db.groups[0].className = 'Erste Eingabe'`);
    loseNextAnswer();
    await sync();
    await settle();
    app('db = loadDB()'); // Neustart
    userEdits(`db.groups[0].className = 'Zweite Eingabe'`);
    await sync();
    await settle();
    expect(app('window.currentConflict')).toBeFalsy();
    expect((await cloudContent()).groups[0].className).toBe('Zweite Eingabe');
  });

  it('ein anderes Gerät hat danach wirklich geändert → weiterhin Konflikt', async () => {
    await sync();
    await settle();
    userEdits(`db.groups[0].className = 'Erste Eingabe'`);
    loseNextAnswer();
    await sync();
    await settle();
    await otherDeviceUploads(sampleDB('Laptop'), Date.now() + 5000);
    userEdits(`db.groups[0].className = 'Zweite Eingabe'`);
    await sync();
    await settle();
    expect(app('window.currentConflict')).toBeTruthy();
  });
});

describe('T5: Einstellungen offen, Pull', () => {
  it('eingetippte Werte bleiben stehen, der Cloud-Stand wartet bis zum Schließen', async () => {
    await sync();
    await settle();
    app('openSettings()');
    document.getElementById('settings-school').value = 'Neue Schule';
    await otherDeviceUploads(sampleDB('Cloud', { settings: { teacherName: 'Frau Cloud', blocks: null, lastModified: 7 } }), Date.now() + 1);
    await sync();
    await settle();
    expect(document.getElementById('settings-school').value).toBe('Neue Schule');
    expect(app('db').groups[0].className).toBe('1A');
    app('closeModal("modal-settings")');
    await settle();
    await vi.waitFor(() => expect(app('db').groups[0].className).toBe('Cloud'));
  });

  it('unverändert offene Einstellungen werden weiter sofort neu befüllt (P2)', async () => {
    await sync();
    await settle();
    app('openSettings()');
    await otherDeviceUploads(sampleDB('Cloud', { settings: { teacherName: 'Frau Cloud', blocks: null, lastModified: 7 } }), Date.now() + 1);
    await sync();
    await settle();
    expect(app('db').groups[0].className).toBe('Cloud');
    expect(document.getElementById('settings-teacher-name').value).toBe('Frau Cloud');
  });
});

describe('T6: Kontowechsel am selben Gerät', () => {
  it('Abmelden fragt, ob die Daten auf dem Gerät bleiben sollen; „löschen“ leert das Gerät', async () => {
    await sync();
    await settle();
    const done = app('logoutSync()');
    expect(hidden('modal-choice')).toBe(false);
    app('answerChoice("delete")');
    await done;
    expect(app('isLocalDBEmpty()')).toBe(true);
    expect(stored() === null || stored().groups.length === 0).toBe(true);
    app('SyncManager').currentUser = { uid: UID, email: 'lehrer@example.org' };
  });

  it('Abmelden, Daten behalten: Daten bleiben', async () => {
    const done = app('logoutSync()');
    app('answerChoice("keep")');
    await done;
    expect(app('db').groups).toHaveLength(1);
    app('SyncManager').currentUser = { uid: UID, email: 'lehrer@example.org' };
  });

  it('Abbrechen: bleibt angemeldet', async () => {
    const SM = app('SyncManager');
    const spy = vi.spyOn(SM, 'logout');
    const done = app('logoutSync()');
    app('answerChoice(null)');
    await done;
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('Daten eines anderen Kontos: vor dem Hochladen fragen', async () => {
    app(`db.syncSettings = { lastSyncedCloudTimestamp: 5, syncedLocalModified: 1000, uid: 'lehrkraft-A' }`);
    app('SyncManager').currentUser = { uid: 'lehrkraft-B', email: 'b@example.org' };
    await sync();
    await settle();
    expect(cloud.writes).toBe(0);
    expect(hidden('modal-choice')).toBe(false);
    expect(document.getElementById('modal-choice-text').textContent).toMatch(/anderen Konto/);
    app('answerChoice("adopt")');
    await vi.waitFor(() => expect(cloud.store['lehrkraft-B']).toBeTruthy());
    app('SyncManager').currentUser = { uid: UID, email: 'lehrer@example.org' };
  });

  it('Daten eines anderen Kontos, „vom Gerät löschen“: Cloud des neuen Kontos wird geladen', async () => {
    await otherDeviceUploads(sampleDB('Klasse von B'), 4242, PW, 'lehrkraft-B');
    app(`db.syncSettings = { lastSyncedCloudTimestamp: 5, syncedLocalModified: 1000, uid: 'lehrkraft-A' }`);
    app('SyncManager').currentUser = { uid: 'lehrkraft-B', email: 'b@example.org' };
    await sync();
    await settle();
    app('answerChoice("discard")');
    await vi.waitFor(() => expect(app('db').groups[0]?.className).toBe('Klasse von B'));
    expect(hidden('modal-sync-conflict')).toBe(true);
    app('SyncManager').currentUser = { uid: UID, email: 'lehrer@example.org' };
  });

  it('Altdaten ohne Konto-Kennung gelten weiter als eigene (keine Rückfrage)', async () => {
    app(`db.syncSettings = { lastSyncedCloudTimestamp: 5, syncedLocalModified: 1000 }`);
    await otherDeviceUploads(sampleDB('1A'), 5);
    userEdits(`db.groups[0].className = 'Neu'`);
    await sync();
    await settle();
    expect(hidden('modal-choice')).toBe(true);
    expect((await cloudContent()).groups[0].className).toBe('Neu');
  });
});

describe('T7: Sync-Fehler ohne Verbindung', () => {
  function failReads(times) {
    const SM = app('SyncManager');
    let n = 0;
    const original = SM.getCloudData;
    SM.getCloudData = async function () {
      if (n++ < times) throw Object.assign(new Error('Failed to get document because the client is offline.'), { code: 'unavailable' });
      return original.call(this);
    };
    return () => { SM.getCloudData = original; };
  }

  it('automatisch: höchstens ein Hinweis, auf Deutsch', async () => {
    const restore = failReads(3);
    await sync(); await settle();
    await sync(); await settle();
    await sync(); await settle();
    restore();
    const all = [...document.querySelectorAll('#toast-container .toast')].map(t => t.textContent);
    expect(all.filter(t => /Verbindung|Sync/.test(t))).toHaveLength(1);
    expect(all.join(' ')).toMatch(/Keine Verbindung zur Cloud/);
    expect(all.join(' ')).not.toMatch(/Failed to get document/);
  });

  it('von Hand: Hinweis jedes Mal', async () => {
    const restore = failReads(2);
    await sync({ manual: true }); await settle();
    await sync({ manual: true }); await settle();
    restore();
    const all = [...document.querySelectorAll('#toast-container .toast')].map(t => t.textContent);
    expect(all.filter(t => /Keine Verbindung/.test(t))).toHaveLength(2);
  });
});

describe('T8/T9: Konflikt lösen', () => {
  async function makeConflict() {
    await sync();
    await settle();
    await otherDeviceUploads(sampleDB('Laptop'), Date.now() + 5000);
    userEdits(`db.groups[0].className = 'iPad'`);
    await sync();
    await settle();
    expect(app('window.currentConflict')).toBeTruthy();
  }

  it('T8: während „Dieses Gerät hochladen“ läuft kein zweiter Sync, der Konflikt kommt nicht wieder', async () => {
    await makeConflict();
    const push = app('resolveConflict("push")');
    const parallel = sync();
    await Promise.all([push, parallel]);
    await settle();
    expect(app('window.currentConflict')).toBeFalsy();
    expect(hidden('modal-sync-conflict')).toBe(true);
    expect((await cloudContent()).groups[0].className).toBe('iPad');
  });

  it('T9: nach dem Lösen steht der Status nicht mehr auf „Konflikt“', async () => {
    await makeConflict();
    expect(badge()).toMatch(/Konflikt/);
    await app('resolveConflict("push")');
    await settle();
    expect(badge()).not.toMatch(/Konflikt/);

    await makeConflict();
    await app('resolveConflict("pull")');
    expect(badge()).not.toMatch(/Konflikt/);
  });
});

describe('T10: Passwort auf einem anderen Gerät geändert', () => {
  it('Hinweis erwähnt die Änderung auf einem anderen Gerät', async () => {
    await otherDeviceUploads(sampleDB('1A'), 999, 'neues-passwort');
    await sync();
    await settle();
    expect(globalThis.alert).toHaveBeenCalled();
    expect(globalThis.alert.mock.calls[0][0]).toMatch(/anderen Gerät geändert/);
  });
});
