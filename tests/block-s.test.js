// Block S (Review 25.09.2026, zweite Runde): Sitzplan, Fenster, Einstellungen, Design.
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');

const CSS = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Montag, 21.09.2026, 09:00. 1. Block 07:45–09:15 ist geteilt: 1. Hälfte 7b (bis 08:30), 2. Hälfte 9c
const NOW = new Date('2026-09-21T09:00:00');
const stu = (id, firstName, lastName, extra = {}) => ({
  id, firstName, lastName, grades: [{ type: 'test', value: '2.0', date: '2026-09-10', note: 'T' }],
  attendance: [], participation: [], homework: [], studentNotes: [], ...extra,
});
function sampleDB() {
  return {
    settings: { teacherName: 'Test', school: '', blocks: null },
    lessonSlots: [
      { id: 'a', day: 0, block: 1, part: 'first', subject: 'Mathe', groupId: 'g1', recurring: 'weekly', color: '#6366f1' },
      { id: 'b', day: 0, block: 1, part: 'second', subject: 'Physik', groupId: 'g3', recurring: 'weekly', color: '#10b981' },
      { id: 'c', day: 0, block: 2, part: 'full', subject: 'Mathe', groupId: 'g1', recurring: 'weekly', color: '#6366f1' },
    ],
    lessonData: {},
    groups: [
      { id: 'g1', subject: 'Mathe', className: '7b', color: '#6366f1', schularbeitWeight: 50 },
      { id: 'g3', subject: 'Physik', className: '9c', color: '#10b981', schularbeitWeight: 50 },
    ],
    students: { g1: [stu('s1', 'Anna', 'Muster'), stu('s2', 'Ben', 'Bauer')], g3: [stu('s3', 'Cem', 'Test')] },
  };
}
const hidden = id => document.getElementById(id).classList.contains('hidden');
const gpaShown = () => document.querySelectorAll('#seating-canvas .sc-gpa').length > 0;

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  window.scrollTo = () => {};
  Element.prototype.scrollIntoView = () => {}; // Zufallsauswahl scrollt die Karte ins Bild (fehlt in jsdom)
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});
afterAll(() => vi.useRealTimers());

beforeEach(() => {
  vi.setSystemTime(NOW);
  app('db = ' + JSON.stringify(sampleDB()));
  app('currentSeatingGroupId = ""; seatingRequest = null; currentSeatingDateStr = ""; seatingDateChosenOn = ""');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
  window.confirm = () => true;
});

describe('S1: Noten wieder verborgen bei Klassen- und Datumswechsel', () => {
  it('Klasse im Menü wechseln', () => {
    app('switchView("seating")');
    app('toggleSeatingGrades()');
    expect(gpaShown()).toBe(true);
    const other = [...document.querySelectorAll('#seating-group-menu .seating-group-item')].find(b => b.textContent.includes('7b'));
    other.click();
    expect(app('seatingShowGrades')).toBe(false);
    expect(gpaShown()).toBe(false);
  });
  it('Datum wechseln', () => {
    app('switchView("seating")');
    app('toggleSeatingGrades()');
    document.querySelectorAll('#seating-date-strip .date-chip')[0].click();
    expect(app('seatingShowGrades')).toBe(false);
  });
});

describe('S2/S3: welche Klasse der Sitzplan zeigt', () => {
  it('S3: um 09:00 läuft die 2. Hälfte → 9c', () => {
    expect(app('getSuggestedSeatingGroupId()')).toBe('g3');
  });
  it('S3: um 08:00 läuft die 1. Hälfte → 7b', () => {
    vi.setSystemTime(new Date('2026-09-21T08:00:00'));
    expect(app('getSuggestedSeatingGroupId()')).toBe('g1');
  });
  it('S3: eine ausfallende Stunde wird nicht vorgeschlagen', () => {
    app('db').lessonData['b_2026-09-21'] = { ausfall: true };
    expect(app('getSuggestedSeatingGroupId()')).toBeNull();
  });
  it('S2: nach einer Cloud-Übernahme bleibt die gewählte Klasse', () => {
    app('switchView("seating")');
    app('currentSeatingGroupId = "g1"; renderSeatingPlan()');
    app('resetViewSelection()');
    expect(app('currentSeatingGroupId')).toBe('g1');
  });
});

describe('S4: Schnellbewertung aus der Tabelle nimmt das Datum beim Tippen', () => {
  it('Tabelle über Nacht offen → Eintrag am neuen Tag', () => {
    app('openClassOverview("g1")');
    const cell = document.querySelector('#overview-content .ov-name');
    expect(cell.getAttribute('onclick')).not.toMatch(/2026-09-21/);
    vi.setSystemTime(new Date('2026-09-22T08:00:00'));
    app(`(function(){ ${cell.getAttribute('onclick')} })`).call(cell);
    expect(app('window.currentSeatingStudent').dateStr).toBe('2026-09-22');
  });
});

describe('S5: „Zum Profil“ aus der Stunde', () => {
  it('schließt das Stunden-Fenster', () => {
    app(`openLessonDetail('c', '2026-09-21')`);
    app(`openSeatingStudentModal('s1', 'g1', '2026-09-21')`);
    app('jumpToStudentDetailFromSeating()');
    expect(hidden('modal-lesson')).toBe(true);
    expect(hidden('modal-student-detail')).toBe(false);
  });
});

describe('S6: Standard-Design bleibt Standard', () => {
  it('Speichern ohne Farbwahl speichert keine Hintergrundfarbe', () => {
    app('openSettings()');
    document.getElementById('settings-teacher-name').value = 'Neu';
    app('saveSettings(); clearTimeout(window.syncTimeout)');
    expect(app('db').settings.themeBg).toBeFalsy();
    expect(app('db').settings.themeCard).toBeFalsy();
    expect(document.documentElement.style.getPropertyValue('--bg-secondary')).toBe('');
  });
  it('früher versehentlich gespeicherte Standardwerte gelten als Standard', () => {
    Object.assign(app('db').settings, { themeBg: '#0f1117', themeCard: '#1e2130' });
    app('updateAppliedThemeFromDB()');
    expect(document.documentElement.style.getPropertyValue('--bg-secondary')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--bg-elevated')).toBe('');
  });
  it('es gibt ein Farbfeld „Standard“, das eine gewählte Farbe zurücknimmt', () => {
    Object.assign(app('db').settings, { themeBg: '#1f2937', themeCard: '#374151' });
    app('openSettings()');
    const std = document.querySelector('.settings-swatch-bg[data-color=""]');
    expect(std).toBeTruthy();
    app('selectThemeBg')(std, '', 'dark', ''); // Inline-onclick läuft in jsdom nicht (Regel 18)
    expect(std.getAttribute('onclick')).toContain("selectThemeBg(this, ''");
    app('saveSettings(); clearTimeout(window.syncTimeout)');
    expect(app('db').settings.themeBg).toBeFalsy();
  });
});

describe('S7: Schließen verwirft Eingaben nicht ohne Rückfrage', () => {
  it('Einstellungen: geändertes Feld, Escape → Rückfrage; „Nein“ lässt das Fenster offen', () => {
    app('openSettings()');
    document.getElementById('settings-teacher-name').value = 'Frau Neu';
    const ask = vi.fn(() => false);
    window.confirm = ask;
    app('closeTopModal()');
    expect(ask).toHaveBeenCalled();
    expect(hidden('modal-settings')).toBe(false);
    window.confirm = () => true;
    app('closeTopModal()');
    expect(hidden('modal-settings')).toBe(true);
  });
  it('Einstellungen ohne Änderung: keine Rückfrage', () => {
    app('openSettings()');
    const ask = vi.fn(() => true);
    window.confirm = ask;
    app('closeTopModal()');
    expect(ask).not.toHaveBeenCalled();
    expect(hidden('modal-settings')).toBe(true);
  });
  it('Notenformular: eingetippte Note, daneben tippen → Rückfrage', () => {
    app('openGradeForm("s1", "g1", -1)');
    document.getElementById('gf-value').value = '2';
    const ask = vi.fn(() => false);
    window.confirm = ask;
    app('closeModalLikeButton("modal-grade-form")');
    expect(ask).toHaveBeenCalled();
    expect(hidden('modal-grade-form')).toBe(false);
  });
});

describe('S10: Timer verliert beim Pausieren keine Zeit', () => {
  it('10× nach 0,9 s pausiert → 9 s weniger', () => {
    app('resetTimer()');
    let t = NOW.getTime();
    for (let i = 0; i < 10; i++) {
      app('toggleTimer()');
      t += 900; vi.setSystemTime(new Date(t));
      app('toggleTimer()');
    }
    expect(app('timerSeconds')).toBe(291);
    app('resetTimer()');
  });
});

describe('S11: Zufall-Fenster', () => {
  it('öffnet über openModal: Fokus kommt zum Knopf „Zufall“ zurück', () => {
    app('switchView("seating")');
    const btn = [...document.querySelectorAll('button')].find(b => (b.getAttribute('onclick') || '').includes('startSeatingRandomizer'));
    btn.focus();
    app('startSeatingRandomizer()');
    expect(document.getElementById('modal-seating-randomizer').querySelector('.modal').getAttribute('role')).toBe('dialog');
    app('closeModal("modal-seating-randomizer")');
    expect(document.activeElement).toBe(btn);
  });
  it('das Overlay verdeckt die hervorgehobenen Karten nicht', () => {
    expect(CSS).toMatch(/#modal-seating-randomizer\s*\{[^}]*background:\s*transparent/);
  });
});

describe('S12: Bedienung per Tastatur/VoiceOver', () => {
  it('Sitzplan-Karte ist ein Knopf mit Namen und reagiert auf Enter', () => {
    app('switchView("seating")');
    app('currentSeatingGroupId = "g1"; renderSeatingPlan()');
    const card = document.querySelector('.seating-card[data-id="s1"]');
    expect(card.getAttribute('role')).toBe('button');
    expect(card.getAttribute('tabindex')).toBe('0');
    expect(card.getAttribute('aria-label')).toMatch(/Anna/);
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(hidden('modal-seating-student')).toBe(false);
  });
  it('Farbfelder sind Knöpfe', () => {
    expect([...HTML.matchAll(/<div class="color-swatch[^>]*>/g)].every(m => /role="button"/.test(m[0]) && /tabindex="0"/.test(m[0]))).toBe(true);
    app('openAddLessonSlot(0, 1)');
    const sw = document.querySelector('#lesson-color-picker .color-swatch');
    expect(sw.getAttribute('role')).toBe('button');
    expect(sw.getAttribute('aria-label')).toBeTruthy();
  });
  it('Bearbeiten-Knopf im Sitzplan zeigt seinen Zustand, Zurücksetzen-Knöpfe sind unterscheidbar', () => {
    app('switchView("seating")');
    app('toggleSeatingEditMode()');
    expect(document.getElementById('btn-seating-edit').getAttribute('aria-pressed')).toBe('true');
    app('toggleSeatingEditMode()');
    expect(document.getElementById('btn-seating-edit').getAttribute('aria-pressed')).toBe('false');
    expect(HTML).toMatch(/onclick="resetTimer\(\)"[^>]*aria-label="Timer zurücksetzen"/);
    expect(HTML).toMatch(/onclick="resetStopwatch\(\)"[^>]*aria-label="Stoppuhr zurücksetzen"/);
  });
});

// Regeln außerhalb von @media (hover: hover) – auf Touch-Geräten bleibt :hover nach dem Tippen hängen
function cssOutsideHoverMedia(css) {
  let out = '', i = 0;
  while (i < css.length) {
    const at = css.indexOf('@media (hover: hover)', i);
    if (at === -1) { out += css.slice(i); break; }
    out += css.slice(i, at);
    let j = css.indexOf('{', at) + 1, depth = 1;
    while (depth && j < css.length) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
    i = j;
  }
  return out;
}
describe('S8/S9/S13/S14/S15: Gestaltung', () => {
  it('S9: :hover mit Bewegung oder Hintergrund nur für Geräte mit Maus', () => {
    const rest = cssOutsideHoverMedia(CSS.replace(/\/\*[\s\S]*?\*\//g, ''));
    const bad = [...rest.matchAll(/([^{}]*:hover[^{}]*)\{([^}]*)\}/g)]
      .filter(m => /transform|background/.test(m[2])).map(m => m[1].trim());
    expect(bad).toEqual([]);
  });
  it('S9: keine weißen rgba-Ränder in Hover-Regeln (im hellen Modus unsichtbar)', () => {
    expect(CSS).not.toMatch(/:hover\{[^}]*border-color:rgba\(255,255,255/);
  });
  it('S13: Schließen-Knopf und Schnellbewertung auf Touch-Geräten mindestens 44 px', () => {
    const coarse = [...CSS.matchAll(/@media \(pointer: ?coarse\) ?\{([\s\S]*?)\n\}/g)].map(m => m[1]).join('\n');
    expect(coarse).toMatch(/\.modal-close[^{]*\{[^}]*44px/);
    expect(coarse).toMatch(/\.seating-reveal-btn/);
  });
  it('S14: „Keine HA“ im dunklen Modus mit dunkler Schrift, Gruppenkennzeichen größer', () => {
    expect(CSS).toMatch(/\.sc-hw-note\{[^}]*color:var\(--hw-note-text\)/);
    expect(CSS).toMatch(/\.seating-group-badge \{[^}]*font-size: 11px/);
  });
  it('S8: HA-Textfeld und Blockname dürfen in eine eigene Zeile umbrechen', () => {
    expect(CSS).toMatch(/\.entry-input\{flex:1 1 \d{3}px/);
    expect(CSS).toMatch(/\.block-name-input\{flex:1 1 \d{3}px/);
    expect(CSS).toMatch(/\.block-row\{[^}]*flex-wrap:wrap/);
  });
  it('S15: Fußzeilen brechen um statt Knöpfe abzuschneiden; Laufzeit-Abzeichen kurz', () => {
    expect(CSS).toMatch(/\.modal-footer\{[^}]*flex-wrap:wrap/);
    const range = app('lessonTimeRange')({ start: '07:45', end: '09:15' }, 'full');
    expect(range).toBeTruthy();
    app('switchView("timetable")');
    const badges = [...document.querySelectorAll('.tt-lesson-badge')].map(b => b.textContent);
    badges.filter(b => /min/.test(b)).forEach(b => expect(b).toMatch(/^noch \d+ min$/));
  });
  it('S15: Farbwahl ohne fast gleiche Töne', () => {
    const colors = app('APP_COLORS');
    const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    let min = Infinity;
    colors.forEach((a, i) => colors.slice(i + 1).forEach(b => {
      const [p, q] = [rgb(a), rgb(b)];
      min = Math.min(min, Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]));
    }));
    expect(min).toBeGreaterThan(40);
  });
});
