// H10: Einheitliche Linien-Icons statt Emojis in Knöpfen, Reitern und Überschriften.
// Mitarbeit zeigt seit AH52 Zeichen (++ + − −−) statt Smileys.
const { loadApp, app, showGradesOnOpen } = require('./helpers/load-app');

// Erlaubt: „kein Wert“ ➖, Schließen-Kreuz ✕, Häkchen ✓, Stift ✎ (Smileys nur noch in Texten wie „Das ist neu“)
const EMOJI = /\p{Extended_Pictographic}/u;
const ALLOWED = new Set(['➖', '✕', '✓', '✎']);
function emojisIn(text) {
  return [...text].filter(ch => EMOJI.test(ch) && !ALLOWED.has(ch));
}
// Findet Elemente mit Emojis und liefert „Tag: Text“ zur Fehlermeldung
function offenders(root) {
  const sel = 'button, a, .tab-btn, h2, h3, .notes-section-icon, .empty-state-icon, .ausfall-icon, .dash-warn-title, [style*="font-size: 48px"]';
  return [...root.querySelectorAll(sel)]
    .filter(el => emojisIn(el.textContent).length)
    .map(el => `${el.tagName}: ${el.textContent.trim().slice(0, 50)}`);
}

function sampleDB() {
  return {
    settings: { teacherName: 'Test', school: '', blocks: null, warnAbsences: 1, warnHomework: 1, warnGrade: 0 },
    lessonSlots: [],
    lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '1A', color: '#6366f1', schularbeitWeight: 50,
      participationEvents: [{ date: '2026-09-17', label: '' }] }],
    students: {
      g1: [{ id: 's1', firstName: 'Anna', lastName: 'Muster', grades: [], studentNotes: [],
        participation: [{ date: '2026-09-17', value: 'positive' }],
        attendance: [{ date: '2026-09-17', type: 'abwesend', note: '' }],
        homework: [{ id: 'x1', date: '2026-09-17', note: '' }] }],
    },
  };
}

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp(); showGradesOnOpen();
});

describe('H10: Linien-Icons statt Emojis', () => {
  it('statisches Markup (Reiter, Knöpfe, Überschriften) enthält keine Emojis', () => {
    expect(offenders(document.body)).toEqual([]);
  });

  it('Mitarbeit im Sitzplan als Zeichen mit Wort (AH52)', () => {
    const signs = [...document.querySelectorAll('#modal-seating-student .sw-faces .part-sign')].map(b => b.textContent.trim());
    expect(signs).toEqual(['++', '+', '−', '−−']);
  });

  it('alle Icon-Platzhalter sind ersetzt und verweisen auf vorhandene Icons', () => {
    const html = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
    const names = [...html.matchAll(/data-icon="([^"]+)"/g)].map(m => m[1]);
    expect(names.length).toBeGreaterThan(10);
    names.forEach(n => expect(app('ICONS')[n], n).toBeTruthy());
    expect(document.querySelectorAll('[data-icon]').length).toBe(0);
    expect(document.querySelector('#overview-tab-grades svg.ico')).not.toBeNull();
  });

  it('icon() baut ein Linien-SVG wie im Menü', () => {
    const svg = app('icon("grades")');
    expect(svg).toMatch(/^<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"/);
    expect(() => app('icon("gibtsnicht")')).toThrow();
  });

  it('gerenderte Ansichten: Klassenkarten, leere Liste, Dashboard-Warnungen', () => {
    app('renderSubjectGroups()');
    app('switchView("dashboard")');
    const dash = document.getElementById('view-dashboard');
    expect(dash.querySelector('.dash-warn-title svg.ico')).not.toBeNull();
    expect(offenders(document.body)).toEqual([]);
  });

  it('Notentabelle Mitarbeit zeigt Zeichen statt Smileys (AH52)', () => {
    app('openGroupStudents("g1")');
    app('switchClassDashboardTab("participation")');
    expect(document.querySelector('#overview-content .ov-part-btn .part-sign').textContent).toBe('+');
    expect(offenders(document.body)).toEqual([]);
  });
});
