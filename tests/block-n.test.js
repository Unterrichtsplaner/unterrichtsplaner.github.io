// Block N (Review 25.09.2026): Sitzplan.
const { loadApp, app } = require('./helpers/load-app');

const student = (id, firstName, lastName, extra = {}) => ({
  id, firstName, lastName, grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra,
});
const DAY = '2026-09-21'; // Montag

function sampleDB() {
  return {
    settings: { teacherName: 'Test', school: '', blocks: null },
    lessonSlots: [
      { id: 'mo', day: 0, block: 1, subject: 'Mathe', groupId: 'g1', recurring: 'weekly', color: '#6366f1' },
      { id: 'mi', day: 2, block: 2, subject: 'Mathe', groupId: 'g1', recurring: 'weekly', color: '#6366f1' },
    ],
    lessonData: {},
    groups: [
      { id: 'g1', subject: 'Mathe', className: '7b', color: '#6366f1', schularbeitWeight: 50, seatingCols: 10, seatingRows: 5, teacherDeskX: 4, teacherDeskY: 4 },
      { id: 'g2', subject: 'Physik', className: '7b', color: '#10b981', schularbeitWeight: 50 },
      { id: 'g3', subject: 'Physik', className: '9c', color: '#10b981', schularbeitWeight: 50 },
    ],
    students: {
      g1: [
        student('s1', 'Anna', 'Muster', { gridX: 6, gridY: 0 }),
        student('s2', 'Anna', 'Beispiel', { gridX: 1, gridY: 0 }),
        student('s3', 'Ben', 'Bauer', { gridX: 2, gridY: 0 }),
      ],
      g2: [], g3: [],
    },
  };
}

const g1 = () => app('db').groups[0];
const stu = id => app('db').students.g1.find(s => s.id === id);
const card = id => document.querySelector(`.seating-card[data-id="${id}"]`);
const pos = el => ({ x: +el.dataset.gridX, y: +el.dataset.gridY });
const lastToast = () => { const t = document.querySelectorAll('#toast-container .toast'); return t.length ? t[t.length - 1] : null; };
const render = () => app('renderSeatingPlan()');

// Element per Maus (oder Touch) von seiner Mitte in die Mitte der Zelle (cx, cy) ziehen (Zellen 100 px)
function mouseDragTo(el, cx, cy, widthCells = 1) {
  Object.defineProperty(el, 'offsetWidth', { configurable: true, value: parseFloat(el.style.width) });
  Object.defineProperty(el, 'offsetHeight', { configurable: true, value: parseFloat(el.style.height) });
  const x0 = parseFloat(el.style.left) + el.offsetWidth / 2, y0 = parseFloat(el.style.top) + el.offsetHeight / 2;
  const x1 = cx * 100 + (widthCells * 100) / 2, y1 = cy * 100 + 50;
  el.dispatchEvent(new MouseEvent('mousedown', { clientX: x0, clientY: y0, bubbles: true }));
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: x1, clientY: y1, bubbles: true }));
  document.dispatchEvent(new MouseEvent('mouseup', { clientX: x1, clientY: y1, bubbles: true }));
}
function touch(target, type, x, y) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  ev.touches = type === 'touchend' || type === 'touchcancel' ? [] : [{ clientX: x, clientY: y }];
  target.dispatchEvent(ev);
}

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
  const wrapper = document.getElementById('seating-canvas-wrapper');
  Object.defineProperty(wrapper, 'clientWidth', { configurable: true, value: 1040 });
  Object.defineProperty(wrapper, 'clientHeight', { configurable: true, value: 540 });
});

beforeEach(() => {
  app('db = ' + JSON.stringify(sampleDB()));
  app(`switchView("seating"); currentSeatingGroupId = "g1"; setSeatingDate("${DAY}"); seatingEditMode = false; renderSeatingGroupSelect(); renderSeatingDateStrip(); renderSeatingPlan()`);
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
});
afterEach(() => app('seatingEditMode = false'));

describe('N1: Raster verkleinern verändert keine Sitzplätze', () => {
  it('kleiner und wieder groß: Anna sitzt wieder auf ihrem Platz', () => {
    g1().seatingCols = 3; render();
    expect(pos(card('s1')).x).toBeLessThan(3);
    expect(stu('s1').gridX).toBe(6);
    g1().seatingCols = 10; render();
    expect(pos(card('s1'))).toEqual({ x: 6, y: 0 });
  });

  it('mehr Schüler als Plätze: Hinweis statt übereinandergestapelter Karten', () => {
    g1().seatingCols = 2; g1().seatingRows = 2; render(); // Pult belegt die untere Reihe → 2 Plätze
    const hint = document.getElementById('seating-overflow-hint');
    expect(hint.classList.contains('hidden')).toBe(false);
    expect(hint.textContent).toContain('1 Schüler');
    const shown = [...document.querySelectorAll('.seating-card')].map(pos);
    expect(new Set(shown.map(p => p.x + ',' + p.y)).size).toBe(shown.length);
    expect(stu('s1').gridX).toBe(6);
  });

  it('Neu hinzugekommene Schüler ohne Platz bekommen einen freien Platz angezeigt', () => {
    app('db').students.g1.push(student('s4', 'Cem', 'Neu'));
    render();
    const p = pos(card('s4'));
    const taken = ['s1', 's2', 's3'].map(id => pos(card(id))).map(q => q.x + ',' + q.y);
    expect(taken).not.toContain(p.x + ',' + p.y);
  });
});

describe('N2: Rastergröße prüfen', () => {
  it.each(['-3', '0', 'abc', '99'])('Spalten „%s“ wird abgelehnt', (v) => {
    document.getElementById('seating-cols').value = v;
    document.getElementById('seating-rows').value = '5';
    app('saveSeatingGrid()');
    expect(g1().seatingCols).toBe(10);
    expect(lastToast().textContent).toContain('Spalten');
    expect(() => render()).not.toThrow();
  });

  it('gültige Werte werden übernommen', () => {
    document.getElementById('seating-cols').value = '8';
    document.getElementById('seating-rows').value = '4';
    app('saveSeatingGrid()');
    expect([g1().seatingCols, g1().seatingRows]).toEqual([8, 4]);
  });
});

describe('N3: Lehrerpult bleibt im Raster', () => {
  it('nach dem Verkleinern liegt es sichtbar in der Fläche', () => {
    g1().teacherDeskX = 8; g1().teacherDeskY = 4;
    g1().seatingCols = 4; g1().seatingRows = 3; render();
    const desk = document.querySelector('.teacher-desk');
    const canvas = document.getElementById('seating-canvas');
    expect(parseFloat(desk.style.left) + parseFloat(desk.style.width)).toBeLessThanOrEqual(parseFloat(canvas.style.maxWidth));
    expect(parseFloat(desk.style.top) + parseFloat(desk.style.height)).toBeLessThanOrEqual(parseFloat(canvas.style.maxHeight));
  });
});

describe('N4: Schüler und Lehrerpult überlappen nicht', () => {
  it('Schüler auf das Pult ziehen wird abgelehnt', () => {
    app('seatingEditMode = true'); render();
    mouseDragTo(card('s3'), 4, 4);
    expect([stu('s3').gridX, stu('s3').gridY]).toEqual([2, 0]);
    expect(lastToast().textContent).toContain('Lehrerpult');
  });

  it('Pult auf Schüler ziehen: die Schüler bekommen freie Plätze', () => {
    app('seatingEditMode = true'); render();
    mouseDragTo(document.querySelector('.teacher-desk'), 1, 0, 2); // Zellen (1,0) und (2,0): Anna B. und Ben
    expect([g1().teacherDeskX, g1().teacherDeskY]).toEqual([1, 0]);
    const onDesk = s => s.gridY === 0 && (s.gridX === 1 || s.gridX === 2);
    expect(onDesk(stu('s2'))).toBe(false);
    expect(onDesk(stu('s3'))).toBe(false);
    expect(stu('s2').gridX).not.toBeUndefined();
  });
});

describe('N5: abgebrochene Touch-Geste', () => {
  it('touchcancel setzt die Karte zurück; spätere Wischgesten verschieben nichts', () => {
    app('seatingEditMode = true'); render();
    const el = card('s3');
    touch(el, 'touchstart', 250, 50);
    touch(document, 'touchmove', 400, 150);
    touch(document, 'touchcancel', 0, 0);
    touch(document, 'touchmove', 700, 350);
    touch(document, 'touchend', 0, 0);
    expect([stu('s3').gridX, stu('s3').gridY]).toEqual([2, 0]);
    expect(pos(card('s3'))).toEqual({ x: 2, y: 0 });
  });
});

describe('N6: Schnellbewertung zeigt den heutigen Stand, Entfernen lässt sich rückgängig machen', () => {
  it('gesetzter Smiley und Fehlzeit sind markiert', () => {
    stu('s3').participation.push({ id: 'p', date: DAY, value: 'positive' });
    stu('s3').attendance.push({ id: 'a', date: DAY, type: 'entschuldigt', note: '' });
    app(`openSeatingStudentModal("s3", "g1", "${DAY}")`);
    const pressed = [...document.querySelectorAll('#modal-seating-student [aria-pressed="true"]')].map(b => b.dataset.action);
    expect(pressed.sort()).toEqual(['entschuldigt', 'positive']);
  });

  it('zweites Tippen entfernt, „Rückgängig“ holt den Eintrag zurück', () => {
    stu('s3').participation.push({ id: 'p', date: DAY, value: 'positive' });
    app(`openSeatingStudentModal("s3", "g1", "${DAY}")`);
    app('addParticipationSmiley("positive")');
    expect(stu('s3').participation).toEqual([]);
    const undo = lastToast().querySelector('button');
    expect(undo.textContent).toBe('Rückgängig');
    undo.click();
    expect(stu('s3').participation).toEqual([{ id: 'p', date: DAY, value: 'positive' }]);
  });

  it('„Unentschuldigt“ zurücknehmen und rückgängig: Hinweis für die nächste Stunde ist wieder da', () => {
    app(`openSeatingStudentModal("s3", "g1", "${DAY}")`);
    app('setSeatingAbsence("abwesend")');
    app(`openSeatingStudentModal("s3", "g1", "${DAY}")`);
    app('setSeatingAbsence("abwesend")');
    expect(stu('s3').attendance).toEqual([]);
    lastToast().querySelector('button').click();
    expect(stu('s3').attendance.map(a => a.type)).toEqual(['abwesend']);
    expect(app(`db.lessonData['mi_2026-09-23'].notes`)).toContain('Ben Bauer hat letzte Stunde');
  });
});

describe('N7–N10', () => {
  it('N7: „Neue Note“ nimmt das Datum des Sitzplans', () => {
    app(`setSeatingDate("2026-09-16"); openSeatingStudentModal("s3", "g1", "2026-09-16")`);
    app('openGradeFormForCurrentStudent()');
    expect(document.getElementById('gf-date').value).toBe('2026-09-16');
    app('closeGradeForm()');
  });

  it('N8: gleiche Vornamen bekommen den Anfangsbuchstaben des Nachnamens', () => {
    expect(card('s1').querySelector('.sc-name').textContent).toBe('Anna M.');
    expect(card('s2').querySelector('.sc-name').textContent).toBe('Anna B.');
    expect(card('s3').querySelector('.sc-name').textContent).toBe('Ben');
    expect(card('s1').querySelector('.sc-name').title).toBe('Anna Muster');
  });

  it('N9: gibt es die Klasse in zwei Fächern, steht das Fach dabei', () => {
    expect(document.getElementById('seating-group-current-label').textContent).toBe('7b Mathe');
    app('currentSeatingGroupId = "g3"; renderSeatingGroupSelect()');
    expect(document.getElementById('seating-group-current-label').textContent).toBe('9c');
  });

  it('N10: Tage mit Unterricht der Klasse sind markiert', () => {
    const chips = [...document.querySelectorAll('#seating-date-strip .date-chip')];
    const marked = chips.filter(c => c.classList.contains('has-lesson')).map(c => c.getAttribute('aria-label'));
    expect(marked.some(l => l.includes('21.09.'))).toBe(true);  // Mo
    expect(marked.some(l => l.includes('23.09.'))).toBe(true);  // Mi
    expect(marked.some(l => l.includes('22.09.'))).toBe(false); // Di
  });
});

describe('N11: Bedienbar per Tastatur und Screenreader', () => {
  it('Datums-Chips und Klassenmenü sind Knöpfe', () => {
    expect(document.querySelectorAll('#seating-date-strip button.date-chip').length).toBe(5);
    expect(document.querySelectorAll('#seating-group-menu button').length).toBe(3);
  });
});

describe('N12: Timer', () => {
  it('Ende bleibt sichtbar, bis zurückgesetzt wird', () => {
    vi.useFakeTimers();
    try {
      app('resetTimer(); timerSeconds = 2; toggleTimer()');
      vi.advanceTimersByTime(3000);
      expect(document.getElementById('timer-display').classList.contains('timer-done')).toBe(true);
      app('resetTimer()');
      expect(document.getElementById('timer-display').classList.contains('timer-done')).toBe(false);
    } finally { vi.useRealTimers(); }
  });

  it('Start bei 00:00 meldet sich', () => {
    app('resetTimer(); timerSeconds = 0; updateTimerDisplay(); toggleTimer()');
    expect(lastToast().textContent).toContain('Zeit');
    app('resetTimer()');
  });
});

describe('N13: Note im Schüler-Fenster bearbeiten', () => {
  it('öffnet die angeklickte Note, auch wenn sich die Liste inzwischen geändert hat', () => {
    stu('s3').grades.push({ type: 'test', value: '2.0', date: '2026-09-10', note: 'A' });
    app(`openSeatingStudentModal("s3", "g1", "${DAY}"); revealSeatingStudentGrades()`);
    const btn = document.querySelector('#seating-student-grades button');
    stu('s3').grades.unshift({ type: 'test', value: '5.0', date: '2026-09-01', note: 'B' });
    btn.click();
    expect(document.getElementById('gf-label').value).toBe('A');
    app('closeGradeForm()');
  });
});
