// Cloud-Sync (BUGS.md Block A): echte sync-manager.js + crypto-helper.js + CryptoJS,
// nur Firebase ist durch eine Attrappe ersetzt. „Gerät B“ wird simuliert, indem der Test
// direkt einen verschlüsselten Stand in die Fake-Cloud schreibt.
const { loadApp, loadScript, app } = require('./helpers/load-app');
const { createFakeFirebase } = require('./helpers/fake-firebase');

const PW = 'richtig-geheim';
const UID = 'lehrer1';

let cloud;

function sampleDB(className = '1A') {
  return {
    settings: { teacherName: 'Test', blocks: null, lastModified: 1000 },
    lessonSlots: [],
    lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathe', className, schularbeitWeight: 50 }],
    students: { g1: [{ id: 's1', firstName: 'Anna', lastName: 'Muster', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] }] },
  };
}

function emptyDB() {
  return { settings: { teacherName: '', school: '', blocks: null }, lessonSlots: [], lessonData: {}, groups: [], students: {} };
}

// Gerät B lädt einen Stand hoch (mit beliebiger, auch „falscher“ Uhrzeit)
function otherDeviceUploads(data, timestamp, password = PW) {
  cloud.store[UID] = {
    encryptedData: app('CryptoHelper').encrypt(JSON.stringify(data), password),
    lastModified: timestamp,
  };
}

function cloudContent() {
  return JSON.parse(app('CryptoHelper').decrypt(cloud.store[UID].encryptedData, PW));
}

// Nutzer ändert etwas in der App (wie ein Klick), ohne dass der 3-s-Autosave-Timer losläuft
function userEdits(code) {
  app(code);
  app('saveDB(); clearTimeout(window.syncTimeout)');
}

const sync = (opts) => app('triggerSyncInternal')(opts);

beforeAll(() => {
  const fake = createFakeFirebase();
  globalThis.firebase = fake.firebase;
  cloud = fake.cloud;
  globalThis.alert = vi.fn();
  globalThis.confirm = () => true;

  loadScript('lib/crypto-js.min.js');
  loadScript('crypto-helper.js');
  loadScript('sync-manager.js'); // echte Implementierung statt der Attrappe aus setup.js
  loadApp();
  app('SyncManager').init({ apiKey: 'test' });
});

beforeEach(() => {
  cloud.store = {};
  cloud.reads = 0;
  cloud.writes = 0;
  cloud.onNextRead = null;
  globalThis.alert.mockClear();
  app('window.currentConflict = null; syncRunning = false; syncQueued = false');
  const SM = app('SyncManager');
  SM.currentUser = { uid: UID, email: 'lehrer@example.org' };
  SM.setMasterPassword(PW);
  app('db = ' + JSON.stringify(sampleDB()));
});

describe('decideSync (reine Entscheidungslogik)', () => {
  const decide = (s) => app('decideSync')(s);

  it.each([
    // hasCloud, cloudTs, lastSynced, localChanged, localIsEmpty → Ergebnis
    [false, null, undefined, true, false, 'upload'],
    [false, null, undefined, false, true, 'none'],      // leeres Gerät lädt nie hoch
    [true, 5, 5, false, false, 'none'],
    [true, 5, 5, true, false, 'upload'],
    [true, 7, 5, false, false, 'pull'],
    [true, 7, 5, true, false, 'conflict'],
    [true, 7, undefined, false, true, 'pull'],          // neues Gerät
    [true, 7, undefined, true, true, 'pull'],           // leeres Gerät überschreibt nie die Cloud
    [true, 3, 5, false, false, 'pull'],                  // Cloud-Uhr „älter“ – egal, nur Gleichheit zählt
  ])('Cloud=%s cloudTs=%s lastSynced=%s lokalGeändert=%s lokalLeer=%s → %s',
    (hasCloud, cloudTimestamp, lastSyncedCloudTimestamp, localChanged, localIsEmpty, expected) => {
      expect(decide({ hasCloud, cloudTimestamp, lastSyncedCloudTimestamp, localChanged, localIsEmpty })).toBe(expected);
    });
});

describe('A1: Sync-Metadaten markieren die Daten nicht als geändert', () => {
  it('nach einem Upload gilt das Gerät als unverändert – zweiter Sync schreibt nichts', async () => {
    await sync();
    expect(cloud.writes).toBe(1);
    expect(app('isLocalDBChanged()')).toBe(false);

    await sync();
    expect(cloud.writes).toBe(1);
  });

  it('Gerät ohne eigene Änderungen übernimmt neue Cloud-Daten ohne Konflikt', async () => {
    await sync();
    otherDeviceUploads(sampleDB('2B'), Date.now() + 5000);

    await sync();
    expect(app('window.currentConflict')).toBeFalsy();
    expect(app('db').groups[0].className).toBe('2B');
  });
});

describe('A2: neues/leeres Gerät', () => {
  it('lädt die Cloud-Daten, statt einen Konflikt zu melden oder die Cloud zu leeren', async () => {
    otherDeviceUploads(sampleDB('3C'), 12345);
    app('db = ' + JSON.stringify(emptyDB()));

    await sync();
    expect(app('window.currentConflict')).toBeFalsy();
    expect(cloud.writes).toBe(0);
    expect(app('db').groups[0].className).toBe('3C');
  });

  it('lädt einen leeren Stand nie in eine leere Cloud hoch', async () => {
    app('db = ' + JSON.stringify(emptyDB()));
    await sync();
    expect(cloud.writes).toBe(0);
  });
});

describe('A3: Master-Passwort', () => {
  it('falsches Passwort: nichts wird hochgeladen, Passwort wird verworfen', async () => {
    otherDeviceUploads(sampleDB('Cloud'), 777);
    app('SyncManager').setMasterPassword('tippfehler');
    userEdits('db.groups[0].className = "lokal geändert"');

    await sync();
    expect(cloud.writes).toBe(0);
    expect(cloudContent().groups[0].className).toBe('Cloud');
    expect(app('SyncManager').masterPassword).toBe('');
    expect(globalThis.alert).toHaveBeenCalled();
  });

  it('Passwortfeld übernimmt erst bei onchange, nicht bei jedem Tastendruck', () => {
    const input = document.getElementById('sync-master-password');
    expect(input.getAttribute('oninput')).toBeNull();
    expect(input.getAttribute('onchange')).toContain('updateMasterPassword');
  });
});

describe('A4: gleichzeitige Syncs und Eingaben während des Syncs', () => {
  it('Eingabe während eines laufenden Downloads wird nicht überschrieben', async () => {
    await sync();
    otherDeviceUploads(sampleDB('Cloud-Stand'), Date.now() + 1);
    // Genau während der Sync die Cloud liest, trägt der Nutzer etwas ein
    cloud.onNextRead = () => userEdits('db.groups[0].className = "gerade eingetippt"');

    await sync();
    expect(app('db').groups[0].className).toBe('gerade eingetippt');
    // Der Nachlauf erkennt: beide Seiten geändert → Nutzer wird gefragt
    await vi.waitFor(() => expect(app('window.currentConflict')).toBeTruthy());
  });

  it('zwei gleichzeitig angestoßene Syncs laufen nacheinander, nicht parallel', async () => {
    let concurrent = 0, maxConcurrent = 0;
    const SM = app('SyncManager');
    const original = SM.getCloudData.bind(SM);
    SM.getCloudData = async () => {
      concurrent++; maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise(r => setTimeout(r, 5));
      concurrent--;
      return original();
    };
    try {
      await Promise.all([sync(), sync(), sync()]);
      await vi.waitFor(() => expect(app('syncRunning')).toBe(false));
    } finally {
      SM.getCloudData = original;
    }
    expect(maxConcurrent).toBe(1);
    expect(cloud.writes).toBe(1);
  });
});

describe('A5: Alle Daten löschen', () => {
  it('wirft keinen Fehler und lädt danach die Cloud statt sie zu leeren', async () => {
    await sync();
    const before = cloudContent();

    expect(() => app('clearAllData()')).not.toThrow();
    expect(app('isLocalDBEmpty()')).toBe(true);

    await sync();
    expect(cloudContent()).toEqual(before);
    expect(app('db').groups[0].className).toBe('1A');
  });
});

describe('A6: offener Konflikt', () => {
  it('weitere Autosaves starten keinen neuen Sync, solange der Nutzer nicht entschieden hat', async () => {
    await sync();
    otherDeviceUploads(sampleDB('B'), Date.now() + 1);
    userEdits('db.groups[0].className = "A"');
    await sync();
    expect(app('window.currentConflict')).toBeTruthy();

    const readsBefore = cloud.reads;
    await sync();
    await sync();
    expect(cloud.reads).toBe(readsBefore);
  });

  it('„Cloud laden“ übernimmt die Cloud und beendet den Konflikt', async () => {
    await sync();
    otherDeviceUploads(sampleDB('B'), Date.now() + 1);
    userEdits('db.groups[0].className = "A"');
    await sync();

    await app('resolveConflict')('pull');
    expect(app('db').groups[0].className).toBe('B');
    expect(app('window.currentConflict')).toBeFalsy();
    expect(app('isLocalDBChanged()')).toBe(false);
  });

  it('„Lokal hochladen“ überschreibt die Cloud und beendet den Konflikt', async () => {
    await sync();
    otherDeviceUploads(sampleDB('B'), Date.now() + 1);
    userEdits('db.groups[0].className = "A"');
    await sync();

    await app('resolveConflict')('push');
    expect(cloudContent().groups[0].className).toBe('A');
    expect(app('window.currentConflict')).toBeFalsy();
    expect(app('isLocalDBChanged()')).toBe(false);
  });
});

describe('A8: Uhrzeiten und Wettläufe zwischen Geräten', () => {
  it('Gerät B mit falsch gehender Uhr (Vergangenheit): Änderungen kommen trotzdem an', async () => {
    await sync();
    otherDeviceUploads(sampleDB('B-mit-alter-Uhr'), 1); // Uhr von B steht auf 1970
    await sync();
    expect(app('db').groups[0].className).toBe('B-mit-alter-Uhr');
  });

  it('lokale Änderungen nach einem Pull gehen hoch, auch wenn die Uhr von B vorgeht', async () => {
    otherDeviceUploads(sampleDB('B'), Date.now() + 10 * 365 * 864e5); // B lebt 10 Jahre in der Zukunft
    app('db = ' + JSON.stringify(emptyDB()));
    await sync();
    userEdits('db.groups[0].className = "hier geändert"');

    await sync();
    expect(cloudContent().groups[0].className).toBe('hier geändert');
  });

  it('schreibt B zwischen Lesen und Schreiben, wird B nicht überschrieben', async () => {
    await sync();
    userEdits('db.groups[0].className = "A"');
    cloud.onNextRead = () => otherDeviceUploads(sampleDB('B war schneller'), Date.now() + 1);

    await sync();
    await vi.waitFor(() => expect(app('window.currentConflict')).toBeTruthy());
    expect(cloudContent().groups[0].className).toBe('B war schneller');
  });
});
