// Update auf diese Version: Gerät mit Daten der alten Version (main), Cloud ebenfalls von der alten Version.
// Erwartung (CLAUDE.md): keine unerwarteten Dialoge, kein Konflikt, nichts geht verloren, kein unnötiger Upload.
const { loadApp, loadScript, app } = require('./helpers/load-app');
const { createFakeFirebase } = require('./helpers/fake-firebase');

const PW = 'geheim-123';
function oldFormatDB() {
  return {
    settings: { teacherName: 'Alt', school: 'Schule', blocks: null, lastModified: 1750000000000 },
    lessonSlots: [
      { id: 's1', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: true },
      { id: 's2', day: 2, block: 2, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'biweekly', startWeek: 42 },
      { id: 's3', day: 3, block: 3, part: 'first', subject: 'AG', color: '#ef4444', recurring: false, specificDate: '2026-10-15' },
    ],
    lessonData: { 's1_2026-10-12': { notes: 'Alt-Notiz', hwEnabled: true, hwItems: [{ id: 'x', text: 'S. 5', targetDate: '2026-10-19' }] } },
    groups: [{ id: 'g1', subject: 'Mathe', className: '7a', color: '#6366f1', schularbeitWeight: 50 }],
    students: { g1: [{ id: 'a', firstName: 'Anna', lastName: 'A', grades: [{ type: 'schularbeit', value: '2-', date: '2026-10-05', note: 'KA' }], attendance: [], participation: [], homework: [], studentNotes: [] }] },
    syncSettings: { lastSyncedCloudTimestamp: 7000, syncedLocalModified: 1750000000000, uid: 'lehrer1' },
    acknowledgedWarnings: {},
  };
}

let cloud;
beforeAll(async () => {
  const fake = createFakeFirebase();
  globalThis.firebase = fake.firebase;
  cloud = fake.cloud;
  globalThis.alert = vi.fn();
  globalThis.confirm = vi.fn(() => true);
  localStorage.setItem('lehrerapp_v3', JSON.stringify(oldFormatDB()));
  localStorage.setItem('sync_master_password', PW);
  loadScript('lib/crypto-js.min.js');
  loadScript('crypto-helper.js');
  loadScript('sync-manager.js');
  loadApp();
  app('SyncManager').init({ apiKey: 'test' });
  const old = oldFormatDB(); delete old.syncSettings;
  cloud.store.lehrer1 = { ...(await app('CryptoHelper').encryptPayload(JSON.stringify(old), PW)), lastModified: 7000 };
});

describe('Update: alte Daten lokal + alte Cloud', () => {
  it('erster Sync nach dem Update: kein Konflikt, kein Dialog, kein Upload, nichts verändert', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 15, 9, 0));
    const SM = app('SyncManager');
    SM.currentUser = { uid: 'lehrer1', email: 'x@y.de' };
    SM.setMasterPassword(PW);
    const writesBefore = cloud.writes;
    await app('triggerSyncInternal')();
    await vi.waitFor(() => expect(app('syncRunning')).toBe(false));
    expect(app('window.currentConflict')).toBeFalsy();
    expect([...document.querySelectorAll('.modal-overlay:not(.hidden)')].map(m => m.id)).toEqual([]);
    expect(globalThis.alert).not.toHaveBeenCalled();
    expect(globalThis.confirm).not.toHaveBeenCalled();
    expect(cloud.writes).toBe(writesBefore);
    expect(app('isLocalDBChanged()')).toBe(false);
    vi.useRealTimers();
  });

  it('alte Daten bleiben vollständig, neue Felder nur ergänzt', () => {
    const d = app('db');
    expect(d.students.g1[0].grades[0].value).toBe('2-');
    expect(d.lessonData['s1_2026-10-12'].notes).toBe('Alt-Notiz');
    expect(d.lessonSlots).toHaveLength(3);
    expect(d.supervisions).toEqual([]);
    expect(d.settings.holidays).toBeUndefined();
    expect(d.lessonSlots.find(s => s.id === 's2').startDate).toBeTruthy(); // alte Migration läuft weiter
  });

  it('alle Ansichten lassen sich mit Altdaten zeichnen', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 15, 9, 0));
    ['dashboard', 'timetable', 'classes', 'seating'].forEach(v => expect(() => app(`switchView(${JSON.stringify(v)})`), v).not.toThrow());
    window.innerWidth = 400; expect(() => app('renderTimetable()')).not.toThrow(); window.innerWidth = 1024;
    expect(() => app('openGroupStudents("g1")')).not.toThrow();
    expect(() => app('openSettings()')).not.toThrow();
    expect(() => app('closeModal("modal-settings")')).not.toThrow();
    expect(() => app('openLessonDetail("s3", "2026-10-15")')).not.toThrow();
    expect(document.querySelectorAll('.tt-lesson').length).toBeGreaterThan(0);
    vi.useRealTimers();
  });

  it('inhaltlich gleicher Stand mit/ohne neue Felder ist kein Konflikt (cloudMatchesLocal)', () => {
    const old = oldFormatDB(); delete old.syncSettings;
    expect(app('cloudMatchesLocal')(JSON.stringify(old), JSON.stringify(app('db')))).toBe(true);
  });
});
