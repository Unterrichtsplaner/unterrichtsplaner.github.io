// BF4: Klasse → Reiter „Planung“ zeigt die Stunden der Klasse (wie Stundenplan → „Klasse“: vorbei mit Inhalt, kommend
// mit Thema; antippen = Stunden-Fenster) und, umgeschaltet, die Themenliste. Der Klassenname im Stunden-Fenster führt
// in diesen Reiter (Stunden), „Ganze Planung“ zu den Themen.
const { loadApp, app } = require('./helpers/load-app');

const st = (id, n) => ({ id, firstName: n, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null, halfYearEnd: '2027-01-29', holidays: [] },
    lessonSlots: [
      { id: 'mo', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#3d63dd', groupId: 'g1', recurring: 'weekly' },
      { id: 'do', day: 3, block: 1, part: 'full', subject: 'Mathe', color: '#3d63dd', groupId: 'g1', recurring: 'weekly' },
      { id: 'x1', day: 1, block: 2, part: 'full', subject: 'Chor', color: '#888888', recurring: 'weekly' },
    ],
    lessonData: { 'do_2026-11-05': { done: 'Bruchrechnung Einstieg\nS. 12' } },
    groups: [
      { id: 'g1', subject: 'Mathe', className: '7a', color: '#3d63dd', schularbeitWeight: 50, plan: [{ id: 't1', title: 'Brüche erweitern' }, { id: 't2', title: 'Brüche kürzen', lessons: 2 }] },
      { id: 'g2', subject: 'Deutsch', className: '8b', color: '#aa3355', schularbeitWeight: 50 },
    ],
    students: { g1: [st('a', 'Anna')], g2: [] },
    supervisions: [],
  };
}
const content = () => document.getElementById('overview-content');
const rows = () => [...content().querySelectorAll('.ttc-row')];
const rowText = r => r.querySelector('.ttc-date').textContent.replace(/KW.*/, '').trim() + ' | ' + r.querySelector('.ttc-topic').textContent.trim();
const openPlan = (gid = 'g1') => app(`switchView("classes"); openGroupStudents("${gid}"); switchClassDashboardTab("plan")`);
const viewBtn = v => content().querySelector(`.plan-switch [data-view="${v}"]`);
const isOpen = id => !document.getElementById(id).classList.contains('hidden');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 9, 7, 0));   // Mo 09.11.2026
  app('db = ' + JSON.stringify(sampleDB()));
  app('planView = "lessons"; planShowPastLessons = false');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
  window.innerWidth = 1024;
});
afterEach(() => { app('switchView("dashboard")'); vi.useRealTimers(); });

describe('Reiter „Planung“: Stunden', () => {
  it('Standard: die kommenden Stunden mit Thema, Umschalter „Stunden · Themen“', () => {
    openPlan();
    expect(viewBtn('lessons').getAttribute('aria-pressed')).toBe('true');
    expect(viewBtn('topics').getAttribute('aria-pressed')).toBe('false');
    expect(rows().slice(0, 4).map(rowText)).toEqual([
      'Mo., 09.11. | Brüche erweitern', 'Do., 12.11. | Brüche kürzen (1/2)', 'Mo., 16.11. | Brüche kürzen (2/2)', 'Do., 19.11. | + Thema']);
    expect(content().textContent).toMatch(/Noch \d+ Stunden bis zum Halbjahr/);
  });
  it('frühere Stunden auf Knopfdruck, mit Unterrichtsinhalt', () => {
    openPlan();
    const past = content().querySelector('[data-act="past"]');
    expect(past.textContent).toMatch(/Frühere Stunden anzeigen/);
    past.click();
    expect(rows().map(rowText)).toContain('Do., 05.11. | Bruchrechnung Einstieg');
    expect(content().querySelector('[data-act="past"]').textContent).toBe('Frühere Stunden ausblenden');
  });
  it('Stunde antippen öffnet das Stunden-Fenster; Eingetipptes erscheint nach dem Schließen in der Liste', () => {
    openPlan();
    rows()[3].querySelector('.ttc-open').click();   // Do 19.11., noch ohne Thema
    expect(isOpen('modal-lesson')).toBe(true);
    expect(app('[activeLessonId, activeLessonDate]')).toEqual(['do', '2026-11-19']);
    const inp = document.getElementById('lesson-plan-input');
    inp.value = 'Wiederholung'; inp.dispatchEvent(new Event('input'));
    app('saveLessonDataAndClose()');
    expect(rows().slice(0, 4).map(rowText)[3]).toBe('Do., 19.11. | Wiederholung');
  });
  it('Unterrichtsinhalt einer früheren Stunde ändern: Liste zeigt ihn sofort', () => {
    openPlan();
    content().querySelector('[data-act="past"]').click();
    const row = rows().find(r => r.dataset.date === '2026-11-05');
    row.click();
    document.getElementById('lesson-done-text').value = 'Brüche am Kreis';
    app('saveLessonDataAndClose()');
    expect(rows().map(rowText)).toContain('Do., 05.11. | Brüche am Kreis');
  });
  it('„+ Thema“ öffnet das Fenster für neue Themen', () => {
    openPlan();
    content().querySelector('.ttc-row [data-act="add"]').click();
    expect(isOpen('modal-plan-topic')).toBe(true);
    app('closeModal("modal-plan-topic")');
  });
  it('Klasse ohne Stunden: Hinweis statt Liste', () => {
    openPlan('g2');
    expect(content().textContent).toContain('Keine kommenden Stunden im Stundenplan.');
  });
  it('Klasse ohne Themen: Hinweis mit Weg zu den Themen (dort auch „Von Klasse übernehmen“)', () => {
    app('db.groups[0].plan = []');
    openPlan();
    expect(content().querySelector('.plan-empty').textContent).toMatch(/Noch keine Themen geplant/);
    content().querySelector('.plan-empty [data-view="topics"]').click();
    expect(viewBtn('topics').getAttribute('aria-pressed')).toBe('true');
    expect(content().querySelector('[data-act="copy"]')).not.toBeNull();
  });
});

describe('Reiter „Planung“: Themen', () => {
  it('„Themen“ zeigt die Themenliste wie bisher; die Wahl bleibt beim Klassenwechsel', () => {
    openPlan();
    viewBtn('topics').click();
    expect([...content().querySelectorAll('.plan-list .plan-row b')].map(b => b.textContent)).toEqual(['Brüche erweitern', 'Brüche kürzen']);
    expect(content().querySelector('[data-act="copy"]')).not.toBeNull();
    expect(viewBtn('topics').getAttribute('aria-pressed')).toBe('true');
    openPlan('g2');
    expect(viewBtn('topics').getAttribute('aria-pressed')).toBe('true');
    viewBtn('lessons').click();
    expect(content().querySelector('.plan-list')).toBeNull();
  });
});

describe('Wege aus dem Stunden-Fenster', () => {
  it('Klassenname im Kopf öffnet die Klasse im Reiter „Planung“ bei den Stunden', () => {
    app('planView = "topics"');
    app('switchView("timetable"); openLessonDetail("mo", "2026-11-09")');
    const title = document.getElementById('lesson-modal-title');
    expect(title.tagName).toBe('BUTTON');
    expect(title.disabled).toBe(false);
    expect(title.getAttribute('aria-label')).toBe('Klasse 7a öffnen');
    document.getElementById('lesson-done-text').value = 'Getippt';
    title.click();
    expect(isOpen('modal-lesson')).toBe(false);
    expect(app('db.lessonData["mo_2026-11-09"].done')).toBe('Getippt');   // Eingetipptes übernommen (Regel 35)
    expect(app('currentOverviewTab')).toBe('plan');
    expect(app('currentGroupId')).toBe('g1');
    expect(viewBtn('lessons').getAttribute('aria-pressed')).toBe('true');
  });
  it('„Ganze Planung“ öffnet die Themen', () => {
    app('switchView("timetable"); openLessonDetail("mo", "2026-11-09")');
    document.querySelector('#lesson-plan-box [data-act="plan"]').click();
    expect(app('currentOverviewTab')).toBe('plan');
    expect(viewBtn('topics').getAttribute('aria-pressed')).toBe('true');
  });
  it('Stunde ohne Klasse: Titel ist kein Weg', () => {
    app('openLessonDetail("x1", "2026-11-10")');
    expect(document.getElementById('lesson-modal-title').disabled).toBe(true);
    expect(document.getElementById('lesson-modal-title').hasAttribute('aria-label')).toBe(false);
    app('closeModal("modal-lesson")');
  });
});

describe('Stundenplan → „Klasse“ bleibt wie bisher', () => {
  it('gleiche Zeilen wie in der Planung', () => {
    openPlan();
    const fromPlan = rows().map(rowText);
    app('timetableClassGroupId = "g1"; switchView("timetable"); setTimetableMode("class")');
    const grid = document.querySelector('.tt-class-list');
    expect([...grid.querySelectorAll('.ttc-row')].map(rowText)).toEqual(fromPlan);
    expect(grid.querySelector('#ttc-group')).not.toBeNull();
    app('setTimetableMode("week")');
  });
});
