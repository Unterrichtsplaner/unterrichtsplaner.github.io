// BE14: Sitzplan nur für einen Tag anders (Raumwechsel). Der gewohnte Sitzplan (Grundplan) bleibt;
// ein Tagesplan gilt nur für sein Datum und fällt nach 7 Tagen weg. Er enthält nur Raster, Pult und
// Plätze – Plusse, Fehlzeiten und Noten hängen am Schüler und dürfen dabei nie verloren gehen.
const { loadApp, app } = require('./helpers/load-app');

const MON = '2026-11-23', TUE = '2026-11-24';
const st = (id, n, x, y) => ({ id, firstName: n, lastName: 'X', gridX: x, gridY: y,
  grades: [], attendance: [], participation: [], homework: [], studentNotes: [] });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null, seatingAutoSwitch: false },
    lessonSlots: [{ id: 'm1', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' }],
    lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '7a', color: '#6366f1', schularbeitWeight: 50, seatingCols: 10, seatingRows: 5 }],
    students: { g1: [st('a', 'Anna', 0, 0), st('b', 'Ben', 1, 0), st('c', 'Clara', 2, 0)] },
    supervisions: [],
  };
}
const $ = id => document.getElementById(id);
const g1 = () => app('db.groups[0]');
const student = id => app('db.students.g1').find(s => s.id === id);
const flush = () => new Promise(r => setTimeout(r, 0));
const isOpen = id => !$(id).classList.contains('hidden');
const choiceLabels = () => [...$('modal-choice-buttons').querySelectorAll('button')].map(b => b.textContent.trim());

// Raster mit fester Größe zeichnen (jsdom hat kein Layout): 10 × 5 Zellen à 104 px
const CELL = 104;
function sized(fn) {
  const wrapper = $('seating-canvas-wrapper');
  Object.defineProperty(wrapper, 'clientWidth', { configurable: true, value: 1040 });
  Object.defineProperty(wrapper, 'clientHeight', { configurable: true, value: 520 });
  try { return fn(); } finally { delete wrapper.clientWidth; delete wrapper.clientHeight; }
}
function open(dateStr = MON) {
  sized(() => app(`seatingRequest = { groupId: "g1", dateStr: ${JSON.stringify(dateStr)} }; switchView("seating")`));
}
const render = () => sized(() => app('renderSeatingPlan()'));
// Angezeigter Platz einer Karte (aus dem gezeichneten Raster)
function shownSeat(id) {
  const card = document.querySelector(`#seating-canvas .seating-card[data-id="${id}"]`);
  return card ? { x: +card.dataset.gridX, y: +card.dataset.gridY } : null;
}
// Karte (bzw. Pult) um dx/dy Zellen ziehen
function drag(el, dx, dy) {
  sized(() => {
    Object.defineProperty(el, 'offsetWidth', { configurable: true, value: parseFloat(el.style.width) });
    Object.defineProperty(el, 'offsetHeight', { configurable: true, value: parseFloat(el.style.height) });
    const x = parseFloat(el.style.left), y = parseFloat(el.style.top);
    el.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: x + dx * CELL, clientY: y + dy * CELL, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mouseup', { clientX: x + dx * CELL, clientY: y + dy * CELL, bubbles: true }));
  });
}
const dragStudent = (id, dx, dy) => drag(document.querySelector(`#seating-canvas .seating-card[data-id="${id}"]`), dx, dy);
// „Bearbeiten“ antippen und die Frage beantworten ('day' | 'base' | null)
async function startEdit(answer) {
  app('toggleSeatingEditMode()');
  await flush();
  if (answer !== undefined) {
    expect(isOpen('modal-choice')).toBe(true);
    app(`answerChoice(${JSON.stringify(answer)})`);
    await flush();
  }
  render();   // nach dem Warten wurde ohne feste Rastergröße gezeichnet
}
async function stopEdit() {
  if (app('seatingEditMode')) { sized(() => app('toggleSeatingEditMode()')); await flush(); }
}

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 23, 7, 0));
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});
beforeEach(() => {
  vi.setSystemTime(new Date(2026, 10, 23, 7, 0));
  app('db = ' + JSON.stringify(sampleDB()));
  app('seatingEditMode = false; seatingShowGrades = false');
  if (app('choiceResolve')) app('answerChoice(null)');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.querySelectorAll('#toast-container .toast').forEach(t => t.remove());
});
afterEach(async () => {
  if (app('choiceResolve')) app('answerChoice(null)');
  await stopEdit();
  app('switchView("dashboard")');
});
afterAll(() => vi.useRealTimers());

describe('BE14: Bearbeiten fragt, wofür die Änderung gilt', () => {
  it('„Bearbeiten“ fragt „Nur für heute“ oder „gewohnten Sitzplan ändern“, Abbrechen bleibt draußen', async () => {
    open();
    await startEdit();
    expect(isOpen('modal-choice')).toBe(true);
    expect(choiceLabels()).toEqual(['Nur für heute', 'Gewohnten Sitzplan ändern', 'Abbrechen']);
    app('answerChoice(null)');
    await flush();
    expect(app('seatingEditMode')).toBe(false);
  });

  it('an einem anderen Tag nennt die Frage das Datum', async () => {
    vi.setSystemTime(new Date(2026, 10, 20, 7, 0));   // Freitag, Sitzplan für Montag
    open(MON);
    await startEdit();
    expect(choiceLabels()[0]).toBe('Nur für Mo., 23.11.');
  });

  it('„Gewohnten Sitzplan ändern“: wie bisher, Plätze am Schüler, kein Tagesplan', async () => {
    open();
    await startEdit('base');
    expect(app('seatingEditMode')).toBe(true);
    dragStudent('a', 3, 2);
    expect(student('a')).toMatchObject({ gridX: 3, gridY: 2 });
    expect(g1().seatingDays).toBeUndefined();
  });

  it('Nur schauen legt keinen Tagesplan an', async () => {
    open();
    await startEdit('day');
    await stopEdit();
    expect(g1().seatingDays).toBeUndefined();
    expect(isOpen('seating-day-hint')).toBe(false);
  });
});

describe('BE14: Tagesplan', () => {
  it('„Nur für heute“: Umsetzen ändert nur den Tagesplan, der gewohnte bleibt', async () => {
    open();
    await startEdit('day');
    dragStudent('a', 3, 2);
    expect(shownSeat('a')).toEqual({ x: 3, y: 2 });
    expect(student('a')).toMatchObject({ gridX: 0, gridY: 0 });   // gewohnter Platz unverändert
    const day = g1().seatingDays[MON];
    expect(day.seats.a).toEqual({ x: 3, y: 2 });
    expect(day.seats.b).toEqual({ x: 1, y: 0 });                  // Kopie des gewohnten Plans
    expect(day).toMatchObject({ seatingCols: 10, seatingRows: 5 });
  });

  it('Tauschen im Tagesplan: der andere bekommt den alten Platz, nur im Tagesplan', async () => {
    open();
    await startEdit('day');
    dragStudent('a', 1, 0);   // auf Bens Platz
    expect(g1().seatingDays[MON].seats).toMatchObject({ a: { x: 1, y: 0 }, b: { x: 0, y: 0 } });
    expect(student('b')).toMatchObject({ gridX: 1, gridY: 0 });
  });

  it('Raster (anderer Raum: 3 × 5) und versetzte Reihen gelten nur für den Tag', async () => {
    open();
    await startEdit('day');
    $('seating-cols').value = '3'; $('seating-rows').value = '5';
    sized(() => app('saveSeatingGrid()'));
    sized(() => app('onToggleSeatingStagger(true)'));
    expect(g1().seatingDays[MON]).toMatchObject({ seatingCols: 3, seatingRows: 5, seatingStagger: true });
    expect(g1()).toMatchObject({ seatingCols: 10, seatingRows: 5 });
    expect(g1().seatingStagger).toBeUndefined();
    expect($('seating-cols').value).toBe('3');
  });

  it('Lehrerpult verschieben gilt nur für den Tag', async () => {
    open();
    await startEdit('day');
    drag(document.querySelector('#seating-canvas .teacher-desk'), -2, -1);
    const day = g1().seatingDays[MON];
    expect(Number.isInteger(day.teacherDeskX) && Number.isInteger(day.teacherDeskY)).toBe(true);
    expect(g1().teacherDeskX).toBeUndefined();
  });

  it('am nächsten Tag wieder der gewohnte Sitzplan', async () => {
    open();
    await startEdit('day');
    dragStudent('a', 3, 2);
    await stopEdit();
    open(TUE);
    expect(shownSeat('a')).toEqual({ x: 0, y: 0 });
    expect(isOpen('seating-day-hint')).toBe(false);
    open(MON);
    expect(shownSeat('a')).toEqual({ x: 3, y: 2 });
  });

  it('Hinweis über dem Raster, solange der Tagesplan gilt', async () => {
    open();
    await startEdit('day');
    dragStudent('a', 3, 2);
    await stopEdit();
    expect(isOpen('seating-day-hint')).toBe(true);
    expect($('seating-day-hint').textContent).toMatch(/Sitzplan nur für heute/);
    expect($('seating-day-hint').textContent).toMatch(/Zurück zum gewohnten Sitzplan/);
  });

  it('Bearbeiten an einem Tag mit Tagesplan fragt nicht und ändert den Tagesplan', async () => {
    open();
    await startEdit('day');
    dragStudent('a', 3, 2);
    await stopEdit();
    await startEdit();
    expect(isOpen('modal-choice')).toBe(false);
    expect(app('seatingEditMode')).toBe(true);
    dragStudent('b', 0, 3);
    expect(g1().seatingDays[MON].seats.b).toEqual({ x: 1, y: 3 });
    expect(student('b')).toMatchObject({ gridX: 1, gridY: 0 });
  });

  it('anderer Tag während „Nur für heute“: Bearbeiten endet, nichts landet am falschen Tag', async () => {
    open();
    await startEdit('day');
    sized(() => app(`setSeatingDate(${JSON.stringify(TUE)}); renderSeatingPlan()`));
    expect(app('seatingEditMode')).toBe(false);
  });

  it('„Zurück zum gewohnten Sitzplan“ löscht den Tagesplan, „Rückgängig“ holt ihn zurück', async () => {
    open();
    await startEdit('day');
    dragStudent('a', 3, 2);
    await stopEdit();
    sized(() => $('seating-day-hint').querySelector('button').click());
    expect(g1().seatingDays).toBeUndefined();
    expect(shownSeat('a')).toEqual({ x: 0, y: 0 });
    const undo = [...document.querySelectorAll('#toast-container .toast-undo button')].pop();
    sized(() => undo.click());
    expect(g1().seatingDays[MON].seats.a).toEqual({ x: 3, y: 2 });
    expect(shownSeat('a')).toEqual({ x: 3, y: 2 });
  });

  it('neuer Schüler ohne Platz im Tagesplan bekommt einen freien Platz', async () => {
    open();
    await startEdit('day');
    dragStudent('a', 3, 2);
    await stopEdit();
    app('db.students.g1.push(' + JSON.stringify(st('d', 'Dora', 0, 0)) + ')');
    render();
    const seat = shownSeat('d');
    expect(seat).not.toBeNull();
    expect(['1,0', '2,0', '3,2']).not.toContain(`${seat.x},${seat.y}`);
  });
});

describe('BE14: nach 7 Tagen weg – Plusse, Fehlzeiten und Noten bleiben', () => {
  it('Tagesplan anlegen, Plusse eintragen, 8 Tage später: Tagesplan weg, Plusse da und im Sitzplan zu sehen', async () => {
    open();
    await startEdit('day');
    dragStudent('a', 3, 2);
    await stopEdit();
    // Plus für Anna über das Schüler-Fenster (echter Weg im Sitzplan)
    sized(() => app(`openSeatingStudentModal("a", "g1", ${JSON.stringify(MON)})`));
    sized(() => app('addParticipationSmiley("positive")'));
    app(`db.students.g1[0].attendance.push({ id: "f1", date: ${JSON.stringify(MON)}, type: "abwesend", note: "" })`);
    app(`db.students.g1[0].grades.push({ type: "test", value: "2.0", date: ${JSON.stringify(MON)}, note: "T" })`);
    app('closeModal("modal-seating-student")');

    vi.setSystemTime(new Date(2026, 11, 1, 7, 0));   // 8 Tage später
    app('db = migrateDB(db)');
    expect(g1().seatingDays).toBeUndefined();
    const anna = student('a');
    expect(anna.participation).toEqual([expect.objectContaining({ date: MON, value: 'positive' })]);
    expect(anna.attendance.map(a => a.date)).toEqual([MON]);
    expect(anna.grades.map(x => x.date)).toEqual([MON]);
    expect(anna).toMatchObject({ gridX: 0, gridY: 0 });

    open(MON);   // zurückgeblättert: gewohnter Platz, Plus auf der Karte
    expect(shownSeat('a')).toEqual({ x: 0, y: 0 });
    expect(document.querySelector('#seating-canvas .seating-card[data-id="a"] .sc-part')).not.toBeNull();
  });

  it('7 Tage alt bleibt, 8 Tage alt fällt weg; kein „geändert“', () => {
    app(`db.groups[0].seatingDays = { "2026-11-16": { seatingCols: 3, seatingRows: 5, seats: {} }, "2026-11-15": { seatingCols: 3, seatingRows: 5, seats: {} }, ${JSON.stringify(MON)}: { seatingCols: 3, seatingRows: 5, seats: {} } }`);
    const before = app('db.settings.lastModified');
    app('db = migrateDB(db)');
    expect(Object.keys(g1().seatingDays).sort()).toEqual(['2026-11-16', MON]);
    expect(app('db.settings.lastModified')).toBe(before);
  });

  it('kaputte Tagespläne (Sync, Import) stören nicht', () => {
    app('db.groups[0].seatingDays = { "2026-11-23": "Quatsch" }');
    open();
    expect(shownSeat('a')).toEqual({ x: 0, y: 0 });
    expect(isOpen('seating-day-hint')).toBe(false);
  });
});

describe('BE14: Aufräumen und Abgleich', () => {
  it('Schüler löschen entfernt ihn auch aus Tagesplänen', () => {
    app(`db.groups[0].seatingDays = { ${JSON.stringify(MON)}: { seatingCols: 3, seatingRows: 5, seats: { a: { x: 2, y: 4 }, b: { x: 0, y: 0 } } } }`);
    const removed = app('db.students.g1.splice(0, 1)');
    app('cleanUpDeletedStudents("g1", ' + JSON.stringify(removed) + ')');
    expect(g1().seatingDays[MON].seats).toEqual({ b: { x: 0, y: 0 } });
  });

  it('Schuljahreswechsel: Tagespläne fallen weg, gewohnter Sitzplan bleibt', () => {
    app(`db.groups[0].seatingDays = { ${JSON.stringify(MON)}: { seatingCols: 3, seatingRows: 5, seats: {} } }`);
    app('applyNewSchoolYear([{ id: "g1", action: "keep", name: "8a" }])');
    expect(g1().seatingDays).toBeUndefined();
    expect(g1()).toMatchObject({ seatingCols: 10, seatingRows: 5 });
    expect(student('a')).toMatchObject({ gridX: 0, gridY: 0 });
  });

  it('Abgleich: Tagespläne von zwei Geräten kommen zusammen, Widerspruch ohne Frage (dieses Gerät)', () => {
    const base = sampleDB();
    const l = JSON.parse(JSON.stringify(base)), c = JSON.parse(JSON.stringify(base));
    l.groups[0].seatingDays = { [MON]: { seatingCols: 3, seatingRows: 5, seats: { a: { x: 2, y: 4 } } } };
    c.groups[0].seatingDays = { [MON]: { seatingCols: 4, seatingRows: 4, seats: { a: { x: 0, y: 1 } } },
      [TUE]: { seatingCols: 6, seatingRows: 3, seats: {} } };
    const r = app('mergeDB')(base, l, c);
    expect(r.conflicts).toEqual([]);
    expect(r.merged.groups[0].seatingDays[MON]).toEqual(l.groups[0].seatingDays[MON]);   // als Ganzes, nie gemischt
    expect(r.merged.groups[0].seatingDays[TUE]).toEqual(c.groups[0].seatingDays[TUE]);
  });

  it('Abgleich: auf einem Gerät nach 7 Tagen gelöscht, auf dem anderen unverändert → weg', () => {
    const base = sampleDB();
    base.groups[0].seatingDays = { '2026-11-10': { seatingCols: 3, seatingRows: 5, seats: {} } };
    const l = JSON.parse(JSON.stringify(base)), c = JSON.parse(JSON.stringify(base));
    delete l.groups[0].seatingDays;
    const r = app('mergeDB')(base, l, c);
    expect(r.conflicts).toEqual([]);
    expect(r.merged.groups[0].seatingDays || {}).toEqual({});
  });
});
