// Gesamtprüfung 11.11.2026, Paket 10: Stundenplanwechsel mehrerer Stunden einer Klasse im Abgleich (AP7).
const { loadApp, app } = require('./helpers/load-app');

const clone = x => JSON.parse(JSON.stringify(x));
const S = (id, day, extra = {}) => ({ id, day, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', recurring: 'weekly', ...extra });
function baseDB() {
  return {
    settings: { lastModified: 100, blocks: null },
    lessonSlots: [S('do', 3), S('mo', 0)],   // Donnerstag steht vor Montag
    lessonData: { 'mo_2027-01-25': { notes: 'alt' }, 'do_2027-01-28': { notes: 'alt' } },
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b' }],
    students: { g1: [] }, supervisions: [], todos: [], syncSettings: {},
  };
}
// Laptop: Mo → Di und Do → Fr, beide ab 01.02.2027 (wie splitSlotFrom)
function laptop(withRef) {
  const l = clone(baseDB());
  l.lessonSlots.forEach(s => { s.validUntil = '2027-01-31'; });
  l.lessonSlots.push(S('neuMo', 1, { validFrom: '2027-02-01', ...(withRef ? { splitFrom: 'mo' } : {}) }),
                     S('neuDo', 4, { validFrom: '2027-02-01', ...(withRef ? { splitFrom: 'do' } : {}) }));
  return l;
}
// iPad (noch nicht abgeglichen): Notiz in der Donnerstagsstunde 04.02.
function ipad() { const c = clone(baseDB()); c.lessonData['do_2027-02-04'] = { notes: 'Vokabeltest' }; return c; }

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify({ settings: { blocks: null }, lessonSlots: [], lessonData: {}, groups: [], students: {}, supervisions: [] }));
  loadApp();   // lädt auch sync-merge.js
});

describe('AP7: Stundenplanwechsel zweier Stunden derselben Klasse', () => {
  it('mit Verweis auf die alte Stunde: Einträge des anderen Geräts landen bei der richtigen neuen Stunde', () => {
    const r = app('mergeDB')(baseDB(), laptop(true), ipad());
    expect(r.merged.lessonData['neuDo_2027-02-05']).toEqual({ notes: 'Vokabeltest' });
    expect(r.merged.lessonData['neuMo_2027-02-02']).toBeUndefined();
  });
  it('ohne Verweis (ältere Version) und mehrdeutig: nicht raten, sondern Fenster mit dem ganzen Stand', () => {
    expect(() => app('mergeDB')(baseDB(), laptop(false), ipad())).toThrow();
  });
  it('ohne Verweis, aber nur eine passende alte Stunde: wie bisher', () => {
    const l = clone(baseDB());
    l.lessonSlots.find(s => s.id === 'do').validUntil = '2027-01-31';
    l.lessonSlots.push(S('neuDo', 4, { validFrom: '2027-02-01' }));
    const r = app('mergeDB')(baseDB(), l, ipad());
    expect(r.merged.lessonData['neuDo_2027-02-05']).toEqual({ notes: 'Vokabeltest' });
  });
  it('ohne Verweis, mehrdeutig, aber das andere Gerät hat dort nichts geändert: kein Abbruch', () => {
    const r = app('mergeDB')(baseDB(), laptop(false), clone(baseDB()));
    expect(r.merged.lessonSlots.length).toBe(4);
  });
});

describe('AP7: splitSlotFrom merkt sich die alte Stunde', () => {
  it('neue Stunde trägt splitFrom', () => {
    app('db.lessonSlots = [' + JSON.stringify(S('mo', 0)) + ']');
    const n = app('splitSlotFrom(db.lessonSlots[0], "2027-02-01", { day: 1 })');
    expect(n.splitFrom).toBe('mo');
  });
});
