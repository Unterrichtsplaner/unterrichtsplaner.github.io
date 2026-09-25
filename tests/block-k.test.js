// Block K (Review 25.09.2026): Datenverlust außerhalb des Cloud-Syncs.
// Die Sync-Fälle (K1, K6, K8, K9, K13) stehen in tests/sync.test.js.
const { loadApp, loadScript, app } = require('./helpers/load-app');

function sampleDB() {
  return {
    settings: { teacherName: 'Test', school: '', blocks: null },
    lessonSlots: [{ id: 'l1', day: 0, block: 1, part: 'full', subject: 'Mathe', room: 'R1', color: '#6366f1', groupId: 'g1', recurring: 'weekly' }],
    lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#6366f1', schularbeitWeight: 80 }],
    students: {
      g1: [
        { id: 's1', firstName: 'Anna', lastName: 'Muster', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] },
        { id: 's2', firstName: 'Ben', lastName: 'Beispiel', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] },
      ],
    },
  };
}

const MONDAY = '2026-09-21';
const student = (id) => app('db').students.g1.find(s => s.id === id);
const lastToast = () => {
  const toasts = document.querySelectorAll('#toast-container .toast');
  return toasts.length ? toasts[toasts.length - 1].textContent : '';
};
const overviewHTML = () => document.getElementById('overview-content').innerHTML;

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  globalThis.alert = vi.fn();
  globalThis.confirm = () => true;
  loadScript('crypto-helper.js');
  loadApp();
});

beforeEach(() => {
  app('db = ' + JSON.stringify(sampleDB()));
  document.getElementById('toast-container').innerHTML = '';
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  globalThis.alert.mockClear();
});

describe('K2: Knöpfe im Stunden-Fenster verwerfen keine Eingaben', () => {
  function typeIntoLesson() {
    app(`openLessonDetail('l1', '${MONDAY}')`);
    document.getElementById('lesson-done-text').value = 'Bruchrechnung';
    document.getElementById('lesson-notes-text').value = 'Ben fragen';
  }
  const saved = () => app('db').lessonData['l1_' + MONDAY] || {};

  it.each([
    ['Stunde bearbeiten (Stift)', 'openEditLesson()'],
    ['Sitzplan öffnen', 'openSeatingForActiveLesson()'],
    ['Notenübersicht', 'openClassOverviewFromLesson()'],
  ])('%s speichert vorher Inhalt und Notizen', (_, call) => {
    typeIntoLesson();
    app(call);
    expect(saved().done).toBe('Bruchrechnung');
    expect(saved().notes).toBe('Ben fragen');
    expect(document.getElementById('modal-lesson').classList.contains('hidden')).toBe(true);
  });

  it('ohne Eingaben wird nichts als geändert markiert', () => {
    app(`openLessonDetail('l1', '${MONDAY}')`);
    app('db.settings.lastModified = 42');
    app('openClassOverviewFromLesson()');
    expect(app('db.settings.lastModified')).toBe(42);
  });
});

describe('K3: Bearbeiten löscht den Notentyp nicht', () => {
  it('Spalte vom Typ „Mündlich“ umbenennen behält den Typ', () => {
    student('s1').grades.push({ type: 'muendlich', value: '2.0', date: '2026-09-10', note: 'Referat' });
    app('openClassOverview("g1")');
    app('switchClassDashboardTab("grades")');
    app('openEditColumnModal("2026-09-10", "Referat", "muendlich")');
    expect(document.getElementById('new-col-type').value).toBe('muendlich');
    document.getElementById('new-col-label').value = 'Referat Kap. 3';
    app('saveOverviewColumn()');
    expect(student('s1').grades[0]).toMatchObject({ type: 'muendlich', note: 'Referat Kap. 3' });
  });

  it('alte „klausur“-Note öffnen und speichern: zählt weiter als Klassenarbeit', () => {
    student('s1').grades.push(
      { type: 'klausur', value: '1.0', date: '2026-09-10', note: '' },
      { type: 'test', value: '5.0', date: '2026-09-11', note: '' },
    );
    const before = app('calculateStudentAverage(db.students.g1[0], "g1")');
    app('openGradeForm("s1", "g1", 0)');
    expect(document.getElementById('gf-type').value).toBe('klausur');
    app('saveGradeFromForm()');
    expect(student('s1').grades[0].type).toBe('klausur');
    expect(app('calculateStudentAverage(db.students.g1[0], "g1")')).toBe(before);
  });

  it('die Zusatz-Option verschwindet beim nächsten Öffnen wieder', () => {
    app('openEditColumnModal("2026-09-10", "x", "muendlich")');
    app('openAddColumnModal()');
    expect([...document.getElementById('new-col-type').options].map(o => o.value)).toEqual(['test', 'schularbeit']);
  });

  it('Note ohne Titel bleibt nach dem Bearbeiten in ihrer Spalte', () => {
    student('s1').grades.push({ type: 'test', value: '2.0', date: '2026-09-10' });
    app('openGradeForm("s1", "g1", 0)');
    document.getElementById('gf-value').value = '3';
    app('saveGradeFromForm()');
    expect(student('s1').grades[0].note).toBeUndefined();
  });
});

describe('K4: Noten am selben Tag ohne Titel', () => {
  function showGrades() {
    app('openClassOverview("g1")');
    app('switchClassDashboardTab("grades")');
  }
  const headers = () => [...document.querySelectorAll('#overview-content thead th')].map(th => th.textContent);

  it('verschiedene Typen bekommen eigene Spalten; Ben ändern macht seine Note nicht zur KA', () => {
    student('s1').grades.push({ type: 'schularbeit', value: '2.0', date: '2026-09-10', note: '' });
    student('s2').grades.push({ type: 'muendlich', value: '3.0', date: '2026-09-10', note: '' });
    showGrades();
    expect(headers().filter(h => h.includes('10.09.'))).toHaveLength(2);

    app('updateInlineGrade')('s2', '2026-09-10', '', '1', 'muendlich', 0);
    expect(student('s2').grades).toHaveLength(1);
    expect(student('s2').grades[0]).toMatchObject({ type: 'muendlich', value: '1.0' });
  });

  it('zwei gleiche Noten eines Schülers am selben Tag sind beide sichtbar und einzeln änderbar', () => {
    student('s1').grades.push(
      { type: 'mitarbeit', value: '2.0', date: '2026-09-10', note: '' },
      { type: 'mitarbeit', value: '4.0', date: '2026-09-10', note: '' },
    );
    showGrades();
    const inputs = [...document.querySelectorAll('#overview-content tbody tr')][0].querySelectorAll('input');
    expect([...inputs].map(i => i.value)).toEqual(['2,0', '4,0']);

    app('updateInlineGrade')('s1', '2026-09-10', '', '5', 'mitarbeit', 1);
    expect(student('s1').grades.map(g => g.value)).toEqual(['2.0', '5.0']);
  });

  it('Spalte auf eine bestehende umbenennen wird abgelehnt', () => {
    student('s1').grades.push(
      { type: 'test', value: '2.0', date: '2026-09-10', note: 'A' },
      { type: 'test', value: '3.0', date: '2026-09-11', note: 'B' },
    );
    showGrades();
    app('openEditColumnModal("2026-09-11", "B", "test")');
    document.getElementById('new-col-date').value = '2026-09-10';
    document.getElementById('new-col-label').value = 'A';
    app('saveOverviewColumn()');
    expect(lastToast()).toContain('gibt es schon');
    expect(student('s1').grades[1]).toMatchObject({ date: '2026-09-11', note: 'B' });
  });

  it('Altdaten: Spalte ohne Typ bekommt den Typ ihrer Noten (keine leere Zusatzspalte)', () => {
    app('db').groups[0].gradeEvents = [{ date: '2026-09-10', label: 'KA 1' }];
    student('s1').grades.push({ type: 'schularbeit', value: '2.0', date: '2026-09-10', note: 'KA 1' });
    app('db = migrateDB(db)');
    expect(app('db').groups[0].gradeEvents[0].type).toBe('schularbeit');
    showGrades();
    expect(headers().filter(h => h.includes('10.09.'))).toHaveLength(1);
  });
});

describe('K5: Tippfehler in der Anwesenheitstabelle', () => {
  beforeEach(() => {
    student('s1').attendance.push({ id: 'a1', date: '2026-09-10', type: 'entschuldigt', note: 'Arztattest' });
    app('openClassOverview("g1")');
    app('switchClassDashboardTab("attendance")');
  });

  it('unbekannte Eingabe löscht nichts und meldet sich', () => {
    app('updateInlineAttendance')('s1', '2026-09-10', 'U');
    expect(student('s1').attendance).toEqual([{ id: 'a1', date: '2026-09-10', type: 'entschuldigt', note: 'Arztattest' }]);
    expect(lastToast()).toContain('F, E oder Z');
  });

  it('leeres Feld löscht weiterhin', () => {
    app('updateInlineAttendance')('s1', '2026-09-10', '');
    expect(student('s1').attendance).toEqual([]);
  });
});

describe('K7: Hinweis, wenn der Cloud-Sync ohne Passwort pausiert', () => {
  afterEach(() => app('SyncManager.isInitialized = false; SyncManager.currentUser = null; SyncManager.masterPassword = ""; updateSyncAttention()'));

  it('angemeldet, aber kein Master-Passwort → Punkt an „Einstellungen“', () => {
    app('SyncManager.isInitialized = true; SyncManager.currentUser = { email: "x" }; SyncManager.masterPassword = ""');
    app('updateSyncAttention()');
    const btn = document.getElementById('nav-settings');
    expect(btn.classList.contains('needs-attention')).toBe(true);
    expect(btn.title).toContain('Master-Passwort');

    app('SyncManager.masterPassword = "pw"; updateSyncAttention()');
    expect(btn.classList.contains('needs-attention')).toBe(false);
  });
});

describe('K10: Speicher voll', () => {
  it('meldet den Fehler, statt still weiterzumachen', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('voll', 'QuotaExceededError');
    });
    try {
      expect(() => app('saveDB()')).not.toThrow();
    } finally { spy.mockRestore(); }
    expect(lastToast()).toContain('Nicht gespeichert');
    expect(globalThis.alert).toHaveBeenCalledWith(expect.stringContaining('Exportieren'));
  });
});

describe('K11: Konflikt-Fenster', () => {
  const modal = () => document.getElementById('modal-sync-conflict');
  it('Hauptknopf ist der sichere Weg (Sicherung, dann Cloud laden)', () => {
    const primary = modal().querySelectorAll('.btn-primary');
    expect(primary).toHaveLength(1);
    expect(primary[0].getAttribute('onclick')).toBe("resolveConflict('backup')");
  });
  it('behauptet nicht, die Cloud sei „neuer“ (Uhren verschiedener Geräte sind nicht vergleichbar)', () => {
    expect(modal().textContent).not.toMatch(/neuere/i);
  });
});

describe('K12: „App aktualisieren“ ohne Internet', () => {
  it('löscht offline keinen Cache und lädt nicht neu', async () => {
    const deleted = vi.fn();
    globalThis.caches = { keys: async () => ['v1'], delete: deleted };
    globalThis.fetch = vi.fn(async () => { throw new TypeError('offline'); });
    await app('forceAppUpdate()');
    expect(deleted).not.toHaveBeenCalled();
    expect(lastToast()).toContain('Keine Internetverbindung');
  });
});

describe('K14: altes iPad ohne DecompressionStream', () => {
  it('Meldung nennt das Gerät, nicht eine neuere App-Version', () => {
    const e = new (app('UnsupportedFormatError'))('2/gzip', 'device');
    expect(e.message).not.toContain('neueren App-Version');
    expect(e.message).toContain('Gerät');
  });
});

describe('K15: „Alle Daten löschen“', () => {
  it('entfernt auch Rettungskopien mit Schülerdaten', () => {
    localStorage.setItem('lehrerapp_v3_defekt_123', '{kaputt');
    app('clearAllData()');
    expect(localStorage.getItem('lehrerapp_v3_defekt_123')).toBeNull();
  });
});
