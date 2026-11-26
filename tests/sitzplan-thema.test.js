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
  it('später am Tag: nach der Stunde bleibt sie (BE11), kurz vor der zweiten deren Thema', () => {
    at(10, 0);
    openSeating();
    expect(topic()).toBe('Geplant · Stunde 1 von 2 | Brüche erweitern');
    at(11, 35);
    app('renderSeatingCockpit()');
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

// Seit BF2 öffnet das Thema in der Leiste das Stunden-Fenster (das kleine Fenster „Thema“ gibt es nicht mehr).
// Was jenes konnte, kann das Stunden-Fenster: letzte Stunde sehen (und mit ‹ ändern), Thema planen, „Erledigt“.
const openLesson = () => { openSeating(); app(cockpit().querySelector('.cockpit-topic').getAttribute('onclick')); };
const planInput = () => document.getElementById('lesson-plan-input');
const typeTopic = v => { planInput().value = v; planInput().dispatchEvent(new Event('input')); };
const tick = () => document.querySelector('#lesson-plan-box [data-act="toggle"]').click();
describe('AI2/BF2: Thema antippen öffnet das Stunden-Fenster', () => {
  it('mit letzter Stunde und geplantem Thema', () => {
    openLesson();
    expect(hidden('modal-lesson')).toBe(false);
    expect(app('[activeLessonId, activeLessonDate]')).toEqual(['m1', MON]);
    expect(document.querySelector('#lesson-plan-box .lesson-plan-prev p').textContent).toBe('Brüche kürzen\nzweite Zeile');
    expect(document.querySelector('#lesson-plan-box .lesson-plan-prev span').textContent).toMatch(/Letzte Stunde · Fr/);
    expect(planInput().value).toBe('Brüche erweitern');
    expect(document.querySelector('#lesson-plan-box .notes-section-label').textContent).toContain('Stunde 1 von 2');
    expect(val('lesson-done-text')).toBe('');
  });

  it('„Erledigt“: Thema wandert in den Unterrichtsinhalt, Planung zählt die Stunde; noch einmal nimmt es zurück', () => {
    openLesson();
    tick();
    expect(val('lesson-done-text')).toBe('Brüche erweitern');
    expect(plan()[0].doneLessons).toEqual([`m1_${MON}`]);
    tick();
    expect(plan()[0].doneLessons).toBeUndefined();
    expect(val('lesson-done-text')).toBe('');
    tick();
    app('saveLessonDataAndClose()');
    expect(app('db').lessonData[`m1_${MON}`].done).toBe('Brüche erweitern');
    expect(topic()).toBe('Thema heute | Brüche erweitern');
  });

  it('Thema ändern plant ein eigenes Thema für diese Stunde, die Reihe rutscht dahinter', () => {
    openLesson();
    typeTopic('Wiederholung');
    app('closeModalLikeButton("modal-lesson")');
    expect(plan().map(t => t.title)).toEqual(['Wiederholung', 'Brüche erweitern', 'Dezimalzahlen']);
    expect(plan()[0].pinned).toBe(MON);
    expect(topic()).toBe('Geplant | Wiederholung');
  });

  it('letzte Stunde ändern: mit ‹ dorthin blättern (BF3), Eingetipptes beider Stunden bleibt', () => {
    openLesson();
    setVal('lesson-done-text', 'Einstieg mit Pizza');
    document.getElementById('btn-lesson-prev').click();
    expect(app('[activeLessonId, activeLessonDate]')).toEqual(['m4', FRI]);
    setVal('lesson-done-text', 'Brüche kürzen, korrigiert');
    app('closeModalLikeButton("modal-lesson")');
    expect(app('db').lessonData[`m4_${FRI}`].done).toBe('Brüche kürzen, korrigiert');
    expect(app('db').lessonData[`m1_${MON}`].done).toBe('Einstieg mit Pizza');
  });

  it('nichts geändert: kein Speichern', () => {
    openSeating();
    const before = app('db').settings.lastModified;
    app('openCockpitLesson()');
    at(8, 1);
    app('closeModalLikeButton("modal-lesson")');
    expect(app('db').settings.lastModified).toBe(before);
    expect(app('db').lessonData[`m1_${MON}`]).toBeUndefined();
  });

  it('ohne Planung: leeres Feld, Eintippen plant', () => {
    app('db.groups[0].plan = []');
    openLesson();
    expect(planInput().value).toBe('');
    typeTopic('Prozentrechnung');
    tick();
    expect(plan()[0].title).toBe('Prozentrechnung');
    expect(val('lesson-done-text')).toBe('Prozentrechnung');
    app('saveLessonDataAndClose()');
  });

  it('„Ganze Planung“ übernimmt Eingaben und öffnet den Reiter Planung', () => {
    openLesson();
    setVal('lesson-done-text', 'Notiert');
    document.querySelector('#lesson-plan-box [data-act="plan"]').click();
    expect(hidden('modal-lesson')).toBe(true);
    expect(app('db').lessonData[`m1_${MON}`].done).toBe('Notiert');
    expect(app('currentOverviewTab')).toBe('plan');
  });

  it('zählt als Eingabefenster (kein Pull mitten im Tippen) und übernimmt beim Verlassen der App', () => {
    openLesson();
    expect(app('inputModalOpen()')).toBe(true);
    setVal('lesson-done-text', 'Beim Zuklappen');
    app('onAppHidden()');
    expect(app('db').lessonData[`m1_${MON}`].done).toBe('Beim Zuklappen');
    expect(hidden('modal-lesson')).toBe(false);
    app('saveLessonDataAndClose()');
  });

  it('Text mit Sonderzeichen wird nicht als HTML gezeigt', () => {
    app(`db.groups[0].plan[0].title = '<img src=x onerror=alert(1)>'`);
    openLesson();
    expect(document.querySelector('#modal-lesson img')).toBe(null);
    expect(planInput().value).toBe('<img src=x onerror=alert(1)>');
    app('closeModal("modal-lesson")');
  });
});
