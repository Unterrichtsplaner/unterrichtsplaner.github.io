// G12: Unlesbare Daten in localStorage dürfen beim nächsten Speichern nicht überschrieben werden.
const { loadApp, app } = require('./helpers/load-app');

const KAPUTT = '{"groups":[{"id":"g1","className":"1A"}],"students":{"g1":[{"firstName":"An'; // abgeschnitten

describe('loadDB mit unlesbaren Daten', () => {
  beforeAll(() => {
    window.confirm = vi.fn(() => false);
    localStorage.setItem('lehrerapp_v3', KAPUTT);
    loadApp();
  });

  it('startet mit leerer DB, ohne abzustürzen', () => {
    expect(app('db').groups).toEqual([]);
  });

  it('sichert den Rohtext unter eigenem Schlüssel', () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('lehrerapp_v3_defekt_'));
    expect(keys).toHaveLength(1);
    expect(localStorage.getItem(keys[0])).toBe(KAPUTT);
  });

  it('sagt dem Nutzer Bescheid', async () => {
    await new Promise(r => setTimeout(r, 0));
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(window.confirm.mock.calls[0][0]).toMatch(/nicht gelesen/);
  });

  it('Speichern danach lässt die Kopie in Ruhe', () => {
    app('db.groups.push({ id: "neu", className: "2B" }); saveDB()');
    const key = Object.keys(localStorage).find(k => k.startsWith('lehrerapp_v3_defekt_'));
    expect(localStorage.getItem(key)).toBe(KAPUTT);
    expect(JSON.parse(localStorage.getItem('lehrerapp_v3')).groups[0].id).toBe('neu');
  });

  it('gültiges JSON, das keine DB ist (null), gilt auch als unlesbar', () => {
    localStorage.setItem('lehrerapp_v3', 'null');
    expect(app('loadDB()').groups).toEqual([]);
    const keys = Object.keys(localStorage).filter(k => k.startsWith('lehrerapp_v3_defekt_'));
    expect(keys.map(k => localStorage.getItem(k))).toContain('null');
  });

  it('ist der Speicher voll, wird der alte Stand nicht überschrieben, bis er heruntergeladen ist', () => {
    const orig = Storage.prototype.setItem;
    localStorage.setItem('lehrerapp_v3', KAPUTT);
    Storage.prototype.setItem = function(k, v) {
      if (k.startsWith('lehrerapp_v3_defekt_')) throw new DOMException('voll', 'QuotaExceededError');
      return orig.call(this, k, v);
    };
    try { app('db = loadDB()'); } finally { Storage.prototype.setItem = orig; }

    app('saveDB()');
    expect(localStorage.getItem('lehrerapp_v3')).toBe(KAPUTT);

    URL.createObjectURL = vi.fn(() => 'blob:x');
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    app('downloadUnreadableDB()');
    expect(click).toHaveBeenCalled();
    app('saveDB()');
    expect(localStorage.getItem('lehrerapp_v3')).not.toBe(KAPUTT);
  });
});
