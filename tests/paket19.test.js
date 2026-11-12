// Ältere Punkte zur Bedienbarkeit (Review 25.09.2026), Paket 19: W12, W13, W14, X3.
const fs = require('fs'), path = require('path');
const { loadApp, app } = require('./helpers/load-app');
const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

const st = (id, f) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null, warnAbsences: 1 },
    lessonSlots: [{ id: 'mo', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#3b82f6', groupId: 'g1', recurring: 'weekly' }],
    lessonData: {}, supervisions: [{ id: 'sv', day: 0, start: '09:15', end: '09:45', place: 'Hof', recurring: 'weekly' }],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50 }],
    students: { g1: [{ ...st('a', 'Anna'), attendance: [{ id: 'f', date: '2026-11-09', type: 'abwesend' }] }] },
  };
}
const key = (el, k, extra = {}) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...extra }));
beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 9, 7, 0));   // Mo
  window.innerWidth = 1024;
  app('replaceDB(' + JSON.stringify(sampleDB()) + ')');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});
afterEach(() => { app('switchView("dashboard")'); vi.useRealTimers(); });

describe('X3: Stundenplan und Dashboard per Tastatur', () => {
  const named = el => el.getAttribute('role') === 'button' && el.getAttribute('tabindex') === '0' && (el.getAttribute('aria-label') || '').trim().length > 0;
  it('Stunden-Kacheln und leere Zellen sind Knöpfe mit Namen', () => {
    app('switchView("timetable"); timetableMode = "week"; renderTimetable()');
    const tile = document.querySelector('.tt-lesson'), empty = document.querySelector('.tt-empty-cell');
    expect(named(tile)).toBe(true);
    expect(tile.getAttribute('aria-label')).toMatch(/7b/);
    expect(named(empty)).toBe(true);
  });
  it('Dashboard: Stunden, Aufsicht, „Als Nächstes“ und Warnungen', () => {
    app('switchView("dashboard"); renderDashboard()');
    ['.dash-lesson', '.dash-supervision', '.dash-next', '.dash-warn-text'].forEach(sel => {
      const el = document.querySelector(sel);
      expect(el, sel).not.toBeNull();
      expect(named(el), sel).toBe(true);
    });
  });
});

describe('W13: Auswahllisten per Tastatur', () => {
  it('Pfeiltasten und Enter wählen, Escape schließt; Einträge sind Optionen', () => {
    const sel = document.getElementById('new-group-scale');   // echte Auswahlliste der App, ohne Inline-Handler
    app('makeCustomFormDropdown(document.getElementById("new-group-scale"))');
    app('document.getElementById("new-group-scale").value = "1-6"');
    const box = sel.parentNode.querySelector('.custom-form-dropdown');
    const trigger = box.querySelector('.custom-form-dropdown-trigger');
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-label')).toMatch(/Notenskala/);
    expect(box.querySelectorAll('[role="option"]').length).toBe(2);
    key(trigger, 'ArrowDown');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement.dataset.value).toBe('1-6');
    key(document.activeElement, 'ArrowDown');
    // Enter löst denselben Weg aus wie ein Klick auf die Option (die jsdom-Hülle lässt das Setzen von value nicht zu)
    const it = document.activeElement;
    expect(it.dataset.value).toBe('0-15');
    const clicked = vi.fn(); it.onclick = clicked;
    key(it, 'Enter');
    expect(clicked).toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
    key(trigger, 'ArrowDown');
    key(document.activeElement, 'Escape');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    app('document.getElementById("new-group-scale").value = "1-6"');
  });
});

describe('W14: Fokus in Fenstern', () => {
  it('Tab bleibt im offenen Fenster: vom letzten zum ersten, mit Umschalt vom ersten zum letzten', () => {
    app('openModal("modal-add-group")');
    const list = app('focusablesIn')(document.querySelector('#modal-add-group .modal'));
    const first = list[0], last = list[list.length - 1];
    last.focus();
    key(last, 'Tab');
    expect(document.activeElement).toBe(first);
    key(first, 'Tab', { shiftKey: true });
    expect(document.activeElement).toBe(last);
    app('closeModal("modal-add-group")');
  });
  it('nach dem Notenformular geht der Fokus beim Schließen des Schüler-Fensters zurück zum Auslöser', () => {
    const opener = document.createElement('button'); opener.textContent = 'Anna'; document.body.appendChild(opener); opener.focus();
    app('openSeatingStudentModal("a", "g1", "2026-11-09")');
    app('openGradeFormForCurrentStudentDetailed()');
    app('closeGradeForm()');
    expect(document.getElementById('modal-seating-student').classList.contains('hidden')).toBe(false);
    app('closeModal("modal-seating-student")');
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});

describe('W12: Rest – „Thema der Stunde“ in der Sitzplan-Leiste', () => {
  it('Tippfläche auf Touch mindestens 44 px hoch, ohne die Leiste zu verändern', () => {
    expect(css).toMatch(/@media \(pointer: coarse\)\s*\{\s*\.cockpit-topic\{[^}]*position:relative[^}]*\}\s*\.cockpit-topic::after\{[^}]*inset:/);
  });
});
