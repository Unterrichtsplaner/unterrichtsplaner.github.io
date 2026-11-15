// Rangliste zwischen den Klassen (BUGS AX1): „Klasse des Monats“, Plusse pro Kopf im laufenden Monat, nur Klassen mit
// eingeschaltetem Schalter, eine Liste für alle eigenen Klassen. Nur Summen je Klasse, nie Namen (Regel 95).
const { loadApp, loadScript, app } = require('./helpers/load-app');

const X = `Peter's "Test" <img data-xss src=x>`;
const st = (id, part = []) => ({ id, firstName: id, lastName: 'X', grades: [], attendance: [], homework: [], studentNotes: [], participation: part });
const P = (date, value, extra = {}) => ({ id: date + value + Math.random(), date, value, ...extra });
const fill = (pre, n) => Array.from({ length: n }, (_, i) => st(pre + 'z' + i));   // Schüler ohne Plusse (Mindestgröße 5)
const acc = c => ({ id: c.repeat(22), key: c.toLowerCase().repeat(43) });
const G = (id, cls, subject, c, sa = {}) => ({ id, subject, className: cls, color: '#3b82f6', schularbeitWeight: 50, studentApp: { on: true, access: acc(c), ranking: true, ...sa } });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null, studentApp: { on: true } },
    lessonSlots: [], lessonData: {}, supervisions: [],
    groups: [G('g1', '7a', 'Mathe', 'A'), G('g2', '8b', 'Physik', 'B'), G('g3', '9c', 'Mathe', 'C'), G('g4', '5d', 'Mathe', 'D', { ranking: false })],
    students: {
      // 7a: 5 Schüler, November 2 + 1 + 1 = 4 an 3 Tagen (ohne Stundenplan zählt jeder Tag mit Plussen als Stunde, BE4)
      //     → 4 / 5 / 3 · 10 = 2,7 in 10 Stunden; Oktober 6 an 3 Tagen → 4,0
      g1: [st('a1', [P('2026-11-02', 'excellent'), P('2026-11-03', 'positive'), P('2026-11-04', 'negative'), P('2026-10-20', 'excellent'), P('2026-10-21', 'excellent')]),
           st('a2', [P('2026-11-05', 'positive', { label: 'Referat' }), P('2026-10-22', 'excellent')]), ...fill('a', 3)],
      // 8b: 5 Schüler, November 10 an 5 Tagen → 4,0, Spende zählt nicht
      g2: [st('b1', [P('2026-11-02', 'excellent'), P('2026-11-03', 'excellent')]), st('b2', [P('2026-11-02', 'excellent'), P('2026-11-09', 'excellent')]),
           st('b3', [P('2026-11-10', 'positive'), P('2026-11-11', 'positive')]), { ...st('b4'), redeemed: [{ id: 'r', date: '2026-11-10', name: 'Spende', price: 10, kind: 'donate' }] }, ...fill('b', 1)],
      // 9c: 5 Schüler, November 4 an 2 Tagen → 4,0 (gleich mit 8b)
      g3: [st('c1', [P('2026-11-06', 'excellent'), P('2026-11-09', 'excellent')]), ...fill('c', 4)],
      g4: [st('d1', [P('2026-11-06', 'excellent'), P('2026-11-07', 'excellent')]), ...fill('d', 4)],
    },
  };
}
const load = d => app('replaceDB(migrateDB(' + JSON.stringify(d) + '))');
const snap = id => app(`studentAppSnapshot(db.groups.find(g => g.id === ${JSON.stringify(id)}))`);

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); document.body.insertAdjacentHTML('beforeend', '<div id="page" hidden></div>'); loadScript('schueler.js'); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 12, 10, 0));   // Do 12.11.2026
  load(sampleDB());
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  app('SyncManager').currentUser = { uid: 'u1' }; app('SyncManager').isInitialized = true;
});
afterEach(() => { app('SyncManager').currentUser = null; app('SyncManager').isInitialized = false; app('switchView("dashboard")'); vi.useRealTimers(); });

describe('AX1: Rangliste rechnen', () => {
  it('Plusse pro Kopf in 10 Stunden im laufenden Monat, ohne Spenden, gleiche Werte gleicher Platz', () => {
    const r = snap('g1').ranking;
    expect(r.month).toBe('2026-11');
    expect(r.list).toEqual([
      { cls: '8b', subject: 'Physik', value: 4, place: 1 },
      { cls: '9c', subject: 'Mathe', value: 4, place: 1 },
      { cls: '7a', subject: 'Mathe', value: 2.7, place: 3, me: true },
    ]);
    expect(r.prev).toEqual({ month: '2026-10', winners: [{ cls: '7a', subject: 'Mathe' }] });
  });
  it('nie Namen oder einzelne Schüler im Auszug', () => {
    const text = JSON.stringify(snap('g2').ranking);
    ['a1', 'b1', 'c1', 'Spende', 'Referat'].forEach(w => expect(text).not.toContain(w));
  });
  it('ohne Schalter kein Feld im Auszug (gleiche Seite wie vorher), nicht freigegebene Klassen fehlen', () => {
    expect('ranking' in snap('g4')).toBe(false);
    app('db.groups[1].studentApp.on = false');
    expect(snap('g1').ranking.list.map(x => x.cls)).toEqual(['9c', '7a']);
  });
  it('erst ab zwei Klassen; leere Klassen zählen nicht mit', () => {
    app('db.groups[1].studentApp.ranking = false; db.students.g3 = []');
    expect('ranking' in snap('g1')).toBe(false);
  });
  it('Schülerapp aus: keine Rangliste', () => {
    app('db.settings.studentApp.on = false');
    expect('ranking' in snap('g1')).toBe(false);
  });
  it('Gruppen unter 5 Schülern machen nicht mit (Wert pro Kopf verriete Einzelne), mit Hinweis', () => {
    app('db.students.g3 = db.students.g3.slice(0, 4)');
    expect(snap('g1').ranking.list.map(x => x.cls)).toEqual(['8b', '7a']);
    expect('ranking' in snap('g3')).toBe(false);
    expect(app('rankingWaitText(db.groups[2], classRanking("2026-11"))')).toMatch(/Erst ab 5 Schülern \(jetzt 4\)/);
  });
  it('Vormonat ohne Plusse: kein Sieger', () => {
    vi.setSystemTime(new Date(2026, 9, 5, 10, 0));   // Oktober: September ohne Einträge
    expect(snap('g1').ranking.prev).toBeNull();
  });
});

describe('AX1: Schalter im Reiter „Schülerapp“', () => {
  it('schaltet ein und aus, Standard aus', () => {
    app('db.groups[3].studentApp = { on: true, access: ' + JSON.stringify(acc('D')) + ' }');
    expect(app('studentAppOf(db.groups[3]).ranking')).toBe(false);
    app('switchView("classes"); openGroupStudents("g4", "studentapp")');
    const box = document.getElementById('sa-ranking-on');
    expect(box.checked).toBe(false);
    box.checked = true; box.dispatchEvent(new Event('change'));
    expect(app('db.groups[3].studentApp.ranking')).toBe(true);
    expect(document.getElementById('sa-ranking').textContent).toMatch(/8b Physik/);
    expect(document.getElementById('sa-ranking').textContent).toMatch(/Gruppen unter 5 Schülern/);
    document.getElementById('sa-ranking-on').checked = false;
    document.getElementById('sa-ranking-on').dispatchEvent(new Event('change'));
    expect(app('db.groups[3].studentApp.ranking')).toBe(false);
  });
  it('Klassennamen in der Liste sind escaped (Regel 3)', () => {
    app('db.groups[1].className = ' + JSON.stringify(X) + '; db.groups[1].subject = ' + JSON.stringify(X));
    app('switchView("classes"); openGroupStudents("g1", "studentapp")');
    const card = document.getElementById('sa-ranking');
    expect(card.querySelector('[data-xss]')).toBeNull();
    expect(card.textContent).toContain(X);
  });
  it('Abgleich: beide Geräte verschieden → Frage mit Klartext', () => {
    const base = JSON.parse(JSON.stringify(app('db')));
    const local = JSON.parse(JSON.stringify(base)); local.groups[0].studentApp.ranking = false;
    const cloud = JSON.parse(JSON.stringify(base)); cloud.groups[0].studentApp.ranking = false; cloud.groups[0].studentApp.goal = { target: 5, reward: '', since: '2026-11-01' };
    expect(app('mergeDB')(base, local, cloud).merged.groups[0].studentApp.ranking).toBe(false);
    const local2 = JSON.parse(JSON.stringify(base)); local2.groups[0].studentApp.goal = { target: 5, reward: '', since: '2026-11-01' };
    const cloud2 = JSON.parse(JSON.stringify(base)); cloud2.groups[0].studentApp.ranking = false;
    expect(app('mergeDB')(base, local2, cloud2).merged.groups[0].studentApp.ranking).toBe(false);
    expect(app('MERGE_SPEC.fields.groups.item.fields.studentApp.together[0].what')).toBe('Rangliste der Klassen');
    // festgehaltene Sieger vom anderen Gerät kommen dazu
    const c3 = JSON.parse(JSON.stringify(base)); c3.settings.rankingWinners = { '2026-10': [{ id: 'g1', cls: '7a', subject: 'Mathe' }] };
    expect(app('mergeDB')(base, base, c3).merged.settings.rankingWinners).toEqual(c3.settings.rankingWinners);
  });
});

describe('AX1: Sieger des Vormonats bleibt, Klassen zählen ab dem Monat des Einschaltens (Wunsch 14.11., Fehler 15.11.)', () => {
  it('eine im November dazugeschaltete Klasse wird nicht „Sieger Oktober“, zählt aber den ganzen November', () => {
    // 5d: 4 Plusse im Oktober (besser als 7a) und 4 im November vor dem Einschalten
    app('db.students.g4[0].participation.push({ id: "o1", date: "2026-10-05", value: "excellent" }, { id: "o2", date: "2026-10-06", value: "excellent" }, { id: "o3", date: "2026-10-07", value: "excellent" }, { id: "o4", date: "2026-10-08", value: "excellent" })');
    app('setStudentAppRanking("g4", true)');
    expect(app('db.groups[3].studentApp.rankingSince')).toBe('2026-11-12');
    const r = snap('g1').ranking;
    expect(r.prev.winners).toEqual([{ cls: '7a', subject: 'Mathe' }]);
    const vorher = r.list.find(x => x.cls === '5d').value;
    expect(vorher).toBeGreaterThan(0);   // Plusse vom 6. und 7.11. zählen mit (15.11.: sonst stand überall 0)
    app('db.students.g4[0].participation.push({ id: "n1", date: "2026-11-06", value: "excellent" })');
    expect(snap('g1').ranking.list.find(x => x.cls === '5d').value).toBeGreaterThan(vorher);
  });
  it('Sieger wird festgehalten: Abschalten der Siegerklasse ändert den Vormonat nicht', () => {
    app('setStudentAppRanking("g1", false)');   // hält Oktober vorher fest
    expect(app('db.settings.rankingWinners["2026-10"]')).toEqual([{ id: 'g1', cls: '7a', subject: 'Mathe' }]);
    expect(snap('g2').ranking.prev.winners).toEqual([{ cls: '7a', subject: 'Mathe' }]);
  });
  it('Löschen der Siegerklasse ändert den Vormonat nicht', () => {
    app('removeGroupData("g1")');
    expect(snap('g2').ranking.prev.winners).toEqual([{ cls: '7a', subject: 'Mathe' }]);
  });
  it('Versand hält den Vormonat fest, ohne die Daten als geändert zu markieren', async () => {
    const SM = app('SyncManager');
    SM.publishShare = async () => {}; SM.closeShare = async () => {}; SM.deleteShare = async () => true; SM.shareTaken = async () => false;
    const before = app('db.settings.lastModified');
    await app('publishStudentApps()');
    expect(app('db.settings.rankingWinners["2026-10"]')).toEqual([{ id: 'g1', cls: '7a', subject: 'Mathe' }]);
    expect(app('db.settings.lastModified')).toBe(before);
  });
  it('ohne Teilnehmer wird nichts gespeichert', () => {
    app('db.groups.forEach(g => { if (g.studentApp) g.studentApp.ranking = false; })');
    app('freezeRankingWinners()');
    expect(app('db.settings.rankingWinners')).toBeUndefined();
  });
  it('versehentlich aus und am selben Tag wieder an behält den Starttag', () => {
    app('db.groups[0].studentApp.rankingSince = "2026-10-01"');
    app('setStudentAppRanking("g1", false); setStudentAppRanking("g1", true)');
    expect(app('db.groups[0].studentApp.rankingSince')).toBe('2026-10-01');
    app('setStudentAppRanking("g1", false)');
    vi.setSystemTime(new Date(2026, 10, 13, 10, 0));
    app('setStudentAppRanking("g1", true)');
    expect(app('db.groups[0].studentApp.rankingSince')).toBe('2026-11-13');
  });
});

describe('AX1: nur die Rangliste anders → höchstens stündlich schreiben (AK3)', () => {
  it('Plus in einer anderen Klasse schreibt die Seite erst nach 60 Minuten, eigene Änderungen nach 10', async () => {
    const writes = [];
    const SM = app('SyncManager');
    SM.publishShare = async id => { writes.push(id); }; SM.closeShare = async () => {}; SM.deleteShare = async () => true; SM.shareTaken = async () => false;
    Object.keys(localStorage).filter(k => k.startsWith('sa_')).forEach(k => localStorage.removeItem(k));
    const A = acc('A').id;
    const run = async () => { writes.length = 0; await app('publishStudentApps()'); return writes.filter(x => x === A).length; };
    expect(await run()).toBe(1);                                    // erste Seite sofort
    vi.setSystemTime(new Date(2026, 10, 12, 10, 20));
    app('db.students.g2[0].participation.push({ id: "n1", date: "2026-11-11", value: "excellent" })');   // nur 8b ändert sich (Tag mit Plussen, also nur mehr Plusse)
    expect(await run()).toBe(0);                                    // 7a: nur Rangliste anders, 20 Minuten → wartet
    vi.setSystemTime(new Date(2026, 10, 12, 11, 1));
    expect(await run()).toBe(1);                                    // nach 60 Minuten
    vi.setSystemTime(new Date(2026, 10, 12, 11, 12));
    app('db.groups[0].studentApp.goal = { target: 50, reward: "Spiel", since: "2026-11-01" }');   // eigene Änderung
    expect(await run()).toBe(1);                                    // nach 10 Minuten wie bisher
  });
});

describe('AX1: Schülerseite', () => {
  const page = () => document.getElementById('page') || document.body;
  const NOW = new Date(2026, 10, 12, 10, 0);
  const klasse = (ranking) => ({ v: 2, cls: '7a', subject: 'Mathe', teacher: 'T', next: null, hw: null, tests: null, toc: null, goal: null, ranking });
  const R = { month: '2026-11', list: [{ cls: '8b', subject: 'Physik', value: 2.5, place: 1 }, { cls: '7a', subject: 'Mathe', value: 2, place: 2, me: true }, { cls: X, subject: X, value: 1.25, place: 3 }],
    prev: { month: '2026-10', winners: [{ cls: '7a', subject: 'Mathe' }] } };
  it('Klassenseite zeigt Platz, Liste und Vormonat, alles escaped', () => {
    const el = document.createElement('div');
    el.innerHTML = window.SchuelerSeite.buildClassPage(klasse(R), NOW);
    const sec = el.querySelector('.ranking');
    expect(sec.textContent).toMatch(/Klasse des Monats/);
    expect(sec.textContent).toMatch(/November/);
    expect(sec.querySelector('.rk-me').textContent).toMatch(/7a/);
    expect(sec.textContent).toMatch(/2,5/);
    expect(sec.textContent).toMatch(/1,3|1,25/);
    expect(sec.textContent).toMatch(/Oktober: 7a Mathe/);
    expect(el.querySelector('[data-xss]')).toBeNull();
    expect(sec.textContent).toMatch(/Platz 2/);
  });
  it('alter Monat: „Endstand“', () => {
    const el = document.createElement('div');
    el.innerHTML = window.SchuelerSeite.buildClassPage(klasse(R), new Date(2026, 11, 1, 8, 0));
    expect(el.querySelector('.ranking').textContent).toMatch(/Endstand November/);
  });
  it('ohne Rangliste keine Fläche', () => {
    const el = document.createElement('div');
    el.innerHTML = window.SchuelerSeite.buildClassPage(klasse(undefined), NOW);
    expect(el.querySelector('.ranking')).toBeNull();
  });
  it('„Ich“ nennt den Platz der eigenen Klasse', () => {
    const me = { v: 1, kind: 'me', first: 'Anna', cls: '7a', subject: 'Mathe', level: 2, xp: 20, from: 10, next: 40, feedback: [], klasse: klasse(R) };
    window.SchuelerSeite.setMeTab('ich');
    const el = document.createElement('div');
    el.innerHTML = window.SchuelerSeite.buildMePage(me, NOW);
    expect(el.querySelector('.soon').textContent).toMatch(/Platz 2 von 3/);
  });
});

describe('AX1: Texte nennen die Rangliste', () => {
  it('Datenschutzhinweise und „Was Schüler sehen“', () => {
    expect(document.getElementById('modal-privacy').textContent).toMatch(/Rangliste/);
    const t = [...document.querySelectorAll('.field-hint-muted')].map(p => p.textContent).join('\n');
    expect(t).toMatch(/Klassenseite:[^\n]*Rangliste/);
  });
});

describe('BE4: pro Kopf und Stunde – wer eine Klasse öfter hat, liegt nicht automatisch vorn (Wunsch 15.11.)', () => {
  // Do 12.11.2026, 10:00. 7a jeden Tag im 1. Block (bis heute 9 Blöcke = 18 Stunden), 8b Mo + Di im 2. Block (4 Blöcke = 8 Stunden)
  const slot = (id, gid, day, block) => ({ id, day, block, part: 'full', subject: 'X', color: '#3b82f6', groupId: gid, recurring: 'weekly' });
  const lessonDays = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'];
  function fairDB() {
    const d = sampleDB();
    d.lessonSlots = [0, 1, 2, 3, 4].map(day => slot('s7' + day, 'g1', day, 1)).concat([slot('s8a', 'g2', 0, 2), slot('s8b', 'g2', 1, 2)]);
    // 7a: 18 Plusse an Stundentagen → 18 / 5 Schüler / 18 Stunden · 10 = 2,0
    d.students.g1 = [st('a1', lessonDays.flatMap(x => [P(x, 'positive'), P(x, 'positive')])), ...fill('a', 4)];
    // 8b: 10 Plusse an Stundentagen → 10 / 5 / 8 · 10 = 2,5 (weniger Plusse, aber pro Stunde mehr)
    d.students.g2 = [st('b1', ['2026-11-02', '2026-11-03', '2026-11-09', '2026-11-10'].flatMap(x => [P(x, 'excellent')]).concat([P('2026-11-10', 'positive'), P('2026-11-10', 'positive')])), ...fill('b', 4)];
    d.groups[2].studentApp.ranking = false;
    return d;
  }
  it('rechnet Plusse ÷ Schüler ÷ gehaltene Stunden, auf 10 Stunden', () => {
    load(fairDB());
    const r = snap('g1').ranking;
    expect(r.per).toBe(10);
    expect(r.list.map(x => [x.cls, x.value, x.place])).toEqual([['8b', 2.5, 1], ['7a', 2, 2]]);
  });
  it('Ausfall zählt nicht, heutige Stunden erst ab Beginn, Tag mit Plussen ohne Stunde zählt als eine', () => {
    const d = fairDB();
    d.lessonData['s8a_2026-11-09'] = { ausfall: true };            // 8b: nur noch 3 Blöcke = 6 Stunden → 10 / 5 / 6 · 10 = 3,3
    d.students.g2[0].participation.forEach(p => { if (p.date === '2026-11-09') p.date = '2026-11-10'; });   // sonst zählte der Tag über seine Plusse
    d.lessonSlots.push({ ...slot('s7late', 'g1', 3, 3), recurring: 'none', specificDate: '2026-11-12' });   // 7a: heute 11:45, noch nicht begonnen → zählt nicht
    d.students.g1[1].participation.push(P('2026-11-07', 'positive'), P('2026-11-07', 'positive'));   // Samstag zählt als 1 Stunde: 20 / 5 / 19 · 10 = 2,1
    load(d);
    expect(snap('g1').ranking.list.map(x => [x.cls, x.value])).toEqual([['8b', 3.3], ['7a', 2.1]]);
  });
  it('Schülerseite schreibt „pro Kopf in 10 Stunden“', () => {
    load(fairDB());
    window.renderStudentPage(app('studentAppSnapshot(db.groups[0])'));
    expect(document.getElementById('page').textContent).toMatch(/pro Kopf in 10 Stunden/);
  });
});

describe('BE4: Stunden richtig zählen – verlegt, Vertretung, Stundenplanwechsel, Ferien, Doppel- und Einzelstunden', () => {
  // Do 12.11.2026, 10:00; Standard-Blöcke sind 90 Minuten = 2 Stunden
  const slot = (id, gid, day, block, extra = {}) => ({ id, day, block, part: 'full', subject: 'X', color: '#3b82f6', groupId: gid, recurring: 'weekly', ...extra });
  const hours = () => Object.fromEntries([...app('rankingLessonCounts(db.groups.slice(0, 2), "2026-11", new Date())')].map(([k, v]) => [k, v]));
  function base(slots, lessonData = {}, settings = {}) {
    const d = sampleDB();
    d.students.g1 = fill('a', 5); d.students.g2 = fill('b', 5);   // keine Plusse: es zählen nur Stunden
    d.lessonSlots = slots; d.lessonData = lessonData; Object.assign(d.settings, settings);
    load(d);
  }
  it('Mo-Stunde im 1. Block: 2., 9. → 2 Blöcke = 4 Stunden', () => {
    base([slot('s1', 'g1', 0, 1)]);
    expect(hours()).toEqual({ g1: 4, g2: 0 });
  });
  it('nur an einem Tag verlegt (wie moveOccurrenceOnce): zählt einmal, am neuen Tag', () => {
    base([slot('s1', 'g1', 0, 1), slot('once', 'g1', 2, 3, { recurring: 'none', specificDate: '2026-11-04', movedFrom: { slotId: 's1', date: '2026-11-02' } })],
      { 's1_2026-11-02': { ausfall: true, movedTo: { slotId: 'once', date: '2026-11-04' } } });
    expect(hours()).toEqual({ g1: 4, g2: 0 });
  });
  it('Vertretung mit anderer Klasse am alten Platz: zählt für die Klasse, die da war', () => {
    base([slot('s1', 'g1', 0, 1), slot('v', 'g2', 0, 1, { recurring: 'none', specificDate: '2026-11-09' })],
      { 's1_2026-11-09': { ausfall: true, movedTo: { slotId: 'v', date: '2026-11-09' } } });
    expect(hours()).toEqual({ g1: 2, g2: 2 });
  });
  it('Stundenplanwechsel ab 9.11.: alte Stunde bis 6.11., neue ab 9.11.', () => {
    base([slot('alt', 'g1', 0, 1, { validUntil: '2026-11-06' }), slot('neu', 'g1', 1, 1, { validFrom: '2026-11-09', splitFrom: 'alt' })]);
    expect(hours()).toEqual({ g1: 4, g2: 0 });   // Mo 2.11. und Di 10.11.
  });
  it('Ferien: regelmäßige Stunde fällt aus, einmalige Nachholstunde in den Ferien zählt', () => {
    base([slot('s1', 'g1', 0, 1), slot('nach', 'g1', 2, 1, { recurring: 'none', specificDate: '2026-11-11' })], {},
      { holidays: [{ id: 'h', label: 'Buß- und Bettag', from: '2026-11-09', until: '2026-11-11' }] });
    expect(hours()).toEqual({ g1: 4, g2: 0 });   // Mo 2.11. (9.11. Ferien) + Nachholstunde 11.11.
  });
  it('halbe Stunde im 90-Minuten-Block zählt halb so viel wie ein ganzer Block', () => {
    base([slot('s1', 'g1', 0, 1), slot('h2', 'g2', 0, 2, { part: 'second' })]);
    expect(hours()).toEqual({ g1: 4, g2: 2 });
  });
  it('Einzelstunden-Plan (45 Minuten): jede Stunde zählt eins', () => {
    base([slot('s1', 'g1', 0, 1), slot('s2', 'g1', 0, 2)], {}, { blocks: [
      { num: 1, label: '1.', start: '08:00', end: '08:45' }, { num: 2, label: '2.', start: '08:45', end: '09:30' }] });
    expect(hours()).toEqual({ g1: 4, g2: 0 });
  });
});
