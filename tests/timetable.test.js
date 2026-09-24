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
  return document.getElementById('timetable-grid').innerHTML.includes(`openLessonDetail('${slotId}','${dateStr}')`);
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
