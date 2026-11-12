// Gesamtprüfung 11.11.2026, Paket 3: zwei Fenster, zwei Geräte. AP2, AP3, AP4, AP5, AP10.
const { loadApp, app } = require('./helpers/load-app');

function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [], lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50 }],
    students: { g1: [] },
    todos: [{ id: 't1', text: 'Kopien machen', created: '2026-11-10' }],
  };
}
beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  app('replaceDB(' + JSON.stringify(sampleDB()) + ')');
  document.getElementById('toast-container').innerHTML = '';
});

describe('AP5: Merkzettel – Abgleich während des Bearbeitens', () => {
  it('Speichern findet den Punkt per Kennung wieder, die Änderung geht nicht verloren', () => {
    app('switchView("todos"); editTodo(db.todos[0])');
    document.getElementById('todo-input').value = 'Kopien machen (30 Stück)';
    app('replaceDB(' + JSON.stringify(sampleDB()) + ')');   // Abgleich: neue Objekte
    app('submitTodo()');
    expect(app('db.todos').map(t => t.text)).toEqual(['Kopien machen (30 Stück)']);
    expect(document.getElementById('toast-container').textContent).not.toMatch(/gibt es nicht mehr/);
  });
  it('Punkt wirklich gelöscht: Text bleibt im Feld, nichts wird still verworfen', () => {
    app('switchView("todos"); editTodo(db.todos[0])');
    document.getElementById('todo-input').value = 'geändert';
    const d = sampleDB(); d.todos = [];
    app('replaceDB(' + JSON.stringify(d) + ')');
    app('submitTodo()');
    expect(document.getElementById('todo-input').value).toBe('geändert');
  });
  it('„Rückgängig“ nach Erledigt wirkt auch nach einem Abgleich', () => {
    app('switchView("todos"); toggleTodo(db.todos[0])');
    const d = sampleDB(); d.todos[0].done = true; d.todos[0].doneAt = '2026-11-12';
    app('replaceDB(' + JSON.stringify(d) + ')');
    [...document.querySelectorAll('#toast-container .toast-undo button')].find(b => b.textContent === 'Rückgängig').click();
    expect(app('db.todos[0].done')).toBeUndefined();
  });
});

describe('AP2: „Dieses Fenster speichern“ behält die eigene Eingabe', () => {
  function otherWindowSaves(text) {
    const d = sampleDB(); d.todos[0].text = text;
    localStorage.setItem('lehrerapp_v3', JSON.stringify(d));
    localStorage.setItem('lehrerapp_v3_rev', 'anderes-fenster-' + Math.random());
    window.dispatchEvent(new StorageEvent('storage', { key: 'lehrerapp_v3' }));
  }
  it('anderes Fenster speichert, während hier ein Eingabefenster offen ist; „Dieses Fenster speichern“', async () => {
    app('openModal("modal-add-student")');
    otherWindowSaves('vom anderen Fenster');
    expect(app('db.todos[0].text')).toBe('Kopien machen');   // wartet bis zum Schließen
    app('db.todos[0].text = "meine Eingabe"; saveDB()');   // fragt, weil das andere Fenster gespeichert hat
    app('closeModal("modal-add-student")');
    expect(app('typeof choiceResolve === "function"')).toBe(true);
    app('answerChoice("keep")');
    await Promise.resolve(); await Promise.resolve();
    expect(app('db.todos[0].text')).toBe('meine Eingabe');
    expect(JSON.parse(localStorage.getItem('lehrerapp_v3')).todos[0].text).toBe('meine Eingabe');
  });
  it('„Anderes Fenster laden“ übernimmt den Stand des anderen Fensters', async () => {
    app('openModal("modal-add-student")');
    otherWindowSaves('vom anderen Fenster');
    app('db.todos[0].text = "meine Eingabe"; saveDB()');
    app('closeModal("modal-add-student")');
    app('answerChoice("load")');
    await Promise.resolve(); await Promise.resolve();
    expect(app('db.todos[0].text')).toBe('vom anderen Fenster');
  });
});

describe('AP4/AP18: Sicherung importieren', () => {
  let netz;
  beforeEach(() => {
    const m = new Map();
    netz = m;
    globalThis.syncStoreForTest = { get: async k => m.get(k), put: async (k, v) => { m.set(k, v); }, clear: async () => m.clear() };
    app('syncStore = globalThis.syncStoreForTest');
    globalThis.confirm = vi.fn(() => true);
  });
  it('legt den jetzigen Stand vorher ins Sicherheitsnetz', async () => {
    app('db.groups[0].className = "7b-jetzt"; saveDB()');
    const backup = sampleDB(); backup.groups[0].className = '5a-alt'; backup.settings.lastModified = new Date(2026, 8, 1, 10).getTime();
    await app('importBackup(' + JSON.stringify(backup) + ')');
    expect(app('db.groups[0].className')).toBe('5a-alt');
    const list = await app('mergeBackupsOfAccount()');
    expect(JSON.parse(list[0].local).groups[0].className).toBe('7b-jetzt');
    expect(list[0].kind).toBe('restore');
  });
  it('nennt in der Rückfrage, von wann die Sicherung ist, und den Weg zurück', async () => {
    const backup = sampleDB(); backup.settings.lastModified = new Date(2026, 8, 1, 10).getTime();
    await app('importBackup(' + JSON.stringify(backup) + ')');
    const text = globalThis.confirm.mock.calls[0][0];
    expect(text).toMatch(/01\.09\.2026/);
    expect(text).toMatch(/Früheren Stand zurückholen/);
  });
  it('Abbrechen ändert nichts und legt nichts ab', async () => {
    globalThis.confirm = vi.fn(() => false);
    const backup = sampleDB(); backup.groups[0].className = '5a-alt';
    await app('importBackup(' + JSON.stringify(backup) + ')');
    expect(app('db.groups[0].className')).toBe('7b');
    expect(netz.size).toBe(0);
  });
  it('AP18: Leiste kommt aus dem importierten Stand (Schnellzugriff)', async () => {
    const backup = sampleDB(); backup.settings.quickLinks = [{ id: 'q1', groupId: 'g1', target: 'seating' }];
    await app('importBackup(' + JSON.stringify(backup) + ')');
    expect(document.querySelector('.nav-items').textContent).toMatch(/7b/);
  });
});

describe('AP3: „Master-Passwort neu festlegen“ mit Daten eines anderen Kontos', () => {
  const SM = () => app('SyncManager');
  beforeEach(() => {
    SM().currentUser = { uid: 'lehrerin-b', email: 'b@example.org' };
    app('db.syncSettings = { uid: "lehrer-a", lastSyncedCloudTimestamp: 5, syncedLocalModified: 5 }; foreignAccountAccepted = ""');
    SM().overwriteCloud = vi.fn(async () => 99);
    document.getElementById('sync-reset-group').classList.add('hidden');
  });
  afterEach(() => { SM().currentUser = null; if (app('typeof choiceResolve === "function"')) app('answerChoice(null)'); });
  const title = () => document.getElementById('modal-choice-title').textContent;
  it('fragt zuerst nach dem anderen Konto; Abbrechen öffnet das Passwort-Formular nicht', async () => {
    const done = app('startCloudPasswordReset()');
    await vi.waitFor(() => expect(app('typeof choiceResolve === "function"')).toBe(true));
    expect(title()).toMatch(/anderen Kontos/);
    app('answerChoice(null)');
    await done;
    expect(document.getElementById('sync-reset-group').classList.contains('hidden')).toBe(true);
  });
  it('„In dieses Konto übernehmen“ führt weiter zur Passwort-Frage', async () => {
    const done = app('startCloudPasswordReset()');
    await vi.waitFor(() => expect(app('typeof choiceResolve === "function"')).toBe(true));
    app('answerChoice("adopt")');
    await vi.waitFor(() => expect(title()).toMatch(/Master-Passwort neu/));
    app('answerChoice("reset")');
    await done;
    expect(document.getElementById('sync-reset-group').classList.contains('hidden')).toBe(false);
  });
  it('Formular schon offen: Überschreiben geht nicht ohne Zustimmung', async () => {
    document.getElementById('sync-reset-password').value = 'neu123';
    document.getElementById('sync-reset-password-confirm').value = 'neu123';
    globalThis.alert = vi.fn();
    await app('confirmCloudPasswordReset()');
    expect(SM().overwriteCloud).not.toHaveBeenCalled();
  });
});
