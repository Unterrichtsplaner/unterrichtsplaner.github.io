// Stundenplan als PDF (Druckansicht im Stil der Schul-Stundenpläne): regelmäßiger Plan, A4 quer.
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

function sampleDB() {
  return {
    settings: { teacherName: 'Frau Muster', school: 'Gymnasium Beispielstadt', blocks: null,
      holidays: [{ id: 'h', label: 'Herbstferien', from: '2026-10-19', until: '2026-10-30' }] },
    lessonSlots: [
      { id: 'w', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly', room: 'R101' },
      { id: 'a', day: 1, block: 2, part: 'full', subject: 'Physik', color: '#22c55e', groupId: 'g2', recurring: 'biweekly', startDate: '2026-10-20', room: 'Physiksaal' },
      { id: 'b', day: 1, block: 2, part: 'full', subject: 'Chemie', color: '#f97316', recurring: 'biweekly', startDate: '2026-10-27', room: 'C1' },
      { id: 'h1', day: 2, block: 3, part: 'first', subject: 'AG', color: '#ef4444', recurring: 'weekly' },
      { id: 'once', day: 3, block: 1, part: 'full', subject: 'Vertretung 8c', color: '#f97316', recurring: 'none', specificDate: '2026-10-22', substitute: true },
      { id: 'old', day: 4, block: 1, part: 'full', subject: 'Alt', color: '#64748b', recurring: 'weekly', validUntil: '2026-10-01' },
      { id: 'xss', day: 4, block: 4, part: 'full', subject: '<img src=x onerror="window.__xssP=1">', color: '#64748b', recurring: 'weekly', room: '<b>R</b>' },
    ],
    lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '7a', color: '#6366f1', schularbeitWeight: 50 },
             { id: 'g2', subject: 'Physik', className: '9c', color: '#22c55e', schularbeitWeight: 50 }],
    students: { g1: [], g2: [] },
    supervisions: [{ id: 'u', day: 0, start: '09:15', end: '09:45', place: 'Hof', recurring: 'weekly' }],
  };
}
const area = () => document.getElementById('print-area');
const cell = (day, blockIdx) => area().querySelectorAll('tr.pt-block')[blockIdx].querySelectorAll('td')[day];

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 21, 10, 0)); // Mi 21.10.2026 – in den Herbstferien
  app('db = ' + JSON.stringify(sampleDB()));
  window.print = vi.fn();
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});
afterEach(() => vi.useRealTimers());

describe('Stundenplan drucken / PDF', () => {
  it('Knopf im Stundenplan-Kopf öffnet das Fenster, vorbelegt mit Name und Woche', () => {
    const btn = document.querySelector('#view-timetable button[onclick="openPrintTimetable()"]');
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('aria-label')).toMatch(/drucken/i);
    app('openPrintTimetable()');
    expect(document.getElementById('modal-print').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('print-name').value).toBe('Frau Muster');
    expect(document.getElementById('print-from').value).toBe('2026-10-19');
    expect(document.getElementById('print-color').checked).toBe(true);
  });

  it('Drucken baut die Tabelle und ruft den Druckdialog; das Fenster schließt', () => {
    app('openPrintTimetable()');
    app('printTimetable()');
    expect(window.print).toHaveBeenCalled();
    expect(document.getElementById('modal-print').classList.contains('hidden')).toBe(true);
    expect(area().querySelector('table.pt-table')).toBeTruthy();
    expect(area().textContent).toContain('Stundenplan');
    expect(area().textContent).toContain('Frau Muster');
    expect(area().textContent).toContain('Gymnasium Beispielstadt');
    expect(area().textContent).toContain('Schuljahr 2026/27');
    expect(area().textContent).toMatch(/gültig ab Mo\.?,? 19\.10\.2026/);
  });

  it('Tabelle: Mo–Fr, eine Zeile je Block mit Zeiten; Ferien zählen nicht (Plan in den Ferien trotzdem voll)', () => {
    app('buildPrintTimetable({ from: "2026-10-19", name: "Frau Muster", color: true })');
    const heads = [...area().querySelectorAll('thead th')].map(t => t.textContent.trim());
    expect(heads.slice(1)).toEqual(['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']);
    expect(area().querySelectorAll('tr.pt-block')).toHaveLength(4);
    expect(area().querySelector('tr.pt-block th').textContent).toMatch(/07:45/);
    expect(cell(0, 0).textContent).toContain('7a');
    expect(cell(0, 0).textContent).toContain('Mathe');
    expect(cell(0, 0).textContent).toContain('R101');
  });

  it('A/B-Wochen: beide Stunden in derselben Zelle mit Kennzeichen, Legende erklärt die Wochen', () => {
    app('buildPrintTimetable({ from: "2026-10-19", name: "", color: true })');
    const t = cell(1, 1).textContent;
    expect(t).toContain('9c');
    expect(t).toContain('Chemie');
    const tags = [...cell(1, 1).querySelectorAll('.pt-tag')].map(x => x.textContent);
    expect(tags.sort()).toEqual(['A', 'B']);
    expect(area().textContent).toMatch(/A = Woche ab Mo\.?,? 19\.10\.2026/);
  });

  it('halbe Stunden gekennzeichnet; einmalige Stunden und beendete fehlen', () => {
    app('buildPrintTimetable({ from: "2026-10-19", name: "", color: true })');
    expect(cell(2, 2).textContent).toMatch(/1\. Hälfte/);
    expect(area().textContent).not.toContain('Vertretung 8c');
    expect(area().textContent).not.toContain('Alt');
  });

  it('Pausenaufsicht steht in einer Pausenzeile', () => {
    app('buildPrintTimetable({ from: "2026-10-19", name: "", color: true })');
    const pause = area().querySelector('tr.pt-pause');
    expect(pause).toBeTruthy();
    expect(pause.querySelectorAll('td')[0].textContent).toContain('Hof');
  });

  it('Schwarz-weiß: keine Klassenfarben', () => {
    app('buildPrintTimetable({ from: "2026-10-19", name: "", color: false })');
    expect(area().querySelector('.pt-table').classList.contains('pt-bw')).toBe(true);
  });

  it('Daten werden nie als HTML ausgeführt', () => {
    app('buildPrintTimetable({ from: "2026-10-19", name: "<img src=y onerror=\\"window.__xssP=2\\">", color: true })');
    expect(area().querySelector('img')).toBeNull();
    expect(area().textContent).toContain('<b>R</b>');          // Raum als Text, nicht als Fettdruck
    expect(area().textContent).toContain('<img src=');
    expect(window.__xssP).toBeUndefined();
  });

  it('Druck-CSS: A4 quer, beim Drucken nur der Plan', () => {
    expect(CSS).toMatch(/@page\s*\{[^}]*size:\s*A4 landscape/);
    expect(CSS).toMatch(/@media print[\s\S]*body > \*:not\(#print-area\)\{[^}]*display:none/);
  });
});
