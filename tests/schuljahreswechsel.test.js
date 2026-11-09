// Y6: Schuljahreswechsel. Einstellungen → „Neues Schuljahr beginnen“: sichern, je Klasse übernehmen (neuer Name, Schüler
// bleiben mit Hinweisen, Geburtstag, Sitzplatz) oder löschen, Planung als Vorlage, Zusammenfassung. Danach ist das Jahr
// aufgeräumt; der alte Stand liegt im Sicherheitsnetz. Leiser Hinweis im Dashboard ab den Sommerferien.
const { loadApp, app } = require('./helpers/load-app');

const memoryStore = () => {
  const m = new Map();
  return { m, get: async k => m.get(k), put: async (k, v) => { m.set(k, v); }, clear: async () => m.clear() };
};
const ACCESS = { id: 'A'.repeat(22), key: 'K'.repeat(43) };
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null, halfYearEnd: '2027-02-12', schoolYearEnd: '2027-07-30', quickLinks: [{ id: 'q1', groupId: 'g2', target: 'seating' }],
      holidays: [{ id: 'h1', label: 'Pfingstferien', from: '2027-05-18', until: '2027-05-28' }, { id: 'h2', label: 'Sommerferien', from: '2027-08-02', until: '2027-09-13' },
        { id: 'h3', label: 'Herbstferien', from: '2027-11-02', until: '2027-11-05' }] },
    lessonSlots: [{ id: 's1', day: 0, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', recurring: 'weekly' }],
    lessonData: { 's1_2027-07-26': { done: 'Wiederholung', notes: 'privat' } },
    supervisions: [{ id: 'v1', day: 1, start: '09:30', end: '09:45', place: 'Hof', recurring: true }],
    acknowledgedWarnings: { a_absences: 3 },
    todos: [{ id: 't1', text: 'Kopien', created: 1, groupId: 'g2' }],
    groups: [
      { id: 'g1', subject: 'Mathe', className: '7b', year: '2026/27', color: '#3b82f6', schularbeitWeight: 50, gradeScale: '1-6',
        gradeEvents: [{ date: '2027-03-01', label: 'KA 3', type: 'schularbeit' }], attendanceEvents: [], participationEvents: [], homeworkEvents: [],
        plan: [{ id: 'p1', title: 'Brüche', lessons: 6, done: '2026-10-01' }, { id: 'p2', title: 'Terme', note: 'mit Tabelle' }],
        classNotes: [{ id: 'n1', text: 'Ausflug', date: '2027-07-01' }], seatingRows: 5, seatingCols: 6, seatingPlan: [{ studentId: 'a', gridX: 1, gridY: 2 }],
        studentApp: { on: true, access: ACCESS, goal: { target: 100, reward: 'Spiel', since: '2026-09-15' } } },
      { id: 'g2', subject: 'Physik', className: '9a', color: '#22c55e', schularbeitWeight: 50 },
    ],
    students: {
      g1: [{ id: 'a', firstName: 'Anna', lastName: 'A', notes: 'Brille', importantNote: 'Allergie', birthday: '2014-03-02',
        grades: [{ type: 'schularbeit', value: '2.0', date: '2027-03-01', note: 'KA 3' }], attendance: [{ id: 'x', date: '2027-03-02', type: 'abwesend' }],
        participation: [{ id: 'p', date: '2027-03-02', value: 'positive' }], homework: [{ id: 'h', date: '2027-03-02', note: '' }], studentNotes: [{ text: 'Gespräch', date: '2027-03-02' }] }],
      g2: [{ id: 'b', firstName: 'Ben', lastName: 'B', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] }],
    },
  };
}
const choices = (over = {}) => JSON.stringify([
  { id: 'g1', action: 'keep', name: '8b', template: true, ...(over.g1 || {}) },
  { id: 'g2', action: 'delete', name: '10a', template: false, ...(over.g2 || {}) },
]);

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2027, 7, 20, 10, 0));   // 20.08.2027, Sommerferien
  globalThis.syncStoreForTest = memoryStore();
  app('syncStore = globalThis.syncStoreForTest; newYearState = null');
  app(`replaceDB(migrateDB(${JSON.stringify(sampleDB())}))`);
  Object.keys(localStorage).filter(k => k.startsWith('sa_') || k === 'newyear_hint_dismissed').forEach(k => localStorage.removeItem(k));
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});
afterEach(() => vi.useRealTimers());

describe('Hilfen', () => {
  it('nächster Klassenname und nächstes Schuljahr', () => {
    expect(app('nextClassName("7b")')).toBe('8b');
    expect(app('nextClassName("Q11")')).toBe('Q12');
    expect(app('nextClassName("10c")')).toBe('11c');
    expect(app('nextClassName("Chor")')).toBe('Chor');
    expect(app('nextYearLabel("2026/27")')).toBe('2027/28');
    expect(app('nextYearLabel("2099/00".replace("2099/00", "2099/99"))')).toBe('2100/00');
  });
});

describe('Umstellung (applyNewSchoolYear)', () => {
  it('übernommene Klasse: neuer Name, Schüler mit Hinweisen, Geburtstag und Sitzplatz; alles aus dem Jahr weg', () => {
    const out = app(`applyNewSchoolYear(${choices()})`);
    expect(out).toEqual({ kept: 1, deleted: 1, templates: 1 });
    const g = app('db.groups[0]');
    expect(g).toMatchObject({ id: 'g1', className: '8b', year: '2027/28', subject: 'Mathe', color: '#3b82f6', gradeScale: '1-6', seatingRows: 5 });
    expect(g.gradeEvents).toEqual([]); expect(g.plan).toEqual([]); expect(g.classNotes).toEqual([]);
    expect(g.seatingPlan).toEqual([{ studentId: 'a', gridX: 1, gridY: 2 }]);
    const a = app('db.students.g1[0]');
    expect(a).toMatchObject({ id: 'a', firstName: 'Anna', notes: 'Brille', importantNote: 'Allergie', birthday: '2014-03-02',
      grades: [], attendance: [], participation: [], homework: [], studentNotes: [] });
  });

  it('gelöschte Klasse samt Schülern, Schnellzugriff; Merkzettel bleibt ohne Klasse (Regel 10, 73, 93)', () => {
    app(`applyNewSchoolYear(${choices()})`);
    expect(app('db.groups.map(g => g.id)')).toEqual(['g1']);
    expect(app('db.students.g2')).toBeUndefined();
    expect(app('db.settings.quickLinks')).toBeUndefined();
    expect(app('db.todos')).toEqual([{ id: 't1', text: 'Kopien', created: 1 }]);
  });

  it('Stundenplan, Stundendaten, Aufsichten, Quittungen weg; Halbjahr/Schuljahresende und vergangene Ferien zurückgesetzt', () => {
    app(`applyNewSchoolYear(${choices()})`);
    expect(app('db.lessonSlots')).toEqual([]);
    expect(app('db.lessonData')).toEqual({});
    expect(app('db.supervisions')).toEqual([]);
    expect(app('db.acknowledgedWarnings')).toEqual({});
    expect(app('db.settings.halfYearEnd')).toBeUndefined();
    expect(app('db.settings.schoolYearEnd')).toBeUndefined();
    expect(app('db.settings.holidays.map(h => h.id)')).toEqual(['h2', 'h3']);   // laufende Sommerferien und kommende bleiben
  });

  it('Planung als Vorlage: Themen ohne Erledigt-Stand, mit Dauer und Notiz', () => {
    app(`applyNewSchoolYear(${choices()})`);
    const t = app('planTemplatesOf()');
    expect(t.length).toBe(1);
    expect(t[0]).toMatchObject({ name: 'Mathe 7b', year: '2026/27', created: '2027-08-20' });
    expect(t[0].topics.map(x => ({ title: x.title, lessons: x.lessons, note: x.note }))).toEqual([
      { title: 'Brüche', lessons: 6, note: undefined }, { title: 'Terme', lessons: undefined, note: 'mit Tabelle' }]);
    expect(JSON.stringify(t)).not.toMatch(/done/);
  });

  it('ohne Haken keine Vorlage', () => {
    app(`applyNewSchoolYear(${choices({ g1: { template: false } })})`);
    expect(app('planTemplatesOf()')).toEqual([]);
  });

  it('Schülerapp: neuer Link, alter wird gelöscht, Klassenziel fällt weg (Regel 95)', () => {
    app(`applyNewSchoolYear(${choices()})`);
    const sa = app('db.groups[0].studentApp');
    expect(sa.on).toBe(true);
    expect(sa.goal).toBeUndefined();
    expect(sa.access.id).not.toBe(ACCESS.id);
    expect(app('StudentShare.isAccess(db.groups[0].studentApp.access)')).toBe(true);
    expect(JSON.parse(localStorage.getItem('sa_delete_queue'))).toContain(ACCESS.id);
  });

  it('Klasse ohne Wahl (z. B. per Sync dazugekommen) bleibt unter ihrem Namen, nur ihr Jahr wird geleert (Regel 7)', () => {
    app(`applyNewSchoolYear(${JSON.stringify([{ id: 'g1', action: 'keep', name: '8b', template: false }])})`);
    expect(app('db.groups.map(g => g.className)')).toEqual(['8b', '9a']);
    expect(app('db.students.g2[0].firstName')).toBe('Ben');
  });
});

describe('Fenster in drei Schritten', () => {
  const body = () => document.getElementById('ny-body');
  const btn = id => document.getElementById(id);
  beforeEach(() => {
    app('window.__exports = 0; exportData = () => { window.__exports++; }');
  });

  it('Schritt 1: „Weiter“ erst nach der Sicherung', () => {
    app('openNewYear()');
    expect(document.getElementById('modal-new-year').classList.contains('hidden')).toBe(false);
    expect(btn('ny-next').disabled).toBe(true);
    btn('ny-backup').click();
    expect(app('window.__exports')).toBe(1);
    expect(btn('ny-next').disabled).toBe(false);
  });

  it('Schritt 2: je Klasse übernehmen/löschen, Name vorgeschlagen, Vorlage nur mit Planung; Schritt 3 fasst zusammen', () => {
    app('openNewYear()'); btn('ny-backup').click(); btn('ny-next').click();
    const rows = () => [...body().querySelectorAll('.ny-row')];
    expect(rows().length).toBe(2);
    expect(rows()[0].querySelector('.ny-name input').value).toBe('8b');
    expect(rows()[0].querySelector('.ny-tpl input').checked).toBe(true);
    expect(rows()[1].querySelector('.ny-tpl')).toBeNull();   // Physik hat keine Planung
    rows()[1].querySelector('[data-act="delete"]').click();
    expect(rows()[1].querySelector('.ny-name')).toBeNull();
    const name = rows()[0].querySelector('.ny-name input');
    name.value = '8c'; name.dispatchEvent(new Event('input'));
    btn('ny-next').click();
    const t = body().textContent;
    expect(t).toMatch(/Übernommen: 7b → 8c/);
    expect(t).toMatch(/Gelöscht: 9a/);
    expect(t).toMatch(/neuen Schülerapp-Link/);
    expect(app('db.groups.length')).toBe(2);   // vor dem letzten Knopf ist nichts geändert
  });

  it('Schließen ab Schritt 2 fragt nach; nichts wird geändert', () => {
    app('openNewYear()'); btn('ny-backup').click(); btn('ny-next').click();
    const realConfirm = window.confirm;
    window.confirm = () => true;
    try { app('closeModalLikeButton("modal-new-year")'); } finally { window.confirm = realConfirm; }
    expect(document.getElementById('modal-new-year').classList.contains('hidden')).toBe(true);
    expect(app('db.students.g1[0].grades.length')).toBe(1);
  });

  it('„Neues Schuljahr beginnen“: alter Stand im Sicherheitsnetz, Umstellung gespeichert, wiederherstellbar', async () => {
    const before = app('JSON.stringify(db)');
    app('openNewYear()'); btn('ny-backup').click(); btn('ny-next').click();
    body().querySelectorAll('.ny-row')[1].querySelector('[data-act="delete"]').click();
    btn('ny-next').click();
    btn('ny-go').click();
    await vi.waitFor(() => expect(app('db.groups.length')).toBe(1));
    expect(app('db.groups[0].className')).toBe('8b');
    expect(JSON.parse(localStorage.getItem('lehrerapp_v3')).groups.length).toBe(1);   // gespeichert
    const list = globalThis.syncStoreForTest.m.get('merge_backups');
    expect(list[0]).toMatchObject({ kind: 'newYear', local: before });
    app('answerChoice(null)');   // Frage „Als Nächstes“ schließen
  });

  it('der Stand vor dem Wechsel wird nicht von späteren Abgleichen verdrängt', async () => {
    await app('keepMergeBackup("vorher", "vorher", "newYear")');
    for (let i = 0; i < 4; i++) await app(`keepMergeBackup("l${i}", "c${i}")`);
    const list = globalThis.syncStoreForTest.m.get('merge_backups');
    expect(list.length).toBe(4);
    expect(list.some(x => x.kind === 'newYear' && x.local === 'vorher')).toBe(true);
  });
});

describe('Vorlagen in der Planung', () => {
  it('„Von Klasse oder Vorlage übernehmen“ hängt die Themen der Vorlage an', () => {
    app(`applyNewSchoolYear(${choices()})`);
    const id = app('planTemplatesOf()[0].id');
    app(`copyPlanFrom("g1", "${id}")`);
    expect(app('groupPlan(db.groups[0]).map(t => t.title)')).toEqual(['Brüche', 'Terme']);
    expect(app('groupPlan(db.groups[0])[0].lessons')).toBe(6);
    app('openGroupStudents("g1", "plan")');
    expect(document.getElementById('overview-content').textContent).toMatch(/Von Klasse oder Vorlage übernehmen/);
  });

  it('Einstellungen: Vorlagen aufgelistet, Löschen mit „Rückgängig“', () => {
    app(`applyNewSchoolYear(${choices()})`);
    app('openSettings(); showSettingsPane("data")');
    const list = document.getElementById('plan-templates-list');
    expect(list.textContent).toMatch(/Mathe 7b/);
    list.querySelector('.entry-item-delete').click();
    expect(app('planTemplatesOf().length')).toBe(0);
    app('closeModal("modal-settings")');
  });

  it('Abgleich: auf zwei Geräten verschiedene Vorlagen angelegt → beide bleiben, keine Rückfrage', () => {
    const base = sampleDB();
    const l = JSON.parse(JSON.stringify(base)), c = JSON.parse(JSON.stringify(base));
    l.planTemplates = [{ id: 'x1', name: 'Mathe 7b', topics: [{ id: 't', title: 'Brüche' }] }];
    c.planTemplates = [{ id: 'x2', name: 'Physik 9a', topics: [] }];
    const r = app('mergeDB')(base, l, c);
    expect(r.conflicts).toEqual([]);
    expect(r.merged.planTemplates.map(t => t.id).sort()).toEqual(['x1', 'x2']);
  });
});

describe('Hinweis im Dashboard', () => {
  const note = () => document.getElementById('dash-safety-note');
  it('in den Sommerferien mit Daten des alten Jahres: leiser Hinweis, „Später“ bis zum nächsten Jahr', () => {
    app('cloudConfigured = () => true; switchView("dashboard"); renderDashboard()');
    expect(note().textContent).toMatch(/Neues Schuljahr\?/);
    note().querySelector('[data-hint="newyear"]').click();
    expect(note()).toBeNull();
    expect(localStorage.getItem('newyear_hint_dismissed')).toBe('2027');
  });

  it('nicht während des Schuljahrs und nicht ohne Daten', () => {
    vi.setSystemTime(new Date(2027, 2, 10, 10, 0));
    expect(app('newYearNoteDue()')).toBe(false);
    vi.setSystemTime(new Date(2027, 7, 20, 10, 0));
    app(`applyNewSchoolYear(${choices()})`);
    expect(app('newYearNoteDue()')).toBe(false);
  });
});
