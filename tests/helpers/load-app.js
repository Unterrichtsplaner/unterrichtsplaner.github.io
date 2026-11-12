// Lädt die App (js/…, früher app.js) wie <script>-Tags im Browser: alle Top-Level-Funktionen und
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

// Die App-Dateien in der Reihenfolge, in der index.html sie lädt (seit Y12 aufgeteilt in js/…, vorher app.js)
function appFiles() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  return [...html.matchAll(/<script src="((?:js\/[^"?]+|app)\.js)\?v=\d+"><\/script>/g)].map(m => m[1]);
}
// Ganzer Quelltext der App (alle Dateien hintereinander) – für Tests, die im Code nach Mustern suchen
function appSource() {
  return appFiles().map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
}

function loadApp() {
  loadScript('sync-merge.js');
  loadScript('lib/qrcode.js');      // Schülerapp (AJ1): QR-Code für den Zugang
  loadScript('student-share.js');   // Schülerapp (AJ1): Zugang, Verschlüsselung, Link
  appFiles().forEach(loadScript);
}

// Liest/verändert globalen App-State, z. B. app('db') oder app('currentGroupId = "x"')
function app(expr) {
  return vm.runInThisContext(expr);
}

// Ältere Tests prüfen Notentabellen und Schnitte direkt. Sie verhalten sich wie jemand, der in der Klassenansicht
// sofort „Anzeigen“ tippt. Der Beamer-Schutz selbst (AH24 c) wird in tests/beamer-klasse.test.js geprüft.
function showGradesOnOpen() {
  app('classGradesShown = true; hideClassGrades = function () { classGradesShown = true; updateClassGradesButton(); }');
}

module.exports = { loadApp, loadScript, app, showGradesOnOpen, appFiles, appSource };
