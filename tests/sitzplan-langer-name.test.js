// BUGS AW1: Ein langer Klassenname darf die Leiste oben im Sitzplan nicht aus dem Bild schieben.
// jsdom misst kein Layout: Hier stehen die CSS-Regeln, die das verhindern; nachgemessen im Browser (375–1366 px).
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');
const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
const rule = sel => {   // alle Regeln für genau diesen Selektor, zusammengefügt
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...css.matchAll(new RegExp(`(?:^|[}\\s,])${esc}\\s*\\{([^}]*)\\}`, 'g'))].map(m => m[1]).join(';');
};

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify({ settings: {}, lessonSlots: [], lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathematik', className: 'Klasse 10b Mathematik Förderkurs Gruppe A', color: '#6366f1' }],
    students: { g1: [{ id: 's1', firstName: 'Anna', lastName: 'A', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] }] } }));
  loadApp();
});

describe('AW1: langer Klassenname im Sitzplan', () => {
  it('der Klassen-Knopf darf schrumpfen, Datum und Werkzeuge nicht', () => {
    expect(rule('.seating-class-pick')).toMatch(/min-width:\s*0/);
    expect(rule('.seating-class-pick')).not.toMatch(/flex-shrink:\s*0/);
    expect(rule('.seating-class-btn')).toMatch(/max-width:\s*calc\(100% \+ var\(--space-2\)\)/);   // gleicht den Rand nach links aus, sonst wird schon „7b“ gekürzt
    expect(rule('.seating-date-nav')).toMatch(/flex-shrink:\s*0/);
    expect(rule('.seating-tools')).toMatch(/flex-shrink:\s*0/);
  });
  it('der Name wird mit „…“ gekürzt, das Fach zuerst', () => {
    expect(rule('.seating-class-name')).toMatch(/text-overflow:\s*ellipsis/);
    expect(rule('.seating-class-name')).toMatch(/overflow:\s*hidden/);
    expect(rule('.seating-class-subject')).toMatch(/text-overflow:\s*ellipsis/);
    expect(rule('.seating-class-subject')).toMatch(/flex-shrink:\s*([2-9]|\d\d)/);   // schrumpft vor dem Namen
  });
  it('voller Name beim Draufzeigen und für VoiceOver', () => {
    app('switchView("seating"); openSeatingForGroup("g1")');
    const t = document.getElementById('seating-group-trigger');
    expect(t.getAttribute('title')).toBe('Klasse 10b Mathematik Förderkurs Gruppe A · Mathematik');
    expect(t.getAttribute('aria-label')).toMatch(/Klasse 10b Mathematik Förderkurs Gruppe A Mathematik/);
  });
  it('passt der Name nicht, fallen zuerst die Wörter an den Werkzeugen weg (nur Symbole), dann wird gekürzt', () => {
    app('switchView("seating"); openSeatingForGroup("g1")');
    const tools = document.querySelector('.seating-tools'), lbl = document.getElementById('seating-group-current-label');
    Object.defineProperty(lbl, 'scrollWidth', { configurable: true, get: () => 480 });
    Object.defineProperty(lbl, 'clientWidth', { configurable: true, get: () => 90 });
    app('renderSeatingPlan()');
    expect(document.querySelector('.seating-toolbar').classList.contains('wrap')).toBe(true);   // passt auch ohne Wörter nicht: eigene Zeile
    expect(tools.classList.contains('compact')).toBe(false);   // darunter ist wieder Platz für die Wörter
    Object.defineProperty(document.querySelector('.seating-toolbar'), 'scrollWidth', { configurable: true, get: () => 900 });   // Werkzeugzeile zu breit
    app('renderSeatingPlan()');
    expect(tools.classList.contains('compact')).toBe(true);
    delete document.querySelector('.seating-toolbar').scrollWidth;
    Object.defineProperty(lbl, 'scrollWidth', { configurable: true, get: () => 90 });
    app('renderSeatingPlan()');
    expect(tools.classList.contains('compact')).toBe(false);
    expect(document.querySelector('.seating-toolbar').classList.contains('wrap')).toBe(false);
    // Nur in der breiten Ansicht; schmal stehen die Werkzeuge ohnehin als Symbole in einer eigenen Zeile
    expect(css).toMatch(/@container seating \(min-width: 621px\)\{\s*\.seating-tools\.compact \.seating-tool-btn \.btn-label\{display:none;\}/);
  });
});
