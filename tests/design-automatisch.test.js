// „Automatisch (wie Gerät)“ (BUGS X6): Eisblau wie der Standard, bei dunkel eingestelltem Gerät Tiefsee.
// Nur auf Wunsch (eigenes Farbfeld), Standard bleibt Eisblau. Gespeichert als themeAuto ohne themeBg,
// damit ältere App-Versionen auf anderen Geräten einfach Eisblau zeigen.
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const head = html.match(/<script>\s*(\/\/ Farben vor dem ersten Zeichnen[\s\S]*?)<\/script>/)[1];
let dark = false;
const listeners = [];
const root = () => document.documentElement;
const bgNow = () => root().style.getPropertyValue('--bg-primary');
const autoEl = () => document.querySelector('.settings-swatch-bg[data-color="auto"]');
const deviceTurns = d => { dark = d; listeners.forEach(f => f({ matches: d })); };

beforeAll(() => {
  window.matchMedia = q => ({
    matches: q === '(prefers-color-scheme: dark)' ? dark : false, media: q,
    addEventListener: (t, f) => { if (q === '(prefers-color-scheme: dark)') listeners.push(f); }, removeEventListener() {},
    addListener() {}, removeListener() {},
  });
  localStorage.setItem('lehrerapp_v3', JSON.stringify({ settings: { blocks: null }, lessonSlots: [], lessonData: {}, groups: [], students: {} }));
  loadApp();
});
beforeEach(() => {
  dark = false;
  app("['themeAuto', 'themeBg', 'themeCard', 'theme', 'themeAccent'].forEach(k => delete db.settings[k]); loadThemeSelection(); applyThemePreview()");
});

describe('Feld „Automatisch“ in den Einstellungen', () => {
  it('gibt es, mit Namen für Vorlesehilfen', () => {
    expect(autoEl()).not.toBeNull();
    expect(autoEl().getAttribute('aria-label')).toMatch(/Automatisch/);
  });
  it('Speichern merkt sich themeAuto, keine Farbe; eine Farbe danach hebt es wieder auf', () => {
    app('openSettings()');
    app('selectThemeBg(document.querySelector(\'.settings-swatch-bg[data-color="auto"]\'), "auto", "light", "")');
    app('saveSettings()');
    expect(app('db.settings.themeAuto')).toBe(true);
    expect(app('db.settings.themeBg')).toBeUndefined();
    app('openSettings()');
    expect(autoEl().classList.contains('selected')).toBe(true);
    app('selectThemeBg(document.querySelector(\'.settings-swatch-bg[data-color="#0f172a"]\'), "#0f172a", "dark", "#1e293b")');
    app('saveSettings()');
    expect(app('db.settings.themeAuto')).toBeUndefined();
    expect(app('db.settings.themeBg')).toBe('#0f172a');
  });
});

describe('Folgt dem Gerät', () => {
  it('Gerät hell: Eisblau, hell', () => {
    app('db.settings.themeAuto = true; loadThemeSelection(); applyThemePreview()');
    expect(root().getAttribute('data-theme')).toBe('light');
    expect(bgNow()).toBe('#bfdbfe');
  });
  it('Gerät dunkel: Tiefsee, dunkel', () => {
    dark = true;
    app('db.settings.themeAuto = true; loadThemeSelection(); applyThemePreview()');
    expect(root().getAttribute('data-theme')).toBe('dark');
    expect(bgNow()).toBe('#0f172a');
    expect(root().style.getPropertyValue('--bg-card')).toBe('#1e293b');
  });
  it('wechselt das Gerät, während die App offen ist, geht sie sofort mit', () => {
    app('db.settings.themeAuto = true; loadThemeSelection(); applyThemePreview()');
    deviceTurns(true);
    expect(root().getAttribute('data-theme')).toBe('dark');
    deviceTurns(false);
    expect(bgNow()).toBe('#bfdbfe');
  });
  it('ohne „Automatisch“ bleibt alles wie bisher: Standard Eisblau auch bei dunklem Gerät', () => {
    deviceTurns(true);
    app('applyThemePreview()');
    expect(root().getAttribute('data-theme')).toBe('light');
    expect(bgNow()).toBe('#bfdbfe');
  });
  it('eigene Akzentfarbe wird für den dunklen Modus neu berechnet', () => {
    app("db.settings.themeAuto = true; db.settings.themeAccent = '#be123c'; loadThemeSelection(); applyThemePreview()");
    const light = root().style.getPropertyValue('--text-accent');
    deviceTurns(true);
    expect(root().style.getPropertyValue('--text-accent')).not.toBe(light);
  });
});

describe('Kopf-Skript in index.html rechnet wie die App', () => {
  it.each([[false], [true]])('Gerät dunkel: %s', d => {
    dark = d;
    const settings = { themeAuto: true, themeAccent: '#38bdf8' };
    const saved = localStorage.getItem('lehrerapp_v3');
    localStorage.setItem('lehrerapp_v3', JSON.stringify({ settings }));
    root().removeAttribute('style');
    new Function(head)();
    const fromHead = [root().getAttribute('data-theme'), bgNow(), root().style.getPropertyValue('--bg-card'), root().style.getPropertyValue('--text-accent')];
    localStorage.setItem('lehrerapp_v3', saved);
    app(`Object.assign(db.settings, ${JSON.stringify(settings)}); loadThemeSelection(); applyThemePreview()`);
    expect([root().getAttribute('data-theme'), bgNow(), root().style.getPropertyValue('--bg-card'), root().style.getPropertyValue('--text-accent')]).toEqual(fromHead);
  });
});
