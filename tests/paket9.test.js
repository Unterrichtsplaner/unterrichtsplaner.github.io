// Gesamtprüfung 11.11.2026, Paket 9: Unterrichtsplanung. AQ10, AQ15, AQ16, AQ18, AP9.
const { loadApp, app } = require('./helpers/load-app');

// 7a: Mo, Di, Mi, Do 1. Block. Heute: Mo 09.11.2026, früh.
function sampleDB(plan, lessonData = {}) {
  const S = (id, day) => ({ id, day, block: 1, part: 'full', subject: 'Mathe', color: '#3d63dd', groupId: 'g1', recurring: 'weekly' });
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [S('mo', 0), S('di', 1), S('mi', 2), S('do', 3)],
    lessonData, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7a', color: '#3d63dd', schularbeitWeight: 50, plan }],
    students: { g1: [] },
  };
}
const T = (id, title, extra = {}) => ({ id, title, ...extra });
const assign = () => { const out = {}; app('planAssignments(db.groups[0])').byKey.forEach((v, k) => { out[k] = v.topic.title; }); return out; };
const plan = () => app('db.groups[0].plan');
const load = (p, ld) => app('replaceDB(' + JSON.stringify(sampleDB(p, ld)) + ')');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB([]))); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 9, 7, 0));
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  window.innerWidth = 1024;
});
afterEach(() => { app('closeModal("modal-lesson"); closeModal("modal-lesson-topic"); closeModal("modal-plan-topic")'); vi.useRealTimers(); });

describe('AQ10/AP9: Leerraum im Titel', () => {
  for (const [name, title] of [['Tab', 'Bruchrechnen\t4 Std.'], ['doppeltes Leerzeichen', 'Brüche  kürzen'], ['Zeilenumbruch', 'Bruchrechnung\nBrüche erweitern']]) {
    it(`${name}: Stunde öffnen und schließen ändert die Planung nicht`, () => {
      load([T('t1', title, { lessons: 3 })]);
      const before = JSON.stringify(plan());
      app('openLessonDetail("mo", "2026-11-09")');
      app('saveLessonDataAndClose()');
      app('openLessonDetail("di", "2026-11-10")');
      app('leaveLessonModal()');
      expect(JSON.stringify(plan())).toBe(before);
    });
  }
  it('Fenster „Thema“ aus der Sitzplan-Leiste genauso', () => {
    load([T('t1', 'Brüche  kürzen')]);
    const before = JSON.stringify(plan());
    app('cockpitLesson = { slotId: "mo", dateStr: "2026-11-09" }; openLessonTopic()');
    app('closeModalLikeButton("modal-lesson-topic")');
    expect(JSON.stringify(plan())).toBe(before);
  });
  it('AP9: Titel auf beiden Geräten verschieden umbenannt: Frage statt zweizeiligem Titel', () => {
    const base = sampleDB([T('t1', 'Brüche')]);
    const local = sampleDB([T('t1', 'Brüche erweitern')]);
    const cloud = sampleDB([T('t1', 'Bruchrechnung')]);
    const r = app('mergeDB')(base, local, cloud);
    const title = r.merged.groups[0].plan[0].title;
    expect(title).not.toMatch(/\n/);
    expect(r.conflicts.length).toBe(1);
  });
});

describe('AQ15: Verrutschte feste Termine behalten ihre Reihenfolge', () => {
  it('zwei eingetippte Themen fallen aus: das frühere kommt zuerst', () => {
    load([T('a', 'Einführung Brüche', { pinned: '2026-11-09', pinnedSlot: 'mo' }), T('b', 'Erweitern', { pinned: '2026-11-10', pinnedSlot: 'di' })],
      { 'mo_2026-11-09': { ausfall: true }, 'di_2026-11-10': { ausfall: true } });
    const a = assign();
    expect(a['mi_2026-11-11']).toBe('Einführung Brüche');
    expect(a['do_2026-11-12']).toBe('Erweitern');
  });
  it('nicht abgehakte Themen aus der Vergangenheit: das ältere zuerst', () => {
    vi.setSystemTime(new Date(2026, 10, 11, 7, 0));   // Mi
    load([T('a', 'Einführung Brüche', { pinned: '2026-11-09', pinnedSlot: 'mo' }), T('b', 'Erweitern', { pinned: '2026-11-10', pinnedSlot: 'di' })]);
    const a = assign();
    expect(a['mi_2026-11-11']).toBe('Einführung Brüche');
    expect(a['do_2026-11-12']).toBe('Erweitern');
  });
  it('ein früherer, mehrstündiger fester Termin verdrängt weiter keinen späteren', () => {
    load([T('a', 'Lang', { pinned: '2026-11-09', lessons: 3 }), T('b', 'Fest Mi', { pinned: '2026-11-11' })]);
    expect(assign()['mi_2026-11-11']).toBe('Fest Mi');
  });
});

describe('AQ16: Fenster „Thema“ für eine vergangene Stunde', () => {
  it('kein Planungsfeld, Eintippen legt nichts an', () => {
    vi.setSystemTime(new Date(2026, 10, 11, 7, 0));   // Mi
    load([T('t1', 'Dezimalzahlen')]);
    app('cockpitLesson = { slotId: "mo", dateStr: "2026-11-09" }; openLessonTopic()');
    const input = document.getElementById('lt-topic');
    expect(input.disabled).toBe(true);
    input.value = 'Prozentrechnung Einführung';
    app('lessonTopicDone()');
    app('closeModalLikeButton("modal-lesson-topic")');
    expect(plan().map(t => t.title)).toEqual(['Dezimalzahlen']);
  });
});

describe('AQ18: „Als erledigt markieren“ übernimmt Eingetipptes', () => {
  it('Notiz geändert, dann erledigt: Notiz bleibt', () => {
    load([T('t1', 'Bruchrechnen')]);
    app('openPlanTopicForm("g1", db.groups[0].plan[0])');
    document.getElementById('plan-topic-note').value = 'nur Kürzen geschafft';
    app('togglePlanTopicDoneFromForm()');
    expect(plan()[0].done).toBeTruthy();
    expect(plan()[0].note).toBe('nur Kürzen geschafft');
  });
  it('leerer Titel: nichts umgeschaltet, Hinweis', () => {
    load([T('t1', 'Bruchrechnen')]);
    app('openPlanTopicForm("g1", db.groups[0].plan[0])');
    document.getElementById('plan-topic-title').value = '  ';
    app('togglePlanTopicDoneFromForm()');
    expect(plan()[0].done).toBeUndefined();
    expect(plan()[0].title).toBe('Bruchrechnen');
  });
});
