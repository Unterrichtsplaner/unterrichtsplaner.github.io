// BE16: Mitarbeit-Verlauf im Sitzplan zeigt nur die letzte Stunde (lief über den Kartenrand).
// BE17: Plusse mit einem Klick in eine 1 umwandeln, auch ohne Schülerapp; Zahl einstellbar; Hinweis im Dashboard.
const { loadApp, app } = require('./helpers/load-app');

const P = (id, date, value, label) => ({ id, date, value, ...(label ? { label } : {}) });
const student = (id, firstName, participation = []) => ({ id, firstName, lastName: 'Muster', grades: [], attendance: [], homework: [], studentNotes: [], participation });
function sampleDB() {
  return {
    settings: { teacherName: 'Test', blocks: null },
    lessonSlots: [{ id: 's1', day: 0, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', color: '#6366f1', recurring: 'weekly' }],
    lessonData: {}, supervisions: [],
    groups: [
      { id: 'g1', subject: 'Mathe', className: '7a', color: '#6366f1', schularbeitWeight: 50 },
      { id: 'g2', subject: 'Physik', className: 'Q1', color: '#10b981', schularbeitWeight: 50, gradeScale: '0-15' },
    ],
    students: {
      g1: [
        // 3 × ++ = 6 Plusse
        student('a', 'Anna', [P('a1', '2026-11-09', 'excellent'), P('a2', '2026-11-16', 'excellent'), P('a3', '2026-11-23', 'excellent')]),
        // 5 Plusse: reicht nicht
        student('b', 'Ben', [P('b1', '2026-11-09', 'excellent'), P('b2', '2026-11-16', 'positive'), P('b3', '2026-11-23', 'excellent'), P('b4', '2026-11-20', 'negative')]),
      ],
      g2: [student('c', 'Cem', [P('c1', '2026-11-09', 'excellent'), P('c2', '2026-11-10', 'excellent'), P('c3', '2026-11-11', 'excellent'),
        P('c4', '2026-11-12', 'excellent'), P('c5', '2026-11-13', 'excellent')])],   // 10 Plusse
    },
  };
}
const acc = (gi, sid) => app(`studentAccount(db.groups[${gi}], db.students[db.groups[${gi}].id].find(s => s.id === ${JSON.stringify(sid)}))`);
const anna = () => app('db.students.g1[0]');
const undo = () => [...document.querySelectorAll('#toast-container button')].filter(b => /Rückgängig/.test(b.textContent)).pop().click();
const card = name => [...document.querySelectorAll('.seating-card')].find(c => c.querySelector('.sc-name')?.textContent === name);

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 24, 16, 0));   // Di 24.11.2026, nach dem Unterricht
  app('db = migrateDB(' + JSON.stringify(sampleDB()) + ')');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
});
afterEach(() => vi.useRealTimers());

describe('BE16: Verlauf auf der Sitzplan-Karte', () => {
  it('zeigt nur den Eintrag der letzten Stunde, nicht drei Felder', () => {
    app('openSeatingForGroup("g1", "2026-11-24")');
    app('toggleSeatingTrend()');
    expect([...card('Anna').querySelectorAll('.sc-trend .part-sign')].map(s => s.textContent)).toEqual(['++']);
    expect([...card('Ben').querySelectorAll('.sc-trend .part-sign')].map(s => s.textContent)).toEqual(['++']);   // 23.11. ist der letzte
  });
  it('gewählter Tag mit Eintrag: genau dieser; spätere Tage zählen nicht', () => {
    app('openSeatingForGroup("g1", "2026-11-20")');
    app('toggleSeatingTrend()');
    expect([...card('Ben').querySelectorAll('.sc-trend .part-sign')].map(s => s.textContent)).toEqual(['−−']);
    app('setSeatingDate("2026-11-18"); toggleSeatingTrend()');   // anderer Tag verbirgt den Verlauf wieder (Regel 16)
    expect([...card('Ben').querySelectorAll('.sc-trend .part-sign')].map(s => s.textContent)).toEqual(['+']);   // 16.11.
  });
  it('mit eingeblendetem Verlauf kein zweites Zeichen in der Ecke', () => {
    app('openSeatingForGroup("g1", "2026-11-23")');
    expect(card('Anna').querySelector('.sc-part')).not.toBeNull();
    app('toggleSeatingTrend()');
    expect(card('Anna').querySelector('.sc-part')).toBeNull();
    expect(card('Anna').querySelectorAll('.part-sign').length).toBe(1);
  });
});

describe('BE17: Einstellung „Plusse für eine 1“', () => {
  it('fehlt = aus: kein Knopf, kein Hinweis im Dashboard (andere Lehrkräfte bekommen nichts ungefragt)', () => {
    expect(app('plusGradePrice()')).toBe(0);
    expect(app('plusGradeOffer(db.groups[0])')).toBeNull();
    app('switchView("dashboard")');
    expect(document.querySelector('.dash-plusgrade')).toBeNull();
  });
  it('in den Einstellungen setzen und wieder ausschalten', () => {
    app('openSettings()');
    const field = document.getElementById('settings-plus-grade');
    expect(field.value).toBe('0');
    field.value = '6';
    app('saveSettings()');
    expect(app('db.settings.plusGradePrice')).toBe(6);
    app('openSettings()');
    expect(document.getElementById('settings-plus-grade').value).toBe('6');
    document.getElementById('settings-plus-grade').value = '0';
    app('saveSettings()');
    expect(app('db.settings.plusGradePrice')).toBeUndefined();   // aus = nichts gespeichert
  });
  it('die Zahl gilt auch für die 1 im Laden (solange der Laden nicht selbst eingerichtet ist)', () => {
    app('db.settings.plusGradePrice = 10');
    expect(app('personalOf(db.groups[0]).shop.find(x => x.kind === "grade").price')).toBe(10);
    expect(app('plusGradeOffer(db.groups[0]).price')).toBe(10);
    // selbst eingerichteter Laden behält seinen Preis
    app('db.groups[0].studentApp = { personal: { shop: [{ id: "l-eins", name: "Eine 1 (mündlich)", price: 8, kind: "grade", icon: "one" }] } }');
    expect(app('plusGradeOffer(db.groups[0]).price')).toBe(8);
  });
});

describe('BE17: umwandeln im Schüler-Fenster', () => {
  beforeEach(() => app('db.settings.plusGradePrice = 6'));
  const openAnna = () => { app('openSeatingStudentModal("a", "g1", "2026-11-24")'); app('revealSeatingStudent()'); };

  it('Knopf erst nach „Anzeigen“ (Beamer), nur wenn das Konto reicht', () => {
    app('openSeatingStudentModal("a", "g1", "2026-11-24")');
    expect(document.querySelector('#sw-hub .sw-plus-grade')).toBeNull();
    app('revealSeatingStudent()');
    expect(document.querySelector('#sw-hub .sw-plus-grade').textContent).toMatch(/6 Plusse in eine 1 umwandeln/);
    app('openSeatingStudentModal("b", "g1", "2026-11-24")'); app('revealSeatingStudent()');
    expect(document.querySelector('#sw-hub .sw-plus-grade')).toBeNull();   // 5 Plusse
  });

  it('ein Klick: mündliche 1 mit Titel „Plus-Konto“, Konto um 6 kleiner; „Rückgängig“ nimmt beides zurück', () => {
    openAnna();
    expect(acc(0, 'a').balance).toBe(6);
    document.querySelector('#sw-hub .sw-plus-grade').click();
    expect(anna().grades).toEqual([expect.objectContaining({ type: 'muendlich', value: app('parseGradeInput("1").value'), date: '2026-11-24', note: 'Plus-Konto' })]);
    expect(anna().redeemed).toEqual([expect.objectContaining({ kind: 'grade', price: 6, linked: true, date: '2026-11-24' })]);
    expect(anna().grades[0].redeemRef).toBe(anna().redeemed[0].id);
    expect(acc(0, 'a').balance).toBe(0);
    expect(document.querySelector('#sw-hub .sw-plus-grade')).toBeNull();   // Fenster neu gezeichnet
    expect(anna().participation.length).toBe(3);   // Mitarbeit bleibt
    undo();
    expect(anna().grades).toEqual([]);
    expect(anna().redeemed).toEqual([]);
    expect(acc(0, 'a').balance).toBe(6);
  });

  it('Punkte-Klasse mit 10 Plussen: 15 Punkte', () => {
    app('db.settings.plusGradePrice = 10');
    app('openSeatingStudentModal("c", "g2", "2026-11-24")'); app('revealSeatingStudent()');
    expect(document.querySelector('#sw-hub .sw-plus-grade').textContent).toMatch(/10 Plusse in 15 Punkte umwandeln/);
    document.querySelector('#sw-hub .sw-plus-grade').click();
    expect(app('db.students.g2[0].grades[0].value')).toBe('15');
    expect(acc(1, 'c').balance).toBe(0);
  });

  it('später den Laden einschalten: das Konto ist schon kleiner, die 1 steht unter „Eingelöst“ (keine zweite 1)', () => {
    openAnna();
    document.querySelector('#sw-hub .sw-plus-grade').click();
    app('db.settings.studentApp = { on: true }');
    app('db.groups[0].studentApp = { on: true, access: { id: "K".repeat(22), key: "k".repeat(43) }, personal: { on: true, step: 10, shopOn: true } }');
    expect(app('shopActive(db.groups[0])')).toBe(true);
    const snap = app('studentAccountSnapshot(db.groups[0], db.students.g1[0], "2026-11-24")');
    expect(snap.balance).toBe(0);
    expect(snap.redeemed).toEqual([expect.objectContaining({ kind: 'grade', price: 6 })]);
  });

  it('Note „Plus-Konto“ in der Tabelle oder im Formular löschen: Plusse sind wieder auf dem Konto', () => {
    openAnna();
    document.querySelector('#sw-hub .sw-plus-grade').click();
    expect(acc(0, 'a').balance).toBe(0);
    app('db.students.g1[0].grades = []');   // gelöscht, egal auf welchem Weg (Tabelle, Formular, anderes Gerät)
    expect(acc(0, 'a').balance).toBe(6);
    expect(app('studentAccount(db.groups[0], db.students.g1[0]).redeemed')).toEqual([]);
  });

  it('ältere Einlösungen ohne Verweis zählen weiter (auch ohne Note)', () => {
    app('db.students.g1[0].redeemed = [{ id: "r0", date: "2026-11-10", name: "Eine 1 (mündlich)", price: 6, kind: "grade" }]');
    expect(acc(0, 'a').balance).toBe(0);
  });
});

describe('BE17: Hinweis im Dashboard', () => {
  beforeEach(() => app('db.settings.plusGradePrice = 6'));
  const rows = () => [...document.querySelectorAll('.dash-plusgrade .dash-plus-row')];

  it('nennt alle, deren Konto für eine 1 reicht, ohne Zahl; Klassen mit eingeschaltetem Laden nicht', () => {
    app('switchView("dashboard")');
    expect(rows().map(r => r.querySelector('.dash-plus-name').textContent)).toEqual([expect.stringMatching(/Anna/), expect.stringMatching(/Cem/)]);
    expect(document.querySelector('.dash-plusgrade').textContent).not.toMatch(/\b(6|10|12) Plusse/);
    app('db.settings.studentApp = { on: true }');
    app('db.groups[1].studentApp = { on: true, access: { id: "K".repeat(22), key: "k".repeat(43) }, personal: { on: true, step: 10, shopOn: true } }');
    app('renderDashboard()');
    expect(rows().length).toBe(1);
  });

  it('„1 eintragen“ wandelt um und nimmt den Schüler aus der Liste', () => {
    app('switchView("dashboard")');
    rows()[0].querySelector('.dash-plus-convert').click();
    expect(anna().grades[0]).toMatchObject({ note: 'Plus-Konto' });
    expect(rows().map(r => r.querySelector('.dash-plus-name').textContent)).toEqual([expect.stringMatching(/Cem/)]);
    expect(rows()[0].querySelector('.dash-plus-convert').textContent).toMatch(/15 Punkte/);
  });

  it('Name antippen öffnet das Schüler-Fenster', () => {
    app('switchView("dashboard")');
    rows()[0].querySelector('.dash-plus-name').click();
    expect(document.getElementById('modal-seating-student').classList.contains('hidden')).toBe(false);
    expect(app('getCurrentStudent().id')).toBe('a');
  });
});
