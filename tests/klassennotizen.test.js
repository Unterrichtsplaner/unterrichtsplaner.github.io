// Klassennotizen (AD15): kurze Notizen pro Klasse, wahlweise „gilt bis“.
// Sichtbar in Klassenliste, Dashboard, Stundenplan (nur Symbol) und Stunden-Fenster – nie im Sitzplan.
const { loadApp, app } = require('./helpers/load-app');

// Heute: Mo 09.11.2026, 7:00. 7a hat Mo 1. Block, 7b Di 1. Block.
const st = (id, n) => ({ id, firstName: n, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] });
function sampleDB(notesA = [], notesB = []) {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [
      { id: 'mo', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#3d63dd', groupId: 'g1', recurring: 'weekly' },
      { id: 'di', day: 1, block: 1, part: 'full', subject: 'Mathe', color: '#3d63dd', groupId: 'g2', recurring: 'weekly' },
    ],
    lessonData: {},
    groups: [
      { id: 'g1', subject: 'Mathe', className: '7a', color: '#3d63dd', schularbeitWeight: 50, classNotes: notesA },
      { id: 'g2', subject: 'Mathe', className: '7b', color: '#3d63dd', schularbeitWeight: 50, classNotes: notesB },
    ],
    students: { g1: [st('a', 'Anna')], g2: [st('b', 'Ben')] },
    supervisions: [],
  };
}
const N = (id, text, extra = {}) => ({ id, text, date: '2026-11-02', ...extra });
const g1 = () => app('db.groups[0]');
const isOpen = id => !document.getElementById(id).classList.contains('hidden');
const row = name => [...document.querySelectorAll('.class-row')].find(r => r.querySelector('.cr-name').textContent === name);
const type = (text, until = '') => {
  document.getElementById('class-note-text').value = text;
  document.getElementById('class-note-until').value = until;
};

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 9, 7, 0));
  app('db = ' + JSON.stringify(sampleDB()));
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  window.confirm = () => true;
  window.innerWidth = 1024;
});
afterEach(() => {
  if (isOpen('modal-class-notes')) app('closeModal("modal-class-notes")');
  app('switchView("dashboard")');
  vi.useRealTimers();
});

describe('Klassenliste', () => {
  it('zeigt gültige Notizen unter der Klasse, abgelaufene nicht', () => {
    app(`db.groups[0].classNotes = ${JSON.stringify([N('n1', 'schon unterrichtet'), N('n2', 'Klassenfahrt', { until: '2026-11-13' }), N('n3', 'alt', { until: '2026-11-06' })])}`);
    app('switchView("classes")');
    const r = row('7a');
    expect(r.classList.contains('has-notes')).toBe(true);
    const chips = [...r.querySelectorAll('.cr-notes .cn-chip')].map(c => c.textContent);
    expect(chips).toEqual(['schon unterrichtet', 'Klassenfahrt bis 13.11.']);
    expect(row('7b').querySelector('.cr-notes')).toBeNull();
    expect(row('7b').classList.contains('has-notes')).toBe(false);
  });

  it('jede Zeile hat einen Knopf „Notizen“, der das Fenster öffnet (ohne die Klasse zu öffnen)', () => {
    app('switchView("classes")');
    const btn = row('7b').querySelector('.cr-notes-btn');
    expect(btn.getAttribute('aria-label')).toBe('Notizen 7b');
    expect(btn.getAttribute('onclick')).toMatch(/event\.stopPropagation\(\);openClassNotes\("g2"\)/);
    app('openClassNotes("g2")');
    expect(isOpen('modal-class-notes')).toBe(true);
    expect(document.getElementById('class-notes-title').textContent).toBe('Notizen 7b Mathe');
  });
});

describe('Fenster „Notizen“', () => {
  it('Hinzufügen mit und ohne „gilt bis“, zählt als Änderung (saveDB)', () => {
    app('openClassNotes("g1")');
    const before = app('db.settings.lastModified');
    type('schon unterrichtet');
    expect(app('saveClassNoteFromForm()')).toBe(true);
    type('Klassenfahrt', '2026-11-13');
    app('saveClassNoteFromForm()');
    expect(g1().classNotes.map(n => [n.text, n.until, n.date])).toEqual([
      ['schon unterrichtet', undefined, '2026-11-09'], ['Klassenfahrt', '2026-11-13', '2026-11-09']]);
    expect(app('db.settings.lastModified')).not.toBe(before);
    expect(document.getElementById('class-note-text').value).toBe('');
    expect([...document.querySelectorAll('#class-notes-list .cn-text span')].map(s => s.textContent)).toEqual(['schon unterrichtet', 'Klassenfahrt']);
    expect(document.getElementById('class-note-text').getAttribute('onkeydown')).toMatch(/Enter.*saveClassNoteFromForm\(\)/);
  });

  it('leerer Text wird nicht gespeichert', () => {
    app('openClassNotes("g1")');
    type('   ');
    expect(app('saveClassNoteFromForm()')).toBe(false);
    expect(g1().classNotes).toEqual([]);
  });

  it('Schließen (✕, Escape, daneben tippen) übernimmt Eingetipptes, statt es zu verwerfen', () => {
    app('openClassNotes("g1")');
    type('Stühle nicht hochgestellt');
    app('closeTopModal()');
    expect(isOpen('modal-class-notes')).toBe(false);
    expect(g1().classNotes.map(n => n.text)).toEqual(['Stühle nicht hochgestellt']);
  });

  it('Antippen einer Notiz lädt sie ins Formular, Speichern ändert dieselbe Notiz', () => {
    app(`db.groups[0].classNotes = ${JSON.stringify([N('n1', 'Klassenfahrt', { until: '2026-11-13' })])}`);
    app('openClassNotes("g1")');
    const note = g1().classNotes[0];
    document.querySelector('#class-notes-list .cn-text').click();
    expect(document.getElementById('class-note-text').value).toBe('Klassenfahrt');
    expect(document.getElementById('class-note-until').value).toBe('2026-11-13');
    expect(document.getElementById('btn-class-note-save').textContent).toBe('Speichern');
    type('Klassenfahrt nach Berlin', '');
    app('saveClassNoteFromForm()');
    expect(g1().classNotes).toHaveLength(1);
    expect(g1().classNotes[0]).toBe(note);
    expect(note.text).toBe('Klassenfahrt nach Berlin');
    expect(note.until).toBeUndefined();
  });

  it('Bearbeiten ohne Änderung und dann Schließen legt keine zweite Notiz an', () => {
    app(`db.groups[0].classNotes = ${JSON.stringify([N('n1', 'schon unterrichtet')])}`);
    app('openClassNotes("g1")');
    document.querySelector('#class-notes-list .cn-text').click();
    app('closeTopModal()');
    expect(g1().classNotes).toHaveLength(1);
  });

  it('Löschen per Papierkorb mit „Rückgängig“', () => {
    app(`db.groups[0].classNotes = ${JSON.stringify([N('n1', 'eins'), N('n2', 'zwei')])}`);
    app('openClassNotes("g1")');
    document.querySelectorAll('#class-notes-list .cn-del')[0].click();
    expect(g1().classNotes.map(n => n.text)).toEqual(['zwei']);
    const undo = [...document.querySelectorAll('.toast-undo button')].pop();
    expect(undo.textContent).toBe('Rückgängig');
    undo.click();
    expect(g1().classNotes.map(n => n.text)).toEqual(['eins', 'zwei']);
  });

  it('wurde die Notiz inzwischen entfernt (z. B. Sync), löscht der Papierkorb nichts anderes', () => {
    app(`db.groups[0].classNotes = ${JSON.stringify([N('n1', 'eins'), N('n2', 'zwei')])}`);
    app('openClassNotes("g1")');
    const btn = document.querySelectorAll('#class-notes-list .cn-del')[0];
    app('db.groups[0].classNotes = db.groups[0].classNotes.slice(1).map(n => ({ ...n }))');
    btn.click();
    expect(g1().classNotes.map(n => n.text)).toEqual(['zwei']);
  });

  it('abgelaufene Notizen stehen unten unter „Abgelaufen“ und lassen sich löschen', () => {
    app(`db.groups[0].classNotes = ${JSON.stringify([N('n1', 'alt', { until: '2026-11-06' }), N('n2', 'neu')])}`);
    app('openClassNotes("g1")');
    const items = [...document.querySelectorAll('#class-notes-list .cn-item')];
    expect(items.map(i => i.querySelector('span').textContent)).toEqual(['neu', 'alt']);
    expect(items[1].classList.contains('is-expired')).toBe(true);
    expect(items[1].textContent).toMatch(/galt bis/);
    expect(document.querySelector('#class-notes-list .cn-sub').textContent).toBe('Abgelaufen');
  });

  it('Texte aus anderen Klassen zum Antippen („schon unterrichtet“ nicht 18-mal tippen)', () => {
    app(`db.groups[1].classNotes = ${JSON.stringify([N('n1', 'schon unterrichtet'), N('n2', 'alt', { until: '2026-11-06' })])}`);
    app('openClassNotes("g1")');
    const chips = [...document.querySelectorAll('#class-note-suggestions .cn-suggest')];
    expect(chips.map(c => c.textContent)).toEqual(['schon unterrichtet']);   // abgelaufene nicht
    chips[0].click();
    expect(g1().classNotes.map(n => n.text)).toEqual(['schon unterrichtet']);
    // schon vorhanden: kein Vorschlag mehr
    expect(document.getElementById('class-note-suggestions').classList.contains('hidden')).toBe(true);
  });

  it('ein Vorschlag mit „gilt bis“ übernimmt das Datum mit (Klassenfahrt des ganzen Jahrgangs)', () => {
    app(`db.groups[1].classNotes = ${JSON.stringify([N('n1', 'auf Klassenfahrt', { until: '2026-11-13' })])}`);
    app('openClassNotes("g1")');
    const chip = document.querySelector('#class-note-suggestions .cn-suggest');
    expect(chip.textContent).toBe('auf Klassenfahrt bis 13.11.');
    chip.click();
    expect(g1().classNotes.map(n => [n.text, n.until])).toEqual([['auf Klassenfahrt', '2026-11-13']]);
  });

  it('Klasse inzwischen gelöscht: Fehlermeldung statt stiller Ablage', () => {
    app('openClassNotes("g1")');
    app('db.groups = db.groups.filter(g => g.id !== "g1")');
    type('x');
    expect(app('saveClassNoteFromForm()')).toBe(false);
  });

  it('Bearbeiten der Klasse (Name, Farbe) lässt die Notizen stehen', () => {
    app(`db.groups[0].classNotes = ${JSON.stringify([N('n1', 'eins')])}`);
    app('openEditGroup("g1")');
    document.getElementById('new-group-class').value = '7c';
    app('saveSubjectGroup()');
    expect(g1().className).toBe('7c');
    expect(g1().classNotes.map(n => n.text)).toEqual(['eins']);
  });
});

describe('Dashboard, Stundenplan, Stunden-Fenster', () => {
  beforeEach(() => {
    app(`db.groups[0].classNotes = ${JSON.stringify([N('n1', 'Stühle nicht hochgestellt'), N('n2', 'Klassenfahrt', { until: '2026-11-09' })])}`);
  });

  it('Dashboard: heutige Stunde zeigt die Notizen der Klasse', () => {
    app('switchView("dashboard")');
    const lesson = document.querySelector('.dash-lesson[data-slot="mo"]');
    expect([...lesson.querySelectorAll('.dash-lesson-cnotes .cn-chip')].map(c => c.textContent))
      .toEqual(['Stühle nicht hochgestellt', 'Klassenfahrt bis 09.11.']);    // Karte „Nächste Stunde“ ebenso (sonst stünde dort „Keine Notizen“)
    const nextCard = document.querySelector('.dash-next[data-slot="mo"]');
    expect(nextCard.querySelector('.dash-next-cnotes').textContent).toMatch(/Stühle nicht hochgestellt/);
    expect(nextCard.textContent).not.toMatch(/Keine Notizen/);
  });

  it('Stundenplan: nur ein Symbol auf der Kachel, ab heute und solange die Notiz gilt', () => {
    app('timetableMode = "week"; currentWeekOffset = 0; switchView("timetable")');
    const marks = () => [...document.querySelectorAll('.tt-lesson[data-slot="mo"]')].map(l => [l.dataset.date, !!l.querySelector('.tt-status-klasse')]);
    expect(marks()).toEqual([['2026-11-09', true]]);
    const tile = document.querySelector('.tt-lesson[data-slot="mo"]');
    expect(tile.textContent).not.toMatch(/Stühle/);            // kein Text auf der Kachel
    app('db.groups[0].classNotes = db.groups[0].classNotes.filter(n => n.until)'); // nur noch „bis 09.11.“
    app('navigateWeek(1)');
    expect(marks()).toEqual([['2026-11-16', false]]);
    app('navigateWeek(-2)');
    expect(marks()).toEqual([['2026-11-02', false]]);          // vergangene Stunde: kein Hinweis
  });

  it('Tagesansicht (iPad/Laptop): Notizen ausgeschrieben unter dem Thema, Symbole dafür entfallen (AD16)', () => {
    app('db.lessonData["mo_2026-11-09"] = { notes: "Ben Arbeitsblatt nachreichen\\nzweite Zeile" }');
    app('switchView("timetable"); setTimetableMode("day"); setTimetableDay(parseDate("2026-11-09")); renderTimetable()');
    const tile = document.querySelector('.tt-lesson[data-slot="mo"]');
    const parts = [...tile.querySelectorAll('.tt-lesson-notes .tt-note-part')].map(p => p.textContent);
    expect(parts).toEqual(['Stühle nicht hochgestellt · Klassenfahrt', 'Ben Arbeitsblatt nachreichen']);   // nur erste Zeile
    expect(tile.querySelector('.tt-note-part .ico')).not.toBeNull();
    expect(tile.classList.contains('has-side-notes')).toBe(true);
    app('setTimetableMode("week")');
  });

  it('Tagesansicht, vergangener Tag: nur die Stunden-Notiz (Klassennotizen gelten ab heute)', () => {
    app('db.lessonData["mo_2026-11-02"] = { notes: "Stühle!" }');
    app('switchView("timetable"); setTimetableMode("day"); setTimetableDay(parseDate("2026-11-02")); renderTimetable()');
    const tile = document.querySelector('.tt-lesson[data-slot="mo"]');
    expect([...tile.querySelectorAll('.tt-note-part')].map(p => p.textContent)).toEqual(['Stühle!']);
    app('setTimetableMode("week")');
  });

  it('Tagesansicht ohne Notizen: keine Notizzeile; Woche: nie ausgeschrieben', () => {
    app('db.groups[0].classNotes = []');
    app('switchView("timetable"); setTimetableMode("day"); setTimetableDay(parseDate("2026-11-09")); renderTimetable()');
    expect(document.querySelector('.tt-lesson[data-slot="mo"] .tt-lesson-notes')).toBeNull();
    app('setTimetableMode("week")');
    app('db.groups[0].classNotes = [{ id: "x", text: "Stühle" }]; renderTimetable()');
    expect(document.querySelector('.tt-lesson-notes')).toBeNull();
  });

  it('CSS: Notizzeile nur ab 700 px, abgekürzt mit „…“, Symbole nur dann ausgeblendet', () => {
    const CSS = require('fs').readFileSync(require('path').join(__dirname, '..', 'style.css'), 'utf8');
    expect(CSS).toMatch(/\.tt-lesson-side\{display:none;\}/);
    const wide = CSS.match(/@media \(min-width: 700px\)\{   \/\* Tagesansicht auf iPad\/PC[\s\S]*?\n\}/)[0];
    expect(wide).toMatch(/\.tt-note-part > span\{[^}]*text-overflow:ellipsis/);
    expect(wide).toMatch(/\.has-side-notes \.tt-status-notiz/);
    // Einzelstunden: in der Zeile, Symbole danach (sonst lag das Inhalts-Symbol über dem Thema)
    expect(wide).toMatch(/\.tt-cell\.tt-short \.tt-lesson-side\{position:static;/);
    expect(wide).toMatch(/\.tt-cell\.tt-short \.tt-lesson-foot\{order:2;\}/);
  });

  it('Stunden-Fenster: Notizen oben, „Ändern“ öffnet das Notizen-Fenster darüber', () => {
    app('openLessonDetail("mo", "2026-11-09")');
    const box = document.getElementById('lesson-class-notes');
    expect(box.classList.contains('hidden')).toBe(false);
    expect(box.textContent).toMatch(/Stühle nicht hochgestellt/);
    box.querySelector('.lcn-btn').click();
    expect(isOpen('modal-class-notes')).toBe(true);
    expect(isOpen('modal-lesson')).toBe(true);
    document.querySelectorAll('#class-notes-list .cn-del')[0].click();
    expect(box.textContent).not.toMatch(/Stühle/);             // Stunden-Fenster zieht nach
    app('closeTopModal()');
    expect(isOpen('modal-lesson')).toBe(true);
    app('closeModal("modal-lesson")');
  });

  it('Stunde einer Klasse ohne Notizen: kein Kasten', () => {
    app('openLessonDetail("di", "2026-11-10")');
    expect(document.getElementById('lesson-class-notes').classList.contains('hidden')).toBe(true);
    app('closeModal("modal-lesson")');
  });

  it('Sitzplan zeigt Klassennotizen nie (Beamer)', () => {
    vi.setSystemTime(new Date(2026, 10, 9, 8, 10));   // Stunde der 7a läuft: Cockpit sichtbar
    app('openSeatingForGroup("g1")');
    expect(document.getElementById('view-seating').textContent).not.toMatch(/Stühle|Klassenfahrt/);
    if (app('typeof openSeatingToday') === 'function') {
      app('openSeatingToday()');
      expect(document.getElementById('modal-seating-today').textContent).not.toMatch(/Stühle|Klassenfahrt/);
      app('closeModal("modal-seating-today")');
    }
  });
});

describe('Layout (jsdom misst nicht, im Browser bei 375/768/1024 px nachgemessen)', () => {
  const CSS = require('fs').readFileSync(require('path').join(__dirname, '..', 'style.css'), 'utf8');
  it('schmale Klassenzeile mit Notizen: Regel steht hinter der breiten, sonst gewinnt die breite (4 Spalten auf dem Handy)', () => {
    const wide = CSS.indexOf('.class-row.has-notes{grid-template-areas:"name meta nums btns"');
    const narrow = CSS.indexOf('.class-row.has-notes{grid-template-areas:"name meta" "name notes"');
    expect(wide).toBeGreaterThan(-1);
    expect(narrow).toBeGreaterThan(wide);
  });
});
