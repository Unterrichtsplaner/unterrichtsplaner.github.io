// Gesamtprüfung 11.11.2026, Paket 6: Schüler-Fenster und Sitzplan. AS2, AS3, AS4, AS5, AS6.
const { loadApp, app } = require('./helpers/load-app');

const st = (id, f, extra = {}) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [
      { id: 'mo', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#3b82f6', groupId: 'g1', recurring: 'weekly' },
      { id: 'mi', day: 2, block: 2, part: 'full', subject: 'Mathe', color: '#3b82f6', groupId: 'g1', recurring: 'weekly' },
      { id: 'fr', day: 4, block: 3, part: 'full', subject: 'Mathe', color: '#3b82f6', groupId: 'g1', recurring: 'weekly' },
    ],
    lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50 }],
    students: { g1: [st('a', 'Anna'), st('b', 'Ben'), st('m', 'Max')] },
  };
}
const at = (d, h, m = 0) => vi.setSystemTime(new Date(2026, 10, d, h, m));
const S = id => `db.students.g1.find(x => x.id === "${id}")`;
const visible = id => !document.getElementById(id).classList.contains('hidden');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  at(12, 13);   // Do 12.11.2026
  app('replaceDB(' + JSON.stringify(sampleDB()) + ')');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
  globalThis.confirm = () => true;
});
afterEach(() => { app('closeModal("modal-seating-student"); closeModal("modal-seating-today"); closeModal("modal-lesson")'); app('switchView("dashboard")'); vi.useRealTimers(); });

describe('AS2: Schüler-Fenster über Nacht offen', () => {
  it('erster Tipp am neuen Tag speichert nichts am Vortag, sondern stellt das Fenster auf heute', () => {
    app('openSeatingStudentModal("a", "g1", profileDefaultDate())');
    at(13, 8);   // Fr 13.11., iPad wieder aufgeklappt
    app('setSeatingAbsence("abwesend")');
    expect(app(`${S('a')}.attendance`)).toEqual([]);
    expect(app('window.currentSeatingStudent.dateStr')).toBe('2026-11-13');
    expect(document.getElementById('toast-container').textContent).toMatch(/Neuer Tag/);
    app('setSeatingAbsence("abwesend")');
    expect(app(`${S('a')}.attendance.map(a => a.date)`)).toEqual(['2026-11-13']);
  });
  it('gilt auch für Mitarbeit und Note', () => {
    app('openSeatingStudentModal("a", "g1", profileDefaultDate())');
    at(13, 8);
    app('addParticipationSmiley("positive")');
    expect(app(`${S('a')}.participation`)).toEqual([]);
    app('openSeatingStudentModal("a", "g1", profileDefaultDate())');
    at(16, 8);   // Mo
    app('giveQuickGrade("2")');
    expect(app(`${S('a')}.grades`)).toEqual([]);
  });
  it('eine eingetippte Notiz wird mit dem neuen Tag gespeichert, nie verworfen', () => {
    app('openSeatingStudentModal("a", "g1", profileDefaultDate())');
    at(13, 8);
    document.getElementById('seating-student-note-input').value = 'Heft vergessen';
    app('addSeatingStudentNote()');
    expect(app(`${S('a')}.studentNotes`)).toEqual([expect.objectContaining({ text: 'Heft vergessen', date: '2026-11-13' })]);
  });
  it('aus dem Stunden-Fenster geöffnet: der Tag der Stunde bleibt', () => {
    app('openSeatingStudentModal("a", "g1", "2026-11-11", { fixedDate: true })');
    at(13, 8);
    app('setSeatingAbsence("abwesend")');
    expect(app(`${S('a')}.attendance.map(a => a.date)`)).toEqual(['2026-11-11']);
  });
});

describe('AS3: „Rückgängig“ zeichnet nur das Fenster des richtigen Schülers neu', () => {
  it('Note für Anna, dann Ben geöffnet, Rückgängig: Bens Notenliste bleibt Bens', () => {
    app(`${S('b')}.grades.push({ type: 'mitarbeit', value: '1', date: '2026-11-02', note: 'Bens Note' })`);
    app('openSeatingStudentModal("a", "g1", profileDefaultDate())');
    app('giveQuickGrade("5")');
    app('openSeatingStudentModal("b", "g1", profileDefaultDate(), { more: true }); setSeatingStudentShown(true)');
    expect(document.getElementById('grades-summary').textContent).toMatch(/1,0/);
    [...document.querySelectorAll('#toast-container .toast-undo button')].find(b => b.textContent === 'Rückgängig').click();
    expect(app(`${S('a')}.grades`)).toEqual([]);
    const sum = document.getElementById('grades-summary').textContent;
    expect(sum).toMatch(/1,0/);   // weiter Bens Schnitt, nicht Annas (jetzt leere) Liste
    expect(sum).not.toMatch(/Noch keine Noten/);
  });
});

describe('AS4: Fenster „Heute“ öffnet die gezeigte Stunde', () => {
  it('nach dem Klingeln: „Stunde eintragen“ öffnet weiter die Stunde, die das Fenster zeigt', () => {
    at(11, 9, 50);   // Mi 11.11., Stunde „mi“ (2. Block) läuft
    app('openSeatingForGroup("g1")');
    app('refreshSeatingCockpit()');
    expect(app('cockpitLesson')).toEqual({ slotId: 'mi', dateStr: '2026-11-11' });
    app('openSeatingToday()');
    at(11, 13, 0);   // Stunde vorbei, Leiste zeigt schon die nächste
    app('refreshSeatingCockpit()');
    expect(app('cockpitLesson && cockpitLesson.slotId')).not.toBe('mi');
    expect(document.querySelector('#modal-seating-today [onclick="openSeatingTodayLesson()"]')).not.toBeNull();
    app('openSeatingTodayLesson()');
    expect(app('activeLessonId')).toBe('mi');
    expect(app('activeLessonDate')).toBe('2026-11-11');
  });
});

describe('AS5: Fehl-Hinweis eines späteren Fehltags bleibt', () => {
  it('Montag entschuldigt: der Hinweis zum weiter unentschuldigten Mittwoch (in der Freitagsstunde) bleibt', () => {
    at(13, 7);
    for (const d of ['2026-11-09', '2026-11-11']) {
      app(`${S('m')}.attendance.push({ id: 'f${d}', date: '${d}', type: 'abwesend' }); addAbsenceNote("g1", "${d}", ${S('m')})`);
    }
    const note = 'Max X hat letzte Stunde unentschuldigt gefehlt';
    expect(app('db.lessonData["mi_2026-11-11"].notes')).toBe(note);
    expect(app('db.lessonData["fr_2026-11-13"].notes')).toBe(note);
    app('openSeatingStudentModal("m", "g1", "2026-11-09", { fixedDate: true })');
    app('setSeatingAbsence("entschuldigt")');
    expect(app('db.lessonData["mi_2026-11-11"].notes')).toBe('');
    expect(app('db.lessonData["fr_2026-11-13"].notes')).toBe(note);
  });
});

describe('AS6: Mitarbeit verwirft keinen angefangenen Fehlzeit-Grund', () => {
  it('Grund eingetippt, dann Mitarbeit: Fenster bleibt offen, Grund bleibt stehen', () => {
    app('openSeatingStudentModal("a", "g1", profileDefaultDate(), { more: true })');
    document.getElementById('new-att-note').value = 'Arzttermin';
    app('addParticipationSmiley("positive")');
    expect(app(`${S('a')}.participation.length`)).toBe(1);
    expect(visible('modal-seating-student')).toBe(true);
    expect(document.getElementById('new-att-note').value).toBe('Arzttermin');
  });
  it('ohne Angefangenes schließt das Fenster wie bisher', () => {
    app('openSeatingStudentModal("a", "g1", profileDefaultDate())');
    app('addParticipationSmiley("positive")');
    expect(visible('modal-seating-student')).toBe(false);
  });
});
