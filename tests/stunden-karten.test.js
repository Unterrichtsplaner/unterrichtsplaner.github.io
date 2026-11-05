// AH37: Karten im Stunden-Fenster selbst anordnen und ausblenden. Keine Löcher: Nur gleich große Karten stehen nebeneinander,
// eine Karte ohne Partner nimmt die ganze Zeile. Gespeichert in db.settings, läuft im Abgleich mit.
const { loadApp, app } = require('./helpers/load-app');

const st = (id, f) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] });
const DATE = '2026-11-04';
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [{ id: 'l1', day: 2, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', recurring: 'weekly' }],
    lessonData: {}, supervisions: [], todos: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50, plan: [{ id: 'p1', title: 'Brüche', lessons: 3 }] }],
    students: { g1: [st('a', 'Anna'), st('b', 'Ben')] },
  };
}
const open = () => app(`openLessonDetail("l1", "${DATE}")`);
const card = key => document.querySelector(app('LESSON_CARDS').find(c => c.key === key).sel);
const shown = key => { const el = card(key); return !el.classList.contains('hidden') && !el.classList.contains('lc-off'); };
const wide = key => card(key).classList.contains('lc-wide');
const pos = key => Number(card(key).style.getPropertyValue('--lc-order'));
const settings = () => app('db.settings');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 4, 10, 0));
  app('db = ' + JSON.stringify(sampleDB()));
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});
afterEach(() => vi.useRealTimers());

describe('Keine Löcher: wer steht neben wem', () => {
  const pair = cards => app('pairLessonCards')(cards);
  it('gleich große Karten bilden Paare, die Reihenfolge bleibt', () => {
    expect(pair([{ key: 'a', size: 'M' }, { key: 'b', size: 'M' }, { key: 'c', size: 'L' }, { key: 'd', size: 'L' }]).map(r => r.map(c => c.key)))
      .toEqual([['a', 'b'], ['c', 'd']]);
  });
  it('offene Hausaufgabe neben ausgeschaltetem Test: jede bekommt ihre eigene Zeile', () => {
    expect(pair([{ key: 'hw', size: 'L' }, { key: 'test', size: 'S' }]).map(r => r.map(c => c.key))).toEqual([['hw'], ['test']]);
  });
  it('sucht weiter hinten nach einem Partner, statt ein Loch zu lassen', () => {
    expect(pair([{ key: 'a', size: 'M' }, { key: 'b', size: 'L' }, { key: 'c', size: 'M' }, { key: 'd', size: 'L' }]).map(r => r.map(c => c.key)))
      .toEqual([['a', 'c'], ['b', 'd']]);
  });
  it('Zufallstest: Jede Karte genau einmal; jede Reihe ist ein gleich großes Paar oder eine einzelne Karte; kein zweiter Einzelner gleicher Größe', () => {
    let seed = 42;
    const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    const SIZES = ['S', 'M', 'L'];
    for (let run = 0; run < 2000; run++) {
      const cards = Array.from({ length: rnd(9) }, (_, i) => ({ key: 'k' + i, size: SIZES[rnd(3)] }));
      const rows = pair(cards);
      expect(rows.flat().map(c => c.key).sort()).toEqual(cards.map(c => c.key).sort());
      rows.forEach(r => {
        expect(r.length === 1 || r.length === 2).toBe(true);
        if (r.length === 2) expect(r[0].size).toBe(r[1].size);
      });
      const alone = rows.filter(r => r.length === 1).map(r => r[0].size);
      expect(new Set(alone).size).toBe(alone.length);
    }
  });
});

describe('Im Fenster', () => {
  it('Standard: Fehlen/Merkzettel leer, Thema | Notiz, Inhalt | Notizen, HA | Test als Paare, niemand allein', () => {
    open();
    expect(shown('absent')).toBe(false);
    ['plan', 'classnotes', 'content', 'notes', 'hw', 'test'].forEach(k => { expect(shown(k), k).toBe(true); expect(wide(k), k).toBe(false); });
    expect(['plan', 'classnotes', 'content', 'notes', 'hw', 'test'].map(pos)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(document.getElementById('lesson-notes-form').classList.contains('lc-default')).toBe(true);
    app('closeModal("modal-lesson")');
  });
  it('HA einschalten: Beide bekommen eine eigene Zeile, „Kein Test angekündigt“ steht in der schmalen Karte', () => {
    open();
    const hint = key => card(key).querySelector('.lc-off-hint');
    expect(hint('hw').hidden).toBe(false);
    expect(hint('hw').textContent).toBe('Keine Hausaufgaben');
    expect(hint('test').textContent).toBe('Kein Test angekündigt');
    const t = document.getElementById('hw-toggle');
    t.checked = true;
    app('toggleSection("hw")');
    expect(wide('hw')).toBe(true);
    expect(wide('test')).toBe(true);
    expect(hint('hw').hidden).toBe(true);
    expect(hint('test').hidden).toBe(false);
    app('closeModal("modal-lesson")');
  });
  it('Nur ein Partner weg (kein Thema in einer vergangenen Stunde): Die andere Karte nimmt die Zeile', () => {
    app(`openLessonDetail("l1", "2026-10-28")`);
    expect(shown('plan')).toBe(false);
    expect(wide('classnotes')).toBe(true);
    app('closeModal("modal-lesson")');
  });
  it('Karte mit Klassennotiz ist hoch genug für ein Textfeld daneben', () => {
    app(`db.groups[0].classNotes = [{ id: "n", text: "Buch", date: "${DATE}" }]`);
    open();
    expect(app('lessonCardSize')('classnotes')).toBe('L');
    expect(wide('plan')).toBe(true);
    app('closeModal("modal-lesson")');
  });
});

describe('Anordnen und ausblenden', () => {
  it('Standard wird nicht gespeichert', () => {
    open();
    app('setLessonCards(LESSON_CARDS.map(c => c.key), [])');
    expect(settings().lessonCards).toBeUndefined();
    app('closeModal("modal-lesson")');
  });
  it('neue Reihenfolge gilt sofort und wird gespeichert', () => {
    open();
    const before = app('db.settings.lastModified');
    vi.setSystemTime(new Date(2026, 10, 4, 10, 5));
    app('setLessonCards(["hw","test","content","notes","plan","classnotes","absent","todos"], [])');
    expect(settings().lessonCards.order[0]).toBe('hw');
    expect(app('db.settings.lastModified')).not.toBe(before);
    expect(pos('hw')).toBe(0);
    expect(pos('test')).toBe(1);
    expect(pos('content')).toBe(2);
    expect(document.getElementById('lesson-notes-form').classList.contains('lc-default')).toBe(false);
    app('closeModal("modal-lesson")');
  });
  it('kaputte oder alte Einstellung: Unbekanntes fällt weg, Fehlendes kommt hinten dazu', () => {
    app('db.settings.lessonCards = { order: ["test", "gibtsnicht", "hw", "hw"], hidden: ["xyz", 5] }');
    const out = app('lessonCardSetup()');
    expect(out.order.slice(0, 2)).toEqual(['test', 'hw']);
    expect(out.order.length).toBe(8);
    expect(new Set(out.order).size).toBe(8);
    expect(out.hidden).toEqual([]);
    app('db.settings.lessonCards = "kaputt"');
    expect(app('lessonCardSetup()').order.length).toBe(8);
  });
  it('ausgeblendet: Karte weg, Nachbar nimmt die Zeile; steht in dieser Stunde etwas drin, erscheint sie trotzdem', () => {
    app('setLessonCards(LESSON_CARDS.map(c => c.key), ["notes"])');
    open();
    expect(shown('notes')).toBe(false);
    expect(wide('content')).toBe(true);
    app('closeModal("modal-lesson")');
    app(`db.lessonData["l1_${DATE}"] = { notes: "wichtig" }`);
    open();
    expect(shown('notes')).toBe(true);
    expect(wide('content')).toBe(false);
    app('closeModal("modal-lesson")');
  });
  it('fällige Hausaufgabe aus einer anderen Stunde zeigt die ausgeblendete Karte auch', () => {
    app('setLessonCards(LESSON_CARDS.map(c => c.key), ["hw"])');
    app(`db.lessonData["l1_2026-10-28"] = { hwEnabled: true, hwItems: [{ id: "h", text: "S. 3", targetDate: "${DATE}" }] }`);
    open();
    expect(shown('hw')).toBe(true);
    app('closeModal("modal-lesson")');
  });
  it('Fenster: alle acht Karten gleich groß, Pfeile tauschen, Auge blendet aus, Zurücksetzen löscht die Einstellung', () => {
    open();
    app('openLessonCardsModal()');
    const m = document.getElementById('modal-lesson-cards');
    expect(m.classList.contains('hidden')).toBe(false);
    const tiles = () => [...m.querySelectorAll('.lc-tile')].sort((a, b) => a.style.order - b.style.order).map(t => t.dataset.key);
    expect(tiles()).toEqual(app('LESSON_CARDS').map(c => c.key));
    m.querySelector('.lc-tile[data-key="plan"] [data-move="-1"]').click();
    expect(tiles().slice(0, 3)).toEqual(['absent', 'plan', 'todos']);
    expect(settings().lessonCards.order.slice(0, 3)).toEqual(['absent', 'plan', 'todos']);
    const eye = m.querySelector('.lc-tile[data-key="test"] [data-eye]');
    expect(eye.getAttribute('aria-pressed')).toBe('true');
    eye.click();
    expect(settings().lessonCards.hidden).toEqual(['test']);
    expect(m.querySelector('.lc-tile[data-key="test"]').classList.contains('is-off')).toBe(true);
    expect(shown("test")).toBe(false);
    m.querySelector('#lc-reset').click();
    expect(settings().lessonCards).toBeUndefined();
    expect(tiles()).toEqual(app('LESSON_CARDS').map(c => c.key));
    expect(shown('test')).toBe(true);
    app('closeModal("modal-lesson-cards"); closeModal("modal-lesson")');
  });
  it('Pfeil am Rand tut nichts', () => {
    open();
    app('openLessonCardsModal()');
    document.querySelector('#modal-lesson-cards .lc-tile[data-key="absent"] [data-move="-1"]').click();
    expect(settings().lessonCards).toBeUndefined();
    app('closeModal("modal-lesson-cards"); closeModal("modal-lesson")');
  });
  it('Knopf im Kopf des Stunden-Fensters; Fenster schließt wie die anderen', () => {
    const btn = document.getElementById('btn-lesson-cards');
    expect(btn.getAttribute('aria-label')).toBe('Karten anordnen');
    expect(document.getElementById('modal-lesson-cards').getAttribute('onclick')).toBe("closeModalOnOverlay(event,'modal-lesson-cards')");
  });
});

describe('Ziehen', () => {
  // jsdom kennt elementsFromPoint nicht: Für den Test antwortet es mit der gewünschten Karte
  const drag = (from, to) => {
    const m = document.getElementById('modal-lesson-cards');
    const tile = k => m.querySelector(`.lc-tile[data-key="${k}"]`);
    document.elementsFromPoint = () => [tile(from), tile(to)];
    const ev = (name, x) => tile(from).dispatchEvent(new MouseEvent(name, { bubbles: true, clientX: x, clientY: x }));
    ev('pointerdown', 10); ev('pointermove', 20);
    expect(tile(to).classList.contains('is-target')).toBe(true);
    expect(tile(from).style.transform).toMatch(/translate/);
    ev('pointerup', 30);
    delete document.elementsFromPoint;
  };
  it('tauscht genau die zwei Karten, alle anderen bleiben auf ihrem Platz', () => {
    open();
    app('openLessonCardsModal()');
    drag('hw', 'plan');
    expect(settings().lessonCards.order).toEqual(['absent', 'todos', 'hw', 'classnotes', 'content', 'notes', 'plan', 'test']);
    expect(document.querySelector('#modal-lesson-cards .is-target')).toBeNull();
    expect(document.querySelector('#modal-lesson-cards .lc-tile[data-key="hw"]').style.transform).toBe('');
    app('closeModal("modal-lesson-cards"); closeModal("modal-lesson")');
  });
  it('Loslassen neben einer Karte ändert nichts', () => {
    open();
    app('openLessonCardsModal()');
    const tile = document.querySelector('#modal-lesson-cards .lc-tile[data-key="hw"]');
    document.elementsFromPoint = () => [];
    ['pointerdown', 'pointermove', 'pointerup'].forEach(n => tile.dispatchEvent(new MouseEvent(n, { bubbles: true, clientX: 5, clientY: 5 })));
    delete document.elementsFromPoint;
    expect(settings().lessonCards).toBeUndefined();
    app('closeModal("modal-lesson-cards"); closeModal("modal-lesson")');
  });
});

describe('Abgleich', () => {
  const base = () => JSON.parse(JSON.stringify(sampleDB()));
  it('nur eine Seite geändert: kommt an, keine Frage; beide verschieden: dieses Gerät, keine Frage', () => {
    const merge = app('mergeDB');
    const c1 = base(); c1.settings.lessonCards = { order: ['hw'], hidden: [] };
    const r1 = merge(base(), base(), c1);
    expect(r1.conflicts).toEqual([]);
    expect(r1.merged.settings.lessonCards.order).toEqual(['hw']);
    const l2 = base(); l2.settings.lessonCards = { order: ['test'], hidden: [] };
    const r2 = merge(base(), l2, c1);
    expect(r2.conflicts).toEqual([]);
    expect(r2.merged.settings.lessonCards.order).toEqual(['test']);
  });
});
