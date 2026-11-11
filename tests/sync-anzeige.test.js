// AN1: Sync-Stand klein und immer sichtbar – unter „Einstellungen“ in der Leiste (iPad/Laptop), auf dem Handy im
// Dashboard und als Punkt am Dashboard-Menüpunkt bei Problemen. Ohne Cloud-Anmeldung nichts.
const { loadApp, app } = require('./helpers/load-app');

function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null, lastModified: 100 },
    lessonSlots: [], lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50 }],
    students: { g1: [] },
    syncSettings: { lastSyncedCloudTimestamp: 5, syncedLocalModified: 100, lastSyncCheck: new Date(2026, 10, 11, 9, 30).getTime() },
  };
}
const nav = () => document.getElementById('nav-sync-state');
const dash = () => document.getElementById('dash-sync-state');
const setOnline = on => Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => on });
const login = () => app('SyncManager.isInitialized = true; SyncManager.currentUser = { uid: "u1", email: "t@example.org" }; SyncManager.masterPassword = "pw"');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 11, 10, 0));
  app('db = ' + JSON.stringify(sampleDB()));
  app('syncStatusNow = "idle"; window.currentConflict = null');
  localStorage.removeItem('sync_last_ok');
  setOnline(true);
  login();
});
afterEach(() => {
  app('SyncManager.isInitialized = false; SyncManager.currentUser = null; SyncManager.masterPassword = ""');
  app('updateSyncIndicator()');
  setOnline(true);
  vi.useRealTimers();
});

describe('Zustände', () => {
  it('abgeglichen: „Synchronisiert · heute 09:30“ in der Leiste, kurz „09:30“ auf dem Handy', () => {
    app('updateSyncIndicator()');
    expect(nav().hidden).toBe(false);
    expect(nav().title).toBe('Synchronisiert · heute 09:30');
    expect(nav().classList.contains('is-ok')).toBe(true);
    expect(dash().textContent).toBe('09:30');
    expect(document.getElementById('nav-settings').getAttribute('aria-label')).toBe('Einstellungen, Synchronisiert · heute 09:30');
  });
  it('erfolgreicher Abgleich ohne Änderungen erneuert die Uhrzeit (nur auf dem Gerät gemerkt)', () => {
    app('noteSyncStatus("synced")');
    expect(nav().title).toBe('Synchronisiert · heute 10:00');
    expect(localStorage.getItem('sync_last_ok')).toBe(String(new Date(2026, 10, 11, 10, 0).getTime()));
    expect(JSON.stringify(app('db'))).not.toMatch(/sync_last_ok/);
  });
  it('gestern und älter', () => {
    vi.setSystemTime(new Date(2026, 10, 12, 8, 0));
    app('updateSyncIndicator()');
    expect(nav().title).toBe('Synchronisiert · gestern 09:30');
    vi.setSystemTime(new Date(2026, 10, 16, 8, 0));
    app('updateSyncIndicator()');
    expect(nav().title).toMatch(/^Synchronisiert · Mi\.?,? 11\.11\.$/);
  });
  it('eben eingetippt: „Abgleich …“', () => {
    app('db.settings.lastModified = 200; updateSyncIndicator()');
    expect(nav().title).toBe('Abgleich …');
    expect(nav().classList.contains('is-busy')).toBe(true);
  });
  it('offline ohne Wartendes: „Offline · Stand heute 09:30“, kein Punkt am Dashboard', () => {
    setOnline(false);
    app('updateSyncIndicator()');
    expect(nav().title).toBe('Offline · Stand heute 09:30');
    expect(document.getElementById('nav-dashboard').classList.contains('sync-alert')).toBe(false);
  });
  it('offline mit Änderungen: „Offline · Änderungen warten“, Punkt am Dashboard-Menüpunkt, Leiste öffnet „Daten & Cloud“', () => {
    setOnline(false);
    app('db.settings.lastModified = 200; updateSyncIndicator()');
    expect(nav().title).toBe('Offline · Änderungen warten');
    expect(nav().classList.contains('is-wait')).toBe(true);
    expect(dash().textContent).toBe('Offline · wartet');
    expect(document.getElementById('nav-dashboard').classList.contains('sync-alert')).toBe(true);
    expect(document.getElementById('nav-settings').classList.contains('sync-wait')).toBe(true);
    app('openSettingsFromNav()');
    expect(document.querySelector('.set-pane[data-pane="data"]').classList.contains('on')).toBe(true);
    app('closeModal("modal-settings")');
  });
  it('Fehler, Konflikt und fehlendes Passwort sind Probleme', () => {
    app('db.settings.lastModified = 200; noteSyncStatus("error")');
    expect(nav().title).toBe('Sync-Fehler · Änderungen nur hier');
    expect(nav().classList.contains('is-problem')).toBe(true);
    app('noteSyncStatus("conflict")');
    expect(nav().title).toBe('Abgleich offen · wartet auf dich');
    app('SyncManager.masterPassword = ""; updateSyncIndicator()');
    expect(nav().title).toBe('Sync pausiert · Passwort fehlt');
    expect(document.getElementById('nav-settings').classList.contains('has-sync')).toBe(true);   // feste Höhe
  });
  it('ohne Cloud-Anmeldung: nichts', () => {
    app('SyncManager.currentUser = null; updateSyncIndicator()');
    expect(nav().hidden).toBe(true);
    expect(dash().hidden).toBe(true);
    expect(document.getElementById('nav-settings').getAttribute('aria-label')).toBe('Einstellungen');
  });
});

describe('Aufbau', () => {
  it('Leiste: Anzeige steckt im Menüpunkt „Einstellungen“, nichts Weiteres in .sidebar-footer (Regel 92)', () => {
    const footer = document.querySelector('.sidebar-footer');
    expect(footer.children.length).toBe(1);
    expect(footer.querySelector('#nav-settings #nav-sync-state')).not.toBeNull();
    expect(document.getElementById('nav-settings').getAttribute('onclick')).toBe('openSettingsFromNav()');
  });
  it('Handy: Anzeige im Dashboard-Kopf, sonst ausgeblendet', () => {
    expect(document.querySelector('#view-dashboard .view-header #dash-sync-state')).not.toBeNull();
    const css = require('fs').readFileSync(require('path').join(__dirname, '..', 'style.css'), 'utf8');
    expect(css).toMatch(/\.dash-sync\{display:none;\}/);
    expect(css).toMatch(/@media \(max-width: 600px\)\{\n  \.dash-sync:not\(\[hidden\]\)\{display:inline-flex;/);
  });
  it('Text wird escaped (Regel 3): Anzeige baut nur aus festen Texten und Uhrzeit', () => {
    app('updateSyncIndicator()');
    expect(nav().querySelector('svg.ico')).not.toBeNull();
    expect([...nav().querySelectorAll('span')].map(x => x.textContent)).toEqual(['Synchronisiert', 'heute 09:30']);   // zwei Zeilen in der Leiste
  });
});
