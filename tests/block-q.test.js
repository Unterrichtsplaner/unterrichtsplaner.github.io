// Block Q (Review 25.09.2026, zweite Runde): Klassen, Noten, Anwesenheit.
const { loadApp, app } = require('./helpers/load-app');

const MON = '2026-09-21', WED = '2026-09-23';

function stu(id, firstName, lastName, extra = {}) {
  return { id, firstName, lastName, grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra };
}
function sampleDB() {
  return {
    settings: { teacherName: 'Test', school: '', blocks: null },
    lessonSlots: [
      { id: 'l1', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
      { id: 'l2', day: 2, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly' },
    ],
    lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', year: '2026/27', color: '#6366f1', schularbeitWeight: 50 }],
    students: {
      g1: [
        stu('s1', 'Anna', 'Muster', { grades: [
          { type: 'schularbeit', value: '1.0', date: '2026-09-10', note: 'KA 1' },
          { type: 'test', value: '5.0', date: '2026-09-15', note: 'Vokabeltest' },
        ] }),
        stu('s2', 'Ben', 'Beispiel'),
        stu('s3', 'Clara', 'Cäsar'),
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
const rowOf = name => bodyRows().find(r => r.textContent.includes(name));
function showTab(tab) {
  app('openGroupStudents("g1")');
  app(`switchClassDashboardTab(${JSON.stringify(tab)})`);
}
const fire = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});

beforeEach(() => {
  app('db = ' + JSON.stringify(sampleDB()));
  app('currentGroupId = "g1"; currentOverviewGroupId = "g1"');
  document.getElementById('toast-container').innerHTML = '';
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  window.confirm = () => true;
});

describe('Q1: Notentyp im Profil wird escaped', () => {
  it('ein präparierter Typ landet nicht als Element im Profil', () => {
    student('s1').grades.push({ type: '<img src=x id=q1-xss>', value: '2.0', date: '2026-09-20', note: '' });
    app('openStudentDetail("s1")');
    expect(document.getElementById('q1-xss')).toBeNull();
    expect(document.getElementById('grades-list').textContent).toContain('<img');
  });
});

describe('Q2: Entschuldigung im Profil nachtragen', () => {
  it('ersetzt das „Unentschuldigt“ desselben Tages samt Hinweis, statt einen zweiten Eintrag anzulegen', () => {
    app(`openSeatingStudentModal("s1", "g1", "${MON}")`);
    app('setSeatingAbsence("abwesend")');
    expect(nextNote()).toContain('Anna Muster hat letzte Stunde unentschuldigt gefehlt');

    app('openStudentDetail("s1", "attendance")');
    document.getElementById('new-att-date').value = MON;
    document.getElementById('new-att-type').value = 'entschuldigt';
    document.getElementById('new-att-note').value = 'Attest';
    app('addAttendanceEntry()');

    const att = student('s1').attendance.filter(a => a.date === MON);
    expect(att).toHaveLength(1);
    expect(att[0]).toMatchObject({ type: 'entschuldigt', note: 'Attest' });
    expect(nextNote()).not.toContain('Anna Muster');
  });
});

describe('Q3: Notentabelle behält den Fokus', () => {
  // Inline-onchange läuft in jsdom nicht im App-Kontext (Regel 18): denselben Code dort ausführen (wie L6)
  beforeAll(() => { window.scrollTo = () => {}; });
  const bindInline = () => document.querySelectorAll('#overview-content input[onchange]').forEach(el => {
    const code = el.getAttribute('onchange');
    el.onchange = () => app(`(function(){ ${code} })`).call(el);
  });
  it('Tippen in die nächste Zelle: nach dem Neuzeichnen steht der Fokus dort', () => {
    showTab('grades');
    bindInline();
    const a = rowOf('Ben').querySelectorAll('input')[0];
    const b = rowOf('Ben').querySelectorAll('input')[1];
    a.focus(); a.value = '2';
    fire(b, 'pointerdown');
    fire(a, 'change');
    const active = document.activeElement;
    expect(active.tagName).toBe('INPUT');
    expect(active.closest('tr').textContent).toContain('Ben');
    expect([...active.closest('tr').querySelectorAll('input')].indexOf(active)).toBe(1);
  });

  it('Tab nach einer Eingabe: Fokus springt in die nächste Zelle', () => {
    showTab('grades');
    bindInline();
    const a = rowOf('Ben').querySelectorAll('input')[0];
    a.focus(); a.value = '3';
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(student('s2').grades).toHaveLength(1);
    const active = document.activeElement;
    expect(active.tagName).toBe('INPUT');
    expect([...active.closest('tr').querySelectorAll('input')].indexOf(active)).toBe(1);
  });
});

describe('Q4: Tabelle nach Bearbeiten von Klasse und Schüler aktuell', () => {
  it('Gewichtung ändern: Schnitt in der offenen Notentabelle ändert sich', () => {
    showTab('grades');
    expect(rowOf('Anna').children[1].textContent).toBe('3,0');
    app('openEditGroup("g1")');
    document.getElementById('weight-schularbeit').value = '100';
    app('saveSubjectGroup()');
    expect(rowOf('Anna').children[1].textContent).toBe('1,0');
  });

  it('Schüler umbenennen: offene Tabelle zeigt den neuen Namen', () => {
    showTab('grades');
    app('currentStudentId = "s2"; openEditStudent()');
    document.getElementById('new-student-first').value = 'Benedikt';
    app('saveStudent()');
    expect(rowOf('Benedikt')).toBeTruthy();
  });
});

describe('Q5: Profil-Notenliste nach ersetzter DB', () => {
  it('Antippen öffnet nie eine andere Note', () => {
    app('openStudentDetail("s1")');
    const items = [...document.querySelectorAll('#grades-list .grade-item')];
    const voka = items.find(i => i.textContent.includes('Vokabeltest'));
    // DB wird ersetzt (Import, Cloud): eine neue Note steht vorne
    const fresh = sampleDB();
    fresh.students.g1[0].grades.unshift({ type: 'test', value: '2.0', date: '2026-09-01', note: 'Neu' });
    app('db = ' + JSON.stringify(fresh));
    voka.click();
    const label = document.getElementById('gf-label').value;
    expect(label === 'Vokabeltest' || document.getElementById('modal-grade-form').classList.contains('hidden')).toBe(true);
  });
});

describe('Q6: Spalte auf ein vorhandenes Datum verschieben', () => {
  it('HA-Spalte auf eine bestehende Spalte: abgelehnt, nichts verschmilzt', () => {
    const g = app('db').groups[0];
    g.homeworkEvents = [{ date: MON, label: '' }, { date: WED, label: '' }];
    student('s1').homework.push({ id: 'h1', date: MON, note: '' }, { id: 'h2', date: WED, note: '' });
    showTab('homework');
    app(`openEditColumnModal("${WED}", "")`);
    document.getElementById('new-col-date').value = MON;
    app('saveOverviewColumn()');
    expect(student('s1').homework.map(h => h.date).sort()).toEqual([MON, WED]);
    expect(lastToast()).toMatch(/gibt es schon/);
  });

  it('Anwesenheit: neue Spalte auf ein Datum, das es schon gibt → abgelehnt', () => {
    app('db').groups[0].attendanceEvents = [{ date: MON, label: '' }];
    showTab('attendance');
    app('openAddColumnModal()');
    document.getElementById('new-col-date').value = MON;
    app('saveOverviewColumn()');
    expect(app('db').groups[0].attendanceEvents).toHaveLength(1);
  });
});

describe('Q7/Q14: Import', () => {
  function importText(text, skip = true) {
    app('openImportStudentsModal()');
    document.getElementById('import-text').value = text;
    document.getElementById('import-skip-duplicates').checked = skip;
    app('importStudentsFromText()');
  }
  it('„Nachname, Vorname“ wird richtig herum gelesen', () => {
    importText('Müller, Anna\nvon Hohenzollern, Max Peter');
    const list = app('db').students.g1;
    expect(list.find(s => s.lastName === 'Müller').firstName).toBe('Anna');
    expect(list.find(s => s.lastName === 'von Hohenzollern').firstName).toBe('Max Peter');
  });
  it('zwei gleichnamige Schüler in derselben Liste werden beide importiert', () => {
    importText('Lukas Meier\nLukas Meier');
    expect(app('db').students.g1.filter(s => s.lastName === 'Meier')).toHaveLength(2);
  });
  it('schon vorhandene Schüler werden weiterhin übersprungen', () => {
    importText('Anna Muster');
    expect(app('db').students.g1.filter(s => s.lastName === 'Muster')).toHaveLength(1);
  });
});

describe('Q8: Sitzplan fasst benannte Mitarbeit/HA nicht an', () => {
  it('Smiley ändert die Spalte „Referat“ nicht', () => {
    student('s1').participation.push({ id: 'p1', date: MON, value: 'positive', label: 'Referat' });
    app(`openSeatingStudentModal("s1", "g1", "${MON}")`);
    app('addParticipationSmiley("negative")');
    const p = student('s1').participation;
    expect(p.find(x => x.label === 'Referat').value).toBe('positive');
    expect(p.find(x => !x.label).value).toBe('negative');
  });
  it('😊 auf einen Tag mit „Referat 😊“ löscht das Referat nicht', () => {
    student('s1').participation.push({ id: 'p1', date: MON, value: 'positive', label: 'Referat' });
    app(`openSeatingStudentModal("s1", "g1", "${MON}")`);
    app('addParticipationSmiley("positive")');
    expect(student('s1').participation.find(x => x.label === 'Referat')).toBeTruthy();
  });
  it('HA-Knopf entfernt keinen Eintrag aus einer benannten HA-Spalte', () => {
    student('s1').homework.push({ id: 'h1', date: MON, note: 'Arbeitsheft' });
    app(`openSeatingStudentModal("s1", "g1", "${MON}")`);
    app('setSeatingHomework()');
    expect(student('s1').homework.find(h => h.note === 'Arbeitsheft')).toBeTruthy();
  });
});

describe('Q9: HA-Tabelle', () => {
  it('Tippfehler löscht nicht, sondern wird abgelehnt', () => {
    student('s1').homework.push({ id: 'h1', date: MON, note: '' });
    showTab('homework');
    app(`updateInlineHomework("s1", "${MON}", "", "v")`);
    expect(student('s1').homework).toHaveLength(1);
    expect(lastToast()).toMatch(/X/);
  });
  it('leeres Feld löscht weiterhin', () => {
    student('s1').homework.push({ id: 'h1', date: MON, note: '' });
    showTab('homework');
    app(`updateInlineHomework("s1", "${MON}", "", "")`);
    expect(student('s1').homework).toHaveLength(0);
  });
});

describe('Q10: Fehl-Hinweise beim Löschen, Umbenennen, gleichen Namen', () => {
  function markAbsent(id) {
    app(`openSeatingStudentModal("${id}", "g1", "${MON}")`);
    app('setSeatingAbsence("abwesend")');
  }
  it('Schüler löschen entfernt seinen Hinweis und seine Quittierungen', () => {
    markAbsent('s1');
    app('db').acknowledgedWarnings = { s1_absences: 3, s2_absences: 1 };
    app('currentStudentId = "s1"; deleteCurrentStudent()');
    expect(nextNote()).not.toContain('Anna Muster');
    expect(app('db').acknowledgedWarnings).toEqual({ s2_absences: 1 });
  });
  it('mehrere Schüler löschen entfernt ihre Hinweise', () => {
    markAbsent('s1');
    app('openGroupStudents("g1")');
    document.getElementById('students-container').insertAdjacentHTML('beforeend', '<input type="checkbox" class="student-select-cb" data-id="s1" checked>');
    app('deleteSelectedStudents()');
    expect(nextNote()).not.toContain('Anna Muster');
  });
  it('nach dem Umbenennen wird der Hinweis umgeschrieben und lässt sich entfernen', () => {
    markAbsent('s1');
    app('currentStudentId = "s1"; openEditStudent()');
    document.getElementById('new-student-last').value = 'Neumann';
    app('saveStudent()');
    expect(nextNote()).toContain('Anna Neumann hat letzte Stunde');
    expect(nextNote()).not.toContain('Anna Muster');
    app(`openSeatingStudentModal("s1", "g1", "${MON}")`);
    app('setSeatingAbsence("abwesend")'); // zweites Tippen = entfernen
    expect(nextNote()).not.toContain('Anna');
  });
  it('gleichnamige Schüler: Rücknahme bei einem lässt den Hinweis für den anderen stehen', () => {
    app('db').students.g1.push(stu('s4', 'Anna', 'Muster'));
    markAbsent('s1');
    markAbsent('s4');
    app(`openSeatingStudentModal("s1", "g1", "${MON}")`);
    app('setSeatingAbsence("abwesend")');
    expect(nextNote()).toContain('Anna Muster hat letzte Stunde');
  });
});

describe('Q11: E → F im Sitzplan', () => {
  it('der Grund bleibt erhalten', () => {
    student('s1').attendance.push({ id: 'a1', date: MON, type: 'entschuldigt', note: 'Arztattest' });
    app(`openSeatingStudentModal("s1", "g1", "${MON}")`);
    app('setSeatingAbsence("abwesend")');
    const att = student('s1').attendance.filter(a => a.date === MON);
    expect(att).toHaveLength(1);
    expect(att[0]).toMatchObject({ type: 'abwesend', note: 'Arztattest' });
  });
});

describe('Q12: Notenformular ohne Datum', () => {
  it('wird nicht gespeichert', () => {
    app('openGradeForm("s2", "g1", -1)');
    document.getElementById('gf-value').value = '2';
    document.getElementById('gf-date').value = '';
    app('saveGradeFromForm()');
    expect(student('s2').grades).toHaveLength(0);
    expect(lastToast()).toMatch(/Datum/);
  });
});

describe('Q13: Text wie „+“ in der Tabelle', () => {
  it('wird wie im Formular angenommen und zählt nicht', () => {
    showTab('grades');
    app('updateInlineGrade("s2", "2026-09-10", "KA 1", "+", "schularbeit", 0)');
    expect(student('s2').grades[0].value).toBe('+');
    expect(app('calculateStudentAverage')(student('s2'), 'g1')).toBeNull();
  });
  it('Zahlen außerhalb der Skala werden weiterhin abgelehnt', () => {
    showTab('grades');
    app('updateInlineGrade("s2", "2026-09-10", "KA 1", "7", "schularbeit", 0)');
    expect(student('s2').grades).toHaveLength(0);
  });
});

describe('Q15: HA-Bemerkung im Profil', () => {
  it('das Feld ist als Spalte beschriftet und schlägt vorhandene Spalten vor', () => {
    app('db').groups[0].homeworkEvents = [{ date: MON, label: 'Arbeitsheft' }];
    app('openStudentDetail("s1", "homework")');
    const input = document.getElementById('new-hw-student-note');
    expect(input.placeholder).toMatch(/Spalte/);
    const list = document.getElementById(input.getAttribute('list'));
    expect([...list.options].map(o => o.value)).toContain('Arbeitsheft');
  });
});
