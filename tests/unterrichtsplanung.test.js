// Unterrichtsplanung (AD3) und Klassen-Ansicht im Stundenplan (AD4)
const { loadApp, app } = require('./helpers/load-app');

// 7a: Mo 1. Block und Do 1. Block. Heute: Mo 09.11.2026. Herbstferien vorbei, Weihnachtsferien 21.12.–01.01.
const st = (id, n) => ({ id, firstName: n, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] });
function sampleDB(plan) {
  return {
    settings: { teacherName: 'T', blocks: null, halfYearEnd: '2027-01-29',
      holidays: [{ id: 'w', label: 'Weihnachtsferien', from: '2026-12-21', until: '2027-01-01' },
                 { id: 's', label: 'Sommerferien', from: '2027-07-22', until: '2027-09-01' }] },
    lessonSlots: [
      { id: 'mo', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#3d63dd', groupId: 'g1', recurring: 'weekly' },
      { id: 'do', day: 3, block: 1, part: 'full', subject: 'Mathe', color: '#3d63dd', groupId: 'g1', recurring: 'weekly' },
    ],
    lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '7a', color: '#3d63dd', schularbeitWeight: 50, ...(plan ? { plan } : {}) }],
    students: { g1: [st('a', 'Anna')] },
    supervisions: [],
  };
}
const T = (id, title, extra = {}) => ({ id, title, ...extra });
const assign = () => {
  const r = app('planAssignments(db.groups[0], "2026-11-09")');
  const out = {};
  r.byKey.forEach((v, k) => { out[k] = v.topic.id + (v.of > 1 ? `:${v.unit}/${v.of}` : ''); });
  return { map: out, overflow: r.overflow.map(t => t.id) };
};
const flush = () => new Promise(r => setTimeout(r, 0));

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 9, 7, 0));   // Mo 09.11.2026, 7:00
  app('db = ' + JSON.stringify(sampleDB([T('t1', 'Brüche erweitern'), T('t2', 'Brüche kürzen', { lessons: 2 }), T('t3', 'Klassenarbeit', { pinned: '2026-11-26' }), T('t4', 'Dezimalzahlen')])));
  app('timetableMode = "week"; timetableClassGroupId = null; ttClassShowPast = false');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  window.confirm = () => true;
  window.innerWidth = 1024;
});
afterEach(() => { app('switchView("dashboard")'); vi.useRealTimers(); });

describe('Verteilung auf die kommenden Stunden', () => {
  it('der Reihe nach, mehrstündige Themen belegen mehrere Stunden, fester Termin bleibt', () => {
    expect(assign().map).toEqual({
      'mo_2026-11-09': 't1',
      'do_2026-11-12': 't2:1/2', 'mo_2026-11-16': 't2:2/2',
      'do_2026-11-19': 't4',
      'do_2026-11-26': 't3',          // fest am 26.11.
    });
  });

  it('fällt eine Stunde aus, rutscht alles eine Stunde weiter', () => {
    app('db.lessonData["do_2026-11-12"] = { ausfall: true }');
    expect(assign().map['mo_2026-11-16']).toBe('t2:1/2');
    expect(assign().map['do_2026-11-19']).toBe('t2:2/2');
    expect(assign().map['do_2026-11-12']).toBeUndefined();
  });

  it('Ferien zählen nicht; was nicht mehr bis Schuljahresende passt, steht in overflow', () => {
    app('db.settings.schoolYearEnd = "2026-11-19"');
    const r = assign();
    expect(r.overflow).toEqual(['t3']);   // 26.11. liegt hinter dem letzten Schultag
  });

  it('Schuljahresende ohne Einstellung = Tag vor den Sommerferien', () => {
    expect(app('schoolYearMarks("2026-11-09")')).toEqual({ halfYearEnd: '2027-01-29', yearEnd: '2027-07-21' });
  });

  it('Altdaten ohne oder mit kaputter Liste: keine Fehler, keine Themen', () => {
    app('delete db.groups[0].plan');
    expect(assign().map).toEqual({});
    app('db.groups[0].plan = { kaputt: true }');
    expect(assign().map).toEqual({});
  });
});

describe('Erledigt im Stunden-Fenster', () => {
  const box = () => document.getElementById('lesson-plan-box');
  it('zeigt „Geplant“; Erledigt trägt den Titel ins leere Inhaltsfeld und wird mit dem Fenster gespeichert', () => {
    app('openLessonDetail("mo", "2026-11-09")');
    expect(box().textContent).toMatch(/Geplant\s*Brüche erweitern/);
    box().querySelector('[data-act="toggle"]').click();
    expect(app('db.groups[0].plan[0].done')).toBe('2026-11-09');
    expect(document.getElementById('lesson-done-text').value).toBe('Brüche erweitern');
    expect(box().textContent).toMatch(/Erledigt\s*Brüche erweitern/);
    app('saveLessonDataAndClose()');
    expect(app('db.lessonData["mo_2026-11-09"].done')).toBe('Brüche erweitern');
  });

  it('ein schon getippter Inhalt bleibt; rückgängig macht das Thema wieder offen', () => {
    app('openLessonDetail("mo", "2026-11-09")');
    document.getElementById('lesson-done-text').value = 'Einstieg mit Pizza';
    box().querySelector('[data-act="toggle"]').click();
    expect(document.getElementById('lesson-done-text').value).toBe('Einstieg mit Pizza');
    box().querySelector('[data-act="toggle"]').click();
    expect(app('db.groups[0].plan[0].done')).toBeUndefined();
    expect(app('db.groups[0].plan[0].doneLessons')).toBeUndefined();
  });

  it('nach Erledigt rückt die Reihe nicht in dieselbe Stunde nach', () => {
    app('openLessonDetail("mo", "2026-11-09")');
    box().querySelector('[data-act="toggle"]').click();
    app('saveLessonDataAndClose()');
    const m = assign().map;
    expect(m['mo_2026-11-09']).toBeUndefined();
    expect(m['do_2026-11-12']).toBe('t2:1/2');
  });

  it('nicht erledigt: am nächsten Tag rutscht das Thema in die nächste Stunde', () => {
    vi.setSystemTime(new Date(2026, 10, 10, 8, 0));   // Di
    const r = app('planAssignments(db.groups[0])');
    expect(r.byKey.get('do_2026-11-12').topic.id).toBe('t1');
  });

  it('zweistündiges Thema: erst nach der zweiten Stunde erledigt', () => {
    app('db.groups[0].plan[0].done = "2026-11-05"');   // t1 schon fertig
    app('openLessonDetail("mo", "2026-11-09")');
    expect(box().textContent).toMatch(/Stunde 1 von 2/);
    box().querySelector('[data-act="toggle"]').click();
    expect(app('db.groups[0].plan[1].done')).toBeUndefined();
    app('saveLessonDataAndClose()');
    app('openLessonDetail("do", "2026-11-12")');
    expect(box().textContent).toMatch(/Stunde 2 von 2/);
    box().querySelector('[data-act="toggle"]').click();
    expect(app('db.groups[0].plan[1].done')).toBe('2026-11-12');
    app('saveLessonDataAndClose()');
  });

  it('ohne Thema: Hinweis mit Weg zur Planung; Stunde ohne Klasse: nichts', () => {
    app('db.groups[0].plan = []');
    app('openLessonDetail("mo", "2026-11-09")');
    expect(box().textContent).toContain('Kein Thema geplant');
    app('saveLessonDataAndClose()');
    app(`db.lessonSlots.push({ id: 'frei', day: 1, block: 2, part: 'full', subject: 'AG', color: '#999', recurring: 'weekly' })`);
    app('openLessonDetail("frei", "2026-11-10")');
    expect(box().classList.contains('hidden')).toBe(true);
    app('saveLessonDataAndClose()');
  });
});

describe('Reiter „Planung“ in der Klassenansicht', () => {
  const open = () => app('switchView("classes"); openGroupStudents("g1"); switchClassDashboardTab("plan")');
  const rows = () => [...document.querySelectorAll('#overview-content .plan-view > .plan-list .plan-row')].map(r => r.querySelector('b').textContent);
  it('Liste mit Termin je Thema und Stundenzahl bis Halbjahr/Schuljahresende', () => {
    open();
    expect(rows()).toEqual(['Brüche erweitern', 'Brüche kürzen', 'Klassenarbeit', 'Dezimalzahlen']);
    const text = document.getElementById('overview-content').textContent.replace(/\s+/g, ' ');
    expect(text).toMatch(/Noch \d+ Stunden bis zum Halbjahr/);
    expect(text).toMatch(/bis Schuljahresende/);
    expect(text).toMatch(/Geplant: 5 Stunden/);
    expect(text).toMatch(/Do\.?,? 26\.11\.?.*fest/);
  });

  it('mehrere Zeilen einfügen = mehrere Themen (Nummern/Striche weg)', () => {
    open();
    app('openPlanTopicForm("g1", null)');
    document.getElementById('plan-topic-title').value = '1. Prozente\n- Zinsen\n\n• Diagramme';
    app('savePlanTopic()');
    expect(rows().slice(-3)).toEqual(['Prozente', 'Zinsen', 'Diagramme']);
  });

  it('bearbeiten (per Objekt), nach oben schieben, löschen mit Rückgängig', () => {
    open();
    const t = app('db.groups[0].plan[3]');
    app('openPlanTopicForm("g1", db.groups[0].plan[3])');
    document.getElementById('plan-topic-title').value = 'Dezimalzahlen einführen';
    document.getElementById('plan-topic-lessons').value = '3';
    app('savePlanTopic()');
    expect(app('db.groups[0].plan[3]')).toMatchObject({ title: 'Dezimalzahlen einführen', lessons: 3 });
    document.querySelectorAll('#overview-content .plan-view > .plan-list .plan-row')[3].querySelector('[data-act="up"]').click();
    expect(rows()[2]).toBe('Dezimalzahlen einführen');
    app('openPlanTopicForm("g1", db.groups[0].plan[2])');
    app('deletePlanTopicFromForm()');
    expect(rows()).not.toContain('Dezimalzahlen einführen');
    document.querySelector('.toast-undo button').click();
    expect(rows()[2]).toBe('Dezimalzahlen einführen');
  });

  it('Schließen mit Änderungen fragt nach; „Nein“ lässt das Fenster offen', () => {
    open();
    app('openPlanTopicForm("g1", null)');
    document.getElementById('plan-topic-title').value = 'Neu';
    window.confirm = () => false;
    app('closeModalLikeButton("modal-plan-topic")');
    expect(document.getElementById('modal-plan-topic').classList.contains('hidden')).toBe(false);
    window.confirm = () => true;
    app('closeModalLikeButton("modal-plan-topic")');
    expect(document.getElementById('modal-plan-topic').classList.contains('hidden')).toBe(true);
    expect(rows()).not.toContain('Neu');
  });

  it('von Hand erledigt: wandert in „Erledigt“', () => {
    open();
    app('openPlanTopicForm("g1", db.groups[0].plan[0])');
    app('togglePlanTopicDoneFromForm()');
    expect(rows()).not.toContain('Brüche erweitern');
    expect(document.querySelector('#overview-content .plan-done summary').textContent).toBe('Erledigt (1)');
  });
});

describe('Stundenplan: Woche · Tag · Klasse', () => {
  it('Klasse: Liste der Stunden mit Thema, Halbjahr-Markierung, Klick öffnet die Stunde; Modus wird gemerkt', () => {
    app('switchView("timetable"); setTimetableMode("class")');
    expect(localStorage.getItem('tt_mode')).toBe('class');
    expect(document.getElementById('view-timetable').classList.contains('tt-class-mode')).toBe(true);
    const rows = [...document.querySelectorAll('.ttc-row')];
    expect(rows[0].textContent.replace(/\s+/g, ' ')).toMatch(/Mo\.?,? 09\.11\.?.*Brüche erweitern/);
    expect(rows[1].textContent).toMatch(/Brüche kürzen \(1\/2\)/);
    expect(document.querySelector('.ttc-mark').textContent).toMatch(/Halbjahr · 29\.01\./);
    expect(document.querySelector('.ttc-counts').textContent).toMatch(/Noch \d+ Stunden bis zum Halbjahr/);
    rows[0].click();
    expect(document.getElementById('modal-lesson').classList.contains('hidden')).toBe(false);
    expect(app('activeLessonId')).toBe('mo');
    app('saveLessonDataAndClose()');
    app('setTimetableMode("week")');
  });

  it('Klasse ohne Thema: „+ Thema“ öffnet das Themen-Fenster', () => {
    app('db.groups[0].plan = []');
    app('switchView("timetable"); setTimetableMode("class")');
    document.querySelector('.ttc-row [data-act="add"]').click();
    expect(document.getElementById('modal-plan-topic').classList.contains('hidden')).toBe(false);
    app('closeModal("modal-plan-topic"); setTimetableMode("week")');
  });

  it('Tag auch auf dem iPad; die Kachel zeigt das geplante Thema', () => {
    app('switchView("timetable"); setTimetableMode("day"); setTimetableDay(parseDate("2026-11-09")); renderTimetable()');
    expect(document.getElementById('timetable-grid').classList.contains('day-view')).toBe(true);
    expect(document.querySelector('.tt-lesson .tt-lesson-topic').textContent).toBe('Brüche erweitern');
    app('setTimetableMode("week")');
    expect(document.getElementById('timetable-grid').classList.contains('day-view')).toBe(false);
  });

  it('Handy: statt Woche · Tag · Klasse ein Knopf Tag ↔ Klasse (Platz im Kopf)', () => {
    const css = require('fs').readFileSync(require('path').join(__dirname, '..', 'style.css'), 'utf8');
    const phone = css.match(/@media \(max-width: 699px\)\{\.tt-print-btn[^@]*?\}\}/)[0];
    expect(phone).toMatch(/\.tt-mode\{display:none;\}/);
    expect(phone).toMatch(/\.tt-mode-compact\{display:flex;\}/);
    expect(phone).toMatch(/\.tt-print-btn\{display:none;\}/);   // Datum braucht den Platz
    expect(document.getElementById('btn-tt-classmode').getAttribute('onclick')).toBe("setTimetableMode(timetableMode === 'class' ? 'week' : 'class')");
  });
});

describe('Einstellungen: Halbjahr und letzter Schultag', () => {
  it('speichern und leeren', () => {
    app('openSettings()');
    document.getElementById('settings-half-year').value = '2027-01-31';
    document.getElementById('settings-year-end').value = '2027-07-20';
    app('saveSettings()');
    expect(app('db.settings.halfYearEnd')).toBe('2027-01-31');
    expect(app('db.settings.schoolYearEnd')).toBe('2027-07-20');
    app('openSettings()');
    document.getElementById('settings-year-end').value = '';
    app('saveSettings()');
    expect('schoolYearEnd' in app('db.settings')).toBe(false);
  });
});

describe('Vorlage: Themen von einer Parallelklasse übernehmen', () => {
  const flushP = () => new Promise(r => setTimeout(r, 0));
  const addClass = (id, cls, subject, plan) => app(`db.groups.push(${JSON.stringify({ id, subject, className: cls, color: '#22c55e', schularbeitWeight: 50, ...(plan ? { plan } : {}) })}); db.students[${JSON.stringify(id)}] = []`);
  it('Auswahl: nur Klassen mit Themen, gleiches Fach zuerst, nicht die eigene', async () => {
    addClass('g2', '7b', 'Mathe');
    addClass('g3', '9c', 'Physik', [{ id: 'x', title: 'Optik' }]);
    addClass('g4', '7c', 'Mathe', [{ id: 'y', title: 'Prozente' }]);
    const p = app('choosePlanSource("g2")');
    await flushP();
    const labels = [...document.querySelectorAll('#modal-choice-buttons button')].map(b => b.textContent);
    expect(labels.slice(0, 3)).toEqual(['7a Mathe · 4 Themen', '7c Mathe · 1 Thema', '9c Physik · 1 Thema']);
    app('answerChoice(null)');
    await p;
  });

  it('übernimmt in Reihenfolge, ohne feste Termine/Erledigt; Dauer und Notiz kommen mit; Rückgängig', async () => {
    app('db.groups[0].plan[0].done = "2026-11-05"; db.groups[0].plan[0].doneLessons = ["mo_2026-11-02"]; db.groups[0].plan[1].note = "Buch S. 12"');
    addClass('g2', '7b', 'Mathe', [{ id: 'own', title: 'Eigenes Thema' }]);
    const p = app('choosePlanSource("g2")');
    await flushP();
    app('answerChoice("g1")');
    await p;
    const plan = app('db.groups.find(g => g.id === "g2").plan');
    expect(plan.map(t => t.title)).toEqual(['Eigenes Thema', 'Brüche erweitern', 'Brüche kürzen', 'Klassenarbeit', 'Dezimalzahlen']);
    expect(plan[1]).toEqual({ id: plan[1].id, title: 'Brüche erweitern' });        // ohne done/doneLessons
    expect(plan[2]).toMatchObject({ title: 'Brüche kürzen', lessons: 2, note: 'Buch S. 12' });
    expect(plan[3].pinned).toBeUndefined();                                         // Termin gehört zur 7a
    expect(new Set(plan.map(t => t.id)).size).toBe(5);                               // neue Kennungen
    expect(document.getElementById('toast-container').textContent).toContain('4 Themen von 7a übernommen');
    document.querySelector('.toast-undo button').click();
    expect(app('db.groups.find(g => g.id === "g2").plan').map(t => t.title)).toEqual(['Eigenes Thema']);
  });

  it('keine andere Klasse mit Themen: Hinweis statt leerer Auswahl', () => {
    app('db.groups[0].plan = []');
    addClass('g2', '7b', 'Mathe');
    app('choosePlanSource("g2")');
    expect(document.getElementById('modal-choice').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('toast-container').textContent).toContain('Noch keine andere Klasse hat Themen');
  });

  it('Knopf im Reiter „Planung“', () => {
    app('switchView("classes"); openGroupStudents("g1"); switchClassDashboardTab("plan")');
    expect(document.querySelector('#overview-content [data-act="copy"]').textContent).toBe('Von Klasse übernehmen …');
  });
});
