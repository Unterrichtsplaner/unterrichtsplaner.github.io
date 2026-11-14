// Gesamtprüfung 14.11.2026, Paket 2: Stundenplan und Planung. AZ1–AZ5.
const { loadApp, app } = require('./helpers/load-app');

const W = (id, day, block, extra = {}) => ({ id, day, block, part: 'full', subject: 'Mathe', color: '#3b82f6', groupId: 'g1', recurring: 'weekly', ...extra });
function sampleDB(x = {}) {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: x.slots || [W('mo', 0, 1), W('do', 3, 1)], lessonData: x.lessonData || {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7a', color: '#3b82f6', schularbeitWeight: 50, plan: x.plan || [] },
             { id: 'g2', subject: 'Bio', className: '7b', color: '#22c55e', schularbeitWeight: 50, plan: [] }],
    students: { g1: [], g2: [] },
  };
}
const load = x => app('replaceDB(' + JSON.stringify(sampleDB(x)) + ')');
const flush = async () => { for (let i = 0; i < 8; i++) await new Promise(r => setTimeout(r, 0)); };
const choiceOpen = () => !document.getElementById('modal-choice').classList.contains('hidden');
const choiceText = () => document.getElementById('modal-choice').textContent;
const plan = () => app('db.groups[0].plan');
beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 16, 7, 0));   // Mo 16.11.2026
  window.innerWidth = 1024;
  load();
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  if (app('typeof choiceResolve === "function"')) app('answerChoice(null)');
  window.confirm = () => true;
  app('currentSpecificDate = null; currentWeekOffset = 0; timetableDay = null; timetableMode = "week"; ttUndoStack = []');
});
afterEach(() => { if (app('typeof choiceResolve === "function"')) app('answerChoice(null)'); app('switchView("dashboard")'); vi.useRealTimers(); });

describe('AZ1: Knopf „Als erledigt markieren“ / „Wieder offen“ tut, was draufsteht', () => {
  it('Fall A: von Hand erledigt (1 von 3 Haken) → „Wieder offen“ öffnet es', () => {
    load({ plan: [{ id: 'p', title: 'Brüche', lessons: 3, doneLessons: ['mo_2026-11-09'], done: '2026-11-10' }] });
    app('openPlanTopicForm("g1", db.groups[0].plan[0])');
    expect(document.getElementById('btn-plan-topic-done').textContent).toBe('Wieder offen');
    app('togglePlanTopicDoneFromForm()');
    expect(plan()[0].done).toBeUndefined();
    expect(plan()[0].doneLessons).toEqual(['mo_2026-11-09']);
  });
  it('Fall B: 2 von 3 abgehakt, Dauer auf 2 → „Als erledigt markieren“: erledigt, kein Haken weg', () => {
    load({ plan: [{ id: 'p', title: 'Brüche', lessons: 3, doneLessons: ['mo_2026-11-09', 'do_2026-11-12'] }] });
    app('openPlanTopicForm("g1", db.groups[0].plan[0])');
    document.getElementById('plan-topic-lessons').value = '2';
    app('togglePlanTopicDoneFromForm()');
    expect(plan()[0].done).toBe('2026-11-12');
    expect(plan()[0].doneLessons).toEqual(['mo_2026-11-09', 'do_2026-11-12']);
  });
  it('Fall C: von Hand erledigt, nur die Notiz geändert → bleibt erledigt', () => {
    load({ plan: [{ id: 'p', title: 'Brüche', lessons: 3, doneLessons: ['mo_2026-11-09'], done: '2026-11-10' }] });
    app('openPlanTopicForm("g1", db.groups[0].plan[0])');
    document.getElementById('plan-topic-note').value = 'Rest übersprungen';
    app('savePlanTopic()');
    expect(plan()[0].done).toBe('2026-11-10');
    expect(plan()[0].note).toBe('Rest übersprungen');
  });
  it('Dauer verlängert: erledigtes Thema wird wieder offen (wie bisher)', () => {
    load({ plan: [{ id: 'p', title: 'Brüche', lessons: 2, doneLessons: ['mo_2026-11-09', 'do_2026-11-12'], done: '2026-11-12' }] });
    app('openPlanTopicForm("g1", db.groups[0].plan[0])');
    document.getElementById('plan-topic-lessons').value = '3';
    app('savePlanTopic()');
    expect(plan()[0].done).toBeUndefined();
  });
});

describe('AZ2: andere Klasse nur an diesem Tag = Vertretung', () => {
  const lessonData = () => ({
    'di_2026-11-10': { hwEnabled: true, hwItems: [{ id: 'h0', text: 'Arbeitsblatt', targetDate: '2026-11-17' }] },
    'di_2026-11-17': { notes: 'Kap. 2 wiederholen', hwEnabled: true, hwItems: [{ id: 'h1', text: 'Buch S. 12', targetDate: '2026-11-19' }] },
  });
  const setup = () => load({ slots: [W('di', 1, 2), W('do', 3, 1)], lessonData: lessonData(),
    plan: [{ id: 'p', title: 'Brüche', pinned: '2026-11-17', pinnedSlot: 'di' }] });
  const input = { subject: 'Bio', day: 1, block: 2, room: '', recurringVal: 'weekly', groupId: 'g2', part: 'full', color: '#22c55e' };
  it('Einträge und Planung bleiben bei der alten Klasse, fällige HA wird angeboten', async () => {
    setup();
    app('currentSpecificDate = "2026-11-17"');
    const p = app(`saveLessonOnce(db.lessonSlots[0], '2026-11-17', ${JSON.stringify(input)})`);
    await flush();
    expect(choiceOpen()).toBe(true);
    expect(choiceText()).toMatch(/Arbeitsblatt/);
    app('answerChoice("move")');
    await p;
    const db = app('db');
    const once = db.lessonSlots.find(s => s.specificDate === '2026-11-17');
    expect(once).toMatchObject({ groupId: 'g2', block: 2 });
    expect(once.movedFrom).toBeUndefined();
    expect(db.lessonData['di_2026-11-17'].notes).toBe('Kap. 2 wiederholen');            // bleibt bei 7a
    expect(db.lessonData[`${once.id}_2026-11-17`]).toBeUndefined();
    expect(db.lessonData['di_2026-11-10'].hwItems[0].targetDate).toBe('2026-11-19');   // auf die nächste 7a-Stunde
    expect(db.groups[0].plan[0]).toMatchObject({ pinnedSlot: 'di', pinned: '2026-11-17' });
    expect(app('lessonsAt("2026-11-17", 2).map(s => s.groupId)')).toEqual(['g2']);
  });
  it('mit anderem Platz: die Stunde der alten Klasse fällt aus und behält ihre Einträge', async () => {
    setup();
    app('currentSpecificDate = "2026-11-17"');
    const p = app(`saveLessonOnce(db.lessonSlots[0], '2026-11-17', ${JSON.stringify({ ...input, block: 4 })})`);
    await flush();
    app('answerChoice("keep")');
    await p;
    expect(app('db.lessonData["di_2026-11-17"]')).toMatchObject({ ausfall: true, notes: 'Kap. 2 wiederholen' });
    expect(app('db.lessonData["di_2026-11-17"].movedTo')).toBeUndefined();
  });
  it('dieselbe Klasse „nur am“ (z. B. anderer Raum) verlegt weiter wie bisher', async () => {
    setup();
    app('currentSpecificDate = "2026-11-17"');
    await app(`saveLessonOnce(db.lessonSlots[0], '2026-11-17', ${JSON.stringify({ ...input, subject: 'Mathe', groupId: 'g1', block: 4, color: '#3b82f6' })})`);
    const once = app('db.lessonSlots.find(s => s.specificDate === "2026-11-17")');
    expect(once.movedFrom).toEqual({ slotId: 'di', date: '2026-11-17' });
    expect(app(`db.lessonData["${once.id}_2026-11-17"].notes`)).toBe('Kap. 2 wiederholen');
  });
});

describe('AZ3: „Rückgängig“ im Stift-Modus holt auch die Planung zurück', () => {
  it('eingetipptes Thema zeigt nach Ziehen und Rückgängig wieder auf die Montagsstunde', async () => {
    load({ plan: [{ id: 'p', title: 'Brüche', pinned: '2026-11-23', pinnedSlot: 'mo' }, { id: 'q', title: 'Dezimalzahlen' }] });
    app('currentWeekOffset = 1');
    const p = app('moveLessonByDrag("mo", "2026-11-23", { day: 1, block: 1, dateStr: "2026-11-24" })');
    await flush();
    app('answerChoice("once")');
    expect(await p).toBe(true);
    expect(plan()[0].pinnedSlot).not.toBe('mo');
    app('undoTimetableChange()');
    expect(plan()[0]).toMatchObject({ pinnedSlot: 'mo', pinned: '2026-11-23' });
    const a = app('planAssignments(db.groups[0])');
    expect(a.byKey.get('mo_2026-11-23')).toMatchObject({ topic: { title: 'Brüche' } });
  });
});

describe('AZ4: Verlegung nicht aufheben, wenn am alten Platz inzwischen eine andere einmalige Stunde liegt', () => {
  it('Löschen der verlegten Stunde wird abgelehnt, nichts verschwindet', async () => {
    load({ slots: [W('mo', 0, 2), W('do8b', 3, 1, { groupId: 'g2', subject: 'Bio' })], lessonData: { 'mo_2026-11-23': { notes: 'wichtig' } } });
    const once = app('moveOccurrenceOnce(db.lessonSlots[0], "2026-11-23", { day: 1, block: 3, dateStr: "2026-11-24" })');
    app('moveOccurrenceOnce(db.lessonSlots[1], "2026-11-26", { day: 0, block: 2, dateStr: "2026-11-23" })');
    app(`editingSlotId = ${JSON.stringify(once.id)}`);
    await app('deleteLessonSlotFromEdit()');
    expect(app(`db.lessonSlots.some(s => s.id === ${JSON.stringify(once.id)})`)).toBe(true);
    expect(app(`db.lessonData["${once.id}_2026-11-24"].notes`)).toBe('wichtig');
    expect(document.getElementById('toast-container').textContent).toMatch(/liegt dort inzwischen/);
  });
  it('reiner Vermerk „verlegt“ zählt nicht als Notiz', () => {
    load({ lessonData: { 'mo_2026-11-23': { ausfall: true, movedTo: { slotId: 'x', date: '2026-11-24' } }, 'mo_2026-11-16': { notes: 'a' } } });
    expect(app('lessonEntryDates("mo")')).toEqual(['2026-11-16']);
  });
});

describe('AZ5: Stundenplanwechsel „ab …“ nimmt vorausgeplante Themen mit', () => {
  it('Do → Di ab Woche vom 16.11.: eingetippte Themen ohne Stundendaten liegen am Dienstag', () => {
    load({ slots: [W('do', 3, 1)], lessonData: { 'do_2026-11-05': { notes: 'alt' } },
      plan: [{ id: 'a', title: 'Bruchrechnen', pinned: '2026-11-19', pinnedSlot: 'do' }, { id: 'b', title: 'Dezimalzahlen', pinned: '2026-11-26', pinnedSlot: 'do' },
             { id: 'c', title: 'Prozent' }] });
    const n = app('splitSlotFrom(db.lessonSlots[0], "2026-11-16", { day: 1 })');
    expect(plan()[0]).toMatchObject({ pinnedSlot: n.id, pinned: '2026-11-17' });
    expect(plan()[1]).toMatchObject({ pinnedSlot: n.id, pinned: '2026-11-24' });
    const a = app('planAssignments(db.groups[0])');
    expect(JSON.stringify(a.byKey.get(`${n.id}_2026-11-17`))).toMatch(/Bruchrechnen/);
    expect(JSON.stringify(a.byKey.get(`${n.id}_2026-11-24`))).toMatch(/Dezimalzahlen/);
  });
});
