// Block P (Review 25.09.2026, zweite Runde): Datenverlust & Sync.
// Wie sync.test.js: echte sync-manager.js + crypto-helper.js, Firebase als Attrappe.
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
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
  app('window.currentConflict = null; syncRunning = false; syncQueued = false; syncAfterModalClose = false; syncProblemShown = false; cloudSizeWarned = false');
  app('confirmedNewCloudPassword = ' + JSON.stringify(PW));
  const SM = app('SyncManager');
  SM.currentUser = { uid: UID, email: 'lehrer@example.org' };
  SM.setMasterPassword(PW);
  app('db = ' + JSON.stringify(sampleDB()));
  app('cancelCloudPasswordReset()');
});

describe('P1: offenes Fenster während eines Pulls', () => {
  const DATE = '2026-09-21';
  const KEY = 'sl1_' + DATE;

  it('Notizen des anderen Geräts werden beim Schließen nicht mit leeren Feldern überschrieben', async () => {
    await sync();
    app(`openLessonDetail('sl1', '${DATE}')`);
    // Laptop trägt Inhalt und Notizen ein, iPad kehrt zurück und synct
    await otherDeviceUploads(sampleDB('1A', { lessonData: { [KEY]: { done: 'Bruchrechnung', notes: 'Heft einsammeln' } } }), Date.now() + 1);
    await sync();
    await settle();
    app('saveLessonDataAndClose()');
    await settle();
    await vi.waitFor(() => expect(app('db').lessonData[KEY]?.notes).toBe('Heft einsammeln'));
    expect((await cloudContent()).lessonData[KEY].notes).toBe('Heft einsammeln');
  });

  it('eingetippt und gleichzeitig am anderen Gerät geändert → Konflikt-Dialog statt stillem Überschreiben', async () => {
    await sync();
    app(`openLessonDetail('sl1', '${DATE}')`);
    await otherDeviceUploads(sampleDB('1A', { lessonData: { [KEY]: { notes: 'vom Laptop' } } }), Date.now() + 1);
    await sync();
    await settle();
    document.getElementById('lesson-notes-text').value = 'vom iPad';
    app('saveLessonDataAndClose(); clearTimeout(window.syncTimeout)');
    await vi.waitFor(() => expect(app('window.currentConflict')).toBeTruthy());
    expect(app('db').lessonData[KEY].notes).toBe('vom iPad');
    expect((await cloudContent()).lessonData[KEY].notes).toBe('vom Laptop');
  });
});

describe('P2: Einstellungen offen während eines Pulls', () => {
  function cloudWithBlock5() {
    return sampleDB('Cloud', {
      settings: {
        teacherName: 'Frau Cloud', school: 'Gymnasium', blocks: [
          { num: 1, label: '1. Block', start: '08:00', end: '09:30' },
          { num: 2, label: '2. Block', start: '09:45', end: '11:15' },
          { num: 5, label: 'AG', start: '15:15', end: '16:45' },
        ], lastModified: 5,
      },
      lessonSlots: [{ id: 'ag', day: 2, block: 5, part: 'full', subject: 'AG', recurring: 'weekly' }],
    });
  }

  it('neues Gerät: Passwort in den Einstellungen, Pull, „Speichern“ → Name und Blöcke aus der Cloud bleiben', async () => {
    app('db = emptyDB()');
    await otherDeviceUploads(cloudWithBlock5(), 5000);
    app('openSettings()');
    await sync({ manual: true });
    await settle();
    expect(app('db').groups[0].className).toBe('Cloud');
    expect(document.getElementById('settings-teacher-name').value).toBe('Frau Cloud');

    app('saveSettings(); clearTimeout(window.syncTimeout)');
    expect(app('db').settings.teacherName).toBe('Frau Cloud');
    expect(app('db').settings.blocks.map(b => b.num)).toEqual([1, 2, 5]);
  });

  it('nach dem Pull bekommt „+ Block“ eine freie Nummer, nicht die eines Cloud-Blocks', async () => {
    app('db = emptyDB()');
    await otherDeviceUploads(cloudWithBlock5(), 5000);
    app('openSettings()');
    await sync({ manual: true });
    await settle();
    app('addBlockRow()');
    expect(app('blocksDraft').map(b => b.num)).toEqual([1, 2, 5, 6]);
  });
});

describe('P3: eigene Blockzeiten', () => {
  it('5 Blöcke ab 08:00 bleiben nach dem Laden erhalten, auch wenn Block 5 leer ist', () => {
    const blocks = [
      { num: 1, label: '1. Block', start: '08:00', end: '09:30' },
      { num: 2, label: '2. Block', start: '09:45', end: '11:15' },
      { num: 3, label: '3. Block', start: '11:30', end: '13:00' },
      { num: 4, label: '4. Block', start: '13:30', end: '15:00' },
      { num: 5, label: 'AG', start: '15:15', end: '16:45' },
    ];
    const data = app('migrateDB')(sampleDB('1A', { settings: { blocks, lastModified: 1 } }));
    expect(data.settings.blocks).toEqual(blocks);
  });
});

describe('P4: „Alles löschen“ während eines Syncs, der im Konflikt endet', () => {
  it('kein Konflikt-Dialog für die ersetzte DB; die Cloud bleibt erhalten', async () => {
    await sync();
    await otherDeviceUploads(sampleDB('B'), Date.now() + 1);
    userEdits('db.groups[0].className = "A"');
    cloud.onNextRead = () => app('clearAllData()');
    await sync();
    await settle();
    expect(app('window.currentConflict')).toBeFalsy();
    expect((await cloudContent()).groups[0].className).toBe('B');
    expect(app('db').groups[0].className).toBe('B'); // leeres Gerät hat die Cloud geholt
  });

  it('„Dieses Gerät hochladen“ lädt eine geleerte DB nicht hoch', async () => {
    await sync();
    await otherDeviceUploads(sampleDB('B'), Date.now() + 1);
    userEdits('db.groups[0].className = "A"');
    await sync();
    expect(app('window.currentConflict')).toBeTruthy();
    app('clearAllData()');
    await app('resolveConflict')('push');
    expect((await cloudContent()).groups[0].className).toBe('B');
    expect(globalThis.alert).toHaveBeenCalled();
  });
});

describe('P5: langsamer Sync', () => {
  it('Sperre bleibt bis zum Ende, der Upload wird als synchron vermerkt, kein Konflikt danach', async () => {
    await sync();
    userEdits('db.groups[0].className = "langsam"');
    app('syncSlowNoticeMs = 5');
    const SM = app('SyncManager');
    const original = SM.getCloudData.bind(SM);
    SM.getCloudData = async () => { await new Promise(r => setTimeout(r, 40)); return original(); };
    try {
      const running = sync();
      await new Promise(r => setTimeout(r, 20));
      expect(app('syncRunning')).toBe(true);           // nach dem Hinweis noch gesperrt
      expect(toasts()).toMatch(/dauert/);
      await running;
    } finally {
      SM.getCloudData = original;
      app('syncSlowNoticeMs = 30000');
    }
    expect((await cloudContent()).groups[0].className).toBe('langsam');
    expect(app('isLocalDBChanged()')).toBe(false);
  });
});

describe('P6: alle Klassen einzeln gelöscht', () => {
  it('die Löschung geht in die Cloud', async () => {
    await sync();
    userEdits('db.groups = []; db.students = {}; db.lessonSlots = []');
    await sync();
    await settle();
    expect((await cloudContent()).groups).toEqual([]);
  });

  it('ein nie synchronisiertes leeres Gerät lädt weiterhin nie hoch', async () => {
    await otherDeviceUploads(sampleDB('Cloud'), 5000);
    app('db = emptyDB()');
    await sync();
    await settle();
    expect(app('db').groups[0].className).toBe('Cloud');
  });
});

describe('P7: anderes Konto', () => {
  it('Wechsel zu Konto B: kein stiller Pull, der die lokalen Daten ersetzt', async () => {
    await sync();
    expect(app('db').syncSettings.uid).toBe(UID);
    await otherDeviceUploads(sampleDB('Konto B'), 7777, PW, 'lehrer2');
    app('SyncManager').currentUser = { uid: 'lehrer2', email: 'zweit@example.org' };
    await sync();
    await settle();
    expect(app('db').groups[0].className).toBe('1A');
    // Seit T6 zuerst die Rückfrage „Daten eines anderen Kontos“; „übernehmen“ führt zum Konflikt-Dialog
    expect(document.getElementById('modal-choice').classList.contains('hidden')).toBe(false);
    app('answerChoice("adopt")');
    await vi.waitFor(() => expect(app('window.currentConflict')).toBeTruthy());
    expect(app('db').groups[0].className).toBe('1A');
    app('foreignAccountAccepted = ""');
  });
});

describe('P8: App verlassen', () => {
  afterEach(() => Object.defineProperty(document, 'hidden', { value: false, configurable: true }));

  it('ausstehender Autosave wird beim Verlassen sofort übertragen', async () => {
    await sync();
    app('db.groups[0].className = "kurz vor dem Zuklappen"; saveDB()');
    expect(app('window.syncTimeout')).toBeTruthy();
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.waitFor(async () => expect((await cloudContent()).groups[0].className).toBe('kurz vor dem Zuklappen'));
    expect(app('window.syncTimeout')).toBeFalsy();
  });
});

describe('P9: Master-Passwort vergessen oder ändern', () => {
  function openReset(answer) {
    const started = app('startCloudPasswordReset')();
    if (answer !== undefined) app(`answerChoice(${JSON.stringify(answer)})`);
    return started;
  }

  it('überschreibt die Cloud mit den Daten dieses Geräts und dem neuen Passwort', async () => {
    await otherDeviceUploads(sampleDB('unlesbar'), 5000, 'vergessen');
    app('SyncManager').setMasterPassword('');
    await openReset('reset');
    expect(hidden('sync-reset-group')).toBe(false);
    document.getElementById('sync-reset-password').value = 'neu-geheim';
    document.getElementById('sync-reset-password-confirm').value = 'neu-geheim';
    await app('confirmCloudPasswordReset')();

    expect((await cloudContent('neu-geheim')).groups[0].className).toBe('1A');
    expect(app('SyncManager').masterPassword).toBe('neu-geheim');
    expect(localStorage.getItem('sync_master_password')).toBe('neu-geheim');
    expect(app('isLocalDBChanged()')).toBe(false);
    expect(hidden('sync-reset-group')).toBe(true);
  });

  it('zwei verschiedene Eingaben → nichts wird überschrieben', async () => {
    await otherDeviceUploads(sampleDB('bleibt'), 5000, 'alt');
    await openReset('reset');
    document.getElementById('sync-reset-password').value = 'eins';
    document.getElementById('sync-reset-password-confirm').value = 'zwei';
    await app('confirmCloudPasswordReset')();
    expect((await cloudContent('alt')).groups[0].className).toBe('bleibt');
  });

  it('abgebrochen → nichts passiert', async () => {
    await otherDeviceUploads(sampleDB('bleibt'), 5000, 'alt');
    await openReset(null);
    expect(hidden('sync-reset-group')).toBe(true);
  });

  it('leeres Gerät: verweigert, damit die Cloud nicht geleert wird', async () => {
    await otherDeviceUploads(sampleDB('bleibt'), 5000, 'alt');
    app('db = emptyDB()');
    await openReset();
    expect(hidden('modal-choice')).toBe(true);
    expect(globalThis.alert).toHaveBeenCalled();
  });

  it('Login-Passwort vergessen: Mail zum Zurücksetzen an die eingegebene Adresse', async () => {
    const auth = fake.firebase.auth();
    auth.sendPasswordResetEmail = vi.fn(async () => {});
    document.getElementById('sync-email').value = 'lehrer@example.org';
    await app('resetLoginPassword')();
    expect(auth.sendPasswordResetEmail).toHaveBeenCalledWith('lehrer@example.org');
  });
});

describe('P10: „Zuletzt synchronisiert“', () => {
  it('zeigt den letzten Abgleich, nicht die Versionskennung der Cloud', async () => {
    const tenDaysAgo = Date.now() - 10 * 86400000;
    await otherDeviceUploads(sampleDB('alt'), tenDaysAgo);
    app('db = emptyDB()');
    await sync();
    await settle();
    app('updateSyncUI()');
    const shown = document.getElementById('sync-last-time').textContent;
    expect(shown).toContain(new Date().toLocaleDateString('de-DE'));
  });
});

describe('P11: unlesbare Daten', () => {
  it('ein zweiter Start legt keine weitere, gleiche Rettungskopie an', () => {
    globalThis.confirm = () => false; // Rückfrage „herunterladen?“ ablehnen
    Object.keys(localStorage).filter(k => k.startsWith('lehrerapp_v3_defekt_')).forEach(k => localStorage.removeItem(k));
    app('rescueUnreadableDB')('{kaputt', new Error('x'));
    app('rescueUnreadableDB')('{kaputt', new Error('x'));
    expect(app('rescueCopyKeys()')).toHaveLength(1);
    app('rescueUnreadableDB')('{anders kaputt', new Error('x'));
    expect(app('rescueCopyKeys()')).toHaveLength(2);
    app('rescueCopyKeys()').forEach(k => localStorage.removeItem(k));
    app('dbLoadFailure = null');
    globalThis.confirm = () => true;
  });

  it('Speichern gesperrt: bietet den Download an, höchstens einmal pro Minute', () => {
    const ask = vi.fn(() => false);
    globalThis.confirm = ask;
    app('dbLoadFailure = { raw: "{kaputt", key: null, error: "x" }; lastRescueOffer = 0');
    app('saveDB(); clearTimeout(window.syncTimeout)');
    app('saveDB(); clearTimeout(window.syncTimeout)');
    expect(ask).toHaveBeenCalledTimes(1);
    expect(ask.mock.calls[0][0]).toMatch(/herunterladen/);
    app('dbLoadFailure = null');
    globalThis.confirm = () => true;
  });
});
