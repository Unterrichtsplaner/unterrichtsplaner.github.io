// „Nur diese Woche“ / „Für immer“ beim Verschieben und Bearbeiten; Rückgängig-Knopf; Icons/Pausen (Rückmeldung zu AC2).
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

const MON = '2026-10-19', TUE = '2026-10-20', WED = '2026-10-21';
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
    groups: [{ id: 'g1', subject: 'Mathe', className: '7a', color: '#6366f1', schularbeitWeight: 50 },
             { id: 'g2', subject: 'Physik', className: '9c', color: '#22c55e', schularbeitWeight: 50 }],
    students: { g1: [], g2: [] },
    supervisions: [],
  };
}
const flush = async (n = 4) => { for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 0)); };
const slot = id => app('db.lessonSlots').find(s => s.id === id);
const data = () => app('db.lessonData');
const choiceOpen = () => !document.getElementById('modal-choice').classList.contains('hidden');
const buttons = () => [...document.querySelectorAll('#modal-choice-buttons button')].map(b => b.textContent);
async function answerNext(answer) { await flush(); const b = choiceOpen() ? buttons() : null; if (choiceOpen()) app(`answerChoice(${JSON.stringify(answer)})`); await flush(); return b; }
async function drag(id, src, target, answer) {
  const p = app(`moveLessonByDrag(${JSON.stringify(id)}, ${JSON.stringify(src)}, ${JSON.stringify(target)})`);
  const b = await answerNext(answer);
  await p; await flush();
  expect(choiceOpen()).toBe(false);
  return b;
}
const onceSlots = () => app('db.lessonSlots').filter(s => s.movedFrom);

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 17, 10, 0)); // Sa 17.10. – Woche ab 19.10. liegt komplett in der Zukunft
  window.innerWidth = 1024;
  app('db = ' + JSON.stringify(sampleDB()));
  app('timetableEditMode = false; ttUndoStack = []; currentWeekOffset = 0; timetableDay = null; timetableChosenOn = ""; currentSpecificDate = null; editingSlotId = null');
  if (app('choiceResolve')) app('answerChoice(null)');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
  window.confirm = () => true;
  app('switchView("timetable"); toggleTimetableEditMode(true)');
});
afterEach(() => vi.useRealTimers());

describe('Ziehen: „Nur diese Woche“', () => {
  it('legt eine einmalige Stunde an, der Ursprung ist an diesem Tag „verlegt“, Notizen wandern mit', async () => {
    const b = await drag('a', MON, { day: 2, block: 3, part: null, dateStr: WED }, 'once');
    expect(b[0]).toMatch(/^Nur am Mo\.?,? 19\.10\.2026/);
    expect(slot('a')).toMatchObject({ day: 0, block: 1, recurring: 'weekly' });     // regelmäßige bleibt
    const once = onceSlots()[0];
    expect(once).toMatchObject({ day: 2, block: 3, specificDate: WED, groupId: 'g1', room: 'R1', movedFrom: { slotId: 'a', date: MON } });
    expect(app('isOneOffSlot')(once)).toBe(true);
    expect(data()[`${once.id}_${WED}`]).toEqual({ notes: 'Bruchrechnen vorbereiten' });
    expect(data()[`a_${MON}`]).toMatchObject({ ausfall: true, movedTo: { slotId: once.id, date: WED } });
    // nächste Woche wieder normal
    expect(app(`lessonsAt("2026-10-26", 1)`).map(s => s.id)).toEqual(['a']);
  });

  it('Hausaufgabe, die am alten Termin fällig war, ist jetzt am neuen fällig', async () => {
    await drag('a', MON, { day: 2, block: 3, part: null, dateStr: WED }, 'once');
    expect(data()['a2_2026-10-15'].hwItems[0].targetDate).toBe(WED);
  });

  it('Kachel am alten Platz zeigt „verlegt“, die neue „verlegt“ statt „einmalig“', async () => {
    await drag('a', MON, { day: 2, block: 3, part: null, dateStr: WED }, 'once');
    app('renderTimetable()');
    const tiles = [...document.querySelectorAll('.tt-lesson')].map(t => t.textContent.replace(/\s+/g, ' '));
    expect(tiles.filter(t => /verlegt/.test(t)).length).toBe(2);
  });

  it('Tauschen nur diese Woche: EINE Rückfrage, zwei einmalige Stunden, regelmäßige unverändert', async () => {
    const b = await drag('a', MON, { day: 1, block: 2, part: null, dateStr: TUE }, 'once');
    expect(b.length).toBe(3); // nur diese Woche, für immer, Abbrechen
    expect(slot('a')).toMatchObject({ day: 0, block: 1 });
    expect(slot('b')).toMatchObject({ day: 1, block: 2 });
    expect(app(`lessonsAt("${TUE}", 2)`).map(s => s.subject)).toEqual(['Mathe']);
    expect(app(`lessonsAt("${MON}", 1)`).map(s => s.subject)).toEqual(['Physik']);
    expect(app(`lessonsAt("2026-10-26", 1)`).map(s => s.id)).toEqual(['a']);       // Woche danach wie immer
  });
});

describe('Bearbeiten-Formular: „Nur diese Woche“ / „Für immer“ als Auswahl im Formular', () => {
  const openForm = () => app(`openEditLessonFor("a", "${MON}")`);
  const scopeGroup = () => document.getElementById('lesson-scope-group');
  const pick = v => { document.querySelector(`input[name="lesson-scope"][value="${v}"]`).checked = true; };

  it('Auswahl sichtbar, „Für immer“ vorgewählt, Datum steht dran', () => {
    openForm();
    expect(scopeGroup().classList.contains('hidden')).toBe(false);
    expect(document.querySelector('input[name="lesson-scope"]:checked').value).toBe('forever');
    expect(document.getElementById('lesson-scope-once-label').textContent).toMatch(/^Nur am Mo\.?,? 19\.10\.2026/);
  });

  it('nicht bei neuen und nicht bei einmaligen Stunden', () => {
    app('openAddLessonSlot(0, 2, "2026-10-19", "full")');
    expect(scopeGroup().classList.contains('hidden')).toBe(true);
  });

  it('nur den Raum ändern, „nur am …“: einmalige Stunde am selben Platz, ohne Rückfrage', async () => {
    openForm();
    pick('once');
    document.getElementById('new-lesson-room').value = 'Aula';
    await app('saveLessonSlot()'); await flush();
    expect(choiceOpen()).toBe(false);
    expect(slot('a').room).toBe('R1');
    const once = onceSlots()[0];
    expect(once).toMatchObject({ day: 0, block: 1, room: 'Aula', specificDate: MON });
    expect(app(`lessonsAt("${MON}", 1)`).map(s => s.room)).toEqual(['Aula']);
    expect(data()[`${once.id}_${MON}`]).toEqual({ notes: 'Bruchrechnen vorbereiten' });
    expect(document.getElementById('modal-add-lesson').classList.contains('hidden')).toBe(true);
    expect(app('lessonKindLabel')(once)).toBe('geändert'); // nicht „verlegt“, sie liegt ja am selben Platz
  });

  it('„nur am …“ mit anderem Tag: Stunde in derselben Woche verlegt', async () => {
    openForm();
    pick('once');
    document.getElementById('new-lesson-day').value = '2';
    app('updateLessonDateHint()');
    await app('saveLessonSlot()'); await flush();
    expect(slot('a')).toMatchObject({ day: 0, block: 1 });
    expect(onceSlots()[0]).toMatchObject({ day: 2, specificDate: WED });
    expect(data()[`a_${MON}`]).toMatchObject({ ausfall: true });
  });

  it('„für immer“ (Standard): regelmäßige Stunde geändert, keine Rückfrage', async () => {
    openForm();
    document.getElementById('new-lesson-room').value = 'Aula';
    await app('saveLessonSlot()'); await flush();
    expect(choiceOpen()).toBe(false);
    expect(slot('a').room).toBe('Aula');
    expect(onceSlots()).toHaveLength(0);
  });

  it('Wiederholung geändert: Auswahl verschwindet und gilt „für immer“', async () => {
    openForm();
    pick('once');
    document.getElementById('new-lesson-recurring').value = 'biweekly';
    app('updateLessonDateHint()');
    expect(scopeGroup().classList.contains('hidden')).toBe(true);
    const p = app('saveLessonSlot()');
    await flush();
    if (choiceOpen()) app('answerChoice("from")');
    await p; await flush();
    expect(slot('a').recurring).toBe('biweekly');
    expect(onceSlots()).toHaveLength(0);
  });
});

describe('Verlegung aufheben', () => {
  it('im Stunden-Fenster am alten Platz: „Verlegung aufheben“ – Stunde und Notizen wieder da', async () => {
    await drag('a', MON, { day: 2, block: 3, part: null, dateStr: WED }, 'once');
    app(`openLessonDetail("a", "${MON}")`);
    expect(document.getElementById('modal-lesson').textContent).toMatch(/Verlegt auf/);
    expect(document.getElementById('btn-ausfall-bottom').textContent).toMatch(/Verlegung aufheben/);
    app('toggleAusfall()');
    await flush();
    expect(onceSlots()).toHaveLength(0);
    expect(data()[`a_${MON}`]).toEqual({ notes: 'Bruchrechnen vorbereiten' });
  });

  it('die verlegte Stunde löschen hebt die Verlegung auf (Notizen zurück, nicht gelöscht)', async () => {
    await drag('a', MON, { day: 2, block: 3, part: null, dateStr: WED }, 'once');
    const once = onceSlots()[0];
    app(`openEditLessonFor(${JSON.stringify(once.id)}, "${WED}")`);
    let asked = '';
    window.confirm = m => { asked = m; return true; };
    await app('deleteLessonSlotFromEdit()');
    expect(asked).toMatch(/Verlegung aufheben/);
    expect(onceSlots()).toHaveLength(0);
    expect(data()[`a_${MON}`]).toEqual({ notes: 'Bruchrechnen vorbereiten' });
  });
});

describe('Rückgängig-Knopf in der Bearbeiten-Leiste', () => {
  const undoBtn = () => document.getElementById('btn-tt-undo');

  it('erst gesperrt, nach dem Verschieben aktiv, macht Schritt für Schritt rückgängig', async () => {
    expect(undoBtn().disabled).toBe(true);
    const start = JSON.stringify({ s: app('db.lessonSlots'), d: app('db.lessonData') });
    await drag('a', MON, { day: 2, block: 3, part: null, dateStr: WED }, 'from');
    const afterFirst = JSON.stringify({ s: app('db.lessonSlots'), d: app('db.lessonData') });
    await drag('b', TUE, { day: 4, block: 4, part: null, dateStr: '2026-10-23' }, 'from');
    expect(undoBtn().disabled).toBe(false);
    expect(undoBtn().getAttribute('onclick')).toBe('undoTimetableChange()'); // Inline-Handler läuft in jsdom nicht (Regel 18)
    app('undoTimetableChange()');
    expect(JSON.stringify({ s: app('db.lessonSlots'), d: app('db.lessonData') })).toBe(afterFirst);
    app('undoTimetableChange()');
    expect(JSON.stringify({ s: app('db.lessonSlots'), d: app('db.lessonData') })).toBe(start);
    expect(undoBtn().disabled).toBe(true);
  });

  it('beenden des Stift-Modus leert den Verlauf', async () => {
    await drag('a', MON, { day: 2, block: 3, part: null, dateStr: WED }, 'from');
    app('toggleTimetableEditMode(false); toggleTimetableEditMode(true)');
    expect(undoBtn().disabled).toBe(true);
  });
});

describe('Darstellung', () => {
  it('Icons in runden Knöpfen ohne Abstand rechts (sonst nicht mittig)', () => {
    expect(CSS).toMatch(/\.btn-icon \.ico[^{]*\{[^}]*margin-right:0/);
  });
  it('Pausen-Kacheln: Uhrzeit bricht nie um (alle gleich hoch)', () => {
    expect(CSS).toMatch(/\.tt-supervision \.tt-sup-time\{[^}]*white-space:nowrap/);
  });
});
