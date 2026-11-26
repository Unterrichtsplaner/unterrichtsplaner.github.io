// BF2: Eine Stunde = ein Fenster. Jedes Antippen in der Sitzplan-Leiste (Zeit, Thema, Zähler, „Stunde“) öffnet das
// Stunden-Fenster; die Fenster „Thema“ und „Heute“ gibt es nicht mehr. Was nur „Heute“ hatte (letzte Stunde gefehlt,
// Geburtstag), steht in der Karte „Wer fehlt“ des Stunden-Fensters.
// BF3: Im Stunden-Fenster mit ‹ › zur vorigen/nächsten Stunde derselben Klasse blättern; Eingetipptes wird übernommen.
const { loadApp, app } = require('./helpers/load-app');

// Mo 02.11.2026: 7a hat 1. und 3. Block (Mo) und Fr 1. Block; Fr 30.10. war die letzte Stunde vor heute.
const MON = '2026-11-02', FRI = '2026-10-30';
const student = (id, firstName, extra = {}) => ({ id, firstName, lastName: 'Muster', grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null, holidays: [] },
    lessonSlots: [
      { id: 'm1', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
      { id: 'm3', day: 0, block: 3, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
      { id: 'm4', day: 4, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
      { id: 'x1', day: 1, block: 2, part: 'full', subject: 'Chor', color: '#888888', recurring: 'weekly' },
    ],
    lessonData: { [`m4_${FRI}`]: { done: 'Brüche kürzen' } },
    groups: [{ id: 'g1', subject: 'Mathe', className: '7a', color: '#6366f1', schularbeitWeight: 50,
      plan: [{ id: 't1', title: 'Brüche erweitern' }, { id: 't2', title: 'Dezimalzahlen' }],
      classNotes: [{ id: 'n1', text: 'Elternabend', date: '2026-10-28' }] }],
    students: { g1: [
      student('a', 'Anna', { attendance: [{ date: FRI, type: 'abwesend', note: '' }] }),
      student('b', 'Ben', { birthday: '2014-11-02' }),
      student('c', 'Cem', { attendance: [{ date: MON, type: 'entschuldigt', note: '' }] }),
    ] },
    supervisions: [],
  };
}
const at = (h, m = 0) => vi.setSystemTime(new Date(2026, 10, 2, h, m, 0));
const cockpit = () => document.getElementById('seating-cockpit');
const openSeating = () => app(`seatingRequest = { groupId: "g1", dateStr: "${MON}" }; switchView("seating")`);
const isOpen = id => !!document.getElementById(id) && !document.getElementById(id).classList.contains('hidden');
const lesson = () => app('[activeLessonId, activeLessonDate]');
const prevBtn = () => document.getElementById('btn-lesson-prev');
const nextBtn = () => document.getElementById('btn-lesson-next');
const run = sel => { const el = cockpit().querySelector(sel); app(el.getAttribute('onclick')); };

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  at(8, 0);
  app('db = ' + JSON.stringify(sampleDB()));
  app('seatingEditMode = false');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
  window.innerWidth = 1024;
});
afterEach(() => { app('switchView("dashboard")'); vi.useRealTimers(); });

describe('BF2: Sitzplan-Leiste öffnet immer das Stunden-Fenster', () => {
  it('die Fenster „Thema“ und „Heute“ gibt es nicht mehr', () => {
    expect(document.getElementById('modal-lesson-topic')).toBeNull();
    expect(document.getElementById('modal-seating-today')).toBeNull();
    expect(app('typeof openLessonTopic')).toBe('undefined');
    expect(app('typeof openSeatingToday')).toBe('undefined');
  });
  it.each([['Zeit', '.cockpit-time'], ['Thema', '.cockpit-topic'], ['Zähler', '.cockpit-count'], ['Knopf „Stunde“', '.cockpit-lesson-btn']])(
    '%s antippen: Stunden-Fenster dieser Stunde, Privates verborgen (Beamer)', (_, sel) => {
      openSeating();
      run(sel);
      expect(isOpen('modal-lesson')).toBe(true);
      expect(lesson()).toEqual(['m1', MON]);
      expect(document.querySelector('#lesson-class-notes .lc-veil')).not.toBeNull();
    });
  it('auch vor der Stunde der Klasse (Leiste zeigt die nächste): genau diese Stunde', () => {
    at(6, 30);
    openSeating();
    run('.cockpit-topic');
    expect(lesson()).toEqual(['m1', MON]);
  });
});

describe('BF2: Karte „Wer fehlt“ hat, was das Fenster „Heute“ zeigte', () => {
  it('heute: fehlt, letzte Stunde gefehlt (Stoff nachholen), Geburtstag', () => {
    app(`openLessonDetail("m1", "${MON}")`);
    const box = document.getElementById('lesson-absent-container');
    expect(box.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('lesson-absent-list').textContent).toContain('Cem Muster');
    const extra = box.querySelector('.lesson-absent-extra').textContent;
    expect(extra).toContain('Letzte Stunde gefehlt');
    expect(extra).toContain('Anna Muster');
    expect(extra).toContain('Geburtstag');
    expect(extra).toContain('Ben Muster');
  });
  it('ohne Fehlende, aber mit Geburtstag: Karte heißt „In der Klasse“', () => {
    app('db.students.g1.forEach(s => { s.attendance = []; })');
    app(`openLessonDetail("m1", "${MON}")`);
    expect(document.querySelector('#lesson-absent-container .notes-section-label').textContent).toBe('In der Klasse');
    expect(document.getElementById('lesson-absent-list').children.length).toBe(0);
    expect(document.querySelector('#lesson-absent-container .lesson-absent-extra').textContent).toContain('Ben Muster');
  });
  it('vergangene Stunde: nur wer damals fehlte, kein „nachholen“ und kein Geburtstag', () => {
    app(`openLessonDetail("m4", "${FRI}")`);
    expect(document.getElementById('lesson-absent-list').textContent).toContain('Anna Muster');
    expect(document.querySelector('#lesson-absent-container .lesson-absent-extra')).toBeNull();
  });
  it('Namen werden nicht als HTML gezeigt', () => {
    app('db.students.g1[0].firstName = "<img src=x onerror=alert(1)>"');
    app(`openLessonDetail("m1", "${MON}")`);
    expect(document.querySelector('#lesson-absent-container img')).toBeNull();
  });
});

describe('BF3: im Stunden-Fenster blättern', () => {
  it('‹ › zeigen Tag der vorigen/nächsten Stunde derselben Klasse, auch am selben Tag', () => {
    app(`openLessonDetail("m1", "${MON}")`);
    expect(prevBtn().getAttribute('aria-label')).toBe('Vorige Stunde: Fr., 30.10.');
    expect(nextBtn().getAttribute('aria-label')).toBe('Nächste Stunde: Mo., 02.11., 3. Block');
    nextBtn().click();
    expect(lesson()).toEqual(['m3', MON]);
    nextBtn().click();
    expect(lesson()).toEqual(['m4', '2026-11-06']);
    prevBtn().click();
    prevBtn().click();
    expect(lesson()).toEqual(['m1', MON]);
    prevBtn().click();
    expect(lesson()).toEqual(['m4', FRI]);
  });
  it('Ausfall wird übersprungen', () => {
    app(`db.lessonData["m3_${MON}"] = { ausfall: true }`);
    app(`openLessonDetail("m1", "${MON}")`);
    nextBtn().click();
    expect(lesson()).toEqual(['m4', '2026-11-06']);
  });
  it('Eingetipptes wird beim Blättern übernommen (Inhalt, Notiz, Thema)', () => {
    app(`openLessonDetail("m1", "${MON}")`);
    document.getElementById('lesson-done-text').value = 'Kopfrechnen';
    document.getElementById('lesson-notes-text').value = 'Unruhig';
    nextBtn().click();
    expect(app(`db.lessonData["m1_${MON}"]`)).toEqual(expect.objectContaining({ done: 'Kopfrechnen', notes: 'Unruhig' }));
    expect(document.getElementById('lesson-done-text').value).toBe('');
    const inp = document.getElementById('lesson-plan-input');
    inp.value = 'Wiederholung';
    inp.dispatchEvent(new Event('input'));
    nextBtn().click();
    expect(app('db.groups[0].plan').find(t => t.title === 'Wiederholung')).toEqual(expect.objectContaining({ pinned: MON, pinnedSlot: 'm3' }));
    expect(isOpen('modal-lesson')).toBe(true);
  });
  it('aus dem Sitzplan: auch die nächste Stunde zeigt Privates erst nach „Anzeigen“', () => {
    openSeating();
    run('.cockpit-lesson-btn');
    app('showLessonPrivate()');
    expect(document.querySelector('#lesson-class-notes .lc-veil')).toBeNull();
    nextBtn().click();
    expect(document.querySelector('#lesson-class-notes .lc-veil')).not.toBeNull();
  });
  it('Stunde ohne Klasse: blättert über das Fach; keine Stunde in Reichweite → Knopf aus', () => {
    app('openLessonDetail("x1", "2026-11-03")');
    expect(nextBtn().getAttribute('aria-label')).toBe('Nächste Stunde: Di., 10.11.');
    app('db.lessonSlots.find(s => s.id === "x1").recurring = "none"; db.lessonSlots.find(s => s.id === "x1").specificDate = "2026-11-03"');
    app('openLessonDetail("x1", "2026-11-03")');
    expect(nextBtn().disabled).toBe(true);
    expect(prevBtn().disabled).toBe(true);
  });
});
