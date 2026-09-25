// Block M (Review 25.09.2026): Stundenplan, Stunden-Fenster, Dashboard.
const { loadApp, app } = require('./helpers/load-app');

// Freitag, 25.09.2026, 10:00 – 7b hat Mo (Block 1) und Mi (Block 1), die freie „AG Robotik“ Mo + Mi (Block 3)
const NOW = new Date('2026-09-25T10:00:00');
function sampleDB() {
  return {
    settings: { teacherName: 'Test', school: '', blocks: null },
    lessonSlots: [
      { id: 'mo', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
      { id: 'mi', day: 2, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
      { id: 'fr', day: 4, block: 3, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
      { id: 'agMo', day: 0, block: 3, part: 'full', subject: 'AG Robotik', color: '#8b5cf6', groupId: null, recurring: 'weekly' },
      { id: 'agMi', day: 2, block: 3, part: 'full', subject: 'ag robotik ', color: '#8b5cf6', groupId: null, recurring: 'weekly' },
    ],
    lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#6366f1', schularbeitWeight: 50 }],
    students: {
      g1: [
        { id: 's1', firstName: 'Anna', lastName: 'Zander', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] },
        { id: 's2', firstName: '', lastName: 'Max', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] },
      ],
    },
  };
}

const slot = id => app('db').lessonSlots.find(s => s.id === id);
const toasts = () => document.getElementById('toast-container').textContent;
const hidden = id => document.getElementById(id).classList.contains('hidden');
const flush = () => new Promise(r => setTimeout(r, 0));

function shownOn(slotId, dateStr) {
  app(`jumpToDate('${dateStr}')`);
  const want = `openLessonDetail(${JSON.stringify(slotId)},${JSON.stringify(dateStr)})`;
  return [...document.querySelectorAll('#timetable-grid [onclick]')].some(el => el.getAttribute('onclick') === want);
}
function addHW(slotId, dateStr, text, target) {
  app(`openLessonDetail('${slotId}', '${dateStr}')`);
  document.getElementById('new-hw-text').value = text;
  document.getElementById('new-hw-date').value = target;
  app('addHWItem()');
}
// Auswahl-Fenster (askChoice) beantworten
async function choose(labelPart) {
  await vi.waitFor(() => expect(hidden('modal-choice')).toBe(false));
  const btn = [...document.querySelectorAll('#modal-choice-buttons button')].find(b => b.textContent.includes(labelPart));
  expect(btn, `Knopf „${labelPart}“`).toBeTruthy();
  btn.click();
  await flush();
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
  app('db = ' + JSON.stringify(sampleDB()));
  app('currentWeekOffset = 0; timetableDay = null; editingSlotId = null; activeLessonId = null; activeLessonDate = null');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
  window.confirm = () => true;
});

describe('M1: Dashboard bleibt aktuell', () => {
  it('„Stunde entfällt“ im Stunden-Fenster: Dashboard zeigt sie nicht mehr als nächste Stunde', () => {
    app('switchView("dashboard")');
    expect(document.getElementById('dashboard-content').textContent).toContain('Nächste Stunde');
    app(`openLessonDetail('fr', '2026-09-25')`);
    app('toggleAusfall()');
    app('saveLessonDataAndClose()');
    const card = document.querySelector('#dashboard-content .dash-next');
    expect(card ? card.getAttribute('data-slot') : null).not.toBe('fr');
  });

  it('bleibt die App über Nacht offen, springt „Heute“ auf den neuen Tag', () => {
    app('switchView("dashboard")');
    expect(document.getElementById('dashboard-content').textContent).toContain('25.09.');
    vi.setSystemTime(new Date('2026-09-28T07:00:00'));
    app('refreshTimetableClock()');
    expect(document.getElementById('dashboard-content').textContent).toContain('28.09.');
  });
});

describe('M3: freie Stunden mit mehreren Terminen', () => {
  it('HA aus der Montags-AG erscheint in der Mittwochs-AG und im Dashboard', () => {
    addHW('agMo', '2026-09-28', 'Roboter bauen', '2026-09-30');
    expect(app(`getIncomingItems('agMi', '2026-09-30')`).hw.map(i => i.text)).toEqual(['Roboter bauen']);
    expect(app(`dueItemsFor('agMi', '2026-09-30')`).hw).toHaveLength(1);
  });

  it('Vorschläge und Fälligkeit folgen derselben Regel', () => {
    const dates = app(`findUpcomingLessonDates('agMo', '2026-09-28')`).map(u => u.dateStr);
    expect(dates[0]).toBe('2026-09-30');
  });
});

describe('M4: Datumsvorschläge nur für Stunden, die stattfinden', () => {
  it('ausgefallene Stunde wird nicht vorgeschlagen', () => {
    app('db').lessonData['mi_2026-09-30'] = { ausfall: true };
    const dates = app(`findUpcomingLessonDates('mo', '2026-09-28')`).map(u => u.dateStr);
    expect(dates).not.toContain('2026-09-30');
    expect(dates[0]).toBe('2026-10-02');
  });

  it('durch Vertretung ersetzte Stunde wird nicht vorgeschlagen', () => {
    app('db').lessonSlots.push({ id: 'vt', day: 2, block: 1, part: 'full', subject: 'Vertretung', color: '#000000', groupId: null, recurring: 'none', specificDate: '2026-09-30' });
    const dates = app(`findUpcomingLessonDates('mo', '2026-09-28')`).map(u => u.dateStr);
    expect(dates).not.toContain('2026-09-30');
  });
});

describe('M5: HA-Schalter aus', () => {
  it('HA ist in der Zielstunde nicht mehr fällig', () => {
    addHW('mo', '2026-09-28', 'S. 12', '2026-09-30');
    app(`openLessonDetail('mo', '2026-09-28')`);
    document.getElementById('hw-toggle').checked = false;
    app('saveLessonDataAndClose()');
    expect(app(`getIncomingItems('mi', '2026-09-30')`).hw).toEqual([]);
    expect(app(`dueItemsFor('mi', '2026-09-30')`).hw).toEqual([]);
  });
});

describe('M6: Vertretung auf dem Platz einer regulären Stunde', () => {
  it('lässt sich anlegen, ersetzt die Stunde an diesem Tag und sagt das', () => {
    app(`openAddLessonSlot(0, 1, '2026-10-05', 'full')`);
    document.getElementById('new-lesson-subject').value = 'Vertretung 9c';
    document.getElementById('new-lesson-recurring').value = 'none';
    app('saveLessonSlot()');
    const vt = app('db').lessonSlots.find(s => s.subject === 'Vertretung 9c');
    expect(vt).toBeTruthy();
    expect(toasts()).toContain('ersetzt 7b');
    expect(shownOn(vt.id, '2026-10-05')).toBe(true);
    expect(shownOn('mo', '2026-10-05')).toBe(false);
    expect(shownOn('mo', '2026-10-12')).toBe(true);
  });

  it('zwei Vertretungen am selben Tag im selben Platz gehen weiterhin nicht', () => {
    app('db').lessonSlots.push({ id: 'vt', day: 0, block: 1, part: 'full', subject: 'V1', color: '#000000', recurring: 'none', specificDate: '2026-10-05' });
    app(`openAddLessonSlot(0, 1, '2026-10-05', 'full')`);
    document.getElementById('new-lesson-subject').value = 'V2';
    document.getElementById('new-lesson-recurring').value = 'none';
    app('saveLessonSlot()');
    expect(app('db').lessonSlots.some(s => s.subject === 'V2')).toBe(false);
  });
});

describe('M7: Stundenplanwechsel ändert die Vergangenheit nicht', () => {
  beforeEach(() => {
    app('db').lessonData['mo_2026-09-14'] = { notes: 'alt' };
    app('db').lessonData['mo_2026-10-12'] = { notes: 'neu' };
  });

  it('„ab dieser Woche“: frühere Stunden bleiben am Montag, spätere wandern auf Dienstag', async () => {
    app(`openLessonDetail('mo', '2026-10-05')`);
    app('openEditLesson()');
    document.getElementById('new-lesson-day').value = '1';
    app('saveLessonSlot()');
    await choose('Ab der Woche');
    const d = app('db').lessonData;
    const neu = app('db').lessonSlots.find(s => s.id !== 'mo' && s.groupId === 'g1' && s.day === 1);
    expect(slot('mo').validUntil).toBe('2026-10-04');
    expect(neu.validFrom).toBe('2026-10-05');
    expect(d['mo_2026-09-14']).toEqual({ notes: 'alt' });
    expect(d[`${neu.id}_2026-10-13`]).toEqual({ notes: 'neu' });
    expect(shownOn('mo', '2026-09-14')).toBe(true);
    expect(shownOn('mo', '2026-10-12')).toBe(false);
    expect(shownOn(neu.id, '2026-10-13')).toBe(true);
    expect(shownOn(neu.id, '2026-09-15')).toBe(false);
  });

  it('„alle Stunden“: wie bisher, alles wandert mit', async () => {
    app(`openLessonDetail('mo', '2026-10-05')`);
    app('openEditLesson()');
    document.getElementById('new-lesson-day').value = '1';
    app('saveLessonSlot()');
    await choose('Alle Stunden');
    expect(app('db').lessonSlots.filter(s => s.groupId === 'g1')).toHaveLength(3);
    expect(app('db').lessonData['mo_2026-09-15']).toEqual({ notes: 'alt' });
  });

  it('nur Raum geändert: keine Rückfrage', () => {
    app(`openLessonDetail('mo', '2026-10-05')`);
    app('openEditLesson()');
    document.getElementById('new-lesson-room').value = 'R 204';
    app('saveLessonSlot()');
    expect(hidden('modal-choice')).toBe(true);
    expect(slot('mo').room).toBe('R 204');
  });

  it('Überschneidung: neue Stunde darf den Platz der beendeten übernehmen', async () => {
    app(`openLessonDetail('mo', '2026-10-05')`);
    app('openEditLesson()');
    app('deleteLessonSlotFromEdit()');
    await choose('Ab der Woche');
    app(`openAddLessonSlot(0, 1, '2026-10-12', 'full')`);
    document.getElementById('new-lesson-subject').value = 'Neu ab Oktober';
    app('saveLessonSlot()');
    expect(app('db').lessonSlots.some(s => s.subject === 'Neu ab Oktober')).toBe(true);
  });

  it('Löschen „ab dieser Woche“ beendet die Stunde, frühere Notizen bleiben', async () => {
    app(`openLessonDetail('mo', '2026-10-05')`);
    app('openEditLesson()');
    app('deleteLessonSlotFromEdit()');
    await choose('Ab der Woche');
    expect(slot('mo').validUntil).toBe('2026-10-04');
    expect(app('db').lessonData['mo_2026-09-14']).toEqual({ notes: 'alt' });
    expect(app('db').lessonData['mo_2026-10-12']).toBeUndefined();
  });

  it('Löschen „komplett“ nennt die Zahl der Stunden mit Einträgen', async () => {
    app(`openLessonDetail('mo', '2026-10-05')`);
    app('openEditLesson()');
    app('deleteLessonSlotFromEdit()');
    await vi.waitFor(() => expect(hidden('modal-choice')).toBe(false));
    expect(document.getElementById('modal-choice').textContent).toContain('2 Stunden mit Notizen');
    await choose('Komplett löschen');
    expect(slot('mo')).toBeUndefined();
    expect(app('db').lessonData['mo_2026-09-14']).toBeUndefined();
  });

  it('Escape im Auswahl-Fenster bricht ab', async () => {
    app(`openLessonDetail('mo', '2026-10-05')`);
    app('openEditLesson()');
    app('deleteLessonSlotFromEdit()');
    await vi.waitFor(() => expect(hidden('modal-choice')).toBe(false));
    app('closeTopModal()');
    await flush();
    expect(slot('mo').validUntil).toBeUndefined();
    expect(hidden('modal-choice')).toBe(true);
  });
});

describe('M8–M10: Stunden-Fenster', () => {
  it('M8: freie Stunde ohne „Notenübersicht“ und „Schüler bewerten“', () => {
    app(`openLessonDetail('agMo', '2026-09-28')`);
    expect(hidden('lesson-btn-overview')).toBe(true);
    expect(hidden('lesson-btn-students')).toBe(true);
    app(`openLessonDetail('mo', '2026-09-28')`);
    expect(hidden('lesson-btn-overview')).toBe(false);
  });

  it('M9: „Schüler bewerten“ nach dem Namensformat der Einstellungen', () => {
    app(`openLessonDetail('mo', '2026-09-28')`);
    app('openQuickStudentListFromLesson()');
    const names = [...document.querySelectorAll('#lesson-students-list > div')].map(d => d.textContent);
    expect(names).toContain('Anna Zander');
    expect(names).toContain('Max');
    expect(names.join('|')).not.toContain(', ');
  });

  it('M10: jemanden als fehlend markieren → „Heute fehlen“ im offenen Stunden-Fenster', () => {
    app(`openLessonDetail('mo', '2026-09-28')`);
    app('openQuickStudentListFromLesson()');
    [...document.querySelectorAll('#lesson-students-list > div')].find(d => d.textContent === 'Anna Zander').click();
    app('setSeatingAbsence("abwesend")');
    expect(hidden('lesson-absent-container')).toBe(false);
    expect(document.getElementById('lesson-absent-list').textContent).toContain('Anna Zander');
  });
});

describe('M11–M14: Datum und Anzeige', () => {
  it('M11: Tagesansicht, Sprung auf einen Samstag zeigt den Montag danach', () => {
    window.innerWidth = 400;
    try {
      app(`jumpToDate('2026-10-10')`);
      expect(app('formatDate(timetableDayDate())')).toBe('2026-10-12');
    } finally { window.innerWidth = 1024; }
  });

  it('M12: Wochenkopf über Neujahr nennt beide Jahre', () => {
    app(`jumpToDate('2026-12-30')`);
    expect(document.getElementById('week-label').textContent).toContain('28.12.2026');
    expect(document.getElementById('week-label').textContent).toContain('01.01.2027');
  });

  it('M13: Stunde ohne Farbe legt den Stundenplan nicht lahm', () => {
    delete app('db').lessonSlots[0].color;
    expect(() => app('renderTimetable()')).not.toThrow();
    expect(document.querySelectorAll('#timetable-grid .tt-lesson').length).toBeGreaterThan(0);
  });

  it('M14: Datumsauswahl steht auf dem angezeigten Datum', () => {
    app(`jumpToDate('2026-10-05')`);
    app('navigateWeek(1)');
    expect(document.getElementById('week-date-picker').value).toBe('2026-10-12');
    app('setSeatingDate("2026-10-07"); renderSeatingDateStrip()');
    expect(document.getElementById('seating-date-hidden').value).toBe('2026-10-07');
  });
});

describe('M15: HA im Stunden-Fenster löschen', () => {
  it('löscht den angeklickten Eintrag, auch wenn sich die Liste inzwischen geändert hat', () => {
    addHW('mo', '2026-09-28', 'erste', '2026-09-30');
    addHW('mo', '2026-09-28', 'zweite', '2026-09-30');
    const buttons = document.querySelectorAll('#hw-items-list .entry-item-delete');
    // Sync o. Ä. schiebt einen Eintrag davor
    app(`db.lessonData['mo_2026-09-28'].hwItems.unshift({ id: 'x', text: 'von Gerät B', targetDate: '2026-09-30' })`);
    buttons[1].click();
    expect(app(`db.lessonData['mo_2026-09-28'].hwItems.map(i => i.text)`)).toEqual(['von Gerät B', 'erste']);
  });
});
