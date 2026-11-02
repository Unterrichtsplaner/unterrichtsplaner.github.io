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
  });
});

describe('Akzent sparsam', () => {
  it('Menü und Reiter zeigen „gewählt“ ohne Akzentfläche, Namen in Tabellen in normaler Schrift', () => {
    expect(rule('.nav-item.active')).not.toMatch(/accent-soft|text-accent/);
    expect(rule('.tab-btn.active')).not.toMatch(/accent/);
    expect(rule('.overview-table td.ov-name')).toMatch(/color:var\(--text-primary\)/);
  });
  it('„Sitzplan“ auf den Klassenkarten ist kein Hauptknopf', () => {
    expect(JS).toMatch(/class="btn-secondary"[^>]*openSeatingForGroup\(\$\{jsArg\(g\.id\)\}\)">\$\{icon\('seating'\)\}Sitzplan/);
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
  it('heller Standard „Papier“ wählbar', () => {
    expect(HTML).toMatch(/data-color="#f5f1e9" data-mode="light" data-card="#fffdf8" title="Papier \(hell\)"/);
  });
});
