// Eine überzählige „}“ in style.css lässt den Browser die nächste Regel still verwerfen (AH27: .students-list verlor
// so seit 02.11. seinen Rand, die Schülerliste klebte am Rand). Klammern müssen aufgehen.
const fs = require('fs');
const path = require('path');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

it('style.css: jede „{“ hat ihre „}“, keine überzählige', () => {
  const code = CSS.replace(/\/\*[\s\S]*?\*\//g, c => c.replace(/[^\n]/g, ' ')).replace(/"[^"\n]*"|'[^'\n]*'/g, '""');
  let depth = 0;
  const stray = [];
  code.split('\n').forEach((line, i) => {
    for (const ch of line) {
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth < 0) { stray.push(i + 1); depth = 0; } }
    }
  });
  expect(stray, 'überzählige } in Zeile').toEqual([]);
  expect(depth, 'nicht geschlossene {').toBe(0);
});
