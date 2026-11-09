// Schülerapp, Stufe 1 (BUGS AJ1): Klassenseite ohne Personendaten. Zugang/Verschlüsselung (student-share.js),
// Auszug der Klasse (studentAppSnapshot), Veröffentlichen nur bei Änderung (publishStudentApps), Löschen,
// Reiter „Schülerapp“, Bereich in den Einstellungen, Beamer.
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');

const TODAY = '2026-11-09';   // Montag
function sampleDB() {
  return {
    settings: { teacherName: 'Erika Testmann', school: '', blocks: null, lastModified: 1 },
    lessonSlots: [
      { id: 's1', day: 0, block: 1, part: 'full', subject: 'Mathematik', room: 'R 104', groupId: 'g1', color: '#6366f1', recurring: 'weekly' },
      { id: 's2', day: 3, block: 2, part: 'full', subject: 'Mathematik', room: 'R 104', groupId: 'g1', color: '#6366f1', recurring: 'weekly' },
    ],
    lessonData: {
      's1_2026-11-02': { done: 'Terme vereinfachen\nzweite Zeile' },
      's1_2026-11-09': {
        hwEnabled: true, hwItems: [{ id: 'h1', text: 'S. 42 Nr. 3', targetDate: '2026-11-12' }],
        testEnabled: true, testItems: [{ id: 't1', text: 'Klassenarbeit Brüche', targetDate: '2026-11-19' }],
      },
    },
    groups: [{
      id: 'g1', subject: 'Mathematik', className: '7b', color: '#6366f1', schularbeitWeight: 50,
      plan: [
        { id: 'p1', title: 'Brüche', done: '2026-10-26' },
        { id: 'p2', title: 'Terme', lessons: 3, doneLessons: ['s1_2026-11-02'] },
        { id: 'p3', title: 'Gleichungen', lessons: 2 },
        { id: 'p4', title: 'Textaufgaben' },
      ],
    }],
    students: { g1: [{
      id: 'st1', firstName: 'Annalena', lastName: 'Geheimrath', notes: 'Diabetes', importantNote: 'Allergie',
      grades: [{ type: 'test', value: '5.0', date: '2026-11-02', note: 'Kurztest' }],
      attendance: [{ id: 'a1', date: '2026-11-02', type: 'abwesend', note: '' }],
      participation: [
        { id: 'q1', date: '2026-11-02', value: 'excellent' }, { id: 'q2', date: '2026-11-05', value: 'positive' },
        { id: 'q3', date: '2026-10-01', value: 'positive' }, { id: 'q4', date: '2026-11-05', value: 'negative' },
      ],
      homework: [], studentNotes: [{ text: 'Elterngespräch vertraulich', date: '2026-11-01' }],
    }] },
  };
}
const SECRETS = ['Annalena', 'Geheimrath', 'Diabetes', 'Allergie', 'Elterngespräch', 'Kurztest'];

// Cloud-Attrappe für publishShare/deleteShare
const cloud = { docs: {}, publishes: [], deletes: [], denied: false };
function stubCloud(loggedIn = true) {
  const SM = app('SyncManager');
  SM.isInitialized = loggedIn;
  SM.currentUser = loggedIn ? { uid: 'u1' } : null;
  SM.publishShare = async (id, enc) => {
    if (cloud.denied) throw Object.assign(new Error('denied'), { code: 'permission-denied' });
    cloud.publishes.push(id); cloud.docs[id] = enc;
  };
  SM.deleteShare = async (id) => {
    if (cloud.denied) throw Object.assign(new Error('denied'), { code: 'permission-denied' });
    cloud.deletes.push(id); const had = !!cloud.docs[id]; delete cloud.docs[id]; return had;
  };
}
const g = () => app('db.groups[0]');
const publish = () => app('publishStudentApps()');

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 9, 10, 0));
  app('db = migrateDB(' + JSON.stringify(sampleDB()) + ')');
  Object.assign(cloud, { docs: {}, publishes: [], deletes: [], denied: false });
  Object.keys(localStorage).filter(k => k.startsWith('sa_')).forEach(k => localStorage.removeItem(k));
  app('studentAppProblem = null; saPublishing = false; saPublishAgain = false');
  stubCloud(true);
});
afterEach(() => vi.useRealTimers());

describe('Zugang und Verschlüsselung (student-share.js)', () => {
  it('neuer Zugang: zufällige Kennung und 256-Bit-Schlüssel, jedes Mal anders', () => {
    const a = app('StudentShare.newAccess()'), b = app('StudentShare.newAccess()');
    expect(app('StudentShare.isAccess')(a)).toBe(true);
    expect(a.id).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(a.key).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a.id).not.toBe(b.id);
    expect(a.key).not.toBe(b.key);
  });

  it('verschlüsselt und entschlüsselt; Klartext steht nirgends im Dokument; falscher Schlüssel scheitert', async () => {
    const SS = app('StudentShare');
    const a = SS.newAccess();
    const doc = await SS.encrypt({ cls: '7b', text: 'Geheimes Thema' }, a.key);
    expect(JSON.stringify(doc)).not.toContain('Geheimes');
    expect(doc.format).toBe(1);
    expect(await SS.decrypt(doc, a.key)).toEqual({ cls: '7b', text: 'Geheimes Thema' });
    await expect(SS.decrypt(doc, SS.newAccess().key)).rejects.toThrow();
  });

  it('neueres Format meldet „neuere Version“ statt still zu scheitern (Regel 15)', async () => {
    const SS = app('StudentShare');
    await expect(SS.decrypt({ format: 2, iv: 'x', data: 'y' }, SS.newAccess().key)).rejects.toThrow(/neuere Version/);
  });

  it('Link: Schlüssel steht hinter „#“ (geht nie an den Server) und lässt sich wieder lesen', () => {
    const SS = app('StudentShare');
    const a = SS.newAccess();
    const link = SS.linkFor(a, 'https://unterrichtsplaner.github.io/schueler.html');
    expect(link.split('#')[0]).toBe('https://unterrichtsplaner.github.io/schueler.html');
    expect(SS.parseHash(new URL(link).hash)).toEqual(a);
    expect(SS.parseHash('#kaputt')).toBeNull();
    expect(SS.parseHash('')).toBeNull();
  });
});

describe('Auszug der Klasse (studentAppSnapshot)', () => {
  const snap = () => app('studentAppSnapshot(db.groups[0], new Date())');

  it('enthält nie Namen, Noten, Fehlzeiten, Hinweise oder Schülernotizen', () => {
    app('ensureStudentApp(db.groups[0]).show = { expedition: true, upcoming: true, hw: true, tests: true, next: true }');
    app('ensureStudentApp(db.groups[0]).goal = { target: 50, reward: "Spielestunde", since: "2026-11-01" }');
    const text = JSON.stringify(snap());
    SECRETS.forEach(s => expect(text, s).not.toContain(s));
    expect(text).not.toMatch(/abwesend|"5\.0"/);
  });

  it('Kopf: Klasse, Fach, Name der Lehrkraft (eigener Anzeigename vor dem Lehrernamen)', () => {
    expect(snap()).toMatchObject({ cls: '7b', subject: 'Mathematik', teacher: 'Erika Testmann' });
    app('db.settings.studentApp = { on: true, name: "Frau T." }');
    expect(snap().teacher).toBe('Frau T.');
  });

  it('Aufträge und Tests aus den fälligen Einträgen (über dueItemsFor, Regel 52), mit Datum der Stunde', () => {
    const s = snap();
    expect(s.hw).toEqual([{ date: '2026-11-12', text: 'S. 42 Nr. 3' }]);
    expect(s.tests).toEqual([{ date: '2026-11-19', text: 'Klassenarbeit Brüche' }]);
  });

  it('nächste Stunden mit Tag, Zeit und Raum, ohne Ausfall', () => {
    app('db.lessonData["s2_2026-11-12"] = { ausfall: true }');
    const s = snap();
    expect(s.next.length).toBeGreaterThan(1);
    expect(s.next.map(n => n.date)).not.toContain('2026-11-12');
    expect(s.next[0]).toMatchObject({ date: TODAY, start: '07:45', end: '09:15', room: 'R 104' });
  });

  const toc = () => snap().toc;
  const titles = items => items.map(x => `${x.state}:${x.title}`);

  it('Inhaltsverzeichnis: erledigte Themen, aktuelles mit „Stunde n von m“, kommende nur wenn freigegeben (AJ5)', () => {
    let t = toc();
    expect(t.fromLessons).toBe(false);
    expect(titles(t.items)).toEqual(['done:Brüche', 'now:Terme']);
    expect(t.items[1]).toMatchObject({ unit: 2, of: 3 });
    app('ensureStudentApp(db.groups[0]).show = { upcoming: true }');
    t = toc();
    expect(titles(t.items)).toEqual(['done:Brüche', 'now:Terme', 'later:Gleichungen', 'later:Textaufgaben']);
    expect(t.items[2]).toMatchObject({ of: 2, from: '2026-11-16' });   // Terme belegt noch 09.11. und 12.11.
  });

  it('Thema antippen: jede Stunde mit dem ganzen Text aus „Was wurde behandelt“, nie die Stundennotizen (AJ6 a)', () => {
    app('db.lessonData["s1_2026-11-02"].notes = "Max hat gestört"');
    const now = toc().items.find(x => x.state === 'now');
    expect(now.lessons).toEqual([{ date: '2026-11-02', text: 'Terme vereinfachen\nzweite Zeile' }]);
    expect(JSON.stringify(snap())).not.toContain('Max hat gestört');
  });

  it('alle erledigten Themen des Schuljahrs, auch ganz alte (Wunsch 09.11.: „alle“)', () => {
    app('db.groups[0].plan.unshift(...Array.from({ length: 8 }, (_, i) => ({ id: "a" + i, title: "Altes Thema " + i, done: "2026-09-" + String(10 + i) })))');
    expect(toc().items.filter(x => x.state === 'done').length).toBe(9);
  });

  it('mit Planung: „Was wurde behandelt“ ohne abgehaktes Thema steht als eigener Eintrag dazwischen (AJ3)', () => {
    // Nutzer (09.11.): Planung vorhanden, in den letzten Stunden nur „Was wurde behandelt“ ausgefüllt; heute ist um 10 Uhr vorbei
    app('db.lessonData["s2_2026-11-05"] = { done: "Wiederholung" }');
    app('db.lessonData["s1_2026-11-09"].done = "Übung Terme\\nNotiz"');
    const t = toc();
    expect(titles(t.items)).toEqual(['done:Brüche', 'done:Wiederholung', 'done:Übung Terme', 'now:Terme']);
    expect(t.items[2].lessons).toEqual([{ date: '2026-11-09', text: 'Übung Terme\nNotiz' }]);
  });

  it('eingetipptes, nicht abgehaktes Thema einer vergangenen Stunde rutscht weiter wie in der Planung, nie doppelt', () => {
    app('db.groups[0].plan = [{ id: "x0", title: "Liedanalyse", pinned: "2026-11-05", pinnedSlot: "s2" }, { id: "x1", title: "Rhythmus", lessons: 2 }]');
    expect(titles(toc().items)).toEqual(['done:Terme vereinfachen', 'now:Liedanalyse']);   // „Was wurde behandelt“ vom 02.11.
  });

  it('gleiche lose Einträge hintereinander werden einer, ausgefallene Stunden zählen nicht', () => {
    app('db.lessonData["s2_2026-10-29"] = { done: "Test" }');
    app('db.lessonData["s1_2026-11-02"].done = "anderes"');   // hat abgehaktes Thema „Terme“ → gehört zu Terme
    app('db.lessonData["s2_2026-11-05"] = { done: "test" }');
    app('db.lessonData["s1_2026-11-09"].done = "Test"');
    app('db.lessonData["s2_2026-10-22"] = { done: "Ausgefallen", ausfall: true }');
    const t = toc();
    expect(titles(t.items)).toEqual(['done:Brüche', 'done:Test', 'now:Terme']);
    expect(t.items[1].lessons.map(l => l.date)).toEqual(['2026-10-29', '2026-11-05', '2026-11-09']);
    expect(t.items[2].lessons).toEqual([{ date: '2026-11-02', text: 'anderes' }]);
  });

  it('ohne Planung: jede Stunde mit Text, Titel aus der ersten Zeile', () => {
    app('db.groups[0].plan = []');
    const t = toc();
    expect(t.fromLessons).toBe(true);
    expect(t.items).toEqual([{ title: 'Terme vereinfachen', state: 'done', lessons: [{ date: '2026-11-02', text: 'Terme vereinfachen\nzweite Zeile' }] }]);
  });

  it('Klassenarbeit: ausgewählte Themen als Titel in der Reihenfolge der Planung, gelöschte fallen weg (AJ6 b)', () => {
    app('db.lessonData["s1_2026-11-09"].testItems[0].topics = ["p3", "weg", "p2"]');
    expect(snap().tests[0]).toEqual({ date: '2026-11-19', text: 'Klassenarbeit Brüche', topics: ['Terme', 'Gleichungen'] });
    app('delete db.lessonData["s1_2026-11-09"].testItems[0].topics');
    expect(snap().tests[0]).toEqual({ date: '2026-11-19', text: 'Klassenarbeit Brüche' });
  });

  it('Klassenziel: Plusse seit dem Startdatum, ++ zählt doppelt, Minus zählt nicht; Stempel je Stunde (AJ6 c)', () => {
    expect(snap().goal).toBeNull();
    app('ensureStudentApp(db.groups[0]).goal = { target: 50, reward: "Spielestunde", since: "2026-11-01" }');
    const goal = snap().goal;
    expect(goal).toMatchObject({ target: 50, reward: 'Spielestunde', count: 3, since: '2026-11-01' });
    // Stunden: Mo 02.11. (++), Do 05.11. (+ und −), Mo 09.11. (vorbei, nichts) – nur Summen, keine Namen
    expect(goal.stamps).toEqual([{ date: '2026-11-02', n: 2 }, { date: '2026-11-05', n: 1 }, { date: '2026-11-09', n: 0 }]);
  });

  it('abgewählte Inhalte fehlen ganz', () => {
    app('ensureStudentApp(db.groups[0]).show = { expedition: false, hw: false, tests: false, next: false }');
    const s = snap();
    expect(s.toc).toBeNull(); expect(s.hw).toBeNull(); expect(s.tests).toBeNull(); expect(s.next).toBeNull();
  });
});

describe('Veröffentlichen (publishStudentApps)', () => {
  const turnOn = () => app('db.settings.studentApp = { on: true }; setStudentAppOn(db.groups[0].id, true)');

  it('ohne Cloud-Anmeldung passiert nichts', async () => {
    turnOn();
    stubCloud(false);
    await publish();
    expect(cloud.publishes).toEqual([]);
  });

  it('veröffentlicht verschlüsselt, was der Auszug enthält; ohne Änderung kein zweites Schreiben', async () => {
    turnOn();
    const access = g().studentApp.access;
    await publish();
    expect(cloud.publishes).toEqual([access.id]);
    const data = await app('StudentShare').decrypt(cloud.docs[access.id], access.key);
    expect(data).toMatchObject({ cls: '7b', hw: [{ date: '2026-11-12', text: 'S. 42 Nr. 3' }] });
    expect(typeof data.at).toBe('number');
    await publish();
    expect(cloud.publishes.length).toBe(1);   // gleicher Inhalt: nichts geschrieben
    app('db.lessonData["s1_2026-11-09"].hwItems.push({ id: "h2", text: "AB fertig", targetDate: "2026-11-12" })');
    await publish();
    expect(cloud.publishes.length).toBe(2);
  });

  it('Klasse abschalten löscht das Dokument, der Zugang bleibt für später', async () => {
    turnOn();
    await publish();
    const id = g().studentApp.access.id;
    app('setStudentAppOn(db.groups[0].id, false)');
    await publish();
    expect(cloud.deletes).toContain(id);
    expect(cloud.docs[id]).toBeUndefined();
    expect(g().studentApp.access.id).toBe(id);
  });

  it('Schülerapp ganz aus (Einstellungen): alle Dokumente weg', async () => {
    turnOn();
    await publish();
    app('db.settings.studentApp.on = false');
    await publish();
    expect(Object.keys(cloud.docs)).toEqual([]);
  });

  it('neuer Link: altes Dokument gelöscht, neues veröffentlicht', async () => {
    turnOn();
    await publish();
    const old = g().studentApp.access.id;
    app('renewStudentAppAccess(db.groups[0].id, true)');
    expect(g().studentApp.access.id).not.toBe(old);
    await publish();
    expect(cloud.docs[old]).toBeUndefined();
    expect(cloud.docs[g().studentApp.access.id]).toBeDefined();
  });

  it('Klasse löschen nimmt ihre Schülerseite mit (Regel 10)', async () => {
    turnOn();
    await publish();
    const id = g().studentApp.access.id;
    window.confirm = vi.fn(() => true);
    app('deleteGroup("g1")');
    await publish();
    expect(cloud.docs[id]).toBeUndefined();
  });

  it('Löschen ohne Netz bleibt vorgemerkt und klappt beim nächsten Mal', async () => {
    turnOn();
    await publish();
    const id = g().studentApp.access.id;
    app('setStudentAppOn(db.groups[0].id, false)');
    cloud.denied = true;
    await publish();
    expect(cloud.docs[id]).toBeDefined();
    cloud.denied = false;
    await publish();
    expect(cloud.docs[id]).toBeUndefined();
  });

  it('fehlende Firestore-Regeln: verständlicher Hinweis im Reiter', async () => {
    turnOn();
    cloud.denied = true;
    await publish();
    expect(app('studentAppProblem')).toBe('rules');
    app('openGroupStudents("g1", "studentapp")');
    expect(document.getElementById('overview-content').textContent).toMatch(/Firestore-Regeln/);
  });

  it('läuft nach einem erfolgreichen Sync an', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
    expect(src).toMatch(/\['uploaded', 'pulled', 'no_change'\]\.includes\(result\.status\)\)\s*publishStudentApps\(\)/);
  });
});

describe('Reiter „Schülerapp“ in der Klassenansicht', () => {
  const tab = () => document.getElementById('overview-tab-studentapp');
  const content = () => document.getElementById('overview-content');

  it('nur sichtbar, wenn die Schülerapp in den Einstellungen an ist', () => {
    app('openGroupStudents("g1")');
    expect(tab().classList.contains('hidden')).toBe(true);
    app('db.settings.studentApp = { on: true }; openGroupStudents("g1")');
    expect(tab().classList.contains('hidden')).toBe(false);
  });

  it('Freigabe einschalten legt den Zugang an, speichert und zeigt QR-Code und Knöpfe', () => {
    app('db.settings.studentApp = { on: true }; openGroupStudents("g1", "studentapp")');
    expect(content().querySelector('.sa-qr svg')).toBeNull();
    const before = app('db.settings.lastModified');
    const sw = content().querySelector('#sa-on');
    sw.checked = true; sw.dispatchEvent(new Event('change'));
    expect(app('db.settings.lastModified')).not.toBe(before);
    expect(app('StudentShare.isAccess(db.groups[0].studentApp.access)')).toBe(true);
    expect(content().querySelector('.sa-qr svg')).not.toBeNull();
    expect(content().textContent).toMatch(/Am Beamer zeigen/);
    expect(content().textContent).toMatch(/Neuen Link erzeugen/);
  });

  it('Klassenziel und sichtbare Inhalte werden beim Ändern gespeichert', () => {
    app('db.settings.studentApp = { on: true }; setStudentAppOn("g1", true); openGroupStudents("g1", "studentapp")');
    const target = content().querySelector('#sa-goal-target');
    target.value = '120'; target.dispatchEvent(new Event('change'));
    const reward = content().querySelector('#sa-goal-reward');
    reward.value = 'Rätselstunde'; reward.dispatchEvent(new Event('change'));
    // AJ4: neues Ziel zählt ab Beginn des Halbjahrs (Schuljahr ab 1. August), nicht erst ab heute
    expect(app('studentAppOf(db.groups[0]).goal')).toMatchObject({ target: 120, reward: 'Rätselstunde', since: '2026-08-01' });
    const hw = content().querySelector('input[data-show="hw"]');
    hw.checked = false; hw.dispatchEvent(new Event('change'));
    expect(app('studentAppOf(db.groups[0]).show.hw')).toBe(false);
  });

  it('Klassenziel zählt nachgetragene Plusse mit; „zählt ab“ lässt sich ändern (AJ4)', () => {
    // Nutzer (09.11.): erst Plusse für vergangene Stunden eingetragen, dann das Ziel angelegt → stand auf 0
    app('db.settings.studentApp = { on: true }; setStudentAppOn("g1", true); openGroupStudents("g1", "studentapp")');
    const target = content().querySelector('#sa-goal-target');
    target.value = '150'; target.dispatchEvent(new Event('change'));
    expect(app('studentAppSnapshot(db.groups[0], new Date()).goal.count')).toBe(4);   // ++ 02.11., + 05.11., + 01.10.
    const since = content().querySelector('#sa-goal-since');
    expect(since.value).toBe('2026-08-01');
    since.value = '2026-11-03'; since.dispatchEvent(new Event('change'));
    expect(app('studentAppOf(db.groups[0]).goal.since')).toBe('2026-11-03');
    expect(app('studentAppSnapshot(db.groups[0], new Date()).goal.count')).toBe(1);
    expect(content().textContent).toMatch(/Gesammelt seit 03\.11\.: 1/);
  });

  it('nach dem Halbjahr zählt ein neues Ziel ab dem Tag nach dem Halbjahresende (AJ4)', () => {
    app('db.settings.halfYearEnd = "2026-10-30"');
    app('setStudentAppGoal("g1", { target: 50 })');
    expect(app('studentAppOf(db.groups[0]).goal.since')).toBe('2026-10-31');
    app('db.settings.halfYearEnd = "2027-02-12"');   // Halbjahr läuft noch → Schuljahresbeginn
    app('delete db.groups[0].studentApp.goal; setStudentAppGoal("g1", { target: 50 })');
    expect(app('studentAppOf(db.groups[0]).goal.since')).toBe('2026-08-01');
  });

  it('„Am Beamer zeigen“ öffnet den großen Code mit Klasse und Fach', () => {
    app('db.settings.studentApp = { on: true }; setStudentAppOn("g1", true); openGroupStudents("g1", "studentapp"); showStudentAppBeamer("g1")');
    const m = document.getElementById('modal-studentapp-beamer');
    expect(m.classList.contains('hidden')).toBe(false);
    expect(m.querySelector('svg')).not.toBeNull();
    expect(m.textContent).toContain('7b');
    app('closeModal("modal-studentapp-beamer")');
  });

  it('ohne Cloud-Anmeldung: Hinweis statt Freigabe', () => {
    stubCloud(false);
    app('db.settings.studentApp = { on: true }; openGroupStudents("g1", "studentapp")');
    expect(content().textContent).toMatch(/braucht die Cloud/);
  });
});

describe('Themen einer Arbeit im Stunden-Fenster (AJ6 b)', () => {
  const list = () => document.getElementById('test-items-list');
  const item = () => app('db.lessonData["s1_2026-11-09"].testItems[0]');
  afterEach(() => app('closeModal("modal-lesson")'));

  it('ohne Schülerapp kein Knopf (andere Lehrkräfte sehen nichts Neues)', () => {
    app('openLessonDetail("s1", "2026-11-09")');
    expect(list().textContent).toContain('Klassenarbeit Brüche');
    expect(list().querySelector('.test-topics-btn')).toBeNull();
  });

  it('mit Schülerapp: „Was kommt dran?“ klappt die Themen der Planung auf, Antippen wählt und speichert', () => {
    app('db.settings.studentApp = { on: true }; ensureStudentApp(db.groups[0]).on = true');
    app('openLessonDetail("s1", "2026-11-09")');
    const btn = () => list().querySelector('.test-topics-btn');
    expect(btn().textContent).toMatch(/Was kommt dran/);
    btn().click();
    const chips = () => [...list().querySelectorAll('[data-topic]')];
    expect(chips().map(b => b.textContent)).toEqual(['Brüche', 'Terme', 'Gleichungen', 'Textaufgaben']);
    const before = app('db.settings.lastModified');
    chips()[1].click();
    chips()[0].click();
    expect(item().topics).toEqual(['p2', 'p1']);
    expect(app('db.settings.lastModified')).not.toBe(before);
    expect(chips()[0].getAttribute('aria-pressed')).toBe('true');
    expect(btn().textContent).toMatch(/Kommt dran \(2\)/);
    btn().click();   // zugeklappt: gewählte Themen darunter, in der Reihenfolge der Planung
    expect(list().querySelector('.test-topics-chosen').textContent).toBe('Brüche, Terme');
    btn().click();
    expect(app('studentAppSnapshot(db.groups[0], new Date()).tests[0].topics')).toEqual(['Brüche', 'Terme']);
    chips()[0].click(); chips()[1].click();
    expect(item().topics).toBeUndefined();   // nichts gewählt: Feld fällt weg
  });

  it('Test inzwischen weg (Sync): Hinweis statt Fehler, nichts wird angelegt', () => {
    app('db.settings.studentApp = { on: true }; ensureStudentApp(db.groups[0]).on = true');
    app('openLessonDetail("s1", "2026-11-09")');
    list().querySelector('.test-topics-btn').click();
    const chip = list().querySelector('[data-topic]');
    app('db.lessonData["s1_2026-11-09"].testItems = []');
    chip.click();
    expect(app('db.lessonData["s1_2026-11-09"].testItems')).toEqual([]);
  });
});

describe('Einstellungen → Schülerapp', () => {
  it('Schalter und Anzeigename werden mit „Speichern“ übernommen, Klassen stehen in der Liste', () => {
    app('openSettings(); showSettingsPane("studentapp")');
    expect(document.querySelector('#modal-settings .set-rail [data-pane="studentapp"]')).not.toBeNull();
    expect(document.getElementById('settings-studentapp-classes').textContent).toContain('7b');
    document.getElementById('settings-studentapp-on').checked = true;
    document.getElementById('settings-studentapp-name').value = '  Frau T.  ';
    app('saveSettings()');
    expect(app('db.settings.studentApp')).toEqual({ on: true, name: 'Frau T.' });
  });
});

describe('Abgleich zwischen Geräten (Regel 83)', () => {
  it('Themen einer Arbeit: auf zwei Geräten verschieden gewählt → beide bleiben, nie eine Rückfrage mit rohem Feldnamen', () => {
    const base = sampleDB();
    const local = JSON.parse(JSON.stringify(base)), cloud = JSON.parse(JSON.stringify(base));
    local.lessonData['s1_2026-11-09'].testItems[0].topics = ['p1'];
    cloud.lessonData['s1_2026-11-09'].testItems[0].topics = ['p2'];
    const r = app('mergeDB')(base, local, cloud);
    expect(r.conflicts).toEqual([]);
    expect(r.merged.lessonData['s1_2026-11-09'].testItems[0].topics.sort()).toEqual(['p1', 'p2']);
  });

  it('studentApp hat einen Eintrag in MERGE_SPEC: Zugang und Klassenziel als Ganzes', () => {
    const spec = app('MERGE_SPEC').fields.groups.item.fields.studentApp;
    expect(spec).toBeDefined();
    expect(spec.fields.access.atomic).toBe('ask');
    expect(spec.fields.goal.atomic).toBe('ask');
  });
});

describe('Firestore-Regeln (firestore.rules)', () => {
  const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');
  it('Schülerseiten: einzeln lesbar ohne Konto, nie auflistbar, schreiben/löschen nur der Besitzer', () => {
    const block = rules.slice(rules.indexOf('match /shares/{shareId}'));
    expect(block).toMatch(/allow get: if shareId\.matches/);
    expect(block).toMatch(/allow list: if false/);
    expect(block).toMatch(/request\.resource\.data\.owner == request\.auth\.uid/);
    expect(block).toMatch(/allow delete: if request\.auth != null && resource\.data\.owner == request\.auth\.uid/);
  });
  it('users_data bleibt unverändert: nur das eigene Dokument', () => {
    expect(rules).toMatch(/match \/users_data\/\{userId\} \{\s*allow read, write: if request\.auth != null && request\.auth\.uid == userId;/);
  });
});
