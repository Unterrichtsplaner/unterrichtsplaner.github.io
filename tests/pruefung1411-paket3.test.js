// Gesamtprüfung 14.11.2026, Paket 3: Schüler-Fenster. BB1, BB2, BB3, BB4, BA3.
const { loadApp, app } = require('./helpers/load-app');

const st = (id, f, extra = {}) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [
      { id: 'mo', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#3b82f6', groupId: 'g1', recurring: 'weekly' },
      { id: 'do', day: 3, block: 2, part: 'full', subject: 'Mathe', color: '#3b82f6', groupId: 'g1', recurring: 'weekly' },
    ],
    lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50,
      classNotes: [{ id: 'n1', text: 'Lena: Attest bis Freitag', date: '2026-11-10' }] }],
    students: { g1: [st('a', 'Anna'), st('b', 'Ben')] },
  };
}
const S = id => `db.students.g1.find(x => x.id === "${id}")`;
const visible = id => !document.getElementById(id).classList.contains('hidden');
const toast = () => document.getElementById('toast-container').textContent;

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 12, 9, 0));   // Do 12.11.2026, 2. Block
  app('replaceDB(' + JSON.stringify(sampleDB()) + ')');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
  globalThis.confirm = () => true;
});
afterEach(() => { app('closeModal("modal-seating-student"); closeModal("modal-lesson"); closeModal("modal-grade")'); app('switchView("dashboard")'); vi.useRealTimers(); });

describe('BB1: Ein-Tipp-Knöpfe verwerfen keinen angefangenen Fehlzeit-Grund', () => {
  const open = () => {
    app('openSeatingStudentModal("a", "g1", profileDefaultDate(), { more: true })');
    document.getElementById('new-att-date').value = '2026-11-11';
    document.getElementById('new-att-type').value = 'entschuldigt';
    document.getElementById('new-att-note').value = 'Attest';
  };
  const stillOpen = () => {
    expect(visible('modal-seating-student')).toBe(true);
    expect(document.getElementById('new-att-note').value).toBe('Attest');
    expect(document.getElementById('new-att-date').value).toBe('2026-11-11');
    expect(toast()).toMatch(/noch nicht eingetragen/);
  };
  it('Note geben', () => { open(); app('giveQuickGrade("2")'); expect(app(`${S('a')}.grades.length`)).toBe(1); stillOpen(); });
  it('Fehlt und zweites Tippen auf Fehlt', () => {
    open(); app('setSeatingAbsence("abwesend")'); stillOpen();
    app('setSeatingAbsence("abwesend")'); stillOpen();
    expect(app(`${S('a')}.attendance.length`)).toBe(0);
  });
  it('Zu spät', () => { open(); app('setSeatingLate()'); stillOpen(); });
  it('HA fehlt und wieder weg', () => { open(); app('setSeatingHomework()'); stillOpen(); app('setSeatingHomework()'); stillOpen(); });
  it('Mitarbeit entfernen (zweiter Tipp)', () => {
    open(); app('addParticipationSmiley("positive")'); app('addParticipationSmiley("positive")');
    expect(app(`${S('a')}.participation.length`)).toBe(0);
    stillOpen();
  });
  it('„Name, Geburtstag, Hinweise ändern“ fragt vorher', () => {
    open();
    globalThis.confirm = () => false;
    app('seatingMenuAction("edit")');
    expect(visible('modal-add-student')).toBe(false);
    expect(visible('modal-seating-student')).toBe(true);
    app('closeModal("modal-add-student")');
  });
  it('ohne Angefangenes schließt das Fenster wie bisher', () => {
    app('openSeatingStudentModal("a", "g1", profileDefaultDate())');
    app('setSeatingAbsence("abwesend")');
    expect(visible('modal-seating-student')).toBe(false);
  });
});

describe('BB2: Nach dem Notenformular bleibt ein gewähltes Datum', () => {
  it('Fehlzeit-Datum bleibt auf dem 10.11.', () => {
    app('openSeatingStudentModal("a", "g1", profileDefaultDate(), { more: true })');
    document.getElementById('new-att-date').value = '2026-11-10';
    document.getElementById('new-att-note').value = 'Bus';
    document.getElementById('new-hw-student-date').value = '2026-11-09';
    app('openGradeFormForCurrentStudent()');
    app('closeGradeForm()');
    expect(visible('modal-seating-student')).toBe(true);
    expect(document.getElementById('new-att-date').value).toBe('2026-11-10');
    expect(document.getElementById('new-att-note').value).toBe('Bus');
    expect(document.getElementById('new-hw-student-date').value).toBe('2026-11-09');
  });
  it('anderer Schüler: Datumsfelder wieder auf heute', () => {
    app('openSeatingStudentModal("a", "g1", profileDefaultDate(), { more: true })');
    document.getElementById('new-att-date').value = '2026-11-10';
    app('openSeatingStudentModal("b", "g1", profileDefaultDate(), { more: true })');
    expect(document.getElementById('new-att-date').value).toBe('2026-11-12');
  });
});

describe('BB3: Stunden-Fenster aus dem Sitzplan verbirgt Aufgedecktes beim Verlassen der App', () => {
  it('Klassennotiz nach „Anzeigen“ und Pause wieder verborgen', () => {
    app('openLessonDetail("do", "2026-11-12", { fromSeating: true })');
    const box = () => document.getElementById('modal-lesson').textContent;
    expect(box()).not.toMatch(/Lena/);
    app('showLessonPrivate()');
    expect(box()).toMatch(/Lena: Attest/);
    app('onAppHidden()');
    expect(app('lessonPrivateVeiled')).toBe(true);
    expect(box()).not.toMatch(/Lena/);
  });
  it('aus dem Stundenplan geöffnet bleibt es, wie es ist', () => {
    app('openLessonDetail("do", "2026-11-12")');
    app('onAppHidden()');
    expect(app('lessonPrivateVeiled')).toBe(false);
  });
});

describe('BB4: Mitarbeit-Bilanz unter „Mehr“ ist nach jeder Änderung aktuell', () => {
  it('nach Löschen eines Eintrags', () => {
    app(`${S('a')}.participation = [{ id: 'p1', date: '2026-11-10', value: 'positive' }, { id: 'p2', date: '2026-11-11', value: 'positive' }]`);
    app('openSeatingStudentModal("a", "g1", profileDefaultDate(), { more: true })');
    app('revealSeatingStudent()');
    const sum = () => document.getElementById('seating-student-participation-summary').textContent.replace(/\s+/g, ' ');
    expect(sum()).toMatch(/\+ 2/);
    app(`deleteParticipation(${S('a')}.participation[0])`);
    expect(sum()).toMatch(/\+ 1/);
  });
});

describe('BA3: doppelte Fehltage aus Altdaten werden zusammengefasst', () => {
  it('Grund nachtragen unter „Mehr“: ein Eintrag mit beiden Gründen', () => {
    app(`${S('a')}.attendance = [{ id: 'x1', date: '2026-11-10', type: 'abwesend', note: '' }, { id: 'x2', date: '2026-11-10', type: 'entschuldigt', note: 'krank' }]`);
    app('openSeatingStudentModal("a", "g1", profileDefaultDate(), { more: true })');
    document.getElementById('new-att-date').value = '2026-11-10';
    document.getElementById('new-att-type').value = 'entschuldigt';
    document.getElementById('new-att-note').value = 'Attest';
    app('addAttendanceEntry()');
    const att = app(`${S('a')}.attendance`);
    expect(att.length).toBe(1);
    expect(att[0].type).toBe('entschuldigt');
    expect(att[0].note).toMatch(/Attest/);
  });
  it('zweites Tippen auf „Fehlt“ bei zwei „F“ am selben Tag entfernt den Tag ganz', () => {
    app(`${S('a')}.attendance = [{ id: 'x1', date: '2026-11-12', type: 'abwesend', note: '' }, { id: 'x2', date: '2026-11-12', type: 'abwesend', note: 'Bus' }]`);
    app('openSeatingStudentModal("a", "g1", "2026-11-12")');
    app('setSeatingAbsence("abwesend")');
    expect(app(`${S('a')}.attendance.length`)).toBe(0);
  });
});
