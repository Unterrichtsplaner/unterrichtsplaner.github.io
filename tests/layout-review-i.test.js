// Block I (Design-Review 24.09.2026). jsdom misst kein Layout – geprüft werden Markup und Regeln,
// im Browser nachgemessen bei 375/768/1024 px.
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');

const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

// Alle Deklarationen, die style.css für einen Selektor setzt (Regeln ohne Medienabfrage und mit)
function rulesFor(selector) {
  const esc = selector.replace(/[.*+?^${}()|[\]\\#]/g, '\\$&');
  return [...css.matchAll(new RegExp(`(?:^|[}\\s,])${esc}\\s*\\{([^}]*)\\}`, 'g'))].map(m => m[1]).join(';');
}

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const student = (id, firstName, lastName) => ({ id, firstName, lastName, grades: [{ type: 'test', value: '2', date: '2026-09-17', note: 'Test' }],
  attendance: [], participation: [], homework: [], studentNotes: [] });

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify({
    settings: { teacherName: 'Test', school: '', blocks: null },
    lessonSlots: [
      { id: 'sR', day: 3, block: 1, part: 'full', subject: 'Mathematik', room: 'Physiksaal', groupId: 'g1', color: '#6366f1', recurring: 'weekly' },
      { id: 'sF', day: 3, block: 2, part: 'first', subject: 'Mathematik', room: 'R 12', groupId: 'g1', color: '#6366f1', recurring: 'weekly' },
    ],
    lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathematik', className: 'Q1 Leistungskurs', color: '#6366f1', schularbeitWeight: 50 }],
    students: { g1: [student('s1', 'David', 'Fischer-Weißenberger'), student('s2', 'Anna', 'Muster')] },
  }));
  loadApp();
});

describe('I1: Dashboard lässt sich scrollen', () => {
  it('der Inhalt liegt in einem eigenen Scrollbereich unter dem Kopf', () => {
    // .view hat overflow:hidden; vorher hatte der Inhalt gar kein CSS → alles unterhalb des Bildschirms unerreichbar
    const content = document.getElementById('dashboard-content');
    const scroller = content.parentElement;
    expect(scroller.parentElement.id).toBe('view-dashboard');
    expect(scroller.classList.contains('dashboard-scroll')).toBe(true);
    const r = rulesFor('.dashboard-scroll');
    expect(r).toMatch(/flex:\s*1/);
    expect(r).toMatch(/min-height:\s*0/);
    expect(r).toMatch(/overflow-y:\s*auto/);
  });

  it('der Inhalt füllt schmale Bildschirme, Layout steht in style.css statt inline', () => {
    const content = document.getElementById('dashboard-content');
    expect(content.getAttribute('style')).toBeNull();
    const r = rulesFor('#dashboard-content');
    expect(r).toMatch(/width:\s*100%/);      // margin:0 auto ohne width schrumpft den Block (H12)
    expect(r).toMatch(/max-width:\s*800px/);
  });
});

describe('I2: Klassenkarten schneiden nichts ab', () => {
  it('Karten wachsen mit dem Inhalt statt fest quadratisch mit overflow:hidden', () => {
    const r = rulesFor('.subject-group-card');
    expect(r).not.toMatch(/aspect-ratio/);
    expect(r).not.toMatch(/overflow:\s*hidden/);
  });

  it('lange Klassennamen brechen um statt über den Rand zu laufen', () => {
    expect(rulesFor('.sgc-class')).toMatch(/overflow-wrap:\s*anywhere/);
  });

  it('Zahlenreihe bleibt in der Karte (iPad: „NOTEN“ lief rechts hinaus, seit overflow:hidden weg ist)', () => {
    // drei gleich breite Spalten, die schrumpfen dürfen; lange Beschriftungen brechen um
    const r = rulesFor('.sgc-stats');
    expect(r).toMatch(/display:\s*grid/);
    expect(r).toMatch(/grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
    expect(rulesFor('.sgc-stat')).toMatch(/min-width:\s*0/);
    expect(rulesFor('.sgc-stat-label')).toMatch(/overflow-wrap:\s*anywhere/);
  });

  it('Karte zeigt weiterhin alle Teile inkl. Sitzplan-Knopf', () => {
    app('switchView("classes")');
    const card = document.querySelector('.subject-group-card');
    expect(card.textContent).toContain('Q1 Leistungskurs');
    expect(card.textContent).toContain('Sitzplan');
  });
});

describe('I3: Seitenleiste nur per ☰', () => {
  const sidebar = () => document.getElementById('sidebar');
  const origWidth = window.innerWidth;
  afterEach(() => { window.innerWidth = origWidth; sidebar().classList.remove('collapsed'); });

  it('ein Klick in den Inhalt klappt die Leiste nicht mehr zu (Inhalt sprang nach links)', () => {
    expect(html).not.toMatch(/<main[^>]*onclick/);
    expect(document.getElementById('main-content').getAttribute('onclick')).toBeNull();
    document.getElementById('main-content').click();
    expect(sidebar().classList.contains('collapsed')).toBe(false);
  });

  it('☰ schaltet weiterhin um', () => {
    app('toggleSidebar()');
    expect(sidebar().classList.contains('collapsed')).toBe(true);
    app('toggleSidebar()');
    expect(sidebar().classList.contains('collapsed')).toBe(false);
  });

  it('startet auf schmalen Bildschirmen (iPad hochkant) zugeklappt, sonst offen', () => {
    for (const [w, collapsed] of [[768, true], [1023, true], [1024, false], [1440, false], [375, false]]) {
      window.innerWidth = w;
      sidebar().classList.remove('collapsed');
      app('applyInitialSidebar()');
      expect(sidebar().classList.contains('collapsed'), `${w} px`).toBe(collapsed);
    }
  });

  it('auf dem Handy bleibt die Leiste oben volle Breite, auch zugeklappt', () => {
    const phone = css.match(/@media\s*\(max-width:\s*600px\)\s*\{([^@]*?)\n\}/)[1];
    expect(phone).toMatch(/#sidebar\.collapsed\s*\{[^}]*width:\s*100%/);
  });
});

// Inhalt aller Regeln innerhalb von @media (max-width: 600px) { … }
const phoneCss = () => css.match(/@media\s*\(max-width:\s*600px\)\s*\{([^@]*?)\n\}/g).join('\n');

describe('I6: Raum geht in der Stundenplan-Kachel nicht verloren', () => {
  const cell = (block) => app(`buildTimetableCell(parseDate("2026-09-24"), 3, getBlocks()[${block}], timetableClock(new Date(2026, 8, 24, 20, 0)))`);

  it('ganze Stunde: Raum steht in eigener Zeile unter dem Fach (wurde sonst als erstes abgeschnitten)', () => {
    const el = cell(0);
    const room = el.querySelector('.tt-lesson-subject .tt-lesson-room');
    expect(room.textContent).toBe('Physiksaal');
    expect(el.querySelector('.tt-lesson-subject').textContent).toContain('Mathematik');
    expect(rulesFor('.tt-lesson-subject > span')).toMatch(/display:\s*block/);
    expect(rulesFor('.tt-lesson-subject > span')).toMatch(/text-overflow:\s*ellipsis/);
  });

  it('halbe Stunde (wenig Höhe): Fach und Raum weiter in einer Zeile mit „·“', () => {
    expect(cell(1).querySelector('.tt-split-half .tt-lesson-room').textContent).toBe('R 12');
    expect(css).toMatch(/\.tt-split-half \.tt-lesson-subject > span\s*\{[^}]*display:\s*inline/);
    expect(css).toMatch(/\.tt-split-half [^{]*\.tt-lesson-room::before\s*\{[^}]*content:\s*' · '/);
  });

  it('Raum und Fach laufen weiter durch escHtml', () => {
    app('db.lessonSlots[0].room = "<b>x</b>"');
    expect(cell(0).querySelector('.tt-lesson-room b')).toBeNull();
    app('db.lessonSlots[0].room = "Physiksaal"');
  });
});

describe('I7: Klassenansicht auf iPad hochkant und Handy', () => {
  beforeAll(() => app('openGroupStudents("g1", "grades")'));

  it('Reiter brechen um, statt „Anwesenheit“/„Hausaufgaben“ rechts abzuschneiden', () => {
    const tabs = document.querySelector('#view-students .class-tabs');
    expect(tabs.querySelectorAll('.tab-btn')).toHaveLength(5);
    expect(tabs.getAttribute('style')).toBeNull();
    expect(rulesFor('.class-tabs')).toMatch(/flex-wrap:\s*wrap/);
  });

  it('Namensspalte: fest links, Layout in style.css statt inline', () => {
    const th = document.querySelector('#overview-content th.ov-name-col');
    const td = [...document.querySelectorAll('#overview-content td.ov-name')].find(t => t.textContent.includes('David'));
    expect(th.getAttribute('style')).toBeNull();
    expect(td.getAttribute('style')).toBeNull();
    expect(td.querySelector('.ov-name-text').textContent).toContain('Fischer-Weißenberger');
    expect(td.querySelector('.ov-name-text').title).toContain('Fischer-Weißenberger');
    expect(rulesFor('.overview-table .ov-name-col')).toMatch(/position:\s*sticky/);
    expect(document.getElementById('overview-content').getAttribute('style')).toBeNull();
  });

  it('schmale Tabelle: lange Namen werden gekürzt, damit Notenspalten Platz haben', () => {
    expect(rulesFor('#overview-content')).toMatch(/container-type:\s*inline-size/);
    const block = css.match(/@container\s*\(max-width:\s*\d+px\)\s*\{[^@]*\.ov-name-text\s*\{([^}]*)\}/);
    expect(block).not.toBeNull();
    expect(block[1]).toMatch(/max-width:\s*\d+px/);
    expect(block[1]).toMatch(/text-overflow:\s*ellipsis/);
  });

  it('alle Tabellen-Reiter nutzen dieselbe Namensspalte', () => {
    for (const tab of ['participation', 'attendance', 'homework']) {
      app(`switchClassDashboardTab("${tab}")`);
      expect(document.querySelector('#overview-content td.ov-name .ov-name-text'), tab).not.toBeNull();
      expect(document.querySelector('#overview-content td[style*="sticky"]'), tab).toBeNull();
    }
  });
});

describe('I19: Navigation auf dem Handy', () => {
  it('Logo und ☰ sind oben ausgeblendet (Inline-display:flex hat display:none überstimmt)', () => {
    expect(document.querySelector('#sidebar .sidebar-header').getAttribute('style')).toBeNull();
    expect(rulesFor('.sidebar-header')).toMatch(/display:\s*flex/);
    expect(phoneCss()).toMatch(/\.sidebar-header\s*\{[^}]*display:\s*none/);
  });

  it('die aktive Pille ist nicht höher als die Leiste (Fußbereich hatte feste 80 px)', () => {
    expect(phoneCss()).toMatch(/\.sidebar-footer\s*\{[^}]*height:\s*auto/);
    expect(phoneCss()).toMatch(/\.nav-items\s*\{[^}]*align-items:\s*center/);
  });
});

describe('I20: Sitzplan-Bedienelemente', () => {
  it('Tag-Kürzel in der Datumsleiste sind lesbar (vorher 8 px)', () => {
    const size = parseFloat(rulesFor('.date-chip-day').match(/font-size:\s*([\d.]+)px/)[1]);
    expect(size).toBeGreaterThanOrEqual(10);
  });

  it('Timer −/+ sind echte Minuszeichen in lesbarer Größe', () => {
    const steps = [...document.querySelectorAll('#view-seating .timer-step')];
    expect(steps.map(b => b.textContent.trim())).toEqual(['−', '+']);
    steps.forEach(b => expect(b.getAttribute('aria-label')).toMatch(/Minute/));
    const size = parseFloat(rulesFor('.timer-step').match(/font-size:\s*([\d.]+)px/)[1]);
    expect(size).toBeGreaterThanOrEqual(18);
  });

  it('Handy: winzige Karten nutzen die Zelle besser aus (weniger Abstand, mehr Platz für den Namen)', () => {
    const wrapper = document.getElementById('seating-canvas-wrapper');
    Object.defineProperty(wrapper, 'clientWidth', { configurable: true, value: 370 });
    Object.defineProperty(wrapper, 'clientHeight', { configurable: true, value: 315 });
    try {
      app('db.groups[0].seatingCols = 6; db.groups[0].seatingRows = 5; switchView("seating"); currentSeatingGroupId = "g1"; renderSeatingPlan()');
      const card = document.querySelector('.seating-card');
      expect(card.classList.contains('tiny')).toBe(true);
      const cell = Math.floor((370 - 40) / 6);     // 55 px
      expect(parseFloat(card.style.width)).toBeGreaterThanOrEqual(cell - 6);
    } finally {
      delete wrapper.clientWidth; delete wrapper.clientHeight;
    }
  });
});

// Regeln, die nur im hellen Modus gelten
const lightRules = sel => {
  const esc = sel.replace(/[.*+?^${}()|[\]\\#]/g, '\\$&');
  return [...css.matchAll(new RegExp(`:root\\[data-theme="light"\\][^{]*?${esc}\\s*\\{([^}]*)\\}`, 'g'))].map(m => m[1]).join(';');
};

describe('I4: heller Modus hat genug Kontrast', () => {
  it('Notenfarben haben im hellen Modus eigene, dunklere Werte', () => {
    const light = css.match(/:root\[data-theme="light"\]\s*\{([^}]*)\}/)[1];
    for (let i = 1; i <= 5; i++) expect(light, `--grade-${i}`).toMatch(new RegExp(`--grade-${i}:\\s*#[0-9a-f]{6}`));
  });

  it('Klassenfarbe als Text wird im hellen Modus abgedunkelt (Kachel, Klassenkarte)', () => {
    expect(lightRules('.tt-lesson')).toMatch(/color:\s*color-mix\(in srgb,\s*var\(--lesson-color\)\s*50%,\s*#000\)/);
    expect(lightRules('.sgc-class')).toMatch(/color:\s*color-mix\(in srgb,\s*var\(--card-color[^)]*\)\)\s*50%,\s*#000\)/);
    expect(lightRules('.tt-lesson-subject')).toMatch(/opacity:\s*1/);   // Transparenz kostete weiteren Kontrast
  });

  it('Kachel setzt die Farbe nicht mehr inline (sonst greift der helle Modus nicht)', () => {
    const el = app('buildTimetableCell(parseDate("2026-09-24"), 3, getBlocks()[0], timetableClock(new Date(2026, 8, 24, 20, 0)))')
      .querySelector('.tt-lesson');
    expect(el.getAttribute('style')).not.toMatch(/(^|;)\s*color:/);
    expect(el.style.getPropertyValue('--lesson-color')).toBe('#6366f1');
    expect(rulesFor('.tt-lesson')).toMatch(/color:\s*var\(--lesson-color\)/);
  });
});

describe('I5: gestrichelt heißt nur noch „hier anlegen“', () => {
  it('nächste Stunde: durchgezogener, dezenter Rahmen statt gestrichelt', () => {
    const r = rulesFor('.tt-lesson.next');
    expect(r).not.toMatch(/dashed/);
    expect(r).toMatch(/outline:[^;]*solid/);
  });

  it('Dashboard „Nächste Stunde“: Farbbalken links wie bei den anderen Stunden, nicht als Warnbalken oben', () => {
    const r = rulesFor('.dash-next');
    expect(r).not.toMatch(/border-top:/);
    expect(r).toMatch(/border-left:\s*4px solid var\(--lesson-color\)/);
  });
});

describe('I21: Toasts verdecken keine Knöpfe', () => {
  it('oben mittig und durchklickbar', () => {
    const r = rulesFor('#toast-container');
    expect(r).toMatch(/pointer-events:\s*none/);
    expect(r).toMatch(/top:/);
    expect(r).not.toMatch(/right:\s*22px/);
    expect(document.getElementById('toast-container').getAttribute('aria-live')).toBe('polite');
  });
});
