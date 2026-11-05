// AH4: Konflikt = zusammenführen statt einen ganzen Stand zu verwerfen. Echte sync-manager.js + crypto-helper.js,
// Firebase als Attrappe, das „andere Gerät“ schreibt direkt in die Cloud (wie block-t.test.js).
const { loadApp, loadScript, app } = require('./helpers/load-app');
const { createFakeFirebase } = require('./helpers/fake-firebase');

const PW = 'richtig-geheim', UID = 'lehrer1';
let cloud, fake, store;

const st = (id, f, extra = {}) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
const sampleDB = () => ({
  settings: { teacherName: 'T', blocks: null, lastModified: 1000 },
  lessonSlots: [{ id: 'sl1', day: 0, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', recurring: 'weekly' }],
  lessonData: {},
  groups: [{ id: 'g1', subject: 'Mathe', className: '7b', schularbeitWeight: 50 }],
  students: { g1: [st('a', 'Anna', { grades: [{ type: 'test', value: '2.0', date: '2026-10-15', note: 'T1' }] }), st('b', 'Ben')] },
  supervisions: [],
});
const memoryStore = () => {
  const m = new Map();
  return { m, get: async k => m.get(k), put: async (k, v) => { m.set(k, v); }, clear: async () => m.clear() };
};
async function cloudContent() { return JSON.parse(await app('CryptoHelper').decryptPayload(cloud.store[UID], PW)); }
// Anderes Gerät: nimmt den aktuellen Cloud-Stand, ändert ihn, schreibt immer eine neuere Version (Regel 62)
async function otherDevice(edit) {
  const d = await cloudContent();
  edit(d);
  cloud.store[UID] = { ...(await app('CryptoHelper').encryptPayload(JSON.stringify(d), PW)), lastModified: cloud.store[UID].lastModified + 1000 };
}
function userEdits(code) { app(code); app('saveDB(); clearTimeout(window.syncTimeout); window.syncTimeout = null'); }
const sync = o => app('triggerSyncInternal')(o);
const settle = () => vi.waitFor(() => expect(app('syncRunning')).toBe(false));
const hidden = id => document.getElementById(id).classList.contains('hidden');
const toasts = () => document.getElementById('toast-container').textContent;
const dialog = () => !hidden('modal-sync-conflict');
const questions = () => [...document.querySelectorAll('#conflict-question-list .conflict-q')];

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
// Ausgangslage: Gerät und Cloud sind gleich, die Basis liegt vor
beforeEach(async () => {
  cloud.store = {};
  store = memoryStore();
  globalThis.syncStoreForTest = store;
  app('syncStore = globalThis.syncStoreForTest; syncBaseSaved = null');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
  app('window.currentConflict = null; syncQueued = false');
  app('SyncManager').currentUser = { uid: UID };
  app('SyncManager').masterPassword = PW;
  localStorage.setItem('sync_master_password_confirmed', PW);
  app(`replaceDB(migrateDB(${JSON.stringify(sampleDB())}))`);
  app('newCloudPasswordConfirmed = () => true');
  await sync(); await settle();
  expect(cloud.store[UID]).toBeTruthy();
});

describe('ohne Widerspruch: zusammenführen, kurzer Hinweis, kein Fenster', () => {
  it('Basis liegt nach dem Upload vor und passt zur Versionskennung', () => {
    const rec = store.m.get(`base_${UID}`);
    expect(rec.cloudTimestamp).toBe(cloud.store[UID].lastModified);
    expect(JSON.parse(rec.data).groups[0].className).toBe('7b');
  });
  it('Gerät: neue Note bei Anna; anderes Gerät: Fehlzeit bei Ben → beides überall', async () => {
    userEdits('db.students.g1[0].grades.push({ type: "test", value: "1.0", date: "2026-11-03", note: "T2" })');
    await otherDevice(d => { d.students.g1[1].attendance.push({ id: 'x', date: '2026-11-03', type: 'abwesend', note: '' }); });
    await sync(); await settle();
    await vi.waitFor(async () => expect((await cloudContent()).students.g1[0].grades.length).toBe(2));
    expect(dialog()).toBe(false);
    expect(toasts()).toMatch(/zusammengeführt/);
    expect(app('db.students.g1[1].attendance.length')).toBe(1);
    expect(app('db.students.g1[0].grades.length')).toBe(2);
    const c = await cloudContent();
    expect(c.students.g1[1].attendance.length).toBe(1);
    expect(app('isLocalDBChanged()')).toBe(false);
    // Danach ist wieder Ruhe: nächster Sync ändert nichts
    const writes = cloud.writes;
    await sync(); await settle();
    expect(cloud.writes).toBe(writes);
    expect(dialog()).toBe(false);
  });
  it('vor dem Zusammenführen liegen beide Stände im Sicherheitsnetz (höchstens 3)', async () => {
    for (let i = 0; i < 4; i++) {
      userEdits(`db.students.g1[0].studentNotes.push({ text: "g${i}", date: "2026-11-03" })`);
      await otherDevice(d => { d.students.g1[1].studentNotes.push({ text: `c${i}`, date: '2026-11-03' }); });
      await sync(); await settle();
      await vi.waitFor(() => expect(app('isLocalDBChanged()')).toBe(false));
    }
    const list = store.m.get('merge_backups');
    expect(list.length).toBe(3);
    expect(JSON.parse(list[0].local).students.g1[0].studentNotes.map(n => n.text)).toContain('g3');
    expect(JSON.parse(list[0].cloud).students.g1[1].studentNotes.map(n => n.text)).toContain('c3');
    expect(app('db.students.g1[0].studentNotes.length')).toBe(4);
    expect(app('db.students.g1[1].studentNotes.length')).toBe(4);
  });
  it('Cloud während des Hochladens weiter: wird von dort aus neu zusammengeführt, nichts geht verloren', async () => {
    userEdits('db.students.g1[0].studentNotes.push({ text: "gerät", date: "2026-11-03" })');
    await otherDevice(d => { d.students.g1[1].studentNotes.push({ text: "cloud1", date: '2026-11-03' }); });
    await sync();
    await otherDevice(d => { d.students.g1[1].studentNotes.push({ text: "cloud2", date: '2026-11-03' }); }).catch(() => {});
    await settle();
    await vi.waitFor(() => expect(app('isLocalDBChanged()')).toBe(false));
    await sync(); await settle();
    await vi.waitFor(() => expect(app('isLocalDBChanged()')).toBe(false));
    const texts = d => d.students.g1.flatMap(s => s.studentNotes.map(n => n.text)).sort();
    expect(texts(app('db'))).toEqual(texts(await cloudContent()));
    expect(texts(app('db'))).toContain('gerät');
    expect(texts(app('db'))).toContain('cloud1');
    expect(dialog()).toBe(false);
  });
  it('während des Zusammenführens lokal eingetippt: nichts überschrieben, läuft neu', async () => {
    userEdits('db.students.g1[0].studentNotes.push({ text: "eins", date: "2026-11-03" })');
    await otherDevice(d => { d.students.g1[1].studentNotes.push({ text: "cloud", date: '2026-11-03' }); });
    const realGet = store.get;
    let once = true;
    store.get = async k => {
      if (once && k === `base_${UID}`) { once = false; userEdits('db.students.g1[0].studentNotes.push({ text: "zwei", date: "2026-11-03" })'); }
      return realGet(k);
    };
    await sync(); await settle();
    await vi.waitFor(() => expect(app('isLocalDBChanged()')).toBe(false));
    expect(app('db.students.g1[0].studentNotes.map(n => n.text)')).toEqual(['eins', 'zwei']);
    expect(app('db.students.g1[1].studentNotes.map(n => n.text)')).toEqual(['cloud']);
  });
  it('Getipptes, während die Basis gespeichert wird, geht nicht verloren', async () => {
    userEdits('db.students.g1[0].studentNotes.push({ text: "eins", date: "2026-11-03" })');
    await otherDevice(d => { d.students.g1[1].studentNotes.push({ text: "cloud", date: '2026-11-03' }); });
    const realPut = store.put;
    let once = true;
    store.put = async (k, v) => {
      // Echtes IndexedDB antwortet später: Getippt wird nach dem Aufruf, nicht mittendrin
      if (once && k === `base_${UID}`) { once = false; await null; userEdits('db.students.g1[0].studentNotes.push({ text: "zwei", date: "2026-11-03" })'); }
      return realPut(k, v);
    };
    await sync(); await settle();
    await vi.waitFor(() => expect(app('isLocalDBChanged()')).toBe(false));
    expect(app('db.students.g1[0].studentNotes.map(n => n.text)')).toEqual(['eins', 'zwei']);
    expect(app('db.students.g1[1].studentNotes.map(n => n.text)')).toEqual(['cloud']);
    expect((await cloudContent()).students.g1[0].studentNotes.map(n => n.text)).toEqual(['eins', 'zwei']);
  });
  it('Note gegeben, dann Abgleich: „Rückgängig“ sagt Bescheid statt nichts zu tun', async () => {
    app('openSeatingStudentModal("a", "g1", "2026-11-03"); giveQuickGrade("2")');
    app('clearTimeout(window.syncTimeout); window.syncTimeout = null');
    const undo = [...document.querySelectorAll('.toast-undo button')].pop();
    await otherDevice(d => { d.students.g1[1].studentNotes.push({ text: "cloud", date: '2026-11-03' }); });
    await sync(); await settle();
    await vi.waitFor(() => expect(app('isLocalDBChanged()')).toBe(false));
    undo.click();
    expect(toasts()).toMatch(/Nicht mehr möglich/);
    expect(app('db.students.g1[0].grades.length')).toBe(2);
    app('clearTimeout(window.syncTimeout); window.syncTimeout = null');
  });
    it('offenes Eingabefenster: wartet wie bisher, danach zusammengeführt', async () => {
    userEdits('db.students.g1[0].studentNotes.push({ text: "gerät", date: "2026-11-03" })');
    await otherDevice(d => { d.students.g1[1].studentNotes.push({ text: "cloud", date: '2026-11-03' }); });
    app('openGroupStudents("g1"); openAddStudent()');
    await sync(); await settle();
    expect(app('db.students.g1[1].studentNotes.length')).toBe(0);
    app('closeModal("modal-add-student")');
    await settle();
    await vi.waitFor(() => expect(app('db.students.g1[1].studentNotes.length')).toBe(1));
  });
});

describe('mit Widerspruch: einzelne Fragen', () => {
  const widerspruch = async () => {
    userEdits('db.students.g1[0].grades[0].value = "2.5"; db.students.g1[1].studentNotes.push({ text: "gerät", date: "2026-11-03" })');
    await otherDevice(d => { d.students.g1[0].grades[0].value = '3.0'; d.students.g1[1].attendance.push({ id: 'x', date: '2026-11-03', type: 'abwesend', note: '' }); });
    await sync(); await settle();
  };
  it('Fenster nennt Schüler, Spalte und beide Werte sofort; „Übernehmen“ erst nach der Antwort; Sync pausiert', async () => {
    await widerspruch();
    expect(dialog()).toBe(true);
    expect(hidden('conflict-questions')).toBe(false);
    expect(hidden('conflict-whole')).toBe(true);
    const [q] = questions();
    expect(questions().length).toBe(1);
    expect(q.textContent).toMatch(/7b · Anna X/);
    expect(q.textContent).toMatch(/T1/);
    expect(q.textContent).toMatch(/Dieses Gerät: 2,5/);
    expect(q.textContent).toMatch(/Cloud: 3,0/);
    expect(document.getElementById('conflict-apply').disabled).toBe(true);
    const writes = cloud.writes;
    await sync(); await settle();
    expect(cloud.writes).toBe(writes);
    app('window.currentConflict = null; closeModal("modal-sync-conflict")');
  });
  it('Antwort „Cloud“: Wert übernommen, alles andere auch zusammengeführt, geht hoch', async () => {
    await widerspruch();
    questions()[0].querySelector('[data-side="b"]').click();
    expect(document.getElementById('conflict-apply').disabled).toBe(false);
    document.getElementById('conflict-apply').click();
    await vi.waitFor(() => expect(app('isLocalDBChanged()')).toBe(false));
    await settle();
    expect(dialog()).toBe(false);
    expect(app('window.currentConflict')).toBeNull();
    const c = await cloudContent();
    expect(c.students.g1[0].grades[0].value).toBe('3.0');
    expect(c.students.g1[1].studentNotes[0].text).toBe('gerät');
    expect(c.students.g1[1].attendance.length).toBe(1);
    expect(app('db.students.g1[0].grades[0].value')).toBe('3.0');
    expect(document.getElementById('sync-status-badge').textContent).not.toMatch(/Konflikt/);
  });
  it('„Alle: dieses Gerät“ beantwortet alle Werte', async () => {
    await widerspruch();
    document.getElementById('conflict-all-local').click();
    document.getElementById('conflict-apply').click();
    await vi.waitFor(() => expect(app('isLocalDBChanged()')).toBe(false));
    await settle();
    expect((await cloudContent()).students.g1[0].grades[0].value).toBe('2.5');
  });
  it('Gelöscht gegen geändert: steht auf „Behalten“, Übernehmen geht sofort, nichts geht verloren', async () => {
    userEdits('db.students.g1 = db.students.g1.filter(s => s.id !== "b")');
    await otherDevice(d => { d.students.g1[1].grades.push({ type: 'test', value: '4.0', date: '2026-11-03', note: 'T9' }); });
    await sync(); await settle();
    expect(questions().length).toBe(1);
    expect(questions()[0].textContent).toMatch(/Ben X/);
    expect(questions()[0].textContent).toMatch(/Auf diesem Gerät gelöscht, in der Cloud geändert/);
    expect(document.getElementById('conflict-apply').disabled).toBe(false);
    expect(questions()[0].querySelector('[data-side="a"]').getAttribute('aria-pressed')).toBe('true');
    document.getElementById('conflict-all-cloud').click();   // „Alle“ löscht nie etwas
    expect(questions()[0].querySelector('[data-side="a"]').getAttribute('aria-pressed')).toBe('true');
    document.getElementById('conflict-apply').click();
    await vi.waitFor(() => expect(app('isLocalDBChanged()')).toBe(false));
    await settle();
    expect(app('db.students.g1.map(s => s.id)')).toEqual(['a', 'b']);
    expect(app('db.students.g1[1].grades.length')).toBe(1);
  });
  it('Name mit HTML wird in der Frage nicht ausgeführt (Regel 3)', async () => {
    userEdits(`db.students.g1[0].firstName = '<img src=x onerror=window.__xss=1>'; db.students.g1[0].grades[0].value = "2.5"`);
    await otherDevice(d => { d.students.g1[0].grades[0].value = '<b>3.0</b>'; });
    await sync(); await settle();
    expect(document.querySelector('#conflict-question-list img, #conflict-question-list button b')).toBeNull();
    expect(questions()[0].textContent).toContain('<img');
    app('window.currentConflict = null; closeModal("modal-sync-conflict")');
  });
  it('„Stattdessen einen ganzen Stand wählen“ führt zum bisherigen Fenster', async () => {
    await widerspruch();
    document.getElementById('conflict-whole-link').click();
    expect(hidden('conflict-whole')).toBe(false);
    expect(hidden('conflict-questions')).toBe(true);
    app('window.currentConflict = null; closeModal("modal-sync-conflict")');
  });
});

describe('Rückfall auf das Fenster mit dem ganzen Stand', () => {
  const beideAendern = async () => {
    userEdits('db.students.g1[0].grades[0].value = "1.0"');
    await otherDevice(d => { d.students.g1[1].attendance.push({ id: 'x', date: '2026-11-03', type: 'abwesend', note: '' }); });
  };
  const fallback = () => { expect(dialog()).toBe(true); expect(hidden('conflict-whole')).toBe(false); expect(hidden('conflict-questions')).toBe(true); };
  afterEach(() => app('window.currentConflict = null; closeModal("modal-sync-conflict")'));
  it('keine Basis (einmal direkt nach dem Update): altes Fenster, mit Zusammenfassung', async () => {
    store.m.clear();
    await beideAendern();
    await sync(); await settle();
    fallback();
    const text = document.getElementById('conflict-differences').textContent;
    expect(text).toMatch(/Klasse 7b/);
    expect(text).toMatch(/1 Note/);
    expect(text).toMatch(/1 Fehlzeit/);
  });
  it('Basis gehört zu einer anderen Version oder einem anderen Konto: altes Fenster', async () => {
    store.m.get(`base_${UID}`).cloudTimestamp = 1;
    await beideAendern();
    await sync(); await settle();
    fallback();
  });
  it('Speicher gesperrt: altes Fenster, kein Fehler', async () => {
    store.get = async () => { throw new Error('gesperrt'); };
    await beideAendern();
    await sync(); await settle();
    fallback();
  });
  it('Sicherheitsnetz lässt sich nicht schreiben: kein Zusammenführen', async () => {
    const put = store.put;
    store.put = async (k, v) => { if (k === 'merge_backups') throw new Error('voll'); return put(k, v); };
    await beideAendern();
    await sync(); await settle();
    fallback();
  });
  it('kaputte Basis: altes Fenster', async () => {
    store.m.get(`base_${UID}`).data = '{kaputt';
    await beideAendern();
    await sync(); await settle();
    fallback();
  });
});

describe('Basis wird überall aktuell gehalten und mit gelöscht', () => {
  it('Pull setzt die Basis auf den Cloud-Stand; danach führt ein Konflikt von dort zusammen', async () => {
    await otherDevice(d => { d.groups[0].className = '7c'; });
    await sync(); await settle();
    expect(app('db.groups[0].className')).toBe('7c');
    const rec = store.m.get(`base_${UID}`);
    expect(rec.cloudTimestamp).toBe(cloud.store[UID].lastModified);
    expect(JSON.parse(rec.data).groups[0].className).toBe('7c');
  });
  it('nach dem Update ohne Basis: Sync ohne Änderungen legt sie an, ohne die Cloud anzufassen', async () => {
    store.m.clear();
    app('syncBaseSaved = null');
    const writes = cloud.writes;
    await sync(); await settle();
    expect(cloud.writes).toBe(writes);
    expect(store.m.get(`base_${UID}`).cloudTimestamp).toBe(cloud.store[UID].lastModified);
  });
  it('ein Sync ohne Änderung schreibt die Basis nicht jedes Mal neu', async () => {
    let puts = 0;
    const put = store.put;
    store.put = async (k, v) => { puts++; return put(k, v); };
    await sync(); await settle();
    await sync(); await settle();
    expect(puts).toBe(0);
  });
  it('„Dieses Gerät hochladen“ im alten Fenster setzt die Basis', async () => {
    store.m.clear();
    userEdits('db.students.g1[0].grades[0].value = "1.0"');
    await otherDevice(d => { d.students.g1[0].grades[0].value = '5.0'; });
    await sync(); await settle();
    await app('resolveConflict')('push');
    await settle();
    expect(store.m.get(`base_${UID}`).cloudTimestamp).toBe(cloud.store[UID].lastModified);
  });
  it('Alles löschen entfernt Basis und Sicherheitsnetz', async () => {
    store.m.set('merge_backups', [{ time: 1, local: '{}', cloud: '{}' }]);
    app('wipeLocalData()');
    await vi.waitFor(() => expect(store.m.size).toBe(0));
  });
  it('alte Kennungen bleiben: Cloud-Format und Dokument wie bisher', async () => {
    const doc = cloud.store[UID];
    expect(doc.format).toBe(2);
    expect(Object.keys(doc).sort()).not.toContain('base');
    expect(JSON.stringify(await cloudContent())).not.toMatch(/merge_backups/);
  });
});

describe('Einstellungen: Stand vor dem Zusammenführen zurückholen', () => {
  it('Knopf nur mit Sicherheitsnetz; Wiederherstellen gilt als Änderung und geht in die Cloud', async () => {
    await app('refreshMergeRestoreButton')();
    expect(hidden('merge-restore-row')).toBe(true);
    userEdits('db.students.g1[0].studentNotes.push({ text: "gerät", date: "2026-11-03" })');
    await otherDevice(d => { d.students.g1[1].studentNotes.push({ text: "cloud", date: '2026-11-03' }); });
    await sync(); await settle();
    await vi.waitFor(() => expect(app('isLocalDBChanged()')).toBe(false));
    await app('refreshMergeRestoreButton')();
    expect(hidden('merge-restore-row')).toBe(false);
    const done = app('restoreMergeBackup')();
    await vi.waitFor(() => expect(hidden('modal-choice')).toBe(false));
    app('answerChoice("local")');
    await done;
    expect(app('db.students.g1[1].studentNotes.length')).toBe(0);
    expect(app('db.students.g1[0].studentNotes.length')).toBe(1);
    expect(app('isLocalDBChanged()')).toBe(true);
    expect(app('db.syncSettings.lastSyncedCloudTimestamp')).toBe(cloud.store[UID].lastModified);
    app('clearTimeout(window.syncTimeout); window.syncTimeout = null');
  });
});
