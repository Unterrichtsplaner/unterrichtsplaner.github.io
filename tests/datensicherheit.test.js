// Paket „Daten schützen“: W3 (Grund bleibt beim Umstellen), W2 (Daneben-Tippen verwirft nichts ohne Rückfrage),
// Y4 (Erinnerung an die Sicherung), Y5 (dauerhafter Speicher, Hinweis „Zum Home-Bildschirm“).
const { loadApp, app } = require('./helpers/load-app');

const NOW = new Date(2026, 10, 5, 10, 0);
const DAY = 24 * 3600 * 1000;
const st = (id, f, extra = {}) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
function sampleDB(settings = {}) {
  return {
    settings: { teacherName: 'T', blocks: null, ...settings },
    lessonSlots: [], lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50 }],
    students: { g1: [st('a', 'Anna'), st('b', 'Ben')] },
  };
}
const att = () => app('db.students.g1[0].attendance');
const isOpen = id => !document.getElementById(id).classList.contains('hidden');
const note = () => document.getElementById('dash-safety-note');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  app('db = ' + JSON.stringify(sampleDB()));
  ['backup_hint_snoozed', 'home_hint_dismissed', 'sync_master_password'].forEach(k => localStorage.removeItem(k));
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  window.confirm = () => true;
});
afterEach(() => vi.useRealTimers());

describe('W3: Grund bleibt beim Umstellen im Schüler-Fenster', () => {
  const day = '2026-11-05';
  const open = () => app(`openSeatingStudentModal("a", "g1", "${day}")`);
  const set = (type, note) => app(`db.students.g1[0].attendance = [{ id: "x", date: "${day}", type: "${type}", note: "${note}" }]`);
  it('Entschuldigt → Zu spät', () => {
    set('entschuldigt', 'Arztattest'); open(); app('setSeatingLate()');
    expect(att()).toEqual([expect.objectContaining({ id: 'x', type: 'zuspät', note: 'Arztattest' })]);
  });
  it('Zu spät → Fehlt', () => {
    set('zuspät', 'Bus'); open(); app('setSeatingAbsence("abwesend")');
    expect(att()).toEqual([expect.objectContaining({ id: 'x', type: 'abwesend', note: 'Bus' })]);
  });
  it('Zu spät → Entschuldigt', () => {
    set('zuspät', 'Bus'); open(); app('setSeatingAbsence("entschuldigt")');
    expect(att()).toEqual([expect.objectContaining({ id: 'x', type: 'entschuldigt', note: 'Bus' })]);
  });
  it('höchstens ein Eintrag pro Tag; zweites Tippen nimmt weiter zurück', () => {
    open(); app('setSeatingLate()');
    expect(att().length).toBe(1);
    open(); app('setSeatingLate()');
    expect(att()).toEqual([]);
  });
});

describe('W2: Fenster verwerfen Eingaben nicht ohne Rückfrage', () => {
  const asked = () => { let n = 0; window.confirm = () => { n++; return false; }; return () => n; };
  const cases = [
    ['modal-add-student', 'openGroupStudents("g1"); openAddStudent()', 'new-student-first', 'Lena'],
    ['modal-import-students', 'openGroupStudents("g1"); openImportStudentsModal()', 'import-text', 'Lena X\nTom Y'],
    ['modal-add-group', 'openAddSubjectGroup()', 'new-group-class', '9z'],
    ['modal-add-lesson', 'openAddLessonSlot(0, 1)', 'new-lesson-subject', 'Physik'],
    ['modal-add-column', 'openGroupStudents("g1", "attendance"); openAddColumnModal()', 'new-col-label', 'Ausflug'],
  ];
  for (const [id, open, field, value] of cases) {
    it(`${id}: unverändert ohne Frage zu; geändert fragt, „Abbrechen“ lässt alles stehen`, () => {
      const n = asked();
      app(open);
      expect(isOpen(id)).toBe(true);
      app(`closeModalLikeButton("${id}")`);
      expect(n()).toBe(0);
      expect(isOpen(id)).toBe(false);
      app(open);
      document.getElementById(field).value = value;
      app(`closeModalLikeButton("${id}")`);
      expect(n()).toBe(1);
      expect(isOpen(id)).toBe(true);
      expect(document.getElementById(field).value).toBe(value);
      window.confirm = () => true;
      app(`closeModalLikeButton("${id}")`);
      expect(isOpen(id)).toBe(false);
    });
  }
  it('Klasse: auch eine geänderte Farbe zählt; Bearbeiten ohne Änderung fragt nicht', () => {
    const n = asked();
    app('openEditGroup("g1")');
    app('closeModalLikeButton("modal-add-group")');
    expect(n()).toBe(0);
    app('openEditGroup("g1"); selectedGroupColor = "#000001"; closeModalLikeButton("modal-add-group")');
    expect(n()).toBe(1);
    window.confirm = () => true;
    app('closeModalLikeButton("modal-add-group")');
  });
  it('Speichern fragt nicht', () => {
    const n = asked();
    app('openGroupStudents("g1"); openAddStudent()');
    document.getElementById('new-student-first').value = 'Lena';
    app('saveStudent()');
    expect(n()).toBe(0);
    expect(isOpen('modal-add-student')).toBe(false);
  });
  it('Schüler-Fenster: Notiz unter „Mehr“ wird beim Schließen übernommen; angefangener Grund fragt', () => {
    app('openGroupStudents("g1"); openStudentDetail("a")');
    document.getElementById('new-student-note-text').value = 'Elterngespräch';
    app('closeModalLikeButton("modal-seating-student")');
    expect(app('db.students.g1[0].studentNotes.map(n => n.text)')).toEqual(['Elterngespräch']);
    const n = asked();
    app('openStudentDetail("a")');
    document.getElementById('new-att-note').value = 'Arzt';
    app('closeModalLikeButton("modal-seating-student")');
    expect(n()).toBe(1);
    expect(isOpen('modal-seating-student')).toBe(true);
    window.confirm = () => true;
    app('closeModalLikeButton("modal-seating-student")');
    expect(isOpen('modal-seating-student')).toBe(false);
  });
  it('Schüler-Fenster: Angefangenes rutscht nie zum nächsten Schüler', () => {
    app('openGroupStudents("g1"); openStudentDetail("a")');
    ['new-att-note', 'new-hw-student-note', 'new-student-note-text'].forEach(f => { document.getElementById(f).value = 'alt'; });
    app('closeModal("modal-seating-student"); openStudentDetail("b")');
    ['new-att-note', 'new-hw-student-note', 'new-student-note-text'].forEach(f => expect(document.getElementById(f).value, f).toBe(''));
    expect(app('db.students.g1[0].studentNotes.map(n => n.text)')).toEqual(['alt']);   // Notiz gehört zu Anna
    app('closeModal("modal-seating-student")');
  });
});

describe('Y4: Erinnerung an die Sicherung', () => {
  const show = () => app('switchView("dashboard")');
  it('noch nie gesichert, ohne Cloud: Hinweis mit „Jetzt sichern“ und „Später“', () => {
    show();
    expect(note().textContent).toMatch(/Sicherung/);
    expect(note().querySelector('.dash-safety-do')).not.toBeNull();
    expect(note().querySelector('.dash-safety-later')).not.toBeNull();
  });
  it('vor 10 Tagen gesichert: nichts; vor 31 Tagen: Hinweis nennt die Tage', () => {
    app(`db.settings.lastBackupTimestamp = ${NOW.getTime() - 10 * DAY}`);
    show();
    expect(note()).toBeNull();
    app(`db.settings.lastBackupTimestamp = ${NOW.getTime() - 31 * DAY}; renderDashboard()`);
    expect(note().textContent).toMatch(/31 Tagen/);
  });
  it('Cloud eingerichtet (auch bevor die Anmeldung fertig ist): kein Hinweis', () => {
    localStorage.setItem('sync_master_password', 'x');
    show();
    expect(note()).toBeNull();
  });
  it('ohne Schüler: kein Hinweis', () => {
    app('db.students = { g1: [] }');
    show();
    expect(note()).toBeNull();
  });
  it('„Später“: 30 Tage Ruhe, nur auf dem Gerät; danach wieder', () => {
    show();
    note().querySelector('.dash-safety-later').click();
    expect(note()).toBeNull();
    expect(JSON.stringify(app('db'))).not.toMatch(/backup_hint/);
    vi.setSystemTime(new Date(NOW.getTime() + 29 * DAY));
    app('renderDashboard()');
    expect(note()).toBeNull();
    vi.setSystemTime(new Date(NOW.getTime() + 31 * DAY));
    app('renderDashboard()');
    expect(note()).not.toBeNull();
  });
  it('„Jetzt sichern“ sichert und nimmt den Hinweis weg; lastModified bleibt', () => {
    app('downloadBackupFile = () => {}');
    show();
    const before = app('db.settings.lastModified');
    note().querySelector('.dash-safety-do').click();
    expect(app('db.settings.lastBackupTimestamp')).toBe(NOW.getTime());
    expect(app('db.settings.lastModified')).toBe(before);
    expect(note()).toBeNull();
  });
});

describe('Y5: dauerhafter Speicher und Home-Bildschirm', () => {
  const restore = {};
  beforeEach(() => { restore.ua = Object.getOwnPropertyDescriptor(navigator, 'userAgent'); restore.storage = Object.getOwnPropertyDescriptor(navigator, 'storage'); });
  afterEach(() => {
    for (const [k, d] of [['userAgent', restore.ua], ['storage', restore.storage]]) { if (d) Object.defineProperty(navigator, k, d); else delete navigator[k]; }
  });
  const setUA = ua => Object.defineProperty(navigator, 'userAgent', { configurable: true, value: ua });
  const setStorage = s => Object.defineProperty(navigator, 'storage', { configurable: true, value: s });
  const IPAD = 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';

  it('fragt einmal an, wenn noch nicht dauerhaft', async () => {
    let asked = 0;
    setUA('Chrome'); setStorage({ persisted: async () => false, persist: async () => { asked++; return true; } });
    await app('requestPersistentStorage()');
    expect(asked).toBe(1);
  });
  it('schon dauerhaft, kein Speicher-Dienst, Firefox (eigener Dialog) oder Fehler: fragt nicht, wirft nicht', async () => {
    let asked = 0;
    setUA('Chrome'); setStorage({ persisted: async () => true, persist: async () => { asked++; return true; } });
    await app('requestPersistentStorage()');
    setStorage(undefined);
    await app('requestPersistentStorage()');
    setUA('Mozilla/5.0 Firefox/130.0'); setStorage({ persisted: async () => false, persist: async () => { asked++; return true; } });
    await app('requestPersistentStorage()');
    setUA('Chrome'); setStorage({ persisted: async () => { throw new Error('x'); }, persist: async () => { asked++; return true; } });
    await app('requestPersistentStorage()');
    expect(asked).toBe(0);
  });
  it('iPad im Browser-Tab, ohne Cloud: Hinweis „Zum Home-Bildschirm“; „Verstanden“ für immer weg', () => {
    setUA(IPAD);
    app(`db.settings.lastBackupTimestamp = ${NOW.getTime()}; switchView("dashboard")`);
    expect(note().textContent).toMatch(/Home-Bildschirm/);
    note().querySelector('.dash-safety-later').click();
    expect(note()).toBeNull();
    app('renderDashboard()');
    expect(note()).toBeNull();
    expect(JSON.stringify(app('db'))).not.toMatch(/home_hint/);
  });
  it('immer nur ein Hinweis: Sicherung geht vor', () => {
    setUA(IPAD);
    app('switchView("dashboard")');
    expect(document.querySelectorAll('#dash-safety-note').length).toBe(1);
    expect(note().textContent).toMatch(/Sicherung/);
  });
  it('als App vom Home-Bildschirm oder am Laptop: kein Hinweis', () => {
    app(`db.settings.lastBackupTimestamp = ${NOW.getTime()}`);
    setUA(IPAD);
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: true });
    app('switchView("dashboard")');
    expect(note()).toBeNull();
    delete navigator.standalone;
    setUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/130');
    app('renderDashboard()');
    expect(note()).toBeNull();
  });
});
