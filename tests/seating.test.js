// Block H (Sitzplan): Noten ausblenden (H1), „zu spät“ in der Schnellbewertung (H8), keine Wochenenden (H9).
const { loadApp, app } = require('./helpers/load-app');

function sampleDB() {
  return {
    settings: { teacherName: 'Test', school: '', blocks: null },
    lessonSlots: [
      { id: 'slot1', day: 0, block: 1, subject: 'Mathe', groupId: 'g1', recurring: 'weekly', color: '#6366f1' },
    ],
    lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '1A', color: '#6366f1', schularbeitWeight: 50 }],
    students: {
      g1: [{
        id: 's1', firstName: 'Anna', lastName: 'Muster',
        grades: [{ type: 'test', value: '2.0', date: '2026-09-01', note: '' }],
        attendance: [], participation: [], homework: [], studentNotes: [],
      }],
    },
  };
}

const anna = () => app('db').students.g1[0];
const chipDays = () => [...document.querySelectorAll('#seating-date-strip .date-chip .date-chip-day')].map(e => e.textContent);

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});

beforeEach(() => {
  app('db = ' + JSON.stringify(sampleDB()));
  app('currentSeatingGroupId = "g1"; currentSeatingDateStr = "2026-09-10"');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});

describe('H1: Noten im Sitzplan standardmäßig verborgen', () => {
  it('Beim Öffnen zeigt keine Karte einen Notenschnitt', () => {
    app('switchView("seating")');
    app('currentSeatingGroupId = "g1"; renderSeatingPlan()');
    expect(document.querySelector('.seating-card')).not.toBeNull();
    expect(document.querySelector('.seating-card .sc-gpa')).toBeNull();
    expect(document.querySelector('.seating-card').textContent).not.toContain('2.0');
  });

  it('Augen-Knopf blendet die Noten ein und wieder aus', () => {
    app('switchView("seating")');
    app('currentSeatingGroupId = "g1"; renderSeatingPlan()');
    const btn = document.getElementById('btn-seating-grades');
    expect(btn.getAttribute('onclick')).toBe('toggleSeatingGrades()');
    app('toggleSeatingGrades()');
    expect(document.querySelector('.seating-card .sc-gpa').textContent).toBe('2.0');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    app('toggleSeatingGrades()');
    expect(document.querySelector('.seating-card .sc-gpa')).toBeNull();
  });

  it('Zustand wird nicht gespeichert: nach erneutem Öffnen wieder aus', () => {
    app('switchView("seating")');
    app('toggleSeatingGrades()');
    app('switchView("dashboard")');
    app('switchView("seating")');
    app('currentSeatingGroupId = "g1"; renderSeatingPlan()');
    expect(document.querySelector('.seating-card .sc-gpa')).toBeNull();
    expect(JSON.stringify(app('db.settings'))).not.toMatch(/grade/i);
  });
});

describe('H8: „Zu spät“ in der Schnellbewertung', () => {
  it('trägt „zuspät“ ein, zweiter Klick nimmt es wieder heraus', () => {
    app('openSeatingStudentModal("s1", "g1", "2026-09-10")');
    app('setSeatingLate()');
    expect(anna().attendance).toEqual([expect.objectContaining({ date: '2026-09-10', type: 'zuspät' })]);
    expect(document.querySelector('.seating-card').textContent).toContain('Zu spät');

    app('openSeatingStudentModal("s1", "g1", "2026-09-10")');
    app('setSeatingLate()');
    expect(anna().attendance).toEqual([]);
  });

  it('„zu spät“ ersetzt ein Fehlen am selben Tag und umgekehrt', () => {
    app('openSeatingStudentModal("s1", "g1", "2026-09-10")');
    app('setSeatingAbsence("entschuldigt")');
    app('openSeatingStudentModal("s1", "g1", "2026-09-10")');
    app('setSeatingLate()');
    expect(anna().attendance.map(a => a.type)).toEqual(['zuspät']);

    app('openSeatingStudentModal("s1", "g1", "2026-09-10")');
    app('setSeatingAbsence("entschuldigt")');
    expect(anna().attendance.map(a => a.type)).toEqual(['entschuldigt']);
  });

  it('lässt andere Tage unberührt', () => {
    anna().attendance = [{ id: 'x', date: '2026-09-09', type: 'zuspät', note: '' }];
    app('openSeatingStudentModal("s1", "g1", "2026-09-10")');
    app('setSeatingLate()');
    expect(anna().attendance.map(a => a.date)).toEqual(['2026-09-09', '2026-09-10']);
  });

  it('Knopf existiert in der Schnellbewertung', () => {
    expect(document.querySelector('#modal-seating-student [onclick="setSeatingLate()"]')).not.toBeNull();
  });
});

describe('H9: Datumsleiste nur Mo–Fr', () => {
  it('um einen Montag herum: Do Fr Mo Di Mi', () => {
    app('currentSeatingDateStr = "2026-09-14"; renderSeatingDateStrip()');
    expect(chipDays()).toEqual(['Do', 'Fr', 'Mo', 'Di', 'Mi']);
  });

  it('um einen Freitag herum: Mi Do Fr Mo Di', () => {
    app('currentSeatingDateStr = "2026-09-11"; renderSeatingDateStrip()');
    expect(chipDays()).toEqual(['Mi', 'Do', 'Fr', 'Mo', 'Di']);
  });

  it('Wochenende im Kalender gewählt → nächster Montag', () => {
    app('onHiddenDateChange("2026-09-12")'); // Samstag
    expect(app('currentSeatingDateStr')).toBe('2026-09-14');
    app('onHiddenDateChange("2026-09-13")'); // Sonntag
    expect(app('currentSeatingDateStr')).toBe('2026-09-14');
  });

  it('am Wochenende geöffnet → nächster Montag', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date(2026, 8, 26, 10, 0)); // Sa 26.09.2026
      app('currentSeatingDateStr = ""');
      app('switchView("seating")');
      expect(app('currentSeatingDateStr')).toBe('2026-09-28');
      expect(chipDays()).not.toContain('Sa');
      expect(chipDays()).not.toContain('So');
    } finally {
      vi.useRealTimers();
    }
  });
});
