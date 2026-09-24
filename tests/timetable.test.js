// Block D (Stundenplan): A/B-Woche, einmalige Stunden, Überschneidungen, Zeitblöcke,
// Einstellungen „Abbrechen“, Stunde verschieben, Titel, viele Blöcke, HA-Eingabe, Datums-Parsing.
const { loadApp, app } = require('./helpers/load-app');

// slotA: jede Woche Mo 1. Block; slotAB: alle 2 Wochen Mi 2. Block, A-Woche = Woche vom 07.09.2026
function sampleDB() {
  return {
    settings: { teacherName: 'Test', school: '', blocks: null },
    lessonSlots: [
      { id: 'slotA', day: 0, block: 1, subject: 'Mathe', groupId: 'g1', recurring: 'weekly', color: '#6366f1', part: 'full' },
      { id: 'slotAB', day: 2, block: 2, subject: 'Physik', groupId: null, recurring: 'biweekly', startDate: '2026-09-09', color: '#ec4899', part: 'full' },
    ],
    lessonData: { 'slotA_2026-10-05': { notes: 'Bruchrechnen' }, 'slotA_2026-10-12': { notes: 'Test' } },
    groups: [{ id: 'g1', subject: 'Mathe', className: '1A', color: '#6366f1', schularbeitWeight: 50 }],
    students: { g1: [] },
  };
}

beforeAll(() => {
  // Altdaten: zweiwöchig nur mit KW (37 = Woche vom 07.09.2026), einmalige Stunde auf falschem Tag (D2)
  const old = sampleDB();
  old.lessonSlots.push(
    { id: 'oldAB', day: 3, block: 3, subject: 'Chemie', recurring: 'biweekly', startWeek: 37, color: '#6366f1' },
    { id: 'oldOnce', day: 2, block: 4, subject: 'Vertretung', recurring: false, specificDate: '2026-10-05', color: '#6366f1' },
  );
  localStorage.setItem('lehrerapp_v3', JSON.stringify(old));
  loadApp();
});

let migrated;
beforeAll(() => { migrated = JSON.parse(JSON.stringify(app('db'))); });

beforeEach(() => {
  app('db = ' + JSON.stringify(sampleDB()));
  app('currentWeekOffset = 0; editingSlotId = null; activeLessonId = null; activeLessonDate = null');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
  window.confirm = () => true;
});

const slot = id => app('db').lessonSlots.find(s => s.id === id);
const toasts = () => document.getElementById('toast-container').textContent;

// Zeigt der Stundenplan diese Stunde an diesem Datum?
function shownOn(slotId, dateStr) {
  app(`jumpToDate('${dateStr}')`);
  const want = `openLessonDetail(${JSON.stringify(slotId)},${JSON.stringify(dateStr)})`;
  return [...document.querySelectorAll('#timetable-grid [onclick]')].some(el => el.getAttribute('onclick') === want);
}

// Formular „Stunde hinzufügen“ über ein leeres Feld im Plan öffnen und ausfüllen
function addLesson({ date, day, block, subject = 'Neu', recurring = 'weekly', part = 'full', dayOverride }) {
  app(`openAddLessonSlot(${day}, ${block}, '${date}', '${part}')`);
  document.getElementById('new-lesson-subject').value = subject;
  if (dayOverride !== undefined) document.getElementById('new-lesson-day').value = String(dayOverride);
  document.getElementById('new-lesson-recurring').value = recurring;
  const before = app('db').lessonSlots.length;
  app('saveLessonSlot()');
  return app('db').lessonSlots.length > before ? app('db').lessonSlots[before] : null;
}

describe('D1: A/B-Woche über den Jahreswechsel mit KW 53', () => {
  it('zweiwöchige Stunde bleibt nach dem 04.01.2027 im richtigen Rhythmus', () => {
    // 09.09.2026 + 16 Wochen = 30.12.2026 (A), + 17 = 06.01.2027 (B), + 18 = 13.01.2027 (A)
    expect(shownOn('slotAB', '2026-12-30')).toBe(true);
    expect(shownOn('slotAB', '2027-01-06')).toBe(false);
    expect(shownOn('slotAB', '2027-01-13')).toBe(true);
  });

  it('„nächste Stunden“ (HA-Datum) überspringen die B-Woche auch über Neujahr', () => {
    const dates = app(`findUpcomingLessonDates('slotAB', '2026-12-30', 3)`).map(d => d.dateStr);
    expect(dates).toEqual(['2027-01-13', '2027-01-27', '2027-02-10']);
  });

  it('Sitzplan-Vorschlag (laufende Stunde) beachtet die A/B-Woche', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date(2027, 0, 6, 10, 0)); // Mi 06.01.2027, 2. Block, B-Woche
      app('db').lessonSlots.find(s => s.id === 'slotAB').groupId = 'g1';
      expect(app('getSuggestedSeatingGroupId()')).toBe(null);
      vi.setSystemTime(new Date(2027, 0, 13, 10, 0)); // A-Woche
      expect(app('getSuggestedSeatingGroupId()')).toBe('g1');
    } finally {
      vi.useRealTimers();
    }
  });

  it('Migration: alte KW-Angabe wird zu einem Startdatum mit gleichem Rhythmus wie 2026', () => {
    const s = migrated.lessonSlots.find(x => x.id === 'oldAB');
    expect(s.startDate).toBe('2026-09-07');
    app('db').lessonSlots.push(s);
    expect(shownOn('oldAB', '2026-09-10')).toBe(true);
    expect(shownOn('oldAB', '2026-09-17')).toBe(false);
    expect(shownOn('oldAB', '2027-01-07')).toBe(false); // KW 1 2027, aber B-Woche
    expect(shownOn('oldAB', '2027-01-14')).toBe(true);
  });

  it('Migration läuft beliebig oft ohne Änderung', () => {
    const again = app(`migrateDB(${JSON.stringify(migrated)})`);
    expect(again).toEqual(migrated);
  });

  it('neue zweiwöchige Stunde merkt sich das Datum der angeklickten Woche', () => {
    const s = addLesson({ date: '2026-12-29', day: 1, block: 3, recurring: 'biweekly' });
    expect(s.startDate).toBe('2026-12-29');
    expect(shownOn(s.id, '2027-01-12')).toBe(true);
    expect(shownOn(s.id, '2027-01-05')).toBe(false);
  });
});

describe('D2: einmalige Stunde landet am gewählten Tag', () => {
  it('Tag im Formular geändert → Datum wandert mit (gleiche Woche)', () => {
    const s = addLesson({ date: '2026-10-05', day: 0, block: 3, recurring: 'none', dayOverride: 2 });
    expect(s.specificDate).toBe('2026-10-07');
    expect(shownOn(s.id, '2026-10-07')).toBe(true);
  });

  it('wöchentliche Stunde auf „einmalig“ umgestellt → Datum der angeklickten Stunde, nicht Montag', () => {
    app('db').lessonSlots.push({ id: 'tue', day: 1, block: 3, subject: 'Bio', recurring: 'weekly', color: '#6366f1', part: 'full' });
    app(`openLessonDetail('tue', '2026-10-13')`);
    app('openEditLesson()');
    document.getElementById('new-lesson-recurring').value = 'none';
    app('saveLessonSlot()');
    expect(slot('tue').specificDate).toBe('2026-10-13');
  });

  it('Migration: verirrte einmalige Stunde wird auf ihren Wochentag gesetzt', () => {
    expect(migrated.lessonSlots.find(x => x.id === 'oldOnce').specificDate).toBe('2026-10-07');
  });
});

describe('D3: Überschneidungsprüfung beachtet Datum und A/B-Woche', () => {
  it('einmalige Stunde blockiert nur ihr Datum', () => {
    expect(addLesson({ date: '2026-10-06', day: 1, block: 1, recurring: 'none' })).not.toBe(null);
    expect(addLesson({ date: '2026-10-13', day: 1, block: 1, recurring: 'none' })).not.toBe(null);
  });

  it('A- und B-Woche im selben Block', () => {
    const b = addLesson({ date: '2026-09-16', day: 2, block: 2, recurring: 'biweekly', subject: 'Chemie' });
    expect(b).not.toBe(null);
    expect(shownOn(b.id, '2026-09-16')).toBe(true);
    expect(shownOn('slotAB', '2026-09-16')).toBe(false);
    // dieselbe Woche wie slotAB → belegt
    expect(addLesson({ date: '2026-09-23', day: 2, block: 2, recurring: 'biweekly' })).toBe(null);
    expect(toasts()).toContain('belegt');
  });

  it('wöchentliche Stunde kollidiert weiterhin mit allem im selben Block', () => {
    expect(addLesson({ date: '2026-10-05', day: 0, block: 1, recurring: 'none' })).toBe(null);
    expect(addLesson({ date: '2026-10-16', day: 2, block: 2, recurring: 'weekly' })).toBe(null);
  });

  it('vergangene Vertretung sperrt den Block nicht für eine neue wöchentliche Stunde; an ihrem Tag gilt die Vertretung', () => {
    const once = addLesson({ date: '2026-01-06', day: 1, block: 1, recurring: 'none', subject: 'Vertretung' });
    const weekly = addLesson({ date: '2026-10-06', day: 1, block: 1, recurring: 'weekly', subject: 'Neu' });
    expect(weekly).not.toBe(null);
    expect(shownOn(once.id, '2026-01-06')).toBe(true);
    expect(shownOn(weekly.id, '2026-01-06')).toBe(false);
    expect(shownOn(weekly.id, '2026-10-06')).toBe(true);
  });
});

describe('D4: Zeitblock löschen', () => {
  it('Stunden späterer Blöcke bleiben in ihrem Block', () => {
    app('db').lessonSlots.push({ id: 'b4', day: 4, block: 4, subject: 'Sport', recurring: 'weekly', color: '#6366f1', part: 'full' });
    app('openSettings()');
    app('deleteBlockRow(2)'); // 3. Block, leer
    app('saveSettings()');
    const blocks = app('getBlocks()');
    expect(blocks.map(b => b.num)).toEqual([1, 2, 4]);
    app('renderTimetable()');
    expect(document.getElementById('timetable-grid').textContent).toContain('Sport');
    const block4 = blocks.find(b => b.num === 4);
    expect(block4.start).toBe('13:45');
  });

  it('Block mit Stunden lässt sich nicht löschen', () => {
    app('openSettings()');
    app('deleteBlockRow(0)'); // Mathe liegt im 1. Block
    app('saveSettings()');
    expect(app('getBlocks()').map(b => b.num)).toEqual([1, 2, 3, 4]);
    expect(toasts()).toContain('Stunde');
  });

  it('neuer Block bekommt eine noch freie Nummer', () => {
    app('openSettings()');
    app('deleteBlockRow(2)');
    app('addBlockRow()');
    app('saveSettings()');
    expect(app('getBlocks()').map(b => b.num)).toEqual([1, 2, 4, 5]);
  });
});

describe('D5: Einstellungen „Abbrechen“', () => {
  it('Block hinzufügen/löschen ohne Speichern ändert nichts', () => {
    app('openSettings()');
    app('addBlockRow()');
    app('deleteBlockRow(2)');
    app("closeModal('modal-settings')");
    expect(app('db').settings.blocks).toBe(null);
    expect(app('getBlocks()').map(b => b.num)).toEqual([1, 2, 3, 4]);
    expect(app('DEFAULT_BLOCKS').length).toBe(4);
  });

  it('getBlocks() liefert nie die Konstante selbst', () => {
    app('getBlocks()').push({ num: 99 });
    expect(app('DEFAULT_BLOCKS').length).toBe(4);
  });

  it('eingetippte Uhrzeiten bleiben beim Hinzufügen eines Blocks erhalten', () => {
    app('openSettings()');
    document.querySelector('.block-time-input[data-bidx="0"][data-field="start"]').value = '07:30';
    app('addBlockRow()');
    app('saveSettings()');
    expect(app('getBlocks()')[0].start).toBe('07:30');
  });
});

describe('D6: Stunde auf anderen Wochentag verschieben', () => {
  it('Notizen wandern mit (gleiche Woche, neuer Tag)', () => {
    app(`openLessonDetail('slotA', '2026-10-05')`);
    app('openEditLesson()');
    document.getElementById('new-lesson-day').value = '3';
    app('saveLessonSlot()');
    const d = app('db').lessonData;
    expect(d['slotA_2026-10-08']).toEqual({ notes: 'Bruchrechnen' });
    expect(d['slotA_2026-10-15']).toEqual({ notes: 'Test' });
    expect(d['slotA_2026-10-05']).toBeUndefined();
  });

  it('verliert nichts, wenn schon Einträge auf dem neuen Wochentag liegen (verschieben sich mit)', () => {
    app('db').lessonData['slotA_2026-10-08'] = { notes: 'schon da' };
    app(`openLessonDetail('slotA', '2026-10-05')`);
    app('openEditLesson()');
    document.getElementById('new-lesson-day').value = '3';
    app('saveLessonSlot()');
    const d = app('db').lessonData;
    expect(d['slotA_2026-10-08']).toEqual({ notes: 'Bruchrechnen' });
    expect(d['slotA_2026-10-11']).toEqual({ notes: 'schon da' });
    expect(Object.keys(d)).toHaveLength(3);
  });

  it('andere Stunden und Blockwechsel am selben Tag bleiben unberührt', () => {
    app('db').lessonData['slotAB_2026-09-09'] = { notes: 'Physik' };
    app(`openLessonDetail('slotA', '2026-10-05')`);
    app('openEditLesson()');
    document.getElementById('new-lesson-block').value = '3';
    app('saveLessonSlot()');
    const d = app('db').lessonData;
    expect(d['slotA_2026-10-05']).toEqual({ notes: 'Bruchrechnen' });
    expect(d['slotAB_2026-09-09']).toEqual({ notes: 'Physik' });
  });
});

describe('D7: Titel nach Umbenennen der Klasse', () => {
  it('Stundenfenster zeigt den aktuellen Fachnamen', () => {
    app('db').groups[0].subject = 'Mathematik';
    app(`openLessonDetail('slotA', '2026-10-05')`);
    expect(document.getElementById('lesson-modal-title').textContent).toContain('Mathematik');
    expect(document.getElementById('lesson-modal-title').textContent).toContain('1A');
  });

  it('Umbenennen der Klasse aktualisiert auch das Fach der Stunden', () => {
    app(`openEditGroup('g1')`);
    document.getElementById('new-group-subject').value = 'Mathematik';
    app('saveSubjectGroup()');
    expect(slot('slotA').subject).toBe('Mathematik');
  });
});

describe('D8: viele Blöcke', () => {
  it('Stundenplan wird nicht abgeschnitten, sondern ist scrollbar', () => {
    app('renderTimetable()');
    const wrapper = document.getElementById('timetable-grid').parentElement;
    expect(wrapper.style.overflow).not.toBe('hidden');
  });
});

describe('D9: nicht übernommene HA/Test-Eingabe', () => {
  it('wird beim Speichern übernommen', () => {
    app(`openLessonDetail('slotA', '2026-10-05')`);
    document.getElementById('hw-toggle').checked = true;
    document.getElementById('new-hw-text').value = 'S. 12';
    document.getElementById('new-hw-date').value = '2026-10-12';
    document.getElementById('test-toggle').checked = true;
    document.getElementById('new-test-text').value = 'Kapitel 3';
    document.getElementById('new-test-date').value = '2026-10-19';
    app('saveLessonDataAndClose()');
    const d = app('db').lessonData['slotA_2026-10-05'];
    expect(d.hwItems.map(i => [i.text, i.targetDate])).toEqual([['S. 12', '2026-10-12']]);
    expect(d.testItems.map(i => [i.text, i.targetDate])).toEqual([['Kapitel 3', '2026-10-19']]);
    expect(d.hwEnabled).toBe(true);
  });

  it('ausgeschalteter Bereich übernimmt nichts', () => {
    app(`openLessonDetail('slotA', '2026-10-05')`);
    document.getElementById('hw-toggle').checked = false;
    document.getElementById('new-hw-text').value = 'S. 12';
    app('saveLessonDataAndClose()');
    expect(app('db').lessonData['slotA_2026-10-05'].hwItems).toBeUndefined();
  });
});

describe('D10: Datumsstrings werden als lokale Zeit gelesen', () => {
  it('„Zu Datum springen“ zeigt die richtige Woche auch westlich von UTC', () => {
    const oldTZ = process.env.TZ;
    process.env.TZ = 'America/New_York';
    try {
      if (new Date(2027, 0, 4).getTimezoneOffset() <= 0) return; // Zeitzone ließ sich nicht umstellen
      app(`jumpToDate('2027-01-04')`);
      expect(document.getElementById('week-label').textContent).toContain('04.01.');
      app(`currentSeatingDateStr = '2027-01-04'`);
      app('renderSeatingDateStrip()');
      expect(document.querySelector('#seating-date-strip .date-chip.active .date-chip-day').textContent).toBe('Mo');
    } finally {
      if (oldTZ === undefined) delete process.env.TZ; else process.env.TZ = oldTZ;
    }
  });
});

describe('H2: Tagesansicht auf dem Handy', () => {
  const setWidth = w => { window.innerWidth = w; };
  const grid = () => document.getElementById('timetable-grid');
  const label = () => document.getElementById('week-label').textContent;
  afterEach(() => { setWidth(1024); app('timetableDay = null'); });

  it('unter 700 px nur ein Tag, mit Datum und KW', () => {
    setWidth(400);
    app('jumpToDate("2026-10-05")');
    expect(grid().classList.contains('day-view')).toBe(true);
    const blocks = app('getBlocks()').length;
    expect(grid().querySelectorAll('.tt-cell').length).toBe(blocks);
    expect(grid().querySelector('.tt-day-header').textContent).toBe('Montag, 05.10.');
    expect(label()).toContain('Mo 05.10.');
    expect(label()).toContain('KW 41');
    expect(grid().textContent).toContain('Mathe');
    expect(grid().querySelector('.tt-lesson').getAttribute('onclick')).toContain('"2026-10-05"');
  });

  it('breit: weiter 5-Tage-Raster', () => {
    app('jumpToDate("2026-10-05")');
    expect(grid().classList.contains('day-view')).toBe(false);
    expect(grid().querySelectorAll('.tt-day-header').length).toBe(5);
  });

  it('Pfeile blättern Schultage, Wochenende wird übersprungen', () => {
    setWidth(400);
    app('jumpToDate("2026-10-09")'); // Freitag
    app('navigateWeek(1)');
    expect(label()).toContain('Mo 12.10.');
    app('navigateWeek(-1)');
    expect(label()).toContain('Fr 09.10.');
    expect(document.querySelector('button[onclick="navigateWeek(1)"]').title).toBe('Nächster Tag');
  });

  it('Woche läuft mit: zurück auf breit zeigt die Woche des Tages', () => {
    setWidth(400);
    app('jumpToDate("2026-10-09")');
    app('navigateWeek(1)');
    setWidth(1024);
    app('renderTimetable()');
    expect(label()).toContain('12.10. – 16.10.');
    expect(document.querySelector('button[onclick="navigateWeek(1)"]').title).toBe('Nächste Woche');
  });

  it('„Heute“ springt auf heute (Wochenende: Montag)', () => {
    setWidth(400);
    app('jumpToDate("2026-10-09")');
    app('goToCurrentWeek()');
    const d = app('todaySchoolDay()');
    expect(label()).toContain(app(`formatDateDE(todaySchoolDay())`));
    expect([1, 2, 3, 4, 5]).toContain(d.getDay());
    expect(document.getElementById('week-label').classList.contains('active')).toBe(true);
  });

  it('Wischen nach links = nächster Tag, kurze oder senkrechte Bewegung nicht', () => {
    setWidth(400);
    app('jumpToDate("2026-10-05")');
    app('handleTimetableSwipe(-20, 0)');
    app('handleTimetableSwipe(-100, 150)');
    expect(label()).toContain('Mo 05.10.');
    const wrapper = document.querySelector('.timetable-grid-wrapper');
    const touch = (type, x, y) => {
      const ev = new Event(type);
      ev.touches = [{ clientX: x, clientY: y }];
      ev.changedTouches = [{ clientX: x, clientY: y }];
      wrapper.dispatchEvent(ev);
    };
    touch('touchstart', 300, 200);
    touch('touchend', 150, 210);
    expect(label()).toContain('Di 06.10.');
    app('handleTimetableSwipe(120, 0)');
    expect(label()).toContain('Mo 05.10.');
  });

  it('Wischen in der Wochenansicht tut nichts', () => {
    app('jumpToDate("2026-10-05")');
    app('handleTimetableSwipe(-120, 0)');
    expect(label()).toContain('05.10. – 09.10.');
  });
});

describe('H4: Stundenplan-Kacheln', () => {
  const grid = () => document.getElementById('timetable-grid');
  const lessonEl = (slotId, dateStr) =>
    [...grid().querySelectorAll('.tt-lesson')].find(el => el.getAttribute('onclick') === `openLessonDetail("${slotId}","${dateStr}")`);
  const css = require('fs').readFileSync(require('path').join(__dirname, '..', 'style.css'), 'utf8');
  afterEach(() => vi.useRealTimers());

  it('Kacheln teilen sich die volle Breite und Höhe (keine festen Quadrate)', () => {
    app('jumpToDate("2026-10-05")');
    expect(grid().style.gridTemplateColumns).toMatch(/1fr/);
    expect(grid().style.gridTemplateColumns).not.toMatch(/\d+(\.\d+)?px \d+(\.\d+)?px \d+(\.\d+)?px/);
    expect(grid().style.gridTemplateRows).toMatch(/1fr/);
  });

  it('Klasse groß, Fach klein; lange Namen enden mit „…“', () => {
    app('db.groups[0].subject = "Mathematik"');
    app('jumpToDate("2026-10-05")');
    const el = lessonEl('slotA', '2026-10-05');
    expect(el.querySelector('.tt-lesson-class').textContent).toBe('1A');
    expect(el.querySelector('.tt-lesson-subject').textContent).toContain('Mathematik');
    expect(css).toMatch(/\.tt-lesson-class\{[^}]*text-overflow:ellipsis/);
    expect(css).toMatch(/\.tt-lesson-subject\{[^}]*text-overflow:ellipsis/);
  });

  it('Stunde ohne Klasse: Fach als Titel', () => {
    app('jumpToDate("2026-09-09")');
    expect(lessonEl('slotAB', '2026-09-09').querySelector('.tt-lesson-class').textContent).toBe('Physik');
  });

  it('laufende Stunde hervorgehoben mit Restzeit, nächste Stunde dezent markiert', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 9, 7, 30)); // Mi 09.09.2026, vor dem 1. Block
    app('db.lessonSlots.push({ id: "slotW1", day: 2, block: 1, subject: "Deutsch", recurring: "weekly", color: "#6366f1", part: "full" })');
    app('renderTimetable()');
    expect(lessonEl('slotW1', '2026-09-09').classList.contains('next')).toBe(true);
    expect(grid().querySelectorAll('.tt-lesson.running').length).toBe(0);

    vi.setSystemTime(new Date(2026, 8, 9, 8, 52)); // 1. Block 07:45–09:15 → noch 23 min
    app('renderTimetable()');
    const running = lessonEl('slotW1', '2026-09-09');
    expect(running.classList.contains('running')).toBe(true);
    expect(running.textContent).toContain('läuft noch 23 min');
    expect(lessonEl('slotAB', '2026-09-09').classList.contains('next')).toBe(true);
    expect(grid().querySelectorAll('.tt-lesson.next').length).toBe(1);
  });

  it('andere Wochen zeigen keine laufende/nächste Stunde', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 5, 8, 0)); // Mo 05.10.2026 im 1. Block
    app('jumpToDate("2026-10-12")');
    expect(grid().querySelectorAll('.tt-lesson.running, .tt-lesson.next').length).toBe(0);
    app('jumpToDate("2026-10-05")');
    expect(lessonEl('slotA', '2026-10-05').classList.contains('running')).toBe(true);
  });

  it('Status-Symbole für Inhalt, Hausaufgabe und Test', () => {
    app(`db.lessonData['slotA_2026-10-05'] = { done: 'Brüche', hwEnabled: true, hwItems: [{ text: 'S. 12' }],
      testEnabled: true, testItems: [{ text: 'KA' }] }`);
    app('jumpToDate("2026-10-05")');
    const kinds = [...lessonEl('slotA', '2026-10-05').querySelectorAll('.tt-status')].map(s => s.dataset.kind);
    expect(kinds).toEqual(expect.arrayContaining(['inhalt', 'hw', 'test']));
    expect(lessonEl('slotA', '2026-10-05').querySelector('.tt-status[data-kind="hw"]').getAttribute('title')).toBe('Hausaufgabe');
    // nur eine Notiz (Beispieldaten 12.10.) → nur das Notiz-Symbol
    app('jumpToDate("2026-10-12")');
    expect([...lessonEl('slotA', '2026-10-12').querySelectorAll('.tt-status')].map(s => s.dataset.kind)).toEqual(['notiz']);
  });

  it('Restzeit zählt mit, wenn der Plan offen bleibt', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 5, 8, 52)); // Mo 05.10.2026, 1. Block
    app('switchView("timetable")');
    app('jumpToDate("2026-10-05")');
    expect(lessonEl('slotA', '2026-10-05').textContent).toContain('läuft noch 23 min');
    vi.setSystemTime(new Date(2026, 9, 5, 8, 53));
    app('refreshTimetableClock()');
    expect(lessonEl('slotA', '2026-10-05').textContent).toContain('läuft noch 22 min');
  });
});
