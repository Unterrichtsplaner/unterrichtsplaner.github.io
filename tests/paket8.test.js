// Gesamtprüfung 11.11.2026, Paket 8: Stundenplan. AQ7, AQ9, AQ11, AQ12, AQ14.
const { loadApp, app } = require('./helpers/load-app');

const W = (id, day, block, groupId, part = 'full', extra = {}) => ({ id, day, block, part, subject: groupId === 'g1' ? 'Mathe' : groupId === 'g2' ? 'Englisch' : 'Bio', color: '#6366f1', groupId, recurring: 'weekly', ...extra });
function sampleDB(slots, lessonData = {}) {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: slots, lessonData, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#6366f1', schularbeitWeight: 50 },
             { id: 'g2', subject: 'Englisch', className: '8a', color: '#22c55e', schularbeitWeight: 50 },
             { id: 'g3', subject: 'Bio', className: '9c', color: '#ef4444', schularbeitWeight: 50 }],
    students: { g1: [], g2: [], g3: [] },
  };
}
const flush = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 0)); };
const slot = id => app(`db.lessonSlots.find(s => s.id === ${JSON.stringify(id)})`);
const choiceOpen = () => !document.getElementById('modal-choice').classList.contains('hidden');
const choiceText = () => document.getElementById('modal-choice-text').textContent;
// Alle Rückfragen der Reihe nach beantworten; liefert ihre Texte
async function run(expr, answers) {
  const p = app(expr);
  const asked = [];
  for (let i = 0; i < 6; i++) {
    await flush();
    if (!choiceOpen()) break;
    asked.push(document.getElementById('modal-choice-title').textContent + ': ' + choiceText());
    app(`answerChoice(${JSON.stringify(answers[Math.min(asked.length - 1, answers.length - 1)])})`);
  }
  const r = await p; await flush();
  return { r, asked };
}
const load = d => app('replaceDB(' + JSON.stringify(d) + ')');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB([]))); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 11, 7, 0));   // Mi 11.11.2026
  window.innerWidth = 1024;
  if (app('typeof choiceResolve === "function"')) app('answerChoice(null)');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  window.confirm = () => true;
  app('currentSpecificDate = null; currentWeekOffset = 0');
});
afterEach(() => vi.useRealTimers());

describe('AQ7: Halbe Stunden tauschen', () => {
  it('„Für immer“: jede Stunde nimmt genau den Platz der anderen', async () => {
    load(sampleDB([W('a7', 0, 1, 'g1', 'first'), W('b8', 0, 1, 'g2', 'second')]));
    await run('moveLessonByDrag("a7", "2026-11-16", { day: 0, block: 1, part: "second", dateStr: "2026-11-16" })', ['from']);
    expect(slot('a7').part).toBe('second');
    expect(slot('b8').part).toBe('first');
  });
  it('halbe Stunde auf ganze Stunde getauscht („nur am …“): die zweite Hälfte bleibt sichtbar', async () => {
    load(sampleDB([W('a7', 0, 1, 'g1', 'first'), W('b8', 0, 1, 'g2', 'second'), W('c9', 1, 2, 'g3', 'full')]));
    await run('moveLessonByDrag("a7", "2026-11-16", { day: 1, block: 2, part: "full", dateStr: "2026-11-17" })', ['once']);
    const mon = app('lessonsAt("2026-11-16", 1).map(s => s.groupId + ":" + (s.part || "full")).sort()');
    expect(mon).toContain('g2:second');   // 8b-Stunde bleibt
    expect(mon).toContain('g3:first');    // 9c nimmt die frei gewordene Hälfte
    expect(mon).not.toContain('g3:full');
  });
});

describe('AQ9: Klasse einer Stunde ändern ist ein Stundenplanwechsel', () => {
  it('fragt „ab wann?“, frühere Stunden bleiben bei der alten Klasse, HA der alten Klasse bleibt fällig', async () => {
    const hw = { id: 'h1', text: 'S. 12', targetDate: '2026-11-12' };
    load(sampleDB([W('mo', 0, 1, 'g1'), W('do', 3, 2, 'g1')], { 'mo_2026-11-09': { hwEnabled: true, hwItems: [hw], done: 'Brüche' } }));
    app('currentSpecificDate = "2026-11-16"');
    const input = { subject: 'Englisch', day: 0, block: 1, room: '', groupId: 'g2', part: 'full', color: '#22c55e', recurringVal: 'weekly' };
    const { asked } = await run(`commitLessonSlot(${JSON.stringify(input)}, db.lessonSlots.find(s => s.id === "mo"))`, ['from']);
    expect(asked.join()).toMatch(/früheren Stunden/);
    expect(slot('mo').groupId).toBe('g1');
    expect(slot('mo').validUntil).toBeTruthy();
    const neu = app('db.lessonSlots.find(s => s.id !== "mo" && s.id !== "do")');
    expect(neu.groupId).toBe('g2');
    expect(app('getIncomingItems("do", "2026-11-12").hw.map(i => i.text)')).toContain('S. 12');
  });
});

describe('AQ11: Vertretung bei einer halben Stunde', () => {
  beforeEach(() => {
    load(sampleDB([W('di', 1, 2, 'g1', 'first')]));
    app('activeLessonId = "di"; activeLessonDate = "2026-11-17"');
  });
  it('wählt die Hälfte der Stunde vor', () => {
    app('openSubstituteForLesson()');
    const checked = [...document.getElementsByName('new-lesson-part')].find(r => r.checked);
    expect(checked.value).toBe('first');
    expect(document.getElementById('new-lesson-recurring').value).toBe('substitute');
  });
  it('Abbrechen ohne Eingabe fragt nicht', () => {
    app('openSubstituteForLesson()');
    window.confirm = vi.fn(() => true);
    app('closeModalLikeButton("modal-add-lesson")');
    expect(window.confirm).not.toHaveBeenCalled();
    expect(document.getElementById('modal-add-lesson').classList.contains('hidden')).toBe(true);
  });
});

describe('AQ12: Einmalige Stunde über zwei halbe Stunden', () => {
  it('fragt für beide ersetzten Hälften nach fälligen HA', async () => {
    load(sampleDB([W('h1', 0, 3, 'g1', 'first'), W('h2', 0, 3, 'g2', 'second')], {
      'h1_2026-11-09': { hwEnabled: true, hwItems: [{ id: 'x1', text: 'HA 7b', targetDate: '2026-11-16' }] },
      'h2_2026-11-09': { hwEnabled: true, hwItems: [{ id: 'x2', text: 'HA 8a', targetDate: '2026-11-16' }] },
    }));
    app('currentSpecificDate = "2026-11-16"');
    const input = { subject: 'Projekttag', day: 0, block: 3, room: '', groupId: null, part: 'full', color: '#ef4444', recurringVal: 'none' };
    const { asked } = await run(`commitLessonSlot(${JSON.stringify(input)}, null)`, ['move']);
    expect(asked.join('|')).toMatch(/HA 7b/);
    expect(asked.join('|')).toMatch(/HA 8a/);
    expect(app('db.lessonData["h2_2026-11-09"].hwItems[0].targetDate')).toBe('2026-11-23');
  });
});

describe('AQ14: Stundenplanwechsel „ab …“: HA nie am Tag ihrer Aufgabe fällig', () => {
  it('Freitag → Dienstag ab Mi 11.11.: HA aus der Stunde vom 13.11. (fällig 20.11.) wird am 24.11. fällig', async () => {
    load(sampleDB([W('mo', 0, 1, 'g1'), W('fr', 4, 2, 'g1')], {
      'fr_2026-11-06': { done: 'alt' },
      'fr_2026-11-13': { hwEnabled: true, hwItems: [{ id: 'h', text: 'S. 34 Nr. 2', targetDate: '2026-11-20' }] },
    }));
    app('currentSpecificDate = "2026-11-13"');
    const input = { subject: 'Mathe', day: 1, block: 2, room: '', groupId: 'g1', part: 'full', color: '#6366f1', recurringVal: 'weekly' };
    await run(`commitLessonSlot(${JSON.stringify(input)}, db.lessonSlots.find(s => s.id === "fr"))`, ['from']);
    const key = Object.keys(app('db.lessonData')).find(k => (app('db.lessonData')[k].hwItems || []).length);
    const given = key.slice(key.lastIndexOf('_') + 1);
    const due = app(`db.lessonData[${JSON.stringify(key)}].hwItems[0].targetDate`);
    expect(given).toBe('2026-11-17');
    expect(due).toBe('2026-11-24');   // schon seit Paket 2 (gleicher Abstand für Einträge und Zieldaten)
  });
});
