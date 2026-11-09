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
  it('Jahreskarte (AJ2c): jede vergangene Stunde des Schuljahrs mit eigener Mitarbeit, Fehltag als „a“', () => {
    const y = snap().year;
    expect(y[0]).toEqual({ date: '2026-09-21', v: 'positive' });   // beginnt mit dem ersten Eintrag der Klasse (ohne Ferien kein leerer August)
    expect(y.find(c => c.date === '2026-09-28')).toEqual({ date: '2026-09-28', v: 'excellent' });
    expect(y.find(c => c.date === '2026-10-19')).toEqual({ date: '2026-10-19', v: 'a' });
    expect(y.find(c => c.date === '2026-11-02').v).toBe('excellent');   // „Referat“ mit Titel zählt hier nicht extra
    expect(y.map(c => c.date)).toEqual([...y.map(c => c.date)].sort());
    expect(y[y.length - 1].date).toBe('2026-11-09');   // heutige Stunde ist um 10 Uhr vorbei
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
    expect(sec().hasAttribute('data-private')).toBe(false);   // Geben geht ohne „Anzeigen“ (AJ2b) …
    expect(sec().querySelector('.sw-sa-private').hasAttribute('data-private')).toBe(true);   // … Level, Joker, Texte nicht
    expect(sec().querySelector('#sw-sa-sticker')).not.toBeNull();
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
  it('AJ2e: QR-Knopf oben im Schüler-Fenster nur mit persönlichen Seiten; öffnet den großen Code', () => {
    app('db.groups[0].studentApp.personal = { on: false }; openSeatingStudentModal("a", "g1", "2026-11-09")');
    const btn = () => document.getElementById('sw-code-btn');
    expect(btn().classList.contains('hidden')).toBe(true);
    app('closeModal("modal-seating-student"); db.groups[0].studentApp.personal = { on: true, step: 10 }; openSeatingStudentModal("a", "g1", "2026-11-09")');
    expect(btn().classList.contains('hidden')).toBe(false);
    expect(btn().getAttribute('aria-label')).toMatch(/Code/);
    btn().click();
    expect(document.getElementById('modal-studentapp-beamer').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('sa-beamer-title').textContent).toBe('Anna Geheimrath');
    expect(document.getElementById('sa-beamer-hint').textContent).toMatch(/nicht am Beamer/);
    app('closeModal("modal-studentapp-beamer"); closeModal("modal-seating-student")');
    app('db.settings.studentApp = { on: false }; openSeatingStudentModal("a", "g1", "2026-11-09")');
    expect(btn().classList.contains('hidden')).toBe(true);   // Schülerapp ganz aus: kein Knopf
    app('closeModal("modal-seating-student")');
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

describe('AJ2b: Sticker und Baustellen', () => {
  beforeEach(() => app('db.groups[0].studentApp.personal = { on: true, step: 10 }'));
  const info = () => app('studentPersonalInfo(db.groups[0], db.students.g1[0])');
  const snap = () => app('studentPersonalSnapshot(db.groups[0], db.students.g1[0], new Date())');
  const gs = id => document.getElementById(id);

  it('Startwerte: drei Sticker von Hand (je 20 XP), drei Regeln, Baustelle 20 XP', () => {
    const p = app('personalOf(db.groups[0])');
    expect(p.stickers.map(x => [x.name, x.xp])).toEqual([['Erklärprofi', 20], ['Mutig gefragt', 20], ['Teamplayer', 20]]);
    expect(p.autoStickers.map(x => x.name)).toEqual(['Erstes Plus', 'Doppelplus', 'Dranbleiben']);
    expect(p.bauXP).toBe(20);
  });

  it('XP: Sticker von Hand und geschaffte Baustelle zählen mit dem Wert beim Vergeben; Löschen (Verklicken) nimmt sie mit', () => {
    const base = info().xp;   // 90 aus Plussen
    app('db.students.g1[0].stickersGiven = [{ id: "g1", date: "2026-11-02", name: "Erklärprofi", icon: "bubble", color: 3, xp: 25 }]');
    app('db.students.g1[0].baustellen = [{ id: "b1", date: "2026-10-01", text: "Material", done: "2026-11-05", xp: 20 }, { id: "b2", date: "2026-11-01", text: "offen" }]');
    expect(info().xp).toBe(base + 45);
    app('db.students.g1[0].stickersGiven = []');
    expect(info().xp).toBe(base + 20);
  });

  it('automatische Sticker: insgesamt, Doppelplus, Serie in Stunden (Fehltag unterbricht nicht), im Halbjahr', () => {
    const earned = rule => app(`autoStickerEarned(${JSON.stringify(rule)}, db.students.g1[0], pastLessonDates(db.groups[0], new Date()), "${TODAY}")`);
    expect(earned({ kind: 'any', n: 5, mode: 'total' })).toBe(true);
    expect(earned({ kind: 'any', n: 7, mode: 'total' })).toBe(false);   // 6 Plusse (Referat zählt mit)
    expect(earned({ kind: 'excellent', n: 3, mode: 'total' })).toBe(true);
    expect(earned({ kind: 'any', n: 3, mode: 'streak' })).toBe(true);    // 12.10., (19.10. gefehlt), 26.10., 02.11.
    expect(earned({ kind: 'any', n: 4, mode: 'streak' })).toBe(false);
    app('db.settings.halfYearEnd = "2026-10-31"');                        // 2. Halbjahr seit 01.11.: nur der 02.11.
    expect(earned({ kind: 'any', n: 2, mode: 'half' })).toBe(true);      // zwei Einträge am 02.11. (normal + Referat)
    expect(earned({ kind: 'any', n: 3, mode: 'half' })).toBe(false);
  });

  it('Auszug: Geschenke mit Grund, Album, gesperrte Regeln mit Hinweis, offene Baustelle – nur eigene Daten', () => {
    app('db.students.g1[0].stickersGiven = [{ id: "g1", date: "2026-11-02", name: "Erklärprofi", icon: "bubble", color: 3, xp: 20, reason: "hat Lisa geholfen" }]');
    app('db.students.g1[0].baustellen = [{ id: "b1", date: "2026-10-26", text: "Material fehlt oft" }]');
    app('db.students.g1[1].baustellen = [{ id: "b9", date: "2026-10-26", text: "Geheimer Text von Ben" }]');
    const s = snap();
    expect(s.gifts).toEqual([{ name: 'Erklärprofi', icon: 'bubble', color: 3, reason: 'hat Lisa geholfen', date: '2026-11-02', xp: 20 }]);
    expect(s.album.map(x => x.name)).toEqual(['Erstes Plus', 'Doppelplus', 'Dranbleiben', 'Erklärprofi']);
    expect(s.locked).toEqual([]);
    expect(s.bau).toEqual({ text: 'Material fehlt oft', since: '2026-10-26' });
    expect(s.giver).toBe('Erika Testmann');
    expect(typeof s.from).toBe('number');   // XP am Anfang des Levels, nicht überschrieben
    expect(JSON.stringify(s)).not.toContain('Geheimer Text');
    app('db.students.g1[0].participation = []');
    expect(snap().locked.map(x => x.hint)).toEqual(['1× Plus insgesamt', '1× Doppelplus insgesamt', '3× Plus in Folge']);
  });

  it('„Sticker geben“: offen ohne „Anzeigen“, Auswahl, Grund, mit XP-Wert gespeichert, „Rückgängig“', () => {
    app('openSeatingStudentModal("a", "g1", "2026-11-09", { more: true })');
    document.getElementById('sw-sa-sticker').click();
    expect(gs('modal-give-sticker').classList.contains('hidden')).toBe(false);
    expect(gs('gs-title').textContent).toBe('Sticker für Anna');
    gs('gs-choices').querySelectorAll('[data-id]')[1].click();
    gs('gs-reason').value = 'hat nachgefragt';
    app('saveGive()');
    expect(anna().stickersGiven).toEqual([expect.objectContaining({ date: TODAY, name: 'Mutig gefragt', icon: 'ask', xp: 20, reason: 'hat nachgefragt' })]);
    expect(gs('modal-give-sticker').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('sw-studentapp').textContent).toMatch(/Mutig gefragt · hat nachgefragt/);
    [...document.querySelectorAll('#toast-container button')].filter(b => /Rückgängig/.test(b.textContent)).pop().click();   // der neueste Hinweis
    expect(anna().stickersGiven).toEqual([]);
    app('closeModal("modal-seating-student")');
  });

  it('„Baustelle geben“: Vorschlag füllt das Feld, ohne Text nichts; „Geschafft“ gibt XP; Text nur im privaten Teil', () => {
    app('openSeatingStudentModal("a", "g1", "2026-11-09", { more: true })');
    document.getElementById('sw-sa-bau').click();
    app('saveGive()');
    expect(anna().baustellen || []).toEqual([]);
    gs('gs-choices').querySelector('[data-text="Hausaufgaben"]').click();
    expect(gs('gs-reason').value).toBe('Hausaufgaben');
    app('saveGive()');
    expect(anna().baustellen).toEqual([expect.objectContaining({ date: TODAY, text: 'Hausaufgaben' })]);
    const box = document.getElementById('sw-studentapp');
    expect(box.querySelector('.sw-sa-count').textContent).toBe('1 Baustelle offen');
    expect(box.querySelector('[data-private]').textContent).toMatch(/Hausaufgaben/);
    expect(box.querySelector('.sw-sa-count').textContent).not.toMatch(/Hausaufgaben/);
    const before = info().xp;
    box.querySelector('[data-bau-done="0"]').click();
    expect(anna().baustellen[0]).toMatchObject({ done: TODAY, xp: 20 });
    expect(info().xp).toBe(before + 20);
    app('closeModal("modal-seating-student")');
  });

  it('Schließen mit eingetipptem Grund fragt nach (Regel 27)', () => {
    app('openGive("sticker", "g1", "a")');
    gs('gs-reason').value = 'angefangen';
    let asked = false;
    window.confirm = () => { asked = true; return false; };
    app('closeModalLikeButton("modal-give-sticker")');
    expect(asked).toBe(true);
    expect(gs('modal-give-sticker').classList.contains('hidden')).toBe(false);
    window.confirm = () => true;
    app('closeModalLikeButton("modal-give-sticker")');
    expect(gs('modal-give-sticker').classList.contains('hidden')).toBe(true);
  });

  it('Reiter: Sticker und Regeln anlegen, ändern, entfernen; XP für Baustellen', () => {
    app('openGroupStudents("g1", "studentapp")');
    const c = () => document.getElementById('overview-content');
    c().querySelector('#sa-stk-add').click();
    expect(app('personalOf(db.groups[0]).stickers.length')).toBe(4);
    const name = c().querySelectorAll('#sa-stk-list [data-f="name"]')[3];
    name.value = 'Superhirn'; name.dispatchEvent(new Event('change', { bubbles: true }));
    expect(app('personalOf(db.groups[0]).stickers[3].name')).toBe('Superhirn');
    c().querySelectorAll('#sa-stk-list [data-del]')[0].click();
    expect(app('personalOf(db.groups[0]).stickers.map(x => x.name)')).toEqual(['Mutig gefragt', 'Teamplayer', 'Superhirn']);
    c().querySelector('#sa-auto-add').click();
    const n = c().querySelectorAll('#sa-auto-list [data-f="n"]')[3];
    n.value = '10'; n.dispatchEvent(new Event('change', { bubbles: true }));
    expect(app('personalOf(db.groups[0]).autoStickers[3]')).toMatchObject({ n: 10, kind: 'any', mode: 'total' });
    const xp = c().querySelector('#sa-bau-xp');
    xp.value = '30'; xp.dispatchEvent(new Event('change'));
    expect(app('personalOf(db.groups[0]).bauXP')).toBe(30);
  });

  it('Schuljahreswechsel leert Sticker und Baustellen', () => {
    app('db.students.g1[0].stickersGiven = [{ id: "x", date: "2026-10-01", name: "A", xp: 20 }]; db.students.g1[0].baustellen = [{ id: "y", date: "2026-10-01", text: "B" }]');
    app('applyNewSchoolYear([{ id: "g1", action: "keep", name: "8b" }])');
    expect(anna().stickersGiven).toEqual([]);
    expect(anna().baustellen).toEqual([]);
  });

  it('Abgleich: Sticker auf zwei Geräten vergeben → beide; Baustelle hier geschafft, dort Text ergänzt → beides', () => {
    const base = sampleDB();
    base.students.g1[0].baustellen = [{ id: 'b', date: '2026-10-01', text: 'Material' }];
    const l = JSON.parse(JSON.stringify(base)), c = JSON.parse(JSON.stringify(base));
    l.students.g1[0].stickersGiven = [{ id: 's1', date: '2026-11-02', name: 'A', xp: 20 }];
    c.students.g1[0].stickersGiven = [{ id: 's2', date: '2026-11-03', name: 'B', xp: 20 }];
    l.students.g1[0].baustellen[0].done = '2026-11-05'; l.students.g1[0].baustellen[0].xp = 20;
    c.students.g1[0].baustellen[0].text = 'Material\nund Heft';
    const r = app('mergeDB')(base, l, c);
    expect(r.conflicts).toEqual([]);
    expect(r.merged.students.g1[0].stickersGiven.map(x => x.id).sort()).toEqual(['s1', 's2']);
    expect(r.merged.students.g1[0].baustellen[0]).toMatchObject({ done: '2026-11-05', xp: 20, text: 'Material\nund Heft' });
  });
});
