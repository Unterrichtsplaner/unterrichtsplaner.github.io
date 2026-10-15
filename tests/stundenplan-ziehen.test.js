// AC2: Stundenplan per Ziehen bearbeiten (Stift-Modus). Ablegen läuft über commitLessonSlot – dieselben Regeln wie das Formular.
const { loadApp, app } = require('./helpers/load-app');

const MON = '2026-10-19', TUE = '2026-10-20', WED = '2026-10-21';
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [
      { id: 'a', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly', room: 'R1' },
      { id: 'b', day: 1, block: 2, part: 'full', subject: 'Physik', color: '#22c55e', groupId: 'g2', recurring: 'weekly', room: 'R2' },
      { id: 'o', day: 2, block: 3, part: 'full', subject: 'Nachschreiben', color: '#ef4444', recurring: 'none', specificDate: WED },
    ],
    lessonData: { 'a_2026-10-26': { notes: 'kommende Notiz' } }, // nächste Woche: kein „ab wann?“
    groups: [{ id: 'g1', subject: 'Mathe', className: '7a', color: '#6366f1', schularbeitWeight: 50 },
             { id: 'g2', subject: 'Physik', className: '9c', color: '#22c55e', schularbeitWeight: 50 }],
    students: { g1: [], g2: [] },
    supervisions: [],
  };
}
const flush = async (n = 4) => { for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 0)); };
const slot = id => app('db.lessonSlots').find(s => s.id === id);
const choiceOpen = () => !document.getElementById('modal-choice').classList.contains('hidden');
const choiceText = () => document.getElementById('modal-choice-text').textContent;
const toasts = () => document.getElementById('toast-container').textContent;
// Verschieben und die (eine) Rückfrage beantworten: 'once' = nur diese Woche, 'from' = für immer, 'all', null
async function drag(id, src, target, answer = 'from') {
  const p = app(`moveLessonByDrag(${JSON.stringify(id)}, ${JSON.stringify(src)}, ${JSON.stringify(target)})`);
  await flush();
  const asked = choiceOpen() ? { text: choiceText(), buttons: [...document.querySelectorAll('#modal-choice-buttons button')].map(b => b.textContent) } : null;
  if (choiceOpen()) app(`answerChoice(${JSON.stringify(answer)})`);
  await p; await flush();
  expect(choiceOpen()).toBe(false); // nie eine zweite Rückfrage
  return asked;
}

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 19, 7, 0)); // Mo 19.10.2026, früh
  window.innerWidth = 1024;
  app('db = ' + JSON.stringify(sampleDB()));
  app('timetableEditMode = false; currentWeekOffset = 0; timetableDay = null; timetableChosenOn = ""; currentSpecificDate = null');
  if (app('choiceResolve')) app('answerChoice(null)');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
  window.confirm = () => true;
  app('switchView("timetable"); renderTimetable()');
});
afterEach(() => vi.useRealTimers());

describe('Stift-Modus', () => {
  it('Stift im Kopf schaltet „Bearbeiten“ ein und aus; Hinweisleiste mit „Fertig“', () => {
    const btn = document.getElementById('btn-tt-edit');
    expect(btn.getAttribute('aria-label')).toMatch(/bearbeiten/i);
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    app('toggleTimetableEditMode()');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById('timetable-grid').classList.contains('tt-edit')).toBe(true);
    expect(document.getElementById('tt-edit-bar').classList.contains('hidden')).toBe(false);
    app('toggleTimetableEditMode()');
    expect(document.getElementById('timetable-grid').classList.contains('tt-edit')).toBe(false);
    expect(document.getElementById('tt-edit-bar').classList.contains('hidden')).toBe(true);
  });

  it('Kacheln und Felder tragen, was zum Ablegen nötig ist', () => {
    const tile = document.querySelector('.tt-lesson[data-slot="a"]');
    expect(tile.dataset.date).toBe(MON);
    const cell = tile.closest('.tt-cell');
    expect(cell.dataset).toMatchObject({ day: '0', block: '1', date: MON });
  });

  it('Antippen im Stift-Modus öffnet „Stunde bearbeiten“, nicht das Stunden-Fenster', () => {
    app('toggleTimetableEditMode()');
    const tile = document.querySelector('.tt-lesson[data-slot="a"]');
    expect(tile.getAttribute('onclick')).toContain('openEditLessonFor');
    app(`openEditLessonFor("a", "${MON}")`);
    expect(document.getElementById('modal-add-lesson').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('modal-lesson').classList.contains('hidden')).toBe(true);
  });

  it('Verlassen des Stundenplans beendet den Stift-Modus (nie gespeichert)', () => {
    app('toggleTimetableEditMode()');
    app('switchView("dashboard")');
    expect(app('timetableEditMode')).toBe(false);
  });
});

describe('Verschieben', () => {
  it('auf ein freies Feld, „für immer“: Tag/Block geändert, kommende Notizen wandern mit', async () => {
    const asked = await drag('a', MON, { day: 2, block: 2, part: null, dateStr: WED }, 'from');
    expect(asked.buttons).toEqual(expect.arrayContaining([expect.stringMatching(/^Nur am Mo/), expect.stringMatching(/^Für immer/)]));
    expect(slot('a')).toMatchObject({ day: 2, block: 2 });
    expect(app('db.lessonData')['a_2026-10-28']).toEqual({ notes: 'kommende Notiz' });
    expect(toasts()).toMatch(/verschoben/);
  });

  it('an dieselbe Stelle: nichts passiert', async () => {
    const before = JSON.stringify(app('db.lessonSlots'));
    await app(`moveLessonByDrag("a", "${MON}", { day: 0, block: 1, part: null, dateStr: "${MON}" })`);
    expect(JSON.stringify(app('db.lessonSlots'))).toBe(before);
  });

  it('mit Einträgen aus früheren Wochen: eine Rückfrage (auch „alle, auch frühere“), „für immer“ = ab jetzt, frühere bleiben', async () => {
    app(`db.lessonData['a_2026-10-12'] = { notes: 'alte Stunde' }`);
    const asked = await drag('a', MON, { day: 3, block: 1, part: null, dateStr: '2026-10-22' }, 'from');
    expect(asked.text).toMatch(/früheren Stunden/);
    expect(asked.buttons.some(b => /auch frühere/.test(b))).toBe(true);
    expect(slot('a').validUntil).toBeTruthy();                 // alte endet
    const neu = app('db.lessonSlots').find(s => s.day === 3 && s.block === 1);
    expect(neu && neu.validFrom).toBeTruthy();                 // neue ab dieser Woche
    expect(app('db.lessonData')['a_2026-10-12']).toEqual({ notes: 'alte Stunde' });
  });

  it('einmalige Stunde: Datum wandert mit dem Tag (gleiche Woche)', async () => {
    await app(`moveLessonByDrag("o", "${WED}", { day: 4, block: 1, part: null, dateStr: "2026-10-23" })`);
    expect(slot('o')).toMatchObject({ day: 4, block: 1, specificDate: '2026-10-23' });
  });

  it('halbe Stunde: auf eine freie Hälfte gezogen übernimmt sie diese Hälfte', async () => {
    await drag('a', MON, { day: 0, block: 3, part: 'second', dateStr: MON }, 'from');
    expect(slot('a')).toMatchObject({ block: 3, part: 'second' });
  });
});

describe('Tauschen', () => {
  it('auf belegtes Feld: EINE Rückfrage, „für immer“ → beide tauschen die Plätze', async () => {
    const asked = await drag('a', MON, { day: 1, block: 2, part: null, dateStr: TUE }, 'from');
    expect(asked.text).toMatch(/9c/);
    expect(slot('a')).toMatchObject({ day: 1, block: 2 });
    expect(slot('b')).toMatchObject({ day: 0, block: 1 });
  });

  it('Abbrechen: nichts geändert', async () => {
    const before = JSON.stringify(app('db.lessonSlots'));
    await drag('a', MON, { day: 1, block: 2, part: null, dateStr: TUE }, null);
    expect(JSON.stringify(app('db.lessonSlots'))).toBe(before);
  });

  it('frühere Einträge bei der getauschten Stunde: trotzdem keine zweite Rückfrage, frühere bleiben', async () => {
    app(`db.lessonData['b_2026-10-13'] = { notes: 'alt' }`);
    await drag('a', MON, { day: 1, block: 2, part: null, dateStr: TUE }, 'from');
    expect(app('db.lessonData')['b_2026-10-13']).toEqual({ notes: 'alt' });
    const now = app('db.lessonSlots').filter(s => s.subject === 'Physik' && !s.validUntil);
    expect(now.map(s => [s.day, s.block])).toEqual([[0, 1]]);
  });
});

describe('Rückgängig', () => {
  it('stellt den Stand vor dem Verschieben wieder her', async () => {
    const before = JSON.stringify({ s: app('db.lessonSlots'), d: app('db.lessonData') });
    await drag('a', MON, { day: 2, block: 2, part: null, dateStr: WED }, 'from');
    const undo = document.querySelector('#toast-container .toast-undo button');
    expect(undo).toBeTruthy();
    undo.click();
    expect(JSON.stringify({ s: app('db.lessonSlots'), d: app('db.lessonData') })).toBe(before);
  });

  it('nicht mehr, wenn inzwischen etwas anderes geändert wurde', async () => {
    await drag('a', MON, { day: 2, block: 2, part: null, dateStr: WED }, 'from');
    const undo = document.querySelector('#toast-container .toast-undo button');
    app(`db.lessonData['a_2026-10-28'].notes = 'danach geändert'; saveDB()`); // Stundendaten geändert
    undo.click();
    expect(slot('a')).toMatchObject({ day: 2, block: 2 });
    expect(toasts()).toMatch(/Nicht mehr möglich/);
  });
});

describe('Ziehen mit Maus/Finger', () => {
  it('drücken, ziehen, über einem Feld loslassen → verschoben', async () => {
    app('toggleTimetableEditMode()');
    const tile = document.querySelector('.tt-lesson[data-slot="a"]');
    const target = [...document.querySelectorAll('.tt-cell')].find(c => c.dataset.day === '3' && c.dataset.block === '3');
    const orig = document.elementFromPoint;
    document.elementFromPoint = () => target;
    try {
      tile.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 10, clientY: 10 }));
      document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 60, clientY: 80 }));
      expect(document.querySelector('.tt-drag-ghost')).toBeTruthy();
      expect(target.classList.contains('tt-drop-target')).toBe(true);
      document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 60, clientY: 80 }));
      await flush();
      app('answerChoice("from")');
      await flush();
    } finally { document.elementFromPoint = orig; }
    expect(document.querySelector('.tt-drag-ghost')).toBeNull();
    expect(slot('a')).toMatchObject({ day: 3, block: 3 });
  });

  it('nur kurz drücken (ohne Ziehen): kein Verschieben', async () => {
    app('toggleTimetableEditMode()');
    const tile = document.querySelector('.tt-lesson[data-slot="a"]');
    tile.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 10, clientY: 10 }));
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 11, clientY: 11 }));
    await flush();
    expect(slot('a')).toMatchObject({ day: 0, block: 1 });
  });
});
