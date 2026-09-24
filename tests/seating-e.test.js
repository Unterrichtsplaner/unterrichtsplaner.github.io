// Block E (Sitzplan): falsche Klasse (E1), Datum über Nacht (E2), Lehrerpult springt (E3),
// Hinweis für nächste Stunde (E4), Notenformular-Kontext (E5), Zufallsauswahl & Gruppen (E6).
const { loadApp, app } = require('./helpers/load-app');

const student = (id, firstName, lastName) => ({
  id, firstName, lastName, grades: [], attendance: [], participation: [], homework: [], studentNotes: [],
});

function sampleDB() {
  return {
    settings: { teacherName: 'Test', school: '', blocks: null },
    lessonSlots: [
      // g1: Montag 1. Block jede Woche, Mittwoch 2. Block nur in A-Wochen (14.09.2026 = A)
      { id: 'mo', day: 0, block: 1, subject: 'Mathe', groupId: 'g1', recurring: 'weekly', color: '#6366f1' },
      { id: 'mi', day: 2, block: 2, subject: 'Mathe', groupId: 'g1', recurring: 'biweekly', startDate: '2026-09-16', color: '#6366f1' },
      { id: 'g2mo', day: 0, block: 2, subject: 'Deutsch', groupId: 'g2', recurring: 'weekly', color: '#10b981' },
    ],
    lessonData: {},
    groups: [
      { id: 'g1', subject: 'Mathe', className: '1A', color: '#6366f1', schularbeitWeight: 50 },
      { id: 'g2', subject: 'Deutsch', className: '2B', color: '#10b981', schularbeitWeight: 50 },
    ],
    students: {
      g1: [student('s1', 'Anna', 'Muster'), student('s2', 'Anna', 'Beispiel'), student('s3', 'Ben', 'Bauer')],
      g2: [student('t1', 'Tom', 'Test')],
    },
  };
}

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});

beforeEach(() => {
  app('db = ' + JSON.stringify(sampleDB()));
  app('currentSeatingGroupId = "g1"; currentSeatingDateStr = "2026-09-14"');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});

afterEach(() => { vi.useRealTimers(); });

const at = (...args) => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(...args)); };

describe('E1: „Sitzplan öffnen“ zeigt die gewählte Klasse', () => {
  it('während der Stunde von 1A: „Sitzplan“ bei 2B öffnet 2B', () => {
    at(2026, 8, 14, 8, 0); // Mo 14.09., 1. Block läuft (1A)
    app('switchView("dashboard")');
    app('openSeatingForGroup("g2")');
    expect(app('currentSeatingGroupId')).toBe('g2');
    expect(document.getElementById('seating-group-current-label').textContent).toBe('2B');
  });

  it('normales Öffnen über die Navigation schlägt weiterhin die laufende Stunde vor', () => {
    at(2026, 8, 14, 8, 0);
    app('currentSeatingGroupId = "g2"');
    app('switchView("dashboard")');
    app('switchView("seating")');
    expect(app('currentSeatingGroupId')).toBe('g1');
  });

  it('aus einer Stunde heraus: Klasse und Datum dieser Stunde', () => {
    at(2026, 8, 14, 8, 0);
    app('activeLessonId = "g2mo"; activeLessonDate = "2026-09-21"');
    app('openSeatingForActiveLesson()');
    expect(app('currentSeatingGroupId')).toBe('g2');
    expect(app('currentSeatingDateStr')).toBe('2026-09-21');
  });
});

describe('E2: Datum geht über Nacht mit', () => {
  it('neu geöffnet am nächsten Tag → heute', () => {
    at(2026, 8, 14, 16, 0);
    app('currentSeatingDateStr = ""; switchView("seating")');
    expect(app('currentSeatingDateStr')).toBe('2026-09-14');
    at(2026, 8, 15, 8, 0);
    app('switchView("dashboard"); switchView("seating")');
    expect(app('currentSeatingDateStr')).toBe('2026-09-15');
  });

  it('App bleibt über Nacht offen: Antippen eines Schülers trägt für heute ein', () => {
    at(2026, 8, 14, 16, 0);
    app('currentSeatingDateStr = ""; switchView("seating")');
    at(2026, 8, 15, 8, 0);
    document.querySelector('.seating-card[data-id="s3"]').dispatchEvent(new MouseEvent('click')); // ohne Bubbling (Regel 18)
    expect(app('window.currentSeatingStudent.dateStr')).toBe('2026-09-15');
    expect(app('currentSeatingDateStr')).toBe('2026-09-15');
  });

  it('am selben Tag bleibt ein bewusst gewähltes Datum stehen', () => {
    at(2026, 8, 14, 16, 0);
    app('currentSeatingDateStr = ""; switchView("seating")');
    app('onHiddenDateChange("2026-09-10")');
    app('switchView("dashboard"); switchView("seating")');
    expect(app('currentSeatingDateStr')).toBe('2026-09-10');
  });
});

describe('E3: Lehrerpult springt beim Ziehen nicht', () => {
  it('kleines Ziehen lässt das Pult in seiner Spalte', () => {
    const wrapper = document.getElementById('seating-canvas-wrapper');
    Object.defineProperty(wrapper, 'clientWidth', { configurable: true, value: 1040 });
    Object.defineProperty(wrapper, 'clientHeight', { configurable: true, value: 540 });
    try {
      app('db.groups[0].teacherDeskX = 3; db.groups[0].teacherDeskY = 4');
      app('switchView("seating"); currentSeatingGroupId = "g1"; seatingEditMode = true; renderSeatingPlan()');
      const desk = document.querySelector('.teacher-desk');
      Object.defineProperty(desk, 'offsetWidth', { value: parseFloat(desk.style.width) });
      Object.defineProperty(desk, 'offsetHeight', { value: parseFloat(desk.style.height) });
      const x = parseFloat(desk.style.left), y = parseFloat(desk.style.top);
      desk.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, bubbles: true }));
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: x + 10, clientY: y, bubbles: true }));
      document.dispatchEvent(new MouseEvent('mouseup', { clientX: x + 10, clientY: y, bubbles: true }));
      expect(app('db.groups[0].teacherDeskX')).toBe(3);
      expect(app('db.groups[0].teacherDeskY')).toBe(4);
    } finally {
      app('seatingEditMode = false');
      delete wrapper.clientWidth; delete wrapper.clientHeight;
    }
  });
});

describe('E4: Hinweis „hat letzte Stunde unentschuldigt gefehlt“', () => {
  const absent = (sid, dateStr) => {
    app(`openSeatingStudentModal("${sid}", "g1", "${dateStr}")`);
    app('setSeatingAbsence("abwesend")');
  };
  const notes = key => (app('db.lessonData')[key] || {}).notes || '';

  it('landet in der nächsten Stunde, die wirklich stattfindet (A/B-Woche)', () => {
    absent('s3', '2026-09-14'); // Mo, A-Woche → Mi 16.09. findet statt
    expect(notes('mi_2026-09-16')).toContain('Ben Bauer');
    app('db.students.g1[2].attendance = []; db.lessonData = {}');
    absent('s3', '2026-09-21'); // Mo, B-Woche → Mi 23.09. fällt weg, nächste: Mo 28.09.
    expect(notes('mi_2026-09-23')).toBe('');
    expect(notes('mo_2026-09-28')).toContain('Ben Bauer');
  });

  it('zwei Schülerinnen namens Anna kollidieren nicht', () => {
    absent('s1', '2026-09-14');
    absent('s2', '2026-09-14');
    expect(notes('mi_2026-09-16')).toContain('Anna Muster');
    expect(notes('mi_2026-09-16')).toContain('Anna Beispiel');
    absent('s2', '2026-09-14'); // zweiter Klick nimmt das Fehlen von Anna Beispiel zurück
    expect(notes('mi_2026-09-16')).toContain('Anna Muster');
    expect(notes('mi_2026-09-16')).not.toContain('Anna Beispiel');
  });

  it('Entfernen findet den Hinweis, auch wenn sich der Stundenplan inzwischen geändert hat', () => {
    absent('s3', '2026-09-14');
    app('db.lessonData["mi_2026-09-16"].ausfall = true');
    absent('s3', '2026-09-14');
    expect(notes('mi_2026-09-16')).not.toContain('Ben');
  });

  it('eigene Notizen in der Stunde bleiben erhalten', () => {
    app('db.lessonData["mi_2026-09-16"] = { notes: "Arbeitsblatt mitbringen" }');
    absent('s3', '2026-09-14');
    absent('s3', '2026-09-14');
    expect(notes('mi_2026-09-16')).toBe('Arbeitsblatt mitbringen');
  });

  it('alter Hinweis (nur Vorname) wird beim Entfernen mit aufgeräumt, wenn der Vorname eindeutig ist', () => {
    app('db.students.g1[2].attendance = [{ id: "a1", date: "2026-09-14", type: "abwesend", note: "" }]');
    app('db.lessonData["mi_2026-09-16"] = { notes: "Ben hat letzte Stunde unentschuldigt gefehlt" }');
    absent('s3', '2026-09-14');
    expect(notes('mi_2026-09-16')).toBe('');
  });
});

describe('E5: Notenformular vergisst seinen Kontext beim Schließen', () => {
  it('späteres closeGradeForm öffnet kein altes Schüler-Fenster', () => {
    app('switchView("seating")');
    app('openSeatingStudentModal("s3", "g1", "2026-09-14")');
    app('openGradeForm("s3", "g1", -1)');
    app('closeGradeForm()');
    expect(app('currentGradeFormCtx')).toBeNull();
    app('closeModal("modal-seating-student")');
    app('closeGradeForm()'); // z. B. über „Zum Schüler“ im Dashboard
    expect(document.getElementById('modal-seating-student').classList.contains('hidden')).toBe(true);
  });
});

describe('E6: Zufallsauswahl und Gruppen', () => {
  it('Doppelklick startet nur eine Auslosung', () => {
    Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {}); // fehlt in jsdom
    vi.useFakeTimers();
    try {
      app('switchView("seating"); currentSeatingGroupId = "g1"; renderSeatingPlan()');
      const spy = vi.spyOn(Math, 'random');
      app('startSeatingRandomizer()');
      const calls = spy.mock.calls.length;
      app('startSeatingRandomizer()');
      expect(spy.mock.calls.length).toBe(calls);
      vi.advanceTimersByTime(5000);
      spy.mockRestore();
      app('startSeatingRandomizer()'); // nach dem Ende geht es wieder
      expect(document.getElementById('random-student-name').textContent).toBe('Auswahl läuft...');
      vi.advanceTimersByTime(5000);
    } finally {
      vi.useRealTimers();
    }
  });

  const sizesFor = (n, size) => app(`seatingGroupSizes(${n}, ${size})`);
  it('Gruppengrößen unterscheiden sich höchstens um 1, niemand bleibt allein', () => {
    expect(sizesFor(7, 3)).toEqual([3, 2, 2]);
    expect(sizesFor(10, 4)).toEqual([4, 3, 3]);
    expect(sizesFor(9, 3)).toEqual([3, 3, 3]);
    expect(sizesFor(5, 2)).toEqual([3, 2]);
    expect(sizesFor(1, 3)).toEqual([1]);
    for (let n = 2; n <= 32; n++) for (let size = 2; size <= 6; size++) {
      const sizes = sizesFor(n, size);
      expect(sizes.reduce((a, b) => a + b, 0)).toBe(n);
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
      expect(Math.min(...sizes)).toBeGreaterThan(1);
    }
  });

  it('Gruppenbildung verteilt alle Anwesenden ohne Einzelgruppe', () => {
    const extra = Array.from({ length: 4 }, (_, i) => student('x' + i, 'X' + i, 'Y'));
    app('db.students.g1.push(...' + JSON.stringify(extra) + ')'); // 7 Schüler
    app('switchView("seating"); currentSeatingGroupId = "g1"; renderSeatingPlan()');
    for (const method of ['random', 'proximity']) {
      document.getElementById('seating-group-size').value = '3';
      document.getElementById('seating-group-method').value = method;
      app('generateSeatingGroups()');
      const counts = {};
      Object.values(app('activeSeatingGroups')).forEach(g => { counts[g.groupName] = (counts[g.groupName] || 0) + 1; });
      expect(Object.values(counts).sort()).toEqual([2, 2, 3]);
    }
  });
});
