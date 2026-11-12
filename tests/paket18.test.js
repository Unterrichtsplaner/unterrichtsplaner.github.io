// X2 und W15 (alte Punkte, nachgeprüft 12.11.2026): Rahmen im hellen Modus und Farben beim Start.
const fs = require('fs'), path = require('path');
const { loadApp, app } = require('./helpers/load-app');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.json'), 'utf8'));
const root = () => document.documentElement.style;
const VARS = ['--bg-primary', '--sidebar-bg', '--bg-secondary', '--bg-card', '--bg-elevated'];

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify({ settings: { blocks: null }, lessonSlots: [], lessonData: {}, groups: [], students: {} })); loadApp(); });

describe('X2: kein schwarzer Rahmen, lesbare Statusleiste', () => {
  it('Seitenhintergrund folgt der App-Farbe, kein fester schwarzer Wert', () => {
    expect(css).not.toMatch(/#050505/);
    expect(css).toMatch(/html,body\{[^}]*background:color-mix\(in srgb, var\(--bg-primary\)/);
  });
  it('kein „black-translucent“, Manifest in der hellen Standardfarbe', () => {
    expect(html).not.toMatch(/black-translucent/);
    expect(manifest.theme_color).toBe('#bfdbfe');
  });
});

describe('W15: Kopf-Skript setzt dieselben Hintergründe wie die App', () => {
  const head = html.match(/<script>\s*(\/\/ Farben vor dem ersten Zeichnen[\s\S]*?)<\/script>/)[1];
  it.each([
    ['früheres Dunkel-Standard #0f1117', { themeBg: '#0f1117', themeCard: '#1e2130' }],
    ['eigener Hintergrund mit Karte', { themeBg: '#fae8b4', themeCard: '#fdf4d8', theme: 'light' }],
    ['Standard', {}],
  ])('%s', (_, settings) => {
    const saved = localStorage.getItem('lehrerapp_v3');
    localStorage.setItem('lehrerapp_v3', JSON.stringify({ settings }));
    VARS.forEach(v => root().removeProperty(v));
    new Function(head)();
    const fromHead = Object.fromEntries(VARS.map(v => [v, root().getPropertyValue(v)]));
    localStorage.setItem('lehrerapp_v3', saved);
    app(`Object.assign(db.settings, ${JSON.stringify(settings)}); applyThemePreview()`);
    const fromApp = Object.fromEntries(VARS.map(v => [v, root().getPropertyValue(v)]));
    expect(fromHead).toEqual(fromApp);
    app("['themeBg', 'themeCard', 'theme'].forEach(k => delete db.settings[k]); applyThemePreview()");
  });
});
