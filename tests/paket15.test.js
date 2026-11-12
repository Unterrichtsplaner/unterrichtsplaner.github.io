// Gesamtprüfung 11.11.2026, Paket 15 (grün): Oberfläche. AU8–AU15.
const fs = require('fs'), path = require('path');
const { loadApp, loadScript, app } = require('./helpers/load-app');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
const scss = fs.readFileSync(path.join(__dirname, '..', 'schueler.css'), 'utf8');
const root = () => document.documentElement.style;

function sampleDB() {
  return { settings: { teacherName: 'T', blocks: null }, lessonSlots: [], lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50 }], students: { g1: [] } };
}
beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); loadScript('schueler.js'); });

describe('AU8: Kopf-Skript wie die App', () => {
  const head = html.match(/<script>\s*(\/\/ Farben vor dem ersten Zeichnen[\s\S]*?)<\/script>/)[1];
  const run = settings => {
    const saved = localStorage.getItem('lehrerapp_v3');
    localStorage.setItem('lehrerapp_v3', JSON.stringify({ settings }));
    ['--accent', '--radius-md', '--radius-sm'].forEach(v => root().removeProperty(v));
    new Function(head)();
    localStorage.setItem('lehrerapp_v3', saved);
  };
  it('früheres Indigo (#6366f1) gilt als Standard', () => {
    run({ themeAccent: '#6366f1' });
    expect(root().getPropertyValue('--accent')).toBe('');
  });
  it('ohne gespeicherte Rundung: Standard 8 wie der Regler der App', () => {
    run({});
    expect(root().getPropertyValue('--radius-md')).toBe('8px');
    expect(root().getPropertyValue('--radius-sm')).toBe('6px');
  });
});

describe('AU9: Master-Passwort mit dem „Auge“', () => {
  it('sichtbar gemacht: keine Autokorrektur, kein großer Anfangsbuchstabe, keine Rechtschreibprüfung', () => {
    const input = document.getElementById('sync-master-password');
    app('setPasswordVisible(document.getElementById("sync-master-password"), true)');
    expect(input.type).toBe('text');
    expect(input.getAttribute('autocapitalize')).toBe('none');
    expect(input.getAttribute('autocorrect')).toBe('off');
    expect(input.getAttribute('spellcheck')).toBe('false');
    app('setPasswordVisible(document.getElementById("sync-master-password"), false)');
  });
});

describe('AU10: Farbfelder auf Touch-Geräten', () => {
  it('Spalten so breit wie die Felder', () => {
    expect(css).toMatch(/@media \(pointer: coarse\)\s*\{\s*#lesson-color-picker,\s*#group-color-picker\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fill,\s*var\(--control-h\)\)/);
  });
});

describe('AU11: Texte im Stunden-Fenster markierbar', () => {
  it('jeder Selektor im Block „Markieren (AH17)“ trifft ein Element', () => {
    const start = css.indexOf('#overview-content, #sw-more');
    const sels = css.slice(start, css.indexOf('{', start)).split(',').map(x => x.trim()).filter(Boolean);
    // Fenster und Bereiche aus index.html (mit #) müssen im Markup existieren; Klassen entstehen erst beim Zeichnen
    sels.filter(x => x.startsWith('#')).forEach(sel => expect(document.querySelector(sel), sel).not.toBeNull());
    expect(sels).toContain('#lesson-notes-form');
  });
});

describe('AU12: Datenschutzhinweise mit Breite', () => {
  it('Fenster hat eine Größenklasse', () => {
    expect(html).toMatch(/id="modal-privacy"[^>]*>\s*<div class="modal modal-(small|wide)/);
  });
});

describe('AU13: Rückblick-Karte mit vielen Stunden', () => {
  it('Raster mit mehr Spalten bei vielen Stunden, große Zahl begrenzt', () => {
    expect(scss).toMatch(/\.st-grid \{[^}]*repeat\(var\(--gcols, 10\)/);
    expect(scss).toMatch(/\.st-huge \{[^}]*font-size: min\(176px, 20dvh\)/);
  });
});

describe('AU14: Datum je Spalte nur einmal formatiert', () => {
  it('formatWeekdayShort liefert dasselbe wie vorher, mit einem einmal angelegten Formatierer', () => {
    expect(app('formatWeekdayShort("2026-11-11")')).toBe(new Date(2026, 10, 11, 12).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }));
    expect(app('typeof WEEKDAY_SHORT_FMT')).toBe('object');
  });
});

describe('AU15: Druckbereich nach dem Drucken leer', () => {
  it('nach „afterprint“ steht nichts mehr drin', () => {
    document.getElementById('print-area').innerHTML = '<div class="rp">Noten</div>';
    window.dispatchEvent(new Event('afterprint'));
    expect(document.getElementById('print-area').innerHTML).toBe('');
  });
});
