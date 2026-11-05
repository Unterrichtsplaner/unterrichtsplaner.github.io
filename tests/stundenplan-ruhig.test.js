// AH42: Stundenplan ruhiger. Eine Kachel statt Kasten in Kasten, Farbe nur als Fläche, jede Kachel gleich aufgebaut,
// Symbole in einer Farbe an festem Platz, leere Felder nur als helle Fläche.
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

const rule = sel => { const all = [...CSS.matchAll(new RegExp('(?:^|[}\\s,])' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*(?:,[^{]*)?\\{([^}]*)\\}', 'gm'))]; return all.map(m => m[1]).join(';'); };
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => v * t + b[i] * (1 - t));
const lum = c => { const f = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [
      { id: 'a', day: 3, block: 1, part: 'full', subject: 'Mathe', room: 'R1', color: '#3b82f6', groupId: 'g1', recurring: 'weekly' },
    ],
    lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50 }],
    students: { g1: [] },
  };
}
const tile = (h, m) => app(`buildTimetableCell(parseDate("2026-11-05"), 3, getBlocks()[0], timetableClock(new Date(2026, 10, 5, ${h}, ${m})))`).querySelector('.tt-lesson');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => { app('db = ' + JSON.stringify(sampleDB())); });

describe('Kachel', () => {
  it('Farbe nur über die Variable, keine feste Fläche im HTML (Regel 39)', () => {
    const el = tile(20, 0);
    expect(el.getAttribute('style')).not.toMatch(/background/);
    expect(el.style.getPropertyValue('--lesson-color')).toBe('#3b82f6');
    expect(rule('.tt-lesson')).toMatch(/background:color-mix\(in srgb,var\(--lesson-color\) 24%,var\(--bg-card\)\)/);
    expect(rule('.tt-lesson')).toMatch(/color:var\(--text-primary\)/);
    expect(CSS).not.toMatch(/\.tt-lesson::before/);
    expect(CSS).not.toMatch(/:root\[data-theme="light"\] \.tt-lesson\{color:/);
  });
  it('kein Kasten um die Kachel, leere Felder nur helle Fläche', () => {
    const cell = rule('.tt-cell');
    expect(cell).toMatch(/background:none/);
    expect(cell).toMatch(/border:none/);
    expect(cell).toMatch(/padding:0/);
    expect(rule('.tt-empty-cell')).toMatch(/background:color-mix\(in srgb,var\(--bg-card\) 30%,transparent\)/);
  });
  it('gleicher Aufbau: Klasse und Fach oben, Raum unten, Symbole unten rechts; halbe Stunden bleiben einzeilig', () => {
    expect(rule('.tt-cell > .tt-lesson .tt-lesson-head')).toMatch(/display:grid/);
    expect(rule('.tt-cell > .tt-lesson .tt-lesson-subject')).toMatch(/display:contents/);
    expect(rule('.tt-cell > .tt-lesson .tt-lesson-subject > .tt-lesson-room')).toMatch(/grid-row:2/);
    expect(rule('.tt-cell > .tt-lesson .tt-lesson-foot')).toMatch(/position:absolute/);
    expect(CSS).not.toMatch(/\.tt-cell \.tt-lesson-head\{display:grid/);   // träfe auch halbe Stunden
    expect(rule('.tt-status')).toMatch(/color:var\(--text-secondary\)/);
    for (const c of ['hw', 'test', 'notiz', 'klasse', 'inhalt']) expect(CSS, c).toMatch(new RegExp(`\\.tt-status-${c}[,{]`));
  });
  it('Tagesansicht ab 700 px: Symbole stehen in der Zeile neben Thema und Notizen', () => {
    expect(CSS).toMatch(/\.timetable-grid\.day-view \.tt-cell\.tt-short > \.tt-lesson \.tt-lesson-foot\{position:static;/);
  });
});

describe('Laufend und nächste', () => {
  it('laufend zeigt die Minuten, „noch“ fällt in schmalen Wochen weg; nächste nur mit dünnem Rahmen', () => {
    const run = tile(8, 0);
    const b = run.querySelector('.tt-lesson-badge');
    expect(b.textContent).toMatch(/^noch \d+ min$/);
    expect(b.querySelector('.tt-noch').textContent).toBe('noch ');
    expect(CSS).toMatch(/@container \(max-width: 900px\)\{\s*\.timetable-grid:not\(\.day-view\) \.tt-noch\{display:none;\}/);
    expect(rule('.tt-lesson.running')).toMatch(/inset 0 0 0 2px var\(--tile-edge\)/);
    expect(rule('.tt-lesson.next')).toMatch(/inset 0 0 0 1px var\(--tile-edge\)/);
    expect(rule('.tt-lesson.next .tt-lesson-badge')).toMatch(/display:none/);
  });
  it('Rand im Hellen dunkler, im Dunklen heller', () => {
    expect(rule('.tt-lesson')).toMatch(/--tile-edge:color-mix\(in srgb,var\(--lesson-color\) 70%,#fff\)/);
    expect(CSS).toMatch(/:root\[data-theme="light"\] \.tt-lesson\{--tile-edge:color-mix\(in srgb,var\(--lesson-color\) 60%,#000\);\}/);
  });
});

describe('Lesbarkeit', () => {
  it('Schrift bleibt auf jeder Klassenfarbe lesbar: Eisblau, Papier, dunkel', () => {
    const themes = [['Eisblau', '#dbeafe', '#27221b', '#544c41'], ['Papier', '#fffdf8', '#27221b', '#544c41'], ['Dunkel', '#211e19', '#efe9de', '#a59d90']];
    app('APP_COLORS').forEach(c => themes.forEach(([n, card, primary, secondary]) => {
      const bg = mix(rgb(c), rgb(card), 0.24);
      expect(contrast(rgb(primary), bg), `${c} ${n} Schrift`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rgb(secondary), bg), `${c} ${n} Nebenschrift`).toBeGreaterThanOrEqual(3);
    }));
  });
});
