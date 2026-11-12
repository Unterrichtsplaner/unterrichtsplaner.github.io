// Gesamtprüfung 11.11.2026, Paket 16 (grün): Stundenplan und Planung. AQ19–AQ29.
const { loadApp, app } = require('./helpers/load-app');

const W = (id, day, block, extra = {}) => ({ id, day, block, part: 'full', subject: 'Mathe', color: '#3b82f6', groupId: 'g1', recurring: 'weekly', ...extra });
function sampleDB(x = {}) {
  return {
    settings: { teacherName: 'T', blocks: null, ...(x.settings || {}) },
    lessonSlots: x.slots || [W('mo', 0, 1), W('do', 3, 1)], lessonData: x.lessonData || {}, supervisions: x.supervisions || [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7a', color: '#3b82f6', schularbeitWeight: 50, plan: x.plan || [], classNotes: x.classNotes || [] },
             { id: 'g2', subject: 'Bio', className: '8a', color: '#22c55e', schularbeitWeight: 50 }],
    students: { g1: [], g2: [] },
  };
}
const load = x => app('replaceDB(' + JSON.stringify(sampleDB(x)) + ')');
const flush = async () => { for (let i = 0; i < 6; i++) await new Promise(r => setTimeout(r, 0)); };
const choiceOpen = () => !document.getElementById('modal-choice').classList.contains('hidden');
beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 11, 7, 0));   // Mi 11.11.2026
  window.innerWidth = 1024;
  load();
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  if (app('typeof choiceResolve === "function"')) app('answerChoice(null)');
  window.confirm = () => true;
  app('currentSpecificDate = null; currentWeekOffset = 0; timetableDay = null; timetableMode = "week"');
});
afterEach(() => { if (app('typeof choiceResolve === "function"')) app('answerChoice(null)'); app('switchView("dashboard")'); vi.useRealTimers(); });

describe('AQ19: Altdaten „recurring: true“', () => {
  it('Raum ändern fragt nicht „ab wann?“', async () => {
    load({ slots: [W('mo', 0, 1, { recurring: true })], lessonData: { 'mo_2026-09-14': { notes: 'alt' } } });
    const input = { subject: 'Mathe', day: 0, block: 1, room: 'R5', groupId: 'g1', part: 'full', color: '#3b82f6', recurringVal: 'weekly' };
    const p = app(`commitLessonSlot(${JSON.stringify(input)}, db.lessonSlots[0])`);
    await flush();
    expect(choiceOpen()).toBe(false);
    await p;
    expect(app('db.lessonSlots.length')).toBe(1);
  });
});

describe('AQ20: Einmalige Stunde wird auf dem Platz einer beendeten Stunde regelmäßig', () => {
  it('gilt erst ab dieser Woche', async () => {
    load({ slots: [W('alt', 0, 1, { validUntil: '2026-11-08' }), W('neu', 0, 1, { groupId: 'g2', subject: 'Bio', recurring: 'none', specificDate: '2026-11-16' })] });
    app('currentSpecificDate = "2026-11-16"');
    const input = { subject: 'Bio', day: 0, block: 1, room: '', groupId: 'g2', part: 'full', color: '#22c55e', recurringVal: 'weekly' };
    await app(`commitLessonSlot(${JSON.stringify(input)}, db.lessonSlots[1])`);
    expect(app('db.lessonSlots[1].validFrom')).toBe('2026-11-16');
  });
});

describe('AQ21: PDF-Stundenplan', () => {
  it('Stundenplanwechsel zwischen den beiden Wochen ist keine A/B-Woche', () => {
    load({ slots: [W('mo', 0, 1, { validUntil: '2026-11-22' }), W('di', 1, 3, { validFrom: '2026-11-23' })] });
    app('openPrintTimetable()');
    document.getElementById('print-from').value = '2026-11-16';
    window.print = () => {};
    app('printTimetable()');
    const area = document.getElementById('print-area').textContent;
    expect(area).not.toMatch(/abwechselnd/);
    window.dispatchEvent(new Event('afterprint'));
  });
});

describe('AQ22: Klassen-Ansicht', () => {
  it('Zeile mit „+ Thema“ ist kein Knopf im Knopf', () => {
    load({ plan: [] });
    app('switchView("timetable"); setTimetableMode("class"); timetableClassGroupId = "g1"; renderTimetable()');
    const btn = document.querySelector('.ttc-row [data-act="add"]');
    expect(btn).not.toBeNull();
    expect(btn.closest('[role="button"]')).toBeNull();
  });
});

describe('AQ23: Datum in den Ferien wählen (Wochenansicht)', () => {
  it('zeigt die Ferienwoche', () => {
    load({ settings: { holidays: [{ id: 'w', label: 'Weihnachtsferien', from: '2026-12-23', until: '2027-01-09' }] } });
    app('switchView("timetable"); jumpToDate("2026-12-28")');
    expect(app('formatDate(getWeekDates(currentWeekOffset)[0])')).toBe('2026-12-28');
  });
});

describe('AQ24: Klassenauswahl hängt keine Beobachter an', () => {
  it('nach vielen Neuzeichnungen bleibt die Zahl der Klick-Beobachter gleich', () => {
    const add = vi.spyOn(document, 'addEventListener'), remove = vi.spyOn(document, 'removeEventListener');
    app('switchView("timetable"); setTimetableMode("class"); timetableClassGroupId = "g1"');
    for (let i = 0; i < 5; i++) { app('renderTimetable()'); document.body.click(); }
    const adds = add.mock.calls.filter(c => c[0] === 'click').length, removes = remove.mock.calls.filter(c => c[0] === 'click').length;
    add.mockRestore(); remove.mockRestore();
    expect(adds - removes).toBeLessThanOrEqual(1);
  });
});

describe('AQ25: eingetipptes Thema rutscht nie auf eine frühere Stunde desselben Tages', () => {
  it('fällt die 5. Stunde aus: nächster Tag, nicht die 1. Stunde davor', () => {
    load({ slots: [W('m1', 0, 1), W('m4', 0, 4), W('do', 3, 1)],
      plan: [{ id: 'p', title: 'Gruppenarbeit Plakat', pinned: '2026-11-16', pinnedSlot: 'm4' }],
      lessonData: { 'm4_2026-11-16': { ausfall: true } } });
    const a = {}; app('planAssignments(db.groups[0])').byKey.forEach((v, k) => { a[k] = v.topic.title; });
    expect(a['m1_2026-11-16']).toBeUndefined();
    expect(a['do_2026-11-19']).toBe('Gruppenarbeit Plakat');
  });
});

describe('AQ26: Dauer auf die erledigten Stunden verkürzt', () => {
  it('Thema gilt als erledigt', () => {
    load({ plan: [{ id: 'p', title: 'Bruchrechnen', lessons: 3, doneLessons: ['mo_2026-11-02', 'do_2026-11-05'] }] });
    app('openPlanTopicForm("g1", db.groups[0].plan[0])');
    document.getElementById('plan-topic-lessons').value = '2';
    app('savePlanTopic()');
    expect(app('db.groups[0].plan[0].done')).toBe('2026-11-05');
  });
});

describe('AQ27: Große Klassenkachel', () => {
  it('abgehaktes Thema der laufenden Stunde bleibt sichtbar', () => {
    vi.setSystemTime(new Date(2026, 10, 12, 8, 0));   // Do, 1. Block läuft
    load({ plan: [{ id: 'p', title: 'Brüche', doneLessons: ['do_2026-11-12'], done: '2026-11-12' }] });
    const html = app('classTileDetailsHTML(db.groups[0], new Date())');
    expect(html).toMatch(/Brüche/);
    expect(html).not.toMatch(/Kein Thema geplant/);
  });
});

describe('AQ28: Klassennotizen', () => {
  it('angefangene neue Notiz wird übernommen, bevor eine vorhandene bearbeitet wird', () => {
    load({ classNotes: [{ id: 'n1', text: 'schon unterrichtet', date: '2026-11-01' }] });
    app('openClassNotes("g1")');
    document.getElementById('class-note-text').value = 'Stühle hochstellen';
    app('editClassNote(db.groups[0].classNotes[0])');
    expect(app('db.groups[0].classNotes.map(n => n.text)')).toContain('Stühle hochstellen');
    expect(document.getElementById('class-note-text').value).toBe('schon unterrichtet');
    app('closeModal("modal-class-notes")');
  });
});

describe('AQ29: Aufsicht alle 2 Wochen', () => {
  it('erscheint nicht vor dem ersten Termin', () => {
    app('openSupervisionForm(null)');
    document.getElementById('sup-start').value = '09:30'; document.getElementById('sup-end').value = '09:50';
    document.getElementById('sup-place').value = 'Hof'; document.getElementById('sup-recurring').value = 'biweekly';
    document.getElementById('sup-date').value = '2026-11-30';
    app('saveSupervision()');
    const sup = app('db.supervisions[0]');
    expect(app(`slotOccursOn(db.supervisions[0], "2026-11-16")`)).toBe(false);
    expect(app(`slotOccursOn(db.supervisions[0], "2026-11-30")`)).toBe(true);
    expect(sup.startDate).toBe('2026-11-30');
  });
});
