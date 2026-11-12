// Gesamtprüfung 11.11.2026, Paket 2: verlegte Stunden („nur an diesem Tag“, Regel 65).
// AQ1 Stundenplanwechsel auf früheren Wochentag überschreibt Einträge · AQ2 Zurückziehen ergibt doppelte Stunde ·
// AQ4 Verlegung nach dauerhafter Änderung kaputt · AQ5 Kopie nochmal verschieben · AQ6 Kopie auf „Jede Woche“ ·
// AQ8 einmalige Stunde gezogen: HA hängen · AQ13 Ursprung beendet/gelöscht · AQ17 Thema/Erledigt wandern nicht mit.
const { loadApp, app } = require('./helpers/load-app');

const MON = '2026-10-19', TUE = '2026-10-20', WED = '2026-10-21', THU = '2026-10-22';
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [
      { id: 'a', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly', room: 'R1' },
      { id: 'b', day: 1, block: 2, part: 'full', subject: 'Physik', color: '#22c55e', groupId: 'g2', recurring: 'weekly', room: 'R2' },
      { id: 'a2', day: 3, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly', room: 'R1' },
    ],
    lessonData: {
      [`a_${MON}`]: { notes: 'Bruchrechnen vorbereiten' },
      'a2_2026-10-15': { hwEnabled: true, hwItems: [{ id: 'h', text: 'S. 12', targetDate: MON }] },
    },
    groups: [{ id: 'g1', subject: 'Mathe', className: '7a', color: '#6366f1', schularbeitWeight: 50,
               plan: [{ id: 'p1', title: 'Brüche', doneLessons: [`a_${MON}`] }, { id: 'p2', title: 'Test', pinned: MON, pinnedSlot: 'a' }] },
             { id: 'g2', subject: 'Physik', className: '9c', color: '#22c55e', schularbeitWeight: 50 }],
    students: { g1: [], g2: [] },
    supervisions: [],
  };
}
const flush = async (n = 4) => { for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 0)); };
const slot = id => app('db.lessonSlots').find(s => s.id === id);
const data = () => app('db.lessonData');
const copies = () => app('db.lessonSlots').filter(s => s.recurring === false || s.recurring === 'none');
const choiceOpen = () => !document.getElementById('modal-choice').classList.contains('hidden');
async function drag(id, src, target, answer = 'once') {
  const p = app(`moveLessonByDrag(${JSON.stringify(id)}, ${JSON.stringify(src)}, ${JSON.stringify(target)})`);
  await flush();
  if (choiceOpen()) app(`answerChoice(${JSON.stringify(answer)})`);
  await p; await flush();
}
const hw = () => data()['a2_2026-10-15'].hwItems[0].targetDate;
const plan = () => app('db.groups[0].plan');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 17, 10, 0)); // Sa 17.10.
  window.innerWidth = 1024;
  app('db = ' + JSON.stringify(sampleDB()));
  app('timetableEditMode = false; ttUndoStack = []; currentWeekOffset = 0; timetableDay = null; timetableChosenOn = ""; currentSpecificDate = null; editingSlotId = null');
  if (app('choiceResolve')) app('answerChoice(null)');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  window.confirm = () => true;
  app('switchView("timetable"); toggleTimetableEditMode(true)');
});
afterEach(() => vi.useRealTimers());

describe('AQ2: verlegte Stunde an den alten Platz zurückziehen', () => {
  it('hebt die Verlegung auf: keine doppelte Stunde, Notizen und HA wieder am alten Tag', async () => {
    await drag('a', MON, { day: 1, block: 1, dateStr: TUE });
    const c = copies()[0];
    expect(data()[`${c.id}_${TUE}`].notes).toBe('Bruchrechnen vorbereiten');
    await drag(c.id, TUE, { day: 0, block: 1, dateStr: MON });
    expect(copies()).toEqual([]);
    expect(data()[`a_${MON}`]).toEqual({ notes: 'Bruchrechnen vorbereiten' });
    expect(hw()).toBe(MON);
    expect(document.getElementById('toast-container').textContent).toMatch(/Verlegung aufgehoben/);
  });
  it('die durchgestrichene Kachel am alten Platz zählt nicht als belegt (keine Frage „Stunden tauschen“)', async () => {
    await drag('a', MON, { day: 1, block: 1, dateStr: TUE });
    const c = copies()[0];
    const p = app(`moveLessonByDrag(${JSON.stringify(c.id)}, ${JSON.stringify(TUE)}, ${JSON.stringify({ day: 0, block: 1, dateStr: MON })})`);
    await flush();
    expect(choiceOpen()).toBe(false);
    await p;
  });
});

describe('AQ5: verlegte Stunde noch einmal verschieben', () => {
  it('per Ziehen: eine Kopie, Verweis und fällige HA zeigen auf den neuen Tag', async () => {
    await drag('a', MON, { day: 1, block: 1, dateStr: TUE });
    const c = copies()[0];
    await drag(c.id, TUE, { day: 2, block: 3, dateStr: WED });
    const now = copies();
    expect(now.length).toBe(1);
    expect(now[0].specificDate).toBe(WED);
    expect(data()[`a_${MON}`].movedTo).toEqual({ slotId: now[0].id, date: WED });
    expect(data()[`${now[0].id}_${WED}`].notes).toBe('Bruchrechnen vorbereiten');
    expect(hw()).toBe(WED);
  });
  it('die durchgestrichene Kachel nochmal „nur an diesem Tag“ verschieben: alte Kopie weg, nur eine Stunde', async () => {
    await drag('a', MON, { day: 1, block: 1, dateStr: TUE });
    await drag('a', MON, { day: 2, block: 3, dateStr: WED });
    expect(copies().length).toBe(1);
    expect(copies()[0].specificDate).toBe(WED);
    expect(data()[`${copies()[0].id}_${WED}`].notes).toBe('Bruchrechnen vorbereiten');
  });
});

describe('AQ4: Verlegung, dann die Stunde dauerhaft auf einen anderen Tag', () => {
  it('„Verlegung aufheben“ findet den Ursprung am neuen Tag, Notizen sichtbar', async () => {
    await drag('a', MON, { day: 1, block: 1, dateStr: TUE });
    const c = copies()[0];
    app(`currentSpecificDate = ${JSON.stringify(MON)}`);
    await app('commitLessonSlot(lessonInputFrom(db.lessonSlots.find(s => s.id === "a"), 2, 4, "full"), db.lessonSlots.find(s => s.id === "a"), { scope: "all" })');
    expect(data()[`a_${WED}`].movedTo.slotId).toBe(c.id);
    expect(app(`revertMovedLesson(${JSON.stringify(c.id)})`)).toBe(true);
    expect(copies()).toEqual([]);
    expect(data()[`a_${WED}`]).toEqual({ notes: 'Bruchrechnen vorbereiten' });
  });
});

describe('AQ6: verlegte Kopie auf „Jede Woche“ umgestellt', () => {
  it('ist danach eine normale regelmäßige Stunde ohne Verlegungs-Vermerk', async () => {
    await drag('a', MON, { day: 1, block: 1, dateStr: TUE });
    const c = copies()[0];
    app(`currentSpecificDate = ${JSON.stringify(TUE)}`);
    const input = app(`({ ...lessonInputFrom(db.lessonSlots.find(s => s.id === ${JSON.stringify(c.id)}), 1, 1, "full"), recurringVal: "weekly" })`);
    await app(`commitLessonSlot(${JSON.stringify(input)}, db.lessonSlots.find(s => s.id === ${JSON.stringify(c.id)}))`);
    const s = slot(c.id);
    expect(s.recurring).toBe('weekly');
    expect(s.movedFrom).toBeUndefined();
    expect(data()[`a_${MON}`].movedTo).toBeUndefined();
    expect(data()[`a_${MON}`].ausfall).toBe(true);   // am alten Tag fällt sie weiter aus
    expect(app(`revertMovedLesson(${JSON.stringify(c.id)})`)).toBe(false);
    expect(slot(c.id)).toBeTruthy();
  });
});

describe('AQ13: Ursprung gelöscht, danach „Verlegung aufheben“', () => {
  it('die verlegte Stunde bleibt als einmalige Stunde mit ihren Notizen', async () => {
    await drag('a', MON, { day: 1, block: 1, dateStr: TUE });
    const c = copies()[0];
    app('toggleTimetableEditMode(false)');
    app('openEditLessonFor("a", ' + JSON.stringify(MON) + ')');
    await app('deleteLessonSlotFromEdit()');
    await flush();
    expect(slot('a')).toBeUndefined();
    const s = slot(c.id);
    expect(s).toBeTruthy();
    expect(s.movedFrom).toBeUndefined();
    expect(data()[`${c.id}_${TUE}`].notes).toBe('Bruchrechnen vorbereiten');
  });
});

describe('AQ8: einmalige Stunde per Ziehen auf einen anderen Tag', () => {
  it('am alten Tag fällige HA und Tests wandern mit', async () => {
    const d = sampleDB();
    d.lessonSlots.push({ id: 'x', day: 1, block: 4, part: 'full', subject: 'Mathe', groupId: 'g1', color: '#6366f1', recurring: false, specificDate: TUE });
    d.lessonData['a2_2026-10-15'].hwItems[0].targetDate = TUE;
    app('db = ' + JSON.stringify(d));
    await drag('x', TUE, { day: 2, block: 4, dateStr: WED });
    expect(hw()).toBe(WED);
  });
});

describe('AQ17: Thema und Erledigt-Haken wandern mit der verlegten Stunde', () => {
  it('verlegen und aufheben', async () => {
    await drag('a', MON, { day: 1, block: 1, dateStr: TUE });
    const c = copies()[0];
    expect(plan()[0].doneLessons).toEqual([`${c.id}_${TUE}`]);
    expect([plan()[1].pinned, plan()[1].pinnedSlot]).toEqual([TUE, c.id]);
    app(`revertMovedLesson(${JSON.stringify(c.id)})`);
    expect(plan()[0].doneLessons).toEqual([`a_${MON}`]);
    expect([plan()[1].pinned, plan()[1].pinnedSlot]).toEqual([MON, 'a']);
  });
});

describe('AQ1: Stundenplanwechsel „ab …“ auf einen früheren Wochentag', () => {
  it('Einträge zweier künftiger Freitage landen auf zwei verschiedenen Montagen, nichts wird überschrieben', () => {
    vi.setSystemTime(new Date(2026, 9, 21, 10, 0)); // Mi 21.10.
    const d = sampleDB();
    d.lessonSlots.push({ id: 'f', day: 4, block: 2, part: 'full', subject: 'Mathe', groupId: 'g1', color: '#6366f1', recurring: 'weekly' });
    Object.assign(d.lessonData, { 'f_2026-10-16': { notes: 'alt' }, 'f_2026-10-23': { notes: 'erster' }, 'f_2026-10-30': { notes: 'zweiter' } });
    app('db = ' + JSON.stringify(d));
    const n = app('splitSlotFrom(db.lessonSlots.find(s => s.id === "f"), "2026-10-21", { day: 0 }).id');
    expect(data()[`${n}_2026-10-26`].notes).toBe('erster');
    expect(data()[`${n}_2026-11-02`].notes).toBe('zweiter');
    expect(data()['f_2026-10-16'].notes).toBe('alt');
  });
});

describe('AQ17: dauerhaft auf einen anderen Tag – Planung zieht mit', () => {
  it('Erledigt-Haken und eingetipptes Thema folgen der Stunde', async () => {
    app(`currentSpecificDate = ${JSON.stringify(MON)}`);
    await app('commitLessonSlot(lessonInputFrom(db.lessonSlots.find(s => s.id === "a"), 2, 4, "full"), db.lessonSlots.find(s => s.id === "a"), { scope: "all" })');
    expect(plan()[0].doneLessons).toEqual([`a_${WED}`]);
    expect([plan()[1].pinned, plan()[1].pinnedSlot]).toEqual([WED, 'a']);
  });
});
