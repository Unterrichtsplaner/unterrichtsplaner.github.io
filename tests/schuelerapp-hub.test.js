// Schülerapp-Übersicht (BUGS BE1): alle Klassen auf einer Seite, Schalter, Plusse im Monat, Vorschau,
// persönliche Seite erst nach „Anzeigen“ (Regel 16/67).
const { loadApp, app } = require('./helpers/load-app');

const X = `Peter's "Test" <img data-xss src=x>`;
const acc = c => ({ id: c.repeat(22), key: c.toLowerCase().repeat(43) });
const st = (id, first, part = [], extra = {}) => ({ id, firstName: first, lastName: 'Muster', grades: [], attendance: [], homework: [], studentNotes: [], participation: part, ...extra });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null, studentApp: { on: true } },
    lessonSlots: [], lessonData: {}, supervisions: [],
    groups: [
      { id: 'g1', subject: 'Mathe', className: '7a', color: '#3b82f6', schularbeitWeight: 50,
        studentApp: { on: true, access: acc('A'), ranking: true, goal: { target: 50, reward: 'Rätselstunde', since: '2026-11-01' }, personal: { on: true, step: 10, shopOn: true, shopSince: '2026-09-01' } } },
      { id: 'g2', subject: 'Physik', className: '8b', color: '#22c55e', schularbeitWeight: 50, studentApp: { on: true, access: acc('B'), ranking: true } },
      { id: 'g3', subject: 'Bio', className: '9c', color: '#ef4444', schularbeitWeight: 50 },
    ],
    students: {
      g1: [st('a', 'Anna', [{ id: 'p1', date: '2026-11-02', value: 'excellent' }, { id: 'p2', date: '2026-11-03', value: 'positive' }, { id: 'p0', date: '2026-10-03', value: 'positive' }],
             { redeemed: [{ id: 'r1', date: '2026-11-04', name: 'Platz', price: 2, kind: 'perk' }, { id: 'r2', date: '2026-11-05', name: 'Spende', price: 1, kind: 'donate' }, { id: 'r3', date: '2026-10-05', name: 'alt', price: 5, kind: 'perk' }],
               studentApp: { access: acc('S') } }),
           st('b', 'Ben', [], { studentApp: { access: acc('T') } })],
      g2: [st('c', 'Cem', [{ id: 'p3', date: '2026-11-02', value: 'positive' }])],
      g3: [],
    },
  };
}
const load = d => app('replaceDB(migrateDB(' + JSON.stringify(d) + '))');
const hub = () => document.getElementById('hub-content');
const card = id => hub().querySelector(`.hub-card[data-id="${id}"]`);
const change = (el, v) => { el.checked = v; el.dispatchEvent(new Event('change')); };
const flush = async () => { for (let i = 0; i < 10; i++) await new Promise(r => setTimeout(r, 0)); };

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 12, 10, 0));
  window.innerWidth = 1280;
  app('SyncManager').currentUser = { uid: 'u1' }; app('SyncManager').isInitialized = true;
  load(sampleDB());
  app('hubGroupId = null; hubPicked = false; hubMode = "class"; hubStudentId = null; hubShown = false');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  if (app('typeof choiceResolve === "function"')) app('answerChoice(null)');
  globalThis.confirm = () => true;
});
afterEach(() => { app('SyncManager').currentUser = null; app('SyncManager').isInitialized = false; app('switchView("dashboard")'); vi.useRealTimers(); });

describe('BE1: Knopf und Seite', () => {
  it('Knopf in „Klassen“ nur mit eingeschalteter Schülerapp', () => {
    app('switchView("classes")');
    expect(document.getElementById('btn-studentapp-hub').classList.contains('hidden')).toBe(false);
    app('db.settings.studentApp.on = false; renderSubjectGroups()');
    expect(document.getElementById('btn-studentapp-hub').classList.contains('hidden')).toBe(true);
  });
  it('öffnet die Seite, „Klassen“ bleibt markiert, eine Karte je Klasse', () => {
    app('switchView("classes"); openStudentAppHub()');
    expect(document.getElementById('view-studentapp').classList.contains('active')).toBe(true);
    expect(document.getElementById('nav-classes').classList.contains('active')).toBe(true);
    expect([...hub().querySelectorAll('.hub-card')].map(c => c.dataset.id)).toEqual(['g1', 'g2', 'g3']);
    expect(hub().querySelector('.hub-sum').textContent).toMatch(/2 von 3 Klassen freigegeben, 1 mit persönlichen Seiten/);
  });
  it('Stand je Klasse: was sie sieht, Klassenziel, Rangliste, Plusse im Monat', () => {
    app('openStudentAppHub()');
    const t = card('g1').textContent.replace(/\s+/g, ' ');
    expect(t).toMatch(/Inhaltsverzeichnis · Hausaufgaben · Tests · Nächste Stunde/);
    expect(t).toMatch(/4 von 50, dann: Rätselstunde/);   // ++ und + im November, Spende 1 zählt fürs Ziel mit
    expect(t).toMatch(/Platz 1 von 2/);
    expect(t).toMatch(/Plusse November\s*3 gesammelt · 2 eingelöst · 1 gespendet/);
    expect(card('g3').textContent).toMatch(/Die Klasse sieht nichts/);
    expect(card('g3').querySelector('[data-hub-switch="personal"]')).toBeNull();
  });
  it('ohne Cloud ein Hinweis statt der Karten', () => {
    app('SyncManager').currentUser = null;
    app('openStudentAppHub()');
    expect(hub().textContent).toMatch(/braucht die Cloud/);
  });
  it('aus den Einstellungen erreichbar', () => {
    app('openSettings(); showSettingsPane("studentapp")');
    app('openStudentAppHubFromSettings()');
    expect(document.getElementById('modal-settings').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('view-studentapp').classList.contains('active')).toBe(true);
  });
  it('Namen escaped (Regel 3)', () => {
    const d = sampleDB(); d.groups[1].className = X; d.groups[1].subject = X; d.students.g2[0].firstName = X;
    load(d);
    app('openStudentAppHub(); hubPick("g2")');
    expect(hub().querySelector('[data-xss]')).toBeNull();
    expect(card('g2').textContent).toContain(X);
  });
});

describe('BE1: Schalter direkt in der Übersicht', () => {
  it('Freigabe und Rangliste', () => {
    app('openStudentAppHub()');
    change(card('g3').querySelector('[data-hub-switch="on"]'), true);
    expect(app('studentAppOf(db.groups[2]).on')).toBe(true);
    expect(card('g3').querySelector('[data-hub-switch="ranking"]')).not.toBeNull();
    change(card('g2').querySelector('[data-hub-switch="ranking"]'), false);
    expect(app('db.groups[1].studentApp.ranking')).toBe(false);
    expect(card('g1').textContent).toMatch(/wartet auf eine zweite Klasse/);
  });
  it('persönliche Seiten mit derselben Rückfrage; Abbrechen lässt den Schalter aus', async () => {
    app('openStudentAppHub()');
    change(card('g2').querySelector('[data-hub-switch="personal"]'), true);
    await vi.waitFor(() => expect(app('typeof choiceResolve === "function"')).toBe(true));
    expect(document.getElementById('modal-choice-text').textContent).toMatch(/Schulleitung/);
    app('answerChoice(null)');
    await flush();
    expect(app('personalOf(db.groups[1]).on')).toBe(false);
    expect(card('g2').querySelector('[data-hub-switch="personal"]').checked).toBe(false);
  });
});

describe('BE1: Vorschau', () => {
  it('breit: Vorschau rechts, Klassenseite ohne „Anzeigen“', () => {
    app('openStudentAppHub()');
    expect(hub().querySelector('.hub-aside #hub-frame')).not.toBeNull();
    expect(app('hubPreviewData().cls')).toBe('7a');
    app('hubPick("g2")');
    expect(app('hubPreviewData().cls')).toBe('8b');
    expect(card('g2').classList.contains('is-selected')).toBe(true);
  });
  it('schmal: Vorschau erst nach Antippen, direkt unter der Karte', () => {
    window.innerWidth = 400;
    app('openStudentAppHub()');
    expect(hub().querySelector('#hub-preview')).toBeNull();
    app('hubPick("g2")');
    expect(card('g2').nextElementSibling.id).toBe('hub-preview');
    app('hubPick("g2")');   // zweites Antippen klappt zu
    expect(hub().querySelector('#hub-preview')).toBeNull();
  });
  it('persönliche Seite erst nach „Anzeigen“, weg beim Schülerwechsel, Verlassen der Seite und der App', () => {
    app('openStudentAppHub()');
    hub().querySelector('[data-hub-mode="me"]').click();
    expect(hub().querySelector('#hub-frame')).toBeNull();
    expect(app('hubPreviewData()')).toBeNull();
    expect(hub().querySelector('[data-hub-mode="me"]').classList.contains('active')).toBe(true);
    hub().querySelector('#hub-show').click();
    expect(hub().querySelector('#hub-frame')).not.toBeNull();
    const d = app('hubPreviewData()');
    expect(d.kind).toBe('me');
    expect(d.first).toBe('Anna');
    expect(d.klasse.cls).toBe('7a');
    expect(JSON.stringify(d)).not.toContain('Muster');   // nie der Nachname
    const sel = hub().querySelector('#hub-student');
    sel.value = 'b'; sel.dispatchEvent(new Event('change'));
    expect(hub().querySelector('#hub-frame')).toBeNull();
    hub().querySelector('#hub-show').click();
    app('onAppHidden()');
    expect(hub().querySelector('#hub-frame')).toBeNull();
    hub().querySelector('#hub-show').click();
    app('switchView("classes"); openStudentAppHub()');
    expect(app('hubShown')).toBe(false);
  });
  it('nicht freigegebene Klasse: kein Rahmen', () => {
    app('openStudentAppHub(); hubPick("g3")');
    expect(hub().querySelector('#hub-preview').textContent).toMatch(/Nicht freigegeben/);
    expect(hub().querySelector('#hub-frame')).toBeNull();
  });
});
