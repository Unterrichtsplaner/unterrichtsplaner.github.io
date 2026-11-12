// ▸ Grundlagen: Daten laden und speichern, Fenster, Hinweise, Symbole, Auswahllisten, Navigation
// ▸ Teil von app.js (aufgeteilt, BUGS Y12): alle Dateien teilen sich den globalen Bereich, Reihenfolge wie in index.html.


const APP_COLORS = [
  // Rose/Gelb waren kaum von Rot/Bernstein zu unterscheiden (BUGS S15). Alte Stunden behalten ihre Farbe.
  '#6366f1','#8b5cf6','#ec4899','#d946ef',
  '#ef4444','#f97316','#f59e0b','#a16207','#84cc16',
  '#22c55e','#14b8a6','#06b6d4','#3b82f6',
  '#64748b',
  // Helle Töne dazu (BUGS AA6): Eine Musiklehrkraft hat schnell 26 Klassen. Gewählt nach Abstand zu allen anderen
  // (≥ 49, S15) und Lesbarkeit als Schrift auf der Kachel (dunkel und hell); dunkle Töne wären im dunklen Modus unlesbar.
  '#f87171','#fb923c','#fdba74','#fde047','#d9f99d','#bef264','#a3e635',
  '#bbf7d0','#4ade80','#6ee7b7','#a5f3fc','#67e8f9','#38bdf8','#a5b4fc',
  '#818cf8','#c084fc','#f0abfc','#f472b6','#fda4af','#fecdd3','#a8a29e'
];

// ─── Icons ───────────────────────────────────────────────────────────────
// Linien-Icons wie im Menü, keine Emojis in Knöpfen/Reitern (Mitarbeit: Zeichen ++ + − −−, AH52).
// index.html setzt Platzhalter <i data-icon="name"></i>, fillIcons() ersetzt sie beim Start.
const ICONS = {
  student:      '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  'student-add':'<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
  classes:      '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  grades:       '<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
  overview:     '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  participation:'<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
  attendance:   '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>',
  absences:     '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/>',
  content:      '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  homework:     '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  test:         '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/>',
  notes:        '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  sticky:       '<path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/>',   // Notizzettel (AM1)
cards: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><path d="M17 13v8M13 17h8"/>',
    seating:      '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
  'x-circle':   '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
  'check-circle':'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  late:         '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  plus:         '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  star:         '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  qr:           '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM21 14v.01M14 21h3M21 17v4h-4"/>',
  list:         '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  download:     '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload:       '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  cloud:        '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
  'cloud-down': '<polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/>',
  'cloud-up':   '<polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>',
  save:         '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
  check:        '<polyline points="20 6 9 17 4 12"/>',
  settings:     '<circle cx="12" cy="12" r="3"/> <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  search:       '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/>',
  panel:        '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/>',
  todo:         '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
  trash:        '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>',
  refresh:      '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  mail:         '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  copy:         '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  code:         '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  dice:         '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="16" cy="8" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="8" cy="16" r="1" fill="currentColor"/><circle cx="16" cy="16" r="1" fill="currentColor"/>',
  alert:        '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  'trend-down': '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>',
  lock:         '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  more:         '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
  eye:          '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  undo:         '<polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>',
  edit:         '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
  printer:      '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  'eye-off':    '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
  calendar:     '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  info:         '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  cake:         '<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v3"/><path d="M12 8v3"/><path d="M17 8v3"/><path d="M7 4h.01"/><path d="M12 4h.01"/><path d="M17 4h.01"/>',
  activity:     '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  clock:        '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
  stopwatch:    '<circle cx="12" cy="13" r="8"/><line x1="12" y1="13" x2="15" y2="10"/><line x1="10" y1="2" x2="14" y2="2"/>',
  grid:         '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>',
  'arrow-up':   '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
  'arrow-down': '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
  'arrow-right': '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  pin:          '<line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>',
  'calendar-x': '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="10" y1="14" x2="14" y2="18"/><line x1="14" y1="14" x2="10" y2="18"/>',
};
function icon(name) {
  if (!ICONS[name]) throw new Error('Unbekanntes Icon: ' + name);
  return `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}
function fillIcons(root) {
  root.querySelectorAll('[data-icon]').forEach(el => { el.outerHTML = icon(el.dataset.icon); });
}

// Eingabefelder ohne Autokorrektur (AO1): Das iPad ersetzte beim Tippen und bei Enter Wörter, die man nicht ändern wollte,
// am schlimmsten bei Namen. Gilt für alle Text-Felder, auch die, die die App später zeichnet (Tabellen, Fenster):
// Ein Beobachter stellt neue Felder sofort ein. Ein Attribut, das ein Feld selbst setzt, bleibt (z. B. die Suche).
// lang="de" sagt dem Gerät, in welcher Sprache getippt wird (Hinweis für die Tastatur, z. B. statt Arabisch).
// Namen zusätzlich ohne Rechtschreibprüfung und mit großem Anfangsbuchstaben je Wort.
const NAME_FIELD_IDS = new Set(['new-student-first', 'new-student-last', 'import-text', 'settings-teacher-name', 'settings-studentapp-name',
  'new-group-class', 'new-group-teacher', 'print-name']);
const TEXT_INPUT_TYPES = new Set(['text', 'search', '']);
function tuneTextField(el) {
  const tag = el.tagName;
  if (tag !== 'TEXTAREA' && !(tag === 'INPUT' && TEXT_INPUT_TYPES.has((el.getAttribute('type') || '').toLowerCase()))) return;
  const set = (name, value) => { if (!el.hasAttribute(name)) el.setAttribute(name, value); };
  set('autocorrect', 'off');
  set('lang', 'de');
  if (NAME_FIELD_IDS.has(el.id)) { set('spellcheck', 'false'); set('autocapitalize', 'words'); set('autocomplete', 'off'); }
}
function tuneTextFields(root) {
  if (root.matches && root.matches('input, textarea')) tuneTextField(root);
  if (root.querySelectorAll) root.querySelectorAll('input, textarea').forEach(tuneTextField);
}

// ─── State ───────────────────────────────────────────────────────────────
// Gespeicherte Daten, die sich nicht lesen ließen (G12): Rohtext bleibt erhalten, statt beim nächsten Speichern überschrieben zu werden.
let dbLoadFailure = null; // { raw, key /*Kopie in localStorage, null = Kopie gescheitert*/, error }
let lastRescueOffer = 0;   // wann persistDB zuletzt angeboten hat, die unlesbaren Daten herunterzuladen
// Mehrere Fenster/Tabs derselben App teilen sich den Speicher. Jedes Speichern setzt eine neue Kennung;
// stimmt sie vor dem Schreiben nicht mehr mit der gemerkten überein, hat ein anderes Fenster gespeichert,
// und dessen Stand würde sonst still mit dem veralteten dieses Fensters überschrieben (BUGS T1).
const DB_KEY = 'lehrerapp_v3';
const DB_REV_KEY = 'lehrerapp_v3_rev';
let dbRev = null;
let currentWeekOffset = 0;
let activeLessonId    = null;
let activeLessonDate  = null;
let isStudentEditMode = false;
let nextLessonDate    = null; // computed when opening lesson detail
let editingSlotId     = null;
let currentGroupId    = null;
let currentStudentId  = null;
let editingStudentId  = null;
let editingGroupId    = null;
let selectedLessonColor = APP_COLORS[0];
let selectedGroupColor  = APP_COLORS[0];
// Formularstand beim Öffnen, für „Änderungen verwerfen?“ (BUGS S7); null = nicht gemerkt
let settingsSnapshot = null;
let gradeFormSnapshot = null;

// ─── DB ──────────────────────────────────────────────────────────────────
function loadDB() {
  let raw = null;
  dbRev = storedDBRev();
  try {
    raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Keine gültige Datenbank');
      return migrateDB(parsed);
    }
  } catch(e) {
    if (raw) rescueUnreadableDB(raw, e);
  }
  return emptyDB();
}
function emptyDB() {
  return {
    settings: { teacherName:'', school:'', blocks: null },
    lessonSlots: [],
    lessonData: {}, // key: slotId_YYYY-MM-DD
    groups: [],
    students: {},
  };
}
// Unlesbaren Speicherstand unter eigenem Schlüssel sichern. Klappt das nicht (Speicher voll),
// wird der alte Schlüssel nicht mehr überschrieben, bis der Nutzer die Datei heruntergeladen hat.
function rescueUnreadableDB(raw, error) {
  // Gleicher Inhalt liegt schon als Kopie da (voriger Start): keine weitere anlegen, sonst läuft der Speicher voll (BUGS P11)
  let key = rescueCopyKeys().find(k => { try { return localStorage.getItem(k) === raw; } catch (e) { return false; } });
  if (!key) {
    key = 'lehrerapp_v3_defekt_' + Date.now();
    for (let n = 2; localStorage.getItem(key) !== null; n++) key = 'lehrerapp_v3_defekt_' + Date.now() + '_' + n;
    try { localStorage.setItem(key, raw); } catch(e) { key = null; }
  }
  dbLoadFailure = { raw, key, error: String(error && error.message || error) };
  setTimeout(showDBLoadFailure, 0);
}
function showDBLoadFailure() {
  if (!dbLoadFailure) return;
  const where = dbLoadFailure.key
    ? 'Eine Kopie liegt weiterhin auf diesem Gerät.'
    : 'Der Speicher ist voll, deshalb konnte keine Kopie angelegt werden. Bis du die Datei heruntergeladen hast, wird auf diesem Gerät nichts gespeichert.';
  if (confirm('⚠️ Die gespeicherten Daten auf diesem Gerät konnten nicht gelesen werden.\n\n'
    + 'Die App startet deshalb leer. Deine alten Daten wurden NICHT gelöscht. ' + where + '\n\n'
    + 'Falls Cloud-Sync aktiv ist, kommen deine Daten beim nächsten Sync aus der Cloud zurück. Sonst: Sicherung importieren.\n\n'
    + 'Die unlesbaren Daten jetzt als Datei herunterladen (zur Rettung)?')) {
    downloadUnreadableDB();
  }
}
function downloadUnreadableDB() {
  if (!dbLoadFailure) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([dbLoadFailure.raw], { type: 'text/plain;charset=utf-8;' }));
  a.download = `Unterrichtsplaner_unlesbar_${formatDate(new Date())}.txt`;
  a.click();
  if (!dbLoadFailure.key) dbLoadFailure = null; // gerettet → Speichern wieder erlaubt
}
// Altdaten angleichen. Muss beliebig oft laufen dürfen; gespeichert wird beim nächsten persistDB/saveDB.
function migrateDB(data) {
  // Pausenaufsichten (BUGS AA4): fehlt bei Altdaten. Nur ergänzen, nie einen vorhandenen Wert ersetzen (Regel 48).
  if (data.supervisions === undefined) data.supervisions = [];
  // Noten: Bemerkung hieß früher teils `label`, heute immer `note`
  Object.values(data.students || {}).forEach(list => (list || []).forEach(st => (st.grades || []).forEach(gr => {
    if (!('label' in gr)) return;
    if (gr.note === undefined) gr.note = gr.label;
    delete gr.label;
  })));
  // Angelegte Notenspalten ohne Typ: Typ ihrer Noten übernehmen. Der Typ gehört seit BUGS K4 zur Spalte;
  // ohne ihn stünde neben der Spalte eine zweite mit denselben Noten.
  (data.groups || []).forEach(group => (group.gradeEvents || []).forEach(ev => {
    if (ev.type) return;
    const match = ((data.students || {})[group.id] || []).flatMap(st => st.grades || [])
      .find(gr => gr.date === ev.date && (gr.note ?? gradeTypeLabel(gr.type)) === ev.label);
    ev.type = (match && match.type) || 'test';
  }));
  (data.lessonSlots || []).forEach(slot => {
    // Zweiwöchig: früher nur KW gespeichert (`startWeek`), deren Parität ab 2027 kippt (KW 53).
    // Die KW stammt aus dem Schuljahr 2026 (bis 2026 lief die Parität seit 2021 durch) → Montag dieser KW 2026.
    if (slot.recurring === 'biweekly' && !slot.startDate && slot.startWeek) {
      slot.startDate = formatDate(addDays(parseDate('2025-12-29'), (slot.startWeek - 1) * 7)); // 29.12.2025 = Mo KW 1/2026
    }
    // Einmalige Stunde mit Datum auf falschem Wochentag (alter Fehler D2) → gleicher Woche, richtiger Tag
    if (isOneOffSlot(slot) && slot.specificDate && typeof slot.day === 'number') {
      const fixed = formatDate(addDays(mondayOf(parseDate(slot.specificDate)), slot.day));
      if (fixed !== slot.specificDate) slot.specificDate = fixed;
    }
  });
  // Hier stand früher eine Migration „alte Standard-Blöcke (5 ab 08:00) → heutige“. Sie traf auch selbst
  // eingestellte Zeiten und lief bei jedem Laden (BUGS P3); Geräte mit den uralten Blöcken hat schon die
  // App-Version vom Juni 2026 umgestellt. Blöcke werden deshalb nie mehr automatisch verändert.
  // Sync-Stand alter App-Versionen (ohne `syncedLocalModified`): gilt als synchron, wenn der Stand direkt
  // aus der Cloud kam (gleiche Kennung) oder das alte `saveDB(true)` ihn kurz nach dem Upload neu gestempelt hat.
  // Sonst bleibt er „lokal geändert“ – das ist der sichere Fall.
  const ss = data.syncSettings;
  if (ss && !('syncedLocalModified' in ss) && typeof ss.lastSyncedCloudTimestamp === 'number'
      && data.settings && typeof data.settings.lastModified === 'number') {
    const diff = data.settings.lastModified - ss.lastSyncedCloudTimestamp;
    if (diff >= 0 && diff < 10000) ss.syncedLocalModified = data.settings.lastModified;
  }
  return data;
}
// Für jede Änderung durch den Nutzer: markiert die Daten als geändert und stößt den Cloud-Sync an.
function saveDB() {
  if (!db.settings) db.settings = {};
  // Immer eine neue Kennung, auch bei zwei Eingaben in derselben Millisekunde: Der Sync prüft nur auf Gleichheit
  // und hielte die zweite sonst für schon hochgeladen. (Uhrzeit ist hier nur Kennung, nie Vergleich zwischen Geräten.)
  const prev = Number(db.settings.lastModified) || 0, now = Date.now();
  db.settings.lastModified = now > prev ? now : prev + 1;
  persistDB();

  // Automatischer Cloud-Hintergrundsync (Autosave)
  if (typeof SyncManager !== 'undefined' && SyncManager.isInitialized && SyncManager.currentUser && SyncManager.masterPassword) {
    if (window.syncTimeout) clearTimeout(window.syncTimeout);
    window.syncTimeout = setTimeout(() => {
      window.syncTimeout = null;
      triggerSyncInternal();
    }, 3000); // 3 Sekunden Verzögerung nach der letzten Eingabe
  }
  updateSyncIndicator();   // „Wird abgeglichen …“ (AN1)
}
// Nur speichern, ohne die Daten als „geändert“ zu markieren (z. B. Sync-Metadaten).
function persistDB() {
  if (dbLoadFailure && !dbLoadFailure.key) {
    showToast('Nicht gespeichert: alte Daten zuerst herunterladen', 'error');
    // Auch in der laufenden Sitzung einen Weg zum Herunterladen anbieten, höchstens einmal pro Minute (BUGS P11)
    if (Date.now() - lastRescueOffer > 60000) {
      lastRescueOffer = Date.now();
      if (confirm('Deine Eingabe wurde nicht gespeichert: Auf diesem Gerät liegen noch unlesbare alte Daten, und der Speicher ist voll.\n\nDie alten Daten jetzt herunterladen? Danach wird wieder gespeichert.')) {
        downloadUnreadableDB();
        if (!dbLoadFailure) return persistDB();
      }
    }
    return false;
  }
  if (storedDBRev() !== dbRev) {
    askAboutForeignWrite();
    return false;
  }
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    markDBWritten();
  } catch (e) {
    reportSaveFailure(e);
    return false;
  }
  return true;
}
function storedDBRev() {
  try { return localStorage.getItem(DB_REV_KEY); } catch (e) { return null; }
}
// Neue Kennung nach jedem Schreiben (auch Löschen) des gespeicherten Stands
function markDBWritten() {
  const rev = uid();
  try { localStorage.setItem(DB_REV_KEY, rev); } catch (e) { return; }
  dbRev = rev;
}

// Ein anderes Fenster hat gespeichert, seit dieses Fenster seinen Stand geladen hat (BUGS T1). Welcher gilt,
// kann nur der Nutzer entscheiden: Zusammenführen geht nicht, und still überschreiben verliert Daten.
let foreignWriteAsking = false;
async function askAboutForeignWrite() {
  if (foreignWriteAsking) return;
  foreignWriteAsking = true;
  const answer = await askChoice('App in einem anderen Fenster offen',
    'Die App ist noch in einem anderen Fenster oder Tab geöffnet, und dort wurde inzwischen gespeichert. '
    + 'Deine letzte Eingabe hier ist deshalb noch NICHT gespeichert.\n\n'
    + '„Anderes Fenster laden“: Deine letzte Eingabe hier geht verloren.\n'
    + '„Dieses Fenster speichern“: Was im anderen Fenster eingetragen wurde, geht verloren.\n\n'
    + 'Am besten danach das andere Fenster schließen.',
    [{ label: 'Anderes Fenster laden', value: 'load', primary: true },
     { label: 'Dieses Fenster speichern', value: 'keep', danger: true }]);
  foreignWriteAsking = false;
  // Beide Antworten klären auch einen Stand, der auf das Schließen eines Eingabefensters wartete (AP2)
  if (answer) storageChangedWhileModal = false;
  if (answer === 'load') {
    adoptStoredDB();
    showToast('Stand des anderen Fensters geladen');
  } else if (answer === 'keep') {
    dbRev = storedDBRev();
    if (persistDB()) showToast('Gespeichert ✓');
  }
  // Abbrechen: nichts gespeichert; das nächste Speichern fragt wieder
  if (answer) triggerSyncInternal();
}

// Gespeicherten Stand (vom anderen Fenster) als eigenen übernehmen
function adoptStoredDB() {
  replaceDB(loadDB());
}

// Ganze DB austauschen und alles, was an ihr hängt, neu zeichnen (Cloud-Übernahme, anderes Fenster, Löschen)
function replaceDB(newDB) {
  // Offene Einstellungen zeigen sonst den alten Stand, und „Speichern“ schriebe ihn samt alter Blöcke zurück (BUGS P2).
  // Nur, wenn dort nichts eingetippt ist – dann wartet der neue Stand ohnehin bis zum Schließen (BUGS T5).
  // VOR dem Laden der Farben fragen: Die neuen Farben stellen die Farbfelder um, das sähe sonst wie eine Eingabe aus (AP1).
  const refillSettings = !document.getElementById('modal-settings').classList.contains('hidden') && !settingsDirty();
  db = newDB;
  updateAppliedThemeFromDB();
  if (refillSettings) fillSettingsForm();
  renderTimetable();
  renderSubjectGroups();
  resetViewSelection();
  renderNav();   // Reihenfolge und Schnellzugriff aus dem neuen Stand (AH48)
  if (typeof updateSyncUI === 'function') updateSyncUI();
}

// Anderes Fenster hat gespeichert: gleich übernehmen, außer ein Eingabefenster ist offen – dessen Felder
// gehören zum alten Stand. Dann nach dem Schließen, bzw. beim Speichern fragt persistDB nach.
let storageChangedWhileModal = false;
function onStorageChanged(e) {
  if (e.key !== null && e.key !== DB_KEY && e.key !== DB_REV_KEY) return;
  if (storedDBRev() === dbRev) return;
  if (inputModalOpen()) { storageChangedWhileModal = true; return; }
  adoptStoredDB();
}
function storageAfterModalsClosed() {
  // Läuft die Frage „anderes Fenster“, entscheidet ihre Antwort – sonst übernähme das Schließen der Frage
  // den fremden Stand, bevor „Dieses Fenster speichern“ wirkt (AP2)
  if (!storageChangedWhileModal || inputModalOpen() || foreignWriteAsking) return;
  storageChangedWhileModal = false;
  if (storedDBRev() !== dbRev) adoptStoredDB();
}
// Speichern ging schief (meist: Speicher des Browsers voll). Nie still weitermachen – nach einem
// Neustart wäre die Eingabe weg (BUGS K10). Das Fenster kommt einmal pro Sitzung, danach nur Toasts.
let saveFailureShown = false;
function reportSaveFailure(error) {
  console.error('Speichern fehlgeschlagen:', error);
  showToast('Nicht gespeichert: Speicher voll. Bitte Daten exportieren.', 'error');
  if (saveFailureShown) return;
  saveFailureShown = true;
  const copies = rescueCopyKeys().length;
  alert('❌ Deine letzte Eingabe konnte auf diesem Gerät nicht gespeichert werden. Der Speicher des Browsers ist voll.\n\n'
    + 'Bitte sofort unter Einstellungen → „Exportieren“ eine Sicherung speichern. Solange die App offen bleibt, sind die Daten noch da'
    + (SyncManager.currentUser && SyncManager.masterPassword ? ' und werden weiter in die Cloud übertragen.' : '.')
    + (copies ? `\n\nPlatz belegen auch ${copies} alte Rettungskopie(n) unlesbarer Daten („lehrerapp_v3_defekt_…“).` : ''));
}
function rescueCopyKeys() {
  const keys = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('lehrerapp_v3_defekt_')) keys.push(k);
    }
  } catch (e) { /* kein Zugriff: nichts zu melden */ }
  return keys;
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

// ─── Navigation ──────────────────────────────────────────────────────────
function switchView(name) {
  if (name !== 'seating' && typeof seatingEditMode !== 'undefined' && seatingEditMode) {
    toggleSeatingEditMode();
  }
  if (name !== 'timetable' && timetableEditMode) setTimetableEditUI(false); // AC2
  if (name !== 'seating') setSeatingWakeLock(false); // Bildschirm darf wieder ausgehen (AD2)
  if (name !== 'seating') closeToolPops();   // Timer-/Stoppuhr-Feld (AH50)
  if (name !== 'seating' && typeof gradeRound !== 'undefined' && gradeRound) endGradeRound();   // Notenrunde (AH28)
  if (name !== 'students') hideClassGrades();   // Beamer-Schutz (AH24 c)
  if (name !== 'seating') hideSeatingGrades();   // „Noten zeigen“ gilt nur im Sitzplan (W1, Regel 16)
  if (typeof closeParticipationPicker === 'function') closeParticipationPicker();
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const viewEl = document.getElementById('view-' + name);
  // Die Klassenansicht gehört zu „Klassen“ (BUGS I11: sonst war kein Menüpunkt markiert)
  const navEl = document.getElementById('nav-' + (name === 'students' ? 'classes' : name));
  if (viewEl) viewEl.classList.add('active');
  if (navEl) navEl.classList.add('active');

  if (name === 'dashboard') renderDashboard();
  if (name === 'seating') initSeatingPlan();
  if (name === 'classes') renderSubjectGroups();
  if (name === 'timetable') renderTimetable();
  if (name === 'todos') renderTodos();   // Merkzettel (AH18)
  markNavActive();   // Schnellzugriff statt Menüpunkt markieren, wenn er passt (AH48)
}

// Fehlt die Farbe oder ist sie kaputt (Alt-/Fremddaten), Standardfarbe statt Absturz (BUGS M13)
const DEFAULT_LESSON_COLOR = '#6366f1';
function safeColor(hex) { return /^#[0-9a-f]{6}$/i.test(hex || '') ? hex : DEFAULT_LESSON_COLOR; }
// Helle Farbe: Weiß darauf hätte zu wenig Kontrast (< 3:1), z. B. das Häkchen der gewählten Farbe (BUGS AA6)
function isLightColor(hex) {
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const [r, g, b] = [1, 3, 5].map(i => lin(parseInt(safeColor(hex).slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.3;
}
function capitalize(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

// Auswahl zwischen mehreren Wegen, z. B. „ab dieser Woche“ / „alle“. Liefert den Wert des Knopfs
// oder null (Abbrechen, Escape, daneben tippen).
let choiceResolve = null;
function askChoice(title, text, choices) {
  if (choiceResolve) answerChoice(null);
  document.getElementById('modal-choice-title').textContent = title;
  document.getElementById('modal-choice-text').textContent = text;
  const box = document.getElementById('modal-choice-buttons');
  box.innerHTML = '';
  [...choices, { label: 'Abbrechen', value: null }].forEach(c => {
    const btn = document.createElement('button');
    btn.className = c.primary ? 'btn-primary' : c.danger ? 'btn-danger-outline' : 'btn-secondary';
    btn.style.width = '100%';
    btn.textContent = c.label;
    btn.onclick = () => answerChoice(c.value);
    box.appendChild(btn);
  });
  openModal('modal-choice');
  return new Promise(resolve => { choiceResolve = resolve; });
}
function answerChoice(value) {
  closeModal('modal-choice');
  const resolve = choiceResolve;
  choiceResolve = null;
  if (resolve) resolve(value);
}

// ─── Color Picker (fixed: stores hex on dataset, no rgb comparison) ───────
function renderColorPicker(containerId, colors, onSelect) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const currentColor = containerId === 'lesson-color-picker' ? selectedLessonColor : selectedGroupColor;
  colors.forEach(color => {
    const sw = document.createElement('div');
    sw.className = 'color-swatch' + (color === currentColor ? ' selected' : '') + (isLightColor(color) ? ' swatch-light' : '');
    sw.style.background = color;
    sw.style.setProperty('--swatch-color', color);
    sw.dataset.color = color;
    sw.setAttribute('role', 'button');
    sw.tabIndex = 0;
    sw.setAttribute('aria-label', 'Farbe ' + color);
    sw.onclick = () => {
      container.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      onSelect(color);
    };
    container.appendChild(sw);
  });
}

// ─── Leiste anordnen und Schnellzugriff (AH48) ─────────────────────────────
// db.settings.navOrder: Reihenfolge der Menüpunkte (fehlt = Standard), db.settings.quickLinks: [{ id, groupId,
// target: 'seating'|'students' }] Klassen unter den Menüpunkten. Beides gehört zu den Vorlieben (Abgleich: Gerät gewinnt).
const NAV_VIEWS = ['dashboard', 'timetable', 'classes', 'seating', 'todos'];
const NAV_NAMES = { dashboard: 'Dashboard', timetable: 'Stundenplan', classes: 'Klassen', seating: 'Sitzplan', todos: 'Merkzettel' };
const NAV_ICONS = { dashboard: 'cards', timetable: 'calendar', classes: 'classes', seating: 'seating', todos: 'todo' };
const QUICK_MAX = 8;
const QUICK_TARGETS = { seating: 'Sitzplan', students: 'Klassenansicht' };
const QUICK_SHORT = { seating: 'Sitzplan', students: 'Klasse' };   // in der Leiste ist „Klassenansicht“ zu lang
// Unbekannte Punkte fallen weg, fehlende (z. B. neue einer späteren Version) kommen hinten dran
function navOrder(order = db.settings.navOrder) {
  const saved = Array.isArray(order) ? order.filter(v => NAV_VIEWS.includes(v)) : [];
  return [...new Set([...saved, ...NAV_VIEWS])];
}
// Nur gültige Einträge, deren Klasse es noch gibt (Sync, alte Daten); legt nichts an
function quickLinksOf(list = db.settings.quickLinks) {
  return (Array.isArray(list) ? list : [])
    .filter(l => l && typeof l === 'object' && db.groups.some(g => g.id === l.groupId))
    .map(l => ({ id: l.id || uid(), groupId: l.groupId, target: l.target === 'seating' ? 'seating' : 'students' }))
    .slice(0, QUICK_MAX);
}
// „7b Mathe“; das Fach nur, wenn es die Klasse mehrfach gibt (wie im Sitzplan-Menü)
function quickGroupName(g, always = false) {
  const twin = db.groups.some(x => x !== g && x.className === g.className);
  return { name: g.className, subject: (always || twin) ? (g.subject || '') : '' };
}
function renderNav() {
  const box = document.querySelector('#sidebar .nav-items');
  const quick = document.getElementById('nav-quick');
  if (!box || !quick) return;
  navOrder().forEach(v => { const el = document.getElementById('nav-' + v); if (el) box.insertBefore(el, quick); });
  const links = quickLinksOf();
  quick.innerHTML = '';
  links.forEach(link => {
    const g = db.groups.find(x => x.id === link.groupId);
    const { subject } = quickGroupName(g);
    const label = `${[g.className, g.subject].filter(Boolean).join(' ')}: ${QUICK_TARGETS[link.target]}`;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nav-item nav-quick-item';
    b.dataset.group = g.id;
    b.dataset.target = link.target;
    b.setAttribute('aria-label', label);
    b.title = label;
    b.innerHTML = `<span class="nq-chip" style="--card-color:${escHtml(safeColor(g.color))}">${escHtml(g.className)}</span>`
      + `<span class="nq-label">${QUICK_SHORT[link.target]}${subject ? ` <small>${escHtml(subject)}</small>` : ''}</span>`
      + icon(link.target === 'seating' ? 'seating' : 'classes').replace('class="ico"', 'class="ico nq-kind"');   // eingeklappt: wohin der Knopf führt
    b.onclick = () => openQuickLink(link);
    quick.appendChild(b);
  });
  if (!links.length && db.groups.length) {
    quick.innerHTML = `<button type="button" class="nav-item nav-quick-add" aria-label="Klasse in der Leiste anheften" title="Klasse in der Leiste anheften">${icon('plus')}<span>Klasse anheften</span></button>`;
    quick.querySelector('button').onclick = () => openNavSettings();
  }
  markNavActive();
}
function openQuickLink(link) {
  if (!db.groups.some(g => g.id === link.groupId)) { showToast('Diese Klasse gibt es nicht mehr', 'error'); renderNav(); return; }
  if (link.target === 'seating') openSeatingForGroup(link.groupId);
  else { leaveLessonModal(); openGroupStudents(link.groupId); }
}
function openNavSettings() {
  openSettings();
  showSettingsPane('nav');
}
// Markiert ist genau ein Punkt: der Schnellzugriff, wenn er zur offenen Klasse passt, sonst der Menüpunkt
function markNavActive() {
  const view = (document.querySelector('.view.active')?.id || '').replace('view-', '');
  const gid = view === 'seating' ? currentSeatingGroupId : view === 'students' ? currentGroupId : '';
  const target = view === 'seating' ? 'seating' : 'students';
  let hit = null;
  document.querySelectorAll('#nav-quick .nav-quick-item').forEach(b => {
    const on = !hit && !!gid && b.dataset.group === gid && b.dataset.target === target;
    if (on) hit = b;
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  const navView = view === 'students' ? 'classes' : view;
  document.querySelectorAll('.nav-item[data-view]').forEach(n => n.classList.toggle('active', !hit && n.dataset.view === navView));
}

// Einstellungen „Leiste“: Arbeitskopie wie bei Blöcken und Ferien, erst „Speichern“ übernimmt sie
let navDraft = { order: [], links: [] };
function fillNavEditor() {
  navDraft = { order: navOrder(), links: quickLinksOf().map(l => ({ ...l })) };
  renderNavEditor();
}
function moveButtons(name, i, len) {
  return `<button type="button" class="btn-icon" data-move="-1" aria-label="${escHtml(name)} nach oben"${i === 0 ? ' disabled' : ''}>${icon('arrow-up')}</button>`
    + `<button type="button" class="btn-icon" data-move="1" aria-label="${escHtml(name)} nach unten"${i === len - 1 ? ' disabled' : ''}>${icon('arrow-down')}</button>`;
}
function moveInList(list, i, dir) {
  const j = i + dir;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  renderNavEditor();
}
function renderNavEditor() {
  const order = document.getElementById('settings-nav-order');
  const quick = document.getElementById('settings-quick-list');
  const add = document.getElementById('settings-quick-add');
  if (!order || !quick || !add) return;
  order.innerHTML = '';
  navDraft.order.forEach((v, i) => {
    const row = document.createElement('div');
    row.className = 'nav-order-row';
    row.dataset.view = v;
    const navSvg = document.querySelector(`#nav-${v} svg`);   // dasselbe Symbol wie in der Leiste
    row.innerHTML = `${navSvg ? navSvg.outerHTML.replace('<svg', '<svg class="ico" aria-hidden="true"') : icon(NAV_ICONS[v])}<span class="quick-name">${NAV_NAMES[v]}</span>${moveButtons(NAV_NAMES[v], i, navDraft.order.length)}`;
    row.querySelectorAll('[data-move]').forEach(b => { b.onclick = () => moveInList(navDraft.order, navDraft.order.indexOf(v), +b.dataset.move); });
    order.appendChild(row);
  });
  quick.innerHTML = '';
  navDraft.links.forEach((link, i) => {
    const g = db.groups.find(x => x.id === link.groupId);
    if (!g) return;
    const name = [g.className, g.subject].filter(Boolean).join(' ');
    const row = document.createElement('div');
    row.className = 'nav-order-row quick-row';
    row.innerHTML = `<span class="nq-chip" style="--card-color:${escHtml(safeColor(g.color))}">${escHtml(g.className)}</span>`
      + `<span class="quick-name">${escHtml(name)}</span>`
      + `<select class="form-input quick-target" aria-label="${escHtml(name)} öffnet">${Object.entries(QUICK_TARGETS).map(([k, t]) =>
        `<option value="${k}"${k === link.target ? ' selected' : ''}>${t}</option>`).join('')}</select>`
      + moveButtons(name, i, navDraft.links.length)
      + `<button type="button" class="btn-icon quick-remove" aria-label="${escHtml(name)} aus dem Schnellzugriff entfernen">${icon('x-circle')}</button>`;
    row.querySelector('select').onchange = e => { link.target = e.target.value === 'seating' ? 'seating' : 'students'; };
    row.querySelectorAll('[data-move]').forEach(b => { b.onclick = () => moveInList(navDraft.links, navDraft.links.indexOf(link), +b.dataset.move); });
    row.querySelector('.quick-remove').onclick = () => { const k = navDraft.links.indexOf(link); if (k >= 0) { navDraft.links.splice(k, 1); renderNavEditor(); } };
    quick.appendChild(row);
  });
  const full = navDraft.links.length >= QUICK_MAX;
  const sorted = [...db.groups].sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }) || (a.subject || '').localeCompare(b.subject || ''));
  add.innerHTML = `<option value="">Klasse hinzufügen …</option>` + sorted.map(g =>
    `<option value="${escHtml(g.id)}">${escHtml([g.className, g.subject].filter(Boolean).join(' '))}</option>`).join('');
  add.value = '';
  add.disabled = full;
  add.onchange = () => addQuickLinkDraft(add);   // per Eigenschaft, damit der Test sie auslösen kann (Regel 18)
  document.getElementById('settings-quick-hint')?.classList.toggle('hidden', !full);
}
function addQuickLinkDraft(sel) {
  const g = db.groups.find(x => x.id === sel.value);
  sel.value = '';
  if (!g || navDraft.links.length >= QUICK_MAX) return;
  navDraft.links.push({ id: uid(), groupId: g.id, target: 'seating' });   // meist will man in der Stunde in den Sitzplan
  renderNavEditor();
}
function saveNavSettings() {
  const order = navOrder(navDraft.order);
  if (order.join() === NAV_VIEWS.join()) delete db.settings.navOrder; else db.settings.navOrder = order;   // Standard nicht speichern
  const links = navDraft.links.filter(l => db.groups.some(g => g.id === l.groupId)).map(l => ({ id: l.id, groupId: l.groupId, target: l.target }));
  if (links.length) db.settings.quickLinks = links; else delete db.settings.quickLinks;
}

function toggleSidebar(e) {
  if (e) e.stopPropagation();
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('collapsed');
  updateSidebarToggle();
}
// Der Knopf sagt, was er als Nächstes tut; eingeklappt ist nur das Symbol zu sehen
function updateSidebarToggle() {
  const label = document.getElementById('sidebar').classList.contains('collapsed') ? 'Leiste ausklappen' : 'Leiste einklappen';
  const btn = document.getElementById('btn-sidebar-toggle');
  btn.setAttribute('aria-label', label);
  btn.title = label;
}

// Die Leiste wird nur über „Einklappen“ umgeschaltet (BUGS I3: früher klappte jeder Klick in den Inhalt sie zu,
// und der Inhalt sprang unter dem Finger nach links). Auf schmalen Bildschirmen (iPad hochkant) startet
// sie zugeklappt; unter 601 px ist sie ohnehin eine Leiste oben.
function applyInitialSidebar() {
  const w = window.innerWidth;
  document.getElementById('sidebar').classList.toggle('collapsed', w > 600 && w < 1024);
  updateSidebarToggle();
}
const firstLine = t => String(t || '').split('\n').map(x => x.trim()).find(Boolean) || '';
const plural = (n, one, many) => n === 1 ? one : many;

// ─── Helpers ──────────────────────────────────────────────────────────────
function createEntryItem(text, date, onDelete) {
  const el = document.createElement('div');
  el.className = 'entry-item';
  el.innerHTML = `
    <span class="entry-item-text">${escHtml(text)}</span>
    <span class="entry-item-date">${date ? formatDateShort(date) : ''}</span>
    <button class="entry-item-delete" aria-label="Löschen">✕</button>`;
  el.querySelector('.entry-item-delete').onclick = onDelete;
  return el;
}

// Fokus beim Öffnen ins Fenster, beim Schließen zurück auf den auslösenden Knopf (BUGS O8).
// Das Fenster selbst bekommt den Fokus, kein Eingabefeld: sonst ginge auf dem iPad jedes Mal die Tastatur auf.
const modalReturnFocus = {};
function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  const wasHidden = m.classList.contains('hidden');
  m.classList.remove('hidden');
  if (!wasHidden) return;
  if (id in FORM_GUARDS) formSnapshots[id] = guardedFormState(id);   // Stand beim Öffnen (W2)
  const active = document.activeElement;
  modalReturnFocus[id] = active && active !== document.body && !m.contains(active) ? active : null;
  const dialog = m.querySelector('.modal');
  if (dialog && !dialog.contains(document.activeElement)) dialog.focus({ preventScroll: true });
}
// Tab bleibt im obersten offenen Fenster (aria-modal, W14)
function focusablesIn(root) {
  return [...root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter(el => !el.disabled && el.type !== 'hidden' && !el.closest('.hidden, [hidden]') && getComputedStyle(el).display !== 'none');
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  const wasOpen = !m.classList.contains('hidden');
  if (wasOpen && id === 'modal-seating-student') commitSeatingStudentForm(); // eingetippten Hinweis/Notiz nie verwerfen (Regel 27)
  m.classList.add('hidden');
  const back = modalReturnFocus[id];
  delete modalReturnFocus[id];
  if (wasOpen && back && back.isConnected && (m.contains(document.activeElement) || document.activeElement === document.body)) {
    try { back.focus({ preventScroll: true }); } catch (e) { /* Element nicht fokussierbar */ }
  }
  if (id === 'modal-settings') { settingsSnapshot = null; hideAllPasswords(); }   // gemerkter Stand gilt nur für dieses Öffnen (S7)
  if (id === 'modal-grade-form') gradeFormSnapshot = null;
  if (wasOpen) {
    storageAfterModalsClosed(); // Stand eines anderen Fensters, der auf das Schließen gewartet hat (BUGS T1)
    syncAfterModalsClosed();    // Cloud-Stand, der auf das Schließen gewartet hat (BUGS P1)
  }
}
// Fenster als Dialog auszeichnen (Rolle, Titel) – für Screenreader (BUGS O8)
function labelModals() {
  document.querySelectorAll('.modal-overlay > .modal').forEach(dialog => {
    const overlay = dialog.parentElement;
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.tabIndex = -1;
    const h = dialog.querySelector('h2');
    if (h) {
      if (!h.id) h.id = overlay.id + '-title';
      dialog.setAttribute('aria-labelledby', h.id);
    }
  });
}
// Tippen neben ein Fenster: wie sein Schließen-Knopf, also z. B. Stunden-Notizen speichern (BUGS G13)
// Nur schließen, wenn auch das Drücken auf dem Overlay begann: Text im Feld markieren und daneben loslassen
// erzeugt einen click auf dem Overlay und hätte die Eingaben verworfen (BUGS O1).
let overlayPressTarget = null;
// Wo zuletzt gedrückt wurde – auch für Popups, die bei Klick außerhalb schließen (Raster-Menü, Aufklapplisten)
let lastPressTarget = null;
// Begann das Drücken in `el`? Dann ist ein Klick außerhalb nur das Loslassen nach dem Markieren/Ziehen – nicht schließen.
function pressStartedIn(el) { return !!(el && lastPressTarget && el.contains(lastPressTarget)); }
function closeModalOnOverlay(event, id) {
  const overlay = document.getElementById(id);
  const pressedElsewhere = overlayPressTarget && overlayPressTarget !== overlay;
  overlayPressTarget = null;
  if (event.target === overlay && !pressedElsewhere) closeModalLikeButton(id);
}

// Toast mit „Rückgängig“ (klickbar, anders als normale Toasts) für Einträge, die ein zweites Tippen entfernt (BUGS N6)
// group: Hinweise derselben Gruppe ersetzen sich (Notenrunde: sonst stapeln sie sich über Leiste und Karten, AH28)
function showUndoToast(msg, undo, group) {
  if (group) document.querySelectorAll(`#toast-container .toast-undo[data-group="${group}"]`).forEach(x => x.remove());
  const t = Object.assign(document.createElement('div'), { className: 'toast success toast-undo' });
  if (group) t.dataset.group = group;
  t.appendChild(Object.assign(document.createElement('span'), { textContent: msg }));
  const btn = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Rückgängig' });
  let done = false;
  btn.onclick = () => { if (done) return; done = true; t.remove(); undo(); };
  t.appendChild(btn);
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => { t.style.cssText = 'opacity:0;transition:opacity .3s'; setTimeout(() => t.remove(), 300); }, 6000);
}

function showToast(msg, type='success') {
  const t = Object.assign(document.createElement('div'), { className:`toast ${type}`, textContent: msg });
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => { t.style.cssText='opacity:0;transition:opacity .3s'; setTimeout(()=>t.remove(),300); }, 2500);
}

// Für Text und Attributwerte in innerHTML. Auch ' und ", damit value="…"/title="…" dicht bleiben.
function escHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
}
// Argument für einen Inline-Handler: onclick="f(${jsArg(x)})". Liefert ein fertiges JS-Literal samt
// Anführungszeichen. escHtml allein reicht dort nicht: der Browser dekodiert &#39; vor dem Ausführen wieder zu '.
function jsArg(v) {
  return escHtml(JSON.stringify(v ?? null));
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr+'T00:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
}

// ─── Keyboard ─────────────────────────────────────────────────────────────
// Escape und Tippen daneben schließen ein Fenster so wie sein eigener Schließen-Knopf (BUGS G7, G13).
const MODAL_CLOSE_ACTIONS = {
  'modal-lesson': () => saveLessonDataAndClose(),   // wie „Schließen“: Notizen nicht verwerfen
  'modal-grade-form': () => cancelGradeForm(),
  'modal-sync-conflict': null,                       // Entscheidung nötig, nicht wegdrückbar
  'modal-choice': () => answerChoice(null),          // Wegdrücken = Abbrechen
  'modal-settings': () => cancelSettings(),          // Farbvorschau nicht stehen lassen (BUGS O2)
  'modal-supervision': () => cancelSupervision(),    // bei Änderungen fragen (AA4)
  'modal-whats-new': () => closeWhatsNew(),          // Wegdrücken zählt als gelesen
  'modal-plan-topic': () => cancelPlanTopic(),       // bei Änderungen fragen (Regel 55)
  'modal-class-notes': () => closeClassNotes(),      // Eingetipptes übernehmen, nicht verwerfen (AD15)
  'modal-lesson-topic': () => closeLessonTopic(),    // Eingetipptes übernehmen, nicht verwerfen (AI2)
  'modal-new-year': () => closeNewYear(),            // ab Schritt 2 nachfragen (Y6)
  'modal-give-sticker': () => closeGive(),           // Eingetipptes nur nach Rückfrage verwerfen (AJ2b)
  'modal-add-student': () => leaveGuardedForm('modal-add-student'),         // bei Änderungen fragen (W2)
  'modal-import-students': () => leaveGuardedForm('modal-import-students'),
  'modal-add-group': () => leaveGuardedForm('modal-add-group'),
  'modal-add-lesson': () => leaveGuardedForm('modal-add-lesson'),
  'modal-add-column': () => leaveGuardedForm('modal-add-column'),
  'modal-seating-student': () => leaveSeatingStudentWindow(),               // angefangene Einträge nicht still verwerfen (W2)
};
// Formulare, die beim Schließen ohne Speichern fragen, wenn etwas geändert wurde (W2). Stand beim Öffnen (openModal);
// Farben stehen in keinem Feld und zählen über FORM_GUARDS. Speichern geht direkt über closeModal und fragt nicht.
const FORM_GUARDS = {
  'modal-add-student': () => '', 'modal-import-students': () => '', 'modal-add-column': () => '',
  'modal-add-group': () => selectedGroupColor, 'modal-add-lesson': () => selectedLessonColor,
};
const formSnapshots = {};
function guardedFormState(id) {
  const values = [...document.querySelectorAll(`#${id} input, #${id} select, #${id} textarea`)]
    .map(el => (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.value);
  return [...values, FORM_GUARDS[id]()].join('\u0000');
}
function leaveGuardedForm(id) {
  if (formSnapshots[id] !== undefined && guardedFormState(id) !== formSnapshots[id]
      && !confirm('Deine Eingaben sind noch nicht gespeichert.\n\nVerwerfen?')) return;
  closeModal(id);
}
function closeModalLikeButton(id) {
  const action = id in MODAL_CLOSE_ACTIONS ? MODAL_CLOSE_ACTIONS[id] : () => closeModal(id);
  if (action) action();
}

// Escape: nur das oberste Fenster. Alle liegen auf derselben Ebene, also ist das letzte offene im Markup das oberste.
function closeTopModal() {
  const open = [...document.querySelectorAll('.modal-overlay:not(.hidden)')];
  const top = open[open.length - 1];
  if (top) closeModalLikeButton(top.id);
}

// Nur Felder für neue Einträge springen leer auf heute (Regel 58). Einstellungen und optionale Felder (Halbjahresende,
// Geburtstag, Frist, „Gilt bis“) heißen leer „nicht eingetragen“ und bleiben leer (AU4).
const TODAY_DATE_FIELDS = new Set(['new-hw-date', 'new-test-date', 'gf-date', 'new-col-date', 'sup-date', 'print-from',
  'new-att-date', 'new-hw-student-date', 'new-student-note-date']);

// ─── Custom Form Dropdowns ────────────────────────────────────────────────
function makeCustomFormDropdown(selectEl) {
  if (selectEl.dataset.customDropdownInitialized) return;
  selectEl.dataset.customDropdownInitialized = 'true';
  selectEl.style.display = 'none';

  const container = document.createElement('div');
  container.className = 'custom-form-dropdown';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'custom-form-dropdown-trigger';
  
  const label = document.createElement('span');
  label.style.flex = '1';
  label.style.textAlign = 'left';
  label.style.overflow = 'hidden';
  label.style.textOverflow = 'ellipsis';
  label.style.whiteSpace = 'nowrap';

  const svg = document.createElement('div');
  svg.style.flexShrink = '0';
  svg.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.6; margin-left: var(--space-2);"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

  trigger.appendChild(label);
  trigger.appendChild(svg);

  const menu = document.createElement('div');
  menu.className = 'custom-form-dropdown-menu';
  menu.setAttribute('role', 'listbox');
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  // Tastatur (W13): ↓/Enter/Leertaste öffnet, ↑↓ wählt aus, Enter übernimmt, Escape schließt – Fokus zurück auf die Liste
  const items = () => [...menu.querySelectorAll('[role="option"]')];
  const setOpen = open => { menu.classList.toggle('show', open); trigger.setAttribute('aria-expanded', String(open)); };
  const openWithFocus = () => {
    document.querySelectorAll('.custom-form-dropdown-menu.show').forEach(m => m.classList.remove('show'));
    setOpen(true);
    const list = items();
    (list.find(i => i.getAttribute('aria-selected') === 'true') || list[0])?.focus();
  };
  trigger.addEventListener('keydown', e => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); e.stopPropagation(); openWithFocus(); }
  });
  menu.addEventListener('keydown', e => {
    const list = items(), i = list.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = list[Math.max(0, Math.min(list.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
      if (n) n.focus();
    } else if ((e.key === 'Enter' || e.key === ' ') && i >= 0) {
      e.preventDefault(); e.stopPropagation(); list[i].click(); trigger.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation(); setOpen(false); trigger.focus();
    }
  });

  container.appendChild(trigger);
  container.appendChild(menu);

  selectEl.parentNode.insertBefore(container, selectEl.nextSibling);

  function renderMenu() {
    menu.innerHTML = '';
    let selectedText = '…';
    
    const renderOption = (opt) => {
      const item = document.createElement('div');
      item.className = 'custom-form-dropdown-item';
      item.textContent = opt.textContent;
      item.dataset.value = opt.value;
      item.setAttribute('role', 'option');   // Tastatur und VoiceOver (W13)
      item.tabIndex = -1;
      item.setAttribute('aria-selected', String(selectEl.value === opt.value));
      if (selectEl.value === opt.value) {
        item.classList.add('selected');
        selectedText = opt.textContent;
      }
      item.onclick = (e) => {
        e.stopPropagation();
        selectEl.value = opt.value;
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        setOpen(false);
        renderMenu(); // Re-render to update selected state
        
        // Execute inline onchange if present
        if (typeof selectEl.onchange === 'function') {
           selectEl.onchange();
        }
      };
      return item;
    };

    Array.from(selectEl.children).forEach(child => {
      if (child.tagName === 'OPTGROUP') {
        const groupLabel = document.createElement('div');
        groupLabel.className = 'custom-form-dropdown-optgroup';
        groupLabel.textContent = child.label;
        menu.appendChild(groupLabel);
        Array.from(child.children).forEach(opt => {
          menu.appendChild(renderOption(opt));
        });
      } else if (child.tagName === 'OPTION') {
        menu.appendChild(renderOption(child));
      }
    });

    label.textContent = selectedText;
    const name = selectEl.getAttribute('aria-label') || (selectEl.labels && selectEl.labels[0] && selectEl.labels[0].textContent.trim()) || '';
    trigger.setAttribute('aria-label', name ? `${name}: ${selectedText}` : selectedText);
  }

  // Initial render
  renderMenu();

  trigger.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isShowing = menu.classList.contains('show');
    document.querySelectorAll('.custom-form-dropdown-menu.show').forEach(m => m.classList.remove('show'));
    const seatingMenu = document.getElementById('seating-group-menu');
    if (seatingMenu) seatingMenu.classList.add('hidden'); // Close seating menu
    setOpen(!isShowing);
  };

  // Ersetzte Auswahllisten (Neuzeichnen) melden sich beim nächsten Klick ab, sonst wachsen Beobachter und Speicher (AQ24)
  const onDocClick = (e) => {
    if (!container.isConnected) { document.removeEventListener('click', onDocClick); observer.disconnect(); return; }
    if (!container.contains(e.target) && !pressStartedIn(container)) { // im Menü gedrückt, außerhalb losgelassen: offen lassen
      setOpen(false);
    }
  };
  document.addEventListener('click', onDocClick);

  // Watch for DOM changes (e.g. innerHTML updates)
  const observer = new MutationObserver(() => {
    renderMenu();
  });
  observer.observe(selectEl, { childList: true, subtree: true, attributes: true, attributeFilter: ['value'] });

  // Override value setter to update UI programmatically
  const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  if (originalDescriptor && !selectEl.dataset.valueOverridden) {
    Object.defineProperty(selectEl, 'value', {
      get: function() { return originalDescriptor.get.call(this); },
      set: function(val) {
        originalDescriptor.set.call(this, val);
        renderMenu();
      }
    });
    selectEl.dataset.valueOverridden = 'true';
  }
}

function initAllCustomDropdowns() {
  document.querySelectorAll('select.form-input').forEach(makeCustomFormDropdown);
}

// ─── „Das ist neu“ ─────────────────────────────────────────────────────────
// Erscheint einmal pro Gerät, wenn sich mit einem Update für bestehende Nutzer etwas Sichtbares ändert.
// Für das nächste große Update: `id` ändern und die Punkte ersetzen. Gemerkt wird nur auf diesem Gerät
// (nicht in `db`, nicht synchronisiert). Neue Nutzer ohne Daten sehen es nie.
const WHATS_NEW = {
  id: '2026-11-5',
  items: [
    { icon: 'participation', title: 'Mitarbeit in vier Stufen', text: 'Neu: ++ sehr gut, + gut, − wenig, −− schwach. Bisherige Einträge bleiben: 😊 ist jetzt „gut“, 😐 „wenig“, ☹️ „schwach“.' },
    { icon: 'seating',  title: 'Sitzplan', text: 'Oben steht die Klasse. Die Pfeile springen zur vorigen oder nächsten Stunde der Klasse, ein Tipp aufs Datum öffnet den Kalender. Die Leiste darüber zeigt außerhalb der Stunde die nächste.' },
    { icon: 'clock',    title: 'Timer und Stoppuhr', text: 'Unten als Knöpfe neben Zufall und Gruppen. Antippen öffnet die Bedienung, die laufende Zeit steht im Knopf.' },
    { icon: 'panel',    title: 'Leiste links', text: 'Die Suche steht oben als Menüpunkt, „Einklappen“ unten. In den Einstellungen unter „Leiste“ ordnest du die Menüpunkte selbst und heftest Klassen an.' },
    { icon: 'classes',  title: 'Klassenlehrer', text: 'Beim Bearbeiten einer Klasse eintragen. Der Name steht dann im Klassenkopf, auf der Klassenkarte und im Stunden-Fenster.' },
  ],
};
const WHATS_NEW_SEEN_KEY = 'whats_new_seen';

// Browser-Speicher kann gesperrt sein (privater Modus) – dann einfach nichts merken
function readWhatsNewSeen() { try { return localStorage.getItem(WHATS_NEW_SEEN_KEY); } catch (e) { return null; } }
function markWhatsNewSeen() { try { localStorage.setItem(WHATS_NEW_SEEN_KEY, WHATS_NEW.id); } catch (e) {} }

function showWhatsNewIfDue(attempt = 0) {
  if (readWhatsNewSeen() === WHATS_NEW.id) return;
  if (isLocalDBEmpty()) { markWhatsNewSeen(); return; } // neues Gerät/neuer Nutzer: es gibt nichts „Altes“
  // Nie über ein anderes Fenster legen (z. B. Konflikt-Dialog); später noch einmal versuchen
  if (document.querySelector('.modal-overlay:not(.hidden)')) {
    if (attempt < 20) setTimeout(() => showWhatsNewIfDue(attempt + 1), 2000);
    return;
  }
  document.getElementById('whats-new-list').innerHTML = WHATS_NEW.items.map(item => `
    <li>${icon(item.icon)}<div><strong>${escHtml(item.title)}</strong> ${escHtml(item.text)}</div></li>`).join('');
  openModal('modal-whats-new');
}

function closeWhatsNew() {
  markWhatsNewSeen();
  closeModal('modal-whats-new');
}
// ─── Init ─────────────────────────────────────────────────────────────────



// ─── PWA Update Logic ───────────────────────────────────────────────────
async function forceAppUpdate() {
  // Offline den Cache zu löschen hieße: keine App bis zum nächsten WLAN (BUGS K12). Erst prüfen, ob der Server erreichbar ist.
  if (navigator.onLine === false || !(await serverReachable())) {
    showToast('Keine Internetverbindung. Aktualisieren geht nur online.', 'error');
    return;
  }
  if ('serviceWorker' in navigator) {
    showToast('App wird aktualisiert …', 'success');
    // Erst alles wirklich entfernen, dann neu laden (sonst kommt u. U. wieder der alte Cache)
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(r => r.unregister()));
    const names = await caches.keys();
    await Promise.all(names.map(name => caches.delete(name)));
  }
  window.location.reload();
}
async function serverReachable() {
  try {
    const res = await fetch('./index.html?check=' + Date.now(), { cache: 'no-store' });
    return res.ok;
  } catch (e) {
    return false;
  }
}
