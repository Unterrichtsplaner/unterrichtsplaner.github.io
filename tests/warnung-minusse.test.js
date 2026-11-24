// BE15: Warnung bei vielen Minussen in der Mitarbeit. „−“ zählt 1, „−−“ zählt 2 (wie „++“ beim Plus-Konto 2 Plusse);
// Standard 6, einstellbar, 0 = aus. Wahlweise Plusse gegenrechnen (+ 1, ++ 2). Laufendes Halbjahr wie die anderen
// Warnungen. Mitarbeit ist eine Leistungsangabe: Titel, Text und Grund nennen nie die Zahl (Beamer, Regel 67/78).
const { loadApp, app } = require('./helpers/load-app');

const st = (id, f, extra = {}) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
let n = 0;
const part = (value, date = '2026-11-02', label) => ({ id: 'p' + (++n), date, value, ...(label ? { label } : {}) });
const many = (value, count) => Array.from({ length: count }, (_, i) => part(value, `2026-10-${String(10 + i).padStart(2, '0')}`));
function sampleDB(settings = {}) {
  return {
    settings: { teacherName: 'T', blocks: null, warnAbsences: 3, warnHomework: 3, warnGrade: 4.5, ...settings },
    lessonSlots: [], lessonData: {}, supervisions: [], acknowledgedWarnings: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50 }],
    students: { g1: [st('a', 'Anna'), st('b', 'Ben')] },
  };
}
const setPart = (id, list) => app(`db.students.g1.find(s => s.id === ${JSON.stringify(id)}).participation = ${JSON.stringify(list)}`);
const partWarnings = () => app('collectWarnings()').filter(w => w.type === 'participation');
const warned = id => partWarnings().some(w => w.student.id === id);

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 4, 10, 0));
  localStorage.removeItem('warnings_seen');
  app('db = ' + JSON.stringify(sampleDB()));
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});
afterEach(() => vi.useRealTimers());

describe('BE15: Minusse zählen', () => {
  it('Standard 6: fünf „−“ noch nicht, sechs schon', () => {
    setPart('a', many('neutral', 5));
    expect(warned('a')).toBe(false);
    setPart('a', many('neutral', 6));
    expect(warned('a')).toBe(true);
  });

  it('„−−“ zählt doppelt: drei „−−“ = 6 Minusse', () => {
    setPart('a', many('negative', 3));
    expect(warned('a')).toBe(true);
    setPart('a', [...many('negative', 2), part('neutral')]);
    expect(warned('a')).toBe(false);
  });

  it('Plusse zählen ohne Gegenrechnen nicht', () => {
    setPart('a', [...many('neutral', 6), ...many('excellent', 5)]);
    expect(warned('a')).toBe(true);
  });

  it('auch Mitarbeit mit Titel (Spalte der Tabelle) zählt', () => {
    setPart('a', [...many('neutral', 5), part('neutral', '2026-11-03', 'Referat')]);
    expect(warned('a')).toBe(true);
  });

  it('mit Halbjahresende: nur das laufende Halbjahr (Vorjahr zählt nicht)', () => {
    app('db.settings.halfYearEnd = "2027-02-12"');
    setPart('a', many('negative', 3).map(p => ({ ...p, date: p.date.replace('2026', '2025') })));
    expect(warned('a')).toBe(false);
  });

  it('Schwelle einstellbar, 0 = aus', () => {
    setPart('a', many('neutral', 3));
    app('db.settings.warnParticipation = 3');
    expect(warned('a')).toBe(true);
    app('db.settings.warnParticipation = 0');
    setPart('a', many('negative', 10));
    expect(warned('a')).toBe(false);
  });
});

describe('BE15: Plusse gegenrechnen (Option)', () => {
  it('mit Haken: Plusse ziehen ab (+ 1, ++ 2)', () => {
    app('db.settings.warnParticipationNet = true');
    setPart('a', [...many('neutral', 7), part('positive')]);
    expect(warned('a')).toBe(true);    // 7 − 1 = 6
    setPart('a', [...many('neutral', 7), part('excellent')]);
    expect(warned('a')).toBe(false);   // 7 − 2 = 5
  });

  it('mehr Plusse als Minusse: nie auffällig', () => {
    app('db.settings.warnParticipationNet = true; db.settings.warnParticipation = 1');
    setPart('a', [...many('negative', 3), ...many('excellent', 4)]);
    expect(warned('a')).toBe(false);
  });
});

describe('BE15: Anzeige ohne Zahl (Beamer)', () => {
  it('Titel, Text und Grund nennen nie die Anzahl', () => {
    setPart('a', many('negative', 4));
    const [w] = partWarnings();
    expect(w.title).toBe('Mitarbeit oft schwach');
    expect(w.desc).not.toMatch(/\d/);
    expect(app('warningReason')(w)).toBe('Mitarbeit oft schwach');
  });

  it('Dashboard zeigt die Warnung mit Symbol, ohne Zahl', () => {
    setPart('a', many('negative', 4));
    app('renderDashboard()');
    const el = [...document.querySelectorAll('#dashboard-content .dash-warn')].find(x => x.textContent.includes('Mitarbeit oft schwach'));
    expect(el).toBeTruthy();
    expect(el.querySelector('.dash-warn-title svg.ico')).not.toBeNull();
    expect(el.querySelector('.dash-warn-text').textContent).not.toMatch(/\d/);
  });

  it('Antippen öffnet das Profil bei der Mitarbeit', () => {
    setPart('a', many('negative', 4));
    app('openStudentDetailFromDashboard("a", "g1", "participation")');
    expect(document.getElementById('sw-more').dataset.focus).toBe('participation');
    app('closeModal("modal-seating-student")');
  });
});

describe('BE15: Erledigt', () => {
  it('quittiert bleibt weg, ein neues Minus bringt sie zurück', () => {
    setPart('a', many('negative', 3));
    const [w] = partWarnings();
    app(`acknowledgeWarning("a", "participation", ${w.count})`);
    expect(warned('a')).toBe(false);
    setPart('a', [...many('negative', 3), part('neutral', '2026-11-03')]);
    expect(warned('a')).toBe(true);
  });

  it('ein Minus gelöscht, ein anderes eingetragen (gleiche Zahl): wieder auffällig', () => {
    const list = many('negative', 3);
    setPart('a', list);
    app(`acknowledgeWarning("a", "participation", ${partWarnings()[0].count})`);
    setPart('a', [...list.slice(1), part('negative', '2026-11-03')]);
    expect(warned('a')).toBe(true);
  });
});

describe('BE15: Einstellungen', () => {
  const $ = id => document.getElementById(id);
  it('Feld zeigt den Standard 6, Haken aus; Speichern übernimmt beides', () => {
    app('openSettings()');
    expect($('settings-warn-participation').value).toBe('6');
    expect($('settings-warn-participation-net').checked).toBe(false);
    $('settings-warn-participation').value = '4';
    $('settings-warn-participation-net').checked = true;
    app('saveSettings()');
    expect(app('db.settings.warnParticipation')).toBe(4);
    expect(app('db.settings.warnParticipationNet')).toBe(true);
  });

  it('Haken wieder aus: Feld verschwindet aus den Daten (Standard nie speichern)', () => {
    app('db.settings.warnParticipationNet = true');
    app('openSettings()');
    $('settings-warn-participation-net').checked = false;
    app('saveSettings()');
    expect(app('db.settings.warnParticipationNet')).toBeUndefined();
  });

  it('leer = Standard 6, 0 = aus', () => {
    app('openSettings()');
    $('settings-warn-participation').value = '';
    app('saveSettings()');
    expect(app('db.settings.warnParticipation')).toBe(6);
    app('openSettings()');
    $('settings-warn-participation').value = '0';
    app('saveSettings()');
    expect(app('db.settings.warnParticipation')).toBe(0);
  });

  it('Überschrift nicht mehr „(Dashboard)“', () => {
    const card = $('settings-warn-participation').closest('.settings-section');
    expect(card.querySelector('h3').textContent).not.toMatch(/Dashboard/);
  });
});

describe('BE15: Abgleich zwischen Geräten', () => {
  it('wie alle Einstellungen ohne Frage: nur eine Seite geändert → übernommen, beide → dieses Gerät', () => {
    const base = sampleDB();
    let r = app('mergeDB')(base, sampleDB(), sampleDB({ warnParticipation: 8, warnParticipationNet: true }));
    expect(r.conflicts).toEqual([]);
    expect(r.merged.settings).toMatchObject({ warnParticipation: 8, warnParticipationNet: true });
    r = app('mergeDB')(base, sampleDB({ warnParticipation: 4 }), sampleDB({ warnParticipation: 8 }));
    expect(r.conflicts).toEqual([]);
    expect(r.merged.settings.warnParticipation).toBe(4);
  });
});
