// lastModified ist die Versionskennung „lokal geändert“ und wird nur auf Gleichheit geprüft (CLAUDE.md, Cloud-Sync).
// Zwei Eingaben in derselben Millisekunde durften nicht dieselbe Kennung bekommen – sonst hielt der Sync die zweite
// für schon hochgeladen (zeigte sich als gelegentlich roter Test T4).
const { loadApp, app } = require('./helpers/load-app');

beforeAll(() => loadApp());
afterEach(() => vi.useRealTimers());

describe('saveDB: Kennung ändert sich bei jeder Eingabe', () => {
  it('zwei Eingaben zur selben Uhrzeit → zwei verschiedene, steigende Kennungen', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 15, 10, 0, 0, 0));
    app('saveDB()');
    const a = app('db.settings.lastModified');
    app('saveDB()');
    const b = app('db.settings.lastModified');
    expect(b).not.toBe(a);
    expect(b).toBeGreaterThan(a);
  });

  it('Uhr läuft normal: Kennung = aktuelle Zeit', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2027, 0, 1, 8, 0, 0, 0));
    app('saveDB()');
    expect(app('db.settings.lastModified')).toBe(new Date(2027, 0, 1, 8, 0, 0, 0).getTime());
  });
});
