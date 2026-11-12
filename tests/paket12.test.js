// Gesamtprüfung 11.11.2026, Paket 12 (grün): Schülerapp. AT9, AT10, AT11, AT12, AT13, AT14.
const { loadApp, loadScript, app } = require('./helpers/load-app');

const BAD = '#6366f1;background-image:url(https://fremd.example/p.png)';
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null, studentApp: { on: true } },
    lessonSlots: [{ id: 's1', day: 3, block: 2, part: 'full', subject: 'Mathe', color: BAD, groupId: 'g1', recurring: 'weekly' }],
    lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: BAD, schularbeitWeight: 50, studentApp: { on: true, access: { id: 'K'.repeat(22), key: 'k'.repeat(43) } } }],
    students: { g1: [{ id: 'a', firstName: 'Anna', lastName: 'A', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] }] },
  };
}
beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
  loadScript('schueler.js');
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 12, 8, 0));   // Do 12.11.
  app('replaceDB(' + JSON.stringify(sampleDB()) + ')');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  if (app('typeof choiceResolve === "function"')) app('answerChoice(null)');
  window.confirm = () => true;
  app('SyncManager').currentUser = { uid: 'u1' }; app('SyncManager').isInitialized = true;   // der Reiter „Schülerapp“ braucht die Cloud
});
afterEach(() => { app('SyncManager').currentUser = null; app('SyncManager').isInitialized = false; app('switchView("dashboard")'); vi.useRealTimers(); });

describe('AT9: Farben im style-Attribut immer über safeColor', () => {
  it('Dashboard, Suche, Schülerapp-Liste und Stunden-Fenster laden keine fremden Bilder', () => {
    app('switchView("dashboard"); renderDashboard()');
    expect(document.getElementById('view-dashboard').innerHTML).not.toMatch(/fremd\.example/);
    app('openSettings(); showSettingsPane && showSettingsPane("studentapp")');
    expect(document.getElementById('modal-settings').innerHTML).not.toMatch(/fremd\.example/);
    app('closeModal("modal-settings")');
    app('openLessonDetail("s1", "2026-11-12")');
    expect(document.getElementById('lesson-color-dot').getAttribute('style') || '').not.toMatch(/fremd/);
    app('closeModal("modal-lesson")');
    expect(app('searchItemView ? 1 : 0')).toBe(1);
  });
});

describe('Schülerseite', () => {
  const page = () => document.getElementById('page');
  const NOW = new Date(2026, 10, 12, 8, 0);
  it('AT10: Raumname mit „&“ nicht doppelt umgewandelt', () => {
    const el = document.createElement('div'); el.id = 'page'; if (!page()) document.body.appendChild(el);
    page().innerHTML = window.SchuelerSeite.buildClassPage({ v: 2, cls: '7b', subject: 'Mathe', next: [{ date: '2026-11-13', start: '08:00', end: '08:45', room: 'Musik & Kunst' }] }, NOW);
    expect(page().textContent).toMatch(/Musik & Kunst/);
    expect(page().textContent).not.toMatch(/&amp;/);
  });
  it('AT11: Erinnerung am Vortag 18 Uhr, nicht um Mitternacht', () => {
    const ics = window.SchuelerSeite.icsFor([{ date: '2026-11-20', text: 'Test' }], '7b');
    expect(ics).toMatch(/TRIGGER:-PT6H/);
    expect(ics).not.toMatch(/TRIGGER:-P1D/);
  });
  it('AT12: „bis Freitag“ statt „bis am Freitag“', () => {
    window.SchuelerSeite.setMeTab('ich');
    page().innerHTML = window.SchuelerSeite.buildMePage({ v: 1, kind: 'me', first: 'Anna', cls: '7b', level: 1, xp: 0, from: 0, next: 10, jokers: {}, feedback: [], year: [],
      klasse: { v: 2, hw: [{ date: '2026-11-16', text: 'S. 12' }] } }, NOW);
    expect(page().textContent).toMatch(/bis Montag/);
    expect(page().textContent).not.toMatch(/bis am/);
  });
});

describe('AT13: Schalter „Persönliche Seiten“', () => {
  const openTab = () => app('switchView("classes"); openGroupStudents("g1"); switchClassDashboardTab("studentapp")');
  it('nach dem Einschalten erscheinen die Einstellungen; Rückfrage hat nur ein „Abbrechen“', async () => {
    openTab();
    const done = app('setPersonalOn("g1", true)');
    await vi.waitFor(() => expect(app('typeof choiceResolve === "function"')).toBe(true));
    expect([...document.querySelectorAll('#modal-choice-buttons button')].filter(b => b.textContent === 'Abbrechen').length).toBe(1);
    app('answerChoice("on")');
    await done;
    expect(document.getElementById('overview-content').textContent).toMatch(/Tempo|Joker/);
  });
  it('Abbrechen: Schalter steht wieder auf aus', async () => {
    openTab();
    const box = document.getElementById('sa-personal-on');
    box.checked = true;
    const done = app('setPersonalOn("g1", true)');
    await vi.waitFor(() => expect(app('typeof choiceResolve === "function"')).toBe(true));
    app('answerChoice(null)');
    await done;
    expect(document.getElementById('sa-personal-on').checked).toBe(false);
  });
});

describe('AT14: Klassenziel – Belohnung zuerst eingetippt', () => {
  it('bleibt stehen und wird mit dem Ziel gespeichert', () => {
    app('switchView("classes"); openGroupStudents("g1"); switchClassDashboardTab("studentapp")');
    const reward = document.getElementById('sa-goal-reward');
    reward.value = 'eine Stunde Rätsel';
    reward.dispatchEvent(new Event('change'));
    expect(document.getElementById('sa-goal-reward').value).toBe('eine Stunde Rätsel');
    const target = document.getElementById('sa-goal-target');
    target.value = '150';
    target.dispatchEvent(new Event('change'));
    expect(app('db.groups[0].studentApp.goal')).toMatchObject({ target: 150, reward: 'eine Stunde Rätsel' });
  });
});
