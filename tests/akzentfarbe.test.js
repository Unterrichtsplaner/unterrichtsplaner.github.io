// Eigene Akzentfarbe (BUGS W5): Weiß auf Gelb, Mint oder Himmelblau war kaum lesbar (1,7–2,1:1), der Akzent als Schrift
// auf hellen Karten ebenso, und Nebenfarben (Darüberfahren, Markierung) blieben Indigo. Jetzt rechnet accentThemeVars
// alles aus dem Akzent; das Kopf-Skript in index.html (vor dem ersten Zeichnen) muss dasselbe ergeben.
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const ACCENTS = [...html.matchAll(/selectThemeAccent\(this, '(#[0-9a-f]{6})'\)/gi)].map(m => m[1]);
const BGS = [...html.matchAll(/selectThemeBg\(this, '(#[0-9a-f]{6})', '(light|dark)', '(#[0-9a-f]{6})'\)/gi)].map(m => ({ bg: m[1], mode: m[2], card: m[3] }));
BGS.push({ bg: '#bfdbfe', mode: 'light', card: '#dbeafe' });   // Standard (Eisblau)

const rgb = h => [0, 2, 4].map(i => parseInt(h.slice(1).substr(i, 2), 16));
const lum = c => { const v = c.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const ratio = (a, b) => { const x = lum(rgb(a)), y = lum(rgb(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const vars = (accent, mode, surfaces) => app(`accentThemeVars(${JSON.stringify(accent)}, ${JSON.stringify(mode)}, ${JSON.stringify(surfaces)})`);
const root = () => document.documentElement.style;
const ALL = ['--accent', '--accent-hover', '--accent-glow', '--accent-soft', '--on-accent', '--text-accent', '--border-active'];

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify({ settings: { blocks: null }, lessonSlots: [], lessonData: {}, groups: [], students: {} }));
  loadApp();
});

describe('Schrift auf dem Akzent', () => {
  it('Gelb, Mint, Himmelblau, Orange, Rosa: dunkle Schrift; Weinrot: weiße', () => {
    ['#eab308', '#4ade80', '#38bdf8', '#fb923c', '#fb7185'].forEach(a => expect(vars(a, 'light', [])['--on-accent'], a).toBe('#14171f'));
    expect(vars('#be123c', 'light', [])['--on-accent']).toBe('#ffffff');
  });
  it('für jede angebotene Akzentfarbe die lesbarere der beiden Schriften, mindestens 4,4:1', () => {
    expect(ACCENTS.length).toBeGreaterThanOrEqual(6);
    ACCENTS.forEach(a => {
      const on = vars(a, 'light', [])['--on-accent'];
      expect(ratio(on, a), a).toBeGreaterThanOrEqual(Math.max(ratio('#ffffff', a), ratio('#14171f', a)) - 0.001);
      expect(ratio(on, a), a).toBeGreaterThanOrEqual(4.4);
    });
  });
});

describe('Akzent als Schrift (heute, aktive Spalte, Links)', () => {
  it('auf jeder Karte und jedem Hintergrund mindestens 4,5:1', () => {
    ACCENTS.forEach(a => BGS.forEach(({ bg, mode, card }) => {
      const t = vars(a, mode, [bg, card])['--text-accent'];
      expect(ratio(t, bg), `${a} auf ${bg}`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(t, card), `${a} auf ${card}`).toBeGreaterThanOrEqual(4.5);
    }));
  });
  it('schon lesbare Akzente bleiben unverändert', () => {
    expect(vars('#be123c', 'light', ['#ffffff'])['--text-accent']).toBe('#be123c');
  });
});

describe('Nebenfarben folgen dem Akzent', () => {
  it('Darüberfahren, Markierung, Rahmen aus dem Akzent statt Indigo', () => {
    const v = vars('#fb7185', 'light', []);
    expect(v['--accent-soft']).toBe('rgba(251,113,133,0.09)');
    expect(v['--border-active']).toBe('rgba(251,113,133,0.4)');
    expect(v['--accent-hover']).not.toBe('#fb7185');
    expect(vars('#fb7185', 'dark', [])['--accent-soft']).toBe('rgba(251,113,133,0.15)');
  });
  it('applyThemePreview setzt alle Werte, ohne eigenen Akzent sind alle weg (Standard aus style.css)', () => {
    app("db.settings.themeAccent = '#eab308'; applyThemePreview()");
    ALL.forEach(v => expect(root().getPropertyValue(v), v).not.toBe(''));
    expect(root().getPropertyValue('--on-accent')).toBe('#14171f');
    app('delete db.settings.themeAccent; applyThemePreview()');
    ALL.forEach(v => expect(root().getPropertyValue(v), v).toBe(''));
  });
});

describe('Kopf-Skript in index.html rechnet wie die App', () => {
  const head = html.match(/<script>\s*(\/\/ Farben vor dem ersten Zeichnen[\s\S]*?)<\/script>/)[1];
  it.each([
    ['hell, Standard-Hintergrund', { themeAccent: '#38bdf8' }],
    ['dunkel, Tiefsee', { themeAccent: '#be123c', themeBg: '#0f172a', themeCard: '#1e293b', theme: 'dark' }],
    ['hell, Creme', { themeAccent: '#eab308', themeBg: '#fae8b4', themeCard: '#fdf4d8', theme: 'light' }],
  ])('%s', (_, settings) => {
    const saved = localStorage.getItem('lehrerapp_v3');
    localStorage.setItem('lehrerapp_v3', JSON.stringify({ settings }));
    ALL.forEach(v => root().removeProperty(v));
    new Function(head)();
    const fromHead = Object.fromEntries(ALL.map(v => [v, root().getPropertyValue(v)]));
    localStorage.setItem('lehrerapp_v3', saved);
    app(`Object.assign(db.settings, ${JSON.stringify(settings)}); applyThemePreview()`);
    const fromApp = Object.fromEntries(ALL.map(v => [v, root().getPropertyValue(v)]));
    expect(fromHead).toEqual(fromApp);
    app("['themeAccent', 'themeBg', 'themeCard', 'theme'].forEach(k => delete db.settings[k]); applyThemePreview()");
  });
});
