// AH24 Paket f: „auffällig“ ruhiger. Plakette neutral, rot nur der Zusatz „N neu“ (seit dem letzten Hinschauen
// nicht gesehen, nur auf diesem Gerät gemerkt). Antippen zeigt Namen, Grund und „Erledigt“ – in Liste, Kacheln und Groß.
const { loadApp, app } = require('./helpers/load-app');

const st = (id, f, extra = {}) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
const abs = (n, from = 1) => Array.from({ length: n }, (_, i) => ({ id: 'a' + (from + i), date: `2026-10-${String(10 + from + i).padStart(2, '0')}`, type: 'abwesend', note: '' }));
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null, warnAbsences: 3, warnHomework: 3, warnGrade: 4.5 },
    lessonSlots: [], lessonData: {}, supervisions: [], acknowledgedWarnings: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50 },
      { id: 'g2', subject: 'Mathe', className: '5a', color: '#22c55e', schularbeitWeight: 50 }],
    students: {
      g1: [st('a', 'Anna', { attendance: abs(3) }),
        st('b', 'Ben', { grades: [{ type: 'schularbeit', value: '5.0', date: '2026-10-15', note: 'KA 1' }] }),
        st('c', 'Cem')],
      g2: [st('d', 'Dora')],
    },
  };
}
const tile = name => [...document.querySelectorAll('#subject-groups-container .class-row')].find(t => t.querySelector('.cr-name').textContent === name);
const chip = name => tile(name) && tile(name).querySelector('.ct-chip.is-watch');
const pop = () => document.getElementById('watch-pop');
const seenStore = () => JSON.parse(localStorage.getItem('warnings_seen') || 'null');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 4, 10, 0));
  localStorage.removeItem('warnings_seen');
  app('closeWatchPop(); db = ' + JSON.stringify(sampleDB()));
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  app('setClassesSort("subject"); setClassesView("tiles"); switchView("classes")');
});
afterEach(() => { app('closeWatchPop()'); vi.useRealTimers(); });

describe('Plakette neutral, gleich in allen drei Ansichten', () => {
  it('Kacheln, Liste, Groß: „2 auffällig“ als Knopf, nicht rot; Klasse ohne Auffällige ohne Plakette', () => {
    for (const view of ['tiles', 'list', 'large']) {
      app(`setClassesView("${view}")`);
      const c = chip('7b');
      expect(c, view).not.toBeNull();
      expect(c.tagName, view).toBe('BUTTON');
      expect(c.textContent, view).toBe('2 auffällig');
      expect(c.classList.contains('is-warn'), view).toBe(false);
      expect(c.querySelector('.neu'), view).toBeNull();
      expect(c.getAttribute('aria-label'), view).toMatch(/2 auffällig/);
      expect(chip('5a'), view).toBeNull();
    }
  });
  it('beim ersten Mal gilt alles Vorhandene als gesehen (kein Rot nach dem Update), gemerkt nur auf dem Gerät', () => {
    expect(seenStore().length).toBe(2);
    expect(JSON.stringify(app('db'))).not.toMatch(/warnings_seen/);
  });
});

describe('„neu“', () => {
  it('neue Warnung (oder schlimmer geworden) → rot „1 neu“, Rest bleibt grau', () => {
    app('db.students.g2[0].homework = [1,2,3].map(i => ({ id: "h" + i, date: "2026-10-2" + i, note: "" })); renderSubjectGroups()');
    expect(chip('5a').textContent).toBe('1 auffällig1 neu');
    expect(chip('5a').querySelector('.neu').textContent).toBe('1 neu');
    expect(chip('7b').querySelector('.neu')).toBeNull();
    app('db.students.g1[0].attendance.push({ id: "a9", date: "2026-10-30", type: "abwesend", note: "" }); renderSubjectGroups()');
    expect(chip('7b').querySelector('.neu').textContent).toBe('1 neu');   // Anna: 4 statt 3
  });
  it('Antippen zeigt Namen + Grund (bei Noten ohne Zahl), markiert „neu“; Zumachen nimmt das Rot weg', () => {
    app('db.students.g1[0].attendance.push({ id: "a9", date: "2026-10-30", type: "abwesend", note: "" }); renderSubjectGroups()');
    chip('7b').click();
    expect(pop()).not.toBeNull();
    expect(app('currentGroupId')).not.toBe('g1');                     // öffnet nicht die Klasse
    const rows = [...pop().querySelectorAll('.watch-row')];
    expect(rows.map(r => r.querySelector('.watch-who b').firstChild.textContent)).toEqual(['Anna X', 'Ben X']);
    expect(rows[0].textContent).toMatch(/4× unentschuldigt gefehlt/);
    expect(rows[0].querySelector('.tag-neu')).not.toBeNull();
    expect(rows[1].textContent).toMatch(/Notenstand kritisch/);
    expect(rows[1].textContent).not.toMatch(/5,0|5\.0/);
    expect(rows[1].querySelector('.tag-neu')).toBeNull();
    app('closeWatchPop()');
    expect(pop()).toBeNull();
    expect(chip('7b').querySelector('.neu')).toBeNull();
  });
  it('„Erledigt“ quittiert wie im Dashboard, Zeile weg; letzte weg → Liste zu, Plakette weg', () => {
    app('db.students.g1.splice(1, 1); renderSubjectGroups()');
    chip('7b').click();
    pop().querySelector('.watch-ack').click();
    expect(app('db.acknowledgedWarnings.a_absences')).toBe(3);
    expect(pop()).toBeNull();
    expect(chip('7b')).toBeNull();
  });
  it('Name antippen öffnet das Schülerprofil', () => {
    chip('7b').click();
    pop().querySelector('.watch-who').click();
    expect(pop()).toBeNull();
    expect(document.getElementById('modal-seating-student').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('seating-student-title').textContent).toBe('Anna X');
    app('closeModal("modal-seating-student")');
  });
  it('Escape und Tippen daneben schließen; Uhr-Takt zeichnet die Übersicht nicht unter der offenen Liste neu', () => {
    chip('7b').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(pop()).toBeNull();
    chip('7b').click();
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(pop()).toBeNull();
    app('setClassesView("large"); setClassesSort("next")');
    chip('7b').click();
    app('classesClockSig = "anders"; timetableClockMinute = ""; refreshTimetableClock()');
    expect(pop()).not.toBeNull();
  });
});

describe('Dashboard', () => {
  it('neue Warnung trägt „neu“; Aufklappen der Klasse merkt sie als gesehen', () => {
    app('db.students.g2[0].homework = [1,2,3].map(i => ({ id: "h" + i, date: "2026-10-2" + i, note: "" })); switchView("dashboard")');
    const group = () => [...document.querySelectorAll('details.dash-warn-group')].find(d => d.dataset.group === 'g2');
    expect(group().querySelector('.tag-neu')).not.toBeNull();
    group().open = true;
    group().dispatchEvent(new Event('toggle'));
    app('switchView("classes")');
    expect(chip('5a').querySelector('.neu')).toBeNull();
  });
});

describe('Sicherheit (Regel 3)', () => {
  it('Namen und Klassen mit HTML landen als Text in der Liste', () => {
    app(`db.students.g1[0].firstName = '<img src=x onerror=window.__xss=1>'; db.groups[0].className = '7b<b>x</b>'; renderSubjectGroups()`);
    const c = [...document.querySelectorAll('.ct-chip.is-watch')][0];
    c.click();
    expect(pop().querySelector('img, h3 b')).toBeNull();
    expect(pop().textContent).toContain('<img src=x onerror=window.__xss=1>');
    expect(app('window.__xss')).toBeUndefined();
  });
});
