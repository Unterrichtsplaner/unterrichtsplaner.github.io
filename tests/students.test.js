// Block C (Schüler & Klassen): Löschen in der Schülerakte, Namen/Import, Klasse speichern/löschen,
// Spalten umbenennen, Schülerakten-Export, Zähler, „zu spät“, Warnschwellen, Dashboard-Sprung.
const { loadApp, app } = require('./helpers/load-app');

// Einträge absichtlich NICHT nach Datum sortiert: die Anzeige sortiert (neueste zuerst), das Original nicht.
function sampleDB() {
  return {
    settings: { teacherName: 'Test', school: '', blocks: null },
    lessonSlots: [
      { id: 'slot1', day: 0, block: 1, subject: 'Mathe', groupId: 'g1', recurring: 'weekly', color: '#6366f1' },
      { id: 'slot2', day: 1, block: 2, subject: 'Deutsch', groupId: 'g2', recurring: 'weekly', color: '#ec4899' },
    ],
    lessonData: { 'slot1_2026-09-07': { notes: 'Bruchrechnen' }, 'slot2_2026-09-08': { notes: 'Gedicht' } },
    groups: [
      { id: 'g1', subject: 'Mathe', className: '1A', color: '#6366f1', schularbeitWeight: 50 },
      { id: 'g2', subject: 'Deutsch', className: '2B', color: '#ec4899', schularbeitWeight: 50 },
    ],
    students: {
      g1: [{
        id: 's1', firstName: 'Anna', lastName: 'Muster',
        grades: [],
        attendance: [
          { date: '2026-09-01', type: 'entschuldigt', note: 'alt' },
          { date: '2026-09-10', type: 'abwesend', note: 'neu' },
        ],
        participation: [
          { date: '2026-09-01', value: 'positive', label: 'alt' },
          { date: '2026-09-10', value: 'negative', label: 'neu' },
        ],
        homework: [
          { id: 'h1', date: '2026-09-02', note: 'Seite 12' },
          { id: 'h2', date: '2026-09-02', note: 'Arbeitsblatt' },
        ],
        studentNotes: [
          { text: 'alte Anmerkung', date: '2026-09-01' },
          { text: 'neue Anmerkung', date: '2026-09-10' },
        ],
      }],
      g2: [],
    },
  };
}

const anna = () => app('db').students.g1[0];

function openAnna() {
  app('openGroupStudents("g1")');
  app('openStudentDetail("s1")');
}

// Klickt den Löschknopf der n-ten angezeigten Zeile (0 = oberste = neueste)
function clickDelete(listId, n) {
  document.getElementById(listId).querySelectorAll('.entry-item')[n].querySelector('button').click();
}

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});

beforeEach(() => {
  app('db = ' + JSON.stringify(sampleDB()));
  app('currentGroupId = null; currentSeatingGroupId = ""');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  window.confirm = () => true;
});

describe('C1: Löschen in der Schülerakte trifft den angeklickten Eintrag', () => {
  it('Anmerkung', () => {
    openAnna();
    clickDelete('student-notes-list', 0); // oberste = „neue Anmerkung“
    expect(anna().studentNotes.map(n => n.text)).toEqual(['alte Anmerkung']);
  });

  it('Anwesenheit', () => {
    openAnna();
    clickDelete('attendance-list', 0);
    expect(anna().attendance.map(a => a.note)).toEqual(['alt']);
  });

  it('Mitarbeit', () => {
    openAnna();
    clickDelete('participation-list', 0);
    expect(anna().participation.map(p => p.label)).toEqual(['alt']);
  });

  it('löscht nichts, wenn die Daten inzwischen ersetzt wurden (z. B. durch Sync)', () => {
    openAnna();
    app('db = ' + JSON.stringify(sampleDB()));
    clickDelete('attendance-list', 0);
    clickDelete('participation-list', 0);
    expect(anna().attendance).toHaveLength(2);
    expect(anna().participation).toHaveLength(2);
  });
});

describe('C2: Schüler mit nur einem Namen', () => {
  it('Schülerliste stürzt nicht ab', () => {
    app('db').students.g1.push({ id: 's2', firstName: '', lastName: 'Max', grades: [] });
    expect(() => app('openGroupStudents("g1")')).not.toThrow();
    expect(document.getElementById('students-container').textContent).toContain('Max');
  });

  it('Schülerliste stürzt auch bei fehlenden Namensfeldern nicht ab', () => {
    app('db').students.g1.push({ id: 's3', lastName: 'Ohnevorname', grades: [] });
    expect(() => app('openGroupStudents("g1")')).not.toThrow();
  });

  it('Import trennt an Tabs (aus Excel kopiert): Vorname | Nachname', () => {
    app('openGroupStudents("g2")');
    document.getElementById('import-text').value = 'Anna Maria\tHuber\nMax\nLeo Berger';
    document.getElementById('import-skip-duplicates').checked = true;
    app('importStudentsFromText()');
    const names = app('db').students.g2.map(s => `${s.firstName}|${s.lastName}`);
    expect(names).toEqual(['Anna Maria|Huber', '|Max', 'Leo|Berger']);
  });
});

describe('C3: Klasse speichern', () => {
  it('wirft keinen Fehler beim Anlegen', () => {
    app('openAddSubjectGroup()');
    document.getElementById('new-group-class').value = '3C';
    document.getElementById('new-group-subject').value = 'Physik';
    expect(() => app('saveSubjectGroup()')).not.toThrow();
    expect(app('db').groups.map(g => g.className)).toContain('3C');
  });
});

describe('C4: Klasse löschen', () => {
  it('entfernt zugehörige Stunden samt Stundendaten, andere bleiben', () => {
    app('deleteGroup("g1")');
    const d = app('db');
    expect(d.lessonSlots.map(s => s.id)).toEqual(['slot2']);
    expect(Object.keys(d.lessonData)).toEqual(['slot2_2026-09-08']);
    expect(d.students.g1).toBeUndefined();
  });

  it('verlässt die Ansicht der gelöschten Klasse', () => {
    app('openGroupStudents("g1")');
    app('deleteGroup("g1")');
    expect(app('currentGroupId')).toBeNull();
    expect(document.getElementById('view-students').classList.contains('active')).toBe(false);
  });

  it('bricht ab, wenn der Nutzer nicht bestätigt', () => {
    window.confirm = () => false;
    app('deleteGroup("g1")');
    expect(app('db').lessonSlots).toHaveLength(2);
  });
});

describe('C5: Hausaufgaben-Spalte umbenennen', () => {
  it('ändert Datum und Beschriftung genau der Einträge dieser Spalte', () => {
    app('openGroupStudents("g1", "homework")');
    app('openEditColumnModal("2026-09-02", "Seite 12")');
    document.getElementById('new-col-date').value = '2026-09-03';
    document.getElementById('new-col-label').value = 'Seite 13';
    app('saveOverviewColumn()');
    expect(anna().homework.map(h => `${h.date} ${h.note}`)).toEqual([
      '2026-09-03 Seite 13',
      '2026-09-02 Arbeitsblatt',
    ]);
  });
});

describe('C6: Schülerakten-Export', () => {
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

  it('schreibt kein „undefined“ und die Bemerkungen der Fehlzeiten', () => {
    openAnna();
    app('exportCurrentStudent()');
    expect(exported).not.toContain('undefined');
    expect(exported).toContain('neu');
    expect(exported).toContain('neue Anmerkung');
  });

  it('stürzt bei Einträgen ohne Datum nicht ab', () => {
    const s = anna();
    s.grades.push({ type: 'test', value: '2.0', note: 'ohne' });
    s.participation.push({ value: 'neutral' });
    s.attendance.push({ type: 'zuspät' });
    s.studentNotes.push({ text: 'ohne Datum' });
    openAnna();
    expect(() => app('exportCurrentStudent()')).not.toThrow();
    expect(exported).toContain('ohne Datum');
    expect(exported).toContain('Zu spät');
    expect(exported).not.toContain('Invalid');
  });
});

describe('C7: Zähler in der Schülerliste', () => {
  const counters = () => document.getElementById('students-container').textContent.replace(/\s+/g, '');

  it('aktualisiert sich nach Löschen von Anwesenheit und Mitarbeit', () => {
    openAnna();
    expect(counters()).toContain('Mitarbeit1:0:1');
    expect(counters()).toContain('Fehlt1/1');
    clickDelete('attendance-list', 0);      // abwesend
    clickDelete('participation-list', 0);   // negative
    expect(counters()).toContain('Mitarbeit1:0:0');
    expect(counters()).toContain('Fehlt0/1');
  });
});

describe('C8: „zu spät“ in der Übersicht', () => {
  it('wird angezeigt und bleibt beim Bearbeiten erhalten', () => {
    anna().attendance = [{ date: '2026-09-15', type: 'zuspät', note: '' }];
    app('openGroupStudents("g1", "attendance")');
    const input = document.querySelector('#overview-content input[onchange*="2026-09-15"]');
    expect(input.value).toBe('Z');
    app('updateInlineAttendance("s1", "2026-09-15", "z")');
    expect(anna().attendance[0].type).toBe('zuspät');
    app('updateInlineAttendance("s1", "2026-09-15", "F")');
    expect(anna().attendance[0].type).toBe('abwesend');
  });
});

describe('C9: Warnschwellen', () => {
  function saveWarn(abs, hw, grade) {
    app('openSettings()');
    document.getElementById('settings-warn-absences').value = abs;
    document.getElementById('settings-warn-homework').value = hw;
    document.getElementById('settings-warn-grade').value = grade;
    app('saveSettings()');
    return app('db').settings;
  }

  it('0 wird gespeichert und schaltet die Warnung aus', () => {
    const s = saveWarn('0', '0', '0');
    expect([s.warnAbsences, s.warnHomework, s.warnGrade]).toEqual([0, 0, 0]);
    app('renderDashboard()');
    expect(document.getElementById('dashboard-content').textContent).not.toContain('Oft Hausaufgaben vergessen');
    expect(document.getElementById('dashboard-content').textContent).not.toContain('unentschuldigte Fehlzeiten');
  });

  it('leeres Feld fällt auf den Standard zurück', () => {
    const s = saveWarn('', '', '');
    expect([s.warnAbsences, s.warnHomework, s.warnGrade]).toEqual([3, 3, 4.5]);
  });

  it('niedrige Schwelle warnt', () => {
    saveWarn('1', '2', '4,5');
    expect(app('db').settings.warnGrade).toBe(4.5);
    app('renderDashboard()');
    expect(document.getElementById('dashboard-content').textContent).toContain('Oft Hausaufgaben vergessen');
  });
});

describe('C10: Dashboard-Warnung „Hausaufgaben“', () => {
  it('öffnet den Tab Hausaufgaben', () => {
    app('openStudentDetailFromDashboard("s1", "g1", "homework")');
    expect(document.getElementById('student-tab-homework').classList.contains('hidden')).toBe(false);
  });
});
