// Block B (Noten): Eingabe, Speichern/Löschen über das Notenformular, einheitlicher Durchschnitt,
// CSV-Export, Gewichtung, Feld `note` statt `label`.
const { loadApp, app } = require('./helpers/load-app');

// Anna: Schularbeit 1, zwei Tests 3 → gewichtet (50/50) 2,0; ungewichtet wäre es 2,3.
function sampleDB() {
  return {
    settings: { teacherName: 'Test', school: '', blocks: null },
    lessonSlots: [],
    lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '1A', color: '#6366f1', schularbeitWeight: 50 }],
    students: {
      g1: [{
        id: 's1', firstName: 'Anna', lastName: 'Muster',
        grades: [
          { type: 'schularbeit', value: '1.0', date: '2026-09-01', note: 'SA 1' },
          { type: 'test', value: '3.0', date: '2026-09-02', note: 'Test 1' },
          { type: 'test', value: '3.0', date: '2026-09-03', note: 'Test 2' },
        ],
        attendance: [], participation: [], homework: [], studentNotes: [],
      }],
    },
  };
}

function resetDB() {
  app('db = ' + JSON.stringify(sampleDB()));
}

const anna = () => app('db').students.g1[0];
const lastToast = () => {
  const toasts = document.querySelectorAll('#toast-container .toast');
  return toasts.length ? toasts[toasts.length - 1] : null;
};

function fillGradeForm({ type = 'test', value, date = '2026-09-10', label = '' }) {
  document.getElementById('gf-type').value = type;
  document.getElementById('gf-value').value = value;
  document.getElementById('gf-date').value = date;
  document.getElementById('gf-label').value = label;
}

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});

beforeEach(() => {
  resetDB();
  document.getElementById('toast-container').innerHTML = '';
  app('closeGradeForm()');
});

describe('B1: Notenformular speichern/löschen', () => {
  it('Speichern aus der Notentabelle wirft keinen Fehler und aktualisiert die Tabelle', () => {
    app('openClassOverview("g1")');
    app('openGradeForm("s1", "g1", -1)');
    fillGradeForm({ value: '4', label: 'Neu' });
    expect(() => app('saveGradeFromForm()')).not.toThrow();
    expect(document.getElementById('overview-content').innerHTML).toContain('Neu');
  });

  it('Löschen aus der Notentabelle wirft keinen Fehler und aktualisiert die Tabelle', () => {
    app('openClassOverview("g1")');
    app('openGradeForm("s1", "g1", 1)');
    expect(() => app('deleteGradeFromForm()')).not.toThrow();
    expect(anna().grades.map(g => g.note)).toEqual(['SA 1', 'Test 2']);
    expect(document.getElementById('overview-content').innerHTML).not.toContain('Test 1');
  });

  it('bearbeitet die geöffnete Note, auch wenn sich die Liste inzwischen verschoben hat', () => {
    app('openGradeForm("s1", "g1", 2)'); // „Test 2“
    anna().grades.splice(0, 1);             // z. B. durch Sync/anderes Fenster
    fillGradeForm({ value: '5', label: 'Test 2' });
    app('saveGradeFromForm()');
    expect(anna().grades.map(g => `${g.note}=${g.value}`)).toEqual(['Test 1=3.0', 'Test 2=5.0']);
  });

  it('löscht die geöffnete Note, auch wenn sich die Liste inzwischen verschoben hat', () => {
    app('openGradeForm("s1", "g1", 2)'); // „Test 2“
    anna().grades.splice(0, 1);
    app('deleteGradeFromForm()');
    expect(anna().grades.map(g => g.note)).toEqual(['Test 1']);
  });

  it('Schülerdetail wird nach dem Löschen aktualisiert', () => {
    app('openGroupStudents("g1")');
    app('openStudentDetail("s1")');
    app('openGradeForm("s1", "g1", 0)');
    app('deleteGradeFromForm()');
    expect(document.getElementById('grades-list').textContent).not.toContain('SA 1');
  });
});

describe('B2: Noteneingabe', () => {
  it.each([
    ['2,5', '2.5', 2.5],
    ['2.5', '2.5', 2.5],
    ['2', '2.0', 2],
    ['2-', '2-', 2],
    ['2+', '2+', 2],
    ['2,5-', '2.5-', 2.5],
  ])('„%s“ wird als „%s“ gespeichert und zählt als %d', (input, stored, num) => {
    expect(app('parseGradeInput')(input)).toEqual({ value: stored, number: num });
  });

  it('Text ohne Zahl (z. B. „+“ für Mitarbeit) bleibt stehen und zählt nicht', () => {
    expect(app('parseGradeInput')('+')).toEqual({ value: '+', number: null });
  });

  it.each(['25', '0', '7', '2,5x', '2--'])('„%s“ wird abgelehnt', (input) => {
    expect(app('parseGradeInput')(input)).toBeNull();
  });

  it('Formular speichert „2,5“ als 2.5', () => {
    app('openGradeForm("s1", "g1", -1)');
    fillGradeForm({ value: '2,5', label: 'Komma' });
    app('saveGradeFromForm()');
    expect(anna().grades.find(g => g.note === 'Komma').value).toBe('2.5');
  });

  it('Formular lehnt „25“ ab und speichert nichts', () => {
    app('openGradeForm("s1", "g1", -1)');
    fillGradeForm({ value: '25', label: 'Tippfehler' });
    app('saveGradeFromForm()');
    expect(anna().grades.find(g => g.note === 'Tippfehler')).toBeUndefined();
    expect(lastToast().className).toContain('error');
  });

  it('Notentabelle speichert „2-“ mit Tendenz', () => {
    app('openClassOverview("g1")');
    app('updateInlineGrade("s1", "2026-09-02", "Test 1", "2-", "test")');
    expect(anna().grades.find(g => g.note === 'Test 1').value).toBe('2-');
  });

  it('Tendenz wird im Durchschnitt ignoriert', () => {
    anna().grades = [{ type: 'test', value: '2-' }, { type: 'test', value: '3+' }];
    expect(app('calculateStudentAverage')(anna(), 'g1')).toBeCloseTo(2.5, 5);
  });
});

describe('B3: überall derselbe (gewichtete) Durchschnitt', () => {
  it('Klassenkarte', () => {
    app('switchView("classes")');
    const card = document.querySelector('.subject-group-card');
    expect(card.querySelector('.sgc-stat-value[style]').textContent).toBe('2.0');
  });

  it('Schülerdetail', () => {
    app('openGroupStudents("g1")');
    app('openStudentDetail("s1")');
    expect(document.querySelector('#grades-summary .grade-avg-display').textContent).toBe('2.0');
  });

  it('Sitzplan', () => {
    app('currentSeatingGroupId = "g1"; currentSeatingDateStr = "2026-09-10"');
    app('renderSeatingPlan()');
    expect(document.querySelector('.seating-card .sc-gpa').textContent).toBe('2.0');
  });
});

describe('B4: CSV-Export nach Gewichtungs-Kategorien', () => {
  it('Spalten Schularbeiten/Sonstige passen zur Gesamtnote', async () => {
    let blob = null;
    const origCreate = URL.createObjectURL, origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = (b) => { blob = b; return 'blob:test'; };
    URL.revokeObjectURL = () => {};
    const origClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = () => {};
    try {
      anna().grades.push({ type: 'projekt', value: '5.0', date: '2026-09-04', note: 'Referat' });
      app('currentGroupId = "g1"');
      app('exportGradesCSV()');
    } finally {
      URL.createObjectURL = origCreate; URL.revokeObjectURL = origRevoke;
      HTMLAnchorElement.prototype.click = origClick;
    }
    const text = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsText(blob); });
    const lines = text.replace(/^﻿/, '').trim().split('\n');
    expect(lines[0]).toBe('Nachname;Vorname;Schularbeiten;Sonstige;Gesamtnote');
    // Schularbeit 1; Sonstige (3+3+5)/3 = 3,67; gesamt 50/50 = 2,33
    expect(lines[1]).toBe('"Muster";"Anna";"1,00";"3,67";"2,33"');
  });

  it('Notentypen sind zentral einer Kategorie zugeordnet', () => {
    const cat = app('gradeCategory');
    expect(cat('schularbeit')).toBe('schularbeit');
    expect(cat('klausur')).toBe('schularbeit');
    ['test', 'mitarbeit', 'muendlich', 'projekt', 'hausaufgabe', 'sonstig'].forEach(t =>
      expect(cat(t)).toBe('sonstige'));
  });
});

describe('B5: Gewichtung 0–100', () => {
  it('150 % wird beim Speichern abgelehnt', () => {
    app('openEditGroup("g1")');
    document.getElementById('weight-schularbeit').value = '150';
    app('saveSubjectGroup()');
    expect(app('db').groups[0].schularbeitWeight).toBe(50);
    expect(lastToast().className).toContain('error');
    app('editingGroupId = null; closeModal("modal-add-group")');
  });

  it('gespeicherte 150 % ergeben keinen Schnitt außerhalb der Noten', () => {
    app('db').groups[0].schularbeitWeight = 150;
    // wird wie 100 % behandelt → nur Schularbeit zählt
    expect(app('calculateStudentAverage')(anna(), 'g1')).toBeCloseTo(1.0, 5);
  });
});

describe('B6: Bemerkung heißt immer `note`', () => {
  it('loadDB übernimmt altes `label` nach `note`', () => {
    const old = sampleDB();
    old.students.g1[0].grades = [
      { type: 'test', value: '2.0', date: '2026-09-01', label: 'Alt' },
      { type: 'test', value: '2.0', date: '2026-09-02', note: 'Neu', label: 'ignoriert' },
    ];
    localStorage.setItem('lehrerapp_v3', JSON.stringify(old));
    const loaded = app('loadDB()');
    const grades = loaded.students.g1[0].grades;
    expect(grades[0]).toEqual({ type: 'test', value: '2.0', date: '2026-09-01', note: 'Alt' });
    expect(grades[1]).toEqual({ type: 'test', value: '2.0', date: '2026-09-02', note: 'Neu' });
  });

  it('toter Code addGradeEntry/deleteGrade ist entfernt', () => {
    expect(app('typeof addGradeEntry')).toBe('undefined');
    expect(app('typeof deleteGrade')).toBe('undefined');
  });
});

describe('B7: leere Bemerkung', () => {
  it('Sitzplan-Schülerfenster zeigt den Notentyp statt eines leeren Titels', () => {
    anna().grades = [{ type: 'test', value: '2.0', date: '2026-09-01', note: '' }];
    app('openSeatingStudentModal("s1", "g1", "2026-09-10")');
    expect(document.getElementById('seating-student-grades').textContent).toContain('Test');
    app('closeModal("modal-seating-student")');
  });
});
