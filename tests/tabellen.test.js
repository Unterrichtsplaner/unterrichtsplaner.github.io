// AH40: Tabellen der Klassenansicht bündig. Alle vier Reiter gleich gebaut: gleiche Namens- und Summenspalte,
// gleich hoher Kopf, gleiche Zeilen, Erklärzeile in fester Höhe, keine senkrechten Linien außer nach der Summe.
const fs = require('fs');
const path = require('path');
const { loadApp, app, showGradesOnOpen } = require('./helpers/load-app');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

const TABS = ['grades', 'participation', 'attendance', 'homework'];
const st = (id, f, extra = {}) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [], lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3d63dd', schularbeitWeight: 50,
      attendanceEvents: [{ date: '2026-10-20', label: 'Ausflug <b>x</b>' }] }],
    students: { g1: [st('a', 'Anna', {
      participation: [{ id: 'p1', date: '2026-10-13', value: 'positive' }],
      attendance: [{ id: 'f1', date: '2026-10-16', type: 'abwesend', note: '' }],
      homework: [{ id: 'h1', date: '2026-10-21', note: 'Arbeitsheft' }],
      grades: [{ type: 'schularbeit', value: '2.0', date: '2026-10-15', note: 'KA 1' }, { type: 'muendlich', value: '3.0', date: '2026-10-22', note: '' }],
    })] },
  };
}
const box = () => document.getElementById('overview-content');
const heads = () => [...box().querySelectorAll('thead th')];
const rule = sel => { const m = CSS.match(new RegExp('(?:^|[}\\s])' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}', 'm')); return m ? m[1] : ''; };

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); showGradesOnOpen(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 4, 10, 0));
  app('db = ' + JSON.stringify(sampleDB()));
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});
afterEach(() => vi.useRealTimers());

describe('Alle vier Reiter gleich gebaut', () => {
  it('Erklärzeile auf jedem Reiter, direkt über der Tabelle', () => {
    for (const tab of TABS) {
      app(`openGroupStudents("g1", "${tab}")`);
      expect(box().firstElementChild.classList.contains('ov-legend'), tab).toBe(true);
      expect(box().firstElementChild.nextElementSibling.classList.contains('overview-table-wrapper'), tab).toBe(true);
    }
  });
  it('Erklärzeile: Mitarbeit mit denselben Wörtern wie das Eintragen, Noten erklärt den Schnitt', () => {
    app('openGroupStudents("g1", "grades")');
    expect(box().querySelector('.ov-legend').textContent).toMatch(/Ø.*Gewichtung/);
    app('openGroupStudents("g1", "participation")');
    const t = box().querySelector('.ov-legend').textContent;
    expect(t).toContain('😊'); expect(t).toMatch(/gut/); expect(t).toMatch(/neutral/); expect(t).toMatch(/schlecht/);
  });
  it('Die Tabelle kennt die Zahl ihrer Spalten für die Mindestbreite', () => {
    app('openGroupStudents("g1", "grades")');
    expect(box().querySelector('table').style.getPropertyValue('--ov-cols')).toBe('2');
    app('openGroupStudents("g1", "attendance")');
    expect(box().querySelector('table').style.getPropertyValue('--ov-cols')).toBe('2');
  });
  it('Spaltenkopf: oben das Datum, darunter Art und Titel, Text aus den Daten escapet', () => {
    app('openGroupStudents("g1", "grades")');
    const ka = heads()[2];
    expect(ka.querySelector('.col-date').textContent).toMatch(/15\.10\./);
    expect(ka.querySelector('.col-sub .col-type.weighted').textContent).toBe('KA');
    expect(ka.querySelector('.col-sub .col-title').textContent).toBe('KA 1');
    app('openGroupStudents("g1", "attendance")');
    const aus = heads().find(h => h.textContent.includes('Ausflug'));
    expect(aus.querySelector('.col-sub .col-title b')).toBeNull();
    expect(aus.querySelector('.col-sub .col-title').textContent).toBe('Ausflug <b>x</b>');
    app('openGroupStudents("g1", "homework")');
    expect(heads()[2].querySelector('.col-sub .col-title').textContent).toBe('Arbeitsheft');
  });
  it('Spalte ohne Bezeichnung: nur das Datum, keine leere Zeile', () => {
    app('openGroupStudents("g1", "participation")');
    expect(heads()[2].querySelector('.col-date')).not.toBeNull();
    expect(heads()[2].querySelector('.col-sub')).toBeNull();
  });
  it('Summenkopf Fehlzeiten bleibt „Fehlt F / E“, auf dem Handy nur „F / E“', () => {
    app('openGroupStudents("g1", "attendance")');
    expect(heads()[1].textContent).toBe('Fehlt F / E');
    expect(heads()[1].querySelector('.ov-wide-only').textContent.trim()).toBe('Fehlt');
  });
  it('Noten-Zellen ohne eigene Innenabstände im HTML (Layout gehört in style.css)', () => {
    app('openGroupStudents("g1", "grades")');
    const td = box().querySelector('td.ov-grade-cell');
    expect(td.getAttribute('style') || '').not.toMatch(/padding/);
    expect(td.querySelector('input').getAttribute('style')).not.toMatch(/padding|width|text-align/);
  });
});

describe('Maße in style.css', () => {
  it('eine Namens- und eine Summenbreite, Spalten teilen sich den Rest', () => {
    expect(rule('.overview-table-wrapper')).toMatch(/--ov-name:208px/);
    expect(rule('.overview-table-wrapper')).toMatch(/--ov-sum:104px/);
    expect(rule('.overview-table-wrapper')).toMatch(/--ov-col:96px/);
    const t = rule('.overview-table');
    expect(t).toMatch(/table-layout:fixed/);
    expect(t).toMatch(/width:100%/);
    expect(t).toMatch(/min-width:calc\(var\(--ov-name\) \+ var\(--ov-sum\) \+ var\(--ov-cols, 0\) \* var\(--ov-col\)\)/);
    expect(rule('.overview-table .ov-sum-col')).toMatch(/left:var\(--ov-name\)/);
    expect(CSS).not.toMatch(/--ov-name-w/);
  });
  it('Kopf und Zeilen an der gemeinsamen Höhe, senkrechte Linie nur nach der Summe', () => {
    expect(rule('.overview-table th')).toMatch(/height:calc\(var\(--control-h\) \+ var\(--space-3\)\)/);
    expect(rule('.overview-table td')).toMatch(/height:var\(--control-h\)/);
    expect(rule('.overview-table th')).not.toMatch(/border-right/);
    expect(rule('.overview-table td')).not.toMatch(/border-right/);
    expect(rule('.overview-table .ov-sum-col')).toMatch(/border-right:1px solid var\(--border\)/);
    for (const b of ['.ov-part-btn', '.ov-cycle-btn']) expect(rule(b), b).toMatch(/min-height:var\(--control-h\)/);
    expect(rule('.overview-table .ov-grade-input')).toMatch(/height:var\(--control-h\)/);
  });
  it('Erklärzeile mit fester Höhe, Tabelle lässt ihr unten Platz', () => {
    const l = rule('.ov-legend');
    expect(l).toMatch(/height:var\(--space-5\)/);
    expect(l).toMatch(/flex-wrap:nowrap/);
    expect(rule('.overview-table-wrapper')).toMatch(/max-height:calc\(100% - var\(--space-5\) - var\(--space-3\)\)/);
  });
  it('Beim Wischen rasten ganze Spalten ein', () => {
    expect(rule('.overview-table-wrapper')).toMatch(/scroll-snap-type:x mandatory/);
    expect(rule('.overview-table-wrapper')).toMatch(/scroll-padding-left:calc\(var\(--ov-name\) \+ var\(--ov-sum\)\)/);
    expect(rule('.overview-table th:not(.ov-name-col):not(.ov-sum-col)')).toMatch(/scroll-snap-align:start/);
  });
  it('Passen nicht alle Spalten, sind nur ganze zu sehen', () => {
    expect(app('overviewColWidth(658, 20, 96)')).toBeCloseTo(658 / 6);
    expect(app('overviewColWidth(658, 4, 96)')).toBeNull();     // alle passen: füllen von selbst die Breite
    expect(app('overviewColWidth(658, 6, 96)')).toBeNull();
    expect(app('overviewColWidth(50, 3, 96)')).toBeNull();
  });
  it('Schmales iPad: „Andere Spalte“ nur als Symbol, mit Namen für VoiceOver', () => {
    expect(CSS).toMatch(/@media \(max-width: 800px\)\{\s*#btn-add-overview-other \.btn-label\{display:none;\}/);
    expect(document.getElementById('btn-add-overview-other').getAttribute('aria-label')).toBeTruthy();
  });
  it('Schmale Ansicht: genau zwei Spalten', () => {
    const narrow = CSS.match(/@container \(max-width: 520px\) \{[\s\S]*?\n\}/g).join('\n');
    expect(narrow).toMatch(/--ov-name:124px/);
    expect(narrow).toMatch(/--ov-sum:72px/);
    expect(narrow).toMatch(/--ov-col:max\(72px, calc\(\(100cqw - 2px - var\(--ov-name\) - var\(--ov-sum\)\) \/ 2\)\)/);
    expect(narrow).toMatch(/\.ov-wide-only\{display:none;\}/);
    expect(narrow).toMatch(/\.col-type:not\(\.weighted\)\{display:none;\}/);
  });
});
