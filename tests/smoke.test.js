// Rauchtest: startet die App mit dem echten index.html-Markup und prüft,
// dass die Hauptansichten ohne JavaScript-Fehler rendern.
const { loadApp, app } = require('./helpers/load-app');

const SAMPLE_DB = {
  settings: { teacherName: 'Test', school: '', blocks: null },
  lessonSlots: [
    { id: 'slot1', day: 0, block: 1, subject: 'Mathe', groupId: 'g1', recurring: 'weekly', color: '#6366f1' },
  ],
  lessonData: {},
  groups: [{ id: 'g1', subject: 'Mathe', className: '1A', color: '#6366f1', schularbeitWeight: 50 }],
  students: {
    g1: [{
      id: 's1', firstName: 'Anna', lastName: 'Muster',
      grades: [{ type: 'test', value: '2.0', date: '2026-09-01', note: 'Test 1' }],
      attendance: [], participation: [], homework: [], studentNotes: [],
    }],
  },
};

describe('App-Start', () => {
  beforeAll(() => {
    localStorage.setItem('lehrerapp_v3', JSON.stringify(SAMPLE_DB));
    loadApp();
  });

  it('lädt die gespeicherte Datenbank aus localStorage', () => {
    expect(app('db').groups[0].className).toBe('1A');
  });

  it.each(['dashboard', 'timetable', 'classes', 'seating'])('Ansicht "%s" rendert ohne Fehler', (view) => {
    expect(() => app(`switchView(${JSON.stringify(view)})`)).not.toThrow();
  });

  it('Schülerliste einer Klasse rendert ohne Fehler', () => {
    expect(() => app('openGroupStudents("g1")')).not.toThrow();
  });

  it('Klassenübersicht (Notentabelle) rendert ohne Fehler', () => {
    expect(() => app('openClassOverview("g1")')).not.toThrow();
  });
});
