// Block V (Review 25.09.2026, dritte Runde): Stundenplan, Stunden-Fenster, Dashboard.
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
    groups: [
      { id: 'g1', subject: 'Mathe', className: '7b', color: '#6366f1', schularbeitWeight: 50 },
      { id: 'g2', subject: 'Physik', className: '8a', color: '#f59e0b', schularbeitWeight: 50 },
    ],
    students: { g1: [stu('s1', 'Anna', 'Zander')], g2: [] },
  };
}

const slot = id => app('db').lessonSlots.find(s => s.id === id);
const data = () => app('db').lessonData;
const hidden = id => document.getElementById(id).classList.contains('hidden');
const flush = () => new Promise(r => setTimeout(r, 0));
const toasts = () => [...document.querySelectorAll('#toast-container .toast')].map(t => t.textContent).join(' | ');

async function choose(labelPart) {
  await vi.waitFor(() => expect(hidden('modal-choice')).toBe(false));
  const btn = [...document.querySelectorAll('#modal-choice-buttons button')].find(b => b.textContent.includes(labelPart));
  expect(btn, `Knopf „${labelPart}“ in: ${document.getElementById('modal-choice-buttons').textContent}`).toBeTruthy();
  btn.click();
  await flush();
}
function editLesson(slotId, dateStr) {
  app(`openLessonDetail('${slotId}', '${dateStr}')`);
  app('openEditLesson()');
}
function cellFor(dateStr, blockNum) {
  const block = app('getBlocks()').find(b => b.num === blockNum);
  const d = app('parseDate')(dateStr);
  return app('buildTimetableCell')(d, (d.getDay() + 6) % 7, block);
}
const radio = v => [...document.getElementsByName('new-lesson-part')].find(r => r.value === v);

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
  if (app('choiceResolve')) app('answerChoice(null)');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
  window.confirm = () => true;
});

describe('V1: Stunde auf den Platz einer beendeten Stunde', () => {
  beforeEach(() => {
    slot('mo').validUntil = '2026-09-20';
    data()['mo_2026-09-14'] = { notes: 'Notizen der 7b' };
    app(`db.lessonSlots.push({ id: 'di8a', day: 1, block: 1, part: 'full', subject: 'Physik', color: '#f59e0b', groupId: 'g2', recurring: 'weekly' })`);
  });

  it('8a ohne frühere Einträge auf Montag: in früheren Wochen bleibt die 7b sichtbar', async () => {
    editLesson('di8a', '2026-09-29');
    document.getElementById('new-lesson-day').value = '0';
    await app('saveLessonSlot()');
    expect(slot('di8a').day).toBe(0);
    expect(app('lessonsAt("2026-09-14", 1)').map(s => s.id)).toEqual(['mo']);
    expect(cellFor('2026-09-14', 1).querySelectorAll('.tt-lesson')).toHaveLength(1);
    expect(app('lessonsAt("2026-09-28", 1)').map(s => s.id)).toEqual(['di8a']);
  });

  it('8a mit früheren Einträgen, „alle Stunden ändern“: abgelehnt statt Überschneidung in früheren Wochen', async () => {
    data()['di8a_2026-09-15'] = { notes: 'Versuch 1' };
    editLesson('di8a', '2026-09-29');
    document.getElementById('new-lesson-day').value = '0';
    const saving = app('saveLessonSlot()');
    await choose('Alle Stunden');
    await saving;
    expect(slot('di8a').day).toBe(1);
    expect(toasts()).toMatch(/früheren Wochen/);
  });

  it('Nachfolge-Stunde (eigener Beginn nach der beendeten) mit früheren Einträgen: Raum ändern geht', async () => {
    // 8a liegt seit dem 21.09. auf dem Platz der 7b und hat schon eine gehaltene Stunde (Nachtrag V1)
    app(`db.lessonSlots.push({ id: 'mo8a', day: 0, block: 1, part: 'full', subject: 'Physik', color: '#f59e0b', groupId: 'g2', recurring: 'weekly', validFrom: '2026-09-21', room: 'A1' })`);
    data()['mo8a_2026-09-21'] = { notes: 'Einstieg' };
    editLesson('mo8a', '2026-10-05');
    document.getElementById('new-lesson-room').value = 'B2';
    await app('saveLessonSlot()');
    expect(slot('mo8a').room).toBe('B2');
    expect(slot('mo8a').validFrom).toBe('2026-09-21');
    expect(toasts()).not.toMatch(/früheren Wochen/);
  });

  it('Kachel mit zwei ganzen Stunden (z. B. alter Stand) zeigt beide statt zweier „+“', () => {
    app(`db.lessonSlots.push({ id: 'x', day: 0, block: 1, part: 'full', subject: 'Physik', color: '#f59e0b', groupId: 'g2', recurring: 'weekly' })`);
    const cell = cellFor('2026-09-14', 1);
    expect(cell.querySelectorAll('.tt-lesson')).toHaveLength(2);
    expect(cell.querySelectorAll('.tt-empty-cell')).toHaveLength(0);
  });
});

describe('V2: zurückgenommene HA bleibt zurückgenommen', () => {
  it('Notiz schreiben und schließen schaltet die eigene HA nicht wieder ein', () => {
    data()['mo_2026-09-21'] = { hwEnabled: false, hwItems: [{ id: 'h1', text: 'S. 5', targetDate: '2026-09-23' }] };
    data()['fr_2026-09-18'] = { hwEnabled: true, hwItems: [{ id: 'h2', text: 'vom Freitag', targetDate: '2026-09-21' }] };
    app(`openLessonDetail('mo', '2026-09-21')`);
    expect(document.getElementById('hw-toggle').checked).toBe(true); // wegen der fälligen HA
    document.getElementById('lesson-notes-text').value = 'nur eine Notiz';
    app('saveLessonDataAndClose()');
    expect(data()['mo_2026-09-21'].hwEnabled).toBe(false);
    expect(app('dueItemsFor("mi", "2026-09-23")').hw).toHaveLength(0);
  });

  it('wer den Schalter wirklich umlegt, ändert ihn weiterhin', () => {
    data()['mo_2026-09-21'] = { hwEnabled: true, hwItems: [{ id: 'h1', text: 'S. 5', targetDate: '2026-09-23' }] };
    app(`openLessonDetail('mo', '2026-09-21')`);
    document.getElementById('hw-toggle').checked = false;
    app('saveLessonDataAndClose()');
    expect(data()['mo_2026-09-21'].hwEnabled).toBe(false);
  });
});

describe('V3: HA auf eine wegfallende Stunde', () => {
  beforeEach(() => {
    data()['mo_2026-09-28'] = { hwEnabled: true, hwItems: [{ id: 'h1', text: 'Aufgabe 3', targetDate: '2026-09-30' }] };
  });

  it('Mittwochsstunde gelöscht → Angebot, die HA auf die nächste Stunde zu verschieben', async () => {
    editLesson('mi', '2026-09-30');
    const deleting = app('deleteLessonSlotFromEdit()');
    await choose('verschieben');
    await deleting;
    expect(slot('mi')).toBeUndefined();
    expect(data()['mo_2026-09-28'].hwItems[0].targetDate).toBe('2026-10-02');
  });

  it('Mittwoch auf zweiwöchentlich (A-Woche 07.10.) → 30.09. fällt weg, HA wird angeboten', async () => {
    editLesson('mi', '2026-10-07');
    document.getElementById('new-lesson-recurring').value = 'biweekly';
    const saving = app('saveLessonSlot()');
    await choose('verschieben');
    await saving;
    expect(data()['mo_2026-09-28'].hwItems[0].targetDate).toBe('2026-10-02');
  });

  it('„So lassen“ lässt das Datum', async () => {
    editLesson('mi', '2026-09-30');
    const deleting = app('deleteLessonSlotFromEdit()');
    await choose('lassen');
    await deleting;
    expect(data()['mo_2026-09-28'].hwItems[0].targetDate).toBe('2026-09-30');
  });
});

describe('V4: Tag nach vorn verschoben', () => {
  it('Fr → Mo: HA für Freitag wandert auf den nächsten Montag, nicht in die Vergangenheit', async () => {
    data()['mi_2026-09-23'] = { hwEnabled: true, hwItems: [{ id: 'h1', text: 'x', targetDate: '2026-09-25' }] };
    editLesson('fr', '2026-09-25');
    document.getElementById('new-lesson-day').value = '0';
    await app('saveLessonSlot()');
    expect(slot('fr').day).toBe(0);
    expect(data()['mi_2026-09-23'].hwItems[0].targetDate).toBe('2026-09-28');
  });
});

describe('V5: „Ganzer Block“ frei, wenn die andere Hälfte beendet ist', () => {
  it('Physik 2. Hälfte ab 28.09. öffnen: „Ganzer Block“ wählbar', () => {
    slot('mo').part = 'first';
    slot('mo').validUntil = '2026-09-20';
    app(`db.lessonSlots.push({ id: 'ph', day: 0, block: 1, part: 'second', subject: 'Physik', color: '#f59e0b', groupId: 'g2', recurring: 'weekly' })`);
    editLesson('ph', '2026-09-28');
    expect(radio('full').disabled).toBe(false);
    expect(radio('first').disabled).toBe(false);
  });

  it('läuft die andere Hälfte noch, bleibt „Ganzer Block“ gesperrt', () => {
    slot('mo').part = 'first';
    app(`db.lessonSlots.push({ id: 'ph', day: 0, block: 1, part: 'second', subject: 'Physik', color: '#f59e0b', groupId: 'g2', recurring: 'weekly' })`);
    editLesson('ph', '2026-09-28');
    expect(radio('full').disabled).toBe(true);
  });
});

describe('V6: Vertretung über vorbereiteten Notizen', () => {
  it('fragt nach, wenn die ersetzte Stunde schon Notizen hat', async () => {
    data()['mi_2026-09-30'] = { notes: 'Kopien mitnehmen' };
    const confirmSpy = vi.fn(() => false);
    window.confirm = confirmSpy;
    app(`openAddLessonSlot(2, 1, '2026-09-30')`);
    document.getElementById('new-lesson-subject').value = 'Vertretung 9c';
    document.getElementById('new-lesson-recurring').value = 'none';
    await app('saveLessonSlot()');
    expect(confirmSpy).toHaveBeenCalled();
    expect(confirmSpy.mock.calls[0][0]).toMatch(/Notizen/);
    expect(app('db').lessonSlots).toHaveLength(3);
  });
});

describe('V7: „heute“ nur bei Stunden von heute', () => {
  it('fällige HA einer Stunde in zwei Wochen: nicht „Fällig heute“', () => {
    data()['mi_2026-09-30'] = { hwEnabled: true, hwItems: [{ id: 'h1', text: 'x', targetDate: '2026-10-05' }] };
    app(`openLessonDetail('mo', '2026-10-05')`);
    const text = document.getElementById('hw-incoming-list').textContent;
    expect(text).not.toMatch(/heute/);
    expect(text).toMatch(/in dieser Stunde/);
  });

  it('„Heute fehlen“ heißt bei einer vergangenen Stunde „Gefehlt am …“', () => {
    app('db.students.g1[0].attendance.push({ id: "a", date: "2026-09-21", type: "abwesend", note: "" })');
    app(`openLessonDetail('mo', '2026-09-21')`);
    const label = document.querySelector('#lesson-absent-container .notes-section-label').textContent;
    expect(label).not.toMatch(/Heute/);
    expect(label).toMatch(/21\.09\./);
  });
});

describe('V8: Hälften in „Stunde hinzufügen“ nach Tageswechsel neu', () => {
  it('„+“ in der 2. Hälfte Mo, dann Dienstag gewählt → alle Hälften wählbar', () => {
    slot('mo').part = 'first';
    app(`openAddLessonSlot(0, 1, '2026-09-21', 'second')`);
    expect(radio('full').disabled).toBe(true);
    document.getElementById('new-lesson-day').value = '1';
    app('updateLessonDateHint()');
    expect(radio('full').disabled).toBe(false);
    expect(radio('first').disabled).toBe(false);
  });
});

describe('V9: Hinweise im Stunden-Formular', () => {
  it('zweiwöchentliche Stunde bearbeiten: kein „erstmals“', () => {
    slot('mi').recurring = 'biweekly';
    slot('mi').startDate = '2026-09-09';
    editLesson('mi', '2026-10-07');
    const hint = document.getElementById('lesson-date-hint').textContent;
    expect(hint).not.toMatch(/erstmals/);
    expect(hint).toMatch(/A-Woche/);
  });

  it('HA-Datum auf eine ausfallende Stunde: Rückfrage', () => {
    data()['fr_2026-09-25'] = { ausfall: true };
    const confirmSpy = vi.fn(() => false);
    window.confirm = confirmSpy;
    app(`openLessonDetail('mo', '2026-09-21')`);
    document.getElementById('new-hw-text').value = 'S. 7';
    document.getElementById('new-hw-date').value = '2026-09-25';
    app('addHWItem()');
    expect(confirmSpy).toHaveBeenCalled();
  });
});
