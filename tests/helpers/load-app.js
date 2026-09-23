// Lädt app.js wie ein <script>-Tag im Browser: alle Top-Level-Funktionen und
// -Variablen (db, renderTimetable, …) landen im globalen Scope.
// So lassen sich auch Funktionen testen, die app.js nicht exportiert.
// Achtung: pro Testdatei nur EINMAL laden (let/const dürfen nicht doppelt deklariert werden).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');

// Beliebiges Skript des Projekts laden, z. B. loadScript('sync-manager.js')
function loadScript(relPath) {
  const file = path.join(ROOT, relPath);
  vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });
}

function loadApp() {
  loadScript('app.js');
}

// Liest/verändert globalen App-State, z. B. app('db') oder app('currentGroupId = "x"')
function app(expr) {
  return vm.runInThisContext(expr);
}

module.exports = { loadApp, loadScript, app };
