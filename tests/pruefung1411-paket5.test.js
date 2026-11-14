// Gesamtprüfung 14.11.2026, Paket 5: Datenschutztexte und Cloud-Sicherungen. BD1, BD2, AY4.
const { loadApp, loadScript, app } = require('./helpers/load-app');
const { createFakeFirebase } = require('./helpers/fake-firebase');

const PW = 'richtig-geheim';
const UID = 'u1';
const memoryStore = () => {
  const m = new Map();
  return { m, get: async k => m.get(k), put: async (k, v) => { m.set(k, v); }, clear: async () => m.clear() };
};
function sampleDB() {
  return {
    settings: { teacherName: 'Erika Testmann', blocks: null, lastModified: 1000, studentApp: { on: true } },
    lessonSlots: [{ id: 's1', day: 0, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', color: '#6366f1', recurring: 'weekly' }],
    lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#6366f1', schularbeitWeight: 50,
      studentApp: { on: true, access: { id: 'K'.repeat(22), key: 'k'.repeat(43) }, personal: { on: true, step: 10 } } }],
    students: { g1: [{ id: 'a', firstName: 'Anna', lastName: 'Muster', grades: [], attendance: [], homework: [], studentNotes: [],
      participation: [{ id: 'p', date: '2026-11-02', value: 'positive' }], studentApp: { access: { id: 'A'.repeat(22), key: 'a'.repeat(43) } },
      stickersGiven: [{ id: 'x', date: '2026-11-03', name: 'Fleißig', icon: 'star', color: 1, xp: 10, reason: 'Referat' }],
      baustellen: [{ id: 'b', date: '2026-11-04', text: 'Hausaufgaben regelmäßig' }] }] },
  };
}
let cloud;
const SM = () => app('SyncManager');

beforeAll(() => {
  const fake = createFakeFirebase();
  globalThis.firebase = fake.firebase;
  cloud = fake.cloud;
  loadScript('lib/crypto-js.min.js');
  loadScript('crypto-helper.js');
  loadScript('sync-manager.js');
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
  SM().init({ apiKey: 'test' });
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 9, 10, 0));
  Object.assign(cloud, { store: {}, shares: {}, versions: {}, versionsDenied: false });
  SM().currentUser = { uid: UID, email: 'l@example.org' };
  SM().setMasterPassword(PW);
  SM().versionPending = null;
  app('db = migrateDB(' + JSON.stringify(sampleDB()) + ')');
  if (app('typeof choiceResolve === "function"')) app('answerChoice(null)');
});
afterEach(() => vi.useRealTimers());

describe('BD1: Datenschutzhinweise nennen alles, was auf die persönliche Seite geht', () => {
  it('Text passt zu den Feldern des Auszugs', () => {
    const snap = app('studentPersonalSnapshot(db.groups[0], db.students.g1[0], new Date())');
    const text = document.getElementById('modal-privacy').textContent;
    const need = { first: 'Vorname', level: 'Level', feedback: 'Rückmeldung zur Mitarbeit', streak: 'Serie', year: 'Jahreskarte', rank: 'Rang',
      gifts: 'Sticker mit dem Grund', bau: 'Baustellen mit ihrem Text', jokers: 'Joker', teacher: 'Anzeigename', giver: 'Anzeigename' };
    Object.entries(need).forEach(([key, words]) => { if (key in snap) expect(text, key).toContain(words); });
    expect(JSON.stringify(snap)).toContain('Referat');                     // Grund geht wirklich mit …
    expect(JSON.stringify(snap)).toContain('Hausaufgaben regelmäßig');    // … und der Baustellen-Text
    expect(text).toContain('Plus-Konto');
    expect(text).toContain('Rückblick');
  });
  it('„Was Schüler sehen“ trennt Klassenseite und persönliche Seiten', () => {
    const t = [...document.querySelectorAll('.field-hint-muted')].map(p => p.textContent).join('\n');
    expect(t).toMatch(/Klassenseite:[^\n]*Nie Namen/);
    expect(t).toMatch(/Persönliche Seiten[^\n]*Vorname[^\n]*Sticker[^\n]*Baustellen/);
  });
  it('Rückfrage beim Einschalten nennt Sticker-Gründe, Baustellen und den Anzeigenamen', async () => {
    app('db.groups[0].studentApp.personal.on = false');
    const p = app('setPersonalOn("g1", true)');
    await vi.waitFor(() => expect(app('typeof choiceResolve === "function"')).toBe(true));
    const text = document.getElementById('modal-choice-text').textContent;
    expect(text).toMatch(/Stickern mit dem Grund/);
    expect(text).toMatch(/Baustellen mit ihrem Text/);
    expect(text).toMatch(/Anzeigename/);
    app('answerChoice(null)');
    await p;
  });
  it('Datenschutzhinweise nennen den Stand vor dem Schuljahreswechsel und wie lange er bleibt', () => {
    const text = document.getElementById('modal-privacy').textContent;
    expect(text).toMatch(/Stand vor dem letzten Schuljahreswechsel \(8 Wochen/);
  });
});

describe('BD2: Stand vor dem Schuljahreswechsel bleibt nicht für immer', () => {
  beforeEach(() => { globalThis.syncStoreForTest = memoryStore(); app('syncStore = globalThis.syncStoreForTest'); });
  it('in den ersten 8 Wochen bleibt er, danach verdrängen ihn neuere Stände', async () => {
    await app('keepMergeBackup("vorher", "vorher", "newYear")');
    vi.setSystemTime(new Date(2026, 11, 20, 10, 0));   // 6 Wochen später
    for (let i = 0; i < 4; i++) await app(`keepMergeBackup("l${i}", "c${i}")`);
    expect(globalThis.syncStoreForTest.m.get('merge_backups').some(x => x.kind === 'newYear')).toBe(true);
    vi.setSystemTime(new Date(2027, 0, 10, 10, 0));    // 9 Wochen später
    for (let i = 4; i < 8; i++) await app(`keepMergeBackup("l${i}", "c${i}")`);
    const list = globalThis.syncStoreForTest.m.get('merge_backups');
    expect(list.some(x => x.kind === 'newYear')).toBe(false);
    expect(list.length).toBe(3);
  });
});

describe('AY4: Cloud leeren lässt keine Tages-Sicherung stehen', () => {
  it('der leere Stand legt keine Sicherung an', async () => {
    cloud.store[UID] = { ...(await app('CryptoHelper').encryptPayload(JSON.stringify(sampleDB()), PW)), lastModified: 500 };
    await SM().saveToCloud(JSON.stringify({ settings: {}, groups: [], students: {} }), 500, undefined, { noVersion: true });
    expect(Object.keys(cloud.versions[UID] || {})).toEqual([]);
  });
  it('Löschen wartet auf eine noch laufende Sicherung und löscht auch, was nicht im Verzeichnis steht', async () => {
    let finish;
    SM().versionPending = new Promise(r => { finish = r; }).then(() => { cloud.versions[UID] = { ...(cloud.versions[UID] || {}), '2026-11-09': { data: 'alt' }, index: { days: [{ day: '2026-11-09' }] } }; });
    cloud.versions[UID] = { '2026-11-01': { data: 'verwaist' } };   // nicht im Verzeichnis
    const del = SM().deleteCloudVersions();
    await new Promise(r => setTimeout(r, 0));
    finish();
    await del;
    expect(Object.keys(cloud.versions[UID])).toEqual([]);
  });
});
