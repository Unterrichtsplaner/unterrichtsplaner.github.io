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
