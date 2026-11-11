// AH52: Mitarbeit in vier Stufen (++ sehr gut, + gut, − wenig, −− schwach). Gespeichert wird das Wort,
// die drei alten Werte behalten ihre Bedeutung (keine Umrechnung), angezeigt werden Zeichen statt Gesichter.
const { loadApp, app, showGradesOnOpen } = require('./helpers/load-app');

const st = (id, f, participation = []) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation, homework: [], studentNotes: [] });
const p = (date, value, label = '') => ({ id: `${date}${value}${label}`, date, label, value });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [], lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50 }],
    students: {
      g1: [
        st('a', 'Anna', [p('2026-10-12', 'excellent'), p('2026-10-13', 'positive'), p('2026-10-14', 'negative')]),
        st('b', 'Ben', [p('2026-10-12', 'neutral')]),
      ],
    },
  };
}
const M = () => document.getElementById('modal-seating-student');
const stu = id => app(`db.students.g1.find(s => s.id === "${id}")`);
const row = name => [...document.querySelectorAll('#overview-content tbody tr')].find(r => r.textContent.includes(name));

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); showGradesOnOpen(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 14, 10, 0));
  app('replaceDB(' + JSON.stringify(sampleDB()) + ')');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});
afterEach(() => vi.useRealTimers());

describe('Stufen', () => {
  it('vier Stufen, beste zuerst; die alten drei behalten ihren gespeicherten Wert', () => {
    expect(app('PART_LEVELS').map(l => [l.value, l.sign, l.word])).toEqual([
      ['excellent', '++', 'sehr gut'], ['positive', '+', 'gut'], ['neutral', '−', 'wenig'], ['negative', '−−', 'schwach']]);
  });
  it('unbekannter Wert (neuere App-Version) wird roh und escaped gezeigt (Regel 3)', () => {
    expect(app('partSignHTML("<b>x</b>")')).toBe('&lt;b&gt;x&lt;/b&gt;');
    expect(app('partSignHTML("excellent")')).toBe('<span class="part-sign p4">++</span>');
  });
  it('Abgleich nennt alle vier Stufen lesbar', () => {
    expect(app('MERGE_FACE_WORDS')).toEqual({ excellent: '++ sehr gut', positive: '+ gut', neutral: '− wenig', negative: '−− schwach' });
  });
});

describe('Schüler-Fenster', () => {
  it('vier Knöpfe mit Zeichen und Wort, „sehr gut“ wird gespeichert und markiert', () => {
    app('openSeatingStudentModal("b", "g1", "2026-10-14")');
    const btns = [...M().querySelectorAll('.sw-faces [data-action]')];
    expect(btns.map(b => b.dataset.action)).toEqual(['excellent', 'positive', 'neutral', 'negative']);
    expect(btns.map(b => `${b.querySelector('.part-sign').textContent} ${b.querySelector('small').textContent}`)).toEqual(['++ sehr gut', '+ gut', '− wenig', '−− schwach']);
    expect(btns.map(b => b.getAttribute('aria-label'))).toEqual(['Mitarbeit sehr gut', 'Mitarbeit gut', 'Mitarbeit wenig', 'Mitarbeit schwach']);
    app('addParticipationSmiley("excellent")');
    expect(stu('b').participation.find(x => x.date === '2026-10-14').value).toBe('excellent');
    app('openSeatingStudentModal("b", "g1", "2026-10-14")');
    expect(M().querySelector('[data-action="excellent"]').getAttribute('aria-pressed')).toBe('true');
    expect(M().querySelector('[data-action="positive"]').getAttribute('aria-pressed')).toBe('false');
  });
  it('Bilanz unter „Mehr“ zählt alle vier Stufen', () => {
    app('openSeatingStudentModal("a", "g1", "2026-10-14")');
    expect(document.getElementById('seating-student-participation-summary').textContent.replace(/\s+/g, ' ').trim())
      .toBe('Mitarbeit bisher: ++ 1 · + 1 · − 0 · −− 1');
  });
});

describe('Klassenansicht', () => {
  it('Tabelle: Zeichen in den Zellen, Summe „++ / + / − / −−“, nur „schwach“ rot', () => {
    app('openGroupStudents("g1", "participation")');
    expect(document.querySelector('#overview-content th.ov-sum-col').textContent).toBe('++/+/−/−−');   // Abstände per CSS
    const anna = row('Anna');
    expect([...anna.querySelectorAll('.ov-part-btn')].map(b => b.textContent.trim())).toEqual(['++', '+', '−−']);
    expect(anna.querySelector('.ov-part-btn').getAttribute('aria-label')).toMatch(/: sehr gut$/);
    expect(anna.querySelector('.ov-sum').textContent.replace(/\s+/g, ' ').trim()).toBe('1 / 1 / 0 / 1');
    expect(anna.querySelector('.ov-sum .n-bad').textContent).toBe('1');
    expect(row('Ben').querySelector('.ov-sum .n-bad')).toBeNull();   // „wenig“ ist nicht rot
    expect(document.querySelector('.ov-legend').textContent).toMatch(/\+\+ sehr gut.*\+ gut.*− wenig.*−− schwach/);
  });
  it('Auswahl beim Antippen: vier Stufen und „leer“; „sehr gut“ trägt ein', () => {
    app('openGroupStudents("g1", "participation")');
    app('openParticipationPicker(document.querySelectorAll("#overview-content tbody tr")[1].querySelectorAll(".ov-part-btn")[1], "b", "2026-10-13", "")');
    const pop = document.getElementById('ov-part-pop');
    expect([...pop.querySelectorAll('button')].map(b => b.getAttribute('aria-label'))).toEqual(['sehr gut', 'gut', 'wenig', 'schwach', 'leer']);
    pop.querySelector('button').click();
    expect(stu('b').participation.find(x => x.date === '2026-10-13').value).toBe('excellent');
  });
  it('Schülerliste: Zähler mit vier Zahlen, Titel mit Wörtern', () => {
    app('openGroupStudents("g1", "students")');
    const c = [...document.querySelectorAll('.student-row')].find(r => r.textContent.includes('Anna')).querySelector('[data-kind="participation"]');
    expect(c.title).toBe('Mitarbeit: 1 sehr gut, 1 gut, 0 wenig, 1 schwach');
    expect(document.querySelector('.students-head-part').textContent).toBe('Mitarbeit ++ / + / − / −−');
  });
  it('Profil-Liste zeigt Zeichen mit Namen für VoiceOver', () => {
    app('openStudentDetail("a", "g1")');
    const faces = [...document.querySelectorAll('#participation-list .entry-face')];
    expect(faces.map(f => f.textContent)).toEqual(['−−', '+', '++']);
    expect(faces.map(f => f.getAttribute('aria-label'))).toEqual(['schwach', 'gut', 'sehr gut']);
  });
});

describe('Sitzplan-Karte', () => {
  it('Verlauf als Zeichen je Stufe (AM2, vorher Balken)', () => {
    const html = app('participationTrendHTML(db.students.g1[0])');
    expect([...html.matchAll(/class="part-sign p(\d)">([^<]+)</g)].map(m => m[1] + m[2])).toEqual(['4++', '3+', '1−−']);
    expect(html).toMatch(/title="Mitarbeit zuletzt: sehr gut, gut, schwach"/);
  });
});

describe('Klassen-Bericht', () => {
  it('zählt vier Stufen, Excel mit Wörtern im Kopf', () => {
    const anna = app('classReportData(db.groups[0]).rows').find(r => r.name.includes('Anna'));
    expect(anna.part).toEqual([1, 1, 0, 1]);
    const xml = app('classReportSheetXML(db.groups[0])');
    for (const w of ['sehr gut', 'gut', 'wenig', 'schwach']) expect(xml).toContain(`Mitarbeit ${w}<`);
  });
});
