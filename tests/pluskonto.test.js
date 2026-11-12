// Plus-Konto mit Laden (BUGS AV1, Stufe 1): + ist 1 Plus wert, ++ sind 2. Das Konto wird berechnet (nie gespeichert),
// Einlösen geht im Schüler-Fenster (eine 1, Vorteile, Spende ans Klassenziel). Der Laden ersetzt die Joker.
const { loadApp, app } = require('./helpers/load-app');

const TODAY = '2026-11-09';   // Montag
const P = (id, date, value, label) => ({ id, date, value, ...(label ? { label } : {}) });
function sampleDB() {
  return {
    settings: { teacherName: 'Erika Testmann', blocks: null, studentApp: { on: true } },
    lessonSlots: [{ id: 's1', day: 0, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', color: '#6366f1', recurring: 'weekly' }],
    lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#6366f1', schularbeitWeight: 50,
      studentApp: { on: true, access: { id: 'K'.repeat(22), key: 'k'.repeat(43) }, personal: { on: true, step: 10, shopOn: true, shopSince: '2026-08-01' } } }],
    students: { g1: [
      { id: 'a', firstName: 'Anna', lastName: 'Geheimrath', notes: 'Diabetes', importantNote: 'Allergie', studentNotes: [{ text: 'Elterngespräch', date: '2026-10-01' }],
        grades: [{ type: 'test', value: '5.0', date: '2026-10-12', note: 'Kurztest' }], attendance: [{ id: 'x', date: '2026-10-19', type: 'abwesend' }], homework: [],
        participation: [P('p1', '2026-09-21', 'positive'), P('p2', '2026-09-28', 'excellent'), P('p3', '2026-10-05', 'negative'),
          P('p4', '2026-10-12', 'positive'), P('p5', '2026-10-26', 'positive'), P('p6', '2026-11-02', 'excellent'), P('p7', '2026-11-02', 'excellent', 'Referat'),
          P('p0', '2026-07-01', 'excellent')] },   // letztes Schuljahr: zählt nicht
      { id: 'b', firstName: 'Ben', lastName: 'Zweiter', grades: [], attendance: [], homework: [], studentNotes: [], participation: [P('q1', '2026-11-02', 'positive')] },
    ] },
  };
}
const SECRETS = ['Geheimrath', 'Diabetes', 'Allergie', 'Elterngespräch', 'Kurztest', 'abwesend', 'Ben', 'Zweiter', '5.0'];
const anna = () => app('db.students.g1[0]');
const account = () => app('studentAccount(db.groups[0], db.students.g1[0])');
const sec = () => document.getElementById('sw-sec-studentapp');
const choices = () => [...document.querySelectorAll('#modal-choice-buttons button')].map(b => b.textContent);
const choiceOpen = () => app('typeof choiceResolve === "function"');
const answer = async v => { await vi.waitFor(() => expect(choiceOpen()).toBe(true)); app(`answerChoice(${JSON.stringify(v)})`); };
const undo = () => [...document.querySelectorAll('#toast-container button')].filter(b => /Rückgängig/.test(b.textContent)).pop().click();
const ONE = () => app('parseGradeInput("1").value');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 9, 10, 0));
  app('db = migrateDB(' + JSON.stringify(sampleDB()) + ')');
  if (choiceOpen()) app('answerChoice(null)');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
  const SM = app('SyncManager');   // angemeldet, aber ohne echte Cloud (wie schuelerapp-stufe2.test.js)
  SM.isInitialized = true; SM.currentUser = { uid: 'u1' };
  SM.publishShare = async () => {}; SM.closeShare = async () => true; SM.deleteShare = async () => true; SM.shareTaken = async () => false;
});
afterEach(() => vi.useRealTimers());

describe('Konto (berechnet, nie gespeichert)', () => {
  it('+ ist 1 Plus wert, ++ sind 2, auch mit Titel; Minus kostet nichts; nur dieses Schuljahr', () => {
    expect(account()).toMatchObject({ earned: 1 + 2 + 1 + 1 + 2 + 2, spent: 0, balance: 9 });   // p3 (−) zählt 0, p0 (Juli) fällt raus
    expect(anna().account).toBeUndefined();   // nichts gespeichert
  });
  it('Einlösungen ziehen ab, das Konto sinkt nie unter 0; Einlösungen aus dem letzten Schuljahr zählen nicht', () => {
    app('db.students.g1[0].redeemed = [{ id: "r1", date: "2026-10-01", name: "Song", price: 3, kind: "perk" }, { id: "r0", date: "2026-07-01", name: "Alt", price: 5, kind: "perk" }]');
    expect(account()).toMatchObject({ earned: 9, spent: 3, balance: 6 });
    app('db.students.g1[0].redeemed.push({ id: "r2", date: "2026-11-01", name: "Viel", price: 20, kind: "perk" })');
    expect(account().balance).toBe(0);
  });
  it('neues Schuljahr: Konto beginnt bei 0', () => {
    vi.setSystemTime(new Date(2027, 8, 14, 10, 0));
    expect(account()).toMatchObject({ earned: 0, spent: 0, balance: 0 });
  });
  it('Level und XP sinken beim Einlösen nie', () => {
    const xp = app('studentXP(db.students.g1[0])');
    app('db.students.g1[0].redeemed = [{ id: "r1", date: "2026-11-02", name: "Eine 1", price: 6, kind: "grade" }]');
    expect(app('studentXP(db.students.g1[0])')).toBe(xp);
  });
});

describe('Laden', () => {
  it('Startwerte wie abgesprochen (12.11.)', () => {
    expect(app('personalOf(db.groups[0]).shop').map(x => [x.name, x.price, x.kind])).toEqual([
      ['Sitzplatz aussuchen', 2, 'perk'], ['Partner wählen', 2, 'perk'], ['Song aussuchen', 3, 'perk'], ['Aufgabe aussuchen', 3, 'perk'],
      ['Rätsel der Stunde stellen', 3, 'perk'], ['Keine TÜ abgeben', 4, 'perk'], ['Eine 1 (mündlich)', 6, 'grade']]);
  });
  it('eigene Joker-Texte werden die ersten Angebote (bekannte mit ihrem Preis), dazu die 1', () => {
    app('db.groups[0].studentApp.personal.jokers = ["Partner wählen", "DJ für 5 Minuten"]');
    expect(app('personalOf(db.groups[0]).shop').map(x => [x.name, x.price, x.kind])).toEqual([
      ['Partner wählen', 2, 'perk'], ['DJ für 5 Minuten', 3, 'perk'], ['Eine 1 (mündlich)', 6, 'grade']]);
  });
  it('im Reiter „Schülerapp“ einrichten: Preis ändern, Angebot dazu und weg; keine Joker mehr', () => {
    app('openGroupStudents("g1", "studentapp")');
    const content = () => document.getElementById('overview-content');
    const rows = () => [...content().querySelectorAll('#sa-shop-list .sa-stk-row')];
    expect(content().querySelector('#sa-jokers')).toBeNull();
    expect(rows().length).toBe(7);
    expect(content().querySelector('#sa-shop-hint').textContent).toMatch(/etwa \d+ Plusse im Halbjahr und \d+ im Schuljahr/);
    const price = rows()[0].querySelector('[data-f="price"]');
    price.value = '1'; price.dispatchEvent(new Event('change', { bubbles: true }));
    expect(app('personalOf(db.groups[0]).shop[0]')).toMatchObject({ id: 'l-platz', price: 1 });
    content().querySelector('#sa-shop-add').click();
    expect(app('personalOf(db.groups[0]).shop').length).toBe(8);
    rows()[7].querySelector('[data-del]').click();
    expect(app('personalOf(db.groups[0]).shop').length).toBe(7);
    expect(app('db.groups[0].studentApp.personal.shop[0].price')).toBe(1);
  });
});

describe('Einlösen im Schüler-Fenster', () => {
  const open = () => app('openStudentDetail("a", "g1")');
  afterEach(() => { if (choiceOpen()) app('answerChoice(null)'); app('closeModal("modal-seating-student")'); });

  it('zeigt nur, wofür das Konto reicht; zieht ab, Mitarbeit bleibt; mit „Rückgängig“', async () => {
    app('db.students.g1[0].participation = db.students.g1[0].participation.filter(p => p.value !== "excellent")');   // 3 Plusse
    open();
    expect(sec().querySelector('#sw-sa-joker')).toBeNull();   // Joker gibt es nicht mehr
    sec().querySelector('#sw-sa-redeem').click();
    await vi.waitFor(() => expect(choiceOpen()).toBe(true));
    expect(choices()).toEqual(['Sitzplatz aussuchen · 2 Plusse', 'Partner wählen · 2 Plusse', 'Song aussuchen · 3 Plusse', 'Aufgabe aussuchen · 3 Plusse',
      'Rätsel der Stunde stellen · 3 Plusse', 'Abbrechen']);
    const parts = anna().participation.length;
    await answer('l-song');
    await vi.waitFor(() => expect((anna().redeemed || []).length).toBe(1));
    expect(anna().redeemed[0]).toMatchObject({ date: TODAY, itemId: 'l-song', name: 'Song aussuchen', price: 3, kind: 'perk' });
    expect(account().balance).toBe(0);
    expect(anna().participation.length).toBe(parts);
    undo();
    expect(anna().redeemed).toEqual([]);
  });
  it('„Eine 1“ trägt eine mündliche 1 mit Titel „Plus-Konto“ ein; „Rückgängig“ nimmt beides zurück', async () => {
    open();
    sec().querySelector('#sw-sa-redeem').click();
    await answer('l-eins');
    await vi.waitFor(() => expect((anna().redeemed || []).length).toBe(1));
    expect(anna().redeemed[0]).toMatchObject({ kind: 'grade', price: 6 });
    expect(anna().grades).toContainEqual({ type: 'muendlich', value: ONE(), date: TODAY, note: 'Plus-Konto' });
    expect(account().balance).toBe(3);
    undo();
    expect(anna().redeemed).toEqual([]);
    expect(anna().grades.map(g => g.note)).toEqual(['Kurztest']);
  });
  it('Punkte-Klasse: die beste Note sind 15 Punkte', async () => {
    app('db.groups[0].gradeScale = "0-15"');
    open();
    sec().querySelector('#sw-sa-redeem').click();
    await answer('l-eins');
    await vi.waitFor(() => expect(anna().grades.length).toBe(2));
    expect(anna().grades[1]).toMatchObject({ type: 'muendlich', value: '15', note: 'Plus-Konto' });
  });
  it('Spende nur mit Klassenziel; zählt fürs Klassenziel ein zweites Mal, die Klassenseite kennt nur die Summe', async () => {
    open();
    sec().querySelector('#sw-sa-redeem').click();
    await vi.waitFor(() => expect(choiceOpen()).toBe(true));
    expect(choices().join('|')).not.toMatch(/spenden/i);   // ohne Klassenziel
    app('answerChoice(null); closeModal("modal-seating-student")');
    app('db.groups[0].studentApp.goal = { target: 50, reward: "Spielestunde", since: "2026-09-01" }');
    expect(app('classGoalCount(db.groups[0], "2026-09-01")')).toBe(9 + 1);   // Anna 9, Ben 1
    open();
    sec().querySelector('#sw-sa-redeem').click();
    await vi.waitFor(() => expect(choiceOpen()).toBe(true));
    expect(choices()).toContain('Für die Klasse spenden');
    await answer('donate');
    await vi.waitFor(() => expect(choices()).toEqual(['1 Plus', '3 Plusse', '5 Plusse', 'Abbrechen']));   // 10 reicht nicht
    await answer(3);
    await vi.waitFor(() => expect((anna().redeemed || []).length).toBe(1));
    expect(anna().redeemed[0]).toMatchObject({ kind: 'donate', price: 3, date: TODAY });
    expect(account().balance).toBe(6);
    expect(app('classGoalCount(db.groups[0], "2026-09-01")')).toBe(10 + 3);
    const snap = app('studentAppSnapshot(db.groups[0], new Date())');
    expect(snap.goal).toMatchObject({ count: 13, donated: 3 });
    expect(JSON.stringify(snap)).not.toMatch(/Anna|Geheimrath|Ben/);
  });
  it('reicht für nichts: Hinweis, nichts eingetragen', () => {
    app('db.students.g1[0].participation = []');
    open();
    sec().querySelector('#sw-sa-redeem').click();
    expect(choiceOpen()).toBe(false);
    expect(document.getElementById('toast-container').textContent).toMatch(/reicht/);
    expect(anna().redeemed || []).toEqual([]);
  });
  it('Kontostand und Eingelöstes erst nach „Anzeigen“; einzeln entfernen mit „Rückgängig“', () => {
    app('db.students.g1[0].redeemed = [{ id: "r1", date: "2026-11-02", itemId: "l-song", name: "Song aussuchen", price: 3, kind: "perk" }]');
    open();
    const priv = sec().querySelector('.sw-sa-private');
    expect(priv.hasAttribute('data-private')).toBe(true);
    expect(priv.querySelector('.sw-sa-acct').textContent).toMatch(/Konto: 6 Plusse.*9 verdient, 3 eingelöst/);
    const outside = [...sec().querySelectorAll('#sw-studentapp > :not(.sw-sa-private)')].map(e => e.textContent).join(' ');
    expect(outside).not.toMatch(/\d+ Plusse|Song/);
    expect(priv.textContent).toMatch(/Song aussuchen/);
    priv.querySelector('[data-red-del="0"]').click();
    expect(anna().redeemed).toEqual([]);
    undo();
    expect(anna().redeemed.map(r => r.id)).toEqual(['r1']);
  });
  it('eine eingelöste 1 später entfernen nimmt die Note mit', () => {
    app(`db.students.g1[0].grades.push({ type: 'muendlich', value: ${JSON.stringify(ONE())}, date: '2026-11-02', note: 'Plus-Konto' });
      db.students.g1[0].redeemed = [{ id: 'r1', date: '2026-11-02', itemId: 'l-eins', name: 'Eine 1 (mündlich)', price: 6, kind: 'grade' }]`);
    open();
    sec().querySelector('[data-red-del="0"]').click();
    expect(anna().redeemed).toEqual([]);
    expect(anna().grades.map(g => g.note)).toEqual(['Kurztest']);
    undo();
    expect(anna().redeemed.length).toBe(1);
    expect(anna().grades.map(g => g.note)).toEqual(['Kurztest', 'Plus-Konto']);
  });
  it('alte Joker stehen weiter in der Liste, ohne Preis', () => {
    app('db.students.g1[0].jokersUsed = [{ id: "j1", date: "2026-10-20", text: "Platz wählen" }]');
    open();
    expect(sec().querySelector('.sw-sa-private').textContent).toMatch(/Joker: Platz wählen/);
    expect(account().spent).toBe(0);
  });
});

describe('Auszug der persönlichen Seite', () => {
  const snap = () => app('studentPersonalSnapshot(db.groups[0], db.students.g1[0], new Date())');
  it('Konto, Laden und eigene Einlösungen (neueste zuerst); keine Joker mehr; nichts Fremdes', () => {
    app(`db.students.g1[0].redeemed = [{ id: 'r1', date: '2026-10-01', itemId: 'l-song', name: 'Song aussuchen', price: 3, kind: 'perk', icon: 'music' },
      { id: 'r2', date: '2026-11-02', name: 'Spende an die Klasse', price: 1, kind: 'donate' }];
      db.students.g1[0].jokersUsed = [{ id: 'j1', date: '2026-10-20', text: 'Platz wählen' }]`);
    const s = snap();
    expect(s.jokers).toBeUndefined();
    expect(s.account).toMatchObject({ balance: 5, earned: 9, spent: 4 });
    expect(s.account.shop.map(x => x.name)).toContain('Eine 1 (mündlich)');
    expect(s.account.shop[0]).toEqual({ id: 'l-platz', name: 'Sitzplatz aussuchen', price: 2, kind: 'perk', icon: 'seat' });
    expect(s.account.redeemed.map(r => [r.date, r.name, r.price, r.kind])).toEqual([
      ['2026-11-02', 'Spende an die Klasse', 1, 'donate'], ['2026-10-20', 'Joker: Platz wählen', 0, 'joker'], ['2026-10-01', 'Song aussuchen', 3, 'perk']]);
    const json = JSON.stringify(s);
    SECRETS.forEach(x => expect(json).not.toContain(x));
  });
});

describe('Abgleich und Schuljahreswechsel', () => {
  it('Einlösungen auf zwei Geräten bleiben beide; der Laden als Ganzes', () => {
    const base = sampleDB();
    const l = JSON.parse(JSON.stringify(base)), c = JSON.parse(JSON.stringify(base));
    l.students.g1[0].redeemed = [{ id: 'r1', date: '2026-11-02', name: 'Song aussuchen', price: 3, kind: 'perk' }];
    c.students.g1[0].redeemed = [{ id: 'r2', date: '2026-11-03', name: 'Spende an die Klasse', price: 1, kind: 'donate' }];
    l.groups[0].studentApp.personal.shop = [{ id: 'x', name: 'A', price: 2, kind: 'perk', icon: 'star' }];
    c.groups[0].studentApp.personal.shop = [{ id: 'x', name: 'B', price: 2, kind: 'perk', icon: 'star' }];
    const r = app('mergeDB')(base, l, c);
    expect(r.merged.students.g1[0].redeemed.map(x => x.id).sort()).toEqual(['r1', 'r2']);
    expect(r.conflicts.map(q => q.what)).toEqual(['Laden']);
  });
  it('Schuljahreswechsel leert die Einlösungen (das Konto beginnt neu)', () => {
    expect(app('YEAR_LISTS')).toContain('redeemed');
  });
});

describe('Laden je Klasse einschalten (Standard aus, Wunsch 12.11. vor dem Live-Gang)', () => {
  const content = () => document.getElementById('overview-content');
  const off = () => app('delete db.groups[0].studentApp.personal.shopOn; delete db.groups[0].studentApp.personal.shopSince');
  const toggle = on => { const t = content().querySelector('#sa-shop-on'); t.checked = on; t.dispatchEvent(new Event('change')); };
  afterEach(() => { if (choiceOpen()) app('answerChoice(null)'); app('closeModal("modal-seating-student")'); });

  it('aus: alles wie vorher – Joker im Auszug und im Schüler-Fenster, kein Konto, kein Einlösen', () => {
    off();
    expect(app('personalOf(db.groups[0])')).toMatchObject({ shopOn: false, shopSince: null });
    const snap = app('studentPersonalSnapshot(db.groups[0], db.students.g1[0], new Date())');
    expect(snap.account).toBeUndefined();
    expect(snap.jokers).toMatchObject({ max: 4, every: 4 });
    app('openStudentDetail("a", "g1")');
    expect(sec().querySelector('#sw-sa-redeem')).toBeNull();
    expect(sec().textContent).toMatch(/Joker: .*frei/);
  });
  it('Einschalten im Reiter „Schülerapp“: Rückfrage nennt die Note; das Konto zählt ab heute', async () => {
    off();
    app('openGroupStudents("g1", "studentapp")');
    expect(content().querySelector('#sa-shop-on').checked).toBe(false);
    expect(content().querySelector('#sa-shop-list')).toBeNull();
    expect(content().querySelector('#sa-jokers')).not.toBeNull();   // aus: Joker wie bisher
    toggle(true);
    await vi.waitFor(() => expect(choiceOpen()).toBe(true));
    expect(document.getElementById('modal-choice-text').textContent).toMatch(/Note/);
    expect(document.getElementById('modal-choice-text').textContent).toMatch(/ersetzt die Joker/);
    app('answerChoice("on")');
    await vi.waitFor(() => expect(app('personalOf(db.groups[0]).shopOn')).toBe(true));
    expect(app('personalOf(db.groups[0]).shopSince')).toBe(TODAY);
    expect(account()).toMatchObject({ earned: 0, balance: 0 });   // Plusse von vorher zählen nicht
    expect(content().querySelector('#sa-shop-list')).not.toBeNull();
    expect(content().querySelector('#sa-jokers')).toBeNull();
    app(`db.students.g1[0].participation.push({ id: "n1", date: "${TODAY}", value: "excellent" })`);
    expect(account().earned).toBe(2);
    expect(app('studentPersonalSnapshot(db.groups[0], db.students.g1[0], new Date())').account.since).toBe(TODAY);
  });
  it('Abbrechen lässt den Laden aus', async () => {
    off();
    app('openGroupStudents("g1", "studentapp")');
    toggle(true);
    await vi.waitFor(() => expect(choiceOpen()).toBe(true));
    app('answerChoice(null)');
    await vi.waitFor(() => expect(content().querySelector('#sa-shop-on').checked).toBe(false));
    expect(app('personalOf(db.groups[0]).shopOn')).toBe(false);
  });
  it('Aus und wieder an: das Startdatum bleibt (kein versehentliches Zurücksetzen der Konten)', async () => {
    app('db.groups[0].studentApp.personal.shopSince = "2026-10-01"');
    window.confirm = () => true;
    app('openGroupStudents("g1", "studentapp")');
    toggle(false);
    expect(app('personalOf(db.groups[0])')).toMatchObject({ shopOn: false, shopSince: '2026-10-01' });
    toggle(true);
    await vi.waitFor(() => expect(choiceOpen()).toBe(true));
    app('answerChoice("on")');
    await vi.waitFor(() => expect(app('personalOf(db.groups[0]).shopOn')).toBe(true));
    expect(app('personalOf(db.groups[0]).shopSince')).toBe('2026-10-01');
  });
  it('Abgleich: An/Aus und Startdatum als Ganzes', () => {
    const base = sampleDB();
    const l = JSON.parse(JSON.stringify(base)), c = JSON.parse(JSON.stringify(base));
    delete base.groups[0].studentApp.personal.shopOn; delete base.groups[0].studentApp.personal.shopSince;
    l.groups[0].studentApp.personal.shopSince = '2026-11-02';
    c.groups[0].studentApp.personal.shopSince = '2026-11-05';
    const r = app('mergeDB')(base, l, c);
    expect(r.conflicts.map(q => q.what)).toEqual(['Plus-Konto und Laden']);
  });
});
