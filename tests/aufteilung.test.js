// Y12: Die App steht in js/, aufgeteilt nach Bereichen. Wächter für Regel 99:
// jede Funktion/Variable genau einmal, in den Bereichsdateien nur Deklarationen, js/start.js zuletzt,
// Service Worker und index.html kennen dieselben Dateien.
const fs = require('fs');
const path = require('path');
const { appFiles } = require('./helpers/load-app');

const root = path.join(__dirname, '..');
const files = appFiles();
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const sw = read('sw.js');

describe('Aufteilung der App (Y12)', () => {
  it('index.html lädt die Bereichsdateien und zuletzt js/start.js; app.js gibt es nicht mehr', () => {
    expect(files.length).toBeGreaterThan(10);
    expect(files[files.length - 1]).toBe('js/start.js');
    expect(files[0]).toBe('js/grundlagen.js');
    expect(fs.existsSync(path.join(root, 'app.js'))).toBe(false);
    expect(fs.readdirSync(path.join(root, 'js')).sort()).toEqual(files.map(f => f.replace('js/', '')).sort());
  });

  it('der Service Worker hält genau dieselben Dateien vor', () => {
    files.forEach(f => expect(sw).toMatch(new RegExp(`'\\./${f.replace(/[.]/g, '\\.')}\\?v=\\d+'`)));
  });

  it('jede Funktion und jede oberste Variable gibt es genau einmal', () => {
    const names = files.flatMap(f => [...read(f).matchAll(/^(?:async )?function\*? ([\w$]+)|^(?:const|let|var) ([\w$]+)/gm)].map(m => m[1] || m[2]));
    const dup = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dup).toEqual([]);
    expect(names.length).toBeGreaterThan(1000);
  });

  it('in den Bereichsdateien stehen nur Deklarationen, Start-Code nur in js/start.js (Regel 99)', () => {
    // Oberste Ebene = Zeilen ohne Einrückung. Erlaubt: Funktionen, let/const, window.x = function, Kommentare und
    // die Fortsetzung mehrzeiliger Deklarationen (schließende Klammern).
    const ok = /^(?:$|\/\/|\/\*|\*|\s|(?:async )?function[\s*]|const |let |window\.[\w$]+ = (?:async )?(?:function|\()|[}\])`'";,.]|[\w$-]+: )/;   // „x: …“ = Eigenschaft einer mehrzeiligen Deklaration
    const bad = files.filter(f => f !== 'js/start.js').flatMap(f => read(f).split('\n')
      .map((l, i) => ({ f, i: i + 1, l })).filter(x => !ok.test(x.l)));
    expect(bad.map(x => `${x.f}:${x.i} ${x.l.slice(0, 60)}`)).toEqual([]);
    // Typische Start-Anweisungen dürfen nicht unten in einer Bereichsdatei stehen
    const startLike = /^(?:document|window)\.(?:addEventListener|querySelector)|^setInterval\(|^[a-zA-Z_$][\w$]*\([^)]*\);\s*$/;
    const bad2 = files.filter(f => f !== 'js/start.js').flatMap(f => read(f).split('\n').map((l, i) => `${f}:${i + 1} ${l}`).filter(x => startLike.test(x.split(' ').slice(1).join(' '))));
    expect(bad2).toEqual([]);
  });
});
