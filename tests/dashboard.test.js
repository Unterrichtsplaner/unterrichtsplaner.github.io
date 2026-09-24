// H3: „Heute“-Dashboard – Stunden heute, nächste Stunde mit Notizen, fällige HA/Tests,
// darunter die Warnungen nach Klasse gruppiert und zusammenklappbar.
const { loadApp, app } = require('./helpers/load-app');

// Do 24.09.2026: 1. Block 1A (vorbei), 2. Block 2B (läuft um 10:00), 3. Block 1A (nächste), Fr 1. Block 2B
function sampleDB() {
  return {
    settings: { teacherName: 'Test', school: '', blocks: null, warnAbsences: 1, warnHomework: 1, warnGrade: 0 },
    lessonSlots: [
      { id: 'sA', day: 3, block: 1, subject: 'Mathe', groupId: 'g1', recurring: 'weekly', color: '#6366f1', part: 'full' },
      { id: 'sB', day: 3, block: 2, subject: 'Deutsch', groupId: 'g2', recurring: 'weekly', color: '#ec4899', part: 'full', room: 'R 12' },
      { id: 'sC', day: 3, block: 3, subject: 'Mathe', groupId: 'g1', recurring: 'weekly', color: '#6366f1', part: 'full' },
      { id: 'sF', day: 4, block: 1, subject: 'Deutsch', groupId: 'g2', recurring: 'weekly', color: '#ec4899', part: 'full' },
    ],
    lessonData: {
      'sC_2026-09-24': { notes: 'Anna hat letzte Stunde unentschuldigt gefehlt' },
      'sA_2026-09-17': {
        hwEnabled: true, hwItems: [{ id: 'h1', text: 'Buch S. 12 Nr. 3', targetDate: '2026-09-24' }],
        testEnabled: true, testItems: [{ id: 't1', text: 'Bruchrechnen', targetDate: '2026-09-24' }],
      },
      'sF_2026-09-25': { notes: 'Freitagsnotiz' },
    },
    groups: [
      { id: 'g1', subject: 'Mathe', className: '1A', color: '#6366f1', schularbeitWeight: 50 },
      { id: 'g2', subject: 'Deutsch', className: '<b>2B</b>', color: '#ec4899', schularbeitWeight: 50 },
    ],
    students: {
      g1: [
        { id: 's1', firstName: 'Anna', lastName: 'Muster', grades: [], participation: [], studentNotes: [],
          attendance: [{ date: '2026-09-17', type: 'abwesend', note: '' }], homework: [{ id: 'x1', date: '2026-09-17', note: '' }] },
        { id: 's2', firstName: 'Ben', lastName: 'Beispiel', grades: [], participation: [], studentNotes: [], homework: [],
          attendance: [{ date: '2026-09-17', type: 'abwesend', note: '' }] },
      ],
      g2: [
        { id: 's3', firstName: 'Cem', lastName: 'Test', grades: [], participation: [], studentNotes: [], homework: [],
          attendance: [{ date: '2026-09-17', type: 'abwesend', note: '' }] },
      ],
    },
  };
}

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});

beforeEach(() => {
  app('db = migrateDB(' + JSON.stringify(sampleDB()) + ')');
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 24, 10, 0)); // Do 24.09.2026, 10:00
});
afterEach(() => vi.useRealTimers());

const content = () => document.getElementById('dashboard-content');
const render = () => { app('renderDashboard()'); return content(); };
const todayRows = () => [...content().querySelectorAll('.dash-lesson')];

describe('H3: Stunden heute', () => {
  it('zeigt die heutigen Stunden in Block-Reihenfolge, nicht die von morgen', () => {
    render();
    const rows = todayRows();
    expect(rows.map(r => r.dataset.slot)).toEqual(['sA', 'sB', 'sC']);
    expect(content().textContent).not.toContain('Freitagsnotiz');
  });

  it('markiert vorbei / läuft / nächste Stunde', () => {
    render();
    const [a, b, c] = todayRows();
    expect(a.classList.contains('past')).toBe(true);
    expect(b.classList.contains('running')).toBe(true);
    expect(b.textContent).toContain('läuft');
    expect(c.classList.contains('next')).toBe(true);
  });

  it('Klick öffnet die Stunde', () => {
    render();
    expect(todayRows()[2].getAttribute('onclick')).toBe('openLessonDetail("sC","2026-09-24")');
  });

  it('Namen werden escaped', () => {
    render();
    expect(content().innerHTML).not.toContain('<b>2B</b>');
    expect(content().textContent).toContain('<b>2B</b>');
  });

  it('ohne Stunden heute: Hinweis statt leerer Liste', () => {
    app('db.lessonSlots = db.lessonSlots.filter(s => s.day !== 3)');
    render();
    expect(todayRows()).toHaveLength(0);
    expect(content().textContent).toContain('Heute kein Unterricht');
  });

  it('am Wochenende: Stunden des nächsten Schultags (Montag)', () => {
    vi.setSystemTime(new Date(2026, 8, 26, 10, 0)); // Sa 26.09.2026
    app('db.lessonSlots.push({ id: "sM", day: 0, block: 2, subject: "Mathe", groupId: "g1", recurring: "weekly", color: "#6366f1", part: "full" })');
    render();
    expect(todayRows().map(r => r.dataset.slot)).toEqual(['sM']);
    expect(content().textContent).toContain('Montag');
    expect(content().querySelector('.dash-lesson.next').dataset.slot).toBe('sM');
  });
});

describe('H3: nächste Stunde', () => {
  it('zeigt die Notizen der nächsten Stunde', () => {
    render();
    const next = content().querySelector('.dash-next');
    expect(next.textContent).toContain('1A');
    expect(next.textContent).toContain('Anna hat letzte Stunde unentschuldigt gefehlt');
  });

  it('zeigt fällige Hausaufgaben und Tests', () => {
    render();
    const next = content().querySelector('.dash-next');
    expect(next.textContent).toContain('Buch S. 12 Nr. 3');
    expect(next.textContent).toContain('Bruchrechnen');
  });

  it('eine ausfallende Stunde ist nicht die nächste', () => {
    app('db.lessonData["sC_2026-09-24"].ausfall = true');
    render();
    expect(todayRows()[2].classList.contains('ausfall')).toBe(true);
    // heute nichts mehr → nächste Stunde ist Freitag
    expect(content().querySelector('.dash-next').textContent).toContain('Freitagsnotiz');
  });

  it('nach der letzten Stunde: nächste Stunde am nächsten Schultag', () => {
    vi.setSystemTime(new Date(2026, 8, 24, 14, 0));
    render();
    const next = content().querySelector('.dash-next');
    expect(next.textContent).toContain('Freitagsnotiz');
    expect(next.textContent).toContain('Fr');
  });

  it('Rendern verändert die Daten nicht', () => {
    const before = JSON.stringify(app('db'));
    render();
    expect(JSON.stringify(app('db'))).toBe(before);
  });
});

describe('H3: Warnungen nach Klasse gruppiert', () => {
  const groups = () => [...content().querySelectorAll('details.dash-warn-group')];

  it('eine zuklappbare Gruppe pro Klasse mit Anzahl, anfangs zu', () => {
    app('dashboardOpenGroups.clear()');
    render();
    const g = groups();
    expect(g.map(d => d.dataset.group)).toEqual(['g1', 'g2']);
    expect(g[0].querySelector('summary').textContent).toContain('1A');
    expect(g[0].querySelector('summary').textContent).toContain('3'); // 2× Fehlzeiten + 1× HA
    expect(g[1].querySelector('summary').textContent).toContain('1');
    expect(g.every(d => !d.open)).toBe(true);
    expect(g[0].textContent).toContain('Oft Hausaufgaben vergessen');
  });

  it('Klassen ohne Warnung erscheinen nicht', () => {
    app('db.students.g2[0].attendance = []');
    render();
    expect(groups().map(d => d.dataset.group)).toEqual(['g1']);
  });

  it('„Erledigt“ lässt die Gruppe offen', () => {
    app('dashboardOpenGroups.clear()');
    render();
    const g1 = groups()[0];
    g1.open = true;
    g1.dispatchEvent(new Event('toggle'));
    app('acknowledgeWarning("s1", "homework", 1)');
    expect(groups()[0].open).toBe(true);
    expect(groups()[0].textContent).not.toContain('Oft Hausaufgaben vergessen');
  });

  it('keine Warnungen: freundlicher Hinweis, Heute-Teil bleibt', () => {
    app('db.settings.warnAbsences = 0; db.settings.warnHomework = 0');
    render();
    expect(groups()).toHaveLength(0);
    expect(content().textContent).toContain('Keine offenen Warnungen');
    expect(todayRows()).toHaveLength(3);
  });
});
