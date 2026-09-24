// H13: Sitzplan auf schmalen Bildschirmen (iPad hochkant/quer, Handy).
// Vorher: Werkzeugleiste unten lief schon bei 1024 px (iPad quer) links unter die Seitenleiste und rechts
// aus dem Bild; oben überdeckte die Leiste den Titel. jsdom misst kein Layout – geprüft werden die
// Regeln, im Browser nachgemessen bei 1024/768/640/375 px.
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');

const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

// Inhalt eines @container-Blocks (bis zur nächsten Regel auf oberster Ebene)
function seatingDB() {
  const names = ['Anna', 'Ben', 'Clara', 'David', 'Emil', 'Maximiliane'];
  return {
    settings: { teacherName: 'Test', school: '', blocks: null },
    lessonSlots: [], lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#6366f1', schularbeitWeight: 50, seatingRows: 5, seatingCols: 6 }],
    students: { g1: names.map((n, i) => ({ id: 's' + i, firstName: n, lastName: 'X', grades: [], attendance: [],
      participation: [], homework: [], studentNotes: [] })) },
  };
}

// Sitzplan mit vorgegebener Rahmengröße zeichnen (jsdom hat kein Layout)
function renderSeatingAt(width, height) {
  const wrapper = document.getElementById('seating-canvas-wrapper');
  Object.defineProperty(wrapper, 'clientWidth', { configurable: true, value: width });
  Object.defineProperty(wrapper, 'clientHeight', { configurable: true, value: height });
  try {
    app('switchView("seating"); currentSeatingGroupId = "g1"; renderSeatingPlan()');
    return [...document.querySelectorAll('.seating-card')];
  } finally {
    delete wrapper.clientWidth; delete wrapper.clientHeight;
  }
}

function containerBlock(maxWidth) {
  const m = css.match(new RegExp(`@container seating \\(max-width:\\s*${maxWidth}px\\)\\s*\\{([\\s\\S]*?)\\n\\}`));
  return m ? m[1] : '';
}

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(seatingDB()));
  loadApp();
});

describe('H13: Sitzplan passt auf schmale Bildschirme', () => {
  it('800-px-Mindestbreite fällt weg – aber nur, wo Container-Queries gehen (sonst wie bisher)', () => {
    expect(css).toMatch(/@supports\s*\(container-type:\s*inline-size\)\s*\{\s*#main-content:has\(#view-seating\.active\)\s*\{\s*min-width:\s*0/);
    expect(css).toMatch(/#view-seating\s*\{[^}]*container-type:\s*inline-size[^}]*container-name:\s*seating/);
  });

  it('untere Werkzeugleiste bricht um statt über die Ränder zu laufen', () => {
    const bar = document.querySelector('#view-seating .seating-tools-bar');
    expect(bar.getAttribute('style')).toBeNull();   // Layout steht in style.css, nicht inline
    expect(css).toMatch(/\.seating-tools-bar\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(containerBlock(1000)).toMatch(/\.tool-widget/);
  });

  it('obere Leiste überdeckt den Titel nicht: rückt in den Fluss, Titel ausgeblendet', () => {
    expect(document.querySelector('#view-seating .seating-toolbar')).not.toBeNull();
    const narrow = containerBlock(820);
    expect(narrow).toMatch(/\.seating-header h1\s*\{[^}]*display:\s*none/);
    expect(narrow).toMatch(/\.seating-toolbar\s*\{[^}]*position:\s*static/);
  });

  it('Handy: Datums-Chips in eigener Zeile', () => {
    const phone = containerBlock(520);
    expect(phone).toMatch(/\.seating-toolbar\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(phone).toMatch(/#seating-date-strip\s*\{[^}]*flex-basis:\s*100%/);
  });

  it('Knöpfe und Anzeigen bleiben erreichbar (IDs unverändert)', () => {
    ['timer-display', 'stopwatch-display', 'btn-timer-toggle', 'btn-stopwatch-toggle', 'seating-date-strip',
      'seating-group-trigger', 'btn-seating-grades', 'btn-seating-edit'].forEach(id =>
      expect(document.getElementById(id), id).not.toBeNull());
  });
});

describe('H13: Namen auf kleinen Sitzplan-Karten', () => {
  it('Schriftgröße steht in style.css, nicht inline – sonst wirkt die kleinere Schrift für kleine Karten nie', () => {
    const [card] = renderSeatingAt(1040, 540);
    expect(card.querySelector('.sc-name').style.fontSize).toBe('');
  });

  it('lange Namen werden mit Silbentrennung umbrochen („Maximi-liane“), nicht hart mitten im Wort', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    expect(html).toMatch(/<html lang="de">/);   // Silbentrennung braucht die Sprache
    expect(css).toMatch(/\.seating-card \.sc-name\{[^}]*hyphens:auto/);
    expect(css).not.toMatch(/\.seating-card \.sc-name\{[^}]*word-break:break-word/);
  });

  it('große Karten (iPad quer): keine Stufe', () => {
    const cards = renderSeatingAt(1040, 640);
    expect(cards[0].classList.contains('compact')).toBe(false);
    expect(cards[0].classList.contains('tiny')).toBe(false);
  });

  it('iPad hochkant: kompakt, aber noch nicht winzig', () => {
    const cards = renderSeatingAt(604, 510);   // Zellen ~94 px
    expect(cards[0].classList.contains('compact')).toBe(true);
    expect(cards[0].classList.contains('tiny')).toBe(false);
  });

  it('Handy: winzige Karten trennen Namen nicht mitten im Wort, sondern kürzen mit „…“', () => {
    const cards = renderSeatingAt(370, 315);   // Zellen ~55 px
    expect(cards[0].classList.contains('tiny')).toBe(true);
    expect(css).toMatch(/\.seating-card\.tiny \.sc-name\s*\{[^}]*white-space:\s*nowrap[^}]*text-overflow:\s*ellipsis/);
    // vollständiger Name bleibt per Tooltip/Vorlesefunktion erreichbar
    const maxi = cards.find(c => c.textContent.includes('Maximiliane'));
    expect(maxi.querySelector('.sc-name').title).toBe('Maximiliane');
  });
});
