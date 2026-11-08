// AH54: Thema direkt im Stunden-Fenster planen. Eintippen legt ein Thema mit festem Termin für genau diese Stunde an
// (gleiche Liste wie der Reiter „Planung“); eine laufende Reihe rutscht dahinter. Ein Thema nur für diese Stunde wird
// umbenannt bzw. beim Leeren gelöscht (mit Rückgängig), Themen aus der Liste bleiben. Fällt die Stunde aus, rutscht es weiter.
// AH53: feste Kachel-Paare (siehe stunden-karten.test.js).
const { loadApp, app } = require('./helpers/load-app');

// 7a: Mo 1. Block und Do 1. Block. Heute: Mo 09.11.2026.
const st = (id, n) => ({ id, firstName: n, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] });
function sampleDB(plan) {
  return {
    settings: { teacherName: 'T', blocks: null, halfYearEnd: '2027-01-29',
      holidays: [{ id: 'w', label: 'Weihnachtsferien', from: '2026-12-21', until: '2027-01-01' },
                 { id: 's', label: 'Sommerferien', from: '2027-07-22', until: '2027-09-01' }] },
    lessonSlots: [
      { id: 'mo', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#3d63dd', groupId: 'g1', recurring: 'weekly' },
      { id: 'do', day: 3, block: 1, part: 'full', subject: 'Mathe', color: '#3d63dd', groupId: 'g1', recurring: 'weekly' },
    ],
    lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '7a', color: '#3d63dd', schularbeitWeight: 50, plan }],
    students: { g1: [st('a', 'Anna')] },
    supervisions: [],
  };
}
const T = (id, title, extra = {}) => ({ id, title, ...extra });
const LIST = [T('t1', 'Brüche erweitern'), T('t2', 'Brüche kürzen', { lessons: 2 }), T('t4', 'Dezimalzahlen')];
const assign = () => {
  const r = app('planAssignments(db.groups[0])');
  const out = {};
  r.byKey.forEach((v, k) => { out[k] = v.topic.title + (v.of > 1 ? ` ${v.unit}/${v.of}` : ''); });
  return out;
};
const plan = () => app('db.groups[0].plan');
const input = () => document.getElementById('lesson-plan-input');
const label = () => document.querySelector('#lesson-plan-box .notes-section-label').textContent;
const openL = (slot, date) => app(`openLessonDetail("${slot}", "${date}")`);
const type = text => { input().value = text; input().dispatchEvent(new Event('input')); };
const save = () => app('saveLessonDataAndClose()');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB([]))); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 9, 7, 0));
  app('replaceDB(' + JSON.stringify(sampleDB(LIST)) + ')');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
  window.innerWidth = 1024;
});
afterEach(() => vi.useRealTimers());

describe('Eintippen plant', () => {
  it('Klasse ohne Planung: Thema in drei Wochen eintippen, Schließen speichert es für genau diese Stunde', () => {
    app('db.groups[0].plan = []');
    openL('mo', '2026-11-30');
    expect(label()).toBe('Thema');
    type('Wiederholung');
    expect(document.querySelector('#lesson-plan-box .lesson-plan-btn').disabled).toBe(false);
    save();
    expect(plan()).toEqual([expect.objectContaining({ title: 'Wiederholung', pinned: '2026-11-30', pinnedSlot: 'mo' })]);
    expect(assign()).toEqual({ 'mo_2026-11-30': 'Wiederholung' });
    openL('mo', '2026-11-30');
    expect(label()).toBe('Geplant');
    expect(input().value).toBe('Wiederholung');
    save();
  });

  it('erscheint im Reiter „Planung“ mit Termin', () => {
    openL('mo', '2026-11-30'); type('Wiederholung'); save();
    app('openGroupStudents("g1", "plan")');
    expect(document.getElementById('overview-content').textContent).toMatch(/Wiederholung/);
  });

  it('Stunde mit Listen-Thema: anderes Thema eintippen → neues Thema nur hier, die Reihe rutscht dahinter', () => {
    expect(assign()['do_2026-11-12']).toBe('Brüche kürzen 1/2');
    openL('do', '2026-11-12'); type('Übungsstunde'); save();
    expect(plan().map(t => t.title)).toEqual(['Brüche erweitern', 'Übungsstunde', 'Brüche kürzen', 'Dezimalzahlen']);
    expect(assign()).toMatchObject({ 'mo_2026-11-09': 'Brüche erweitern', 'do_2026-11-12': 'Übungsstunde',
      'mo_2026-11-16': 'Brüche kürzen 1/2', 'do_2026-11-19': 'Brüche kürzen 2/2', 'mo_2026-11-23': 'Dezimalzahlen' });
  });

  it('mitten in einer Reihe: neues Thema steht in der Liste hinter der Reihe, die zweite Stunde rutscht', () => {
    openL('mo', '2026-11-16'); type('Test'); save();
    expect(plan().map(t => t.title)).toEqual(['Brüche erweitern', 'Brüche kürzen', 'Test', 'Dezimalzahlen']);
    expect(assign()).toMatchObject({ 'do_2026-11-12': 'Brüche kürzen 1/2', 'mo_2026-11-16': 'Test', 'do_2026-11-19': 'Brüche kürzen 2/2' });
  });

  it('Enter übernimmt sofort und zeichnet die Karte neu', () => {
    app('db.groups[0].plan = []');
    openL('mo', '2026-11-09'); type('Einstieg');
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(plan().length).toBe(1);
    expect(label()).toBe('Geplant');
    save();
    expect(plan().length).toBe(1);   // kein zweites Mal angelegt
  });

  it('Erledigt mit eingetipptem Thema: wird angelegt, abgehakt und in den Unterrichtsinhalt übernommen', () => {
    app('db.groups[0].plan = []');
    openL('mo', '2026-11-09'); type('Spontan: Kopfrechnen');
    document.querySelector('#lesson-plan-box [data-act="toggle"]').click();
    expect(plan()[0]).toMatchObject({ title: 'Spontan: Kopfrechnen', done: '2026-11-09', doneLessons: ['mo_2026-11-09'] });
    expect(document.getElementById('lesson-done-text').value).toBe('Spontan: Kopfrechnen');
    expect(label()).toBe('Erledigt');
    save();
    expect(app('db.lessonData["mo_2026-11-09"].done')).toBe('Spontan: Kopfrechnen');
  });

  it('beim Verlassen der App wird das Getippte schon übernommen, ohne doppelt anzulegen', () => {
    app('db.groups[0].plan = []');
    openL('mo', '2026-11-09'); type('Einstieg');
    app('onAppHidden()');
    expect(plan().length).toBe(1);
    save();
    expect(plan().length).toBe(1);
  });
});

describe('Ändern und leeren', () => {
  it('ein hier eingetipptes Thema wird umbenannt (gleiche Kennung), nicht verdoppelt', () => {
    openL('mo', '2026-11-30'); type('Wiederholung'); save();
    const id = plan().find(t => t.title === 'Wiederholung').id;
    openL('mo', '2026-11-30'); type('Wiederholung Brüche'); save();
    expect(plan().filter(t => t.pinned === '2026-11-30').map(t => [t.id, t.title])).toEqual([[id, 'Wiederholung Brüche']]);
  });

  it('leeren löscht ein hier eingetipptes Thema, „Rückgängig“ holt es zurück', () => {
    openL('mo', '2026-11-30'); type('Wiederholung'); save();
    const before = plan().map(t => t.id);
    openL('mo', '2026-11-30'); type(''); save();
    expect(plan().some(t => t.title === 'Wiederholung')).toBe(false);
    const undo = [...document.querySelectorAll('#toast-container .toast-undo button')].find(b => b.textContent === 'Rückgängig');
    undo.click();
    expect(plan().map(t => t.id)).toEqual(before);
  });

  it('leeren eines Themas aus der Liste: bleibt in der Planung, mit Hinweis', () => {
    openL('mo', '2026-11-09'); type('');
    save();
    expect(plan().map(t => t.title)).toEqual(['Brüche erweitern', 'Brüche kürzen', 'Dezimalzahlen']);
    expect(document.getElementById('toast-container').textContent).toMatch(/bleibt in der Planung/);
  });

  it('unverändert schließen: nichts gespeichert', () => {
    const lm = app('db.settings.lastModified');
    openL('mo', '2026-11-09');
    vi.setSystemTime(new Date(2026, 10, 9, 7, 5));
    save();
    expect(app('db.settings.lastModified')).toBe(lm);
    expect(plan().length).toBe(3);
  });

  it('Thema durch Sync verschwunden: Erledigt meldet es, legt nichts an', () => {
    openL('mo', '2026-11-09');
    app('db.groups[0].plan.splice(0, 1)');
    document.querySelector('#lesson-plan-box [data-act="toggle"]').click();
    expect(document.getElementById('toast-container').textContent).toMatch(/gibt es nicht mehr/);
    expect(plan().map(t => t.id)).toEqual(['t2', 't4']);
    app('closeModal("modal-lesson")');
  });
});

describe('Termin', () => {
  it('fällt die Stunde aus, rutscht das Thema zur nächsten Stunde der Klasse', () => {
    openL('mo', '2026-11-30'); type('Wiederholung'); save();
    app('db.lessonData["mo_2026-11-30"] = { ausfall: true }');
    expect(assign()['do_2026-12-03']).toBe('Wiederholung');
  });

  it('zwei Stunden am selben Tag: das Thema landet in der Stunde, in der es eingetippt wurde', () => {
    app(`db.lessonSlots.push({ id: 'mo2', day: 0, block: 2, part: 'full', subject: 'Mathe', color: '#3d63dd', groupId: 'g1', recurring: 'weekly' })`);
    openL('mo2', '2026-11-30'); type('Gruppenarbeit'); save();
    const a = assign();
    expect(a['mo2_2026-11-30']).toBe('Gruppenarbeit');
    expect(a['mo_2026-11-30']).not.toBe('Gruppenarbeit');
  });

  it('ein früherer, mehrstündiger fester Termin verdrängt keinen späteren', () => {
    app('db.groups[0].plan = [{ id: "r", title: "Projekt", lessons: 3, pinned: "2026-11-30" }]');
    openL('do', '2026-12-03'); type('Klassenarbeit'); save();
    expect(assign()).toMatchObject({ 'mo_2026-11-30': 'Projekt 1/3', 'do_2026-12-03': 'Klassenarbeit', 'mo_2026-12-07': 'Projekt 2/3', 'do_2026-12-10': 'Projekt 3/3' });
  });

  it('Termin im Fenster „Thema“ geändert: gilt nicht mehr für die eingetippte Stunde', () => {
    openL('mo', '2026-11-30'); type('Wiederholung'); save();
    const t = plan().find(x => x.title === 'Wiederholung');
    app(`openPlanTopicForm("g1", db.groups[0].plan.find(x => x.id === "${t.id}"))`);
    document.getElementById('plan-topic-pinned').value = '2026-12-03';
    app('savePlanTopic()');
    expect(plan().find(x => x.id === t.id)).toMatchObject({ pinned: '2026-12-03' });
    expect(plan().find(x => x.id === t.id).pinnedSlot).toBeUndefined();
  });

  it('vergangene Stunde ohne erledigtes Thema: keine Karte (Rückblick steht im Unterrichtsinhalt)', () => {
    openL('mo', '2026-11-02');
    expect(document.getElementById('lesson-plan-box').classList.contains('hidden')).toBe(true);
    expect(input()).toBeNull();
    save();
  });
});
