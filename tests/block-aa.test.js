// Block AA (Rückmeldungen aus dem Alltag, 15.10.2026).
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

function sampleDB() {
  return {
    settings: { teacherName: 'Test', school: '', blocks: null },
    lessonSlots: [],
    lessonData: {},
    groups: [
      { id: 'g1', subject: 'Mathe', className: '7b', year: '2026/27', color: '#6366f1', schularbeitWeight: 50 },
      { id: 'g2', subject: 'Physik', className: 'Q1', year: '2026/27', color: '#f59e0b', schularbeitWeight: 40, gradeScale: '0-15' },
    ],
    students: { g1: [], g2: [] },
  };
}

const val = id => document.getElementById(id).value;
const setVal = (id, v) => { document.getElementById(id).value = v; };
const groups = () => app('db.groups');
const lastToast = () => {
  const t = document.querySelectorAll('#toast-container .toast');
  return t.length ? t[t.length - 1].textContent : '';
};

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});

beforeEach(() => {
  app('db = ' + JSON.stringify(sampleDB()));
  app('editingGroupId = null');
  document.getElementById('toast-container').innerHTML = '';
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});

describe('AA1: mehrere Klassen auf einmal anlegen', () => {
  it('versteht Listen und Buchstaben-Bereiche', () => {
    expect(app('parseClassNames("7a, 7b; 7c")')).toEqual(['7a', '7b', '7c']);
    expect(app('parseClassNames("7a-d")')).toEqual(['7a', '7b', '7c', '7d']);
    expect(app('parseClassNames("7a – 7d")')).toEqual(['7a', '7b', '7c', '7d']);
    expect(app('parseClassNames("10A-C")')).toEqual(['10A', '10B', '10C']);
    expect(app('parseClassNames("5a-c, 6a")')).toEqual(['5a', '5b', '5c', '6a']);
  });

  it('lässt einzelne Namen in Ruhe, auch mit Bindestrich oder Leerzeichen', () => {
    expect(app('parseClassNames("7b")')).toEqual(['7b']);
    expect(app('parseClassNames("Q1")')).toEqual(['Q1']);
    expect(app('parseClassNames("Q1 Leistungskurs")')).toEqual(['Q1 Leistungskurs']);
    expect(app('parseClassNames("E-Phase")')).toEqual(['E-Phase']);
    expect(app('parseClassNames("7a-7b-Kurs")')).toEqual(['7a-7b-Kurs']);
  });

  it('keine doppelten, keine leeren, Bereich rückwärts oder riesig wird nicht aufgeklappt', () => {
    expect(app('parseClassNames("7a, 7a, , 7b,")')).toEqual(['7a', '7b']);
    expect(app('parseClassNames("7d-a")')).toEqual(['7d-a']);
    expect(app('parseClassNames("")')).toEqual([]);
  });

  it('„7a-d“ legt vier Klassen mit Fach und Jahr an, jede mit eigener Farbe', () => {
    app('openAddSubjectGroup()');
    setVal('new-group-class', '7a-d');
    setVal('new-group-subject', 'Deutsch');
    setVal('new-group-year', '2026/27');
    app('saveSubjectGroup()');
    const neu = groups().filter(g => g.subject === 'Deutsch');
    expect(neu.map(g => g.className)).toEqual(['7a', '7b', '7c', '7d']);
    neu.forEach(g => {
      expect(g.year).toBe('2026/27');
      expect(app(`db.students[${JSON.stringify(g.id)}]`)).toEqual([]);
    });
    expect(new Set(neu.map(g => g.color)).size).toBe(4);
    expect(new Set(neu.map(g => g.id)).size).toBe(4);
    expect(lastToast()).toContain('4 Klassen');
  });

  it('Vorschau und Knopf nennen, was angelegt wird', () => {
    app('openAddSubjectGroup()');
    setVal('new-group-class', '7a-c');
    app('updateGroupClassPreview()');
    expect(document.getElementById('group-class-preview').textContent).toContain('7a, 7b, 7c');
    expect(document.getElementById('btn-save-group').textContent).toContain('3 Klassen');
    setVal('new-group-class', '7a');
    app('updateGroupClassPreview()');
    expect(document.getElementById('group-class-preview').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('btn-save-group').textContent).toBe('Speichern');
  });

  it('beim Öffnen stehen Fach und Jahr der zuletzt angelegten Klasse da, Skala und Gewichtung auf Standard', () => {
    app('openAddSubjectGroup()');
    expect(val('new-group-class')).toBe('');
    expect(val('new-group-subject')).toBe('Physik');
    expect(val('new-group-year')).toBe('2026/27');
    // Letzte Klasse ist ein Oberstufenkurs (0–15, 40 %): die nächste darf das nicht unbemerkt erben
    expect(val('weight-schularbeit')).toBe('50');
    expect(val('new-group-scale')).toBe('1-6');
  });

  it('ohne Klassen: leere Felder und Standardwerte wie bisher', () => {
    app('db.groups = []; db.students = {}');
    app('openAddSubjectGroup()');
    expect(val('new-group-subject')).toBe('');
    expect(val('new-group-year')).toBe('');
    expect(val('weight-schularbeit')).toBe('50');
    expect(val('new-group-scale')).toBe('1-6');
  });

  it('neue Farbe: nicht die der zuletzt angelegten Klasse', () => {
    app('openAddSubjectGroup()');
    expect(app('selectedGroupColor')).not.toBe('#f59e0b');
  });

  it('vorhandene Klasse + Fach wird übersprungen und genannt', () => {
    app('openAddSubjectGroup()');
    setVal('new-group-class', '7a-c');
    setVal('new-group-subject', 'Mathe');
    app('saveSubjectGroup()');
    const mathe = groups().filter(g => g.subject === 'Mathe').map(g => g.className).sort();
    expect(mathe).toEqual(['7a', '7b', '7c']);
    expect(lastToast()).toContain('7b');
  });

  it('gibt es alle schon: nichts anlegen, Fenster bleibt offen', () => {
    app('openAddSubjectGroup()');
    setVal('new-group-class', '7b');
    setVal('new-group-subject', 'Mathe');
    app('saveSubjectGroup()');
    expect(groups().length).toBe(2);
    expect(document.getElementById('modal-add-group').classList.contains('hidden')).toBe(false);
  });

  it('beim Bearbeiten geht nur ein Name (kein Aufklappen, kein Umbenennen in eine Liste)', () => {
    app('openEditGroup("g1")');
    setVal('new-group-class', '7a-d');
    app('saveSubjectGroup()');
    expect(groups().find(g => g.id === 'g1').className).toBe('7b');
    expect(groups().length).toBe(2);
    expect(lastToast()).toMatch(/eine Klasse/);
  });

  it('Bearbeiten ohne Liste speichert wie bisher', () => {
    app('openEditGroup("g1")');
    setVal('new-group-class', '7c');
    app('saveSubjectGroup()');
    expect(groups().find(g => g.id === 'g1').className).toBe('7c');
  });
});

describe('AA6: genug Farben für viele Klassen (Musik: 1 Stunde pro Klasse, bis zu 26 Klassen)', () => {
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const lum = c => {
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const [r, g, b] = c.map(f); return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const mix = (a, b, t) => a.map((v, i) => v * (1 - t) + b[i] * t);

  it('mindestens 28 Farben, in vollen Reihen zu 7, alle verschieden', () => {
    const colors = app('APP_COLORS');
    expect(colors.length).toBeGreaterThanOrEqual(28);
    expect(colors.length % 7).toBe(0);
    expect(new Set(colors.map(c => c.toLowerCase())).size).toBe(colors.length);
    colors.forEach(c => expect(c).toMatch(/^#[0-9a-f]{6}$/i));
  });

  it('die bisherigen 14 Farben bleiben vorne und in derselben Reihenfolge', () => {
    expect(app('APP_COLORS').slice(0, 14)).toEqual(['#6366f1', '#8b5cf6', '#ec4899', '#d946ef', '#ef4444', '#f97316', '#f59e0b',
      '#a16207', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#64748b']);
  });

  it('neue Farben: Klassenname auf der Kachel lesbar, dunkel wie hell', () => {
    // Kachel: Schrift in der Klassenfarbe auf 15 % Farbton (dunkel), hell mit 50 % Schwarz gemischt (style.css .tt-lesson)
    app('APP_COLORS').slice(14).forEach(c => {
      const x = rgb(c);
      expect(contrast(x, mix(rgb('#1a1d27'), x, 0.15)), c + ' dunkel').toBeGreaterThanOrEqual(3);
      expect(contrast(mix(x, [0, 0, 0], 0.5), mix(rgb('#f1f5f9'), x, 0.15)), c + ' hell').toBeGreaterThanOrEqual(4);
    });
  });

  it('26 neue Klassen bekommen 26 verschiedene Farben', () => {
    app('db.groups = []; db.students = {}');
    app('openAddSubjectGroup()');
    setVal('new-group-class', '5a-m, 6a-m');
    setVal('new-group-subject', 'Musik');
    app('saveSubjectGroup()');
    const g = groups();
    expect(g.length).toBe(26);
    expect(new Set(g.map(x => x.color)).size).toBe(26);
  });

  it('Häkchen der gewählten Farbe ist auf hellen Feldern dunkel', () => {
    app('openAddSubjectGroup()');
    const sw = c => document.querySelector(`#group-color-picker .color-swatch[data-color="${c}"]`);
    expect(sw('#fecdd3').classList.contains('swatch-light')).toBe(true);
    expect(sw('#d9f99d').classList.contains('swatch-light')).toBe(true);
    expect(sw('#6366f1').classList.contains('swatch-light')).toBe(false);
    expect(sw('#ef4444').classList.contains('swatch-light')).toBe(false);
    expect(CSS).toMatch(/\.color-swatch\.swatch-light\.selected::after\{[^}]*color:/);
  });

  it('weiße Schrift auf Klassenfarbe nur abgedunkelt (Abzeichen „noch … min“), Status im hellen Modus abgedunkelt', () => {
    expect(CSS).toMatch(/\.tt-lesson\.running \.tt-lesson-badge\{[^}]*background:color-mix\(in srgb, var\(--lesson-color\) 50%, #000\)/);
    expect(CSS).toMatch(/:root\[data-theme="light"\] \.dash-lesson\.running \.dash-lesson-status\{[^}]*color-mix\(in srgb, var\(--lesson-color\) 50%, #000\)/);
  });
});
