// AM1: Schülerzentrale oben im Schüler-Fenster – Hinweise, Notizen aus den letzten 2 Stunden, Mitarbeit auf einen Blick.
// Inhalte wie der Beamer-Schutz (Regel 16, 67): mit Schutz verborgen bis „Anzeigen“, ohne sofort. Auf der Sitzplan-Karte
// ein Notizzettel-Symbol, nie der Text. AM2: Mitarbeit auf der Karte als letzte 3 Zeichen statt Balken.
const { loadApp, app } = require('./helpers/load-app');

const st = (id, f, extra = {}) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
const n = (date, text) => ({ text, date });
const p = (date, value, label = '') => ({ id: date + value + label, date, value, label });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null,
      holidays: [{ id: 'h', label: 'Herbstferien', from: '2026-10-26', until: '2026-10-30' }] },
    lessonSlots: [
      { id: 'mo', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#3b82f6', groupId: 'g1', recurring: 'weekly' },
      { id: 'di', day: 1, block: 2, part: 'full', subject: 'Mathe', color: '#3b82f6', groupId: 'g1', recurring: 'weekly' },
    ],
    lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50 }],
    students: { g1: [
      st('a', 'Anna', {
        studentNotes: [n('2026-11-10', 'War lange auf Toilette'), n('2026-11-09', 'Heft vergessen'), n('2026-11-03', 'Alt: Stifte verliehen')],
        participation: [p('2026-11-02', 'positive'), p('2026-11-03', 'excellent'), p('2026-11-09', 'neutral'), p('2026-11-10', 'negative'), p('2026-11-10', 'negative', 'Referat')],
      }),
      st('b', 'Ben', { studentNotes: [n('2026-11-03', 'Nur alt')] }),
      st('c', 'Cem'),
    ] },
  };
}
const hub = () => document.getElementById('sw-hub');
const card = name => [...document.querySelectorAll('.seating-card')].find(c => c.querySelector('.sc-name').textContent === name);
const open = (id, date = '2026-11-11') => app(`openSeatingStudentModal("${id}", "g1", "${date}")`);

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 11, 8, 0));   // Mi 11.11.2026
  app('replaceDB(' + JSON.stringify(sampleDB()) + ')');
  app('seatingShowGrades = false');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
});
afterEach(() => { app('closeModal("modal-seating-student")'); app('switchView("dashboard")'); vi.useRealTimers(); });

describe('Welche Notizen „aus den letzten Stunden“ sind', () => {
  it('Mittwoch: die letzten 2 Stunden der Klasse sind Di 10.11. und Mo 09.11.', () => {
    expect(app('recentNotesSince("g1", "2026-11-11")')).toBe('2026-11-09');
  });
  it('Ausfall zählt nicht: dann reicht es eine Stunde weiter zurück', () => {
    app('db.lessonData["di_2026-11-10"] = { ausfall: true }');
    expect(app('recentNotesSince("g1", "2026-11-11")')).toBe('2026-11-03');
  });
  it('über die Ferien hinweg (Regel 17)', () => {
    expect(app('recentNotesSince("g1", "2026-11-03")')).toBe('2026-10-20');   // Mo 02.11. und Di 20.10.
  });
  it('Klasse ohne Stunden: nur der Tag selbst', () => {
    app('db.lessonSlots = []');
    expect(app('recentNotesSince("g1", "2026-11-11")')).toBe('2026-11-11');
  });
});

describe('Schülerzentrale mit Beamer-Schutz', () => {
  it('verborgen: nur was es gibt (Anzahl Notizen, Mitarbeit), kein Text, keine Zahlen', () => {
    open('a');
    expect(hub().hidden).toBe(false);
    expect([...hub().querySelectorAll('.sw-hub-tag')].map(t => t.textContent)).toEqual(['2 Notizen', 'Mitarbeit']);
    expect(hub().textContent).not.toMatch(/Toilette|Heft|\d+ ?\/|\+\+/);
  });
  it('„Anzeigen“: Notizen der letzten 2 Stunden mit Datum, neueste zuerst; ältere nicht', () => {
    open('a');
    hub().querySelector('.sw-hub-show').click();
    const items = [...hub().querySelectorAll('.sw-hub-notes li')].map(li => `${li.querySelector('small').textContent} ${li.querySelector('span').textContent}`);
    expect(items).toEqual(['Di., 10.11. War lange auf Toilette', 'Mo., 09.11. Heft vergessen']);
    expect(hub().textContent).not.toMatch(/Stifte/);
  });
  it('Mitarbeit: Zählung je Stufe ohne Einträge mit Titel, „schwach“ rot; die letzten Einträge alt → neu', () => {
    open('a');
    hub().querySelector('.sw-hub-show').click();
    const counts = [...hub().querySelectorAll('.sw-hub-count')].map(c => c.textContent);
    expect(counts).toEqual(['++1', '+1', '−1', '−−1']);
    expect(hub().querySelector('.sw-hub-count.n-bad').textContent).toBe('−−1');
    expect([...hub().querySelectorAll('.sw-hub-last .part-sign')].map(s => s.textContent)).toEqual(['+', '++', '−', '−−']);
  });
  it('Schüler nur mit alter Notiz und ohne Mitarbeit: keine Zentrale', () => {
    open('b');
    expect(hub().hidden).toBe(true);
  });
  it('eben getippte Notiz: verborgen unter dem Feld, Zähler oben steigt; nach „Anzeigen“ oben statt unter dem Feld', () => {
    open('c');
    expect(hub().hidden).toBe(true);
    const input = document.getElementById('seating-student-note-input');
    input.value = 'Hat geholfen';
    app('addSeatingStudentNote()');
    expect(document.getElementById('seating-student-notes').textContent).toMatch(/Hat geholfen/);
    expect(hub().querySelector('.sw-hub-tag').textContent).toBe('1 Notiz');
    hub().querySelector('.sw-hub-show').click();
    expect(hub().querySelector('.sw-hub-notes li').textContent).toMatch(/Heute\s*Hat geholfen/);
    expect(document.getElementById('seating-student-notes').textContent).toBe('');
  });
  it('nach Mitarbeit geben (Fenster schließt) zeigt das nächste Öffnen sie oben', () => {
    open('c');
    app('addParticipationSmiley("excellent")');
    open('c');
    expect(hub().hidden).toBe(false);
    hub().querySelector('.sw-hub-show').click();
    expect(hub().querySelector('.sw-hub-count').textContent).toBe('++1');
  });
  it('Notiztext wird escaped (Regel 3)', () => {
    app(`db.students.g1[2].studentNotes = [{ text: '<img src=x onerror=window.__xss=1>', date: '2026-11-10' }]`);
    open('c');
    hub().querySelector('.sw-hub-show').click();
    expect(hub().querySelector('img')).toBeNull();
    expect(hub().textContent).toContain('<img src=x');
  });
});

describe('Ohne Beamer-Schutz', () => {
  it('alles sofort da, kein „Anzeigen“ und kein „Verbergen“', () => {
    app('db.settings.classGradesProtect = false');
    open('a');
    expect(hub().querySelector('.sw-hub-show')).toBeNull();
    expect(hub().querySelector('.sw-hub-hide')).toBeNull();
    expect(hub().textContent).toMatch(/War lange auf Toilette/);
  });
});

describe('Sitzplan-Karte', () => {
  it('Notizzettel-Symbol nur bei Notiz aus den letzten 2 Stunden; nie der Text; VoiceOver nennt es', () => {
    app('openSeatingForGroup("g1", "2026-11-11")');
    expect(card('Anna').querySelector('.sc-note')).not.toBeNull();
    expect(card('Anna').getAttribute('aria-label')).toMatch(/Notiz aus den letzten Stunden/);
    expect(card('Anna').textContent).not.toMatch(/Toilette/);
    expect(card('Ben').querySelector('.sc-note')).toBeNull();   // nur alte Notiz
    expect(card('Cem').querySelector('.sc-note')).toBeNull();
  });
  it('Mitarbeit eingeblendet: letzte 3 Einträge ohne Titel als Zeichen, alt → neu (AM2)', () => {
    app('openSeatingForGroup("g1", "2026-11-11")');
    app('toggleSeatingTrend()');
    expect([...card('Anna').querySelectorAll('.sc-trend .part-sign')].map(s => s.textContent)).toEqual(['++', '−', '−−']);
    expect(card('Anna').querySelector('.sc-trend i')).toBeNull();   // keine Balken mehr
  });
});
