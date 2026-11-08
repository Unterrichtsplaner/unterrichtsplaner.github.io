// Leiste selbst anordnen und Schnellzugriff auf Klassen (BUGS AH48)
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

const st = (id, n) => ({ id, firstName: n, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] });
function sampleDB(extra = {}) {
  return {
    settings: { teacherName: 'T', blocks: null, ...extra },
    lessonSlots: [], lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#6366f1', schularbeitWeight: 50 },
             { id: 'g2', subject: 'Physik', className: '7b', color: '#22c55e', schularbeitWeight: 50 },
             { id: 'g3', subject: 'Kunst', className: '9c', color: '#e11d48', schularbeitWeight: 50 }],
    students: { g1: [st('a', 'Anna')], g2: [st('b', 'Ben')], g3: [st('c', 'Clara')] },
    supervisions: [],
  };
}
const $ = id => document.getElementById(id);
const navOrderShown = () => [...document.querySelectorAll('#sidebar .nav-items > .nav-item[data-view]')].map(b => b.dataset.view);
const quick = () => [...document.querySelectorAll('#nav-quick .nav-quick-item')];
const setDB = d => app(`replaceDB(${JSON.stringify(d)})`);

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  setDB(sampleDB());
  app('switchView("dashboard")');
});

describe('Reihenfolge der Menüpunkte', () => {
  it('ohne Einstellung: wie bisher, „Einklappen“ bleibt unten', () => {
    expect(navOrderShown()).toEqual(['dashboard', 'timetable', 'classes', 'seating', 'todos']);
    const items = [...document.querySelector('#sidebar .nav-items').children];
    expect(items[items.length - 1].id).toBe('btn-sidebar-toggle');
  });
  it('gespeicherte Reihenfolge gilt (auch für die Leiste unten auf dem Handy); Unbekanntes fällt weg, Fehlendes kommt hinten dran', () => {
    setDB(sampleDB({ navOrder: ['seating', 'classes', 'quatsch', 'seating'] }));
    expect(navOrderShown()).toEqual(['seating', 'classes', 'dashboard', 'timetable', 'todos']);
    expect(app('navOrder()')).toEqual(['seating', 'classes', 'dashboard', 'timetable', 'todos']);
  });
  it('Klicks funktionieren nach dem Umsortieren weiter', () => {
    setDB(sampleDB({ navOrder: ['todos', 'seating'] }));
    $('nav-classes').click();
    expect($('view-classes').classList.contains('active')).toBe(true);
  });
});

describe('Schnellzugriff in der Leiste', () => {
  const links = [{ id: 'q1', groupId: 'g1', target: 'seating' }, { id: 'q2', groupId: 'g3', target: 'students' }];
  it('Klasse als Kästchen, dazu wohin der Knopf führt; Fach nur bei gleichnamigen Klassen', () => {
    setDB(sampleDB({ quickLinks: links }));
    const q = quick();
    expect(q.length).toBe(2);
    expect(q[0].querySelector('.nq-chip').textContent).toBe('7b');
    expect(q[0].querySelector('.nq-label').textContent.replace(/\s+/g, ' ').trim()).toBe('Sitzplan Mathe');
    expect(q[0].getAttribute('aria-label')).toBe('7b Mathe: Sitzplan');
    expect(q[1].querySelector('.nq-label').textContent.replace(/\s+/g, ' ').trim()).toBe('Klasse');   // kurz, „Klassenansicht“ passt nicht
    expect(q[1].getAttribute('aria-label')).toBe('9c Kunst: Klassenansicht');
    expect(q[0].querySelector('.nq-chip').getAttribute('style')).toBe('--card-color:#6366f1');
  });
  it('steht zwischen den Menüpunkten und „Einklappen“', () => {
    setDB(sampleDB({ quickLinks: links }));
    const kids = [...document.querySelector('#sidebar .nav-items').children].map(e => e.id);
    expect(kids.indexOf('nav-quick')).toBe(kids.length - 2);
  });
  it('öffnet den Sitzplan bzw. die Klassenansicht der Klasse und ist dann markiert', () => {
    setDB(sampleDB({ quickLinks: links }));
    quick()[0].click();
    expect($('view-seating').classList.contains('active')).toBe(true);
    expect(app('currentSeatingGroupId')).toBe('g1');
    expect(quick()[0].classList.contains('active')).toBe(true);
    expect(quick()[0].getAttribute('aria-current')).toBe('page');
    expect($('nav-seating').classList.contains('active')).toBe(false);   // nur eins markiert
    quick()[1].click();
    expect($('view-students').classList.contains('active')).toBe(true);
    expect(app('currentGroupId')).toBe('g3');
    expect(quick()[1].classList.contains('active')).toBe(true);
    expect(quick()[0].classList.contains('active')).toBe(false);
    app('openGroupStudents("g1")');                                      // andere Klasse: wieder „Klassen“
    expect(quick()[1].classList.contains('active')).toBe(false);
    expect($('nav-classes').classList.contains('active')).toBe(true);
  });
  it('gelöschte Klasse: Knopf verschwindet, Eintrag wird mit aufgeräumt', () => {
    setDB(sampleDB({ quickLinks: links }));
    const conf = window.confirm; window.confirm = () => true;
    try { app('deleteGroup("g1")'); } finally { window.confirm = conf; }
    expect(quick().length).toBe(1);
    expect(app('db.settings.quickLinks').map(l => l.groupId)).toEqual(['g3']);
  });
  it('kaputte Einträge (Sync, alte Daten) werden übersprungen, nichts stürzt ab', () => {
    setDB(sampleDB({ quickLinks: [null, 'x', { groupId: 'weg' }, { id: 'q', groupId: 'g2', target: 'komisch' }] }));
    expect(quick().length).toBe(1);
    expect(quick()[0].getAttribute('aria-label')).toBe('7b Physik: Klassenansicht');
  });
  it('ohne Schnellzugriff: leiser Hinweis „Klasse anheften“, öffnet die Einstellungen beim Bereich „Leiste“', () => {
    expect(quick().length).toBe(0);
    const add = document.querySelector('#nav-quick .nav-quick-add');
    expect(add).toBeTruthy();
    add.click();
    expect($('modal-settings').classList.contains('hidden')).toBe(false);
    expect(document.querySelector('#modal-settings .set-pane.on').dataset.pane).toBe('nav');
    app('closeModal("modal-settings")');
  });
  it('ohne Klassen: kein Hinweis', () => {
    setDB({ ...sampleDB(), groups: [], students: {} });
    expect(document.querySelector('#nav-quick .nav-quick-add')).toBeNull();
  });
  it('Klassenname wird escaped (Regel 3)', () => {
    const d = sampleDB({ quickLinks: [{ id: 'q', groupId: 'g3', target: 'seating' }] });
    d.groups[2].className = '<img src=x onerror=alert(1)>';
    setDB(d);
    expect(document.querySelector('#nav-quick img')).toBeNull();
  });
  it('auf dem Handy ausgeblendet (unten ist nur Platz für fünf)', () => {
    expect(CSS).toMatch(/@media \(max-width: 600px\)\{[^@]*#nav-quick\{display:none;\}/);
  });
});

describe('Einstellungen: Bereich „Leiste“', () => {
  const open = () => { app('openSettings(); showSettingsPane("nav")'); };
  const orderRows = () => [...document.querySelectorAll('#settings-nav-order .nav-order-row')];
  const linkRows = () => [...document.querySelectorAll('#settings-quick-list .quick-row')];
  it('Reihenfolge mit ↑/↓ ändern, erst „Speichern“ übernimmt sie', () => {
    open();
    expect(orderRows().map(r => r.dataset.view)).toEqual(['dashboard', 'timetable', 'classes', 'seating', 'todos']);
    const up = orderRows()[3].querySelector('[data-move="-1"]');
    expect(up.getAttribute('aria-label')).toBe('Sitzplan nach oben');
    up.click();
    expect(orderRows().map(r => r.dataset.view)).toEqual(['dashboard', 'timetable', 'seating', 'classes', 'todos']);
    expect(orderRows()[0].querySelector('[data-move="-1"]').disabled).toBe(true);
    expect(orderRows()[4].querySelector('[data-move="1"]').disabled).toBe(true);
    expect(navOrderShown()).toEqual(['dashboard', 'timetable', 'classes', 'seating', 'todos']);   // noch nicht gespeichert
    expect(app('settingsDirty()')).toBe(true);
    app('saveSettings()');
    expect(app('db.settings.navOrder')).toEqual(['dashboard', 'timetable', 'seating', 'classes', 'todos']);
    expect(navOrderShown()).toEqual(['dashboard', 'timetable', 'seating', 'classes', 'todos']);
  });
  it('Standard-Reihenfolge wird nicht gespeichert', () => {
    setDB(sampleDB({ navOrder: ['timetable', 'dashboard'] }));
    open();
    orderRows()[1].querySelector('[data-move="-1"]').click();   // Dashboard wieder nach oben
    app('saveSettings()');
    expect(app('"navOrder" in db.settings')).toBe(false);
  });
  it('Klasse hinzufügen (Standard: Sitzplan), Ziel umstellen, sortieren, entfernen', () => {
    open();
    const add = $('settings-quick-add');
    expect([...add.options].map(o => o.textContent)).toEqual(['Klasse hinzufügen …', '7b Mathe', '7b Physik', '9c Kunst']);
    add.value = 'g3'; add.dispatchEvent(new Event('change'));
    add.value = 'g1'; add.dispatchEvent(new Event('change'));
    expect(add.value).toBe('');
    expect(linkRows().map(r => r.querySelector('.quick-name').textContent)).toEqual(['9c Kunst', '7b Mathe']);
    const sel = linkRows()[1].querySelector('select');
    expect(sel.value).toBe('seating');
    sel.value = 'students'; sel.dispatchEvent(new Event('change'));
    linkRows()[1].querySelector('[data-move="-1"]').click();
    expect(linkRows().map(r => r.querySelector('.quick-name').textContent)).toEqual(['7b Mathe', '9c Kunst']);
    app('saveSettings()');
    expect(app('db.settings.quickLinks').map(l => [l.groupId, l.target])).toEqual([['g1', 'students'], ['g3', 'seating']]);
    expect(quick().map(b => b.getAttribute('aria-label'))).toEqual(['7b Mathe: Klassenansicht', '9c Kunst: Sitzplan']);
    open();
    linkRows()[0].querySelector('.quick-remove').click();
    app('saveSettings()');
    expect(app('db.settings.quickLinks').map(l => l.groupId)).toEqual(['g3']);
    open();
    linkRows()[0].querySelector('.quick-remove').click();
    app('saveSettings()');
    expect(app('"quickLinks" in db.settings')).toBe(false);
  });
  it('höchstens 8 Schnellzugriffe', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ id: 'q' + i, groupId: 'g' + (1 + i % 3), target: i % 2 ? 'seating' : 'students' }));
    setDB(sampleDB({ quickLinks: many }));
    open();
    expect($('settings-quick-add').disabled).toBe(true);
    expect(document.querySelector('#settings-quick-hint').textContent).toMatch(/8/);
  });
  it('Schließen ohne Speichern verwirft die Änderung', () => {
    open();
    orderRows()[4].querySelector('[data-move="-1"]').click();
    const conf = window.confirm; window.confirm = () => true;
    try { app('closeModalLikeButton("modal-settings")'); } finally { window.confirm = conf; }
    expect(app('"navOrder" in db.settings')).toBe(false);
    expect(navOrderShown()).toEqual(['dashboard', 'timetable', 'classes', 'seating', 'todos']);
  });
});
