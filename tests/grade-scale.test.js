// BUGS H7: Notenskala pro Klasse. 1–6 (Standard, auch für bestehende Klassen ohne Feld) oder
// 0–15 Punkte (Oberstufe, höher = besser). Jede Stelle nutzt die Skala der jeweiligen Klasse.
const { loadApp, app } = require('./helpers/load-app');

// g1: alte Klasse ohne gradeScale (= 1–6). g2: Oberstufe mit Punkten.
// Ben (g2): KA 12, Test 3 → 50/50 = 7,5 Punkte. Cara (g2): 13, 14 → 13,5. Dora (g2): 3, 4 → 3,5 (kritisch).
// Anna (g1): 5, 5 → 5,0 (kritisch bei Schwelle 4,5).
function sampleDB() {
  const st = (id, firstName, grades) => ({ id, firstName, lastName: 'X', grades, attendance: [], participation: [], homework: [], studentNotes: [] });
  const g = (type, value, date, note) => ({ type, value, date, note });
  return {
    settings: { teacherName: 'Test', school: '', blocks: null },
    lessonSlots: [],
    lessonData: {},
    groups: [
      { id: 'g1', subject: 'Mathe', className: '7b', color: '#6366f1', schularbeitWeight: 50 },
      { id: 'g2', subject: 'Mathe', className: 'Q1', color: '#10b981', schularbeitWeight: 50, gradeScale: '0-15' },
    ],
    students: {
      g1: [st('a1', 'Anna', [g('schularbeit', '5.0', '2026-09-01', 'KA 1'), g('test', '5.0', '2026-09-02', 'Test 1')])],
      g2: [
        st('b1', 'Ben',  [g('schularbeit', '12', '2026-09-01', 'Klausur 1'), g('test', '3', '2026-09-02', 'Test 1')]),
        st('c1', 'Cara', [g('schularbeit', '13', '2026-09-01', 'Klausur 1'), g('test', '14', '2026-09-02', 'Test 1')]),
        st('d1', 'Dora', [g('schularbeit', '3', '2026-09-01', 'Klausur 1'), g('test', '4', '2026-09-02', 'Test 1')]),
      ],
    },
  };
}

const student = (groupId, id) => app('db').students[groupId].find(s => s.id === id);
const toasts = () => document.getElementById('toast-container').textContent;

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});

beforeEach(() => {
  app('db = ' + JSON.stringify(sampleDB()));
  document.getElementById('toast-container').innerHTML = '';
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  app('currentGradeFormCtx = null; editingGroupId = null');
  window.confirm = () => true;
});

describe('Skala der Klasse', () => {
  it('ohne Feld oder unbekannt: 1–6; Punkte nur, wenn gewählt', () => {
    expect(app('gradeScale(db.groups[0]).id')).toBe('1-6');
    expect(app('gradeScale("g2").id')).toBe('0-15');
    expect(app('gradeScale({ gradeScale: "quatsch" }).id')).toBe('1-6');
    expect(app('gradeScale(null).id')).toBe('1-6');
  });

  it('migrateDB ändert bestehende Klassen nicht (kein Feld nötig)', () => {
    const before = JSON.stringify(app('db').groups);
    app('migrateDB(db)');
    expect(JSON.stringify(app('db').groups)).toBe(before);
  });
});

describe('Eingabe', () => {
  const parse = (v, scale) => app(`parseGradeInput(${JSON.stringify(v)}, gradeScale(${JSON.stringify(scale)}))`);

  it('Punkte: ganze Zahlen 0–15, keine Tendenzen, keine Kommazahlen', () => {
    expect(parse('13', 'g2')).toEqual({ value: '13', number: 13 });
    expect(parse('0', 'g2')).toEqual({ value: '0', number: 0 });
    expect(parse('15', 'g2')).toEqual({ value: '15', number: 15 });
    expect(parse('16', 'g2')).toBeNull();
    expect(parse('12,5', 'g2')).toBeNull();
    expect(parse('12-', 'g2')).toBeNull();
    expect(parse('+', 'g2')).toEqual({ value: '+', number: null }); // Text zählt nicht, wie bisher
  });

  it('1–6 unverändert', () => {
    expect(parse('2,5', 'g1')).toEqual({ value: '2.5', number: 2.5 });
    expect(parse('2-', 'g1')).toEqual({ value: '2-', number: 2 });
    expect(parse('0', 'g1')).toBeNull();
    expect(parse('13', 'g1')).toBeNull();
    expect(app('parseGradeInput("2")')).toEqual({ value: '2.0', number: 2 }); // ohne Skala: 1–6
  });

  it('Notentabelle: Punkte-Klasse nimmt 14, lehnt 2,5 mit Hinweis auf 0–15 ab', () => {
    app('openClassOverview("g2")');
    app('updateInlineGrade("b1", "2026-09-02", "Test 1", "14", "test")');
    expect(student('g2', 'b1').grades[1].value).toBe('14');
    app('updateInlineGrade("b1", "2026-09-02", "Test 1", "2,5", "test")');
    expect(student('g2', 'b1').grades[1].value).toBe('14');
    expect(toasts()).toContain('0 und 15');
  });

  it('Notenformular: Beschriftung und Prüfung nach Skala', () => {
    app('openGradeForm("b1", "g2", -1)');
    expect(document.getElementById('gf-value-label').textContent).toContain('Punkte');
    document.getElementById('gf-value').value = '15';
    app('saveGradeFromForm()');
    expect(student('g2', 'b1').grades.some(g => g.value === '15')).toBe(true);

    app('openGradeForm("a1", "g1", -1)');
    expect(document.getElementById('gf-value-label').textContent).not.toContain('Punkte');
    document.getElementById('gf-value').value = '15';
    app('saveGradeFromForm()');
    expect(student('g1', 'a1').grades.length).toBe(2);
    expect(toasts()).toContain('1 und 6');
  });
});

describe('Anzeige', () => {
  it('Farben: bei Punkten ist hoch gut', () => {
    expect(app('gradeColor(14, gradeScale("g2"))')).toBe('var(--grade-1)');
    expect(app('gradeColor(3, gradeScale("g2"))')).toBe('var(--grade-5)');
    expect(app('gradeColor(1, gradeScale("g1"))')).toBe('var(--grade-1)');
    expect(app('gradeColor(1)')).toBe('var(--grade-1)');
  });

  it('Klassenkarten: Schnitt und Farbe je nach Skala der Klasse', () => {
    app('renderSubjectGroups()');
    const html = document.getElementById('subject-groups-container').innerHTML;
    // Q1: (7,5 + 13,5 + 3,5) / 3 = 8,2 Punkte → grade-3; 7b: 5,0 → grade-5
    expect(html).toMatch(/color:var\(--grade-3\)">8\.2</);
    expect(html).toMatch(/color:var\(--grade-5\)">5\.0</);
  });

  it('Notentabelle: Einzelwerte und Schnitt in Punkt-Farben', () => {
    app('openClassOverview("g2")');
    const html = document.getElementById('overview-content').innerHTML;
    expect(html).toMatch(/color:var\(--grade-1\);text-align:center;">13\.5</); // Cara
    expect(html).toMatch(/color:var\(--grade-5\);text-align:center;">3\.5</); // Dora
  });

  it('Sitzplan: Punkte-Klasse färbt nach Punkten', () => {
    app('db.students.g2.forEach((s, i) => { s.gridX = i; s.gridY = 0; })');
    app('switchView("seating")'); // setzt die Noten wieder auf verborgen (H1)
    app('seatingShowGrades = true; currentSeatingGroupId = "g2"; renderSeatingPlan()');
    const html = document.getElementById('view-seating').innerHTML;
    expect(html).toMatch(/sc-gpa" style="color:var\(--grade-1\)">13\.5</);
    app('seatingShowGrades = false');
  });
});

describe('Warnungen', () => {
  it('Punkte-Klasse: eigene Schwelle (unter 5 Punkten), 1–6-Schwelle gilt nur für 1–6', () => {
    const w = app('collectWarnings()').filter(x => x.type === 'grade');
    const names = w.map(x => x.student.firstName).sort();
    expect(names).toEqual(['Anna', 'Dora']); // Cara (13,5) und Ben (7,5) nicht, obwohl ≥ 4,5
    expect(w.find(x => x.student.firstName === 'Dora').desc).toContain('3.5 Punkte');
    expect(w.find(x => x.student.firstName === 'Anna').desc).toContain('5.00');
  });

  it('Schwelle für Punkte einstellbar, 0 = aus', () => {
    app('db.settings.warnPoints = 8');
    expect(app('collectWarnings()').filter(x => x.type === 'grade').map(x => x.student.firstName).sort())
      .toEqual(['Anna', 'Ben', 'Dora']);
    app('db.settings.warnPoints = 0');
    expect(app('collectWarnings()').filter(x => x.type === 'grade').map(x => x.student.firstName)).toEqual(['Anna']);
  });

  it('Einstellungen speichern die Punkte-Schwelle', () => {
    app('openSettings()');
    expect(document.getElementById('settings-warn-points').value).toBe('5');
    document.getElementById('settings-warn-points').value = '4';
    app('saveSettings()');
    expect(app('db.settings.warnPoints')).toBe(4);
  });
});

describe('Klassen-Dialog', () => {
  const fillGroup = (className, scale) => {
    document.getElementById('new-group-class').value = className;
    document.getElementById('new-group-subject').value = 'Physik';
    document.getElementById('new-group-scale').value = scale;
  };

  it('neue Klasse: Standard 1–6, Punkte wählbar; andere Klassen bleiben', () => {
    app('openAddSubjectGroup()');
    expect(document.getElementById('new-group-scale').value).toBe('1-6');
    fillGroup('Q2', '0-15');
    app('saveSubjectGroup()');
    const q2 = app('db').groups.find(g => g.className === 'Q2');
    expect(q2.gradeScale).toBe('0-15');
    expect(app('db').groups.find(g => g.id === 'g1').gradeScale).toBeUndefined();
  });

  it('Bearbeiten zeigt die Skala der Klasse', () => {
    app('openEditGroup("g2")');
    expect(document.getElementById('new-group-scale').value).toBe('0-15');
    app('openEditGroup("g1")');
    expect(document.getElementById('new-group-scale').value).toBe('1-6');
  });

  it('Wechsel bei vorhandenen Noten nur nach Rückfrage, Noten werden nicht umgerechnet', () => {
    let asked = '';
    window.confirm = msg => { asked = msg; return false; };
    app('openEditGroup("g1")');
    document.getElementById('new-group-scale').value = '0-15';
    app('saveSubjectGroup()');
    expect(asked).toContain('nicht umgerechnet');
    expect(app('gradeScale("g1").id')).toBe('1-6');

    window.confirm = () => true;
    app('openEditGroup("g1")');
    document.getElementById('new-group-scale').value = '0-15';
    app('saveSubjectGroup()');
    expect(app('gradeScale("g1").id')).toBe('0-15');
    expect(student('g1', 'a1').grades.map(g => g.value)).toEqual(['5.0', '5.0']);
  });

  it('ohne Noten keine Rückfrage', () => {
    let asked = false;
    window.confirm = () => { asked = true; return true; };
    app('db.students.g1[0].grades = []');
    app('openEditGroup("g1")');
    document.getElementById('new-group-scale').value = '0-15';
    app('saveSubjectGroup()');
    expect(asked).toBe(false);
    expect(app('gradeScale("g1").id')).toBe('0-15');
  });
});

describe('Exporte', () => {
  let exported;
  beforeEach(() => {
    exported = '';
    const RealBlob = globalThis.Blob;
    globalThis.Blob = class extends RealBlob {
      constructor(parts, opts) { super(parts, opts); exported = parts.join(''); }
    };
    URL.createObjectURL = () => 'blob:test';
    URL.revokeObjectURL = () => {};
    HTMLAnchorElement.prototype.click = () => {};
    return () => { globalThis.Blob = RealBlob; };
  });

  it('CSV einer Punkte-Klasse: Spalten in Punkten, 1 Nachkomma', () => {
    app('currentGroupId = "g2"');
    app('exportGradesCSV()');
    const lines = exported.replace(/^﻿/, '').trim().split('\n');
    expect(lines[0]).toContain('Gesamt (Punkte)');
    expect(lines.find(l => l.includes('Ben'))).toContain('"7,5"');
  });

  it('CSV einer 1–6-Klasse unverändert', () => {
    app('currentGroupId = "g1"');
    app('exportGradesCSV()');
    const lines = exported.replace(/^﻿/, '').trim().split('\n');
    expect(lines[0]).toContain('Gesamtnote');
    expect(lines.find(l => l.includes('Anna'))).toContain('"5,00"');
  });

  it('Schülerakte nennt Punkte', () => {
    app('currentOverviewGroupId = "g2"; currentGroupId = "g2"');
    app('openStudentDetail("c1")');
    app('exportCurrentStudent()');
    expect(exported).toContain('13.5 Punkte');
  });
});
