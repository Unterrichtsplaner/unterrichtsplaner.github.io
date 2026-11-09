// Schülerapp Stufe 2a (BUGS AJ2): persönliche Seiten. Je Schüler ein Link; Seite „Ich“ mit Level/XP aus den Plussen
// (berechnet), Rückmeldung, Serie, Rang, Joker. Nie Noten, Fehlzeiten, Hinweise, Notizen oder andere Schüler.
const { loadApp, app } = require('./helpers/load-app');

const TODAY = '2026-11-09';   // Montag
const P = (id, date, value, label) => ({ id, date, value, ...(label ? { label } : {}) });
function sampleDB() {
  return {
    settings: { teacherName: 'Erika Testmann', blocks: null, studentApp: { on: true } },
    lessonSlots: [{ id: 's1', day: 0, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', color: '#6366f1', recurring: 'weekly' }],
    lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#6366f1', schularbeitWeight: 50,
      studentApp: { on: true, access: { id: 'K'.repeat(22), key: 'k'.repeat(43) } } }],
    students: { g1: [
      { id: 'a', firstName: 'Anna', lastName: 'Geheimrath', notes: 'Diabetes', importantNote: 'Allergie', studentNotes: [{ text: 'Elterngespräch', date: '2026-10-01' }],
        grades: [{ type: 'test', value: '5.0', date: '2026-10-12', note: 'Kurztest' }], attendance: [{ id: 'x', date: '2026-10-19', type: 'abwesend' }], homework: [],
        participation: [P('p1', '2026-09-21', 'positive'), P('p2', '2026-09-28', 'excellent'), P('p3', '2026-10-05', 'negative'),
          P('p4', '2026-10-12', 'positive'), P('p5', '2026-10-26', 'positive'), P('p6', '2026-11-02', 'excellent'), P('p7', '2026-11-02', 'excellent', 'Referat'),
          P('p0', '2026-07-01', 'excellent')] },   // letztes Schuljahr: zählt nicht
      { id: 'b', firstName: 'Ben', lastName: 'Zweiter', grades: [], attendance: [], homework: [], studentNotes: [], participation: [] },
    ] },
  };
}
const SECRETS = ['Geheimrath', 'Diabetes', 'Allergie', 'Elterngespräch', 'Kurztest', 'abwesend', 'Ben', 'Zweiter', '5.0'];
const cloud = { docs: {}, publishes: [], deletes: [] };
function stubCloud() {
  const SM = app('SyncManager');
  SM.isInitialized = true; SM.currentUser = { uid: 'u1' };
  SM.publishShare = async (id, enc) => { cloud.publishes.push(id); cloud.docs[id] = enc; };
  SM.deleteShare = async id => { cloud.deletes.push(id); const had = !!cloud.docs[id]; delete cloud.docs[id]; return had; };
}
const anna = () => app('db.students.g1[0]');
const answer = async v => { await vi.waitFor(() => expect(app('typeof choiceResolve === "function"')).toBe(true)); app(`answerChoice(${JSON.stringify(v)})`); };

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 9, 10, 0));
  app('db = migrateDB(' + JSON.stringify(sampleDB()) + ')');
  Object.assign(cloud, { docs: {}, publishes: [], deletes: [] });
  Object.keys(localStorage).filter(k => k.startsWith('sa_')).forEach(k => localStorage.removeItem(k));
  app('studentAppProblem = null; saPublishing = false; saPublishAgain = false');
  if (app('typeof choiceResolve === "function"')) app('answerChoice(null)');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  stubCloud();
});
afterEach(() => vi.useRealTimers());

describe('Level, XP, Rang, Joker (berechnet, nie gespeichert)', () => {
  it('XP: + 10, ++ 20, nur dieses Schuljahr; Minus zieht nie ab', () => {
    expect(app('studentXP(db.students.g1[0])')).toBe(10 + 20 + 10 + 10 + 20 + 20);   // p3 (−) zählt 0, p0 (Juli) fällt raus
  });
  it('Level 2 mit dem ersten Plus, gleich große Schritte', () => {
    expect(app('levelInfo(0, 15)')).toEqual({ level: 1, from: 0, next: 10 });
    expect(app('levelInfo(10, 15)')).toEqual({ level: 2, from: 10, next: 25 });
    expect(app('levelInfo(90, 15)')).toEqual({ level: 7, from: 85, next: 100 });
  });
  it('XP je Level aus Stunden pro Woche und Tempo: Mittlere erreichen das Ziel-Level', () => {
    expect(app('personalStepFor(db.groups[0], "normal")')).toBe(15);   // 1 Std./Woche: 36 × 4,7 ≈ 169 XP / 10 Schritte
    expect(app('personalStepFor(db.groups[0], "easy")')).toBe(15);
    expect(app('personalStepFor(db.groups[0], "hard")')).toBe(20);
    app("db.lessonSlots.push({ id: 's2', day: 3, block: 2, part: 'full', groupId: 'g1', recurring: 'weekly' })");
    expect(app('personalStepFor(db.groups[0], "normal")')).toBe(35);
  });
  it('Rang je Klasse, Joker alle 4 Level, eingelöste abgezogen', () => {
    app('db.groups[0].studentApp.personal = { on: true, step: 10, ranks: ["Bleistift","Buntstift","Fineliner","Füller","Textmarker","Goldfüller"] }');
    const i = app('studentPersonalInfo(db.groups[0], db.students.g1[0])');   // 90 XP, Schritt 10 → Level 10
    expect(i).toMatchObject({ xp: 90, level: 10, rank: 'Textmarker', nextRank: { name: 'Goldfüller', level: 11 } });
    expect(i.jokers).toEqual({ earned: 2, used: 0, open: 2 });
    app('db.students.g1[0].jokersUsed = [{ id: "j1", date: "2026-10-20" }, { id: "j0", date: "2026-06-01" }]');
    expect(app('studentPersonalInfo(db.groups[0], db.students.g1[0]).jokers')).toEqual({ earned: 2, used: 1, open: 1 });
  });
});

describe('Auszug der persönlichen Seite', () => {
  beforeEach(() => app('db.groups[0].studentApp.personal = { on: true, step: 15 }'));
  const snap = () => app('studentPersonalSnapshot(db.groups[0], db.students.g1[0], new Date())');

  it('nur der eigene Vorname: nie Nachname, Noten, Fehlzeiten, Hinweise, Notizen oder andere Schüler', () => {
    const text = JSON.stringify(snap());
    SECRETS.forEach(x => expect(text, x).not.toContain(x));
    expect(snap()).toMatchObject({ kind: 'me', first: 'Anna', cls: '7b', subject: 'Mathe', teacher: 'Erika Testmann' });
  });
  it('Rückmeldung: Stunden ohne Titel mit allen vier Stufen, älteste zuerst', () => {
    expect(snap().feedback.map(f => f.v)).toEqual(['positive', 'excellent', 'negative', 'positive', 'positive', 'excellent']);
  });
  it('Serie: Stunden in Folge mit Plus; Fehltag und heute ohne Eintrag unterbrechen nicht', () => {
    expect(snap().streak).toBe(3);   // 02.11. ++, 26.10. +, 19.10. fehlt (übersprungen), 12.10. +, 05.10. − → Schluss
  });
  it('enthält die Klassenseite als zweiten Reiter', () => {
    expect(snap().klasse).toMatchObject({ v: 2, cls: '7b' });
  });
});

describe('Einschalten, Veröffentlichen, Löschen', () => {
  it('Einschalten fragt nach dem Datenschutz; „Abbrechen“ schaltet nichts ein', async () => {
    const p = app('setPersonalOn("g1", true)');
    await answer(null);
    await p;
    expect(app('personalOf(db.groups[0]).on')).toBe(false);
  });
  it('„Ist geklärt“: an, XP je Level fest gespeichert, jeder Schüler bekommt einen Link', async () => {
    const p = app('setPersonalOn("g1", true)');
    await answer('on');
    await p;
    expect(app('db.groups[0].studentApp.personal')).toMatchObject({ on: true, step: 15 });
    expect(app('db.students.g1.every(s => StudentShare.isAccess(s.studentApp.access))')).toBe(true);
  });
  it('veröffentlicht je Schüler verschlüsselt; ohne Änderung kein zweites Schreiben', async () => {
    app('db.groups[0].studentApp.personal = { on: true, step: 15 }; db.students.g1.forEach(ensureStudentAccess)');
    await app('publishStudentApps()');
    const ids = app('db.students.g1.map(s => s.studentApp.access.id)');
    ids.forEach(id => expect(cloud.publishes).toContain(id));
    const enc = cloud.docs[ids[0]];
    expect(JSON.stringify(enc)).not.toContain('Anna');
    const back = await app('StudentShare.decrypt')(enc, anna().studentApp.access.key);
    expect(back).toMatchObject({ kind: 'me', first: 'Anna' });
    const n = cloud.publishes.length;
    await app('publishStudentApps()');
    expect(cloud.publishes.length).toBe(n);
  });
  it('neuer Schüler ohne Link bekommt beim Veröffentlichen einen', async () => {
    app('db.groups[0].studentApp.personal = { on: true, step: 15 }');
    await app('publishStudentApps()');
    expect(app('StudentShare.isAccess(db.students.g1[1].studentApp.access)')).toBe(true);
  });
  it('Ausschalten, Klassenseite aus, Schüler löschen, Klasse löschen: Seiten werden gelöscht', async () => {
    app('db.groups[0].studentApp.personal = { on: true, step: 15 }; db.students.g1.forEach(ensureStudentAccess)');
    await app('publishStudentApps()');
    const [a, b] = app('db.students.g1.map(s => s.studentApp.access.id)');
    await app('setPersonalOn("g1", false)');
    expect(JSON.parse(localStorage.getItem('sa_delete_queue'))).toEqual(expect.arrayContaining([a, b]));
    localStorage.removeItem('sa_delete_queue');
    app('setStudentAppOn("g1", false)');
    expect(JSON.parse(localStorage.getItem('sa_delete_queue'))).toEqual(expect.arrayContaining([a, b]));
    localStorage.removeItem('sa_delete_queue');
    app('cleanUpDeletedStudents("g1", [db.students.g1[1]])');
    expect(JSON.parse(localStorage.getItem('sa_delete_queue'))).toContain(b);
    localStorage.removeItem('sa_delete_queue');
    app('removeGroupData("g1")');
    expect(JSON.parse(localStorage.getItem('sa_delete_queue'))).toEqual(expect.arrayContaining([a]));
  });
  it('Schuljahreswechsel: neue Links, eingelöste Joker weg', () => {
    app('db.students.g1.forEach(ensureStudentAccess); db.students.g1[0].jokersUsed = [{ id: "j", date: "2026-10-01" }]');
    const old = anna().studentApp.access.id;
    app('applyNewSchoolYear([{ id: "g1", action: "keep", name: "8b" }])');
    expect(anna().studentApp.access.id).not.toBe(old);
    expect(anna().jokersUsed).toEqual([]);
    expect(JSON.parse(localStorage.getItem('sa_delete_queue'))).toContain(old);
  });
});

describe('Reiter „Schülerapp“: Karte „Persönliche Seiten“', () => {
  const content = () => document.getElementById('overview-content');
  it('Datenschutz-Hinweis immer sichtbar; Einstellungen erst nach dem Einschalten', () => {
    app('openGroupStudents("g1", "studentapp")');
    expect(content().querySelector('.sa-privacy').textContent).toMatch(/Schulleitung/);
    expect(content().querySelector('#sa-level')).toBeNull();
    app('db.groups[0].studentApp.personal = { on: true, step: 15 }; renderStudentAppTab()');
    expect(content().querySelector('#sa-level').value).toBe('normal');
    expect(content().textContent).toMatch(/Ein Level braucht 15 XP/);
  });
  it('Ränge: Vorlage übernehmen und einzeln ändern; Joker zeilenweise', () => {
    app('db.groups[0].studentApp.personal = { on: true, step: 15 }; openGroupStudents("g1", "studentapp")');
    content().querySelector('[data-preset="gaming"]').click();
    expect(app('personalOf(db.groups[0]).ranks')).toEqual(['Neuling', 'Entdecker', 'Durchblicker', 'Taktiker', 'Mastermind', 'Legende']);
    const r = content().querySelector('[data-rank="0"]');
    r.value = 'Rookie'; r.dispatchEvent(new Event('change'));
    expect(app('personalOf(db.groups[0]).ranks[0]')).toBe('Rookie');
    const j = content().querySelector('#sa-jokers');
    j.value = 'DJ für 5 Minuten\n\n  Hausaufgabe streichen  '; j.dispatchEvent(new Event('change'));
    expect(app('personalOf(db.groups[0]).jokers')).toEqual(['DJ für 5 Minuten', 'Hausaufgabe streichen']);
  });
  it('Kärtchen drucken: je Schüler Name, Klasse und Code', () => {
    app('db.groups[0].studentApp.personal = { on: true, step: 15 }; window.print = () => {}');
    app('printStudentCards("g1")');
    const cards = [...document.querySelectorAll('#print-area .sa-card-print')];
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toMatch(/Anna Geheimrath/);
    expect(cards[0].querySelector('svg')).not.toBeNull();
  });
});

describe('Schüler-Fenster: Abschnitt „Schülerapp“', () => {
  const sec = () => document.getElementById('sw-sec-studentapp');
  it('nur mit persönlichen Seiten sichtbar, privat wie Noten', () => {
    app('openStudentDetail("a", "g1")');
    expect(sec().hidden).toBe(true);
    app('closeModal("modal-seating-student"); db.groups[0].studentApp.personal = { on: true, step: 10 }; openStudentDetail("a", "g1")');
    expect(sec().hidden).toBe(false);
    expect(sec().hasAttribute('data-private')).toBe(true);
    expect(sec().textContent).toMatch(/Level 10/);
    expect(sec().textContent).toMatch(/2 frei/);
    app('closeModal("modal-seating-student")');
  });
  it('Joker einlösen: Auswahl aus der Liste, mit „Rückgängig“', async () => {
    app('db.groups[0].studentApp.personal = { on: true, step: 10, jokers: ["Song vorschlagen", "Platz wählen"] }; openStudentDetail("a", "g1")');
    document.getElementById('sw-sa-joker').click();
    await answer('Platz wählen');
    await vi.waitFor(() => expect(anna().jokersUsed.length).toBe(1));
    expect(anna().jokersUsed[0]).toMatchObject({ date: TODAY, text: 'Platz wählen' });
    expect(sec().textContent).toMatch(/1 frei/);
    expect(document.getElementById('toast-container').textContent).toMatch(/Rückgängig/);
    app('closeModal("modal-seating-student")');
  });
  it('„Code zeigen“: großer Code mit Warnung, nicht am Beamer', () => {
    app('db.groups[0].studentApp.personal = { on: true, step: 10 }; openStudentDetail("a", "g1")');
    document.getElementById('sw-sa-code').click();
    expect(document.getElementById('modal-studentapp-beamer').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('sa-beamer-title').textContent).toBe('Anna Geheimrath');
    expect(document.getElementById('sa-beamer-hint').textContent).toMatch(/nicht am Beamer/);
    expect(document.querySelector('#sa-beamer-qr svg')).not.toBeNull();
    app('closeModal("modal-studentapp-beamer"); closeModal("modal-seating-student")');
  });
  it('das Code-Fenster liegt über dem Schüler-Fenster (steht später im Markup)', () => {
    const all = [...document.querySelectorAll('.modal-overlay')].map(m => m.id);
    expect(all.indexOf('modal-studentapp-beamer')).toBeGreaterThan(all.indexOf('modal-seating-student'));
  });
  it('„Neuer Link“: alter Link wird gelöscht', () => {
    app('db.groups[0].studentApp.personal = { on: true, step: 10 }; ensureStudentAccess(db.students.g1[0]); openStudentDetail("a", "g1")');
    const old = anna().studentApp.access.id;
    window.confirm = () => true;
    document.getElementById('sw-sa-renew').click();
    expect(anna().studentApp.access.id).not.toBe(old);
    expect(JSON.parse(localStorage.getItem('sa_delete_queue'))).toContain(old);
    app('closeModal("modal-seating-student")');
  });
});

describe('Abgleich zwischen Geräten (Regel 83)', () => {
  it('Joker auf zwei Geräten eingelöst → beide bleiben; Link und Ränge als Ganzes', () => {
    const base = sampleDB();
    const l = JSON.parse(JSON.stringify(base)), c = JSON.parse(JSON.stringify(base));
    l.students.g1[0].jokersUsed = [{ id: 'j1', date: '2026-11-02' }];
    c.students.g1[0].jokersUsed = [{ id: 'j2', date: '2026-11-03' }];
    l.groups[0].studentApp.personal = { on: true, ranks: ['A'] };
    c.groups[0].studentApp.personal = { on: true, ranks: ['B'] };
    const r = app('mergeDB')(base, l, c);
    expect(r.merged.students.g1[0].jokersUsed.map(j => j.id).sort()).toEqual(['j1', 'j2']);
    expect(r.conflicts.map(q => q.what)).toEqual(['Ränge']);
  });
});
