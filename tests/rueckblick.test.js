// Halbjahres- und Schuljahres-Rückblick (BUGS AJ3k): der Planer rechnet ihn je Schüler aus und legt ihn in den Auszug
// der persönlichen Seite. Nur Feiern: Stunden, Plusse, Serie, stärkster Monat, Level, Sticker, Themen.
// Nie Minusse, Fehltage, Noten oder andere Schüler (Regel 95).
const { loadApp, app } = require('./helpers/load-app');

const P = (id, date, value, label) => ({ id, date, value, ...(label ? { label } : {}) });
function sampleDB(settings = {}) {
  return {
    settings: { teacherName: 'Erika Testmann', blocks: null, studentApp: { on: true }, halfYearEnd: '2026-11-06', ...settings },
    lessonSlots: [{ id: 's1', day: 0, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', color: '#6366f1', recurring: 'weekly' }],
    lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#6366f1', schularbeitWeight: 50,
      studentApp: { on: true, access: { id: 'K'.repeat(22), key: 'k'.repeat(43) }, personal: { on: true, step: 15 } } }],
    students: { g1: [
      { id: 'a', firstName: 'Anna', lastName: 'Geheimrath', notes: 'Diabetes', grades: [{ type: 'test', value: '5.0', date: '2026-10-12' }],
        attendance: [{ id: 'x', date: '2026-10-19', type: 'abwesend' }], homework: [], studentNotes: [],
        stickersGiven: [{ id: 'st1', date: '2026-10-14', name: 'Erklärprofi', icon: 'bubble', color: 3, xp: 0, reason: 'hat Mia geholfen' },
          { id: 'st2', date: '2026-11-08', name: 'Später', icon: 'star', color: 1, xp: 0 }],   // nach dem Stichtag: gehört nicht ins 1. Halbjahr
        baustellen: [{ id: 'b1', date: '2026-09-20', text: 'Material', done: '2026-10-20', xp: 0 }],
        participation: [P('p1', '2026-09-21', 'positive'), P('p2', '2026-09-28', 'excellent'), P('p3', '2026-10-05', 'negative'),
          P('p4', '2026-10-12', 'positive'), P('p5', '2026-10-26', 'positive'), P('p6', '2026-11-02', 'excellent'), P('p7', '2026-11-02', 'excellent', 'Referat'),
          P('p8', '2026-11-09', 'excellent')] },   // nach dem Stichtag
      { id: 'b', firstName: 'Ben', lastName: 'Zweiter', grades: [], attendance: [], homework: [], studentNotes: [], participation: [P('q1', '2026-10-12', 'excellent')] },
    ] },
  };
}
const at = (y, m, d) => { vi.setSystemTime(new Date(y, m - 1, d, 10, 0)); };
const review = () => app('studentPersonalSnapshot(db.groups[0], db.students.g1[0], new Date()).review');
const load = settings => app('db = migrateDB(' + JSON.stringify(sampleDB(settings)) + ')');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); at(2026, 11, 9); load(); });
afterEach(() => vi.useRealTimers());

describe('Wann es einen Rückblick gibt', () => {
  it('vor dem Halbjahres-Stichtag keiner', () => {
    at(2026, 11, 5);
    expect(review()).toBeUndefined();
  });
  it('ab dem Stichtag drei Wochen „frisch“ (Streifen auf „Ich“), danach bis Schuljahresende in der Sammlung', () => {
    expect(review()).toMatchObject({ kind: 'half', label: '1. Halbjahr', from: '2026-08-01', to: '2026-11-06', fresh: true });
    at(2026, 11, 27);
    expect(review().fresh).toBe(true);
    at(2026, 11, 28);
    expect(review()).toMatchObject({ kind: 'half', fresh: false });
  });
  it('ohne Halbjahres-Stichtag keiner (andere Lehrkräfte sehen nichts Neues)', () => {
    load({ halfYearEnd: undefined });
    expect(review()).toBeUndefined();
  });
  it('in den letzten zwei Wochen vor dem Schuljahresende: Rückblick aufs ganze Schuljahr', () => {
    load({ schoolYearEnd: '2026-11-20' });
    expect(review()).toMatchObject({ kind: 'year', label: 'Schuljahr', from: '2026-08-01', to: '2026-11-09', fresh: true });
  });
  it('ohne persönliche Seiten kein Rückblick im Auszug der Klasse', () => {
    expect(JSON.stringify(app('studentAppSnapshot(db.groups[0], new Date())'))).not.toMatch(/review/);
  });
});

describe('Was im Rückblick steht (1. Halbjahr bis 06.11.)', () => {
  it('Stunden im Halbjahr, Plusse ohne Titel, XP daraus', () => {
    const r = review();
    expect(r.lessons).toBe(14);   // jeden Montag vom 03.08. bis 02.11.
    expect(r.cells.length).toBe(14);
    expect({ pp: r.pp, p: r.p, xp: r.xp }).toEqual({ pp: 2, p: 3, xp: 70 });   // „Referat“ und der 09.11. zählen nicht
  });
  it('längste Serie mit Anfang und Ende; ein Fehltag unterbricht nicht, Minus schon', () => {
    expect(review().best).toEqual({ n: 3, from: '2026-10-12', to: '2026-11-02' });
  });
  it('Monate mit Plussen, stärkster Monat (bei Gleichstand der frühere)', () => {
    const r = review();
    expect(r.months).toEqual([{ m: '2026-08', n: 0 }, { m: '2026-09', n: 2 }, { m: '2026-10', n: 2 }, { m: '2026-11', n: 1 }]);
    expect(r.top).toBe('2026-09');
  });
  it('Level am Anfang und am Stichtag, Rang dazu', () => {
    expect(review()).toMatchObject({ levelFrom: 1, levelTo: 7, rank: 'Platin', tier: 3 });
  });
  it('Level am Anfang ist immer 1, auch mit vielen Plussen im letzten Schuljahr', () => {
    app("db.students.g1[0].participation.push(...Array.from({ length: 20 }, (_, i) => ({ id: 'old' + i, date: '2026-06-' + String(i + 1).padStart(2, '0'), value: 'excellent' })))");
    expect(review().levelFrom).toBe(1);
    expect(review().levelTo).toBe(7);
  });
  it('Sticker und geschaffte Baustellen aus dem Halbjahr, mit Grund', () => {
    const r = review();
    expect(r.gifts).toEqual([{ name: 'Baustelle geschafft', icon: 'crane', color: 1, reason: 'Material', date: '2026-10-20' },
      { name: 'Erklärprofi', icon: 'bubble', color: 3, reason: 'hat Mia geholfen', date: '2026-10-14' }]);
  });
  it('nie Minusse, Fehltage, Noten, Nachnamen oder andere Schüler', () => {
    const r = review();
    const text = JSON.stringify(r);
    ['negative', 'neutral', 'abwesend', '2026-10-19', 'Geheimrath', 'Diabetes', '5.0', 'Ben', 'Referat'].forEach(x => expect(text, x).not.toContain(x));
    expect(r.cells.every(c => c === 'pp' || c === 'p' || c === '')).toBe(true);   // Fehltag sieht aus wie „nichts eingetragen“
  });
});
