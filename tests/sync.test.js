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
async function otherDeviceUploads(data, timestamp, password = PW) {
  cloud.store[UID] = {
    ...(await app('CryptoHelper').encryptPayload(JSON.stringify(data), password)),
    lastModified: timestamp,
  };
}

// Gerät mit alter App-Version (Format v1, CryptoJS) lädt hoch
function oldAppUploads(data, timestamp, password = PW) {
  cloud.store[UID] = {
    encryptedData: app('CryptoHelper').encryptLegacy(JSON.stringify(data), password),
    lastModified: timestamp,
  };
}

async function cloudContent() {
  return JSON.parse(await app('CryptoHelper').decryptPayload(cloud.store[UID], PW));
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
  app('window.currentConflict = null; syncRunning = false; syncQueued = false; syncProblemShown = false; cloudSizeWarned = false');
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
    await otherDeviceUploads(sampleDB('2B'), Date.now() + 5000);

    await sync();
    expect(app('window.currentConflict')).toBeFalsy();
    expect(app('db').groups[0].className).toBe('2B');
  });
});

describe('A2: neues/leeres Gerät', () => {
  it('lädt die Cloud-Daten, statt einen Konflikt zu melden oder die Cloud zu leeren', async () => {
    await otherDeviceUploads(sampleDB('3C'), 12345);
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
    await otherDeviceUploads(sampleDB('Cloud'), 777);
    app('SyncManager').setMasterPassword('tippfehler');
    userEdits('db.groups[0].className = "lokal geändert"');

    await sync();
    expect(cloud.writes).toBe(0);
    expect((await cloudContent()).groups[0].className).toBe('Cloud');
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
    await otherDeviceUploads(sampleDB('Cloud-Stand'), Date.now() + 1);
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
    const before = await cloudContent();

    expect(() => app('clearAllData()')).not.toThrow();
    expect(app('isLocalDBEmpty()')).toBe(true);

    await sync();
    expect((await cloudContent())).toEqual(before);
    expect(app('db').groups[0].className).toBe('1A');
  });
});

describe('A6: offener Konflikt', () => {
  it('weitere Autosaves starten keinen neuen Sync, solange der Nutzer nicht entschieden hat', async () => {
    await sync();
    await otherDeviceUploads(sampleDB('B'), Date.now() + 1);
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
    await otherDeviceUploads(sampleDB('B'), Date.now() + 1);
    userEdits('db.groups[0].className = "A"');
    await sync();

    await app('resolveConflict')('pull');
    expect(app('db').groups[0].className).toBe('B');
    expect(app('window.currentConflict')).toBeFalsy();
    expect(app('isLocalDBChanged()')).toBe(false);
  });

  it('„Lokal hochladen“ überschreibt die Cloud und beendet den Konflikt', async () => {
    await sync();
    await otherDeviceUploads(sampleDB('B'), Date.now() + 1);
    userEdits('db.groups[0].className = "A"');
    await sync();

    await app('resolveConflict')('push');
    expect((await cloudContent()).groups[0].className).toBe('A');
    expect(app('window.currentConflict')).toBeFalsy();
    expect(app('isLocalDBChanged()')).toBe(false);
  });
});

describe('A8: Uhrzeiten und Wettläufe zwischen Geräten', () => {
  it('Gerät B mit falsch gehender Uhr (Vergangenheit): Änderungen kommen trotzdem an', async () => {
    await sync();
    await otherDeviceUploads(sampleDB('B-mit-alter-Uhr'), 1); // Uhr von B steht auf 1970
    await sync();
    expect(app('db').groups[0].className).toBe('B-mit-alter-Uhr');
  });

  it('lokale Änderungen nach einem Pull gehen hoch, auch wenn die Uhr von B vorgeht', async () => {
    await otherDeviceUploads(sampleDB('B'), Date.now() + 10 * 365 * 864e5); // B lebt 10 Jahre in der Zukunft
    app('db = ' + JSON.stringify(emptyDB()));
    await sync();
    userEdits('db.groups[0].className = "hier geändert"');

    await sync();
    expect((await cloudContent()).groups[0].className).toBe('hier geändert');
  });

  it('schreibt B zwischen Lesen und Schreiben, wird B nicht überschrieben', async () => {
    await sync();
    userEdits('db.groups[0].className = "A"');
    cloud.onNextRead = () => otherDeviceUploads(sampleDB('B war schneller'), Date.now() + 1);

    await sync();
    await vi.waitFor(() => expect(app('window.currentConflict')).toBeTruthy());
    expect((await cloudContent()).groups[0].className).toBe('B war schneller');
  });
});

describe('A7: Verschlüsselung (Format v2: PBKDF2 + AES-GCM)', () => {
  it('lädt im neuen Format hoch: Kennung, starke Schlüsselableitung, kein Klartext', async () => {
    await sync();
    const doc = cloud.store[UID];
    expect(doc.format).toBe(2);
    expect(doc.iterations).toBeGreaterThanOrEqual(200000);
    expect(doc.salt).toBeTruthy();
    expect(doc.iv).toBeTruthy();
    expect(doc.encryptedData).not.toMatch(/^U2FsdGVk/); // „Salted__“ = altes CryptoJS-Format
    expect((await cloudContent()).students.g1[0].firstName).toBe('Anna');
  });

  it('jeder Upload bekommt einen neuen IV', async () => {
    await sync();
    const iv1 = cloud.store[UID].iv;
    userEdits('db.groups[0].className = "neu"');
    await sync();
    expect(cloud.store[UID].iv).not.toBe(iv1);
  });

  it('falsches Passwort bei v2-Daten: nichts wird hochgeladen, Passwort wird verworfen', async () => {
    await otherDeviceUploads(sampleDB('Cloud'), 777);
    app('SyncManager').setMasterPassword('tippfehler');
    userEdits('db.groups[0].className = "lokal"');

    await sync();
    expect(cloud.writes).toBe(0);
    expect(app('SyncManager').masterPassword).toBe('');
  });

  it('alte Cloud-Daten (v1) werden gelesen und still ins neue Format umgeschrieben, Kennung bleibt', async () => {
    oldAppUploads(sampleDB('von alter App'), 4242);
    app('db = ' + JSON.stringify(emptyDB()));

    await sync();
    expect(app('db').groups[0].className).toBe('von alter App');
    expect(cloud.store[UID].format).toBe(2);
    expect(cloud.store[UID].lastModified).toBe(4242); // andere Geräte merken nichts
    expect((await cloudContent()).groups[0].className).toBe('von alter App');
    expect(app('isLocalDBChanged()')).toBe(false);
  });

  it('v1-Daten, die schon synchron sind, werden ebenfalls umgeschrieben (ohne Pull/Upload)', async () => {
    oldAppUploads(sampleDB(), 4242);
    app('markSynced(4242, db.settings.lastModified)');

    await sync();
    expect(cloud.store[UID].format).toBe(2);
    expect(cloud.store[UID].lastModified).toBe(4242);
    expect(cloud.writes).toBe(1);

    await sync(); // danach passiert nichts mehr
    expect(cloud.writes).toBe(1);
  });

  it('falsches Passwort bei v1-Daten: nichts wird umgeschrieben', async () => {
    oldAppUploads(sampleDB('Cloud'), 4242);
    app('SyncManager').setMasterPassword('tippfehler');
    await sync();
    expect(cloud.writes).toBe(0);
    expect(cloud.store[UID].format).toBeUndefined();
  });

  it('Daten einer neueren App-Version: kein „falsches Passwort“, nichts wird überschrieben', async () => {
    cloud.store[UID] = { format: 3, encryptedData: 'xyz', lastModified: 99 };
    userEdits('db.groups[0].className = "lokal"');

    await sync();
    expect(cloud.writes).toBe(0);
    expect(app('SyncManager').masterPassword).toBe(PW);
    expect(globalThis.alert).toHaveBeenCalledWith(expect.stringContaining('neueren App-Version'));
  });
});

// Zufällige, kaum komprimierbare Zeichen, um große Datenmengen nachzustellen
function randomText(length) {
  const bytes = new Uint8Array(Math.ceil(length * 3 / 4));
  for (let i = 0; i < bytes.length; i += 65536) crypto.getRandomValues(bytes.subarray(i, i + 65536));
  return Buffer.from(bytes).toString('base64').slice(0, length);
}

describe('A9: Größe des Cloud-Dokuments', () => {
  it('komprimiert: ein volles Schuljahr (8 Klassen × 25 Schüler) passt deutlich unter 1 MB', async () => {
    const big = sampleDB();
    big.groups = []; big.students = {};
    for (let g = 0; g < 8; g++) {
      big.groups.push({ id: 'g' + g, subject: 'Mathe', className: g + 'A', schularbeitWeight: 50 });
      big.students['g' + g] = Array.from({ length: 25 }, (_, s) => ({
        id: `s${g}_${s}`, firstName: 'Vorname' + s, lastName: 'Nachname' + s,
        grades: Array.from({ length: 40 }, (_, i) => ({ type: 'mitarbeit', value: String(1 + i % 5), date: '2026-10-' + String(1 + i % 28).padStart(2, '0'), note: 'Wiederholung Kapitel ' + i })),
        attendance: Array.from({ length: 20 }, (_, i) => ({ id: 'a' + i, date: '2026-11-' + String(1 + i).padStart(2, '0'), type: 'absent', note: '' })),
        participation: Array.from({ length: 60 }, (_, i) => ({ id: 'p' + i, date: '2026-12-01', value: '+' })),
        homework: Array.from({ length: 30 }, (_, i) => ({ id: 'h' + i, date: '2026-09-' + String(1 + i % 28).padStart(2, '0'), note: 'vergessen' })),
        studentNotes: [{ text: 'Sitzt gern vorne, braucht klare Ansagen.', date: '2026-09-15' }],
      }));
    }
    const json = JSON.stringify(big);
    expect(json.length).toBeGreaterThan(1500000); // unkomprimiert wäre das Limit gesprengt

    app('db = ' + json);
    await sync();
    expect(cloud.writes).toBe(1);
    expect(app('SyncManager').lastUploadSize).toBeLessThan(300000);
  });

  it('zu große Daten: nichts wird hochgeladen, verständlicher Hinweis, lokale Daten bleiben', async () => {
    await sync();
    const writes = cloud.writes;
    userEdits(`db.groups[0].className = ${JSON.stringify(randomText(1200000))}`);

    await sync();
    expect(cloud.writes).toBe(writes);
    expect(globalThis.alert).toHaveBeenCalledWith(expect.stringContaining('zu groß für die Cloud'));
    expect(app('db').groups[0].className.length).toBe(1200000);
    expect(app('isLocalDBChanged()')).toBe(true); // bleibt „geändert“, geht nach dem Aufräumen hoch
  });

  it('warnt, wenn die Cloud-Sicherung fast voll ist – aber lädt noch hoch', async () => {
    userEdits(`db.groups[0].className = ${JSON.stringify(randomText(850000))}`);

    await sync();
    expect(cloud.writes).toBe(1);
    expect(globalThis.alert).toHaveBeenCalledWith(expect.stringContaining('% voll'));
  });
});

describe('A10: Sync-Stand aus alter App-Version (ohne syncedLocalModified)', () => {
  const oldState = (lastModified, lastSynced) => {
    const d = sampleDB();
    d.settings.lastModified = lastModified;
    d.syncSettings = { lastSyncedCloudTimestamp: lastSynced };
    return app('migrateDB')(d);
  };

  it('zuletzt heruntergeladen (lastModified = Cloud-Kennung) → gilt als synchron', () => {
    expect(oldState(5000, 5000).syncSettings.syncedLocalModified).toBe(5000);
  });

  it('altes saveDB(true) kurz nach dem Upload (< 10 s) → gilt als synchron', () => {
    expect(oldState(5000 + 9000, 5000).syncSettings.syncedLocalModified).toBe(14000);
  });

  it('später geändert (≥ 10 s) oder Uhr davor → bleibt „lokal geändert“', () => {
    expect('syncedLocalModified' in oldState(5000 + 60000, 5000).syncSettings).toBe(false);
    expect('syncedLocalModified' in oldState(4000, 5000).syncSettings).toBe(false);
  });

  it('neue Daten werden nicht angefasst', () => {
    const d = sampleDB();
    d.syncSettings = { lastSyncedCloudTimestamp: 5000, syncedLocalModified: 1 };
    expect(app('migrateDB')(d).syncSettings.syncedLocalModified).toBe(1);
  });

  it('Gerät nach dem Update: Cloud von anderem Gerät geändert → Übernahme ohne Konflikt-Dialog', async () => {
    oldAppUploads(sampleDB('alt'), 5000);
    app('db = migrateDB(' + JSON.stringify({ ...sampleDB('alt'), settings: { ...sampleDB().settings, lastModified: 5003 }, syncSettings: { lastSyncedCloudTimestamp: 5000 } }) + ')');
    await otherDeviceUploads(sampleDB('neu vom anderen Gerät'), 7000);

    await sync();
    expect(app('window.currentConflict')).toBeFalsy();
    expect(app('db').groups[0].className).toBe('neu vom anderen Gerät');
  });

  it('beide Seiten „geändert“, aber inhaltlich gleich → kein Konflikt, danach synchron', async () => {
    await otherDeviceUploads(sampleDB(), 7000);
    // altes „no_change“ hat lastModified neu gestempelt, lange nach dem letzten Sync
    app('db = migrateDB(' + JSON.stringify({ ...sampleDB(), settings: { ...sampleDB().settings, lastModified: 999999 }, syncSettings: { lastSyncedCloudTimestamp: 5000 } }) + ')');
    expect(app('isLocalDBChanged()')).toBe(true);

    await sync();
    expect(app('window.currentConflict')).toBeFalsy();
    expect(cloud.writes).toBe(0);
    expect(app('isLocalDBChanged()')).toBe(false);
    expect(app('db.syncSettings.lastSyncedCloudTimestamp')).toBe(7000);
  });

  it('beide Seiten geändert und inhaltlich verschieden → weiterhin Konflikt (sicherer Fall)', async () => {
    await otherDeviceUploads(sampleDB('Cloud'), 7000);
    app('db = migrateDB(' + JSON.stringify({ ...sampleDB('lokal'), syncSettings: { lastSyncedCloudTimestamp: 5000 } }) + ')');

    await sync();
    expect(app('window.currentConflict')).toBeTruthy();
    expect(cloud.writes).toBe(0);
  });
});
