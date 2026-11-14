// Gesamtprüfung 14.11.2026, Paket 6: Tastatur und VoiceOver. AZ6, AZ7, BB5, BB7, BD3, BA2.
const { loadApp, app } = require('./helpers/load-app');

const st = (id, f) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] });
const W = (id, day, block, extra = {}) => ({ id, day, block, part: 'full', subject: 'Mathe', color: '#3b82f6', groupId: 'g1', recurring: 'weekly', ...extra });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [W('mo1', 0, 1), W('mo2', 0, 2), W('mi', 2, 2)],
    lessonData: {
      'mo1_2026-11-16': { ausfall: true },
      'mo2_2026-11-09': { hwEnabled: true, hwItems: [{ id: 'h1', text: 'S. 12', targetDate: '2026-11-16' }] },
    },
    supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50, plan: [{ id: 't1', title: 'Brüche' }] }],
    students: { g1: [st('a', 'Anna'), st('b', 'Ben')] },
  };
}
const active = () => document.activeElement;
const tab = (shift = false) => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: shift, bubbles: true, cancelable: true }));

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 16, 7, 0));   // Mo 16.11.2026, vor dem 1. Block
  window.innerWidth = 1024;
  app('replaceDB(' + JSON.stringify(sampleDB()) + ')');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
  globalThis.confirm = () => true;
  app('currentWeekOffset = 0; timetableDay = null; timetableMode = "week"');
});
afterEach(() => { app('closeModal("modal-lesson"); closeModal("modal-seating-student")'); app('switchView("dashboard")'); vi.useRealTimers(); });

describe('AZ6: Fokus bleibt nach dem Neuzeichnen auf der Kachel', () => {
  it('Stunden-Fenster schließen: Fokus auf der neu gezeichneten Kachel', () => {
    app('switchView("timetable")');
    const tile = () => document.querySelector('#view-timetable .tt-lesson[data-slot="mo2"][data-date="2026-11-16"]');
    tile().focus();
    const before = tile();
    app('openLessonDetail("mo2", "2026-11-16")');
    app('saveLessonDataAndClose()');
    expect(before.isConnected).toBe(false);   // neu gezeichnet
    expect(active()).toBe(tile());
  });
  it('Minutentakt: Fokus bleibt auf derselben Stunde', () => {
    app('switchView("timetable")');
    const tile = () => document.querySelector('#view-timetable .tt-lesson[data-slot="mi"]');
    tile().focus();
    vi.setSystemTime(new Date(2026, 10, 16, 7, 1));
    app('refreshTimetableClock()');
    expect(active()).toBe(tile());
  });
});

describe('BB5: Fokus nach einem Eintrag im Sitzplan zurück auf der Karte', () => {
  it('Mitarbeit eintragen: Karte von Ben hat danach den Fokus', () => {
    app('switchView("seating"); openSeatingForGroup("g1")');
    const card = () => document.querySelector('.seating-card[data-id="b"]');
    card().focus();
    app('openSeatingStudentModal("b", "g1", "2026-11-16")');
    app('addParticipationSmiley("positive")');
    expect(active()).toBe(card());
  });
});

describe('BB7 und BD3: Tab bleibt im Fenster', () => {
  it('verborgene Abschnitte unter „Mehr“ zählen nicht als Ziel', () => {
    app('openSeatingStudentModal("a", "g1", "2026-11-16", { more: true })');
    const dialog = document.querySelector('#modal-seating-student .modal');
    expect(document.getElementById('sw-more').classList.contains('is-veiled')).toBe(true);
    const list = app('focusablesIn')(dialog);
    expect(list.some(el => el.closest('[data-private]'))).toBe(false);
  });
  it('Shift+Tab direkt nach dem Öffnen springt auf das letzte Element im Fenster, nicht dahinter', () => {
    app('openSeatingStudentModal("a", "g1", "2026-11-16")');
    const dialog = document.querySelector('#modal-seating-student .modal');
    expect(active()).toBe(dialog);
    tab(true);
    const list = app('focusablesIn')(dialog);
    expect(active()).toBe(list[list.length - 1]);
    expect(dialog.contains(active())).toBe(true);
  });
  it('„Rückgängig“ im Hinweis ist per Tab erreichbar, solange ein Fenster offen ist', () => {
    app('openSeatingStudentModal("a", "g1", "2026-11-16")');
    app('showUndoToast("Test", () => {})');
    const dialog = document.querySelector('#modal-seating-student .modal');
    const list = app('focusablesIn')(dialog);
    list[list.length - 1].focus();
    tab();
    expect(active().closest('#toast-container')).not.toBeNull();
  });
});

describe('AZ7: VoiceOver hört Zustand und Fälliges', () => {
  it('Dashboard: ausfallende Stunde und fällige HA im Namen', () => {
    app('switchView("dashboard")');
    const row = id => document.querySelector(`#dashboard-content .dash-lesson[data-slot="${id}"]`);
    expect(row('mo1').getAttribute('aria-label')).toMatch(/Entfällt/);
    expect(row('mo2').getAttribute('aria-label')).toMatch(/HA 1 fällig/);
  });
  it('„Als Nächstes“: Karte ist kein Knopf, der Titel ist es', () => {
    app('switchView("dashboard")');
    const card = document.querySelector('#dashboard-content .dash-next');
    expect(card.getAttribute('role')).toBeNull();
    const btn = card.querySelector('button.dash-next-open');
    expect(btn.getAttribute('aria-label')).toMatch(/Als Nächstes/);
    expect(card.textContent).toMatch(/S\. 12/);
  });
  it('Stundenplan-Kachel nennt Hausaufgabe, Klassen-Ansicht das Thema', () => {
    app('switchView("timetable")');
    expect(document.querySelector('.tt-lesson[data-slot="mo2"][data-date="2026-11-16"]').getAttribute('aria-label')).toMatch(/Hausaufgabe/);
    app('setTimetableMode("class")');
    const rows = [...document.querySelectorAll('.ttc-row[aria-label], .ttc-row .ttc-open')];
    expect(rows.some(r => /Brüche/.test(r.getAttribute('aria-label')))).toBe(true);
  });
});

describe('BA2: Schülerliste mit VoiceOver', () => {
  it('Zeile ist kein Knopf, der Name ist einer; im Bearbeiten-Modus kreuzt ein Tipp an', () => {
    app('switchView("classes"); openGroupStudents("g1", "students")');
    const row = document.querySelector('#students-container .student-row');
    expect(row.getAttribute('role')).toBeNull();
    const btn = row.querySelector('button.student-open');
    expect(btn.getAttribute('aria-label')).toMatch(/Schülerakte öffnen: /);
    app("isStudentEditMode = true; renderStudents()");
    const r2 = document.querySelector('#students-container .student-row');
    const cb = r2.querySelector('.student-select-cb');
    expect(cb.getAttribute('aria-label')).toMatch(/auswählen/);
    r2.click();
    expect(cb.checked).toBe(true);
    expect(document.getElementById('modal-seating-student').classList.contains('hidden')).toBe(true);
    app('isStudentEditMode = false');
  });
});
