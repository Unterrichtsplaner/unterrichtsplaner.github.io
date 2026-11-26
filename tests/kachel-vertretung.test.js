// Stundenplan-Kachel (BUGS BH1, Bildschirmfoto 26.11.): Einzelstunde ohne Raum, mit Symbolen. Die Zeile Klasse · Fach ·
// „Vertretung“ stand mittig, die Symbole auf Höhe der Raumzeile (top: 50 % + 1px) und damit darüber. Kacheln mit
// Symbolen halten die Raumzeile frei: oben Klasse, Fach, Art; unten Raum und Symbole (AH42). jsdom rechnet kein Layout,
// darum prüft der Test das Markup und die Regel in style.css; nachgemessen im Browser (Handy, iPad, Laptop).
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');

const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

function sampleDB() {
  const f = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  return {
    settings: { teacherName: 'T', blocks: Array.from({ length: 6 }, (_, i) => ({ num: i + 1, label: (i + 1) + '. Stunde', start: f(480 + i * 50), end: f(525 + i * 50) })) },
    lessonSlots: [{ id: 'v', day: 3, block: 2, part: 'full', subject: 'Musik', color: '#c9b98f', recurring: false, specificDate: '2026-11-26', substitute: true, groupId: 'g' }],
    lessonData: { 'v_2026-11-26': { done: 'Lieder', notes: 'Kopien' } }, supervisions: [],
    groups: [{ id: 'g', subject: 'Musik', className: '5b', color: '#c9b98f', schularbeitWeight: 50 }],
    students: { g: [] },
  };
}

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 26, 7, 0));
  app('db = ' + JSON.stringify(sampleDB()));
});
afterEach(() => vi.useRealTimers());

describe('BH1: „Vertretung“ und Symbole in der Einzelstunde', () => {
  it('Kachel ohne Raum: Art im Kopf, Symbole als eigener Fuß direkt in der Kachel', () => {
    app('switchView("timetable"); jumpToDate("2026-11-26")');
    const tile = document.querySelector('.tt-cell.tt-short > .tt-lesson[data-slot="v"]');
    expect(tile).toBeTruthy();
    expect(tile.querySelector('.tt-lesson-head .tt-lesson-kind').textContent).toBe('Vertretung');
    expect(tile.querySelector('.tt-lesson-room')).toBeNull();
    expect(tile.querySelector(':scope > .tt-lesson-foot .tt-status-row').children.length).toBeGreaterThan(0);
  });
  it('style.css hält bei Einzelstunden mit Symbolen die Raumzeile frei', () => {
    const rule = css.match(/\.tt-cell\.tt-short\s*>\s*\.tt-lesson:has\(>\s*\.tt-lesson-foot\)\s*\.tt-lesson-head\s*\{([^}]*)\}/);
    expect(rule).toBeTruthy();
    expect(rule[1]).toMatch(/grid-template-rows:\s*18px\s+16px/);   // Zeilenhöhen wie Klasse (18) und Raum (16)
  });
});
