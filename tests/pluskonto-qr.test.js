// Plus-Konto Stufe 2 (BUGS AV1): Einlöse-Code der Schülerseite, Prüfen und Einlösen im Planer, Kamera-Fenster.
// Der Code trägt eine Unterschrift mit dem Schlüssel des persönlichen Links (nie den Schlüssel selbst) und eine Einmal-Nummer.
const { loadApp, loadScript, app } = require('./helpers/load-app');

const TODAY = '2026-11-09';
const ACC = { id: 'A'.repeat(22), key: 'a'.repeat(43) };
const ACC_B = { id: 'B'.repeat(22), key: 'b'.repeat(43) };
const P = (id, date, value) => ({ id, date, value });
function sampleDB() {
  return {
    settings: { teacherName: 'Erika Testmann', blocks: null, studentApp: { on: true } },
    lessonSlots: [{ id: 's1', day: 0, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', color: '#6366f1', recurring: 'weekly' }],
    lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#6366f1', schularbeitWeight: 50,
      studentApp: { on: true, access: { id: 'K'.repeat(22), key: 'k'.repeat(43) }, personal: { on: true, step: 10 }, goal: { target: 50, reward: 'Spielestunde', since: '2026-09-01' } } }],
    students: { g1: [
      { id: 'a', firstName: 'Anna', lastName: 'Muster', grades: [], attendance: [], homework: [], studentNotes: [], studentApp: { access: ACC },
        participation: [P('p1', '2026-09-21', 'excellent'), P('p2', '2026-10-05', 'excellent'), P('p3', '2026-10-12', 'positive')] },   // 5 Plusse
      { id: 'b', firstName: 'Ben', lastName: 'Zweiter', grades: [], attendance: [], homework: [], studentNotes: [], studentApp: { access: ACC_B }, participation: [] },
    ] },
  };
}
const SS = () => app('StudentShare');
const anna = () => app('db.students.g1[0]');
const choiceOpen = () => app('typeof choiceResolve === "function"');
const choiceText = () => document.getElementById('modal-choice-title').textContent + '\n' + document.getElementById('modal-choice-text').textContent;
const code = (item, n, acc = ACC, nonce) => SS().plusCode(acc, item, n, nonce).then(c => c.text);
// Einlösen wie der Scanner: Rückfrage beantworten, Ergebnis abwarten
async function scan(text, answer = 'ok') {
  const run = app('redeemFromCode')(text);
  const first = await Promise.race([run, new Promise(r => setTimeout(() => r(null), 50))]);
  if (first) return { result: first, asked: null };
  await vi.waitFor(() => expect(choiceOpen()).toBe(true));
  const asked = choiceText();
  app(`answerChoice(${JSON.stringify(answer)})`);
  return { result: await run, asked };
}

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 9, 10, 0));
  app('db = migrateDB(' + JSON.stringify(sampleDB()) + ')');
  if (choiceOpen()) app('answerChoice(null)');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
});
afterEach(() => vi.useRealTimers());

describe('Einlöse-Code (student-share.js, gemeinsam für Planer und Schülerseite)', () => {
  it('enthält Kennung, Angebot, Preis, Einmal-Nummer und Unterschrift, aber nie den Schlüssel', async () => {
    const c = await SS().plusCode(ACC, 'l-song', 3);
    expect(c.text).toMatch(/^UP1:A{22}:l-song:3:[A-Za-z0-9_-]{11}:[A-Za-z0-9_-]{22}$/);
    expect(c.text).not.toContain(ACC.key);
    expect(c.text.length).toBeLessThan(90);   // kleiner QR-Code, gut lesbar
    const parsed = SS().parsePlusCode(c.text);
    expect(parsed).toMatchObject({ id: ACC.id, item: 'l-song', n: 3, nonce: c.nonce });
    expect(await SS().verifyPlusCode(parsed, ACC.key)).toBe(true);
  });
  it('falscher Schlüssel oder veränderter Inhalt: Unterschrift passt nicht', async () => {
    const c = await SS().plusCode(ACC, 'l-song', 3);
    expect(await SS().verifyPlusCode(SS().parsePlusCode(c.text), ACC_B.key)).toBe(false);
    expect(await SS().verifyPlusCode(SS().parsePlusCode(c.text.replace(':l-song:3:', ':l-eins:3:')), ACC.key)).toBe(false);
    expect(await SS().verifyPlusCode(SS().parsePlusCode(c.text.replace(':l-song:3:', ':l-song:1:')), ACC.key)).toBe(false);
  });
  it('jeder Code hat eine eigene Einmal-Nummer; Unbrauchbares wird kein Code', async () => {
    const a = await SS().plusCode(ACC, 'l-song', 3), b = await SS().plusCode(ACC, 'l-song', 3);
    expect(a.nonce).not.toBe(b.nonce);
    expect(await SS().plusCode(ACC, 'mit Leerzeichen', 3)).toBeNull();
    expect(await SS().plusCode(ACC, 'l-song', 0)).toBeNull();
    expect(SS().parsePlusCode('https://example.com')).toBeNull();
  });
});

describe('Prüfen und Einlösen im Planer (redeemFromCode)', () => {
  it('gültiger Code: Rückfrage mit Name, Angebot und „Konto reicht“ (ohne Kontostand), dann eingelöst mit Einmal-Nummer', async () => {
    const text = await code('l-song', 3);
    const { result, asked } = await scan(text);
    expect(asked).toMatch(/Anna Muster/);
    expect(asked).toMatch(/Song aussuchen · 3 Plusse/);
    expect(asked).toMatch(/Konto reicht/);
    expect(asked).not.toMatch(/5|verdient/);   // kein Kontostand (Beamer)
    expect(result.kind).toBe('ok');
    expect(anna().redeemed).toEqual([expect.objectContaining({ itemId: 'l-song', price: 3, kind: 'perk', date: TODAY, nonce: SS().parsePlusCode(text).nonce })]);
    expect(document.getElementById('toast-container').textContent).toMatch(/Rückgängig/);
  });
  it('derselbe Code ein zweites Mal: „schon eingelöst“, nichts doppelt', async () => {
    const text = await code('l-platz', 2);
    await scan(text);
    const again = await scan(text);
    expect(again.asked).toBeNull();
    expect(again.result).toMatchObject({ kind: 'error' });
    expect(again.result.msg).toMatch(/Schon eingelöst/);
    expect(anna().redeemed.length).toBe(1);
  });
  it('Abbrechen löst nichts ein', async () => {
    const { result } = await scan(await code('l-platz', 2), null);
    expect(result.kind).toBe('cancel');
    expect(anna().redeemed || []).toEqual([]);
  });
  it('falsche Unterschrift, fremder Link, kein Code: abgelehnt ohne Rückfrage', async () => {
    const good = await code('l-song', 3);
    const forged = good.replace(/:[A-Za-z0-9_-]{22}$/, ':' + 'x'.repeat(22));
    expect((await scan(forged)).result.msg).toMatch(/nicht gültig/);
    const foreign = await code('l-song', 3, { id: 'Z'.repeat(22), key: 'z'.repeat(43) });
    expect((await scan(foreign)).result.msg).toMatch(/kennt der Planer nicht/);
    expect((await scan('Hallo')).result.msg).toMatch(/kein Einlöse-Code/);
    // Annas Code mit Bens Kennung geht nicht: die Unterschrift gehört zu Annas Schlüssel
    const asBen = good.replace(ACC.id, ACC_B.id);
    expect((await scan(asBen)).result.msg).toMatch(/nicht gültig/);
    expect(anna().redeemed || []).toEqual([]);
    expect(app('db.students.g1[1]').redeemed || []).toEqual([]);
  });
  it('Konto reicht nicht: abgelehnt ohne Rückfrage', async () => {
    const r = await scan(await code('l-eins', 6));
    expect(r.asked).toBeNull();
    expect(r.result.msg).toMatch(/reicht nicht/);
  });
  it('Preis inzwischen geändert: die Rückfrage nennt den neuen, eingelöst wird der Preis aus dem Planer', async () => {
    const text = await code('l-song', 3);
    app('db.groups[0].studentApp.personal.shop = personalOf(db.groups[0]).shop.map(x => x.id === "l-song" ? { ...x, price: 4 } : x)');
    const { asked } = await scan(text);
    expect(asked).toMatch(/inzwischen 4 Plusse/);
    expect(anna().redeemed[0].price).toBe(4);
  });
  it('Angebot gelöscht: abgelehnt', async () => {
    const text = await code('l-song', 3);
    app('db.groups[0].studentApp.personal.shop = personalOf(db.groups[0]).shop.filter(x => x.id !== "l-song")');
    expect((await scan(text)).result.msg).toMatch(/nicht mehr/);
  });
  it('Spende per Code: zählt fürs Klassenziel; ohne Klassenziel abgelehnt', async () => {
    const before = app('classGoalCount(db.groups[0], "2026-09-01")');
    await scan(await code('donate', 3));
    expect(anna().redeemed[0]).toMatchObject({ kind: 'donate', price: 3 });
    expect(app('classGoalCount(db.groups[0], "2026-09-01")')).toBe(before + 3);
    app('delete db.groups[0].studentApp.goal');
    expect((await scan(await code('donate', 1))).result.msg).toMatch(/kein Klassenziel/);
  });
  it('eine 1 per Code trägt die Note ein', async () => {
    app('db.students.g1[0].participation.push({ id: "p4", date: "2026-11-02", value: "positive" })');   // 6 Plusse
    const { asked } = await scan(await code('l-eins', 6));
    expect(asked).toMatch(/mündliche Note/);
    expect(anna().grades).toEqual([expect.objectContaining({ type: 'muendlich', note: 'Plus-Konto' })]);
  });
  it('persönliche Seiten aus: abgelehnt', async () => {
    app('db.groups[0].studentApp.personal.on = false');
    expect((await scan(await code('l-song', 3))).result.msg).toMatch(/ausgeschaltet/);
  });
});

describe('Abgleich: derselbe Code auf zwei Geräten gescannt', () => {
  it('wird zu einer Einlösung zusammengeführt und zählt nur einmal', () => {
    const base = sampleDB();
    const l = JSON.parse(JSON.stringify(base)), c = JSON.parse(JSON.stringify(base));
    l.students.g1[0].redeemed = [{ id: 'r1', date: '2026-11-09', itemId: 'l-song', name: 'Song aussuchen', price: 3, kind: 'perk', nonce: 'N'.repeat(11) }];
    c.students.g1[0].redeemed = [{ id: 'r2', date: '2026-11-09', itemId: 'l-song', name: 'Song aussuchen', price: 3, kind: 'perk', nonce: 'N'.repeat(11) }];
    const r = app('mergeDB')(base, l, c);
    expect(r.merged.students.g1[0].redeemed.length).toBe(1);
    expect(r.conflicts).toEqual([]);
  });
  it('alte Doppel mit gleicher Einmal-Nummer zählen im Konto nur einmal', () => {
    app(`db.students.g1[0].redeemed = [{ id: 'r1', date: '2026-11-09', price: 3, kind: 'perk', nonce: 'N'.repeat(11) }, { id: 'r2', date: '2026-11-09', price: 3, kind: 'perk', nonce: 'N'.repeat(11) }]`);
    expect(app('studentAccount(db.groups[0], db.students.g1[0])')).toMatchObject({ spent: 3, balance: 2 });
  });
  it('der Auszug der persönlichen Seite nennt die Einmal-Nummern (für „wartet auf Bestätigung“)', () => {
    app(`db.students.g1[0].redeemed = [{ id: 'r1', date: '2026-11-09', itemId: 'l-song', name: 'Song aussuchen', price: 3, kind: 'perk', nonce: 'N'.repeat(11) }]`);
    expect(app('studentPersonalSnapshot(db.groups[0], db.students.g1[0], new Date())').account.redeemed[0].nonce).toBe('N'.repeat(11));
  });
});

describe('QR-Bild lesen (lib/jsQR.js) – derselbe Weg wie die Kamera', () => {
  it('ein mit lib/qrcode.js gezeichneter Einlöse-Code wird wieder gelesen', async () => {
    loadScript('lib/jsQR.js');
    const jsQR = typeof globalThis.jsQR === 'function' ? globalThis.jsQR : window.jsQR;
    expect(typeof jsQR).toBe('function');
    const text = await code('l-song', 3);
    const q = app('qrcode')(0, 'M');
    q.addData(text); q.make();
    const cell = 4, quiet = 4, n = q.getModuleCount(), size = (n + 2 * quiet) * cell;
    const data = new Uint8ClampedArray(size * size * 4).fill(255);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) {
      for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
        const i = (((r + quiet) * cell + y) * size + (c + quiet) * cell + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = 0;
      }
    }
    expect(jsQR(data, size, size).data).toBe(text);
  });
});

describe('Kamera-Fenster „Plusse einlösen“', () => {
  it('ohne Kamera: verständlicher Hinweis mit dem zweiten Weg; Schließen räumt auf', async () => {
    loadScript('lib/jsQR.js');
    if (typeof app('typeof jsQR') === 'string' && app('typeof jsQR') !== 'function') globalThis.jsQR = window.jsQR;
    await app('openPlusScanner()');
    expect(document.getElementById('modal-plus-scan').classList.contains('hidden')).toBe(false);
    await vi.waitFor(() => expect(document.getElementById('plus-scan-status').textContent).toMatch(/Schüler-Fenster/));
    expect(document.getElementById('plus-scan-status').classList.contains('is-error')).toBe(true);
    app('closeModalLikeButton("modal-plus-scan")');
    expect(document.getElementById('modal-plus-scan').classList.contains('hidden')).toBe(true);
    expect(app('plusScan')).toBeNull();
  });
  it('mit Kamera: Bild läuft, ein Code im Bild wird eingelöst, Schließen stoppt die Kamera', async () => {
    const stopped = [];
    const stream = { getTracks: () => [{ stop: () => stopped.push(1) }] };
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => stream } });
    const video = document.getElementById('plus-scan-video');
    video.play = async () => {};
    const text = await code('l-platz', 2);
    app('readPlusScanFrame = () => window.__frame || null');   // statt Kamerabild: der Text, den jsQR fände
    await app('openPlusScanner()');
    await vi.waitFor(() => expect(document.getElementById('plus-scan-status').textContent).toMatch(/vor die Kamera/));
    expect(video.hidden).toBe(false);
    window.__frame = text;
    await vi.waitFor(() => expect(choiceOpen()).toBe(true), { timeout: 2000 });
    window.__frame = null;
    app('answerChoice("ok")');
    await vi.waitFor(() => expect(document.getElementById('plus-scan-status').textContent).toMatch(/Anna: Sitzplatz aussuchen eingelöst/));
    expect(anna().redeemed.length).toBe(1);
    // Derselbe Code bleibt im Bild, auch nach Sekunden: keine Meldung „schon eingelöst“, keine zweite Rückfrage
    vi.setSystemTime(new Date(2026, 10, 9, 10, 1));
    window.__frame = text;
    await new Promise(r => setTimeout(r, 500));
    window.__frame = null;
    expect(choiceOpen()).toBe(false);
    expect(document.getElementById('plus-scan-status').textContent).toMatch(/eingelöst/);
    expect(document.getElementById('plus-scan-status').textContent).not.toMatch(/Schon/);
    app('closePlusScanner()');
    expect(stopped.length).toBe(1);
    expect(video.srcObject).toBeNull();
    delete navigator.mediaDevices;
  });
  it('liegt im Markup vor der Rückfrage (die erscheint darüber); Schließen wie der Knopf; blockiert den Abgleich nicht', () => {
    const all = [...document.querySelectorAll('.modal-overlay')].map(m => m.id);
    expect(all.indexOf('modal-plus-scan')).toBeLessThan(all.indexOf('modal-choice'));
    expect(document.getElementById('modal-plus-scan').getAttribute('onclick')).toMatch(/closeModalOnOverlay\(event,'modal-plus-scan'\)/);
    expect(app('typeof MODAL_CLOSE_ACTIONS["modal-plus-scan"]')).toBe('function');
    app('openModal("modal-plus-scan")');
    expect(app('inputModalOpen()')).toBe(false);
    app('closeModal("modal-plus-scan")');
  });
  it('Knopf „Einlösen“ im Sitzplan nur mit persönlichen Seiten; „Codes scannen“ im Reiter Schülerapp', () => {
    app('switchView("seating"); openSeatingForGroup("g1")');
    expect(document.getElementById('btn-tool-redeem').classList.contains('hidden')).toBe(false);
    app('db.groups[0].studentApp.personal.on = false; renderSeatingPlan()');
    expect(document.getElementById('btn-tool-redeem').classList.contains('hidden')).toBe(true);
    const SM = app('SyncManager');
    SM.isInitialized = true; SM.currentUser = { uid: 'u1' }; SM.publishShare = async () => {}; SM.closeShare = async () => true;
    app('db.groups[0].studentApp.personal.on = true; openGroupStudents("g1", "studentapp")');
    expect(document.querySelector('#overview-content #sa-scan')).not.toBeNull();
  });
});
