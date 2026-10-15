// Block AA (Rückmeldungen aus dem Alltag, 15.10.2026).
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

function sampleDB() {
  return {
    settings: { teacherName: 'Test', school: '', blocks: null },
    lessonSlots: [],
    lessonData: {},
    groups: [
      { id: 'g1', subject: 'Mathe', className: '7b', year: '2026/27', color: '#6366f1', schularbeitWeight: 50 },
      { id: 'g2', subject: 'Physik', className: 'Q1', year: '2026/27', color: '#f59e0b', schularbeitWeight: 40, gradeScale: '0-15' },
    ],
    students: { g1: [], g2: [] },
  };
}

const val = id => document.getElementById(id).value;
const setVal = (id, v) => { document.getElementById(id).value = v; };
const groups = () => app('db.groups');
const lastToast = () => {
  const t = document.querySelectorAll('#toast-container .toast');
  return t.length ? t[t.length - 1].textContent : '';
};

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});

beforeEach(() => {
  app('db = ' + JSON.stringify(sampleDB()));
  app('editingGroupId = null');
  document.getElementById('toast-container').innerHTML = '';
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});

describe('AA1: mehrere Klassen auf einmal anlegen', () => {
  it('versteht Listen und Buchstaben-Bereiche', () => {
    expect(app('parseClassNames("7a, 7b; 7c")')).toEqual(['7a', '7b', '7c']);
    expect(app('parseClassNames("7a-d")')).toEqual(['7a', '7b', '7c', '7d']);
    expect(app('parseClassNames("7a – 7d")')).toEqual(['7a', '7b', '7c', '7d']);
    expect(app('parseClassNames("10A-C")')).toEqual(['10A', '10B', '10C']);
    expect(app('parseClassNames("5a-c, 6a")')).toEqual(['5a', '5b', '5c', '6a']);
  });

  it('lässt einzelne Namen in Ruhe, auch mit Bindestrich oder Leerzeichen', () => {
    expect(app('parseClassNames("7b")')).toEqual(['7b']);
    expect(app('parseClassNames("Q1")')).toEqual(['Q1']);
    expect(app('parseClassNames("Q1 Leistungskurs")')).toEqual(['Q1 Leistungskurs']);
    expect(app('parseClassNames("E-Phase")')).toEqual(['E-Phase']);
    expect(app('parseClassNames("7a-7b-Kurs")')).toEqual(['7a-7b-Kurs']);
  });

  it('keine doppelten, keine leeren, Bereich rückwärts oder riesig wird nicht aufgeklappt', () => {
    expect(app('parseClassNames("7a, 7a, , 7b,")')).toEqual(['7a', '7b']);
    expect(app('parseClassNames("7d-a")')).toEqual(['7d-a']);
    expect(app('parseClassNames("")')).toEqual([]);
  });

  it('„7a-d“ legt vier Klassen mit Fach und Jahr an, jede mit eigener Farbe', () => {
    app('openAddSubjectGroup()');
    setVal('new-group-class', '7a-d');
    setVal('new-group-subject', 'Deutsch');
    setVal('new-group-year', '2026/27');
    app('saveSubjectGroup()');
    const neu = groups().filter(g => g.subject === 'Deutsch');
    expect(neu.map(g => g.className)).toEqual(['7a', '7b', '7c', '7d']);
    neu.forEach(g => {
      expect(g.year).toBe('2026/27');
      expect(app(`db.students[${JSON.stringify(g.id)}]`)).toEqual([]);
    });
    expect(new Set(neu.map(g => g.color)).size).toBe(4);
    expect(new Set(neu.map(g => g.id)).size).toBe(4);
    expect(lastToast()).toContain('4 Klassen');
  });

  it('Vorschau und Knopf nennen, was angelegt wird', () => {
    app('openAddSubjectGroup()');
    setVal('new-group-class', '7a-c');
    app('updateGroupClassPreview()');
    expect(document.getElementById('group-class-preview').textContent).toContain('7a, 7b, 7c');
    expect(document.getElementById('btn-save-group').textContent).toContain('3 Klassen');
    setVal('new-group-class', '7a');
    app('updateGroupClassPreview()');
    expect(document.getElementById('group-class-preview').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('btn-save-group').textContent).toBe('Speichern');
  });

  it('beim Öffnen stehen Fach und Jahr der zuletzt angelegten Klasse da, Skala und Gewichtung auf Standard', () => {
    app('openAddSubjectGroup()');
    expect(val('new-group-class')).toBe('');
    expect(val('new-group-subject')).toBe('Physik');
    expect(val('new-group-year')).toBe('2026/27');
    // Letzte Klasse ist ein Oberstufenkurs (0–15, 40 %): die nächste darf das nicht unbemerkt erben
    expect(val('weight-schularbeit')).toBe('50');
    expect(val('new-group-scale')).toBe('1-6');
  });

  it('ohne Klassen: leere Felder und Standardwerte wie bisher', () => {
    app('db.groups = []; db.students = {}');
    app('openAddSubjectGroup()');
    expect(val('new-group-subject')).toBe('');
    expect(val('new-group-year')).toBe('');
    expect(val('weight-schularbeit')).toBe('50');
    expect(val('new-group-scale')).toBe('1-6');
  });

  it('neue Farbe: nicht die der zuletzt angelegten Klasse', () => {
    app('openAddSubjectGroup()');
    expect(app('selectedGroupColor')).not.toBe('#f59e0b');
  });

  it('vorhandene Klasse + Fach wird übersprungen und genannt', () => {
    app('openAddSubjectGroup()');
    setVal('new-group-class', '7a-c');
    setVal('new-group-subject', 'Mathe');
    app('saveSubjectGroup()');
    const mathe = groups().filter(g => g.subject === 'Mathe').map(g => g.className).sort();
    expect(mathe).toEqual(['7a', '7b', '7c']);
    expect(lastToast()).toContain('7b');
  });

  it('gibt es alle schon: nichts anlegen, Fenster bleibt offen', () => {
    app('openAddSubjectGroup()');
    setVal('new-group-class', '7b');
    setVal('new-group-subject', 'Mathe');
    app('saveSubjectGroup()');
    expect(groups().length).toBe(2);
    expect(document.getElementById('modal-add-group').classList.contains('hidden')).toBe(false);
  });

  it('beim Bearbeiten wird nie aufgeteilt: Name bleibt, wie eingetippt (Kursnamen wie „Ethik 7a-d“, R1)', () => {
    app('openEditGroup("g1")');
    setVal('new-group-class', '7a-d');
    app('saveSubjectGroup()');
    expect(groups().find(g => g.id === 'g1').className).toBe('7a-d');
    expect(groups().length).toBe(2);
  });

  it('Bearbeiten ohne Liste speichert wie bisher', () => {
    app('openEditGroup("g1")');
    setVal('new-group-class', '7c');
    app('saveSubjectGroup()');
    expect(groups().find(g => g.id === 'g1').className).toBe('7c');
  });
});

describe('AA6: genug Farben für viele Klassen (Musik: 1 Stunde pro Klasse, bis zu 26 Klassen)', () => {
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const lum = c => {
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const [r, g, b] = c.map(f); return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const mix = (a, b, t) => a.map((v, i) => v * (1 - t) + b[i] * t);

  it('mindestens 28 Farben, in vollen Reihen zu 7, alle verschieden', () => {
    const colors = app('APP_COLORS');
    expect(colors.length).toBeGreaterThanOrEqual(28);
    expect(colors.length % 7).toBe(0);
    expect(new Set(colors.map(c => c.toLowerCase())).size).toBe(colors.length);
    colors.forEach(c => expect(c).toMatch(/^#[0-9a-f]{6}$/i));
  });

  it('die bisherigen 14 Farben bleiben vorne und in derselben Reihenfolge', () => {
    expect(app('APP_COLORS').slice(0, 14)).toEqual(['#6366f1', '#8b5cf6', '#ec4899', '#d946ef', '#ef4444', '#f97316', '#f59e0b',
      '#a16207', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#64748b']);
  });

  it('neue Farben: Klassenname auf der Kachel lesbar, dunkel wie hell', () => {
    // Kachel: Schrift in der Klassenfarbe auf 15 % Farbton (dunkel), hell mit 50 % Schwarz gemischt (style.css .tt-lesson)
    app('APP_COLORS').slice(14).forEach(c => {
      const x = rgb(c);
      expect(contrast(x, mix(rgb('#1a1d27'), x, 0.15)), c + ' dunkel').toBeGreaterThanOrEqual(3);
      expect(contrast(mix(x, [0, 0, 0], 0.5), mix(rgb('#f1f5f9'), x, 0.15)), c + ' hell').toBeGreaterThanOrEqual(4);
    });
  });

  it('26 neue Klassen bekommen 26 verschiedene Farben', () => {
    app('db.groups = []; db.students = {}');
    app('openAddSubjectGroup()');
    setVal('new-group-class', '5a-m, 6a-m');
    setVal('new-group-subject', 'Musik');
    app('saveSubjectGroup()');
    const g = groups();
    expect(g.length).toBe(26);
    expect(new Set(g.map(x => x.color)).size).toBe(26);
  });

  it('Häkchen der gewählten Farbe ist auf hellen Feldern dunkel', () => {
    app('openAddSubjectGroup()');
    const sw = c => document.querySelector(`#group-color-picker .color-swatch[data-color="${c}"]`);
    expect(sw('#fecdd3').classList.contains('swatch-light')).toBe(true);
    expect(sw('#d9f99d').classList.contains('swatch-light')).toBe(true);
    expect(sw('#6366f1').classList.contains('swatch-light')).toBe(false);
    expect(sw('#ef4444').classList.contains('swatch-light')).toBe(false);
    expect(CSS).toMatch(/\.color-swatch\.swatch-light\.selected::after\{[^}]*color:/);
  });

  it('weiße Schrift auf Klassenfarbe nur abgedunkelt (Abzeichen „noch … min“), Status im hellen Modus abgedunkelt', () => {
    expect(CSS).toMatch(/\.tt-lesson\.running \.tt-lesson-badge\{[^}]*background:color-mix\(in srgb, var\(--lesson-color\) 50%, #000\)/);
    expect(CSS).toMatch(/:root\[data-theme="light"\] \.dash-lesson\.running \.dash-lesson-status\{[^}]*color-mix\(in srgb, var\(--lesson-color\) 50%, #000\)/);
  });
});

describe('AA3: Vertretungen sichtbar und schnell eingetragen', () => {
  const MON = '2026-10-19', TUE = '2026-10-20';
  const slotDB = () => ({
    ...sampleDB(),
    lessonSlots: [
      { id: 'l1', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
      { id: 'l2', day: 1, block: 2, part: 'first', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
    ],
  });
  const radio = v => [...document.getElementsByName('new-lesson-part')].find(r => r.value === v);
  const tileTexts = () => [...document.querySelectorAll('#timetable-grid .tt-lesson, .tt-lesson')].map(t => t.textContent.replace(/\s+/g, ' ').trim());

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 19, 7, 0)); // Mo 19.10.2026, vor dem 1. Block
    window.innerWidth = 1024;
    app('db = ' + JSON.stringify(slotDB()));
    app('currentWeekOffset = 0');
  });
  afterEach(() => vi.useRealTimers());

  it('Wiederholung bietet „Vertretung (einmalig)“', () => {
    const opt = [...document.getElementById('new-lesson-recurring').options].find(o => o.value === 'substitute');
    expect(opt && opt.textContent).toMatch(/Vertretung/);
  });

  it('Knopf im Stunden-Fenster: Tag, Block, Hälfte, Datum und „Vertretung“ vorbelegt', () => {
    app(`openLessonDetail('l1', '${MON}')`);
    expect(document.getElementById('btn-lesson-substitute').classList.contains('hidden')).toBe(false);
    app('openSubstituteForLesson()');
    expect(document.getElementById('modal-lesson').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('modal-add-lesson').classList.contains('hidden')).toBe(false);
    expect(val('new-lesson-day')).toBe('0');
    expect(val('new-lesson-block')).toBe('1');
    expect(val('new-lesson-recurring')).toBe('substitute');
    expect(radio('full').checked).toBe(true);
    expect(radio('full').disabled).toBe(false);
    expect(document.getElementById('add-lesson-title').textContent).toMatch(/Vertretung/);
    expect(document.getElementById('lesson-date-hint').textContent).toContain('19.10.2026');
  });

  it('gespeichert als einmalige Stunde mit Kennzeichen (alte App-Versionen sehen eine einmalige Stunde)', async () => {
    app(`openLessonDetail('l1', '${MON}')`);
    app('openSubstituteForLesson()');
    setVal('new-lesson-subject', '8c Deutsch');
    await app('saveLessonSlot()');
    const sub = app('db.lessonSlots').find(s => s.subject === '8c Deutsch');
    expect(sub).toMatchObject({ recurring: false, specificDate: MON, day: 0, block: 1, part: 'full', substitute: true });
    expect(app('isOneOffSlot')(sub)).toBe(true);
    // ersetzt die reguläre Stunde an diesem Tag
    expect(app(`lessonsAt('${MON}', 1)`).map(s => s.id)).toEqual([sub.id]);
    const toasts = [...document.querySelectorAll('#toast-container .toast')].map(t => t.textContent);
    expect(toasts.some(t => t.startsWith('Vertretung eingetragen ✓ – ersetzt'))).toBe(true);
  });

  it('Kachel: „Vertretung“ bei Vertretungen, „einmalig“ bei anderen einmaligen, nichts bei regulären', () => {
    app(`db.lessonSlots.push({ id: 'v1', day: 0, block: 1, part: 'full', subject: '8c Deutsch', color: '#f97316', recurring: 'none', specificDate: '${MON}', substitute: true })`);
    app(`db.lessonSlots.push({ id: 'e1', day: 2, block: 3, part: 'full', subject: 'Nachschreiben', color: '#22c55e', recurring: 'none', specificDate: '2026-10-21' })`);
    app('switchView("timetable"); renderTimetable()');
    const tiles = tileTexts();
    expect(tiles.find(t => t.includes('8c Deutsch'))).toContain('Vertretung');
    expect(tiles.find(t => t.includes('Nachschreiben'))).toContain('einmalig');
    expect(tiles.filter(t => t.includes('Mathe')).every(t => !/Vertretung|einmalig/.test(t))).toBe(true);
  });

  it('Dashboard „Heute“ kennzeichnet die Vertretung', () => {
    app(`db.lessonSlots.push({ id: 'v1', day: 0, block: 1, part: 'full', subject: '8c Deutsch', color: '#f97316', recurring: 'none', specificDate: '${MON}', substitute: true })`);
    app('switchView("dashboard")');
    const row = [...document.querySelectorAll('.dash-lesson')].find(r => r.textContent.includes('8c Deutsch'));
    expect(row).toBeTruthy();
    expect(row.querySelector('.dash-badge.sub').textContent).toBe('Vertretung');
  });

  it('Stunden-Fenster einer Vertretung: Kennzeichen sichtbar, kein Knopf „Vertretung“', () => {
    app(`db.lessonSlots.push({ id: 'v1', day: 0, block: 1, part: 'full', subject: '8c Deutsch', color: '#f97316', recurring: 'none', specificDate: '${MON}', substitute: true })`);
    app(`openLessonDetail('v1', '${MON}')`);
    const badge = document.getElementById('lesson-kind-badge');
    expect(badge.classList.contains('hidden')).toBe(false);
    expect(badge.textContent).toBe('Vertretung');
    expect(document.getElementById('btn-lesson-substitute').classList.contains('hidden')).toBe(true);
    app('closeModal("modal-lesson")');
    app(`openLessonDetail('l1', '${MON}')`);
    expect(document.getElementById('lesson-kind-badge').classList.contains('hidden')).toBe(true);
  });

  it('Bearbeiten: Vertretung bleibt Vertretung; auf „Nur einmalig“ umgestellt verliert sie das Kennzeichen', async () => {
    app(`db.lessonSlots.push({ id: 'v1', day: 0, block: 1, part: 'full', subject: '8c Deutsch', color: '#f97316', recurring: 'none', specificDate: '${MON}', substitute: true })`);
    app(`openLessonDetail('v1', '${MON}')`);
    app('openEditLesson()');
    expect(val('new-lesson-recurring')).toBe('substitute');
    setVal('new-lesson-room', 'R12');
    await app('saveLessonSlot()');
    expect(app('db.lessonSlots').find(s => s.id === 'v1').substitute).toBe(true);
    app(`openLessonDetail('v1', '${MON}')`);
    app('openEditLesson()');
    setVal('new-lesson-recurring', 'none');
    await app('saveLessonSlot()');
    const v1 = app('db.lessonSlots').find(s => s.id === 'v1');
    expect('substitute' in v1).toBe(false);
    expect(v1.recurring === 'none' || v1.recurring === false).toBe(true);
  });

  it('Y13: Vertretung für eine halbe Stunde – die Hälfte der regulären Stunde ist wählbar', () => {
    app(`openAddLessonSlot(1, 2, '${TUE}', 'second')`);
    expect(radio('first').disabled).toBe(true);      // regulär: belegt
    setVal('new-lesson-recurring', 'substitute');
    app('updateLessonDateHint()');
    expect(radio('first').disabled).toBe(false);     // Vertretung ersetzt sie an diesem Tag
    expect(radio('full').disabled).toBe(false);
    setVal('new-lesson-recurring', 'weekly');
    app('updateLessonDateHint()');
    expect(radio('first').disabled).toBe(true);
  });

  it('eine andere Vertretung im selben Platz bleibt gesperrt', () => {
    app(`db.lessonSlots.push({ id: 'v2', day: 1, block: 2, part: 'second', subject: '9a', color: '#f97316', recurring: 'none', specificDate: '${TUE}', substitute: true })`);
    app(`openAddLessonSlot(1, 2, '${TUE}', 'first')`);
    setVal('new-lesson-recurring', 'substitute');
    app('updateLessonDateHint()');
    expect(radio('second').disabled).toBe(true);
    expect(radio('full').disabled).toBe(true);
    expect(radio('first').disabled).toBe(false);
  });
});

describe('AA2: Vorlage Einzelstunden / Doppelstunden', () => {
  const draft = () => app('blocksDraft');
  const len = b => { const m = t => +t.slice(0, 2) * 60 + +t.slice(3); return m(b.end) - m(b.start); };
  const groupHidden = () => document.getElementById('lesson-part-group').classList.contains('hidden');

  beforeEach(() => {
    app('db = ' + JSON.stringify({ ...sampleDB(), lessonSlots: [
      { id: 'l1', day: 0, block: 2, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
    ] }));
  });

  it('Knopf „Vorlage“ steht bei den Stundenzeiten', () => {
    const btn = document.querySelector('#modal-settings button[onclick="chooseBlockTemplate()"]');
    expect(btn && btn.textContent).toMatch(/Vorlage/);
  });

  it('Einzelstunden: 8 × 45 min ab dem bisherigen Beginn, Namen „1. Stunde“ …, bisherige Nummern zuerst', () => {
    app('openSettings()');
    app('applyBlockTemplate("single")');
    const d = draft();
    expect(d).toHaveLength(8);
    d.forEach(b => expect(len(b)).toBe(45));
    expect(d[0]).toMatchObject({ num: 1, label: '1. Stunde', start: '07:45', end: '08:30' });
    expect(d.map(b => b.num)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(d[7].label).toBe('8. Stunde');
    // Pausen: 5 min, nach der 2. und 4. Stunde 20 min
    expect(d[1].start).toBe('08:35');
    expect(d[2].start).toBe('09:40');
    // erst mit „Speichern“ übernommen
    expect(app('db.settings.blocks')).toBeNull();
    app('saveSettings()');
    expect(app('getBlocks()').map(b => b.label)).toContain('8. Stunde');
  });

  it('Doppelstunden: 4 × 90 min; überzählige Blöcke mit Stunden bleiben, leere fallen weg', () => {
    app('db.settings.blocks = ' + JSON.stringify([1, 2, 3, 4, 5, 6].map(n => ({ num: n, label: n + '. Stunde', start: String(7 + n).padStart(2, '0') + ':00', end: String(7 + n).padStart(2, '0') + ':45' }))));
    app('db.lessonSlots[0].block = 6');
    app('openSettings()');
    app('applyBlockTemplate("double")');
    const d = draft();
    expect(d.filter(b => len(b) === 90)).toHaveLength(4);
    expect(d.map(b => b.num)).toEqual([1, 2, 3, 4, 6]);   // 5 leer → weg, 6 hat eine Stunde → bleibt
    expect(d.find(b => b.num === 6)).toMatchObject({ start: '13:00', end: '13:45' });
    expect(d[0].label).toBe('1. Block');
  });

  it('Einzelstunden: Auswahl „1./2. Hälfte“ ausgeblendet, außer eine Hälfte ist vorgewählt', () => {
    app('openAddLessonSlot(0, 1, null, "full")');
    expect(groupHidden()).toBe(false);               // Standard: Doppelstunden
    app('db.settings.blocks = ' + JSON.stringify([1, 2, 3].map(n => ({ num: n, label: n + '. Stunde', start: '0' + (7 + n) + ':00', end: '0' + (7 + n) + ':45' }))));
    app('openAddLessonSlot(0, 1, null, "full")');
    expect(groupHidden()).toBe(true);
    app('openAddLessonSlot(0, 1, null, "second")');
    expect(groupHidden()).toBe(false);
  });
});

describe('AA5: versetzte Tische im Sitzplan', () => {
  const seatDB = (stagger) => ({
    ...sampleDB(),
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#6366f1', schularbeitWeight: 50,
      seatingCols: 4, seatingRows: 3, teacherDeskX: 0, teacherDeskY: 2, ...(stagger ? { seatingStagger: true } : {}) }],
    students: { g1: [
      { id: 'a', firstName: 'Anna', lastName: 'A', gridX: 0, gridY: 0, grades: [], attendance: [], participation: [], homework: [] },
      { id: 'b', firstName: 'Ben', lastName: 'B', gridX: 0, gridY: 1, grades: [], attendance: [], participation: [], homework: [] },
    ] },
  });
  const render = () => {
    const wrapper = document.getElementById('seating-canvas-wrapper');
    Object.defineProperty(wrapper, 'clientWidth', { configurable: true, value: 440 });
    Object.defineProperty(wrapper, 'clientHeight', { configurable: true, value: 340 });
    app('currentSeatingGroupId = "g1"; renderSeatingPlan()');
  };
  const card = id => document.querySelector(`.seating-card[data-id="${id}"]`);
  const left = el => parseFloat(el.style.left);

  afterEach(() => {
    const wrapper = document.getElementById('seating-canvas-wrapper');
    delete wrapper.clientWidth; delete wrapper.clientHeight;
  });

  it('ohne Versatz: beide Karten in derselben Spalte genau übereinander', () => {
    app('db = ' + JSON.stringify(seatDB(false)));
    app('switchView("seating")');
    render();
    expect(left(card('a'))).toBe(left(card('b')));
  });

  it('mit Versatz: jede zweite Reihe (2., 4. …) um einen halben Platz nach rechts, Raster passt trotzdem hinein', () => {
    app('db = ' + JSON.stringify(seatDB(true)));
    app('switchView("seating")');
    render();
    const cells = [...document.querySelectorAll('.seating-grid-cell')];
    const cell = parseFloat(cells[0].style.width);
    expect(left(card('b')) - left(card('a'))).toBeCloseTo(cell / 2, 5);
    const width = parseFloat(document.getElementById('seating-canvas').style.minWidth);
    expect(width).toBeCloseTo(4.5 * cell, 5);
    expect(width).toBeLessThanOrEqual(400);                              // Wrapper 440 − 40 Rand
    expect(left(cells[4]) - left(cells[0])).toBeCloseTo(cell / 2, 5);   // 1. Zelle der 2. Reihe
    expect(left(cells[8])).toBe(left(cells[0]));                        // 3. Reihe wieder bündig
  });

  it('Schalter im Raster-Menü speichert pro Klasse, ohne Plätze anzufassen', () => {
    app('db = ' + JSON.stringify(seatDB(false)));
    app('switchView("seating")');
    render();
    const chk = document.getElementById('seating-stagger');
    expect(chk.checked).toBe(false);
    app('onToggleSeatingStagger(true)');
    const g = app('db.groups[0]');
    expect(g.seatingStagger).toBe(true);
    expect(app('db.students.g1').map(s => [s.gridX, s.gridY])).toEqual([[0, 0], [0, 1]]);
    expect(document.getElementById('seating-stagger').checked).toBe(true);
    app('onToggleSeatingStagger(false)');
    expect('seatingStagger' in app('db.groups[0]')).toBe(false);
  });

  it('Einrasten beim Ziehen beachtet den Versatz der Reihe', () => {
    const shift = 'y => y % 2 === 1 ? 50 : 0';
    // Mitte bei x = 60 in Reihe 0 → Spalte 0; in Reihe 1 (um 50 verschoben) → Spalte 0, bei x = 160 → Spalte 1
    expect(app(`seatingSnap(60, 50, 100, 100, 4, 3, 1, ${shift})`)).toEqual({ gridX: 0, gridY: 0 });
    expect(app(`seatingSnap(60, 150, 100, 100, 4, 3, 1, ${shift})`)).toEqual({ gridX: 0, gridY: 1 });
    expect(app(`seatingSnap(160, 150, 100, 100, 4, 3, 1, ${shift})`)).toEqual({ gridX: 1, gridY: 1 });
    expect(app(`seatingSnap(140, 150, 100, 100, 4, 3, 1, ${shift})`)).toEqual({ gridX: 0, gridY: 1 });
    // Lehrerpult (2 Zellen breit) wie bisher (BUGS E3)
    expect(app(`seatingSnap(100, 250, 100, 100, 4, 3, 2, () => 0)`)).toEqual({ gridX: 0, gridY: 2 });
  });
});

describe('AA2: Zeilenhöhe im Stundenplan nach Dauer (Einzelstunden nicht so hoch wie Doppelblöcke)', () => {
  const rowSizes = () => document.getElementById('timetable-grid').style.gridTemplateRows;
  beforeEach(() => { window.innerWidth = 1024; app('db.supervisions = []'); });

  it('Doppelstunden: wie bisher 88 px Mindesthöhe, alle gleich', () => {
    app('switchView("timetable"); renderTimetable()');
    expect(rowSizes()).toBe('auto minmax(88px, 90fr) minmax(88px, 90fr) minmax(88px, 90fr) minmax(88px, 90fr)');
  });

  it('Einzelstunden: nur so hoch wie der Inhalt (mind. 52 px), Rest bleibt unten frei statt als Luft in jeder Kachel', () => {
    app('db.settings.blocks = ' + JSON.stringify([1, 2, 3].map(n => ({ num: n, label: n + '. Stunde', start: `0${7 + n}:00`, end: `0${7 + n}:45` }))));
    app('switchView("timetable"); renderTimetable()');
    // alle gleich hoch (so hoch wie die größte Kachel): fr-Zeilen in einem Raster ohne feste Höhe
    expect(rowSizes()).toBe('auto minmax(48px, 1fr) minmax(48px, 1fr) minmax(48px, 1fr)'); // feste Höhe, gemessen
    expect(document.getElementById('timetable-grid').style.flex).toBe('0 0 auto');
    expect(document.getElementById('timetable-grid').style.alignContent).toBe('start');
    const label = document.querySelector('#timetable-grid .tt-time-label');
    expect(label.classList.contains('short')).toBe(true);
    expect(label.title).toBe('1. Stunde, 08:00–08:45');
  });

  it('Zeitspalte bei Einzelstunden: nur die Zahl groß und die Uhrzeiten, „Stunde“ entfällt', () => {
    app('db.settings.blocks = ' + JSON.stringify([
      { num: 1, label: '1. Stunde', start: '08:00', end: '08:45' },
      { num: 2, label: '2. Std.', start: '08:50', end: '09:35' },
      { num: 3, label: 'Mittag', start: '12:00', end: '12:45' }]));
    app('switchView("timetable"); renderTimetable()');
    const labels = [...document.querySelectorAll('#timetable-grid .tt-time-label:not(.tt-break-label)')];
    expect(labels[0].querySelector('.tt-time-num').textContent).toBe('1');
    expect(labels[0].textContent).not.toContain('Stunde');
    expect(labels[0].textContent).toContain('08:00');
    expect(labels[0].textContent).toContain('08:45');
    expect(labels[0].getAttribute('aria-label')).toBe('1. Stunde, 08:00 bis 08:45');
    expect(labels[1].querySelector('.tt-time-num').textContent).toBe('2');
    expect(labels[2].querySelector('.tt-time-num')).toBeNull();      // eigener Name bleibt
    expect(labels[2].textContent).toContain('Mittag');
  });

  it('Einzelstunden: eine einzelne „Hälfte“ wird als ganze Stunde gezeigt, zwei Hälften bleiben geteilt; Daten unverändert', () => {
    app('db.settings.blocks = ' + JSON.stringify([1, 2].map(n => ({ num: n, label: n + '. Stunde', start: `0${7 + n}:00`, end: `0${7 + n}:45` }))));
    app('db.lessonSlots = ' + JSON.stringify([
      { id: 'h1', day: 2, block: 1, part: 'first', subject: 'Physik', color: '#22c55e', groupId: 'g1', recurring: 'weekly' },
      { id: 'h2', day: 3, block: 1, part: 'first', subject: 'Physik', color: '#22c55e', groupId: 'g1', recurring: 'weekly' },
      { id: 'h3', day: 3, block: 1, part: 'second', subject: 'Chemie', color: '#f97316', recurring: 'weekly' }]));
    app('switchView("timetable"); renderTimetable()');
    const cells = [...document.querySelectorAll('#timetable-grid .tt-cell')];
    expect(cells[2].querySelector('.tt-split-container')).toBeNull();          // Mi: nur eine Hälfte → ganz
    expect(cells[2].querySelectorAll('.tt-lesson')).toHaveLength(1);
    expect(cells[3].querySelector('.tt-split-container')).not.toBeNull();      // Do: zwei Stunden → geteilt
    expect(app('db.lessonSlots[0].part')).toBe('first');
  });

  it('Einzelstunden: „als Nächstes“ nur als Umrandung, Symbole neben dem Namen', () => {
    expect(CSS).toMatch(/\.tt-cell\.tt-short \.tt-lesson\.next \.tt-lesson-badge\{display:none;?\}/);
    expect(CSS).toMatch(/\.tt-cell\.tt-short \.tt-lesson\{[^}]*flex-direction:row/);
  });

  it('halbe Einzelstunden: einzeilig, damit die Zeile nicht doppelt so hoch wird', () => {
    expect(CSS).toMatch(/\.tt-cell\.tt-short \.tt-split-half \.tt-lesson-head\{[^}]*flex-wrap:nowrap/);
    expect(CSS).toMatch(/\.tt-cell\.tt-short \.tt-split-half \.tt-lesson-foot[^{]*\{[^}]*display:none/);
  });

  it('gemischt: 90-min-Block füllt den Platz, die 45-min-Stunde bleibt kompakt', () => {
    app('db.settings.blocks = ' + JSON.stringify([
      { num: 1, label: '1. Block', start: '08:00', end: '09:30' },
      { num: 2, label: '3. Stunde', start: '09:45', end: '10:30' }]));
    app('switchView("timetable"); renderTimetable()');
    expect(rowSizes()).toBe('auto minmax(88px, 90fr) minmax(52px, auto)');
  });

  it('kurze Stunden (≤ 50 min) bekommen kompakte Kacheln, Doppelblöcke nicht', () => {
    app('db.settings.blocks = ' + JSON.stringify([
      { num: 1, label: '1. Block', start: '08:00', end: '09:30' },
      { num: 2, label: '3. Stunde', start: '09:45', end: '10:30' }]));
    app('switchView("timetable"); renderTimetable()');
    const cells = [...document.querySelectorAll('#timetable-grid .tt-cell')];
    expect(cells.slice(0, 5).every(c => !c.classList.contains('tt-short'))).toBe(true);
    expect(cells.slice(5, 10).every(c => c.classList.contains('tt-short'))).toBe(true);
    expect(CSS).toMatch(/\.tt-cell\.tt-short \.tt-lesson-subject > span\{[^}]*display:inline/);
  });

  it('Tagesansicht (Handy): Einzelstunden niedriger als Blöcke', () => {
    window.innerWidth = 400;
    app('db.settings.blocks = ' + JSON.stringify([
      { num: 1, label: '1. Block', start: '08:00', end: '09:30' },
      { num: 2, label: '3. Stunde', start: '09:45', end: '10:30' }]));
    app('switchView("timetable"); renderTimetable()');
    expect(rowSizes()).toBe('auto minmax(96px, auto) minmax(60px, auto)');
    window.innerWidth = 1024;
  });
});
