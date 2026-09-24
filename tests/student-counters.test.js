// H11: Die Zähler „MITARBEIT 1 : 0 : 2 · FEHLT 3 / 1“ in der Schülerliste erklären sich
// beim Darüberfahren (Maus) und beim Antippen (iPad, kein Hover). Die Farben bleiben.
const { loadApp, app } = require('./helpers/load-app');

function sampleDB() {
  return {
    settings: { teacherName: 'Test', school: '', blocks: null },
    lessonSlots: [],
    lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '1A', color: '#6366f1', schularbeitWeight: 50 }],
    students: {
      g1: [{
        id: 's1', firstName: 'Anna', lastName: 'Muster', grades: [], homework: [], studentNotes: [],
        participation: [{ date: '2026-09-01', value: 'positive' }, { date: '2026-09-02', value: 'negative' },
          { date: '2026-09-03', value: 'negative' }],
        attendance: [{ date: '2026-09-01', type: 'abwesend' }, { date: '2026-09-02', type: 'abwesend' },
          { date: '2026-09-03', type: 'abwesend' }, { date: '2026-09-04', type: 'entschuldigt' },
          { date: '2026-09-05', type: 'zu_spaet' }],
      }],
    },
  };
}

// Maus (hover: hover) oder Touch
function setHover(canHover) {
  window.matchMedia = q => ({ matches: q === '(hover: hover)' ? canHover : false, media: q,
    addEventListener() {}, removeEventListener() {} });
}

const counter = kind => document.querySelector(`#students-container .student-counter[data-kind="${kind}"]`);
const hint = () => document.getElementById('counter-hint');
const hintOpen = () => !!hint() && !hint().classList.contains('hidden');
const detailOpen = () => !document.getElementById('modal-student-detail').classList.contains('hidden');

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});
beforeEach(() => {
  app('closeModal("modal-student-detail")');
  app('hideCounterHint()');
  app('openGroupStudents("g1")');
});

describe('H11: Zähler in der Schülerliste erklären sich', () => {
  it('Farben und Zahlen bleiben', () => {
    expect(counter('participation').textContent.replace(/\s+/g, ' ')).toContain('1 : 0 : 2');
    expect(counter('attendance').textContent.replace(/\s+/g, ' ')).toContain('3 / 1');
  });

  it('Darüberfahren/Vorlesen: Erklärung mit den echten Zahlen', () => {
    expect(counter('participation').title).toBe('Mitarbeit: 1 positiv, 0 neutral, 2 negativ');
    expect(counter('attendance').title).toBe('Fehltage: 3 unentschuldigt, 1 entschuldigt');
    expect(counter('participation').getAttribute('aria-label')).toBe(counter('participation').title);
  });

  it('Antippen auf dem iPad: kleine Erklärung statt sofort die Schülerakte', () => {
    setHover(false);
    counter('attendance').click();
    expect(hintOpen()).toBe(true);
    expect(detailOpen()).toBe(false);
    expect(hint().textContent).toContain('3 unentschuldigt');
    expect(hint().textContent).toContain('1 entschuldigt');
  });

  it('aus der Erklärung geht es weiter in die Schülerakte, richtiger Reiter', () => {
    setHover(false);
    counter('participation').click();
    hint().querySelector('button').click();
    expect(hintOpen()).toBe(false);
    expect(detailOpen()).toBe(true);
    expect(document.querySelector('#modal-student-detail .tab-btn.active').textContent).toMatch(/Mitarbeit/);
  });

  it('Tippen woanders schließt die Erklärung, ohne etwas anderes auszulösen', () => {
    setHover(false);
    counter('attendance').click();
    document.body.click();
    expect(hintOpen()).toBe(false);
  });

  it('nochmal auf denselben Zähler tippen schließt sie wieder', () => {
    setHover(false);
    counter('attendance').click();
    counter('attendance').click();
    expect(hintOpen()).toBe(false);
  });

  it('Maus: Klick öffnet wie bisher direkt die Schülerakte (Erklärung kam schon beim Darüberfahren)', () => {
    setHover(true);
    counter('attendance').click();
    expect(hintOpen()).toBe(false);
    expect(detailOpen()).toBe(true);
    expect(document.querySelector('#modal-student-detail .tab-btn.active').textContent).toMatch(/Anwesenheit|Fehl/);
  });

  it('Erklärung zeigt die Zahlen in den Farben des Zählers', () => {
    setHover(false);
    counter('attendance').click();
    const bold = [...hint().querySelectorAll('b')].map(b => [b.textContent, b.style.color]);
    expect(bold).toEqual([['3', 'var(--danger)'], ['1', 'var(--success)']]);
  });

  it('Liste wird neu gezeichnet (z. B. Sync): Erklärung verschwindet mit ihrem Zähler', () => {
    setHover(false);
    counter('attendance').click();
    app('renderStudents()');
    expect(hintOpen()).toBe(false);
  });
});

// H12: Auf dem iPad hochkant und dem Handy passt die Zeile ins Bild.
// jsdom kann kein Layout messen – geprüft werden die Regeln, die das sicherstellen (im Browser nachgemessen).
describe('H12: Schülerliste passt auf schmale Bildschirme', () => {
  const css = require('fs').readFileSync(require('path').join(__dirname, '..', 'style.css'), 'utf8');

  it('die Klassenansicht erzwingt keine 800 px Mindestbreite (iPad hochkant: nur ~600 px Platz)', () => {
    expect(css).toMatch(/#main-content:has\(#view-students\.active\)[^{]*\{\s*min-width:\s*0/);
  });

  it('Zähler stehen in einem eigenen Block, der auf dem Handy unter den Namen rutscht', () => {
    const wrap = document.querySelector('#students-container .student-row .student-counters');
    expect(wrap).not.toBeNull();
    expect(wrap.querySelectorAll('.student-counter').length).toBe(2);
    const phone = css.match(/@media\s*\(max-width:\s*600px\)\s*\{([^@]*?)\n\}/g).join('\n');
    expect(phone).toMatch(/\.student-row\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(phone).toMatch(/\.student-counters\s*\{[^}]*flex-basis:\s*100%/);
    // Maßgeblich ist die Breite der Liste: bei 640 px mit Seitenleiste blieben sonst 45 px für den Namen
    expect(css).toMatch(/#students-container\s*\{[^}]*container-type:\s*inline-size/);
    expect(css).toMatch(/@container\s*\(max-width:\s*\d+px\)\s*\{[^@]*\.student-row\s*\{[^}]*flex-wrap:\s*wrap/);
  });

  it('Dashboard füllt schmale Bildschirme, statt auf seinen Inhalt zu schrumpfen', () => {
    // war hinter der 800-px-Mindestbreite versteckt: margin:0 auto in einer Flex-Spalte schrumpft den Block
    expect(document.getElementById('dashboard-content').style.width).toBe('100%');
  });

  it('Kopf der Klassenansicht bricht um, statt Knöpfe abzuschneiden', () => {
    expect(document.querySelector('#view-students .class-view-top .header-actions')).not.toBeNull();
    expect(css).toMatch(/\.class-view-top\s*\{[^}]*flex-wrap:\s*wrap/);
  });

  it('lange Namen werden abgekürzt statt die Zeile zu sprengen', () => {
    expect(css).toMatch(/\.student-name\s*\{[^}]*text-overflow:\s*ellipsis/);
  });
});

