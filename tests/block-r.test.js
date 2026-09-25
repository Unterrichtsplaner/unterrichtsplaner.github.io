// Block R (Review 25.09.2026, zweite Runde): Stundenplan, Stunden-Fenster, Dashboard.
const { loadApp, app } = require('./helpers/load-app');

// Donnerstag, 24.09.2026, 14:00 – 7b hat Mo (Block 1), Mi (Block 1) und Fr (Block 3)
const NOW = new Date('2026-09-24T14:00:00');
function stu(id, firstName, lastName, extra = {}) {
  return { id, firstName, lastName, grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra };
}
function sampleDB() {
  return {
    settings: { teacherName: 'Test', school: '', blocks: null },
    lessonSlots: [
      { id: 'mo', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
      { id: 'mi', day: 2, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
      { id: 'fr', day: 4, block: 3, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
    ],
    lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#6366f1', schularbeitWeight: 50 }],
    students: { g1: [stu('s1', 'Anna', 'Zander')] },
  };
}

const slot = id => app('db').lessonSlots.find(s => s.id === id);
const data = () => app('db').lessonData;
const hidden = id => document.getElementById(id).classList.contains('hidden');
const flush = () => new Promise(r => setTimeout(r, 0));
const occurs = (s, d) => app('slotOccursOn')(s, d);

async function choose(labelPart) {
  await vi.waitFor(() => expect(hidden('modal-choice')).toBe(false));
  const btn = [...document.querySelectorAll('#modal-choice-buttons button')].find(b => b.textContent.includes(labelPart));
  expect(btn, `Knopf „${labelPart}“ in: ${document.getElementById('modal-choice-buttons').textContent}`).toBeTruthy();
  btn.click();
  await flush();
}
const choiceText = () => document.getElementById('modal-choice-text').textContent;
function editLesson(slotId, dateStr) {
  app(`openLessonDetail('${slotId}', '${dateStr}')`);
  app('openEditLesson()');
}

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  window.innerWidth = 1024;
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});
afterAll(() => vi.useRealTimers());

beforeEach(() => {
  vi.setSystemTime(NOW);
  window.innerWidth = 1024;
  app('db = ' + JSON.stringify(sampleDB()));
  app('currentWeekOffset = 0; timetableDay = null; timetableChosenOn = ""; editingSlotId = null; activeLessonId = null; activeLessonDate = null');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
  window.confirm = () => true;
});

describe('R1: „ab …“ lässt Stunden, die schon waren, in Ruhe', () => {
  beforeEach(() => {
    data()['mo_2026-09-14'] = { notes: 'alt' };
    data()['mo_2026-09-21'] = { notes: 'schon gehalten' };
    data()['mo_2026-09-28'] = { notes: 'künftig' };
  });

  it('Beenden am Donnerstag: die Stunde vom Montag bleibt samt Notizen', async () => {
    editLesson('mo', '2026-09-21');
    const done = app('deleteLessonSlotFromEdit()');
    await vi.waitFor(() => expect(hidden('modal-choice')).toBe(false));
    expect(choiceText()).toMatch(/1 Stunde mit Einträgen/); // die am 28.09., die dabei verloren geht
    await choose('beenden');
    await done;
    expect(data()['mo_2026-09-21']).toEqual({ notes: 'schon gehalten' });
    expect(occurs(slot('mo'), '2026-09-21')).toBe(true);
    expect(occurs(slot('mo'), '2026-09-28')).toBe(false);
  });

  it('Tag ändern Mo → Di am Donnerstag: Montag bleibt, ab nächster Woche Dienstag', async () => {
    editLesson('mo', '2026-09-21');
    document.getElementById('new-lesson-day').value = '1';
    const saved = app('saveLessonSlot()');
    await choose('Ab ');
    await saved;
    const neu = app('db').lessonSlots.find(s => s.id !== 'mo' && s.day === 1);
    expect(data()['mo_2026-09-21']).toEqual({ notes: 'schon gehalten' });
    expect(occurs(slot('mo'), '2026-09-21')).toBe(true);
    expect(occurs(neu, '2026-09-22')).toBe(false); // vorgestern: nicht rückwirkend
    expect(occurs(neu, '2026-09-29')).toBe(true);
    expect(data()[`${neu.id}_2026-09-29`]).toEqual({ notes: 'künftig' });
  });

  it('eine Stunde von heute mit Einträgen bleibt auch bei der alten Stunde', async () => {
    data()['mi_2026-09-23'] = { notes: 'gestern' };
    data()['fr_2026-09-18'] = { notes: 'alt' };
    vi.setSystemTime(new Date('2026-09-25T14:00:00')); // Freitag nach der Stunde
    data()['fr_2026-09-25'] = { notes: 'heute gehalten' };
    editLesson('fr', '2026-09-25');
    document.getElementById('new-lesson-day').value = '3';
    const saved = app('saveLessonSlot()');
    await choose('Ab ');
    await saved;
    expect(data()['fr_2026-09-25']).toEqual({ notes: 'heute gehalten' });
    expect(occurs(slot('fr'), '2026-09-25')).toBe(true);
  });
});

describe('R2: Zieldatum wandert mit', () => {
  it('HA für Montag 28.09., Stunde auf Dienstag → fällig am 29.09.', async () => {
    data()['mo_2026-09-14'] = { notes: 'alt' };
    data()['mo_2026-09-21'] = { hwEnabled: true, hwItems: [{ id: 'h1', text: 'S. 12', targetDate: '2026-09-28' }] };
    editLesson('mo', '2026-09-21');
    document.getElementById('new-lesson-day').value = '1';
    const saved = app('saveLessonSlot()');
    await choose('Alle Stunden');
    await saved;
    const item = Object.values(data()).flatMap(d => d.hwItems || []).find(i => i.id === 'h1');
    expect(item.targetDate).toBe('2026-09-29');
    expect(app('dueItemsFor')('mo', '2026-09-29').hw).toHaveLength(1);
  });
});

describe('R3: alte Stunde nach Wechsel ab Woche bleibt bearbeitbar', () => {
  it('nur den Raum ändern geht', async () => {
    data()['mo_2026-09-14'] = { notes: 'alt' };
    editLesson('mo', '2026-10-05');
    document.querySelector('input[name="new-lesson-part"][value="first"]').checked = true;
    const saved = app('saveLessonSlot()');
    await choose('Ab der Woche');
    await saved;
    editLesson('mo', '2026-09-14');
    document.getElementById('new-lesson-room').value = 'R 9';
    await app('saveLessonSlot()');
    expect(slot('mo').room).toBe('R 9');
  });
});

describe('R4: HA in ausfallender Stunde', () => {
  it('„Stunde entfällt“ bietet an, die fällige HA auf die nächste Stunde zu verschieben', async () => {
    data()['mi_2026-09-30'] = { hwEnabled: true, hwItems: [{ id: 'h1', text: 'S. 12', targetDate: '2026-10-02' }] };
    app(`openLessonDetail('fr', '2026-10-02')`);
    const done = app('toggleAusfall()');
    await choose('verschieben');
    await done;
    expect(data()['mi_2026-09-30'].hwItems[0].targetDate).toBe('2026-10-05');
    expect(data()['fr_2026-10-02'].ausfall).toBe(true);
  });
  it('„Lassen“: HA bleibt, Stunde fällt trotzdem aus', async () => {
    data()['mi_2026-09-30'] = { hwEnabled: true, hwItems: [{ id: 'h1', text: 'S. 12', targetDate: '2026-10-02' }] };
    app(`openLessonDetail('fr', '2026-10-02')`);
    const done = app('toggleAusfall()');
    await choose('lassen');
    await done;
    expect(data()['mi_2026-09-30'].hwItems[0].targetDate).toBe('2026-10-02');
    expect(data()['fr_2026-10-02'].ausfall).toBe(true);
  });
});

describe('R5: Blöcke nach Uhrzeit', () => {
  it('ein früher „0. Block“ steht vorne und ist die nächste Stunde', () => {
    app('db').settings.blocks = [
      { num: 1, label: '1. Block', start: '07:45', end: '09:15' },
      { num: 2, label: '2. Block', start: '09:45', end: '11:15' },
      { num: 5, label: '0. Stunde', start: '07:00', end: '07:40' },
    ];
    app('db').lessonSlots.push({ id: 'frueh', day: 0, block: 5, part: 'full', subject: 'Frühsport', recurring: 'weekly' });
    expect(app('lessonsOnDate')('2026-09-28')[0].slot.id).toBe('frueh');
    expect(app('findNextLesson')(new Date('2026-09-28T06:30:00')).slot.id).toBe('frueh');
    expect(app('getBlocks()').map(b => b.num)).toEqual([5, 1, 2]);
  });
});

describe('R6: gewählte Woche verfällt über Nacht', () => {
  it('Freitag „nächste Woche“, Samstag: Stundenplan zeigt die kommende Woche, nicht die übernächste', () => {
    vi.setSystemTime(new Date('2026-09-25T10:00:00'));
    app('navigateWeek(1)');
    vi.setSystemTime(new Date('2026-09-26T10:00:00'));
    app('renderTimetable()');
    expect(app('formatDate(getWeekDates(currentWeekOffset)[0])')).toBe('2026-09-28');
  });
  it('Tagesansicht: am nächsten Tag wieder „heute“', () => {
    window.innerWidth = 400;
    vi.setSystemTime(new Date('2026-09-25T10:00:00'));
    app(`jumpToDate('2026-09-23')`);
    vi.setSystemTime(new Date('2026-09-28T07:00:00'));
    app('renderTimetable()');
    expect(app('formatDate(timetableDayDate())')).toBe('2026-09-28');
  });
});

describe('R7: Öffnen und Schließen ist keine Änderung', () => {
  it('fällige HA schaltet den Schalter nur in der Anzeige ein', () => {
    data()['mo_2026-09-28'] = { hwEnabled: true, hwItems: [{ id: 'h1', text: 'S. 12', targetDate: '2026-09-30' }] };
    app(`openLessonDetail('mi', '2026-09-30')`);
    expect(document.getElementById('hw-toggle').checked).toBe(true);
    app('saveLessonDataAndClose()');
    expect(app('db').settings.lastModified).toBeUndefined();
    expect(data()['mi_2026-09-30']).toBeUndefined();
  });
});

describe('R8/R9: Vertretungen sperren keine regelmäßigen Stunden', () => {
  it('künftige Vertretung im Platz: regelmäßige Stunde lässt sich trotzdem anlegen', async () => {
    app('db').lessonSlots.push({ id: 'vt', day: 1, block: 2, part: 'full', subject: 'Vertretung', recurring: 'none', specificDate: '2026-10-06' });
    app(`openAddLessonSlot(1, 2, '2026-09-29')`);
    document.getElementById('new-lesson-subject').value = 'Chor';
    await app('saveLessonSlot()');
    expect(app('db').lessonSlots.some(s => s.subject === 'Chor')).toBe(true);
  });
  it('vergangene halbe Vertretung sperrt beim Bearbeiten keine Hälfte', () => {
    app('db').lessonSlots.push({ id: 'vt', day: 0, block: 1, part: 'first', subject: 'Vertretung', recurring: 'none', specificDate: '2026-03-02' });
    editLesson('mo', '2026-09-28');
    const disabled = [...document.getElementsByName('new-lesson-part')].filter(r => r.disabled).map(r => r.value);
    expect(disabled).toEqual([]);
  });
});

describe('R10: Rhythmuswechsel mit künftigen Einträgen', () => {
  it('fragt nach, wenn künftige Einträge auf keinen Termin mehr fallen', async () => {
    data()['mo_2026-10-05'] = { notes: 'Test schreiben!' };
    const ask = vi.fn(() => false);
    window.confirm = ask;
    editLesson('mo', '2026-09-28');
    document.getElementById('new-lesson-recurring').value = 'biweekly';
    await app('saveLessonSlot()');
    expect(ask).toHaveBeenCalled();
    expect(ask.mock.calls[0][0]).toMatch(/05\.10\./);
    expect(slot('mo').recurring).toBe('weekly');
  });
});

describe('R11: HA am Doppelstunden-Tag', () => {
  it('ist nur in der ersten Stunde des Tages fällig', () => {
    app('db').lessonSlots.push({ id: 'mo3', day: 0, block: 3, part: 'full', subject: 'Mathe', groupId: 'g1', recurring: 'weekly' });
    data()['mi_2026-09-23'] = { hwEnabled: true, hwItems: [{ id: 'h1', text: 'S. 12', targetDate: '2026-09-28' }] };
    expect(app('dueItemsFor')('mo', '2026-09-28').hw).toHaveLength(1);
    expect(app('dueItemsFor')('mo3', '2026-09-28').hw).toHaveLength(0);
  });
  it('fällt die erste aus, ist die HA in der zweiten fällig', () => {
    app('db').lessonSlots.push({ id: 'mo3', day: 0, block: 3, part: 'full', subject: 'Mathe', groupId: 'g1', recurring: 'weekly' });
    data()['mi_2026-09-23'] = { hwEnabled: true, hwItems: [{ id: 'h1', text: 'S. 12', targetDate: '2026-09-28' }] };
    data()['mo_2026-09-28'] = { ausfall: true };
    expect(app('dueItemsFor')('mo3', '2026-09-28').hw).toHaveLength(1);
  });
});

describe('R12: HA ohne Zieldatum', () => {
  it('Dashboard zählt sie wie die Kachel', () => {
    data()['mo_2026-09-28'] = { hwEnabled: true, hwItems: [{ id: 'h1', text: 'ohne Datum', targetDate: '' }] };
    expect(app('dueItemsFor')('mo', '2026-09-28').hw).toHaveLength(1);
  });
});

describe('R13: Datum im Fenster „Stunde hinzufügen“', () => {
  it('„Nur einmalig“ zeigt, an welchem Tag die Stunde stattfindet', () => {
    app(`openAddLessonSlot(2, 1, '2026-09-28')`);
    document.getElementById('new-lesson-recurring').value = 'none';
    app('updateLessonDateHint()');
    expect(document.getElementById('lesson-date-hint').textContent).toMatch(/30\.09\.2026/);
  });
  it('„Alle 2 Wochen“ nennt die erste Stunde', () => {
    app(`openAddLessonSlot(0, 1, '2026-09-28')`);
    document.getElementById('new-lesson-recurring').value = 'biweekly';
    app('updateLessonDateHint()');
    expect(document.getElementById('lesson-date-hint').textContent).toMatch(/28\.09\.2026/);
  });
  it('HA auf einen Tag ohne Stunde der Klasse: Rückfrage', () => {
    const ask = vi.fn(() => false);
    window.confirm = ask;
    app(`openLessonDetail('mo', '2026-09-28')`);
    document.getElementById('new-hw-text').value = 'S. 12';
    document.getElementById('new-hw-date').value = '2026-09-29'; // Dienstag: keine 7b
    app('addHWItem()');
    expect(ask).toHaveBeenCalled();
    expect((data()['mo_2026-09-28'] || {}).hwItems || []).toHaveLength(0);
  });
});

describe('R14: Warnung quittieren', () => {
  it('neue Fehlzeit nach Löschen einer alten erscheint wieder', () => {
    app('db').settings.warnAbsences = 2;
    const s = app('db').students.g1[0];
    s.attendance = [{ id: 'a1', date: '2026-09-14', type: 'abwesend' }, { id: 'a2', date: '2026-09-16', type: 'abwesend' }];
    const w = app('collectWarnings()').find(x => x.type === 'absences');
    app('acknowledgeWarning')(w.student.id, w.type, w.count);
    expect(app('collectWarnings()').some(x => x.type === 'absences')).toBe(false);
    s.attendance.shift();
    s.attendance.push({ id: 'a3', date: '2026-09-23', type: 'abwesend' });
    expect(app('collectWarnings()').some(x => x.type === 'absences')).toBe(true);
  });
});
