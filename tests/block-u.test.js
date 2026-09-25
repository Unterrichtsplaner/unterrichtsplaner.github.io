// Block U (Review 25.09.2026, dritte Runde): Klassen, Noten, Anwesenheit, Profil.
const { loadApp, app } = require('./helpers/load-app');

const MON = '2026-09-21', WED = '2026-09-23', THU = '2026-09-24';

function stu(id, firstName, lastName, extra = {}) {
  return { id, firstName, lastName, grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra };
}
function sampleDB() {
  return {
    settings: { teacherName: 'Test', school: '', blocks: null },
    lessonSlots: [
      { id: 'l1', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
      { id: 'l2', day: 2, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
      { id: 'l3', day: 4, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
    ],
    lessonData: {},
    groups: [
      { id: 'g1', subject: 'Mathe', className: '7b', year: '2026/27', color: '#6366f1', schularbeitWeight: 50 },
      { id: 'g2', subject: 'Physik', className: '7b', year: '2026/27', color: '#f59e0b', schularbeitWeight: 50 },
    ],
    students: {
      g1: [
        stu('s1', 'Anna', 'Muster', { grades: [
          { type: 'schularbeit', value: '2.0', date: MON, note: 'KA 1' },
        ] }),
        stu('s2', 'Ben', 'Beispiel'),
      ],
      g2: [stu('p1', 'Lukas', 'Meier'), stu('p2', 'Lukas', 'Meier'), stu('p3', 'Mia', 'Neu')],
    },
  };
}

const student = (id) => app('db').students.g1.find(s => s.id === id);
const toasts = () => [...document.querySelectorAll('#toast-container .toast')].map(t => t.textContent).join(' | ');
const undoButton = () => [...document.querySelectorAll('#toast-container .toast-undo button')].pop();
function openProfile(id = 's1', tab = 'grades') {
  app('openGroupStudents("g1")');
  app(`openStudentDetail(${JSON.stringify(id)}, ${JSON.stringify(tab)})`);
}

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-24T10:00:00'));
  app('db = ' + JSON.stringify(sampleDB()));
  app('currentGroupId = "g1"; currentOverviewGroupId = "g1"');
  document.getElementById('toast-container').innerHTML = '';
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  window.confirm = () => true;
});
afterEach(() => vi.useRealTimers());

describe('Datumsfelder im Profil: heute als Vorgabe', () => {
  it('Fehlzeit, HA und Anmerkung haben beim Öffnen das heutige Datum', () => {
    openProfile();
    expect(document.getElementById('new-att-date').value).toBe(THU);
    expect(document.getElementById('new-hw-student-date').value).toBe(THU);
    expect(document.getElementById('new-student-note-date').value).toBe(THU);
  });

  it('nach dem Eintragen steht wieder heute drin (nicht leer)', () => {
    openProfile('s1', 'attendance');
    document.getElementById('new-att-date').value = MON;
    app('addAttendanceEntry()');
    expect(student('s1').attendance[0].date).toBe(MON);
    expect(document.getElementById('new-att-date').value).toBe(THU);
    app('addStudentHomework()');
    expect(student('s1').homework[0].date).toBe(THU);
    expect(document.getElementById('new-hw-student-date').value).toBe(THU);
  });

  it('am Wochenende: letzter Schultag (Freitag)', () => {
    vi.setSystemTime(new Date('2026-09-26T10:00:00')); // Samstag
    openProfile();
    expect(document.getElementById('new-att-date').value).toBe('2026-09-25');
  });
});

describe('U1: vergessene HA über das Profil nicht doppelt', () => {
  it('gleicher Tag und gleiche Spalte wie im Sitzplan → kein zweiter Eintrag, Hinweis', () => {
    student('s1').homework.push({ id: 'h1', date: MON, note: '' });
    openProfile('s1', 'homework');
    document.getElementById('new-hw-student-date').value = MON;
    app('addStudentHomework()');
    expect(student('s1').homework).toHaveLength(1);
    expect(toasts()).toMatch(/schon/);
  });

  it('andere Spalte am selben Tag ist erlaubt', () => {
    student('s1').homework.push({ id: 'h1', date: MON, note: '' });
    openProfile('s1', 'homework');
    document.getElementById('new-hw-student-date').value = MON;
    document.getElementById('new-hw-student-note').value = 'Arbeitsheft';
    app('addStudentHomework()');
    expect(student('s1').homework).toHaveLength(2);
  });
});

describe('U2: Notenformular – das Feld ist der Spaltentitel', () => {
  it('Beschriftung sagt „Spalte“, vorhandene Spalten werden vorgeschlagen', () => {
    student('s2').grades.push({ type: 'test', value: '3.0', date: MON, note: 'Vokabeltest' });
    openProfile('s1');
    app('openGradeForm("s1", "g1", -1)');
    const label = document.querySelector('label[for="gf-label"]') || document.getElementById('gf-label').closest('.form-group').querySelector('label');
    expect(label.textContent).toMatch(/Spalte/);
    const list = document.getElementById(document.getElementById('gf-label').getAttribute('list'));
    const options = [...list.querySelectorAll('option')].map(o => o.value);
    expect(options).toEqual(expect.arrayContaining(['KA 1', 'Vokabeltest']));
  });
});

describe('U3: Löschen im Profil und im Notenformular mit „Rückgängig“', () => {
  it('Anmerkung', () => {
    student('s1').studentNotes.push({ text: 'Sitzt besser vorne', date: MON });
    openProfile('s1', 'notes');
    document.querySelector('#student-notes-list .entry-item-delete').click();
    expect(student('s1').studentNotes).toHaveLength(0);
    undoButton().click();
    expect(student('s1').studentNotes).toHaveLength(1);
    expect(document.getElementById('student-notes-list').textContent).toMatch(/Sitzt besser vorne/);
  });

  it('Fehlzeit samt Grund, auch der Fehl-Hinweis kommt zurück', () => {
    student('s1').attendance.push({ id: 'a1', date: MON, type: 'abwesend', note: 'Bus' });
    app(`addAbsenceNote('g1', '${MON}', db.students.g1[0])`);
    openProfile('s1', 'attendance');
    document.querySelector('#attendance-list .entry-item-delete').click();
    expect(student('s1').attendance).toHaveLength(0);
    expect((app('db').lessonData['l2_' + WED] || {}).notes || '').not.toMatch(/Anna/);
    undoButton().click();
    expect(student('s1').attendance[0].note).toBe('Bus');
    expect(app('db').lessonData['l2_' + WED].notes).toMatch(/Anna Muster/);
  });

  it('Mitarbeit und HA', () => {
    student('s1').participation.push({ id: 'p1', date: MON, value: 'positive' });
    student('s1').homework.push({ id: 'h1', date: MON, note: '' });
    openProfile('s1', 'participation');
    document.querySelector('#participation-list .entry-item-delete').click();
    expect(student('s1').participation).toHaveLength(0);
    undoButton().click();
    expect(student('s1').participation).toHaveLength(1);
    document.querySelector('#student-homework-list [aria-label="Löschen"]').click();
    expect(student('s1').homework).toHaveLength(0);
    undoButton().click();
    expect(student('s1').homework).toHaveLength(1);
  });

  it('Note im Notenformular', () => {
    openProfile('s1');
    app('openGradeForm("s1", "g1", 0)');
    app('deleteGradeFromForm()');
    expect(student('s1').grades).toHaveLength(0);
    undoButton().click();
    expect(student('s1').grades).toHaveLength(1);
    expect(student('s1').grades[0].note).toBe('KA 1');
  });

  it('Wiederherstellen legt keinen zweiten Tages-Eintrag an (F und E am selben Tag)', () => {
    student('s1').attendance.push({ id: 'a1', date: MON, type: 'abwesend', note: '' });
    openProfile('s1', 'attendance');
    document.querySelector('#attendance-list .entry-item-delete').click();
    student('s1').attendance.push({ id: 'a2', date: MON, type: 'entschuldigt', note: 'Attest' });
    undoButton().click();
    expect(student('s1').attendance).toHaveLength(1);
    expect(toasts()).toMatch(/schon/);
  });
});

describe('U4: Klasse kopieren mit Namensgleichen', () => {
  it('zwei „Lukas Meier“ in der Quellklasse → beide kommen an', () => {
    app('openGroupStudents("g1")');
    app('openImportStudentsModal()');
    document.getElementById('import-from-group').value = 'g2';
    document.getElementById('import-skip-duplicates').checked = true;
    app('importStudentsFromGroup()');
    expect(app('db').students.g1.filter(s => s.firstName === 'Lukas')).toHaveLength(2);
  });

  it('wer schon vorher in der Klasse war, wird übersprungen', () => {
    app('db.students.g1.push({ id: "x", firstName: "Mia", lastName: "Neu", grades: [], attendance: [], participation: [], homework: [], studentNotes: [] })');
    app('openGroupStudents("g1")');
    app('openImportStudentsModal()');
    document.getElementById('import-from-group').value = 'g2';
    document.getElementById('import-skip-duplicates').checked = true;
    app('importStudentsFromGroup()');
    expect(app('db').students.g1.filter(s => s.firstName === 'Mia')).toHaveLength(1);
    expect(toasts()).toMatch(/2 Schüler/);
  });
});

describe('U5: Fehlzeiten-Spalte verschieben pflegt den Fehl-Hinweis', () => {
  it('F vom Montag auf Donnerstag → Hinweis wandert von Mittwoch zu Freitag', () => {
    student('s1').attendance.push({ id: 'a1', date: MON, type: 'abwesend', note: '' });
    app(`addAbsenceNote('g1', '${MON}', db.students.g1[0])`);
    expect(app('db').lessonData['l2_' + WED].notes).toMatch(/Anna Muster/);
    app('openGroupStudents("g1")');
    app('switchClassDashboardTab("attendance")');
    app(`openEditColumnModal('${MON}', '')`);
    document.getElementById('new-col-date').value = THU;
    app('saveOverviewColumn()');
    expect(student('s1').attendance[0].date).toBe(THU);
    expect(app('db').lessonData['l2_' + WED].notes || '').not.toMatch(/Anna Muster/);
    expect(app('db').lessonData['l3_2026-09-25'].notes).toMatch(/Anna Muster/);
  });
});

describe('U6: quittierte Warnung bleibt quittiert, wenn es besser wird', () => {
  function warnTypes() { return app('collectWarnings()').filter(w => w.student.id === 's1').map(w => w.type); }

  it('Fehlzeiten: 4 F quittiert, einer nachträglich entschuldigt → keine Warnung', () => {
    ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'].forEach((d, i) =>
      student('s1').attendance.push({ id: 'a' + i, date: d, type: 'abwesend', note: '' }));
    expect(warnTypes()).toContain('absences');
    app('acknowledgeWarning("s1", "absences", 4)');
    student('s1').attendance[0].type = 'entschuldigt';
    expect(warnTypes()).not.toContain('absences');
    // neuer Fehltag danach: wieder Warnung
    student('s1').attendance.push({ id: 'a9', date: '2026-09-10', type: 'abwesend', note: '' });
    expect(warnTypes()).toContain('absences');
  });

  it('Noten: nach Korrektur zum Besseren keine Warnung, zum Schlechteren schon', () => {
    student('s1').grades[0].value = '5.0';
    expect(warnTypes()).toContain('grade');
    app('acknowledgeWarning("s1", "grade", 1)');
    student('s1').grades[0].value = '4.5';
    expect(warnTypes()).not.toContain('grade');
    student('s1').grades[0].value = '6.0';
    expect(warnTypes()).toContain('grade');
  });
});

describe('U7: Eingabe in die zweite gleichnamige Notenspalte', () => {
  it('Ben hat in der Spalte noch nichts: Eingabe in die zweite wird abgelehnt statt in die erste zu rutschen', () => {
    student('s1').grades.push({ type: 'schularbeit', value: '3.0', date: MON, note: 'KA 1' });
    app('openGroupStudents("g1")');
    app('switchClassDashboardTab("grades")');
    app(`updateInlineGrade('s2', '${MON}', 'KA 1', '4', 'schularbeit', 1)`);
    expect(student('s2').grades).toHaveLength(0);
    expect(toasts()).toMatch(/erste/);
  });

  it('in die erste Spalte geht es normal', () => {
    student('s1').grades.push({ type: 'schularbeit', value: '3.0', date: MON, note: 'KA 1' });
    app('openGroupStudents("g1")');
    app('switchClassDashboardTab("grades")');
    app(`updateInlineGrade('s2', '${MON}', 'KA 1', '4', 'schularbeit', 0)`);
    expect(student('s2').grades).toHaveLength(1);
  });
});

describe('U8: Zwischennoten nicht still runden', () => {
  it('1,75 und 2,25 bleiben, wie sie sind', () => {
    expect(app('parseGradeInput("1,75")').value).toBe('1.75');
    expect(app('parseGradeInput("2.25")').value).toBe('2.25');
    expect(app('parseGradeInput("2,5")').value).toBe('2.5');
    expect(app('parseGradeInput("2")').value).toBe('2.0');
    expect(app('gradeNumber("1.75")')).toBe(1.75);
  });
});

describe('U9: „Aktionen“-Knopf nach „Fertig“', () => {
  it('zeigt wieder das Listen-Symbol, nicht den Stift, und behält seinen Namen', () => {
    app('openGroupStudents("g1")');
    const btn = document.getElementById('btn-student-actions');
    const before = btn.innerHTML;
    const label = btn.getAttribute('aria-label');
    app('toggleStudentEditMode()');
    expect(btn.textContent).toMatch(/Fertig/);
    app('toggleStudentEditMode()');
    expect(btn.innerHTML.trim()).toBe(before.trim());
    expect(btn.getAttribute('aria-label')).toBe(label);
  });
});

describe('U10: Texte', () => {
  it('(a) Profil: „Unentschuldigt“, „Zu spät“; „Entschuldigt“ grün', () => {
    student('s1').attendance.push({ id: 'a1', date: MON, type: 'abwesend', note: '' });
    student('s1').attendance.push({ id: 'a2', date: WED, type: 'zuspät', note: '' });
    student('s1').attendance.push({ id: 'a3', date: '2026-09-22', type: 'entschuldigt', note: '' });
    openProfile('s1', 'attendance');
    const text = document.getElementById('attendance-list').textContent;
    expect(text).toMatch(/Unentschuldigt/);
    expect(text).toMatch(/Zu spät/);
    expect(text).not.toMatch(/Abwesend|Zuspät/);
    const exc = [...document.querySelectorAll('#attendance-list .entry-item span')].find(e => e.textContent === 'Entschuldigt');
    expect(exc.style.color).toBe('var(--success)');
  });

  it('(b) Notenformular zeigt „2,5“ und die Beschriftung mit Komma', () => {
    student('s1').grades[0].value = '2.5';
    openProfile('s1');
    app('openGradeForm("s1", "g1", 0)');
    expect(document.getElementById('gf-value').value).toBe('2,5');
    expect(document.getElementById('gf-value-label').textContent).not.toMatch(/2\.5/);
    // Speichern ohne Änderung → Wert bleibt
    app('saveGradeFromForm()');
    expect(student('s1').grades[0].value).toBe('2.5');
  });

  it('(c) leere Klasse: Knopf „Schüler hinzufügen“ im leeren Zustand', () => {
    app('db.students.g1 = []');
    app('openGroupStudents("g1")');
    const box = document.getElementById('students-container');
    expect(box.textContent).not.toMatch(/\+ Schüler"/);
    const btn = [...box.querySelectorAll('button')].find(b => /Schüler hinzufügen/.test(b.textContent));
    expect(btn).toBeTruthy();
  });
});
