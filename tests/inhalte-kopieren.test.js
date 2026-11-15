// Unterrichtsinhalte aller Klassen mit einem Knopf kopieren (BUGS BE6): nach Klasse sortiert, je Stunde „Was wurde
// behandelt“ und das abgehakte Thema der Planung, nie Stundennotizen; Zeitraum im Fenster wählbar.
const { loadApp, app } = require('./helpers/load-app');

const slot = (id, gid, day, block) => ({ id, day, block, part: 'full', subject: 'X', color: '#3b82f6', groupId: gid, recurring: 'weekly' });
const G = (id, cls, subject, extra = {}) => ({ id, subject, className: cls, color: '#3b82f6', schularbeitWeight: 50, ...extra });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    // 5b Deutsch: Mo 1. Block; 5a Mathe: Di + Do 1. Block; 10c Physik: Mi 2. Block (ohne Einträge)
    lessonSlots: [slot('d', 'g5b', 0, 1), slot('m1', 'g5a', 1, 1), slot('m2', 'g5a', 3, 1), slot('p', 'g10c', 2, 2)],
    lessonData: {
      'd_2026-11-02': { done: 'Märchen lesen', notes: 'Max hat gestört' },
      'd_2026-11-09': { done: 'Märchen schreiben\nTafelbild abschreiben' },
      'm1_2026-11-03': { done: 'Bruchrechnung\nBrüche kürzen' },   // erste Zeile = Thema (BE7): nicht doppelt
      'm2_2026-11-05': { done: '' },                          // nur das abgehakte Thema
      'm1_2026-11-10': { done: 'Übung', ausfall: true },       // fiel aus: zählt nicht
      'm2_2026-11-12': { done: 'Brüche erweitern' },           // heute 07:45, schon begonnen
      'm1_2026-10-06': { done: 'Zahlenstrahl' },                // Oktober
    },
    supervisions: [],
    groups: [G('g5b', '5b', 'Deutsch'), G('g10c', '10c', 'Physik'),
      G('g5a', '5a', 'Mathe', { plan: [{ id: 't1', title: 'Bruchrechnung', lessons: 4, doneLessons: ['m1_2026-11-03', 'm2_2026-11-05'] }] })],
    students: { g5b: [], g5a: [], g10c: [] },
  };
}
const load = d => app('replaceDB(migrateDB(' + JSON.stringify(d) + '))');
const text = (mode, since) => app(`lessonContentText(${JSON.stringify(mode)}, ${JSON.stringify(since || null)})`);

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 12, 10, 0));   // Do 12.11.2026
  load(sampleDB());
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});
afterEach(() => vi.useRealTimers());

describe('BE6: Text', () => {
  it('diese Woche: Klassen sortiert (5a, 5b, 10c), Datum, Thema und Behandeltes, kein Ausfall, keine Notizen', () => {
    const t = text('week');
    expect(t).toBe([
      'Unterrichtsinhalte diese Woche (09.11.–12.11.2026)',
      '',
      '5a Mathe',
      '- Do., 12.11.: Brüche erweitern',
      '',
      '5b Deutsch',
      '- Mo., 09.11.: Märchen schreiben / Tafelbild abschreiben',
      '',
      '10c Physik',
      '- nichts eingetragen',
    ].join('\n'));
    expect(t).not.toMatch(/Max|Übung/);
  });
  it('seit Datum: abgehaktes Thema steht vor dem Behandelten, Stunde nur mit Thema zählt auch', () => {
    const t = text('since', '2026-11-01');
    expect(t).toMatch(/^Unterrichtsinhalte seit 01\.11\.2026\n/);
    expect(t).toMatch(/5a Mathe\n- Di\., 03\.11\.: Bruchrechnung: Brüche kürzen\n- Do\., 05\.11\.: Bruchrechnung\n- Do\., 12\.11\.: Brüche erweitern\n/);
    expect(t).not.toMatch(/Zahlenstrahl/);
  });
  it('Schuljahr: auch Oktober', () => {
    const t = text('year');
    expect(t).toMatch(/^Unterrichtsinhalte Schuljahr 2026\/27\n/);
    expect(t).toMatch(/Di\., 06\.10\.: Zahlenstrahl/);
  });
  it('letzte Stunde: eine Zeile je Klasse', () => {
    expect(text('last')).toBe([
      'Unterrichtsinhalte, letzte Stunde je Klasse (Stand 12.11.2026)',
      '',
      '5a Mathe (Do., 12.11.): Brüche erweitern',
      '5b Deutsch (Mo., 09.11.): Märchen schreiben / Tafelbild abschreiben',
      '10c Physik: nichts eingetragen',
    ].join('\n'));
  });
  it('heutige Stunde, die noch nicht begonnen hat, zählt nicht', () => {
    vi.setSystemTime(new Date(2026, 10, 12, 7, 0));
    expect(text('last')).toMatch(/5a Mathe \(Do\., 05\.11\.\): Bruchrechnung/);
  });
});

describe('BE6: Fenster', () => {
  it('Knopf in Einstellungen → Daten, Fenster mit Vorschau, Zeitraum wird auf dem Gerät gemerkt', () => {
    const btn = document.querySelector('[data-pane="data"] [onclick="openCopyLessonContent()"]');
    expect(btn).not.toBeNull();
    app('openCopyLessonContent()');
    expect(document.getElementById('modal-copy-content').classList.contains('hidden')).toBe(false);
    const sel = document.getElementById('copy-content-range');
    sel.value = 'last'; sel.dispatchEvent(new Event('change'));
    expect(document.getElementById('copy-content-text').value).toMatch(/letzte Stunde je Klasse/);
    expect(localStorage.getItem('copy_content_range')).toBe('last');
    expect(JSON.stringify(app('db'))).not.toMatch(/copy_content/);
    app('closeModal("modal-copy-content")');
    app('openCopyLessonContent()');
    expect(document.getElementById('copy-content-range').value).toBe('last');
    expect(document.getElementById('copy-content-since-row').classList.contains('hidden')).toBe(true);
    sel.value = 'since'; sel.dispatchEvent(new Event('change'));
    expect(document.getElementById('copy-content-since-row').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('copy-content-since').value).toBe('2026-11-01');   // Standard: Monatsanfang
    app('closeModal("modal-copy-content")');
  });
  it('Kopieren legt den Text in die Zwischenablage', async () => {
    let got = null;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async t => { got = t; } } });
    app('openCopyLessonContent()');
    await app('copyLessonContent()');
    expect(got).toBe(document.getElementById('copy-content-text').value);
    expect(got).toMatch(/^Unterrichtsinhalte/);
    app('closeModal("modal-copy-content")');
  });
  it('Namen und Texte landen nur als Text, nie als Markup (Regel 3)', () => {
    const d = sampleDB(); d.groups[0].className = '<img data-xss src=x>'; d.lessonData['d_2026-11-09'].done = '<b data-xss>x</b>';
    load(d);
    app('openCopyLessonContent()');
    expect(document.querySelector('#modal-copy-content [data-xss]')).toBeNull();
    expect(document.getElementById('copy-content-text').value).toContain('<b data-xss>x</b>');
    app('closeModal("modal-copy-content")');
  });
});
