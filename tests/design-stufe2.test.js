// Anti-Slop Stufe 2 (BUGS AE4–AE6): Richtung „Papier & Tinte“, sparsamer Akzent, Rundungen und Schriftgrößen mit System
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const JS = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const rule = sel => { const i = CSS.indexOf(sel + '{'); return i < 0 ? '' : CSS.slice(i, CSS.indexOf('}', i)); };
const rootVar = name => document.documentElement.style.getPropertyValue(name);

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify({ settings: { teacherName: 'T', blocks: null, themeAccent: '#6366f1' }, lessonSlots: [], lessonData: {}, groups: [], students: {} }));
  loadApp();
});

describe('Grundwerte', () => {
  it('Tinten-Blau als Akzent, warmes Dunkel, Schrift auf Akzent als eigener Wert', () => {
    expect(CSS).toMatch(/--accent:\s*#3d63dd/);
    expect(CSS).toMatch(/--bg-primary:\s*#14120f/);
    expect(CSS).toMatch(/--on-accent:\s*#ffffff/);
    expect(CSS).not.toMatch(/#6366f1/i);               // altes Baukasten-Indigo ist raus
    expect(rule('.btn-primary')).toMatch(/color:var\(--on-accent\)/);
  });
  it('Überschriften in der Buchschrift (Systemschriften, kein Download)', () => {
    expect(CSS).toMatch(/--font-display:\s*'Iowan Old Style'/);
    expect(rule('.view-header h1')).toMatch(/font-family:var\(--font-display\)/);
    expect(rule('.modal-header h2')).toMatch(/font-family:var\(--font-display\)/);
    expect(CSS).not.toMatch(/fonts\.googleapis\.com[^;]*(Iowan|Palatino)/);
  });
});

describe('Ordnung', () => {
  it('Schriftgrößen nur aus der Reihe 10/11/12/13/14/16/20/26 (+ Restzeit 36, große Symbole)', () => {
    const allowed = new Set(['10', '11', '12', '13', '14', '16', '20', '26', '36', '44', '48']);
    const used = [...(CSS + HTML + JS).matchAll(/font-size:\s*([0-9.]+)px/g)].map(m => m[1]);
    expect(used.filter(v => !allowed.has(v))).toEqual([]);
  });
  it('Rundungen über Grundwerte; Knöpfe keine Pillen mehr', () => {
    expect([...(CSS + HTML + JS).matchAll(/border-radius:\s*(\d+)px/g)].map(m => m[1]).filter(v => v !== '99' && v !== '100')).toEqual([]);
    for (const sel of ['.btn-primary', '.btn-secondary', '.btn-heute', '.btn-danger-outline', '.tab-btn', '.week-label']) {
      expect(rule(sel), sel).toMatch(/border-radius:var\(--radius-sm\)/);
    }
  });
  it('Etiketten nicht in Großbuchstaben', () => {
    expect(rule('.form-group label')).not.toMatch(/uppercase/);
    expect(rule('.form-group .group-label')).not.toMatch(/uppercase/);
  });
});

describe('Akzent sparsam', () => {
  it('Menü und Reiter zeigen „gewählt“ ohne Akzentfläche, Namen in Tabellen in normaler Schrift', () => {
    expect(rule('.nav-item.active')).not.toMatch(/accent/);                 // auch keine farbige Kante links
    expect(rule('.tab-btn.active')).not.toMatch(/accent/);
    expect(rule('.overview-table td.ov-name')).toMatch(/color:var\(--text-primary\)/);
  });
  it('„Sitzplan“ in der Klassenübersicht: beschrifteter, gut treffbarer Knopf – aber kein Akzent', () => {
    expect(JS).toMatch(/<button class="btn-secondary cr-seating-btn" title="Sitzplan"[^>]*openSeatingForGroup\(\$\{jsArg\(g\.id\)\}\)">\$\{icon\('seating'\)\}<span>Sitzplan<\/span><\/button>/);
    expect(rule('.cr-seating-btn')).toMatch(/min-height:40px/);
  });
});

describe('Farbwahl in den Einstellungen', () => {
  it('altes gespeichertes Indigo = Standard: keine feste Farbe, das Feld „Tinte (Standard)“ ist markiert', () => {
    app('updateAppliedThemeFromDB()');
    expect(rootVar('--accent')).toBe('');
    app('openSettings()');
    expect(document.querySelector('.settings-swatch-accent.selected').title).toBe('Tinte (Standard)');
    app('closeModal("modal-settings")');
  });
  it('Speichern mit Standard legt keine Farbe ab; eine gewählte Farbe bleibt', () => {
    app('openSettings(); saveSettings()');
    expect('themeAccent' in app('db.settings')).toBe(false);
    app('openSettings()');
    app(`selectThemeAccent(document.querySelector('.settings-swatch-accent[data-color="#6466f1"]'), "#6466f1")`);
    app('saveSettings()');
    expect(app('db.settings.themeAccent')).toBe('#6466f1');            // „Indigo“ bewusst gewählt
    expect(rootVar('--accent')).toBe('#6466f1');
  });
  it('Standard ist hell mit Eisblau; „Standard (dunkel)“ und Periwinkle gibt es nicht mehr, „Dunkel“ schon', () => {
    expect(HTML).toMatch(/data-color="" data-mode="light" data-card="" title="Eisblau \(Standard\)"/);
    expect(HTML).not.toMatch(/Standard \(dunkel\)|Periwinkle|Dämmerung/);
    expect(HTML).toMatch(/title="Dunkel"/);
    expect(HTML).toMatch(/<html lang="de" data-theme="light">/);
  });
  it('heller „Papier“ wählbar', () => {
    expect(HTML).toMatch(/data-color="#f5f1e9" data-mode="light" data-card="#fffdf8" title="Papier \(hell\)"/);
  });
});

describe('Kontrast im hellen Standard (Eisblau) und auf allen hellen Farbfeldern', () => {
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  it('leise Schrift, Notenfarben und Statusfarben ≥ 4,5:1', () => {
    const light = CSS.match(/:root\[data-theme="light"\]\s*\{([^}]*)\}/)[1];
    const v = name => light.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i'))[1];
    const fgs = ['--text-secondary', '--text-muted', '--text-accent', '--grade-1', '--grade-2', '--grade-3', '--grade-4', '--grade-5', '--success', '--warning', '--danger'].map(v);
    const bgs = [...HTML.matchAll(/settings-swatch-bg[^>]*style="background:(#[0-9a-f]{6});[^>]*data-mode="light"/gi)].map(m => m[1]);
    expect(bgs).toContain('#bfdbfe');
    for (const bg of bgs) for (const fg of fgs) expect(ratio(fg, bg), `${fg} auf ${bg}`).toBeGreaterThanOrEqual(4.5);
  });
});

describe('Bedienbarkeit (Web-Richtlinien, 02.11.2026)', () => {
  it('kein transition: all, „Bewegung reduzieren“ wird beachtet, sichtbarer Tastatur-Fokus', () => {
    expect(CSS).not.toMatch(/transition:\s*all/);
    expect(CSS).toMatch(/@media \(prefers-reduced-motion: reduce\)\{[^@]*animation-duration:\.01ms/);
    expect(CSS).toMatch(/button:focus-visible,\[role="button"\]:focus-visible[^{]*\{outline:2px solid var\(--accent\)/);
  });
  it('„…“ statt „...“ in sichtbaren Texten; theme-color vorhanden; Cockpit liest den Countdown nicht ständig vor', () => {
    expect(HTML).not.toMatch(/placeholder="[^"]*\.\.\."/);
    expect(HTML).not.toMatch(/>[^<]*\.\.\.</);
    expect(JS).not.toMatch(/showToast\('[^']*\.\.\.'/);
    expect(HTML).toMatch(/<meta name="theme-color" content="#bfdbfe" \/>/);
    expect(HTML).not.toMatch(/id="seating-cockpit"[^>]*aria-live/);
  });
  it('Schülerzeilen per Tastatur erreichbar', () => {
    expect(JS).toMatch(/row\.className = 'student-row';\s*row\.setAttribute\('role', 'button'\);\s*row\.tabIndex = 0;/);
  });
});
