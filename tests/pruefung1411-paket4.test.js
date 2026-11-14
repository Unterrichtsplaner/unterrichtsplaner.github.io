// Gesamtprüfung 14.11.2026, Paket 4: Plus-Konto und Scanner. BC1, BC3, BC4, BC5, BC6, BC8, BB6.
const fs = require('fs');
const path = require('path');
const { loadApp, loadScript, app } = require('./helpers/load-app');

const ACC = { id: 'A'.repeat(22), key: 'a'.repeat(43) };
const P = (id, date, value) => ({ id, date, value });
function sampleDB(extra = {}) {
  return {
    settings: { teacherName: 'Erika Testmann', blocks: null, studentApp: { on: true } },
    lessonSlots: [{ id: 's1', day: 0, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', color: '#6366f1', recurring: 'weekly' }],
    lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#6366f1', schularbeitWeight: 50, ...(extra.group || {}),
      studentApp: { on: true, access: { id: 'K'.repeat(22), key: 'k'.repeat(43) }, personal: { on: true, step: 10, shopOn: true, shopSince: '2026-08-01', ...(extra.personal || {}) } } }],
    students: { g1: [
      { id: 'a', firstName: 'Anna', lastName: 'Muster', grades: [], attendance: [], homework: [], studentNotes: [], studentApp: { access: ACC },
        participation: extra.participation || [P('p1', '2026-09-21', 'excellent'), P('p2', '2026-10-05', 'excellent'), P('p3', '2026-10-12', 'excellent'), P('p4', '2026-10-19', 'excellent')],
        redeemed: extra.redeemed || [] },
    ] },
  };
}
const load = x => app('db = migrateDB(' + JSON.stringify(sampleDB(x)) + ')');
const anna = () => app('db.students.g1[0]');
const choiceOpen = () => app('typeof choiceResolve === "function"');
const flush = async () => { for (let i = 0; i < 10; i++) await new Promise(r => setTimeout(r, 0)); };

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); loadScript('lib/jsQR.js'); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 9, 10, 0));
  load();
  if (choiceOpen()) app('answerChoice(null)');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
  globalThis.confirm = () => true;
});
afterEach(() => { if (app('plusScan')) app('closePlusScanner()'); vi.useRealTimers(); });

describe('BC1: Laden aus- und wieder einschalten im zweiten Schuljahr', () => {
  const secondYear = () => {
    vi.setSystemTime(new Date(2027, 9, 12, 10, 0));   // Di 12.10.2027
    load({ personal: { shopSince: '2026-11-12' },
      participation: [P('q1', '2027-08-20', 'excellent'), P('q2', '2027-09-01', 'excellent'), P('q3', '2027-09-08', 'excellent'), P('q4', '2027-10-01', 'excellent')],   // 8 Plusse
      redeemed: [{ id: 'r1', date: '2027-09-15', itemId: 'l-eins', name: 'Eine 1 (mündlich)', price: 6, kind: 'grade' }] });
  };
  it('Konto bleibt beim Aus und An erhalten', async () => {
    secondYear();
    expect(app('studentAccount(db.groups[0], db.students.g1[0]).balance')).toBe(2);
    await app('setShopOn("g1", false)');
    const on = app('setShopOn("g1", true)');
    await flush();
    expect(app('document.getElementById("modal-choice-text").textContent')).toMatch(/zählt weiter ab 01\.08\./);
    app('answerChoice("on")');
    await on;
    expect(app('db.groups[0].studentApp.personal.shopSince')).toBe('2027-08-01');
    expect(app('studentAccount(db.groups[0], db.students.g1[0]).balance')).toBe(2);
  });
  it('Einlösungen zählen erst ab dem Startdatum, wie die Plusse', () => {
    load({ personal: { shopSince: '2026-10-10' },
      redeemed: [{ id: 'r0', date: '2026-10-01', name: 'alt', price: 4, kind: 'perk' }, { id: 'r1', date: '2026-10-20', name: 'neu', price: 2, kind: 'perk' }] });
    // Plusse ab 10.10.: 12.10. und 19.10. (je ++) = 4, minus nur die Einlösung vom 20.10.
    expect(app('studentAccount(db.groups[0], db.students.g1[0])')).toMatchObject({ earned: 4, spent: 2, balance: 2 });
  });
  it('schon im Vorjahr ausgeschaltet: Einschalten zählt ab heute', async () => {
    vi.setSystemTime(new Date(2027, 9, 12, 10, 0));
    load({ personal: { shopOn: false, shopSince: '2026-11-12' } });
    const on = app('setShopOn("g1", true)');
    await flush();
    app('answerChoice("on")');
    await on;
    expect(app('db.groups[0].studentApp.personal.shopSince')).toBe('2027-10-12');
  });
});

describe('BC3: Scanner schnell geschlossen und wieder geöffnet', () => {
  it('keine Kamera läuft weiter', async () => {
    const pending = [], stopped = [];
    const mkStream = n => ({ n, getTracks: () => [{ stop: () => stopped.push(n) }] });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => new Promise(r => pending.push(r)) } });
    document.getElementById('plus-scan-video').play = async () => {};
    document.getElementById('plus-scan-video').pause = () => {};
    const first = app('openPlusScanner()');
    await vi.waitFor(() => expect(pending.length).toBe(1));
    app('closePlusScanner()');
    const second = app('openPlusScanner()');
    await vi.waitFor(() => expect(pending.length).toBe(2));
    pending[0](mkStream(1));   // erste Kamera kommt erst jetzt
    pending[1](mkStream(2));
    await first; await second;
    expect(stopped).toEqual([1]);   // die erste sofort wieder aus
    app('closePlusScanner()');
    expect(stopped).toEqual([1, 2]);
    delete navigator.mediaDevices;
  });
});

describe('BC4: Scanner auf dem Handy quer', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
  it('Fenster scrollt, Statuszeile steht über dem Kamerabild, Bild höchstens halbe Höhe', () => {
    expect(css).toMatch(/\.plus-scan-body\{[^}]*min-height:0;overflow-y:auto/);
    expect(css).toMatch(/\.plus-scan-status\{order:-1;\}/);
    expect(css).toMatch(/\.plus-scan-frame\{[^}]*width:min\(100%,50dvh\)/);
  });
});

describe('BC5: Punkte-Klassen', () => {
  it('Startwerte nennen die Bestnote der Skala, die Schülerseite zeigt „15“', () => {
    load({ group: { gradeScale: '0-15' } });
    const item = app('personalOf(db.groups[0]).shop.find(x => x.kind === "grade")');
    expect(item.name).toBe('15 Punkte (mündlich)');
    expect(app('SA_SHOP_KINDS.grade')).toBe('Note: Bestnote');
    load();
    expect(app('personalOf(db.groups[0]).shop.find(x => x.kind === "grade").name')).toBe('Eine 1 (mündlich)');
  });
  it('ein selbst gespeicherter Laden bleibt, wie er ist (Regel 48)', () => {
    load({ group: { gradeScale: '0-15' }, personal: { shop: [{ id: 'x', name: 'Eine 1 (mündlich)', price: 6, kind: 'grade', icon: 'one' }] } });
    expect(app('personalOf(db.groups[0]).shop[0].name')).toBe('Eine 1 (mündlich)');
  });
});

describe('BC6: Scanner nach „Rückgängig“', () => {
  it('derselbe Code wird wieder angenommen', async () => {
    const text = (await app('StudentShare').plusCode(ACC, 'l-platz', 2)).text;
    app('plusScan = { stream: null, timer: null, busy: false, last: null, done: new Set(), canvas: null }');
    const run = app('handleScannedCode')(text);
    await vi.waitFor(() => expect(choiceOpen()).toBe(true));
    app('answerChoice("ok")');
    await run;
    expect(anna().redeemed.length).toBe(1);
    // „Rückgängig“ im Hinweis
    const undo = [...document.querySelectorAll('#toast-container button')].find(b => /Rückgängig/.test(b.textContent));
    undo.click();
    expect(anna().redeemed.length).toBe(0);
    vi.setSystemTime(new Date(2026, 10, 9, 10, 1));
    const again = app('handleScannedCode')(text);
    await vi.waitFor(() => expect(choiceOpen()).toBe(true));
    app('answerChoice("ok")');
    await again;
    expect(anna().redeemed.length).toBe(1);
    app('plusScan = null');
  });
});

describe('BC8: Zwei eingelöste Noten am selben Tag auf zwei Geräten', () => {
  it('Abgleich behält beide Noten, Entfernen nimmt genau die eigene', () => {
    const base = JSON.parse(JSON.stringify(app('db')));
    app('applyRedemption(db.groups[0], db.students.g1[0], { itemId: "l-eins", name: "Eine 1 (mündlich)", price: 6, kind: "grade" })');
    const local = JSON.parse(JSON.stringify(app('db')));
    app('db = migrateDB(' + JSON.stringify(base) + ')');
    app('applyRedemption(db.groups[0], db.students.g1[0], { itemId: "l-eins", name: "Eine 1 (mündlich)", price: 6, kind: "grade" })');
    const cloud = JSON.parse(JSON.stringify(app('db')));
    const r = app('mergeDB')(base, local, cloud);
    expect(r.conflicts.length).toBe(0);
    const s = r.merged.students.g1[0];
    expect(s.redeemed.length).toBe(2);
    expect(s.grades.length).toBe(2);
    expect(s.grades.map(g => g.redeemRef).sort()).toEqual(s.redeemed.map(x => x.id).sort());
    app('db = migrateDB(' + JSON.stringify(r.merged) + ')');
    const second = app('db.students.g1[0].redeemed[1]');
    app('removeRedemption("g1", "a", db.students.g1[0].redeemed[1])');
    expect(anna().grades.length).toBe(1);
    expect(anna().grades[0].redeemRef).not.toBe(second.id);
  });
});

describe('BB6: Sitzplan-Leiste mit fünf Knöpfen', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
  it('Symbol über dem Wort auch zwischen 521 und 700 px', () => {
    const block = css.slice(css.indexOf('@container seating (min-width: 521px) and (max-width: 700px)'));
    expect(block).toMatch(/:has\(#btn-tool-redeem:not\(\.hidden\)\) \.seating-tool\{[^}]*flex-direction:column/);
  });
});
