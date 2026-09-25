// Block L (Review 25.09.2026): Noten, Anwesenheit, Klassen.
const { loadApp, app } = require('./helpers/load-app');

const MON = '2026-09-21', WED = '2026-09-23';

function sampleDB() {
  return {
    settings: { teacherName: 'Test', school: '', blocks: null },
    lessonSlots: [
      { id: 'l1', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
      { id: 'l2', day: 2, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
      { id: 'l3', day: 4, block: 2, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'none', specificDate: '2026-09-25' },
    ],
    lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', year: '2026/27', color: '#6366f1', schularbeitWeight: 50 }],
    students: {
      g1: [
        { id: 's1', firstName: 'Anna', lastName: 'Muster', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] },
        { id: 's2', firstName: 'Ben', lastName: 'Beispiel', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] },
        { id: 's3', firstName: '', lastName: 'Max', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] },
      ],
    },
  };
}

const student = (id) => app('db').students.g1.find(s => s.id === id);
const nextNote = () => (app('db').lessonData['l2_' + WED] || {}).notes || '';
const lastToast = () => {
  const t = document.querySelectorAll('#toast-container .toast');
  return t.length ? t[t.length - 1].textContent : '';
};
const bodyRows = () => [...document.querySelectorAll('#overview-content tbody tr')];
function showTab(tab) {
  app('openGroupStudents("g1")');
  app(`switchClassDashboardTab(${JSON.stringify(tab)})`);
}

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});

beforeEach(() => {
  app('db = ' + JSON.stringify(sampleDB()));
  document.getElementById('toast-container').innerHTML = '';
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  window.confirm = () => true;
});

describe('L1: Tabellen aktualisieren sich nach Schnellbewertung und Profil', () => {
  it('„Unentschuldigt“ aus der Schnellbewertung erscheint sofort in der Anwesenheitstabelle', () => {
    showTab('attendance');
    app(`openSeatingStudentModal("s1", "g1", "${MON}")`);
    app('setSeatingAbsence("abwesend")');
    const anna = bodyRows().find(r => r.textContent.includes('Anna'));
    expect([...anna.querySelectorAll('input')].map(i => i.value)).toContain('F');
  });

  it('Smiley aus der Schnellbewertung erscheint sofort in der Mitarbeitstabelle', () => {
    showTab('participation');
    app(`openSeatingStudentModal("s1", "g1", "${MON}")`);
    app('addParticipationSmiley("positive")');
    expect(document.getElementById('overview-content').textContent).toContain('😊');
  });

  it('Fehlzeit im Profil löschen aktualisiert die Tabelle', () => {
    student('s1').attendance.push({ date: MON, type: 'entschuldigt', note: '' });
    showTab('attendance');
    app('openStudentDetail("s1")');
    app('deleteAttendance(db.students.g1[0].attendance[0])');
    expect(document.getElementById('overview-content').textContent).not.toContain('21.09');
  });
});

describe('L2: Anwesenheitsspalte mit Bezeichnung', () => {
  it('erscheint nur einmal, mit Bezeichnung', () => {
    app('db').groups[0].attendanceEvents = [{ date: '2026-09-10', label: 'Wandertag' }];
    student('s1').attendance.push({ date: '2026-09-10', type: 'abwesend', note: '' });
    showTab('attendance');
    const heads = [...document.querySelectorAll('#overview-content thead th')].map(th => th.textContent);
    expect(heads.filter(h => h.includes('10.09'))).toEqual([expect.stringContaining('Wandertag')]);
  });
});

describe('L3: Fehlzeit in der Tabelle pflegt den Hinweis für die nächste Stunde', () => {
  it('„F“ in der Tabelle schreibt den Hinweis, „E“ und leer entfernen ihn', () => {
    showTab('attendance');
    app(`updateInlineAttendance("s1", "${MON}", "F")`);
    expect(nextNote()).toContain('Anna Muster hat letzte Stunde unentschuldigt gefehlt');

    app(`updateInlineAttendance("s1", "${MON}", "E")`);
    expect(nextNote()).not.toContain('Anna Muster');

    app(`updateInlineAttendance("s1", "${MON}", "F")`);
    app(`updateInlineAttendance("s1", "${MON}", "")`);
    expect(nextNote()).not.toContain('Anna Muster');
  });

  it('„F“ im Profil schreibt ebenfalls den Hinweis', () => {
    app('openGroupStudents("g1")');
    app('openStudentDetail("s1")');
    document.getElementById('new-att-date').value = MON;
    document.getElementById('new-att-type').value = 'abwesend';
    app('addAttendanceEntry()');
    expect(nextNote()).toContain('Anna Muster hat letzte Stunde');
  });
});

describe('L4: Schüler mit nur einem Namen', () => {
  it('Hinweis ohne führendes Leerzeichen und wird wieder entfernt', () => {
    app(`addAbsenceNote("g1", "${MON}", db.students.g1[2])`);
    expect(nextNote()).toBe('Max hat letzte Stunde unentschuldigt gefehlt');
    app(`removeAbsenceNote("g1", "${MON}", db.students.g1[2])`);
    expect(nextNote()).toBe('');
  });
});

describe('L5: Spalten löschen', () => {
  it('Notenspalte löschen entfernt Spalte und Noten nach Rückfrage mit Anzahl', () => {
    const ask = vi.fn(() => true);
    window.confirm = ask;
    student('s1').grades.push({ type: 'test', value: '2.0', date: '2026-09-10', note: 'Vokabeltest' });
    student('s2').grades.push({ type: 'test', value: '3.0', date: '2026-09-10', note: 'Vokabeltest' });
    student('s1').grades.push({ type: 'test', value: '1.0', date: '2026-09-11', note: 'Anderer' });
    showTab('grades');
    app('openEditColumnModal("2026-09-10", "Vokabeltest", "test", 0)');
    expect(document.getElementById('btn-delete-column').classList.contains('hidden')).toBe(false);
    app('deleteOverviewColumn()');
    expect(ask).toHaveBeenCalledWith(expect.stringContaining('2 Noten'));
    expect(student('s1').grades.map(g => g.note)).toEqual(['Anderer']);
    expect(student('s2').grades).toEqual([]);
  });

  it('abgelehnt → nichts gelöscht', () => {
    window.confirm = () => false;
    student('s1').grades.push({ type: 'test', value: '2.0', date: '2026-09-10', note: 'X' });
    showTab('grades');
    app('openEditColumnModal("2026-09-10", "X", "test", 0)');
    app('deleteOverviewColumn()');
    expect(student('s1').grades).toHaveLength(1);
  });

  it('neue Spalte: kein Löschen-Knopf', () => {
    showTab('grades');
    app('openAddColumnModal()');
    expect(document.getElementById('btn-delete-column').classList.contains('hidden')).toBe(true);
  });

  it('Anwesenheitsspalte löschen entfernt Einträge des Tages und den Hinweis', () => {
    showTab('attendance');
    app(`updateInlineAttendance("s1", "${MON}", "F")`);
    app(`openEditColumnModal("${MON}", "")`);
    app('deleteOverviewColumn()');
    expect(student('s1').attendance).toEqual([]);
    expect(nextNote()).not.toContain('Anna');
  });

  it('Hausaufgaben- und Mitarbeitsspalte löschen', () => {
    student('s1').homework.push({ id: 'h1', date: MON, note: 'AB' });
    student('s1').participation.push({ date: MON, value: 'positive', label: 'Gruppenarbeit' });
    showTab('homework');
    app(`openEditColumnModal("${MON}", "AB")`);
    app('deleteOverviewColumn()');
    expect(student('s1').homework).toEqual([]);
    showTab('participation');
    app(`openEditColumnModal("${MON}", "Gruppenarbeit")`);
    app('deleteOverviewColumn()');
    expect(student('s1').participation).toEqual([]);
  });
});

describe('L6: Enter springt in der Tabelle zum nächsten Schüler', () => {
  // Inline-onchange läuft in jsdom nicht im App-Kontext (Regel 18): denselben Code dort ausführen
  beforeAll(() => { window.scrollTo = () => {}; });
  const bindInline = () => document.querySelectorAll('#overview-content input[onchange]').forEach(el => {
    const code = el.getAttribute('onchange');
    el.onchange = () => app(`(function(){ ${code} })`).call(el);
  });
  const inputAt = (row, col) => bodyRows()[row].querySelectorAll('input')[col];
  const enter = (el, shiftKey = false) => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey, bubbles: true }));

  it('übernimmt die Eingabe und setzt den Cursor eine Zeile tiefer in dieselbe Spalte', () => {
    app('db').groups[0].gradeEvents = [{ date: '2026-09-10', label: 'KA', type: 'schularbeit' }, { date: '2026-09-11', label: 'T', type: 'test' }];
    showTab('grades');
    bindInline();
    const first = inputAt(0, 1); // erste Zeile („Max“, ohne Vornamen vorne), Spalte „T“
    first.focus();
    first.value = '2';
    enter(first);
    expect(student('s3').grades).toEqual([expect.objectContaining({ value: '2.0', note: 'T' })]);
    expect(document.activeElement).toBe(inputAt(1, 1));

    enter(document.activeElement, true);
    expect(document.activeElement).toBe(inputAt(0, 1));
  });

  it('unveränderter Wert: kein Speichern', () => {
    app('db').groups[0].gradeEvents = [{ date: '2026-09-10', label: 'KA', type: 'schularbeit' }];
    showTab('grades');
    bindInline();
    app('db.settings.lastModified = 7');
    const first = inputAt(0, 0);
    first.focus();
    enter(first);
    expect(app('db.settings.lastModified')).toBe(7);
    expect(document.activeElement).toBe(inputAt(1, 0));
  });
});

describe('L7: Klasse bearbeiten', () => {
  it('Kopf der Klassenansicht bleibt „Klasse | Fach · Jahr“', () => {
    app('openGroupStudents("g1")');
    app('openEditGroup("g1")');
    app('saveSubjectGroup()');
    expect(document.getElementById('student-view-title').textContent).toBe('7b');
    expect(document.getElementById('student-view-subtitle').textContent).toBe('Mathe · 2026/27');
  });
});

describe('L8: Schüler mit nur einem Namen bearbeiten', () => {
  it('lässt sich mit nur einem Namen speichern', () => {
    app('openGroupStudents("g1")');
    app('openStudentDetail("s3")');
    app('openEditStudent()');
    document.getElementById('new-student-notes').value = 'LRS';
    app('saveStudent()');
    expect(student('s3').notes).toBe('LRS');
  });

  it('ganz ohne Namen weiterhin abgelehnt', () => {
    app('openGroupStudents("g1")');
    app('openAddStudent()');
    document.getElementById('new-student-first').value = '';
    document.getElementById('new-student-last').value = '';
    app('editingStudentId = null; saveStudent()');
    expect(app('db').students.g1).toHaveLength(3);
  });
});

describe('L9: Vertretung auf der Klassenkarte', () => {
  it('einmalige Stunde erscheint nicht als fester Wochentag', () => {
    app('switchView("classes")');
    const chips = document.getElementById('subject-groups-container').textContent;
    expect(chips).toContain('Mo');
    expect(chips).toContain('Mi');
    expect(chips).not.toContain('Fr');
  });
});

describe('L10/L11: Exporte', () => {
  let exported;
  beforeEach(() => {
    exported = null;
    const RealBlob = globalThis.Blob;
    globalThis.Blob = class extends RealBlob {
      constructor(parts, opts) { super(parts, opts); exported = parts.join(''); }
    };
    URL.createObjectURL = () => 'blob:test';
    URL.revokeObjectURL = () => {};
    HTMLAnchorElement.prototype.click = () => {};
    return () => { globalThis.Blob = RealBlob; };
  });

  it('Schülerakte: Noten mit Komma, Hausaufgaben enthalten', () => {
    student('s1').grades.push({ type: 'test', value: '2.5', date: '2026-09-10', note: 'T' });
    student('s1').homework.push({ id: 'h1', date: '2026-09-11', note: 'Arbeitsblatt' });
    app('openGroupStudents("g1")');
    app('openStudentDetail("s1")');
    app('exportCurrentStudent()');
    expect(exported).toContain('Note: 2,5');
    expect(exported).toContain('HAUSAUFGABEN');
    expect(exported).toContain('Arbeitsblatt');
  });

  it('Schülerakte einer Punkte-Klasse: „Punkte“ statt „Note“', () => {
    app('db').groups[0].gradeScale = '0-15';
    student('s1').grades.push({ type: 'test', value: '11', date: '2026-09-10', note: 'T' });
    app('openGroupStudents("g1")');
    app('openStudentDetail("s1")');
    app('exportCurrentStudent()');
    expect(exported).toContain('Punkte: 11');
    expect(exported).not.toContain('Note: 11');
  });

  it('CSV: Anführungszeichen im Namen werden verdoppelt', () => {
    student('s1').lastName = 'Muster "Mo"';
    app('openGroupStudents("g1")');
    app('exportGradesCSV()');
    expect(exported).toContain('"Muster ""Mo"""');
  });
});

describe('L12: Avatare lesbar', () => {
  it('Farbe per CSS-Variable, Kontrast über style.css statt fester Farben', () => {
    app('openGroupStudents("g1")');
    const av = document.querySelector('#view-students .student-avatar');
    expect(av.getAttribute('style')).toMatch(/--avatar:\s*#[0-9a-f]{6}/i);
    expect(av.getAttribute('style')).not.toMatch(/background:/);
  });
});
