// Gesamtprüfung 11.11.2026, Paket 7: Oberfläche und Datenschutz. AU3, AU4, AU5, AU6, AU7.
const fs = require('fs'), path = require('path');
const { loadApp, app } = require('./helpers/load-app');
const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [], lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50 }],
    students: { g1: [{ id: 'a', firstName: 'Anna', lastName: 'A', importantNote: 'Diabetes', grades: [{ type: 'mitarbeit', value: '2', date: '2026-11-02' }], attendance: [], participation: [], homework: [], studentNotes: [] }] },
  };
}
const downloads = [];
beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
  URL.createObjectURL = () => 'blob:x'; URL.revokeObjectURL = () => {};
  HTMLAnchorElement.prototype.click = function () { downloads.push(this.download); };
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 12, 10, 0));
  app('replaceDB(' + JSON.stringify(sampleDB()) + ')');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  downloads.length = 0;
  if (app('typeof choiceResolve === "function"')) app('answerChoice(null)');
});
afterEach(() => vi.useRealTimers());
const choiceText = () => document.getElementById('modal-choice-text').textContent;
const waitChoice = () => vi.waitFor(() => expect(app('typeof choiceResolve === "function"')).toBe(true));

describe('AU3: Hinweis „unverschlüsselt“ bei allen Dateien mit Schülerdaten', () => {
  it('Schülerakte: erst Hinweis, Abbrechen lädt nichts', async () => {
    app('openSeatingStudentModal("a", "g1", "2026-11-12")');
    const done = app('exportCurrentStudent()');
    await waitChoice();
    expect(choiceText()).toMatch(/unverschlüsselt/);
    app('answerChoice(null)');
    await done;
    expect(downloads).toEqual([]);
  });
  it('Schülerakte: „Herunterladen“ lädt die Datei', async () => {
    app('openSeatingStudentModal("a", "g1", "2026-11-12")');
    const done = app('exportCurrentStudent()');
    await waitChoice();
    app('answerChoice("ok")');
    await done;
    expect(downloads.length).toBe(1);
  });
  it('Noten-CSV: erst Hinweis', async () => {
    app('currentGroupId = "g1"');
    const done = app('exportGradesCSV()');
    await waitChoice();
    expect(choiceText()).toMatch(/unverschlüsselt/);
    app('answerChoice("ok")');
    await done;
    expect(downloads.length).toBe(1);
  });
  it('Sicherung: Hinweis unter den Knöpfen; Datenschutzhinweise nennen die Schülerakte', () => {
    expect(html).toMatch(/Die Datei ist deine Sicherung[^<]*unverschlüsselt/);
    expect(html).toMatch(/Schülerakte/);
  });
});

describe('AU4: Leere Datumsfelder', () => {
  const focus = id => { const el = document.getElementById(id); el.value = ''; el.dispatchEvent(new FocusEvent('focusin', { bubbles: true })); return el.value; };
  it('Einstellungen und optionale Felder bleiben leer', () => {
    for (const id of ['settings-half-year', 'settings-year-end', 'new-student-birthday', 'todo-due', 'class-note-until', 'plan-topic-pinned']) expect(focus(id)).toBe('');
  });
  it('Felder für neue Einträge springen weiter auf heute', () => {
    expect(focus('new-att-date')).toBe('2026-11-12');
    expect(focus('gf-date')).toBe('2026-11-12');
  });
});

describe('AU5: „Neues Schuljahr beginnen“ aus den Einstellungen', () => {
  it('ungespeicherte Einstellungen: Rückfrage wie beim Schließen, Abbrechen bleibt in den Einstellungen', () => {
    app('openSettings()');
    document.getElementById('settings-teacher-name').value = 'Geändert';
    globalThis.confirm = vi.fn(() => false);
    app('openNewYear()');
    expect(globalThis.confirm).toHaveBeenCalled();
    expect(document.getElementById('modal-settings').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('modal-new-year').classList.contains('hidden')).toBe(true);
    globalThis.confirm = () => true;
  });
});

describe('AU6: Konflikt-Fenster auf dem Handy', () => {
  it('Fenster hat eine Breite mit Rand, der ganze-Stand-Teil scrollt, Knopftexte brechen um', () => {
    expect(html).toMatch(/id="modal-sync-conflict"[\s\S]{0,200}class="modal modal-small"/);
    expect(css).toMatch(/\.conflict-whole\{[^}]*display:flex[^}]*min-height:0/);
    expect(css).toMatch(/\.conflict-actions button\{[^}]*white-space:normal/);
  });
});

describe('AU7: Leiste mit vielen angehefteten Klassen', () => {
  it('Schnellzugriff schrumpft und scrollt, damit „Einstellungen“ sichtbar bleibt', () => {
    expect(css).toMatch(/#nav-quick\{[^}]*overflow-y:auto/);
    expect(css).toMatch(/\.nav-items\{[^}]*min-height:0/);
  });
});
