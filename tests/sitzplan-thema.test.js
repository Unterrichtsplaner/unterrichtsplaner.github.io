// Sitzplan-Leiste: geplantes Thema (AI1) und Fenster „Thema der Stunde“ (AI2)
const { loadApp, app } = require('./helpers/load-app');

// Mo 02.11.2026: 7a hat 1. Block (07:45–09:15) und 3. Block, Fr 30.10. war die letzte Stunde
const MON = '2026-11-02', FRI = '2026-10-30';
const student = (id, firstName) => ({ id, firstName, lastName: 'Muster', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] });
function sampleDB(plan = [{ id: 't1', title: 'Brüche erweitern', lessons: 2 }, { id: 't2', title: 'Dezimalzahlen' }]) {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [
      { id: 'm1', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
      { id: 'm3', day: 0, block: 3, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
      { id: 'm4', day: 4, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
    ],
    lessonData: { [`m4_${FRI}`]: { done: 'Brüche kürzen\nzweite Zeile' } },
    groups: [{ id: 'g1', subject: 'Mathe', className: '7a', color: '#6366f1', schularbeitWeight: 50, plan }],
    students: { g1: [student('a', 'Anna'), student('b', 'Ben')] },
    supervisions: [],
  };
}
const at = (h, m = 0) => vi.setSystemTime(new Date(2026, 10, 2, h, m, 0));
const cockpit = () => document.getElementById('seating-cockpit');
const topic = () => cockpit().querySelector('.cockpit-topic-label').textContent + ' | ' + cockpit().querySelector('.cockpit-topic-text').textContent.trim();
const openSeating = () => app(`seatingRequest = { groupId: "g1", dateStr: "${MON}" }; switchView("seating")`);
const hidden = id => document.getElementById(id).classList.contains('hidden');
const val = id => document.getElementById(id).value;
const setVal = (id, v) => { document.getElementById(id).value = v; };
const plan = () => app('db').groups[0].plan;

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  at(8, 0);
  app('db = ' + JSON.stringify(sampleDB()));
  app('seatingEditMode = false');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
});
afterEach(() => { app('switchView("dashboard")'); vi.useRealTimers(); });

describe('AI1: Leiste zeigt das geplante Thema', () => {
  it('geplant: Thema aus der Unterrichtsplanung, mit „Stunde 1 von 2“', () => {
    openSeating();
    expect(topic()).toBe('Geplant · Stunde 1 von 2 | Brüche erweitern');
  });
  it('später am Tag: zweite Stunde des Themas', () => {
    at(10, 0);
    openSeating();
    expect(topic()).toMatch(/Brüche erweitern$/);
    expect(topic()).toContain('Stunde 2 von 2');
  });
  it('eingetragener Unterrichtsinhalt geht vor', () => {
    app(`db.lessonData["m1_${MON}"] = { done: 'Etwas anderes gemacht' }`);
    openSeating();
    expect(topic()).toBe('Thema heute | Etwas anderes gemacht');
  });
  it('ohne Planung wie bisher: letzte Stunde', () => {
    app('db.groups[0].plan = []');
    openSeating();
    expect(topic()).toMatch(/^Letzte Stunde · Fr\.?,? 30\.10\.? \| Brüche kürzen$/);
  });
  it('Stunde fällt aus: das Thema rutscht auf die nächste', () => {
    app(`db.lessonData["m1_${MON}"] = { ausfall: true }`);
    at(10, 0);
    openSeating();
    expect(topic()).toBe('Geplant · Stunde 1 von 2 | Brüche erweitern');
  });
});

describe('AI2: Fenster „Thema der Stunde“', () => {
  it('Thema antippen öffnet das Fenster mit letzter Stunde und geplantem Thema', () => {
    openSeating();
    expect(cockpit().querySelector('.cockpit-topic').getAttribute('onclick')).toBe('openLessonTopic()');
    app('openLessonTopic()');
    expect(hidden('modal-lesson-topic')).toBe(false);
    expect(val('lt-prev-done')).toBe('Brüche kürzen\nzweite Zeile');
    expect(document.getElementById('lt-prev-label').textContent).toMatch(/Letzte Stunde · Fr/);
    expect(val('lt-topic')).toBe('Brüche erweitern');
    expect(document.getElementById('lt-topic-label').textContent).toContain('Stunde 1 von 2');
    expect(val('lt-done')).toBe('');
  });

  it('„Erledigt“: Thema wandert in den Unterrichtsinhalt, Planung zählt die Stunde', () => {
    openSeating();
    app('openLessonTopic()');
    app('lessonTopicDone()');
    expect(val('lt-done')).toBe('Brüche erweitern');
    expect(plan()[0].doneLessons).toEqual([`m1_${MON}`]);
    app('closeLessonTopic()');
    expect(hidden('modal-lesson-topic')).toBe(true);
    expect(app('db').lessonData[`m1_${MON}`].done).toBe('Brüche erweitern');
    expect(topic()).toBe('Thema heute | Brüche erweitern');
  });

  it('„Erledigt“ noch einmal nimmt es zurück', () => {
    openSeating();
    app('openLessonTopic()');
    app('lessonTopicDone()');
    app('lessonTopicDone()');
    expect(plan()[0].doneLessons).toBeUndefined();
    expect(val('lt-done')).toBe('');
  });

  it('Thema ändern plant ein eigenes Thema für diese Stunde, die Reihe rutscht dahinter', () => {
    openSeating();
    app('openLessonTopic()');
    setVal('lt-topic', 'Wiederholung');
    app('closeLessonTopic()');
    expect(plan().map(t => t.title)).toEqual(['Wiederholung', 'Brüche erweitern', 'Dezimalzahlen']);
    expect(plan()[0].pinned).toBe(MON);
    expect(topic()).toBe('Geplant | Wiederholung');
  });

  it('letzte Stunde und Unterrichtsinhalt sind änderbar, Schließen übernimmt', () => {
    openSeating();
    app('openLessonTopic()');
    setVal('lt-prev-done', 'Brüche kürzen, korrigiert');
    setVal('lt-done', 'Einstieg mit Pizza');
    const before = app('db').settings.lastModified;
    at(8, 1);
    app('closeModalLikeButton("modal-lesson-topic")');   // ✕, Escape, daneben tippen
    expect(app('db').lessonData[`m4_${FRI}`].done).toBe('Brüche kürzen, korrigiert');
    expect(app('db').lessonData[`m1_${MON}`].done).toBe('Einstieg mit Pizza');
    expect(app('db').settings.lastModified).not.toBe(before);
  });

  it('nichts geändert: kein Speichern', () => {
    openSeating();
    const before = app('db').settings.lastModified;
    app('openLessonTopic()');
    at(8, 1);
    app('closeLessonTopic()');
    expect(app('db').settings.lastModified).toBe(before);
    expect(app('db').lessonData[`m1_${MON}`]).toBeUndefined();
  });

  it('ohne Planung: leeres Feld, Eintippen plant', () => {
    app('db.groups[0].plan = []');
    openSeating();
    app('openLessonTopic()');
    expect(val('lt-topic')).toBe('');
    setVal('lt-topic', 'Prozentrechnung');
    app('lessonTopicDone()');
    expect(plan()[0].title).toBe('Prozentrechnung');
    expect(val('lt-done')).toBe('Prozentrechnung');
  });

  it('„Ganze Planung“ übernimmt Eingaben und öffnet den Reiter Planung', () => {
    openSeating();
    app('openLessonTopic()');
    setVal('lt-done', 'Notiert');
    app('openLessonTopicPlan()');
    expect(hidden('modal-lesson-topic')).toBe(true);
    expect(app('db').lessonData[`m1_${MON}`].done).toBe('Notiert');
    expect(app('currentOverviewTab')).toBe('plan');
  });

  it('zählt als Eingabefenster (kein Pull mitten im Tippen) und übernimmt beim Verlassen der App', () => {
    openSeating();
    app('openLessonTopic()');
    expect(app('inputModalOpen()')).toBe(true);
    setVal('lt-done', 'Beim Zuklappen');
    app('onAppHidden()');
    expect(app('db').lessonData[`m1_${MON}`].done).toBe('Beim Zuklappen');
    expect(hidden('modal-lesson-topic')).toBe(false);
  });

  it('Text mit Sonderzeichen wird nicht als HTML gezeigt', () => {
    app(`db.groups[0].plan[0].title = '<img src=x onerror=alert(1)>'`);
    openSeating();
    app('openLessonTopic()');
    expect(document.querySelector('#modal-lesson-topic img')).toBe(null);
    expect(val('lt-topic')).toBe('<img src=x onerror=alert(1)>');
  });
});
