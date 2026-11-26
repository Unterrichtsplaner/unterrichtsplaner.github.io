// BF1: Ein im Stunden-Fenster eingetipptes Thema, das in seiner Stunde nicht abgehakt wurde, rutschte still weiter und
// landete Wochen später per „Erledigt“ im Unterrichtsinhalt. Jetzt:
// a) In der Stunde, in der es inzwischen liegt, steht „Offen seit …“ mit „War schon dran“ (hakt es für die alte Stunde ab).
// b) In einer vergangenen Stunde ohne abgehaktes Thema zeigt die Karte das offene Thema, das dort lag, mit „Erledigt“
//    (nachträglich abhaken), aber ohne Feld zum Neu-Planen (AQ16).
const { loadApp, app } = require('./helpers/load-app');

// 7a: Mo 1. Block und Do 1. Block. Heute: Mo 23.11.2026, das Thema war für Mo 09.11. eingetippt.
const st = (id, n) => ({ id, firstName: n, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] });
function sampleDB(plan, lessonData = {}) {
  return {
    settings: { teacherName: 'T', blocks: null, holidays: [] },
    lessonSlots: [
      { id: 'mo', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#3d63dd', groupId: 'g1', recurring: 'weekly' },
      { id: 'do', day: 3, block: 1, part: 'full', subject: 'Mathe', color: '#3d63dd', groupId: 'g1', recurring: 'weekly' },
    ],
    lessonData,
    groups: [{ id: 'g1', subject: 'Mathe', className: '7a', color: '#3d63dd', schularbeitWeight: 50, plan }],
    students: { g1: [st('a', 'Anna')] },
    supervisions: [],
  };
}
const TYPED = { id: 'tb', title: 'Brüche', pinned: '2026-11-09', pinnedSlot: 'mo' };
const box = () => document.getElementById('lesson-plan-box');
const label = () => box().querySelector('.notes-section-label').textContent;
const late = () => box().querySelector('.lesson-plan-late');
const input = () => document.getElementById('lesson-plan-input');
const openL = (slot, date) => app(`openLessonDetail("${slot}", "${date}")`);
const topic = () => app('db.groups[0].plan').find(t => t.id === 'tb');
const undoBtn = () => document.querySelector('#toast-container .toast-undo button');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB([]))); loadApp(); });
function setup(plan, lessonData) {
  app('replaceDB(' + JSON.stringify(sampleDB(plan, lessonData)) + ')');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 23, 7, 0));
  window.innerWidth = 1024;
});
afterEach(() => vi.useRealTimers());

describe('a) Offen seit … in der Stunde, in der es jetzt liegt', () => {
  it('nachgespielter Fehler: das Thema vom 09.11. steht am 23.11. mit „Offen seit“ und „War schon dran“', () => {
    setup([TYPED], { 'mo_2026-11-09': { done: 'Brüche erweitern, S. 12' } });
    openL('mo', '2026-11-23');
    expect(input().value).toBe('Brüche');
    expect(late()).not.toBeNull();
    expect(late().textContent).toContain('Offen seit Mo., 09.11.');
    expect(late().querySelector('[data-act="earlier"]').textContent).toBe('War schon dran');
  });

  it('„War schon dran“ hakt es für die alte Stunde ab, die Stunde heute ist wieder frei; der alte Inhalt bleibt', () => {
    setup([TYPED], { 'mo_2026-11-09': { done: 'Brüche erweitern, S. 12' } });
    openL('mo', '2026-11-23');
    late().querySelector('[data-act="earlier"]').click();
    expect(topic().doneLessons).toEqual(['mo_2026-11-09']);
    expect(topic().done).toBe('2026-11-09');
    expect(app('db.lessonData["mo_2026-11-09"].done')).toBe('Brüche erweitern, S. 12');
    expect(input().value).toBe('');
    expect(late()).toBeNull();
    expect(document.getElementById('lesson-done-text').value).toBe('');   // der Inhalt von heute bleibt unberührt
  });

  it('ohne Inhalt in der alten Stunde steht danach das Thema dort; „Rückgängig“ stellt alles wieder her', () => {
    setup([TYPED]);
    openL('mo', '2026-11-23');
    late().querySelector('[data-act="earlier"]').click();
    expect(app('db.lessonData["mo_2026-11-09"].done')).toBe('Brüche');
    undoBtn().click();
    expect(topic().doneLessons).toBeUndefined();
    expect(topic().done).toBeUndefined();
    expect(app('db.lessonData["mo_2026-11-09"]')).toBeUndefined();
    expect(input().value).toBe('Brüche');
    expect(late()).not.toBeNull();
  });

  it('kein Hinweis, wenn die eigene Stunde ausgefallen ist (dann rutscht das Thema mit Absicht)', () => {
    setup([{ ...TYPED, pinned: '2026-11-19', pinnedSlot: 'do' }], { 'do_2026-11-19': { ausfall: true } });
    openL('mo', '2026-11-23');
    expect(input().value).toBe('Brüche');
    expect(late()).toBeNull();
  });

  it('kein Hinweis bei Themen aus der Liste (ohne festen Termin) und bei eingetippten Themen für heute', () => {
    setup([{ id: 'l1', title: 'Dezimalzahlen' }]);
    openL('mo', '2026-11-23');
    expect(input().value).toBe('Dezimalzahlen');
    expect(late()).toBeNull();
    setup([{ ...TYPED, pinned: '2026-11-23' }]);
    openL('mo', '2026-11-23');
    expect(late()).toBeNull();
  });
});

describe('b) Vergangene Stunde: offenes Thema nachträglich abhaken', () => {
  it('die alte Stunde zeigt ihr Thema mit „Erledigt“, ohne Eingabefeld', () => {
    setup([TYPED], { 'mo_2026-11-09': { done: 'Brüche erweitern, S. 12' } });
    openL('mo', '2026-11-09');
    expect(box().classList.contains('hidden')).toBe(false);
    expect(input()).toBeNull();
    expect(label()).toBe('Noch offen');
    expect(box().querySelector('.lesson-plan-text b').textContent).toBe('Brüche');
    box().querySelector('[data-act="toggle"]').click();
    expect(topic().doneLessons).toEqual(['mo_2026-11-09']);
    expect(label()).toBe('Erledigt');
    // Eigener Inhalt bleibt, wie bei „Erledigt“ in der Stunde selbst
    expect(document.getElementById('lesson-done-text').value).toBe('Brüche erweitern, S. 12');
    app('saveLessonDataAndClose()');
    openL('mo', '2026-11-23');
    expect(input().value).toBe('');
  });

  it('leerer Unterrichtsinhalt bekommt das Thema; zurücknehmen macht ihn wieder leer', () => {
    setup([TYPED]);
    openL('mo', '2026-11-09');
    box().querySelector('[data-act="toggle"]').click();
    expect(document.getElementById('lesson-done-text').value).toBe('Brüche');
    box().querySelector('[data-act="toggle"]').click();
    expect(document.getElementById('lesson-done-text').value).toBe('');
    expect(label()).toBe('Noch offen');
  });

  it('auch ein Listen-Thema, das in der alten Stunde lag, lässt sich dort abhaken (Planung lief da schon)', () => {
    setup([{ id: 'l0', title: 'Brüche', doneLessons: ['mo_2026-11-16'], done: '2026-11-16' }, { id: 'l1', title: 'Dezimalzahlen' }]);
    openL('do', '2026-11-19');
    expect(label()).toBe('Noch offen');
    expect(box().querySelector('.lesson-plan-text b').textContent).toBe('Dezimalzahlen');
    box().querySelector('[data-act="toggle"]').click();
    expect(app('db.groups[0].plan[1].doneLessons')).toEqual(['do_2026-11-19']);
  });

  it('eben angelegte Planung: alte Stunden davor zeigen kein Thema', () => {
    setup([{ id: 'l1', title: 'Dezimalzahlen' }]);
    openL('do', '2026-11-19');
    expect(box().classList.contains('hidden')).toBe(true);
    // ein eingetipptes Thema gilt erst ab seinem Tag
    setup([{ ...TYPED, pinned: '2026-11-16' }]);
    openL('mo', '2026-11-09');
    expect(box().classList.contains('hidden')).toBe(true);
  });

  it('vergangene Stunde ohne Planung oder ausgefallen: keine Karte wie bisher', () => {
    setup([]);
    openL('mo', '2026-11-09');
    expect(box().classList.contains('hidden')).toBe(true);
    setup([TYPED], { 'mo_2026-11-09': { ausfall: true } });
    openL('mo', '2026-11-09');
    expect(box().classList.contains('hidden')).toBe(true);
  });
});
