// Gesamtprüfung 14.11.2026, Paket 1: Abgleich und Schülerapp-Links. AY1, AY2, AY3, BC2.
const { loadApp, loadScript, app } = require('./helpers/load-app');
const { createFakeFirebase } = require('./helpers/fake-firebase');

const PW = 'richtig-geheim';
const UID = 'u1';
const OLD = 'O'.repeat(22), NEW = 'N'.repeat(22), ANNA = 'A'.repeat(22), OTHER = 'X'.repeat(22);

function sampleDB() {
  return {
    settings: { teacherName: 'Test', blocks: null, lastModified: 1000, studentApp: { on: true } },
    lessonSlots: [{ id: 's1', day: 0, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', color: '#6366f1', recurring: 'weekly' }],
    lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#6366f1', schularbeitWeight: 50,
      studentApp: { on: true, access: { id: OLD, key: 'k'.repeat(43) } } }],
    students: { g1: [{ id: 'a', firstName: 'Anna', lastName: 'A', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] }] },
  };
}

let cloud;
const SM = () => app('SyncManager');
const sync = opts => app('triggerSyncInternal')(opts);
async function otherDeviceUploads(data) {
  const prev = cloud.store[UID] ? cloud.store[UID].lastModified : 0;
  cloud.store[UID] = { ...(await app('CryptoHelper').encryptPayload(JSON.stringify(data), PW)), lastModified: Math.max(Date.now(), prev + 1) };
}
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); await new Promise(r => setTimeout(r, 0)); for (let i = 0; i < 30; i++) await Promise.resolve(); };
const waitPublish = async () => { for (let i = 0; i < 20 && (app('saPublishing') || app('syncRunning')); i++) await flush(); };

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
  SM().init({ apiKey: 'test' });
});
beforeEach(() => {
  Object.assign(cloud, { store: {}, shares: {}, shareWrites: 0, shareDenied: false, shareListDenied: false, shareUid: UID, versions: {} });
  app('window.currentConflict = null; syncRunning = false; syncQueued = false; syncAfterModalClose = false; saPublishing = false; saPublishAgain = false; saForceAfterSync = false');
  app('confirmedNewCloudPassword = ' + JSON.stringify(PW));
  SM().currentUser = { uid: UID, email: 'l@example.org' };
  SM().setMasterPassword(PW);
  Object.keys(localStorage).filter(k => k.startsWith('sa_')).forEach(k => localStorage.removeItem(k));
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  app('db = migrateDB(' + JSON.stringify(sampleDB()) + ')');
});
afterEach(() => { app('clearTimeout(saPublishTimer); saPublishTimer = null; clearTimeout(window.syncTimeout)'); });

describe('AY1: Ein Pull, der noch wartet, veröffentlicht nichts', () => {
  it('Fenster offen, auf dem anderen Gerät „Neuer Link“: die alte Seite bleibt abgeschaltet', async () => {
    await sync();            // Ausgangsstand: in der Cloud, Seite OLD veröffentlicht
    await waitPublish();
    expect(cloud.shares[OLD].format).toBe(1);
    // Anderes Gerät: neuer Link, alte Seite abgeschaltet. Dieses Gerät hat seine Merker verloren (z. B. nie selbst veröffentlicht)
    const other = JSON.parse(JSON.stringify(app('db')));
    other.groups[0].studentApp.access = { id: NEW, key: 'n'.repeat(43) };
    other.settings.lastModified = 2000;
    await otherDeviceUploads(other);
    cloud.shares[OLD] = { format: 0, iv: '', data: '', owner: UID, updated: 1 };
    Object.keys(localStorage).filter(k => k.startsWith('sa_pub_')).forEach(k => localStorage.removeItem(k));
    // Ein Eingabefenster ist offen
    const modal = [...document.querySelectorAll('.modal-overlay')].find(m => m.id === 'modal-class-notes') || document.querySelector('.modal-overlay');
    modal.classList.remove('hidden');
    expect(app('inputModalOpen()')).toBe(true);
    await sync();
    await waitPublish();
    expect(cloud.shares[OLD]).toMatchObject({ format: 0, data: '' });   // nicht wieder gefüllt
    expect(app('db.groups[0].studentApp.access.id')).toBe(OLD);          // Stand wartet noch
    // Fenster zu: Stand wird übernommen, neue Seite veröffentlicht, alte bleibt aus
    modal.classList.add('hidden');
    await sync();
    await waitPublish();
    expect(app('db.groups[0].studentApp.access.id')).toBe(NEW);
    expect(cloud.shares[NEW].format).toBe(1);
    expect(cloud.shares[OLD]).toMatchObject({ format: 0, data: '' });
  });

  it('Übernommener Stand ohne den alten Link: die alte Kennung wird zum Abschalten vorgemerkt', () => {
    const before = JSON.parse(JSON.stringify(app('db')));
    const after = JSON.parse(JSON.stringify(before));
    after.groups[0].studentApp.access = { id: NEW, key: 'n'.repeat(43) };
    after.students.g1[0].studentApp = { access: { id: ANNA, key: 'a'.repeat(43) } };
    app(`queueVanishedShares([${JSON.stringify(before)}], ${JSON.stringify(after)})`);
    const q = JSON.parse(localStorage.getItem('sa_delete_queue'));
    expect(q).toEqual([OLD]);
  });
});

describe('BC2: Konto löschen / Cloud leeren entfernt alle eigenen Schülerseiten', () => {
  it('auch früher abgeschaltete, die das Gerät nicht mehr kennt', async () => {
    cloud.shares[OLD] = { format: 0, iv: '', data: '', owner: UID, updated: 1 };     // längst abgeschaltet und vergessen
    cloud.shares[OTHER] = { format: 1, iv: 'x', data: 'y', owner: UID, updated: 1 };  // nicht gewählter Link eines anderen Geräts
    cloud.shares['F'.repeat(22)] = { format: 1, iv: 'x', data: 'y', owner: 'fremd', updated: 1 };
    app(`db.groups[0].studentApp.access = { id: ${JSON.stringify(NEW)}, key: ${JSON.stringify('n'.repeat(43))} }`);
    cloud.shares[NEW] = { format: 1, iv: 'x', data: 'y', owner: UID, updated: 1 };
    expect(await app('deleteAllStudentShares()')).toBe(true);
    expect(Object.keys(cloud.shares)).toEqual(['F'.repeat(22)]);
  });
  it('mit alten Regeln (kein Auflisten) wie bisher die bekannten', async () => {
    cloud.shareListDenied = true;
    cloud.shares[OLD] = { format: 1, iv: 'x', data: 'y', owner: UID, updated: 1 };
    cloud.shares[OTHER] = { format: 0, iv: '', data: '', owner: UID, updated: 1 };
    expect(await app('deleteAllStudentShares()')).toBe(true);
    expect(Object.keys(cloud.shares)).toEqual([OTHER]);
  });
  it('Abgleich: der nicht gewählte Link der anderen Seite wird abgeschaltet', async () => {
    await sync();
    await waitPublish();
    // Anderes Gerät hat unabhängig einen eigenen Link angelegt und hochgeladen
    const other = JSON.parse(JSON.stringify(app('db')));
    other.groups[0].studentApp.access = { id: OTHER, key: 'x'.repeat(43) };
    other.settings.lastModified = 3000;
    await otherDeviceUploads(other);
    cloud.shares[OTHER] = { format: 1, iv: 'x', data: 'inhalt', owner: UID, updated: 1 };
    // „Dieses Gerät hochladen“ im Fenster mit dem ganzen Stand
    app('db.settings.teacherName = "lokal"; saveDB(); clearTimeout(window.syncTimeout)');
    const cloudData = await app('CryptoHelper').decryptPayload(cloud.store[UID], PW);
    app(`window.currentConflict = { cloudData: ${JSON.stringify(cloudData)}, cloudTimestamp: ${cloud.store[UID].lastModified} }`);
    await app('resolveConflict("push")');
    expect(JSON.parse(localStorage.getItem('sa_delete_queue'))).toContain(OTHER);
  });
});

describe('AY2: Stundenplanwechsel auf einen früheren Wochentag mitten in der Woche', () => {
  const clone = x => JSON.parse(JSON.stringify(x));
  const S = (id, day, extra = {}) => ({ id, day, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', recurring: 'weekly', ...extra });
  const base = (data = {}) => ({
    settings: { lastModified: 100, blocks: null }, lessonSlots: [S('fr', 4)],
    lessonData: { 'fr_2026-11-13': { notes: 'früher' }, ...data },
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', plan: [] }], students: { g1: [] }, supervisions: [], todos: [], syncSettings: {},
  });
  // Laptop: Freitag → Montag „ab Mi, 18.11.“ wie splitSlotFrom (ein Abstand +3 für alle Einträge ab dem Wechsel)
  function laptop(b) {
    const l = clone(b);
    l.lessonSlots[0].validUntil = '2026-11-17';
    l.lessonSlots.push(S('neuMo', 0, { validFrom: '2026-11-18', splitFrom: 'fr' }));
    Object.keys(l.lessonData).filter(k => k.startsWith('fr_') && k.slice(3) >= '2026-11-18').forEach(k => {
      const d = new Date(k.slice(3) + 'T12:00:00'); d.setDate(d.getDate() + 3);
      l.lessonData['neuMo_' + app('formatDate')(d)] = l.lessonData[k]; delete l.lessonData[k];
    });
    return l;
  }
  it('Einträge des anderen Geräts an zwei Freitagen landen auf zwei Montagen', () => {
    const b = base();
    const ipad = clone(b);
    ipad.lessonData['fr_2026-11-20'] = { notes: 'Kap. 3 üben' };
    ipad.lessonData['fr_2026-11-27'] = { notes: 'Test Kap. 3' };
    const r = app('mergeDB')(b, laptop(b), ipad);
    expect(r.merged.lessonData['neuMo_2026-11-23']).toEqual({ notes: 'Kap. 3 üben' });
    expect(r.merged.lessonData['neuMo_2026-11-30']).toEqual({ notes: 'Test Kap. 3' });
    expect(r.merged.lessonData['fr_2026-11-13']).toEqual({ notes: 'früher' });
  });
  it('schon abgeglichene Einträge, das andere Gerät ändert einen: nichts gemischt', () => {
    const b = base({ 'fr_2026-11-20': { notes: 'A' }, 'fr_2026-11-27': { notes: 'B' } });
    const ipad = clone(b);
    ipad.lessonData['fr_2026-11-27'] = { notes: 'B geändert' };
    const r = app('mergeDB')(b, laptop(b), ipad);
    expect(r.merged.lessonData['neuMo_2026-11-23']).toEqual({ notes: 'A' });
    expect(r.merged.lessonData['neuMo_2026-11-30']).toEqual({ notes: 'B geändert' });
  });
  it('Erledigt-Haken der Planung ziehen auf denselben Termin', () => {
    const b = base({ 'fr_2026-11-27': { notes: 'B' } });
    const ipad = clone(b);
    ipad.groups[0].plan = [{ id: 't1', title: 'Brüche', doneLessons: ['fr_2026-11-27'] }];
    const r = app('mergeDB')(b, laptop(b), ipad);
    expect(r.merged.groups[0].plan[0].doneLessons).toEqual(['neuMo_2026-11-30']);
  });
  it('fallen zwei Einträge doch auf denselben Termin, wird nie überschrieben', () => {
    const d = { lessonData: { 'x_2026-11-20': { notes: 'eins' }, 'x_2026-11-27': { notes: 'zwei' } }, groups: [] };
    expect(() => app('mergeRekey')(d, 'x', () => 'y_2026-11-23')).toThrow(/denselben Termin/);
    const e = { lessonData: { 'x_2026-11-20': { notes: 'eins' }, 'y_2026-11-23': { notes: 'da' } }, groups: [] };
    expect(() => app('mergeRekey')(e, 'x', () => 'y_2026-11-23')).toThrow(/denselben Termin/);
  });
  it('Abstand wie splitShift in der App', () => {
    app('db.lessonSlots = [' + JSON.stringify(S('fr', 4)) + ']');
    for (const [from, day] of [['2026-11-18', 0], ['2026-11-16', 0], ['2026-11-19', 2], ['2026-11-20', 1], ['2026-11-17', 4]]) {
      expect(app('mergeSplitShift')(4, day, from)).toBe(app(`splitShift(db.lessonSlots[0], ${day}, '${from}')`));
    }
  });
});

describe('AY3: HA des anderen Geräts zieht mit, wenn die Stunde verlegt wurde', () => {
  const clone = x => JSON.parse(JSON.stringify(x));
  const S = (id, day, extra = {}) => ({ id, day, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', recurring: 'weekly', ...extra });
  const base = () => ({
    settings: { lastModified: 100, blocks: null }, lessonSlots: [S('mo', 0), S('fr', 4)], lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b' }], students: { g1: [] }, supervisions: [], todos: [], syncSettings: {},
  });
  const ipadWithHW = b => {
    const c = clone(b);
    c.lessonData['mo_2026-11-16'] = { hwEnabled: true, hwItems: [{ id: 'h1', text: 'S. 34 Nr. 2', targetDate: '2026-11-20' }] };
    return c;
  };
  const target = r => r.merged.lessonData['mo_2026-11-16'].hwItems[0].targetDate;
  it('Freitagsstunde für alle Wochen auf Donnerstag: HA bis Fr ist am Do fällig', () => {
    const b = base(), l = clone(b);
    l.lessonSlots.find(s => s.id === 'fr').day = 3;
    expect(target(app('mergeDB')(b, l, ipadWithHW(b)))).toBe('2026-11-19');
  });
  it('Stundenplanwechsel ab dieser Woche auf Donnerstag: dasselbe', () => {
    const b = base(), l = clone(b);
    l.lessonSlots.find(s => s.id === 'fr').validUntil = '2026-11-17';
    l.lessonSlots.push(S('neuDo', 3, { validFrom: '2026-11-18', splitFrom: 'fr' }));
    expect(target(app('mergeDB')(b, l, ipadWithHW(b)))).toBe('2026-11-19');
  });
  it('nur an diesem Tag verlegt: HA zeigt auf den neuen Tag', () => {
    const b = base(), l = clone(b);
    l.lessonSlots.push(S('once', 3, { recurring: 'none', specificDate: '2026-11-19', movedFrom: { slotId: 'fr', date: '2026-11-20' } }));
    l.lessonData['fr_2026-11-20'] = { ausfall: true, movedTo: { slotId: 'once', date: '2026-11-19' } };
    expect(target(app('mergeDB')(b, l, ipadWithHW(b)))).toBe('2026-11-19');
  });
  it('liegt am alten Tag noch eine Stunde der Klasse, bleibt die HA dort', () => {
    const b = base();
    b.lessonSlots.push(S('fr2', 4, { block: 3 }));
    const l = clone(b);
    l.lessonSlots.find(s => s.id === 'fr').day = 3;
    expect(target(app('mergeDB')(b, l, ipadWithHW(b)))).toBe('2026-11-20');
  });
  it('was schon in der Basis stand, hat das verlegende Gerät selbst versorgt', () => {
    const b = ipadWithHW(base()), l = clone(b);
    l.lessonSlots.find(s => s.id === 'fr').day = 3;
    l.lessonData['mo_2026-11-16'].hwItems[0].targetDate = '2026-11-19';   // retargetDueItems auf dem Laptop
    const c = clone(b);
    c.lessonData['mo_2026-11-16'].hwItems[0].text = 'S. 34 Nr. 2 und 3';
    const r = app('mergeDB')(b, l, c);
    expect(r.merged.lessonData['mo_2026-11-16'].hwItems[0]).toMatchObject({ text: 'S. 34 Nr. 2 und 3', targetDate: '2026-11-19' });
  });
  it('andere Klassen bleiben unberührt', () => {
    const b = base();
    b.groups.push({ id: 'g2', subject: 'Physik', className: '8a' });
    b.lessonSlots.push(S('ph', 0, { groupId: 'g2', block: 2 }));
    const l = clone(b);
    l.lessonSlots.find(s => s.id === 'fr').day = 3;
    const c = clone(b);
    c.lessonData['ph_2026-11-16'] = { hwEnabled: true, hwItems: [{ id: 'h2', text: 'Versuch', targetDate: '2026-11-20' }] };
    const r = app('mergeDB')(b, l, c);
    expect(r.merged.lessonData['ph_2026-11-16'].hwItems[0].targetDate).toBe('2026-11-20');
  });
});
