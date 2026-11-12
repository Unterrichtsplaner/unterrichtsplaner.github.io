// Gesamtprüfung 11.11.2026, Paket 14 (grün): AR14–AR21.
const { loadApp, app } = require('./helpers/load-app');

const st = (id, f, l, extra = {}) => ({ id, firstName: f, lastName: l, grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
function sampleDB(extra = {}) {
  return {
    settings: { teacherName: 'T', blocks: null, warnAbsences: 3, ...(extra.settings || {}) },
    lessonSlots: [{ id: 'mo', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#3b82f6', groupId: 'g1', recurring: 'weekly' }],
    lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50, ...(extra.g1 || {}) },
             { id: 'g2', subject: 'Bio', className: '8a', color: '#22c55e', schularbeitWeight: 50 }],
    students: { g1: extra.students || [st('z', 'Anna', 'Zeller'), st('a', 'Ben', 'Albers'), st('m', 'Clara', 'Maier')], g2: [] },
  };
}
const load = x => app('replaceDB(' + JSON.stringify(sampleDB(x)) + '); periodChoice = null');
beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 25, 10, 0));
  load();
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  window.confirm = () => true;
});
afterEach(() => { app('switchView("dashboard")'); vi.useRealTimers(); });

describe('AR14: doppelte Tageseinträge in der Fehlzeiten-Tabelle', () => {
  it('Antippen fasst sie zu einem zusammen, der Grund bleibt', () => {
    load({ students: [st('z', 'Anna', 'Zeller', { attendance: [{ id: 'f', date: '2026-09-22', type: 'abwesend', note: '' }, { id: 'e', date: '2026-09-22', type: 'entschuldigt', note: 'Attest' }] })] });
    app('switchView("classes"); openGroupStudents("g1"); currentOverviewGroupId = "g1"');
    app('updateInlineAttendance("z", "2026-09-22", "E")');
    const att = app('db.students.g1[0].attendance');
    expect(att.length).toBe(1);
    expect(att[0]).toMatchObject({ type: 'entschuldigt', note: 'Attest' });
  });
  it('Leeren entfernt alle Einträge des Tages', () => {
    load({ students: [st('z', 'Anna', 'Zeller', { attendance: [{ id: 'f', date: '2026-09-22', type: 'abwesend' }, { id: 'e', date: '2026-09-22', type: 'entschuldigt' }] })] });
    app('switchView("classes"); openGroupStudents("g1"); currentOverviewGroupId = "g1"');
    app('updateInlineAttendance("z", "2026-09-22", "")');
    expect(app('db.students.g1[0].attendance')).toEqual([]);
  });
});

describe('AR15: „auffällig“ direkt bei der nächsten Klasse', () => {
  it('neue Liste gehört zur neu angetippten Plakette', () => {
    const btnA = document.createElement('button'), btnB = document.createElement('button');
    document.body.append(btnA, btnB);
    const spy = vi.fn(); globalThis.__rsg = spy;
    app('globalThis.__orig = renderSubjectGroups; renderSubjectGroups = () => globalThis.__rsg()');
    try {
      app('watchPop = { btn: null, groupId: "g1" }');
      const pop = document.createElement('div'); pop.id = 'watch-pop'; document.body.appendChild(pop);
      app('switchView("classes")');
      spy.mockClear();
      globalThis.__btnB = btnB;
      app('openWatchPop(globalThis.__btnB, "g2")');
      expect(spy).not.toHaveBeenCalled();   // kein Neuzeichnen beim Wechsel, sonst misst die Liste eine verschwundene Plakette
    } finally { app('renderSubjectGroups = globalThis.__orig'); document.getElementById('watch-pop')?.remove(); app('watchPop = null'); }
  });
});

describe('AR16: Klassen-Bericht in den Sommerferien', () => {
  it('nennt das Schuljahr der Einträge, nicht das neue', () => {
    vi.setSystemTime(new Date(2026, 7, 20, 10, 0));   // 20.08.2026
    load({ students: [st('z', 'Anna', 'Zeller', { grades: [{ type: 'mitarbeit', value: '2', date: '2026-07-10' }] })] });
    expect(app('reportSchoolYear(db.groups[0])')).toBe('2025/26');
    vi.setSystemTime(new Date(2026, 9, 1, 10, 0));
    load({ students: [st('z', 'Anna', 'Zeller', { grades: [{ type: 'mitarbeit', value: '2', date: '2026-09-20' }] })] });
    expect(app('reportSchoolYear(db.groups[0])')).toBe('2026/27');
  });
});

describe('AR17: Hinweis „Neues Schuljahr?“', () => {
  const summer = { holidays: [{ id: 's', label: 'Sommerferien', from: '2026-08-03', until: '2026-09-14' }] };
  it('nach dem Wechsel: nur neue Einträge → kein Hinweis', () => {
    vi.setSystemTime(new Date(2026, 8, 10, 10, 0));   // 10.09., noch Ferien
    load({ settings: summer, students: [st('z', 'Anna', 'Zeller', { participation: [{ id: 'p', date: '2026-09-10', value: 'positive' }] })] });
    expect(app('newYearNoteDue()')).toBe(false);
  });
  it('Einträge von vor den Sommerferien → Hinweis', () => {
    vi.setSystemTime(new Date(2026, 7, 20, 10, 0));
    load({ settings: summer, students: [st('z', 'Anna', 'Zeller', { participation: [{ id: 'p', date: '2026-07-20', value: 'positive' }] })] });
    expect(app('newYearNoteDue()')).toBe(true);
  });
  it('Schuljahresende liegt Monate zurück: kein Hinweis mitten im Schuljahr', () => {
    vi.setSystemTime(new Date(2027, 0, 5, 10, 0));
    load({ settings: { schoolYearEnd: '2026-07-31' }, students: [st('z', 'Anna', 'Zeller', { participation: [{ id: 'p', date: '2026-07-20', value: 'positive' }] })] });
    expect(app('newYearNoteDue()')).toBe(false);
  });
});

describe('AR18: Sticker „im Halbjahr“', () => {
  it('bleibt nach dem Stichtag verdient', () => {
    vi.setSystemTime(new Date(2027, 1, 20, 10, 0));
    load({ settings: { halfYearEnd: '2027-02-12' } });
    const parts = ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'].map((d, i) => ({ id: 'p' + i, date: d, value: 'positive' }));
    app(`db.students.g1[0].participation = ${JSON.stringify(parts)}`);
    expect(app('autoStickerEarned({ kind: "any", n: 5, mode: "half" }, db.students.g1[0], [], "2027-02-20")')).toBe(true);
  });
});

describe('AR19: Schuljahreswechsel und Level-Tempo', () => {
  it('Tempo wird beim Wechsel neu festgelegt', () => {
    load({ g1: { studentApp: { on: true, personal: { on: true, level: 'normal', step: 99 } } } });
    app('applyNewSchoolYear([{ id: "g1", action: "keep", name: "8b" }, { id: "g2", action: "keep", name: "9a" }])');
    expect(app('db.groups.find(g => g.id === "g1").studentApp.personal.step')).toBeUndefined();
  });
});

describe('AR20: Namen einfügen, Doppelte überspringen', () => {
  it('erkennt Altdaten mit dem Namen im Nachnamen', () => {
    load({ students: [st('l', '', 'Lena'), st('t', '', 'Tom')] });
    app('switchView("classes"); openGroupStudents("g1")');
    document.getElementById('import-text').value = 'Lena\nTom\nJonas';
    const cb = document.getElementById('import-skip-duplicates'); if (cb) cb.checked = true;
    app('importStudentsFromText()');
    expect(app('db.students.g1.length')).toBe(3);
  });
});

describe('AR21: Klassen-Bericht nach Nachname sortiert', () => {
  it('„Nachname, Vorname“ in alphabetischer Reihenfolge', () => {
    expect(app('classReportData(db.groups[0]).rows.map(r => r.name)')).toEqual(['Albers, Ben', 'Maier, Clara', 'Zeller, Anna']);
  });
});
